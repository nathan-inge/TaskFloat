use axum::{routing::get, Json, Router};
use serde::Serialize;
use sqlx::SqlitePool;
use utoipa::ToSchema;

#[derive(Serialize, ToSchema)]
pub struct Health {
    pub status: &'static str,
}

pub fn router() -> Router<SqlitePool> {
    Router::new().route("/health", get(health))
}

#[utoipa::path(get, path = "/api/health", responses((status = 200, body = Health)))]
pub async fn health() -> Json<Health> {
    Json(Health { status: "ok" })
}
