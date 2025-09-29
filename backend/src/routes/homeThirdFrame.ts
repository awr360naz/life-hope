// backend/src/routes/homeThirdFrame.ts
import { Router } from "express";
import { getSupabase } from "../supabaseClient.js";

const router = Router();

function toIsoOrNull(v: unknown): string | null {
  if (!v) return null;
  try {
    const s = String(v).trim();
    // يسمح بـ "2025-09-26T11:30:01+03:00" وينقلها لـ UTC
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

// تنظيف خفيف: إزالة تكرارات المسافات وتصحيح "https s://"
function cleanContent<T extends { body?: string | null; hero_url?: string | null }>(row: T): T {
  const fix = { ...row };
  if (typeof fix.body === "string") {
    // وحّد الأسطر وعالج مسافات مكررة أخطاء لصق
    fix.body = fix.body
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/[ \t]*\n[ \t]*/g, "\n")
      .trim();
  }
  if (typeof fix.hero_url === "string") {
    fix.hero_url = fix.hero_url.replace(/\s+/g, "").replace(/^httpss:\/\//i, "https://");
    // كمان يصلّح "https s://" (بمسافة)
    fix.hero_url = fix.hero_url.replace(/^https:\/\/g+/, "https://g"); // لو صار تكرار g
  }
  return fix;
}

router.get("/", async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ ok: false, error: "Supabase not configured" });

  try {
    const atISO = toIsoOrNull(req.query.at);
    const debug = String(req.query.debug ?? "") === "1";

    // قاعدة: رجّع أحدث صف منشور قبل/حتى updated_at <= at
    // إن لم يُمرَّر at، رجّع أحدث منشور إطلاقًا.
    let q = sb
      .from("home_third_frame_items")
      .select("id, title, body, hero_url, images, sort, published, updated_at")
      .eq("published", true);

    if (atISO) q = q.lte("updated_at", atISO);

    q = q.order("updated_at", { ascending: false }).limit(1);

    const { data, error } = await q;
    if (error) throw error;

    // fallback: إذا ما لقيناش قبل الحدّ، رجّع أحدث منشور (مفيد لو الحد أقدم من أول نشر)
    let row = (data ?? [])[0];
    if (!row && atISO) {
      const { data: latest, error: err2 } = await sb
        .from("home_third_frame_items")
        .select("id, title, body, hero_url, images, sort, published, updated_at")
        .eq("published", true)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (err2) throw err2;
      row = (latest ?? [])[0] || null;
    }

    if (!row) return res.json({ ok: true, content: null });

    const content = cleanContent(row);

    if (debug) {
      return res.json({
        ok: true,
        content,
        _debug: {
          at: atISO,
          now: new Date().toISOString(),
          queryUsedLTE: Boolean(atISO),
        },
      });
    }

    res.json({ ok: true, content });
  } catch (e: any) {
    console.error("[home-third-frame] error:", e);
    res.status(500).json({ ok: false, error: e?.message || "Unknown error" });
  }
});

export default router;
