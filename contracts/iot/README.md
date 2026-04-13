# IoT Payment Smart Contract

Soroban smart contract for managing IoT device payments on Stellar.

## Functions

### init_device(device_id, price)
Initialize a device with its price.

### get_device_price(device_id)
Get the price for a specific device.

### pay(device_id, user, amount)
Process payment and grant device access.

## Building

```bash
cargo build --target wasm32-unknown-unknown --release
```

## Testing

```bash
cargo test
```

## Deploying

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/iot_contract.wasm \
  --network testnet \
  --source default
```

## Events

The contract emits two types of events:

- `payment` - When a payment is processed
- `access` - When device access is granted

## Storage

Device prices are stored in contract instance storage using the device ID as the key.
