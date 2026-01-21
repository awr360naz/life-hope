// src/pages/CamiPropheciesPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import "./CamiPropheciesPage.css";
import ResilientThumb from "../components/ResilientThumb";
import ShortsegSafePlayerModal from "../components/ShortsegSafePlayerModal";

const PAGE_SIZE = 15;
const MAX_PAGES = 2;
const LS_KEY = "camiProphecies_cache_v2";

function uniqBy(arr, keyFn) {
  const seen = new Set();
  const out = [];
  for (const it of arr || []) {
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

function sortByDbSort(list) {
  const arr = [...(list || [])];
  arr.sort((a, b) => {
    const sa = Number.isFinite(+a.sort) ? +a.sort : 999999999;
    const sb = Number.isFinite(+b.sort) ? +b.sort : 999999999;
    if (sa !== sb) return sa - sb;

    const ta = new Date(a.published_at || a.created_at || 0).getTime() || 0;
    const tb = new Date(b.published_at || b.created_at || 0).getTime() || 0;
    return tb - ta;
  });
  return arr;
}

export default function CamiPropheciesPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const focusId = searchParams.get("video");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [player, setPlayer] = useState({ open: false, item: null });
  const [page, setPage] = useState(1);

  useEffect(() => {
    let alive = true;
    const ac = new AbortController();
    const need = MAX_PAGES * PAGE_SIZE; // 30

    const tryFetch = async (url) => {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: ac.signal,
      });
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {}
      if (!res.ok) {
        throw new Error(
          data?.error || data?.message || text || `HTTP ${res.status}`
        );
      }
      return Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : [];
    };

    const fetchFast = async () => {
      const cb = Date.now();
      // ✅ مصدر واحد سريع + limit بس اللي نحتاجه
      const url = `/api/content/cami-prophecies?limit=${need}&_cb=${cb}`;

      const fresh = await tryFetch(url);

      let merged = (fresh || [])
        .map((it) => {
          // ✅ اعتمد بس على youtube_id / youtube_url
          const id =
            it.youtube_id || toYouTubeId(it.youtube_url || it.youtubeId || "");
          return id ? { ...it, _ytid: id } : null;
        })
        .filter(Boolean);

      merged = uniqBy(merged, (x) => x._ytid);

      // ✅ ترتيب نهائي حسب sort (حتى لو رجعت من كاش)
      merged = sortByDbSort(merged);

      return merged.slice(0, need);
    };

    (async () => {
      setErr("");

      // ✅ اعرض الكاش فورًا لو موجود
      try {
        const cached = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
        if (Array.isArray(cached) && cached.length) {
          setItems(sortByDbSort(cached));
          setLoading(false);
        } else {
          setLoading(true);
        }
      } catch {
        setLoading(true);
      }

      try {
        const fresh = await fetchFast();
        if (!alive) return;

        if (fresh.length) {
          setItems(fresh);
          localStorage.setItem(LS_KEY, JSON.stringify(fresh));
          setErr("");
        } else {
          // لو ما في بيانات، خليها فاضية بس بدون ما نكسر الصفحة
          setItems([]);
          setErr("لم تصل بيانات كافية");
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

  const normalized = useMemo(() => {
    return (items || [])
      .map((it) => {
        const id =
          it._ytid ||
          it.youtube_id ||
          toYouTubeId(it.youtube_url || it.youtubeId || "");
        const finalId = id || it.id;
        return finalId ? { ...it, _ytid: finalId } : null;
      })
      .filter(Boolean);
  }, [items]);

  // ✅ ضمان ترتيب حتى لو items اجت بأي ترتيب
  const ordered = useMemo(() => sortByDbSort(normalized), [normalized]);

  const totalPages = MAX_PAGES;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [page, totalPages]);

  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const paginatedItems = ordered.slice(start, end);

  const onCardClick = (it) => setPlayer({ open: true, item: it });

  useEffect(() => {
    if (!focusId || !ordered.length) return;

    let target =
      ordered.find(
        (it) =>
          String(it.id) === String(focusId) ||
          String(it._ytid) === String(focusId)
      ) || ordered.find((it) => String(it.slug || "") === String(focusId));

    if (target) {
      setPlayer({ open: true, item: target });
      const idx = ordered.indexOf(target);
      if (idx >= 0) {
        const newPage = Math.floor(idx / PAGE_SIZE) + 1;
        setPage(newPage);
      }
    }
  }, [focusId, ordered]);

  useEffect(() => {
    const onKey = (e) =>
      e.key === "Escape" && setPlayer({ open: false, item: null });
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="cami-page wrap">
      <h2 className="cami-heading">فتح نبؤات</h2>

      {loading && <p>جار التحميل...</p>}
      {err && <p className="cami-error">صار خطأ: {err}</p>}

      {!loading && !err && (
        <>
          <div className="cami-grid">
            {paginatedItems.map((it) => {
              const title = it.title || "فتح نبؤات";
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
