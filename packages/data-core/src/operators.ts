/**
 * 查询构造辅助（`eq` / `and` / `or` / `desc` / `asc`）。
 *
 * 仅供"未来想在 data-core 上层写显式查询"的代码使用；当前内部所有 db 调用
 * 都走 raw SQL（位置占位符），并不依赖这些 helpers 的运行时行为。
 *
 * 之所以仍然导出：保持对外 API 形状稳定，让上层可以平滑迁移到构造器风格
 * 查询而不必改 import。如果以后用真构造器实现，签名与 drizzle 保持一致。
 */

/** 列 = 值。 */
export function eq<L, R>(left: L, right: R): { type: 'eq'; left: L; right: R } {
  return { type: 'eq', left, right };
}

/** AND 组合：每项必须为 `{ type: ... }` 条件对象。 */
export function and<T>(...conditions: T[]): { type: 'and'; conditions: T[] } {
  return { type: 'and', conditions };
}

/** OR 组合。 */
export function or<T>(...conditions: T[]): { type: 'or'; conditions: T[] } {
  return { type: 'or', conditions };
}

/** 倒序：占位返回 desc 标记；上层可自行处理。 */
export function desc<T>(col: T): { type: 'desc'; col: T } {
  return { type: 'desc', col };
}

/** 正序。 */
export function asc<T>(col: T): { type: 'asc'; col: T } {
  return { type: 'asc', col };
}
