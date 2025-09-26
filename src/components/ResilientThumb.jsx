import React, { useMemo, useState, useEffect } from "react";

function toYouTubeId(urlOrId = "") {
  if (!urlOrId) return "";
  if (/^[a-zA-Z0-9_-]{10,15}$/.test(urlOrId)) return urlOrId;
  try {
    const u = new URL(urlOrId);
    if (u.hostname.includes("youtu.be")) return u.pathname.split("/")[1] || "";
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || "";
    const v = u.searchParams.get("v");
    if (v) return v;
    const m = urlOrId.match(/[?&]v=([^&#]+)|youtu\.be\/([^?#/]+)|shorts\/([^?#/]+)/);
    return m ? (m[1] || m[2] || m[3]) : "";
  } catch {
    return "";
  }
}

export default function ResilientThumb({ item, className = "", alt = "" }) {
  const ytid = useMemo(
    () =>
      item.youtube_id ||
      toYouTubeId(item.youtube_url || item.url || item.video_url || item.short_url || ""),
    [item]
  );

  const candidates = useMemo(() => {
    if (!ytid) return [];
    return [
      `https://i.ytimg.com/vi_webp/${ytid}/maxresdefault.webp`,
      `https://i.ytimg.com/vi/${ytid}/maxresdefault.jpg`,
      `https://i.ytimg.com/vi_webp/${ytid}/hqdefault.webp`,
      `https://i.ytimg.com/vi/${ytid}/hqdefault.jpg`,
      `https://i.ytimg.com/vi/${ytid}/mqdefault.jpg`,
      `https://i.ytimg.com/vi/${ytid}/default.jpg`,
    ];
  }, [ytid]);

  const [idx, setIdx] = useState(0);
  const src = candidates[idx] || "";

  useEffect(() => setIdx(0), [candidates.join("|")]);

  if (!src) return <div className={`shortseg-fallback ${className}`} />;

  return (
    <img
      className={className}
      src={src}
      alt={alt || item.title || "فقرة قصيرة"}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setIdx((i) => (i + 1 < candidates.length ? i + 1 : i))}
    />
  );
}
function YouTubePicture({ ytid, alt }) {
  const base = `https://i.ytimg.com/vi/${ytid}`;
  const maxres = `${base}/maxresdefault.jpg`;
  const hq     = `${base}/hqdefault.jpg`;
  return (
    <picture>
      <source srcSet={`${maxres} 1080w, ${hq} 720w`} />
      <img src={hq} alt={alt} loading="lazy" decoding="async" />
    </picture>
  );
}
