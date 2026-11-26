"use client";

import { useEffect, useRef, useState } from "react";
import { Shell, TopBar, Button, Card, Hotline, BottomNav } from "@/components/ui";
import { Check, Clock, Bridge, Info } from "@/components/icons";
import { BridgeSheet, type BridgeStep } from "@/components/bridge";
import { ACTIVITIES, BREATH, REVIEWED_BY } from "@/lib/selfcare";
import { trackOnce } from "@/lib/client";

/**
 * กิจกรรมดูแลตัวเอง — ขั้นแรกของ stepped care สำหรับคนที่ยังพอรับมือเองได้
 * ไม่มีช่องให้พิมพ์ ไม่มีอะไรถูกส่งออกจากเครื่อง (นับแค่ว่าหน้านี้ถูกเปิดกี่ครั้ง แบบไม่ระบุตัวตน)
 * ทุกกิจกรรมจบที่ทางไปหาคนจริง: ถ้าทำแล้วยังหนักอยู่ นั่นคือสัญญาณให้มีคนช่วย ไม่ใช่ให้พยายามคนเดียวต่อ
 */

const CYCLE = BREATH.inhale + BREATH.exhale;
const TOTAL = CYCLE * BREATH.rounds;

function Breathing() {
  const [t, setT] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => { if (timer.current) clearInterval(timer.current); timer.current = null; };
  useEffect(() => stop, []);

  function start() {
    stop();
    setT(0);
    timer.current = setInterval(() => {
      setT((v) => {
        const next = (v ?? 0) + 1;
        if (next >= TOTAL) stop();
        return next;
      });
    }, 1000);
  }

  const running = t !== null && t < TOTAL;
  const finished = t !== null && t >= TOTAL;
  const pos = running ? t % CYCLE : 0;
  const inhale = pos < BREATH.inhale;
  const left = inhale ? BREATH.inhale - pos : CYCLE - pos;
  const round = running ? Math.floor(t / CYCLE) + 1 : 0;

  return (
    <div className="mt-4 flex flex-col items-center">
      <div className="relative mb-4 grid size-44 place-items-center">
        <div aria-hidden="true" className="absolute inset-2 rounded-full bg-accent-soft"
          style={{
            transform: `scale(${running ? (inhale ? 1 : 0.62) : 0.8})`,
            transition: `transform ${running ? (inhale ? BREATH.inhale : BREATH.exhale) : 0.4}s ease-in-out`,
          }} />
        <p className="relative text-center" aria-live="polite">
          <span className="block text-[1.05rem] font-medium text-accent">
            {finished ? "ครบแล้ว" : running ? (inhale ? "หายใจเข้า" : "หายใจออก") : "พร้อมก็เริ่มได้"}
          </span>
          {running ? <span className="mt-0.5 block text-[0.82rem] tabular-nums text-ink-3">{left} · รอบ {round}/{BREATH.rounds}</span> : null}
        </p>
      </div>
      <div className="flex gap-2">
        {running ? (
          <Button size="sm" variant="line" onClick={() => { stop(); setT(null); }}>หยุด</Button>
        ) : (
          <Button size="sm" onClick={start}>{finished ? "ทำอีกรอบ" : "เริ่ม"}</Button>
        )}
      </div>
      {finished ? <p className="mt-3 text-[0.84rem] text-ink-2">รู้สึกยังไงบ้าง ถ้ายังหนักอยู่ ไม่ใช่เพราะเธอทำผิด ลองให้คนช่วยดู</p> : null}
    </div>
  );
}

function Checklist({ steps }: { steps: string[] }) {
  const [on, setOn] = useState<number[]>([]);
  return (
    <ul className="mt-3 space-y-1.5">
      {steps.map((s, i) => {
        const checked = on.includes(i);
        return (
          <li key={s}>
            <button type="button" aria-pressed={checked}
              onClick={() => setOn((v) => (checked ? v.filter((x) => x !== i) : [...v, i]))}
              className="flex w-full items-start gap-3 rounded-[var(--r-md)] px-2 py-2 text-left transition hover:bg-surface-2">
              <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition ${checked ? "border-accent bg-accent text-accent-ink" : "border-ink-3 bg-surface"}`}>
                {checked ? <Check size={13} /> : null}
              </span>
              <span className={`text-[0.9rem] leading-relaxed ${checked ? "text-ink-3" : "text-ink"}`}>{s}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function Care() {
  const [sheet, setSheet] = useState<BridgeStep | null>(null);
  useEffect(() => { trackOnce("care_open"); }, []);

  return (
    <Shell pad>
      <TopBar back="/journey" label="ดูแลตัวเอง" />
      <main className="rise space-y-4 pb-6">
        <div>
          <h1 className="text-[1.3rem] font-semibold text-ink">สิ่งเล็ก ๆ ที่ทำได้เดี๋ยวนี้</h1>
          <p className="mt-1.5 text-[0.88rem] leading-relaxed text-ink-2">
            เลือกทำแค่อย่างเดียวก็พอ สิ่งเหล่านี้ช่วยประคอง ไม่ได้มาแทนการมีคนช่วย
          </p>
        </div>

        {ACTIVITIES.map((a) => (
          <Card key={a.id} as="section" className="p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-[1rem] font-medium text-ink">{a.title}</h2>
              <span className="inline-flex shrink-0 items-center gap-1 text-[0.76rem] text-ink-3"><Clock size={12} /> {a.minutes} นาที</span>
            </div>
            <p className="mt-1.5 text-[0.87rem] leading-relaxed text-ink-2">{a.lead}</p>
            {a.id === "breathe" ? <Breathing /> : a.steps ? <Checklist steps={a.steps} /> : null}
          </Card>
        ))}

        <Card className="p-5">
          <p className="text-[0.95rem] font-medium text-ink">ทำแล้วยังหนักอยู่</p>
          <p className="mt-1 text-[0.86rem] leading-relaxed text-ink-2">
            นั่นไม่ใช่ความล้มเหลวของเธอ แปลว่าเรื่องนี้ใหญ่เกินกว่าจะรับคนเดียว และควรมีคนช่วย
          </p>
          <Button className="mt-4" onClick={() => setSheet("who")}><Bridge size={16} /> พาไปหาคน</Button>
        </Card>

        <p className="flex items-start gap-2 px-1 text-[0.76rem] leading-relaxed text-ink-3">
          <Info size={13} className="mt-0.5 shrink-0" />
          {REVIEWED_BY
            ? `เนื้อหาชุดนี้ตรวจโดย ${REVIEWED_BY} เป็นคำแนะนำทั่วไป ไม่ใช่การรักษา`
            : "เนื้อหาชุดนี้เป็นคำแนะนำทั่วไป อยู่ระหว่างให้ผู้เชี่ยวชาญตรวจ และไม่ใช่การรักษา"}
        </p>
      </main>
      <Hotline />
      <BottomNav />
      {sheet ? <BridgeSheet step={sheet} onStep={setSheet} /> : null}
    </Shell>
  );
}
