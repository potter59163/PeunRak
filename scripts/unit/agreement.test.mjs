import test from "node:test";
import assert from "node:assert/strict";
import { kappa, agreement, bandOf, cleanPair, weekOf, Q9_BANDS, MIN_PAIRS } from "../../lib/agreement.ts";
import { Q9 } from "../../lib/instruments.ts";

const pair = (ai, self, extra = {}) => ({ ai, self, answered: 9, blind: true, source: "gemini", ...extra });

test("ช่วงคะแนน 9Q ตรงกับ lib/instruments.ts", () => {
  assert.deepEqual(Q9_BANDS.map((b) => [b.min, b.max]), Q9.bands.map((b) => [b.min, b.max]));
  for (const [score, band] of [[0, 0], [6, 0], [7, 1], [12, 1], [13, 2], [18, 2], [19, 3], [27, 3]]) assert.equal(bandOf(score), band);
});

test("kappa: ตัวอย่างตำรา 2×2 ได้ 0.4", () => {
  // เห็นตรงกัน 35 จาก 50 (po = 0.7) โอกาสตรงกันโดยบังเอิญ 0.5 → (0.7 - 0.5) / (1 - 0.5) = 0.4
  assert.equal(kappa([[20, 5], [10, 15]]), 0.4);
});

test("kappa: ตรงกันทุกคู่ = 1 · ไม่มีข้อมูลหรือทุกคู่อยู่ช่องเดียว = คำนวณไม่ได้", () => {
  assert.equal(kappa([[5, 0], [0, 5]]), 1);
  assert.equal(kappa([[0, 0], [0, 0]]), null);
  assert.equal(kappa([[7, 0], [0, 0]]), null);
});

test("kappa ถ่วงน้ำหนัก: คลาดหนึ่งขั้นได้คะแนนดีกว่าคลาดสามขั้น", () => {
  const near = [[5, 5, 0, 0], [0, 5, 0, 0], [0, 0, 5, 0], [0, 0, 0, 5]];
  const far = [[5, 0, 0, 5], [0, 5, 0, 0], [0, 0, 5, 0], [0, 0, 0, 5]];
  assert.equal(kappa(near), kappa(far), "แบบไม่ถ่วงมองว่าผิดเท่ากัน");
  assert.ok(kappa(near, true) > kappa(far, true), "แบบถ่วงต้องให้คลาดใกล้ดีกว่า");
});

test("agreement: นับระดับเดียวกัน ตารางไขว้ และความไว/ความจำเพาะ", () => {
  const a = agreement([
    pair(3, 4),    // ไม่มี / ไม่มี  → ตรง, tn
    pair(8, 10),   // น้อย / น้อย    → ตรง, tp
    pair(5, 9),    // AI ไม่มี / เอง น้อย → พลาด (fn)
    pair(14, 6),   // AI ปานกลาง / เอง ไม่มี → ตื่นตูม (fp)
    pair(20, 22),  // รุนแรง / รุนแรง → ตรง, tp
  ]);
  assert.equal(a.n, 5);
  assert.equal(a.sameBand, 3);
  assert.equal(a.pctSameBand, 60);
  assert.equal(a.matrix[1][0], 1, "แถว = ตอบเอง (น้อย) · คอลัมน์ = AI (ไม่มี)");
  assert.equal(a.matrix[0][2], 1);
  assert.deepEqual({ tp: a.screen.tp, fp: a.screen.fp, fn: a.screen.fn, tn: a.screen.tn }, { tp: 2, fp: 1, fn: 1, tn: 1 });
  assert.equal(a.screen.sensitivity, 67);
  assert.equal(a.screen.specificity, 50);
  assert.equal(a.meanAbsDiff, 3.4);
  assert.equal(a.enough, false);
});

test("agreement: ไม่มีข้อมูลต้องคืนค่าว่าง ไม่ใช่ 0% หรือ 100%", () => {
  const a = agreement([]);
  assert.equal(a.n, 0);
  assert.equal(a.pctSameBand, null);
  assert.equal(a.kappa, null);
  assert.equal(a.screen.sensitivity, null);
  assert.equal(agreement(Array.from({ length: MIN_PAIRS }, () => pair(5, 5))).enough, true);
});

test("cleanPair: รับแต่ตัวเลขในช่วงที่ถูกต้อง ไม่มีทางแนบข้อความ", () => {
  assert.deepEqual(cleanPair({ ai: 9, self: 12, answered: 6, blind: true, source: "demo", id: "a73", note: "ข้อความ" }),
    { ai: 9, self: 12, answered: 6, blind: true, source: "demo" });
  for (const bad of [
    null, "x", {},
    { ai: 28, self: 1, answered: 1, blind: true, source: "demo" },
    { ai: 1, self: -1, answered: 1, blind: true, source: "demo" },
    { ai: 1.5, self: 1, answered: 1, blind: true, source: "demo" },
    { ai: "9", self: 1, answered: 1, blind: true, source: "demo" },
    { ai: 1, self: 1, answered: 10, blind: true, source: "demo" },
    { ai: 1, self: 1, answered: 1, blind: "yes", source: "demo" },
    { ai: 1, self: 1, answered: 1, blind: true, source: "openai" },
  ]) assert.equal(cleanPair(bad), null);
});

test("weekOf: ปัดเวลาเป็นวันจันทร์ 00:00 UTC ของสัปดาห์นั้น", () => {
  const thu = Date.UTC(2026, 10, 26, 15, 30);
  assert.equal(weekOf(thu), Date.UTC(2026, 10, 23));
  assert.equal(weekOf(Date.UTC(2026, 10, 29, 23, 59)), Date.UTC(2026, 10, 23), "วันอาทิตย์ยังเป็นสัปดาห์เดิม");
  assert.equal(weekOf(Date.UTC(2026, 10, 30)), Date.UTC(2026, 10, 30));
});
