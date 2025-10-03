// src/pages/youtube.js

// يحوّل &amp; إلى & ويقصّ الفراغات
function htmlUnescape(s = "") {
  return String(s).replace(/&amp;/g, "&").trim();
}

// يحاول يفكّ ترميز URL مرتين لو لزم
function safeDecode(s = "") {
  try { s = decodeURIComponent(s); } catch {}
  try { s = decodeURIComponent(s); } catch {}
  return s;
}

// يلقط أوّل https://... من نصّ (للإنقاذ بحالات غريبة)
function firstHttpUrlFromText(s = "") {
  const m = String(s).match(/https?:\/\/[^\s"'<>()]+/i);
  return m ? m[0] : "";
}

// ينظّف روابط Redirect (Google, Facebook, إلخ) ويُعيد الهدف الأصلي
export function cleanYouTubeUrl(raw = "") {
  if (!raw) return "";
  let input = htmlUnescape(raw);

  // لو النص نفسه يحتوي URL مضمّن، نطلّعه
  const embedded = firstHttpUrlFromText(input);
  if (embedded) input = embedded;

  // حاول نحلّل كـ URL
  try {
    const u = new URL(input);

    // لو هو google redirect بأنواعه
    const isGoogle = /\.google\./.test(u.hostname);
    const isRedirectPath = /^\/(url|imgres|u|aclk)/.test(u.pathname);

    if (isGoogle && isRedirectPath) {
      // أولويّة لاستخراج الهدف
      const candKeys = ["q", "url", "imgrefurl"];
      for (const k of candKeys) {
        const v = u.searchParams.get(k);
        if (v) {
          const decoded = safeDecode(v);
          const out = firstHttpUrlFromText(decoded) || decoded;
          if (/^https?:\/\//i.test(out)) return out.trim();
        }
      }
      // أحيانًا بتيجي القيم ضمن باراميترات أخرى
      const any = safeDecode(u.search.replace(/^\?/, ""));
      const fallback = firstHttpUrlFromText(any);
      if (fallback) return fallback.trim();
      return input.trim();
    }

    // حالات google/search?q=<رابط-حرفيًا>
    if (isGoogle && u.pathname.startsWith("/search")) {
      const q = u.searchParams.get("q");
      if (q) {
        const decoded = safeDecode(q);
        if (/^https?:\/\//i.test(decoded)) return decoded.trim();
      }
    }

    // Facebook/Instagram redirect (احتياط)
    if (/^l\.(facebook|instagram)\.com$/i.test(u.hostname)) {
      const cand = u.searchParams.get("u") || u.searchParams.get("url");
      if (cand) return safeDecode(cand).trim();
    }

    // إن لم يكن Redirect معروف: نظّف باراميترات التتبّع فقط
    const trackParams = [
      "utm_source","utm_medium","utm_campaign","utm_term","utm_content",
      "fbclid","gclid","mc_cid","mc_eid","igsh","si","ved","usg","sca_esv"
    ];
    trackParams.forEach((p) => u.searchParams.delete(p));
    return u.toString().trim();
  } catch {
    // لو ما قدر يبارس، رجّع أول URL إن وُجد
    const rescue = firstHttpUrlFromText(input);
    return (rescue || input).trim();
  }
}

// يحاول استخراج ID من كل الأنماط الشائعة
// يحاول استخراج ID من كل الأنماط الشائعة (مع دعم /embed/ و nocookie)
export function toYouTubeId(input0 = "") {
  if (!input0) return "";

  const direct = String(input0).trim();
  if (/^[a-zA-Z0-9_-]{10,15}$/.test(direct)) return direct;

  const input = cleanYouTubeUrl(direct);

  // 1) Regex سريع – أضفنا /embed/
  const quick = input.match(
    /[?&]v=([^&#]+)|youtu\.be\/([^?#/]+)|shorts\/([^?#/]+)|\/vi\/([^/]+)\/|\/embed\/([^/?#]+)/i
  );
  if (quick) return quick[1] || quick[2] || quick[3] || quick[4] || quick[5] || "";

  // 2) URL parsing
  try {
    const u = new URL(input);
    const host = u.hostname || "";
    const p = u.pathname || "";

    // دعم youtube-nocookie.com أيضًا
    if (host.includes("youtu.be")) return p.split("/")[1] || "";

    if (p.startsWith("/shorts/")) return p.split("/")[2] || p.split("/")[1] || "";

    if (p.startsWith("/embed/")) return p.split("/")[2] || ""; // ← جديد

    const v = u.searchParams.get("v");
    if (v) return v;

    const m2 = p.match(/\/vi\/([^/]+)\//);
    if (m2?.[1]) return m2[1];

    return "";
  } catch {
    return "";
  }
}


// يبني رابط embed نظيف (nocookie + params آمنة)
export function buildEmbedUrl(id) {
  if (!id) return "";
  const base = `https://www.youtube-nocookie.com/embed/${id}`;
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    iv_load_policy: "3",
    fs: "1",
  });
  return `${base}?${params.toString()}`;
}
