/**
 * ตัดข้อมูลระบุตัวตนออกก่อนข้อความจะออกจากระบบไปหาผู้ให้บริการ AI
 *
 * เส้นทางสนทนาต้องส่งข้อความให้โมเดลภายนอกประมวลผล (จำเป็น ไม่งั้นตอบไม่ได้)
 * แต่ "ใครเป็นคนพูด" ไม่จำเป็นต้องออกไปด้วย ไฟล์นี้จึงแทนชื่อ เบอร์โทร เลขบัตร อีเมล
 * บัญชีโซเชียล ชื่อโรงเรียน และห้องเรียน ด้วยป้ายกำกับ เช่น [ชื่อ] [เบอร์โทร]
 *
 * สองชั้น
 *   maskKnown()  ฝั่งเครื่องนักเรียน — รู้ชื่อ/เบอร์ที่กรอกไว้ในโปรไฟล์ จึงตัดได้ตรงตัว
 *   redact()     ฝั่ง server ที่ lib/llm.ts จุดเดียวก่อนเรียกผู้ให้บริการ — ตัดตามรูปแบบ
 *
 * ข้อจำกัดที่ต้องพูดตรง ๆ: ภาษาไทยไม่เว้นวรรคระหว่างคำ และชื่อเล่นเป็นคำธรรมดาได้
 * ตัวนี้จึง "ลดความเสี่ยง" ไม่ใช่ "รับประกัน" — ชื่อเพื่อนหรือครูที่พิมพ์ติดกับประโยคอาจหลุดได้
 * เคสที่ครอบคลุมและไม่ครอบคลุมดูได้ที่ scripts/unit/redact.test.mjs
 *
 * ไฟล์นี้ไม่ import อะไรเลยโดยตั้งใจ เพื่อให้รัน unit test ได้ตรง ๆ และใช้ได้ทั้ง server/client
 */

export const TAG = {
  name: "[ชื่อ]",
  phone: "[เบอร์โทร]",
  id: "[เลขบัตร]",
  email: "[อีเมล]",
  link: "[ลิงก์]",
  account: "[เลขบัญชี]",
  social: "[บัญชีโซเชียล]",
  school: "[โรงเรียน]",
  room: "[ห้อง]",
  student: "[รหัสนักเรียน]",
} as const;

const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙";
const toArabic = (s: string) => s.replace(/[๐-๙]/g, (d) => String(THAI_DIGITS.indexOf(d)));

/* ---------------- ชั้นรูปแบบตายตัว (regex) -------------------------------- */

const RULES: [RegExp, string | ((m: string, ...g: string[]) => string)][] = [
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, TAG.email],
  [/https?:\/\/[^\s]+|www\.[^\s]+/gi, TAG.link],
  // เลขบัตรประชาชน 13 หลัก (มีหรือไม่มีขีด)
  [/(?<!\d)\d[- ]?\d{4}[- ]?\d{5}[- ]?\d{2}[- ]?\d(?!\d)/g, TAG.id],
  // เบอร์มือถือ/บ้าน 9–10 หลัก เว้นวรรคหรือขีดตรงไหนก็ได้ และแบบ +66 — สายด่วน 4 หลักไม่โดน
  [/(?<!\d)(?:\+66[- ]?|0)\d(?:[- ]?\d){7,8}(?!\d)|(?<!\d)66[689]\d{8}(?!\d)/g, TAG.phone],
  // เลขยาว 10 หลักขึ้นไปที่เหลือ = เลขบัญชี/พร้อมเพย์
  [/(?<!\d)\d(?:[- ]?\d){9,}(?!\d)/g, TAG.account],
  // ไลน์ / ไอจี / เฟส + ชื่อบัญชี และ @handle
  [/(?:ไอดี\s*)?(?:ไลน์|line|ไอจี|ig|อินสตาแกรม|instagram|เฟส(?:บุ๊ก)?|facebook|fb|ติ๊กต็อก|tiktok|ดิสคอร์ด|discord)\s*(?:id|ไอดี)?\s*[:=：]?\s*@?[A-Za-z0-9._]{3,}/gi, TAG.social],
  [/(?<![\w.])@[A-Za-z0-9._]{3,}/g, TAG.social],
  // ห้องเรียน: เก็บระดับชั้นไว้ (บริบทสำคัญ เช่น ม.6 เตรียมสอบ) ตัดเฉพาะเลขห้อง
  [/([มป])\s?\.\s?([1-6])\s?\/\s?\d{1,2}/g, (_m, lv: string, n: string) => `${lv}.${n} ${TAG.room}`],
  [/ห้อง\s?\d{1,2}\s?\/\s?\d{1,2}/g, TAG.room],
  [/(?:เลขประจำตัว(?:นักเรียน)?|รหัสนักเรียน|รหัสประจำตัว|เลขที่)\s*:?\s*\d{1,6}/g, TAG.student],
  // คำนำหน้าแบบย่อ + ชื่อ และ "นามสกุล…" (ตัวแบ่งคำอ่านสองแบบนี้ไม่ออก จึงจับด้วย regex)
  [/(?:น\.ส\.|ด\.ช\.|ด\.ญ\.)\s?[ก-๙]{2,20}(?:\s[ก-๙]{2,20})?/g, TAG.name],
  [/นามสกุล\s?(?:คือ|ว่า)?\s?[A-Za-zก-๙]{2,24}/g, `นามสกุล${TAG.name}`],
];

/* ---------------- ชั้นแบ่งคำ: ชื่อคน และชื่อโรงเรียน ---------------------- */

/** คำที่มักตามหลังชื่อ — เจอเมื่อไหร่ถือว่าชื่อจบแล้ว */
const STOP = new Set(
  (
    "ครับ ค่ะ คะ ค่า คับ นะ จ้า จ้ะ ฮะ อะ อ่ะ เลย แล้ว ด้วย ก็ ที่ และ กับ แต่ หรือ เพราะ ซึ่ง ว่า คือ " +
    "อยู่ เป็น มี ไม่ จะ ได้ ให้ ต้อง เคย กำลัง ยัง อยาก ชอบ รัก เกลียด โกรธ แกล้ง ด่า ตี ขู่ หลอก ชวน ทิ้ง เลิก " +
    "บอก พูด ถาม ตอบ โทร ส่ง มา ไป ทำ เรียน สอน รู้ เห็น คิด " +
    "เขา เค้า เรา ผม หนู ฉัน มัน คน ของ ใน อายุ เพื่อน ครู แม่ พ่อ " +
    "นี้ นั้น เดิม ใหม่ เก่า ทุก วัน ตอน เช้า เย็น ตาม ปกติ ไหว วันนี้ พรุ่งนี้ เมื่อวาน"
  ).split(" ")
);

/** "ชื่อ" + คำพวกนี้ ไม่ใช่ชื่อคน (ชื่อเสียง ชื่อเรื่อง ชื่อเกม ...) */
const NOT_PERSON = new Set("เสียง เรื่อง วิชา เกม เพลง หนัง แอป เว็บ กลุ่ม ห้อง ทีม โรงเรียน ผู้ บัญชี ไฟล์ ร้าน ยา โรค".split(" "));
/** คำเชื่อมระหว่าง "ชื่อ" กับตัวชื่อ: ชื่อเล่นว่า... ชื่อจริงคือ... */
const NAME_LINK = new Set(["เล่น", "จริง", "ว่า", "คือ", ":"]);
const FORMAL = new Set(["นาย", "นาง", "นางสาว", "เด็กชาย", "เด็กหญิง"]);
const SCHOOL = ["โรงเรียน", "รร.", "ร.ร.", "วิทยาลัย", "มหาวิทยาลัย"];

const isSpace = (s: string) => /^\s+$/.test(s);
const isWord = (s: string) => /^[A-Za-zก-๙]/.test(s);

/** เก็บคำต่อเนื่องจากตำแหน่ง i จนเจอคำหยุด ช่องว่าง หรือเครื่องหมาย — คืนตำแหน่งถัดจากคำสุดท้าย */
function takeName(segs: string[], i: number, maxSegs: number, maxChars: number): number {
  let j = i;
  let chars = 0;
  while (j < segs.length && j - i < maxSegs) {
    const s = segs[j];
    if (!isWord(s) || STOP.has(s) || s.startsWith("[")) break;
    chars += s.length;
    if (chars > maxChars) break;
    j++;
  }
  return j;
}

function segmentPass(text: string): string {
  if (typeof Intl === "undefined" || !("Segmenter" in Intl)) return text;
  const segs = [...new Intl.Segmenter("th", { granularity: "word" }).segment(text)].map((x) => x.segment);
  const out: string[] = [];

  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];

    // --- "ชื่อ…" : ผมชื่อธนกฤต · ชื่อเล่นว่าเฟิร์ส · เพื่อนชื่อน้ำหวาน
    if (s === "ชื่อ") {
      let k = i + 1;
      while (k < segs.length && (NAME_LINK.has(segs[k]) || isSpace(segs[k]))) k++;
      if (k < segs.length && !NOT_PERSON.has(segs[k])) {
        const end = takeName(segs, k, 4, 24);
        if (end > k) {
          out.push(...segs.slice(i, k), TAG.name);
          i = end - 1;
          continue;
        }
      }
    }

    // --- คำนำหน้าทางการ + ชื่อ (+ นามสกุลที่เว้นวรรคตามมา)
    if (FORMAL.has(s)) {
      let k = i + 1;
      if (k < segs.length && isSpace(segs[k])) k++;
      let end = takeName(segs, k, 4, 24);
      if (end > k) {
        if (end + 1 < segs.length && isSpace(segs[end])) {
          const last = takeName(segs, end + 1, 4, 24);
          if (last > end + 1) end = last;
        }
        out.push(TAG.name);
        i = end - 1;
        continue;
      }
    }

    // --- ชื่อโรงเรียน: "โรงเรียนสวนกุหลาบ" ตัด · "ไปโรงเรียนไม่ไหว" ไม่ตัด
    const prefix = SCHOOL.find((p) => s === p || (s.startsWith(p) && s.length > p.length));
    if (prefix) {
      let k = i + 1;
      if (s === prefix && k < segs.length && isSpace(segs[k]) && k + 1 < segs.length && isWord(segs[k + 1]) && !STOP.has(segs[k + 1])) k++;
      const end = takeName(segs, k, 5, 40);
      if (s !== prefix || end > k) {
        out.push(TAG.school);
        i = Math.max(end, i + 1) - 1;
        continue;
      }
    }

    out.push(s);
  }
  return out.join("");
}

/** ตัดตามรูปแบบ — ใช้ที่ server ก่อนข้อความออกไปหาผู้ให้บริการ AI */
export function redact(text: string): string {
  if (!text) return text;
  let t = toArabic(text);
  for (const [re, to] of RULES) t = t.replace(re, to as never);
  return segmentPass(t);
}

/* ---------------- ชั้นรู้ค่า: สิ่งที่นักเรียนกรอกไว้ในโปรไฟล์ --------------- */

export type Known = { names?: (string | undefined)[]; phones?: (string | undefined)[] };

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * ตัดชื่อและเบอร์ที่ "รู้อยู่แล้ว" ออกตรงตัว — ทำบนเครื่องนักเรียนก่อนส่ง จึงไม่ต้องเดารูปแบบ
 * ชื่อยาว 4 ตัวอักษรขึ้นไปแทนทุกที่ที่เจอ · ชื่อสั้น (เช่น ชื่อเล่น 2–3 ตัวอักษร) แทนเฉพาะเมื่อเป็นคำเดี่ยว
 * เพื่อไม่ให้ชื่อเล่นอย่าง "ฟ้า" ไปตัดคำว่า "ท้องฟ้า"
 */
export function maskKnown(text: string, known: Known): string {
  if (!text) return text;
  let t = text;

  for (const p of known.phones ?? []) {
    const digits = (p ?? "").replace(/\D/g, "");
    if (digits.length < 9) continue;
    t = toArabic(t).replace(new RegExp(`(?<!\\d)${digits.split("").join("[- ]?")}(?!\\d)`, "g"), TAG.phone);
  }

  const tokens = [...new Set((known.names ?? []).flatMap((n) => (n ?? "").split(/\s+/)).map((n) => n.trim()).filter((n) => n.length >= 2))]
    .sort((a, b) => b.length - a.length);
  const long = tokens.filter((n) => n.length >= 4);
  const short = tokens.filter((n) => n.length < 4);

  for (const n of long) t = t.replace(new RegExp(esc(n), "gi"), TAG.name);

  if (short.length && typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const set = new Set(short.map((n) => n.toLowerCase()));
    t = [...new Intl.Segmenter("th", { granularity: "word" }).segment(t)]
      .map((x) => (set.has(x.segment.toLowerCase()) ? TAG.name : x.segment))
      .join("");
  }
  return t;
}
