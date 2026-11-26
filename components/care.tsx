"use client";

import { Button, Card, zoneClass } from "./ui";
import { Bridge, Phone, Sprout, ChevronRight } from "./icons";
import { CARE, type CareStep } from "@/lib/care";

/**
 * "ขั้นต่อไปที่เหมาะกับตอนนี้" — stepped care ฝั่งนักเรียน
 * บอกสิ่งที่ทำต่อได้ ไม่บอกชื่อโรค และทุกขั้นมีทางไปหาคนจริง
 */
export function NextStep({ step, onBridge }: { step: CareStep; onBridge: (to: "who" | "counselor" | "hotline") => void }) {
  const c = CARE[step];
  const tone = c.tone === "plain" ? null : zoneClass[c.tone];
  return (
    <Card as="section" className={`p-5 ${step === "crisis" ? "border-care/40 bg-care-soft" : ""}`}>
      <p className="flex items-center gap-2 text-[0.76rem] font-medium text-ink-3">
        <span className={`size-2 rounded-full ${tone ? tone.fg : "text-ink-3"}`} style={{ background: "currentColor" }} />
        ขั้นต่อไปที่เหมาะกับตอนนี้
      </p>
      <h2 className="mt-2 text-[1.08rem] font-medium text-ink">{c.title}</h2>
      <p className="mt-1.5 text-[0.88rem] leading-relaxed text-ink-2">{c.body}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {step === "crisis" ? (
          <>
            <a href="tel:1323" className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-care px-4 text-[0.92rem] font-semibold text-white transition hover:brightness-105">
              <Phone size={15} /> 1323
            </a>
            <a href="tel:1669" className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-care/40 bg-surface px-4 text-[0.92rem] font-semibold text-care transition hover:bg-care-soft">
              <Phone size={15} /> 1669
            </a>
            <Button variant="line" size="sm" className="!min-h-[42px]" onClick={() => onBridge("who")}><Bridge size={15} /> พาไปหาคน</Button>
          </>
        ) : step === "refer" || step === "checkin" ? (
          <>
            <Button size="sm" onClick={() => onBridge("counselor")}><Bridge size={15} /> {step === "refer" ? "ให้ครูช่วยประสาน" : "ขอให้ครูเช็กอิน"}</Button>
            <Button variant="ghost" size="sm" href="/care"><Sprout size={15} /> ดูแลตัวเองระหว่างรอ</Button>
          </>
        ) : (
          <>
            <Button size="sm" href="/care"><Sprout size={15} /> กิจกรรมดูแลตัวเอง <ChevronRight size={15} /></Button>
            <Button variant="ghost" size="sm" onClick={() => onBridge("who")}><Bridge size={15} /> พาไปหาคน</Button>
          </>
        )}
      </div>
    </Card>
  );
}
