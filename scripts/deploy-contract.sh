#!/bin/bash

# Deploy Soroban smart contract to Stellar testnet

set -e

echo "🚀 Building Soroban contract..."
cd contracts/iot
cargo build --target wasm32-unknown-unknown --release

echo "📦 Optimizing WASM..."
stellar contract optimize \
  --wasm target/wasm32-unknown-unknown/release/iot_contract.wasm

echo "🌐 Deploying to testnet..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/iot_contract.wasm \
  --network testnet \
  --source default)

echo "✅ Contract deployed!"
echo "Contract ID: $CONTRACT_ID"
echo ""
echo "Add this to your .env file:"
echo "NEXT_PUBLIC_CONTRACT_ID=$CONTRACT_ID"
