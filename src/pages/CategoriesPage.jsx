// src/pages/CategoriesPage.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/content/categories");
      const json = await res.json();
      if (json.ok) setCategories(json.categories);
    })();
  }, []);

  return (
    <div className="categories-page" style={{ padding: 24 }}>
      <h1>التصنيفات</h1>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {categories.map((cat) => (
          <Link
            key={cat.name}
            to={`/categories/${encodeURIComponent(cat.name)}`}
            style={{
              display: "block",
              width: 220,
              border: "1px solid #ddd",
              borderRadius: 12,
              textDecoration: "none",
              overflow: "hidden",
            }}
          >
            <img
              src={cat.cover_url || "https://placehold.co/300x200"}
              alt={cat.name}
              style={{ width: "100%", height: 140, objectFit: "cover" }}
            />
            <div style={{ padding: 12, fontWeight: "bold" }}>{cat.name}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
