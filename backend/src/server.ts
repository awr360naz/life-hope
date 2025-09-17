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
import categoriesRouter from "./routes/categories.js";
import path from "node:path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);





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
app.use(morgan("dev"));



/* فحص سريع: لازم يرجّع {ok:true} على :4000/api/_ping */
app.get("/api/_ping", (_req, res) => res.json({ ok: true, at: new Date().toISOString() }));

/* صحة */
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "life-hope-backend", time: new Date().toISOString() });
});

/* =========================
   قصتنا — لازم يسبق أي app.use(...)
   ========================= */
app.get("/api/content/about", async (_req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("about_page")
      .select("id, title, body, hero_url, images, updated_at, published")
      .eq("published", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return res.status(500).json({ ok: false, error: "DB_ERROR" });

    if (!data) {
      // فولباك مؤقت
      return res.json({
        ok: true,
        data: {
          title: "قصتنا",
          body: "محتوى مؤقت — أضف/انشر صفًا في about_page ليظهر الحقيقي.",
          hero_url: "https://picsum.photos/1200/540",
          images: [],
          updated_at: new Date().toISOString(),
          published: true,
        },
        fallback: true,
      });
    }

    return res.json({ ok: true, data });
  } catch {
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

/* =========================
   راوترات خارجية
   ========================= */
app.use(articlesRouter);
app.use(categoriesRouter);
app.use(shortSegmentsRouter);

/**
 * Simple Search endpoint
 * GET /api/content/search?q=كلمة&limit=20&offset=0
 */
app.get("/api/content/search", async (req: Request, res: Response) => {
  const supabase = getSupabase();
  const rawQ = (req.query.q ?? "").toString().trim();
  const limit = Math.min(parseInt((req.query.limit ?? "20") as string, 10) || 20, 50);
  const debug = String(req.query.debug || "") === "1";

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

  let articles: any[] = [];
  let programs: any[] = [];

  articles = articles.concat(await tryIlike("articles", "title", "*", "article"));
  programs = programs.concat(await tryIlike("programs_catalog", "title", "*", "program"));

  if (articles.length === 0) articles = articles.concat(await tryIlike("articles", "excerpt", "*", "article"));
  if (articles.length === 0) articles = articles.concat(await tryIlike("articles", "content", "*", "article"));
  if (programs.length === 0) programs = programs.concat(await tryIlike("programs_catalog", "content", "*", "program"));

  let merged = [...articles, ...programs].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  merged = merged.slice(0, limit);

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

      merged = [...aLoc, ...pLoc]
        .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
        .slice(0, limit);
      dbg.steps.push({ fallback_local: true, aLoc: aLoc.length, pLoc: pLoc.length });
    } catch (e: any) {
      dbg.errors.push({ fallback_local_error: String(e?.message || e) });
    }
  }

  return debug ? res.json({ ...dbg, counts: { merged: merged.length }, results: merged }) : res.json(merged);
});

/* =========================
   إعدادات عامة من البيئة
   ========================= */
const PROGRAMS_TABLE = process.env.PROGRAMS_TABLE || "programs";
const THIRD_TABLE = process.env.THIRD_FRAME_TABLE || "home_third_frame_items";
const PROGRAMS_CATALOG_TABLE = process.env.PROGRAMS_CATALOG_TABLE || "programs_catalog";

/* =========================
   أدوات مساعدة
   ========================= */
function getTzDayName() {
  return new Date().toLocaleString("en-US", { weekday: "long", timeZone: "Asia/Jerusalem" });
}

/* =========================
   الإطار 2: برنامج اليوم
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
   — يرجّع نفس الشكل القديم { ok: true, content }
   ========================= */
/* =========================
   الإطار 3: نص + صورة (Home Third Frame)
   — robust: بدون أعمدة محددة، و sorting في JS
   ========================= */
/* =========================
   الإطار 3: نص + صورة (Home Third Frame)
   — robust: بدون أعمدة محددة، و sorting في JS
   ========================= */

// helper: تنضيف URL (يشيل " والمسافات والبدايات الغلط)
// ====== Helpers ======
/* ========= Helpers ========= */
function unwrapUrl(v: any): string | null {
  let s = String(v ?? "").trim();
  s = s.replace(/^["'\s]+|["'\s]+$/g, ""); // إزالة لفّافات

  // http/https كامل
  const m = s.match(/https?:\/\/[^\s"'<>)\]}]+/i);
  if (m) return m[0];

  // بروتوكول نسبي //cdn...
  if (/^\/\//.test(s)) return "https:" + s;

  // مسار مطلق /images/...
  if (/^\//.test(s)) return s;

  // bucket/path أو أي مسار نسبي ذو دلالة
  if (/^[\w.-]+\/.+/.test(s)) return s;

  return s ? s : null;
}

function toPublicStorageUrl(u: string | null): string | null {
  if (!u) return null;
  let s = String(u).trim().replace(/^["'\s]+|["'\s]+$/g, "");

  // 1) رابط كامل
  if (/^https?:\/\//i.test(s)) return s;

  // 2) بروتوكول نسبي //cdn...
  if (/^\/\//.test(s)) return "https:" + s;

  // 3) مسار storage بدون دومين
  if (/^\/storage\/v1\/object\//.test(s)) {
    const base = process.env.SUPABASE_URL?.replace(/\/+$/, "");
    return base ? `${base}${s}` : s;
  }

  // 4) bucket/path -> public URL
  if (/^[\w.-]+\/.+/.test(s)) {
    const base = process.env.SUPABASE_URL?.replace(/\/+$/, "");
    return base ? `${base}/storage/v1/object/public/${s}` : s;
  }

  // 5) مسار مطلق داخل الموقع (غير storage)
  if (/^\//.test(s)) return s;

  return s || null;
}

/* ========= Handler ========= */
async function handleGetHomeThird(req: express.Request, res: express.Response) {
  const sb = getSupabase();
  if (!sb) {
    return res.status(500).json({ ok: false, error: "Supabase not configured (env missing)" });
  }

  const rawSort = String((req.params as any)?.sort ?? req.query?.sort ?? "0").trim();
  const sortNum = /^\d+$/.test(rawSort) ? Number(rawSort) : 0;
  const drafts = String(req.query.drafts || "") === "1";

  console.log("[home-third-frame]", { url: req.originalUrl, rawSort, sortNum, drafts });

  try {
    // لا نحدّد أعمدة لتفادي فشل عند اختلاف المخطط
    const { data, error } = await sb.from(THIRD_TABLE).select("*");
    if (error) {
      console.error("[home-third-frame] DB_ERROR:", error);
      return res.status(500).json({ ok: false, error: "DB_ERROR" });
    }

    let rows: any[] = data ?? [];

    // فلترة المنشور/غير المنشور
    if (!drafts) {
      rows = rows.filter((r: any) => {
        const pub =
          (typeof r.published === "boolean" ? r.published : null) ??
          (typeof r.is_published === "boolean" ? r.is_published : null);
        return pub === true;
      });
    }

    if (!rows.length) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    // ترتيب آمن
    const numVal = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const tsVal = (r: any) => (r?.updated_at || r?.created_at || "");
    rows.sort((a: any, b: any) => {
      const sa = numVal(a?.sort ?? a?.sort_num);
      const sbv = numVal(b?.sort ?? b?.sort_num);
      if (sa !== sbv) return sa - sbv;

      const ta = tsVal(a);
      const tb = tsVal(b);
      const tcmp = (tb || "").localeCompare(ta || ""); // desc
      if (tcmp !== 0) return tcmp;

      return String(a?.id || "").localeCompare(String(b?.id || ""));
    });

    // اختيار العنصر حسب sortNum (index)
    const pick = Math.max(0, Math.min(sortNum, rows.length - 1));
    const r: any = rows[pick];

    // تطبيع النص
    const body =
      (typeof r?.body === "string" && r.body) ??
      (typeof r?.text === "string" && r.text) ??
      (typeof r?.content === "string" && r.content) ??
      "";

    // جرّب كل الأعمدة المحتملة للصورة (أولوية لـ hero_url)
    let heroRaw =
      r?.hero_url ??
      r?.image_url ??
      r?.cover_url ??
      r?.img ??
      null;

    // fallback: استخرج أول صورة من body إذا الأعمدة فاضية
    if (!heroRaw && typeof body === "string") {
      const m = body.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (m) heroRaw = m[1];
    }

    // URL نهائي وآمن (يدعم relative/bucket)
    const hero_url = toPublicStorageUrl(unwrapUrl(heroRaw));

    const images = r?.images ?? null;

    const sortField =
      Number.isFinite(Number(r?.sort)) ? Number(r.sort)
      : Number.isFinite(Number(r?.sort_num)) ? Number(r.sort_num)
      : 0;

    const updated =
      r?.updated_at ??
      r?.created_at ??
      null;

    const debug = String(req.query.debug || "") === "1";

    return res.json({
      ok: true,
      content: {
        id: r?.id,
        title: r?.title ?? "",
        body: String(body).trim(),
        hero_url,     // ← الحقل الذي يستهلكه الفرونت
        images,
        sort: sortField,
        updated_at: updated,
        ...(debug ? { _raw: r } : {}),
      },
    });

  } catch (e: any) {
    console.error("[home-third-frame] SERVER_ERROR:", e);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/* ========= Routes ========= */
app.get("/api/content/home-third-frame", handleGetHomeThird);        // ?sort=0
app.get("/api/content/home-third-frame/:sort", handleGetHomeThird);  // /.../0
app.get("/api/home-third-frame", handleGetHomeThird);
app.get("/api/home-third-frame/:sort", handleGetHomeThird);

/* =========================
   المقالات: باقي المسارات بالراوتر الخارجي
   ========================= */
const ARTICLES_TABLE = process.env.ARTICLES_TABLE || "articles";

/* =========================
   برامج عامة (كاروسول "برامجنا")
   ========================= */
app.get("/api/content/programs", async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || "24"), 10) || 24, 50);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from(PROGRAMS_CATALOG_TABLE)
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

app.get("/api/content/programs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabase();

    const { data, error } = await supabase.from(PROGRAMS_CATALOG_TABLE).select("*").eq("id", id).single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Not found" });

    const title = data.title || data.name || data.heading || data.ar_title || data.he_title || "بدون عنوان";

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

    if (content && typeof content !== "string") {
      try {
        if (content.html && typeof content.html === "string") content = content.html;
        else if (content.markdown && typeof content.markdown === "string") content = content.markdown;
        else if (content.text && typeof content.text === "string") content = content.text;
        else content = JSON.stringify(content, null, 2);
      } catch {
        content = String(content);
      }
    }

    res.json({
      id: data.id,
      cover_url: data.cover_url || data.image_url || data.cover || data.thumbnail_url || null,
      updated_at: data.updated_at || data.updatedAt || null,
      title,
      content,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed to fetch program" });
  }
});

/* =========================
   فقرات قصيرة — نسخة مكيَّشة
   ========================= */
type ShortSeg = {
  id: string;
  title: string | null;
  video_url: string;
  duration_sec?: number | null;
  published?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

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

async function fetchShortSegs(limit = 30): Promise<ShortSeg[]> {
  const supabase = getSupabase();
  const q1 = await supabase
    .from("short_segments")
    .select("id, title, video_url, duration_sec, published, created_at, updated_at")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (q1.error) throw q1.error;
  const publishedRows = q1.data ?? [];
  if (publishedRows.length > 0) return publishedRows;

  const q2 = await supabase
    .from("short_segments")
    .select("id, title, video_url, duration_sec, published, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (q2.error) throw q2.error;
  return q2.data ?? [];
}

app.get("/api/content/short-segments", async (req: Request, res: Response) => {
  try {
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 30));
    const cacheKey = `shortsegs:${limit}`;

    const cached = getCache(cacheKey);
    if (cached && cached.length > 0) {
      const etag = crypto.createHash("sha1").update(cached.map((x) => x.id).join("|")).digest("hex");
      res.setHeader("ETag", etag);
      res.setHeader("Cache-Control", "public, max-age=30");
      return res.json({ items: cached });
    }

    const rows = await fetchShortSegs(limit);
    if (rows.length > 0) setCache(cacheKey, rows);

    const etag = crypto.createHash("sha1").update(rows.map((x) => x.id).join("|")).digest("hex");
    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", "public, max-age=30");

    return res.json({ items: rows });
  } catch (err: any) {
    const cacheKey = `shortsegs:${Number(req.query.limit) || 30}`;
    const cached = getCache(cacheKey);
    if (cached && cached.length > 0) {
      res.setHeader("Cache-Control", "no-store");
      return res.json({ items: cached, fallback: true, error: String(err?.message || err) });
    }
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

// جسور Redirect صريحة
app.get("/api/short-segments", (req, res) => {
  const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  res.redirect(307, `/api/content/short-segments${qs}`);
});

app.get("/api/programs", (req, res) => {
  const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  res.redirect(307, `/api/content/programs${qs}`);
});

/* =========================
   404 JSON لمسارات /api/*
   ========================= */
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found" });
  next();
});
// ==== Serve React build (الجذر /build) ====
const clientBuildDir = path.resolve(__dirname, "../../build");
app.use(express.static(clientBuildDir));

app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(clientBuildDir, "index.html"));
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
/* =========================
   تشغيل السيرفر + معالجة EADDRINUSE
   ========================= */

// سمّه APP_PORT لتجنّب تضارب اسم PORT
const APP_PORT = Number(process.env.PORT || 4000);

const server = app
  // مهم: لا تحدد "127.0.0.1" عشان Render يحتاج 0.0.0.0 — تركه بدون host = يسمع على كل الواجهات
  .listen(APP_PORT, () => {
    console.log(`✅ Backend up at :${APP_PORT}`);
    console.log(
      `   PROGRAMS_TABLE=${PROGRAMS_TABLE} | THIRD_TABLE=${THIRD_TABLE} | PROGRAMS_CATALOG_TABLE=${PROGRAMS_CATALOG_TABLE}`
    );
  })
  .on("error", (err: any) => {
    if (err?.code === "EADDRINUSE") {
      console.error(
        `❌ البورت ${APP_PORT} محجوز (EADDRINUSE).\n` +
          `   إمّا تسكّر العملية الماسكة للبورت أو تشغّل الباكند مؤقتًا على بورت آخر:\n` +
          (process.platform === "win32"
            ? `   PowerShell:\n   $env:PORT=4001; npm run dev\n`
            : `   Bash:\n   PORT=4001 npm run dev\n`)
      );
      return;
    }
    console.error("Server failed to start:", err);
  });

