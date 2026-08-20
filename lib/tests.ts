import { Q9, GAD7, Q8, type Instrument } from "./instruments";

export type Test = {
  id: string;
  name: string;
  short: string;
  minutes: number;
  scale: { v: number; label: string }[];
  instrument: Instrument;
  weighted?: boolean;
};

const FREQ = [
  { v: 0, label: "ไม่มีเลย" },
  { v: 1, label: "บางวัน" },
  { v: 2, label: "บ่อย" },
  { v: 3, label: "เกือบทุกวัน" },
];
const YESNO = [
  { v: 0, label: "ไม่" },
  { v: 1, label: "ใช่" },
];

const Q2: Instrument = {
  id: "2Q",
  name: "คัดกรองเบื้องต้น 2Q",
  source: "กรมสุขภาพจิต",
  items: [
    { id: "2Q_1", text: "2 สัปดาห์ที่ผ่านมา รู้สึกหดหู่ เศร้า หรือท้อแท้", max: 1 },
    { id: "2Q_2", text: "2 สัปดาห์ที่ผ่านมา เบื่อ ไม่สนใจอยากทำอะไร", max: 1 },
  ],
  bands: [
    { min: 0, max: 0, label: "ไม่พบสัญญาณ", zone: "calm" },
    { min: 1, max: 2, label: "ควรประเมินต่อด้วย 9Q", zone: "watch" },
  ],
};

export const TESTS: Test[] = [
  { id: "2q", name: "คัดกรองเบื้องต้น", short: "2Q", minutes: 1, scale: YESNO, instrument: Q2 },
  { id: "9q", name: "ภาวะซึมเศร้า", short: "9Q", minutes: 3, scale: FREQ, instrument: Q9 },
  { id: "gad7", name: "ความวิตกกังวล", short: "GAD-7", minutes: 2, scale: FREQ, instrument: GAD7 },
  { id: "8q", name: "ความปลอดภัยของตัวเอง", short: "8Q", minutes: 2, scale: YESNO, instrument: Q8, weighted: true },
];

export const byId = (id: string) => TESTS.find((t) => t.id === id);
