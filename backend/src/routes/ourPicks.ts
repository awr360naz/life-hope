// backend/src/routes/ourPicks.js
import { Router } from "express";
import { getSupabase, supabase as supabaseSingleton } from "../supabaseClient.js";

const router = Router();
const sb = typeof getSupabase === "function" ? getSupabase() : supabaseSingleton;

/* ========== Helpers ========== */
function htmlUnescape(s = "") {
  return String(s).replace(/&amp;/g, "&").trim();
}
function safeDecode(s = "") {
  try { s = decodeURIComponent(s); } catch {}
  try { s = decodeURIComponent(s); } catch {}
  return s;
}
function firstHttpUrlFromText(s = "") {
  const m = String(s).match(/https?:\/\/[^\s"'<>()]+/i);
  return m ? m[0] : "";
}
function cleanRedirect(raw = "") {
  if (!raw) return "";
  let input = htmlUnescape(raw);
  const embedded = firstHttpUrlFromText(input);
  if (embedded) input = embedded;

  try {
    const u = new URL(input);
    const isGoogle = /\.google\./i.test(u.hostname);
    const isRedirectPath = /^\/(url|imgres|u|aclk)/i.test(u.pathname);

    if (isGoogle && isRedirectPath) {
      for (const k of ["q", "url", "imgrefurl"]) {
        const v = u.searchParams.get(k);
        if (v) {
          const out = firstHttpUrlFromText(safeDecode(v)) || safeDecode(v);
          if (/^https?:\/\//i.test(out)) return out.trim();
        }
      }
      // ما قدرنا نطلع الهدف الحقيقي → لا ترجع رابط Google ناقص
      return "";
    }

    if (isGoogle && u.pathname.startsWith("/search")) {
      const q = u.searchParams.get("q");
      if (q) {
        const dec = safeDecode(q);
        if (/^https?:\/\//i.test(dec)) return dec.trim();
      }
      // search بدون هدف صريح → لا ترجع Google
      return "";
    }

    if (/^l\.(facebook|instagram)\.com$/i.test(u.hostname)) {
      const cand = u.searchParams.get("u") || u.searchParams.get("url");
      if (cand) return safeDecode(cand).trim();
      return "";
    }

    for (const p of [
      "utm_source","utm_medium","utm_campaign","utm_term","utm_content",
      "fbclid","gclid","mc_cid","mc_eid","igsh","si","ved","usg","sca_esv"
    ]) u.searchParams.delete(p);

    return u.toString().trim();
  } catch {
    const rescue = firstHttpUrlFromText(input);
    return (rescue || input).trim();
  }
}

function toYouTubeId(input0 = "") {
  if (!input0) return "";
  const direct = String(input0).trim();
  if (/^[a-zA-Z0-9_-]{10,15}$/.test(direct)) return direct;

  const input = cleanRedirect(direct);
  const quick = input.match(
    /[?&]v=([^&#]+)|youtu\.be\/([^?#/]+)|shorts\/([^?#/]+)|\/vi\/([^/]+)\//
  );
  if (quick) return quick[1] || quick[2] || quick[3] || quick[4] || "";

  try {
    const u = new URL(input);
    const host = u.hostname || "";
    const p = u.pathname || "";
    if (host.includes("youtu.be")) return p.split("/")[1] || "";
    if (p.startsWith("/shorts/")) return p.split("/")[2] || p.split("/")[1] || "";
    const v = u.searchParams.get("v");
    if (v) return v;
    const m2 = p.match(/\/vi\/([^/]+)\//);
    if (m2?.[1]) return m2[1];
  } catch {}
  return "";
}

/* ========== Normalizer آمن صفّاً صفّاً ========== */
function isGoogleHost(url = "") {
  try { return /\.google\./i.test(new URL(url).hostname); } catch { return false; }
}

function normalizeRowSafe(it, idx, debug) {
  const out = { ...it };

  const fields = ["image_link", "shorts_link", "short_image", "video"];
  for (const f of fields) {
    try { out[f] = cleanRedirect(it[f] || ""); }
    catch (e) {
      if (debug) console.error(`[our-picks] clean ${f} failed at row`, idx, it?.id, e);
      out[f] = it[f] || "";
    }
    if (isGoogleHost(out[f])) out[f] = ""; // لا ترجع google redirect أبدًا
  }

  try {
    out._shortId = toYouTubeId(out.shorts_link) || toYouTubeId(out.short_image) || null;
  } catch (e) {
    if (debug) console.error("[our-picks] toYouTubeId short failed at row", idx, it?.id, e);
    out._shortId = null;
  }

  try {
    out._videoId = toYouTubeId(out.video) || null;
  } catch (e) {
    if (debug) console.error("[our-picks] toYouTubeId video failed at row", idx, it?.id, e);
    out._videoId = null;
  }

  // رابط الصورة الخارجي النظيف
  out._imageLinkClean = out.image_link && !isGoogleHost(out.image_link) ? out.image_link : "";

  return out;
}


/* ========== GET /api/content/our-picks ========== */
router.get("/", async (req, res) => {
  const debug = String(req.query.debug || "0") === "1";
  try {
    const { data, error } = await sb
      .from("our_picks")
      .select("id, title, image, image_link, shorts_link, short_image, video, sort, published, updated_at")
      .eq("published", true)
      .order("sort", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      if (debug) console.error("[our-picks] supabase error:", error);
      return res.status(500).json({ ok: false, error: "db_error", detail: error.message });
    }

    const src = Array.isArray(data) ? data : [];
    const safe = [];
    for (let i = 0; i < src.length; i++) {
      try {
        safe.push(normalizeRowSafe(src[i], i, debug));
      } catch (e) {
        if (debug) console.error("[our-picks] normalize crash at row", i, src[i]?.id, e, src[i]);
        // تخطّى الصف المعطّل بدل ما يوقع الراوتر كله
      }
    }

    return res.json({ ok: true, items: safe });
  } catch (e) {
    if (debug) console.error("[our-picks] route crash:", e);
    return res.status(500).json({ ok: false, error: "route_crash", detail: String(e?.message || e) });
  }
});

export default router;
