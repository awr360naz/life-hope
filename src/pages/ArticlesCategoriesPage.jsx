import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./ArticlesCategoriesPage.css";

export default function ArticlesCategoriesPage() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // نفس إعداداتك 1:1
  const CARD_W = 260;
  const IMG_H  = 180;
  const CARD_H = 220;
  const GAP    = 16;
  const BUFFER_ROWS = 3;

  const scrollerRef = useRef(null);
  const gridRef     = useRef(null);

  const [layout, setLayout] = useState({ width: 0, height: 0, perRow: 1, rowHeight: CARD_H + GAP });
  const [windowState, setWindowState] = useState({ startRow: 0, endRow: 0 });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/content/categories", { headers: { Accept: "application/json" }, cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data?.ok) throw new Error(data?.error || ("HTTP " + res.status));
        const arr = Array.isArray(data.items) ? data.items : [];
        setItems(arr.filter(Boolean));
      } catch (e) {
        setErr(e?.message || "خطأ غير معروف");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useLayoutEffect(() => {
    const updateLayout = () => {
      const node = scrollerRef.current;
      const grid = gridRef.current;
      if (!node || !grid) return;
      const width = grid.clientWidth;
      const height = node.clientHeight;
      const perRow = Math.max(1, Math.floor((width + GAP) / (CARD_W + GAP)));
      const rowHeight = CARD_H + GAP;
      setLayout({ width, height, perRow, rowHeight });
    };
    updateLayout();
    window.addEventListener("resize", updateLayout);
    const ro = new ResizeObserver(updateLayout);
    if (gridRef.current) ro.observe(gridRef.current);
    return () => { window.removeEventListener("resize", updateLayout); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const { scrollTop, clientHeight } = node;
        const { rowHeight } = layout;
        const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - BUFFER_ROWS);
        const endRow = Math.floor((scrollTop + clientHeight) / rowHeight) + BUFFER_ROWS;
        setWindowState({ startRow, endRow });
        ticking = false;
      });
    };
    onScroll();
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, [layout]);

  if (err) {
    return (
      <main dir="rtl" className="cats-main">
        حدث خطأ: {err}
      </main>
    );
  }

  const total = items.length;
  const { perRow, rowHeight } = layout;
  const totalRows = Math.max(1, Math.ceil(total / Math.max(1, perRow)));
  const startRow = Math.min(windowState.startRow, Math.max(0, totalRows - 1));
  const endRow = Math.min(windowState.endRow, totalRows - 1);
  const topSpacerHeight = startRow * rowHeight;
  const bottomSpacerHeight = Math.max(0, (totalRows - endRow - 1) * rowHeight);
  const sliceStart = startRow * Math.max(1, perRow);
  const sliceEnd = Math.min(total, (endRow + 1) * Math.max(1, perRow));
  const visibleItems = items.slice(sliceStart, sliceEnd);

  return (
    <main dir="rtl" className="cats-main">
      {loading && <div className="cats-loading">جارٍ التحميل…</div>}

      <div ref={scrollerRef} className="cats-scroller">
        <div ref={gridRef}>
          {topSpacerHeight > 0 && <div style={{ height: topSpacerHeight }} />}

          <div
            className="cats-grid"
            style={{
              // ديناميكي (يبقى كما هو) — يعتمد على perRow مثل كودك الأصلي
              gridTemplateColumns: `repeat(${Math.max(1, perRow)}, ${CARD_W}px)`
            }}
          >
            {visibleItems.map((c, i) => {
              if (!c || typeof c !== "object") return null;
              const idx = sliceStart + i;
              const title = c.name || c.slug || "— بدون اسم —";
              const img = c.cover_url || null;

              const nameParam = encodeURIComponent(c.name || "");
              const to = `/articles/category/${nameParam}`;

              return (
                <Link key={c.id || `i-${idx}`} to={to} className="card-link">
                  <article className="category-card" style={{ width: CARD_W, height: CARD_H }}>
                    <div className="image-wrap" style={{ height: IMG_H }}>
                      {img ? (
                        <img
                          src={img}
                          alt={title}
                          loading="lazy"
                          decoding="async"
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="img-placeholder">—</div>
                      )}
                    </div>
                    {/* مافي نص داخلي بالكرت في كودك الحالي، محافظين عليه */}
                  </article>
                </Link>
              );
            })}
          </div>

          {bottomSpacerHeight > 0 && <div style={{ height: bottomSpacerHeight }} />}
        </div>
      </div>
    </main>
  );
}
