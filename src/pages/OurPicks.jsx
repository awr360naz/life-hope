import React, { useEffect, useMemo, useRef, useState } from "react";
import "./OurPicks.css";
import { cleanYouTubeUrl } from "./youtube";

const LS_KEY_BASE = "ourPicks_cache_v10";

/* ========================= Helpers ========================= */

function toYouTubeIdSafe(idOrUrl = "") {
  if (!idOrUrl) return "";
  idOrUrl = String(idOrUrl).trim()
    .replace(/^<|>$/g, "")
    .replace(/&si=[^&]+/g, "")
    .replace(/&pp=[^&]+/g, "")
    .replace(/[?&]feature=share/g, "");
  if (/^[a-zA-Z0-9_-]{10,15}$/.test(idOrUrl)) return idOrUrl;
  try {
    const u = new URL(idOrUrl);
    if (u.hostname.includes("youtu.be")) return (u.pathname.split("/")[1] || "").trim();
    if (u.pathname.startsWith("/shorts/")) return (u.pathname.split("/")[2] || "").trim();
    return (u.searchParams.get("v") || "").trim();
  } catch {
    const m = idOrUrl.match(/[?&]v=([^&#]+)|youtu\.be\/([^?#/]+)|shorts\/([^?#/]+)/);
    return m ? (m[1] || m[2] || m[3]) : "";
  }
}

function isDirectImage(url = "") {
  return /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(url);
}

function normalize(it) {
  if (!it) return null;
  const shortIdFromLinks =
    toYouTubeIdSafe(it.shorts_link || "") ||
    toYouTubeIdSafe(it.short_image || "");

  const videoId =
    it._videoId ||
    toYouTubeIdSafe(it.video || "") ||
    toYouTubeIdSafe(it.video_url || "") ||
    toYouTubeIdSafe(it.url || "");

  const directShortImg = isDirectImage(it.short_image || "") ? it.short_image : "";

  const cleanImgLink =
    it._imageLinkClean || cleanYouTubeUrl(it.image_link || it.link || "");

  return {
    ...it,
    _shortId: shortIdFromLinks || it._shortId || "",
    _videoId: videoId || "",
    _shortImg: directShortImg,
    _imageLinkClean: cleanImgLink || "",
    title: it.title || "",
  };
}

/* Placeholder نظيف */
const PLACEHOLDER_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
      <rect width="100%" height="100%" fill="#000"/>
    </svg>`
  );

/* صورة يوتيوب — تحميل أوف-DOM بدون رمش + مسارات بديلة وكسر كاش */
function YtThumb({ id, alt = "", style, fit = "cover" }) {
  const t = Date.now() % 100000;
  const candidates = useMemo(() => ([
    `https://i.ytimg.com/vi/${id}/maxresdefault.jpg?t=${t}`,
    `https://i.ytimg.com/vi_webp/${id}/maxresdefault.webp?t=${t}`,
    `https://i.ytimg.com/vi/${id}/hq720.jpg?t=${t}`,
    `https://i.ytimg.com/vi/${id}/sddefault.jpg?t=${t}`,
    `https://img.youtube.com/vi/${id}/maxresdefault.jpg?t=${t}`,
    `https://i3.ytimg.com/vi/${id}/maxresdefault.jpg?t=${t}`,
    `https://img.youtube.com/vi/${id}/0.jpg?t=${t}`,
    `https://i.ytimg.com/vi/${id}/0.jpg?t=${t}`,
  ]), [id]);

  const [finalSrc, setFinalSrc] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const good = (img) => {
      const w = img.naturalWidth || 0, h = img.naturalHeight || 0;
      return !(w <= 200 || h <= 120); // ارفض الصغير جدًا (غالبًا الرمادي)
    };

    const load = (url, ms = 1500) => new Promise((resolve) => {
      const img = new Image();
      let done = false;
      const end = (ok) => { if (!done) { done = true; resolve(ok ? img : null); } };
      const timer = setTimeout(() => end(false), ms);
      img.onload = () => { clearTimeout(timer); end(good(img)); };
      img.onerror = () => { clearTimeout(timer); end(false); };
      img.referrerPolicy = "no-referrer";
      img.src = url;
    });

    (async () => {
      for (const u of candidates) {
        const ok = await load(u);
        if (cancelled) return;
        if (ok) { setFinalSrc(ok.src); return; }
      }
      if (!cancelled) setFinalSrc(PLACEHOLDER_SVG);
    })();

    return () => { cancelled = true; };
  }, [candidates]);

  return (
    <img
      src={finalSrc || PLACEHOLDER_SVG}
      alt={alt}
      style={{
        width: "100%",
        height: "100%",
        objectFit: fit,
        objectPosition: "center",
        display: "block",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        ...style
      }}
      decoding="async"
      loading="eager"
    />
  );
}

/* زر التشغيل — مستطيل أحمر ثابت */
function PlayButton({ onClick, label = "تشغيل", small = false }) {
  return (
    <button
      type="button"
      className={`ourpicks-playbtn${small ? " is-small" : ""}`}
      aria-label={label}
      onClick={onClick}
    >
      <span className="ourpicks-playbtn__rect">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#fff" d="M8 5v14l11-7z"></path>
        </svg>
      </span>
    </button>
  );
}

/* ========================= Component ========================= */

export default function OurPicks() {
  const [page, setPage] = useState(1); // 1|2|3
  const [items, setItems] = useState([]);
  const latestReqId = useRef(0);

  const LS_KEY = `${LS_KEY_BASE}_p${page}`;

  // كاش
  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
      if (Array.isArray(cached) && cached.length) setItems(cached);
      else setItems([]);
    } catch { setItems([]); }
  }, [page]);

  // Fetch مرن (row/page)
  useEffect(() => {
    let aborted = false;
    const controller = new AbortController();
    const reqId = ++latestReqId.current;
    (async () => {
      try {
        const cb = Date.now();
        const candidates = [
          `/api/content/our-picks?row=${page}&_cb=${cb}`,
          `/api/content/our-picks?page=${page}&_cb=${cb}`,
          `/api/content/our-picks?_cb=${cb}`,
        ];
        let data = null;
        for (const url of candidates) {
          try {
            const res = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
            if (!res.ok) continue;
            const j = await res.json();
            if (j?.ok && Array.isArray(j.items)) { data = j; break; }
          } catch {}
        }
        if (aborted || reqId !== latestReqId.current || !data) return;

        const sane = data.items.filter(
          (x) =>
            x?.shorts_link ||
            x?.short_image ||
            x?._shortId ||
            x?._videoId ||
            x?.image ||
            x?._imageLinkClean
        );

        if (sane.length) {
          setItems(sane);
          try { localStorage.setItem(LS_KEY, JSON.stringify(sane)); } catch {}
        }
      } catch {}
    })();
    return () => { aborted = true; controller.abort(); };
  }, [page, LS_KEY]);

  const normalized = useMemo(() => items.map(normalize).filter(Boolean), [items]);

  const pageIdx = Math.max(0, (page || 1) - 1);

  const shortsList = useMemo(
    () => normalized.filter(i => i._shortId || i.shorts_link || i.short_image),
    [normalized]
  );
  const videosList = useMemo(
    () => normalized.filter(i => i._videoId || i.video || i.video_url || i.url),
    [normalized]
  );
  const imagesList = useMemo(
    () => normalized.filter(i => i.image || i._imageLinkClean),
    [normalized]
  );

  const short = shortsList[pageIdx] || shortsList[0] || null;
  const vid   = videosList[pageIdx] || videosList[0] || null;
  const img   = imagesList[pageIdx] || imagesList[0] || null;

  const shortId = (short && (short._shortId || toYouTubeIdSafe(short.shorts_link || "") || toYouTubeIdSafe(short.short_image || ""))) || "";
  const vidId   = toYouTubeIdSafe((vid && (vid._videoId || vid.video || vid.video_url || vid.url)) || "");

  const shortHref = shortId ? `https://www.youtube.com/shorts/${shortId}` : "";
  const videoHref = vidId   ? `https://www.youtube.com/watch?v=${vidId}` : "";

  const imageSrc =
    (img?.image && String(img.image)) ||
    (isDirectImage(img?._imageLinkClean || "") ? img?._imageLinkClean : "");

  // فتح الروابط فقط من زر التشغيل
  const openInNew = (href) => {
    if (!href) return;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const isMobile = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 768px)").matches;
const handleShortCardClick = React.useCallback((e) => {
  if (e.defaultPrevented) return;
  if (!short || !shortHref) return;

  // لو النقر كان على عنصر تفاعلي (زر/رابط/إلخ) خلّيه يشتغل كالمعتاد
  const isInteractive = e.target.closest?.("button, a, input, textarea, select, label");
  if (isInteractive) return;

  // لو النقر كان على زر التشغيل نفسه، ما نكرر الفتح
  const onPlayBtn = e.target.closest?.(".ourpicks-playbtn");
  if (onPlayBtn) return;

  openInNew(shortHref);
}, [short, shortHref, openInNew]);
              
  return (
    <section className="our-picks" dir="rtl">
      <div className="our-picks__inner">
        <h2 className="our-picks__heading">اختياراتنا</h2>

        <div className="our-picks__grid">
          {/* SHORT: يملا ارتفاع صفّين — الصورة تملأ الإطار، والعنوان تحتها */}
           <div
  className={`ourpicks-card ourpicks-card--short tabIndex={0}  ${short ? "" : " is-disabled"}` }
  onClick={handleShortCardClick}
  role="button"
  tabIndex={0}
  onKeyDown={(e) => { 
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleShortCardClick(e);
    }
  }}
>
  <div className="ourpicks-box short-thumb-wrap" aria-label={short?.title ? `الشورت: ${short.title}` : "الشورت"}>
    {short && (short._shortImg && isDirectImage(short._shortImg)) ? (
      <img
        src={short._shortImg}
        alt={short?.title || "short"}
        loading="eager"
        decoding="async"
      />
    ) : shortId ? (
      <YtThumb id={shortId} alt={short?.title || "short"} fit="cover" />
    ) : (
      <img src={PLACEHOLDER_SVG} alt="" />
    )}
    <PlayButton
      onClick={() => openInNew(shortHref)}
      label={short?.title ? `تشغيل الشورت: ${short.title}` : "تشغيل الشورت"}
      small={isMobile}
    />
  </div>
  <div className="ourpicks-short-titlebox">
    <div className="ourpicks-titlebar">{short?.title || ""}</div>
  </div>
</div>

            

          {/* VIDEO: صورة + زر تشغيل فقط */}
          <div className={`ourpicks-card ourpicks-card--video${vid ? "" : " is-disabled"}`}>
            <div className="ourpicks-box" aria-label="فيديو">
              {vidId ? (
                <YtThumb id={vidId} alt="video" fit="cover" />
              ) : (
                <img src={PLACEHOLDER_SVG} alt="" />
              )}
              <PlayButton
                onClick={() => openInNew(videoHref)}
                label="تشغيل الفيديو"
                small={isMobile}
              />
            </div>
          </div>

          {/* IMAGE: تفتح من الكرت نفسه */}
          <a
            className={`ourpicks-card ourpicks-card--image${imageSrc ? "" : " is-disabled"}`}
            href={(img?._imageLinkClean || "#")}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={img?.title ? `فتح: ${img.title}` : "فتح الرابط"}
          >
            <div className="ourpicks-box">
              <img
                src={imageSrc || PLACEHOLDER_SVG}
                alt={img?.title || "image"}
                loading="lazy"
                decoding="async"
              />
            </div>
          </a>
        </div>

        {/* Pager 1 | 2 | 3 */}
        <div className="ourpicks-pager">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              aria-label={`الصف ${n}`}
              className={n === page ? "is-active" : ""}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
