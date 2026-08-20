import { neon } from "@neondatabase/serverless";
import { Q9, GAD7, Q8, type Instrument, type Zone } from "./instruments";

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
 */

export type Risk = "low" | "medium" | "high";

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
  shared: boolean;
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

function seed(
  id: string, code: string, q9: number, gad7: number, q8: number,
  turns: number, minutesAgo: number, history: number[], extra: Partial<Snap> = {}
): Snap {
  return {
    id, code, q9, gad7, q8,
    q9Band: bandOf(Q9, q9), gad7Band: bandOf(GAD7, gad7), q8Band: bandOf(Q8, q8),
    crisis: q8 >= 9,
    covered: Math.min(18, Math.ceil(turns * 1.2)),
    total: 24,
    provisional: false,
    risk: q9 >= 13 || gad7 >= 10 || q8 >= 9 ? "high" : q9 >= 7 || gad7 >= 5 ? "medium" : "low",
    turns,
    updatedAt: Date.now() - minutesAgo * 6e4,
    history,
    shared: false,
    ...extra,
  };
}

const SEED = (): Snap[] => [
  seed("k19", "SCH042-K19", 17, 12, 3, 14, 143, [8, 11, 14, 16, 17], { name: "ปัณณ์ ว.", room: "ม.5/2", shared: true }),
  seed("t21", "SCH042-T21", 11, 8, 1, 18, 7200, [19, 16, 13, 11], { name: "ธนภร ส.", room: "ม.4/6", shared: true }),
  seed("b08", "SCH042-B08", 9, 6, 0, 9, 2880, [14, 12, 10, 9]),
  seed("m55", "SCH042-M55", 8, 5, 0, 6, 4320, [7, 8, 8]),
  seed("p90", "SCH042-P90", 4, 3, 0, 4, 540, [3, 4, 4]),
];

/* ---------------- แปลงแถว <-> object ---------------- */

type Row = {
  id: string; code: string; name: string | null; room: string | null; shared: boolean;
  risk: string; q9: number; gad7: number; q8: number;
  q9_band: string; gad7_band: string; q8_band: string;
  crisis: boolean; covered: number; total: number; provisional: boolean;
  turns: number; history: number[] | string; updated_at: string | number;
};

const toSnap = (r: Row): Snap => ({
  id: r.id, code: r.code,
  name: r.name ?? undefined, room: r.room ?? undefined,
  shared: r.shared, risk: r.risk as Risk,
  q9: r.q9, gad7: r.gad7, q8: r.q8,
  q9Band: r.q9_band, gad7Band: r.gad7_band, q8Band: r.q8_band,
  crisis: r.crisis, covered: r.covered, total: r.total, provisional: r.provisional,
  turns: r.turns,
  history: typeof r.history === "string" ? JSON.parse(r.history) : r.history,
  updatedAt: Number(r.updated_at),
});

async function write(sql: SQL, s: Snap) {
  await sql`
    insert into assessments (
      id, code, name, room, shared, risk, q9, gad7, q8,
      q9_band, gad7_band, q8_band, crisis, covered, total,
      provisional, turns, history, updated_at
    ) values (
      ${s.id}, ${s.code}, ${s.name ?? null}, ${s.room ?? null}, ${s.shared}, ${s.risk},
      ${s.q9}, ${s.gad7}, ${s.q8}, ${s.q9Band}, ${s.gad7Band}, ${s.q8Band},
      ${s.crisis}, ${s.covered}, ${s.total}, ${s.provisional}, ${s.turns},
      ${JSON.stringify(s.history)}::jsonb, ${s.updatedAt}
    )
    on conflict (id) do update set
      code = excluded.code, name = excluded.name, room = excluded.room,
      shared = excluded.shared, risk = excluded.risk,
      q9 = excluded.q9, gad7 = excluded.gad7, q8 = excluded.q8,
      q9_band = excluded.q9_band, gad7_band = excluded.gad7_band, q8_band = excluded.q8_band,
      crisis = excluded.crisis, covered = excluded.covered, total = excluded.total,
      provisional = excluded.provisional, turns = excluded.turns,
      history = excluded.history, updated_at = excluded.updated_at
  `;
}

/* ---------------- อ่าน / เขียน ---------------- */

const ORDER: Record<Risk, number> = { high: 0, medium: 1, low: 2 };
const sortSnaps = (xs: Snap[]) =>
  xs.sort((a, b) => ORDER[a.risk] - ORDER[b.risk] || b.q9 - a.q9);

export async function all(): Promise<Snap[]> {
  const sql = db();
  if (!sql) {
    if (mem.size === 0) SEED().forEach((s) => mem.set(s.id, s));
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

export async function upsert(
  id: string,
  a: Assessment,
  meta: { risk: Risk; turns: number; name?: string; room?: string; shared?: boolean }
): Promise<Snap> {
  const sql = db();

  let prev: Snap | undefined;
  if (sql) {
    await ready(sql);
    const rows = (await sql`select * from assessments where id = ${id}`) as Row[];
    prev = rows[0] ? toSnap(rows[0]) : undefined;
  } else {
    if (mem.size === 0) SEED().forEach((s) => mem.set(s.id, s));
    prev = mem.get(id);
  }

  const next: Snap = {
    ...a,
    id,
    code: prev?.code ?? `SCH042-${id.toUpperCase().slice(0, 3)}`,
    name: meta.name ?? prev?.name,
    room: meta.room ?? prev?.room,
    shared: meta.shared ?? prev?.shared ?? false,
    risk: meta.risk,
    turns: meta.turns,
    updatedAt: Date.now(),
    history: [...(prev?.history ?? []), a.q9].slice(-8),
  };

  if (sql) await write(sql, next);
  else mem.set(id, next);

  return next;
}
