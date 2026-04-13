mod models;
mod routes;
mod handlers;
mod services;

use axum::{Router, http::Method};
use tower_http::cors::{CorsLayer, Any};
use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    // Initialize CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST])
        .allow_headers(Any);

    // Build router
    let app = Router::new()
        .merge(routes::device_routes())
        .merge(routes::payment_routes())
        .layer(cors);

    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], 8000));
    println!("🚀 Server running on http://{}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
