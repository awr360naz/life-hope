import React from 'react';
import { FaFacebookF, FaInstagram, FaTiktok, FaYoutube, FaTwitter } from 'react-icons/fa';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">

        {/* صف الفوتر الرئيسي */}
        <div className="footer-bottom-row">

          {/* العمود اليمين */}
          <div className="footer-right-stack">
            {/* العنوان */}
            <h2 className="footer-logo-mark">الحياة والأمل</h2>

            {/* النص التعريفي */}
            <p className="footer-tagline">
              مؤسسة إذاعية مسيحية تبشيرية، تابعة لمؤسسة AWR العالمية وتبث للعالم العربي.
            </p>

            {/* البريد الإلكتروني */}
            <p className="footer-contact">
              البريد الإلكتروني: <a href="mailto:hope@awr.org" className="footer-email">hope@awr.org</a>
            </p>

            {/* حقوق النشر */}
            <p className="footer-copy">2025 - جميع الحقوق محفوظة</p>
          </div>

          {/* العمود الشمال */}
          <div className="footer-left-block">

            {/* الواتساب */}
            <p className="footer-whatsapp">
              للمراسلة عبر الواتس اب: <span>+12409009939</span>
            </p>

            {/* أطلب صلاة */}
            <div className="footer-ask-pray">
              <a href="/askforpray">أطلب صلاة</a>
            </div>

            {/* تابعنا أيضا على */}
            <p className="footer-follow-label">تابعنا ايضا على:</p>

            {/* أيقونات السوشال */}
            <div className="footer-social-icons">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"><FaFacebookF /></a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"><FaInstagram /></a>
              <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer"><FaTiktok /></a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer"><FaYoutube /></a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"><FaTwitter /></a>
            </div>

          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
