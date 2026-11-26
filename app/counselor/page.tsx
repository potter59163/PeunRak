"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell, TopBar, Card, RiskBadge, Spark, zoneClass, Button, Hotline } from "@/components/ui";
import { EyeOff, Logout, ChevronRight, Bell, Doc, Phone, Hospital, Check, Users, Bridge, Trend } from "@/components/icons";
import { Funnel, DomainTags, LevelChip, Schedule, HandoffNotes, Timeline } from "@/components/handoff";
import { REF_LABEL, TRACK_LABEL, defaultTrack, type RefTrack } from "@/lib/handoff";
import type { Snap } from "@/lib/store";
import { signOut } from "@/lib/session";
import { usePoll } from "@/lib/client";
import { CARE, CARE_ORDER, careStep, type CareStep } from "@/lib/care";

const KEY = { low: "calm", medium: "watch", high: "care" } as const;
const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 6e4);
  if (m < 1) return "เมื่อครู่";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} ชม.ที่แล้ว` : `${Math.round(h / 24)} วันที่แล้ว`;
};

/** คำขอ "พาไปหาคน" ที่ยังไม่มีครูรับเรื่อง ขึ้นก่อนเสมอ */
const pending = (c: Snap) => Boolean(c.helpRequestedAt && !c.helpAckAt);

const STEP_TONE: Record<CareStep, string> = {
  crisis: "bg-care text-white",
  refer: "bg-care-soft text-care",
  checkin: "bg-watch-soft text-watch",
  self: "bg-calm-soft text-calm",
  unknown: "bg-surface-2 text-ink-2",
};

export default function Counselor() {
  const router = useRouter();
  const [cases, setCases] = useState<Snap[]>([]);
  const [seeded, setSeeded] = useState(0);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [only, setOnly] = useState<CareStep | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await (await fetch("/api/monitor", { cache: "no-store" })).json();
      setCases(d.cases); setSeeded(d.seeded ?? 0); setLive(true);
    } catch { setLive(false); }
  }, []);
  usePoll(load, 3000);

  async function act(id: string, body: Record<string, unknown>) {
    setBusy(id);
    await fetch("/api/referral", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    await load();
    setBusy(null);
  }
  const refer = (id: string, track: RefTrack) => act(id, { to: "sent", track });

  const high = cases.filter((c) => c.risk === "high").length;
  const crisis = cases.filter((c) => c.crisis).length;
  const asking = cases.filter(pending);
  const counts = { high, medium: cases.filter((c) => c.risk === "medium").length, low: cases.filter((c) => c.risk === "low").length };
  const ordered = [...asking, ...cases.filter((c) => !pending(c))].filter((c) => !only || careStep(c) === only);

  /** stepped care: แต่ละขั้นมีกี่เคส และกี่เคสยังไม่มีใครเริ่มดูแล */
  const queue = CARE_ORDER.map((step) => {
    const xs = cases.filter((c) => careStep(c) === step);
    return { step, n: xs.length, waiting: xs.filter((c) => c.refStatus === "none").length };
  });

  return (
    <Shell wide>
      <TopBar label="ครูแนะแนว" right={
        <>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1.5 text-[0.74rem] text-ink-2">
            <span className="relative flex size-1.5">
              {live ? <span className="ping absolute inline-flex size-1.5 rounded-full bg-calm" /> : null}
              <span className={`relative inline-flex size-1.5 rounded-full ${live ? "bg-calm" : "bg-ink-3"}`} />
            </span>
            realtime
          </span>
          <Link href="/admin" className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-[0.76rem] text-ink-2 transition hover:text-ink">
            <Trend dir="up" size={14} /> ตัวชี้วัด
          </Link>
          <button onClick={() => { signOut(); router.push("/"); }}
            className="grid size-9 place-items-center rounded-full text-ink-3 transition hover:bg-surface-2 hover:text-ink" aria-label="ออกจากระบบ">
            <Logout size={17} />
          </button>
        </>
      } />

      <main className="rise space-y-4 pb-8">
        <div className="grid grid-cols-3 gap-2.5">
          {([["สูง", counts.high, "care"], ["ปานกลาง", counts.medium, "watch"], ["ต่ำ", counts.low, "calm"]] as const).map(([l, n, z]) => (
            <Card key={l} className="p-4 sm:p-5">
              <p className="text-[0.79rem] text-ink-3">{l}</p>
              <p className={`mt-1.5 text-[1.8rem] font-semibold leading-none tabular-nums ${zoneClass[z].fg}`}>{n}</p>
            </Card>
          ))}
        </div>

        {crisis > 0 ? (
          <Card className="flex items-center gap-3 border-care/40 bg-care-soft p-4">
            <Phone size={18} className="shrink-0 text-care" />
            <p className="flex-1 text-[0.89rem] text-ink">
              <span className="font-medium text-care">{crisis} เคสเข้าเกณฑ์ฉุกเฉิน (8Q)</span> — เส้นทางฉุกเฉิน ไม่ใช่การรอคิว
            </p>
          </Card>
        ) : null}
        {asking.length > 0 ? (
          <Card className="flex items-center gap-3 border-accent/30 bg-accent-soft p-4">
            <Bridge size={18} className="shrink-0 text-accent" />
            <p className="flex-1 text-[0.89rem] text-ink">
              <span className="font-medium text-accent">{asking.length} คนขอให้ครูติดต่อกลับ</span> — นักเรียนกด &ldquo;พาไปหาคน&rdquo; ด้วยตัวเอง
            </p>
          </Card>
        ) : null}
        {high > 0 ? (
          <Card className="flex items-center gap-3 p-4">
            <Bell size={18} className="shrink-0 text-watch" />
            <p className="flex-1 text-[0.89rem] text-ink">มี {high} เคสความเสี่ยงสูง ควรติดต่อวันนี้</p>
          </Card>
        ) : null}

        {/* ---- stepped care: คิวตามขั้นการดูแล กดเพื่อกรองรายการด้านล่าง ---- */}
        <Card as="section" className="p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[0.95rem] font-medium text-ink">คิวตามขั้นการดูแล</h2>
            <p className="text-[0.78rem] text-ink-3">ขั้นคำนวณจากคะแนน ไม่ใช่ AI ตัดสิน</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {queue.map((q) => {
              const on = only === q.step;
              return (
                <button key={q.step} type="button" aria-pressed={on} onClick={() => setOnly(on ? null : q.step)}
                  className={`rounded-[var(--r-md)] border p-3 text-left transition ${on ? "border-accent/60 bg-accent-soft" : "border-line bg-surface hover:border-accent/40"}`}>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[0.7rem] font-medium ${STEP_TONE[q.step]}`}>{CARE[q.step].tag}</span>
                  <span className="mt-2 block text-[1.35rem] font-semibold leading-none tabular-nums text-ink">{q.n}</span>
                  <span className="mt-1 block text-[0.72rem] text-ink-3">
                    {q.n === 0 ? "ไม่มีเคส" : q.step === "self" || q.step === "unknown" ? "ไม่ต้องดำเนินการ" : q.waiting > 0 ? `${q.waiting} เคสยังไม่มีใครดูแล` : "มีคนดูแลครบแล้ว"}
                  </span>
                </button>
              );
            })}
          </div>
          {only ? (
            <p className="mt-3 text-[0.8rem] leading-relaxed text-ink-2">
              <span className="font-medium text-ink">{CARE[only].tag}:</span> {CARE[only].staff}
              <button type="button" onClick={() => setOnly(null)} className="ml-2 text-accent underline underline-offset-2">ดูทั้งหมด</button>
            </p>
          ) : null}
        </Card>

        <Funnel cases={cases} seeded={seeded} />

        <Card className="flex items-start gap-3 p-4">
          <EyeOff size={17} className="mt-0.5 shrink-0 text-ink-3" />
          <p className="text-[0.83rem] leading-relaxed text-ink-2">
            คะแนนคำนวณด้วยเกณฑ์ 9Q / GAD-7 / 8Q ของกรมสุขภาพจิต — AI ทำหน้าที่สกัดหลักฐานเท่านั้น ไม่ได้ให้คะแนนเอง
            <span className="mt-1 block text-ink-3">
              ไม่มีข้อความหรือคำพูดของนักเรียนถูกส่งมาที่หน้านี้ · หมวดเรื่องและชื่อแสดงเฉพาะเคสที่นักเรียนเลือกเปิดเอง
            </span>
          </p>
        </Card>

        <ul className="space-y-2.5">
          {ordered.map((c) => {
            const z = zoneClass[KEY[c.risk]];
            const first = defaultTrack(c.risk);
            const other: RefTrack = first === "school" ? "external" : "school";
            const mine = c.refTrack === "school";
            return (
              <Card as="li" key={c.id} className={`lift overflow-hidden p-4 ${pending(c) ? "border-accent/40" : ""}`}>
                <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[0.93rem] text-ink">{c.name ? `${c.name} · ${c.room ?? "—"}` : c.code}</span>
                      {c.provisional ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[0.76rem] font-medium text-ink-2">
                          <span className="size-1.5 rounded-full bg-ink-3" />
                          ข้อมูลยังไม่พอ
                        </span>
                      ) : (
                        <RiskBadge risk={c.risk} />
                      )}
                      {c.crisis ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-care px-2.5 py-1 text-[0.72rem] font-medium text-white">
                          <Phone size={11} /> ฉุกเฉิน
                        </span>
                      ) : null}
                      {c.helpRequestedAt ? (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.72rem] font-medium ${
                          c.helpAckAt ? "bg-calm-soft text-calm" : "bg-accent text-accent-ink"}`}>
                          {c.helpAckAt ? <Check size={11} /> : <Bridge size={11} />}
                          {c.helpAckAt ? "รับเรื่องแล้ว" : "ขอให้ครูติดต่อกลับ"}
                        </span>
                      ) : null}
                      <span className={`rounded-full px-2.5 py-1 text-[0.72rem] font-medium ${STEP_TONE[careStep(c)]}`}>{CARE[careStep(c)].tag}</span>
                      <LevelChip level={c.level} />
                    </div>
                    <p className="mt-1.5 text-[0.78rem] text-ink-3">
                      คุย {c.turns} รอบ · {ago(c.updatedAt)} · เก็บหลักฐานได้ {c.covered}/{c.total} ข้อ
                      {c.helpRequestedAt && !c.helpAckAt ? ` · ขอเมื่อ ${ago(c.helpRequestedAt)}` : ""}
                    </p>
                    {c.domains.length > 0 ? <div className="mt-2.5"><DomainTags domains={c.domains} /></div> : null}
                  </div>
                  <span className={z.fg}><Spark values={c.history} w={64} h={24} /></span>
                </div>

                <div className="mt-3 space-y-3 border-t border-line-soft pt-3">
                  {pending(c) ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" disabled={busy === c.id} onClick={() => act(c.id, { action: "ack" })}>
                        <Check size={15} /> รับเรื่องแล้ว
                      </Button>
                      <span className="text-[0.78rem] text-ink-3">
                        {c.level >= 2 ? "ติดต่อนักเรียนได้เลย" : "ยังไม่เปิดชื่อ — นักเรียนจะเห็นในแอปว่าครูรับเรื่องแล้ว และเดินมาหาเองพร้อมรหัสนี้"}
                      </span>
                    </div>
                  ) : null}

                  {c.refStatus === "none" ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant={c.risk === "low" ? "line" : "primary"} disabled={busy === c.id} onClick={() => refer(c.id, first)}>
                        {first === "school" ? <><Users size={15} /> ดูแลในโรงเรียนก่อน</> : <><Hospital size={15} /> ส่งต่อผู้เชี่ยวชาญ</>}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy === c.id} onClick={() => refer(c.id, other)}>
                        {other === "school" ? "ดูแลในโรงเรียนก่อน" : "ส่งต่อผู้เชี่ยวชาญ"}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8rem] font-medium ${
                          c.refStatus === "arrived" ? "bg-calm-soft text-calm" : "bg-accent-soft text-accent"}`}>
                          {c.refStatus === "arrived" ? <Check size={14} /> : mine ? <Users size={14} /> : <Hospital size={14} />}
                          {TRACK_LABEL[c.refTrack ?? "external"]} · {REF_LABEL[c.refStatus]}
                        </span>
                        <HandoffNotes c={c} />
                      </div>
                      <Timeline status={c.refStatus} track={c.refTrack} sentAt={c.refSentAt} apptAt={c.apptAt} arrivedAt={c.refArrivedAt} />

                      {c.refStatus !== "arrived" && c.level < 2 ? (
                        <p className="text-[0.78rem] leading-relaxed text-ink-3">
                          นักเรียนยังไม่เปิดชื่อ — ระบบแจ้งในแอปของเขาแล้ว และเขาเป็นคนเลือกเองว่าจะเปิดเมื่อไหร่
                        </p>
                      ) : null}

                      {/* เส้นทางในโรงเรียน ครูเป็นคนนัดและยืนยันเอง · เส้นทางภายนอก ผู้เชี่ยวชาญเป็นคนทำ */}
                      {mine && c.refStatus === "sent" ? (
                        <Schedule label="บันทึกวันนัด" busy={busy === c.id} onSave={(apptAt) => act(c.id, { to: "scheduled", apptAt })} />
                      ) : null}
                      {mine && c.refStatus === "scheduled" ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Button size="sm" disabled={busy === c.id} onClick={() => act(c.id, { to: "arrived" })}>
                            <Check size={15} /> ยืนยันว่ามาพบแล้ว
                          </Button>
                          {c.checkin === "missed" ? (
                            <Schedule label="นัดใหม่" busy={busy === c.id} onSave={(apptAt) => act(c.id, { action: "reschedule", apptAt })} />
                          ) : null}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-1">
                        {mine ? (
                          <Button size="sm" variant="ghost" className="-ml-3" disabled={busy === c.id} onClick={() => act(c.id, { action: "escalate" })}>
                            <Hospital size={15} /> ส่งต่อผู้เชี่ยวชาญภายนอก
                          </Button>
                        ) : null}
                        <Button size="sm" variant="ghost" className={mine ? "" : "-ml-3"} href={`/referral/${c.id}`}>
                          <Doc size={15} /> เอกสารส่งต่อ
                        </Button>
                      </div>
                    </>
                  )}

                  {/* ตัวชี้วัด "คัดกรองเจอเร็ว": ครูเป็นคนบอกว่ารู้จักเคสนี้มาก่อนไหม — ตอบได้เมื่อรู้ว่าเป็นใครเท่านั้น */}
                  {c.risk !== "low" && c.level >= 2 ? (
                    <div className="flex flex-wrap items-center gap-2 text-[0.78rem] text-ink-3">
                      ก่อนระบบเจอ ครูรู้อยู่แล้วไหมว่าเด็กคนนี้กำลังลำบาก
                      {([[false, "ไม่เคยรู้"], [true, "รู้อยู่แล้ว"]] as const).map(([v, label]) => (
                        <button key={label} type="button" aria-pressed={c.priorKnown === v} disabled={busy === c.id}
                          onClick={() => act(c.id, { action: "known", known: v })}
                          className={`min-h-[32px] rounded-full border px-3 text-[0.76rem] transition ${c.priorKnown === v ? "border-accent/60 bg-accent-soft font-medium text-accent" : "border-line bg-surface text-ink-2 hover:border-accent/40"}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line-soft pt-3">
                  {([["9Q", c.q9, 27, c.q9Band], ["GAD-7", c.gad7, 21, c.gad7Band], ["8Q", c.q8, 20, c.q8Band]] as const).map(
                    ([label, val, max, band]) => (
                      <div key={label}>
                        <p className="text-[0.7rem] text-ink-3">{label}</p>
                        <p className="mt-0.5 text-[1.02rem] font-medium tabular-nums text-ink">
                          {val}<span className="text-[0.72rem] font-normal text-ink-3">/{max}</span>
                        </p>
                        <p className="mt-0.5 truncate text-[0.68rem] text-ink-3" title={band}>{band}</p>
                      </div>
                    )
                  )}
                </div>
              </Card>
            );
          })}
        </ul>

        <Card>
          <Link href="/referral" className="flex items-center gap-3.5 p-4 transition hover:bg-surface-2">
            <Doc size={18} className="shrink-0 text-ink-3" />
            <span className="flex-1 text-[0.92rem] text-ink">เอกสารส่งต่อทั้งหมด</span>
            <ChevronRight size={16} className="text-ink-3" />
          </Link>
        </Card>

        <Button href="/chat" variant="ghost" size="sm">เปิดมุมมองนักเรียนเพื่อทดสอบ realtime</Button>
      </main>
      <Hotline />
    </Shell>
  );
}
