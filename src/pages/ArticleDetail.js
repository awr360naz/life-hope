import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";

export default function ArticleDetail() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // scroll لأعلى عند تغيير المقال
  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  useEffect(() => {
    (async () => {
      setErr(""); setLoading(true);
      try {
        const res = await fetch(`/api/content/articles/${encodeURIComponent(slug)}`, {
          headers: { Accept: "application/json" },
        });
        const text = await res.text();
        let data = null; try { data = text ? JSON.parse(text) : null; } catch {}
        if (!res.ok) throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
        setArticle(data);
      } catch (e) {
        setErr(e.message || "خطأ غير معروف");
      } finally { setLoading(false); }
    })();
  }, [slug]);

  const cover = useMemo(
    () => article?.cover_url || article?.image_url || article?.["cover url"] || "",
    [article]
  );
  const raw = useMemo(() => {
    if (!article) return "";
    return article.content ?? article.conent ?? article.body_html ?? article.body ?? "";
  }, [article]);

  // فكّ تغليف <article>/<main> إن وُجد
  const html = useMemo(() => {
    let s = String(raw || "");
    s = s.replace(/^\s*<(article|main)\b[^>]*>/i, "");
    s = s.replace(/<\/(article|main)>\s*$/i, "");
    return s.trim();
  }, [raw]);

  const looksHtml = /^\s*<(?:[a-z!]|!--)/i.test(html);

  if (loading) return <main dir="rtl" style={{maxWidth:900,margin:"2rem auto"}}>جارِ التحميل…</main>;
  if (err) return <main dir="rtl" style={{maxWidth:900,margin:"2rem auto"}}>حدث خطأ: {err}</main>;
  if (!article) return <main dir="rtl" style={{maxWidth:900,margin:"2rem auto"}}>لم يتم العثور على المقال.</main>;

  return (
    <main dir="rtl" style={{maxWidth:900, margin:"2rem auto", padding:"0 1rem", color:"#111"}}>
      <Link to="/articles" style={{textDecoration:"none"}}>← العودة للمقالات</Link>
      <h1 style={{margin:"1rem 0"}}>{article.title}</h1>
  
      {looksHtml
        ? <div dangerouslySetInnerHTML={{ __html: html }} style={{lineHeight:1.9}} />
        : <div style={{whiteSpace:"pre-wrap", lineHeight:1.9}}>{html || "(لا يوجد محتوى)"}</div>
      }
    </main>
  );
}
