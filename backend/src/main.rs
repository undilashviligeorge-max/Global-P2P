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
const OPENROUTER_URL: &str = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_OPENROUTER_MODEL: &str = "openai/gpt-4o-mini";
const DEFAULT_PORT: u16 = 10_000;

fn load_env_files() {
    let backend_dotenv = concat!(env!("CARGO_MANIFEST_DIR"), "/.env");
    let _ = dotenvy::from_filename(backend_dotenv).ok();
    let _ = dotenvy::dotenv().ok();
}

#[derive(Clone)]
struct AppState {
    client: reqwest::Client,
    tatum_key: String,
    openrouter_key: String,
    openrouter_model: String,
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

#[derive(Serialize)]
struct OpenRouterMessage {
    role: String,
    content: String,
}

#[derive(Serialize)]
struct OpenRouterRequest {
    model: String,
    messages: Vec<OpenRouterMessage>,
    temperature: f32,
    max_tokens: u32,
}

#[derive(Deserialize)]
struct OpenRouterChoice {
    message: OpenRouterMessageBody,
}

#[derive(Deserialize)]
struct OpenRouterMessageBody {
    content: String,
}

#[derive(Deserialize)]
struct OpenRouterApiResponse {
    choices: Vec<OpenRouterChoice>,
}

#[derive(Deserialize)]
struct P2pGelAdvice {
    usdt_per_gel: f64,
    #[serde(default)]
    note: String,
}

fn resolve_target_fiat(recipient_country: &str) -> Result<&'static str, &'static str> {
    match recipient_country.trim().to_uppercase().as_str() {
        "GE" | "GEO" | "GEL" => Ok("GEL"),
        "US" | "USA" | "USD" => Ok("USD"),
        _ => Err("Unsupported recipient_country. Use GE (GEL) or US (USD)."),
    }
}

fn extract_first_json_object(text: &str) -> Option<&str> {
    let start = text.find('{')?;
    let mut depth = 0i32;
    for (i, ch) in text[start..].char_indices() {
        match ch {
            '{' => depth += 1,
            '}' => {
                depth -= 1;
                if depth == 0 {
                    let end = start + i + ch.len_utf8();
                    return Some(&text[start..end]);
                }
            }
            _ => {}
        }
    }
    None
}

fn strip_markdown_fence(text: &str) -> String {
    let t = text.trim();
    if let Some(pos) = t.find("```") {
        let after = &t[pos + 3..];
        let after = after
            .strip_prefix("json")
            .unwrap_or(after)
            .trim_start_matches(|c: char| c.is_whitespace());
        if let Some(end) = after.rfind("```") {
            return after[..end].trim().to_string();
        }
        return after.trim().to_string();
    }
    t.to_string()
}

fn clamp_p2p_usdt_per_gel(spot: f64, proposed: f64) -> f64 {
    if !spot.is_finite() || spot <= 0.0 {
        return proposed;
    }
    let lo = spot * 0.82;
    let hi = spot * 1.18;
    proposed.clamp(lo, hi)
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

async fn refine_usdt_gel_via_openrouter(
    state: &AppState,
    spot_usdt_per_gel: f64,
) -> Result<(f64, String), String> {
    if state.openrouter_key.trim().is_empty() {
        return Err("OPENROUTER_API_KEY empty".into());
    }

    let prompt = format!(
        "You assist with retail P2P USDT/GEL pricing in Georgia. \
Aggregator spot reference: {:.6} USDT per 1 GEL (same units: how many USDT buys one GEL). \
Suggest one realistic P2P rate in those exact units, slightly reflecting typical spreads, liquidity, and informal market risk. \
Reply with ONLY a JSON object (no markdown), keys: usdt_per_gel (number), note (short string, may be empty).",
        spot_usdt_per_gel
    );

    let body = OpenRouterRequest {
        model: state.openrouter_model.clone(),
        messages: vec![OpenRouterMessage {
            role: "user".into(),
            content: prompt,
        }],
        temperature: 0.2,
        max_tokens: 220,
    };

    let resp = state
        .client
        .post(OPENROUTER_URL)
        .header(
            "Authorization",
            format!("Bearer {}", state.openrouter_key.trim()),
        )
        .header("HTTP-Referer", "https://github.com/undilashviligeorge-max/Global-P2P")
        .header("X-Title", "P2P Remittance API")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("OpenRouter request failed: {e}"))?;

    let status = resp.status();
    let text = resp.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(format!(
            "OpenRouter HTTP {status}: {}",
            text.chars().take(320).collect::<String>()
        ));
    }

    let parsed: OpenRouterApiResponse =
        serde_json::from_str(&text).map_err(|e| format!("OpenRouter JSON: {e}"))?;

    let content = parsed
        .choices
        .first()
        .map(|c| c.message.content.as_str())
        .ok_or_else(|| "OpenRouter returned no choices".to_string())?;

    let stripped = strip_markdown_fence(content);
    let json_slice = extract_first_json_object(&stripped)
        .ok_or_else(|| "No JSON object in model output.".to_string())?;

    let advice: P2pGelAdvice =
        serde_json::from_str(json_slice).map_err(|e| format!("Model JSON parse: {e}"))?;

    if !advice.usdt_per_gel.is_finite() || advice.usdt_per_gel <= 0.0 {
        return Err("Model returned invalid usdt_per_gel".into());
    }

    let clamped = clamp_p2p_usdt_per_gel(spot_usdt_per_gel, advice.usdt_per_gel);
    let suffix = if advice.note.trim().is_empty() {
        "OpenRouter P2P USDT/GEL hint applied.".into()
    } else {
        format!("OpenRouter: {}", advice.note.trim().chars().take(160).collect::<String>())
    };

    Ok((clamped, suffix))
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

    let mut usdt_per_target = match usdt_tgt {
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

    let mut p2p_note: Option<String> = None;
    if target_sym == "GEL" && !state.openrouter_key.trim().is_empty() {
        match refine_usdt_gel_via_openrouter(&state, usdt_per_target).await {
            Ok((refined, note)) => {
                usdt_per_target = refined;
                p2p_note = Some(note);
            }
            Err(e) => {
                eprintln!("openrouter USDT/GEL refine skipped: {e}");
            }
        }
    }

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

    let base_msg = match p2p_note {
        Some(n) => format!("Live Tatum USDT crosses; {n}"),
        None if target_sym == "GEL" && state.openrouter_key.trim().is_empty() => {
            "Calculated from live Tatum USDT crosses (set OPENROUTER_API_KEY for optional P2P GEL refinement)."
                .to_string()
        }
        None => "Calculated from live Tatum USDT crosses.".to_string(),
    };

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
            message: base_msg,
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
        "POST /api/v1/calculate — EUR→GEL/USD via Tatum (+ optional OpenRouter P2P USDT/GEL for GE)\nGET /health\n",
    )
}

#[tokio::main]
async fn main() {
    load_env_files();

    let tatum_key = std::env::var("TATUM_API_KEY").unwrap_or_default().trim().to_string();
    if tatum_key.is_empty() {
        eprintln!("WARNING: TATUM_API_KEY empty — calculate endpoint returns 503 until set.");
    }

    let openrouter_key = std::env::var("OPENROUTER_API_KEY")
        .unwrap_or_default()
        .trim()
        .to_string();
    if openrouter_key.is_empty() {
        eprintln!("INFO: OPENROUTER_API_KEY empty — USDT/GEL uses Tatum spot only.");
    }

    let openrouter_model = std::env::var("OPENROUTER_MODEL")
        .unwrap_or_else(|_| DEFAULT_OPENROUTER_MODEL.to_string())
        .trim()
        .to_string();
    let openrouter_model = if openrouter_model.is_empty() {
        DEFAULT_OPENROUTER_MODEL.to_string()
    } else {
        openrouter_model
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .expect("reqwest Client");

    let state = Arc::new(AppState {
        client,
        tatum_key,
        openrouter_key,
        openrouter_model,
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

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(DEFAULT_PORT);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .unwrap_or_else(|e| panic!("bind 0.0.0.0:{port}: {e}"));

    eprintln!("listening on http://0.0.0.0:{port}");
    axum::serve(listener, app).await.expect("server exit");
}
