"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell, TopBar, Button, Card, zoneClass, Hotline, BottomNav } from "@/components/ui";
import { Quote, Check, EyeOff, Users, Eye, Hospital, ChevronRight, Clipboard, Info } from "@/components/icons";
import { BridgeSheet, HelpCards, SafetyCard, type BridgeStep } from "@/components/bridge";
import { NextStep } from "@/components/care";
import { Q9, GAD7, Q8, INSTRUMENTS, scoreOf, combine, isCrisis, ZONE_COPY, type Zone } from "@/lib/instruments";
import { DEMO_EXTRACTIONS, DEMO_DOMAINS } from "@/lib/demo";
import { LEVELS as LADDER, type Level } from "@/lib/handoff";
import { careStep } from "@/lib/care";
import { MIN_ANSWERED } from "@/lib/agreement";
import { chooseLevel, useHydrated } from "@/lib/client";
import { last, myLevel, validationState, setValidationState, markResultSeen, type Last } from "@/lib/session";

/**
 * สรุปจากการคุย — ทุกตัวเลขในหน้านี้มาจากผลของ AI ตัวที่สองรอบล่าสุด (คะแนนคำนวณด้วยโค้ด)
 * ไม่มีคำพูดของนักเรียนแสดงที่นี่ เพราะระบบไม่ได้เก็บไว้: บอกได้แค่ว่า "ข้อไหนมีหลักฐาน"
 */

const RISK_ZONE = { low: "calm", medium: "watch", high: "care" } as const;
const ZONE_RISK = { calm: "low", watch: "medium", care: "high" } as const;

/** ข้อความของแต่ละขั้นมาจาก lib/handoff.ts ที่เดียว — หน้านี้ หน้าไปหาคน และแดชบอร์ดครูใช้ชุดเดียวกัน */
const ICONS = [EyeOff, Users, Eye, Hospital];
const LEVELS = LADDER.map((l, i) => ({ ...l, Icon: ICONS[i], tag: i === 1 ? "แนะนำ" : undefined }));

const ITEM = new Map(INSTRUMENTS.flatMap((ins) => ins.items.map((i) => [i.id, { ...i, instrument: ins.id }] as const)));

/** หน้าตัวอย่าง: บทสนทนาตัวอย่างใน lib/demo.ts ผ่านตัวคำนวณตัวเดียวกับของจริง */
const SAMPLE: Last = (() => {
  const s9 = scoreOf(Q9, DEMO_EXTRACTIONS), sG = scoreOf(GAD7, DEMO_EXTRACTIONS), s8 = scoreOf(Q8, DEMO_EXTRACTIONS);
  const zone: Zone = combine([s9.zone, sG.zone, s8.zone], s8.raw);
  return {
    risk: ZONE_RISK[zone], q9: s9.raw, gad7: sG.raw, q8: s8.raw,
    crisis: isCrisis(s8.raw), safety: isCrisis(s8.raw) ? "crisis" : s8.raw > 0 ? "watch" : "none",
    covered: s9.answered + sG.answered + s8.answered,
    total: INSTRUMENTS.reduce((n, i) => n + i.items.length, 0),
    answered: { q9: s9.answered, gad7: sG.answered, q8: s8.answered },
    provisional: false,
    domains: DEMO_DOMAINS,
    items: [...s9.evidence, ...sG.evidence, ...s8.evidence].map((e) => ({ id: e.itemId, score: e.score, confidence: e.confidence })),
    source: "demo",
  };
})();

export default function Result() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [picked, setPicked] = useState<number | null>(null);
  const [why, setWhy] = useState(false);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sheet, setSheet] = useState<BridgeStep | null>(null);
  const [showSample, setShowSample] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const live = hydrated ? last() : null;
  const data = live ?? (showSample ? SAMPLE : null);
  const level = picked ?? (hydrated ? myLevel() : null);

  /**
   * Validation แบบปิดตา: ถามก่อนเผยคะแนน เพราะเห็นคะแนนของระบบแล้วคำตอบจะเอนตาม
   * ไม่ถามเมื่อมีสัญญาณความปลอดภัย (การดูแลมาก่อนการเก็บข้อมูล) หรือเมื่อ AI ยังเก็บหลักฐาน 9Q ได้น้อย
   */
  const asked = hydrated ? validationState() : null;
  const canValidate = Boolean(live && live.safety === "none" && live.answered.q9 >= MIN_ANSWERED);
  const gated = canValidate && asked === null && !revealed;

  useEffect(() => { if (live && !gated) markResultSeen(); }, [live, gated]);

  /** บันทึกระดับที่เลือกจริง */
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
            <Button href="/chat" variant="line" size="lg" full>กลับไปคุยต่อ</Button>
          </div>
        </main>
        <Hotline />
        <BottomNav />
      </Shell>
    );

  if (!data)
    return (
      <Shell pad>
        <TopBar back="/chat" label="สรุป" />
        <main className="rise flex flex-1 flex-col justify-center py-10">
          <div className="grid size-11 place-items-center rounded-full bg-surface-2 text-ink-3"><Clipboard size={20} /></div>
          <h1 className="mt-5 text-[1.4rem] font-semibold text-ink">ยังไม่มีสรุป</h1>
          <p className="mt-2 text-[0.93rem] leading-relaxed text-ink-2">
            คุยกับ AI สักหน่อย แล้วสรุปจากการคุยของเธอจะขึ้นที่นี่ หรือจะทำแบบทดสอบเองก็ได้
          </p>
          <div className="mt-6 space-y-2.5">
            <Button href="/chat" size="lg" full>ไปคุย <ChevronRight size={16} /></Button>
            <Button href="/tests" variant="line" size="lg" full>ทำแบบทดสอบเอง</Button>
            {hydrated ? <Button variant="ghost" size="sm" full onClick={() => setShowSample(true)}>ดูตัวอย่างหน้าสรุป</Button> : null}
          </div>
        </main>
        <Hotline />
        <BottomNav />
      </Shell>
    );

  const zone: Zone = RISK_ZONE[data.risk];
  const c = zoneClass[zone];
  const step = careStep(data);
  const scores = [
    { ins: Q9, raw: data.q9, got: data.answered.q9 },
    { ins: GAD7, raw: data.gad7, got: data.answered.gad7 },
    { ins: Q8, raw: data.q8, got: data.answered.q8 },
  ];
  const items = [...data.items].sort((a, b) => [...ITEM.keys()].indexOf(a.id) - [...ITEM.keys()].indexOf(b.id));

  return (
    <Shell pad>
      <TopBar back="/chat" label="สรุป" />
      <main className="rise space-y-5 pb-6">
        {!live ? (
          <Card className="flex items-start gap-3 border-watch/30 bg-watch-soft p-4">
            <Info size={17} className="mt-0.5 shrink-0 text-watch" />
            <p className="flex-1 text-[0.86rem] leading-relaxed text-ink">
              นี่คือตัวอย่างหน้าสรุปจากบทสนทนาสมมติ ไม่ใช่ผลของเธอ
              <button type="button" onClick={() => setShowSample(false)} className="ml-2 font-medium text-watch underline underline-offset-2">ปิดตัวอย่าง</button>
            </p>
          </Card>
        ) : null}

        {data.safety !== "none" ? <SafetyCard crisis={data.safety === "crisis"} onBridge={() => setSheet("who")} /> : null}

        {gated ? (
          <Card className="p-5">
            <p className="text-[0.76rem] font-medium text-ink-3">ก่อนดูสรุป · ไม่บังคับ</p>
            <h1 className="mt-2 text-[1.15rem] font-medium text-ink">ช่วยตรวจว่าระบบประเมินแม่นแค่ไหนได้ไหม</h1>
            <p className="mt-2 text-[0.88rem] leading-relaxed text-ink-2">
              ตอบแบบประเมิน 9 ข้อด้วยตัวเอง ราว 3 นาที เราเก็บแค่คะแนนสองค่ามาเทียบกันแบบไม่ระบุตัวตน
              ที่ขอให้ทำก่อนดูสรุป เพราะถ้าเห็นผลของระบบก่อน คำตอบมักเอนตาม
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => router.push("/validate")}>ช่วยตรวจ 3 นาที</Button>
              <Button size="sm" variant="line" onClick={() => { setValidationState("skipped"); setRevealed(true); }}>ข้ามไปดูสรุป</Button>
            </div>
          </Card>
        ) : (
          <>
            <Card className="p-5">
              {data.provisional ? (
                <>
                  <div className="flex items-center gap-2.5">
                    <span className="size-2.5 rounded-full bg-ink-3" />
                    <h1 className="text-[1.4rem] font-semibold text-ink">ยังสรุปไม่ได้</h1>
                  </div>
                  <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-2">
                    คะแนนยังต่ำเพราะเราคุยกันน้อย ไม่ได้แปลว่าไม่มีอะไร คุยต่ออีกนิดจะเห็นภาพชัดขึ้น
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2.5">
                    <span className={`size-2.5 rounded-full ${c.fg}`} style={{ background: "currentColor" }} />
                    <h1 className="text-[1.4rem] font-semibold text-ink">{ZONE_COPY[zone].label}</h1>
                  </div>
                  <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-2">{ZONE_COPY[zone].lead}</p>
                </>
              )}
              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line-soft pt-4">
                {scores.map((s) => (
                  <div key={s.ins.id}>
                    <p className="text-[0.75rem] text-ink-3">{s.ins.id}</p>
                    <p className="mt-0.5 text-[1.3rem] font-semibold tabular-nums text-ink">{s.raw}</p>
                    <p className="text-[0.7rem] text-ink-3">หลักฐาน {s.got}/{s.ins.items.length} ข้อ</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[0.78rem] leading-relaxed text-ink-3">
                คัดกรองเบื้องต้น ไม่ใช่การวินิจฉัย · คะแนนคำนวณตามเกณฑ์ของแบบประเมิน ไม่ใช่ตัวเลขที่ AI คิดเอง
              </p>
            </Card>

            <NextStep step={step} onBridge={setSheet} />

            {data.domains.length > 0 ? (
              <div>
                <p className="mb-2.5 text-[0.84rem] font-medium text-ink-2">มีคนที่ช่วยเรื่องนี้ได้</p>
                <HelpCards domains={data.domains} onBridge={() => setSheet("counselor")} />
              </div>
            ) : null}

            <Card>
              <button onClick={() => setWhy((v) => !v)} aria-expanded={why} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-surface-2">
                <Quote size={16} className="shrink-0 text-ink-3" />
                <span className="flex-1 text-[0.9rem] text-ink">คะแนนมาจากไหน</span>
                <span className="text-[0.8rem] text-ink-3">{why ? "ซ่อน" : `${items.length} ข้อ`}</span>
              </button>
              {why ? (
                <div className="rise border-t border-line-soft p-4">
                  {items.length === 0 ? (
                    <p className="text-[0.86rem] text-ink-3">ยังไม่มีข้อไหนที่มีหลักฐานชัดพอจะนับคะแนน</p>
                  ) : (
                    <ul className="space-y-3">
                      {items.map((e) => {
                        const it = ITEM.get(e.id);
                        if (!it) return null;
                        return (
                          <li key={e.id} className="flex items-start gap-3">
                            <span className="mt-0.5 w-[3.2rem] shrink-0 text-[0.72rem] tabular-nums text-ink-3">{it.instrument}</span>
                            <span className="min-w-0 flex-1 text-[0.87rem] leading-relaxed text-ink">{it.text}</span>
                            <span className="shrink-0 text-right text-[0.8rem] tabular-nums text-ink-2">
                              {e.score}/{it.max}
                              <span className="block text-[0.68rem] text-ink-3">มั่นใจ {Math.round(e.confidence * 100)}%</span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <p className="mt-4 border-t border-line-soft pt-3 text-[0.76rem] leading-relaxed text-ink-3">
                    ข้อความด้านบนคือข้อของแบบประเมิน ไม่ใช่คำพูดของเธอ ระบบไม่ได้เก็บสิ่งที่เธอพิมพ์ จึงบอกได้แค่ว่าข้อไหนมีหลักฐาน
                    ข้อที่ไม่มั่นใจพอจะไม่ถูกนับคะแนน
                  </p>
                </div>
              ) : null}
            </Card>

            {live ? (
              <>
                <div>
                  <p className="mb-1 text-[1.05rem] font-medium text-ink">ให้ใครรู้บ้าง</p>
                  <p className="mb-3 text-[0.83rem] text-ink-3">เปลี่ยนใจตอนไหนก็ได้</p>
                  <ul className="space-y-2.5">
                    {LEVELS.map((l, i) => {
                      const on = level === i;
                      return (
                        <li key={i}>
                          <button onClick={() => setPicked(i)} aria-pressed={on}
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

                {canValidate && asked !== "done" ? (
                  <Card className="flex items-center gap-3 p-4">
                    <Clipboard size={17} className="shrink-0 text-ink-3" />
                    <p className="flex-1 text-[0.84rem] leading-relaxed text-ink-2">ช่วยตรวจความแม่นของระบบด้วยการตอบ 9 ข้อเอง แบบไม่ระบุตัวตน</p>
                    <Button size="sm" variant="soft" href="/validate" className="shrink-0">ช่วยตรวจ</Button>
                  </Card>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </main>
      <Hotline />
      <BottomNav />
      {sheet ? <BridgeSheet step={sheet} onStep={setSheet} domains={data.domains} /> : null}
    </Shell>
  );
}
