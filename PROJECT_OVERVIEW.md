# Stellar IoT - Project Overview

## What is Stellar IoT?

Stellar IoT is an open-source, decentralized platform that enables pay-per-use access to IoT devices using the Stellar blockchain. Users pay with XLM (Stellar Lumens) to unlock device access, with all payments validated through Soroban smart contracts.

## Key Features

- **Decentralized Payments**: All transactions on Stellar blockchain
- **Smart Contract Validation**: Trustless payment verification via Soroban
- **Pay-Per-Use Model**: Users only pay when they need device access
- **Real-Time Access**: Instant device unlocking after payment
- **Session Management**: Time-limited access with automatic expiration
- **Multi-Device Support**: Manage multiple IoT devices from one platform

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | Next.js 14 + TypeScript | User interface |
| Styling | TailwindCSS | Responsive design |
| Backend | Rust + Axum | REST API server |
| Smart Contracts | Soroban (Rust) | Payment validation |
| Blockchain | Stellar | Payment processing |

## Use Cases

1. **Smart Locks**: Pay to unlock doors temporarily
2. **Sensors**: Access real-time sensor data on-demand
3. **Cameras**: View security footage for a fee
4. **Equipment Rental**: Pay-per-use for shared equipment
5. **Charging Stations**: Pay for EV charging sessions
6. **Vending Machines**: Blockchain-based vending

## Project Goals

- Demonstrate Stellar/Soroban capabilities
- Provide a production-ready starter template
- Enable easy contribution for developers
- Showcase IoT + blockchain integration
- Build an open-source community

## Repository Structure

```
stellar-iot/
├── apps/
│   ├── web/              # Next.js frontend application
│   │   ├── src/
│   │   │   ├── app/      # Next.js pages (App Router)
│   │   │   ├── components/  # React components
│   │   │   ├── services/    # API client
│   │   │   └── types/       # TypeScript types
│   │   └── package.json
│   │
│   └── api/              # Rust Axum backend
│       ├── src/
│       │   ├── main.rs      # Entry point
│       │   ├── routes.rs    # API routes
│       │   ├── handlers.rs  # Request handlers
│       │   ├── services.rs  # Business logic
│       │   └── models.rs    # Data models
│       └── Cargo.toml
│
├── contracts/
│   └── iot/              # Soroban smart contracts
│       ├── src/
│       │   └── lib.rs       # Contract implementation
│       └── Cargo.toml
│
├── packages/
│   └── shared/           # Shared types/utilities
│       ├── types.ts
│       └── package.json
│
├── scripts/              # Build and deployment scripts
│   ├── setup.sh
│   ├── deploy-contract.sh
│   └── test-all.sh
│
├── .env.example          # Environment template
├── README.md             # Main documentation
├── CONTRIBUTING.md       # Contribution guidelines
├── ARCHITECTURE.md       # System architecture
├── QUICKSTART.md         # Quick start guide
└── LICENSE               # MIT License
```

## Getting Started

See [QUICKSTART.md](QUICKSTART.md) for installation instructions.

## Documentation

- [README.md](README.md) - Main documentation
- [QUICKSTART.md](QUICKSTART.md) - Quick start guide
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute
- [apps/web/README.md](apps/web/README.md) - Frontend docs
- [apps/api/README.md](apps/api/README.md) - Backend docs
- [contracts/iot/README.md](contracts/iot/README.md) - Contract docs

## API Endpoints

### GET /devices
Returns list of available IoT devices.

### POST /pay
Process payment for device access.

### GET /session/:id
Get session details by ID.

## Smart Contract Functions

### init_device(device_id, price)
Initialize a device with its price.

### get_device_price(device_id)
Get the price for a specific device.

### pay(device_id, user, amount)
Process payment and grant device access.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- How to fork and clone
- Branch naming conventions
- Commit message guidelines
- Pull request process
- Beginner-friendly tasks

## Community

- GitHub Issues: Bug reports and feature requests
- Discussions: Questions and ideas
- Pull Requests: Code contributions

## Roadmap

- [ ] Stellar wallet integration (Freighter)
- [ ] Real IoT device connectivity (MQTT)
- [ ] Mobile app (React Native)
- [ ] Subscription pricing models
- [ ] Device usage analytics
- [ ] Multi-signature device ownership
- [ ] Mainnet deployment guide

## License

MIT License - see [LICENSE](LICENSE) file.

## Resources

- [Stellar Documentation](https://developers.stellar.org/)
- [Soroban Docs](https://soroban.stellar.org/)
- [Next.js Docs](https://nextjs.org/docs)
- [Axum Docs](https://docs.rs/axum/)

## Support

Need help? Open an issue or start a discussion on GitHub.

---

Built with ❤️ by the Stellar IoT community
