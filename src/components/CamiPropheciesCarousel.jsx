// src/components/CamiPropheciesCarousel.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import "./ShortSegmentsCarousel.css";
import ResilientThumb from "./ResilientThumb";
import ShortsegSafePlayerModal from "./ShortsegSafePlayerModal";

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

function useResponsivePerView(defaultPerView = 4) {
  const [pv, setPv] = useState(defaultPerView);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setPv(2);
      else if (w < 960) setPv(3);
      else setPv(defaultPerView);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [defaultPerView]);
  return pv;
}

export default function CamiPropheciesCarousel({
  title = "فتح نبؤات مع Cami",
  perView = 4,
  step = 1,
  apiUrl = "/api/content/cami-prophecies?limit=24",
  linkTo = "/cami-prophecies",
}) {
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [index, setIndex] = useState(0);
  const [player, setPlayer] = useState({ open: false, item: null });

  const visible = useResponsivePerView(perView);
  const trackRef = useRef(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const tryFetch = async (url) => {
          const res = await fetch(url, { headers: { Accept: "application/json" } });
          const text = await res.text();
          let data = null;
          try { data = text ? JSON.parse(text) : null; } catch {}
          if (!res.ok) throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
          return Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        };

        let list = [];
        try {
          list = await tryFetch(apiUrl);
        } catch {
          list = await tryFetch("/api/cami-prophecies?limit=24");
        }
        setRaw(list);
      } catch (e) {
        setErr(e?.message || "فشل الجلب");
      } finally {
        setLoading(false);
      }
    })();
  }, [apiUrl]);

const items = useMemo(
  () =>
    raw
      .map((it) => {
        // ⛔ تجاهل url / short_url / video_url
        // ✔️ اعتمد فقط على youtube_id أو youtube_url
        let id = "";
        if (it.youtube_id) {
          id = it.youtube_id;
        } else if (it.youtube_url) {
          id = toYouTubeId(it.youtube_url);
        }

        if (!id) return null;

        const t = it.title || "فتح نبؤات مع Cami";
        return { ...it, _ytid: id, _title: t, _key: it.id || it.slug || id };
      })
      .filter(Boolean),
  [raw]
);


  useEffect(() => {
    const max = Math.max(0, items.length - visible);
    if (index > max) setIndex(max);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, items.length]);

  const maxIndex = Math.max(0, items.length - visible);
  const canPrev = items.length > visible && index > 0;
  const canNext = items.length > visible && index < maxIndex;

  const goToIndex = (nextIdx) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector(".program-card");
    if (!card) return;
    const styles = getComputedStyle(track);
    const gap = parseInt(styles.getPropertyValue("--gap")) || 12;
    const cardWidth = card.getBoundingClientRect().width + gap;
    const delta = (nextIdx - index) * cardWidth;
    track.scrollBy({ left: -delta, behavior: "smooth" });
    const clamped = Math.max(0, Math.min(maxIndex, nextIdx));
    setIndex(clamped);
  };

  const onCardClick = (it) => setPlayer({ open: true, item: it });

  return (
    <section
      className="programs-section shorts-like-programs cami-prophecies-section"
      dir="rtl"
      aria-labelledby="cami-prophecies-title"
    >
      <div className="programs-header">
        <h2 id="cami-prophecies-title" className="programs-title">
          {title}
        </h2>
        {linkTo && (
          <Link to={linkTo} className="programs-viewall">
            عرض الكل
          </Link>
        )}
      </div>

      <div className={`carousel ${loading ? "is-loading" : ""}`}>
        {err && <div className="carousel-error">خطأ: {err}</div>}

        {loading && (
          <div className="carousel-skeleton" style={{ "--perView": visible }}>
            {Array.from({ length: visible }).map((_, i) => (
              <div className="skeleton-card" key={i} />
            ))}
          </div>
        )}

        {!loading && !err && items.length > 0 && (
          <div className="carousel-viewport">
            <div
              ref={trackRef}
              className="carousel-track"
              dir="rtl"
              style={{ "--perView": visible }}
            >
              {items.map((it) => (
                <article key={it._key} className="program-card shortseg-card">
                  <button
                    type="button"
                    className="card-link short-open-btn"
                    onClick={() => onCardClick(it)}
                    aria-label={it._title}
                  >
                    <div className="shortseg-thumb">
                      <ResilientThumb item={it} alt={it._title} />
                      <span className="shortseg-play" aria-hidden>
                        ▶
                      </span>
                    </div>
                    <div className="shortseg-body">
                      <h3 className="shortseg-title" title={it._title}>
                        {it._title}
                      </h3>
                    </div>
                  </button>
                </article>
              ))}
            </div>

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
        )}

        {!loading && !err && items.length === 0 && (
          <div className="carousel-empty">لا يوجد مقاطع لعرضها.</div>
        )}
      </div>

      <ShortsegSafePlayerModal
        open={!!player.open}
        item={player.item}
        title={player.item?._title}
        onClose={() => setPlayer({ open: false, item: undefined })}
      />
    </section>
  );
}
