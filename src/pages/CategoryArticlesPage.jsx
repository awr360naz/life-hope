import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./CategoryArticlesPage.css";

export default function CategoryArticlesPage() {
  const { name } = useParams(); // اسم التصنيف (URL-encoded)
  const decodedName = decodeURIComponent(name || "");
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setErr(""); setLoading(true);
      try {
        const res = await fetch(`/api/content/articles-by-category/${encodeURIComponent(decodedName)}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok || !data?.ok) throw new Error(data?.error || ("HTTP " + res.status));
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (e) {
        setErr(e?.message || "خطأ غير معروف");
      } finally {
        setLoading(false);
      }
    })();
  }, [decodedName]);

  return (
    <main dir="rtl" className="category-page">
      <h1 className="category-title">{decodedName}</h1>

      {loading && <p>جارٍ التحميل…</p>}
      {err && <p className="category-error">تعذّر التحميل: {err}</p>}
      {!loading && !err && !items.length && <p>لا توجد مقالات ضمن هذا التصنيف.</p>}

      <div className="cards-grid">
        {items.map((a) => {
          const cover = a.cover_url || "https://placehold.co/800x600?text=Article";
          const to = `/articles/${encodeURIComponent(a.slug || a.id)}`;
          return (
            <Link key={a.id} to={to} className="card-link">
              <article className="card">
                <div className="card-cover">
                  <img
                    src={cover}
                    alt={a.title || "مقال"}
                    loading="lazy"
                    className="card-img"
                  />
                </div>
                <div className="card-body">
                  <h3 className="card-title">{a.title || "(بدون عنوان)"}</h3>
                </div>
              </article>
            </Link>
          );
        })}
      </div>

      <div className="category-footer-space"></div>
    </main>
  );
}
