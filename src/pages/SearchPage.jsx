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

function extractArray(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.articles)) return payload.articles;
  if (Array.isArray(payload.items))    return payload.items;
  if (Array.isArray(payload.data))     return payload.data;
  if (Array.isArray(payload.list))     return payload.list;
  const nests = ["items", "result", "payload", "body", "records", "rows"];
  for (const k of nests) {
    const v = payload[k];
    if (!v || typeof v !== "object") continue;
    if (Array.isArray(v)) return v;
    for (const kk of Object.keys(v)) {
      if (Array.isArray(v[kk])) return v[kk];
    }
  }
  for (const k of Object.keys(payload)) {
    if (Array.isArray(payload[k])) return payload[k];
  }
  return [];
}

function makeUnified(items = [], type) {
  return (Array.isArray(items) ? items : []).map((r) => {
    const title   = r.title ?? "";
    const slug    = r.slug ?? null;

    // 🆕 لِقْط التصنيف من مفاتيح محتملة
    const category =
      r.category ??
      r.category_name ??
      r.cat ??
      r.type_name ?? // لو عندك اسم نوع
      "";

    const content = typeof r.content_html === "string" && r.content_html
      ? r.content_html.replace(/<[^>]+>/g, " ")
      : (typeof r.content === "string" ? r.content : "");

    const excerpt = typeof r.excerpt === "string" && r.excerpt
      ? r.excerpt
      : (content ? String(content).slice(0, 140) : "");

    return {
      id: r.id ?? null,
      type,                 // "article" أو "program"
      slug,
      title,
      category,             // 🆕 مضافة
      excerpt,
      cover_url: r.cover_url ?? r.cover ?? null,
      created_at: r.created_at ?? r.published_at ?? null,
      url: slug ? (type === "article" ? `/articles/${slug}` : `/programs/${slug}`) : null,
      _raw: r,
    };
  });
}


export default function SearchPage() {
  const [sp, setSp] = useSearchParams();
  const term = (sp.get("q") || "").trim();
  const [q, setQ] = useState(term);
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => setQ(term), [term]);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      setLoading(true); setErr("");
      try {
        const [aRes, pRes] = await Promise.all([
          fetch(`/api/content/articles?limit=200&drafts=1`, { headers: { Accept: "application/json" }, signal: ctrl.signal }),
          fetch(`/api/content/programs?limit=200`,         { headers: { Accept: "application/json" }, signal: ctrl.signal }),
        ]);
        const [aTxt, pTxt] = await Promise.all([aRes.text(), pRes.text()]);
        let aJson = null, pJson = null;
        try { aJson = aTxt ? JSON.parse(aTxt) : null; } catch {}
        try { pJson = pTxt ? JSON.parse(pTxt) : null; } catch {}
        const aArr = extractArray(aJson);
        const pArr = extractArray(pJson);
        const unified = [
          ...makeUnified(aArr, "article"),
          ...makeUnified(pArr, "program"),
        ].sort((x, y) => String(y.created_at || "").localeCompare(String(x.created_at || "")));
        setAll(unified);
      } catch (e) {
        setErr(e?.message || "فشل الجلب");
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  const filtered = useMemo(() => {
    const qn = normalizeArabic(term);
    if (!qn) return all;
    return all.filter((it) => {
      const hay = normalizeArabic([it.title,it.category , it.excerpt].filter(Boolean).join(" "));
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
            {(term ? filtered : all).map((it) => {
              const to = it.url ? (term ? `${it.url}?q=${encodeURIComponent(term)}` : it.url) : "#";
              return (
                <Link key={`${it.type}-${it.id}-${it.slug}`} to={to} style={{textDecoration: "none", color: "inherit"}}>
                  <div style={{border: "1px solid #eee", borderRadius: 12, overflow: "hidden", background: "#fff"}}>
                    {it.cover_url && (
                      <div style={{width: "100%", aspectRatio: "16/9", overflow: "hidden"}}>
                        <img src={it.cover_url} alt="" style={{width: "100%", height: "100%", objectFit: "cover"}} />
                      </div>
                    )}
                  <div style={{padding: 12}}>
  {/* 🆕 سطر التصنيف إن وُجد */}
  {it.category && (
    <div style={{fontSize: 12, opacity: 0.7, marginBottom: 4}}>
      {it.category}
    </div>
  )}

  <div style={{fontWeight: 700, marginBottom: 6}}>{it.title}</div>

  {/* نوع العنصر (مقال/برنامج) – اختياري تخلّيه */}
  <div style={{fontSize: 12, opacity: 0.6, marginBottom: 4}}>
    {it.type === "article" ? "مقال" : "برنامج"}
  </div>

  {it.excerpt && <div style={{fontSize: 14, color: "#555"}}>{it.excerpt}</div>}
</div>

                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
