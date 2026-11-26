"use client";

import type { DomainHit } from "./domains";
import type { Level } from "./handoff";

export type Role = "student" | "counselor" | "specialist";
export type Me = {
  role: Role; email: string; id: string; name?: string; room?: string;
  /** = level >= 2 เก็บไว้ให้โค้ดเดิมอ่านได้ */
  shared?: boolean;
  /** ระดับการเปิดเผยที่นักเรียนเลือกเอง (L0–L3) */
  level?: Level;
  /** ระดับก่อนกดเปิดชื่อในหน้าโปรไฟล์ — ปิดสวิตช์แล้วกลับไปที่เดิม ไม่เปิดเผยเกินกว่าที่เคยเลือก */
  levelBefore?: Level;
  /** เวลาที่กดรับทราบข้อตกลงก่อนเริ่มใช้ */
  consentAt?: number;
};

const KEY = "kw.me";
const LAST = "kw.last";
const START = "kw.chatStart";

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
  sessionStorage.removeItem(LAST);
  sessionStorage.removeItem(START);
}

/**
 * ชื่อกับห้องที่นักเรียนกรอกไว้ — อยู่ในเครื่องนี้เท่านั้นจนกว่าจะเลือกเปิดชื่อ (L2)
 * session ใหม่หลัง login ยังไม่มีชื่อ จึงอ่านจากโปรไฟล์ที่บันทึกไว้ในเครื่องด้วย
 */
export function identity(): { name?: string; room?: string } {
  if (typeof window === "undefined") return {};
  const u = me();
  let saved: { name?: string; room?: string } = {};
  try { saved = JSON.parse(localStorage.getItem("kw.profile") ?? "{}"); } catch { /* โปรไฟล์เสีย ถือว่ายังไม่ได้กรอก */ }
  const pick = (a?: string, b?: string) => (a?.trim() ? a.trim() : b?.trim() ? b.trim() : undefined);
  return { name: pick(u?.name, saved.name), room: pick(u?.room, saved.room) };
}

export const myId = () => me()?.id ?? "a73";
export const myLevel = (): Level => me()?.level ?? 0;

/**
 * ผลประเมินรอบล่าสุดของตัวเอง — มีแค่ตัวเลขกับ id หมวด ไม่มีข้อความ
 * อยู่ใน sessionStorage ของเครื่องนักเรียนเท่านั้น ปิดแท็บหรือออกจากระบบแล้วหาย
 */
export type Last = {
  risk: "low" | "medium" | "high";
  q9: number; gad7: number; q8: number;
  crisis: boolean; covered: number; total: number; provisional: boolean;
  /** none | watch = มีสัญญาณคิดทำร้ายตัวเอง | crisis = 8Q ถึงเกณฑ์ฉุกเฉิน */
  safety: "none" | "watch" | "crisis";
  domains: DomainHit[];
};

export function saveLast(l: Last) {
  sessionStorage.setItem(LAST, JSON.stringify(l));
}
export function last(): Last | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(sessionStorage.getItem(LAST) ?? "null"); } catch { return null; }
}

/** เวลาที่เริ่มคุยรอบนี้ ใช้เตือนพักเมื่อคุยต่อเนื่องนาน */
export function chatStart(): number {
  const cur = Number(sessionStorage.getItem(START));
  if (cur > 0) return cur;
  const now = Date.now();
  sessionStorage.setItem(START, String(now));
  return now;
}
