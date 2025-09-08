import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

/**
 * افتراضية يدوية (Manual Virtualization) بلا مكتبات:
 * - منعرض فقط العناصر ضمن نافذة العرض + bufferRows.
 * - منستخدم spacers فوق/تحت حتى يضلّ الارتفاع الكلي صحيح.
 * - مافي Object.values ولا Grid/List خارجية — سريعة وثابتة.
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

  // مرجع للـ scroller
  const scrollerRef = useRef(null);
  const gridRef     = useRef(null);

  // حالة قياسات الشبكة
  const [layout, setLayout] = useState({
    width: 0,
    height: 0,
    perRow: 1,
    rowHeight: CARD_H + GAP,
  });

  // نافذة العرض الافتراضية (بالصفوف) + slice
  const [windowState, setWindowState] = useState({
    startRow: 0,
    endRow: 0,
  });

  // جلب البيانات
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

  // إعادة حساب الأعمدة عند التغيير/الريزايس
  useLayoutEffect(() => {
    const updateLayout = () => {
      const node = scrollerRef.current;
      const grid = gridRef.current;
      if (!node || !grid) return;

      const width = grid.clientWidth;      // عرض منطقة الشبكة
      const height = node.clientHeight;    // ارتفاع نافذة التمرير

      const perRow = Math.max(1, Math.floor((width + GAP) / (CARD_W + GAP)));
      const rowHeight = CARD_H + GAP;

      setLayout({ width, height, perRow, rowHeight });
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
    // لو كان فيه خطوط/صور بتغيّر قياس الحاوية بعد تحميلها
    const ro = new ResizeObserver(updateLayout);
    if (gridRef.current) ro.observe(gridRef.current);

    return () => {
      window.removeEventListener("resize", updateLayout);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // تحديث نافذة الصفوف عند التمرير (مخفّض عبر rAF)
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

    // ابدأ بتعيين نافذة أوليّة
    onScroll();
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, [layout]);

  if (err) {
    return (
      <main dir="rtl" style={{ maxWidth: 1200, margin: "2rem auto", padding: "0 1rem" }}>
        حدث خطأ: {err}
      </main>
    );
  }

  // حسابات الشبكة
  const total = items.length;
  const { perRow, rowHeight } = layout;
  const totalRows = Math.max(1, Math.ceil(total / Math.max(1, perRow)));

  // نطاق الصفوف الظاهرة فعلاً
  const startRow = Math.min(windowState.startRow, Math.max(0, totalRows - 1));
  const endRow = Math.min(windowState.endRow, totalRows - 1);

  // حواف فارغة (spacers) فوق/تحت
  const topSpacerHeight = startRow * rowHeight;
  const bottomSpacerHeight = Math.max(0, (totalRows - endRow - 1) * rowHeight);

  // عناصر النافذة الحالية (slice)
  const sliceStart = startRow * Math.max(1, perRow);
  const sliceEnd = Math.min(total, (endRow + 1) * Math.max(1, perRow));
  const visibleItems = items.slice(sliceStart, sliceEnd);

  return (
    <main dir="rtl" style={{ maxWidth: 1200, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>كل البرامج</h1>
      {loading && <div style={{ textAlign: "center", margin: "12px 0" }}>جارٍ التحميل…</div>}

      {/* Scroller */}
      <div
        ref={scrollerRef}
        style={{
          height: "80vh",
          overflowY: "auto",
          overscrollBehavior: "contain",
          borderRadius: 12,
          background: "transparent",
          // تعطيل تأثيرات ثقيلة داخل الـ scroller
          willChange: "transform",
        }}
      >
        {/* Grid container يحسب العرض وعدد الأعمدة */}
        <div ref={gridRef}>
          {/* Spacer علوي */}
          {topSpacerHeight > 0 && <div style={{ height: topSpacerHeight }} />}

          {/* صفوف ظاهرة فعلاً */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.max(1, perRow)}, ${CARD_W}px)`,
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
                <Link
                  key={slugOrId}
                  to={`/programs/${encodeURIComponent(slugOrId)}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
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
                      <div
                        style={{
                          width: "100%", height: IMG_H, overflow: "hidden",
                          borderRadius: 10, background: "#f4f4f4",
                        }}
                      >
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

          {/* Spacer سفلي */}
          {bottomSpacerHeight > 0 && <div style={{ height: bottomSpacerHeight }} />}
        </div>
      </div>
    </main>
  );
}
