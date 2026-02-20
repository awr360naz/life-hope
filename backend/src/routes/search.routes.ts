
import { Router, Request, Response } from "express";
import { getSupabase } from "../supabaseClient.js";

const router = Router();


const AR_TATWEEL = /\u0640/g;
const AR_DIACRITICS = /[\u064B-\u065F\u0670]/g;
const norm = (s: string) =>
  (s || "")
    .replace(AR_TATWEEL, "")
    .replace(AR_DIACRITICS, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ؤ|ئ/g, "ء")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim();


const stripHtml = (s: string) =>
  (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();


const coverFrom = (r: any) => {
  const direct =
    r?.cover_url ??
    r?.thumbnail_url ??
    r?.thumb_url ??
    r?.image_url ??
    r?.poster_url ??
    r?.banner_url ??
    r?.img ??
    r?.image ??
    r?.preview_url ??
    r?.preview ??
    r?.thumbnail ??
    r?.thumb ??
    r?.poster ??
    null;

  if (direct) return direct;

 
  for (const v of Object.values(r || {})) {
    if (typeof v !== "string") continue;
    const s = v.trim();
    if (!s) continue;
    if (
      s.startsWith("http") &&
      (s.includes(".jpg") ||
        s.includes(".jpeg") ||
        s.includes(".png") ||
        s.includes(".webp") ||
        s.includes("supabase.co/storage"))
    ) {
      return s;
    }
  }
  return null;
};

type ResultType = "article" | "program" | "short" | "cami" | "quiz";

function extractYouTubeId(raw: string = ""): string {
  if (!raw) return "";
 
  if (/^[a-zA-Z0-9_-]{10,15}$/.test(raw)) return raw;

  try {
    const u = new URL(raw);
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.split("/")[1] || "";
    }
    if (u.pathname.startsWith("/shorts/")) {
      return u.pathname.split("/")[2] || "";
    }
    const v = u.searchParams.get("v");
    if (v) return v;
  } catch {
    
  }

  const m = raw.match(
    /[?&]v=([^&#]+)|youtu\.be\/([^?#/]+)|shorts\/([^?#/]+)/
  );
  return m ? (m[1] || m[2] || m[3]) : "";
}
function youtubeIdFromRecord(r: any): string {
  if (!r) return "";
  
  for (const v of Object.values(r)) {
    if (typeof v !== "string") continue;
    if (!v) continue;
    if (v.includes("youtube.com") || v.includes("youtu.be") || v.includes("shorts/")) {
      const id = extractYouTubeId(v);
      if (id) return id;
    }
  }
  return "";
}
function expandSearchPatterns(rawQ: string): string[] {
  const variants = new Set<string>();
  const trimmed = rawQ.trim();
  if (!trimmed) return [];


  const qNorm = norm(trimmed);
  variants.add(trimmed);
  variants.add(qNorm);

  
  const taToHa = trimmed.replace(/ة(\s|$)/g, "ه$1");
  variants.add(taToHa);
  const haToTa = trimmed.replace(/ه(\s|$)/g, "ة$1");
  variants.add(haToTa);

  
  variants.add(trimmed.replace(/[أإآ]/g, "ا"));


  variants.add(trimmed.replace(/\bا/g, "أ"));

 
  variants.add(trimmed.replace(/ى/g, "ي"));
  variants.add(trimmed.replace(/ي/g, "ى"));


  const final = Array.from(variants)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);


  return Array.from(new Set(final)).map((s) => `%${s}%`);
}


router.get("/search", async (req: Request, res: Response) => {
  const supabase = getSupabase();
  const rawQ = (req.query.q ?? "").toString().trim();
  const limit = Math.min(
    parseInt((req.query.limit ?? "20") as string, 10) || 20,
    50
  );
  const debug = String(req.query.debug || "") === "1";

  const qNorm = norm(rawQ);
  const pats = expandSearchPatterns(rawQ);


  const dbg: any = { q: rawQ, pats, steps: [], errors: [] };

  if (!rawQ || !supabase) {
    if (debug)
      return res.json({
        ...dbg,
        note: "no query or no supabase",
        results: [],
      });
    return res.json([]);
  }

  const mapRecord = (r: any, type: ResultType) => {
  
 let title = r?.title ?? "";
if (!title && type === "program") {
  title =
    r?.name ||
    r?.name_ar ||
    r?.title_ar ||
    r?.program_name ||
    r?.program_title ||
    "";
}


    const rawText =
      (typeof r?.excerpt === "string" && r.excerpt) ||
      (typeof r?.description === "string" && r.description) ||
      (typeof r?.content_html === "string" && stripHtml(r.content_html)) ||
      (typeof r?.content === "string" && stripHtml(r.content)) ||
      "";

    let snippet = rawText.slice(0, 160);

    if (title && snippet.startsWith(title)) {
      snippet = snippet.slice(title.length).trim();
    }


    const base: any = {
      ...r,
      id: r?.id ?? null,
      type,
      slug: r?.slug ?? null,
      title,
      snippet,
      cover_url: coverFrom(r),
      created_at: r?.created_at ?? r?.published_at ?? null,
      url: null as string | null,
      category: "",
    };


    if (type === "short" || type === "cami") {
      if (!base.youtube_id) {
        const yRaw =
          r?.youtube_id ||
          r?.youtube_url ||
          r?.url ||
          r?.video_url ||
          r?.short_url ||
          r?.id ||
          r?.slug ||
          "";
        let yid = extractYouTubeId(String(yRaw));
        if (!yid) {
         
          yid = youtubeIdFromRecord(r);
        }
        if (yid) {
          base.youtube_id = yid;
        }
      }

      if (!base.cover_url && base.youtube_id) {
        base.cover_url = `https://i.ytimg.com/vi/${base.youtube_id}/hqdefault.jpg`;
      }
    }



    switch (type) {
      case "article":
        base.category = "مقال";
        base.url = base.slug
          ? `/articles/${base.slug}`
          : base.id
          ? `/articles/${base.id}`
          : null;
        break;

      case "program":
        base.category = "برامجنا";
        base.url = base.slug
          ? `/programs/${base.slug}`
          : base.id
          ? `/programs/${base.id}`
          : null;
        break;

      case "short":
        base.category = "مقاطع قصيرة";
        // مهم: مسار صفحة الفقرات القصيرة عندك هو /shorts
        base.url = base.id ? `/shorts?focus=${base.id}` : null;
        break;

      case "cami":
        base.category = "نبوّات كامي";
        base.url = base.id ? `/cami-prophecies?video=${base.id}` : null;
        break;

      case "quiz":
        base.category = "اختبار";
        base.url = base.slug
          ? `/quiz/${base.slug}`
          : base.id
          ? `/quiz/${base.id}`
          : null;
        break;
    }

    return base;
  };

async function tryIlike(table: string, field: string, type: ResultType) {
  try {
    let acc: any[] = [];
    for (const p of pats) {
      // شلنا .order("created_at") عشان ما نوقع لو الجدول ما فيه هيك عمود
      const r = await supabase
        .from(table)
        .select("*")
        .ilike(field, p);

      if (r.error) throw r.error;
      acc = acc.concat(r.data || []);
    }

    dbg.steps.push({ table, field, count: acc.length });
    return acc.map((x) => mapRecord(x, type));
  } catch (e: any) {
    dbg.errors.push({
      table,
      field,
      message: String(e?.message || e),
    });
    return [];
  }
}


  let articles: any[] = [];
  let programs: any[] = [];
  let shorts: any[] = [];
  let cami: any[] = [];
  let quizzes: any[] = [];

  // === مقالات: فقط العنوان ===
  articles = articles.concat(await tryIlike("articles", "title", "article"));

const programFields = [
  "title",
  "name",
  "name_ar",
  "title_ar",
  "program_name",
  "program_title",
  // شلنا description و content عشان ما نبحثش في نص الحلقة
];

for (const field of programFields) {
  const found = await tryIlike("programs_catalog", field, "program");
  programs = programs.concat(found);
}





  // مقاطع قصيرة
  shorts = shorts.concat(
    await tryIlike("short_segments", "title", "short")
  );
  if (shorts.length === 0) {
    shorts = shorts.concat(
      await tryIlike("short_segments", "description", "short")
    );
  }

  // كامي
  cami = cami.concat(await tryIlike("cami_videos", "title", "cami"));
  if (cami.length === 0) {
    cami = cami.concat(
      await tryIlike("cami_videos", "description", "cami")
    );
  }

  // كويز
  quizzes = quizzes.concat(await tryIlike("quizzes", "title", "quiz"));
  if (quizzes.length === 0) {
    quizzes = quizzes.concat(
      await tryIlike("quizzes", "description", "quiz")
    );
  }

  let merged: any[] = [
    ...articles,
    ...programs,
    ...shorts,
    ...cami,
    ...quizzes,
  ];

  // 🧹 إزالة التكرار: نفس (type + id + slug) ما يرجعش أكثر من مرة
  const seen = new Set<string>();
  merged = merged.filter((item) => {
    const key = `${item.type}-${item.id ?? ""}-${item.slug ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const qLower = rawQ.toLowerCase();
  merged = merged
    .sort((a, b) => {
      const at = (a.title || "").toLowerCase().includes(qLower) ? 0 : 1;
      const bt = (b.title || "").toLowerCase().includes(qLower) ? 0 : 1;
      if (at !== bt) return at - bt;

      const ad = String(a.created_at || "");
      const bd = String(b.created_at || "");
      if (ad !== bd) return bd.localeCompare(ad);

      return (a.title || "").localeCompare(b.title || "", "ar");
    })
    .slice(0, limit);


  return debug
    ? res.json({
        ...dbg,
        counts: { merged: merged.length },
        results: merged,
      })
    : res.json(merged);
});

export default router;
