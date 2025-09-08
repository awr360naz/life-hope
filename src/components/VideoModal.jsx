import React, { useEffect, useRef } from "react";
import "./ShortSegmentsCarousel.css";

export default function VideoModal({ open, title, videoUrl, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isMP4 = /\.mp4($|\?)/i.test(videoUrl);

  return (
    <div className="ss-modal-backdrop" onClick={onClose}>
      <div className="ss-modal" onClick={(e)=>e.stopPropagation()} ref={ref}>
        <header>
          <h3>{title || "فيديو قصير"}</h3>
          <button className="close-btn" aria-label="اغلاق" onClick={onClose}>✕</button>
        </header>

        {isMP4 ? (
          <video src={videoUrl} controls autoPlay playsInline />
        ) : (
          <iframe
            src={videoUrl}
            title={title || "Short Video"}
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        )}
      </div>
    </div>
  );
}
