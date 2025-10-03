/* ========== Utils عامة ========== */
export function htmlUnescape(s = "") {
  return String(s).replace(/&amp;/g, "&").trim();
}

function firstHttpUrlFromText(s = "") {
  const m = String(s).match(/https?:\/\/[^\s"'<>()]+/i);
  return m ? m[0] : "";
}

function safeDecode(s = "") {
  try { s = decodeURIComponent(s); } catch {}
  try { s = decodeURIComponent(s); } catch {}
  return s;
}

/* ========== تنظيف الروابط العامة (تشمل Google redirect) ========== */
export function normalizeUrl(raw = ""): string {
  if (!raw) return "";
  let input = htmlUnescape(raw.trim());
  const embedded = firstHttpUrlFromText(input);
  if (embedded) input = embedded;

  try {
    // عالج index?continue= و player.htm?continue= قبل new URL
    const pre = stripYouTubeContinueLike(input);
    if (pre) input = pre;

    const u = new URL(input);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();

    // تفكيك google redirect
    const isGoogle = host === "google.com" || /\.google\./.test(host);
    const isRedirectPath = /^\/(url|imgres|aclk|u|interstitial|search)/i.test(u.pathname);
    if (isGoogle && isRedirectPath) {
      const v = u.searchParams.get("q")
        || u.searchParams.get("url")
        || u.searchParams.get("imgrefurl")
        || "";
      const out = firstHttpUrlFromText(safeDecode(v));
      if (out && /^https?:\/\//i.test(out)) return out;
      return ""; // لا نعيد google/url أبداً
    }

    return u.toString();
  } catch {
    return input;
  }
}

/* ========== حالات اليوتيوب الشاذة (index?continue / player.htm) ========== */
function stripYouTubeContinueLike(raw = ""): string {
  if (!raw) return "";
  const s = String(raw);

  // index?continue=<ENCODED_URL>
  const m1 = s.match(/[?&]continue=([^&#]+)/i);
  if (m1) {
    const decoded = safeDecode(m1[1]);
    const urlIn = firstHttpUrlFromText(decoded) || decoded;
    if (/^https?:\/\//i.test(urlIn)) return urlIn;
  }

  // player.htm?video_id=... (بعض القوالب القديمة)
  // نُرجع كما هو؛ toYouTubeId يتكفّل باستخراج ID لو وُجد.
  return raw;
}

/* ========== استخراج ID ليوتيوب (يشمل watch/shorts/youtu.be/embed) ========== */
export function toYouTubeId(urlOrId = ""): string {
  if (!urlOrId) return "";

  // ID مباشر؟
  if (/^[a-zA-Z0-9_-]{10,15}$/.test(urlOrId)) return urlOrId;

  // فك أي continue= أو google redirect
  let input = normalizeUrl(urlOrId);

  try {
    // بعض الحالات: consent.youtube.com أو m.youtube.com
    // أو embed أصلاً
    const u = new URL(input);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();

    // لو رابط embed أصلاً
    if (/^(youtube-nocookie\.com|youtube\.com)$/.test(host) && u.pathname.startsWith("/embed/")) {
      const seg = u.pathname.split("/")[2] || "";
      if (/^[a-zA-Z0-9_-]{10,15}$/.test(seg)) return seg;
    }

    // youtu.be/<id>
    if (host.includes("youtu.be")) {
      const seg = u.pathname.split("/")[1] || "";
      if (/^[a-zA-Z0-9_-]{10,15}$/.test(seg)) return seg;
    }

    // shorts/<id>
    if (u.pathname.startsWith("/shorts/")) {
      const seg = u.pathname.split("/")[2] || u.pathname.split("/")[1] || "";
      if (/^[a-zA-Z0-9_-]{10,15}$/.test(seg)) return seg;
    }

    // watch?v=<id>
    const v = u.searchParams.get("v");
    if (v && /^[a-zA-Z0-9_-]{10,15}$/.test(v)) return v;

    // fallback: التقط أي ID
    const m = input.match(/[?&]v=([^&#]+)|youtu\.be\/([^?#/]+)|shorts\/([^?#/]+)/);
    const id = m ? (m[1] || m[2] || m[3]) : "";
    if (id && /^[a-zA-Z0-9_-]{10,15}$/.test(id)) return id;
  } catch {
    // لو مش URL صالح، جرّب التقاط ID بالنمط العام
    const m = input.match(/[?&]v=([^&#]+)|youtu\.be\/([^?#/]+)|shorts\/([^?#/]+)/);
    const id = m ? (m[1] || m[2] || m[3]) : "";
    if (id && /^[a-zA-Z0-9_-]{10,15}$/.test(id)) return id;
  }

  return "";
}

/* ========== بناء رابط embed نظيف وثابت ========== */
export function buildEmbedUrl(input = ""): string {
  const id = toYouTubeId(input);
  if (!id) return "";

  const u = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
  // ثبّت البراميترات هنا، وتجنّب التضاعف
  u.searchParams.set("rel", "0");
  u.searchParams.set("modestbranding", "1");
  u.searchParams.set("playsinline", "1");
  u.searchParams.set("iv_load_policy", "3");
  u.searchParams.set("fs", "1");
  return u.toString();
}

/* ========== بديل سريع عند الحاجة ========== */
export const ytEmbed = (id?: string) =>
  id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&fs=1` : "";
