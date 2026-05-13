import { Router, type Request, type Response } from "express";
import { getSupabase } from "../supabaseClient.js";
import fs from "node:fs";
import path from "node:path";

type SabbathShort = {
  id: string | number;
  title?: string | null;
  url?: string | null;
  video_url?: string | null;
  youtube_id?: string | null;
  cover_url?: string | null;
  published?: boolean | null;
  created_at?: string | null;
};

const router = Router();

const CACHE_DIR =
  process.env.SABBATH_SHORTS_CACHE_DIR ||
  path.join(process.cwd(), ".cache");

const CACHE_FILE = path.join(
  CACHE_DIR,
  "sabbath_shorts.json"
);

function ensureDir(p: string) {
  try {
    fs.mkdirSync(p, { recursive: true });
  } catch {}
}

function readDiskCache(): SabbathShort[] {
  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

function writeDiskCache(items: SabbathShort[]) {
  try {
    ensureDir(CACHE_DIR);

    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify({
        items,
        updatedAt: Date.now(),
      }),
      "utf8"
    );
  } catch {}
}

const memCache = {
  items: [] as SabbathShort[],
  updatedAt: 0,
  ttlMs: 3 * 60 * 1000,
};

const now = () => Date.now();

const normalize = (r: SabbathShort): SabbathShort => ({
  ...r,
  video_url: r.video_url ?? r.url ?? null,
});

async function queryTry(
  opts: {
    withPublished?: boolean;
    orderBy?: "published_at" | "created_at" | "id";
    limit: number;
  }
): Promise<SabbathShort[]> {
  const sb = getSupabase();

  let q = sb.from("sabbath_shorts").select("*");

  if (opts.withPublished) {
    q = q.eq("published", true);
  }

  if (opts.orderBy) {
    q = q.order(opts.orderBy as any, {
      ascending: false,
    });
  }

  const { data, error } = await q.limit(opts.limit);

  if (error) throw error;

  return (data ?? []).map(normalize);
}

async function fetchWithFallback(
  limit: number
): Promise<SabbathShort[]> {
  const attempts: Array<
    Parameters<typeof queryTry>[0]
  > = [
    {
      withPublished: true,
      orderBy: "published_at",
      limit,
    },
    {
      withPublished: true,
      orderBy: "created_at",
      limit,
    },
    {
      withPublished: true,
      orderBy: "id",
      limit,
    },
    {
      withPublished: false,
      orderBy: "created_at",
      limit,
    },
    {
      withPublished: false,
      orderBy: "id",
      limit,
    },
  ];

  for (const a of attempts) {
    try {
      const rows = await queryTry(a);

      if (rows.length) return rows;
    } catch {}
  }

  return [];
}

router.get(
  "/api/content/sabbath-shorts",
  async (req: Request, res: Response) => {
    const limit = Math.min(
      Math.max(
        parseInt(String(req.query.limit ?? "48"), 10) || 48,
        1
      ),
      48
    );

    const fresh =
      now() - memCache.updatedAt < memCache.ttlMs;

    try {
      if (fresh && memCache.items.length > 0) {
        res.setHeader("X-Source", "memory-cache");

        return res.json({
          ok: true,
          items: memCache.items.slice(0, limit),
        });
      }

      const items = await fetchWithFallback(limit);

      if (items.length > 0) {
        memCache.items = items;
        memCache.updatedAt = now();

        writeDiskCache(items);

        res.setHeader("X-Source", "db");

        return res.json({
          ok: true,
          items,
        });
      }

      const diskItems = readDiskCache();

      if (diskItems.length > 0) {
        memCache.items = diskItems;
        memCache.updatedAt = now();

        res.setHeader("X-Source", "disk-cache");

        return res.json({
          ok: true,
          items: diskItems.slice(0, limit),
        });
      }

      return res.json({
        ok: true,
        items: [],
      });
    } catch (e: any) {
      return res.status(500).json({
        ok: false,
        error: e?.message || String(e),
      });
    }
  }
);

export default router;