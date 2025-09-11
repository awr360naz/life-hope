// backend/src/server.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import articlesRouter from "./routes/articles.js";
import { getSupabase } from "./supabaseClient.js";
import type { Request, Response } from "express";
import crypto from "node:crypto";
import shortSegmentsRouter from "./routes/shortSegments.routes.js";








const app = express();
app.set("trust proxy", true);
app.use(
  cors({
    origin: (_origin, cb) => cb(null, true), // مرن للتطوير
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
// بعد الميدلويرات مباشرة:

/* فحص سريع: لازم يرجّع {ok:true} على :4000/api/_ping */
app.get("/api/_ping", (_req, res) => res.json({ ok: true, at: new Date().toISOString() }));


/* اترك راوتر المقالات بعدهم */
app.use(articlesRouter);
app.use(shortSegmentsRouter);








// صحة
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "life-hope-backend", time: new Date().toISOString() });
});

// ـــــ داخل server.ts بعد /api/health مثلاً ـــــ

/**
 * Simple Search endpoint
 * GET /api/content/search?q=كلمة&limit=20&offset=0
 * بيرجّع من جدولين: articles + programs_catalog
 * الحقول موحّدة وبكون معها type = "article" أو "program"
 */
app.get("/api/content/search", async (req: Request, res: Response) => {
  const supabase = getSupabase?.();
  const rawQ = (req.query.q ?? "").toString().trim();
  const limit = Math.min(parseInt((req.query.limit ?? "20") as string, 10) || 20, 50);
  const debug = String(req.query.debug || "") === "1";

  // تطبيع عربي خفيف
  const AR_TATWEEL = /\u0640/g;
  const AR_DIACRITICS = /[\u064B-\u065F\u0670\u0674]/g;
  const norm = (s: string) =>
    (s || "")
      .replace(AR_TATWEEL, "")
      .replace(AR_DIACRITICS, "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ؤ|ئ/g, "ء")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .trim();

  const qNorm = norm(rawQ);
  const pats = Array.from(new Set([`%${rawQ}%`, `%${qNorm}%`]));

  const dbg: any = { q: rawQ, pats, steps: [], errors: [] };
  if (!rawQ || !supabase) {
    if (debug) return res.json({ ...dbg, note: "no query or no supabase", results: [] });
    return res.json([]);
  }

  // Helpers
  const mapRecord = (r: any, type: "article" | "program") => ({
    id: r?.id ?? null,
    type,
    slug: r?.slug ?? null,
    title: r?.title ?? "",
    excerpt:
      (typeof r?.excerpt === "string" && r.excerpt) ||
      (typeof r?.content === "string" && String(r.content).slice(0, 140)) ||
      "",
    cover_url: r?.cover_url ?? null,
    created_at: r?.created_at ?? null,
    url: r?.slug ? (type === "article" ? `/articles/${r.slug}` : `/programs/${r.slug}`) : null,
  });

  async function tryIlike(table: string, field: string, sel: string, type: "article" | "program") {
    try {
      let acc: any[] = [];
      for (const p of pats) {
        const r = await supabase.from(table).select(sel).ilike(field, p).order("created_at", { ascending: false });
        if (r.error) throw r.error;
        acc = acc.concat(r.data || []);
      }
      dbg.steps.push({ table, field, count: acc.length });
      return acc.map((x) => mapRecord(x, type));
    } catch (e: any) {
      dbg.errors.push({ table, field, message: String(e?.message || e) });
      return [];
    }
  }

  // 1) محاولات آمنة على حقول متوقعة
  let articles: any[] = [];
  let programs: any[] = [];

  // أقل اختيار حساسية للأعمدة (select("*")) حتى ما نطيّر لو عمود مش موجود
  articles = articles.concat(await tryIlike("articles", "title", "*", "article"));
  programs = programs.concat(await tryIlike("programs_catalog", "title", "*", "program"));

  if (articles.length === 0) {
    articles = articles.concat(await tryIlike("articles", "excerpt", "*", "article"));
  }
  if (articles.length === 0) {
    articles = articles.concat(await tryIlike("articles", "content", "*", "article"));
  }
  if (programs.length === 0) {
    programs = programs.concat(await tryIlike("programs_catalog", "content", "*", "program"));
  }

  let merged = [...articles, ...programs].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  merged = merged.slice(0, limit);

  // 2) خطة-ب: فلترة محلية إذا لسه صفر
  if (merged.length === 0) {
    try {
      const [a2, p2] = await Promise.all([
        supabase.from("articles").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("programs_catalog").select("*").order("created_at", { ascending: false }).limit(200),
      ]);

      const pickText = (obj: any) =>
        Object.values(obj || {})
          .filter((v) => typeof v === "string")
          .join(" ");

      const ok = (obj: any) => norm(pickText(obj)).includes(qNorm);

      const aLoc = (a2.data || []).filter(ok).map((x) => mapRecord(x, "article"));
      const pLoc = (p2.data || []).filter(ok).map((x) => mapRecord(x, "program"));

      merged = [...aLoc, ...pLoc].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")).slice(0, limit);
      dbg.steps.push({ fallback_local: true, aLoc: aLoc.length, pLoc: pLoc.length });
    } catch (e: any) {
      dbg.errors.push({ fallback_local_error: String(e?.message || e) });
      // حتى لو فشل fallback المحلي، بنرجّع اللي معنا (قد يكون صفر) بدون ما نرمي خطأ
    }
  }

  if (debug) return res.json({ ...dbg, counts: { merged: merged.length }, results: merged });
  return res.json(merged);
});



/* =========================
   إعدادات عامة من البيئة
   ========================= */
const PROGRAMS_TABLE = process.env.PROGRAMS_TABLE || "programs"; // اليوم حسب اسم اليوم
const THIRD_TABLE = process.env.THIRD_FRAME_TABLE || "home_third_frame_items";
const PROGRAMS_CATALOG_TABLE = process.env.PROGRAMS_CATALOG_TABLE || "programs_catalog"; // برامج عامة (كاروسول)

/* =========================
   أدوات مساعدة
   ========================= */
function getTzDayName() {
  return new Date().toLocaleString("en-US", { weekday: "long", timeZone: "Asia/Jerusalem" }); // مثال: "Wednesday"
}

/* =========================
   الإطار 2: برنامج اليوم (حسب اسم اليوم)
   ========================= */
async function handleGetProgramToday(req: express.Request, res: express.Response) {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: "Supabase not configured (env missing)" });

  const day = getTzDayName();
  try {
    const { data, error } = await sb.from(PROGRAMS_TABLE).select("*").eq("day", day).maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Not found" });

    return res.json({ ok: true, program: data });
  } catch (e: any) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}

app.get("/api/content/programs/today", handleGetProgramToday);
app.get("/api/programs/today", handleGetProgramToday); // جسر توافق

/* =========================
   الإطار 3: نص + صورة (Home Third Frame)
   ========================= */
async function handleGetHomeThird(req: express.Request, res: express.Response) {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: "Supabase not configured (env missing)" });

  try {
    const { data, error } = await sb.from(THIRD_TABLE).select("*").limit(1);
    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) return res.status(404).json({ error: "Not found" });

    const row: any = data[0];
    return res.json({
      ok: true,
      content: {
        title: row.title ?? "—",
        body: row.body ?? row.text ?? "",
        image_url: row.image_url ?? row.img ?? null,
        updated_at: row.updated_at ?? null,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}

app.get("/api/content/home-third-frame", handleGetHomeThird);
app.get("/api/home-third-frame", handleGetHomeThird); // جسر توافق

/* =========================
   المقالات (قائمة + تفاصيل)
   ========================= */
const ARTICLES_TABLE = process.env.ARTICLES_TABLE || "articles";

// GET /api/content/articles?limit=24
app.get("/api/content/articles", async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: "Supabase not configured (env missing)" });

  try {
    const limit = Math.min(parseInt(String(req.query.limit || "24"), 10) || 24, 100);
    const { data, error } = await sb
      .from(ARTICLES_TABLE)
      .select("id, slug, title, cover_url, published, created_at")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return res.status(500).json({ error: error.message });

    const articles = (data || []).map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      image_url: a.cover_url || "",
    }));

    res.json({ articles });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// GET /api/content/articles/:idOrSlug
app.get("/api/content/articles/:idOrSlug", async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: "Supabase not configured (env missing)" });

  try {
    const { idOrSlug } = req.params;

    // جرّب slug أولًا
    let { data, error } = await sb
      .from(ARTICLES_TABLE)
      .select("id, slug, title, cover_url, content, created_at, updated_at, published")
      .eq("published", true)
      .eq("slug", idOrSlug)
      .limit(1);

    if (error) return res.status(500).json({ error: error.message });

    // لو مش لاقي، جرّب id (UUID)
    if (!data || !data.length) {
      const byId = await sb
        .from(ARTICLES_TABLE)
        .select("id, slug, title, cover_url, content, created_at, updated_at, published")
        .eq("published", true)
        .eq("id", idOrSlug)
        .limit(1);
      if (byId.error) return res.status(500).json({ error: byId.error.message });
      data = byId.data;
    }

    if (!data || !data.length) return res.status(404).json({ error: "Not found" });

    const a = data[0];
    res.json({
      id: a.id,
      slug: a.slug,
      title: a.title,
      image_url: a.cover_url || "",
      content: a.content || "",
      created_at: a.created_at,
      updated_at: a.updated_at,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// (اختياري) جسر توافق قصير للمقالات
app.get("/api/articles", (req, res) => {
  res.redirect(
    307,
    `/api/content/articles${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`
  );
});

/* =========================
   برامج عامة (كاروسول "برامجنا")
   جدول: programs_catalog (قابل للتبديل عبر PROGRAMS_CATALOG_TABLE)
   ========================= */
// GET /api/content/programs
app.get("/api/content/programs", async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || "24"), 10) || 24, 50);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("programs_catalog")
      .select("id, title, content, cover_url, updated_at")
      .eq("published", true)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json(data || []);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed to fetch programs" });
  }
});

// GET /api/content/programs/:id
app.get("/api/content/programs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabase();

    // هات *كل* الحقول لهذا الصف (عشان نعرف شو موجود فعلياً)
    const { data, error } = await supabase
      .from("programs_catalog")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Not found" });

    // التقط العنوان من أي اسم محتمل
    const title =
      data.title ||
      data.name ||
      data.heading ||
      data.ar_title ||
      data.he_title ||
      "بدون عنوان";

    // التقط المحتوى من أي اسم/بنية محتملة
    let content =
      data.content ||
      data.description ||
      data.subtitle ||
      data.body ||
      data.text ||
      data.html ||
      (data.content_html ?? null) ||
      (data.content_json?.html ?? null) ||
      (data.content_json?.markdown ?? null) ||
      (data.content_json?.text ?? null) ||
      "";

    // لو طلع المحتوى كائن/مصفوفة (Rich JSON) حوّله لنص بدل ما يطلع فاضي
    if (content && typeof content !== "string") {
      try {
        // لو فيه html داخلي، استخدمه
        if (content.html && typeof content.html === "string") {
          content = content.html;
        } else if (content.markdown && typeof content.markdown === "string") {
          content = content.markdown;
        } else if (content.text && typeof content.text === "string") {
          content = content.text;
        } else {
          content = JSON.stringify(content, null, 2);
        }
      } catch {
        content = String(content);
      }
    }

    // رجّع حقول موحّدة تستهلكها الواجهة
    res.json({
      id: data.id,
      cover_url:
        data.cover_url || data.image_url || data.cover || data.thumbnail_url || null,
      updated_at: data.updated_at || data.updatedAt || null,
      title,
      content, // مضمون!
      // _raw: data, // تركتها معلّقة
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed to fetch program" });
  }
});

// ===== فقرات قصيرة ===== (الإصدار الأول)
app.get("/api/content/short-segments", async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || "20")), 100);
    const from = parseInt(String(req.query.offset || "0"));
    const to = from + limit - 1;

    const supa = getSupabase(); // نفس الدالة عندك
    if (!supa) return res.status(500).json({ error: "Supabase not configured (env missing)" });

    const q = supa
      .from("short_segments")
      .select("id,title,thumb_url,video_url,duration_sec,created_at", { count: "exact" })
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .range(from, to);

    const { data, error, count } = await q;
    if (error) throw error;

    res.json({
      ok: true,
      total: count ?? data?.length ?? 0,
      items: data ?? [],
    });
  } catch (e:any) {
    res.status(500).json({ error: e.message || String(e) });
  }
});




type ShortSeg = {
  id: string;
  title: string | null;
  video_url: string;
  duration_sec?: number | null;
  published?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

// كاش ذاكرة بسيط
const memCache = new Map<string, { ts: number; data: ShortSeg[] }>();
const TTL_MS = 5 * 60 * 1000; // 5 دقائق

function setCache(key: string, data: ShortSeg[]) {
  memCache.set(key, { ts: Date.now(), data });
}
function getCache(key: string): ShortSeg[] | null {
  const v = memCache.get(key);
  if (!v) return null;
  if (Date.now() - v.ts > TTL_MS) {
    memCache.delete(key);
    return null;
  }
  return v.data;
}

// helper موحّد لجلب آخر العناصر
async function fetchShortSegs(limit = 30): Promise<ShortSeg[]> {
  const supabase = getSupabase();
  // 1) المنشور فقط
  const q1 = await supabase
    .from("short_segments")
    .select("id, title, video_url, duration_sec, published, created_at, updated_at")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (q1.error) throw q1.error;
  const publishedRows = q1.data ?? [];

  if (publishedRows.length > 0) return publishedRows;

  // 2) fallback: بغض النظر عن published
  const q2 = await supabase
    .from("short_segments")
    .select("id, title, video_url, duration_sec, published, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (q2.error) throw q2.error;
  return q2.data ?? [];
}

// راوتر المحتوى (الإصدار الثاني مع كاش)
app.get("/api/content/short-segments", async (req: Request, res: Response) => {
  try {
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 30));
    const cacheKey = `shortsegs:${limit}`;

    // جرّب الكاش أولًا
    const cached = getCache(cacheKey);
    if (cached && cached.length > 0) {
      const etag = crypto.createHash("sha1").update(cached.map(x => x.id).join("|")).digest("hex");
      res.setHeader("ETag", etag);
      res.setHeader("Cache-Control", "public, max-age=30");
      return res.json({ items: cached });
    }

    const rows = await fetchShortSegs(limit);

    if (rows.length > 0) setCache(cacheKey, rows);

    const etag = crypto.createHash("sha1").update(rows.map(x => x.id).join("|")).digest("hex");
    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", "public, max-age=30");

    return res.json({ items: rows });
  } catch (err: any) {
    // في حال الخطأ: رجّع آخر كاش إن وُجد
    const cacheKey = `shortsegs:${Number(req.query.limit) || 30}`;
    const cached = getCache(cacheKey);
    if (cached && cached.length > 0) {
      res.setHeader("Cache-Control", "no-store");
      return res.json({ items: cached, fallback: true, error: String(err?.message || err) });
    }
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

// جسر توافقية (اختياري)
app.get("/api/short-segments", (req, res) => {
  req.url = "/api/content/short-segments" + (req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "");
  app._router.handle(req, res);
});

// جسر توافق مختصر
app.get("/api/programs", (_req, res, next) => {
  ( _req as any ).url = "/api/content/programs";
  next();
});

/* =========================
   404 JSON فقط لمسارات /api/*
   ========================= */
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found" });
  next();
});

/* =========================
   Error handler
   ========================= */
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("Unhandled error:", err);
  res.status(err?.status || 500).json({ error: err?.message || "Internal Server Error" });
});

/* =========================
   تشغيل السيرفر + معالجة EADDRINUSE
   ========================= */
const PORT = Number(process.env.PORT || 4000);

const server = app
  .listen(PORT, "127.0.0.1", () => {
    console.log(`✅ Backend up at http://127.0.0.1:${PORT}`);
    console.log(
      `   PROGRAMS_TABLE=${PROGRAMS_TABLE} | THIRD_TABLE=${THIRD_TABLE} | PROGRAMS_CATALOG_TABLE=${PROGRAMS_CATALOG_TABLE}`
    );
  })
  .on("error", (err: any) => {
    if (err?.code === "EADDRINUSE") {
      console.error(
        `❌ البورت ${PORT} محجوز (EADDRINUSE).\n` +
          `   إمّا تسكّر العملية الماسكة للبورت أو تشغّل الباكند مؤقتًا على بورت آخر:\n` +
          (process.platform === "win32"
            ? `   PowerShell:\n   $env:PORT=4001; npm run dev\n`
            : `   Bash:\n   PORT=4001 npm run dev\n`)
      );
      // لا نرمي throw حتى ما ينهار nodemon؛ مجرّد لوج واضح.
      return;
    }
    console.error("Server failed to start:", err);
  });

/* =========================
   إشعارات نظام/إغلاقات نظيفة
   ========================= */
process.on("unhandledRejection", (e) => {
  console.error("UNHANDLED REJECTION:", e);
});
process.on("uncaughtException", (e) => {
  console.error("UNCAUGHT EXCEPTION:", e);
});
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    console.log(`Received ${sig}, closing server...`);
    server.close(() => {
      console.log("Server closed gracefully.");
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 2000).unref();
  });
}
