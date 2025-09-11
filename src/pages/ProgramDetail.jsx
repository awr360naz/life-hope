import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import "./ProgramDetail.css";

export default function ProgramDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(`/api/content/programs/${encodeURIComponent(id)}`, {
          headers: { Accept: "application/json" },
        });
        const text = await res.text();
        let data = null; try { data = text ? JSON.parse(text) : null; } catch {}
        if (!res.ok) throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
        setItem(data);
      } catch (e) {
        setErr(e?.message || "فشل جلب تفاصيل البرنامج");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // نلقط أول حقل محتوى متوفر حتى لو اسمه مش "content"
  const content = useMemo(() => {
    if (!item) return "";
    const candidates = [item.content, item.description, item.subtitle, item.body, item.text, item.html];
    return candidates.find(v => typeof v === "string" && v.trim().length) || "";
  }, [item]);

  const isHtml = typeof content === "string" && /<\/?[a-z][\s\S]*>/i.test(content);

  if (loading) return <main className="pd" dir="rtl">جارٍ التحميل…</main>;
  if (err)      return <main className="pd" dir="rtl"><div className="pd-err">{err}</div></main>;
  if (!item)    return <main className="pd" dir="rtl">غير موجود</main>;

  return (
    <main className="pd" dir="rtl">
      <h1 className="pd-title">{item.title || "بدون عنوان"}</h1>
      <section className="pd-content">
        {content
          ? (isHtml
              ? <div className="pd-html" dangerouslySetInnerHTML={{ __html: content }} />
              : <p className="pd-text">{content}</p>)
          : <em className="pd-empty">لا يوجد محتوى.</em>
        }
      </section>
    </main>
  );
}
