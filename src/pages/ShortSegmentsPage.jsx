import React, { useEffect, useState, useMemo } from "react";
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

function ytEmbed(id) {
  // نستخدم youtube-nocookie لخصوصية أفضل
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
}

export default function ShortSegmentsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [player, setPlayer] = useState({ open: false, ytid: "" });

  useEffect(() => {
    (async () => {
      try {
        const tryFetch = async (url) => {
          const res = await fetch(url, { headers: { Accept: "application/json" } });
          const text = await res.text();
          let data = null; try { data = text ? JSON.parse(text) : null; } catch {}
          if (!res.ok) throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
          return Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        };
        let list = [];
        try { list = await tryFetch("/api/content/short-segments?limit=200"); }
        catch { list = await tryFetch("/api/short-segments?limit=200"); }
        setItems(list);
      } catch (e) { setErr(e?.message || "فشل الجلب"); }
      finally { setLoading(false); }
    })();
  }, []);

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
        <div className="shortseg-grid">
          {normalized.map((it) => {
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
                src={ytEmbed(player.ytid)}
                title="Short Segment"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
