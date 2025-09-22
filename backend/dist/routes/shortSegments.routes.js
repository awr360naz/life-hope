import { Router } from "express";
import { getSupabase } from "../supabaseClient.js";
import fs from "node:fs";
import path from "node:path";
const router = Router();
/* ========== إعداد كاش القرص ========== */
const CACHE_DIR = process.env.SHORTSEGS_CACHE_DIR || path.join(process.cwd(), ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "short_segments.json");
function ensureDir(p) {
    try {
        fs.mkdirSync(p, { recursive: true });
    }
    catch { }
}
function readDiskCache() {
    try {
        const raw = fs.readFileSync(CACHE_FILE, "utf8");
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed?.items) ? parsed.items : [];
    }
    catch {
        return [];
    }
}
function writeDiskCache(items) {
    try {
        ensureDir(CACHE_DIR);
        fs.writeFileSync(CACHE_FILE, JSON.stringify({ items, updatedAt: Date.now() }), "utf8");
    }
    catch { }
}
/* ========== كاش ذاكرة + TTL صغير ========== */
const memCache = { items: [], updatedAt: 0, ttlMs: 3 * 60 * 1000 };
const now = () => Date.now();
/* تطبيع خفيف لمفتاح الفيديو */
const normalize = (r) => ({ ...r, video_url: r.video_url ?? r.url ?? null });
async function queryTry(opts) {
    const sb = getSupabase();
    let q = sb.from("short_segments").select("*");
    if (opts.withPublished)
        q = q.eq("published", true); // لو ما فيه published، Supabase بيرمي error بنمسكه فوق
    if (opts.orderBy)
        q = q.order(opts.orderBy, { ascending: false });
    const { data, error } = await q.limit(opts.limit);
    if (error)
        throw error;
    return (data ?? []).map(normalize);
}
async function fetchWithFallback(limit) {
    const attempts = [
        { withPublished: true, orderBy: "published_at", limit },
        { withPublished: true, orderBy: "created_at", limit },
        { withPublished: true, orderBy: "id", limit },
        { withPublished: false, orderBy: "created_at", limit },
        { withPublished: false, orderBy: "id", limit },
    ];
    for (const a of attempts) {
        try {
            const rows = await queryTry(a);
            if (rows.length)
                return rows;
        }
        catch {
            // تجاهل ونكمل
        }
    }
    return [];
}
router.get("/api/content/short-segments", async (req, res) => {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "12"), 10) || 12, 1), 48);
    const allowEmpty = String(req.query.allowEmpty ?? "0") === "1"; // لو بدك تجربي رجوع فاضي صراحة
    const fresh = now() - memCache.updatedAt < memCache.ttlMs;
    try {
        // 1) كاش الذاكرة
        if (fresh && memCache.items.length > 0) {
            res.setHeader("X-Source", "memory-cache");
            return res.json({ ok: true, items: memCache.items.slice(0, limit) });
        }
        // 2) استعلام DB مرن
        const items = await fetchWithFallback(limit);
        if (items.length > 0) {
            memCache.items = items;
            memCache.updatedAt = now();
            writeDiskCache(items); // تحديث كاش القرص
            res.setHeader("X-Source", "db");
            return res.json({ ok: true, items });
        }
        // 3) DB رجّع فاضي → جرب كاش الذاكرة أو القرص
        if (memCache.items.length > 0) {
            res.setHeader("X-Source", "stale-mem-cache");
            return res.json({ ok: true, items: memCache.items.slice(0, limit) });
        }
        const diskItems = readDiskCache();
        if (diskItems.length > 0) {
            // حافظ كمان بالذاكرة لطلبات لاحقة
            memCache.items = diskItems;
            memCache.updatedAt = now();
            res.setHeader("X-Source", "disk-cache");
            return res.json({ ok: true, items: diskItems.slice(0, limit) });
        }
        // 4) ما في ولا داتا نهائيًا
        res.setHeader("X-Source", "db-empty");
        const payload = { ok: true, items: [] };
        // بشكل افتراضي: ما بنرجّع [] إلا إذا allowEmpty=1 (للإدارة/الاختبار)
        if (!allowEmpty) {
            return res.status(200).json({ ok: true, items: [], note: "empty-but-allowed=false" });
        }
        return res.json(payload);
    }
    catch (e) {
        // 5) خطأ → رجّع كاش (ذاكرة/قرص) إن وجد
        if (memCache.items.length > 0) {
            res.setHeader("X-Source", "cache-on-error-mem");
            return res.json({ ok: true, items: memCache.items.slice(0, limit), warning: e?.message || String(e) });
        }
        const diskItems = readDiskCache();
        if (diskItems.length > 0) {
            res.setHeader("X-Source", "cache-on-error-disk");
            return res.json({ ok: true, items: diskItems.slice(0, limit), warning: e?.message || String(e) });
        }
        return res.status(500).json({ ok: false, error: e?.message || String(e) });
    }
});
export default router;
