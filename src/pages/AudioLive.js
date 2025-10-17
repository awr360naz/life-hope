import React from "react";
import "./AudioLive.css";
import AdAwr from "./AdAwr.jpg";

export default function Mp3LivePage() {
  return (
    <main className="mp3-page" dir="rtl" lang="ar">
      <div className="mp3-container">
        <section className="audio-card">
          <header className="audio-header">البث الصوتي</header>

          {/* الصورة (كاملة بدون قص) */}
          <div className="audio-image-wrap">
            <img
              src={AdAwr}
              alt="البث الصوتي"
              className="audio-image"
              loading="lazy"
            />
          </div>

          {/* السطر بين الصورة والمشغّل */}
          <div className="between-note">
            <span className="note-text">البث المباشر الصوتي</span>
            <span className="arrow">⬇</span>
          </div>

          {/* البث الصوتي */}
          <div className="audio-player-wrap">
            <iframe
              src="https://www.alsolnet.com/stream/awraraaudio/"
              title="البث المباشر الصوتي"
              allow="autoplay; encrypted-media"
              allowFullScreen
              scrolling="no"
              frameBorder="0"
              className="audio-iframe"
            ></iframe>
          </div>
        </section>
      </div>
    </main>
  );
}
