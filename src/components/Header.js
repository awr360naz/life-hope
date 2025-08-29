import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./Header.css";
import { FiSearch } from "react-icons/fi";
import LiveButtonImg from "../components/livebutton.png"; 

export default function Header() {
  const [open, setOpen] = useState(false);

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

        {/* الشعار */}
        <Link to="/" className="logo" aria-label="الانتقال للصفحة الرئيسية">
          <span className="logo-mark">الحَياة والأمْل</span>
        </Link>

        {/* الروابط (ديسكتوب/تابلت) */}
        <nav className="main-nav" aria-label="روابط الموقع">
          <Link to="/articles" className="nav-link">مقالات</Link>
          <Link to="/programs" className="nav-link">برامجنا</Link>
          <Link to="/about" className="nav-link">قصتنا</Link>
        </nav>

        {/* زر البث (صورة) */}
        <Link to="/vedio-audio-live" className="live-btn" aria-label="البث المباشر">
          <img src={LiveButtonImg} alt="البث المباشر" />
        </Link>

        {/* يدفع البحث للطرف الشمالي */}
        <div className="spacer" />

      
       <form className="search" role="search" onSubmit={(e)=>e.preventDefault()}dir="ltr">
        <FiSearch className="search-icon" />
        <input type="search" placeholder="Search" className="search-input" />
          </form>

      </div>

      {/* أوف-كانفاس (موبايل) */}
      <div className={`drawer ${open ? "drawer--open" : ""}`} onClick={() => setOpen(false)}>
        <nav className="drawer-panel" onClick={(e)=>e.stopPropagation()}>
          <Link to="/articles" className="drawer-link" onClick={()=>setOpen(false)}>مقالات</Link>
          <Link to="/programs" className="drawer-link" onClick={()=>setOpen(false)}>برامجنا</Link>
          <Link to="/about" className="drawer-link" onClick={()=>setOpen(false)}>قصتنا</Link>
          <Link to="/live" className="drawer-live" onClick={()=>setOpen(false)}>البث المباشر</Link>
        <Link to="/AudioLive" className="drawer-live" onClick={()=>setOpen(false)}>
  البث المباشر الصوتي
</Link>

        </nav>
      </div>
    </header>
  );
}
