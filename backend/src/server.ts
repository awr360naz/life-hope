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
import ourPicksRouter from "./routes/ourPicks.js";
import programsTodayRouter from "./routes/programsToday.routes.js";
import quizzesRouter from "./routes/quizzes.js";
import sabbathRoutes from "./routes/sabbathRoutes.js"; 
import prayerRequestRouter from "./routes/prayerRequest.js";
import camiPropheciesRouter from "./routes/camiProphecies.js";
import searchRouter from "./routes/search.routes.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);







const app = express();
app.set("trust proxy", true);

app.use(
  cors({
    origin: (_origin, cb) => cb(null, true), 
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  next();
});





app.get("/api/_ping", (_req, res) => res.json({ ok: true, at: new Date().toISOString() }));


app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "life-hope-backend", time: new Date().toISOString() });
});

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
app.use("/api/content/our-picks", ourPicksRouter);
app.use("/api/content/quizzes", quizzesRouter);
app.use("/api/content", sabbathRoutes);
app.use("/api/contact/prayer-request", prayerRequestRouter);
app.use(camiPropheciesRouter);
app.use("/api/content/programs", programsTodayRouter);
app.use("/api/programs", programsTodayRouter);
app.use("/api", searchRouter);

 /*
app.get("/api/content/search", async (req: Request, res: Response) => {
  const supabase = getSupabase();
  const rawQ = (req.query.q ?? "").toString().trim();
  const limit =
    Math.min(
      parseInt((req.query.limit ?? "20") as string, 10) || 20,
      50
    );
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

  type ResultType = "article" | "program" | "short" | "cami" | "quiz";

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
    const base: any = {
      id: r?.id ?? null,
      type,
      slug: r?.slug ?? null,
      title: r?.title ?? "",
      // نخليها snippet عشان الفرونت
      snippet:
        (typeof r?.excerpt === "string" && r.excerpt) ||
        (typeof r?.description === "string" && r.description) ||
        (typeof r?.content === "string" &&
          String(r.content).slice(0, 140)) ||
        "",
      cover_url:
        r?.cover_url ??
        r?.thumbnail_url ??
        r?.cover ??
        null,
      created_at: r?.created_at ?? r?.published_at ?? null,
    };

    // URL حسب النوع
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
        base.category = "برنامج";
        base.url = base.slug
          ? `/programs/${base.slug}`
          : base.id
          ? `/programs/${base.id}`
          : null;
        break;
      case "short":
        base.category = "مقاطع قصيرة";
        base.url = base.id
          ? `/short-segments?focus=${base.id}`
          : null;
        break;
      case "cami":
        base.category = "نبوّات كامي";
        base.url = base.id
          ? `/cami-prophecies?video=${base.id}`
          : null;
        break;
      case "quiz":
        base.category = "اختبار";
        base.url = base.slug
          ? `/quizzes/${base.slug}`
          : base.id
          ? `/quizzes/${base.id}`
          : null;
        break;
    }

    return base;
  };

  async function tryIlike(
    table: string,
    field: string,
    sel: string,
    type: ResultType
  ) {
    try {
      let acc: any[] = [];
      for (const p of pats) {
        const r = await supabase
          .from(table)
          .select(sel)
          .ilike(field, p)
          .order("created_at", { ascending: false });
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

  // ===== المقالات والبرامج =====
  articles = articles.concat(
    await tryIlike(
      "articles",
      "title",
      "id, slug, title, excerpt, content, cover_url, created_at, published_at",
      "article"
    )
  );
  programs = programs.concat(
    await tryIlike(
      "programs_catalog",
      "title",
      "id, slug, title, content, cover_url, created_at, published_at",
      "program"
    )
  );

  if (articles.length === 0) {
    articles = articles.concat(
      await tryIlike(
        "articles",
        "excerpt",
        "id, slug, title, excerpt, content, cover_url, created_at, published_at",
        "article"
      )
    );
  }
  if (articles.length === 0) {
    articles = articles.concat(
      await tryIlike(
        "articles",
        "content",
        "id, slug, title, excerpt, content, cover_url, created_at, published_at",
        "article"
      )
    );
  }
  if (programs.length === 0) {
    programs = programs.concat(
      await tryIlike(
        "programs_catalog",
        "content",
        "id, slug, title, content, cover_url, created_at, published_at",
        "program"
      )
    );
  }

  // ===== المقاطع القصيرة =====
  shorts = shorts.concat(
    await tryIlike(
      "short_segments", // غيّر الاسم لو مختلف
      "title",
      "id, title, description, thumbnail_url, created_at",
      "short"
    )
  );
  if (shorts.length === 0) {
    shorts = shorts.concat(
      await tryIlike(
        "short_segments",
        "description",
        "id, title, description, thumbnail_url, created_at",
        "short"
      )
    );
  }

  // ===== Cami Prophecies =====
  cami = cami.concat(
    await tryIlike(
      "cami_videos", // غيّر الاسم لو مختلف
      "title",
      "id, title, description, thumbnail_url, created_at",
      "cami"
    )
  );
  if (cami.length === 0) {
    cami = cami.concat(
      await tryIlike(
        "cami_videos",
        "description",
        "id, title, description, thumbnail_url, created_at",
        "cami"
      )
    );
  }

  // ===== Quizzes =====
  quizzes = quizzes.concat(
    await tryIlike(
      "quizzes", // غيّر الاسم لو مختلف
      "title",
      "id, slug, title, description, cover_url, created_at",
      "quiz"
    )
  );
  if (quizzes.length === 0) {
    quizzes = quizzes.concat(
      await tryIlike(
        "quizzes",
        "description",
        "id, slug, title, description, cover_url, created_at",
        "quiz"
      )
    );
  }

  // دمج أولي
  let merged: any[] = [
    ...articles,
    ...programs,
    ...shorts,
    ...cami,
    ...quizzes,
  ];

  // لو لسا فاضي، استخدم fallback المحلي
  if (merged.length === 0) {
    try {
      const [a2, p2, s2, c2, q2] = await Promise.all([
        supabase
          .from("articles")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("programs_catalog")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("short_segments")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("cami_videos")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("quizzes")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      const pickText = (obj: any) =>
        Object.values(obj || {})
          .filter((v) => typeof v === "string")
          .join(" ");

      const ok = (obj: any) =>
        norm(pickText(obj)).includes(qNorm);

      const aLoc = (a2.data || [])
        .filter(ok)
        .map((x) => mapRecord(x, "article"));
      const pLoc = (p2.data || [])
        .filter(ok)
        .map((x) => mapRecord(x, "program"));
      const sLoc = (s2.data || [])
        .filter(ok)
        .map((x) => mapRecord(x, "short"));
      const cLoc = (c2.data || [])
        .filter(ok)
        .map((x) => mapRecord(x, "cami"));
      const qLoc = (q2.data || [])
        .filter(ok)
        .map((x) => mapRecord(x, "quiz"));

      merged = [
        ...aLoc,
        ...pLoc,
        ...sLoc,
        ...cLoc,
        ...qLoc,
      ];
      dbg.steps.push({
        fallback_local: true,
        counts: {
          aLoc: aLoc.length,
          pLoc: pLoc.length,
          sLoc: sLoc.length,
          cLoc: cLoc.length,
          qLoc: qLoc.length,
        },
      });
    } catch (e: any) {
      dbg.errors.push({
        fallback_local_error: String(e?.message || e),
      });
    }
  }

  // ترتيب: أولًا اللي العنوان فيه الكلمة، بعدين حسب التاريخ
  const qLower = rawQ.toLowerCase();
  merged = merged
    .sort((a, b) => {
      const at = (a.title || "")
        .toLowerCase()
        .includes(qLower)
        ? 0
        : 1;
      const bt = (b.title || "")
        .toLowerCase()
        .includes(qLower)
        ? 0
        : 1;
      if (at !== bt) return at - bt;

      const ad = String(a.created_at || "");
      const bd = String(b.created_at || "");
      if (ad !== bd) return bd.localeCompare(ad);

      return (a.title || "").localeCompare(
        b.title || "",
        "ar"
      );
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
*/

const PROGRAMS_TABLE = process.env.PROGRAMS_TABLE || "programs";
const THIRD_TABLE = process.env.THIRD_FRAME_TABLE || "home_third_frame_items";
const PROGRAMS_CATALOG_TABLE = process.env.PROGRAMS_CATALOG_TABLE || "programs_catalog";


function getTzDayName() {
  return new Date().toLocaleString("en-US", { weekday: "long", timeZone: "Asia/Jerusalem" });
}


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
app.get("/api/programs/today", handleGetProgramToday); 


function unwrapUrl(v: any): string | null {
  let s = String(v ?? "").trim();
  s = s.replace(/^["'\s]+|["'\s]+$/g, ""); 


  const m = s.match(/https?:\/\/[^\s"'<>)\]}]+/i);
  if (m) return m[0];


  if (/^\/\//.test(s)) return "https:" + s;


  if (/^\//.test(s)) return s;

 
  if (/^[\w.-]+\/.+/.test(s)) return s;

  return s ? s : null;
}

function toPublicStorageUrl(u: string | null): string | null {
  if (!u) return null;
  let s = String(u).trim().replace(/^["'\s]+|["'\s]+$/g, "");

 
  if (/^https?:\/\//i.test(s)) return s;


  if (/^\/\//.test(s)) return "https:" + s;


  if (/^\/storage\/v1\/object\//.test(s)) {
    const base = process.env.SUPABASE_URL?.replace(/\/+$/, "");
    return base ? `${base}${s}` : s;
  }


  if (/^[\w.-]+\/.+/.test(s)) {
    const base = process.env.SUPABASE_URL?.replace(/\/+$/, "");
    return base ? `${base}/storage/v1/object/public/${s}` : s;
  }


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
    const { data, error } = await sb.from(THIRD_TABLE).select("*");
    if (error) {
      console.error("[home-third-frame] DB_ERROR:", error);
      return res.status(500).json({ ok: false, error: "DB_ERROR" });
    }

    let rows: any[] = data ?? [];


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

 
    const numVal = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const tsVal = (r: any) => (r?.updated_at || r?.created_at || "");
    rows.sort((a: any, b: any) => {
      const sa = numVal(a?.sort ?? a?.sort_num);
      const sbv = numVal(b?.sort ?? b?.sort_num);
      if (sa !== sbv) return sa - sbv;

      const ta = tsVal(a);
      const tb = tsVal(b);
      const tcmp = (tb || "").localeCompare(ta || "");
      if (tcmp !== 0) return tcmp;

      return String(a?.id || "").localeCompare(String(b?.id || ""));
    });

  
    const pick = Math.max(0, Math.min(sortNum, rows.length - 1));
    const r: any = rows[pick];

  
    const body =
      (typeof r?.body === "string" && r.body) ??
      (typeof r?.text === "string" && r.text) ??
      (typeof r?.content === "string" && r.content) ??
      "";


    let heroRaw =
      r?.hero_url ??
      r?.image_url ??
      r?.cover_url ??
      r?.img ??
      null;


    if (!heroRaw && typeof body === "string") {
      const m = body.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (m) heroRaw = m[1];
    }

  
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
        hero_url,     
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
app.get("/api/content/home-third-frame", handleGetHomeThird);       
app.get("/api/content/home-third-frame/:sort", handleGetHomeThird); 
app.get("/api/home-third-frame", handleGetHomeThird);
app.get("/api/home-third-frame/:sort", handleGetHomeThird);


const ARTICLES_TABLE = process.env.ARTICLES_TABLE || "articles";


app.get("/api/content/programs", async (req, res) => {
  try {
    const limit = Math.min(
      parseInt(String(req.query.limit || "24"), 10) || 24,
      50
    );

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from(PROGRAMS_CATALOG_TABLE)
      .select("id, title, content, cover_url, sort_order, updated_at")
      .eq("published", true)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json(data || []);
  } catch (e) {
    res
      .status(500)
      .json({ error: e?.message || "Failed to fetch programs" });
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


app.get("/api/short-segments", (req, res) => {
  const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  res.redirect(307, `/api/content/short-segments${qs}`);
});

app.get("/api/programs", (req, res) => {
  const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  res.redirect(307, `/api/content/programs${qs}`);
});


app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found" });
  next();
});

const clientBuildDir = path.resolve(__dirname, "../../build");
app.use(express.static(clientBuildDir));

app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(clientBuildDir, "index.html"));
});



app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("Unhandled error:", err);
  res.status(err?.status || 500).json({ error: err?.message || "Internal Server Error" });
});


const APP_PORT = Number(process.env.PORT || 4000);

const server = app
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

