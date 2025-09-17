import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

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
    <main dir="rtl" style={{ maxWidth: 1100, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>مقالات تصنيف: {decodedName}</h1>
      {loading && <p>جارٍ التحميل…</p>}
      {err && <p style={{ color: "crimson" }}>تعذّر التحميل: {err}</p>}
      {!loading && !err && !items.length && <p>لا توجد مقالات ضمن هذا التصنيف.</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
        {items.map((a) => {
          const cover = a.cover_url || "https://placehold.co/800x600?text=Article";
          const to = `/articles/${encodeURIComponent(a.slug || a.id)}`;
          return (
            <Link key={a.id} to={to} style={{ textDecoration: "none", color: "inherit" }}>
              <article style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ height: 160, background: "#f2f2f2" }}>
                  <img src={cover} alt={a.title || "مقال"} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ padding: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 16 }}>{a.title || "(بدون عنوان)"}</h3>
                </div>
              </article>
            </Link>
          );
        })}
      </div>

      <div style={{ marginTop: 16 }}>
     
      </div>
    </main>
  );
}
