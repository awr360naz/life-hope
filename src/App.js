// src/App.jsx
import React, { useEffect, useLayoutEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import './assets/fonts.css';
import './App.css';
import ProgramsPage from './pages/ProgramsPage';
import StoriesPage from './pages/StoriesPage';
import LivePage from './pages/LivePage';
import AudioLive from './pages/AudioLive';
import VedioAudioLive from "./pages/VedioAudioLive";
import ArticleDetail from "./pages/ArticleDetail";
import ProgramDetail from "./pages/ProgramDetail";
import ShortSegmentsPage from "./pages/ShortSegmentsPage";
import ContactPage from './pages/ContactPage';
import PrayerRequest from './pages/PrayerRequest';
import SearchPage from './pages/SearchPage';
import AboutPage from './pages/AboutPage';
import ArticlesCategoriesPage from "./pages/ArticlesCategoriesPage.jsx";
import CategoryArticlesPage from "./pages/CategoryArticlesPage.jsx";
import QuizCategoryPage from "./pages/QuizCategory";
import AngelsPage from "./pages/AngelsPage";
import ManagerSpeech from "./pages/ManagerSpeech";

import { QuizIndex } from "./pages/QuizIndex";
import { QuizPage } from "./pages/QuizPage";
import SabbathLessonsIndex from "./pages/SabbathLessonsIndex";
import SabbathLessonPage from "./pages/SabbathLessonPage";
import SabbathWeekPage from "./pages/SabbathWeekPage";
import SabbathItemPage from "./pages/SabbathItemPage";
/* 1) عطّل استرجاع التمرير من المتصفّح */
function UseManualScrollRestoration() {
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    // على الخروج برضو ارجعه manual
    const beforeUnload = () => window.scrollTo(0, 0);
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);
  return null;
}

/* 2) سكول للأعلى بقوة (قبل الرسم + بعده) */
function ScrollToTopHard() {
  const { pathname } = useLocation();

  // قبل الرسم: يمنع أي “قفزة” بتصير من عناصر داخل الصفحة
  useLayoutEffect(() => {
    // عطل السموث مؤقتًا
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';

    // فك أي فوكس ممكن يجرّ تمرير
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }

    // صفّر التمرير على كل الأماكن المحتملة
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // نبضة بعد الرسمة الأولى
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });

    // نبضة احتياطية بعد 60ms لو في شيء أخّر الـlayout
    const t = setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      // رجّع السلوك القديم
      html.style.scrollBehavior = prev || '';
    }, 60);

    return () => {
      clearTimeout(t);
      html.style.scrollBehavior = prev || '';
    };
  }, [pathname]);

  return null;
}
function TitleManager() {
  const location = useLocation();

  useEffect(() => {
    let title = "AWR360ARABIC";

    if (location.pathname === "/") {
      title = "AWR360ARABIC – الصفحة الرئيسية";
    } else if (location.pathname.startsWith("/programs")) {
      title = "AWR360ARABIC – برامجنا";
    } else if (location.pathname.startsWith("/articles")) {
      title = "AWR360ARABIC – مقالات";
    } else if (location.pathname.startsWith("/about")) {
      title = "AWR360ARABIC – قصتنا";
    } else if (location.pathname.startsWith("/vedio-audio-live")) {
      title = "AWR360ARABIC – البث المباشر";
    }else if (location.pathname.startsWith("/AngelsPage")) {
      title = "AWR360ARABIC – رسالة الملائكة الثلاث";
    }else if (location.pathname.startsWith("/quiz")) {
      title = "AWR360ARABIC – اختبر معلوماتك";
    }else if (location.pathname.startsWith("/contact")) {
      title = "AWR360ARABIC – تواصل معنا";
    } else if (location.pathname.startsWith("/prayer-request")) {
      title = "AWR360ARABIC – اطلب صلاة";
    }else if (location.pathname.startsWith("/ManagerSpeech")) {
      title = "AWR360ARABIC – كلمة المدير";
    }else if (location.pathname.startsWith("/sabbath-lessons")) {
      title = "AWR360ARABIC – دروس السبت";
    }else if (location.pathname.startsWith("/sabbath-weeks")) {
      title = "AWR360ARABIC – دروس السبت";
    }else if (location.pathname.startsWith("/sabbath-items")) {
      title = "AWR360ARABIC – دروس السبت";
    }else if (location.pathname.startsWith("/live")) {
      title = "AWR360ARABIC – البث المباشر";
    }else if (location.pathname.startsWith("/AudioLive")) {
      title = "AWR360ARABIC – البث المباشر الصوتي";
    }else if (location.pathname.startsWith("/shorts")) {
      title = "AWR360ARABIC – فقرات قصيرة";
    }




    document.title = title;
  }, [location.pathname]);

  return null; // ما بترسم إشي
}


export default function App() {
  return (
    <Router>
      {/* حطّهم أول ما داخل الـ Router */}
      <UseManualScrollRestoration />
      <TitleManager/>
      <ScrollToTopHard />

      <div className="app-shell">
        <Header />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/programs" element={<ProgramsPage />} />
            <Route path="/stories" element={<StoriesPage />} />
            <Route path="/live" element={<LivePage />} />
            <Route path="/AudioLive" element={<AudioLive />} />
            <Route path="/vedio-audio-live" element={<VedioAudioLive />} />
            <Route path="/articles/:slug" element={<ArticleDetail />} />
            <Route path="/program/:id" element={<ProgramsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/shorts" element={<ShortSegmentsPage />} />
            <Route path="/programs/:id" element={<ProgramDetail />} />
            <Route path="/prayer-request" element={<PrayerRequest />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/articles" element={<ArticlesCategoriesPage />} />
            <Route path="/articles/category/:name" element={<CategoryArticlesPage />} />
            <Route path="/quiz" element={<QuizIndex />} />
<Route path="/quiz/:slug" element={<QuizPage />} />
<Route path="/quizzes/health" element={<QuizCategoryPage category="health" />} />
<Route path="/quizzes/christian" element={<QuizCategoryPage category="christian" />} />
<Route path="/AngelsPage" element={<AngelsPage />} />
<Route path="/ManagerSpeech" element={<ManagerSpeech />} />
<Route path="/sabbath-lessons" element={<SabbathLessonsIndex />} />
<Route path="/sabbath-lessons/:lessonSlug" element={<SabbathLessonPage />} />
<Route path="/sabbath-weeks/:weekSlug" element={<SabbathWeekPage />} />
<Route path="/sabbath-items/:itemSlug" element={<SabbathItemPage />} />

          </Routes>
          
        </main>
        <Footer />
      </div>
    </Router>
  );
}
