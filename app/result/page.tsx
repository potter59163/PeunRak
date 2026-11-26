"use client";

import { useState } from "react";
import { Shell, TopBar, Button, Card, zoneClass, Hotline, BottomNav } from "@/components/ui";
import { Moon, Pulse, Device, Clock, Quote, Check, EyeOff, Users, Eye, Hospital, ChevronRight } from "@/components/icons";
import { BridgeSheet, HelpCards, type BridgeStep } from "@/components/bridge";
import { Q9, GAD7, Q8, scoreOf, readVitals, combine, ZONE_COPY, type Zone } from "@/lib/instruments";
import { DEMO_EXTRACTIONS, DEMO_VITALS, DEMO_DOMAINS } from "@/lib/demo";
import { LEVELS as LADDER, type Level } from "@/lib/handoff";
import { chooseLevel, useHydrated } from "@/lib/client";
import { last, myLevel } from "@/lib/session";

const s9 = scoreOf(Q9, DEMO_EXTRACTIONS);
const sG = scoreOf(GAD7, DEMO_EXTRACTIONS);
const s8 = scoreOf(Q8, DEMO_EXTRACTIONS);
const ZONE: Zone = combine([s9.zone, sG.zone], s8.raw);
const vitals = readVitals(DEMO_VITALS);
const ICON = { sleep: Moon, quality: Clock, activity: Pulse, screen: Device } as const;

/** ข้อความของแต่ละขั้นมาจาก lib/handoff.ts ที่เดียว — หน้านี้ หน้าไปหาคน และแดชบอร์ดครูใช้ชุดเดียวกัน */
const ICONS = [EyeOff, Users, Eye, Hospital];
const LEVELS = LADDER.map((l, i) => ({ ...l, Icon: ICONS[i], tag: i === 1 ? "แนะนำ" : undefined }));

export default function Result() {
  const hydrated = useHydrated();
  const [picked, setPicked] = useState<number | null>(null);
  const [why, setWhy] = useState(false);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sheet, setSheet] = useState<BridgeStep | null>(null);
  const c = zoneClass[ZONE];

  // ระดับที่เคยเลือกไว้ และหมวดเรื่องจากการคุยรอบล่าสุด (ถ้ายังไม่ได้คุย ใช้ชุดตัวอย่างเดียวกับคะแนนด้านบน)
  const level = picked ?? (hydrated ? myLevel() : null);
  const setLevel = setPicked;
  const domains = hydrated ? last()?.domains ?? DEMO_DOMAINS : [];

  /** บันทึกระดับที่เลือกจริง — เดิมหน้านี้แค่เปลี่ยนหน้าจอ ไม่ได้ส่งอะไรไปไหน */
  async function confirm() {
    if (level === null) return;
    setSaving(true); setFailed(false);
    const ok = await chooseLevel(level as Level);
    setSaving(false);
    if (ok) setDone(true);
    else setFailed(true);
  }

  if (done)
    return (
      <Shell pad>
        <TopBar label="สรุป" />
        <main className="rise flex flex-1 flex-col justify-center py-10">
          <div className="grid size-11 place-items-center rounded-full bg-accent-soft text-accent"><Check size={20} /></div>
          <h1 className="mt-5 text-[1.5rem] font-semibold text-ink">บันทึกแล้ว</h1>
          <p className="mt-2 text-[0.93rem] leading-relaxed text-ink-2">
            {level !== null ? LEVELS[level].sub : null} เปลี่ยนใจตอนไหนก็ได้ที่แท็บ ไปหาคน
          </p>
          <div className="mt-6 space-y-2.5">
            <Button href="/journey" size="lg" full>ดูเส้นทางไปหาคน <ChevronRight size={16} /></Button>
            <Button href="/tests" variant="line" size="lg" full>ลองทำแบบทดสอบ</Button>
            {level === 3 ? <Button href="/referral" variant="line" size="lg" full>ดูเอกสารส่งต่อ</Button> : null}
          </div>
        </main>
        <BottomNav />
      </Shell>
    );

  return (
    <Shell pad>
      <TopBar back="/chat" label="สรุป" />
      <main className="rise space-y-5 pb-6">
        <Card className="p-5">
          <div className="flex items-center gap-2.5">
            <span className={`size-2.5 rounded-full ${c.fg}`} style={{ background: "currentColor" }} />
            <h1 className="text-[1.4rem] font-semibold text-ink">{ZONE_COPY[ZONE].label}</h1>
          </div>
          <div className="mt-4 flex gap-6 border-t border-line-soft pt-4">
            {[s9, sG, s8].map((s) => (
              <div key={s.instrument}>
                <p className="text-[0.75rem] text-ink-3">{s.instrument}</p>
                <p className="mt-0.5 text-[1.3rem] font-semibold tabular-nums text-ink">{s.raw}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[0.78rem] text-ink-3">คัดกรองเบื้องต้น ไม่ใช่การวินิจฉัย</p>
        </Card>

        <div>
          <p className="mb-2.5 text-[0.84rem] font-medium text-ink-2">ร่างกาย</p>
          <div className="grid grid-cols-2 gap-2.5">
            {vitals.map((v) => {
              const I = ICON[v.key];
              const vc = zoneClass[v.flag as Zone];
              return (
                <Card key={v.key} className="lift p-4">
                  <span className={`inline-grid size-9 place-items-center rounded-xl ${vc.bg} ${vc.fg}`}><I size={15} /></span>
                  <p className="mt-2.5 text-[0.78rem] text-ink-3">{v.label}</p>
                  <p className="text-[1.05rem] text-ink">{v.value}</p>
                </Card>
              );
            })}
          </div>
        </div>

        <Card>
          <button onClick={() => setWhy((v) => !v)} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-surface-2">
            <Quote size={16} className="shrink-0 text-ink-3" />
            <span className="flex-1 text-[0.9rem] text-ink">คะแนนมาจากไหน</span>
            <span className="text-[0.8rem] text-ink-3">{why ? "ซ่อน" : "ดู"}</span>
          </button>
          {why ? (
            <ul className="rise space-y-3 border-t border-line-soft p-4">
              {DEMO_EXTRACTIONS.filter((e) => e.confidence > 0.85).slice(0, 4).map((e) => (
                <li key={e.itemId}>
                  <p className="text-[0.87rem] leading-relaxed text-ink">&ldquo;{e.evidence}&rdquo;</p>
                  <p className="mt-0.5 text-[0.74rem] text-ink-3">{e.itemId} · {e.score} คะแนน · {Math.round(e.confidence * 100)}%</p>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>

        {domains.length > 0 ? (
          <div>
            <p className="mb-2.5 text-[0.84rem] font-medium text-ink-2">มีคนที่ช่วยเรื่องนี้ได้</p>
            <HelpCards domains={domains} onBridge={() => setSheet("counselor")} />
          </div>
        ) : null}

        <div>
          <p className="mb-1 text-[1.05rem] font-medium text-ink">ให้ใครรู้บ้าง</p>
          <p className="mb-3 text-[0.83rem] text-ink-3">เปลี่ยนใจตอนไหนก็ได้</p>
          <ul className="space-y-2.5">
            {LEVELS.map((l, i) => {
              const on = level === i;
              return (
                <li key={i}>
                  <button onClick={() => setLevel(i)} aria-pressed={on}
                    className={`flex w-full items-start gap-3.5 rounded-[var(--r-lg)] border p-4 text-left transition ${on ? "border-accent/60 bg-accent-soft shadow-[var(--sh-1)]" : "border-line bg-surface shadow-[var(--sh-1)] hover:border-accent/40 hover:-translate-y-0.5"}`}>
                    <l.Icon size={18} className={`mt-0.5 shrink-0 ${on ? "text-accent" : "text-ink-3"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[0.94rem] text-ink">{l.title}</span>
                        {l.tag ? <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[0.7rem] text-ink-3">{l.tag}</span> : null}
                      </span>
                      <span className="mt-0.5 block text-[0.81rem] text-ink-3">{l.sub}</span>
                    </span>
                    <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${on ? "border-accent bg-accent text-accent-ink" : "border-line"}`}>
                      {on ? <Check size={12} /> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {failed ? <p className="text-[0.84rem] text-care">บันทึกไม่สำเร็จ ลองอีกครั้งนะ</p> : null}
        <Button size="lg" full disabled={level === null || saving} onClick={confirm}>{saving ? "กำลังบันทึก" : "ยืนยัน"}</Button>
      </main>
      <Hotline />
      <BottomNav />
      {sheet ? <BridgeSheet step={sheet} onStep={setSheet} domains={domains} /> : null}
    </Shell>
  );
}
