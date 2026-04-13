#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol, symbol_short};

#[contracttype]
#[derive(Clone)]
pub struct DevicePrice {
    pub device_id: Symbol,
    pub price: i128,
}

#[contracttype]
pub enum DataKey {
    DevicePrice(Symbol),
}

#[contract]
pub struct IotContract;

#[contractimpl]
impl IotContract {
    /// Initialize device with price
    pub fn init_device(env: Env, device_id: Symbol, price: i128) {
        let key = DataKey::DevicePrice(device_id.clone());
        env.storage().instance().set(&key, &price);
    }

    /// Get device price
    pub fn get_device_price(env: Env, device_id: Symbol) -> i128 {
        let key = DataKey::DevicePrice(device_id);
        env.storage()
            .instance()
            .get(&key)
            .unwrap_or(0)
    }

    /// Process payment for device access
    pub fn pay(env: Env, device_id: Symbol, user: Address, amount: i128) -> bool {
        // Verify user authorization
        user.require_auth();

        // Get device price
        let price = Self::get_device_price(env.clone(), device_id.clone());
        
        // Validate payment amount
        if amount < price {
            return false;
        }

        // Emit payment event
        env.events().publish(
            (symbol_short!("payment"), device_id.clone()),
            (user.clone(), amount),
        );

        // Grant access
        env.events().publish(
            (symbol_short!("access"), device_id),
            user,
        );

        true
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env, Symbol};

    #[test]
    fn test_init_device() {
        let env = Env::default();
        let contract_id = env.register_contract(None, IotContract);
        let client = IotContractClient::new(&env, &contract_id);

        let device_id = symbol_short!("device1");
        let price = 1000i128;

        client.init_device(&device_id, &price);
        
        let stored_price = client.get_device_price(&device_id);
        assert_eq!(stored_price, price);
    }

    #[test]
    fn test_valid_payment() {
        let env = Env::default();
        let contract_id = env.register_contract(None, IotContract);
        let client = IotContractClient::new(&env, &contract_id);

        let device_id = symbol_short!("device1");
        let price = 1000i128;
        let user = Address::generate(&env);

        // Initialize device
        client.init_device(&device_id, &price);

        // Mock authorization
        env.mock_all_auths();

        // Make payment
        let result = client.pay(&device_id, &user, &price);
        assert!(result);
    }

    #[test]
    fn test_invalid_payment_amount() {
        let env = Env::default();
        let contract_id = env.register_contract(None, IotContract);
        let client = IotContractClient::new(&env, &contract_id);

        let device_id = symbol_short!("device1");
        let price = 1000i128;
        let user = Address::generate(&env);

        // Initialize device
        client.init_device(&device_id, &price);

        // Mock authorization
        env.mock_all_auths();

        // Attempt payment with insufficient amount
        let result = client.pay(&device_id, &user, &500i128);
        assert!(!result);
    }

    #[test]
    fn test_nonexistent_device() {
        let env = Env::default();
        let contract_id = env.register_contract(None, IotContract);
        let client = IotContractClient::new(&env, &contract_id);

        let device_id = symbol_short!("unknown");
        
        let price = client.get_device_price(&device_id);
        assert_eq!(price, 0);
    }
}
