// src/components/ShortSegmentsCarousel.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./ShortSegmentsCarousel.css";

/* ===== Helpers: تحويل رابط يوتيوب إلى embed ===== */
function toYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.split("/")[1] || "";
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || "";
    const v = u.searchParams.get("v");
    if (v) return v;
    const m = url.match(/[?&]v=([^&#]+)|youtu\.be\/([^?#/]+)|shorts\/([^?#/]+)/);
    return m ? (m[1] || m[2] || m[3]) : "";
  } catch {
    return "";
  }
}

function toYouTubeEmbed(url, { nocookie = true } = {}) {
  const id = toYouTubeId(url);
  if (!id) return null;
  const host = nocookie ? "https://www.youtube-nocookie.com" : "https://www.youtube.com";
  return `${host}/embed/${id}?rel=0&modestbranding=1`;
}

/* ===== hook للاستجابة بعدد الكروت الظاهرة (نفس منطق برامجنا) ===== */
function useResponsivePerView(base = 5) {
  const [n, setN] = useState(base);
  useEffect(() => {
    const recalc = () => {
      const w = window.innerWidth;
      if (w <= 480) setN(1);
      else if (w <= 768) setN(2);
      else if (w <= 1024) setN(3);
      else if (w <= 1280) setN(4);
      else setN(base); // 5 بالكبير
    };
    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [base]);
  return n;
}

/* ===== الكومبوننت ===== */
export default function ShortSegmentsCarousel({
  title = "فقرات قصيرة",
  perView = 5,                         // كم كرت ظاهر بالكبير
  step = 1,                            // كم عنصر يتحرك بكل نقرة
  apiUrl = "/api/content/short-segments",
  limit = 30,
  items: itemsProp,                    // تمرير عناصر جاهزة (اختياري)
}) {
  const [items, setItems] = useState(itemsProp || []);
  const [loading, setLoading] = useState(!itemsProp);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);

  const trackRef = useRef(null);
  const visible = useResponsivePerView(perView);

  // جلب البيانات إن ما وصلتنا props
  useEffect(() => {
    if (itemsProp) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${apiUrl}?limit=${limit}`, {
          headers: { Accept: "application/json" },
        });
        const text = await res.text();
        let data = null; try { data = text ? JSON.parse(text) : null; } catch {}
        if (!res.ok) throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);
        const arr = Array.isArray(data?.items || data) ? (data.items || data) : [];
        setItems(arr);
      } catch (e) {
        setError(e.message || "فشل الجلب");
      } finally {
        setLoading(false);
      }
    })();
  }, [apiUrl, limit, itemsProp]);

  // أقصى اندكس ممكن (عشان ما نترك فراغ بالنهاية)
  const maxIndex = useMemo(() => {
    return Math.max(0, (items?.length || 0) - visible);
  }, [items, visible]);

  // يذهب إلى كرت معيّن بالسكّرول (يشتغل RTL/LTR)
  const goTo = (nextIndex) => {
    const i = Math.max(0, Math.min(maxIndex, nextIndex));
    setIndex(i);
    const el = trackRef.current?.querySelectorAll(".shortsegs-card")?.[i];
    if (el) {
      // inline:start يضمن اصطفاف الكرت عند حافة المسار الصحيحة
      el.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    }
  };

  const goPrev = () => goTo(index - step);
  const goNext = () => goTo(index + step);

  const canPrev = index > 0;
  const canNext = index < maxIndex;

  if (loading) return <section className="shortsegs-section">...جارِ التحميل</section>;
  if (error) return <section className="shortsegs-section">خطأ: {error}</section>;
  if (!items?.length) return <section className="shortsegs-section">لا توجد مقاطع بعد.</section>;

  return (
    <section className="shortsegs-section">
      <header className="shortsegs-header">
        {/* العنوان نفسه رابط للصفحة */}
        <h3 className="shortsegs-title">
          <Link to="/shorts" className="shortsegs-title-link">{title}</Link>
        </h3>
      </header>

      <div className="shortsegs-viewport">
        {/* أسهم مطابقة لبرامجنا */}
        <button
          className="shortsegs-arrow prev"
          onClick={goPrev}
          disabled={!canPrev}
          aria-label="السابق"
        >
          ‹
        </button>
        <button
          className="shortsegs-arrow next"
          onClick={goNext}
          disabled={!canNext}
          aria-label="التالي"
        >
          ›
        </button>

        <div className="shortsegs-track" ref={trackRef}>
          {items.map((seg) => {
            const src = toYouTubeEmbed(seg.video_url);
            return (
              <article className="shortsegs-card" key={seg.id || seg.video_url}>
                <div className="shortsegs-thumb">
                  {src ? (
                    <iframe
                      src={src}
                      title={seg.title || "Video"}
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                      style={{ display: "block", border: 0 }}
                    />
                  ) : (
                    <div>رابط غير صالح</div>
                  )}
                </div>
                <div className="shortsegs-meta">
                  <h4 className="title">{seg.title}</h4>
                  {seg.duration_sec ? <div className="duration">{seg.duration_sec}s</div> : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
