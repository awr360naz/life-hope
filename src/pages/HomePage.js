import React from 'react';
import Header from '../components/Header';

import './HomePage.css';

export default function HomePage() {
  return (
    <>
      
      

      <div className="live-layout-container">
        <h2 className="live-title">البث المباشر</h2>
        <div className="live-video-wrapper">
          <iframe
            src="https://closeradio.tv/awrara/"
            width={565}
            height={321}
            title="البث المباشر"
            allow="accelerometer; autoplay;  encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            
          />
          <div className="live-border"></div>
           
        </div>
      </div>
    </>
  );
}
