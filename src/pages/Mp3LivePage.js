// src/pages/Mp3LivePage.jsx
import React from "react";

export default function Mp3LivePage() {
  return (
    <div className="live-container">
        <div className="video-wrapper">
          <iframe
            width="100%"
            height="500"
            src="http://www.alsolnet.com/stream/awraraaudio/"
            title="Radio Live Stream"
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen
          ></iframe>
        </div>
      </div>
  );
}
