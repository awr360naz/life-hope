import React from 'react';
import { Link, useLocation } from "react-router-dom";
import { FaFacebookF, FaInstagram, FaTiktok, FaYoutube } from 'react-icons/fa';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">

        {/* صف الفوتر الرئيسي */}
        <div className="footer-bottom-row">

          {/* العمود اليمين */}
          <div className="footer-right-stack">
            {/* اللوجو */}
            <img
              src="/Awr360logo.png"
              alt="AWR360 Logo"
              className="header-logo footer-logo-img"
            />

            {/* النص التعريفي */}
            <p className="footer-tagline" dir="rtl">
              اذاعة مسيحية تبشيرية باللغة العربية تابعة لاذاعة AWR360 العالمية
            </p>

            <p className="footer-text" dir="rtl">
               أينما كنتم، نحن معكم ولأجلكم.
            </p>
          </div>

          {/* العمود الشمال */}
          <div className="footer-left-block">
            {/* تابعنا أيضا على */}
            <p className="footer-follow-label" dir="rtl">
              تابعنا ايضا على:
            </p>

            {/* أيقونات السوشال */}
            <div className="footer-social-icons">
              <a href="https://www.facebook.com/AWR360Arabic" target="_blank" rel="noopener noreferrer">
                <FaFacebookF />
              </a>
              <a href="https://www.instagram.com/awr_arabic/" target="_blank" rel="noopener noreferrer">
                <FaInstagram />
              </a>
              <a href="https://www.tiktok.com/@awr_arabic" target="_blank" rel="noopener noreferrer">
                <FaTiktok />
              </a>
              <a href="https://www.youtube.com/channel/UCc6W4vs9rTKvl-5arOBs7WA" target="_blank" rel="noopener noreferrer">
                <FaYoutube />
              </a>
            </div>

            {/* حقوق النشر تحت الأيقونات */}
            <p className="footer-copy" dir="rtl">
              2025 - جميع الحقوق محفوظة .
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;
