# tps-rust-core

Rust capability layer for the TPS desktop application.

## Purpose

This crate is a sibling to `apps/desktop/src-tauri` and is intentionally a
separate Cargo workspace for now. It provides the home for future high-performance
Rust modules that the desktop Tauri shell may call into, such as:

- GIS processing (geometry / projection helpers)
- Native DuckDB bindings
- Heavy data transforms better done off the JS main thread

It is **not** wired into the desktop app's `Cargo.toml` yet — per the monorepo
spec the project is in skeleton / structure-only mode. When a capability needs
to be reused from `src-tauri`, it can be added as a `path` dependency from there.

## Layout

```
rust-core/
├── Cargo.toml
├── README.md
├── .gitignore
└── src/
    └── lib.rs        # exposes `version()` placeholder + crate root
```

## Verify

```sh
cd tauri/rust-core
cargo check
cargo test
```