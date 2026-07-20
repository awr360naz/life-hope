import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import "./Header.css";
import { FiSearch } from "react-icons/fi";
import LiveButtonImg from "../components/livebutton.png";

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

function getThumbSrc(item) {
  if (item?.cover_url) {
    return item.cover_url;
  }

  const raw =
    item?.youtube_id ||
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

export default function Header() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showQuizMenu, setShowQuizMenu] = useState(false);
  const [ShowProgrmasMenu, setShowProgrmasMenu] =
    useState(false);

  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchError, setSearchError] = useState("");

  const searchWrapperRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  const suggestions = useMemo(
    () => searchResults.slice(0, 7),
    [searchResults]
  );

  const showSuggestions =
    searchFocused && query.trim().length > 0;

  /*
   * البحث التلقائي بعد التوقف عن الكتابة لمدة 300ms.
   */
  useEffect(() => {
    const value = query.trim();

    if (!value) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError("");
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(
            value
          )}&limit=10`,
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

        setSearchResults(
          Array.isArray(json) ? json : []
        );
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        setSearchError(
          error?.message || "فشل البحث"
        );

        setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  /*
   * إغلاق الاقتراحات عند الضغط خارج منطقة البحث.
   */
  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(
          event.target
        )
      ) {
        setSearchFocused(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  /*
   * إغلاق نتائج البحث بعد الانتقال لأي صفحة.
   */
  useEffect(() => {
    setSearchFocused(false);
  }, [location.pathname, location.search]);

  function handleSearchSubmit(event) {
    event.preventDefault();

    const value = query.trim();

    if (!value) return;

    setSearchFocused(false);

    navigate(
      `/search?q=${encodeURIComponent(value)}`
    );
  }

  function openSuggestion(item) {
    const url = buildUrl(item);

    setSearchFocused(false);
    setQuery("");
    setSearchResults([]);

    navigate(url);
  }

  function handleSearchKeyDown(event) {
    if (
      event.key === "Escape"
    ) {
      setSearchFocused(false);
      event.currentTarget.blur();
      return;
    }

    if (
      event.key === "ArrowDown" &&
      suggestions.length > 0
    ) {
      event.preventDefault();

      const firstButton =
        searchWrapperRef.current?.querySelector(
          ".header-search-suggestion"
        );

      firstButton?.focus();
    }
  }

  function handleSuggestionKeyDown(event, index) {
    if (event.key === "Escape") {
      setSearchFocused(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      const buttons =
        searchWrapperRef.current?.querySelectorAll(
          ".header-search-suggestion"
        );

      buttons?.[index + 1]?.focus();
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (index === 0) {
        searchWrapperRef.current
          ?.querySelector(".search-input")
          ?.focus();

        return;
      }

      const buttons =
        searchWrapperRef.current?.querySelectorAll(
          ".header-search-suggestion"
        );

      buttons?.[index - 1]?.focus();
    }
  }

  return (
    <header className="header" dir="rtl">
      <div className="header-inner">
        <button
          className={`hamburger ${
            open ? "is-open" : ""
          }`}
          aria-label="فتح القائمة"
          aria-expanded={open}
          onClick={() =>
            setOpen((value) => !value)
          }
        >
          <span />
          <span />
          <span />
        </button>

        <Link
          to="/"
          aria-label="الانتقال للصفحة الرئيسية"
          className="logo-link"
        >
          <img
            src="/Awr360logo.png"
            alt="AWR360 Logo"
            className="header-logo"
          />
        </Link>

        <nav
          className="main-nav"
          aria-label="روابط الموقع"
        >
          <Link
            to="/articles"
            className="nav-link"
          >
            مقالات
          </Link>

          <Link
            to="/programs"
            className="nav-link"
          >
            برامجنا
          </Link>

          <Link
            to="/about"
            className="nav-link"
          >
            قصتنا
          </Link>
        </nav>

        <Link
          to="/vedio-audio-live"
          className="live-btn"
          aria-label="البث المباشر"
        >
          <img
            src={LiveButtonImg}
            alt="البث المباشر"
          />
        </Link>

        <div className="spacer" />

        <div
          className="header-search-wrapper"
          ref={searchWrapperRef}
        >
          <form
            className="search"
            role="search"
            onSubmit={handleSearchSubmit}
            dir="ltr"
          >
            <FiSearch className="search-icon" />

            <input
              type="search"
              placeholder="Search"
              className="search-input"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              onFocus={() =>
                setSearchFocused(true)
              }
              onKeyDown={handleSearchKeyDown}
              aria-label="ابحث في الموقع"
              autoComplete="off"
            />

            <button
              type="submit"
              className="header-search-submit"
              aria-label="ابحث"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="black"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="8"
                />

                <line
                  x1="21"
                  y1="21"
                  x2="16.65"
                  y2="16.65"
                />
              </svg>
            </button>
          </form>

          {showSuggestions && (
            <div
              className="header-search-dropdown"
              dir="rtl"
            >
              {searchLoading && (
                <div className="header-search-message">
                  جاري البحث…
                </div>
              )}

              {!searchLoading &&
                searchError && (
                  <div className="header-search-message header-search-error">
                    تعذّر تنفيذ البحث.
                  </div>
                )}

              {!searchLoading &&
                !searchError &&
                suggestions.map(
                  (item, index) => {
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
                        className="header-search-suggestion"
                        key={`${item.type}-${item.source}-${item.id}-${item.slug || ""}`}
                        onClick={() =>
                          openSuggestion(item)
                        }
                        onKeyDown={(event) =>
                          handleSuggestionKeyDown(
                            event,
                            index
                          )
                        }
                      >
                        <div className="header-search-thumb">
                          {thumbSrc ? (
                            <img
                              src={thumbSrc}
                              alt=""
                            />
                          ) : (
                            <span>🔎</span>
                          )}
                        </div>

                        <div className="header-search-info">
                          <div className="header-search-title">
                            {title}
                          </div>

                          <div className="header-search-category">
                            {label}
                          </div>
                        </div>
                      </button>
                    );
                  }
                )}

              {!searchLoading &&
                !searchError &&
                suggestions.length === 0 && (
                  <div className="header-search-message">
                    لا توجد نتائج.
                  </div>
                )}

              {!searchLoading &&
                !searchError &&
                searchResults.length > 0 && (
                  <button
                    type="button"
                    className="header-search-all"
                    onClick={() => {
                      const value =
                        query.trim();

                      setSearchFocused(false);

                      navigate(
                        `/search?q=${encodeURIComponent(
                          value
                        )}`
                      );
                    }}
                  >
                    عرض كل النتائج
                  </button>
                )}
            </div>
          )}
        </div>
      </div>

      <div
        className={`drawer ${
          open ? "drawer--open" : ""
        }`}
        onClick={() => setOpen(false)}
      >
        <nav
          className="drawer-panel"
          onClick={(event) =>
            event.stopPropagation()
          }
        >
          <Link
            to="/"
            className="drawer-link"
            onClick={() => setOpen(false)}
          >
            الصفحه الرئيسية
          </Link>

          <Link
            to="/articles"
            className="drawer-link"
            onClick={() => setOpen(false)}
          >
            مقالات
          </Link>

          <Link
            to="/AngelsPage"
            className="drawer-link"
            onClick={() => setOpen(false)}
          >
            رسالة الملائكة الثلاث
          </Link>

          <Link
            to="/about"
            className="drawer-link"
            onClick={() => setOpen(false)}
          >
            قصتنا
          </Link>

          <Link
            to="/programs"
            className="drawer-link"
            onClick={() => setOpen(false)}
          >
            برامجنا
          </Link>

          <div
            className="drawer-link"
            style={{ cursor: "pointer" }}
            onClick={() =>
              setShowQuizMenu(
                (value) => !value
              )
            }
          >
            اختبر معلوماتك
          </div>

          {showQuizMenu && (
            <div className="quiz-submenu">
              <Link
                to="/quizzes/christian"
                className="drawer-sub-item"
                onClick={() => {
                  setOpen(false);
                  setShowQuizMenu(false);
                }}
              >
                اختبارات مسيحية
              </Link>

              <Link
                to="/quizzes/health"
                className="drawer-sub-item"
                onClick={() => {
                  setOpen(false);
                  setShowQuizMenu(false);
                }}
              >
                اختبارات صحية
              </Link>
            </div>
          )}

          <Link
            to="/contact"
            className="drawer-link"
            onClick={() => setOpen(false)}
          >
            تواصل معنا
          </Link>

          <Link
            to="/prayer-request"
            className="drawer-link"
            onClick={() => setOpen(false)}
          >
            اطلب صلاة
          </Link>

          <Link
            to="/ManagerSpeech"
            className="drawer-link"
            onClick={() => setOpen(false)}
          >
            كلمة المدير
          </Link>

          <Link
            to="/sabbath-lessons"
            className="drawer-link"
            onClick={() => setOpen(false)}
          >
            دروس السبت
          </Link>

          <Link
            to="/live"
            className="drawer-live"
            onClick={() => setOpen(false)}
          >
            البث المباشر
          </Link>

          <Link
            to="/AudioLive"
            className="drawer-live"
            onClick={() => setOpen(false)}
          >
            البث المباشر الصوتي
          </Link>
        </nav>
      </div>
    </header>
  );
}