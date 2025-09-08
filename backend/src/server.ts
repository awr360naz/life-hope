// backend/src/server.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import articlesRouter from "./routes/articles.js";
// import contentRoutes from "./routes/content.routes.js"; // اتركيه معلّق إذا بعمل تداخل
import { getSupabase } from "./supabaseClient.js";
import type { Request, Response } from "express";
import crypto from "node:crypto";


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

// راوتر المقالات (جاهز عندك)
app.use(articlesRouter);

// صحة
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "life-hope-backend", time: new Date().toISOString() });
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
app.get("/api/content/programs", async (_req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: "Supabase not configured (env missing)" });

  try {
    const { data, error } = await sb
      .from(PROGRAMS_CATALOG_TABLE)
      .select("id,title,subtitle,items,cover_url,is_active,sort_order,updated_at")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(100);

    if (error) return res.status(500).json({ error: error.message });

    const programs = (data || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      subtitle: p.subtitle || null,
      items: Array.isArray(p.items) ? p.items : [],
      cover_url: p.cover_url || null,
      updated_at: p.updated_at,
    }));

    res.json({ ok: true, programs });
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});
// GET /api/content/programs/:id  → تفاصيل برنامج واحد
app.get("/api/content/programs/:id", async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: "Supabase not configured (env missing)" });

  const PROGRAMS_CATALOG_TABLE = process.env.PROGRAMS_CATALOG_TABLE || "programs_catalog";
  try {
    const { id } = req.params;
    const { data, error } = await sb
      .from(PROGRAMS_CATALOG_TABLE)
      .select("id,title,subtitle,items,cover_url,updated_at,is_active")
      .eq("id", id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.is_active === false) return res.status(404).json({ error: "Not found" });

    res.json({ ok: true, program: data });
  } catch (e:any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});
// ===== فقرات قصيرة =====
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

// راوتر المحتوى
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

    // حتى لو DB رجّع فاضي = بنظل نبعث “آخر نسخة كاش” إن وُجدت؛
    // لكن بما إن الكاش مش موجود/منتهي، خلّينا على الأقل نبعث [] مع كود 200.
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
   تشغيل السيرفر
   ========================= */
const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, "127.0.0.1", () => {
  console.log(`✅ Backend up at http://127.0.0.1:${PORT}`);
  console.log(
    `   PROGRAMS_TABLE=${PROGRAMS_TABLE} | THIRD_TABLE=${THIRD_TABLE} | PROGRAMS_CATALOG_TABLE=${PROGRAMS_CATALOG_TABLE}`
  );
});
