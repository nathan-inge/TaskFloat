use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub effort_minutes: i64,
    pub context_id: String,
    pub available_from: Option<DateTime<Utc>>,
    pub due_by: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateTask {
    pub title: String,
    pub effort_minutes: i64,
    pub context_id: String,
    pub available_from: Option<DateTime<Utc>>,
    pub due_by: Option<DateTime<Utc>>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema, Default)]
pub struct UpdateTask {
    pub title: Option<String>,
    pub effort_minutes: Option<i64>,
    pub context_id: Option<String>,
    pub available_from: Option<DateTime<Utc>>,
    pub due_by: Option<DateTime<Utc>>,
    #[serde(default, deserialize_with = "crate::models::double_option")]
    pub notes: Option<Option<String>>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct TaskListResponse {
    pub tasks: Vec<Task>,
    pub capacity_warning: bool,
}
