import type { Extraction, Vitals, Zone } from "./instruments";

/** บทสนทนาตัวอย่าง ใช้ตอนยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY
 *  ทำให้ demo วันแข่งไม่มีทางพังเพราะเน็ตหรือ API */
export const SCRIPT: { role: "assistant" | "user"; text: string }[] = [
  {
    role: "assistant",
    text: "สวัสดี ที่นี่ไม่มีใครรู้ว่าเธอเป็นใครนะ ไม่ต้องกรอกชื่อ ไม่ต้องสมัครอะไร\n\nช่วงนี้เป็นยังไงบ้าง เล่าเท่าที่อยากเล่าก็ได้",
  },
  { role: "user", text: "ก็ไม่รู้อ่ะ รู้สึกเหนื่อย ๆ มาสักพักแล้ว" },
  {
    role: "assistant",
    text: "เหนื่อยแบบไหนเหรอ แบบร่างกายมันล้า หรือแบบใจมันไม่อยากทำอะไรเลย",
  },
  {
    role: "user",
    text: "สองอย่างมั้ง ตื่นมาก็ไม่อยากลุก แต่ก็นอนไม่ค่อยหลับด้วย",
  },
  {
    role: "assistant",
    text: "ฟังดูเหนื่อยจริง ๆ นะ นอนไม่หลับมานานแค่ไหนแล้ว",
  },
  {
    role: "user",
    text: "น่าจะเดือนกว่า ๆ ส่วนใหญ่กว่าจะหลับก็ตีสอง แล้วต้องตื่นหกโมงไปเรียน",
  },
  {
    role: "assistant",
    text: "ตีสองถึงหกโมง แปลว่าได้นอนประมาณสี่ชั่วโมง ติดกันมาเดือนกว่าเลย\n\nช่วงที่นอนไม่หลับ ในหัวมันคิดเรื่องอะไรอยู่",
  },
  {
    role: "user",
    text: "เรื่องสอบมั้ง แล้วก็คิดวนว่าทำไมเราทำได้แค่นี้ เพื่อนคนอื่นเขาดูโอเคกันหมด",
  },
  {
    role: "assistant",
    text: "การเปรียบเทียบตัวเองกับคนอื่นตอนตีสอง มันมักจะโหดกับตัวเองกว่าปกติเสมอ\n\nแล้วช่วงนี้เรื่องที่เคยชอบทำ ยังอยากทำอยู่ไหม",
  },
  {
    role: "user",
    text: "ไม่ค่อยแล้ว เมื่อก่อนวาดรูป ตอนนี้เปิดมาแล้วก็ปิด ไม่รู้จะวาดไปทำไม",
  },
  {
    role: "assistant",
    text: "ขอบคุณที่เล่าให้ฟังนะ อยากถามตรง ๆ อีกข้อ ตอบได้เท่าที่สบายใจ\n\nช่วงสองสัปดาห์ที่ผ่านมา มีช่วงไหนที่รู้สึกว่าไม่อยากตื่นมาเจอวันพรุ่งนี้ไหม",
  },
  {
    role: "user",
    text: "มีบ้าง แต่ไม่ได้คิดจะทำอะไรตัวเองนะ แค่รู้สึกว่าถ้าหายไปเฉย ๆ ก็คงไม่มีใครสังเกต",
  },
  {
    role: "assistant",
    text: "ที่เธอบอกว่า “ถ้าหายไปก็คงไม่มีใครสังเกต” — ประโยคนี้หนักกว่าที่เธอพูดออกมานะ และเราอยากให้เธอรู้ว่ามันไม่จริง\n\nเราคุยกันมาพอสมควรแล้ว ขอสรุปให้ดูได้ไหมว่าตอนนี้สิ่งที่เธอเล่ามาอยู่ระดับไหน แล้วเธอเป็นคนเลือกเองว่าจะทำอะไรต่อ",
  },
];

export const DEMO_EXTRACTIONS: Extraction[] = [
  { itemId: "9Q_1", score: 2, confidence: 0.91, evidence: "เมื่อก่อนวาดรูป ตอนนี้เปิดมาแล้วก็ปิด ไม่รู้จะวาดไปทำไม" },
  { itemId: "9Q_2", score: 3, confidence: 0.78, evidence: "รู้สึกเหนื่อย ๆ มาสักพักแล้ว" },
  { itemId: "9Q_3", score: 3, confidence: 0.96, evidence: "กว่าจะหลับก็ตีสอง แล้วต้องตื่นหกโมงไปเรียน" },
  { itemId: "9Q_4", score: 3, confidence: 0.88, evidence: "ตื่นมาก็ไม่อยากลุก" },
  { itemId: "9Q_6", score: 2, confidence: 0.9, evidence: "คิดวนว่าทำไมเราทำได้แค่นี้ เพื่อนคนอื่นเขาดูโอเคกันหมด" },
  { itemId: "9Q_9", score: 1, confidence: 0.83, evidence: "ถ้าหายไปเฉย ๆ ก็คงไม่มีใครสังเกต" },
  { itemId: "GAD_1", score: 2, confidence: 0.74, evidence: "เรื่องสอบมั้ง" },
  { itemId: "GAD_2", score: 2, confidence: 0.86, evidence: "คิดวนว่าทำไมเราทำได้แค่นี้" },
  { itemId: "GAD_4", score: 2, confidence: 0.71, evidence: "กว่าจะหลับก็ตีสอง" },
  { itemId: "8Q_1", score: 1, confidence: 0.81, evidence: "ถ้าหายไปเฉย ๆ ก็คงไม่มีใครสังเกต" },
];

export const DEMO_VITALS: Vitals = {
  sleepHours: 4,
  sleepQuality: 2,
  activityDays: 1,
  screenHours: 9,
  mood: 2,
};

export const DEMO_TOPICS = ["เรื่องเรียนและการสอบ", "การเปรียบเทียบตัวเองกับเพื่อน", "การนอน"];

export const DEMO_TREND = [
  { week: "สัปดาห์ 1", mood: 3, sleep: 6.5 },
  { week: "สัปดาห์ 2", mood: 3, sleep: 5.5 },
  { week: "สัปดาห์ 3", mood: 2, sleep: 5 },
  { week: "สัปดาห์ 4", mood: 2, sleep: 4 },
];

/* ---------------- ฝั่งครูแนะแนว ------------------------------------------ */
export type Level = 0 | 1 | 2 | 3;

export type Case = {
  code: string;
  name?: string;
  room?: string;
  level: Level;
  zone: Zone;
  topics: string[];
  trend: "up" | "down" | "flat";
  lastSeen: string;
  checkins: number;
  note?: string;
};

export const CASES: Case[] = [
  {
    code: "SCH042-A73",
    level: 1,
    zone: "care",
    topics: ["เรื่องเรียนและการสอบ", "การนอน"],
    trend: "down",
    lastSeen: "วันนี้ 08:14",
    checkins: 4,
    note: "แนวโน้มแย่ลงต่อเนื่อง 3 สัปดาห์",
  },
  {
    code: "SCH042-K19",
    name: "ปัณณ์",
    room: "ม.5/2",
    level: 2,
    zone: "care",
    topics: ["ครอบครัว"],
    trend: "flat",
    lastSeen: "เมื่อวาน 19:40",
    checkins: 7,
  },
  {
    code: "SCH042-B08",
    level: 1,
    zone: "watch",
    topics: ["ความสัมพันธ์กับเพื่อน"],
    trend: "up",
    lastSeen: "2 วันที่แล้ว",
    checkins: 6,
    note: "ดีขึ้นหลังปรับเวลานอน",
  },
  {
    code: "SCH042-M55",
    level: 1,
    zone: "watch",
    topics: ["เรื่องเรียนและการสอบ"],
    trend: "flat",
    lastSeen: "3 วันที่แล้ว",
    checkins: 2,
  },
  {
    code: "SCH042-T21",
    name: "ธนภร",
    room: "ม.4/6",
    level: 3,
    zone: "care",
    topics: ["การนอน", "ครอบครัว"],
    trend: "up",
    lastSeen: "5 วันที่แล้ว",
    checkins: 9,
    note: "ส่งต่อ รพ. แล้ว — นัด 24 ส.ค.",
  },
  {
    code: "SCH042-P90",
    level: 1,
    zone: "watch",
    topics: ["ความสัมพันธ์กับเพื่อน"],
    trend: "down",
    lastSeen: "วันนี้ 12:02",
    checkins: 3,
  },
];

export const SCHOOL_STATS = {
  students: 1240,
  used: 386,
  calm: 241,
  watch: 108,
  care: 37,
  reachedHelp: 0.74,
};

/* ---------------- ฐานข้อมูลสถานพยาบาล (Referral Navigator) --------------- */
export type Facility = {
  name: string;
  district: string;
  adolescentClinic: boolean;
  walkIn: boolean;
  minorPolicy: string;
  hours: string;
  wait: string;
  cost: string;
};

/** [ต้องยืนยัน] ข้อมูลตัวอย่างสำหรับ demo — ต้องโทรเช็กจริงก่อนขึ้นเวที */
export const FACILITIES: Facility[] = [
  {
    name: "โรงพยาบาลประจำอำเภอ",
    district: "ในเขตพื้นที่โรงเรียน",
    adolescentClinic: false,
    walkIn: true,
    minorPolicy: "เข้าปรึกษาคนเดียวได้ แต่ต้องมีผู้ปกครองตอนรับยา",
    hours: "จ.–ศ. 08:30–16:30",
    wait: "ปรึกษาพยาบาลจิตเวชได้ในวันเดียวกัน",
    cost: "ใช้สิทธิบัตรทองได้",
  },
  {
    name: "โรงพยาบาลศูนย์ประจำจังหวัด",
    district: "ตัวเมือง",
    adolescentClinic: true,
    walkIn: false,
    minorPolicy: "ต้องมีผู้ปกครองตั้งแต่วันนัดแรก",
    hours: "คลินิกวัยรุ่น อังคาร–พฤหัส 13:00–16:00",
    wait: "นัดล่วงหน้า ประมาณ 3–5 สัปดาห์",
    cost: "ใช้สิทธิบัตรทองได้",
  },
  {
    name: "หน่วยบริการปฐมภูมิใกล้โรงเรียน",
    district: "เดินจากโรงเรียนได้",
    adolescentClinic: false,
    walkIn: true,
    minorPolicy: "คัดกรองเบื้องต้นได้เลย ไม่ต้องมีผู้ปกครอง",
    hours: "จ.–ศ. 08:00–16:00",
    wait: "ไม่ต้องรอ",
    cost: "ฟรี",
  },
];
