"use client";

export type Role = "student" | "counselor" | "specialist";
export type Me = { role: Role; email: string; id: string; name?: string; room?: string; shared?: boolean };

const KEY = "kw.me";

export function signIn(me: Me) {
  sessionStorage.setItem(KEY, JSON.stringify(me));
}
export function me(): Me | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(sessionStorage.getItem(KEY) ?? "null"); } catch { return null; }
}
export function patch(p: Partial<Me>) {
  const cur = me();
  if (cur) signIn({ ...cur, ...p });
}
export function signOut() {
  sessionStorage.removeItem(KEY);
}
