pub mod contexts;
pub mod health;
pub mod settings;
pub mod tasks;

use axum::Router;
use sqlx::SqlitePool;

pub fn api_router(pool: SqlitePool) -> Router {
    Router::new()
        .merge(health::router())
        .merge(contexts::router())
        .merge(tasks::router())
        .merge(settings::router())
        .with_state(pool)
}
