import React, { useEffect, useMemo, useState } from "react";
import "./HomePage.css";
import hopeImage from "./hopeimage.jpg"; 
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

  // عناصر برنامج اليوم
  const RAW_ITEMS = [
    { time: "00:20", title: "اية وحكاية" },
    { time: "01:30", title: "فتح نبؤات" },
    { time: "02:30", title: "الحياة والصحة" },
    { time: "03:20", title: "اية وحكاية" },
    { time: "03:30", title: "رؤيا" },
    { time: "06:30", title: "رؤيا" },
    { time: "07:00", title: "الكتاب المقدس" },
    { time: "08:00", title: "المزامير" },
    { time: "09:00", title: "خطوات الى المسيح" },
    { time: "10:20", title: "اية وحكاية" },
    { time: "13:30", title: "فتح نبؤات" },
    { time: "14:30", title: "الحياة والصحة" },
  ];

  // تيكر: يقلب كل 5 ثوانٍ ويتوقف عند المرور بالماوس
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const max = RAW_ITEMS.length;

  useEffect(() => {
    if (paused || max <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % max), 1000);
    return () => clearInterval(id);
  }, [paused, max]);

  const LIVE_SRC = "https://closeradio.tv/awrara/";

  return (
    <main className="homepage-rtl">
      {/* شريط تمركز الإطارات بالمنتصف */}
      <div className="frames-center">
        {/* ===== عنوان/تاريخ البث فوق الإطار (خارج الصندوق) ===== */}
        <div className="live-topline">
          <span className="live-title">البث المباشر</span>
          <span className="live-date">{todayStr}</span>
        </div>

        {/* ===== الإطار 1: البث المباشر ===== */}
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
          <div className="schedule-viewport">
            <ul
              className="schedule-list"
              style={{ transform: `translateY(${-(index * 24)}px)` }} 
            >
              {RAW_ITEMS.map((it, i) => (
                <li key={i} className="schedule-row">
                  <time className="row-time">{it.time}</time>
                  <span className="row-title">{it.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

         {/* ===== الإطار 3: تأمل هذا الأسبوع ===== */}
         
<section className="text-frame frame-3" dir="rtl">
  <h3 className="text-title">تأمل هذا الاسبوع</h3>
  <div className="text-body">
    <div className="text-content">
حتى في أصعب اللحظات، يُظهر الله حضوره كضوء لا ينطفئ، يرشد القلوب المتعبة ويمنحها السلام. عندما نشعر بالعجز أو الخوف، يدعونا الإيمان لنثق بأن كل شيء تحت سيطرته، وأنه يعمل للخير رغم الظلام المحيط. استمع لصوت الروح، وامنح نفسك الوقت لتستقر في حضن الله، فالقوة الحقيقية لا تأتي من الذات، بل من الاستسلام لمحبة الله التي لا تنتهي.
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
