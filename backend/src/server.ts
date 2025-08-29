// backend/src/server.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import articlesRouter from "./routes/articles.js";



// ⚠️ لو عندك content.routes.js شغّال ومسبب تكرار/أخطاء، خلي التعليق أدناه مؤقتًا.
// import contentRoutes from "./routes/content.routes.js";

import { getSupabase } from "./supabaseClient.js";

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
app.use(articlesRouter);

// صحة
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "life-hope-backend", time: new Date().toISOString() });
});

/* =========================
   ENDPOINTS مباشرة (بدون راوتر خارجي)
   تغطي الإطار 2 و 3 + جسور توافقية
   ========================= */

// جدول البرامج والإطار الثالث من .env (اختياري)
const PROGRAMS_TABLE = process.env.PROGRAMS_TABLE || "programs";
const THIRD_TABLE = process.env.THIRD_FRAME_TABLE || "home_third_frame_items";

// اسم اليوم حسب Asia/Jerusalem
function getTzDayName() {
  return new Date().toLocaleString("en-US", { weekday: "long", timeZone: "Asia/Jerusalem" });
}

// ===== الإطار 2: برنامج اليوم =====
async function handleGetProgramToday(req: express.Request, res: express.Response) {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: "Supabase not configured (env missing)" });

  const day = getTzDayName(); // مثال "Wednesday"
  try {
    const { data, error } = await sb
      .from(PROGRAMS_TABLE)
      .select("*")
      .eq("day", day)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Not found" });

    return res.json({ ok: true, program: data });
  } catch (e: any) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}

// سجّلي المسارين (الطريقتين) للإطار 2
app.get("/api/content/programs/today", handleGetProgramToday);
app.get("/api/programs/today", handleGetProgramToday); // جسر توافق

// ===== الإطار 3: نص + صورة =====
async function handleGetHomeThird(req: express.Request, res: express.Response) {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: "Supabase not configured (env missing)" });

  try {
    const { data, error } = await sb
      .from(THIRD_TABLE)
      .select("*")
      .limit(1);

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
// سجّلي المسارين (الطريقتين) للإطار 3
app.get("/api/content/home-third-frame", handleGetHomeThird);
app.get("/api/home-third-frame", handleGetHomeThird); // جسر توافق
// ===== المقالات =====
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

    const articles = (data || []).map(a => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      image_url: a.cover_url || "",
    }));

    res.json({ articles });
  } catch (e:any) {
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
  } catch (e:any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// (اختياري) جسر توافق قصير:
app.get("/api/articles", (req, res) =>
  res.redirect(307, `/api/content/articles${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`)
);


// 404 JSON فقط لمسارات /api/*
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found" });
  next();
});

// Error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("Unhandled error:", err);
  res.status(err?.status || 500).json({ error: err?.message || "Internal Server Error" });
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, "127.0.0.1", () => {
  console.log(`✅ Backend up at http://127.0.0.1:${PORT}`);
  console.log(`   PROGRAMS_TABLE=${PROGRAMS_TABLE} | THIRD_TABLE=${THIRD_TABLE}`);
});
