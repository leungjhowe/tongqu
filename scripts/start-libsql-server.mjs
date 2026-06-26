#!/usr/bin/env node
// Starts a local libsql server (sqld) if one isn't already running.
// Usage: node scripts/start-libsql-server.mjs
//   or via concurrently in npm scripts

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';

const PORT = 8080;
const DB_DIR = 'apps/desktop/.data';
const DB_FILE = `${DB_DIR}/app.db`;

// Ensure .data dir exists
if (!existsSync(DB_DIR)) {
  mkdirSync(DB_DIR, { recursive: true });
}

// Try the installed libsql server binary. The `sqld` package installs a
// `sqld` binary via `node_modules/sqld/.bin/sqld`. Allow override via env.
const cmd =
  process.env.LIBSQL_SERVER_BIN ||
  'node_modules/sqld/.bin/sqld';

// sqld CLI flags (note: uses --http-listen-addr and --db-path, not -p/-d).
const args = [
  '--http-listen-addr', `127.0.0.1:${PORT}`,
  '--db-path', DB_FILE,
];

console.log(`[start-libsql-server] starting: ${cmd} ${args.join(' ')}`);
const proc = spawn(cmd, args, { stdio: 'inherit' });

proc.on('exit', (code) => {
  console.error(`[start-libsql-server] exited with code ${code}`);
  process.exit(code || 1);
});

process.on('SIGINT', () => proc.kill('SIGINT'));
process.on('SIGTERM', () => proc.kill('SIGTERM'));