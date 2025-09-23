import React from "react";
import { useParams, Link } from "react-router-dom";

export default function ArticleDetail() {
  const { slug } = useParams();
  const [article, setArticle] = React.useState(null);
  const [err, setErr] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  React.useEffect(() => {
    (async () => {
      setLoading(true); setErr(""); setArticle(null);
      try {
        const res = await fetch(`/api/content/articles/${encodeURIComponent(slug)}`, {
          headers: { Accept: "application/json" },
        });
        const data = await res.json();
        if (!res.ok || data?.ok === false) throw new Error(data?.error || `HTTP ${res.status}`);
        setArticle(data.article);
      } catch (e) {
        setErr("تعذّر تحميل المقال: " + (e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) return <p>جارِ التحميل…</p>;
  if (err) return <p style={{ color: "#b00" }}>{err}</p>;
  if (!article) return null;

  return (
    <article
      style={{
        maxWidth: 1100,
        margin: "24px auto",
        padding: "0 16px",
        fontFamily: `"Cairo", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
        direction: "rtl",       // الكتابة من اليمين لليسار
        textAlign: "right",
      }}
    >
      
     
  

     
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        {article.cover_url && (
          <img
            src={article.cover_url}
            alt={article.title || ""}
            style={{ maxWidth: "80%", borderRadius: 12 }}
          />
        )}
      </div>

      {/* النص (المحتوى) */}
      <div
        style={{
          lineHeight: 1.9,
          fontSize: "18px",
          direction: "rtl",   // النصوص من اليمين
          textAlign: "right", // محاذاة النص يمين
        }}
        dangerouslySetInnerHTML={{ __html: article.content || "" }}
      />
 
    </article>
    
  );
  
}
