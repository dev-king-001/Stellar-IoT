use crate::analytics;
use crate::models::{
    AnalyticsQuery, Device, DeviceSearchQuery, DeviceSearchResponse,
    PaymentRequest, PaymentResponse, Session,
};
use crate::services;
use axum::{
    extract::{Path, Query},
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    Json,
};

/// Get all available devices (unchanged — keeps backwards compatibility).
pub async fn get_devices() -> Json<Vec<Device>> {
    Json(services::get_mock_devices())
}

/// Search and filter devices.
///
/// Query parameters (all optional):
/// - `q`          – full-text search across name and description
/// - `category`   – one of: security, environmental, climate, utility, access
/// - `available`  – true | false
/// - `min_price`  – lower price bound (XLM)
/// - `max_price`  – upper price bound (XLM)
/// - `lat`, `lng`, `radius_km` – geospatial proximity filter
/// - `sort_by`    – price | rating | popularity
/// - `sort_order` – asc | desc  (default: asc)
/// - `limit`      – page size 1–100 (default: 20)
/// - `cursor`     – opaque cursor from previous page's `next_cursor`
pub async fn search_devices(Query(query): Query<DeviceSearchQuery>) -> Json<DeviceSearchResponse> {
    Json(services::search_devices(&query))
}

/// Process payment and grant access with Stellar verification.
pub async fn process_payment(
    Json(payment): Json<PaymentRequest>,
) -> Result<Json<PaymentResponse>, StatusCode> {
    // 1. Verify payment on Stellar
    match services::verify_payment(&payment.tx_hash, &payment.device_id, &payment.user_address)
        .await
    {
        Ok(true) => {
            // Payment verified - grant access
            let session = Session::new(payment.device_id, payment.user_address);
            Ok(Json(PaymentResponse {
                access_granted: true,
                session_id: session.id,
                expires_at: session.expires_at.to_rfc3339(),
            }))
        }
        Ok(false) => {
            // Replay attack detected
            Err(StatusCode::CONFLICT)
        }
        Err(msg) => {
            // Verification failed
            eprintln!("Payment verification failed: {}", msg);
            Err(StatusCode::BAD_REQUEST)
        }
    }
}

/// Get session details.
pub async fn get_session(Path(id): Path<String>) -> Result<Json<Session>, StatusCode> {
    // TODO: Implement persistent session storage.
    let _ = id;
    Err(StatusCode::NOT_IMPLEMENTED)
}

/// `GET /devices/:id/analytics`
///
/// Query params:
/// - `period`   – daily | weekly | monthly  (default: daily)
/// - `lookback` – number of periods to include (default: 30/12/12)
/// - `format`   – json | csv  (default: json)
///
/// Returns a full analytics report for the device owner.
/// Use `format=csv` for an exportable spreadsheet.
pub async fn get_device_analytics(
    Path(id): Path<String>,
    Query(query): Query<AnalyticsQuery>,
) -> Response {
    let report = match analytics::generate_report(&id, &query) {
        Some(r) => r,
        None => {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({ "error": "Device not found" })))
                .into_response();
        }
    };

    let want_csv = query
        .format
        .as_deref()
        .map(|f| f.eq_ignore_ascii_case("csv"))
        .unwrap_or(false);

    if want_csv {
        match analytics::report_to_csv(&report) {
            Ok(csv) => (
                StatusCode::OK,
                [
                    (
                        header::CONTENT_TYPE,
                        "text/csv; charset=utf-8",
                    ),
                    (
                        header::CONTENT_DISPOSITION,
                        "attachment; filename=\"analytics.csv\"",
                    ),
                ],
                csv,
            )
                .into_response(),
            Err(e) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e })),
            )
                .into_response(),
        }
    } else {
        Json(report).into_response()
    }
}
