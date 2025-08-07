// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));

// تحديد لغة المتصفح
const userLang = navigator.language || navigator.userLanguage;

// تحديد الاتجاه
const isRTL = userLang.startsWith('ar') || userLang.startsWith('he') || userLang.startsWith('fa');

// ضبط اتجاه الصفحة
document.documentElement.dir = isRTL ? 'rtl' : 'ltr';

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals

