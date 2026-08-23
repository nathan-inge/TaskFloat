use crate::error::AppResult;
use sqlx::SqlitePool;

/// True if hanging `target_id` under `new_parent_id` would create a cycle —
/// i.e. `new_parent_id` is `target_id` itself or one of its descendants.
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
        let parent: Option<Option<String>> =
            sqlx::query_scalar::<_, Option<String>>("SELECT parent_id FROM tasks WHERE id = ?1")
                .bind(&node)
                .fetch_optional(pool)
                .await?;
        cursor = parent.flatten();
    }
    Ok(false)
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
        sqlx::query("INSERT INTO contexts (id, name, parent_id, color, created_at) VALUES ('c','c',NULL,'#000',?)")
            .bind(chrono::Utc::now())
            .execute(&pool)
            .await
            .unwrap();
        pool
    }

    async fn task(pool: &SqlitePool, id: &str, parent: Option<&str>) {
        let now = chrono::Utc::now();
        sqlx::query(
            "INSERT INTO tasks (id, title, effort_minutes, context_id, parent_id, created_at, updated_at)
             VALUES (?,?,30,'c',?,?,?)",
        )
        .bind(id)
        .bind(id)
        .bind(parent)
        .bind(now)
        .bind(now)
        .execute(pool)
        .await
        .unwrap();
    }

    #[tokio::test]
    async fn cycle_detected_for_self() {
        let pool = test_pool().await;
        task(&pool, "a", None).await;
        assert!(would_create_cycle(&pool, "a", "a").await.unwrap());
    }

    #[tokio::test]
    async fn cycle_detected_for_descendant_parent() {
        let pool = test_pool().await;
        task(&pool, "root", None).await;
        task(&pool, "child", Some("root")).await;
        task(&pool, "grand", Some("child")).await;
        assert!(would_create_cycle(&pool, "root", "grand").await.unwrap());
    }

    #[tokio::test]
    async fn no_cycle_for_unrelated_parent() {
        let pool = test_pool().await;
        task(&pool, "a", None).await;
        task(&pool, "b", None).await;
        assert!(!would_create_cycle(&pool, "a", "b").await.unwrap());
    }

    #[tokio::test]
    async fn deleting_a_parent_cascades_to_subtree() {
        let pool = test_pool().await;
        task(&pool, "root", None).await;
        task(&pool, "a", Some("root")).await;
        task(&pool, "a1", Some("a")).await;
        task(&pool, "other", None).await;
        sqlx::query("DELETE FROM tasks WHERE id = 'root'")
            .execute(&pool)
            .await
            .unwrap();
        let left: Vec<String> = sqlx::query_scalar("SELECT id FROM tasks")
            .fetch_all(&pool)
            .await
            .unwrap();
        assert_eq!(left, vec!["other"]);
    }
}
