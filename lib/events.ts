import { DOMAINS, type DomainId } from "./domains";

/**
 * ตัวนับเหตุการณ์แบบไม่ระบุตัวตน — ใช้ตอบตัวชี้วัด "ส่งต่อเฉพาะทาง"
 * (การ์ดช่องทางช่วยเหลือถูกแสดง/ถูกกดกี่ครั้ง แยกตามหมวด) และการใช้ปุ่มพาไปหาคน
 *
 * เก็บแค่ "ชนิดเหตุการณ์ + หมวด → จำนวนครั้ง" ไม่มีรหัสนักเรียน ไม่มีเวลา ไม่มีข้อความ
 * จึงบอกได้ว่าเกิดขึ้นกี่ครั้ง แต่บอกไม่ได้ว่าใครเป็นคนกด
 */
export const EVENT_KINDS = [
  "card_shown",        // การ์ดช่องทางช่วยเหลือของหมวดนั้นขึ้นให้นักเรียนเห็น
  "card_click",        // กดโทรหรือกดพาไปหาคนจากการ์ด
  "bridge_open",       // เปิดชีต "พาไปหาคน"
  "bridge_friend",     // เลือกไปหาเพื่อน
  "bridge_counselor",  // ส่งคำขอถึงครูแนะแนว
  "bridge_hotline",    // เลือกดูสายด่วน
  "nudge_shown",       // ระบบชวนไปหาคนจริง
  "safety_shown",      // การ์ดสายด่วน 1323/1669 ขึ้น
  "care_open",         // เปิดกิจกรรมดูแลตัวเอง
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const EVENT_DOMAINS = [...DOMAINS, "none"] as const;
export type EventDomain = DomainId | "none";

export const isEventKind = (x: unknown): x is EventKind =>
  typeof x === "string" && (EVENT_KINDS as readonly string[]).includes(x);
export const isEventDomain = (x: unknown): x is EventDomain =>
  typeof x === "string" && (EVENT_DOMAINS as readonly string[]).includes(x);

export type EventCount = { kind: EventKind; domain: EventDomain; n: number };
