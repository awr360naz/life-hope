// backend/src/routes/programsToday.routes.ts
import { Router, type Request, type Response } from "express";
import { getSupabase } from "../supabaseClient.js";

type Item = { time: string; title: string };

const router = Router();

// sun..sat لاختيار اليوم الحالي حسب Asia/Jerusalem
const WD_TEXT = ["sun","mon","tue","wed","thu","fri","sat"];
function todayKeyTZ(tz = "Asia/Jerusalem") {
  const d = new Date();
  const wd = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: tz })
    .format(d).toLowerCase().slice(0,3);
  const idx = WD_TEXT.indexOf(wd);
  return { wd, idx: idx < 0 ? 0 : idx };
}

function safeParseItems(items: unknown): Item[] {
  if (!items) return [];
  if (Array.isArray(items)) return items as Item[];
  if (typeof items === "string") { try { return JSON.parse(items); } catch {} }
  return [];
}

function hhmmToMinutes(s: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s || "");
  if (!m) return -1;
  const h = +m[1], mm = +m[2];
  return h*60 + mm;
}

function pickNowNext(items: Item[], tz = "Asia/Jerusalem") {
  const nowStr = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz,
  }).format(new Date());
  const nowMin = hhmmToMinutes(nowStr);
  let nowIdx = -1;
  for (let i=0;i<items.length;i++){
    const t = hhmmToMinutes(items[i]?.time || "");
    if (t !== -1 && t <= nowMin) nowIdx = i;
  }
  return {
    now: nowIdx >= 0 ? items[nowIdx] : null,
    next: nowIdx >= 0 && nowIdx+1 < items.length ? items[nowIdx+1] : null,
    nowStr
  };
}

// === اليوم فقط: يرجع items + now/next من جدول programs
router.get("/today", async (_req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ ok:false, error:"supabase_missing" });

  const { wd, idx } = todayKeyTZ();

  try {
    // جرّب day كنص
    let { data, error } = await sb
      .from("programs")
      .select("day,title,items,notes,updated_at")
      .eq("day", wd)
      .limit(1);
    if (error) throw error;

    // لو مفيش، جرّب day كرقم
    if (!data || data.length === 0) {
      const r2 = await sb
        .from("programs")
        .select("day,title,items,notes,updated_at")
        .eq("day", idx)
        .limit(1);
      if (r2.error) throw r2.error;
      data = r2.data || [];
    }

    if (!data || data.length === 0) {
      console.warn("[programs.today] no row", { wd, idx });
      return res.json({ ok:true, items:[], now:null, next:null, day: wd });
    }

    const row = data[0];
    const items = safeParseItems(row.items)
      .filter(it => it && typeof it.time === "string" && typeof it.title === "string");

    const picked = pickNowNext(items);
    return res.json({
      ok: true,
      day: row.day,
      title: row.title ?? null,
      notes: row.notes ?? null,
      updated_at: row.updated_at ?? null,
      items,
      ...picked
    });
  } catch (e:any) {
    console.error("[programs.today] error", e?.message || e);
    return res.status(500).json({ ok:false, error: String(e?.message || e) });
  }
});

// === الأسبوع كامل (لو بدك جدول الأسبوع)
router.get("/weekly", async (_req: Request, res: Response) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ ok:false, error:"supabase_missing" });
  try {
    const { data, error } = await sb
      .from("programs")
      .select("day,title,items,notes,updated_at")
      .order("day", { ascending: true });
    if (error) throw error;

    const weekly = (data || []).map(r => ({
      ...r,
      items: safeParseItems(r.items).filter((it:any)=>it?.time && it?.title),
    }));
    res.json({ ok:true, weekly });
  } catch(e:any){
    console.error("[programs.weekly] error", e?.message || e);
    res.status(500).json({ ok:false, error:String(e?.message || e) });
  }
});

export default router;
