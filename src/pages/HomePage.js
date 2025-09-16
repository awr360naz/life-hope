import React, { useEffect, useMemo, useRef, useState } from "react";
import "./HomePage.css";
import hopeImage from "./hopeimage.jpg";
import api from "../lib/api"; 
import ArticlesCarousel from "../components/ArticlesCarousel";
import ProgramsCarousel from "../components/ProgramsCarousel";
import ShortSegmentsCarousel from "../components/ShortSegmentsCarousel";
import { Link } from "react-router-dom";


function ThirdFrame() {
  const [item, setItem] = React.useState(null);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/content/home-third-frame", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "HTTP " + res.status);
        const it = data?.content;
        if (!it) throw new Error("لا توجد بيانات.");

        setItem({
          title: it.title?.trim() || "",          // ممكن يكون فاضي — نخبّيه
          body: it.body || "",
          image_url: it.image_url || null,
        });
      } catch (e) {
        setErr("تعذّر تحميل معلومات الإطار الثالث: " + e.message);
      }
    })();
  }, []);

  if (err) return <p className="third-frame-error">{err}</p>;
  if (!item) return null;

  return (
    <section className="third-frame" dir="rtl" aria-label="تأمل هذا الأسبوع">
      {/* النص يمين */}
      <div className="tf-col tf-col--right">
        <h2 className="tf-title">تأمل هذا الأسبوع</h2>
        {item.title && <h3 className="tf-subtitle">{item.title}</h3>}
        <p className="tf-paragraph">{item.body}</p>
      </div>

      {/* الصورة شمال */}
      <div className="tf-col tf-col--left">
        <div className="image-4x5">
          {item.image_url ? (
            <img src={item.image_url} alt={item.title || "صورة التأمل"} />
          ) : (
            <div className="image-placeholder">لا توجد صورة</div>
          )}
        </div>
      </div>
    </section>
  );
}


export default function HomePage() { 
  // تاريخ اليوم بأرقام إنجليزية (Asia/Jerusalem)
  const todayStr = useMemo(() => {
    const tz = "Asia/Jerusalem";
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    return fmt.format(new Date()); // مثل: 20/08/2025
  }, []);

  // ===== برنامج اليوم =====
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const max = items.length;
  const ROW_H = 24;
  const STEP_MS = 1000;

  // ✅ تعديل normalizeItems
  function normalizeItems(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map((it) => {
      if (typeof it?.t === "string") return { time: "—", title: it.t }; // دعم Supabase {t:"..."}
      if (typeof it === "string") return { time: "—", title: it }; // سترينغ عادي
      return { time: it?.time ?? "—", title: it?.title ?? "" }; // شكل {time,title}
    });
  }

  useEffect(() => {
    api
      .getProgramToday()
      .then((data) => {
        const normalized = normalizeItems(data?.program?.items);
        setItems(normalized);
        setIndex(0);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  // مؤقّت التحريك
  useEffect(() => {
    if (paused || max <= 1) return;
    const id = setInterval(() => setIndex((i) => i + 1), STEP_MS);
    return () => clearInterval(id);
  }, [paused, max]);

  // عند انتهاء الانتقال: لو دخلنا النصف الثاني، نرجّع للصفر بلا أنيميشن
  const handleTransitionEnd = () => {
    if (max && index >= max) {
      setResetting(true);
      setIndex(0);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setResetting(false))
      );
    }
  };

  const LIVE_SRC = "https://closeradio.tv/awrara/";

  // نسخة مكررة من العناصر لعمل لوب سلس
  const items2 = items.length ? [...items, ...items] : [];

  return (
    <main className="homepage-rtl">
      <div className="frames-center">
        {/* ===== عنوان/تاريخ البث ===== */}
        <div className="live-topline">
           <span className="live-date">{todayStr}</span>
          <span className="live-title">البث المباشر</span>
         
        </div>

        {/* ===== الإطار 1: البث ===== */}
        <section className="live-frame">
          <div className="live-box">
            <iframe
              className="live-iframe"
              src={LIVE_SRC}
              title="البث المباشر"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </section>

        {/* ===== الإطار 2: برنامج اليوم ===== */}
        <section
  className="schedule-frame"
  onMouseEnter={() => setPaused(true)}
  onMouseLeave={() => setPaused(false)}
  onTouchStart={() => setPaused(true)}
  onTouchEnd={() => setPaused(false)}
  onMouseDown={() => setPaused(true)}
  onMouseUp={() => setPaused(false)}
>

          <div className="frame-header center">
            <span className="schedule-title">برنامج اليوم</span>
          </div>

          {err ? <div className="schedule-error">خطأ في الجلب: {err}</div> : null}

          <div className="schedule-viewport">
            {loading ? (
              <ul className="schedule-list">
                <li className="schedule-row">
                  <time className="row-time">…</time>
                  <span className="row-title">… جاري التحميل</span>
                </li>
              </ul>
            ) : items.length === 0 ? (
              <ul className="schedule-list">
                <li className="schedule-row">
                  <time className="row-time">—</time>
                  <span className="row-title">لا يوجد فقرات مُسجّلة لليوم</span>
                </li>
              </ul>
            ) : (
              <ul
                className={`schedule-list ${resetting ? "no-anim" : ""}`}
                style={{ transform: `translateY(${-index * ROW_H}px)` }}
                onTransitionEnd={handleTransitionEnd}
              >
                {items2.map((it, i) => (
                  <li key={i} className="schedule-row">
                    <time className="row-time">{it.time}</time>
                    <span className="row-title">{it.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ===== الإطار 3 ===== */}
        <section className="text-frame frame-3" dir="rtl">
          <ThirdFrame />
        </section>
      </div>
<br></br>
   <ProgramsCarousel title="برامجنا" />
   <br></br><br></br>
 
      <ShortSegmentsCarousel
  title="فقرات قصيرة"
  perView={5}
  step={1}
  apiUrl="/api/content/short-segments"
  toAllHref="/shorts"
  limit={30}
/>


    </main>
  );
}


