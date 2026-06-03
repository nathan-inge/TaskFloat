use utoipa::OpenApi;

use crate::models::{
    Context, ContextNode, ContextTaskCount, CreateContext, CreateTask, Settings, Task,
    TaskListResponse, UpdateContext, UpdateSettings, UpdateTask,
};
use crate::routes::health::Health;

#[derive(OpenApi)]
#[openapi(
    info(
        title = "Contextual Task Organizer",
        description = "Single-user task manager with GTD contexts and Slack Time prioritization.",
        version = "0.1.0",
    ),
    paths(
        crate::routes::health::health,
        crate::routes::contexts::list_contexts,
        crate::routes::contexts::list_contexts_tree,
        crate::routes::contexts::list_task_counts,
        crate::routes::contexts::create_context,
        crate::routes::contexts::update_context,
        crate::routes::contexts::delete_context,
        crate::routes::tasks::list_tasks,
        crate::routes::tasks::get_task,
        crate::routes::tasks::create_task,
        crate::routes::tasks::update_task,
        crate::routes::tasks::complete_task,
        crate::routes::tasks::uncomplete_task,
        crate::routes::tasks::delete_task,
        crate::routes::settings::get_settings,
        crate::routes::settings::update_settings,
    ),
    components(schemas(
        Health,
        Task,
        CreateTask,
        UpdateTask,
        TaskListResponse,
        Context,
        ContextNode,
        ContextTaskCount,
        CreateContext,
        UpdateContext,
        Settings,
        UpdateSettings,
    )),
    tags(
        (name = "contexts", description = "GTD-style nested contexts"),
        (name = "tasks", description = "Tasks with Slack Time prioritization"),
        (name = "settings", description = "User settings singleton"),
    )
)]
pub struct ApiDoc;
