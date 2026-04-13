#!/bin/bash

# Setup script for Stellar IoT monorepo

set -e

echo "🔧 Setting up Stellar IoT monorepo..."

# Check prerequisites
echo "Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v cargo >/dev/null 2>&1 || { echo "❌ Rust is required but not installed."; exit 1; }

echo "✅ Prerequisites check passed"

# Setup frontend
echo ""
echo "📦 Installing frontend dependencies..."
cd apps/web
npm install
cd ../..

# Setup backend
echo ""
echo "🦀 Building backend..."
cd apps/api
cargo build
cd ../..

# Setup contracts
echo ""
echo "📜 Building smart contracts..."
cd contracts/iot
cargo build --target wasm32-unknown-unknown --release
cd ../..

# Create .env if it doesn't exist
if [ ! -f .env ]; then
  echo ""
  echo "📝 Creating .env file..."
  cp .env.example .env
  echo "✅ .env file created. Please update with your configuration."
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your configuration"
echo "2. Start the backend: cd apps/api && cargo run"
echo "3. Start the frontend: cd apps/web && npm run dev"
echo "4. Deploy contracts: ./scripts/deploy-contract.sh"
