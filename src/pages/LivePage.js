import React, { useEffect, useState } from "react";
import "./LivePage.css";
import AdAwr from "./AdAwr.jpg";   // 👈 نفس المجلد

export default function LivePage() {
  const BASE_W = 900;
  const LIVE_CORE_H = 600;
  const CONTROL_H  = 72; 
  const BASE_H = LIVE_CORE_H + CONTROL_H;

  const [scale, setScale] = useState(1);
  const [headerH, setHeaderH] = useState(0);

  useEffect(() => {
    const measure = () => {
      const h = document.querySelector("header")?.offsetHeight || 0;
      setHeaderH(h);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const fit = () => {
      const vw = window.innerWidth;
      const s = vw / BASE_W;
      setScale(s);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const scaledW = Math.round(BASE_W * scale);
  const scaledH = Math.round(BASE_H * scale);

  return (
    <div className="live-fit-stage" style={{ paddingTop: headerH }}>
      <div
        className="live-box"
        style={{ width: `${scaledW}px`, height: `${scaledH}px` }}
      >
        <div
          className="live-scale"
          style={{
            width: `${BASE_W}px`,
            height: `${BASE_H}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top center",
          }}
        >
          <iframe
            src="https://closeradio.tv/awrara/"
            
            title="Radio Live Stream"
            className="live-iframe"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>
      </div>

      {/* الصورة تحت اللايف */}
      <img src={AdAwr} alt="Ad" className="live-ad" />
    </div>
  );
}
