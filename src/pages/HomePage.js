// src/pages/HomePage.js
import React, { useEffect, useMemo, useState } from "react";
import "./HomePage.css";
import hopeImage from "./hopeimage.jpg";
import api from "../lib/api"; // مهم: تأكدي من المسار حسب هيكلة مشروعك

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
  const max = items.length;

  // ✅ تعديل normalizeItems
  function normalizeItems(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map((it) => {
      if (typeof it?.t === "string") return { time: "—", title: it.t }; // دعم Supabase {t:"..."}
      if (typeof it === "string") return { time: "—", title: it };      // سترينغ عادي
      return { time: it?.time ?? "—", title: it?.title ?? "" };         // شكل {time,title}
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

  useEffect(() => {
    if (paused || max <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % max), 1000);
    return () => clearInterval(id);
  }, [paused, max]);

  const LIVE_SRC = "https://closeradio.tv/awrara/";

  return (
    <main className="homepage-rtl">
      <div className="frames-center">
        {/* ===== عنوان/تاريخ البث ===== */}
        <div className="live-topline">
          <span className="live-title">البث المباشر</span>
          <span className="live-date">{todayStr}</span>
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
                className="schedule-list"
                style={{ transform: `translateY(${-(index * 24)}px)` }}
              >
                {items.map((it, i) => (
                  <li key={i} className="schedule-row">
                    <time className="row-time">{it.time}</time>
                    <span className="row-title">{it.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ===== الإطار 3: تأمل هذا الأسبوع ===== */}
        <section className="text-frame frame-3" dir="rtl">
          <h3 className="text-title">تأمل هذا الاسبوع</h3>
          <div className="text-body">
            <div className="text-content">
              حتى في أصعب اللحظات، يُظهر الله حضوره كضوء لا ينطفئ، يرشد القلوب
              المتعبة ويمنحها السلام. عندما نشعر بالعجز أو الخوف، يدعونا الإيمان
              لنثق بأن كل شيء تحت سيطرته، وأنه يعمل للخير رغم الظلام المحيط.
              استمع لصوت الروح، وامنح نفسك الوقت لتستقر في حضن الله، فالقوة
              الحقيقية لا تأتي من الذات، بل من الاستسلام لمحبة الله التي لا تنتهي.
            </div>
            <div className="text-image">
              <img src={hopeImage} alt="Hope" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
