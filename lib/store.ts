import { neon } from "@neondatabase/serverless";
import { Q9, GAD7, Q8, INSTRUMENTS, type Instrument, type Zone } from "./instruments";
import { cleanDomains, shown, type DomainHit } from "./domains";
import {
  REF_FLOW, defaultTrack,
  type Level, type RefStatus, type RefTrack, type Companion, type Checkin, type MissReason, type HandoffState,
} from "./handoff";

/**
 * ที่เก็บผลประเมินความเสี่ยง
 *
 * มี DATABASE_URL  → ใช้ Neon Postgres (จำเป็นบน Vercel เพราะ serverless แยก instance
 *                    ถ้าเก็บใน memory ครูจะไม่เห็นคะแนนที่นักเรียนเพิ่งทำ)
 * ไม่มี            → ใช้ memory (พอสำหรับ dev บนเครื่อง ไม่ต้องตั้งอะไรเพิ่ม)
 *
 * ความเป็นส่วนตัวระดับ schema:
 * ตารางนี้ "ไม่มีคอลัมน์สำหรับเก็บบทสนทนา" โดยตั้งใจ
 * ต่อให้โค้ดฝั่งแอปพลาด ก็ไม่มีที่ให้เนื้อหาที่นักเรียนพิมพ์ไปลง
 *
 * คอลัมน์ที่เพิ่มสำหรับหมวดปัจจัยเสี่ยงและ warm handoff เป็นตัวเลข เวลา หรือ enum ที่มี CHECK กำกับ
 * (ตรวจด้วย `npm run redteam` — ชุดทดสอบจะล้มถ้ามีคอลัมน์ข้อความอิสระโผล่มาใหม่)
 */

export type Risk = "low" | "medium" | "high";

// ค่าคงที่ของเส้นทางส่งต่ออยู่ที่ lib/handoff.ts (หน้า client ต้องดึงไปใช้ได้โดยไม่ลากตัวต่อฐานข้อมูลไปด้วย)
export { REF_FLOW, REF_LABEL } from "./handoff";
export type { RefStatus, RefTrack, Level } from "./handoff";

export type Assessment = {
  q9: number;
  gad7: number;
  q8: number;
  q9Band: string;
  gad7Band: string;
  q8Band: string;
  /** 8Q ตั้งแต่ระดับปานกลางขึ้นไป = เส้นทางฉุกเฉิน ไม่ใช่เรื่องคิว */
  crisis: boolean;
  /** เก็บหลักฐานได้กี่ข้อจากทั้งหมด — บอกว่าประเมินนี้แน่นแค่ไหน */
  covered: number;
  total: number;
  /**
   * หลักฐานยังน้อยเกินกว่าจะสรุปว่าเสี่ยงต่ำ
   * ป้องกัน false reassurance — คะแนนต่ำเพราะยังไม่ได้ถาม ไม่ใช่เพราะไม่มีอาการ
   */
  provisional: boolean;
};

export type Snap = Assessment & {
  id: string;
  code: string;
  name?: string;
  room?: string;
  risk: Risk;
  turns: number;
  updatedAt: number;
  history: number[];
  /** = level >= 2 เก็บไว้ให้โค้ดเดิมอ่านได้ */
  shared: boolean;
  /** ระดับการเปิดเผยที่นักเรียนเลือกเอง — ดู LEVELS ใน lib/handoff.ts */
  level: Level;
  /** หมวดปัจจัยเสี่ยง เก็บแค่ id + ความมั่นใจ และเก็บเฉพาะเมื่อ level >= 1 */
  domains: DomainHit[];
  refStatus: RefStatus;
  refTrack?: RefTrack;
  refSentAt?: number;
  refScheduledAt?: number;
  refArrivedAt?: number;
  refNote?: string;
  /** วันนัดจริง (คนละค่ากับ refScheduledAt ซึ่งคือเวลาที่กดบันทึกนัด) */
  apptAt?: number;
  companion?: Companion;
  checkin?: Checkin;
  checkinAt?: number;
  /** เหตุผลล่าสุดที่ไม่ได้ไปตามนัด — ไม่ล้างตอนนัดใหม่ เพื่อให้สถิติ drop-off ไม่หาย */
  missReason?: MissReason;
  /** นักเรียนกด "พาไปหาคน" ขอให้ครูติดต่อกลับ */
  helpRequestedAt?: number;
  helpAckAt?: number;
};

export const ZONE_TO_RISK: Record<Zone, Risk> = { calm: "low", watch: "medium", care: "high" };

/* ---------------- เลือกที่เก็บ ---------------- */

function url() {
  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.NEON_DATABASE_URL ??
    null
  );
}

export const storageMode = () => (url() ? "neon" : "memory");

type SQL = ReturnType<typeof neon>;
const g = globalThis as unknown as { __sql?: SQL; __ready?: Promise<void>; __mem?: Map<string, Snap> };

function db(): SQL | null {
  const u = url();
  if (!u) return null;
  if (!g.__sql) g.__sql = neon(u);
  return g.__sql;
}

const mem = (() => {
  if (!g.__mem) g.__mem = new Map();
  return g.__mem;
})();

/* ---------------- schema ---------------- */

async function ready(sql: SQL) {
  if (!g.__ready) {
    g.__ready = (async () => {
      await sql`
        create table if not exists assessments (
          id          text primary key,
          code        text not null,
          name        text,
          room        text,
          shared      boolean not null default false,
          risk        text not null,
          q9          integer not null,
          gad7        integer not null,
          q8          integer not null,
          q9_band     text not null,
          gad7_band   text not null,
          q8_band     text not null,
          crisis      boolean not null default false,
          covered     integer not null,
          total       integer not null,
          provisional boolean not null default false,
          turns       integer not null,
          history     jsonb not null default '[]'::jsonb,
          updated_at  bigint not null
        )
      `;
      // เพิ่มทีหลังได้โดยไม่ทำลายข้อมูลเดิม (create table if not exists ไม่เพิ่มคอลัมน์ให้)
      await sql`alter table assessments add column if not exists ref_status text not null default 'none'`;
      await sql`alter table assessments add column if not exists ref_sent_at bigint`;
      await sql`alter table assessments add column if not exists ref_scheduled_at bigint`;
      await sql`alter table assessments add column if not exists ref_arrived_at bigint`;
      await sql`alter table assessments add column if not exists ref_note text`;

      // v2 — หมวดปัจจัยเสี่ยง + warm handoff
      // คอลัมน์ text ใหม่ทุกตัวต้องมี check (...) จำกัดให้เป็น enum — ค่าต้องตรงกับ lib/handoff.ts
      const fresh = (await sql`
        select 1 from information_schema.columns
        where table_name = 'assessments' and column_name = 'level'
      `) as unknown[];
      await sql`alter table assessments add column if not exists level integer not null default 0 check (level between 0 and 3)`;
      await sql`alter table assessments add column if not exists domains jsonb not null default '[]'::jsonb`;
      await sql`alter table assessments add column if not exists ref_track text check (ref_track in ('school', 'external'))`;
      await sql`alter table assessments add column if not exists appt_at bigint`;
      await sql`alter table assessments add column if not exists companion text check (companion in ('none', 'friend', 'teacher', 'family'))`;
      await sql`alter table assessments add column if not exists checkin text check (checkin in ('went', 'missed'))`;
      await sql`alter table assessments add column if not exists checkin_at bigint`;
      await sql`alter table assessments add column if not exists miss_reason text check (miss_reason in ('fear', 'time', 'transport', 'guardian', 'cost', 'other'))`;
      await sql`alter table assessments add column if not exists help_requested_at bigint`;
      await sql`alter table assessments add column if not exists help_ack_at bigint`;
      // แถวเดิมที่เคยเปิดชื่อไว้ = L2 · เคยส่งต่อไว้ = เส้นทางภายนอก (ทำครั้งเดียวตอนเพิ่มคอลัมน์)
      if (fresh.length === 0) {
        await sql`update assessments set level = 2 where shared = true`;
        await sql`update assessments set ref_track = 'external' where ref_status <> 'none' and ref_track is null`;
      }

      await sql`create index if not exists assessments_risk_idx on assessments (risk, q9 desc)`;
    })().catch((e) => {
      // อย่าให้ promise ที่ reject ค้างอยู่ ไม่งั้นทุก request ถัดไปพังตามโดยไม่ลองใหม่
      g.__ready = undefined;
      throw e;
    });
  }
  return g.__ready;
}

/* ---------------- ข้อมูลตั้งต้นสำหรับสาธิต ---------------- */

const bandOf = (ins: Instrument, raw: number) =>
  (ins.bands.find((b) => raw >= b.min && raw <= b.max) ?? ins.bands[0]).label;

const TOTAL_ITEMS = INSTRUMENTS.reduce((n, i) => n + i.items.length, 0);
const DAY = 864e5;
const daysAgo = (n: number) => Date.now() - n * DAY;
/** เที่ยงของวันที่ห่างจากวันนี้ n วัน (ลบ = ผ่านมาแล้ว) */
const noon = (n: number) => new Date().setHours(12, 0, 0, 0) + n * DAY;

function seed(
  id: string, code: string, q9: number, gad7: number, q8: number,
  turns: number, minutesAgo: number, history: number[], extra: Partial<Snap> = {}
): Snap {
  const level = extra.level ?? 0;
  return {
    id, code, q9, gad7, q8,
    q9Band: bandOf(Q9, q9), gad7Band: bandOf(GAD7, gad7), q8Band: bandOf(Q8, q8),
    crisis: q8 >= 9,
    covered: Math.min(18, Math.ceil(turns * 1.2)),
    total: TOTAL_ITEMS,
    provisional: false,
    risk: q9 >= 13 || gad7 >= 10 || q8 >= 9 ? "high" : q9 >= 7 || gad7 >= 5 || q8 >= 1 ? "medium" : "low",
    turns,
    updatedAt: Date.now() - minutesAgo * 6e4,
    history,
    domains: [],
    refStatus: "none",
    ...extra,
    level,
    shared: level >= 2,
  };
}

/**
 * เคสจำลองสำหรับสาธิต — 10 เคสอยู่ในเส้นทางส่งต่อ กระจายทุกขั้นและทั้งสองเส้นทาง
 * ตัวเลขบนแดชบอร์ดที่มาจากชุดนี้เป็นข้อมูลตัวอย่าง ห้ามนำไปอ้างเป็นผลการทดลองจริง
 */
const SEED = (): Snap[] => [
  seed("k19", "SCH042-K19", 17, 12, 3, 14, 143, [8, 11, 14, 16, 17], {
    name: "ปัณณ์ ว.", room: "ม.5/2", level: 2,
    domains: [{ id: "academic_pressure", confidence: 0.86 }, { id: "sleep", confidence: 0.9 }],
    refStatus: "sent", refTrack: "external", refSentAt: daysAgo(3),
  }),
  seed("d48", "SCH042-D48", 19, 10, 4, 16, 1500, [21, 20, 19, 19], {
    level: 1, domains: [{ id: "family_violence", confidence: 0.74 }],
    refStatus: "arrived", refTrack: "external",
    refSentAt: daysAgo(20), refScheduledAt: daysAgo(17), apptAt: noon(-10), refArrivedAt: daysAgo(10),
    companion: "friend", checkin: "went", checkinAt: daysAgo(9),
  }),
  seed("r14", "SCH042-R14", 15, 11, 2, 11, 320, [10, 12, 14, 15], {
    level: 1, domains: [{ id: "online_threat", confidence: 0.9 }],
    refStatus: "scheduled", refTrack: "external",
    refSentAt: daysAgo(9), refScheduledAt: daysAgo(7), apptAt: noon(-3),
    checkin: "missed", checkinAt: daysAgo(2), missReason: "guardian",
  }),
  seed("j62", "SCH042-J62", 14, 13, 1, 12, 610, [9, 12, 13, 14], {
    name: "ชนิดา พ.", room: "ม.6/1", level: 3,
    domains: [{ id: "academic_pressure", confidence: 0.82 }],
    refStatus: "scheduled", refTrack: "external",
    refSentAt: daysAgo(8), refScheduledAt: daysAgo(6), apptAt: noon(-1),
    companion: "none", checkin: "missed", checkinAt: daysAgo(0.4), missReason: "fear",
  }),
  seed("t21", "SCH042-T21", 11, 8, 1, 18, 7200, [19, 16, 13, 11], {
    name: "ธนภร ส.", room: "ม.4/6", level: 3,
    domains: [{ id: "sleep", confidence: 0.8 }, { id: "relationship", confidence: 0.7 }],
    refStatus: "arrived", refTrack: "external",
    refSentAt: daysAgo(12), refScheduledAt: daysAgo(9), apptAt: noon(-2), refArrivedAt: daysAgo(2),
    companion: "family", checkin: "went", checkinAt: daysAgo(1.5),
  }),
  seed("c71", "SCH042-C71", 8, 6, 0, 8, 2100, [10, 9, 8], {
    level: 1,
    refStatus: "scheduled", refTrack: "external",
    refSentAt: daysAgo(11), refScheduledAt: daysAgo(9), apptAt: noon(-5),
    checkin: "missed", checkinAt: daysAgo(4), missReason: "transport",
  }),
  seed("n37", "SCH042-N37", 10, 7, 0, 10, 4000, [13, 12, 10], {
    level: 1, domains: [{ id: "gambling", confidence: 0.72 }],
    refStatus: "arrived", refTrack: "school",
    refSentAt: daysAgo(6), refScheduledAt: daysAgo(5), apptAt: noon(-3), refArrivedAt: daysAgo(3),
    companion: "teacher", checkin: "went", checkinAt: daysAgo(3),
  }),
  seed("b08", "SCH042-B08", 9, 6, 0, 9, 2880, [14, 12, 10, 9], {
    level: 1, domains: [{ id: "bullying", confidence: 0.78 }],
    refStatus: "scheduled", refTrack: "school",
    refSentAt: daysAgo(2), refScheduledAt: daysAgo(1), apptAt: noon(1),
    companion: "friend",
  }),
  seed("s29", "SCH042-S29", 9, 4, 0, 7, 3300, [11, 10, 9], {
    level: 1,
    refStatus: "arrived", refTrack: "school",
    refSentAt: daysAgo(4), refScheduledAt: daysAgo(4), apptAt: noon(-2), refArrivedAt: daysAgo(2),
    checkin: "went", checkinAt: daysAgo(2),
  }),
  seed("w05", "SCH042-W05", 7, 9, 0, 8, 900, [6, 7, 7], {
    level: 1, domains: [{ id: "vaping_alcohol", confidence: 0.72 }],
    refStatus: "sent", refTrack: "school", refSentAt: daysAgo(1),
  }),
  seed("m55", "SCH042-M55", 8, 5, 0, 6, 4320, [7, 8, 8]),
  seed("h83", "SCH042-H83", 5, 4, 0, 5, 20, [4, 5], {
    level: 1, domains: [{ id: "relationship", confidence: 0.7 }],
    helpRequestedAt: Date.now() - 20 * 6e4,
  }),
  seed("p90", "SCH042-P90", 4, 3, 0, 4, 540, [3, 4, 4]),
];

const SEED_IDS = new Set(SEED().map((s) => s.id));
export const isSeed = (id: string) => SEED_IDS.has(id);

/* ---------------- แปลงแถว <-> object ---------------- */

type N = string | number | null;
type Row = {
  id: string; code: string; name: string | null; room: string | null; shared: boolean;
  risk: string; q9: number; gad7: number; q8: number;
  q9_band: string; gad7_band: string; q8_band: string;
  crisis: boolean; covered: number; total: number; provisional: boolean;
  turns: number; history: number[] | string; updated_at: string | number;
  ref_status: string | null;
  ref_sent_at: N; ref_scheduled_at: N; ref_arrived_at: N;
  ref_note: string | null;
  level: number | null;
  domains: unknown;
  ref_track: string | null;
  appt_at: N;
  companion: string | null;
  checkin: string | null;
  checkin_at: N;
  miss_reason: string | null;
  help_requested_at: N;
  help_ack_at: N;
};

const num = (v: N) => (v == null ? undefined : Number(v));
const json = (v: unknown) => (typeof v === "string" ? JSON.parse(v) : v);

const toSnap = (r: Row): Snap => ({
  id: r.id, code: r.code,
  name: r.name ?? undefined, room: r.room ?? undefined,
  shared: r.shared, risk: r.risk as Risk,
  q9: r.q9, gad7: r.gad7, q8: r.q8,
  q9Band: r.q9_band, gad7Band: r.gad7_band, q8Band: r.q8_band,
  crisis: r.crisis, covered: r.covered, total: r.total, provisional: r.provisional,
  turns: r.turns,
  history: json(r.history) as number[],
  updatedAt: Number(r.updated_at),
  level: (r.level ?? 0) as Level,
  domains: cleanDomains(json(r.domains)),
  refStatus: (r.ref_status ?? "none") as RefStatus,
  refTrack: (r.ref_track ?? undefined) as RefTrack | undefined,
  refSentAt: num(r.ref_sent_at),
  refScheduledAt: num(r.ref_scheduled_at),
  refArrivedAt: num(r.ref_arrived_at),
  refNote: r.ref_note ?? undefined,
  apptAt: num(r.appt_at),
  companion: (r.companion ?? undefined) as Companion | undefined,
  checkin: (r.checkin ?? undefined) as Checkin | undefined,
  checkinAt: num(r.checkin_at),
  missReason: (r.miss_reason ?? undefined) as MissReason | undefined,
  helpRequestedAt: num(r.help_requested_at),
  helpAckAt: num(r.help_ack_at),
});

async function write(sql: SQL, s: Snap) {
  await sql`
    insert into assessments (
      id, code, name, room, shared, risk, q9, gad7, q8,
      q9_band, gad7_band, q8_band, crisis, covered, total,
      provisional, turns, history, updated_at,
      ref_status, ref_sent_at, ref_scheduled_at, ref_arrived_at, ref_note,
      level, domains, ref_track, appt_at, companion,
      checkin, checkin_at, miss_reason, help_requested_at, help_ack_at
    ) values (
      ${s.id}, ${s.code}, ${s.name ?? null}, ${s.room ?? null}, ${s.shared}, ${s.risk},
      ${s.q9}, ${s.gad7}, ${s.q8}, ${s.q9Band}, ${s.gad7Band}, ${s.q8Band},
      ${s.crisis}, ${s.covered}, ${s.total}, ${s.provisional}, ${s.turns},
      ${JSON.stringify(s.history)}::jsonb, ${s.updatedAt},
      ${s.refStatus}, ${s.refSentAt ?? null}, ${s.refScheduledAt ?? null},
      ${s.refArrivedAt ?? null}, ${s.refNote ?? null},
      ${s.level}, ${JSON.stringify(cleanDomains(s.domains))}::jsonb, ${s.refTrack ?? null},
      ${s.apptAt ?? null}, ${s.companion ?? null},
      ${s.checkin ?? null}, ${s.checkinAt ?? null}, ${s.missReason ?? null},
      ${s.helpRequestedAt ?? null}, ${s.helpAckAt ?? null}
    )
    on conflict (id) do update set
      code = excluded.code, name = excluded.name, room = excluded.room,
      shared = excluded.shared, risk = excluded.risk,
      q9 = excluded.q9, gad7 = excluded.gad7, q8 = excluded.q8,
      q9_band = excluded.q9_band, gad7_band = excluded.gad7_band, q8_band = excluded.q8_band,
      crisis = excluded.crisis, covered = excluded.covered, total = excluded.total,
      provisional = excluded.provisional, turns = excluded.turns,
      history = excluded.history, updated_at = excluded.updated_at,
      ref_status = excluded.ref_status, ref_sent_at = excluded.ref_sent_at,
      ref_scheduled_at = excluded.ref_scheduled_at, ref_arrived_at = excluded.ref_arrived_at,
      ref_note = excluded.ref_note,
      level = excluded.level, domains = excluded.domains, ref_track = excluded.ref_track,
      appt_at = excluded.appt_at, companion = excluded.companion,
      checkin = excluded.checkin, checkin_at = excluded.checkin_at, miss_reason = excluded.miss_reason,
      help_requested_at = excluded.help_requested_at, help_ack_at = excluded.help_ack_at
  `;
}

/* ---------------- อ่าน / เขียน ---------------- */

const ORDER: Record<Risk, number> = { high: 0, medium: 1, low: 2 };
const sortSnaps = (xs: Snap[]) =>
  xs.sort((a, b) => ORDER[a.risk] - ORDER[b.risk] || b.q9 - a.q9);

function seedMem() {
  if (mem.size === 0) SEED().forEach((s) => mem.set(s.id, s));
}

export async function all(): Promise<Snap[]> {
  const sql = db();
  if (!sql) {
    seedMem();
    return sortSnaps([...mem.values()]);
  }
  await ready(sql);
  let rows = (await sql`select * from assessments`) as Row[];
  if (rows.length === 0) {
    for (const s of SEED()) await write(sql, s);
    rows = (await sql`select * from assessments`) as Row[];
  }
  return sortSnaps(rows.map(toSnap));
}

async function load(id: string): Promise<Snap | undefined> {
  const sql = db();
  if (!sql) {
    seedMem();
    return mem.get(id);
  }
  await ready(sql);
  const rows = (await sql`select * from assessments where id = ${id}`) as Row[];
  return rows[0] ? toSnap(rows[0]) : undefined;
}

async function save(s: Snap): Promise<Snap> {
  const sql = db();
  if (sql) await write(sql, s);
  else mem.set(s.id, s);
  return s;
}

/** แถวเปล่าสำหรับนักเรียนที่ยังไม่มีผลประเมิน เช่น กด "พาไปหาคน" ก่อนเริ่มคุย */
const blank = (id: string): Snap => ({
  id,
  code: `SCH042-${id.toUpperCase().slice(0, 3)}`,
  q9: 0, gad7: 0, q8: 0,
  q9Band: bandOf(Q9, 0), gad7Band: bandOf(GAD7, 0), q8Band: bandOf(Q8, 0),
  crisis: false, covered: 0, total: TOTAL_ITEMS, provisional: true,
  risk: "low", turns: 0, updatedAt: Date.now(), history: [],
  shared: false, level: 0, domains: [], refStatus: "none",
});

/** ชื่อกับห้องเป็นข้อมูลระบุตัวตน ไม่ใช่ช่องเขียนข้อความ — ตัดให้สั้นและเป็นบรรทัดเดียว */
const label = (v: unknown) =>
  typeof v === "string" && v.trim() ? v.replace(/\s+/g, " ").trim().slice(0, 60) : undefined;

export type Disclosure = { name?: string; room?: string; domains?: DomainHit[] };

/**
 * จุดเดียวที่ตัดสินว่าอะไรถูกเก็บได้ตามระดับที่นักเรียนเลือก
 *   L0  ไม่เก็บหมวดเรื่อง ไม่เก็บชื่อ
 *   L1+ เก็บหมวดเรื่อง (id + ความมั่นใจ)
 *   L2+ เก็บชื่อและห้อง
 * ลดระดับเมื่อไหร่ ข้อมูลของระดับที่สูงกว่าถูกลบออกจากที่เก็บทันที ไม่ใช่แค่ซ่อน
 */
function disclose(s: Snap, level: Level, d: Disclosure = {}): Snap {
  return {
    ...s,
    level,
    shared: level >= 2,
    name: level >= 2 ? label(d.name) ?? s.name : undefined,
    room: level >= 2 ? label(d.room) ?? s.room : undefined,
    domains: level >= 1 ? (d.domains ? cleanDomains(d.domains) : s.domains) : [],
  };
}

export async function upsert(
  id: string,
  a: Assessment,
  meta: { risk: Risk; turns: number; level?: Level; name?: string; room?: string; domains?: DomainHit[] }
): Promise<Snap> {
  const prev = (await load(id)) ?? blank(id);

  // คะแนนอัปเดตไม่ล้างสถานะส่งต่อ/เส้นทางที่ครูและนักเรียนทำไว้แล้ว (...prev คงไว้ทั้งหมด)
  const next = disclose(
    {
      ...prev,
      ...a,
      risk: meta.risk,
      turns: meta.turns,
      updatedAt: Date.now(),
      history: [...prev.history, a.q9].slice(-8),
    },
    meta.level ?? prev.level,
    { name: meta.name, room: meta.room, domains: meta.domains ?? [] }
  );

  return save(next);
}

/* ---------------- ฝั่งนักเรียน: ระดับการเปิดเผยและเส้นทางของตัวเอง -------- */

export async function getOwn(id: string): Promise<Snap> {
  return (await load(id)) ?? blank(id);
}

export async function setLevel(id: string, level: Level, d?: Disclosure): Promise<Snap> {
  const cur = (await load(id)) ?? blank(id);
  return save(disclose(cur, level, d));
}

/** "พาไปหาคน" — ขอให้ครูแนะแนวติดต่อกลับ ต้องเปิดอย่างน้อย L1 ครูถึงจะเห็นคำขอ */
export async function requestHelp(id: string, level: Level, d?: Disclosure): Promise<Snap> {
  const cur = (await load(id)) ?? blank(id);
  const lv = Math.max(cur.level, level, 1) as Level;
  return save({ ...disclose(cur, lv, d), helpRequestedAt: Date.now(), helpAckAt: undefined });
}

export async function setCompanion(id: string, companion: Companion): Promise<Snap | null> {
  const cur = await load(id);
  if (!cur || cur.refStatus === "none") return null;
  return save({ ...cur, companion });
}

/** เช็กอินหลังนัด — นักเรียนตอบเอง ไม่เลื่อนสถานะ arrived (ขั้นนั้นผู้รับนัดเป็นคนยืนยัน) */
export async function checkIn(id: string, went: boolean, reason?: MissReason): Promise<Snap | null> {
  const cur = await load(id);
  if (!cur || cur.refStatus !== "scheduled" || !cur.apptAt) return null;
  return save({
    ...cur,
    checkin: went ? "went" : "missed",
    checkinAt: Date.now(),
    missReason: went ? cur.missReason : reason ?? "other",
  });
}

/* ---------------- ฝั่งครู / ผู้เชี่ยวชาญ ---------------------------------- */

export async function ackHelp(id: string): Promise<Snap | null> {
  const cur = await load(id);
  if (!cur || !cur.helpRequestedAt) return null;
  return save({ ...cur, helpAckAt: cur.helpAckAt ?? Date.now() });
}

/** เลื่อนสถานะการส่งต่อไปข้างหน้าทีละขั้น ห้ามข้าม ห้ามถอยหลัง */
export async function advanceReferral(
  id: string,
  to: RefStatus,
  opts: { note?: string; track?: RefTrack; apptAt?: number } = {}
): Promise<Snap | null> {
  const cur = await load(id);
  if (!cur) return null;

  const from = REF_FLOW.indexOf(cur.refStatus);
  const next = REF_FLOW.indexOf(to);
  if (next !== from + 1) return cur; // ข้ามขั้นหรือถอยหลัง ไม่ทำอะไร

  const now = Date.now();
  return save({
    ...cur,
    refStatus: to,
    refNote: opts.note ?? cur.refNote,
    refTrack: to === "sent" ? opts.track ?? defaultTrack(cur.risk) : cur.refTrack,
    refSentAt: to === "sent" ? now : cur.refSentAt,
    refScheduledAt: to === "scheduled" ? now : cur.refScheduledAt,
    apptAt: to === "scheduled" ? opts.apptAt ?? cur.apptAt : cur.apptAt,
    refArrivedAt: to === "arrived" ? now : cur.refArrivedAt,
  });
}

/** นัดใหม่หลังพลาดนัด — ล้างคำตอบเช็กอินเพื่อถามรอบใหม่ แต่เก็บเหตุผลเดิมไว้ในสถิติ */
export async function reschedule(id: string, apptAt: number): Promise<Snap | null> {
  const cur = await load(id);
  if (!cur || cur.refStatus !== "scheduled") return null;
  return save({ ...cur, apptAt, checkin: undefined, checkinAt: undefined });
}

/**
 * ยกระดับจากครูแนะแนวในโรงเรียนไปผู้เชี่ยวชาญภายนอก
 * ไม่ใช่การถอยหลัง — เป็นการเริ่มเส้นทางชั้นที่สอง จึงเริ่มนับที่ "ส่งต่อแล้ว" ใหม่
 */
export async function escalate(id: string): Promise<Snap | null> {
  const cur = await load(id);
  if (!cur || cur.refTrack !== "school" || cur.refStatus === "none") return null;
  return save({
    ...cur,
    refTrack: "external",
    refStatus: "sent",
    refSentAt: Date.now(),
    refScheduledAt: undefined,
    refArrivedAt: undefined,
    apptAt: undefined,
    checkin: undefined,
    checkinAt: undefined,
  });
}

/* ---------------- สิ่งที่ออกจาก API ---------------------------------------- */

/**
 * กันอีกชั้นก่อนส่งให้ครู/ผู้เชี่ยวชาญ: ต่อให้ที่เก็บมีข้อมูลเกินระดับ (เช่น แถวเก่า)
 * ชื่อก็ไม่ออกถ้าต่ำกว่า L2 และหมวดเรื่องไม่ออกถ้าต่ำกว่า L1
 */
export function forStaff(s: Snap): Snap {
  return {
    ...s,
    name: s.level >= 2 ? s.name : undefined,
    room: s.level >= 2 ? s.room : undefined,
    domains: s.level >= 1 ? shown(s.domains) : [],
  };
}

export function forStudent(s: Snap): HandoffState {
  return {
    code: s.code, level: s.level,
    refStatus: s.refStatus, refTrack: s.refTrack, refSentAt: s.refSentAt, refArrivedAt: s.refArrivedAt,
    apptAt: s.apptAt, companion: s.companion, checkin: s.checkin, missReason: s.missReason,
    helpRequestedAt: s.helpRequestedAt, helpAckAt: s.helpAckAt,
  };
}
