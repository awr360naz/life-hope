
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

  try { s = decodeURIComponent(s); } catch {}
  try { s = decodeURIComponent(s); } catch {}
  return s;
}

export function cleanYouTubeUrl(raw = "") {
  if (!raw) return "";
  let input = htmlUnescape(raw);
  const embedded = firstHttpUrlFromText(input);
  if (embedded) input = embedded;

  input = safeDecode(input);

  try {
    const u = new URL(input);
    const q = u.searchParams.get("q") || u.searchParams.get("continue");
    if (q && /^https?:\/\//i.test(q)) return q;
  } catch {}

  return input;
}

export function toYouTubeId(urlOrId = "") {
  if (!urlOrId) return "";
  const raw = cleanYouTubeUrl(urlOrId).trim();

 
  if (/^[a-zA-Z0-9_-]{10,15}$/.test(raw)) return raw;

  try {
    const u = new URL(raw);

    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.split("/")[1] || "";
      if (id) return id;
    }

    if (u.pathname.startsWith("/shorts/")) {
      const id = u.pathname.split("/")[2] || "";
      if (id) return id;
    }

    const v = u.searchParams.get("v");
    if (v) return v;


    const m2 = u.pathname.match(/\/embed\/([^/?#]+)/);
    if (m2 && m2[1]) return m2[1];
  } catch {
   
    const m = raw.match(/[?&]v=([^&#]+)|youtu\.be\/([^?#/]+)|shorts\/([^?#/]+)/);
    if (m) return m[1] || m[2] || m[3] || "";
  }

  return "";
}


export function buildEmbedUrlSafe(id, opts = {}) {
  const {
    autoplay = 0,        
    modest = 1,         
    playsinline = 1,     
    iv_load_policy = 3, 
    rel = 0,         
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


export const buildEmbedUrl = buildEmbedUrlSafe;
