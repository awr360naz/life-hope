import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./ProgramsPage.css";

/**
 * المطلوب:
 * - موبايل: عامود واحد + عرض كل العناصر (بدون افتراضية/تقطيع) حتى لو الجهاز أفقي.
 * - ديسكتوب: تقليل الفراغ العمودي فعليًا.
 */

export default function ProgramsPage() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // إعدادات الكروت/الشبكة
  const CARD_W = 260;   // عرض الكرت
  const IMG_H  = 180;   // ارتفاع صورة الكرت
  const CARD_H = 192;   // ✅ ارتفاع الكرت الفعلي تقريبًا (180 صورة + 12 هامش/هواء بسيط)
  const GAP    = 8;     // ✅ فجوة أصغر حقيقية
  const BUFFER_ROWS = 3;

  const gridRef = useRef(null);

  const [layout, setLayout] = useState({
    width: 0,
    height: 0,
    perRow: 1,
    rowHeight: CARD_H + GAP,
    gridTopOnPage: 0,
    isMobile: false,   // ✅ نمط الموبايل (نلغي الافتراضية ونعرِض الكل)
  });

  const [windowState, setWindowState] = useState({ startRow: 0, endRow: 0 });

  /* جلب البيانات */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/content/programs", { headers: { Accept: "application/json" } });
        const text = await res.text();
        let data = null; try { data = text ? JSON.parse(text) : null; } catch {}
        if (!res.ok) throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
        const arr = Array.isArray(data?.programs) ? data.programs : Array.isArray(data) ? data : [];
        setItems(arr.filter(Boolean));
      } catch (e) {
        setErr(e?.message || "خطأ غير معروف");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* أدوات مساعدة */
  const getPageScrollY = () =>
    window.pageYOffset || document.documentElement.scrollTop || 0;

  const computeGridTopOnPage = (el) => {
    if (!el) return 0;
    let top = 0;
    let node = el;
    while (node) {
      top += node.offsetTop || 0;
      node = node.offsetParent;
    }
    return top;
  };

  /* تحديث القياسات */
  useLayoutEffect(() => {
    const updateLayout = () => {
      const grid = gridRef.current;
      if (!grid) return;

      const width = grid.clientWidth;
      const height = window.innerHeight;

      // نعتبر الموبايل لكل الشاشات اللمسية/العرض الأصغر نسبيًا
      // حتى لو قلبتِ الهاتف أفقي: نظل موبايل
      const mobileBreakpoint = 1024; // ✅ أعلى من 768 حتى لما تقلبِ التليفون يظل عامود واحد
      const isMobile = window.innerWidth <= mobileBreakpoint || matchMedia("(pointer: coarse)").matches;

      let perRow = Math.max(1, Math.floor((width + GAP) / (CARD_W + GAP)));
      if (isMobile) perRow = 1; // ✅ قفل عامود واحد

      const rowHeight = CARD_H + GAP;
      const gridTopOnPage = computeGridTopOnPage(grid);
      setLayout({ width, height, perRow, rowHeight, gridTopOnPage, isMobile });
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
    const ro = new ResizeObserver(updateLayout);
    if (gridRef.current) ro.observe(gridRef.current);

    return () => {
      window.removeEventListener("resize", updateLayout);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* تمرير الصفحة (للديسكتوب فقط؛ الموبايل نعرض الكل) */
  useEffect(() => {
    if (layout.isMobile) return; // ✅ لا افتراضية/لا slicing على الموبايل

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const { rowHeight, gridTopOnPage } = layout;
        const viewportTop = getPageScrollY();
        const viewportH = window.innerHeight;

        const localScrollTop = Math.max(0, viewportTop - gridTopOnPage);

        const nextStartRow = Math.max(0, Math.floor(localScrollTop / rowHeight) - BUFFER_ROWS);
        const nextEndRow = Math.floor((localScrollTop + viewportH) / rowHeight) + BUFFER_ROWS;

        setWindowState((prev) => {
          if (prev.startRow === nextStartRow && prev.endRow === nextEndRow) return prev;
          return { startRow: nextStartRow, endRow: nextEndRow };
        });

        ticking = false;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [layout]);

  if (err) {
    return (
      <main dir="rtl" className="programs-main">
        حدث خطأ: {err}
      </main>
    );
  }

  /* حسابات الديسكتوب (الموبايل ما يحتاجها) */
  const total = items.length;
  const { perRow, rowHeight, isMobile } = layout;
  const itemsPerRow = Math.max(1, perRow);

  if (isMobile) {
    // ✅ موبايل: عامود واحد + عرض جميع العناصر + لا ارتفاع ثابت + لا translateY
    return (
      <main dir="rtl" className="programs-main">
        {loading && <div className="programs-loading">جارٍ التحميل…</div>}
        <div ref={gridRef} className="programs-grid-wrapper">
          <div
            className="programs-grid programs-grid-mobile"
            style={{ gridTemplateColumns: `1fr` }}
          >
            {items.map((p, i) => {
              if (!p || typeof p !== "object") return null;
              const slugOrId = p.slug || p.id || p.day || `i-${i}`;
              const img = p.cover_url || p.image_url || p.thumbnail || p.image;
              const title = p.title || p.name || "— بدون عنوان —";
              const href = `/programs/${encodeURIComponent(slugOrId)}`;
              return (
                <Card
                  key={slugOrId}
                  href={href}
                  title={title}
                  img={img}
                  CARD_W={CARD_W}
                  CARD_H={CARD_H}
                  IMG_H={IMG_H}
                />
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  // ✅ ديسكتوب: افتراضية عادية لكن مع CARD_H واقعي و GAP صغير
  const totalRows = Math.max(1, Math.ceil(total / itemsPerRow));
  const totalHeight = totalRows * rowHeight;

  const startRow = Math.min(windowState.startRow, Math.max(0, totalRows - 1));
  const endRow = Math.min(windowState.endRow, totalRows - 1);

  const sliceStart = startRow * itemsPerRow;
  const sliceEnd = Math.min(total, (endRow + 1) * itemsPerRow);
  const visibleItems = items.slice(sliceStart, sliceEnd);

  const translateY = startRow * rowHeight;

  return (
    <main dir="rtl" className="programs-main">
      {loading && <div className="programs-loading">جارٍ التحميل…</div>}

      <div ref={gridRef} className="programs-grid-wrapper">
        <div className="programs-list" style={{ height: totalHeight }}>
          <div className="programs-visible-window" style={{ transform: `translateY(${translateY}px)` }}>
            <div
              className="programs-grid"
              style={{ gridTemplateColumns: `repeat(${itemsPerRow}, ${CARD_W}px)` }}
            >
              {visibleItems.map((p, i) => {
                if (!p || typeof p !== "object") return null;
                const idx = sliceStart + i;
                const slugOrId = p.slug || p.id || p.day || `i-${idx}`;
                const img = p.cover_url || p.image_url || p.thumbnail || p.image;
                const title = p.title || p.name || "— بدون عنوان —";
                const href = `/programs/${encodeURIComponent(slugOrId)}`;
                return (
                  <Card
                    key={slugOrId}
                    href={href}
                    title={title}
                    img={img}
                    CARD_W={CARD_W}
                    CARD_H={CARD_H}
                    IMG_H={IMG_H}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ========== الكرت ========== */
const Card = React.memo(function Card({ href, title, img, CARD_W, CARD_H, IMG_H }) {
  return (
    <Link to={href} className="card-link">
      <article className="pc-card" style={{ width: CARD_W, height: CARD_H }}>
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
        <div className="pc-card-body">{/* فارغ */}</div>
      </article>
    </Link>
  );
});
