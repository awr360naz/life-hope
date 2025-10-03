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

export function normalizeUrl(raw = ""): string {
  if (!raw) return "";
  let input = htmlUnescape(raw.trim());
  const embedded = firstHttpUrlFromText(input);
  if (embedded) input = embedded;

  try {
    const u = new URL(input);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();

    // تفكيك google redirect
    const isGoogle = host === "google.com" || /\.google\./.test(host);
    const isRedirectPath = /^\/(url|imgres|aclk|u|interstitial|search)/i.test(u.pathname);
    if (isGoogle && isRedirectPath) {
      const v = u.searchParams.get("q") || u.searchParams.get("url") || u.searchParams.get("imgrefurl");
      const out = firstHttpUrlFromText(safeDecode(v || ""));
      if (out && /^https?:\/\//i.test(out)) return out;
      return ""; // لا نعيد google/url أبداً
    }

    return u.toString();
  } catch {
    return input;
  }
}

export function toYouTubeId(urlOrId = ""): string {
  if (!urlOrId) return "";
  const s = urlOrId.trim();
  if (/^[\w-]{10,15}$/.test(s)) return s;

  const ustr = normalizeUrl(s) || s;
  try {
    const u = new URL(ustr);
    if (u.hostname.includes("youtu.be")) return u.pathname.split("/")[1] || "";
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || "";
    const v = u.searchParams.get("v");
    if (v) return v;
  } catch {}

  const m = ustr.match(/[?&]v=([^&#]+)|youtu\.be\/([^?#/]+)|shorts\/([^?#/]+)/);
  return m ? (m[1] || m[2] || m[3]) : "";
}

export const ytEmbed = (id?: string) =>
  id ? `https://www.youtube-nocookie.com/embed/${id}` : "";
