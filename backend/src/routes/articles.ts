// backend/src/routes/articles.ts (ESM)
import { Router } from "express";
import { getSupabase } from "../supabaseClient.js";

const router = Router();

/**
 * GET /api/content/articles
 * قائمة المقالات المنشورة
 */
router.get("/", async (_req, res) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("articles")
    .select("id, slug, title, cover_url, category, created_at, published")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json(Array.isArray(data) ? data : []);
});

/**
 * GET /api/content/articles/:slug
 * تفاصيل مقال واحد منشور
 */
// تفاصيل مقال: GET /api/content/articles/:slug
// GET /api/content/articles/:slug
router.get("/:slug", async (req, res) => {
  const raw = (req.params.slug ?? "").toString();
  const slug = decodeURIComponent(raw).trim();
  if (!slug) return res.status(400).json({ ok: false, error: "MISSING_SLUG" });

  const SELECT = "id, slug, title, body, content, cover_url, category, created_at, updated_at, published";

  const { data, error } = await getSupabase()
    .from("articles")
    .select(SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error) return res.status(500).json({ ok: false, error: error.message });
  if (!data || data.published !== true) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

res.json({ ok: true, article: data });

});



export default router;
