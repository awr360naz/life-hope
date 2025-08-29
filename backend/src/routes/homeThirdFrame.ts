// backend/src/routes/homeThirdFrame.ts
import { Router } from "express";
import { supabase } from "../supabaseClient.js";

const router = Router();

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d as any) - (yearStart as any)) / 86400000 + 1) / 7);
}

router.get("/", async (req, res) => {
  try {
    const qWeek = (req.query.week as string) || "";
    let weekIndex = /^\d{4}-\d{1,2}$/.test(qWeek) ? Number(qWeek.split("-")[1]) : getISOWeek(new Date());

    // 🔧 ملاحظة مهمة:
    // - نرجّع الأعمدة كلها اللي نحتاجها (ضمنها is_published)
    // - نخفف الفلتر ليستوعب NULL (لو موجودة بيانات قديمة)
    // - نرتّب على id بدل created_at لتفادي أعمدة ناقصة
    const { data: all, error } = await supabase
      .from("home_third_frame_items")
      .select("id, title, body, image_url, is_published")
      .or("is_published.is.null,is_published.eq.true")
      .order("id", { ascending: true });

    if (error) {
      console.error("Supabase error (third-frame):", error.message);
      return res.status(500).json({ error: error.message });
    }

    if (!all || all.length === 0) {
      return res.status(404).json({ error: "No items available" });
    }

    const idx = weekIndex % all.length;
    const item = all[idx];
    console.log(`[homeThirdFrame] rows=${all.length} weekIndex=${weekIndex} pick=${idx} id=${item?.id}`);
    res.json({ ok: true, item, count: all.length, weekIndex });
  } catch (e: any) {
    console.error("homeThirdFrame error:", e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

export default router;
