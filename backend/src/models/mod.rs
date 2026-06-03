pub mod context;
pub mod settings;
pub mod task;

pub use context::*;
pub use settings::*;
pub use task::*;

use serde::{Deserialize, Deserializer};

pub fn double_option<'de, T, D>(d: D) -> Result<Option<Option<T>>, D::Error>
where
    T: Deserialize<'de>,
    D: Deserializer<'de>,
{
    Ok(Some(Option::deserialize(d)?))
}
