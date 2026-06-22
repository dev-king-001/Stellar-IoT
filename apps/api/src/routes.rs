use crate::handlers;
use axum::{
    routing::{get, post},
    Router,
};

pub fn device_routes() -> Router {
    Router::new()
        .route("/devices", get(handlers::get_devices))
        .route("/devices/search", get(handlers::search_devices))
        .route("/devices/:id/analytics", get(handlers::get_device_analytics))
        .route("/session/:id", get(handlers::get_session))
}

pub fn payment_routes() -> Router {
    Router::new().route("/pay", post(handlers::process_payment))
}
