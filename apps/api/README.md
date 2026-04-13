# Stellar IoT Backend API

Rust backend using Axum framework for the Stellar IoT platform.

## Structure

```
src/
├── main.rs       # Application entry point
├── routes.rs     # Route definitions
├── handlers.rs   # Request handlers
├── services.rs   # Business logic
└── models.rs     # Data models
```

## Running

```bash
cargo run
```

Server runs on `http://localhost:8000`

## API Endpoints

### GET /devices
Returns list of available IoT devices.

### POST /pay
Process payment for device access.

Request body:
```json
{
  "device_id": "device-001",
  "user_address": "GXXXXXXX...",
  "amount": 5.0
}
```

### GET /session/:id
Get session details by ID.

## Testing

```bash
cargo test
```

## Development

Add new routes in `routes.rs`, handlers in `handlers.rs`, and business logic in `services.rs`.
