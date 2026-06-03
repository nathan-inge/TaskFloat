use axum::{
    extract::{Path, State},
    routing::{get, patch},
    Json, Router,
};
use chrono::Utc;
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::domain::context_tree;
use crate::error::{AppError, AppResult};
use crate::models::{Context, ContextNode, ContextTaskCount, CreateContext, UpdateContext};

pub fn router() -> Router<SqlitePool> {
    Router::new()
        .route("/contexts", get(list_contexts).post(create_context))
        .route("/contexts/tree", get(list_contexts_tree))
        .route("/contexts/task-counts", get(list_task_counts))
        .route(
            "/contexts/:id",
            patch(update_context).delete(delete_context),
        )
}

#[utoipa::path(get, path = "/api/contexts", responses((status = 200, body = [Context])))]
pub async fn list_contexts(State(pool): State<SqlitePool>) -> AppResult<Json<Vec<Context>>> {
    let rows = sqlx::query_as::<_, Context>("SELECT * FROM contexts ORDER BY name")
        .fetch_all(&pool)
        .await?;
    Ok(Json(rows))
}

#[utoipa::path(get, path = "/api/contexts/tree", responses((status = 200, body = [ContextNode])))]
pub async fn list_contexts_tree(
    State(pool): State<SqlitePool>,
) -> AppResult<Json<Vec<ContextNode>>> {
    let rows = sqlx::query_as::<_, Context>("SELECT * FROM contexts ORDER BY name")
        .fetch_all(&pool)
        .await?;
    Ok(Json(ContextNode::build_forest(rows)))
}

#[utoipa::path(post, path = "/api/contexts", request_body = CreateContext, responses((status = 201, body = Context)))]
pub async fn create_context(
    State(pool): State<SqlitePool>,
    Json(body): Json<CreateContext>,
) -> AppResult<Json<Context>> {
    if body.name.trim().is_empty() {
        return Err(AppError::BadRequest("name is required".into()));
    }
    if let Some(parent_id) = &body.parent_id {
        let exists: Option<i64> =
            sqlx::query_scalar("SELECT 1 FROM contexts WHERE id = ?1")
                .bind(parent_id)
                .fetch_optional(&pool)
                .await?;
        if exists.is_none() {
            return Err(AppError::BadRequest("parent_id does not exist".into()));
        }
    } else {
        // Root-level uniqueness check (SQLite treats NULLs as distinct in UNIQUE).
        let dup: Option<i64> = sqlx::query_scalar(
            "SELECT 1 FROM contexts WHERE parent_id IS NULL AND name = ?1",
        )
        .bind(&body.name)
        .fetch_optional(&pool)
        .await?;
        if dup.is_some() {
            return Err(AppError::Conflict("a root context with that name already exists".into()));
        }
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    sqlx::query(
        "INSERT INTO contexts (id, name, parent_id, color, icon, created_at) VALUES (?,?,?,?,?,?)",
    )
    .bind(&id)
    .bind(&body.name)
    .bind(&body.parent_id)
    .bind(&body.color)
    .bind(&body.icon)
    .bind(now)
    .execute(&pool)
    .await
    .map_err(map_sqlite_unique)?;

    let ctx = sqlx::query_as::<_, Context>("SELECT * FROM contexts WHERE id = ?1")
        .bind(&id)
        .fetch_one(&pool)
        .await?;
    Ok(Json(ctx))
}

#[utoipa::path(patch, path = "/api/contexts/{id}", request_body = UpdateContext, responses((status = 200, body = Context)))]
pub async fn update_context(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
    Json(body): Json<UpdateContext>,
) -> AppResult<Json<Context>> {
    let existing: Option<Context> = sqlx::query_as("SELECT * FROM contexts WHERE id = ?1")
        .bind(&id)
        .fetch_optional(&pool)
        .await?;
    let Some(_) = existing else {
        return Err(AppError::NotFound(format!("context {} not found", id)));
    };

    if let Some(parent) = &body.parent_id {
        match parent {
            Some(new_parent_id) => {
                let exists: Option<i64> =
                    sqlx::query_scalar("SELECT 1 FROM contexts WHERE id = ?1")
                        .bind(new_parent_id)
                        .fetch_optional(&pool)
                        .await?;
                if exists.is_none() {
                    return Err(AppError::BadRequest("parent_id does not exist".into()));
                }
                if context_tree::would_create_cycle(&pool, &id, new_parent_id).await? {
                    return Err(AppError::BadRequest(
                        "reparenting would create a cycle".into(),
                    ));
                }
            }
            None => {}
        }
    }

    let mut qb: sqlx::QueryBuilder<sqlx::Sqlite> =
        sqlx::QueryBuilder::new("UPDATE contexts SET id = id");
    if let Some(name) = body.name.as_ref() {
        qb.push(", name = ").push_bind(name);
    }
    if let Some(color) = body.color.as_ref() {
        qb.push(", color = ").push_bind(color);
    }
    if let Some(icon) = &body.icon {
        qb.push(", icon = ").push_bind(icon.clone());
    }
    if let Some(parent) = &body.parent_id {
        qb.push(", parent_id = ").push_bind(parent.clone());
    }
    qb.push(" WHERE id = ").push_bind(&id);
    qb.build()
        .execute(&pool)
        .await
        .map_err(map_sqlite_unique)?;

    let ctx = sqlx::query_as::<_, Context>("SELECT * FROM contexts WHERE id = ?1")
        .bind(&id)
        .fetch_one(&pool)
        .await?;
    Ok(Json(ctx))
}

#[utoipa::path(delete, path = "/api/contexts/{id}", responses((status = 204)))]
pub async fn delete_context(
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> AppResult<axum::http::StatusCode> {
    let existing: Option<i64> = sqlx::query_scalar("SELECT 1 FROM contexts WHERE id = ?1")
        .bind(&id)
        .fetch_optional(&pool)
        .await?;
    if existing.is_none() {
        return Err(AppError::NotFound(format!("context {} not found", id)));
    }
    if context_tree::has_children(&pool, &id).await? {
        return Err(AppError::Conflict(
            "context has children; delete or reparent them first".into(),
        ));
    }
    if context_tree::has_tasks_in_subtree(&pool, &id).await? {
        return Err(AppError::Conflict(
            "context (or descendants) still has tasks; move or delete them first".into(),
        ));
    }
    // Clear settings.current_context_id if it pointed here.
    sqlx::query("UPDATE settings SET current_context_id = NULL WHERE current_context_id = ?1")
        .bind(&id)
        .execute(&pool)
        .await?;
    sqlx::query("DELETE FROM contexts WHERE id = ?1")
        .bind(&id)
        .execute(&pool)
        .await?;
    Ok(axum::http::StatusCode::NO_CONTENT)
}

#[utoipa::path(
    get,
    path = "/api/contexts/task-counts",
    responses((status = 200, body = [ContextTaskCount]))
)]
pub async fn list_task_counts(
    State(pool): State<SqlitePool>,
) -> AppResult<Json<Vec<ContextTaskCount>>> {
    // Per-context count of incomplete, currently-available tasks. The client rolls
    // these up into subtree totals using the context tree.
    let now = chrono::Utc::now();
    let rows = sqlx::query_as::<_, ContextTaskCount>(
        r#"SELECT context_id, COUNT(*) AS count
             FROM tasks
            WHERE completed_at IS NULL
              AND (available_from IS NULL OR available_from <= ?1)
         GROUP BY context_id"#,
    )
    .bind(now)
    .fetch_all(&pool)
    .await?;
    Ok(Json(rows))
}

fn map_sqlite_unique(e: sqlx::Error) -> AppError {
    if let sqlx::Error::Database(ref db) = e {
        if db.message().contains("UNIQUE") {
            return AppError::Conflict("duplicate name under that parent".into());
        }
    }
    AppError::Sqlx(e)
}
