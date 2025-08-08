
import './index.css';


// داخل src/index.js أو App.jsx
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

function Root() {
  useEffect(() => {
    // 1) خذ لغة المتصفح (مثلاً "ar" أو "en-US")
    const lang = navigator.language || navigator.userLanguage || 'en';
    const shortLang = lang.split('-')[0]; // ["ar","en",...]

    // 2) حدد هل هي RTL
    const rtlLangs = ['ar', 'he', 'fa', 'ur'];
    const dir = rtlLangs.includes(shortLang) ? 'rtl' : 'ltr';

    // 3) اضبط على html
    document.documentElement.setAttribute('lang', shortLang);
    document.documentElement.setAttribute('dir', dir);
  }, []);

  return <App />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Root />);
