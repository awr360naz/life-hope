import { Router } from "express";
import { getSupabase } from "../supabaseClient.js";

const router = Router();

router.get("/api/content/categories", async (req, res) => {
  try {
    const drafts = String(req.query.drafts || "") === "1";
    const supabase = getSupabase();

    let q = supabase
      .from("articles")
      .select("id, title, category, cover_url, image_url, published");

    if (!drafts) q = q.eq("published", true);

    const { data, error } = await q;
    if (error) throw error;

    const map = new Map<string, { name: string; count: number; image: string }>();
    for (const a of data ?? []) {
      const name = String(a.category ?? "").replace(/<[^>]*>/g, "").trim() || "غير مصنّف";
      if (!map.has(name)) {
        map.set(name, {
          name,
          count: 0,
          image:
            (a as any).cover_url ||
            (a as any).image_url ||
            `https://placehold.co/600x360?text=${encodeURIComponent(name)}`,
        });
      }
      const rec = map.get(name)!;
      rec.count += 1;
      if (rec.image.includes("placehold.co") && ((a as any).cover_url || (a as any).image_url)) {
        rec.image = (a as any).cover_url || (a as any).image_url;
      }
    }

    const order = ["لاهوت", "صحة"];
    const out = Array.from(map.values()).sort((a, b) => {
      const ia = order.indexOf(a.name), ib = order.indexOf(b.name);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      return a.name.localeCompare(b.name, "ar");
    });

    res.json({ ok: true, categories: out });
  } catch (err) {
    console.error("ERR /api/content/categories:", err);
    res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

export default router;
