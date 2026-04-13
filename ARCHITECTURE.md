# Stellar IoT Architecture

## Overview

Stellar IoT is a decentralized pay-per-use IoT platform built on the Stellar blockchain. Users pay with XLM to unlock access to IoT devices, with payments validated through Soroban smart contracts.

## System Components

### 1. Frontend (Next.js)
- **Technology**: Next.js 14, TypeScript, TailwindCSS
- **Location**: `apps/web/`
- **Responsibilities**:
  - Display available IoT devices
  - Handle user interactions
  - Integrate with Stellar wallets (Freighter)
  - Communicate with backend API
  - Manage payment flow UI

### 2. Backend (Rust + Axum)
- **Technology**: Rust, Axum framework
- **Location**: `apps/api/`
- **Responsibilities**:
  - Provide REST API for device management
  - Coordinate payment processing
  - Interact with Soroban smart contracts
  - Manage device sessions
  - Store device metadata

### 3. Smart Contracts (Soroban)
- **Technology**: Rust, Soroban SDK
- **Location**: `contracts/iot/`
- **Responsibilities**:
  - Store device pricing on-chain
  - Validate payment amounts
  - Emit payment and access events
  - Provide trustless payment verification

## Data Flow

```
User → Frontend → Backend → Smart Contract → Stellar Network
                     ↓
                  Device Access Granted
```

### Payment Flow

1. User browses devices on frontend
2. User clicks "Pay to Unlock" button
3. Frontend prompts Stellar wallet connection
4. User authorizes payment transaction
5. Frontend sends payment request to backend
6. Backend calls smart contract `pay()` function
7. Smart contract validates payment amount
8. Smart contract emits access event
9. Backend creates session and grants access
10. Frontend displays success and session details

## Security Considerations

- All payments validated on-chain via smart contract
- User authentication via Stellar wallet signatures
- Session expiration for time-limited access
- CORS configured for frontend-backend communication
- Input validation on all API endpoints

## Scalability

- Stateless backend design for horizontal scaling
- Smart contract storage optimized for gas efficiency
- Frontend uses static generation where possible
- API can be load-balanced across multiple instances

## Future Enhancements

- Real device integration via MQTT/WebSocket
- Multi-signature device ownership
- Subscription-based pricing models
- Device usage analytics dashboard
- Mobile app support
- Integration with additional Stellar wallets
