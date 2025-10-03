// src/pages/ShortSegmentsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./ShortSegmentsPage.css";
import ResilientThumb from "../components/ResilientThumb";

// ===================== إعدادات عامة =====================
const PAGE_SIZE = 12;
const MAX_PAGES = 4; // 48 عنصر كحد أقصى
const LS_KEY = "shortSegs_cache_v2"; // كاش محلي آمن

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function uniqBy(arr, keyFn) {
  const seen = new Set();
  const out = [];
  for (const it of arr) {
    const k = keyFn(it);
    if (k && !seen.has(k)) { seen.add(k); out.push(it); }
  }
  return out;
}

// ===================== مساعدات يوتيوب =====================
function toYouTubeId(urlOrId = "") {
  if (!urlOrId) return "";
  if (/^[a-zA-Z0-9_-]{10,15}$/.test(urlOrId)) return urlOrId;
  try {
    const u = new URL(urlOrId);
    if (u.hostname.includes("youtu.be")) return u.pathname.split("/")[1] || "";
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || "";
    const v = u.searchParams.get("v");
    if (v) return v;
    const m = urlOrId.match(/[?&]v=([^&#]+)|youtu\.be\/([^?#/]+)|shorts\/([^?#/]+)/);
    return m ? (m[1] || m[2] || m[3]) : "";
  } catch {
    return "";
  }
}

function ytEmbed(id, { autoplay = true } = {}) {
  const base = `https://www.youtube.com/embed/${id}`;
  const common = `playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&fs=1`;
  const auto = autoplay ? `&autoplay=1` : ``; // موبايل: سيتم تمرير false
  return `${base}?${common}${auto}`;
}



// ===================== الصفحة =====================
export default function ShortSegmentsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [player, setPlayer] = useState({ open: false, ytid: "" });
  const [page, setPage] = useState(1);
  const shownLenRef = React.useRef(0);   // طول ما هو معروض حالياً — لمنع “التقلّص”


  useEffect(() => {
    let alive = true;
    const ac = new AbortController();

    const tryFetch = async (url) => {
      const res = await fetch(url, { headers: { Accept: "application/json" }, signal: ac.signal });
      const text = await res.text();
      let data = null; try { data = text ? JSON.parse(text) : null; } catch {}
      if (!res.ok) throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
      return Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    };

    // جلب مرن: يجرّب مصدرين + عدة محاولات + دمج وتصفية + حدّ أعلى 48
    const fetchResilient = async () => {
      const cb = Date.now();
      const sources = [
        `/api/content/short-segments?limit=200&_cb=${cb}`,
        `/api/short-segments?limit=200&_cb=${cb}`,
      ];

      // محاولات مع backoff
      const attempts = [200, 600, 1200, 2000];
      let best = [];

      for (let i = 0; i < attempts.length; i++) {
        if (!alive) return best;

        try {
          const results = await Promise.allSettled(sources.map(s => tryFetch(s)));
          let merged = [];
          for (const r of results) {
            if (r.status === "fulfilled" && Array.isArray(r.value)) merged = merged.concat(r.value);
          }

          // تطبيع، استخراج _ytid، وتجاهل العناصر الناقصة
          merged = merged
            .map((it) => {
              const id =
                it.youtube_id ||
                toYouTubeId(it.youtube_url || it.url || it.video_url || it.short_url || "");
              return id ? { ...it, _ytid: id } : null;
            })
            .filter(Boolean);

          // إزالة التكرارات حسب _ytid
          merged = uniqBy(merged, (x) => x._ytid);

          // ترتيب أحدث أولاً
          merged.sort((a, b) => {
            const ta = new Date(a.published_at || a.created_at || 0).getTime() || 0;
            const tb = new Date(b.published_at || b.created_at || 0).getTime() || 0;
            return tb - ta;
          });

          // حدّ أقصى 48
          merged = merged.slice(0, MAX_PAGES * PAGE_SIZE);

          // إن كانت النتيجة كبيرة بما يكفي نعيدها مباشرة
          if (merged.length >= 36) { // “نتيجة محترمة”
            return merged;
          } else if (merged.length > best.length) {
            // احتفظ بأفضل نتيجة مؤقتًا
            best = merged;
          }
        } catch {
          // تجاهل، سنحاول مرة أخرى
        }

        await sleep(attempts[i]);
      }

      return best; // قد تكون 12/24/…، سيُحسم لاحقًا قبل الاستبدال بالكاش
    };

    (async () => {
      setLoading(true);
      setErr("");

      // 1) اعرض فورًا من الكاش لو موجود (تجربة ثابتة للمستخدم)
      try {
        const cached = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
        if (Array.isArray(cached) && cached.length) {
          setItems(cached);
          setLoading(false);
        }
      } catch {}

      // 2) حدّث بهدوء بنتيجة أحدث، لكن لا تستبدل لو كانت ضعيفة
      try {
        const fresh = await fetchResilient();
        if (!alive) return;

        if (fresh.length >= 24) { // عتبة القبول للاستبدال
          setItems(fresh);
          localStorage.setItem(LS_KEY, JSON.stringify(fresh));
          setErr("");
        } else {
          const hasCache = Array.isArray(items) && items.length > 0;
          if (!hasCache) setItems(fresh);
          setErr(fresh.length ? "" : "لم تصل بيانات كافية");
        }
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "فشل الجلب");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; ac.abort(); };
  }, []);

  // قائمة معرّفة بـ _ytid فقط (من items النهائية)
  const normalized = useMemo(
    () =>
      items
        .map((it) => {
          const id = it._ytid ||
            it.youtube_id ||
            toYouTubeId(it.youtube_url || it.url || it.video_url || it.short_url || "");
          return id ? { ...it, _ytid: id } : null;
        })
        .filter(Boolean),
    [items]
  );

  // السقف الكلي (بحد أقصى 48)
const totalCap = Math.min(normalized.length, MAX_PAGES * PAGE_SIZE);
// ثابت 4 أزرار — والـno-shrink سيمنع تقلص المعروض للأقل
const totalPages = MAX_PAGES;


  // تصحيح الصفحة لو خرجت عن النطاق
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  // عناصر الصفحة الحالية (12 عنصر)
  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const paginatedItems = normalized.slice(start, end);

  const onCardClick = (it) => setPlayer({ open: true, ytid: it._ytid });

  // إغلاق بالمفتاح ESC
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setPlayer({ open: false, ytid: "" });
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="shortseg-page wrap">
      <h2 className="shortseg-heading">فقرات قصيرة</h2>

      {loading && <p>جار التحميل...</p>}
      {err && <p className="shortseg-error">صار خطأ: {err}</p>}

      {!loading && !err && (
        <>
          <div className="shortseg-grid">
            {paginatedItems.map((it) => {
              const title = it.title || "فقرة قصيرة";
              return (
                <button
                  key={it.id || it.slug || it._ytid}
                  className="shortseg-card"
                  onClick={() => onCardClick(it)}
                  type="button"
                >
                  <div className="shortseg-thumb">
                    <ResilientThumb item={it} alt={title} />
                    <span className="shortseg-play" aria-hidden>▶</span>
                  </div>
                  <div className="shortseg-body">
                    <h3 className="shortseg-title" title={title}>{title}</h3>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="shortseg-pager">
            <button
              type="button"
              className="shortseg-btn nav-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              السابق
            </button>

            <div className="shortseg-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`shortseg-btn ${page === n ? "is-active" : ""}`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="shortseg-btn nav-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              التالي
            </button>
          </div>
        </>
      )}

     {player.open && (
  <div className="shortseg-modal" role="dialog" aria-modal="true">
    <div className="shortseg-backdrop" onClick={() => setPlayer({ open: false, ytid: "" })} />
    <div className="shortseg-modal-content">
      <button
        className="shortseg-close"
        onClick={() => setPlayer({ open: false, ytid: "" })}
        aria-label="إغلاق"
        type="button"
      >
        ✕
      </button>
      <div className="shortseg-iframe-wrap">
        <iframe
          src={ytEmbed(player.ytid, { autoplay: true })}
          title="Short Segment"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </div>
  </div>
)}

    </div>
  );
}
