
import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";


function toYouTubeId(urlOrId = "") {
  if (!urlOrId) return "";
  if (/^[a-zA-Z0-9_-]{10,15}$/.test(urlOrId)) return urlOrId;
  try {
    const u = new URL(urlOrId);
    if (u.hostname.includes("youtu.be")) return u.pathname.split("/")[1] || "";
    if (u.pathname.startsWith("/shorts/"))
      return u.pathname.split("/")[2] || "";
    const v = u.searchParams.get("v");
    if (v) return v;
    const m = urlOrId.match(
      /[?&]v=([^&#]+)|youtu\.be\/([^?#/]+)|shorts\/([^?#/]+)/
    );
    return m ? m[1] || m[2] || m[3] : "";
  } catch {
    return "";
  }
}

export default function SearchPage() {
  const [sp, setSp] = useSearchParams();
  const term = (sp.get("q") || "").trim();

  const [q, setQ] = useState(term);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  
  useEffect(() => {
    setQ(term);
  }, [term]);

  
  useEffect(() => {
    if (!term) {
      setResults([]);
      return;
    }

    const ctrl = new AbortController();

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(term)}&limit=50`,
          {
            headers: { Accept: "application/json" },
            signal: ctrl.signal,
          }
        );

        if (!res.ok) {
          throw new Error("فشل البحث");
        }

        const json = await res.json();
        setResults(Array.isArray(json) ? json : []);
      } catch (e) {
        if (e.name === "AbortError") return;
        setErr(e?.message || "فشل البحث");
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [term]);

  function onSubmit(e) {
    e.preventDefault();
    const t = q.trim();
    setSp(t ? { q: t } : {});
  }

  function getTypeLabel(type) {
    switch (type) {
      case "article":
        return "مقال";
      case "program":
        return "برامجنا";
      case "short":
        return "مقاطع قصيرة";
      case "cami":
        return "نبوّات كامي";
      case "quiz":
        return "اختبار";
      default:
        return "";
    }
  }

  function buildUrl(it) {
    if (it.url) return it.url; 

    switch (it.type) {
      case "article":
        return it.slug ? `/articles/${it.slug}` : `/articles/${it.id}`;
      case "program":
        return it.slug ? `/programs/${it.slug}` : `/programs/${it.id}`;
      case "short":
        
        return it.id ? `/shorts?focus=${it.id}` : "/shorts";
      case "cami":
        return it.id
          ? `/cami-prophecies?video=${it.id}`
          : "/cami-prophecies";
      case "quiz":
        return it.slug ? `/quiz/${it.slug}` : `/quiz/${it.id}`;
      default:
        return "#";
    }
  }

function getThumbSrc(it) {
  const isShortLike = it.type === "short" || it.type === "cami";

  if (isShortLike) {
    
    const raw =
      it.youtube_id ||
      it._ytid ||
      it.youtube_url ||
      it.url ||
      it.video_url ||
      it.short_url ||
      "";

    const yid = toYouTubeId(String(raw));
    if (yid) {
      return `https://i.ytimg.com/vi/${yid}/hqdefault.jpg`;
    }
  }

 
  if (it.cover_url) return it.cover_url;

  return null;
}



  return (
    <div className="search-page" dir="rtl" style={{ padding: 16 }}>
      <h1 style={{ marginBottom: 12 }}>بحث</h1>

      <form
        onSubmit={onSubmit}
        style={{ display: "flex", gap: 8, marginBottom: 16 }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="اكتب كلمة البحث…"
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #ddd",
          }}
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
            gap: 6,
          }}
        >
          <span style={{ fontSize: 16 }}>🔍</span>
          <span>ابحث</span>
        </button>
      </form>

      {loading && <div>جاري التحميل…</div>}
      {err && <div style={{ color: "crimson" }}>خطأ: {err}</div>}

      {!loading && !err && term && results.length === 0 && (
        <div style={{ marginBottom: 12 }}>
          لا توجد نتائج لـ “{term}”. جرّب جزءًا من الكلمة أو كلمة من العنوان.
        </div>
      )}

      {!loading && !err && (
        <>
          {term && (
            <div style={{ marginBottom: 8 }}>النتائج: {results.length}</div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 12,
            }}
          >
            {results.map((it) => {
              const to = buildUrl(it);
              const label = it.category || getTypeLabel(it.type);
              const title = it.title || "";
              const thumbSrc = getThumbSrc(it);

              return (
                <Link
                  key={`${it.type}-${it.id}-${it.slug || ""}`}
                  to={to}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 12,
                      overflow: "hidden",
                      background: "#fff",
                    }}
                  >
                  
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "16/9",
                        overflow: "hidden",
                        background: "#f7f7f7",
                      }}
                    >
                      {thumbSrc && (
                        <img
                          src={thumbSrc}
                          alt={title || ""}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                          loading="lazy"
                        />
                      )}
                    </div>

                  
                    <div style={{ padding: 12 }}>
                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.7,
                          marginBottom: 4,
                        }}
                      >
                        {label}
                      </div>

                      <div
                        style={{
                          fontWeight: 700,
                          marginBottom: 4,
                          fontSize: 15,
                        }}
                      >
                        {title}
                      </div>
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
