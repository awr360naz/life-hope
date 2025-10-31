// backend/src/routes/sabbathRoutes.ts
import { Router, type Request, type Response } from "express";
import { getSupabase } from "../supabaseClient.js";

const router = Router();

function err(res: Response, code: number, msg: string) {
  return res.status(code).json({ ok: false, error: msg });
}

/**
 * GET /api/content/sabbath-lessons
 * يعيد قائمة الدروس (الكروت الرئيسية)
 */
router.get("/sabbath-lessons", async (_req: Request, res: Response) => {
  const supa = getSupabase();
  const { data, error } = await supa
    .from("sabbath_lessons")
    .select("slug,title,subtitle,image,sort_num,created_at,published")
    .eq("published", true)
    .order("sort_num", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return err(res, 500, error.message);
  res.json({ ok: true, items: data });
});

router.get("/sabbath-weeks/:weekSlug/meta", async (req: Request, res: Response) => {
  const supa = getSupabase();

  const { data, error } = await supa
    .from("sabbath_weeks")
    .select("slug, note")
    .eq("slug", req.params.weekSlug)
    .limit(1)
    .maybeSingle();

  if (error) return err(res, 500, error.message);
  if (!data) return err(res, 404, "not_found");

  res.json({ ok: true, item: data });
});

/**
 * GET /api/content/sabbath-lessons/:lessonSlug
 * يعيد بيانات درس محدد (للعنوان في الأعلى + الوصف القصير + الطويل للبوب-أب)
 */
router.get("/sabbath-lessons/:lessonSlug", async (req: Request, res: Response) => {
  const supa = getSupabase();
  const { data, error } = await supa
    .from("sabbath_lessons")
    .select("slug,title,short_desc,long_desc,published")
    .eq("slug", req.params.lessonSlug)
    .limit(1)
    .maybeSingle();

  if (error) return err(res, 500, error.message);
  if (!data || data.published === false) return err(res, 404, "not_found");
  res.json({ ok: true, item: data });
});

/**
 * GET /api/content/sabbath-lessons/:lessonSlug/weeks
 * يعيد أسابيع الدرس (مثال: 11 أكتوبر – 17 أكتوبر)
 */
router.get("/sabbath-lessons/:lessonSlug/weeks", async (req: Request, res: Response) => {
  const supa = getSupabase();

  const L = await supa
    .from("sabbath_lessons")
    .select("id")
    .eq("slug", req.params.lessonSlug)
    .eq("published", true)
    .limit(1)
    .maybeSingle();
  if (L.error) return err(res, 500, L.error.message);
  if (!L.data) return err(res, 404, "lesson_not_found");

  const { data, error } = await supa
    .from("sabbath_weeks")
    .select("slug,subtitle,image,note,order_index,published,created_at")
    .eq("lesson_id", L.data.id)
    .eq("published", true)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return err(res, 500, error.message);
  res.json({ ok: true, items: data });
});

/**
 * GET /api/content/sabbath-weeks/:weekSlug/items
 * يعيد كروت عناصر الأسبوع (image,title,subtitle)
 */
router.get("/sabbath-weeks/:weekSlug/items", async (req: Request, res: Response) => {
  const supa = getSupabase();

  const W = await supa
    .from("sabbath_weeks")
    .select("id")
    .eq("slug", req.params.weekSlug)
    .eq("published", true)
    .limit(1)
    .maybeSingle();
  if (W.error) return err(res, 500, W.error.message);
  if (!W.data) return err(res, 404, "week_not_found");

  const { data, error } = await supa
    .from("sabbath_items")
    .select("slug,title,subtitle,image,order_index,published,created_at")
    .eq("week_id", W.data.id)
    .eq("published", true)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return err(res, 500, error.message);
  res.json({ ok: true, items: data });
});

/**
 * GET /api/content/sabbath-items/:itemSlug
 * يعيد بيانات عنصر مفصّل (لصفحة “عبور نهر الأردن” مثلاً)
 */
router.get("/sabbath-items/:itemSlug", async (req: Request, res: Response) => {
  const supa = getSupabase();
  const { data, error } = await supa
    .from("sabbath_items")
    .select("slug,title,subtitle,image,content,published")
    .eq("slug", req.params.itemSlug)
    .limit(1)
    .maybeSingle();

  if (error) return err(res, 500, error.message);
  if (!data || data.published === false) return err(res, 404, "not_found");
  res.json({ ok: true, item: data });
});

/**
 * GET /api/content/sabbath-weeks/:weekSlug/neighbors?item=:itemSlug
 * السابق/التالي داخل نفس الأسبوع
 */
router.get("/sabbath-weeks/:weekSlug/neighbors", async (req: Request, res: Response) => {
  const supa = getSupabase();
  const itemSlug = String(req.query.item || "");

  const W = await supa
    .from("sabbath_weeks")
    .select("id")
    .eq("slug", req.params.weekSlug)
    .eq("published", true)
    .limit(1)
    .maybeSingle();
  if (W.error) return err(res, 500, W.error.message);
  if (!W.data) return err(res, 404, "week_not_found");

  const { data, error } = await supa
    .from("sabbath_items")
    .select("slug,title,order_index,created_at,published")
    .eq("week_id", W.data.id)
    .eq("published", true)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return err(res, 500, error.message);

  const idx = data.findIndex(d => d.slug === itemSlug);
  const prev = idx > 0 ? { slug: data[idx - 1].slug, title: data[idx - 1].title } : null;
  const next = idx >= 0 && idx < data.length - 1 ? { slug: data[idx + 1].slug, title: data[idx + 1].title } : null;

  res.json({ ok: true, prev, next });
});

export default router;
