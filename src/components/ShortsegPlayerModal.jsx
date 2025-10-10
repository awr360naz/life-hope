// components/ShortsegPlayerModal.jsx
import React, { useEffect, useRef, useState } from "react";
import { toYouTubeIdSafe } from "../utils/toYouTubeIdSafe";

let ytApiLoading = null; // لضمان تحميل سكربت YT مرّة واحدة

function loadYouTubeAPI() {
  if (window.YT?.Player) return Promise.resolve();
  if (ytApiLoading) return ytApiLoading;
  ytApiLoading = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    window.onYouTubeIframeAPIReady = () => resolve();
    document.head.appendChild(s);
  });
  return ytApiLoading;
}

export default function ShortsegPlayerModal({
  item,
  onClose,
  autoplay = false, // إذا بدّك تمنع التشغيل التلقائي خلّيها false
}) {
  const videoId = toYouTubeIdSafe(
    item?._videoId || item?.video || item?.video_url || item?.url || item?._ytid || ""
  );
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [phase, setPhase] = useState("try-nocookie"); // try-nocookie → try-regular → redirect
  const [thumbUrl] = useState(() =>
    videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ""
  );
  const redirectUrl = videoId ? `https://youtu.be/${videoId}` : null;

  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    let timer1 = null;
    let timer2 = null;

    (async () => {
      await loadYouTubeAPI();
      if (cancelled) return;

      const buildPlayer = (host) => {
        if (!containerRef.current) return;
        // نظّف القديم
        containerRef.current.innerHTML = "";
        const div = document.createElement("div");
        div.id = `yt-player-${videoId}-${host}`;
        containerRef.current.appendChild(div);

        playerRef.current = new window.YT.Player(div.id, {
          width: "100%",
          height: "100%",
          videoId,
          playerVars: {
            autoplay: autoplay ? 1 : 0,
            mute: autoplay ? 1 : 0,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            origin: window.location.origin,
            enablejsapi: 1,
            // للـ Shorts أو العادي؛ الواجهة نفسها
          },
          host,
          events: {
            onReady: () => {
              if (cancelled) return;
              // اعتبرناها نجح التحميل
              clearTimeout(timer1);
              clearTimeout(timer2);
              setPhase("ready");
              if (autoplay) {
                try {
                  playerRef.current?.playVideo?.();
                } catch {}
              }
            },
            onError: () => {
              // جرّب المرحلة التالية بسرعة
              if (phase === "try-nocookie") {
                setPhase("try-regular");
              } else {
                setPhase("redirect");
              }
            },
          },
        });
      };

      // 1) جرّب nocookie
      setPhase("try-nocookie");
      buildPlayer("https://www.youtube-nocookie.com");

      // إذا ما صار onReady خلال 3.5 ثواني → جرّب regular
      timer1 = setTimeout(() => {
        if (cancelled || phase !== "try-nocookie") return;
        setPhase("try-regular");
      }, 3500);
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer1);
      clearTimeout(timer2);
      try {
        playerRef.current?.destroy?.();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // مرحلة التجربة الثانية (youtube.com)
  useEffect(() => {
    if (!videoId) return;
    if (phase !== "try-regular") return;

    let cancelled = false;
    let timer = null;

    const build = () => {
      if (!window.YT?.Player) return;
      if (!containerRef.current) return;
      containerRef.current.innerHTML = "";
      const div = document.createElement("div");
      div.id = `yt-player-${videoId}-regular`;
      containerRef.current.appendChild(div);

      playerRef.current = new window.YT.Player(div.id, {
        width: "100%",
        height: "100%",
        videoId,
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          mute: autoplay ? 1 : 0,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin,
          enablejsapi: 1,
        },
        host: "https://www.youtube.com",
        events: {
          onReady: () => {
            if (cancelled) return;
            clearTimeout(timer);
            setPhase("ready");
            if (autoplay) {
              try {
                playerRef.current?.playVideo?.();
              } catch {}
            }
          },
          onError: () => {
            setPhase("redirect");
          },
        },
      });
    };

    build();

    // إذا ما جهز خلال 2.5 ثانية إضافية → حوِّل تلقائيًا
    timer = setTimeout(() => {
      if (!cancelled && phase === "try-regular") {
        setPhase("redirect");
      }
    }, 2500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, videoId]);

  // التحويل التلقائي
  useEffect(() => {
    if (phase !== "redirect" || !redirectUrl) return;
    // افتح في تبويب جديد وحط صورة كرابط احتياطي
    const w = window.open(redirectUrl, "_blank", "noopener,noreferrer");
    if (!w) {
      // لو المتصفح منع، بنخلّي المستخدم يكبس على الصورة
    }
  }, [phase, redirectUrl]);

  return (
    <div className="shortseg-modal">
      <div className="shortseg-modal-content">
        <button className="shortseg-close" onClick={onClose} aria-label="إغلاق">×</button>

        {(phase === "try-nocookie" || phase === "try-regular" || phase === "ready") && (
          <div className="shortseg-player-frame" ref={containerRef} />
        )}

        {phase === "redirect" && (
          <a
            className="shortseg-fallback-thumb"
            href={redirectUrl || "#"}
            target="_blank"
            rel="noreferrer"
            aria-label="افتح الفيديو على يوتيوب"
          >
            {thumbUrl ? <img src={thumbUrl} alt="YouTube thumbnail" /> : "افتح على يوتيوب"}
          </a>
        )}
      </div>
      <div className="shortseg-modal-backdrop" onClick={onClose} />
    </div>
  );
}
