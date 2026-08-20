# เพื่อนรัก · PeunRak

เพื่อนที่คุยด้วยได้ ก่อนจะบอกใคร
ระบบดูแลสุขภาพจิตนักเรียน — MVP สำหรับ Mahidol Public Health Hackathon 2026

```bash
npm install && npm run dev
```

## เลือกโมเดล

ระบบเลือกให้อัตโนมัติจากคีย์ที่มีอยู่ — **Gemini → Claude → โหมดสาธิต**

```bash
cp .env.example .env.local
```

| ใส่คีย์ตัวไหน | ใช้อะไร | คีย์เอาจากไหน |
|---|---|---|
| `GEMINI_API_KEY` | `gemini-3.5-flash` (แชท) + `gemini-3.5-flash-lite` (ประเมินเสี่ยง) | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — **มี free tier** |
| `ANTHROPIC_API_KEY` | `claude-sonnet-5` + `claude-haiku-4-5` | [console.anthropic.com](https://console.anthropic.com) |
| ไม่ใส่เลย | โหมดสาธิต (`lib/fallback.ts`) | — |

ต้อง **restart dev server** หลังใส่คีย์ และเปลี่ยนรุ่นได้ด้วย `GEMINI_CHAT_MODEL` / `GEMINI_FAST_MODEL`

โค้ดที่สลับผู้ให้บริการอยู่ที่ [`lib/llm.ts`](lib/llm.ts) ไฟล์เดียว — ส่วนอื่นของแอปไม่รู้ว่าใช้เจ้าไหน

โหมดสาธิตตอบตามหัวข้อที่เด็กพูดจริงและมีเส้นทางฉุกเฉินครบ มีป้าย "โหมดสาธิต" บอกบนหน้าแชท
แต่ไม่ฉลาดเท่าโมเดลจริง — มีไว้กันเดโมพัง ไม่ใช่ตัวจริง

## เข้าใช้งาน

หน้าแรกคือ login ด้วยอีเมลโรงเรียน เลือกบทบาทได้ 2 แบบ (เดโมกดเข้าได้เลย ยังไม่เช็ครหัส)

| บทบาท | เข้าไปเจอ |
|---|---|
| นักเรียน | `/chat` แล้วมีแท็บล่าง: คุย · แบบทดสอบ · โปรไฟล์ |
| ครูแนะแนว | `/counselor` แดชบอร์ดความเสี่ยงแบบ realtime |

## AI สองตัว ทำงานคนละหน้าที่

```
ตัวที่ 1  สนทนา         /api/chat    Claude Sonnet 5   — คุยกับนักเรียน
ตัวที่ 2  ประเมินเสี่ยง   /api/risk    Claude Haiku 4.5  — ทำงานเบื้องหลัง ไม่โผล่ให้นักเรียนเห็น
ตัวที่ 3  คำนวณคะแนน    lib/instruments.ts  — โค้ดล้วน ไม่มี AI
```

**AI ตัวที่สองคือหัวใจของสถาปัตยกรรมความเป็นส่วนตัว** — มันอ่านบทสนทนาเพื่อประเมิน
แต่ `lib/store.ts` เก็บเฉพาะตัวเลข (`score`, `risk`, `turns`) ไม่มีข้อความสักคำถูกบันทึก
ครูจึงได้สัญญาณเตือนแบบ realtime โดยไม่มีทางรู้ว่านักเรียนคุยเรื่องอะไร

ทดสอบได้เอง: เปิด `/chat` พิมพ์อะไรก็ได้ แล้วเปิด `/counselor` อีกแท็บ — คะแนนขยับใน 3 วินาที

## หน้าจอ

| เส้นทาง | |
|---|---|
| `/` | login อีเมลโรงเรียน · เลือกบทบาท |
| `/chat` | คุยกับ AI สตรีมเรียลไทม์ + ป้ายบอกว่ากำลังถูกประเมิน |
| `/tests` `/tests/[id]` | 2Q · 9Q · GAD-7 · 8Q ทำเองได้ |
| `/profile` | ข้อมูลส่วนตัว ผู้ปกครอง ประวัติการรักษา + สวิตช์เปิดชื่อให้ครู |
| `/counselor` | แดชบอร์ด realtime (poll ทุก 3 วิ) |
| `/result` | สรุปจากแชท + ที่มาของคะแนน + บันไดการเปิดเผย |
| `/referral` | เอกสารส่งต่อ + เส้นทางในพื้นที่ |

## ดีไซน์

ฟ้า/ขาว clean modern · IBM Plex Sans Thai · **ไม่มีอิโมจิ** ไอคอน SVG วาดเองทั้งหมด
สายด่วน 1323 อยู่ทุกหน้า · เคารพ `prefers-reduced-motion` · รองรับ dark mode

## ยังไม่ได้ทำ

- `lib/store.ts` เป็น in-memory ของจริงต้องเป็น Postgres + Row Level Security
- login ยังไม่ verify จริง ของจริงต้องเป็น Google Workspace / Microsoft ของโรงเรียน
- **[ต้องยืนยัน]** เกณฑ์จุดตัดใน `lib/instruments.ts` ต้องให้ผู้เชี่ยวชาญตรวจ + เช็กลิขสิทธิ์แบบประเมิน
- **[ต้องยืนยัน]** ข้อมูลสถานพยาบาลใน `lib/demo.ts` เป็นตัวอย่าง

แผนฉบับเต็ม: `../project-plan.md`

---

## Deploy ขึ้น Vercel

1. [vercel.com/new](https://vercel.com/new) → Import repo นี้ → ไม่ต้องแก้ config อะไร
2. ใส่ Environment Variable: `GEMINI_API_KEY`
3. Deploy

### ⚠️ ต้องต่อ Redis ด้วย ไม่งั้นฟีเจอร์ realtime จะไม่ทำงาน

Vercel รันแบบ serverless ซึ่งแยกหลาย instance
ถ้าเก็บ state ไว้ใน memory `/api/risk` จะเขียนที่ instance หนึ่ง
แต่ `/api/monitor` อาจไปอ่านอีก instance หนึ่ง — ครูจะไม่เห็นคะแนนที่เด็กเพิ่งทำ

**วิธีต่อ** — Vercel Dashboard → โปรเจกต์ → **Storage** → **Upstash Redis** (มี free tier) → Connect

Vercel จะใส่ env ให้เองอัตโนมัติ โค้ดตรวจเจอแล้วสลับไปใช้ Redis ทันที ไม่ต้องแก้อะไร

`lib/store.ts` รองรับชื่อ env ทั้งสองแบบ:

| ที่มา | env |
|---|---|
| Vercel KV | `KV_REST_API_URL` · `KV_REST_API_TOKEN` |
| Upstash โดยตรง | `UPSTASH_REDIS_REST_URL` · `UPSTASH_REDIS_REST_TOKEN` |

ไม่มีทั้งคู่ → ใช้ memory (พอสำหรับ dev บนเครื่อง)

**เช็คว่าต่อติดไหม:** เปิด `/api/monitor` แล้วดูฟิลด์ `storage`
ต้องได้ `"redis"` ถ้าได้ `"memory"` แปลว่ายังไม่ได้ต่อ
