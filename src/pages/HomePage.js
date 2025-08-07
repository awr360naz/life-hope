import React from 'react';
import Header from '../components/Header';
import './HomePage.css'; // تأكد أنك أنشأت هذا الملف

export default function HomePage() {
  return (
    <>
      <Header />

      <div className="live-layout-container">
        <div className="live-title">البث المباشر</div>

        <div className="live-video-wrapper">
          <iframe
            width="100%"
            height="100%"
            src="https://closeradio.tv/awrara/"
            title="Radio Live Stream"
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </>
  );
}
