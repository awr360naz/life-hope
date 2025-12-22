import React, { useEffect, useMemo, useRef, useState } from "react";
import "./ShortsegSafePlayerModal.css";

/** ========== Helpers ========== */
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
    if (u.hostname.includes("youtu.be")) return u.pathname.split("/")[1] || "";
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || "";
    const v = u.searchParams.get("v");
    if (v) return v;
    const m = idOrUrl.match(/[?&]v=([^&#]+)|youtu\.be\/([^?#/]+)|shorts\/([^?#/]+)/);
    return m ? (m[1] || m[2] || m[3] || "") : "";
  } catch {
    return "";
  }
}

function buildEmbedUrl(id) {
  if (!id) return "";
  return `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`;
}

function buildYouTubePageUrl(id, asShort = true) {
  if (!id) return "#";
  return asShort ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`;
}

function guessThumb(id) {
  return `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
}

const isSafari = (() => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("safari") && !ua.includes("chrome") && !ua.includes("android");
})();

function getFallbackDelays() {
  const slowNet = (() => {
    try {
      const c = navigator.connection;
      return c && (c.saveData || ["slow-2g", "2g"].includes(c.effectiveType));
    } catch {
      return false;
    }
  })();

  if (slowNet && isSafari) return { d1: 7000, d2: 12000 };
  if (slowNet) return { d1: 6000, d2: 10000 };
  if (isSafari) return { d1: 5500, d2: 9000 };
  return { d1: 4200, d2: 7500 };
}

function preconnectYouTubeOnce() {
  if (typeof document === "undefined") return;
  const hosts = [
    "https://www.youtube.com",
    "https://www.youtube-nocookie.com",
    "https://i.ytimg.com",
  ];
  for (const href of hosts) {
    if ([...document.head.querySelectorAll('link[rel="preconnect"]')].some((l) => l.href === href)) continue;
    const l = document.createElement("link");
    l.rel = "preconnect";
    l.href = href;
    l.crossOrigin = "anonymous";
    document.head.appendChild(l);
  }
}

export default function ShortsegSafePlayerModal({
  open = false,
  onClose = () => {},
  item,
  title: titleProp,
}) {
  const modalRef = useRef(null);
  const iframeRef = useRef(null);

  const safeItem = item && typeof item === "object" ? item : {};

  const vidId = useMemo(() => {
    const candidates = [
      safeItem._videoId,
      safeItem._ytid,
      safeItem.videoId,
      safeItem.video_id,
      safeItem.video,
      safeItem.video_url,
      safeItem.url,
      safeItem.youtube_id,
      safeItem.youtube_url,
      safeItem.short_url,
      safeItem.id,
      safeItem.slug,
    ].filter(Boolean);

    const raw = candidates.length ? String(candidates[0]) : "";
    return toYouTubeIdSafe(raw);
  }, [safeItem]);

  const title = titleProp || safeItem.title || "فيديو";
  const embedUrl = useMemo(() => buildEmbedUrl(vidId), [vidId]);
  const pageUrl = useMemo(() => buildYouTubePageUrl(vidId, true), [vidId]);
  const thumbUrl = useMemo(() => guessThumb(vidId), [vidId]);

  const [loaded, setLoaded] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (!open) {
      setLoaded(false);
      setShowFallback(false);
      return;
    }
    preconnectYouTubeOnce();
    const { d1, d2 } = getFallbackDelays();
    const t1 = setTimeout(() => {
      if (!loaded) setShowFallback(true);
    }, d1);
    const t2 = setTimeout(() => {
      if (!loaded) setShowFallback(true);
    }, d2);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [open, loaded]);

  const onIframeLoad = () => setLoaded(true);

  // ✅ 1) امنع الإغلاق لو في Fullscreen (ESC بيطلع fullscreen بس ما بسكّر المودال)
  const isInFullscreen = () => {
    if (typeof document === "undefined") return false;
    return !!document.fullscreenElement;
  };

  // ✅ 2) اغلق فقط إذا الكبس كان فعلًا على الخلفية (مش من داخل المحتوى)
  const onBackdropClick = (e) => {
    // إذا في fullscreen: لا نغلق
    if (isInFullscreen()) return;

    // اغلق فقط إذا الهدف هو الخلفية نفسها (وليس عنصر داخلها)
    if (e.target !== e.currentTarget) return;

    onClose();
  };

  // ✅ 3) ESC ذكي: إذا مش fullscreen → ممكن تسكير (اختياري)
  // إذا بدك ESC ما يسكر أبدًا حتى خارج fullscreen: احذف هذا اليوزإفكت.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;

      // إذا في fullscreen → خلي المتصفح يطلع من fullscreen فقط
      if (isInFullscreen()) return;

      // خارج fullscreen: سكّر المودال (تقدر تعطلها إذا بدك)
      onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="shortsegmodal-backdrop" onClick={onBackdropClick} role="dialog" aria-modal="true">
      <div className="shortsegmodal-content" ref={modalRef}>
        {!!vidId && !showFallback ? (
          <div className="shortsegmodal-frame">
            <iframe
              ref={iframeRef}
              src={embedUrl}
              title={title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              loading="eager"
              onLoad={onIframeLoad}
            />
          </div>
        ) : (
          <a
            className="shortsegmodal-fallback"
            href={pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={title}
          >
            <img src={thumbUrl} alt={title} className="shortsegmodal-thumb" />
            <span className="shortsegmodal-play" aria-hidden></span>
          </a>
        )}

        <button type="button" className="shortsegmodal-close" onClick={onClose} aria-label="إغلاق">
          ✕
        </button>
      </div>
    </div>
  );
}
