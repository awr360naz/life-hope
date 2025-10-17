import React, { useEffect, useRef, useState } from "react";
import { toYouTubeIdSafe } from "../utils/toYouTubeIdSafe";

let ytApiLoading = null;

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
  autoplay = false,
}) {
  const videoId = toYouTubeIdSafe(
    item?._videoId || item?.video || item?.video_url || item?.url || item?._ytid || ""
  );
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [phase, setPhase] = useState("try-nocookie");
  const [thumbUrl] = useState(() =>
    videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ""
  );
  const redirectUrl = videoId ? `https://youtu.be/${videoId}` : null;

  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    let timer1 = null;

    (async () => {
      await loadYouTubeAPI();
      if (cancelled) return;

      const buildPlayer = (host) => {
        if (!containerRef.current) return;
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
          },
          host,
          events: {
            onReady: () => {
              if (cancelled) return;
              clearTimeout(timer1);
              setPhase("ready");
              if (autoplay) {
                try { playerRef.current?.playVideo?.(); } catch {}
              }
            },
            onError: () => {
              if (phase === "try-nocookie") {
                setPhase("try-regular");
              } else {
                setPhase("redirect");
              }
            },
          },
        });
      };

      setPhase("try-nocookie");
      buildPlayer("https://www.youtube-nocookie.com");

      // مهلة أطول قبل التجربة الثانية
      timer1 = setTimeout(() => {
        if (cancelled || phase !== "try-nocookie") return;
        setPhase("try-regular");
      }, 6000);
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer1);
      try { playerRef.current?.destroy?.(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

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
              try { playerRef.current?.playVideo?.(); } catch {}
            }
          },
          onError: () => {
            setPhase("redirect");
          },
        },
      });
    };

    build();

    // مهلة أطول قبل التحويل الخارجي
    timer = setTimeout(() => {
      if (!cancelled && phase === "try-regular") {
        setPhase("redirect");
      }
    }, 4000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, videoId]);

  useEffect(() => {
    if (phase !== "redirect" || !redirectUrl) return;
    try { window.open(redirectUrl, "_blank", "noopener,noreferrer"); } catch {}
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
