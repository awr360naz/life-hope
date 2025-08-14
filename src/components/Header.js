// src/components/Header.js
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Header.css";
import SearchLogo from "./SearchLogo.png";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onResize = () => window.innerWidth >= 768 && setMenuOpen(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header className="header">
      {/* منيو الهامبرغر */}
      <button
        type="button"                      // ✅ مهم
        className="menu-toggle"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="فتح/إغلاق القائمة"
        aria-expanded={menuOpen}
      >
        <span className="bar" aria-hidden="true" />
        <span className="bar" aria-hidden="true" />
        <span className="bar" aria-hidden="true" />
      </button>

      {/* الشعار */}
      <h1 className="brand-text">الحياة والأمل</h1>

      {/* الروابط (وسط) */}
      <nav className="nav-links">
        <Link to="/articles">مقالات</Link>
        <Link to="/programs">برامجنا</Link>
        <Link to="/stories">قصتنا</Link>
      </nav>

      {/* نهاية الشريط: البث + البحث */}
      <div className="actions">
        <Link to="/live" className="btn-live">البث المباشر</Link>
        <img src={SearchLogo} alt="بحث" className="search-icon" />
      </div>

      {/* خلفية تضغطها تسكّر */}
      <button
        type="button"                      // ✅ مهم
        className={`backdrop ${menuOpen ? "show" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-label="إغلاق القائمة"
      />

      {/* سايد منيو */}
      <nav className={`side-menu ${menuOpen ? "open" : ""}`}>
        <ul onClick={(e) => { if (e.target.tagName === "A") setMenuOpen(false); }}>
          <li><Link to="/live" className="btn-live">البث المباشر</Link></li>
          <li><Link to="/">الصفحة الرئيسية</Link></li>
          <li><Link to="/articles">مقالات</Link></li>
          <li><Link to="/programs">برامجنا</Link></li>
          <li><Link to="/stories">قصتنا</Link></li>   {/* ✅ تصحيح /story -> /stories */}
          <li><Link to="/contact">تواصل معنا</Link></li>
        </ul>
      </nav>
    </header>
  );
}
