import { Shell, TopBar, Card, Hotline, RiskBadge } from "@/components/ui";
import { Quote, Hospital, Clock, Pin, Check, Info, Users, Doc } from "@/components/icons";
import { Q9, GAD7, Q8, scoreOf, readVitals, ZONE_COPY, INSTRUMENT_VERSION } from "@/lib/instruments";
import { DEMO_EXTRACTIONS, DEMO_VITALS, DEMO_TREND, DEMO_TOPICS, FACILITIES } from "@/lib/demo";

const scores = [Q9, GAD7, Q8].map((i) => scoreOf(i, DEMO_EXTRACTIONS));
const vitals = readVitals(DEMO_VITALS);

const SCHOOL_DID = [
  "ครูแนะแนวพบนักเรียน 2 ครั้ง (8 และ 14 ส.ค.)",
  "ปรับตารางส่งงานร่วมกับครูประจำวิชา 2 วิชา",
  "แผนปรับเวลานอน 2 สัปดาห์ — การนอนยังลดลงต่อเนื่อง",
];

export default function Referral() {
  return (
    <Shell>
      <TopBar back="/counselor" label="เอกสารส่งต่อ" />

      <main className="rise pb-6">
        <Card className="overflow-hidden">
          {/* หัวเอกสาร */}
          <div className="border-b border-line bg-surface-2 px-6 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[0.76rem] uppercase tracking-[0.16em] text-ink-3">
                  สรุปข้อมูลเพื่อประกอบการพิจารณาของผู้เชี่ยวชาญ
                </p>
                <h1 className="mt-2.5 text-[1.5rem] leading-tight text-ink">
                  นักเรียนรหัส SCH042-A73
                </h1>
                <p className="mt-1.5 text-[0.84rem] text-ink-2">
                  โรงเรียนสาธิต · ส่งโดยครูแนะแนว · 18 สิงหาคม 2026
                </p>
              </div>
              <RiskBadge risk="high" />
            </div>
            <p className="mt-4 border-t border-line pt-4 text-[0.82rem] leading-relaxed text-ink-2">
              คัดกรองเบื้องต้น ไม่ใช่การวินิจฉัย และไม่ได้เสนอลำดับความเร่งด่วน
            </p>
          </div>

          {/* คะแนน */}
          <section className="px-6 py-6">
            <h2 className="text-[0.78rem] uppercase tracking-[0.14em] text-ink-3">คะแนนจากเครื่องมือมาตรฐาน</h2>
            <ul className="mt-4 space-y-3">
              {scores.map((s) => (
                <li key={s.instrument} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line-soft pb-3 last:border-0">
                  <span className="w-[4.6rem] shrink-0 text-[0.9rem] text-ink">{s.instrument}</span>
                  <span className="text-[1.3rem] tabular-nums text-ink">{s.raw}</span>
                  <span className="text-[0.88rem] text-ink-2">{s.band}</span>
                  <span className="ml-auto text-[0.76rem] text-ink-3">
                    ตอบครบ {s.answered}/{s.total} ข้อ
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[0.76rem] text-ink-3">
              คำนวณด้วยเกณฑ์เวอร์ชัน {INSTRUMENT_VERSION} · คะแนนคำนวณจากโค้ด ไม่ใช่จากโมเดลภาษา
            </p>
          </section>

          {/* หลักฐาน */}
          <section className="border-t border-line-soft px-6 py-6">
            <h2 className="text-[0.78rem] uppercase tracking-[0.14em] text-ink-3">คำพูดของนักเรียนที่เป็นที่มาของคะแนน</h2>
            <ul className="mt-4 space-y-4">
              {DEMO_EXTRACTIONS.filter((e) => e.confidence > 0.8).slice(0, 4).map((e) => (
                <li key={e.itemId} className="flex gap-3">
                  <Quote size={15} className="mt-1 shrink-0 text-ink-3" />
                  <div>
                    <p className="text-[0.9rem] leading-[1.75] text-ink">&ldquo;{e.evidence}&rdquo;</p>
                    <p className="mt-1 text-[0.75rem] text-ink-3">
                      {e.itemId} · {e.score} คะแนน · ความมั่นใจ {Math.round(e.confidence * 100)}%
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* แนวโน้ม + ปัจจัยกายภาพ */}
          <section className="grid gap-6 border-t border-line-soft px-6 py-6 sm:grid-cols-2">
            <div>
              <h2 className="text-[0.78rem] uppercase tracking-[0.14em] text-ink-3">แนวโน้มการนอน 4 สัปดาห์</h2>
              <ul className="mt-4 space-y-2">
                {DEMO_TREND.map((d) => (
                  <li key={d.week} className="flex items-center gap-3 text-[0.82rem]">
                    <span className="w-[5rem] shrink-0 text-ink-3">{d.week}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-soft">
                      <div className="h-full rounded-full bg-care/45" style={{ width: `${(d.sleep / 9) * 100}%` }} />
                    </div>
                    <span className="w-[3.2rem] shrink-0 text-right tabular-nums text-ink-2">{d.sleep} ชม.</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-[0.78rem] uppercase tracking-[0.14em] text-ink-3">ปัจจัยด้านพฤติกรรม</h2>
              <ul className="mt-4 space-y-2.5">
                {vitals.map((v) => (
                  <li key={v.key} className="flex items-baseline justify-between gap-3 text-[0.85rem]">
                    <span className="text-ink-2">{v.label}</span>
                    <span className="text-ink">{v.value}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[0.8rem] leading-[1.7] text-ink-3">
                เรื่องที่กดดัน: {DEMO_TOPICS.join(" · ")}
              </p>
            </div>
          </section>

          {/* โรงเรียนทำอะไรไปแล้ว */}
          <section className="border-t border-line-soft px-6 py-6">
            <h2 className="text-[0.78rem] uppercase tracking-[0.14em] text-ink-3">โรงเรียนดำเนินการไปแล้ว</h2>
            <ul className="mt-4 space-y-2.5">
              {SCHOOL_DID.map((t) => (
                <li key={t} className="flex gap-3 text-[0.88rem] leading-[1.7] text-ink-2">
                  <Check size={15} className="mt-1 shrink-0 text-ink-3" />
                  {t}
                </li>
              ))}
            </ul>
          </section>

          {/* ผู้ปกครอง */}
          <section className="border-t border-line-soft bg-surface-2 px-6 py-6">
            <div className="flex gap-3.5">
              <Users size={19} className="mt-0.5 shrink-0 text-ink-2" />
              <div>
                <h2 className="text-[0.92rem] text-ink">สถานะการมีส่วนร่วมของผู้ปกครอง</h2>
                <p className="mt-1.5 text-[0.85rem] leading-relaxed text-ink-2">
                  อายุต่ำกว่า 18 ปี ต้องมีผู้ปกครองในขั้นตอนการรักษา ครูแนะแนวกำลังประสานกับทางบ้าน
                </p>
              </div>
            </div>
          </section>
        </Card>

        {/* Referral Navigator */}
        <section className="pt-9">
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
              <p className="text-[0.83rem] leading-relaxed text-ink-2">ข้อมูลตัวอย่าง ต้องโทรยืนยันก่อนใช้จริง</p>
            </div>
          </Card>
        </section>

        <div className="no-print flex flex-wrap gap-3 pt-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-[0.86rem] text-ink-2">
            <Doc size={16} />
            ส่งออกเป็น PDF หน้าเดียว
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-[0.86rem] text-ink-2">
            ลิงก์เข้าถึงหมดอายุใน 7 วัน
          </span>
        </div>
      </main>

      <Hotline />
    </Shell>
  );
}
