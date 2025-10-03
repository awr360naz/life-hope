import React, { useEffect, useMemo, useRef, useState } from "react";
import "./OurPicks.css";
import { cleanYouTubeUrl, toYouTubeId, buildEmbedUrl } from "./youtube";

const LS_KEY = "ourPicks_cache_v10"; // تفريغ أي كاش قديم

/* ==== Helpers ==== */
function isDirectImage(url = "") {
  return /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(url);
}

/* ==== normalize ==== */
function normalize(it) {
  if (!it) return null;

  const shortIdFromLinks =
    toYouTubeId(it.shorts_link || "") ||
    toYouTubeId(it.short_image || "");

  const videoId =
    it._videoId ||
    toYouTubeId(it.video || "") ||
    toYouTubeId(it.video_url || "") ||
    toYouTubeId(it.url || "");

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

export default function OurPicks() {
  const [items, setItems] = useState([]);
  const [hadNetwork, setHadNetwork] = useState(false); // للمعلومة فقط
  const latestReqId = useRef(0); // لمنع السباقات

  // تحميل أوّلي من الكاش
  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
      if (Array.isArray(cached) && cached.length) {
        setItems(cached);
      }
    } catch {}
  }, []);

  // جلب من السيرفر مع SWR + منع السباقات + عدم مسح الكاش عند الفشل
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

          // مهم: لا نستبدل الكاش/الحالة إلا إذا في عناصر مفيدة
          if (sane.length) {
            setItems(sane);
            try { localStorage.setItem(LS_KEY, JSON.stringify(sane)); } catch {}
          } else {
            // رجع 0 عناصر: لا تمسح الكاش. اترك المعروض كما هو.
            // ممكن تسجّل فقط لأغراض الديباغ:
            // console.warn("our-picks: server returned 0 items; keeping cache");
          }
          setHadNetwork(true);
        } else {
          // رد غير متوقّع: لا تمسح الكاش
          // console.warn("our-picks: unexpected payload; keeping cache");
        }
      } catch (e) {
        // فشل الشبكة/السيرفر: نحتفظ بالكاش ولا نمسحه
        // console.warn("our-picks fetch failed, keeping cache", e);
      }
    })();

    return () => {
      aborted = true;
      controller.abort();
    };
  }, []);

  const normalized = useMemo(() => items.map(normalize).filter(Boolean), [items]);

  // اختر أول عنصر صالح لكل بطاقة
  const short =
    normalized.find((i) => i._shortId || i.shorts_link || i.short_image) || null;

  const vid = normalized.find((i) => i._videoId) || null;

  // للصورة: اسمح باستخدام image أو _imageLinkClean (كـ src) + الرابط الخارجي _imageLinkClean كـ href
  const img =
    normalized.find((i) => i.image || i._imageLinkClean) || null;

  // ID للشورت من أي مصدر (أولوية: shorts_link)
 // كان: (toYouTubeId(short.shorts_link) || toYouTubeId(short.short_image) || short._shortId)
// خليه يعتمد على _shortId أولًا (اللي الباك يضمنه حسب الأولوية)
const shortId =
  (short && (short._shortId || toYouTubeId(short.shorts_link || "") || toYouTubeId(short.short_image || ""))) || "";


  // src للصورة (نعرِض image إن وجِدت؛ وإلا نحاول _imageLinkClean إذا كان مباشرة صورة)
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
                <div className="ourpicks-iframe-wrap">
                  <iframe
                    key={`short-${shortId}`} // يضمن إعادة التركيب لو تغيّر الـ id
                    src={buildEmbedUrl(shortId)}
                    title={short?.title || "YouTube Short"}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
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
              {vid?._videoId ? (
                <iframe
                  key={`vid-${vid._videoId}`}
                  src={buildEmbedUrl(vid._videoId)}
                  title={vid?.title || "YouTube video"}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
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
