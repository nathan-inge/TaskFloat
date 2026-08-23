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
    pub parent_id: Option<String>,
    pub available_from: Option<DateTime<Utc>>,
    pub due_by: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    /// Direct children, counted server-side so the UI stays honest even when
    /// subtasks are filtered out of the current view.
    pub subtask_count: i64,
    pub subtask_done_count: i64,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateTask {
    pub title: String,
    pub effort_minutes: i64,
    pub context_id: String,
    pub parent_id: Option<String>,
    pub available_from: Option<DateTime<Utc>>,
    pub due_by: Option<DateTime<Utc>>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema, Default)]
pub struct UpdateTask {
    pub title: Option<String>,
    pub effort_minutes: Option<i64>,
    pub context_id: Option<String>,
    /// Double-Option: absent = unchanged, null = promote to top level, id = reparent.
    #[serde(default, deserialize_with = "crate::models::double_option")]
    pub parent_id: Option<Option<String>>,
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
