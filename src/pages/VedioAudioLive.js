import React from "react";
import "./VedioAudioLive.css";

const VIDEO_SRC = "https://closeradio.tv/awrara/";
const AUDIO_SRC = "http://www.alsolnet.com/stream/awraraaudio/";

export default function VedioAudioLive() {
  return (
    <main className="va-page" dir="rtl">
      

      <div className="va-grid">
        {/* إطار البث المرئي */}
        <section className="va-frame" aria-labelledby="va-video-title">
          <header className="va-frame-title" id="va-video-title">البث المرئي</header>
          <div className="va-frame-body">
            <div className="va-player-16x9">
              <iframe
                src={VIDEO_SRC}
                title="Live Video"
                loading="lazy"
                allow=" encrypted-media"
                frameBorder="0"
                scrolling="no"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </section>

       
{/* إطار البث الصوتي */}
<section className="va-frame va-audio-frame" aria-labelledby="va-audio-title">
  <header className="va-frame-title" id="va-audio-title">البث الصوتي</header>
  <div className="va-frame-body va-audio-block">
    {/* صورة */}
    <img src={require("./AdAwr.jpg")} alt="Ad AWR" className="va-audio-img" />

    {/* النص مع السهم */}
    <div className="va-audio-heading">
      <span>البث المباشر الصوتي</span>
      <span className="arrow-down">⬇</span>
    </div>

    {/* iframe للبث الصوتي */}
    <div className="va-player-16x9 va-audio-player">
      <iframe
        width="100%"
        height="100%"
        src="https://www.alsolnet.com/stream/awraraaudio/"
        title="Radio Audio Stream"
        frameBorder="0"
        allow=" encrypted-media"
        allowFullScreen
      ></iframe>
    </div>
  </div>
</section>




      </div>
    </main>
  );
}
