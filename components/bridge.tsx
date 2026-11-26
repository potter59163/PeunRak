"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card } from "./ui";
import { Bridge, Users, Phone, Person, Close, Check, ArrowLeft, ChevronRight, Eye, EyeOff } from "./icons";
import { shown, type DomainHit, type DomainId } from "@/lib/domains";
import { DOMAIN_HELP, RESOURCES, resourcesFor, type Resource } from "@/lib/resources";
import { askCounselor, useHasName, track, trackOnce } from "@/lib/client";
import type { HandoffState, Level } from "@/lib/handoff";

/**
 * "สะพาน ไม่ใช่ปลายทาง" — ทุกอย่างในไฟล์นี้มีหน้าที่เดียว คือพานักเรียนออกจากแชทไปหาคนจริง
 *
 * ไม่มีช่องให้พิมพ์สักช่อง: เลือกคน เลือกระดับการเปิดเผย แล้วจบ
 * สิ่งที่ถูกส่งไปถึงครูจึงมีแค่ "มีคำขอ" กับระดับที่นักเรียนเลือกเอง
 */

export type BridgeStep = "who" | "friend" | "counselor" | "hotline";

/** [ต้องให้ผู้เชี่ยวชาญตรวจเนื้อหา] ประโยคเปิดเรื่องสำหรับคุยกับเพื่อนหรือคนที่ไว้ใจ */
const STARTERS = [
  "ช่วงนี้เราไม่ค่อยโอเคเลย ขอเล่าอะไรให้ฟังหน่อยได้ไหม",
  "เราไม่ได้อยากให้แก้ปัญหาให้นะ แค่อยากให้มีคนฟัง",
  "มีเรื่องหนึ่งที่เราเก็บมานาน ไม่รู้จะเริ่มเล่ายังไงดี",
];

function Row({ Icon, title, sub, onClick, disabled }: {
  Icon: typeof Users; title: string; sub: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="flex w-full items-start gap-3.5 rounded-[var(--r-lg)] border border-line bg-surface p-4 text-left shadow-[var(--sh-1)] transition hover:border-accent/40 hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-45">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><Icon size={18} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.95rem] text-ink">{title}</span>
        <span className="mt-0.5 block text-[0.81rem] leading-relaxed text-ink-3">{sub}</span>
      </span>
      <ChevronRight size={16} className="mt-1 shrink-0 text-ink-3" />
    </button>
  );
}

function Call({ r, strong = false }: { r: Resource; strong?: boolean }) {
  return (
    <a href={`tel:${r.number}`}
      className={`flex items-center gap-3.5 rounded-[var(--r-lg)] border p-4 transition ${
        strong ? "border-care/30 bg-care-soft hover:border-care/60" : "border-line bg-surface shadow-[var(--sh-1)] hover:border-accent/40 hover:bg-surface-2"}`}>
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${strong ? "bg-care text-white" : "bg-accent-soft text-accent"}`}>
        <Phone size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 text-[0.95rem] text-ink">
          {r.name}
          {!r.verified ? <Unverified /> : null}
        </span>
        <span className="mt-0.5 block text-[0.81rem] leading-relaxed text-ink-3">{r.when}</span>
      </span>
      <span className={`shrink-0 text-[1.15rem] font-semibold tabular-nums ${strong ? "text-care" : "text-accent"}`}>{r.number}</span>
    </a>
  );
}

/** เห็นเฉพาะตอน dev — production ไม่แสดงช่องทางที่ยังไม่ยืนยันเลย (lib/resources.ts) */
const Unverified = () => (
  <span className="rounded-full bg-watch-soft px-2 py-0.5 text-[0.68rem] font-medium text-watch">รอยืนยัน</span>
);

/* ---------------- ชีต "พาไปหาคน" ------------------------------------------ */

/** ผู้เรียกแสดงชีตเฉพาะตอนเปิด ({step ? <BridgeSheet/> : null}) — ปิดแล้วสถานะข้างในหายไปเอง */
export function BridgeSheet({ step, onStep, domains = [], onSent }: {
  step: BridgeStep;
  /** null = ปิด */
  onStep: (s: BridgeStep | null) => void;
  domains?: DomainHit[];
  onSent?: (s: HandoffState) => void;
}) {
  const hasName = useHasName();
  const panel = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<HandoffState | null>(null);
  const [failed, setFailed] = useState(false);

  const close = () => onStep(null);

  useEffect(() => { track("bridge_open"); }, []);
  useEffect(() => {
    if (step === "friend") track("bridge_friend");
    if (step === "hotline") track("bridge_hotline");
  }, [step]);

  useEffect(() => {
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onStep(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStep]);

  async function request(level: Level) {
    setBusy(true); setFailed(false);
    const s = await askCounselor(level);
    setBusy(false);
    if (!s) { setFailed(true); return; }
    track("bridge_counselor");
    setSent(s);
    onSent?.(s);
  }

  const online = shown(domains).some((d) => d.id === "online_threat");

  return (
    <div className="no-print fixed inset-0 z-40 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="bridge-title">
      <button type="button" aria-label="ปิด" onClick={close} className="absolute inset-0 cursor-default bg-ink/35 backdrop-blur-[2px]" />
      <div ref={panel} tabIndex={-1}
        className="rise relative max-h-[88dvh] w-full max-w-[34rem] overflow-y-auto rounded-t-[28px] border border-line bg-paper p-5 pb-7 shadow-[var(--sh-2)] outline-none sm:rounded-[28px]">
        <div className="mb-4 flex items-center gap-2.5">
          {step !== "who" && !sent ? (
            <button type="button" onClick={() => onStep("who")} aria-label="ย้อนกลับ"
              className="grid size-9 place-items-center rounded-full text-ink-2 transition hover:bg-surface-2">
              <ArrowLeft size={18} />
            </button>
          ) : (
            <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent"><Bridge size={18} /></span>
          )}
          <h2 id="bridge-title" className="flex-1 text-[1.08rem] font-medium text-ink">พาไปหาคน</h2>
          <button type="button" onClick={close} aria-label="ปิด"
            className="grid size-9 place-items-center rounded-full text-ink-3 transition hover:bg-surface-2 hover:text-ink">
            <Close size={17} />
          </button>
        </div>

        {sent ? (
          <div>
            <div className="grid size-11 place-items-center rounded-full bg-calm-soft text-calm"><Check size={20} /></div>
            <p className="mt-4 text-[1.1rem] font-medium text-ink">ส่งคำขอถึงครูแนะแนวแล้ว</p>
            {sent.level >= 2 ? (
              <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-2">ครูเห็นชื่อและห้องของเธอ และจะติดต่อกลับเอง</p>
            ) : (
              <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-2">
                ครูเห็นว่ามีคนขอคุย แต่ยังไม่รู้ว่าเป็นเธอ เมื่อพร้อม เดินไปห้องแนะแนวแล้วบอกรหัส{" "}
                <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-medium tabular-nums text-ink">{sent.code}</span> ได้เลย
                หรือเปลี่ยนใจเปิดชื่อทีหลังก็ได้
              </p>
            )}
            <p className="mt-2 text-[0.82rem] text-ink-3">ครูไม่เห็นข้อความในแชท ไม่ว่าเลือกแบบไหน</p>
            <div className="mt-5 space-y-2.5">
              <Button href="/journey" size="lg" full>ดูเส้นทางของฉัน <ChevronRight size={16} /></Button>
              <Button variant="line" size="lg" full onClick={close}>กลับไปคุยต่อ</Button>
            </div>
          </div>
        ) : step === "who" ? (
          <div>
            <p className="mb-4 text-[0.9rem] leading-relaxed text-ink-2">
              AI รับฟังได้ แต่คนจริงช่วยได้มากกว่า เลือกได้เลยว่าอยากไปหาใคร
            </p>
            <div className="space-y-2.5">
              <Row Icon={Person} title="เพื่อนหรือคนที่ไว้ใจ" sub="มีประโยคเปิดเรื่องให้ลองใช้" onClick={() => onStep("friend")} />
              <Row Icon={Users} title="ครูแนะแนว" sub="ขอให้ครูติดต่อกลับ เลือกได้ว่าจะเปิดชื่อหรือยังไม่เปิด" onClick={() => onStep("counselor")} />
              <Row Icon={Phone} title="สายด่วน" sub="คุยกับผู้ให้คำปรึกษาได้เลยตอนนี้ ฟรี 24 ชั่วโมง" onClick={() => onStep("hotline")} />
            </div>
          </div>
        ) : step === "friend" ? (
          <div>
            <p className="mb-3 text-[0.9rem] leading-relaxed text-ink-2">
              เลือกคนที่เคยฟังเธอโดยไม่ตัดสิน แล้วลองเริ่มด้วยประโยคง่าย ๆ แบบนี้
            </p>
            <ul className="space-y-2">
              {STARTERS.map((t) => (
                <li key={t} className="rounded-[var(--r-md)] border border-line bg-surface px-4 py-3 text-[0.92rem] leading-relaxed text-ink">
                  &ldquo;{t}&rdquo;
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[0.82rem] leading-relaxed text-ink-3">
              ถ้าเล่าแล้วยังหนักอยู่ หรือยังไม่มีใครให้เล่า ครูแนะแนวกับสายด่วนยังอยู่ตรงนี้เสมอ
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="soft" size="sm" onClick={() => onStep("counselor")}><Users size={15} /> ครูแนะแนว</Button>
              <Button variant="soft" size="sm" onClick={() => onStep("hotline")}><Phone size={15} /> สายด่วน</Button>
            </div>
          </div>
        ) : step === "counselor" ? (
          <div>
            <p className="mb-4 text-[0.9rem] leading-relaxed text-ink-2">
              ครูจะติดต่อกลับได้ก็ต่อเมื่อรู้ว่าเป็นใคร เธอเป็นคนเลือกเองว่าจะเปิดแค่ไหน
            </p>
            <div className="space-y-2.5">
              <Row Icon={Eye} title="เปิดชื่อให้ครู"
                sub={hasName ? "ครูเห็นชื่อและห้อง แล้วติดต่อกลับเอง" : "ยังไม่ได้กรอกชื่อ — ไปที่แท็บโปรไฟล์ก่อน แล้วกลับมากดอีกครั้ง"}
                disabled={busy || !hasName} onClick={() => request(2)} />
              <Row Icon={EyeOff} title="ยังไม่เปิดชื่อ"
                sub="ครูเห็นว่ามีคนขอคุยและเห็นหมวดเรื่อง แต่ไม่รู้ว่าเป็นเธอ"
                disabled={busy} onClick={() => request(1)} />
            </div>
            {failed ? <p className="mt-3 text-[0.84rem] text-care">ส่งไม่สำเร็จ ลองอีกครั้งนะ ถ้าเร่งด่วนโทร 1323 ได้เลย</p> : null}
            <p className="mt-4 text-[0.82rem] leading-relaxed text-ink-3">
              ครูไม่เห็นข้อความในแชท ไม่ว่าเลือกแบบไหน และเปลี่ยนใจได้ทุกเมื่อ
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {online ? <Call r={RESOURCES.aoc1441} /> : null}
            <Call r={RESOURCES.mh1323} />
            <Call r={RESOURCES.ems1669} strong />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- การ์ดช่องทางช่วยเหลือตามหมวด ---------------------------- */

/**
 * แสดงเมื่อ AI ตัวที่สองมั่นใจว่าเรื่องอยู่ในหมวดนั้น (>= DOMAIN_FLOOR)
 * ข้อความพูดถึง "เรื่อง" ไม่พูดถึง "ตัวเขา" — ไม่มีคำว่า ติด เป็น หรือชื่อโรค
 */
export function HelpCards({ domains, onBridge, limit = 2, onHide }: {
  domains: DomainHit[];
  onBridge: () => void;
  limit?: number;
  onHide?: (id: DomainId) => void;
}) {
  const top = shown(domains, limit);
  const ids = top.map((d) => d.id).join(",");
  useEffect(() => {
    for (const id of ids ? (ids.split(",") as DomainId[]) : []) trackOnce("card_shown", id);
  }, [ids]);
  if (top.length === 0) return null;
  return (
    <div className="space-y-2.5">
      {top.map((d) => (
        <Card key={d.id} as="section" className="rise p-4" >
          <div className="flex items-start gap-3">
            <p className="flex-1 text-[0.9rem] leading-relaxed text-ink">{DOMAIN_HELP[d.id].lead}</p>
            {onHide ? (
              <button type="button" onClick={() => onHide(d.id)} aria-label="ซ่อนการ์ดนี้"
                className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-full text-ink-3 transition hover:bg-surface-2 hover:text-ink">
                <Close size={15} />
              </button>
            ) : null}
          </div>
          <ul className="mt-3 divide-y divide-line-soft border-t border-line-soft">
            {resourcesFor(d.id).map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[0.86rem] text-ink">
                    {r.name}
                    {!r.verified ? <Unverified /> : null}
                  </p>
                  <p className="mt-0.5 text-[0.76rem] leading-relaxed text-ink-3">{r.when}</p>
                </div>
                {r.kind === "hotline" ? (
                  <a href={`tel:${r.number}`} onClick={() => track("card_click", d.id)}
                    className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-full bg-accent-soft px-3.5 text-[0.9rem] font-semibold tabular-nums text-accent transition hover:bg-[#DDE9FD]">
                    <Phone size={14} /> {r.number}
                  </a>
                ) : (
                  <Button variant="soft" size="sm" onClick={() => { track("card_click", d.id); onBridge(); }} className="shrink-0"><Bridge size={15} /> พาไปหาคน</Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

/* ---------------- การ์ดความปลอดภัย --------------------------------------- */

/**
 * ขึ้นจากผลของ AI ตัวที่สอง (คะแนน 8Q) ไม่ได้พึ่งว่าแชทบอทจะพูดถึงสายด่วนเองหรือไม่
 * crisis = 8Q ตั้งแต่ระดับปานกลาง → เส้นทางฉุกเฉิน
 */
export function SafetyCard({ crisis, onBridge }: { crisis: boolean; onBridge: () => void }) {
  useEffect(() => { trackOnce("safety_shown"); }, []);
  return (
    <Card as="section" className={`rise p-4 ${crisis ? "border-care/40 bg-care-soft" : ""}`}>
      <p className="text-[0.92rem] leading-relaxed text-ink">
        {crisis
          ? "ตอนนี้ความปลอดภัยของเธอสำคัญที่สุด มีคนพร้อมรับสายอยู่เดี๋ยวนี้"
          : "ความคิดแบบนี้ไม่ควรต้องอยู่กับมันคนเดียว มีคนที่คุยเรื่องนี้ได้ตลอดเวลา"}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href="tel:1323" className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-care px-4 text-[0.92rem] font-semibold text-white transition hover:brightness-105">
          <Phone size={15} /> 1323 สุขภาพจิต
        </a>
        <a href="tel:1669" className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-care/40 bg-surface px-4 text-[0.92rem] font-semibold text-care transition hover:bg-care-soft">
          <Phone size={15} /> 1669 ฉุกเฉิน
        </a>
        <Button variant="line" size="sm" onClick={onBridge} className="!min-h-[42px]"><Bridge size={15} /> พาไปหาคน</Button>
      </div>
    </Card>
  );
}

/* ---------------- ชวนไปหาคนจริง ------------------------------------------- */

export type NudgeKind = "turns" | "zone" | "break";

const NUDGE: Record<NudgeKind, string> = {
  turns: "คุยกันมาสักพักแล้ว เรื่องแบบนี้ถ้ามีคนจริงสักคนรู้ด้วย มักจะเบาขึ้นมาก อยากให้พาไปหาใครไหม",
  zone: "เรื่องที่เธอเล่ามาเริ่มหนักเกินกว่าจะแบกคนเดียวแล้ว เราเป็น AI ช่วยได้แค่รับฟัง อยากให้พาไปหาคนที่ช่วยได้จริงไหม",
  break: "คุยกันมานานพอสมควรแล้ว ลองพักสายตา ลุกไปดื่มน้ำ หรือไปอยู่ใกล้ ๆ ใครสักคนก่อนดีไหม กลับมาคุยต่อได้เสมอ",
};

export function Nudge({ kind, onPick, onDismiss }: {
  kind: NudgeKind;
  onPick: (s: BridgeStep) => void;
  onDismiss: () => void;
}) {
  useEffect(() => { track("nudge_shown"); }, [kind]);
  return (
    <Card as="section" className="rise border-accent/25 bg-accent-soft p-4">
      <div className="flex gap-3">
        <Bridge size={18} className="mt-0.5 shrink-0 text-accent" />
        <p className="text-[0.9rem] leading-relaxed text-ink">{NUDGE[kind]}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 pl-[30px]">
        <Button variant="line" size="sm" onClick={() => onPick("friend")}>เพื่อน</Button>
        <Button variant="line" size="sm" onClick={() => onPick("counselor")}>ครูแนะแนว</Button>
        <Button variant="line" size="sm" onClick={() => onPick("hotline")}>สายด่วน</Button>
        <Button variant="ghost" size="sm" onClick={onDismiss}>{kind === "break" ? "คุยต่ออีกหน่อย" : "ยังก่อน"}</Button>
      </div>
    </Card>
  );
}
