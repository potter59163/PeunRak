"use client";

import { useState } from "react";
import { Button, Card, Choice, zoneClass } from "./ui";
import { Check } from "./icons";
import { SafetyCard } from "./bridge";
import type { Test } from "@/lib/tests";

/** แบบประเมินที่นักเรียนตอบเอง — ใช้ร่วมกันระหว่างหน้าแบบทดสอบ (/tests) และ validation mode (/validate) */

export type TestAnswers = Record<string, number>;

export function scoreTest(test: Test, ans: TestAnswers) {
  const items = test.instrument.items;
  const raw = items.reduce((s, i) => s + (test.weighted ? (ans[i.id] ? i.max : 0) : (ans[i.id] ?? 0)), 0);
  const band = test.instrument.bands.find((b) => raw >= b.min && raw <= b.max) ?? test.instrument.bands[0];
  /**
   * แบบทดสอบทำคนเดียวได้ตอนไหนก็ได้ จึงต้องมีทางไปหาคนเสมอเมื่อคำตอบน่าห่วง:
   * 8Q ถึงเกณฑ์ปานกลาง = ฉุกเฉิน · 8Q มีคะแนน หรือข้อ 9 ของ 9Q ไม่เป็นศูนย์ = ขึ้นการ์ดสายด่วน
   */
  const safety: "none" | "watch" | "crisis" =
    test.instrument.id === "8Q" ? (raw >= 9 ? "crisis" : raw > 0 ? "watch" : "none")
    : test.instrument.id === "9Q" && (ans["9Q_9"] ?? 0) > 0 ? "watch"
    : "none";
  return { raw, band, safety };
}

export function TestForm({ test, submitLabel = "ดูผล", onDone }: {
  test: Test; submitLabel?: string; onDone: (ans: TestAnswers) => void;
}) {
  const [ans, setAns] = useState<TestAnswers>({});
  const items = test.instrument.items;
  const filled = Object.keys(ans).length;
  return (
    <>
      <div className="flex items-center gap-3 pb-5">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-soft">
          <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${(filled / items.length) * 100}%` }} />
        </div>
        <span className="text-[0.78rem] tabular-nums text-ink-3">{filled}/{items.length}</span>
      </div>

      <div className="rise flex-1 space-y-3 pb-6">
        {items.map((it, n) => (
          <Card key={it.id} className="p-4">
            <p className="mb-3 text-[0.94rem] leading-relaxed text-ink">
              <span className="mr-2 text-ink-3">{n + 1}.</span>{it.text}
            </p>
            <Choice options={test.scale} value={ans[it.id] ?? null} onChange={(v) => setAns((s) => ({ ...s, [it.id]: v }))} />
          </Card>
        ))}
        <Button size="lg" full disabled={filled < items.length} onClick={() => onDone(ans)}>
          {filled < items.length ? `เหลืออีก ${items.length - filled} ข้อ` : <><Check size={17} /> {submitLabel}</>}
        </Button>
      </div>
    </>
  );
}

export function TestResult({ test, ans, onBridge }: { test: Test; ans: TestAnswers; onBridge: () => void }) {
  const { raw, band, safety } = scoreTest(test, ans);
  const c = zoneClass[band.zone];
  return (
    <div className="space-y-4">
      <Card className="p-6 text-center">
        <p className="text-[0.84rem] text-ink-3">{test.name}</p>
        <p className={`mt-3 text-[3rem] font-semibold leading-none tabular-nums ${c.fg}`}>{raw}</p>
        <p className="mt-3 text-[1rem] text-ink">{band.label}</p>
        <p className="mt-4 border-t border-line-soft pt-4 text-[0.8rem] leading-relaxed text-ink-3">
          เป็นการคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัย ผลนี้อยู่ในเครื่องของเธอเท่านั้น
        </p>
      </Card>
      {safety !== "none" ? <SafetyCard crisis={safety === "crisis"} onBridge={onBridge} /> : null}
      {safety === "none" && band.zone !== "calm" ? (
        <Card className="p-4">
          <p className="text-[0.9rem] leading-relaxed text-ink">ผลแบบนี้ไม่ควรต้องเก็บไว้คนเดียว มีคนที่ช่วยดูเรื่องนี้ด้วยกันได้</p>
          <Button variant="soft" size="sm" className="mt-3" onClick={onBridge}>พาไปหาคน</Button>
        </Card>
      ) : null}
    </div>
  );
}
