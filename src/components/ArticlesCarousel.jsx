import React, { useEffect, useRef, useState } from "react";
import "./ArticlesCarousel.css";
import { Link } from "react-router-dom";

export default function ArticlesCarousel({
  title = "مقالات",
  perView = 4,                 // كم كرت ظاهر بنفس الوقت
  step = 1,                    // يتحرك عنصر واحد
  apiUrl = "/api/content/articles",
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);        // أول كرت ظاهر
  const scrollRef = useRef(null);               // المسار القابل للتمرير

  const visible = useResponsivePerView(perView);

  // جلب المقالات
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiUrl}?limit=24`, { headers: { Accept: "application/json" } });
        const text = await res.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch {}
        if (!res.ok) {
          const serverMsg = data?.error || data?.message || text;
          throw new Error(serverMsg || `HTTP ${res.status}`);
        }
        const arr = Array.isArray(data?.articles) ? data.articles : Array.isArray(data) ? data : [];
        const normalized = arr.map(normalizeArticle).filter(Boolean);
        setItems(normalized);
      } catch (e) {
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, [apiUrl]);

  // ضبط الإندكس ضمن الحدود عند تغيّر عدد العناصر/الظاهر
  useEffect(() => {
    const max = Math.max(0, items.length - visible);
    if (index > max) setIndex(max);
  }, [visible, items.length]); // متعمد

  const maxIndex = Math.max(0, items.length - visible);
  const canPrev = items.length > visible && index > 0;
  const canNext = items.length > visible && index < maxIndex;

  // نفس طريقة برامجنا: نحسب عرض الكرت ونسكرول المسار نفسه (RTL)
  const goToIndex = (nextIdx) => {
    const track = scrollRef.current;
    if (!track) return;

    const card = track.querySelector(".article-card");
    if (!card) return;

    const cardStyle = getComputedStyle(card);
    // نقرأ الـ gap الحقيقي (نستعمل margin-inline-end fallback لو لزم)
    const gapVar = getComputedStyle(track).getPropertyValue("--gap")?.trim();
    const gapFromVar = gapVar ? parseInt(gapVar) : NaN;
    const marginEnd = parseInt(cardStyle.marginInlineEnd || cardStyle.marginRight) || 0;
    const gap = Number.isNaN(gapFromVar) ? (marginEnd || 12) : gapFromVar;

    const cardWidth = card.offsetWidth + gap;
    const clamped = Math.max(0, Math.min(maxIndex, nextIdx));
    const delta = (clamped - index) * cardWidth;

    // لأن المسار RTL: نعكس الإشارة
    track.scrollBy({ left: -delta, behavior: "smooth" });
    setIndex(clamped);
  };

  const handlePrev = () => goToIndex(index - step);
  const handleNext = () => goToIndex(index + step);

  return (
    <section className="articles-section" dir="rtl" aria-labelledby="articles-title">
      {/* العنوان بنفس مكان/ستايل برامجنا */}
      <header className="articles-header">
        <h2 id="articles-title" className="articles-title">
          <Link to="/articles" className="articles-link">{title}</Link>
        </h2>
      </header>

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
            {/* مهم: خلي المسار RTL زي برامجنا */}
            <div
              ref={scrollRef}
              className="carousel-track"
              dir="rtl"
              style={{ "--perView": visible }}
            >
              {items.map((it) => {
                const slugOrId = it.slug || it.id;
                const img = it.cover_url || it.image_url || "";
                return (
                  <article key={it.id || it.slug} className="article-card">
                    <Link to={`/articles/${slugOrId}`} className="card-link" aria-label={it.title}>
                      <div className="article-inner">
                        <div className="article-image-wrap">
                          {img && (
                            <img
                              className="article-image"
                              src={img}
                              alt={it.title || "Article"}
                              loading="lazy"
                            />
                          )}
                        </div>
                        <h3 className="article-card-title" title={it.title}>{it.title}</h3>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>

            {/* أزرار التنقل – نفس الشكل والمكان تبع برامجنا */}
            <button
              type="button"
              className="nav-btn nav-prev"
              aria-label="السابق"
              onClick={handlePrev}
              disabled={!canPrev}
            >
              ‹
            </button>
            <button
              type="button"
              className="nav-btn nav-next"
              aria-label="التالي"
              onClick={handleNext}
              disabled={!canNext}
            >
              ›
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="carousel-empty">لا يوجد مقالات لعرضها.</div>
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

function normalizeArticle(a) {
  if (!a) return null;
  const id = a.id ?? a.article_id ?? a.uuid ?? a._id ?? null;
  const title = a.title ?? a.name ?? a.headline ?? "";
  const cover_url =
    a.cover_url ?? a["cover url"] ?? a.coverUrl ?? a.cover_image ?? a.coverImage ?? "";
  const image_url =
    a.image_url ?? a.image ?? a.thumbnail ?? cover_url ?? "";
  const slug = a.slug ?? a.path ?? a.permalink ?? null;
  return { id, title, cover_url, image_url, slug };
}
