use anyhow::Result;
use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
    pub bind_addr: String,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| default_db_url());
        let bind_addr =
            std::env::var("BIND_ADDR").unwrap_or_else(|_| "127.0.0.1:5000".to_string());
        Ok(Self {
            database_url,
            bind_addr,
        })
    }
}

fn default_db_url() -> String {
    let dir = default_data_dir();
    let _ = std::fs::create_dir_all(&dir);
    format!("sqlite://{}?mode=rwc", dir.join("db.sqlite").display())
}

fn default_data_dir() -> PathBuf {
    dirs::home_dir()
        .map(|h| h.join(".taskorg"))
        .unwrap_or_else(|| PathBuf::from(".taskorg"))
}
