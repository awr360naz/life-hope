import React from 'react';
import { Link, useLocation } from "react-router-dom";
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
            <p className="footer-tagline" dir='rt1'>
             مؤسسة إذاعية مسيحية تبشيرية، تابعة لمؤسسة <span dir="ltr">AWR</span> العالمية، وتبث للعالم العربي
</p>

            {/* البريد الإلكتروني */}
            <p className="footer-contact">
              البريد الإلكتروني:<br></br> <a href="mailto:hope@awr.org" className="footer-email">hope@awr.org</a>
            </p>

            {/* حقوق النشر */}
            <p className="footer-copy">2025 - جميع الحقوق محفوظة</p>
          </div>

          {/* العمود الشمال */}
          <div className="footer-left-block">

            {/* الواتساب */}
           <p className="footer-whatsapp">
  للمراسلة عبر الواتس اب:<br />
  <a href="https://wa.me/12409009939" target="_blank" rel="noopener noreferrer">
    +12409009939
  </a>
</p>


            {/* أطلب صلاة */}
           <div className="footer-ask-pray">
  <Link to="/askforpray">أطلب صلاة</Link>
</div>


            {/* تابعنا أيضا على */}
            <p className="footer-follow-label">تابعنا ايضا على:</p>

            {/* أيقونات السوشال */}
            <div className="footer-social-icons">
              <a href="https://www.facebook.com/AWR360Arabic" target="_blank" rel="noopener noreferrer"><FaFacebookF /></a>
              <a href="https://www.instagram.com/awr_arabic/" target="_blank" rel="noopener noreferrer"><FaInstagram /></a>
              <a href="https://www.tiktok.com/@awr_arabic" target="_blank" rel="noopener noreferrer"><FaTiktok /></a>
              <a href="https://www.youtube.com/channel/UCc6W4vs9rTKvl-5arOBs7WA" target="_blank" rel="noopener noreferrer"><FaYoutube /></a>
              <a href="https://twitter.com/awr_arabic" target="_blank" rel="noopener noreferrer"><FaTwitter /></a>
            </div>

          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
