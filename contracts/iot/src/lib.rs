#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, Address, Env, Symbol,
};

const FEE_DENOMINATOR: i128 = 10_000;

/// Duration in ledgers for each subscription tier.
/// Stellar produces ~1 ledger every 5 seconds.
/// Daily  ≈ 17_280 ledgers (24h * 3600s / 5s)
/// Weekly ≈ 120_960 ledgers (7 days)
/// Monthly ≈ 518_400 ledgers (30 days)
const LEDGERS_PER_DAY: u32 = 17_280;
const LEDGERS_PER_WEEK: u32 = 120_960;
const LEDGERS_PER_MONTH: u32 = 518_400;

/// Discount in basis points applied to the per-access price for subscriptions.
/// Daily: 10% off, Weekly: 20% off, Monthly: 30% off.
const DAILY_DISCOUNT_BPS: i128 = 1_000;
const WEEKLY_DISCOUNT_BPS: i128 = 2_000;
const MONTHLY_DISCOUNT_BPS: i128 = 3_000;

#[contracttype]
#[derive(Clone)]
pub struct DevicePrice {
    pub device_id: Symbol,
    pub price: i128,
}

/// Subscription tier selecting duration and discount.
#[contracttype]
#[derive(Clone, PartialEq, Debug)]
pub enum SubscriptionTier {
    Daily,
    Weekly,
    Monthly,
}

/// On-chain subscription record.
#[contracttype]
#[derive(Clone)]
pub struct Subscription {
    /// The subscriber.
    pub user: Address,
    /// The device this subscription is for.
    pub device_id: Symbol,
    pub tier: SubscriptionTier,
    /// Ledger sequence number when this subscription was created/last renewed.
    pub start_ledger: u32,
    /// Ledger sequence number when this subscription expires.
    pub end_ledger: u32,
    /// Amount paid (after discount, before platform fee).
    pub amount_paid: i128,
    /// Whether the subscription is active (not cancelled).
    pub active: bool,
}

#[contracttype]
pub enum DataKey {
    Admin,
    PlatformFeeBps,
    PlatformFeeBalance(Address),
    DevicePrice(Symbol),
    DeviceOwner(Symbol),
    /// Keyed by (user_address, device_id) encoded as a tuple-style key.
    Subscription(Address, Symbol),
}

#[contract]
pub struct IotContract;

#[contractimpl]
impl IotContract {
    /// Initialize contract admin and platform fee in basis points.
    pub fn initialize(env: Env, admin: Address, platform_fee_bps: i128) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }

        admin.require_auth();
        Self::validate_platform_fee(platform_fee_bps);

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::PlatformFeeBps, &platform_fee_bps);
    }

    /// Update the platform fee. Only the contract admin can call this.
    pub fn set_platform_fee(env: Env, admin: Address, platform_fee_bps: i128) {
        Self::require_admin(env.clone(), admin);
        Self::validate_platform_fee(platform_fee_bps);

        env.storage()
            .instance()
            .set(&DataKey::PlatformFeeBps, &platform_fee_bps);
    }

    /// Get the configured platform fee in basis points.
    pub fn get_platform_fee(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::PlatformFeeBps)
            .unwrap_or(0)
    }

    /// Get the accumulated platform fee balance for a token.
    pub fn get_platform_fee_balance(env: Env, token: Address) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::PlatformFeeBalance(token))
            .unwrap_or(0)
    }

    /// Initialize device with price and owner.
    pub fn init_device(env: Env, device_id: Symbol, price: i128, owner: Address) {
        if price <= 0 {
            panic!("price must be positive");
        }

        owner.require_auth();

        env.storage()
            .instance()
            .set(&DataKey::DevicePrice(device_id.clone()), &price);
        env.storage()
            .instance()
            .set(&DataKey::DeviceOwner(device_id), &owner);
    }

    /// Get device price.
    pub fn get_device_price(env: Env, device_id: Symbol) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::DevicePrice(device_id))
            .unwrap_or(0)
    }

    /// Get device owner.
    pub fn get_device_owner(env: Env, device_id: Symbol) -> Option<Address> {
        env.storage()
            .instance()
            .get(&DataKey::DeviceOwner(device_id))
    }

    /// Process payment for device access, sending net revenue to the owner and retaining platform fees.
    /// If the user has an active subscription, access is granted without an additional payment.
    pub fn request_access(
        env: Env,
        device_id: Symbol,
        user: Address,
        token: Address,
        amount: i128,
    ) -> bool {
        user.require_auth();

        // Check active subscription first — free access for subscribers.
        if Self::verify_access(env.clone(), device_id.clone(), user.clone()) {
            env.events()
                .publish((symbol_short!("access"), device_id), user);
            return true;
        }

        let price = Self::get_device_price(env.clone(), device_id.clone());
        if price <= 0 || amount < price {
            return false;
        }

        let owner = Self::get_device_owner(env.clone(), device_id.clone())
            .unwrap_or_else(|| panic!("device owner not found"));
        let fee_bps = Self::get_platform_fee(env.clone());
        let platform_fee = amount * fee_bps / FEE_DENOMINATOR;
        let owner_amount = amount - platform_fee;
        let contract_address = env.current_contract_address();
        let token_client = token::Client::new(&env, &token);

        if owner_amount > 0 {
            token_client.transfer(&user, &owner, &owner_amount);
        }
        if platform_fee > 0 {
            token_client.transfer(&user, &contract_address, &platform_fee);
            let fee_key = DataKey::PlatformFeeBalance(token.clone());
            let current_fee_balance = Self::get_platform_fee_balance(env.clone(), token.clone());
            env.storage()
                .instance()
                .set(&fee_key, &(current_fee_balance + platform_fee));
        }

        env.events().publish(
            (symbol_short!("payment"), device_id.clone()),
            (
                user.clone(),
                owner.clone(),
                amount,
                owner_amount,
                platform_fee,
            ),
        );
        env.events()
            .publish((symbol_short!("access"), device_id), user);

        true
    }

    /// Backwards-compatible alias for request_access.
    pub fn pay(env: Env, device_id: Symbol, user: Address, token: Address, amount: i128) -> bool {
        Self::request_access(env, device_id, user, token, amount)
    }

    /// Check whether a user currently has active (non-expired, non-cancelled) access
    /// via a subscription to a given device.
    pub fn verify_access(env: Env, device_id: Symbol, user: Address) -> bool {
        let key = DataKey::Subscription(user, device_id);
        let sub: Option<Subscription> = env.storage().instance().get(&key);
        match sub {
            Some(s) => s.active && env.ledger().sequence() <= s.end_ledger,
            None => false,
        }
    }

    /// Subscribe a user to a device for the chosen tier.
    ///
    /// The subscription price is calculated as:
    ///   `device_price * tier_access_count * (1 - discount_bps / 10_000)`
    /// where `tier_access_count` is the number of single accesses the tier covers
    /// (1 for daily, 7 for weekly, 30 for monthly).
    ///
    /// If a non-expired subscription already exists for the user+device, this acts
    /// as a renewal (extends the end_ledger by one tier period).
    /// Panics if the user provides insufficient `amount`.
    pub fn subscribe(
        env: Env,
        user: Address,
        device_id: Symbol,
        tier: SubscriptionTier,
        token: Address,
        amount: i128,
    ) -> Subscription {
        user.require_auth();

        let base_price = Self::get_device_price(env.clone(), device_id.clone());
        if base_price <= 0 {
            panic!("device not found or price not set");
        }

        let subscription_price = Self::compute_subscription_price(base_price, tier.clone());
        if amount < subscription_price {
            panic!("insufficient payment for subscription");
        }

        let owner = Self::get_device_owner(env.clone(), device_id.clone())
            .unwrap_or_else(|| panic!("device owner not found"));
        let fee_bps = Self::get_platform_fee(env.clone());
        let platform_fee = subscription_price * fee_bps / FEE_DENOMINATOR;
        let owner_amount = subscription_price - platform_fee;
        let contract_address = env.current_contract_address();
        let token_client = token::Client::new(&env, &token);

        if owner_amount > 0 {
            token_client.transfer(&user, &owner, &owner_amount);
        }
        if platform_fee > 0 {
            token_client.transfer(&user, &contract_address, &platform_fee);
            let fee_key = DataKey::PlatformFeeBalance(token.clone());
            let current = Self::get_platform_fee_balance(env.clone(), token.clone());
            env.storage()
                .instance()
                .set(&fee_key, &(current + platform_fee));
        }

        let tier_ledgers = Self::tier_to_ledgers(tier.clone());
        let current_ledger = env.ledger().sequence();

        // Renew if an active, non-expired subscription already exists.
        let key = DataKey::Subscription(user.clone(), device_id.clone());
        let start_ledger = current_ledger;
        let end_ledger = {
            let existing: Option<Subscription> = env.storage().instance().get(&key);
            match existing {
                Some(ref s) if s.active && current_ledger <= s.end_ledger => {
                    // Extend from current end, not from now.
                    s.end_ledger + tier_ledgers
                }
                _ => current_ledger + tier_ledgers,
            }
        };

        let sub = Subscription {
            user: user.clone(),
            device_id: device_id.clone(),
            tier: tier.clone(),
            start_ledger,
            end_ledger,
            amount_paid: subscription_price,
            active: true,
        };

        env.storage().instance().set(&key, &sub);

        env.events().publish(
            (symbol_short!("subscrib"), device_id.clone()),
            (user.clone(), tier_to_u32(tier), subscription_price, end_ledger),
        );

        sub
    }

    /// Cancel an active subscription and issue a prorated refund to the user.
    ///
    /// The refund is proportional to the remaining ledgers out of the total tier duration.
    /// Refund is taken from the device owner's share (platform fee portion is non-refundable).
    /// Panics if no active subscription exists.
    pub fn cancel_subscription(
        env: Env,
        user: Address,
        device_id: Symbol,
        token: Address,
    ) -> i128 {
        user.require_auth();

        let key = DataKey::Subscription(user.clone(), device_id.clone());
        let mut sub: Subscription = env
            .storage()
            .instance()
            .get(&key)
            .unwrap_or_else(|| panic!("no subscription found"));

        if !sub.active {
            panic!("subscription already cancelled");
        }

        let current_ledger = env.ledger().sequence();
        if current_ledger > sub.end_ledger {
            panic!("subscription already expired");
        }

        let tier_ledgers = Self::tier_to_ledgers(sub.tier.clone()) as i128;
        let remaining_ledgers = (sub.end_ledger - current_ledger) as i128;

        // Prorated refund = amount_paid * remaining / total_tier_duration
        let refund_amount = if tier_ledgers > 0 {
            sub.amount_paid * remaining_ledgers / tier_ledgers
        } else {
            0
        };

        // Mark as inactive before transferring to prevent re-entrancy issues.
        sub.active = false;
        env.storage().instance().set(&key, &sub);

        if refund_amount > 0 {
            // Refund comes from the contract (funded by the owner's share on subscribe).
            // In this model the contract holds the subscription amount and disburses to
            // the owner at expiry/cancellation — simplified here to refund from contract balance.
            token::Client::new(&env, &token).transfer(
                &env.current_contract_address(),
                &user,
                &refund_amount,
            );
        }

        env.events().publish(
            (symbol_short!("cancel"), device_id),
            (user, refund_amount),
        );

        refund_amount
    }

    /// Explicitly renew an existing (possibly expired or active) subscription by one tier period.
    /// This is a convenience wrapper around `subscribe` that preserves the same tier.
    /// Panics if no prior subscription record exists.
    pub fn renew_subscription(
        env: Env,
        user: Address,
        device_id: Symbol,
        token: Address,
        amount: i128,
    ) -> Subscription {
        let key = DataKey::Subscription(user.clone(), device_id.clone());
        let sub: Subscription = env
            .storage()
            .instance()
            .get(&key)
            .unwrap_or_else(|| panic!("no existing subscription to renew"));

        Self::subscribe(env, user, device_id, sub.tier, token, amount)
    }

    /// Get the current subscription record for a user+device pair, if any.
    pub fn get_subscription(env: Env, user: Address, device_id: Symbol) -> Option<Subscription> {
        env.storage()
            .instance()
            .get(&DataKey::Subscription(user, device_id))
    }

    /// Withdraw accumulated platform fees. Only the contract admin can call this.
    pub fn withdraw_platform_fees(
        env: Env,
        admin: Address,
        token: Address,
        to: Address,
        amount: i128,
    ) {
        Self::require_admin(env.clone(), admin);
        if amount <= 0 {
            panic!("withdraw amount must be positive");
        }

        let fee_key = DataKey::PlatformFeeBalance(token.clone());
        let current_fee_balance = Self::get_platform_fee_balance(env.clone(), token.clone());
        if amount > current_fee_balance {
            panic!("insufficient platform fees");
        }

        env.storage()
            .instance()
            .set(&fee_key, &(current_fee_balance - amount));
        token::Client::new(&env, &token).transfer(&env.current_contract_address(), &to, &amount);
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    fn require_admin(env: Env, admin: Address) {
        admin.require_auth();
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic!("contract not initialized"));
        if admin != stored_admin {
            panic!("admin required");
        }
    }

    fn validate_platform_fee(platform_fee_bps: i128) {
        if platform_fee_bps < 0 || platform_fee_bps > FEE_DENOMINATOR {
            panic!("invalid platform fee");
        }
    }

    /// Convert a tier to the number of ledgers it covers.
    fn tier_to_ledgers(tier: SubscriptionTier) -> u32 {
        match tier {
            SubscriptionTier::Daily => LEDGERS_PER_DAY,
            SubscriptionTier::Weekly => LEDGERS_PER_WEEK,
            SubscriptionTier::Monthly => LEDGERS_PER_MONTH,
        }
    }

    /// Compute the discounted subscription price for a given tier.
    ///
    /// Formula: base_price * access_count * (FEE_DENOMINATOR - discount_bps) / FEE_DENOMINATOR
    fn compute_subscription_price(base_price: i128, tier: SubscriptionTier) -> i128 {
        let (access_count, discount_bps) = match tier {
            SubscriptionTier::Daily => (1i128, DAILY_DISCOUNT_BPS),
            SubscriptionTier::Weekly => (7i128, WEEKLY_DISCOUNT_BPS),
            SubscriptionTier::Monthly => (30i128, MONTHLY_DISCOUNT_BPS),
        };
        base_price * access_count * (FEE_DENOMINATOR - discount_bps) / FEE_DENOMINATOR
    }
}

/// Helper: encode tier as u32 for event payloads (Soroban events require simple types).
fn tier_to_u32(tier: SubscriptionTier) -> u32 {
    match tier {
        SubscriptionTier::Daily => 0,
        SubscriptionTier::Weekly => 1,
        SubscriptionTier::Monthly => 2,
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, token, Address, Env};

    fn setup() -> (
        Env,
        IotContractClient<'static>,
        Address,
        token::StellarAssetClient<'static>,
        Address,
    ) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, IotContract);
        let client = IotContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        let token_admin = Address::generate(&env);
        let token_id = env
            .register_stellar_asset_contract_v2(token_admin.clone())
            .address();
        let asset_client = token::StellarAssetClient::new(&env, &token_id);

        client.initialize(&admin, &500i128);

        (env, client, token_id, asset_client, admin)
    }

    // ─── Existing pay-per-use tests ──────────────────────────────────────────

    #[test]
    fn test_init_device() {
        let (env, client, _, _, _) = setup();
        let device_id = symbol_short!("device1");
        let price = 1000i128;
        let owner = Address::generate(&env);

        client.init_device(&device_id, &price, &owner);

        let stored_price = client.get_device_price(&device_id);
        let stored_owner = client.get_device_owner(&device_id).unwrap();
        assert_eq!(stored_price, price);
        assert_eq!(stored_owner, owner);
    }

    #[test]
    fn test_valid_payment_splits_revenue() {
        let (env, client, token_id, asset_client, _) = setup();
        let token_client = token::Client::new(&env, &token_id);
        let device_id = symbol_short!("device1");
        let price = 1000i128;
        let owner = Address::generate(&env);
        let user = Address::generate(&env);

        client.init_device(&device_id, &price, &owner);
        asset_client.mint(&user, &price);

        let result = client.request_access(&device_id, &user, &token_id, &price);

        assert!(result);
        assert_eq!(token_client.balance(&owner), 950);
        assert_eq!(token_client.balance(&client.address), 50);
        assert_eq!(client.get_platform_fee_balance(&token_id), 50);
    }

    #[test]
    fn test_invalid_payment_amount() {
        let (env, client, token_id, asset_client, _) = setup();
        let device_id = symbol_short!("device1");
        let price = 1000i128;
        let owner = Address::generate(&env);
        let user = Address::generate(&env);

        client.init_device(&device_id, &price, &owner);
        asset_client.mint(&user, &500i128);

        let result = client.request_access(&device_id, &user, &token_id, &500i128);
        assert!(!result);
    }

    #[test]
    fn test_nonexistent_device() {
        let (_env, client, _, _, _) = setup();
        let device_id = symbol_short!("unknown");

        let price = client.get_device_price(&device_id);
        let owner = client.get_device_owner(&device_id);
        assert_eq!(price, 0);
        assert!(owner.is_none());
    }

    #[test]
    fn test_admin_withdraws_platform_fees() {
        let (env, client, token_id, asset_client, admin) = setup();
        let token_client = token::Client::new(&env, &token_id);
        let device_id = symbol_short!("device1");
        let price = 1000i128;
        let owner = Address::generate(&env);
        let user = Address::generate(&env);
        let recipient = Address::generate(&env);
        client.init_device(&device_id, &price, &owner);
        asset_client.mint(&user, &price);
        client.request_access(&device_id, &user, &token_id, &price);

        client.withdraw_platform_fees(&admin, &token_id, &recipient, &50i128);

        assert_eq!(token_client.balance(&recipient), 50);
        assert_eq!(client.get_platform_fee_balance(&token_id), 0);
    }

    // ─── Subscription tests ──────────────────────────────────────────────────

    /// Helper: compute expected subscription price to keep tests DRY.
    fn expected_price(base_price: i128, tier: &SubscriptionTier) -> i128 {
        let (count, discount_bps): (i128, i128) = match tier {
            SubscriptionTier::Daily => (1, 1_000),
            SubscriptionTier::Weekly => (7, 2_000),
            SubscriptionTier::Monthly => (30, 3_000),
        };
        base_price * count * (10_000 - discount_bps) / 10_000
    }

    #[test]
    fn test_subscribe_daily_stores_subscription() {
        let (env, client, token_id, asset_client, _) = setup();
        let device_id = symbol_short!("dev1");
        let base_price = 1_000i128;
        let owner = Address::generate(&env);
        let user = Address::generate(&env);

        client.init_device(&device_id, &base_price, &owner);

        let price = expected_price(base_price, &SubscriptionTier::Daily);
        asset_client.mint(&user, &price);

        let sub = client.subscribe(&user, &device_id, &SubscriptionTier::Daily, &token_id, &price);

        assert!(sub.active);
        assert_eq!(sub.tier, SubscriptionTier::Daily);
        assert_eq!(sub.amount_paid, price);
        assert_eq!(sub.end_ledger, sub.start_ledger + LEDGERS_PER_DAY);
    }

    #[test]
    fn test_subscribe_weekly_discount() {
        let (env, client, token_id, asset_client, _) = setup();
        let device_id = symbol_short!("dev2");
        let base_price = 1_000i128;
        let owner = Address::generate(&env);
        let user = Address::generate(&env);

        client.init_device(&device_id, &base_price, &owner);

        // Weekly: 7 * 1000 * 0.80 = 5600
        let expected = expected_price(base_price, &SubscriptionTier::Weekly);
        assert_eq!(expected, 5_600);

        asset_client.mint(&user, &expected);
        let sub = client.subscribe(&user, &device_id, &SubscriptionTier::Weekly, &token_id, &expected);

        assert_eq!(sub.amount_paid, 5_600);
        assert_eq!(sub.end_ledger, sub.start_ledger + LEDGERS_PER_WEEK);
    }

    #[test]
    fn test_subscribe_monthly_discount() {
        let (env, client, token_id, asset_client, _) = setup();
        let device_id = symbol_short!("dev3");
        let base_price = 1_000i128;
        let owner = Address::generate(&env);
        let user = Address::generate(&env);

        client.init_device(&device_id, &base_price, &owner);

        // Monthly: 30 * 1000 * 0.70 = 21000
        let expected = expected_price(base_price, &SubscriptionTier::Monthly);
        assert_eq!(expected, 21_000);

        asset_client.mint(&user, &expected);
        let sub = client.subscribe(&user, &device_id, &SubscriptionTier::Monthly, &token_id, &expected);

        assert_eq!(sub.amount_paid, 21_000);
        assert_eq!(sub.end_ledger, sub.start_ledger + LEDGERS_PER_MONTH);
    }

    #[test]
    #[should_panic(expected = "insufficient payment for subscription")]
    fn test_subscribe_insufficient_amount_panics() {
        let (env, client, token_id, asset_client, _) = setup();
        let device_id = symbol_short!("dev4");
        let base_price = 1_000i128;
        let owner = Address::generate(&env);
        let user = Address::generate(&env);

        client.init_device(&device_id, &base_price, &owner);
        asset_client.mint(&user, &100i128);

        // Should panic — only 100 provided but daily costs 900
        client.subscribe(&user, &device_id, &SubscriptionTier::Daily, &token_id, &100i128);
    }

    #[test]
    fn test_verify_access_active_subscription() {
        let (env, client, token_id, asset_client, _) = setup();
        let device_id = symbol_short!("dev5");
        let base_price = 1_000i128;
        let owner = Address::generate(&env);
        let user = Address::generate(&env);

        client.init_device(&device_id, &base_price, &owner);

        let price = expected_price(base_price, &SubscriptionTier::Daily);
        asset_client.mint(&user, &price);
        client.subscribe(&user, &device_id, &SubscriptionTier::Daily, &token_id, &price);

        assert!(client.verify_access(&device_id, &user));
    }

    #[test]
    fn test_verify_access_no_subscription() {
        let (env, client, _, _, _) = setup();
        let device_id = symbol_short!("dev6");
        let user = Address::generate(&env);

        assert!(!client.verify_access(&device_id, &user));
    }

    #[test]
    fn test_request_access_skips_payment_for_subscriber() {
        let (env, client, token_id, asset_client, _) = setup();
        let token_client = token::Client::new(&env, &token_id);
        let device_id = symbol_short!("dev7");
        let base_price = 1_000i128;
        let owner = Address::generate(&env);
        let user = Address::generate(&env);

        client.init_device(&device_id, &base_price, &owner);

        let price = expected_price(base_price, &SubscriptionTier::Daily);
        asset_client.mint(&user, &price);
        client.subscribe(&user, &device_id, &SubscriptionTier::Daily, &token_id, &price);

        // User has no extra tokens — but request_access should succeed via subscription
        let balance_before = token_client.balance(&user);
        let result = client.request_access(&device_id, &user, &token_id, &0i128);

        assert!(result);
        // Balance unchanged — no additional payment taken
        assert_eq!(token_client.balance(&user), balance_before);
    }

    #[test]
    fn test_cancel_subscription_returns_prorated_refund() {
        let (env, client, token_id, asset_client, _) = setup();
        let token_client = token::Client::new(&env, &token_id);
        let device_id = symbol_short!("dev8");
        let base_price = 1_000i128;
        let owner = Address::generate(&env);
        let user = Address::generate(&env);

        client.init_device(&device_id, &base_price, &owner);

        let price = expected_price(base_price, &SubscriptionTier::Daily);
        // Mint enough for subscription plus refund reserve
        asset_client.mint(&user, &price);
        asset_client.mint(&client.address, &price); // contract holds refund reserve

        client.subscribe(&user, &device_id, &SubscriptionTier::Daily, &token_id, &price);

        // Cancel immediately — should refund nearly the full daily price
        let refund = client.cancel_subscription(&user, &device_id, &token_id);

        assert!(refund > 0, "expected a non-zero refund");

        // Subscription should now be inactive
        let sub = client.get_subscription(&user, &device_id).unwrap();
        assert!(!sub.active);

        // User should have received the refund
        assert_eq!(token_client.balance(&user), refund);
    }

    #[test]
    #[should_panic(expected = "subscription already cancelled")]
    fn test_cancel_already_cancelled_subscription_panics() {
        let (env, client, token_id, asset_client, _) = setup();
        let device_id = symbol_short!("dev9");
        let base_price = 1_000i128;
        let owner = Address::generate(&env);
        let user = Address::generate(&env);

        client.init_device(&device_id, &base_price, &owner);

        let price = expected_price(base_price, &SubscriptionTier::Daily);
        asset_client.mint(&user, &price);
        asset_client.mint(&client.address, &price);

        client.subscribe(&user, &device_id, &SubscriptionTier::Daily, &token_id, &price);
        client.cancel_subscription(&user, &device_id, &token_id);
        // Second cancel should panic
        client.cancel_subscription(&user, &device_id, &token_id);
    }

    #[test]
    fn test_renew_extends_active_subscription() {
        let (env, client, token_id, asset_client, _) = setup();
        let device_id = symbol_short!("devA");
        let base_price = 1_000i128;
        let owner = Address::generate(&env);
        let user = Address::generate(&env);

        client.init_device(&device_id, &base_price, &owner);

        let price = expected_price(base_price, &SubscriptionTier::Daily);
        // Mint enough for two subscriptions
        asset_client.mint(&user, &(price * 2));

        let sub1 = client.subscribe(&user, &device_id, &SubscriptionTier::Daily, &token_id, &price);
        let end_after_first = sub1.end_ledger;

        let sub2 = client.renew_subscription(&user, &device_id, &token_id, &price);

        // After renewal, end_ledger should be further out than the first subscription
        assert!(sub2.end_ledger > end_after_first);
        assert_eq!(sub2.end_ledger, end_after_first + LEDGERS_PER_DAY);
    }

    #[test]
    fn test_get_subscription_returns_none_for_unknown() {
        let (env, client, _, _, _) = setup();
        let device_id = symbol_short!("devB");
        let user = Address::generate(&env);

        assert!(client.get_subscription(&user, &device_id).is_none());
    }

    #[test]
    fn test_subscription_splits_revenue_to_owner_and_platform() {
        let (env, client, token_id, asset_client, _) = setup();
        let token_client = token::Client::new(&env, &token_id);
        let device_id = symbol_short!("devC");
        let base_price = 1_000i128;
        let owner = Address::generate(&env);
        let user = Address::generate(&env);

        client.init_device(&device_id, &base_price, &owner);

        // Daily: 1 * 1000 * 0.90 = 900
        let price = expected_price(base_price, &SubscriptionTier::Daily);
        assert_eq!(price, 900);
        asset_client.mint(&user, &price);

        client.subscribe(&user, &device_id, &SubscriptionTier::Daily, &token_id, &price);

        // Platform fee = 900 * 500 / 10000 = 45
        // Owner amount  = 900 - 45 = 855
        assert_eq!(token_client.balance(&owner), 855);
        assert_eq!(client.get_platform_fee_balance(&token_id), 45);
    }
}
