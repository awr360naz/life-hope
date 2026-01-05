import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./GifNotice.css";

export default function GifNotice({
  gifSrc = "/assets/angel.gif",
  text = "",
  viewAllHref = "/gif-highlight",
  delayMs = 0,
  durationMs = 8000,
}) {
  const videoRef = useRef(null);
  const isVideo =
    typeof gifSrc === "string" &&
    /\.(mp4|webm|ogg)(\?.*)?$/i.test(gifSrc);

  const [show, setShow] = useState(false);
  const [imgError, setImgError] = useState(false);
  const hideTimerRef = useRef(null);
  const delayTimerRef = useRef(null);

  useEffect(() => {
    delayTimerRef.current = setTimeout(() => {
      setShow(true);
      hideTimerRef.current = setTimeout(() => setShow(false), durationMs);
    }, delayMs);

    const onKey = (e) => e.key === "Escape" && setShow(false);
    window.addEventListener("keydown", onKey);

    return () => {
      clearTimeout(delayTimerRef.current);
      clearTimeout(hideTimerRef.current);
      window.removeEventListener("keydown", onKey);
    };
  }, [delayMs, durationMs]);


  useEffect(() => {
    if (show && isVideo && videoRef.current) {
      try {
        videoRef.current.play().catch(() => {});
      } catch (_) {}
    }
  }, [show, isVideo]);

  if (!show) return null;

  return (
    <div className="gifnotice-overlay" role="dialog" aria-modal="true" aria-label="ملاحظة ترحيبية" onClick={() => setShow(false)}>
      <div className="gifnotice-card" onClick={(e) => e.stopPropagation()}>
        <button className="gifnotice-close" type="button" aria-label="إغلاق" onClick={() => setShow(false)}>
          ×
        </button>

        <div className="gifnotice-media">
          {!imgError ? (
            isVideo ? (
              <video
                ref={videoRef}
                src={gifSrc}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                onError={() => setImgError(true)}
              />
            ) : (
              <img
                src={gifSrc}
                alt="لقطة ترحيبية"
                onError={() => setImgError(true)}
              />
            )
          ) : (
            <div className="gifnotice-fallback">تعذّر تحميل الوسائط</div>
          )}
        </div>

        <div className="gifnotice-text">{text}</div>

        <div className="gifnotice-actions">
        {
          <Link
            className="gifnotice-viewall"
            to="/AngelsPage"
            onClick={() => setShow(false)}
          >
            للمزيد
          </Link>
          }
        </div>
 
      </div>

      <button className="gifnotice-backdrop" aria-label="إغلاق" onClick={() => setShow(false)} />
    </div>
  );
}
