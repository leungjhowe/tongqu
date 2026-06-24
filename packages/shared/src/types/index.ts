export type ID = string;
export type ISODateString = string;

export type NavKey = 'projects' | 'workflows' | 'data' | 'assets' | 'settings';

export interface User {
  id: ID;
  username: string;
}

export interface Project {
  id: ID;
  name: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });
