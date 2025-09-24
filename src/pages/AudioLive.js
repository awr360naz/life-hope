import React from "react";
import "./AudioLive.css";
import AdAwr from "./AdAwr.jpg";

export default function Mp3LivePage() {
  return (
    <main className="mp3-page">
      <div className="mp3-container">
        {/* البث الصوتي */}
        <div className="mp3-audio">
          <iframe
            className="mp3-iframe"
            src="https://www.alsolnet.com/stream/awraraaudio/"
            title="Radio Live Stream"
            allow="autoplay; encrypted-media"
            allowFullScreen
          ></iframe>
        </div>

        {/* الصورة تحت البث */}
        <img className="mp3-ad" src={AdAwr} alt="Ad" loading="lazy" />
      </div>
    </main>
  );
}
