// backend/src/routes/articles.ts
import { Router } from "express";
import { getSupabase } from "../supabaseClient.js";
const router = Router();

router.get("/api/content/articles", async (_req, res) => {
  const sb = getSupabase();
  const { data, error } = await sb.from("articles")
    .select("id, slug, title, cover_url")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get("/api/content/articles/:slug", async (req, res) => {
  const sb = getSupabase();
  const { slug } = req.params;
  const { data, error } = await sb.from("articles")
    .select("id, slug, title, cover_url, content")
    .eq("slug", slug)
    .single();
  if (error) return res.status(404).json({ error: "Article not found" });
  res.json(data);
});

export default router;
