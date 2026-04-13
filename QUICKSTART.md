# Quick Start Guide

Get Stellar IoT running in 5 minutes.

## Prerequisites

Install these before starting:

- [Node.js 18+](https://nodejs.org/)
- [Rust](https://rustup.rs/)
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools)

## Installation

### 1. Clone and Setup

```bash
git clone https://github.com/yourusername/stellar-iot.git
cd stellar-iot
./scripts/setup.sh
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 3. Start Backend

```bash
cd apps/api
cargo run
```

Backend runs on `http://localhost:8000`

### 4. Start Frontend

Open a new terminal:

```bash
cd apps/web
npm run dev
```

Frontend runs on `http://localhost:3000`

### 5. Deploy Smart Contract (Optional)

```bash
./scripts/deploy-contract.sh
```

Copy the contract ID to your `.env` file.

## Testing the Platform

1. Open `http://localhost:3000` in your browser
2. Browse available IoT devices
3. Click on a device to view details
4. Click "Pay to Unlock" to simulate payment
5. Access granted!

## Running Tests

```bash
# All tests
npm run test

# Backend only
cd apps/api && cargo test

# Contracts only
cd contracts/iot && cargo test
```

## Project Structure

```
stellar-iot/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Rust backend
├── contracts/
│   └── iot/          # Soroban contracts
├── packages/
│   └── shared/       # Shared types
└── scripts/          # Utility scripts
```

## Next Steps

- Read [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- Check [CONTRIBUTING.md](CONTRIBUTING.md) to contribute
- Integrate a Stellar wallet (Freighter)
- Connect real IoT devices
- Deploy to production

## Troubleshooting

### Backend won't start
- Check if port 8000 is available
- Verify Rust installation: `cargo --version`

### Frontend won't start
- Check if port 3000 is available
- Verify Node.js: `node --version`
- Run `npm install` again

### Contract deployment fails
- Verify Stellar CLI: `stellar --version`
- Check network connectivity
- Ensure you have testnet XLM

## Support

- Open an issue on GitHub
- Check existing documentation
- Join community discussions

Happy building! 🚀
