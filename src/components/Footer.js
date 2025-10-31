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
            <span className="logo-mark">صوت الحَياة والأمْل</span>

            {/* النص التعريفي */}
            <p className="footer-tagline" dir='rt1'>
            <span dir="rtl">اذاعة مسيحية تبشيرية باللغة العربية تابعة لاذاعة AWR360 العالمية</span>
    
</p><br></br>

              <p className='footer-text'>
             . أينما كنتم، نحن معكم ولأجلكم<br></br>
            </p>
          
           
</div>
          <div className="footer-left-block">



            {/* تابعنا أيضا على */}
            <p className="footer-follow-label">: تابعنا ايضا على</p>

            {/* أيقونات السوشال */}
            <div className="footer-social-icons">
              <a href="https://www.facebook.com/AWR360Arabic" target="_blank" rel="noopener noreferrer"><FaFacebookF /></a>
              <a href="https://www.instagram.com/awr_arabic/" target="_blank" rel="noopener noreferrer"><FaInstagram /></a>
              <a href="https://www.tiktok.com/@awr_arabic" target="_blank" rel="noopener noreferrer"><FaTiktok /></a>
              <a href="https://www.youtube.com/channel/UCc6W4vs9rTKvl-5arOBs7WA" target="_blank" rel="noopener noreferrer"><FaYoutube /></a>
            
            </div><br></br><br></br><br></br>
             <p className="footer-copy">2025 - جميع الحقوق محفوظة</p>
          </div>

          
        </div>
      </div>
    </footer>
  );
};

export default Footer;
