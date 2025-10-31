import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchLessonBySlug, fetchWeeksForLesson } from "../lib/sabbathApi";
import "./SabbathLessonPage.css";

// === دالة تحويل صورة Supabase ===
function sbImg(url, { w, h, quality = 90, resize = "contain", bg = "ffffff" } = {}) {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (!u.pathname.includes("/object/public/")) return url;
    u.pathname = u.pathname.replace("/object/public/", "/render/image/public/");
    if (w) u.searchParams.set("width", String(w));
    if (h) u.searchParams.set("height", String(h));
    u.searchParams.set("resize", resize);
    u.searchParams.set("quality", String(quality));
    u.searchParams.set("background", bg);
    return u.toString();
  } catch {
    return url;
  }
}

function buildCardImage(wUrl) {
  const widths = [480, 640, 960, 1280];
  const hByW = (w) => Math.round((w * 9) / 16);
  const src = sbImg(wUrl, { w: 640, h: hByW(640), resize: "contain", quality: 90 });
  const srcSet = widths
    .map((w) => `${sbImg(wUrl, { w, h: hByW(w), resize: "contain", quality: 90 })} ${w}w`)
    .join(", ");
  const sizes = "(max-width: 600px) 92vw, (max-width: 1024px) 420px, 560px";
  return { src, srcSet, sizes };
}

export default function SabbathLessonPage() {
  const { lessonSlug } = useParams();
  const [lesson, setLesson] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMore, setShowMore] = useState(false);
  const nav = useNavigate();
  useEffect(() => {
  if (!showMore) return;

  const handleKey = (e) => {
    if (e.key === "Escape") setShowMore(false);
  };

  document.addEventListener("keydown", handleKey);
  return () => document.removeEventListener("keydown", handleKey);
}, [showMore]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const [L, W] = await Promise.all([
        fetchLessonBySlug(lessonSlug),
        fetchWeeksForLesson(lessonSlug),
      ]);
      if (!mounted) return;
      setLesson(L);
      setWeeks(W);
      setLoading(false);
    })();
    return () => (mounted = false);
  }, [lessonSlug]);

  return (
    <section className="sabbath-wrap" dir="rtl">
      <header className="sabbath-hero">
        <h1>{lesson?.title || "…"}</h1>
      </header>

      <div className="sabbath-brief">
        <p className="one-line">
          {lesson?.short_desc}
          {lesson?.long_desc ? (
            <>
              {" "}
              <button className="linklike" onClick={() => setShowMore(true)}>
                للمزيد
              </button>
            </>
          ) : null}
        </p>
      </div>

      {loading ? (
        <div className="sabbath-loading">جارِ التحميل…</div>
      ) : (
        <div className="sabbath-grid">
          {weeks.map((w) => {
            const imgProps = buildCardImage(w.image);
            return (
              <article
                key={w.slug}
                className="sabbath-card"
                onClick={() => nav(`/sabbath-weeks/${w.slug}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) =>
                  e.key === "Enter" && nav(`/sabbath-weeks/${w.slug}`)
                }
              >
                <div className="sabbath-card__media sabbath-card__media--contain">
                  <img
                    src={imgProps.src}
                    srcSet={imgProps.srcSet}
                    sizes={imgProps.sizes}
                    alt={w.subtitle || "week"}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="sabbath-card__body">
                  <h3 className="sabbath-card__title">{w.subtitle}</h3>
                  <p className="sabbath-card__subtitle">{w.note}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {showMore && (
        <div className="sabbath-modal" onClick={() => setShowMore(false)}>
          <button className="sabbath-backdrop" aria-label="إغلاق" />
          <div
            className="sabbath-modal__card"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="sabbath-modal__close"
              onClick={() => setShowMore(false)}
              aria-label="إغلاق"
            >
              ×
            </button>
            <h3 className="modal-title">{lesson?.title}</h3>
            <div className="modal-body">
              <p>{lesson?.long_desc}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
