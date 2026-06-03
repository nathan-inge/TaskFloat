use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Settings {
    pub id: i64,
    pub daily_capacity_hrs: f64,
    pub workday_start: String,
    pub workday_end: String,
    pub current_context_id: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema, Default)]
pub struct UpdateSettings {
    pub daily_capacity_hrs: Option<f64>,
    pub workday_start: Option<String>,
    pub workday_end: Option<String>,
    #[serde(default, deserialize_with = "crate::models::double_option")]
    pub current_context_id: Option<Option<String>>,
}
