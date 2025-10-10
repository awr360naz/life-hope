import React, { useEffect, useMemo, useRef, useState } from "react";
import "./OurPicks.css";
import { cleanYouTubeUrl } from "./youtube";

const LS_KEY = "ourPicks_cache_v10";

// ========== YouTube helpers (safe) ==========
function toYouTubeIdSafe(idOrUrl = "") {
  if (!idOrUrl) return "";
  idOrUrl = String(idOrUrl).trim()
    .replace(/^<|>$/g, "")
    .replace(/&si=[^&]+/g, "")
    .replace(/&pp=[^&]+/g, "")
    .replace(/[?&]feature=share/g, "");

  if (/^[a-zA-Z0-9_-]{10,15}$/.test(idOrUrl)) return idOrUrl;

  try {
    const u = new URL(idOrUrl);
    if (u.hostname.includes("youtu.be")) return (u.pathname.split("/")[1] || "").trim();
    if (u.pathname.startsWith("/shorts/")) return (u.pathname.split("/")[2] || "").trim();
    return (u.searchParams.get("v") || "").trim();
  } catch {
    const m = idOrUrl.match(/[?&]v=([^&#]+)|youtu\.be\/([^?#/]+)|shorts\/([^?#/]+)/);
    return m ? (m[1] || m[2] || m[3]) : "";
  }
}


function buildEmbedUrlSafe(idOrUrl, { autoplay = true } = {}) {
  const id = toYouTubeIdSafe(idOrUrl);
  if (!id) return "";
  const base = `https://www.youtube.com/embed/${id}`;
  let origin = "";
  try { origin = encodeURIComponent(window.location.origin); } catch {}
  const common = `playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&fs=1${origin ? `&origin=${origin}` : ""}`;
  const auto = autoplay ? `&autoplay=1` : "";
  return `${base}?${common}${auto}`;
}

function isDirectImage(url = "") {
  return /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(url);
}

/* ==== normalize ==== */
function normalize(it) {
  if (!it) return null;

  const shortIdFromLinks =
    toYouTubeIdSafe(it.shorts_link || "") ||
    toYouTubeIdSafe(it.short_image || "");

  const videoId =
    it._videoId ||
    toYouTubeIdSafe(it.video || "") ||
    toYouTubeIdSafe(it.video_url || "") ||
    toYouTubeIdSafe(it.url || "");

  const directShortImg = isDirectImage(it.short_image || "") ? it.short_image : "";

  const cleanImgLink =
    it._imageLinkClean || cleanYouTubeUrl(it.image_link || it.link || "");

  return {
    ...it,
    _shortId: shortIdFromLinks || it._shortId || "",
    _videoId: videoId || "",
    _shortImg: directShortImg,
    _imageLinkClean: cleanImgLink || "",
  };
}
function InlineYtEmbed({ idOrUrl, title = "YouTube" }) {
  const id = toYouTubeIdSafe(idOrUrl);
  const [stage, setStage] = React.useState("thumb"); // thumb | try1 | try2 | loaded | fallback
  const timerRef = React.useRef(null);

  const src = React.useMemo(() => {
    if (!id) return "";
    if (stage === "try1" || stage === "loaded") {
      return `https://www.youtube.com/embed/${id}?playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&fs=1&autoplay=1`;
    }
    if (stage === "try2") {
      return `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&fs=1&autoplay=1`;
    }
    return "";
  }, [id, stage]);

  // إدارة المهلات لكل محاولة
  React.useEffect(() => {
    if (stage === "try1" || stage === "try2") {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        // ما وصل onLoad → انتقل للمرحلة التالية
        if (stage === "try1") setStage("try2");
        else if (stage === "try2") setStage("fallback");
      }, 2800); // زوّدها لو بدك
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [stage]);

  if (!id) {
    return <div className="ourpicks-empty">لا يوجد فيديو</div>;
  }

  if (stage === "thumb" || stage === "fallback") {
    // غلاف + أزرار
    return (
      <div className="ourpicks-iframe-wrap">
        <button
          type="button"
          className="ourpicks-thumbbtn"
          onClick={() => setStage("try1")}
          aria-label={`تشغيل ${title}`}
        >
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt={title} />
          <span className="ourpicks-play">▶</span>
        </button>

        {stage === "fallback" && (
          <div className="ourpicks-fallback">
            <a
              className="ourpicks-open"
              href={`https://www.youtube.com/watch?v=${id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              فتح على يوتيوب
            </a>
            <button
              type="button"
              className="ourpicks-retry"
              onClick={() => setStage("try1")}
            >
              إعادة المحاولة
            </button>
          </div>
        )}
      </div>
    );
  }

  // try1 / try2 / loaded → iframe
  return (
    <div className="ourpicks-iframe-wrap">
      <iframe
        key={`${id}-${stage}`}            // إعادة تركيب عند تغيير المرحلة
        src={src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        playsInline
        onLoad={() => {
          // نجاح التحميل → ثبّت على loaded
          setStage("loaded");
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
        }}
      />
    </div>
  );
}
function ImageWithFallback({ id, alt, className, style }) {
  // ترتيب المرشحين (من أعلى جودة لأضمن تواجد):
  const candidates = [
    `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${id}/hq720.jpg`,
    `https://i.ytimg.com/vi/${id}/sddefault.jpg`,
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    `https://i.ytimg.com/vi/${id}/default.jpg`,
  ];

  const [idx, setIdx] = React.useState(0);
  const [src, setSrc] = React.useState(candidates[0]);

  React.useEffect(() => {
    setIdx(0);
    setSrc(candidates[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleError = () => {
    if (idx < candidates.length - 1) {
      const next = idx + 1;
      setIdx(next);
      setSrc(candidates[next]);
    }
  };

  const handleLoad = (e) => {
    const w = e.currentTarget.naturalWidth;
    const h = e.currentTarget.naturalHeight;
    // ثَمب الرمادية غالبًا 120×90 أو صغيرة جدًا
    if ((w && w <= 200) || (h && h <= 120)) {
      handleError(); // اعتبرها غير صالحة وجرب التالي
    }
  };

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={handleError}
      onLoad={handleLoad}
      loading="eager"
      decoding="async"
    />
  );
}

function InlineYtEmbedOneShot({ idOrUrl, title = "YouTube", thumbSrc }) {
  const id = toYouTubeIdSafe(idOrUrl);
  const [active, setActive] = React.useState(false);
  const [src, setSrc] = React.useState("");
  const timerRef = React.useRef(null);

  const handleClick = () => {
    if (!id) return;
    setActive(true);
    const origin = (() => { try { return `&origin=${encodeURIComponent(window.location.origin)}` } catch { return "" } })();
    // أضف mute=1 + controls=1
    const url = `https://www.youtube.com/embed/${id}?playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&fs=1&controls=1&autoplay=1&mute=1${origin}`;
    setSrc(url);

    // لو ما ظهر خلال 3200ms افتح تبويب خارجي وارجع للصورة
    timerRef.current = setTimeout(() => {
      try { window.open(`https://www.youtube.com/watch?v=${id}`, "_blank", "noopener,noreferrer"); } catch {}
      setActive(false);
      setSrc("");
    }, 3200);
  };

  React.useEffect(() => () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  return (
    <div className="ourpicks-iframe-wrap">
      {!active ? (
        <button type="button" className="ourpicks-thumbbtn" onClick={handleClick} aria-label={`تشغيل ${title}`}>
        {thumbSrc ? (
  <img
    src={thumbSrc}
    alt={title}
    style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
  />
) : (
  <ImageWithFallback
    id={id}
    alt={title}
    style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
  />
)}

        </button>
      ) : (
        <iframe
          key={id}
          src={src}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          playsInline
          onLoad={() => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } }}
        />
      )}
    </div>
  );
}

function InlineYtEmbedVideoFirst({ idOrUrl, title = "YouTube", thumbSrc, autoplay = true }) {
  const id = toYouTubeIdSafe(idOrUrl);
  const [mode, setMode] = React.useState("video"); // video | thumb
  const [src, setSrc] = React.useState("");
  const loadRef = React.useRef({ loaded: false, timer: null });

  React.useEffect(() => {
    if (!id) return;
    loadRef.current.loaded = false;
    setMode("video");

    const origin = (() => { try { return `&origin=${encodeURIComponent(window.location.origin)}` } catch { return "" } })();
    const auto = `&autoplay=${autoplay ? 1 : 0}`;
    const mute = autoplay ? `&mute=1` : ""; // نكتم فقط لو autoplay=1 لتفادي حظر المتصفح
    const u = `https://www.youtube.com/embed/${id}?playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&fs=1&controls=1${auto}${mute}${origin}`;
    setSrc(u);

    // إن كنت عامل التحويل التلقائي للصورة بعد مهلة، اترك التايمر كما هو
    // أو احذفه إن ما بدك fallback
    if (loadRef.current.timer) clearTimeout(loadRef.current.timer);
    loadRef.current.timer = setTimeout(() => {
      if (!loadRef.current.loaded) setMode("thumb");
    }, 2500);

    return () => {
      if (loadRef.current.timer) { clearTimeout(loadRef.current.timer); loadRef.current.timer = null; }
    };
  }, [id, autoplay]);

  const onIframeLoad = () => {
    loadRef.current.loaded = true;
    if (loadRef.current.timer) { clearTimeout(loadRef.current.timer); loadRef.current.timer = null; }
  };

  const openOnYouTube = () => {
    try { window.open(`https://www.youtube.com/watch?v=${id}`, "_blank", "noopener,noreferrer"); } catch {}
  };

  return (
    <div className="ourpicks-iframe-wrap">
      {mode === "video" ? (
        <iframe
          key={id}
          src={src}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          playsInline
          onLoad={onIframeLoad}
        />
      ) : (
        <button type="button" className="ourpicks-thumbbtn" onClick={openOnYouTube} aria-label={`فتح ${title} على يوتيوب`}>
          {thumbSrc ? (
            <img src={thumbSrc} alt={title} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
          ) : (
            <ImageWithFallback id={id} alt={title} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
          )}
        </button>
      )}
    </div>
  );
}

 

export default function OurPicks() {
  const [items, setItems] = useState([]);
  const [hadNetwork, setHadNetwork] = useState(false);
  const latestReqId = useRef(0);

  // تحميل أولي من الكاش
  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
      if (Array.isArray(cached) && cached.length) {
        setItems(cached);
      }
    } catch {}
  }, []);

  // جلب من السيرفر
  useEffect(() => {
    let aborted = false;
    const controller = new AbortController();
    const reqId = ++latestReqId.current;

    (async () => {
      try {
        const cb = Date.now();
        const res = await fetch(`/api/content/our-picks?_cb=${cb}`, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        if (aborted || reqId !== latestReqId.current) return;

        if (data?.ok && Array.isArray(data.items)) {
          const sane = data.items.filter(
            (x) =>
              x?.shorts_link ||
              x?.short_image ||
              x?._shortId ||
              x?._videoId ||
              x?.image ||
              x?._imageLinkClean
          );

          if (sane.length) {
            setItems(sane);
            try { localStorage.setItem(LS_KEY, JSON.stringify(sane)); } catch {}
          }
          setHadNetwork(true);
        }
      } catch {
        // احتفظ بالكاش
      }
    })();

    return () => {
      aborted = true;
      controller.abort();
    };
  }, []);

  const normalized = useMemo(() => items.map(normalize).filter(Boolean), [items]);

  const short =
    normalized.find((i) => i._shortId || i.shorts_link || i.short_image) || null;
 const vid = normalized.find((i) => i._videoId || i.video || i.video_url || i.url) || null;
  
  const img = normalized.find((i) => i.image || i._imageLinkClean) || null;

  const shortId =
    (short && (short._shortId || toYouTubeIdSafe(short.shorts_link || "") || toYouTubeIdSafe(short.short_image || ""))) || "";
const vidId = toYouTubeIdSafe(
    (vid && (vid._videoId || vid.video || vid.video_url || vid.url)) || ""
  );
  // === self-heal hooks ===
const [shortKey, setShortKey] = useState(0);
const shortHealRef = useRef({ timer: null, loaded: false });

useEffect(() => {
  // reset flags لكل Short جديد
  shortHealRef.current.loaded = false;
  if (shortHealRef.current.timer) {
    clearTimeout(shortHealRef.current.timer);
    shortHealRef.current.timer = null;
  }
  // جرّب إعادة التركيب مرّة واحدة فقط بعد 2.2ث لو ما لوّد
  shortHealRef.current.timer = setTimeout(() => {
    if (!shortHealRef.current.loaded) {
      setShortKey((k) => k + 1);
    }
  }, 2200);

  return () => {
    if (shortHealRef.current.timer) {
      clearTimeout(shortHealRef.current.timer);
      shortHealRef.current.timer = null;
    }
  };
}, [shortId]);


  const [vidKey, setVidKey] = useState(0);
  const [vidDidLoad, setVidDidLoad] = useState(false);
  useEffect(() => {
    setVidDidLoad(false);
    const t = setTimeout(() => {
      if (!vidDidLoad) setVidKey((k) => k + 1);
    }, 2200);
    return () => clearTimeout(t);
  }, [vid?._videoId, vidDidLoad]);

  // === الصور ===
 const imageSrc =
  (img?.image && String(img.image)) ||
  (isDirectImage(img?._imageLinkClean || "") ? img?._imageLinkClean : "");


  const imageHref = img?._imageLinkClean || "#";

  return (
    <section className="our-picks" dir="rtl">
      <div className="our-picks__inner">
        <h2 className="our-picks__heading">اختياراتنا</h2>

        <div className="our-picks__grid">
          {/* الشورت */}
          <div
            className={`ourpicks-card ourpicks-card--short${shortId ? "" : " is-disabled"}`}
            role="group"
            aria-label={short?.title ? `الشورت: ${short.title}` : "الشورت"}
          >
        <div className="ourpicks-box">
  {shortId ? (
    <InlineYtEmbedVideoFirst
      idOrUrl={shortId}
      title={short?.title || "YouTube Short"}
      thumbSrc={short?._shortImg || ""}  
      autoplay={false}
    />
  ) : (
    <div className="ourpicks-empty">لا يوجد Short</div>
  )}
</div>



          </div>

          {/* الفيديو */}
          <div
            className={`ourpicks-card ourpicks-card--video${vid?._videoId ? "" : " is-disabled"}`}
            role="group"
            aria-label="فيديو"
          >
<div className="ourpicks-box">
  {vidId ? (
    <InlineYtEmbedVideoFirst
      idOrUrl={vidId}
      title={vid?.title || "YouTube video"}
      autoplay={false}
    />
  ) : (
    <div className="ourpicks-empty">لا يوجد فيديو</div>
  )}
</div>





          </div>

          {/* الصورة */}
          <a
            className={`ourpicks-card ourpicks-card--image${imageSrc ? "" : " is-disabled"}`}
            href={imageHref || "#"}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={img?.title ? `فتح: ${img.title}` : "فتح الرابط"}
          >
            <div className="ourpicks-box">
              {imageSrc ? (
                <img src={imageSrc} alt={img?.title || "Image"} loading="lazy" />
              ) : (
                <div className="ourpicks-empty">لا توجد صورة</div>
              )}
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
