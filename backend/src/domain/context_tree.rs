use crate::error::AppResult;
use sqlx::SqlitePool;

/// All descendant IDs of `root_id`, including `root_id` itself.
pub async fn descendant_ids(pool: &SqlitePool, root_id: &str) -> AppResult<Vec<String>> {
    let rows = sqlx::query_scalar::<_, String>(
        r#"
        WITH RECURSIVE subtree(id) AS (
            SELECT id FROM contexts WHERE id = ?1
            UNION ALL
            SELECT c.id FROM contexts c JOIN subtree s ON c.parent_id = s.id
        )
        SELECT id FROM subtree
        "#,
    )
    .bind(root_id)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

/// True if reparenting `target_id` under `new_parent_id` would create a cycle.
pub async fn would_create_cycle(
    pool: &SqlitePool,
    target_id: &str,
    new_parent_id: &str,
) -> AppResult<bool> {
    if target_id == new_parent_id {
        return Ok(true);
    }
    let mut cursor = Some(new_parent_id.to_string());
    while let Some(node) = cursor {
        if node == target_id {
            return Ok(true);
        }
        let parent: Option<Option<String>> = sqlx::query_scalar::<_, Option<String>>(
            "SELECT parent_id FROM contexts WHERE id = ?1",
        )
        .bind(&node)
        .fetch_optional(pool)
        .await?;
        cursor = parent.flatten();
    }
    Ok(false)
}

pub async fn has_children(pool: &SqlitePool, context_id: &str) -> AppResult<bool> {
    let row: Option<i64> =
        sqlx::query_scalar("SELECT 1 FROM contexts WHERE parent_id = ?1 LIMIT 1")
            .bind(context_id)
            .fetch_optional(pool)
            .await?;
    Ok(row.is_some())
}

pub async fn has_tasks_in_subtree(pool: &SqlitePool, context_id: &str) -> AppResult<bool> {
    let ids = descendant_ids(pool, context_id).await?;
    if ids.is_empty() {
        return Ok(false);
    }
    let placeholders = vec!["?"; ids.len()].join(",");
    let sql = format!(
        "SELECT 1 FROM tasks WHERE context_id IN ({}) LIMIT 1",
        placeholders
    );
    let mut q = sqlx::query_scalar::<_, i64>(&sql);
    for id in &ids {
        q = q.bind(id);
    }
    Ok(q.fetch_optional(pool).await?.is_some())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;

    async fn test_pool() -> SqlitePool {
        let pool = sqlx::sqlite::SqlitePoolOptions::new()
            .connect("sqlite::memory:")
            .await
            .unwrap();
        db::run_migrations(&pool).await.unwrap();
        pool
    }

    async fn ctx(pool: &SqlitePool, id: &str, parent: Option<&str>) {
        sqlx::query(
            "INSERT INTO contexts (id, name, parent_id, color, created_at) VALUES (?,?,?,?,?)",
        )
        .bind(id)
        .bind(id)
        .bind(parent)
        .bind("#000")
        .bind(chrono::Utc::now())
        .execute(pool)
        .await
        .unwrap();
    }

    #[tokio::test]
    async fn descendants_include_self_and_subtree() {
        let pool = test_pool().await;
        ctx(&pool, "root", None).await;
        ctx(&pool, "a", Some("root")).await;
        ctx(&pool, "b", Some("root")).await;
        ctx(&pool, "a1", Some("a")).await;
        ctx(&pool, "other", None).await;
        let mut ids = descendant_ids(&pool, "root").await.unwrap();
        ids.sort();
        assert_eq!(ids, vec!["a", "a1", "b", "root"]);
    }

    #[tokio::test]
    async fn cycle_detected_for_self() {
        let pool = test_pool().await;
        ctx(&pool, "a", None).await;
        assert!(would_create_cycle(&pool, "a", "a").await.unwrap());
    }

    #[tokio::test]
    async fn cycle_detected_for_descendant_parent() {
        let pool = test_pool().await;
        ctx(&pool, "root", None).await;
        ctx(&pool, "child", Some("root")).await;
        ctx(&pool, "grand", Some("child")).await;
        assert!(would_create_cycle(&pool, "root", "grand").await.unwrap());
    }

    #[tokio::test]
    async fn no_cycle_for_sibling_move() {
        let pool = test_pool().await;
        ctx(&pool, "root", None).await;
        ctx(&pool, "a", Some("root")).await;
        ctx(&pool, "b", Some("root")).await;
        assert!(!would_create_cycle(&pool, "a", "b").await.unwrap());
    }
}
