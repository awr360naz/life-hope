import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./GifNotice.css";

export default function GifNotice({
  gifSrc = "/assets/angel.gif",
  text = "....ثُمَّ رَأَيْتُ مَلاَكًا آخَرَ طَائِرًا فِي وَسَطِ السَّمَاءِ مَعَهُ بِشَارَةٌ أَبَدِيَّةٌ",
  viewAllHref = "/gif-highlight",
  delayMs = 2000,
  durationMs = 10000,
}) {
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

  if (!show) return null;

  return (
    <div className="gifnotice-overlay" role="dialog" aria-modal="true" aria-label="ملاحظة ترحيبية">
      <div className="gifnotice-card" onClick={(e) => e.stopPropagation()}>
        <button className="gifnotice-close" type="button" aria-label="إغلاق" onClick={() => setShow(false)}>
          ×
        </button>

        <div className="gifnotice-media">
          {!imgError ? (
            <img
              src={gifSrc}
              alt="لقطة ترحيبية"
              onError={() => setImgError(true)}
              // لا تستخدم lazy للـ GIF داخل Overlay
            />
          ) : (
            <div className="gifnotice-fallback">تعذّر تحميل الصورة</div>
          )}
        </div>

        <div className="gifnotice-text">{text}</div>

        <div className="gifnotice-actions">
          <Link className="gifnotice-viewall" to={viewAllHref} onClick={() => setShow(false)}>
           للمزيد
          </Link>
        </div>
      </div>

      <button className="gifnotice-backdrop" aria-label="إغلاق" onClick={() => setShow(false)} />
    </div>
  );
}
