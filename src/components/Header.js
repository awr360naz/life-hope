// src/components/Header.js
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Header.css";
import SearchLogo from "./SearchLogo.png"; // عدّل المسار إذا لزم

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // قفل/فتح سكرول الصفحة عند فتح المنيو
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  // ESC يسكر المنيو
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // تغيير صفحة (Route) يسكر المنيو
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // تكبير الشاشة لديسكتوب يسكر المنيو
  useEffect(() => {
    const onResize = () => window.innerWidth >= 768 && setMenuOpen(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header className="header">
      {/* منيو الهامبرغر */}
      <button
        className="menu-toggle"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="فتح/إغلاق القائمة"
        aria-expanded={menuOpen}
      >
        <span className="bar" />
        <span className="bar" />
        <span className="bar" />
      </button>

      {/* الشعار */}
      <h1 className="brand-text">الحياة والأمل</h1>


      {/* الروابط (وسط) */}
      <nav className="nav-links">
        <Link to="/articles">مقالات</Link>
        <Link to="/programs">برامجنا</Link>
        <Link to="/story">قصتنا</Link>
      </nav>

      {/* نهاية الشريط: البث + البحث */}
      <div className="actions">
        <button className="btn-live">البث المباشر</button>
        <img src={SearchLogo} alt="بحث" className="search-icon" />
      </div>

      {/* خلفية تضغطها تسكّر */}
      <button
        className={`backdrop ${menuOpen ? "show" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-label="إغلاق القائمة"
      />

      {/* سايد منيو يفتح من اليمين دائمًا */}
      <nav className={`side-menu ${menuOpen ? "open" : ""}`}>
        <ul
          onClick={(e) => {
            if (e.target.tagName === "A") setMenuOpen(false);
          }}
        >
          <li><Link to="/">الصفحة الرئيسية</Link></li>
          <li><Link to="/articles">مقالات</Link></li>
          <li><Link to="/programs">برامجنا</Link></li>
          <li><Link to="/story">قصتنا</Link></li>
          <li><Link to="/contact">تواصل معنا</Link></li>
        </ul>
      </nav>
    </header>
  );
}
