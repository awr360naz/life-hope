// backend/src/routes/mrayaAlroh.ts
import { Router, type Request, type Response } from "express";
import { getSupabase } from "../supabaseClient.js";
import fs from "node:fs";
import path from "node:path";

type MrayaVideo = {
  id: string | number;
  title?: string | null;
  slug?: string | null;
  youtube_id?: string | null;
  youtube_url?: string | null;
  published?: boolean | null;
  created_at?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
  sort?: number | null;
};

const router = Router();

const CACHE_DIR =
  process.env.MRAYA_CACHE_DIR || path.join(process.cwd(), ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "mraya_alroh.json");

function ensureDir(p: string) {
  try {
    fs.mkdirSync(p, { recursive: true });
  } catch {}
}

function readDiskCache(): MrayaVideo[] {
  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

function writeDiskCache(items: MrayaVideo[]) {
  try {
    ensureDir(CACHE_DIR);
    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify({ items, updatedAt: Date.now() }),
      "utf8"
    );
  } catch {}
}

const memCache = {
  items: [] as MrayaVideo[],
  updatedAt: 0,
  ttlMs: 3 * 60 * 1000,
};
const now = () => Date.now();

async function queryTry(opts: {
  withPublished?: boolean;
  orderBy?: "sort" | "published_at" | "created_at" | "id";
  limit: number;
}): Promise<MrayaVideo[]> {
  const sb = getSupabase();

  let q = sb.from("mraya_alroh").select("*");

  if (opts.withPublished) q = q.eq("published", true);

  if (opts.orderBy === "sort") {
    q = q
      .order("sort", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true });
  } else if (opts.orderBy) {
    q = q.order(opts.orderBy as any, { ascending: false });
  }

  const { data, error } = await q.limit(opts.limit);
  if (error) throw error;

  return (data ?? []).map((r: any) => ({ ...r }));
}

async function fetchWithFallback(limit: number): Promise<MrayaVideo[]> {
  const attempts: Array<Parameters<typeof queryTry>[0]> = [
    { withPublished: true, orderBy: "sort", limit },
    { withPublished: true, orderBy: "published_at", limit },
    { withPublished: true, orderBy: "created_at", limit },
    { withPublished: true, orderBy: "id", limit },
    { withPublished: false, orderBy: "sort", limit },
    { withPublished: false, orderBy: "created_at", limit },
    { withPublished: false, orderBy: "id", limit },
  ];

  for (const a of attempts) {
    try {
      const rows = await queryTry(a);
      if (rows.length) return rows;
    } catch {}
  }
  return [];
}

router.get("/", async (req: Request, res: Response) => {
  const limit = Math.min(
    Math.max(parseInt(String(req.query.limit ?? "48"), 10) || 48, 1),
    48
  );
  const allowEmpty = String(req.query.allowEmpty ?? "0") === "1";
  const fresh = now() - memCache.updatedAt < memCache.ttlMs;

  try {
    if (fresh && memCache.items.length > 0) {
      res.setHeader("X-Source", "memory-cache");
      return res.json({ ok: true, items: memCache.items.slice(0, limit) });
    }

    const items = await fetchWithFallback(limit);

    if (items.length > 0) {
      memCache.items = items;
      memCache.updatedAt = now();
      writeDiskCache(items);
      res.setHeader("X-Source", "db");
      return res.json({ ok: true, items });
    }

    if (memCache.items.length > 0) {
      res.setHeader("X-Source", "stale-mem-cache");
      return res.json({ ok: true, items: memCache.items.slice(0, limit) });
    }

    const diskItems = readDiskCache();
    if (diskItems.length > 0) {
      memCache.items = diskItems;
      memCache.updatedAt = now();
      res.setHeader("X-Source", "disk-cache");
      return res.json({ ok: true, items: diskItems.slice(0, limit) });
    }

    res.setHeader("X-Source", "db-empty");
    if (!allowEmpty) {
      return res.status(200).json({
        ok: true,
        items: [] as MrayaVideo[],
        note: "empty-but-allowed=false",
      });
    }
    return res.json({ ok: true, items: [] as MrayaVideo[] });
  } catch (e: any) {
    if (memCache.items.length > 0) {
      res.setHeader("X-Source", "cache-on-error-mem");
      return res.json({
        ok: true,
        items: memCache.items.slice(0, limit),
        warning: e?.message || String(e),
      });
    }

    const diskItems = readDiskCache();
    if (diskItems.length > 0) {
      res.setHeader("X-Source", "cache-on-error-disk");
      return res.json({
        ok: true,
        items: diskItems.slice(0, limit),
        warning: e?.message || String(e),
      });
    }

    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

export default router;
