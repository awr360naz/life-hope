import React, { useEffect, useState } from "react";
import "./LivePage.css";
import AdAwr from "./AdAwr.jpg";

export default function LivePage() {
  // الحجم الأصلي التقريبي للمشغّل داخل closeradio (عدّليه إذا لزم)
  const BASE_W = 900;   // العرض الأصلي
  const BASE_H = 600;   // الارتفاع الأصلي

  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fit = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // أصغر مقياس حتى نحتوي المشغل بالكامل
      const s = Math.min(vw / BASE_W, vh / BASE_H);
      setScale(s);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <div className="live-fit-stage">
      <div
        className="live-fit-frame"
        style={{
          width: `${BASE_W}px`,
          height: `${BASE_H}px`,
          transform: `scale(${scale})`,
        }}
      >
        {/* البث المباشر */}
        <iframe
          src="https://closeradio.tv/awrara/"
          title="Radio Live Stream"
          className="live-iframe"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />

        {/* الصورة تحت البث */}
        <img
          src={AdAwr}
          alt="Ad"
          className="live-ad"
        />
      </div>
    </div>
  );
}
