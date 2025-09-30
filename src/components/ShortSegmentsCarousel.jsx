import React, { useEffect, useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import "./ShortSegmentsCarousel.css";
import ResilientThumb from "./ResilientThumb"; // ← عدّل المسار إذا لزم

// === نفس الـ helpers تبع صفحة الشورتس ===============================
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

function ytEmbed(id, { autoplay = true } = {}) {
  const base = `https://www.youtube-nocookie.com/embed/${id}`;
  const common = `playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&fs=1`;
   const auto = autoplay ? `&autoplay=1` : ``;
  return `${base}?${common}${auto}`;
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

// === component ==========================================================
export default function ShortSegmentsCarousel({
  title = "فقرات قصيرة",
  perView = 4,
  step = 1,
  apiUrl = "/api/content/short-segments?limit=24",
  linkTo = "/shorts",
}) {
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [index, setIndex] = useState(0);

  // مودال المُشغِّل
  const [player, setPlayer] = useState({ open: false, ytid: "", title: "" });

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
          let data = null; try { data = text ? JSON.parse(text) : null; } catch {}
          if (!res.ok) throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
          return Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        };
        let list = [];
        try { list = await tryFetch(apiUrl); }
        catch {
          // جسر توافق مع مسار قديم
          list = await tryFetch("/api/short-segments?limit=24");
        }
        setRaw(list);
      } catch (e) {
        setErr(e?.message || "فشل الجلب");
      } finally {
        setLoading(false);
      }
    })();
  }, [apiUrl]);

  // طبعنة مثل الصفحة: نضيف _ytid
  const items = useMemo(() => {
    return raw
      .map((it) => {
        const id =
          it.youtube_id ||
          toYouTubeId(it.youtube_url || it.url || it.video_url || it.short_url || it.id || it.slug || "");
        if (!id) return null;
        const title = it.title || "فقرة قصيرة";
        return { ...it, _ytid: id, _title: title, _key: it.id || it.slug || id };
      })
      .filter(Boolean);
  }, [raw]);

  // اربطي المؤشّر لما يتغيّر المرئي
  useEffect(() => {
    const max = Math.max(0, items.length - visible);
    if (index > max) setIndex(max);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, items.length]);

  const maxIndex = Math.max(0, items.length - visible);
  const canPrev = items.length > visible && index > 0;
  const canNext = items.length > visible && index < maxIndex;

  // نفس حساب “برامجنا”: عرض الكرت + الفجوة
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

  const onCardClick = (it) => setPlayer({ open: true, ytid: it._ytid, title: it._title });

  return (
    // نستخدم نفس حاوية “برامجنا” حرفيًا
    <section className="programs-section shorts-like-programs" dir="rtl" aria-labelledby="shorts-title">
      <div className="programs-header">
        <h2 id="shorts-title" className="programs-title">{title}</h2>
        {linkTo && <Link to={linkTo} className="programs-viewall">عرض الكل</Link>}
      </div>

      <div className={`carousel ${loading ? "is-loading" : ""}`}>
        {err && <div className="carousel-error">خطأ: {err}</div>}

        {loading && (
          <div className="carousel-skeleton" style={{ "--perView": visible }}>
            {Array.from({ length: visible }).map((_, i) => <div className="skeleton-card" key={i} />)}
          </div>
        )}

        {!loading && !err && items.length > 0 && (
          <div className="carousel-viewport">
            <div ref={trackRef} className="carousel-track" dir="rtl" style={{ "--perView": visible }}>
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
                      <span className="shortseg-play" aria-hidden>▶</span>
                    </div>
                    <div className="shortseg-body">
                      <h3 className="shortseg-title" title={it._title}>{it._title}</h3>
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
            >‹</button>

            <button
              type="button"
              className="nav-btn nav-next"
              aria-label="التالي"
              onClick={() => goToIndex(index + step)}
              disabled={!canNext}
            >›</button>
          </div>
        )}

        {!loading && !err && items.length === 0 && (
          <div className="carousel-empty">لا يوجد مقاطع لعرضها.</div>
        )}
      </div>

      {/* ===== مودال مطابق لصفحة الشورتس ===== */}
      {player.open && (
        <div className="shortseg-modal" role="dialog" aria-modal="true">
          <div className="shortseg-backdrop" onClick={() => setPlayer({ open: false, ytid: "", title: "" })} />
          <div className="shortseg-modal-content">
            <button
              className="shortseg-close"
              onClick={() => setPlayer({ open: false, ytid: "", title: "" })}
              aria-label="إغلاق"
              type="button"
            >
              ✕
            </button>
            <div className="shortseg-iframe-wrap">
              <iframe
                src={ytEmbed(player.ytid, { autoplay: true })}
                title={player.title || "Short Segment"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
