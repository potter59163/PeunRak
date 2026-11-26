"use client";

import { useCallback, useState } from "react";
import { Shell, TopBar, Button, Card, Hotline, BottomNav } from "@/components/ui";
import { Bridge, Bell, Check, Clock, Users, Calendar } from "@/components/icons";
import { BridgeSheet, type BridgeStep } from "@/components/bridge";
import { Timeline, LevelChip } from "@/components/handoff";
import { NextStep } from "@/components/care";
import { careStep } from "@/lib/care";
import { last } from "@/lib/session";
import { getHandoff, chooseLevel, chooseCompanion, answerCheckin, usePoll, useHasName, useHydrated } from "@/lib/client";
import {
  LEVELS, COMPANIONS, COMPANION_LABEL, MISS_REASONS, MISS_LABEL, TRACK_LABEL,
  reminderOf, thaiDate, type HandoffState, type Level,
} from "@/lib/handoff";

/**
 * เส้นทางไปหาคนจริงของนักเรียน — ครึ่งหลังของ "สะพาน"
 *
 * ส่งต่อแล้วไม่ได้แปลว่าไปถึง (ดูแหล่งอ้างอิงเรื่อง referral leakage ในแผน — ต้องเปิดฉบับเต็มก่อนอ้างตัวเลข)
 * หน้านี้จึงทำสามอย่างที่ช่วยให้ไปถึง: เลือกคนไปด้วย · เตือนก่อนนัด · ถามหลังนัดโดยไม่ตำหนิ
 * ทุกคำตอบเป็นตัวเลือก ไม่มีช่องให้พิมพ์
 */

const pill = (on: boolean) =>
  `min-h-[42px] rounded-full border px-4 text-[0.88rem] transition active:translate-y-px disabled:opacity-45 ${
    on ? "border-transparent btn-grad text-accent-ink" : "border-line bg-surface-2 text-ink-2 hover:border-accent/40 hover:bg-surface"}`;

export default function Journey() {
  const [h, setH] = useState<HandoffState | null>(null);
  const [sheet, setSheet] = useState<BridgeStep | null>(null);
  const [editLevel, setEditLevel] = useState(false);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const hasName = useHasName();

  /** เปิดชื่อได้ก็ต่อเมื่อกรอกชื่อไว้แล้ว ไม่งั้นพาไปกรอกที่โปรไฟล์ก่อน */
  const openName = hasName
    ? <Button size="sm" variant="soft" disabled={busy} onClick={() => act(chooseLevel(2))}>เปิดชื่อให้ครู</Button>
    : <Button size="sm" variant="soft" href="/profile">กรอกชื่อในโปรไฟล์ก่อนเปิดชื่อ</Button>;

  const load = useCallback(async () => {
    const s = await getHandoff();
    if (s) setH(s);
  }, []);
  usePoll(load, 5000);

  async function act(p: Promise<HandoffState | null>) {
    setBusy(true);
    const s = await p;
    if (s) setH(s);
    setBusy(false);
    return s;
  }

  // ขั้นการดูแลคิดจากผลรอบล่าสุดที่อยู่ในเครื่องนักเรียนเอง (หน้านี้ไม่ได้ขอคะแนนจาก server)
  const hydrated = useHydrated();
  const mine = hydrated ? last() : null;

  const reminder = h ? reminderOf(h) : null;
  const who = h?.refTrack ? TRACK_LABEL[h.refTrack] : "ครูแนะแนว";
  const referred = h && h.refStatus !== "none";

  return (
    <Shell pad>
      <TopBar label="ไปหาคน" />

      <main className="rise space-y-4 pb-6">
        <div>
          <h1 className="text-[1.3rem] font-semibold text-ink">เส้นทางไปหาคนที่ช่วยได้จริง</h1>
          <p className="mt-1.5 text-[0.88rem] leading-relaxed text-ink-2">
            AI เป็นแค่สะพาน หน้านี้บอกว่าเธอเดินมาถึงไหนแล้ว และทุกขั้นเธอเป็นคนเลือกเอง
          </p>
        </div>

        {/* ---- เตือนนัด: ก่อนนัด 1 วัน และวันนัด ---- */}
        {reminder === "tomorrow" || reminder === "today" ? (
          <Card className="flex items-start gap-3 border-accent/30 bg-accent-soft p-4">
            <Bell size={18} className="mt-0.5 shrink-0 text-accent" />
            <div>
              <p className="text-[0.95rem] font-medium text-ink">
                {reminder === "today" ? "วันนี้มีนัด" : "พรุ่งนี้มีนัด"}กับ{who}
              </p>
              <p className="mt-0.5 text-[0.84rem] leading-relaxed text-ink-2">
                {thaiDate(h?.apptAt)}
                {h?.companion && h.companion !== "none" ? ` · ชวน${COMPANION_LABEL[h.companion]}ไปด้วยแล้ว` : " · ยังเลือกคนไปด้วยได้ด้านล่าง"}
              </p>
            </div>
          </Card>
        ) : null}

        {/* ---- เช็กอินหลังนัด ---- */}
        {reminder === "checkin" ? (
          <Card className="border-accent/30 p-5">
            <p className="text-[1rem] font-medium text-ink">นัดเมื่อ {thaiDate(h?.apptAt)} ผ่านมาแล้ว ได้ไปไหม</p>
            <p className="mt-1 text-[0.84rem] text-ink-3">ตอบตามจริงได้เลย ไม่มีคำตอบที่ผิด และไม่มีใครตำหนิ</p>
            {asking ? (
              <div className="mt-4">
                <p className="text-[0.88rem] text-ink-2">ไม่เป็นไรเลย อะไรทำให้ไปไม่ได้</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {MISS_REASONS.map((r) => (
                    <button key={r} type="button" disabled={busy} className={pill(false)}
                      onClick={async () => { await act(answerCheckin(false, r)); setAsking(false); }}>
                      {MISS_LABEL[r]}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" disabled={busy} onClick={() => act(answerCheckin(true))}><Check size={15} /> ไปแล้ว</Button>
                <Button size="sm" variant="line" disabled={busy} onClick={() => setAsking(true)}>ยังไม่ได้ไป</Button>
              </div>
            )}
          </Card>
        ) : null}

        {/* ---- การส่งต่อ ---- */}
        {referred && h ? (
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[0.98rem] font-medium text-ink">{who}</h2>
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[0.74rem] font-medium text-accent">
                {h.refTrack === "school" ? "ในโรงเรียน" : "ส่งต่อภายนอก"}
              </span>
            </div>
            <div className="mt-4">
              <Timeline status={h.refStatus} track={h.refTrack} sentAt={h.refSentAt} apptAt={h.apptAt} arrivedAt={h.refArrivedAt} />
            </div>

            {h.refStatus === "sent" ? (
              <p className="mt-4 text-[0.88rem] leading-relaxed text-ink-2">
                {h.refTrack === "school"
                  ? "ครูแนะแนวอยากชวนเธอมาคุย และกำลังหาวันที่สะดวก"
                  : "ครูแนะแนวกำลังประสานผู้เชี่ยวชาญให้ เมื่อได้วันนัดจะขึ้นที่นี่"}
              </p>
            ) : null}

            {h.refStatus === "sent" && h.level < 2 ? (
              <div className="mt-3 rounded-[var(--r-md)] bg-surface-2 p-3.5">
                <p className="text-[0.84rem] leading-relaxed text-ink-2">
                  ตอนนี้ครูยังไม่รู้ว่าเป็นเธอ จะนัดหมายได้ ครูต้องรู้ชื่อก่อน หรือเดินไปห้องแนะแนวแล้วบอกรหัส{" "}
                  <span className="font-medium tabular-nums text-ink">{h.code}</span>
                </p>
                <div className="mt-2.5">{openName}</div>
              </div>
            ) : null}

            {h.refStatus === "scheduled" && h.checkin === "went" ? (
              <p className="mt-4 flex items-start gap-2.5 text-[0.88rem] leading-relaxed text-ink-2">
                <Check size={16} className="mt-0.5 shrink-0 text-calm" />
                ขอบคุณที่บอกนะ การไปถึงนัดแรกเป็นก้าวที่ยากที่สุดแล้ว
              </p>
            ) : null}
            {h.refStatus === "scheduled" && h.checkin === "missed" ? (
              <p className="mt-4 flex items-start gap-2.5 text-[0.88rem] leading-relaxed text-ink-2">
                <Clock size={16} className="mt-0.5 shrink-0 text-ink-3" />
                ขอบคุณที่บอกตรง ๆ นะ ครูแนะแนวจะช่วยหาทางและนัดให้ใหม่ ถ้าอยากคุยก่อน กดพาไปหาคนได้เลย
              </p>
            ) : null}
            {h.refStatus === "arrived" ? (
              <p className="mt-4 flex items-start gap-2.5 text-[0.88rem] leading-relaxed text-ink-2">
                <Check size={16} className="mt-0.5 shrink-0 text-calm" />
                ได้พบ{who}แล้ว ถ้าอยากคุยต่อหรือมีเรื่องใหม่ กลับมาที่นี่ได้เสมอ
              </p>
            ) : null}

            {/* ---- ผู้ร่วมทาง: เก็บแค่บทบาท ไม่เก็บชื่อ ---- */}
            {h.refStatus !== "arrived" ? (
              <div className="mt-5 border-t border-line-soft pt-4">
                <p className="flex items-center gap-2 text-[0.9rem] text-ink"><Users size={16} className="text-ink-3" /> อยากให้ใครไปด้วยไหม</p>
                <p className="mt-0.5 text-[0.78rem] text-ink-3">เราเก็บแค่ว่าเป็นใครสำหรับเธอ ไม่เก็บชื่อ</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {COMPANIONS.map((c) => (
                    <button key={c} type="button" disabled={busy} aria-pressed={h.companion === c}
                      className={pill(h.companion === c)} onClick={() => act(chooseCompanion(c))}>
                      {COMPANION_LABEL[c]}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </Card>
        ) : null}

        {mine && !referred ? <NextStep step={careStep(mine)} onBridge={setSheet} /> : null}

        {/* ---- คำขอถึงครูแนะแนว ---- */}
        <Card className="p-5">
          {h?.helpRequestedAt ? (
            <>
              <div className="flex items-start gap-3">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${h.helpAckAt ? "bg-calm-soft text-calm" : "bg-accent-soft text-accent"}`}>
                  {h.helpAckAt ? <Check size={18} /> : <Clock size={18} />}
                </span>
                <div>
                  <p className="text-[0.96rem] font-medium text-ink">
                    {h.helpAckAt ? "ครูแนะแนวรับเรื่องแล้ว" : "ส่งคำขอถึงครูแนะแนวแล้ว"}
                  </p>
                  <p className="mt-0.5 text-[0.84rem] leading-relaxed text-ink-2">
                    {h.level >= 2
                      ? h.helpAckAt ? "ครูจะติดต่อเธอเอง" : "ครูเห็นชื่อและห้องของเธอ รอครูรับเรื่อง"
                      : <>ครูยังไม่รู้ว่าเป็นเธอ เมื่อพร้อม เดินไปห้องแนะแนวแล้วบอกรหัส <span className="font-medium tabular-nums text-ink">{h.code}</span></>}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {h.level < 2 ? openName : null}
                <Button size="sm" variant="line" onClick={() => setSheet("who")}><Bridge size={15} /> หาคนอื่นเพิ่ม</Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[0.96rem] font-medium text-ink">ยังไม่ได้ขอให้ใครช่วย</p>
              <p className="mt-1 text-[0.84rem] leading-relaxed text-ink-2">
                ไม่ต้องรอให้หนักก่อน เลือกได้ว่าจะไปหาเพื่อน ครูแนะแนว หรือสายด่วน
              </p>
              <Button className="mt-4" onClick={() => setSheet("who")}><Bridge size={16} /> พาไปหาคน</Button>
            </>
          )}
        </Card>

        {/* ---- บันไดการเปิดเผย ---- */}
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[0.9rem] text-ink">ตอนนี้ครูเห็นอะไรบ้าง</p>
              <p className="mt-0.5 text-[0.8rem] leading-relaxed text-ink-3">{LEVELS[h?.level ?? 0].sub}</p>
            </div>
            <LevelChip level={h?.level ?? 0} />
          </div>
          {editLevel ? (
            <ul className="mt-4 space-y-2">
              {LEVELS.map((l, i) => {
                const on = (h?.level ?? 0) === i;
                return (
                  <li key={l.short}>
                    <button type="button" disabled={busy} aria-pressed={on}
                      onClick={async () => { await act(chooseLevel(i as Level)); setEditLevel(false); }}
                      className={`flex w-full items-start gap-3 rounded-[var(--r-md)] border p-3.5 text-left transition ${on ? "border-accent/60 bg-accent-soft" : "border-line bg-surface hover:border-accent/40"}`}>
                      <span className="mt-0.5 w-7 shrink-0 text-[0.78rem] font-medium tabular-nums text-ink-3">{l.short}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[0.9rem] text-ink">{l.title}</span>
                        <span className="mt-0.5 block text-[0.78rem] leading-relaxed text-ink-3">{l.sub}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Button size="sm" variant="ghost" className="-ml-3 mt-2" onClick={() => setEditLevel(true)}>เปลี่ยน</Button>
          )}
          <p className="mt-3 text-[0.78rem] leading-relaxed text-ink-3">
            ไม่ว่าเลือกระดับไหน ครูไม่เห็นข้อความในแชท ลดระดับเมื่อไหร่ ข้อมูลของระดับที่สูงกว่าถูกลบออกทันที
          </p>
        </Card>

        {reminder === "upcoming" ? (
          <p className="flex items-center gap-2 px-1 text-[0.8rem] text-ink-3">
            <Calendar size={14} /> นัดวันที่ {thaiDate(h?.apptAt)} เราจะเตือนอีกครั้งก่อนถึงวันนัด 1 วัน
          </p>
        ) : null}
      </main>

      <Hotline />
      <BottomNav />

      {sheet ? <BridgeSheet step={sheet} onStep={setSheet} onSent={setH} /> : null}
    </Shell>
  );
}
