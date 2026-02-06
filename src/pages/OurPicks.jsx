// src/components/OurPicks.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./OurPicks.css";
import { cleanYouTubeUrl } from "./youtube";
import ThirdFrame from "./ThirdFrame";

const LS_KEY_BASE = "ourPicks_cache_v14";

function toYouTubeIdSafe(idOrUrl = "") {
  if (!idOrUrl) return "";
  idOrUrl = String(idOrUrl)
    .trim()
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

  const shortIdFromLinks = toYouTubeIdSafe(it.shorts_link || "") || toYouTubeIdSafe(it.short_image || "");
  const videoId =
    it._videoId ||
    toYouTubeIdSafe(it.video || "") ||
    toYouTubeIdSafe(it.video_url || "") ||
    toYouTubeIdSafe(it.url || "");

  const directShortImg = isDirectImage(it.short_image || "") ? it.short_image : "";
  const cleanImgLink = it._imageLinkClean || cleanYouTubeUrl(it.image_link || it.link || "");

  return {
    ...it,
    _shortId: shortIdFromLinks || it._shortId || "",
    _videoId: videoId || "",
    _shortImg: directShortImg,
    _imageLinkClean: cleanImgLink || "",
    title: it.title || "",
  };
}

const PLACEHOLDER_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
      <rect width="100%" height="100%" fill="#0b0b0b"/>
    </svg>`
  );

function YtThumb({ id, alt = "", fit = "cover" }) {
  const t = Date.now() % 100000;
  const candidates = useMemo(
    () => [
      `https://i.ytimg.com/vi/${id}/maxresdefault.jpg?t=${t}`,
      `https://i.ytimg.com/vi_webp/${id}/maxresdefault.webp?t=${t}`,
      `https://i.ytimg.com/vi/${id}/hq720.jpg?t=${t}`,
      `https://i.ytimg.com/vi/${id}/sddefault.jpg?t=${t}`,
      `https://img.youtube.com/vi/${id}/maxresdefault.jpg?t=${t}`,
      `https://img.youtube.com/vi/${id}/0.jpg?t=${t}`,
    ],
    [id]
  );

  const [finalSrc, setFinalSrc] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const good = (img) => {
      const w = img.naturalWidth || 0,
        h = img.naturalHeight || 0;
      return !(w <= 200 || h <= 120);
    };

    const load = (url, ms = 1500) =>
      new Promise((resolve) => {
        const img = new Image();
        let done = false;
        const end = (ok) => {
          if (!done) {
            done = true;
            resolve(ok ? img : null);
          }
        };
        const timer = setTimeout(() => end(false), ms);
        img.onload = () => {
          clearTimeout(timer);
          end(good(img));
        };
        img.onerror = () => {
          clearTimeout(timer);
          end(false);
        };
        img.referrerPolicy = "no-referrer";
        img.src = url;
      });

    (async () => {
      for (const u of candidates) {
        const ok = await load(u);
        if (cancelled) return;
        if (ok) {
          setFinalSrc(ok.src);
          return;
        }
      }
      if (!cancelled) setFinalSrc(PLACEHOLDER_SVG);
    })();

    return () => {
      cancelled = true;
    };
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
      }}
      decoding="async"
      loading="eager"
    />
  );
}

function PlayButton({ onClick, label = "تشغيل" }) {
  return (
    <button type="button" className="ourpicks-playbtn" aria-label={label} onClick={onClick}>
      <span className="ourpicks-playbtn__rect" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24">
          <path fill="#fff" d="M8 5v14l11-7z"></path>
        </svg>
      </span>
    </button>
  );
}

function FrameBox({ title, children, className = "" }) {
  return (
    <div className={`picks-frame ${className}`}>
      <div className="frame-header center">
        <h3 className="picks-frame-title">{title}</h3>
      </div>
      <div className="picks-frame-body">{children}</div>
    </div>
  );
}

export default function OurPicks() {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const latestReqId = useRef(0);
  const LS_KEY = `${LS_KEY_BASE}_p${page}`;

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
      if (Array.isArray(cached) && cached.length) setItems(cached);
      else setItems([]);
    } catch {
      setItems([]);
    }
  }, [page, LS_KEY]);

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
            if (j?.ok && Array.isArray(j.items)) {
              data = j;
              break;
            }
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
            x?.image_link ||
            x?.link ||
            x?._imageLinkClean
        );

        if (sane.length) {
          setItems(sane);
          try {
            localStorage.setItem(LS_KEY, JSON.stringify(sane));
          } catch {}
        }
      } catch {}
    })();

    return () => {
      aborted = true;
      controller.abort();
    };
  }, [page, LS_KEY]);

  const normalized = useMemo(() => items.map(normalize).filter(Boolean), [items]);
  const pageIdx = Math.max(0, (page || 1) - 1);

  const shortsList = useMemo(() => normalized.filter((i) => i._shortId || i.shorts_link || i.short_image), [normalized]);
  const videosList = useMemo(() => normalized.filter((i) => i._videoId || i.video || i.video_url || i.url), [normalized]);
  const imagesList = useMemo(() => normalized.filter((i) => i.image || i._imageLinkClean), [normalized]);

  const short = shortsList[pageIdx] || shortsList[0] || null;
  const vid = videosList[pageIdx] || videosList[0] || null;
  const img = imagesList[pageIdx] || imagesList[0] || null;

  const shortId =
    (short && (short._shortId || toYouTubeIdSafe(short.shorts_link || "") || toYouTubeIdSafe(short.short_image || ""))) || "";
  const vidId = toYouTubeIdSafe((vid && (vid._videoId || vid.video || vid.video_url || vid.url)) || "");

  const shortHref = shortId ? `https://www.youtube.com/shorts/${shortId}` : "";
  const videoHref = vidId ? `https://www.youtube.com/watch?v=${vidId}` : "";

  const imageHref = (img?._imageLinkClean && String(img._imageLinkClean)) || "#";
  const imageSrc =
    (img?.image && String(img.image)) ||
    (isDirectImage(img?._imageLinkClean || "") ? img?._imageLinkClean : "");

  const openInNew = (href) => {
    if (!href) return;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="our-picks" dir="rtl">
      <div className="our-picks__inner">
        <div className="our-picks__head">
          <h2 className="our-picks__heading">اختياراتنا</h2>

          {/* Pager اختياري */}
          {/* <div className="ourpicks-pager">
            <button className={page===1?"is-active":""} onClick={()=>setPage(1)}>1</button>
            <button className={page===2?"is-active":""} onClick={()=>setPage(2)}>2</button>
            <button className={page===3?"is-active":""} onClick={()=>setPage(3)}>3</button>
          </div> */}
        </div>

        <div className="picks-layout">
          {/* فيديو 16:9 */}
          <FrameBox title="فيديو" className={`picks-area-video ${vid ? "" : "is-disabled"}`}>
            <div className="picks-media media-16x9">
              {vidId ? <YtThumb id={vidId} alt="video" /> : <img src={PLACEHOLDER_SVG} alt="" />}
              <PlayButton onClick={() => openInNew(videoHref)} label="تشغيل الفيديو" />
            </div>

            <div className="picks-info">
            
            </div>
          </FrameBox>

          {/* صورة 16:9 */}
          <FrameBox title="مقال" className={`picks-area-image ${imageSrc ? "" : "is-disabled"}`}>
            
            <a className="picks-link" href={imageHref} target="_blank" rel="noopener noreferrer">
              <div className="picks-media media-16x9">
                <img src={imageSrc || PLACEHOLDER_SVG} alt={img?.title || "image"} loading="lazy" decoding="async" />
              </div>
            </a>

            <div className="picks-info">
              
             
            </div>
          </FrameBox>

          {/* شورت 9:16 */}
          <FrameBox title="فقرة قصيرة" className={`picks-area-short ${short ? "" : "is-disabled"}`}>
            <div className="picks-media media-9x16">
              {short && short._shortImg && isDirectImage(short._shortImg) ? (
                <img src={short._shortImg} alt={short?.title || "short"} loading="eager" decoding="async" />
              ) : shortId ? (
                <YtThumb id={shortId} alt={short?.title || "short"} />
              ) : (
                <img src={PLACEHOLDER_SVG} alt="" />
              )}

              <PlayButton onClick={() => openInNew(shortHref)} label={short?.title ? `تشغيل الشورت: ${short.title}` : "تشغيل الشورت"} />
            </div>

            <div className="picks-info">
              <div className="picks-title">{short?.title || "—"}</div>
              
            </div>
          </FrameBox>

          {/* تأمل — نفس ستايل فوق (إطار + هيدر) وبداخله ThirdFrame كما هو */}
          <div className="picks-area-meditation">
            <div className="picks-frame picks-frame--med">
              <div className="frame-header center">
                <h3 className="picks-frame-title">تأمّل هذا الأسبوع</h3>
              </div>
              <div className="picks-frame-body picks-frame-body--med">
                <ThirdFrame />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
