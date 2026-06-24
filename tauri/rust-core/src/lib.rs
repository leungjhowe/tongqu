//! tps-rust-core: Rust capability layer for the TPS desktop app.
//!
//! This crate is a placeholder for high-performance Rust modules
//! (GIS processing, DuckDB-native bindings, etc.) that the Tauri
//! `apps/desktop/src-tauri` layer will eventually call into.

pub fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn version_is_set() {
        assert!(!version().is_empty());
    }
}
