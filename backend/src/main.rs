use axum::{
    extract::{Json, State},
    http::{Method, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use url::Url;

const FEE_EUR: f64 = 1.0;
const TATUM_RATE_BASE: &str = "https://api.tatum.io/v4/data/rate/symbol";

fn load_env_files() {
    let backend_dotenv = concat!(env!("CARGO_MANIFEST_DIR"), "/.env");
    let _ = dotenvy::from_filename(backend_dotenv).ok();
    let _ = dotenvy::dotenv().ok();
}

#[derive(Clone)]
struct AppState {
    client: reqwest::Client,
    tatum_key: String,
}

#[derive(Debug, Deserialize)]
struct CalculateRequest {
    amount: f64,
    recipient_country: String,
}

#[derive(Debug, Serialize)]
struct CalculateResponse {
    success: bool,
    receive_amount: f64,
    fee_eur: f64,
    cross_rate_eur_to_target: f64,
    usdt_per_eur: f64,
    usdt_per_target: f64,
    target_currency: String,
    message: String,
}

#[derive(Debug, Deserialize)]
struct TatumRateBody {
    value: String,
}

fn resolve_target_fiat(recipient_country: &str) -> Result<&'static str, &'static str> {
    match recipient_country.trim().to_uppercase().as_str() {
        "GE" | "GEO" | "GEL" => Ok("GEL"),
        "US" | "USA" | "USD" => Ok("USD"),
        _ => Err("Unsupported recipient_country. Use GE (GEL) or US (USD)."),
    }
}

async fn fetch_usdt_per_unit(state: &AppState, symbol: &str) -> Result<f64, String> {
    let mut url = Url::parse(TATUM_RATE_BASE).map_err(|e| e.to_string())?;
    url.query_pairs_mut()
        .append_pair("symbol", symbol)
        .append_pair("basePair", "USDT");

    let resp = state
        .client
        .get(url)
        .header("x-api-key", &state.tatum_key)
        .send()
        .await
        .map_err(|e| format!("request failed: {e}"))?;

    let status = resp.status();
    let body = resp
        .text()
        .await
        .map_err(|e| format!("body read: {e}"))?;

    if !status.is_success() {
        return Err(format!(
            "Tatum error HTTP {} — {}",
            status,
            body.chars().take(280).collect::<String>()
        ));
    }

    let parsed: TatumRateBody =
        serde_json::from_str(&body).map_err(|e| format!("invalid JSON from Tatum: {e}"))?;

    let v: f64 = parsed
        .value
        .parse()
        .map_err(|_| format!("invalid rate value string: {}", parsed.value))?;

    if !v.is_finite() || v <= 0.0 {
        return Err(format!("non-positive rate for {symbol}: {v}"));
    }

    Ok(v)
}

async fn calculate_handler(State(state): State<Arc<AppState>>, Json(req): Json<CalculateRequest>) -> Response {
    let fee_eur = FEE_EUR;

    if state.tatum_key.trim().is_empty() {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(CalculateResponse {
                success: false,
                receive_amount: 0.0,
                fee_eur,
                cross_rate_eur_to_target: 0.0,
                usdt_per_eur: 0.0,
                usdt_per_target: 0.0,
                target_currency: String::new(),
                message: "Missing TATUM_API_KEY on server.".into(),
            }),
        )
            .into_response();
    }

    let target_sym = match resolve_target_fiat(&req.recipient_country) {
        Ok(s) => s,
        Err(msg) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(CalculateResponse {
                    success: false,
                    receive_amount: 0.0,
                    fee_eur,
                    cross_rate_eur_to_target: 0.0,
                    usdt_per_eur: 0.0,
                    usdt_per_target: 0.0,
                    target_currency: String::new(),
                    message: msg.into(),
                }),
            )
                .into_response();
        }
    };

    if !req.amount.is_finite() || req.amount <= fee_eur {
        return (
            StatusCode::BAD_REQUEST,
            Json(CalculateResponse {
                success: false,
                receive_amount: 0.0,
                fee_eur,
                cross_rate_eur_to_target: 0.0,
                usdt_per_eur: 0.0,
                usdt_per_target: 0.0,
                target_currency: target_sym.into(),
                message: format!("amount must be greater than {fee_eur} EUR (fee)."),
            }),
        )
            .into_response();
    }

    let (usdt_eur, usdt_tgt) = tokio::join!(
        fetch_usdt_per_unit(&state, "EUR"),
        fetch_usdt_per_unit(&state, target_sym),
    );

    let usdt_per_eur = match usdt_eur {
        Ok(v) => v,
        Err(e) => {
            return (
                StatusCode::BAD_GATEWAY,
                Json(CalculateResponse {
                    success: false,
                    receive_amount: 0.0,
                    fee_eur,
                    cross_rate_eur_to_target: 0.0,
                    usdt_per_eur: 0.0,
                    usdt_per_target: 0.0,
                    target_currency: target_sym.into(),
                    message: e,
                }),
            )
                .into_response();
        }
    };

    let usdt_per_target = match usdt_tgt {
        Ok(v) => v,
        Err(e) => {
            return (
                StatusCode::BAD_GATEWAY,
                Json(CalculateResponse {
                    success: false,
                    receive_amount: 0.0,
                    fee_eur,
                    cross_rate_eur_to_target: 0.0,
                    usdt_per_eur,
                    usdt_per_target: 0.0,
                    target_currency: target_sym.into(),
                    message: e,
                }),
            )
                .into_response();
        }
    };

    let cross = usdt_per_eur / usdt_per_target;
    if !cross.is_finite() || cross <= 0.0 {
        return (
            StatusCode::BAD_GATEWAY,
            Json(CalculateResponse {
                success: false,
                receive_amount: 0.0,
                fee_eur,
                cross_rate_eur_to_target: 0.0,
                usdt_per_eur,
                usdt_per_target,
                target_currency: target_sym.into(),
                message: "Computed cross-rate invalid.".into(),
            }),
        )
            .into_response();
    }

    let net_eur = req.amount - fee_eur;
    let receive_raw = net_eur * cross;
    let receive_amount = (receive_raw * 100.0).round() / 100.0;

    (
        StatusCode::OK,
        Json(CalculateResponse {
            success: true,
            receive_amount,
            fee_eur,
            cross_rate_eur_to_target: cross,
            usdt_per_eur,
            usdt_per_target,
            target_currency: target_sym.into(),
            message: "Calculated from live Tatum USDT crosses.".into(),
        }),
    )
        .into_response()
}

async fn health_handler() -> impl IntoResponse {
    Json(serde_json::json!({
        "ok": true,
        "service": "p2p-remittance-api",
        "version": env!("CARGO_PKG_VERSION"),
    }))
}

async fn root_handler() -> impl IntoResponse {
    (
        [(axum::http::header::CONTENT_TYPE, "text/plain; charset=utf-8")],
        "POST /api/v1/calculate — EUR→GEL/USD via Tatum USDT crosses\nGET /health\n",
    )
}

#[tokio::main]
async fn main() {
    load_env_files();

    let tatum_key = std::env::var("TATUM_API_KEY").unwrap_or_default().trim().to_string();
    if tatum_key.is_empty() {
        eprintln!("WARNING: TATUM_API_KEY empty — calculate endpoint returns 503 until set.");
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .expect("reqwest Client");

    let state = Arc::new(AppState {
        client,
        tatum_key,
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(Any);

    let app = Router::new()
        .route("/", get(root_handler))
        .route("/health", get(health_handler))
        .route("/api/v1/calculate", post(calculate_handler))
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("bind 0.0.0.0:8080");

    axum::serve(listener, app).await.expect("server exit");
}
