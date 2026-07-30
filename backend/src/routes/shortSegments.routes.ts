import {
  Router,
  type Request,
  type Response,
} from "express";
import { getSupabase } from "../supabaseClient.js";
import fs from "node:fs";
import path from "node:path";

type ShortSeg = {
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

/* ========== إعداد كاش القرص ========== */

const CACHE_DIR =
  process.env.SHORTSEGS_CACHE_DIR ||
  path.join(process.cwd(), ".cache");

const CACHE_FILE = path.join(
  CACHE_DIR,
  "short_segments.json"
);

function ensureDir(p: string) {
  try {
    fs.mkdirSync(p, {
      recursive: true,
    });
  } catch {}
}

function readDiskCache(): ShortSeg[] {
  try {
    const raw = fs.readFileSync(
      CACHE_FILE,
      "utf8"
    );

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed?.items)
      ? parsed.items
      : [];
  } catch {
    return [];
  }
}

function writeDiskCache(items: ShortSeg[]) {
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

/* ========== كاش ذاكرة + TTL صغير ========== */

const memCache = {
  items: [] as ShortSeg[],
  updatedAt: 0,
  ttlMs: 3 * 60 * 1000,
};

const now = () => Date.now();

/* تطبيع خفيف لمفتاح الفيديو */

const normalize = (
  r: ShortSeg
): ShortSeg => ({
  ...r,
  video_url:
    r.video_url ??
    r.url ??
    null,
});

/*
 * نجلب البيانات من Supabase على دفعات.
 * هيك ما بكون في حد أقصى لعدد الشورتس.
 */
const DB_PAGE_SIZE = 1000;

async function queryTry(opts: {
  withPublished?: boolean;
  orderBy?:
    | "published_at"
    | "created_at"
    | "id";
}): Promise<ShortSeg[]> {
  const sb = getSupabase();

  const allRows: ShortSeg[] = [];

  let from = 0;

  while (true) {
    let q = sb
      .from("short_segments")
      .select("*");

    if (opts.withPublished) {
      q = q.eq(
        "published",
        true
      );
    }

    if (opts.orderBy) {
      q = q.order(
        opts.orderBy as any,
        {
          ascending: false,
        }
      );
    }

    const { data, error } =
      await q.range(
        from,
        from + DB_PAGE_SIZE - 1
      );

    if (error) {
      throw error;
    }

    const rows = (
      data ?? []
    ).map(normalize);

    allRows.push(...rows);

    if (
      rows.length <
      DB_PAGE_SIZE
    ) {
      break;
    }

    from += DB_PAGE_SIZE;
  }

  return allRows;
}

async function fetchWithFallback(): Promise<
  ShortSeg[]
> {
  const attempts: Array<
    Parameters<typeof queryTry>[0]
  > = [
    {
      withPublished: true,
      orderBy: "published_at",
    },
    {
      withPublished: true,
      orderBy: "created_at",
    },
    {
      withPublished: true,
      orderBy: "id",
    },
    {
      withPublished: false,
      orderBy: "created_at",
    },
    {
      withPublished: false,
      orderBy: "id",
    },
  ];

  for (const a of attempts) {
    try {
      const rows =
        await queryTry(a);

      if (rows.length) {
        return rows;
      }
    } catch {
      // تجاهل ونكمل
    }
  }

  return [];
}

router.get(
  "/api/content/short-segments",
  async (
    req: Request,
    res: Response
  ) => {
    const allowEmpty =
      String(
        req.query.allowEmpty ??
          "0"
      ) === "1";

    const fresh =
      now() -
        memCache.updatedAt <
      memCache.ttlMs;

    try {
      // 1) كاش الذاكرة
      if (
        fresh &&
        memCache.items.length > 0
      ) {
        res.setHeader(
          "X-Source",
          "memory-cache"
        );

        return res.json({
          ok: true,
          items: memCache.items,
        });
      }

      // 2) استعلام DB مرن
      const items =
        await fetchWithFallback();

      if (items.length > 0) {
        memCache.items = items;
        memCache.updatedAt =
          now();

        writeDiskCache(items);

        res.setHeader(
          "X-Source",
          "db"
        );

        return res.json({
          ok: true,
          items,
        });
      }

      // 3) DB رجّع فاضي
      // جرب كاش الذاكرة أو القرص
      if (
        memCache.items.length > 0
      ) {
        res.setHeader(
          "X-Source",
          "stale-mem-cache"
        );

        return res.json({
          ok: true,
          items: memCache.items,
        });
      }

      const diskItems =
        readDiskCache();

      if (
        diskItems.length > 0
      ) {
        memCache.items =
          diskItems;

        memCache.updatedAt =
          now();

        res.setHeader(
          "X-Source",
          "disk-cache"
        );

        return res.json({
          ok: true,
          items: diskItems,
        });
      }

      // 4) ما في ولا داتا نهائيًا
      res.setHeader(
        "X-Source",
        "db-empty"
      );

      const payload = {
        ok: true,
        items: [] as ShortSeg[],
      };

      if (!allowEmpty) {
        return res
          .status(200)
          .json({
            ok: true,
            items:
              [] as ShortSeg[],
            note: "empty-but-allowed=false",
          });
      }

      return res.json(payload);
    } catch (e: any) {
      // 5) خطأ
      // رجّع كاش ذاكرة أو قرص
      if (
        memCache.items.length > 0
      ) {
        res.setHeader(
          "X-Source",
          "cache-on-error-mem"
        );

        return res.json({
          ok: true,
          items: memCache.items,
          warning:
            e?.message ||
            String(e),
        });
      }

      const diskItems =
        readDiskCache();

      if (
        diskItems.length > 0
      ) {
        res.setHeader(
          "X-Source",
          "cache-on-error-disk"
        );

        return res.json({
          ok: true,
          items: diskItems,
          warning:
            e?.message ||
            String(e),
        });
      }

      return res
        .status(500)
        .json({
          ok: false,
          error:
            e?.message ||
            String(e),
        });
    }
  }
);

export default router;