use rusqlite::Connection;
use std::path::PathBuf;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // 启动时直接在 Rust 端跑 migration，避免 webview 侧的
            // tauri-plugin-sql proxy 在某些环境下不可靠的问题。
            // db 文件放在 app data dir 下，与 tauri-plugin-sql 默认位置一致。
            if let Ok(dir) = app.path().app_data_dir() {
                let db_path = dir.join("app.db");
                if let Err(e) = run_migration_at(&db_path) {
                    eprintln!("[tongqu_lib] migration failed: {e:?}");
                } else {
                    eprintln!("[tongqu_lib] migration OK at {}", db_path.display());
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// 内联 migration SQL（与 apps/desktop/drizzle/0000_init.sql 等价）。
/// 直接放在 Rust 里是为了避免 dev 模式下 webview → tauri-plugin-sql 的
/// execute 链路出现「no such table」的诡异 bug —— 这里走 rusqlite 直连。
const INIT_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS "projects" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "owner_id" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "thumbnail_hue" integer NOT NULL DEFAULT 217,
  "created_at" integer,
  "updated_at" integer,
  "opened_at" integer,
  FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "username" text NOT NULL,
  "password_hash" text NOT NULL,
  "is_guest" integer NOT NULL DEFAULT false,
  "created_at" integer
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_unique" ON "users" ("username");
"#;

fn run_migration_at(path: &PathBuf) -> rusqlite::Result<()> {
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    // 显式 scope 保证 conn 在函数返回前 drop，释放 SQLite 文件锁
    // —— 这样 tauri-plugin-sql 之后才能打开同一个文件。
    {
        let conn = Connection::open(path)?;
        conn.execute_batch(INIT_SQL)?;
        // conn 在这里 drop
    }
    Ok(())
}