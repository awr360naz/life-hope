// NOTE: استخدم امتداد .js في مسارات الاستيراد لأنك تعمل ESM/NodeNext
import { Router } from "express";
import { supabase } from "../supabaseClient.js";

const router = Router();
const ALLOWED_CATEGORIES = new Set(["health", "christian"]);

/** GET /api/content/quizzes
 *  يرجّع فهرس الكويزات (لصفحة /quiz أو /quizzes/:category)
 *  يدعم ?category=health|christian
 */
router.get("/", async (req, res) => {
  try {
    const catRaw = typeof req.query.category === "string" ? req.query.category.toLowerCase() : null;
    const hasCategory = catRaw && ALLOWED_CATEGORIES.has(catRaw);

    let query = supabase
      .from("quizzes")
      .select("id, slug, title, subtitle, cover_url, category, created_at")
      .eq("published", true)
      .order("created_at", { ascending: false });

    if (hasCategory) query = query.eq("category", catRaw);

    const { data, error } = await query;
    if (error) return res.status(500).json({ ok: false, error: error.message });

    return res.json({ ok: true, items: data ?? [] });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
});

/** GET /api/content/quizzes/:slug
 *  يرجّع كويز واحد مع الأسئلة والخيارات (لصفحة /quiz/:slug)
 *  (نقيّد بالمنشور فقط)
 */
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: quiz, error: qErr } = await supabase
      .from("quizzes")
      .select("id, slug, title, subtitle, category, cover_url")
      .eq("slug", slug)
      .eq("published", true)
      .single();

    if (qErr) return res.status(404).json({ ok: false, error: qErr.message || "Quiz not found" });
    if (!quiz) return res.status(404).json({ ok: false, error: "Quiz not found" });

    const { data: questions, error: qqErr } = await supabase
      .from("quiz_questions")
      .select("id, body, order_index")
      .eq("quiz_id", quiz.id)
      .order("order_index", { ascending: true });

    if (qqErr) return res.status(500).json({ ok: false, error: qqErr.message });

    const qIds = (questions ?? []).map((q) => q.id);
    let options = [];

    if (qIds.length) {
      const { data: opts, error: qoErr } = await supabase
        .from("quiz_options")
        .select("id, question_id, label, is_correct, order_index")
        .in("question_id", qIds)
        .order("order_index", { ascending: true });

      if (qoErr) return res.status(500).json({ ok: false, error: qoErr.message });
      options = opts ?? [];
    }

    const withOptions = (questions ?? []).map((q) => ({
      ...q,
      options: options.filter((o) => o.question_id === q.id),
    }));

    return res.json({ ok: true, quiz: { ...quiz, questions: withOptions } });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
});

export default router;
