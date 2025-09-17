// backend/src/routes/homeThirdFrame.ts
import { Router } from "express";
import { supabase } from "../supabaseClient.js";

const router = Router();

// helper بسيط لقراءة ?sort= (افتراضي 0)
function toInt(n: any, fallback = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

router.get("/", async (req, res) => {
  try {
    const rawSort = String(req.query.sort ?? "0");
    const sortNum = toInt(rawSort, 0);

    // نرجّع الأعمدة المستخدمة سابقًا، ونفلتر على published=true فقط
    const { data, error } = await supabase
      .from("home_third_frame_items")
      .select("id, title, body, hero_url, images, sort, published, updated_at")
      .eq("published", true)
      .order("sort", { ascending: true })  // إذا sort موجود
      .order("id", { ascending: true });   // fallback ثابت

    if (error) {
      console.error("[home-third-frame] DB_ERROR:", error);
      return res.status(500).json({ ok: false, error: "DB_ERROR" });
    }

    const rows = data ?? [];
    if (!rows.length) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    // clamp على الطول: نفس السلوك القديم (?sort=0..n-1)
    const pick = Math.max(0, Math.min(sortNum, rows.length - 1));
    const r = rows[pick];

    const content = {
      id: r.id,
      title: r.title ?? "",
      body: r.body ?? "",           // ← الأهم: نقرأ من body، مش text
      hero_url: r.hero_url ?? null,
      images: r.images ?? null,
      sort: typeof r.sort === "number" ? r.sort : 0,
      updated_at: r.updated_at ?? null,
    };

    console.log(`[home-third-frame] rows=${rows.length} sort=${sortNum} pick=${pick} id=${r.id}`);
    return res.json({ ok: true, content });
  } catch (e: any) {
    console.error("homeThirdFrame error:", e);
    return res.status(500).json({ ok: false, error: "INTERNAL_ERROR" });
  }
});

export default router;
