import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

function toYouTubeId(urlOrId = "") {
  const raw = String(urlOrId || "").trim();

  if (!raw) return "";

  if (/^[a-zA-Z0-9_-]{10,15}$/.test(raw)) {
    return raw;
  }

  try {
    const url = new URL(raw);

    if (url.hostname.includes("youtu.be")) {
      return url.pathname.split("/")[1] || "";
    }

    if (url.pathname.startsWith("/shorts/")) {
      return url.pathname.split("/")[2] || "";
    }

    if (url.pathname.startsWith("/embed/")) {
      return url.pathname.split("/")[2] || "";
    }

    return url.searchParams.get("v") || "";
  } catch {
    const match = raw.match(
      /[?&]v=([^&#]+)|youtu\.be\/([^?#/]+)|shorts\/([^?#/]+)|embed\/([^?#/]+)/
    );

    return match
      ? match[1] || match[2] || match[3] || match[4] || ""
      : "";
  }
}

function getTypeLabel(type) {
  switch (type) {
    case "article":
      return "مقال";

    case "program":
      return "برامجنا";

    case "short":
      return "مقاطع قصيرة";

    case "cami":
      return "نبوّات كامي";

    case "video":
      return "فيديو";

    case "quiz":
      return "اختبار";

    case "sabbath-lesson":
      return "درس السبت";

    case "sabbath-week":
      return "أسبوع من دروس السبت";

    case "sabbath-item":
      return "موضوع من دروس السبت";

    case "page":
      return "صفحة";

    default:
      return "";
  }
}

function buildUrl(item) {
  if (item?.url) {
    return item.url;
  }

  switch (item?.type) {
    case "article":
      return item.slug
        ? `/articles/${item.slug}`
        : "/articles";

    case "program":
      return item.slug
        ? `/programs/${item.slug}`
        : "/programs";

    case "short":
      return item.id
        ? `/shorts?focus=${item.id}`
        : "/shorts";

    case "cami":
      return item.id
        ? `/cami-prophecies?video=${item.id}`
        : "/cami-prophecies";

    case "quiz":
      return item.slug
        ? `/quiz/${item.slug}`
        : "/quiz";

    case "sabbath-lesson":
      return item.slug
        ? `/sabbath-lessons/${item.slug}`
        : "/sabbath-lessons";

    case "sabbath-week":
      return item.slug
        ? `/sabbath-weeks/${item.slug}`
        : "/sabbath-lessons";

    case "sabbath-item":
      return item.slug
        ? `/sabbath-items/${item.slug}`
        : "/sabbath-lessons";

    default:
      return "/";
  }
}

function getThumbSrc(item) {
  if (item?.cover_url) {
    return item.cover_url;
  }

  const raw =
    item?.youtube_id ||
    item?._ytid ||
    item?.youtube_url ||
    item?.video_url ||
    item?.short_url ||
    "";

  const youtubeId = toYouTubeId(raw);

  if (youtubeId) {
    return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
  }

  return null;
}

export default function SearchPage() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  const navigate = useNavigate();

  const termFromUrl = (
    searchParams.get("q") || ""
  ).trim();

  const [q, setQ] = useState(termFromUrl);
  const [searchedTerm, setSearchedTerm] =
    useState(termFromUrl);

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");

  const [inputFocused, setInputFocused] =
    useState(false);

  const inputWrapperRef = useRef(null);

  useEffect(() => {
    setQ(termFromUrl);
    setSearchedTerm(termFromUrl);
  }, [termFromUrl]);

  /**
   * البحث التلقائي بعد 300ms من توقف الكتابة.
   */
  useEffect(() => {
    const value = q.trim();

    if (!value) {
      setResults([]);
      setSearchedTerm("");
      setLoading(false);
      setErrorMessage("");

      setSearchParams({}, { replace: true });

      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(
            value
          )}&limit=50`,
          {
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("فشل البحث");
        }

        const json = await response.json();

        setResults(
          Array.isArray(json) ? json : []
        );

        setSearchedTerm(value);

        /**
         * نحدث الرابط بدون إضافة history جديدة
         * مع كل حرف.
         */
        setSearchParams(
          { q: value },
          { replace: true }
        );
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        setErrorMessage(
          error?.message || "فشل البحث"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [q, setSearchParams]);

  /**
   * إغلاق الاقتراحات عند الضغط خارج مربع البحث.
   */
  useEffect(() => {
    function onDocumentMouseDown(event) {
      if (
        inputWrapperRef.current &&
        !inputWrapperRef.current.contains(
          event.target
        )
      ) {
        setInputFocused(false);
      }
    }

    document.addEventListener(
      "mousedown",
      onDocumentMouseDown
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        onDocumentMouseDown
      );
    };
  }, []);

  const suggestions = useMemo(
    () => results.slice(0, 8),
    [results]
  );

  const showSuggestions =
    inputFocused &&
    q.trim().length > 0 &&
    (loading || suggestions.length > 0);

  function onSubmit(event) {
    event.preventDefault();

    const value = q.trim();

    if (!value) {
      setSearchParams({});
      setResults([]);
      return;
    }

    setInputFocused(false);

    setSearchParams({ q: value });

    /**
     * إبقاء المستخدم في صفحة البحث.
     */
    navigate(
      `/search?q=${encodeURIComponent(value)}`
    );
  }

  function openSuggestion(item) {
    setInputFocused(false);

    navigate(buildUrl(item));
  }

  return (
    <div
      className="search-page"
      dir="rtl"
      style={{
        padding: 16,
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      <h1 style={{ marginBottom: 12 }}>
        بحث
      </h1>

      <div
        ref={inputWrapperRef}
        style={{
          position: "relative",
          marginBottom: 16,
          zIndex: 20,
        }}
      >
        <form
          onSubmit={onSubmit}
          style={{
            display: "flex",
            gap: 8,
          }}
        >
          <input
            value={q}
            onChange={(event) =>
              setQ(event.target.value)
            }
            onFocus={() =>
              setInputFocused(true)
            }
            placeholder="اكتب كلمة البحث…"
            autoComplete="off"
            style={{
              flex: 1,
              minWidth: 0,
              padding: "11px 12px",
              borderRadius: 8,
              border: "1px solid #ddd",
              outline: "none",
              fontSize: 16,
            }}
          />

          <button
            type="submit"
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              background: "#3b82f6",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: 16 }}>
              🔍
            </span>

            <span>ابحث</span>
          </button>
        </form>

        {showSuggestions && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              left: 0,
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              background: "#fff",
              boxShadow:
                "0 12px 30px rgba(0,0,0,0.12)",
              overflow: "hidden",
              maxHeight: 430,
              overflowY: "auto",
            }}
          >
            {loading && (
              <div
                style={{
                  padding: 14,
                  color: "#666",
                }}
              >
                جاري البحث…
              </div>
            )}

            {!loading &&
              suggestions.map((item) => {
                const title =
                  item.title || "";

                const label =
                  item.category ||
                  getTypeLabel(item.type);

                const thumbSrc =
                  getThumbSrc(item);

                return (
                  <button
                    type="button"
                    key={`suggestion-${item.type}-${item.source}-${item.id}-${item.slug || ""}`}
                    onClick={() =>
                      openSuggestion(item)
                    }
                    style={{
                      width: "100%",
                      border: "none",
                      borderBottom:
                        "1px solid #f1f1f1",
                      background: "#fff",
                      padding: 10,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      textAlign: "right",
                    }}
                  >
              <div
  style={{
    width: 64,
    minHeight: 45,
    maxHeight: 75,
    borderRadius: 7,
    overflow: "hidden",
    flexShrink: 0,
    background: "#f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}
>
                      {thumbSrc ? (
                        <img
                          src={thumbSrc}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit:
                              "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "grid",
                            placeItems:
                              "center",
                            fontSize: 19,
                          }}
                        >
                          🔎
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          overflow: "hidden",
                          textOverflow:
                            "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {title}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.65,
                          marginTop: 3,
                        }}
                      >
                        {label}
                      </div>
                    </div>
                  </button>
                );
              })}

            {!loading &&
              q.trim() &&
              suggestions.length === 0 && (
                <div
                  style={{
                    padding: 14,
                    color: "#666",
                  }}
                >
                  لا توجد اقتراحات.
                </div>
              )}
          </div>
        )}
      </div>

      {loading && (
        <div style={{ marginBottom: 12 }}>
          جاري التحميل…
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            color: "crimson",
            marginBottom: 12,
          }}
        >
          خطأ: {errorMessage}
        </div>
      )}

      {!loading &&
        !errorMessage &&
        searchedTerm &&
        results.length === 0 && (
          <div style={{ marginBottom: 12 }}>
            لا توجد نتائج لـ “
            {searchedTerm}”. جرّب جزءًا من
            الكلمة أو كلمة من العنوان.
          </div>
        )}

      {!errorMessage && (
        <>
          {searchedTerm && (
            <div
              style={{
                marginBottom: 8,
              }}
            >
              النتائج: {results.length}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 12,
            }}
          >
            {results.map((item) => {
              const to = buildUrl(item);

              const label =
                item.category ||
                getTypeLabel(item.type);

              const title =
                item.title || "";

              const thumbSrc =
                getThumbSrc(item);

              return (
                <Link
                  key={`${item.type}-${item.source}-${item.id}-${item.slug || ""}`}
                  to={to}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <article
                    style={{
                      height: "100%",
                      border:
                        "1px solid #eee",
                      borderRadius: 12,
                      overflow: "hidden",
                      background: "#fff",
                      transition:
                        "transform 0.15s ease, box-shadow 0.15s ease",
                    }}
                  >
             <div
  style={{
    width: "100%",
    minHeight: 140,
    maxHeight: 360,
    overflow: "hidden",
    background: "#f7f7f7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}
>
  {thumbSrc ? (
    <img
      src={thumbSrc}
      alt={title}
      style={{
        width: "100%",
        height: "auto",
        maxHeight: 360,
        objectFit: "contain",
        display: "block",
      }}
      loading="lazy"
    />
  ) : (
    <span
      style={{
        fontSize: 32,
        opacity: 0.45,
      }}
    >
      🔎
    </span>
  )}
</div>

                    <div style={{ padding: 12 }}>
                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.7,
                          marginBottom: 4,
                        }}
                      >
                        {label}
                      </div>

                      <div
                        style={{
                          fontWeight: 700,
                          marginBottom: 4,
                          fontSize: 15,
                        }}
                      >
                        {title}
                      </div>

                      {item.snippet && (
                        <div
                          style={{
                            fontSize: 13,
                            lineHeight: 1.6,
                            opacity: 0.72,
                            display:
                              "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient:
                              "vertical",
                            overflow:
                              "hidden",
                          }}
                        >
                          {item.snippet}
                        </div>
                      )}
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}