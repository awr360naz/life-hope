import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";

export default function ProgramDetail() {
  const { slug } = useParams(); // ممكن يكون slug أو id أو day
  const [program, setProgram] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  useEffect(() => {
    (async () => {
      setErr(""); setLoading(true);
      try {
        const res = await fetch(`/api/content/programs/${encodeURIComponent(slug)}`, {
          headers: { Accept: "application/json" },
        });
        const text = await res.text();
        let data = null; try { data = text ? JSON.parse(text) : null; } catch {}
        if (!res.ok) throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
        // الباك يرجّع أحيانًا { program: {...} } أو {...} مباشرة — ندعم الحالتين
        const p = data?.program || data;
        setProgram(p);
      } catch (e) {
        setErr(e.message || "خطأ غير معروف");
      } finally { setLoading(false); }
    })();
  }, [slug]);

  const cover = useMemo(
    () =>
      program?.cover_url ||
      program?.image_url ||
      program?.thumbnail ||
      program?.image ||
      program?.["cover url"] ||
      "",
    [program]
  );

  const raw = useMemo(() => {
    if (!program) return "";
    // بعض البرامج ممكن ما يكون عندها HTML كامل — سنعرض الفقرات items إذا وُجدت
    const content = program.content ?? program.body_html ?? program.body ?? "";
    return content;
  }, [program]);

  const html = useMemo(() => {
    let s = String(raw || "");
    s = s.replace(/^\s*<(article|main)\b[^>]*>/i, "");
    s = s.replace(/<\/(article|main)>\s*$/i, "");
    return s.trim();
  }, [raw]);

  const looksHtml = /^\s*<(?:[a-z!]|!--)/i.test(html);

  if (loading) return <main dir="rtl" style={{maxWidth:900,margin:"2rem auto"}}>جارِ التحميل…</main>;
  if (err) return <main dir="rtl" style={{maxWidth:900,margin:"2rem auto"}}>حدث خطأ: {err}</main>;
  if (!program) return <main dir="rtl" style={{maxWidth:900,margin:"2rem auto"}}>لم يتم العثور على البرنامج.</main>;

  return (
    <main dir="rtl" style={{maxWidth:900, margin:"2rem auto", padding:"0 1rem", color:"#111"}}>
      <Link to="/programs" style={{textDecoration:"none"}}>← العودة إلى البرامج</Link>
      <h1 style={{margin:"1rem 0"}}>{program.title || program.name || "— بدون عنوان —"}</h1>
      {cover && (
        <img
          src={cover}
          alt=""
          style={{width:"100%", height:"auto", borderRadius:12, marginBottom:"1rem"}}
        />
      )}

      {/* محتوى HTML إن وجد، وإلا سنعرض عناصر البرنامج (items) */}
      {looksHtml && html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} style={{lineHeight:1.9}} />
      ) : Array.isArray(program.items) && program.items.length > 0 ? (
        <ul style={{lineHeight:1.9}}>
          {program.items.map((it, i) => (
            <li key={i}>
              {it?.time ? <b style={{marginInlineEnd:8}}>{it.time}</b> : null}
              {it?.t || it?.title || String(it)}
            </li>
          ))}
        </ul>
      ) : (
        <div style={{whiteSpace:"pre-wrap", lineHeight:1.9}}>
          {html || program.description || "(لا يوجد محتوى)"}
        </div>
      )}

      {program?.notes && (
        <div style={{marginTop:12}}>
          <b>ملاحظات:</b>
          <p>{program.notes}</p>
        </div>
      )}
    </main>
  );
}
