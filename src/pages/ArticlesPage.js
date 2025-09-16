import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";

export default function ArticlesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // اسم التصنيف المطلوب (إذا موجود في الـ URL)
  const activeCat = searchParams.get("cat"); // مثال: ?cat=لاهوت
useEffect(() => {
  (async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/content/articles?drafts=1", {
        headers: { Accept: "application/json" },
      });
      const data = await res.json();
      const arr = Array.isArray(data?.articles) ? data.articles : (Array.isArray(data) ? data : []);
      const normalized = arr.map(a => ({
        ...a,
        category: (a.category ?? "").toString().trim() || "غير مصنّف",
        category_slug: (a.category_slug ?? slugify((a.category ?? "").toString().trim() || "غير مصنّف")),
      }));
      console.log("articles[] size =", normalized.length, normalized.slice(0, 2));
      setItems(normalized);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  })();
}, []);

function slugify(s) {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

  // تجميع المقالات حسب التصنيف + بناء قائمة تصنيفات مع صور
  const { groups, categories } = useMemo(() => {
    const byCat = {};
    for (const a of items) {
      const cat = (a.category || "").trim() || "غير مصنّف";
      (byCat[cat] ||= []).push(a);
    }

    // صور ثابتة لبعض التصنيفات (اختياري)
    const catCovers = {
      "لاهوت": "/assets/cats/theology.jpg",
      "صحة": "/assets/cats/health.jpg",
      // أضيفي تصنيفاتك هنا...
    };

    const list = Object.entries(byCat).map(([name, list]) => {
      const image =
        catCovers[name] ||
        list.find((x) => x.cover_url)?.cover_url ||
        `https://placehold.co/600x360?text=${encodeURIComponent(name)}`;
      return { name, image, count: list.length };
    });

    // ترتيب مخصص: لاهوت ثم صحة ثم باقي التصنيفات أبجديًا
    const order = ["لاهوت", "صحة"];
    list.sort((a, b) => {
      const ia = order.indexOf(a.name), ib = order.indexOf(b.name);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      return a.name.localeCompare(b.name, "ar");
    });

    return { groups: byCat, categories: list };
  }, [items]);

  // ستايلات بسيطة
  const cardStyle = {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 14,
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,.06)",
  };
  const titleBadgeStyle = {
    position: "absolute",
    bottom: 8,
    insetInline: 8,
    background: "rgba(0,0,0,.55)",
    color: "#fff",
    padding: "8px 10px",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    backdropFilter: "blur(4px)",
  };

  // ===== وضع 1: عرض شبكة التصنيفات فقط =====
  if (!activeCat) {
    return (
      <main dir="rtl" style={{ maxWidth: 1100, margin: "2rem auto", padding: "0 1rem" }}>
        <h1 style={{ marginBottom: "1rem" }}>التصنيفات</h1>

        {loading && <p>جارِ التحميل…</p>}
        {!loading && categories.length === 0 && <p>لا توجد تصنيفات بعد.</p>}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {categories.map((c) => (
            <Link
              key={c.name}
              to={`/articles?cat=${encodeURIComponent(c.name)}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <article style={cardStyle}>
                <div style={{ position: "relative" }}>
                  <img
                    src={c.image}
                    alt={c.name}
                    style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }}
                    loading="lazy"
                  />
                  <div style={titleBadgeStyle}>
                    <strong style={{ fontSize: "1.05rem" }}>{c.name}</strong>
                    <span style={{ fontSize: ".9rem", opacity: 0.9 }}>{c.count} مقال</span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </main>
    );
  }

  // ===== وضع 2: عرض مقالات تصنيف معيّن =====
  const list = groups[activeCat] || [];

  return (
    <main dir="rtl" style={{ maxWidth: 1100, margin: "2rem auto", padding: "0 1rem" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ margin: "0.5rem 0" }}>{activeCat}</h1>
        <button
          onClick={() => navigate("/articles")}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "#fafafa",
            cursor: "pointer",
          }}
        >
          ← رجوع إلى التصنيفات
        </button>
      </header>

      {loading && <p>جارِ التحميل…</p>}
      {!loading && list.length === 0 && <p>لا توجد مقالات ضمن هذا التصنيف.</p>}

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {list.map((a) => {
          const slug = a.slug || a.id;
          const img = a.cover_url || a.image_url;
          return (
            <Link key={slug} to={`/articles/${slug}`} style={{ textDecoration: "none", color: "inherit" }}>
              <article
                style={{
                  background: "#fff",
                  border: "1px solid #eee",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                {img && (
                  <img
                    src={img}
                    alt={a.title}
                    style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8 }}
                    loading="lazy"
                  />
                )}
                <h3 style={{ marginTop: ".5rem" }}>{a.title}</h3>
              </article>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
