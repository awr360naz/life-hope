import { Router, type Request, type Response } from "express";
import { getSupabase } from "../supabaseClient.js";

const router = Router();

/* =========================================================
   Types
========================================================= */

type SearchResultType =
  | "article"
  | "program"
  | "short"
  | "cami"
  | "video"
  | "quiz"
  | "sabbath-lesson"
  | "sabbath-week"
  | "sabbath-item"
  | "page";

type SearchSource = {
  table: string;
  fields: string[];
  type: SearchResultType;
  category: string;
  basePath: string;

  /**
   * true:
   * نضيف published = true
   *
   * false:
   * لا نفحص published
   */
  published?: boolean;

  /**
   * طريقة بناء الرابط:
   * slug = /page/slug
   * query-video = /page?video=id
   * query-focus = /page?focus=id
   * base = /page
   */
  urlMode?: "slug" | "query-video" | "query-focus" | "base";
};

/* =========================================================
   Arabic normalization
========================================================= */

const AR_TATWEEL = /\u0640/g;
const AR_DIACRITICS = /[\u064B-\u065F\u0670]/g;

function normalizeArabic(value: string): string {
  return String(value || "")
    .replace(AR_TATWEEL, "")
    .replace(AR_DIACRITICS, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/[ؤئ]/g, "ء")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function stripHtml(value: string): string {
  return String(value || "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * نحذف الرموز التي قد تكسر صيغة PostgREST الخاصة بـ .or()
 */
function safeSearchValue(value: string): string {
  return String(value || "")
    .replace(/[(),]/g, " ")
    .replace(/[%_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createSearchVariants(rawQuery: string): string[] {
  const raw = safeSearchValue(rawQuery);
  if (!raw) return [];

  const variants = new Set<string>();

  variants.add(raw);
  variants.add(normalizeArabic(raw));

  variants.add(raw.replace(/[أإآ]/g, "ا"));
  variants.add(raw.replace(/ة/g, "ه"));
  variants.add(raw.replace(/ه/g, "ة"));
  variants.add(raw.replace(/ى/g, "ي"));

  return Array.from(variants)
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 5);
}

/* =========================================================
   YouTube + images
========================================================= */

function extractYouTubeId(rawValue: string = ""): string {
  const raw = String(rawValue || "").trim();

  if (!raw) return "";

  if (/^[a-zA-Z0-9_-]{10,15}$/.test(raw)) {
    return raw;
  }

  try {
    const url = new URL(raw);

    if (url.hostname.includes("youtu.be")) {
      return url.pathname.split("/")[1] || "";
    }

    if (url.pathname.startsWith("/shorts/")) {
      return url.pathname.split("/")[2] || "";
    }

    if (url.pathname.startsWith("/embed/")) {
      return url.pathname.split("/")[2] || "";
    }

    const videoId = url.searchParams.get("v");

    if (videoId) {
      return videoId;
    }
  } catch {
    // القيمة قد تكون رابطًا ناقصًا أو ID
  }

  const match = raw.match(
    /[?&]v=([^&#]+)|youtu\.be\/([^?#/]+)|shorts\/([^?#/]+)|embed\/([^?#/]+)/
  );

  return match
    ? match[1] || match[2] || match[3] || match[4] || ""
    : "";
}

function youtubeIdFromRecord(record: Record<string, any>): string {
  const directValues = [
    record?.youtube_id,
    record?.youtube_url,
    record?.video_url,
    record?.short_url,
    record?.thumb_url,
    record?.url,
  ];

  for (const value of directValues) {
    if (typeof value !== "string" || !value.trim()) continue;

    const videoId = extractYouTubeId(value);

    if (videoId) {
      return videoId;
    }
  }

  for (const value of Object.values(record || {})) {
    if (typeof value !== "string") continue;

    if (
      !value.includes("youtube.com") &&
      !value.includes("youtu.be") &&
      !value.includes("/shorts/")
    ) {
      continue;
    }

    const videoId = extractYouTubeId(value);

    if (videoId) {
      return videoId;
    }
  }

  return "";
}

function coverFromRecord(record: Record<string, any>): string | null {
  const possibleValues = [
    record?.cover_url,
    record?.thumbnail_url,
    record?.thumb_url,
    record?.image_url,
    record?.poster_url,
    record?.banner_url,
    record?.preview_url,
    record?.image,
    record?.img,
    record?.thumbnail,
    record?.thumb,
    record?.poster,
  ];

  for (const value of possibleValues) {
    if (typeof value !== "string" || !value.trim()) {
      continue;
    }

    const cleanValue = value.trim();

    // إذا القيمة رابط يوتيوب، حوّلها إلى رابط صورة يوتيوب
    const youtubeId = extractYouTubeId(cleanValue);

    if (youtubeId) {
      return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
    }

    // إذا رابط صورة عادي، رجّعه كما هو
    return cleanValue;
  }

  // ابحث عن رابط يوتيوب في باقي بيانات السجل
  const youtubeId = youtubeIdFromRecord(record);

  if (youtubeId) {
    return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
  }

  return null;
}
function mapRecord(
  record: Record<string, any>,
  source: SearchSource
): Record<string, any> {
  const youtubeId = youtubeIdFromRecord(record);
  const coverUrl = coverFromRecord(record);

  let title = recordTitle(record);

  if (!title && source.type === "sabbath-week") {
    title = "أسبوع من دروس السبت";
  }

  return {
    id:
      record?.id ??
      record?.slug ??
      `${source.table}-${Math.random().toString(36).slice(2)}`,

    type: source.type,
    category: source.category,
    title,
    slug: record?.slug ?? null,
    snippet: recordSnippet(record),
    cover_url: coverUrl,
    youtube_id: youtubeId || null,

    created_at:
      record?.created_at ??
      record?.published_at ??
      record?.updated_at ??
      null,

    url: buildResultUrl(source, record),
    source: source.table,
  };
}

/* =========================================================
   Search sources
========================================================= */

const SEARCH_SOURCES: SearchSource[] = [
  {
    table: "programs_catalog",
    fields: [
      "title",
      "name",
      "name_ar",
      "title_ar",
      "program_name",
      "program_title",
    ],
    type: "program",
    category: "برامجنا",
    basePath: "/programs",
    published: false,
    urlMode: "slug",
  },

  {
    table: "cami_videos",
    fields: ["title"],
    type: "cami",
    category: "نبوّات كامي",
    basePath: "/cami-prophecies",
    published: true,
    urlMode: "query-video",
  },

  {
    table: "mraya_alroh",
    fields: ["title"],
    type: "video",
    category: "مرايا الروح",
    basePath: "/mraya-alroh",
    published: true,
    urlMode: "query-video",
  },

  {
    table: "al7ya_welamal",
    fields: ["title"],
    type: "video",
    category: "الحياة والأمل",
    basePath: "/al7ya_welamal",
    published: true,
    urlMode: "query-video",
  },

  {
    table: "wamdat_raw7ey",
    fields: ["title"],
    type: "video",
    category: "ومضات روحية",
    basePath: "/wamdat_raw7ye",
    published: true,
    urlMode: "query-video",
  },

  {
    table: "short_segments",
    fields: ["title"],
    type: "short",
    category: "مقاطع قصيرة",
    basePath: "/shorts",
    published: true,
    urlMode: "query-focus",
  },

{
  table: "sabbath_shorts",
  fields: ["title"],
  type: "video",
  category: "فقرات السبت القصيرة",
  basePath: "/sabbath-shorts",
  published: true,
  urlMode: "query-focus",
},

{
  table: "prophecies",
  fields: ["title"],
  type: "video",
  category: "النبوات",
  basePath: "/prophecies",
  published: true,
  urlMode: "query-focus",
},

  {
    table: "seha_afdal",
    fields: ["title"],
    type: "video",
    category: "صحة أفضل",
    basePath: "/seha-afdal",
    published: true,
    urlMode: "query-video",
  },

  {
    table: "kol_shahr_4_7kayat",
    fields: ["title"],
    type: "video",
    category: "كل شهر أربع حكايات",
    basePath: "/kol-shahr-4-7kayat",
    published: true,
    urlMode: "query-video",
  },

  {
    table: "sbah_alkher",
    fields: ["title"],
    type: "video",
    category: "صباح الخير",
    basePath: "/sbah-alkher",
    published: true,
    urlMode: "query-video",
  },

  {
    table: "tht_saqf_wahd",
    fields: ["title"],
    type: "video",
    category: "تحت سقف واحد",
    basePath: "/tht-saqf-wahd",
    published: true,
    urlMode: "query-video",
  },

  {
    table: "articles",
    fields: ["title"],
    type: "article",
    category: "مقال",
    basePath: "/articles",
    published: true,
    urlMode: "slug",
  },

  {
    table: "quizzes",
    fields: ["title"],
    type: "quiz",
    category: "اختبار",
    basePath: "/quiz",
    published: true,
    urlMode: "slug",
  },

  {
    table: "sabbath_lessons",
    fields: ["title"],
    type: "sabbath-lesson",
    category: "درس السبت",
    basePath: "/sabbath-lessons",
    published: true,
    urlMode: "slug",
  },

  {
    table: "sabbath_weeks",
    fields: ["subtitle"],
    type: "sabbath-week",
    category: "أسبوع من دروس السبت",
    basePath: "/sabbath-weeks",
    published: true,
    urlMode: "slug",
  },

  {
    table: "sabbath_items",
    fields: ["title"],
    type: "sabbath-item",
    category: "موضوع من دروس السبت",
    basePath: "/sabbath-items",
    published: true,
    urlMode: "slug",
  },
];

/* =========================================================
   Static pages
========================================================= */

const STATIC_PAGES = [
  {
    id: "page-programs",
    title: "برامجنا",
    category: "صفحة",
    url: "/programs",
    aliases: ["برامج", "برنامج", "برامجنا"],
  },
  {
    id: "page-cami",
    title: "نبوّات كامي",
    category: "صفحة",
    url: "/cami-prophecies",
    aliases: ["كامي", "نبوات كامي", "نبوّات كامي"],
  },
  {
    id: "page-mraya",
    title: "مرايا الروح",
    category: "صفحة",
    url: "/mraya-alroh",
    aliases: ["مرايا الروح", "مرايا", "الروح"],
  },
  {
    id: "page-life-hope",
    title: "الحياة والأمل",
    category: "صفحة",
    url: "/al7ya_welamal",
    aliases: ["الحياة والامل", "الحياة والأمل", "الامل"],
  },
  {
    id: "page-wamdat",
    title: "ومضات روحية",
    category: "صفحة",
    url: "/wamdat_raw7ye",
    aliases: ["ومضات", "ومضات روحية", "ومضة روحية"],
  },
  {
    id: "page-shorts",
    title: "مقاطع قصيرة",
    category: "صفحة",
    url: "/shorts",
    aliases: ["مقاطع قصيرة", "فقرات قصيرة", "شورتس"],
  },
  {
    id: "page-sabbath-shorts",
    title: "فقرات السبت القصيرة",
    category: "صفحة",
    url: "/sabbath-shorts",
    aliases: ["السبت القصيرة", "فقرات السبت", "سبت"],
  },
  {
    id: "page-prophecies",
    title: "النبوات",
    category: "صفحة",
    url: "/prophecies",
    aliases: ["نبوات", "النبوات", "نبوءات"],
  },
  {
    id: "page-health",
    title: "صحة أفضل",
    category: "صفحة",
    url: "/seha-afdal",
    aliases: ["صحة", "صحه", "صحة أفضل", "صحه افضل"],
  },
  {
    id: "page-stories",
    title: "كل شهر أربع حكايات",
    category: "صفحة",
    url: "/kol-shahr-4-7kayat",
    aliases: ["حكايات", "اربع حكايات", "أربع حكايات"],
  },
  {
    id: "page-morning",
    title: "صباح الخير",
    category: "صفحة",
    url: "/sbah-alkher",
    aliases: ["صباح الخير", "صباح"],
  },
  {
    id: "page-one-roof",
    title: "تحت سقف واحد",
    category: "صفحة",
    url: "/tht-saqf-wahd",
    aliases: ["تحت سقف واحد", "سقف واحد"],
  },
  {
    id: "page-articles",
    title: "المقالات",
    category: "صفحة",
    url: "/articles",
    aliases: ["مقالات", "المقالات", "مقال"],
  },
  {
    id: "page-quizzes",
    title: "اختبر معلوماتك",
    category: "صفحة",
    url: "/quiz",
    aliases: ["اختبار", "اختبارات", "كويز", "اختبر معلوماتك"],
  },
  {
    id: "page-health-quizzes",
    title: "اختبارات الصحة",
    category: "صفحة",
    url: "/quizzes/health",
    aliases: ["اختبارات الصحة", "اختبار صحة", "كويز صحة"],
  },
  {
    id: "page-christian-quizzes",
    title: "اختبارات مسيحية",
    category: "صفحة",
    url: "/quizzes/christian",
    aliases: ["اختبارات مسيحية", "اختبار مسيحي", "كويز مسيحي"],
  },
  {
    id: "page-prayer",
    title: "اطلب صلاة",
    category: "طلب صلاة",
    url: "/prayer-request",
    aliases: [
      "طلب صلاة",
      "اطلب صلاة",
      "صلاة",
      "صلاه",
      "صلولي",
      "صلوا لي",
      "صليلي",
      "صلّيلي",
      "بحاجة لصلاة",
      "احتاج صلاة",
      "بدي صلاة",
      "اريد صلاة",
      "أريد صلاة",
    ],
  },
  {
    id: "page-sabbath-lessons",
    title: "دروس السبت",
    category: "صفحة",
    url: "/sabbath-lessons",
    aliases: [
      "دروس السبت",
      "درس السبت",
      "مدرسة السبت",
      "مدرسه السبت",
    ],
  },
];

/* =========================================================
   Helpers
========================================================= */

function recordTitle(record: Record<string, any>): string {
  return String(
    record?.title ??
      record?.name ??
      record?.name_ar ??
      record?.title_ar ??
      record?.program_name ??
      record?.program_title ??
      record?.subtitle ??
      record?.note ??
      ""
  ).trim();
}

function recordSnippet(record: Record<string, any>): string {
  const raw =
    record?.excerpt ??
    record?.description ??
    record?.subtitle ??
    record?.short_desc ??
    record?.long_desc ??
    record?.note ??
    record?.content ??
    record?.content_html ??
    "";

  return stripHtml(String(raw)).slice(0, 170);
}

function buildResultUrl(
  source: SearchSource,
  record: Record<string, any>
): string {
  const id = record?.id;
  const slug = record?.slug;

  switch (source.urlMode) {
    case "slug":
      if (slug) {
        return `${source.basePath}/${encodeURIComponent(String(slug))}`;
      }

      if (id) {
        return `${source.basePath}/${encodeURIComponent(String(id))}`;
      }

      return source.basePath;

    case "query-video": {
      if (
        source.table === "sabbath_shorts" ||
        source.table === "prophecies"
      ) {
        const youtubeId = youtubeIdFromRecord(record);

        if (youtubeId) {
          return `${source.basePath}?video=${encodeURIComponent(youtubeId)}`;
        }
      }

      if (id !== undefined && id !== null) {
        return `${source.basePath}?video=${encodeURIComponent(String(id))}`;
      }

      return source.basePath;
    }

  case "query-focus":
  if (id !== undefined && id !== null) {
    return `${source.basePath}?focus=${encodeURIComponent(String(id))}`;
  }

  return source.basePath;

    case "base":
    default:
      return source.basePath;
  }
}


function deduplicateResults(results: Record<string, any>[]) {
  const seen = new Set<string>();

  return results.filter((result) => {
    const key = [
      result.type,
      result.source,
      result.id ?? "",
      result.slug ?? "",
      result.url ?? "",
    ].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function matchStaticPages(query: string) {
  const normalizedQuery = normalizeArabic(query);

  if (!normalizedQuery) return [];

  return STATIC_PAGES.filter((page) => {
    const values = [page.title, ...page.aliases];

    return values.some((value) => {
      const normalizedValue = normalizeArabic(value);

      return (
        normalizedValue.includes(normalizedQuery) ||
        normalizedQuery.includes(normalizedValue)
      );
    });
  }).map((page) => ({
    id: page.id,
    type: "page" as const,
    category: page.category,
    title: page.title,
    slug: null,
    snippet: "",
    cover_url: null,
    youtube_id: null,
    created_at: null,
    url: page.url,
    source: "static-page",
  }));
}

/* =========================================================
   Database search
========================================================= */

async function searchField(
  source: SearchSource,
  field: string,
  variants: string[],
  perFieldLimit: number,
  debugErrors: any[]
): Promise<Record<string, any>[]> {
  const supabase = getSupabase();

  try {
    const orFilter = variants
      .map((variant) => `${field}.ilike.%${variant}%`)
      .join(",");

    let query = supabase
      .from(source.table)
      .select("*")
      .or(orFilter)
      .limit(perFieldLimit);

    if (source.published) {
      query = query.eq("published", true);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data ?? []).map((record: any) =>
      mapRecord(record, source)
    );
  } catch (error: any) {
    debugErrors.push({
      table: source.table,
      field,
      message: error?.message || String(error),
    });

    return [];
  }
}

async function searchSource(
  source: SearchSource,
  variants: string[],
  perFieldLimit: number,
  debugErrors: any[]
): Promise<Record<string, any>[]> {
  /**
   * كل حقل لوحده:
   * إذا field غير موجود بالجدول، باقي الحقول يظلوا شغالين.
   */
  const fieldResults = await Promise.all(
    source.fields.map((field) =>
      searchField(
        source,
        field,
        variants,
        perFieldLimit,
        debugErrors
      )
    )
  );

  return deduplicateResults(fieldResults.flat());
}

/* =========================================================
   Ranking
========================================================= */

function resultScore(
  result: Record<string, any>,
  rawQuery: string
): number {
  const query = normalizeArabic(rawQuery);
  const title = normalizeArabic(result?.title || "");
  const category = normalizeArabic(result?.category || "");

  let score = 100;

  if (title === query) {
    score -= 80;
  } else if (title.startsWith(query)) {
    score -= 60;
  } else if (title.includes(query)) {
    score -= 45;
  }

  if (category === query) {
    score -= 25;
  } else if (category.includes(query)) {
    score -= 15;
  }

  if (result.source === "static-page") {
    score -= 20;
  }

  return score;
}

/* =========================================================
   GET /api/search
========================================================= */

router.get("/search", async (req: Request, res: Response) => {
  const rawQuery = String(req.query.q ?? "").trim();

  const requestedLimit =
    Number.parseInt(String(req.query.limit ?? "20"), 10) || 20;

  const limit = Math.min(Math.max(requestedLimit, 1), 50);

  const debug = String(req.query.debug ?? "") === "1";

  if (!rawQuery) {
    return debug
      ? res.json({
          query: rawQuery,
          results: [],
          errors: [],
        })
      : res.json([]);
  }

  /**
   * حرف واحد بالعربي قد يعطي نتائج كثيرة جدًا.
   * حاليًا نسمح من حرف واحد، ويمكن تغييره إلى 2.
   */
  const variants = createSearchVariants(rawQuery);

  if (!variants.length) {
    return res.json([]);
  }

  const errors: any[] = [];

  try {
    const perFieldLimit = Math.min(Math.max(limit, 8), 20);

    const databaseGroups = await Promise.all(
      SEARCH_SOURCES.map((source) =>
        searchSource(
          source,
          variants,
          perFieldLimit,
          errors
        )
      )
    );

    const staticResults = matchStaticPages(rawQuery);

    let results = deduplicateResults([
      ...staticResults,
      ...databaseGroups.flat(),
    ]);

    results = results
      .filter((result) => result.title || result.url)
      .sort((a, b) => {
        const scoreDifference =
          resultScore(a, rawQuery) - resultScore(b, rawQuery);

        if (scoreDifference !== 0) {
          return scoreDifference;
        }

        const dateA = String(a.created_at || "");
        const dateB = String(b.created_at || "");

        if (dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }

        return String(a.title || "").localeCompare(
          String(b.title || ""),
          "ar"
        );
      })
      .slice(0, limit);

    if (debug) {
      return res.json({
        query: rawQuery,
        variants,
        count: results.length,
        errors,
        results,
      });
    }

    return res.json(results);
  } catch (error: any) {
    console.error("Search route error:", error);

    return res.status(500).json({
      error: "تعذّر تنفيذ البحث",
      details:
        process.env.NODE_ENV === "development"
          ? error?.message || String(error)
          : undefined,
    });
  }
});

export default router;