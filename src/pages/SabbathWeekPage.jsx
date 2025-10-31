// src/pages/SabbathWeekPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchWeekItems, fetchWeekMeta } from "../lib/sabbathApi"; // ← جديد
import "./SabbathWeekPage.css";

export default function SabbathWeekPage() {
  const { weekSlug } = useParams();
  const [items, setItems] = useState([]);
  const [weekNote, setWeekNote] = useState("");           // ← جديد
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [arr, meta] = await Promise.all([
          fetchWeekItems(weekSlug),
          fetchWeekMeta(weekSlug),
        ]);
        if (!mounted) return;
        setItems(Array.isArray(arr) ? arr : []);
        setWeekNote(meta?.slug || "");

      } finally {
        mounted && setLoading(false);
      }
    }

    load();
    return () => (mounted = false);
  }, [weekSlug]);

  return (
    <section className="sabbath-wrap" dir="rtl">
      <header className="sabbath-hero">
        <h1>دروس الأسبوع</h1>
      </header>

      {weekNote ? (
        <div className="sabbath-sub">
          <h2>{weekNote}</h2>
        </div>
      ) : null}

      {loading ? (
        <div className="sabbath-loading">جارِ التحميل…</div>
      ) : (
        <div className="sabbath-grid">
          {items.map((it) => (
            <article
              key={it.slug}
              className="sabbath-card"
              onClick={() =>
                nav(`/sabbath-items/${it.slug}?week=${encodeURIComponent(weekSlug)}`)
              }
              role="button"
              tabIndex={0}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                nav(`/sabbath-items/${it.slug}?week=${encodeURIComponent(weekSlug)}`)
              }
            >
              <div className="sabbath-card__media">
                <img src={it.image} alt={it.title || "lesson"} loading="lazy" />
              </div>
              <div className="sabbath-card__body">
                <h3 className="sabbath-card__title">{it.title}</h3>
                <p className="sabbath-card__subtitle">{it.subtitle}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
