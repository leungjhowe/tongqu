/** packages/data-core/src/db.web.ts — 浏览器侧存储：原生 IndexedDB */

const DB_NAME = 'tongqu';
const DB_VERSION = 1;

const STORES = ['users', 'projects'] as const;
type StoreName = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('[data-core.web] IndexedDB 不可用'));
  }
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORES) {
        if (db.objectStoreNames.contains(name)) continue;
        const s = db.createObjectStore(name, { keyPath: 'id' });
        if (name === 'users') s.createIndex('username', 'username', { unique: true });
        else if (name === 'projects') {
          s.createIndex('owner_id', 'owner_id', { unique: false });
          s.createIndex('status', 'status', { unique: false });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('open 失败'));
    req.onblocked = () => reject(new Error('open 被其它 tab 阻塞'));
  });
  return dbPromise;
}

type Expr = { kind: 'param'; idx: number } | { kind: 'literal'; value: unknown };

function parseExpr(raw: string, c: { i: number }): Expr {
  const s = raw.trim();
  if (s === '?') return { kind: 'param', idx: c.i++ };
  if (/^null$/i.test(s)) return { kind: 'literal', value: null };
  if (s.startsWith("'") && s.endsWith("'")) return { kind: 'literal', value: s.slice(1, -1).replace(/''/g, "'") };
  if (/^-?\d+(\.\d+)?$/.test(s)) return { kind: 'literal', value: Number(s) };
  throw new Error(`无法解析: ${s}`);
}

type ParsedSelect = {
  store: StoreName;
  columns: string[] | '*';
  wheres: Array<{ col: string; expr: Expr }>;
  orderBy: { col: string; dir: 'asc' | 'desc' } | null;
  limit: Expr | null;
};

const SELECT_RE = /^\s*SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?)?(?:\s+LIMIT\s+(.+?))?\s*;?\s*$/i;

function parseSelect(sql: string): ParsedSelect {
  const m = sql.match(SELECT_RE);
  if (!m) throw new Error(`不支持的 SELECT: ${sql}`);
  const [, colsRaw, storeRaw, whereRaw, orderCol, orderDir, limitRaw] = m;
  if (!(STORES as readonly string[]).includes(storeRaw)) throw new Error(`未知表: ${storeRaw}`);
  const store = storeRaw as StoreName;

  const columns = colsRaw.trim() === '*' ? '*' : colsRaw.split(',').map((c) => c.trim());
  const counter = { i: 0 };
  const wheres: ParsedSelect['wheres'] = [];
  if (whereRaw) {
    for (const piece of whereRaw.split(/\s+AND\s+/i)) {
      const eq = piece.match(/^(\w+)\s*=\s*(.+)$/);
      if (!eq) throw new Error(`无法解析 WHERE: ${piece}`);
      wheres.push({ col: eq[1], expr: parseExpr(eq[2], counter) });
    }
  }
  const orderBy = orderCol ? { col: orderCol, dir: orderDir?.toUpperCase() === 'DESC' ? 'desc' as const : 'asc' as const } : null;
  const limit = limitRaw ? parseExpr(limitRaw, counter) : null;
  return { store, columns, wheres, orderBy, limit };
}

type ParsedInsert = { store: StoreName; columns: string[]; values: Expr[] };
const INSERT_RE = /^\s*INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\((.+)\)\s*;?\s*$/i;

function splitList(raw: string): string[] {
  const out: string[] = [];
  let depth = 0, buf = '', inStr = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inStr) { if (ch === "'" && raw[i+1] === "'") { buf += "''"; i++; } else if (ch === "'") inStr = false; buf += ch; continue; }
    if (ch === "'") inStr = true;
    else if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) { out.push(buf); buf = ''; continue; }
    buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

function parseInsert(sql: string): ParsedInsert {
  const m = sql.match(INSERT_RE);
  if (!m) throw new Error(`不支持的 INSERT: ${sql}`);
  const [, storeRaw, colsRaw, valsRaw] = m;
  if (!(STORES as readonly string[]).includes(storeRaw)) throw new Error(`未知表: ${storeRaw}`);
  const store = storeRaw as StoreName;
  const columns = splitList(colsRaw).map((c) => c.trim());
  const counter = { i: 0 };
  return { store, columns, values: splitList(valsRaw).map((v) => parseExpr(v, counter)) };
}

type ParsedUpdate = { store: StoreName; sets: Array<{ col: string; expr: Expr }>; wheres: Array<{ col: string; expr: Expr }> };
const UPDATE_RE = /^\s*UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+?))?\s*;?\s*$/i;

function parseUpdate(sql: string): ParsedUpdate {
  const m = sql.match(UPDATE_RE);
  if (!m) throw new Error(`不支持的 UPDATE: ${sql}`);
  const [, storeRaw, setRaw, whereRaw] = m;
  if (!(STORES as readonly string[]).includes(storeRaw)) throw new Error(`未知表: ${storeRaw}`);
  const store = storeRaw as StoreName;
  const counter = { i: 0 };
  const sets: ParsedUpdate['sets'] = [];
  for (const piece of splitList(setRaw)) {
    const eq = piece.match(/^(\w+)\s*=\s*(.+)$/);
    if (!eq) throw new Error(`无法解析 SET: ${piece}`);
    sets.push({ col: eq[1], expr: parseExpr(eq[2], counter) });
  }
  const wheres: ParsedUpdate['wheres'] = [];
  if (whereRaw) {
    for (const piece of whereRaw.split(/\s+AND\s+/i)) {
      const eq = piece.match(/^(\w+)\s*=\s*(.+)$/);
      if (!eq) throw new Error(`无法解析 WHERE: ${piece}`);
      wheres.push({ col: eq[1], expr: parseExpr(eq[2], counter) });
    }
  }
  return { store, sets, wheres };
}

function evalExpr(expr: Expr, params: unknown[]): unknown {
  return expr.kind === 'param' ? params[expr.idx] : expr.value;
}

function rowMatches(row: Record<string, unknown>, wheres: ParsedSelect['wheres'], params: unknown[]): boolean {
  return wheres.every((w) => row[w.col] === evalExpr(w.expr, params));
}

async function runSelect<T>(parsed: ParsedSelect, params: unknown[]): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(parsed.store, 'readonly');
    const req = tx.objectStore(parsed.store).getAll();
    req.onsuccess = () => {
      let rows = (req.result as Record<string, unknown>[]).filter((r) => rowMatches(r, parsed.wheres, params));
      if (parsed.orderBy) {
        const { col, dir } = parsed.orderBy;
        const s = dir === 'desc' ? -1 : 1;
        rows.sort((a, b) => ((a[col] ?? 0) < (b[col] ?? 0) ? -1 : 1) * s);
      }
      if (parsed.limit) {
        const lim = evalExpr(parsed.limit, params);
        if (typeof lim === 'number') rows = rows.slice(0, lim);
      }
      resolve(parsed.columns === '*' ? rows as T[] : rows.map((r) => {
        const o: Record<string, unknown> = {};
        for (const c of parsed.columns as string[]) o[c] = r[c];
        return o as T;
      }));
    };
    req.onerror = () => reject(req.error ?? new Error('getAll 失败'));
  });
}

async function runInsert(parsed: ParsedInsert, params: unknown[]): Promise<{ rowsAffected: number }> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(parsed.store, 'readwrite');
    const store = tx.objectStore(parsed.store);
    const row: Record<string, unknown> = {};
    parsed.columns.forEach((col, i) => { row[col] = evalExpr(parsed.values[i], params); });
    const req = store.add(row);
    req.onsuccess = () => resolve({ rowsAffected: 1 });
    req.onerror = () => reject(req.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function runUpdate(parsed: ParsedUpdate, params: unknown[]): Promise<{ rowsAffected: number }> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(parsed.store, 'readwrite');
    const store = tx.objectStore(parsed.store);
    const req = store.getAll();
    req.onsuccess = () => {
      const matched = (req.result as Record<string, unknown>[]).filter((r) => rowMatches(r, parsed.wheres, params));
      matched.forEach((r) => { parsed.sets.forEach((s) => { r[s.col] = evalExpr(s.expr, params); }); store.put(r); });
      resolve({ rowsAffected: matched.length });
    };
    req.onerror = () => reject(req.error);
  });
}

export const db = {
  async select<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return runSelect<T>(parseSelect(sql), params);
  },
  async execute(sql: string, params: unknown[] = []): Promise<{ rowsAffected: number }> {
    if (sql.trimStart().toUpperCase().startsWith('INSERT')) return runInsert(parseInsert(sql), params);
    if (sql.trimStart().toUpperCase().startsWith('UPDATE')) return runUpdate(parseUpdate(sql), params);
    throw new Error(`不支持的语句: ${sql}`);
  },
};

export async function runMigrations(): Promise<void> { await openDB(); }
