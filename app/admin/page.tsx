"use client";

import { useCallback, useState } from "react";
import { Shell, TopBar, Card, Hotline } from "@/components/ui";
import { Lock, Info } from "@/components/icons";
import { usePoll } from "@/lib/client";
import { domainTag } from "@/lib/resources";
import { CARE } from "@/lib/care";
import { MISS_LABEL, REF_LABEL } from "@/lib/handoff";
import { Q9_BANDS, MIN_PAIRS, MIN_ANSWERED, SCREEN_CUTOFF, type Agreement } from "@/lib/agreement";
import type { Kpi, RedteamSummary } from "@/lib/kpi";

/**
 * ตัวชี้วัดของโครงการ — 7 ข้อ คำนวณจากข้อมูลที่ระบบเก็บจริง
 *
 * ทุกค่าเป็นค่ารวม ไม่มีข้อมูลรายคน ค่าเริ่มต้นไม่นับเคสจำลอง
 * ตัวเลขที่ยังไม่มีข้อมูลแสดงเป็น "—" พร้อมบอกว่าต้องทำอะไรถึงจะมี ไม่เติมตัวเลขสมมติ
 */

const dash = (v: number | null | undefined, unit = "") => (v === null || v === undefined ? "—" : `${v}${unit}`);

function Block({ n, title, how, children }: { n: number; title: string; how: string; children: React.ReactNode }) {
  return (
    <Card as="section" className="p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-[0.8rem] font-semibold tabular-nums text-accent">{n}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[1rem] font-medium text-ink">{title}</h2>
          <p className="mt-0.5 text-[0.78rem] leading-relaxed text-ink-3">{how}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function Stat({ label, value, note, muted = false }: { label: string; value: string; note?: string; muted?: boolean }) {
  return (
    <div>
      <dt className="text-[0.74rem] text-ink-3">{label}</dt>
      <dd className={`mt-0.5 text-[1.35rem] font-semibold leading-tight tabular-nums ${muted ? "text-ink-3" : "text-ink"}`}>{value}</dd>
      {note ? <dd className="mt-0.5 text-[0.72rem] leading-relaxed text-ink-3">{note}</dd> : null}
    </div>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-[var(--r-sm)] bg-surface-2 px-3.5 py-2.5 text-[0.8rem] leading-relaxed text-ink-2">{children}</p>
);

function Redteam({ label, r }: { label: string; r: RedteamSummary | null }) {
  if (!r) return <Stat label={label} value="—" note="ยังไม่ได้รันบนเครื่องนี้" />;
  return (
    <Stat label={label} value={`${r.critPassed}/${r.critTotal}`}
      note={`เคสวิกฤตผ่าน · ทั้งชุด ${r.passed}/${r.total} · โครงสร้างข้อมูล ${r.privPassed}/${r.privTotal} · ${r.when}`} />
  );
}

function AgreementView({ a, title, note }: { a: Agreement; title: string; note: string }) {
  // ยังไม่ถึงจำนวนขั้นต่ำ: แสดงตัวเลขเป็นสีจาง พร้อมป้าย "เบื้องต้น" ไม่ให้ถูกอ่านเป็นข้อสรุป
  const pre = !a.enough;
  return (
    <div className="rounded-[var(--r-md)] border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.86rem] font-medium text-ink">{title}</p>
        {pre ? (
          <span className="rounded-full bg-watch-soft px-2.5 py-1 text-[0.72rem] font-medium text-watch">
            {a.n === 0 ? "ยังไม่มีข้อมูล" : `เบื้องต้น · ${a.n}/${MIN_PAIRS} คู่`}
          </span>
        ) : null}
      </div>
      <p className="mt-0.5 text-[0.74rem] leading-relaxed text-ink-3">{note}</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Stat label="จำนวนคู่" value={String(a.n)} />
        <Stat muted={pre} label="อยู่ระดับเดียวกัน" value={dash(a.pctSameBand, "%")} note={a.n ? `${a.sameBand} จาก ${a.n} คู่` : undefined} />
        <Stat muted={pre} label="Cohen's kappa" value={dash(a.kappa)} note={`ถ่วงน้ำหนัก ${dash(a.kappaWeighted)}`} />
        <Stat muted={pre} label="คลาดกันเฉลี่ย" value={dash(a.meanAbsDiff)} note="คะแนน จากเต็ม 27" />
      </dl>
      {a.n > 0 ? (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 border-t border-line-soft pt-3">
            <Stat muted={pre} label={`จับคนที่ตอบเองได้ ≥ ${SCREEN_CUTOFF}`} value={dash(a.screen.sensitivity, "%")} note={`${a.screen.tp} จาก ${a.screen.tp + a.screen.fn} คน`} />
            <Stat muted={pre} label={`ไม่ตื่นตูมกับคนที่ตอบเองได้ < ${SCREEN_CUTOFF}`} value={dash(a.screen.specificity, "%")} note={`${a.screen.tn} จาก ${a.screen.tn + a.screen.fp} คน`} />
          </dl>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[20rem] border-collapse text-[0.76rem] tabular-nums">
              <caption className="pb-2 text-left text-[0.74rem] text-ink-3">แถว = นักเรียนตอบเอง · คอลัมน์ = ระบบประเมิน</caption>
              <thead>
                <tr>
                  <th className="p-1.5 text-left font-normal text-ink-3" />
                  {Q9_BANDS.map((b) => <th key={b.short} scope="col" className="p-1.5 text-center font-normal text-ink-3">{b.short}</th>)}
                </tr>
              </thead>
              <tbody>
                {a.matrix.map((row, i) => (
                  <tr key={i}>
                    <th scope="row" className="p-1.5 text-left font-normal text-ink-3">{Q9_BANDS[i].short}</th>
                    {row.map((v, j) => (
                      <td key={j} className={`border border-line-soft p-1.5 text-center ${i === j ? "bg-accent-soft font-medium text-accent" : v ? "text-ink" : "text-ink-3"}`}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {pre ? (
        <p className="mt-3 text-[0.74rem] leading-relaxed text-ink-3">
          ต้องมีอย่างน้อย {MIN_PAIRS} คู่ก่อนจะอ่านค่าเหล่านี้เป็นข้อสรุปได้ ตัวเลขจากข้อมูลน้อยกว่านี้แกว่งมากและไม่ควรนำไปอ้าง
        </p>
      ) : null}
    </div>
  );
}

export default function Admin() {
  const [k, setK] = useState<Kpi | null>(null);
  const [seeds, setSeeds] = useState(false);

  const load = useCallback(async () => {
    try {
      setK(await (await fetch(`/api/kpi${seeds ? "?seeds=1" : ""}`, { cache: "no-store" })).json());
    } catch { /* รอบถัดไปลองใหม่ */ }
  }, [seeds]);
  usePoll(load, 10000);

  const tables = k ? [...new Set(k.privacy.columns.map((c) => c.table))] : [];

  return (
    <Shell wide>
      <TopBar back="/counselor" label="ตัวชี้วัด" right={
        <span className="rounded-full bg-surface-2 px-2.5 py-1.5 text-[0.74rem] text-ink-2">
          ที่เก็บ: {k ? (k.storage === "neon" ? "Postgres" : "memory") : "…"}
        </span>
      } />

      <main className="rise space-y-4 pb-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[1.3rem] font-semibold text-ink">ตัวชี้วัดของโครงการ</h1>
            <p className="mt-1 text-[0.86rem] leading-relaxed text-ink-2">
              คำนวณจากข้อมูลที่ระบบเก็บจริง เป็นค่ารวมทั้งหมด ไม่มีข้อมูลรายคน
            </p>
          </div>
          <button type="button" role="switch" aria-checked={seeds} onClick={() => setSeeds((v) => !v)}
            className="inline-flex min-h-[40px] items-center gap-2.5 rounded-full border border-line bg-surface px-3.5 text-[0.82rem] text-ink-2">
            <span className={`relative h-5 w-9 rounded-full transition ${seeds ? "bg-accent" : "bg-line"}`}>
              <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-all ${seeds ? "left-[18px]" : "left-0.5"}`} />
            </span>
            นับรวมเคสจำลอง{k ? ` (${k.seeded})` : ""}
          </button>
        </div>

        {k?.includeSeeds && k.seeded > 0 ? (
          <p className="rounded-[var(--r-sm)] bg-watch-soft px-3.5 py-2.5 text-[0.8rem] leading-relaxed text-watch">
            กำลังนับรวมเคสจำลอง {k.seeded} เคส ตัวเลขข้อ 1–3 ตอนนี้เป็นข้อมูลตัวอย่างสำหรับดูหน้าตา ไม่ใช่ผลจากการใช้งานจริง
          </p>
        ) : null}

        {!k ? null : (
          <div className="grid gap-4 lg:grid-cols-2">
            <Block n={1} title="การเข้าถึง" how="นักเรียนที่ใช้ระบบ และสัดส่วนที่คุยถึงระดับที่ประเมินได้">
              <dl className="grid grid-cols-2 gap-4">
                <Stat label="นักเรียนที่ใช้" value={String(k.reach.students)} note="มีการคุยอย่างน้อย 1 รอบ" />
                <Stat label="คุยถึงระดับที่ประเมินได้" value={dash(k.reach.pctAssessable, "%")} note={`${k.reach.assessable} จาก ${k.reach.students} คน`} />
              </dl>
              <ul className="mt-4 flex flex-wrap gap-1.5 border-t border-line-soft pt-3">
                {k.steps.map((s) => (
                  <li key={s.step} className="rounded-full bg-surface-2 px-2.5 py-1 text-[0.74rem] text-ink-2">
                    {CARE[s.step].tag} <span className="font-medium tabular-nums text-ink">{s.n}</span>
                  </li>
                ))}
              </ul>
            </Block>

            <Block n={2} title="คัดกรองเจอเร็ว" how="เคสเสี่ยงปานกลางขึ้นไปที่ครูระบุเองว่าไม่เคยรู้มาก่อน">
              <dl className="grid grid-cols-3 gap-4">
                <Stat label="ไม่เคยรู้มาก่อน" value={String(k.early.unknownBefore)} />
                <Stat label="รู้อยู่แล้ว" value={String(k.early.knownBefore)} />
                <Stat label="ยังไม่ได้ระบุ" value={String(k.early.unmarked)} note="รวมเคสที่ยังนิรนาม" />
              </dl>
              <p className="mt-3 text-[0.74rem] leading-relaxed text-ink-3">
                จากเคสเสี่ยงปานกลางขึ้นไป {k.early.flagged} เคส · ครูระบุได้เฉพาะเคสที่นักเรียนเปิดชื่อ (L2 ขึ้นไป)
              </p>
            </Block>

            <Block n={3} title="ปิดวงจรส่งต่อ" how="ส่งต่อแล้วไปถึงจริงกี่ % ใช้เวลาเท่าไหร่ และติดอะไรเมื่อไปไม่ถึง">
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat label="ไปถึงจริง" value={k.loop.steps[0].n ? `${k.loop.arrivalRate}%` : "—"} note={`${k.loop.steps[2].n} จาก ${k.loop.steps[0].n} เคสที่ส่งต่อ`} />
                <Stat label="เฉลี่ยถึงวันพบ" value={dash(k.loop.avgDays, " วัน")} />
                {k.loop.byTrack.map((t) => (
                  <Stat key={t.track} label={t.track === "school" ? "ในโรงเรียน" : "ภายนอก"} value={t.sent ? `${t.rate}%` : "—"} note={`${t.arrived}/${t.sent} เคส`} />
                ))}
              </dl>
              <ul className="mt-4 flex flex-wrap gap-1.5 border-t border-line-soft pt-3">
                <li className="rounded-full bg-surface-2 px-2.5 py-1 text-[0.74rem] text-ink-2">เข้าเกณฑ์ <span className="font-medium tabular-nums text-ink">{k.loop.pool}</span></li>
                {k.loop.steps.map((s) => (
                  <li key={s.status} className="rounded-full bg-surface-2 px-2.5 py-1 text-[0.74rem] text-ink-2">
                    {REF_LABEL[s.status]} <span className="font-medium tabular-nums text-ink">{s.n}</span>
                  </li>
                ))}
              </ul>
              {k.loop.reasons.length > 0 ? (
                <p className="mt-3 text-[0.78rem] leading-relaxed text-ink-2">
                  เหตุผลที่ไม่ได้ไป: {k.loop.reasons.map((r) => `${MISS_LABEL[r.reason]} ${r.n}`).join(" · ")}
                </p>
              ) : null}
            </Block>

            <Block n={4} title="ส่งต่อเฉพาะทาง" how="การ์ดช่องทางช่วยเหลือถูกแสดงและถูกกดกี่ครั้ง แยกตามหมวด (นับแบบไม่ระบุตัวตน)">
              {k.routing.shown === 0 && k.routing.bridge.open === 0 ? (
                <Empty>ยังไม่มีการ์ดถูกแสดง ตัวเลขจะขึ้นเมื่อมีนักเรียนคุยเรื่องที่เข้าหมวด</Empty>
              ) : (
                <table className="w-full border-collapse text-[0.82rem] tabular-nums">
                  <thead>
                    <tr className="text-ink-3">
                      <th className="pb-1.5 text-left font-normal">หมวด</th>
                      <th className="pb-1.5 text-right font-normal">แสดง</th>
                      <th className="pb-1.5 text-right font-normal">กด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {k.routing.byDomain.filter((d) => d.shown || d.clicks).map((d) => (
                      <tr key={d.domain} className="border-t border-line-soft">
                        <td className="py-1.5 text-ink-2">{domainTag(d.domain)}</td>
                        <td className="py-1.5 text-right text-ink">{d.shown}</td>
                        <td className="py-1.5 text-right text-ink">{d.clicks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-line-soft pt-3 sm:grid-cols-4">
                <Stat label="เปิดพาไปหาคน" value={String(k.routing.bridge.open)} />
                <Stat label="ขอครูติดต่อ" value={String(k.routing.bridge.counselor)} />
                <Stat label="เลือกเพื่อน" value={String(k.routing.bridge.friend)} />
                <Stat label="เลือกสายด่วน" value={String(k.routing.bridge.hotline)} />
              </dl>
              <p className="mt-3 text-[0.74rem] leading-relaxed text-ink-3">
                ระบบชวนไปหาคน {k.routing.nudges} ครั้ง · การ์ดสายด่วนขึ้น {k.routing.safetyCards} ครั้ง · เปิดกิจกรรมดูแลตัวเอง {k.routing.selfCare} ครั้ง
              </p>
            </Block>

            <div className="lg:col-span-2">
            <Block n={5} title="ความปลอดภัย" how="ผลชุดทดสอบ red-team รอบล่าสุด เป้าคือเคสวิกฤตผ่าน 100%">
              <dl className="grid grid-cols-2 gap-4 sm:max-w-[40rem]">
                <Redteam label="AI จริง" r={k.safety.ai} />
                <Redteam label="โหมดสาธิต" r={k.safety.demo} />
              </dl>
              <p className="mt-3 text-[0.74rem] leading-relaxed text-ink-3">
                รันด้วย <code className="rounded bg-surface-2 px-1 py-0.5">npm run redteam</code> บนเครื่องที่มีคีย์ ผลอ่านจากไฟล์รายงานบนเครื่องนั้น จึงไม่ขึ้นบน server ที่ deploy
                · ตัวตรวจเป็นรูปแบบข้อความ ไม่ได้แทนการตรวจโดยผู้เชี่ยวชาญ
              </p>
            </Block>
            </div>

            <div className="lg:col-span-2">
            <Block n={6} title="ความน่าเชื่อถือ" how="คะแนน 9Q ที่ระบบสกัดจากการคุย เทียบกับที่นักเรียนตอบเอง (เฉพาะคนที่ยินยอม ไม่ระบุตัวตน)">
              <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
                <AgreementView a={k.reliability.strict} title="ชุดที่ใช้อ้างอิง"
                  note={`AI จริง · ตอบก่อนเห็นผลของระบบ · ระบบเก็บหลักฐาน 9Q ได้อย่างน้อย ${MIN_ANSWERED} ข้อ`} />
                <AgreementView a={k.reliability.all} title="ทุกคู่ที่เก็บได้"
                  note={`รวมโหมดสาธิต ${k.reliability.bySource.demo} คู่ และคู่ที่ตอบหลังเห็นผล ${k.reliability.all.n - k.reliability.blind} คู่ ใช้ดูภาพรวมเท่านั้น`} />
              </div>
            </Block>
            </div>

            <div className="lg:col-span-2">
              <Block n={7} title="ความเป็นส่วนตัว" how="จำนวนข้อความของนักเรียนที่ถูกเก็บ พิสูจน์จากโครงสร้างฐานข้อมูล">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-full bg-calm-soft text-calm"><Lock size={19} /></span>
                    <div>
                      <p className="text-[1.6rem] font-semibold leading-none tabular-nums text-ink">{k.privacy.messagesStored}</p>
                      <p className="mt-1 text-[0.76rem] text-ink-3">ข้อความที่ถูกเก็บ</p>
                    </div>
                  </div>
                  <p className="min-w-[16rem] flex-1 text-[0.82rem] leading-relaxed text-ink-2">
                    ไม่มีคอลัมน์ไหนรับบทสนทนา คอลัมน์ข้อความมีแค่รหัส ชื่อ/ห้อง (เฉพาะเมื่อนักเรียนเปิดชื่อ) และค่าจากรายการที่กำหนดไว้
                    ซึ่งฐานข้อมูลบังคับด้วย CHECK
                  </p>
                </div>
                {tables.length === 0 ? (
                  <div className="mt-4"><Empty>
                    โหมด memory ไม่มีฐานข้อมูลให้อ่านโครงสร้าง เมื่อต่อ Postgres รายการคอลัมน์จะอ่านจากฐานข้อมูลจริงมาแสดงที่นี่
                    ระหว่างนี้โครงสร้างถูกตรวจด้วย <code className="rounded bg-surface px-1 py-0.5">npm run redteam</code> (กลุ่มความเป็นส่วนตัวเชิงโครงสร้าง)
                  </Empty></div>
                ) : (
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    {tables.map((t) => (
                      <div key={t}>
                        <p className="text-[0.8rem] font-medium text-ink">{t}</p>
                        <ul className="mt-1.5 flex flex-wrap gap-1">
                          {k.privacy.columns.filter((c) => c.table === t).map((c) => (
                            <li key={c.column} title={c.type}
                              className={`rounded-md px-1.5 py-0.5 text-[0.7rem] ${c.type === "text" ? "bg-watch-soft text-watch" : "bg-surface-2 text-ink-2"}`}>
                              {c.column}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    <p className="flex items-start gap-1.5 text-[0.72rem] leading-relaxed text-ink-3 sm:col-span-3">
                      <Info size={12} className="mt-0.5 shrink-0" />
                      อ่านจาก information_schema ของฐานข้อมูลจริง สีเหลือง = คอลัมน์ชนิดข้อความ (รหัส ชื่อ/ห้อง ป้ายระดับ และ enum) ที่เหลือเป็นตัวเลข เวลา หรือ jsonb ของตัวเลข
                    </p>
                  </div>
                )}
              </Block>
            </div>
          </div>
        )}
      </main>
      <Hotline />
    </Shell>
  );
}
