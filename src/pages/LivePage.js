import React, { useEffect, useState } from "react";
import "./LivePage.css";
import AdAwr from "./AdAwr.jpg";

export default function LivePage() {
  const [headerH, setHeaderH] = useState(0);

  useEffect(() => {
    setHeaderH(document.querySelector("header")?.offsetHeight || 0);
  }, []);

  const LIVE_SRC = "https://closeradio.tv/awrara/player.htm";

  return (
    <div className="livefull-wrap" style={{ paddingTop: headerH }}>
      <div className="livefull-player">
        <div className="livefull-aspect">
          <iframe
            src={LIVE_SRC}
            title="Radio Live Stream"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            scrolling="no"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      <img src={AdAwr} alt="Ad" className="livefull-ad" />
    </div>
  );
}
