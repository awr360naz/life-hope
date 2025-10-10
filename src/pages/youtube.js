// src/pages/youtube.js
// Utilities للتعامل مع روابط يوتيوب + بناء embed URLs آمنة لكروم

/* ========== Helpers أساسيّة ========== */
export function htmlUnescape(s = "") {
  return String(s)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function firstHttpUrlFromText(s = "") {
  const m = String(s).match(/https?:\/\/[^\s"'<>()]+/i);
  return m ? m[0] : "";
}

function safeDecode(s = "") {
  // أحياناً اللينك بيكون double-encoded
  try { s = decodeURIComponent(s); } catch {}
  try { s = decodeURIComponent(s); } catch {}
  return s;
}

/**
 * ينظّف روابط محوّلة (redirect) مثل:
 * google.com/url?…&q=https://youtu.be/… أو نص فيه رابط داخل HTML
 */
export function cleanYouTubeUrl(raw = "") {
  if (!raw) return "";
  let input = htmlUnescape(raw);
  const embedded = firstHttpUrlFromText(input);
  if (embedded) input = embedded;

  input = safeDecode(input);

  // التقاط q= أو continue= من روابط تحويل جوجل
  try {
    const u = new URL(input);
    const q = u.searchParams.get("q") || u.searchParams.get("continue");
    if (q && /^https?:\/\//i.test(q)) return q;
  } catch {}

  return input;
}

/* ========== استخراج الـ ID ========== */
/**
 * يحاول استخراج YouTube Video ID من:
 * - watch?v=…
 * - youtu.be/…
 * - shorts/…
 * - أو إن كان النص أصلاً ID صالح
 */
export function toYouTubeId(urlOrId = "") {
  if (!urlOrId) return "";
  const raw = cleanYouTubeUrl(urlOrId).trim();

  // إذا كان فعلاً ID
  if (/^[a-zA-Z0-9_-]{10,15}$/.test(raw)) return raw;

  // حاول كـ URL
  try {
    const u = new URL(raw);

    // youtu.be/<id>
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.split("/")[1] || "";
      if (id) return id;
    }

    // /shorts/<id>
    if (u.pathname.startsWith("/shorts/")) {
      const id = u.pathname.split("/")[2] || "";
      if (id) return id;
    }

    // watch?v=<id>
    const v = u.searchParams.get("v");
    if (v) return v;

    // محاولة أخيرة من المسار
    const m2 = u.pathname.match(/\/embed\/([^/?#]+)/);
    if (m2 && m2[1]) return m2[1];
  } catch {
    // لو مش URL صالح، جرّب RegExp مباشرة
    const m = raw.match(/[?&]v=([^&#]+)|youtu\.be\/([^?#/]+)|shorts\/([^?#/]+)/);
    if (m) return m[1] || m[2] || m[3] || "";
  }

  return "";
}

/* ========== بناء رابط Embed آمن لكروم ========== */
/**
 * مبدئيًا نستخدم youtube.com بدل youtube-nocookie.com
 * لتفادي ERR_TOO_MANY_REDIRECTS على Chrome.
 */
export function buildEmbedUrlSafe(id, opts = {}) {
  const {
    autoplay = 0,        // 0 أو 1
    modest = 1,          // 1 لتخفيف الب branding
    playsinline = 1,     // 1 لتشغيل داخل الصفحة على الموبايل
    iv_load_policy = 3,  // إخفاء annotations قدر الإمكان
    rel = 0,             // 0 منع اقتراحات قنوات خارجية قدر الإمكان
  } = opts;

  if (!id) return "";

  const base = "https://www.youtube.com/embed/";
  const params = new URLSearchParams({
    rel: String(rel),
    modestbranding: String(modest),
    playsinline: String(playsinline),
    iv_load_policy: String(iv_load_policy),
  });

  if (autoplay) params.set("autoplay", "1");

  return `${base}${id}?${params.toString()}`;
}

/* توافق خلفي: أي استيراد قديم لـ buildEmbedUrl سيعمل تلقائيًا */
export const buildEmbedUrl = buildEmbedUrlSafe;
