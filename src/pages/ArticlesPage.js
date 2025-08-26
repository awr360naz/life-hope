import { useEffect, useState } from "react";
import { api } from "../lib/api"; // أو: import api from "../lib/api";

export default function ArticlesPage() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.articles()
      .then(setItems)
      .catch(e => setErr(e.message));
  }, []);

  if (err) return <p style={{color:'red'}}>خطأ: {err}</p>;
  if (!items.length) return <p>...تحميل</p>;

  return (
    <main className="container">
      <h2>المقالات</h2>
      <ul>
        {items.map(a => (
          <li key={a.id}>{a.title}</li>
        ))}
      </ul>
    </main>
  );
}
