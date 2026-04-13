use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc, Duration};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Device {
    pub id: String,
    pub name: String,
    pub description: String,
    pub price: f64,
    pub available: bool,
    pub location: String,
}

#[derive(Debug, Deserialize)]
pub struct PaymentRequest {
    pub device_id: String,
    pub user_address: String,
    pub amount: f64,
}

#[derive(Debug, Serialize)]
pub struct PaymentResponse {
    pub access_granted: bool,
    pub session_id: String,
    pub expires_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct Session {
    pub id: String,
    pub device_id: String,
    pub user_address: String,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub active: bool,
}

impl Session {
    pub fn new(device_id: String, user_address: String) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            device_id,
            user_address,
            created_at: now,
            expires_at: now + Duration::hours(1),
            active: true,
        }
    }
}
