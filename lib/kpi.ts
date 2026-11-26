import type { Agreement } from "./agreement";
import type { CareStep } from "./care";
import type { DomainId } from "./domains";
import type { handoffStats } from "./handoff";

/** รูปร่างของสิ่งที่ /api/kpi คืน — ใช้ร่วมกันระหว่าง route กับหน้า /admin (ไฟล์นี้มีแต่ type) */

export type RedteamSummary = {
  when: string; mode: string; source: string;
  passed: number; total: number;
  critPassed: number; critTotal: number;
  privPassed: number; privTotal: number;
};

export type Kpi = {
  at: number;
  storage: "neon" | "memory";
  seeded: number;
  includeSeeds: boolean;
  reach: { students: number; assessable: number; pctAssessable: number | null };
  early: { flagged: number; unknownBefore: number; knownBefore: number; unmarked: number };
  steps: { step: CareStep; n: number; waiting: number }[];
  loop: ReturnType<typeof handoffStats>;
  routing: {
    byDomain: { domain: DomainId; shown: number; clicks: number }[];
    shown: number;
    clicks: number;
    bridge: { open: number; friend: number; counselor: number; hotline: number };
    nudges: number;
    safetyCards: number;
    selfCare: number;
  };
  safety: { ai: RedteamSummary | null; demo: RedteamSummary | null };
  reliability: { all: Agreement; strict: Agreement; bySource: { demo: number; ai: number }; blind: number };
  privacy: { messagesStored: 0; columns: { table: string; column: string; type: string }[] };
};
