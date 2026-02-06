import React, { useEffect, useMemo, useRef, useState } from "react";
import "./HomePage.css";
import hopeImage from "./hopeimage.jpg";
import api from "../lib/api"; 
import ArticlesCarousel from "../components/ArticlesCarousel";
import ProgramsCarousel from "../components/ProgramsCarousel";
import ShortSegmentsCarousel from "../components/ShortSegmentsCarousel";
import { Link } from "react-router-dom";
import ThirdFrame from "./ThirdFrame"; 
import OurPicks from "./OurPicks";
import MiniScheduleWidget from "./MiniScheduleWidget";
import GifNotice from "../components/GifNotice";
import angel from "../assets/angel.gif";
import ThreeAngelsmp4 from "../assets/ThreeAngels.mp4";
import CamiPropheciesCarousel from "../components/CamiPropheciesCarousel";
import ThtSaqfWahdCarousel from "../components/ThtSaqfWahdCarousel";
import TestSentryButton from "../TestSentryButton";
import AWR_360_ChristmasWishes from "../assets/AWR_360_ChristmasWishes.mp4";
import MessageOfTheDay from "./MessageOfTheDay";
import MrayaAlrohCarousel from "../components/MrayaAlrohCarousel";
import SehaAfdalCarousel from "../components/SehaAfdalCarousel";






export default function HomePage() { 
  useEffect(() => {
    document.title = "AWR360ARABIC – الصفحة الرئيسية";
  }, []);

  const todayStr = useMemo(() => {
    const tz = "Asia/Jerusalem";
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    return fmt.format(new Date()); 
  }, []);


  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const max = items.length;
  const ROW_H = 24;
  const STEP_MS = 1000;


  function normalizeItems(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map((it) => {
      if (typeof it?.t === "string") return { time: "—", title: it.t };
      if (typeof it === "string") return { time: "—", title: it }; 
      return { time: it?.time ?? "—", title: it?.title ?? "" }; 
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
    const id = setInterval(() => setIndex((i) => i + 1), STEP_MS);
    return () => clearInterval(id);
  }, [paused, max]);


  const handleTransitionEnd = () => {
    if (max && index >= max) {
      setResetting(true);
      setIndex(0);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setResetting(false))
      );
    }
  };


  const LIVE_SRC = "https://closeradio.tv/awrara/player.htm";


  const items2 = items.length ? [...items, ...items] : [];

  return (
    
    <main className="homepage-rtl">
      
  <div className="frames-center">

  {/* ===== الإطار 1: برنامج اليوم ===== */}
  <section
    className="schedule-frame"
    onMouseEnter={() => setPaused(true)}
    onMouseLeave={() => setPaused(false)}
    onTouchStart={() => setPaused(true)}
    onTouchEnd={() => setPaused(false)}
    onMouseDown={() => setPaused(true)}
    onMouseUp={() => setPaused(false)}
  >
    <MiniScheduleWidget className="msw-wide" paused={paused} />
  </section>

  <div className="live-topline">
    <span className="live-date">{todayStr}</span>
    <span className="live-title">البث المباشر</span>
  </div>

  {/* ===== الإطار 2: البث ===== */}
  <section className="live-frame">
    <div className="live-box">
      <div className="livebox-aspect">
        <iframe
          className="live-iframe"
          src={LIVE_SRC}
          title="البث المباشر"
          scrolling="no"
          referrerPolicy="no-referrer"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture; web-share"
          allowFullScreen
        />
        
      </div>
    </div>
  </section>

  {/* ===== الإطار 3: رسالة الملائكة الثلاث (ثابت بدل البوب اب) ===== */}
  <section className="text-frame frame-3 angels-frame" dir="rtl">
    <div className="angels-card">
      <div className="angels-media">
        <video
          className="angels-video"
          src={ThreeAngelsmp4}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      </div>

      <p className="angels-text">
        ثُمَّ رَأَيْتُ مَلاَكًا آخَرَ طَائِرًا فِي وَسَطِ السَّمَاءِ مَعَهُ بِشَارَةٌ أَبَدِيَّةٌ...
      </p>

   <Link to="/AngelsPage" className="angels-btn">
  للمزيد
</Link>

    </div>
  </section>

</div>

      



<br></br><br></br><br></br><br></br>

   <ProgramsCarousel title="برامجنا" />
   <br></br>
 <CamiPropheciesCarousel />
  <br></br>
<ThtSaqfWahdCarousel

/>
 <br></br>

      <ShortSegmentsCarousel
  title="فقرات قصيرة"
  perView={5}
  step={1}
  apiUrl="/api/content/short-segments"
  toAllHref="/shorts"
  limit={48}
/>
<br></br>
<MrayaAlrohCarousel
  title="مرايا الروح"
  apiUrl="/api/content/mraya-alroh?limit=24"
  linkTo="/mraya-alroh"
/>
<br></br>
<SehaAfdalCarousel
  title="صحة افضل لحياة افضل"
  apiUrl="/api/content/seha-afdal?limit=24"
  linkTo="/seha-afdal"
/>


  <OurPicks
       title="فقرات قصيرة"
      />



    </main>
  );
}