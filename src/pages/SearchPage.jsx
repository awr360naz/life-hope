import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

function normalizeArabic(s = "") {
  const AR_TATWEEL = /\u0640/g;
  const AR_DIACRITICS = /[\u064B-\u065F\u0670\u0674]/g;
  return s
    .replace(AR_TATWEEL, "")
    .replace(AR_DIACRITICS, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/[ؤئ]/g, "ء")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim()
    .toLowerCase();
}

function makeUnified(items = [], type) {
  return (Array.isArray(items) ? items : []).map((r) => ({
    id: r.id ?? null,
    type,
    slug: r.slug ?? null,
    title: r.title ?? "",
    excerpt:
      (typeof r.excerpt === "string" && r.excerpt) ||
      (typeof r.content === "string" && String(r.content).slice(0, 140)) ||
      "",
    cover_url: r.cover_url ?? null,
    created_at: r.created_at ?? null,
    url: r.slug ? (type === "article" ? `/articles/${r.slug}` : `/programs/${r.slug}`) : null,
    _raw: r,
  }));
}

export default function SearchPage() {
  const [sp, setSp] = useSearchParams();
  const term = (sp.get("q") || "").trim();
  const [q, setQ] = useState(term);
  const [all, setAll] = useState([]);     // كل العناصر الموحّدة
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => setQ(term), [term]);

  // جلب موحّد من المصدرين (بدون الاعتماد على راوت السيرش)
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      setLoading(true); setErr("");
      try {
        const [aRes, pRes] = await Promise.all([
          fetch(`/api/content/articles?limit=200`, { headers: { Accept: "application/json" }, signal: ctrl.signal }),
          fetch(`/api/content/programs?limit=200`, { headers: { Accept: "application/json" }, signal: ctrl.signal }),
        ]);
        const [aTxt, pTxt] = await Promise.all([aRes.text(), pRes.text()]);
        let a = []; let p = [];
        try { a = aTxt ? JSON.parse(aTxt) : []; } catch {}
        try { p = pTxt ? JSON.parse(pTxt) : []; } catch {}
        const unified = [...makeUnified(a, "article"), ...makeUnified(p, "program")]
          .sort((x, y) => String(y.created_at || "").localeCompare(String(x.created_at || "")));
        setAll(unified);
        // Debug خفيف
        console.log("[Search Local] total items:", unified.length);
      } catch (e) {
        setErr(e?.message || "فشل الجلب");
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []); // مرة واحدة

  // فلترة محلية بعربي مُطبّع
  const filtered = useMemo(() => {
    const qn = normalizeArabic(term);
    if (!qn) return all;
    return all.filter((it) => {
      const hay = normalizeArabic([it.title, it.excerpt].filter(Boolean).join(" "));
      return hay.includes(qn);
    });
  }, [term, all]);

  function onSubmit(e) {
    e.preventDefault();
    const t = q.trim();
    setSp(t ? { q: t } : {});
  }

  return (
    <div className="search-page" dir="rtl" style={{padding: 16}}>
      <h1 style={{marginBottom: 12}}>بحث</h1>

      <form onSubmit={onSubmit} style={{display: "flex", gap: 8, marginBottom: 16}}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="اكتب كلمة البحث…"
          style={{flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd"}}
        />
<button
  type="submit"
  style={{
    padding: "8px 14px",
    borderRadius: 8,
    border: "none",
    background: "#3b82f6",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6
  }}
>
  <span style={{ fontSize: 16 }}>🔍</span>
  <span>ابحث</span>
</button>


      </form>

      {loading && <div>جاري التحميل…</div>}
      {err && <div style={{color: "crimson"}}>خطأ: {err}</div>}

      {!loading && !err && term && filtered.length === 0 && (
        <div style={{marginBottom: 12}}>
          لا توجد نتائج لـ “{term}”. جرّب جزءًا من الكلمة أو كلمة من العنوان.
        </div>
      )}

      {!loading && !err && (
        <>
          {term && <div style={{marginBottom: 8}}>النتائج: {filtered.length}</div>}
          <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12}}>
            {(term ? filtered : all).map((it) => (
              <Link key={`${it.type}-${it.id}-${it.slug}`} to={it.url || "#"} style={{textDecoration: "none", color: "inherit"}}>
                <div style={{border: "1px solid #eee", borderRadius: 12, overflow: "hidden", background: "#fff"}}>
                  {it.cover_url && (
                    <div style={{width: "100%", aspectRatio: "16/9", overflow: "hidden"}}>
                      <img src={it.cover_url} alt="" style={{width: "100%", height: "100%", objectFit: "cover"}} />
                    </div>
                  )}
                  <div style={{padding: 12}}>
                    <div style={{fontSize: 12, opacity: 0.7, marginBottom: 4}}>
                      {it.type === "article" ? "مقال" : "برنامج"}
                    </div>
                    <div style={{fontWeight: 700, marginBottom: 6}}>{it.title}</div>
                    {it.excerpt && <div style={{fontSize: 14, color: "#555"}}>{it.excerpt}</div>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
