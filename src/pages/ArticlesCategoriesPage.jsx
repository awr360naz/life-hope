import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./ArticlesCategoriesPage.css";

export default function ArticlesCategoriesPage() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // إعدادات الكروت/الشبكة — نفس تبعك
  const CARD_W = 260;
  const IMG_H  = 180;
  const CARD_H = 340;
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
    return <main dir="rtl" style={{ maxWidth: 1200, margin: "2rem auto", padding: "0 1rem" }}>حدث خطأ: {err}</main>;
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
    <main dir="rtl" style={{ maxWidth: 1200, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>التصنيفات</h1>
      {loading && <div style={{ textAlign: "center", margin: "12px 0" }}>جارٍ التحميل…</div>}

      <div
        ref={scrollerRef}
        style={{
          height: "80vh",
          overflowY: "auto",
          overscrollBehavior: "contain",
          borderRadius: 12,
          background: "transparent",
          willChange: "transform",
        }}
      >
        <div ref={gridRef}>
          {topSpacerHeight > 0 && <div style={{ height: topSpacerHeight }} />}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.max(1, perRow)}, ${CARD_W}px)`,
              gap: `${GAP}px`,
              justifyContent: "space-between",
              padding: "0 4px",
            }}
          >
            {visibleItems.map((c, i) => {
              if (!c || typeof c !== "object") return null;
              const idx = sliceStart + i;
              const title = c.name || c.slug || "— بدون اسم —";
              const img = c.cover_url || null;

              // نمرّر "name" بالـ URL (حسب طلبك المطابقة بالاسم)
              const nameParam = encodeURIComponent(c.name || "");
              const to = `/articles/category/${nameParam}`;

              return (
                <Link key={c.id || `i-${idx}`} to={to} style={{ textDecoration: "none", color: "inherit" }}>
                  <article
                    style={{
                      width: CARD_W,
                      height: CARD_H,
                      background: "#fff",
                      border: "1px solid #eee",
                      borderRadius: 12,
                      padding: 6,
                      boxSizing: "border-box",
                      display: "grid",
                      gridTemplateRows: "auto 1fr",
                      contentVisibility: "auto",
                      contain: "layout paint size style",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    }}
                  >
                    {img ? (
                      <div style={{ width: "100%", height: IMG_H, overflow: "hidden", borderRadius: 10, background: "#f4f4f4" }}>
                        <img
                          src={img}
                          alt={title}
                          loading="lazy"
                          decoding="async"
                          crossOrigin="anonymous"
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                      </div>
                    ) : (
                      <div style={{ width: "100%", height: IMG_H, borderRadius: 10, background: "#f4f4f4" }} />
                    )}
                    <h3 style={{ marginTop: 10, fontSize: 16, lineHeight: 1.2 }} title={title}>
                      {title}
                    </h3>
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
