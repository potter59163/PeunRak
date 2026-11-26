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
const CHAT = "kw.chat";
const SEEN = "kw.seen";
const VALID = "kw.validation";
const PROFILE = "kw.profile";
const SAW = "kw.sawResult";
const BREAKS = "kw.breaks";

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
  for (const k of [KEY, LAST, START, CHAT, SEEN, VALID, SAW, BREAKS]) sessionStorage.removeItem(k);
}

/**
 * ชื่อกับห้องที่นักเรียนกรอกไว้ — อยู่ในเครื่องนี้เท่านั้นจนกว่าจะเลือกเปิดชื่อ (L2)
 * session ใหม่หลัง login ยังไม่มีชื่อ จึงอ่านจากโปรไฟล์ที่บันทึกไว้ในเครื่องด้วย
 */
export function identity(): { name?: string; room?: string } {
  if (typeof window === "undefined") return {};
  const u = me();
  const saved = profile();
  const pick = (a?: string, b?: string) => (a?.trim() ? a.trim() : b?.trim() ? b.trim() : undefined);
  return { name: pick(u?.name, saved.name), room: pick(u?.room, saved.room) };
}

/** โปรไฟล์ที่นักเรียนกรอกไว้ — อยู่ใน localStorage ของเครื่องนี้ ไม่ถูกส่งไปไหนเว้นแต่เลือกเปิดชื่อ */
export function profile(): Record<string, string | undefined> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(PROFILE) ?? "{}"); } catch { return {}; }
}

/** ชื่อและเบอร์ที่รู้อยู่แล้วจากโปรไฟล์ — ใช้ตัดออกจากข้อความก่อนส่งให้ AI (maskKnown ใน lib/redact.ts) */
export function knownIdentity() {
  const p = profile();
  const u = me();
  return { names: [u?.name, p.name, p.nick, p.guardian], phones: [p.phone] };
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
  /** เก็บหลักฐานได้กี่ข้อของแต่ละแบบประเมิน */
  answered: { q9: number; gad7: number; q8: number };
  domains: DomainHit[];
  /** ข้อที่ถูกนับคะแนน: id + คะแนน + ความมั่นใจ (ไม่มีคำพูด) */
  items: { id: string; score: number; confidence: number }[];
  /** ตัวที่สกัดคะแนนรอบนี้ */
  source: "demo" | "gemini" | "claude";
};

export function saveLast(l: Last) {
  sessionStorage.setItem(LAST, JSON.stringify(l));
}
export function last(): Last | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(sessionStorage.getItem(LAST) ?? "null"); } catch { return null; }
}

/** เวลาที่เริ่มคุยรอบนี้ถ้าเริ่มไปแล้ว (0 = ยังไม่ได้เริ่ม) */
export const chatStartedAt = (): number =>
  typeof window === "undefined" ? 0 : Number(sessionStorage.getItem(START)) || 0;

/** เตือนพักไปแล้วกี่ครั้งในรอบนี้ — จำไว้ข้ามหน้า จะได้ไม่เตือนซ้ำและไม่ข้ามการเตือนที่ยังไม่ได้แสดง */
export const breaksShown = (): number =>
  typeof window === "undefined" ? 0 : Number(sessionStorage.getItem(BREAKS)) || 0;
export const setBreaksShown = (n: number) => sessionStorage.setItem(BREAKS, String(n));

/** เวลาที่เริ่มคุยรอบนี้ ใช้เตือนพักเมื่อคุยต่อเนื่องนาน */
export function chatStart(): number {
  const cur = Number(sessionStorage.getItem(START));
  if (cur > 0) return cur;
  const now = Date.now();
  sessionStorage.setItem(START, String(now));
  return now;
}

/* ---------------- บทสนทนา: อยู่ในแท็บนี้เท่านั้น ---------------------------- */

export type ChatMsg = { role: "user" | "assistant"; content: string };

/**
 * เก็บบทสนทนาไว้ใน sessionStorage ของแท็บนี้ เพื่อให้สลับไปหน้าอื่นแล้วกลับมาคุยต่อได้
 * ไม่ถูกส่งไปเก็บที่ server · ปิดแท็บ ออกจากระบบ หรือกด "เริ่มใหม่" แล้วหายทันที
 */
export function saveChat(msgs: ChatMsg[]) {
  try { sessionStorage.setItem(CHAT, JSON.stringify(msgs)); } catch { /* เต็มหรือถูกปิดไว้ ก็แค่ไม่จำ */ }
}
export function loadChat(): ChatMsg[] | null {
  if (typeof window === "undefined") return null;
  try {
    const v = JSON.parse(sessionStorage.getItem(CHAT) ?? "null");
    return Array.isArray(v) && v.length > 0 ? v : null;
  } catch { return null; }
}
export function clearChat() {
  for (const k of [CHAT, LAST, START, SEEN, VALID, SAW, BREAKS]) sessionStorage.removeItem(k);
}

/** นับเหตุการณ์ "ถูกแสดง" ครั้งเดียวต่อรอบการใช้งาน — กันตัวเลขพองจากการ render ซ้ำ */
export function firstTime(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const seen: string[] = JSON.parse(sessionStorage.getItem(SEEN) ?? "[]");
    if (seen.includes(key)) return false;
    sessionStorage.setItem(SEEN, JSON.stringify([...seen, key]));
    return true;
  } catch { return false; }
}

/** สถานะ validation ของรอบนี้: ยังไม่ถาม · ข้าม · ทำแล้ว */
export type ValidationState = "skipped" | "done" | null;
export function validationState(): ValidationState {
  if (typeof window === "undefined") return null;
  const v = sessionStorage.getItem(VALID);
  return v === "skipped" || v === "done" ? v : null;
}
export function setValidationState(v: Exclude<ValidationState, null>) {
  sessionStorage.setItem(VALID, v);
}

/**
 * นักเรียนเห็นผลของ AI ในรอบนี้แล้วหรือยัง — validation ที่ตอบ "ก่อนเห็นผล" เท่านั้นที่นับเป็นแบบปิดตา (blind)
 * เพราะเห็นคะแนนของระบบก่อนแล้วมักตอบใกล้เคียงโดยไม่รู้ตัว
 */
export const resultSeen = () => typeof window !== "undefined" && sessionStorage.getItem(SAW) === "1";
export const markResultSeen = () => sessionStorage.setItem(SAW, "1");
