use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Context {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub color: String,
    pub icon: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateContext {
    pub name: String,
    #[serde(default = "default_color")]
    pub color: String,
    pub icon: Option<String>,
    pub parent_id: Option<String>,
}

fn default_color() -> String {
    "#6366f1".to_string()
}

#[derive(Debug, Deserialize, ToSchema, Default)]
pub struct UpdateContext {
    pub name: Option<String>,
    pub color: Option<String>,
    #[serde(default, deserialize_with = "crate::models::double_option")]
    pub icon: Option<Option<String>>,
    #[serde(default, deserialize_with = "crate::models::double_option")]
    pub parent_id: Option<Option<String>>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ContextNode {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    pub color: String,
    pub icon: Option<String>,
    pub created_at: DateTime<Utc>,
    #[schema(no_recursion)]
    pub children: Vec<ContextNode>,
}

#[derive(Debug, Serialize, FromRow, ToSchema)]
pub struct ContextTaskCount {
    pub context_id: String,
    pub count: i64,
}

impl ContextNode {
    pub fn build_forest(rows: Vec<Context>) -> Vec<ContextNode> {
        let mut by_parent: std::collections::HashMap<Option<String>, Vec<Context>> =
            std::collections::HashMap::new();
        for ctx in rows {
            by_parent.entry(ctx.parent_id.clone()).or_default().push(ctx);
        }
        build_children(None, &mut by_parent)
    }
}

fn build_children(
    parent_id: Option<String>,
    by_parent: &mut std::collections::HashMap<Option<String>, Vec<Context>>,
) -> Vec<ContextNode> {
    let children = by_parent.remove(&parent_id).unwrap_or_default();
    children
        .into_iter()
        .map(|c| {
            let id = c.id.clone();
            ContextNode {
                id: c.id,
                name: c.name,
                parent_id: c.parent_id,
                color: c.color,
                icon: c.icon,
                created_at: c.created_at,
                children: build_children(Some(id), by_parent),
            }
        })
        .collect()
}
