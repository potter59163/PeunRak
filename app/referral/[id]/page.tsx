"use client";

import { use, useCallback, useState } from "react";
import { Shell, TopBar, Card, Hotline, RiskBadge, Button } from "@/components/ui";
import { Hospital, Clock, Pin, Info, Users, Doc, Phone, EyeOff } from "@/components/icons";
import { Timeline, DomainTags, LevelChip } from "@/components/handoff";
import { INSTRUMENTS, INSTRUMENT_VERSION } from "@/lib/instruments";
import { FACILITIES } from "@/lib/demo";
import { REF_LABEL, TRACK_LABEL, COMPANION_LABEL, MISS_LABEL, thaiDate } from "@/lib/handoff";
import { CARE, careStep } from "@/lib/care";
import type { Snap } from "@/lib/store";
import { useMe, usePoll } from "@/lib/client";

/**
 * เอกสารส่งต่อของเคสเดียว — ทุกบรรทัดมาจากข้อมูลที่ระบบเก็บจริง
 *
 * ไม่มีคำพูดของนักเรียนในเอกสารนี้ และไม่มีทางมีได้ เพราะระบบไม่ได้เก็บ
 * ผู้เชี่ยวชาญได้: คะแนนตามเกณฑ์ · คะแนนรายข้อ (เมื่อนักเรียนยินยอม L3) · แนวโน้ม · หมวดเรื่อง · เส้นทางส่งต่อ
 * ส่วนที่ระบบไม่รู้ (เช่น การประสานกับผู้ปกครอง) เขียนไว้ตรง ๆ ว่าไม่ได้บันทึก ไม่แต่งขึ้นมาเติม
 */

const full = (t?: number) =>
  t ? new Date(t).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }) : "—";

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-[0.78rem] uppercase tracking-[0.14em] text-ink-3">{children}</h2>
);

export default function ReferralDoc({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const me = useMe();
  const [c, setC] = useState<Snap | null>(null);
  const [seeded, setSeeded] = useState(false);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/referral?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      if (res.status === 404) { setMissing(true); return; }
      const d = await res.json();
      setC(d.case); setSeeded(Boolean(d.seeded));
    } catch { /* รอบถัดไปลองใหม่ */ }
  }, [id]);
  usePoll(load, 8000);

  const back = me?.role === "specialist" ? "/specialist" : "/counselor";

  if (missing)
    return (
      <Shell>
        <TopBar back={back} label="เอกสารส่งต่อ" />
        <main className="rise flex flex-1 flex-col justify-center py-10">
          <Card className="p-6 text-center">
            <Doc size={24} className="mx-auto text-ink-3" />
            <p className="mt-3 text-[0.95rem] text-ink">ไม่พบเคสนี้</p>
            <Button className="mt-4" href="/referral" variant="line">ดูเอกสารทั้งหมด</Button>
          </Card>
        </main>
        <Hotline />
      </Shell>
    );

  if (!c)
    return (
      <Shell>
        <TopBar back={back} label="เอกสารส่งต่อ" />
        <main className="flex-1" />
        <Hotline />
      </Shell>
    );

  const scores = [
    { ins: INSTRUMENTS[0], raw: c.q9, band: c.q9Band },
    { ins: INSTRUMENTS[1], raw: c.gad7, band: c.gad7Band },
    { ins: INSTRUMENTS[2], raw: c.q8, band: c.q8Band },
  ];
  const hits = new Map(c.items.map((e) => [e.id, e]));
  const maxHistory = Math.max(27, ...c.history);
  const facts: [string, string][] = [
    ["ขั้นการดูแลตามเกณฑ์", CARE[careStep(c)].tag],
    ["เส้นทาง", c.refTrack ? TRACK_LABEL[c.refTrack] : "ยังไม่ได้ส่งต่อ"],
    ["สถานะ", REF_LABEL[c.refStatus]],
    ["วันนัด", c.apptAt ? full(c.apptAt) : "ยังไม่มี"],
    ["ผู้ร่วมทางที่นักเรียนเลือก", c.companion ? COMPANION_LABEL[c.companion] : "ยังไม่ได้เลือก"],
    ["นักเรียนแจ้งหลังนัด", c.checkin === "went" ? "ไปแล้ว" : c.checkin === "missed" ? "ยังไม่ได้ไป" : "ยังไม่ได้ตอบ"],
    ...(c.missReason ? ([["เหตุผลที่เคยไม่ได้ไป (เลือกตอบ)", MISS_LABEL[c.missReason]]] as [string, string][]) : []),
    ...(c.helpRequestedAt ? ([["นักเรียนขอให้ครูติดต่อเอง", `${thaiDate(c.helpRequestedAt)}${c.helpAckAt ? ` · ครูรับเรื่อง ${thaiDate(c.helpAckAt)}` : " · ยังไม่มีครูรับเรื่อง"}`]] as [string, string][]) : []),
  ];

  return (
    <Shell>
      <TopBar back={back} label="เอกสารส่งต่อ" />

      <main className="rise pb-6">
        {seeded ? (
          <p className="no-print mb-3 rounded-[var(--r-sm)] bg-watch-soft px-3.5 py-2.5 text-[0.8rem] leading-relaxed text-watch">
            เคสนี้เป็นเคสจำลองสำหรับสาธิต ไม่ใช่นักเรียนจริง
          </p>
        ) : null}

        <Card className="overflow-hidden">
          {/* หัวเอกสาร */}
          <div className="border-b border-line bg-surface-2 px-6 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[0.76rem] uppercase tracking-[0.16em] text-ink-3">
                  สรุปข้อมูลเพื่อประกอบการพิจารณาของผู้เชี่ยวชาญ
                </p>
                <h1 className="mt-2.5 text-[1.5rem] leading-tight text-ink">
                  {c.name ? c.name : `นักเรียนรหัส ${c.code}`}
                </h1>
                <p className="mt-1.5 text-[0.84rem] text-ink-2">
                  {c.name ? `${c.room ?? "ไม่ระบุห้อง"} · รหัส ${c.code} · ` : ""}
                  {c.refSentAt ? `ส่งต่อโดยครูแนะแนว ${full(c.refSentAt)}` : "ฉบับร่าง ยังไม่ได้ส่งต่อ"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {c.provisional ? (
                  <span className="rounded-full bg-surface px-2.5 py-1 text-[0.76rem] font-medium text-ink-2">ข้อมูลยังไม่พอ</span>
                ) : (
                  <RiskBadge risk={c.risk} />
                )}
                {c.crisis ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-care px-2.5 py-1 text-[0.72rem] font-medium text-white">
                    <Phone size={11} /> ฉุกเฉิน (8Q)
                  </span>
                ) : null}
              </div>
            </div>
            <p className="mt-4 border-t border-line pt-4 text-[0.82rem] leading-relaxed text-ink-2">
              คัดกรองเบื้องต้น ไม่ใช่การวินิจฉัย และไม่ได้เสนอลำดับความเร่งด่วน การวินิจฉัยเป็นดุลยพินิจของผู้เชี่ยวชาญทั้งหมด
            </p>
          </div>

          {/* คะแนน */}
          <section className="px-6 py-6">
            <H2>คะแนนจากเครื่องมือมาตรฐาน</H2>
            <ul className="mt-4 space-y-3">
              {scores.map((s) => (
                <li key={s.ins.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line-soft pb-3 last:border-0">
                  <span className="w-[4.6rem] shrink-0 text-[0.9rem] text-ink">{s.ins.id}</span>
                  <span className="text-[1.3rem] tabular-nums text-ink">{s.raw}</span>
                  <span className="text-[0.88rem] text-ink-2">{s.band}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[0.76rem] leading-relaxed text-ink-3">
              สกัดจากการสนทนา {c.turns} รอบ เก็บหลักฐานได้ {c.covered} จาก {c.total} ข้อ · เกณฑ์เวอร์ชัน {INSTRUMENT_VERSION} ·
              คะแนนคำนวณจากโค้ด ไม่ใช่จากโมเดลภาษา · ข้อที่ไม่มีหลักฐานนับเป็น 0 คะแนนรวมจึงอาจต่ำกว่าความเป็นจริง
            </p>
          </section>

          {/* คะแนนรายข้อ */}
          <section className="border-t border-line-soft px-6 py-6">
            <H2>คะแนนรายข้อที่มีหลักฐาน</H2>
            {c.level < 3 ? (
              <p className="mt-4 flex items-start gap-2.5 text-[0.86rem] leading-relaxed text-ink-2">
                <EyeOff size={15} className="mt-1 shrink-0 text-ink-3" />
                นักเรียนยังไม่ได้ยินยอมให้ส่งคะแนนรายข้อ (ต้องเลือกระดับ L3 ด้วยตัวเอง) เอกสารนี้จึงมีเฉพาะคะแนนรวม
              </p>
            ) : c.items.length === 0 ? (
              <p className="mt-4 text-[0.86rem] leading-relaxed text-ink-2">
                ยินยอมแล้ว แต่ยังไม่มีคะแนนรายข้อในระบบ จะขึ้นเมื่อนักเรียนคุยครั้งถัดไป
              </p>
            ) : (
              <div className="mt-4 space-y-5">
                {INSTRUMENTS.map((ins) => {
                  const rows = ins.items.filter((i) => hits.has(i.id));
                  if (rows.length === 0) return null;
                  return (
                    <div key={ins.id}>
                      <p className="text-[0.84rem] font-medium text-ink">{ins.id} <span className="font-normal text-ink-3">· {rows.length}/{ins.items.length} ข้อ</span></p>
                      <ul className="mt-2 divide-y divide-line-soft">
                        {rows.map((i) => {
                          const e = hits.get(i.id)!;
                          return (
                            <li key={i.id} className="flex items-start gap-3 py-2">
                              <span className="min-w-0 flex-1 text-[0.86rem] leading-relaxed text-ink-2">{i.text}</span>
                              <span className="shrink-0 text-right text-[0.84rem] tabular-nums text-ink">
                                {e.score}/{i.max}
                                <span className="block text-[0.68rem] text-ink-3">มั่นใจ {Math.round(e.confidence * 100)}%</span>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-4 text-[0.76rem] leading-relaxed text-ink-3">
              ข้อความในตารางคือข้อของแบบประเมิน ระบบไม่เก็บคำพูดของนักเรียน เอกสารนี้จึงไม่มีข้อความจากการสนทนา
            </p>
          </section>

          {/* แนวโน้ม + หมวดเรื่อง */}
          <section className="grid gap-6 border-t border-line-soft px-6 py-6 sm:grid-cols-2">
            <div>
              <H2>คะแนน 9Q จากการประเมินล่าสุด</H2>
              {c.history.length === 0 ? (
                <p className="mt-4 text-[0.84rem] text-ink-3">ยังไม่มีประวัติ</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {c.history.map((v, i) => (
                    <li key={i} className="flex items-center gap-3 text-[0.82rem]">
                      <span className="w-[4.4rem] shrink-0 text-ink-3">{i === c.history.length - 1 ? "ล่าสุด" : `ครั้งที่ ${i + 1}`}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-soft">
                        <div className="h-full rounded-full bg-accent/55" style={{ width: `${(v / maxHistory) * 100}%` }} />
                      </div>
                      <span className="w-[2rem] shrink-0 text-right tabular-nums text-ink-2">{v}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[0.74rem] leading-relaxed text-ink-3">
                ไม่เกิน 8 ครั้งล่าสุด ระบบประเมินใหม่ทุกครั้งที่นักเรียนส่งข้อความ ค่าที่ไล่ขึ้นภายในการคุยครั้งเดียวจึงเป็นการสะสมหลักฐาน ไม่ใช่อาการที่แย่ลงรายวัน
              </p>
            </div>
            <div>
              <H2>หมวดเรื่องที่เกี่ยวข้อง</H2>
              <div className="mt-4">
                {c.domains.length > 0 ? (
                  <DomainTags domains={c.domains} />
                ) : (
                  <p className="text-[0.84rem] leading-relaxed text-ink-3">
                    {c.level < 1 ? "นักเรียนไม่ได้เปิดเผยหมวดเรื่อง" : "ไม่พบหมวดที่มีหลักฐานชัดพอ"}
                  </p>
                )}
              </div>
              <p className="mt-3 text-[0.74rem] leading-relaxed text-ink-3">หมวดเรื่องใช้ชี้ทางว่าควรพาไปหาใคร ไม่ใช่การวินิจฉัย</p>
              <div className="mt-4"><LevelChip level={c.level} /></div>
            </div>
          </section>

          {/* เส้นทางส่งต่อ */}
          <section className="border-t border-line-soft px-6 py-6">
            <H2>เส้นทางการส่งต่อ</H2>
            {c.refStatus !== "none" ? (
              <div className="mt-4">
                <Timeline status={c.refStatus} track={c.refTrack} sentAt={c.refSentAt} apptAt={c.apptAt} arrivedAt={c.refArrivedAt} />
              </div>
            ) : null}
            <dl className="mt-4 divide-y divide-line-soft">
              {facts.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 py-2 text-[0.85rem]">
                  <dt className="text-ink-2">{k}</dt>
                  <dd className="text-right text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* ผู้ปกครอง */}
          <section className="border-t border-line-soft bg-surface-2 px-6 py-6">
            <div className="flex gap-3.5">
              <Users size={19} className="mt-0.5 shrink-0 text-ink-2" />
              <div>
                <h2 className="text-[0.92rem] text-ink">การมีส่วนร่วมของผู้ปกครอง</h2>
                <p className="mt-1.5 text-[0.85rem] leading-relaxed text-ink-2">
                  นักเรียนอายุต่ำกว่า 18 ปี การรักษาต้องมีผู้ปกครองร่วมตามเงื่อนไขของสถานพยาบาล
                  ระบบนี้ไม่ได้บันทึกสถานะการประสานกับผู้ปกครอง ให้ครูแนะแนวแจ้งโดยตรง
                </p>
              </div>
            </div>
          </section>
        </Card>

        {/* Referral Navigator */}
        <section className="no-print pt-9">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[1.3rem] text-ink">เส้นทางที่เป็นไปได้จริงในพื้นที่</h2>
            <span className="text-[0.78rem] text-ink-3">เรียงตามความง่าย</span>
          </div>

          <ul className="mt-5 space-y-3">
            {FACILITIES.map((f) => (
              <Card as="li" key={f.name} className="p-5">
                <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                  <Hospital size={19} className="mt-0.5 shrink-0 text-ink-3" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[0.96rem] text-ink">{f.name}</p>
                      {f.adolescentClinic ? (
                        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[0.72rem] text-accent">คลินิกวัยรุ่น</span>
                      ) : null}
                      {f.walkIn ? (
                        <span className="rounded-full bg-calm-soft px-2.5 py-0.5 text-[0.72rem] text-calm">walk-in ได้</span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-[0.85rem] leading-[1.75] text-ink-2">{f.minorPolicy}</p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[0.79rem] text-ink-3">
                      <span className="inline-flex items-center gap-1.5"><Pin size={13} />{f.district}</span>
                      <span className="inline-flex items-center gap-1.5"><Clock size={13} />{f.hours}</span>
                      <span>{f.wait}</span>
                      <span>{f.cost}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </ul>

          <Card className="mt-4 bg-surface-2 p-5">
            <div className="flex gap-3.5">
              <Info size={18} className="mt-0.5 shrink-0 text-ink-2" />
              <p className="text-[0.83rem] leading-relaxed text-ink-2">รายการสถานพยาบาลเป็นข้อมูลตัวอย่าง ต้องโทรยืนยันก่อนใช้จริง</p>
            </div>
          </Card>
        </section>

        <div className="no-print flex flex-wrap gap-3 pt-8">
          <Button variant="line" onClick={() => window.print()}><Doc size={16} /> พิมพ์ / บันทึกเป็น PDF</Button>
        </div>
      </main>

      <Hotline />
    </Shell>
  );
}
