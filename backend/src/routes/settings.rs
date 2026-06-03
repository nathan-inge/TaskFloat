use axum::{
    extract::State,
    routing::get,
    Json, Router,
};
use sqlx::SqlitePool;

use crate::error::{AppError, AppResult};
use crate::models::{Settings, UpdateSettings};

pub fn router() -> Router<SqlitePool> {
    Router::new().route("/settings", get(get_settings).put(update_settings))
}

#[utoipa::path(get, path = "/api/settings", responses((status = 200, body = Settings)))]
pub async fn get_settings(State(pool): State<SqlitePool>) -> AppResult<Json<Settings>> {
    let s: Settings = sqlx::query_as("SELECT * FROM settings WHERE id = 1")
        .fetch_one(&pool)
        .await?;
    Ok(Json(s))
}

#[utoipa::path(put, path = "/api/settings", request_body = UpdateSettings, responses((status = 200, body = Settings)))]
pub async fn update_settings(
    State(pool): State<SqlitePool>,
    Json(body): Json<UpdateSettings>,
) -> AppResult<Json<Settings>> {
    if let Some(hrs) = body.daily_capacity_hrs {
        if !(hrs > 0.0 && hrs <= 24.0) {
            return Err(AppError::BadRequest(
                "daily_capacity_hrs must be between 0 and 24".into(),
            ));
        }
    }
    if let Some(Some(cid)) = &body.current_context_id {
        let exists: Option<i64> = sqlx::query_scalar("SELECT 1 FROM contexts WHERE id = ?1")
            .bind(cid)
            .fetch_optional(&pool)
            .await?;
        if exists.is_none() {
            return Err(AppError::BadRequest(
                "current_context_id does not exist".into(),
            ));
        }
    }

    let mut qb: sqlx::QueryBuilder<sqlx::Sqlite> =
        sqlx::QueryBuilder::new("UPDATE settings SET id = id");
    if let Some(hrs) = body.daily_capacity_hrs {
        qb.push(", daily_capacity_hrs = ").push_bind(hrs);
    }
    if let Some(start) = body.workday_start.as_ref() {
        qb.push(", workday_start = ").push_bind(start);
    }
    if let Some(end) = body.workday_end.as_ref() {
        qb.push(", workday_end = ").push_bind(end);
    }
    if let Some(cid) = &body.current_context_id {
        qb.push(", current_context_id = ").push_bind(cid.clone());
    }
    qb.push(" WHERE id = 1");
    qb.build().execute(&pool).await?;

    let s: Settings = sqlx::query_as("SELECT * FROM settings WHERE id = 1")
        .fetch_one(&pool)
        .await?;
    Ok(Json(s))
}
