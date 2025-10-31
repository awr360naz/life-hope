// src/pages/SabbathLessonsIndex.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchLessons } from "../lib/sabbathApi";
import "./SabbathLessonsIndex.css";

export default function SabbathLessonsIndex() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    let mounted = true;
    fetchLessons()
      .then((arr) => mounted && setItems(arr))
      .finally(() => mounted && setLoading(false));
    return () => (mounted = false);
  }, []);

  return (
    <section className="sabbath-wrap" dir="rtl">
      <header className="sabbath-hero">
        <h1>دروس السبت</h1>
      </header>

      {loading ? (
        <div className="sabbath-loading">جارِ التحميل…</div>
      ) : (
        <div className="sabbath-grid">
          {items.map((it) => (
            <article
              key={it.slug}
              className="sabbath-card"
              onClick={() => nav(`/sabbath-lessons/${it.slug}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && nav(`/sabbath-lessons/${it.slug}`)}
            >
              <div className="sabbath-card__media">
                <img src={it.image} alt={it.title || "cover"} loading="lazy" />
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
