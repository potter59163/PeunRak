import { DOMAIN_INFO, type DomainId } from "./domains";

/**
 * ตาราง หมวดปัจจัยเสี่ยง → ช่องทางช่วยเหลือ
 *
 * PeunRak เป็นสะพาน ไม่ใช่ปลายทาง: ระบบไม่ได้แก้เรื่องพนัน สารเสพติด ภัยออนไลน์ หรือความรุนแรงเอง
 * หน้าที่ของตารางนี้คือพาไปถึงคนที่ช่วยได้จริงให้เร็วที่สุด
 *
 * verified: false = ยังไม่ได้ยืนยันกับหน่วยงานต้นทาง → ไม่แสดงใน production
 * ก่อนเปลี่ยนเป็น true ต้อง (1) เปิดแหล่งทางการของหน่วยงาน (2) โทรทดสอบจริง (3) เช็กเวลาทำการ
 */

export type Resource = {
  id: string;
  /** hotline = โทรได้เลย · bridge = เปิดทางไปหาคนในโรงเรียนผ่านปุ่ม "พาไปหาคน" */
  kind: "hotline" | "bridge";
  name: string;
  number?: string;
  desc: string;
  /** เมื่อไหร่ควรใช้ */
  when: string;
  verified: boolean;
  /** ที่มาของข้อมูล — ใช้ตอนไล่ยืนยัน */
  source?: string;
};

const R = {
  counselor: {
    id: "counselor", kind: "bridge", name: "ครูแนะแนวของโรงเรียน",
    desc: "ขอให้ครูติดต่อกลับ เลือกได้ว่าจะเปิดชื่อหรือยังไม่เปิด",
    when: "เมื่ออยากมีผู้ใหญ่ในโรงเรียนช่วยดูเรื่องนี้ด้วยกัน",
    verified: true,
  },
  mh1323: {
    id: "mh1323", kind: "hotline", name: "สายด่วนสุขภาพจิต", number: "1323",
    desc: "คุยกับผู้ให้คำปรึกษาได้ฟรี 24 ชั่วโมง ไม่ต้องบอกชื่อ",
    when: "เมื่อเรื่องที่แบกอยู่เริ่มหนักเกินจะรับคนเดียว",
    verified: true,
    source: "กรมสุขภาพจิต",
  },
  aoc1441: {
    id: "aoc1441", kind: "hotline", name: "ศูนย์ AOC รับแจ้งภัยออนไลน์", number: "1441",
    desc: "รับแจ้ง 24 ชั่วโมง ช่วยอายัดบัญชีได้ทันที",
    when: "เมื่อถูกหลอกโอนเงิน ถูกข่มขู่ หรือมีคนอ้างเป็นเจ้าหน้าที่โทรมา",
    verified: true,
    source: "https://www.thaipbs.or.th/news/content/346302",
  },
  ems1669: {
    id: "ems1669", kind: "hotline", name: "เจ็บป่วยฉุกเฉิน", number: "1669",
    desc: "รถพยาบาลฉุกเฉิน ฟรี 24 ชั่วโมง",
    when: "เมื่อมีคนบาดเจ็บ หรือกำลังตกอยู่ในอันตรายเดี๋ยวนี้",
    verified: true,
    source: "สถาบันการแพทย์ฉุกเฉินแห่งชาติ",
  },

  /* ---- [ต้องยืนยัน] ทั้งหมดด้านล่าง ยังไม่แสดงใน production ---- */
  social1300: {
    id: "social1300", kind: "hotline", name: "ศูนย์ช่วยเหลือสังคม", number: "1300",
    desc: "รับเรื่องความรุนแรงในครอบครัวและการคุ้มครองเด็ก",
    when: "เมื่อไม่ปลอดภัยในบ้าน หรือถูกทำร้าย",
    verified: false,
    source: "ต้องยืนยันกับกระทรวง พม. — พบในหน้า findahelpline.com/th",
  },
  child1387: {
    id: "child1387", kind: "hotline", name: "สายเด็ก", number: "1387",
    desc: "สายด่วนสำหรับเด็กและเยาวชนอายุต่ำกว่า 18 ปี",
    when: "เมื่ออยากคุยกับผู้ใหญ่ที่ทำงานกับเด็กโดยเฉพาะ",
    verified: false,
    source: "ต้องยืนยันกับมูลนิธิสายเด็ก — https://www.naewna.com/n/?p=36813",
  },
  alc1413: {
    id: "alc1413", kind: "hotline", name: "สายด่วนเลิกเหล้า", number: "1413",
    desc: "ปรึกษาเรื่องการดื่มของตัวเองหรือคนในบ้าน",
    when: "เมื่อการดื่มเริ่มกระทบชีวิต",
    verified: false,
    source: "ต้องยืนยันกับศูนย์ปรึกษาปัญหาสุรา — https://www.matichon.co.th/local/quality-life/news_4030854",
  },
  quit1600: {
    id: "quit1600", kind: "hotline", name: "สายเลิกบุหรี่", number: "1600",
    desc: "ปรึกษาเรื่องบุหรี่และบุหรี่ไฟฟ้า",
    when: "เมื่ออยากลดหรือเลิก แต่ทำคนเดียวไม่ไหว",
    verified: false,
    source: "ต้องยืนยันกับศูนย์บริการเลิกบุหรี่ทางโทรศัพท์แห่งชาติ — https://www.thairath.co.th/news/local/2877702",
  },
  drug1165: {
    id: "drug1165", kind: "hotline", name: "สายด่วนบำบัดยาเสพติด", number: "1165",
    desc: "ปรึกษาเรื่องสารเสพติดและการบำบัด",
    when: "เมื่อใช้สารเสพติดแล้วหยุดเองไม่ได้",
    verified: false,
    source: "ต้องยืนยันกับกรมการแพทย์ — ยังไม่พบแหล่งยืนยันจากการค้นรอบแรก",
  },
} as const satisfies Record<string, Resource>;

export type ResourceId = keyof typeof R;
export const RESOURCES: Record<ResourceId, Resource> = R;

/**
 * lead = ประโยคนำฝั่งนักเรียน
 * ห้ามตีตรา ห้ามสรุปว่าเขา "เป็น" หรือ "ติด" อะไร พูดถึงเรื่อง ไม่พูดถึงตัวเขา
 */
export const DOMAIN_HELP: Record<DomainId, { lead: string; resources: ResourceId[] }> = {
  academic_pressure: {
    lead: "เรื่องเรียนกดดันได้มากกว่าที่คนรอบตัวมองเห็น ไม่จำเป็นต้องแบกคนเดียว",
    resources: ["counselor", "mh1323"],
  },
  bullying: {
    lead: "ไม่มีใครควรถูกแกล้งหรือถูกทำให้อาย ไม่ว่าต่อหน้าหรือในออนไลน์ เรื่องนี้ไม่ใช่ความผิดของเธอ",
    resources: ["counselor", "child1387", "mh1323"],
  },
  online_threat: {
    lead: "ถ้ามีคนข่มขู่ เร่งให้โอนเงิน หรือสั่งว่าห้ามบอกใคร นั่นคือวิธีที่มิจฉาชีพใช้ ไม่ใช่ความผิดของเธอ และยังแก้ไขทัน",
    resources: ["aoc1441", "counselor", "mh1323"],
  },
  vaping_alcohol: {
    lead: "ถ้าอยากคุยเรื่องบุหรี่ไฟฟ้า เหล้า หรือสารอื่น ๆ มีคนที่รับฟังโดยไม่ดุและไม่ตัดสิน",
    resources: ["counselor", "quit1600", "alc1413", "drug1165", "mh1323"],
  },
  gambling: {
    lead: "เรื่องเงินกับการเล่นได้เสียทำให้เครียดได้มาก มีคนที่คุยเรื่องนี้ได้โดยไม่ตัดสิน",
    resources: ["mh1323", "counselor"],
  },
  family_violence: {
    lead: "ทุกคนมีสิทธิ์รู้สึกปลอดภัยในบ้านของตัวเอง ถ้าที่บ้านทำให้กลัวหรือเจ็บ มีคนที่ช่วยได้",
    resources: ["counselor", "social1300", "child1387", "mh1323", "ems1669"],
  },
  sleep: {
    lead: "การนอนที่รวนทำให้ทุกเรื่องหนักขึ้นกว่าเดิม เรื่องนี้มีคนช่วยดูได้",
    resources: ["counselor", "mh1323"],
  },
  relationship: {
    lead: "เรื่องความสัมพันธ์เจ็บได้จริง มีคนที่พร้อมฟังโดยไม่ตัดสิน",
    resources: ["counselor", "mh1323"],
  },
};

/** production แสดงเฉพาะช่องทางที่ยืนยันแล้ว — dev เห็นทั้งหมดพร้อมป้าย "รอยืนยัน" */
export const SHOW_UNVERIFIED = process.env.NODE_ENV !== "production";

export function resourcesFor(domain: DomainId, includeUnverified = SHOW_UNVERIFIED): Resource[] {
  return DOMAIN_HELP[domain].resources
    .map((id) => RESOURCES[id])
    .filter((r) => r.verified || includeUnverified);
}

export const domainTag = (id: DomainId) => DOMAIN_INFO[id].tag;
