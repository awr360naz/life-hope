import React from 'react';
import Header from '../components/Header';

export default function LivePage() {
  return (
    <>
       
 
      <div className="live-container">
        <div className="video-wrapper">
          <iframe
            width="100%"
            height="500"
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

