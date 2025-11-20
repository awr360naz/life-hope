// src/pages/CamiPropheciesPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./CamiPropheciesPage.css";
import ResilientThumb from "../components/ResilientThumb";
import ShortsegSafePlayerModal from "../components/ShortsegSafePlayerModal";

const PAGE_SIZE = 12;
const MAX_PAGES = 2; 
const LS_KEY = "camiProphecies_cache_v1";

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function uniqBy(arr, keyFn) {
  const seen = new Set();
  const out = [];
  for (const it of arr) {
    const k = keyFn(it);
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push(it);
    }
  }
  return out;
}

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

export default function CamiPropheciesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [player, setPlayer] = useState({ open: false, item: null });
  const [page, setPage] = useState(1);

  useEffect(() => {
    let alive = true;
    const ac = new AbortController();

    const tryFetch = async (url) => {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: ac.signal,
      });
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch {}
      if (!res.ok) throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
      return Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    };

    const fetchResilient = async () => {
      const cb = Date.now();
      const sources = [
        `/api/content/cami-prophecies?limit=200&_cb=${cb}`,
        `/api/cami-prophecies?limit=200&_cb=${cb}`,
      ];
      const attempts = [200, 600, 1200, 2000];
      let best = [];

      for (let i = 0; i < attempts.length; i++) {
        if (!alive) return best;

        try {
          const results = await Promise.allSettled(sources.map((s) => tryFetch(s)));
          let merged = [];
          for (const r of results) {
            if (r.status === "fulfilled" && Array.isArray(r.value)) {
              merged = merged.concat(r.value);
            }
          }

          merged = merged
            .map((it) => {
              const id =
                it.youtube_id ||
                toYouTubeId(it.youtube_url || it.url || it.video_url || it.short_url || "");
              return id ? { ...it, _ytid: id } : null;
            })
            .filter(Boolean);

          merged = uniqBy(merged, (x) => x._ytid);

          merged.sort((a, b) => {
            const ta = new Date(a.published_at || a.created_at || 0).getTime() || 0;
            const tb = new Date(b.published_at || b.created_at || 0).getTime() || 0;
            return tb - ta;
          });

          merged = merged.slice(0, MAX_PAGES * PAGE_SIZE);

          if (merged.length >= 36) {
            return merged;
          } else if (merged.length > best.length) {
            best = merged;
          }
        } catch {}
        await sleep(attempts[i]);
      }

      return best;
    };

    (async () => {
      setLoading(true);
      setErr("");

      try {
        const cached = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
        if (Array.isArray(cached) && cached.length) {
          setItems(cached);
          setLoading(false);
        }
      } catch {}

      try {
        const fresh = await fetchResilient();
        if (!alive) return;

        if (fresh.length >= 24) {
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

    return () => {
      alive = false;
      ac.abort();
    };
  }, []);

  const normalized = useMemo(
    () =>
      items
        .map((it) => {
          const id =
            it._ytid ||
            it.youtube_id ||
            toYouTubeId(it.youtube_url || it.url || it.video_url || it.short_url || "");
          return id ? { ...it, _ytid: id } : null;
        })
        .filter(Boolean),
    [items]
  );

  const totalCap = Math.min(normalized.length, MAX_PAGES * PAGE_SIZE);
  const totalPages = MAX_PAGES;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const paginatedItems = normalized.slice(start, end);

  const onCardClick = (it) => setPlayer({ open: true, item: it });

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setPlayer({ open: false, item: null });
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="cami-page wrap">
      <h2 className="cami-heading">فتح نبؤات مع Cami</h2>

      {loading && <p>جار التحميل...</p>}
      {err && <p className="cami-error">صار خطأ: {err}</p>}

      {!loading && !err && (
        <>
          <div className="cami-grid">
            {paginatedItems.map((it) => {
              const title = it.title || "فتح نبؤات مع Cami";
              return (
                <button
                  key={it.id || it.slug || it._ytid}
                  className="cami-card"
                  onClick={() => onCardClick(it)}
                  type="button"
                >
                  <div className="cami-thumb">
                    <ResilientThumb item={it} alt={title} />
                    <span className="cami-play" aria-hidden>
                      ▶
                    </span>
                  </div>
                  <div className="cami-body">
                    <h3 className="cami-title" title={title}>
                      {title}
                    </h3>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="cami-pager">
            <button
              type="button"
              className="cami-btn nav-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              السابق
            </button>

            <div className="cami-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`cami-btn ${page === n ? "is-active" : ""}`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="cami-btn nav-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              التالي
            </button>
          </div>
        </>
      )}

      <ShortsegSafePlayerModal
        open={!!player.open}
        item={player.item}
        title={player.item?.title}
        onClose={() => setPlayer({ open: false, item: null })}
      />
    </div>
  );
}
