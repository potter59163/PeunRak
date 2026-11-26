import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { all, allPairs, allEvents, schemaColumns, isSeed, storageMode } from "@/lib/store";
import { handoffStats } from "@/lib/handoff";
import { agreement, MIN_ANSWERED } from "@/lib/agreement";
import { careStep, CARE_ORDER, type CareStep } from "@/lib/care";
import { DOMAINS } from "@/lib/domains";
import type { Kpi, RedteamSummary } from "@/lib/kpi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ตัวชี้วัดทั้ง 7 ข้อของโครงการ คำนวณจากข้อมูลที่ระบบเก็บจริงเท่านั้น
 * คืนเฉพาะค่ารวม ไม่มีข้อมูลรายคน และค่าเริ่มต้นไม่นับเคสจำลอง (?seeds=1 = นับรวม เพื่อดูหน้าตาตอนสาธิต)
 */

/** ผล red-team รอบล่าสุดที่รันบนเครื่องนี้ (npm run redteam) — บน Vercel ไม่มีไฟล์นี้ จึงคืน null */
async function redteam(kind: "ai" | "demo"): Promise<RedteamSummary | null> {
  try {
    const raw = await readFile(join(process.cwd(), "scripts", "redteam", "reports", `latest-${kind}.json`), "utf8");
    return JSON.parse(raw) as RedteamSummary;
  } catch {
    return null;
  }
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null);

export async function GET(req: Request) {
  const includeSeeds = new URL(req.url).searchParams.get("seeds") === "1";
  const everyone = await all();
  const seeded = everyone.filter((c) => isSeed(c.id)).length;
  const cases = includeSeeds ? everyone : everyone.filter((c) => !isSeed(c.id));

  // 1) การเข้าถึง
  const used = cases.filter((c) => c.turns > 0);
  const assessable = used.filter((c) => !c.provisional);

  // 2) คัดกรองเจอเร็ว — เคสเสี่ยงปานกลางขึ้นไปที่ครูระบุว่า "ไม่เคยรู้มาก่อน"
  const flagged = cases.filter((c) => c.risk !== "low");
  const early = {
    flagged: flagged.length,
    unknownBefore: flagged.filter((c) => c.priorKnown === false).length,
    knownBefore: flagged.filter((c) => c.priorKnown === true).length,
    unmarked: flagged.filter((c) => c.priorKnown === undefined).length,
  };

  // stepped care — แต่ละขั้นมีกี่เคส และกี่เคสยังไม่มีใครเริ่มดูแล
  const steps = CARE_ORDER.map((step: CareStep) => {
    const xs = cases.filter((c) => careStep(c) === step);
    return { step, n: xs.length, waiting: xs.filter((c) => c.refStatus === "none").length };
  });

  // 4) ส่งต่อเฉพาะทาง — จากตัวนับแบบไม่ระบุตัวตน
  const events = await allEvents();
  const count = (kind: string, domain?: string) =>
    events.filter((e) => e.kind === kind && (domain === undefined || e.domain === domain)).reduce((a, e) => a + e.n, 0);
  const routing = {
    byDomain: DOMAINS.map((d) => ({ domain: d, shown: count("card_shown", d), clicks: count("card_click", d) })),
    shown: count("card_shown"),
    clicks: count("card_click"),
    bridge: {
      open: count("bridge_open"), friend: count("bridge_friend"),
      counselor: count("bridge_counselor"), hotline: count("bridge_hotline"),
    },
    nudges: count("nudge_shown"),
    safetyCards: count("safety_shown"),
    selfCare: count("care_open"),
  };

  // 6) ความน่าเชื่อถือ
  const pairs = await allPairs();
  const strict = pairs.filter((p) => p.blind && p.answered >= MIN_ANSWERED && p.source !== "demo");

  // 7) ความเป็นส่วนตัว — อ่านโครงสร้างจากฐานข้อมูลจริง
  const columns = await schemaColumns();

  const body: Kpi = {
      at: Date.now(),
      storage: storageMode(),
      seeded,
      includeSeeds,
      reach: { students: used.length, assessable: assessable.length, pctAssessable: pct(assessable.length, used.length) },
      early,
      steps,
      loop: handoffStats(cases),
      routing,
      safety: { ai: await redteam("ai"), demo: await redteam("demo") },
      reliability: {
        all: agreement(pairs),
        strict: agreement(strict),
        bySource: { demo: pairs.filter((p) => p.source === "demo").length, ai: pairs.filter((p) => p.source !== "demo").length },
        blind: pairs.filter((p) => p.blind).length,
      },
      privacy: {
        /** ไม่มีคอลัมน์ไหนรับบทสนทนา จำนวนข้อความที่ถูกเก็บจึงเป็นศูนย์โดยโครงสร้าง */
        messagesStored: 0,
        columns,
      },
  };
  return Response.json(body, { headers: { "Content-Type": "application/json; charset=utf-8" } });
}
