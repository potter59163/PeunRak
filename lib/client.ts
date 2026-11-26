"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { me, myId, last, patch, identity } from "./session";
import type { HandoffState, Level, Companion, MissReason } from "./handoff";

/* ---------------- hooks ---------------------------------------------------- */

/** เรียก fn ทันทีหนึ่งครั้ง แล้วซ้ำทุก ms — ใช้กับหน้าที่ต้องเห็นข้อมูลสด */
export function usePoll(fn: () => void, ms: number) {
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; });
  useEffect(() => {
    const tick = () => ref.current();
    const first = setTimeout(tick, 0);
    const iv = setInterval(tick, ms);
    return () => { clearTimeout(first); clearInterval(iv); };
  }, [ms]);
}

const noop = () => () => {};
/** true หลัง hydrate แล้วเท่านั้น — ใช้ก่อนอ่าน sessionStorage ตอน render */
export const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);

/** กรอกชื่อไว้ในเครื่องนี้แล้วหรือยัง — เปิดชื่อให้ครู (L2) ได้ก็ต่อเมื่อมีชื่อให้เปิด */
export function useHasName(): boolean {
  const ok = useHydrated();
  return ok ? Boolean(identity().name) : false;
}

/* ---------------- เส้นทางของนักเรียน --------------------------------------- */

/**
 * สิ่งที่ส่งไปพร้อมการเลือกระดับ — ส่งเท่าที่ระดับนั้นอนุญาตเท่านั้น
 * ต่ำกว่า L2 ไม่ส่งชื่อ · ต่ำกว่า L1 ไม่ส่งหมวดเรื่อง (server ตัดซ้ำอีกชั้นใน store.disclose)
 */
export function disclosure(level: Level) {
  const u = level >= 2 ? identity() : {};
  return {
    level,
    name: u.name,
    room: u.room,
    domains: level >= 1 ? last()?.domains ?? undefined : undefined,
  };
}

async function post(body: Record<string, unknown>): Promise<HandoffState | null> {
  try {
    const res = await fetch("/api/handoff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: myId(), ...body }),
    });
    if (!res.ok) return null;
    const s = (await res.json()) as HandoffState;
    patch({ level: s.level, shared: s.level >= 2 });
    return s;
  } catch {
    return null;
  }
}

export async function getHandoff(): Promise<HandoffState | null> {
  try {
    const res = await fetch(`/api/handoff?id=${encodeURIComponent(myId())}`, { cache: "no-store" });
    if (!res.ok) return null;
    const s = (await res.json()) as HandoffState;
    // server คือความจริงเรื่องระดับการเปิดเผย — ให้ session ตามเสมอ
    if (me()?.level !== s.level) patch({ level: s.level, shared: s.level >= 2 });
    return s;
  } catch {
    return null;
  }
}

export const chooseLevel = (level: Level) => post({ action: "level", ...disclosure(level) });
export const askCounselor = (level: Level) => post({ action: "request", ...disclosure(level) });
export const chooseCompanion = (companion: Companion) => post({ action: "companion", companion });
export const answerCheckin = (went: boolean, reason?: MissReason) => post({ action: "checkin", went, reason });
