import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

/**
 * ProgramsPage — افتراضية نافذة محسّنة (بدون سكروولر داخلي) 
 *
 * تحسينات الأداء الرئيسية:
 * 1) عدم استدعاء getBoundingClientRect() على كل scroll — بنحسب موضع الشبكة مرة واحدة ونحدّثه فقط عند الريسايز.
 * 2) عدم تغيير DOM (spacers) أثناء التمرير — بنستخدم حاوية بارتفاع إجمالي + translateY للجزء الظاهر.
 * 3) منع إعادة التصيير إن لم تتغير نافذة الصفوف (bail-out).
 * 4) content-visibility على الكرت لتقليل layout/paint لعناصر خارج الشاشة.
 */

export default function ProgramsPage() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // إعدادات الكروت/الشبكة
  const CARD_W = 260;   // عرض الكرت
  const IMG_H  = 180;   // ارتفاع صورة الكرت
  const CARD_H = 340;   // الارتفاع الكلي التقريبي للكرت
  const GAP    = 16;    // مسافة بين الكروت
  const BUFFER_ROWS = 3; // صفوف إضافية قبل/بعد النافذة لتمرير سلس

  // مراجع
  const gridRef = useRef(null);      // عنصر الشبكة (wrapper)
  const listRef = useRef(null);      // عنصر الارتفاع الإجمالي

  // حالة قياسات الشبكة + offset ثابت
  const [layout, setLayout] = useState({
    width: 0,
    height: 0,        // window.innerHeight
    perRow: 1,
    rowHeight: CARD_H + GAP,
    gridTopOnPage: 0, // موضع الشبكة على الصفحة — محسوب مرة عند التغيير
  });

  // نافذة العرض الافتراضية (بالصفوف)
  const [windowState, setWindowState] = useState({ startRow: 0, endRow: 0 });

  /* ========== جلب البيانات ========== */
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

  /* ========== أدوات مساعدة ========== */
  const getPageScrollY = () => window.pageYOffset || document.documentElement.scrollTop || 0;

  const computeGridTopOnPage = (el) => {
    if (!el) return 0;
    // أسرع/أرخص من getBoundingClientRect في كل scroll: بنحسب مرة واحدة
    let top = 0;
    let node = el;
    while (node) {
      top += node.offsetTop || 0;
      node = node.offsetParent;
    }
    return top;
  };

  /* ========== تحديث القياسات عند التغيير/الريسايز ========== */
  useLayoutEffect(() => {
    const updateLayout = () => {
      const grid = gridRef.current;
      if (!grid) return;
      const width = grid.clientWidth;            // عرض الشبكة
      const height = window.innerHeight;         // ارتفاع نافذة المتصفح
      const perRow = Math.max(1, Math.floor((width + GAP) / (CARD_W + GAP)));
      const rowHeight = CARD_H + GAP;
      const gridTopOnPage = computeGridTopOnPage(grid);
      setLayout({ width, height, perRow, rowHeight, gridTopOnPage });
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);

    // لو تغيّر قياس الحاوية بعد تحميل صور/خطوط
    const ro = new ResizeObserver(updateLayout);
    if (gridRef.current) ro.observe(gridRef.current);

    return () => {
      window.removeEventListener("resize", updateLayout);
      ro.disconnect();
    };
  }, []);

  /* ========== حساب نافذة الصفوف على تمرير النافذة ========== */
  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const { rowHeight, gridTopOnPage } = layout;
        const viewportTop = getPageScrollY();
        const viewportH = window.innerHeight;

        // تمرير محلي داخل الشبكة
        const localScrollTop = Math.max(0, viewportTop - gridTopOnPage);

        const nextStartRow = Math.max(0, Math.floor(localScrollTop / rowHeight) - BUFFER_ROWS);
        const nextEndRow = Math.floor((localScrollTop + viewportH) / rowHeight) + BUFFER_ROWS;

        // ✅ ما نعيد التصيير إذا ما تغيّر شيء
        setWindowState((prev) => {
          if (prev.startRow === nextStartRow && prev.endRow === nextEndRow) return prev;
          return { startRow: nextStartRow, endRow: nextEndRow };
        });

        ticking = false;
      });
    };

    // نافذة أولية + مستمع تمرير
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [layout]);

  if (err) {
    return (
      <main dir="rtl" style={{ maxWidth: 1200, margin: "2rem auto", padding: "0 1rem" }}>
        حدث خطأ: {err}
      </main>
    );
  }

  /* ========== حسابات الشبكة ========== */
  const total = items.length;
  const { perRow, rowHeight } = layout;
  const itemsPerRow = Math.max(1, perRow);
  const totalRows = Math.max(1, Math.ceil(total / itemsPerRow));
  const totalHeight = totalRows * rowHeight; // ارتفاع كامل اللست

  // نطاق الصفوف الظاهرة فعلاً (مع قيود)
  const startRow = Math.min(windowState.startRow, Math.max(0, totalRows - 1));
  const endRow = Math.min(windowState.endRow, totalRows - 1);

  // عناصر النافذة الحالية (slice)
  const sliceStart = startRow * itemsPerRow;
  const sliceEnd = Math.min(total, (endRow + 1) * itemsPerRow);

  const visibleItems = items.slice(sliceStart, sliceEnd);


  // إزاحة الجزء الظاهر باستخدام translateY بدل spacers DOM
  const translateY = startRow * rowHeight;

  return (
    <main dir="rtl" style={{ maxWidth: 1200, margin: "2rem auto", padding: "0 1rem" }}>
      {loading && <div style={{ textAlign: "center", margin: "12px 0" }}>جارٍ التحميل…</div>}

      {/* غلاف اللست: ارتفاع كامل ثابت لمنع تغييرات layout أثناء التمرير */}
      <div ref={gridRef} style={{ position: "relative" }}>
        <div
          ref={listRef}
          style={{
            position: "relative",
            height: totalHeight,
            contain: "layout paint",
          }}
        >
          {/* الجزء الظاهر فقط — مزاح بـ translateY */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: `translateY(${translateY}px)`,
              willChange: "transform", // فقط على هذا العنصر الصغير
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${itemsPerRow}, ${CARD_W}px)`,
                gap: `${GAP}px`,
                justifyContent: "space-between",
                padding: "0 4px",
              }}
            >
              {visibleItems.map((p, i) => {
                if (!p || typeof p !== "object") return null;
                const idx = sliceStart + i;
                const slugOrId = p.slug || p.id || p.day || `i-${idx}`;
                const img = p.cover_url || p.image_url || p.thumbnail || p.image;
                const title = p.title || p.name || "— بدون عنوان —";

                return (
                  <Card key={slugOrId} href={`/programs/${encodeURIComponent(slugOrId)}`} title={title} img={img} CARD_W={CARD_W} CARD_H={CARD_H} IMG_H={IMG_H} />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ========== كرت منفصل + memo للتقليل من إعادة التصيير ========== */
const Card = React.memo(function Card({ href, title, img, CARD_W, CARD_H, IMG_H }) {
  return (
    <Link to={href} style={{ textDecoration: "none", color: "inherit" }}>
      <article
        style={{
    borderRadius: 12
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
          <div style={{ width: "100%", height: IMG_H, background: "#f4f4f4" }} />
        )}

        <div style={{ padding: "10px 12px" }}>
         
        </div>
      </article>
    </Link>
  );
});
