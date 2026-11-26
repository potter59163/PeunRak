import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { careStep, CARE, CARE_ORDER } from "../../lib/care.ts";
import {
  reminderOf, handoffStats, dateInputToTime, timeToDateInput, toLevel, defaultTrack, daysUntil,
  COMPANIONS, MISS_REASONS, CHECKINS, TRACKS, LEVELS,
} from "../../lib/handoff.ts";
import { DOMAINS, detectDomains, cleanDomains, shown, DOMAIN_FLOOR } from "../../lib/domains.ts";
import { Q9, Q8, GAD7, scoreOf, combine, isCrisis, CONFIDENCE_FLOOR } from "../../lib/instruments.ts";
import { SOURCES } from "../../lib/agreement.ts";

const DAY = 864e5;
const noon = (d) => new Date().setHours(12, 0, 0, 0) + d * DAY;

/* ---------------- stepped care ---------------- */

test("careStep: ฉุกเฉินมาก่อนทุกอย่าง และคะแนนต่ำที่ข้อมูลยังไม่พอไม่ถูกบอกว่าดูแลตัวเองได้", () => {
  assert.equal(careStep({ risk: "low", crisis: true, provisional: false }), "crisis");
  assert.equal(careStep({ risk: "high", crisis: true, provisional: false }), "crisis");
  assert.equal(careStep({ risk: "high", crisis: false, provisional: false }), "refer");
  assert.equal(careStep({ risk: "medium", crisis: false, provisional: false }), "checkin");
  assert.equal(careStep({ risk: "low", crisis: false, provisional: false }), "self");
  assert.equal(careStep({ risk: "low", crisis: false, provisional: true }), "unknown");
  assert.deepEqual([...CARE_ORDER].sort(), Object.keys(CARE).sort());
});

/* ---------------- warm handoff ---------------- */

test("reminderOf: เตือนก่อนนัด 1 วัน วันนัด และถามหลังนัดจนกว่าจะตอบ", () => {
  const at = (d, extra = {}) => reminderOf({ refStatus: "scheduled", apptAt: noon(d), ...extra });
  assert.equal(at(3), "upcoming");
  assert.equal(at(1), "tomorrow");
  assert.equal(at(0), "today");
  assert.equal(at(-1), "checkin");
  assert.equal(at(-1, { checkin: "missed" }), null);
  assert.equal(reminderOf({ refStatus: "sent" }), null);
  assert.equal(reminderOf({ refStatus: "arrived", apptAt: noon(-1) }), null);
  assert.equal(daysUntil(noon(1)), 1);
});

test("วันจากช่องเลือกวันแปลงไปกลับได้ และรับเฉพาะรูปแบบ yyyy-mm-dd", () => {
  const t = dateInputToTime("2026-11-27");
  assert.equal(timeToDateInput(t), "2026-11-27");
  assert.equal(new Date(t).getHours(), 12);
  assert.equal(dateInputToTime("27/11/2026"), null);
  assert.equal(dateInputToTime(""), null);
});

test("handoffStats: funnel อัตราไปถึงจริง เวลาเฉลี่ย แยกเส้นทาง และเหตุผลที่ไม่ได้ไป", () => {
  const now = Date.now();
  const s = handoffStats([
    { risk: "low", refStatus: "none" },                                                    // ไม่เข้าเกณฑ์
    { risk: "medium", refStatus: "none" },                                                 // เข้าเกณฑ์ ยังไม่ส่งต่อ
    { risk: "medium", refStatus: "sent", refTrack: "school" },
    { risk: "medium", refStatus: "arrived", refTrack: "school", refSentAt: now - 2 * DAY, refArrivedAt: now },
    { risk: "high", refStatus: "scheduled", refTrack: "external", missReason: "transport" },
    { risk: "high", refStatus: "scheduled", refTrack: "external", missReason: "fear" },
    { risk: "high", refStatus: "arrived", refTrack: "external", refSentAt: now - 6 * DAY, refArrivedAt: now, missReason: "transport" },
  ]);
  assert.equal(s.pool, 6);
  assert.equal(s.waiting, 1);
  assert.deepEqual(s.steps.map((x) => x.n), [5, 4, 2]);
  assert.equal(s.arrivalRate, 40);
  assert.equal(s.avgDays, 4);
  assert.deepEqual(s.byTrack.map((t) => [t.track, t.sent, t.arrived, t.rate]), [["school", 2, 1, 50], ["external", 3, 1, 33]]);
  assert.equal(s.missed, 3);
  assert.deepEqual(s.reasons.map((r) => [r.reason, r.n]), [["transport", 2], ["fear", 1]]);
});

test("handoffStats: ไม่มีเคสก็ไม่พังและไม่รายงาน 100%", () => {
  const s = handoffStats([]);
  assert.equal(s.pool, 0);
  assert.equal(s.arrivalRate, 0);
  assert.equal(s.avgDays, null);
});

test("ระดับการเปิดเผยและเส้นทางเริ่มต้น", () => {
  assert.deepEqual([0, 1, 2, 3, 4, -1, "2", null, 1.5].map(toLevel), [0, 1, 2, 3, null, null, null, null, null]);
  assert.equal(LEVELS.length, 4);
  assert.equal(defaultTrack("medium"), "school");
  assert.equal(defaultTrack("high"), "external");
});

/* ---------------- หมวดปัจจัยเสี่ยง ---------------- */

test("detectDomains: ข้อความตาม acceptance ของ P0-1 ต้องได้ online_threat", () => {
  const hits = shown(detectDomains("มีคนโทรมาบอกว่าบัญชีผมพัวพันฟอกเงิน ห้ามบอกพ่อแม่ เครียดมาก"));
  assert.deepEqual(hits.map((h) => h.id), ["online_threat"]);
  assert.ok(hits[0].confidence >= DOMAIN_FLOOR);
});

test("detectDomains: คำกว้างคำเดียวไม่พอจะขึ้นการ์ด และคำที่ซ้อนกันไม่หลอกระบบ", () => {
  assert.deepEqual(shown(detectDomains("วันนี้สอบเสร็จแล้ว โล่งมาก")), []);
  assert.deepEqual(shown(detectDomains("นอนตีสองทุกวัน เก่งพอตัว ชอบเตะบอล")).map((h) => h.id).filter((id) => id !== "sleep"), []);
});

test("cleanDomains: ทิ้งทุกอย่างที่ไม่ใช่ id ในรายการกับตัวเลข", () => {
  assert.deepEqual(
    cleanDomains([
      { id: "sleep", confidence: 0.91234, text: "นอนไม่หลับเพราะแม่ด่า" },
      { id: "sleep", confidence: 0.5 },
      { id: "made_up", confidence: 1 },
      { id: "bullying", confidence: 7 },
      { id: "gambling", confidence: "0.9" },
      "online_threat", null,
    ]),
    [{ id: "sleep", confidence: 0.91 }, { id: "bullying", confidence: 1 }]
  );
  assert.deepEqual(cleanDomains("not an array"), []);
});

test("shown: เรื่องความปลอดภัยขึ้นก่อน และตัดที่ความมั่นใจต่ำกว่าเกณฑ์", () => {
  const out = shown([
    { id: "sleep", confidence: 0.95 }, { id: "family_violence", confidence: 0.7 },
    { id: "online_threat", confidence: 0.8 }, { id: "gambling", confidence: 0.59 },
  ]);
  assert.deepEqual(out.map((d) => d.id), ["family_violence", "online_threat", "sleep"]);
});

/* ---------------- ตัวคำนวณคะแนน ---------------- */

test("scoreOf: นับเฉพาะข้อที่มั่นใจถึงเกณฑ์ และจัดระดับตามช่วงคะแนน", () => {
  const ex = [
    { itemId: "9Q_1", score: 3, confidence: 0.9, evidence: "" },
    { itemId: "9Q_2", score: 3, confidence: 0.9, evidence: "" },
    { itemId: "9Q_3", score: 3, confidence: CONFIDENCE_FLOOR - 0.01, evidence: "" },
    { itemId: "GAD_1", score: 2, confidence: 0.9, evidence: "" },
  ];
  const s = scoreOf(Q9, ex);
  assert.equal(s.raw, 6);
  assert.equal(s.answered, 2);
  assert.equal(s.zone, "calm");
  assert.ok(s.needsDirectAsk.includes("9Q_3"));
  assert.equal(scoreOf(GAD7, ex).raw, 2);
});

test("8Q: ตั้งแต่ 9 คะแนนคือเส้นทางฉุกเฉิน และดันโซนรวมเป็น care เสมอ", () => {
  assert.equal(isCrisis(8), false);
  assert.equal(isCrisis(9), true);
  assert.equal(combine(["calm", "calm"], 9), "care");
  assert.equal(combine(["calm", "watch", "calm"], 0), "watch");
  assert.equal(scoreOf(Q8, [{ itemId: "8Q_1", score: 1, confidence: 0.9, evidence: "" }]).zone, "watch");
});

/* ---------------- ค่าใน CHECK ของฐานข้อมูลต้องตรงกับรายการในโค้ด ---------------- */

test("schema: รายการ enum ใน CHECK (...) ตรงกับค่าคงที่ในโค้ดทุกตัว", () => {
  const store = readFileSync(new URL("../../lib/store.ts", import.meta.url), "utf8");
  const events = readFileSync(new URL("../../lib/events.ts", import.meta.url), "utf8");
  const inList = (col) => {
    const m = new RegExp(`check \\(${col} in \\(([^)]*)\\)\\)`).exec(store);
    assert.ok(m, `ไม่พบ check ของคอลัมน์ ${col}`);
    return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]).sort();
  };
  const kinds = [...events.slice(events.indexOf("EVENT_KINDS = ["), events.indexOf("] as const")).matchAll(/"([a-z_]+)"/g)].map((x) => x[1]);

  assert.deepEqual(inList("companion"), [...COMPANIONS].sort());
  assert.deepEqual(inList("checkin"), [...CHECKINS].sort());
  assert.deepEqual(inList("miss_reason"), [...MISS_REASONS].sort());
  assert.deepEqual(inList("ref_track"), [...TRACKS].sort());
  assert.deepEqual(inList("source"), [...SOURCES].sort());
  assert.deepEqual(inList("domain"), [...DOMAINS, "none"].sort());
  assert.ok(kinds.length >= 5, "อ่าน EVENT_KINDS จาก lib/events.ts ไม่ได้");
  assert.deepEqual(inList("kind"), [...kinds].sort());
});
