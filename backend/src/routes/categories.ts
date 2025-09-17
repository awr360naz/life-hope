// backend/src/routes/categories.ts
import { Router } from "express";
import { getSupabase } from "../supabaseClient.js";

const router = Router();

/**
 * GET /api/content/categories
 * يرجّع: [{ id, name, slug, cover_url }]
 */
router.get("/api/content/categories", async (req, res) => {
  res.setHeader("x-handler", "categories.ts");
  const sb = getSupabase();
  if (!sb) {
    return res
      .status(500)
      .json({ ok: false, error: "Supabase not configured (env missing)" });
  }

  try {
    const { data, error } = await sb
      .from("categories")
      .select("id, name, slug, cover_url, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const items = (data ?? []).map((c: any) => ({
      id: c.id,
      name: (c.name ?? "").toString().trim(),
      slug: (c.slug ?? "").toString().trim(),
      cover_url:
        typeof c.cover_url === "string" && /^https?:\/\//i.test(c.cover_url)
          ? c.cover_url.trim()
          : null,
    }));

    return res.json({ ok: true, items });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

export default router;
