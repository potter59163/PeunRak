"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell, TopBar, Card, RiskBadge, Spark, zoneClass, Button, Hotline } from "@/components/ui";
import { EyeOff, Logout, Doc, Check, Phone, Hospital } from "@/components/icons";
import { Timeline, DomainTags, Schedule, HandoffNotes } from "@/components/handoff";
import { thaiDate as day } from "@/lib/handoff";
import type { Snap } from "@/lib/store";
import { signOut } from "@/lib/session";
import { usePoll } from "@/lib/client";

const KEY = { low: "calm", medium: "watch", high: "care" } as const;

export default function Specialist() {
  const router = useRouter();
  const [cases, setCases] = useState<Snap[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await (await fetch("/api/monitor", { cache: "no-store" })).json();
      // เห็นเฉพาะเคสที่ส่งต่อออกนอกโรงเรียน — เคสที่ครูแนะแนวดูแลเองในโรงเรียนไม่มาถึงหน้านี้
      setCases((d.cases as Snap[]).filter((c) => c.refStatus !== "none" && (c.refTrack ?? "external") === "external"));
    } catch { /* เงียบไว้ รอบถัดไปลองใหม่ */ }
  }, []);
  usePoll(load, 4000);

  async function act(id: string, body: Record<string, unknown>) {
    setBusy(id);
    await fetch("/api/referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    await load();
    setBusy(null);
  }

  const waiting = cases.filter((c) => c.refStatus === "sent").length;
  const arrived = cases.filter((c) => c.refStatus === "arrived").length;

  return (
    <Shell wide>
      <TopBar label="ผู้เชี่ยวชาญ" right={
        <button onClick={() => { signOut(); router.push("/"); }}
          className="grid size-9 place-items-center rounded-full text-ink-3 transition hover:bg-surface-2 hover:text-ink" aria-label="ออกจากระบบ">
          <Logout size={17} />
        </button>
      } />

      <main className="rise space-y-4 pb-8">
        <div className="grid grid-cols-3 gap-2.5">
          {([["รอรับเคส", waiting, "care"], ["ทั้งหมด", cases.length, "calm"], ["เข้าพบแล้ว", arrived, "calm"]] as const).map(([l, n, z]) => (
            <Card key={l} className="p-4 sm:p-5">
              <p className="text-[0.79rem] text-ink-3">{l}</p>
              <p className={`mt-1.5 text-[1.8rem] font-semibold leading-none tabular-nums ${zoneClass[z].fg}`}>{n}</p>
            </Card>
          ))}
        </div>

        <Card className="flex items-start gap-3 p-4">
          <EyeOff size={17} className="mt-0.5 shrink-0 text-ink-3" />
          <p className="text-[0.83rem] leading-relaxed text-ink-2">
            เห็นเฉพาะเคสที่โรงเรียนส่งต่อมา พร้อมคะแนนตามเกณฑ์ 9Q / GAD-7 / 8Q และหมวดเรื่องที่นักเรียนเลือกเปิดเอง ไม่มีบทสนทนา
            <span className="mt-1 block text-ink-3">การวินิจฉัยและการจัดลำดับความเร่งด่วนเป็นดุลยพินิจของผู้เชี่ยวชาญทั้งหมด</span>
          </p>
        </Card>

        {cases.length === 0 ? (
          <Card className="p-8 text-center">
            <Hospital size={26} className="mx-auto text-ink-3" />
            <p className="mt-3 text-[0.93rem] text-ink">ยังไม่มีเคสส่งต่อ</p>
            <p className="mt-1 text-[0.83rem] text-ink-3">เคสจะปรากฏที่นี่เมื่อครูแนะแนวกดส่งต่อ</p>
          </Card>
        ) : null}

        <ul className="space-y-2.5">
          {cases.map((c) => {
            const z = zoneClass[KEY[c.risk]];

            return (
              <Card as="li" key={c.id} className="p-4">
                <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[0.93rem] text-ink">{c.name ? `${c.name} · ${c.room ?? "—"}` : c.code}</span>
                      <RiskBadge risk={c.risk} />
                      {c.crisis ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-care px-2.5 py-1 text-[0.72rem] font-medium text-white">
                          <Phone size={11} /> ฉุกเฉิน
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-[0.78rem] text-ink-3">
                      ส่งต่อเมื่อ {day(c.refSentAt)} · เก็บหลักฐาน {c.covered}/{c.total} ข้อ
                    </p>
                    {c.domains.length > 0 ? <div className="mt-2.5"><DomainTags domains={c.domains} /></div> : null}
                  </div>
                  <span className={z.fg}><Spark values={c.history} w={64} h={24} /></span>
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

                <div className="mt-4 space-y-3 border-t border-line-soft pt-4">
                  <Timeline status={c.refStatus} track={c.refTrack} sentAt={c.refSentAt} apptAt={c.apptAt} arrivedAt={c.refArrivedAt} />
                  <HandoffNotes c={c} />
                  {c.refStatus !== "arrived" && c.level < 2 ? (
                    <p className="text-[0.78rem] leading-relaxed text-ink-3">
                      นักเรียนยังไม่เปิดชื่อ — วันนัดจะขึ้นในแอปของเขา และครูแนะแนวเป็นผู้ประสาน
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link href="/referral" className="inline-flex min-h-[38px] items-center gap-2 rounded-full border border-line bg-surface px-4 text-[0.86rem] text-ink transition hover:bg-surface-2">
                    <Doc size={15} /> เอกสารส่งต่อ
                  </Link>
                  {c.refStatus === "sent" ? (
                    <Schedule label="บันทึกการนัดหมาย" busy={busy === c.id} onSave={(apptAt) => act(c.id, { to: "scheduled", apptAt })} />
                  ) : c.refStatus === "scheduled" ? (
                    <>
                      <Button size="sm" disabled={busy === c.id} onClick={() => act(c.id, { to: "arrived" })}>
                        <Check size={15} /> ยืนยันว่าเข้าพบแล้ว
                      </Button>
                      {c.checkin === "missed" ? (
                        <Schedule label="นัดใหม่" busy={busy === c.id} onSave={(apptAt) => act(c.id, { action: "reschedule", apptAt })} />
                      ) : null}
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-calm-soft px-3.5 py-2 text-[0.84rem] font-medium text-calm">
                      <Check size={15} /> เข้าพบแล้ว {day(c.refArrivedAt)}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </ul>
      </main>
      <Hotline />
    </Shell>
  );
}
