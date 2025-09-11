import React, { useEffect, useRef, useState } from "react";
import "./ShortSegmentsCarousel.css";
import { Link } from "react-router-dom";

const LS_KEY = "shortSegs";
const API_URL = "/api/content/short-segments?limit=24";

function toYouTubeId(urlOrId = "") {
  if (!urlOrId) return "";
  if (/^[a-zA-Z0-9_-]{10,15}$/.test(urlOrId)) return urlOrId;
  try {
    const u = new URL(urlOrId);
    if (u.hostname.includes("youtu.be")) return u.pathname.split("/")[1] || "";
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || "";
    const v = u.searchParams.get("v");
    if (v) return v;
    const m = urlOrId.match(/[?&]v=([^&#]+)|youtu\.be\/([^?#/]+)|shorts\/([^?#/]+)/);
    return m ? (m[1] || m[2] || m[3]) : "";
  } catch {
    return "";
  }
}
function toYouTubeURL(urlOrId = "") {
  const id = toYouTubeId(urlOrId);
  return id ? `https://www.youtube.com/watch?v=${id}` : (urlOrId || "");
}
function toCover(item) {
  if (item?.cover_url) return item.cover_url;
  const vid = toYouTubeId(item?.video_url || item?.url || "");
  return vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : null;
}

export default function ShortSegmentsCarousel({
  title = "فقرات قصيرة",
  perView = 4,
  step = 1,
  linkTo = "/shorts",
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [index, setIndex] = useState(0);
  const reqIdRef = useRef(0);
  const trackRef = useRef(null);

  // تحميل من الكاش + الشبكة
  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
      if (Array.isArray(cached) && cached.length > 0) {
        setItems(cached);
        setLoading(false);
      }
    } catch {}

    const myId = ++reqIdRef.current;
    (async () => {
      try {
        const res = await fetch(API_URL, { headers: { Accept: "application/json" } });
        const text = await res.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch {}
        if (!res.ok) throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
        if (myId !== reqIdRef.current) return;

        const list = Array.isArray(data?.items) ? data.items : [];
        if (list.length > 0) {
          localStorage.setItem(LS_KEY, JSON.stringify(list));
          setItems(list);
          setErr("");
        }
      } catch (e) {
        if (!items.length) setErr(e?.message || "خطأ في التحميل");
      } finally {
        setLoading(false);
      }
    })();
    return () => { reqIdRef.current++; };
  }, []);

  const visible = useResponsivePerView(perView);

  // اضبط الإندكس إذا تغيّر
  useEffect(() => {
    const max = Math.max(0, items.length - visible);
    if (index > max) setIndex(max);
  }, [visible, items.length]);

  const maxIndex = Math.max(0, items.length - visible);
  const canPrev = items.length > visible && index > 0;
  const canNext = items.length > visible && index < maxIndex;

  function getTrackGapPx(trackEl) {
    const st = getComputedStyle(trackEl);
    const g1 = parseFloat(st.columnGap || "0");
    const g2 = parseFloat(st.gap || "0");
    const g = Math.max(isNaN(g1) ? 0 : g1, isNaN(g2) ? 0 : g2);
    return Number.isFinite(g) && g > 0 ? g : 12;
  }

  const goToIndex = (nextIdx) => {
    const track = trackRef.current;
    if (!track) return;
    const firstCard = track.querySelector(".shortsegs-card");
    if (!firstCard) return;

    const gap = getTrackGapPx(track);
    const cardWidth = firstCard.offsetWidth + gap;

    const clamped = Math.max(0, Math.min(maxIndex, nextIdx));
    const deltaItems = clamped - index;
    const deltaPx = deltaItems * cardWidth;

    track.scrollBy({ left: -deltaPx, behavior: "smooth" });
    setIndex(clamped);
  };

  if (!loading && !items.length) {
    return (
      <section className="shortsegs-section">
        <div className="shortsegs-header">
          <h2 className="shortsegs-title">{title}</h2>
        </div>
        <div className="shortsegs-empty">
          {err ? `خطأ: ${err}` : "لا يوجد محتوى حالياً."}
        </div>
      </section>
    );
  }

  return (
    <section className="shortsegs-section" dir="rtl" aria-labelledby="shortsegs-title">
      <div className="shortsegs-header">
        <h2 id="shortsegs-title" className="shortsegs-title">{title}</h2>
        {linkTo && <Link to={linkTo} className="shortsegs-viewall">عرض الكل </Link>}
      </div>
<br></br>
      <div className="shortsegs-viewport">
        <div
          className="shortsegs-track"
          ref={trackRef}
          dir="rtl"
          style={{ "--perView": visible }}
        >
          {items.map((it, i) => {
            const cover = toCover(it);
            const href = toYouTubeURL(it?.video_url || it?.url || it?.youtube_id || "");
            const clickable = !!href;
            const CardTag = clickable ? "a" : "div";
            return (
              <CardTag
                key={it.id ?? i}
                className="shortsegs-card"
                {...(clickable ? { href, target: "_blank", rel: "noopener noreferrer" } : {})}
                aria-label={it?.title || "مشاهدة الفيديو"}
              >
                <div className="shortsegs-aspect-9x16">
                  {cover ? (
                    <img src={cover} alt={it?.title || "short"} loading="lazy" />
                  ) : (
                    <div className="shortsegs-noimg">No Cover</div>
                  )}
                </div>
                {it?.title ? <h3 className="shortsegs-card-title">{it.title}</h3> : null}
              </CardTag>
            );
          })}
        </div>

        {/* الأزرار نفس برامجنا */}
        <button
          type="button"
          className="nav-btn nav-prev"
          aria-label="السابق"
          onClick={() => goToIndex(index - step)}
          disabled={!canPrev}
        >
          ‹
        </button>
        <button
          type="button"
          className="nav-btn nav-next"
          aria-label="التالي"
          onClick={() => goToIndex(index + step)}
          disabled={!canNext}
        >
          ›
        </button>
      </div>
    </section>
  );
}

/* ==== أدوات مساعدة ==== */
function useResponsivePerView(base = 4) {
  const [pv, setPv] = useState(base);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 500) setPv(1);
      else if (w < 800) setPv(Math.min(2, base));
      else if (w < 1100) setPv(Math.min(3, base));
      else setPv(base);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [base]);
  return pv;
}
