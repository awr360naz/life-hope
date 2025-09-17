// backend/src/routes/articles.ts (ESM)
import { Router } from "express";
import { getSupabase } from "../supabaseClient.js";

const router = Router();

/**
 * GET /api/content/articles
 * إرجاع جميع المقالات (افتراضيًا المنشورة فقط)
 */
router.get("/api/content/articles", async (req, res) => {
  res.setHeader("x-handler", "articles.ts:all-articles");
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ ok: false, error: "Supabase not configured" });

  try {
    const drafts = String(req.query.drafts || "") === "1";

    let q = sb
      .from("articles")
      .select("id, slug, title, cover_url, category, created_at, published")
      .order("created_at", { ascending: false });

    if (!drafts) q = q.eq("published", true);

    const { data, error } = await q;
    if (error) throw error;

    const items = (data ?? []).map((a: any) => ({
      id: a.id,
      slug: (a.slug ?? "").toString().trim(),
      title: (a.title ?? "").toString().trim(),
      cover_url: typeof a.cover_url === "string" ? a.cover_url.trim() : null,
      category: (a.category ?? "").toString().trim(),
      created_at: a.created_at,
    }));

    return res.json({ ok: true, items });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

/**
 * GET /api/content/articles-by-category/:name
 * إرجاع مقالات تصنيف معيّن
 */
router.get("/api/content/articles-by-category/:name", async (req, res) => {
  res.setHeader("x-handler", "articles.ts:articles-by-category");
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ ok: false, error: "Supabase not configured" });

  try {
    const raw = String(req.params.name || "");
    const name = decodeURIComponent(raw).trim();

    const drafts = String(req.query.drafts || "") === "1";

    let q = sb
      .from("articles")
      .select("id, slug, title, cover_url, category, created_at, published")
      .eq("category", name)
      .order("created_at", { ascending: false });

    if (!drafts) q = q.eq("published", true);

    const { data, error } = await q;
    if (error) throw error;

    const items = (data ?? []).map((a: any) => ({
      id: a.id,
      slug: (a.slug ?? "").toString().trim(),
      title: (a.title ?? "").toString().trim(),
      cover_url: typeof a.cover_url === "string" ? a.cover_url.trim() : null,
      category: (a.category ?? "").toString().trim(),
      created_at: a.created_at,
    }));

    return res.json({ ok: true, category: name, items });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

/**
 * GET /api/content/articles/:slug
 * تفاصيل مقال واحد حسب الـ slug
 */
// GET /api/content/articles/:slug
// GET /api/content/articles/:slug  → يرجّع عمود content كما هو
router.get("/api/content/articles/:slug", async (req, res) => {
  res.setHeader("x-handler", "articles.ts:article-detail");
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ ok: false, error: "Supabase not configured" });

  try {
    const slug = decodeURIComponent(String(req.params.slug || "")).trim();
    if (!slug) return res.status(400).json({ ok: false, error: "Missing slug" });

    const drafts = String(req.query.drafts || "") === "1";

    let q = sb
      .from("articles")
      .select("id, slug, title, content, cover_url, category, created_at, published")
      .eq("slug", slug);

    if (!drafts) q = q.eq("published", true);

    const { data, error } = await q.single(); // خلي .single() آخر خطوة
    if (error || !data) {
      return res.status(404).json({ ok: false, error: "Article not found", slug });
    }

    return res.json({
      ok: true,
      article: {
        id: data.id,
        slug: data.slug,
        title: data.title,
        content: data.content ?? "",     // <-- أهم سطر
        cover_url: data.cover_url ?? null,
        category: data.category ?? "",
        created_at: data.created_at,
        published: !!data.published,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});



export default router;
