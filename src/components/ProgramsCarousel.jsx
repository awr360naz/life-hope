import React, { useEffect, useRef, useState } from "react";
import "./ProgramsCarousel.css";
import { Link } from "react-router-dom";


export default function ProgramsCarousel({
  title = "برامجنا",
  perView = 4,
  step = 1,
  apiUrl = "/api/content/programs",
   linkTo = "/programs",
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const scrollRef = useRef(null);

  const visible = useResponsivePerView(perView);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiUrl}?limit=24`, { headers: { Accept: "application/json" } });
        const text = await res.text();
        let data = null; try { data = text ? JSON.parse(text) : null; } catch {}
        if (!res.ok) throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
        const arr = Array.isArray(data?.programs) ? data.programs : Array.isArray(data) ? data : [];
        const normalized = arr.map(normalizeProgram).filter(Boolean);
        setItems(normalized);
      } catch (e) {
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, [apiUrl]);

  // اضبطي المؤشر إذا تغير عدد العناصر المرئية
  useEffect(() => {
    const max = Math.max(0, items.length - visible);
    if (index > max) setIndex(max);
  }, [visible, items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const maxIndex = Math.max(0, items.length - visible);
  const canPrev = items.length > visible && index > 0;
  const canNext = items.length > visible && index < maxIndex;

const goToIndex = (nextIdx) => {
  const track = scrollRef.current;
  if (!track) return;

  const card = track.querySelector(".program-card");
  if (!card) return;

  const cardStyle = getComputedStyle(card);
  const gap = parseInt(cardStyle.marginRight) || 12;
  const cardWidth = card.offsetWidth + gap;

  // الفرق: بدل ما نستعمل scrollIntoView، نحرّك المسار نفسه
  const delta = (nextIdx - index) * cardWidth;

  // RTL → نخلي الإشارة معكوسة
  track.scrollBy({ left: -delta, behavior: "smooth" });

  // حدّد المؤشر الجديد
  const clamped = Math.max(0, Math.min(maxIndex, nextIdx));
  setIndex(clamped);
};

  return (
    <section className="programs-section" dir="rtl" aria-labelledby="programs-title">
        <div className="programs-header">
              <h2 id="pr-title" className="programs-title">{title}</h2>
           
              {linkTo && <Link to={linkTo} className="programs-viewall">عرض الكل </Link>}
            </div>
    

      <div className={`carousel ${loading ? "is-loading" : ""}`}>
        {error && <div className="carousel-error">خطأ: {error}</div>}

        {loading && (
          <div className="carousel-skeleton" style={{ "--perView": visible }}>
            {Array.from({ length: visible }).map((_, i) => (
              <div className="skeleton-card" key={i} />
            ))}
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="carousel-viewport">
            {/* مهم: خلي المسار RTL مش LTR */}
            <div
              ref={scrollRef}
              className="carousel-track"
              dir="rtl"
              style={{ "--perView": visible }}
            >
              {items.map((it) => {
                const slugOrId = it.slug || it.id || it.day;
                const img = it.cover_url || it.image_url || "";
                return (
                  <article key={slugOrId} className="program-card">
                    <Link
                      to={`/programs/${encodeURIComponent(slugOrId)}`}
                      className="card-link"
                      aria-label={it.title}
                    >
                      <div className="program-inner">
                        <div className="program-image-wrap">
                          {img && (
                            <img
                              className="program-image"
                              src={img}
                              alt={it.title || "Program"}
                              loading="lazy"
                            />
                          )}
                        </div>
                        <h3 className="program-card-title" title={it.title}>
                          {it.title}
                        </h3>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>

            {/* أزرار التنقل */}
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

        {!loading && !error && items.length === 0 && (
          <div className="carousel-empty">لا يوجد برامج لعرضها.</div>
        )}
      </div>
    </section>
  );
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

function normalizeProgram(p) {
  if (!p) return null;
  const id = p.id ?? p.program_id ?? null;
  const title = p.title ?? p.name ?? "";
  const cover_url = p.cover_url ?? p.coverUrl ?? p.cover_image ?? "";
  const image_url = p.image_url ?? p.image ?? p.thumbnail ?? cover_url ?? "";
  const slug = p.slug ?? p.handle ?? null;
  const day = p.day ?? null;
  return { id, title, cover_url, image_url, slug, day };
}
