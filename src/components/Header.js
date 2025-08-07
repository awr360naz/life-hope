// src/components/Header.js
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Header.css';
import livelogo from './livelogo.png'; 
import SearchLogo from './SearchLogo.png'; 

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const iconRef = useRef(null);

  const toggleMenu = () => setMenuOpen(prev => !prev);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        menuRef.current && !menuRef.current.contains(event.target) &&
        iconRef.current && !iconRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="header">
      
      {/* يسار: البث + البحث */}
      <div className="left-group">
       <img src={SearchLogo} alt="بحث" className="search-logo" />
     <Link to="/live">
  <img src={livelogo} alt="بث مباشر" className="live-logo" />
</Link>
      </div>

      {/* وسط: روابط */}
      <nav className="nav-links">
        <Link to="/story">قصتنا</Link>
        <Link to="/programs">برامجنا</Link>
        <Link to="/articles">مقالات</Link>
      </nav>

      {/* يمين: العنوان + المنيو */}
      <div className="right-group" ref={iconRef}>
        <div className="header-text">الحيَاةوالأمْل</div>
        <div className="menu-icon" onClick={toggleMenu}>
          <svg viewBox="0 0 26 30" xmlns="http://www.w3.org/2000/svg">
            <path d="M3.25 15H22.75M3.25 7.5H22.75M3.25 22.5H22.75" stroke="#1E1E1E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* القائمة المنسدلة للموبايل */}
      {menuOpen && (
        <nav className="mobile-menu" ref={menuRef}>
          <ul>
            <li><Link to="/" onClick={() => setMenuOpen(false)}>الصفحة الرئيسية</Link></li>
            <li><Link to="/about" onClick={() => setMenuOpen(false)}>من نحن</Link></li>
            <li><Link to="/contact" onClick={() => setMenuOpen(false)}>تواصل معنا</Link></li>
          </ul>
        </nav>
      )}
    </header>
  );
}
