use axum::{
    extract::Json,
    http::Method,
    routing::post,
    Router,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};

const FEE_EUR: f64 = 1.0;

#[derive(Debug, Deserialize)]
struct QuoteRequest {
    asset: String,
    fiat: String,
    amount: f64,
}

#[derive(Debug, Serialize)]
struct QuoteResponse {
    success: bool,
    receive_amount: f64,
    exchange_rate: f64,
    fee: f64,
    message: String,
}

fn exchange_rate_for_fiat(fiat: &str) -> Option<f64> {
    match fiat {
        "GEL" => Some(2.87),
        "USD" => Some(1.08),
        _ => None,
    }
}

fn compute_quote(req: QuoteRequest) -> QuoteResponse {
    if !req.asset.eq_ignore_ascii_case("EUR") {
        return QuoteResponse {
            success: false,
            receive_amount: 0.0,
            exchange_rate: 0.0,
            fee: FEE_EUR,
            message: format!(
                "Unsupported asset '{}'. Only EUR is supported for quotes.",
                req.asset
            ),
        };
    }

    if !req.amount.is_finite() || req.amount <= 0.0 {
        return QuoteResponse {
            success: false,
            receive_amount: 0.0,
            exchange_rate: 0.0,
            fee: FEE_EUR,
            message: "Amount must be a positive finite number.".to_string(),
        };
    }

    let Some(rate) = exchange_rate_for_fiat(req.fiat.as_str()) else {
        return QuoteResponse {
            success: false,
            receive_amount: 0.0,
            exchange_rate: 0.0,
            fee: FEE_EUR,
            message: format!(
                "Unsupported fiat '{}'. Use GEL or USD.",
                req.fiat
            ),
        };
    };

    if req.amount < FEE_EUR {
        return QuoteResponse {
            success: false,
            receive_amount: 0.0,
            exchange_rate: rate,
            fee: FEE_EUR,
            message: format!(
                "Amount must be at least {:.2} EUR to cover the {:.2} EUR fee.",
                FEE_EUR, FEE_EUR
            ),
        };
    }

    let net_eur = req.amount - FEE_EUR;
    let receive_amount = (net_eur * rate * 100.0).round() / 100.0;

    QuoteResponse {
        success: true,
        receive_amount,
        exchange_rate: rate,
        fee: FEE_EUR,
        message: "Quote ready.".to_string(),
    }
}

async fn quote_handler(Json(payload): Json<QuoteRequest>) -> Json<QuoteResponse> {
    Json(compute_quote(payload))
}

#[tokio::main]
async fn main() {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/v1/quote", post(quote_handler))
        .layer(cors);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("bind 0.0.0.0:8080");

    axum::serve(listener, app).await.expect("server exit");
}
