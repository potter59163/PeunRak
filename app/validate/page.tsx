"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shell, TopBar, Button, Card, Hotline } from "@/components/ui";
import { Check, ChevronRight, EyeOff } from "@/components/icons";
import { TestForm, TestResult, scoreTest, type TestAnswers } from "@/components/test-form";
import { BridgeSheet, type BridgeStep } from "@/components/bridge";
import { byId } from "@/lib/tests";
import { useHydrated } from "@/lib/client";
import { last, resultSeen, validationState, setValidationState } from "@/lib/session";

/**
 * Validation mode — พิสูจน์ว่า AI สกัดคะแนนได้ตรงกับที่นักเรียนตอบเองแค่ไหน
 *
 * ทำเฉพาะคนที่ยินยอม และส่งออกจากเครื่องแค่ตัวเลข: คะแนนของ AI · คะแนนที่ตอบเอง ·
 * AI เก็บหลักฐานได้กี่ข้อ · ตอบก่อนเห็นผลของ AI หรือไม่ · ตัวที่สกัด (โมเดล/โหมดสาธิต)
 * ไม่มีรหัสนักเรียน ไม่มีคำตอบรายข้อ — คำตอบรายข้ออยู่ในหน้านี้แล้วหายไปเมื่อปิด
 */

const POINTS = [
  "ตอบแบบประเมิน 9Q ด้วยตัวเอง 9 ข้อ ใช้เวลาราว 3 นาที",
  "เราเก็บแค่คะแนนรวมสองค่ามาเทียบกัน คือคะแนนที่ระบบประเมินจากการคุย กับคะแนนที่เธอตอบเอง ไม่มีชื่อ ไม่มีรหัส ไม่มีคำตอบรายข้อ จึงโยงกลับมาหาเธอไม่ได้",
  "ครูไม่เห็นคำตอบชุดนี้ และจะไม่มีใครติดต่อเธอจากคำตอบชุดนี้ ถ้าอยากให้มีคนช่วย กดพาไปหาคนได้เสมอ",
  "ไม่ทำก็ได้ และเลิกกลางทางได้ ไม่มีผลกับการใช้งานส่วนอื่น",
];

export default function Validate() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [step, setStep] = useState<"consent" | "form" | "done">("consent");
  const [agree, setAgree] = useState(false);
  const [ans, setAns] = useState<TestAnswers | null>(null);
  const [saved, setSaved] = useState(true);
  const [sheet, setSheet] = useState<BridgeStep | null>(null);
  const test = byId("9q")!;

  const live = hydrated ? last() : null;
  const already = hydrated && validationState() === "done" && step !== "done";

  async function submit(a: TestAnswers) {
    if (!live) return;
    setAns(a);
    setStep("done");
    try {
      const res = await fetch("/api/validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consent: true,
          ai: live.q9,
          self: scoreTest(test, a).raw,
          answered: live.answered.q9,
          blind: !resultSeen(),
          source: live.source,
        }),
      });
      setSaved(res.ok);
    } catch {
      setSaved(false);
    }
    setValidationState("done");
  }

  return (
    <Shell>
      <TopBar back="/result" label="ช่วยตรวจความแม่น" />
      <main className="rise flex flex-1 flex-col pb-6">
        {!hydrated ? null : !live ? (
          <Card className="p-5">
            <p className="text-[1rem] font-medium text-ink">ต้องคุยกับ AI ก่อน</p>
            <p className="mt-1.5 text-[0.88rem] leading-relaxed text-ink-2">หน้านี้ใช้เทียบผลจากการคุยกับคำตอบของเธอเอง จึงต้องมีการคุยก่อน</p>
            <Button className="mt-4" href="/chat">ไปคุย <ChevronRight size={16} /></Button>
          </Card>
        ) : already ? (
          <Card className="p-5">
            <p className="text-[1rem] font-medium text-ink">ขอบคุณ รอบนี้เธอช่วยตรวจไปแล้ว</p>
            <Button className="mt-4" href="/result">ดูสรุปจากการคุย <ChevronRight size={16} /></Button>
          </Card>
        ) : step === "consent" ? (
          <Card className="p-5 sm:p-6">
            <div className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent"><EyeOff size={18} /></div>
            <h1 className="mt-4 text-[1.15rem] font-medium text-ink">ก่อนเริ่ม ขอบอกให้ครบ</h1>
            <ol className="mt-3 space-y-2.5">
              {POINTS.map((t, i) => (
                <li key={i} className="flex gap-2.5 text-[0.86rem] leading-relaxed text-ink-2">
                  <span className="mt-px shrink-0 tabular-nums text-ink-3">{i + 1}.</span>{t}
                </li>
              ))}
            </ol>
            <label className="mt-4 flex cursor-pointer items-start gap-2.5 border-t border-line pt-4">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="peer sr-only" />
              <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${agree ? "border-accent bg-accent text-accent-ink" : "border-ink-3 bg-surface"}`}>
                {agree ? <Check size={13} /> : null}
              </span>
              <span className="text-[0.86rem] leading-relaxed text-ink">ยินยอมให้เก็บคะแนนสองค่านี้แบบไม่ระบุตัวตน</span>
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button disabled={!agree} onClick={() => setStep("form")}>เริ่มทำ</Button>
              <Button variant="ghost" onClick={() => { setValidationState("skipped"); router.push("/result"); }}>ไม่ทำ</Button>
            </div>
          </Card>
        ) : step === "form" ? (
          <>
            <p className="pb-4 text-[0.86rem] leading-relaxed text-ink-3">ตอบตามที่เป็นจริงในช่วง 2 สัปดาห์ที่ผ่านมา ไม่มีคำตอบที่ถูกหรือผิด</p>
            <TestForm test={test} submitLabel="ส่งคำตอบ" onDone={submit} />
          </>
        ) : ans ? (
          <div className="space-y-4">
            <Card className="flex items-start gap-3 p-4">
              <Check size={18} className="mt-0.5 shrink-0 text-calm" />
              <p className="text-[0.88rem] leading-relaxed text-ink-2">
                {saved
                  ? "ขอบคุณที่ช่วยตรวจ เราเก็บแค่คะแนนรวมสองค่าไว้เทียบกัน คำตอบรายข้ออยู่บนหน้านี้เท่านั้น"
                  : "ขอบคุณที่ช่วยตรวจ แต่รอบนี้บันทึกไม่สำเร็จ ไม่มีอะไรถูกเก็บไว้ ผลด้านล่างยังดูได้ตามปกติ"}
              </p>
            </Card>
            <TestResult test={test} ans={ans} onBridge={() => setSheet("who")} />
            <Button href="/result" size="lg" full>ดูสรุปจากการคุย <ChevronRight size={16} /></Button>
          </div>
        ) : null}
      </main>
      <Hotline />
      {sheet ? <BridgeSheet step={sheet} onStep={setSheet} /> : null}
    </Shell>
  );
}
