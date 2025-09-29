import React, { useEffect, useMemo, useState } from "react";
import "./ShortSegmentsPage.css";
import ResilientThumb from "../components/ResilientThumb";

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
  const base = `https://www.youtube-nocookie.com/embed/${id}`;
  const common = `playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&fs=1`;
  const auto = autoplay ? `&autoplay=1&mute=1` : ``; // iOS يحتاج mute مع autoplay
  return `${base}?${common}${auto}`;
}

export default function ShortSegmentsPage() {
  const PAGE_SIZE = 12;
  const MAX_PAGES = 4; // نحدّها لـ 4 صفحات (48 عنصر)

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [player, setPlayer] = useState({ open: false, ytid: "" });
  const [page, setPage] = useState(1);

  useEffect(() => {
    const ac = new AbortController();

    const tryFetch = async (url) => {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: ac.signal
      });
      const text = await res.text();
      let data = null; try { data = text ? JSON.parse(text) : null; } catch {}
      if (!res.ok) throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
      return Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    };

    (async () => {
      setLoading(true); setErr("");
      try {
        const cb = Date.now();
        let list = [];
        try {
          list = await tryFetch(`/api/content/short-segments?limit=200&_cb=${cb}`);
        } catch {
          list = await tryFetch(`/api/short-segments?limit=200&_cb=${cb}`);
        }

        const sorted = [...list].sort((a, b) => {
          const ta = new Date(a.published_at || a.created_at || 0).getTime() || 0;
          const tb = new Date(b.published_at || b.created_at || 0).getTime() || 0;
          return tb - ta;
        });

        setItems(sorted);
      } catch (e) {
        setErr(e?.message || "فشل الجلب");
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, []);

  // حضّر قائمة معرّفة بـ _ytid فقط
  const normalized = useMemo(
    () =>
      items
        .map((it) => {
          const id =
            it.youtube_id ||
            toYouTubeId(it.youtube_url || it.url || it.video_url || it.short_url || "");
          return id ? { ...it, _ytid: id } : null;
        })
        .filter(Boolean),
    [items]
  );

  // السقف الكلي (بحد أقصى 48)
  const totalCap = Math.min(normalized.length, MAX_PAGES * PAGE_SIZE);
  const totalPages = Math.max(
    1,
    Math.min(MAX_PAGES, Math.ceil(totalCap / PAGE_SIZE) || 1)
  );

  // إذا تغيّر العدد أو الصفحة خرجت عن النطاق، عدّل الصفحة
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  // العناصر الظاهرة لهذه الصفحة فقط (12 عنصر)
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
