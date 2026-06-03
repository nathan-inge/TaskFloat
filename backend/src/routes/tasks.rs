use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use sqlx::SqlitePool;
use utoipa::IntoParams;
use uuid::Uuid;

use crate::domain::{context_tree, slack_time};
use crate::error::{AppError, AppResult};
use crate::models::{CreateTask, Settings, Task, TaskListResponse, UpdateTask};

pub fn router() -> Router<SqlitePool> {
    Router::new()
        .route("/tasks", get(list_tasks).post(create_task))
        .route(
            "/tasks/:id",
            get(get_task)
                .patch(update_task)
                .delete(delete_task),
        )
        .route("/tasks/:id/complete", post(complete_task))
        .route("/tasks/:id/uncomplete", post(uncomplete_task))
}

#[utoipa::path(get, path = "/api/tasks/{id}", responses((status = 200, body = Task)))]
pub async fn get_task(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> AppResult<Json<Task>> {
    let task: Option<Task> = sqlx::query_as("SELECT * FROM tasks WHERE id = ?1")
        .bind(&id)
        .fetch_optional(&pool)
        .await?;
    match task {
        Some(t) => Ok(Json(t)),
        None => Err(AppError::NotFound(format!("task {} not found", id))),
    }
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct ListTasksQuery {
    pub context_id: Option<String>,
    pub include_descendants: Option<bool>,
    pub include_completed: Option<bool>,
    pub completed_after: Option<DateTime<Utc>>,
    pub completed_before: Option<DateTime<Utc>>,
}

#[utoipa::path(
    get,
    path = "/api/tasks",
    params(ListTasksQuery),
    responses((status = 200, body = TaskListResponse))
)]
pub async fn list_tasks(
    State(pool): State<SqlitePool>,
    Query(q): Query<ListTasksQuery>,
) -> AppResult<Json<TaskListResponse>> {
    let now = Utc::now();
    let include_descendants = q.include_descendants.unwrap_or(true);

    let ctx_ids: Option<Vec<String>> = match (&q.context_id, include_descendants) {
        (Some(id), true) => Some(context_tree::descendant_ids(&pool, id).await?),
        (Some(id), false) => Some(vec![id.clone()]),
        (None, _) => None,
    };

    let include_completed = q.include_completed.unwrap_or(false)
        || q.completed_after.is_some()
        || q.completed_before.is_some();

    let mut qb: sqlx::QueryBuilder<sqlx::Sqlite> =
        sqlx::QueryBuilder::new("SELECT * FROM tasks WHERE 1=1");

    if let Some(ids) = &ctx_ids {
        if ids.is_empty() {
            return Ok(Json(TaskListResponse {
                tasks: vec![],
                capacity_warning: false,
            }));
        }
        qb.push(" AND context_id IN (");
        let mut sep = qb.separated(", ");
        for id in ids {
            sep.push_bind(id);
        }
        qb.push(")");
    }

    if !include_completed {
        qb.push(" AND completed_at IS NULL");
    }

    if let Some(after) = &q.completed_after {
        qb.push(" AND completed_at >= ").push_bind(after);
    }
    if let Some(before) = &q.completed_before {
        qb.push(" AND completed_at < ").push_bind(before);
    }

    // Availability filter — hide future-unlocked tasks unless explicitly looking at completed.
    if !include_completed {
        qb.push(" AND (available_from IS NULL OR available_from <= ")
            .push_bind(now)
            .push(")");
    }

    let mut tasks: Vec<Task> = qb.build_query_as().fetch_all(&pool).await?;

    // Sort ascending by Slack Time; null due_by sinks to bottom.
    tasks.sort_by_key(|t| {
        let st = slack_time::compute_slack_minutes(t.due_by, t.effort_minutes, now);
        (st.is_none(), st.unwrap_or(i64::MAX))
    });

    let settings: Settings = sqlx::query_as("SELECT * FROM settings WHERE id = 1")
        .fetch_one(&pool)
        .await?;
    let capacity_warning = slack_time::capacity_warning(&tasks, &settings, now);

    Ok(Json(TaskListResponse {
        tasks,
        capacity_warning,
    }))
}

#[utoipa::path(post, path = "/api/tasks", request_body = CreateTask, responses((status = 201, body = Task)))]
pub async fn create_task(
    State(pool): State<SqlitePool>,
    Json(body): Json<CreateTask>,
) -> AppResult<Json<Task>> {
    if body.title.trim().is_empty() {
        return Err(AppError::BadRequest("title is required".into()));
    }
    if body.effort_minutes <= 0 {
        return Err(AppError::BadRequest(
            "effort_minutes must be > 0".into(),
        ));
    }
    let ctx_exists: Option<i64> =
        sqlx::query_scalar("SELECT 1 FROM contexts WHERE id = ?1")
            .bind(&body.context_id)
            .fetch_optional(&pool)
            .await?;
    if ctx_exists.is_none() {
        return Err(AppError::BadRequest("context_id does not exist".into()));
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    sqlx::query(
        r#"INSERT INTO tasks
            (id, title, effort_minutes, context_id, available_from, due_by, completed_at, created_at, updated_at)
            VALUES (?,?,?,?,?,?,NULL,?,?)"#,
    )
    .bind(&id)
    .bind(&body.title)
    .bind(body.effort_minutes)
    .bind(&body.context_id)
    .bind(body.available_from)
    .bind(body.due_by)
    .bind(now)
    .bind(now)
    .execute(&pool)
    .await?;

    let task = sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = ?1")
        .bind(&id)
        .fetch_one(&pool)
        .await?;
    Ok(Json(task))
}

#[utoipa::path(patch, path = "/api/tasks/{id}", request_body = UpdateTask, responses((status = 200, body = Task)))]
pub async fn update_task(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
    Json(body): Json<UpdateTask>,
) -> AppResult<Json<Task>> {
    let exists: Option<i64> = sqlx::query_scalar("SELECT 1 FROM tasks WHERE id = ?1")
        .bind(&id)
        .fetch_optional(&pool)
        .await?;
    if exists.is_none() {
        return Err(AppError::NotFound(format!("task {} not found", id)));
    }

    if let Some(em) = body.effort_minutes {
        if em <= 0 {
            return Err(AppError::BadRequest(
                "effort_minutes must be > 0".into(),
            ));
        }
    }
    if let Some(cid) = &body.context_id {
        let ctx_exists: Option<i64> =
            sqlx::query_scalar("SELECT 1 FROM contexts WHERE id = ?1")
                .bind(cid)
                .fetch_optional(&pool)
                .await?;
        if ctx_exists.is_none() {
            return Err(AppError::BadRequest("context_id does not exist".into()));
        }
    }

    let now = Utc::now();
    let mut qb: sqlx::QueryBuilder<sqlx::Sqlite> =
        sqlx::QueryBuilder::new("UPDATE tasks SET updated_at = ");
    qb.push_bind(now);
    if let Some(title) = body.title.as_ref() {
        qb.push(", title = ").push_bind(title);
    }
    if let Some(em) = body.effort_minutes {
        qb.push(", effort_minutes = ").push_bind(em);
    }
    if let Some(cid) = body.context_id.as_ref() {
        qb.push(", context_id = ").push_bind(cid);
    }
    if let Some(af) = body.available_from {
        qb.push(", available_from = ").push_bind(af);
    }
    if let Some(db) = body.due_by {
        qb.push(", due_by = ").push_bind(db);
    }
    qb.push(" WHERE id = ").push_bind(&id);
    qb.build().execute(&pool).await?;

    let task = sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = ?1")
        .bind(&id)
        .fetch_one(&pool)
        .await?;
    Ok(Json(task))
}

#[utoipa::path(post, path = "/api/tasks/{id}/complete", responses((status = 200, body = Task)))]
pub async fn complete_task(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> AppResult<Json<Task>> {
    let now = Utc::now();
    let res = sqlx::query("UPDATE tasks SET completed_at = ?1, updated_at = ?1 WHERE id = ?2")
        .bind(now)
        .bind(&id)
        .execute(&pool)
        .await?;
    if res.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("task {} not found", id)));
    }
    let task = sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = ?1")
        .bind(&id)
        .fetch_one(&pool)
        .await?;
    Ok(Json(task))
}

#[utoipa::path(post, path = "/api/tasks/{id}/uncomplete", responses((status = 200, body = Task)))]
pub async fn uncomplete_task(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> AppResult<Json<Task>> {
    let now = Utc::now();
    let res = sqlx::query("UPDATE tasks SET completed_at = NULL, updated_at = ?1 WHERE id = ?2")
        .bind(now)
        .bind(&id)
        .execute(&pool)
        .await?;
    if res.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("task {} not found", id)));
    }
    let task = sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = ?1")
        .bind(&id)
        .fetch_one(&pool)
        .await?;
    Ok(Json(task))
}

#[utoipa::path(delete, path = "/api/tasks/{id}", responses((status = 204)))]
pub async fn delete_task(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> AppResult<axum::http::StatusCode> {
    let res = sqlx::query("DELETE FROM tasks WHERE id = ?1")
        .bind(&id)
        .execute(&pool)
        .await?;
    if res.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("task {} not found", id)));
    }
    Ok(axum::http::StatusCode::NO_CONTENT)
}
