  import React, { useState } from "react";
  import { Link, useNavigate } from "react-router-dom";
  import "./Header.css";
  import { FiSearch } from "react-icons/fi";
  import LiveButtonImg from "../components/livebutton.png";

  export default function Header() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const navigate = useNavigate();
    const [showQuizMenu, setShowQuizMenu] = useState(false);


    const handleSearchSubmit = (e) => {
      e.preventDefault();
      const q = query.trim();
      if (!q) return;
      navigate(`/search?q=${encodeURIComponent(q)}`);
    };

    return (
      <header className="header" dir="rtl">
        <div className="header-inner">
          {/* همبرغر */}
          <button
            className={`hamburger ${open ? "is-open" : ""}`}
            aria-label="فتح القائمة"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
<Link to="/" aria-label="الانتقال للصفحة الرئيسية" className="logo-link">
  <img
    src="/Awr360logo.png"
    alt="AWR360 Logo"
    className="header-logo"
    
  />

</Link>

          {/* الروابط */}
          <nav className="main-nav" aria-label="روابط الموقع">
            <Link to="/articles" className="nav-link">مقالات</Link>
            <Link to="/programs" className="nav-link">برامجنا</Link>
            <Link to="/about" className="nav-link">قصتنا</Link>

            
            
          </nav>

          {/* زر البث (صورة) */}
          <Link to="/vedio-audio-live" className="live-btn" aria-label="البث المباشر">
            <img src={LiveButtonImg} alt="البث المباشر" />
          </Link>

          {/* مسافة مرنة تدفع اليسار/الشمال */}
          <div className="spacer" />

          {/* البحث */}
          <form className="search" role="search" onSubmit={handleSearchSubmit} dir="ltr">
            <FiSearch className="search-icon" />
            <input
              type="search"
              placeholder="Search"
              className="search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="ابحث في الموقع"
            />
            <button
              type="submit"
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0
              }}
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
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </form>
        </div>


       
        <div className={`drawer ${open ? "drawer--open" : ""}`} onClick={() => setOpen(false)}>
          <nav className="drawer-panel" onClick={(e)=>e.stopPropagation()}>
            <Link to="/" className="drawer-link" onClick={()=>setOpen(false)}>الصفحه الرئيسية</Link>
            <Link to="/about" className="drawer-link" onClick={()=>setOpen(false)}>قصتنا</Link>
            <Link to="/articles" className="drawer-link" onClick={()=>setOpen(false)}>مقالات</Link>
            <Link to="/programs" className="drawer-link" onClick={()=>setOpen(false)}>برامجنا</Link>
            <Link to="/AngelsPage" className="drawer-link" onClick={()=>setOpen(false)}>رسالة الملائكة الثلاث</Link>      

<div
  className="drawer-link"
  style={{ cursor: "pointer" }}
  onClick={() => setShowQuizMenu((v) => !v)}
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



            
            <Link to="/contact" className="drawer-link" onClick={()=>setOpen(false)}>تواصل معنا</Link>
            <Link to="/prayer-request" className="drawer-link" onClick={()=>setOpen(false)}>اطلب صلاة</Link>
            <Link to="/ManagerSpeech" className="drawer-link" onClick={()=>setOpen(false)}>كلمة المدير</Link>
  <Link to="/sabbath-lessons" className="drawer-link" onClick={()=>setOpen(false)}>دروس السبت</Link>


            
            <Link to="/live" className="drawer-live" onClick={()=>setOpen(false)}>البث المباشر</Link>
            <Link to="/AudioLive" className="drawer-live" onClick={()=>setOpen(false)}>البث المباشر الصوتي</Link>
          </nav>
        </div>
      </header>
    );
  }
