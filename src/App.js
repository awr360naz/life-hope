import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import './assets/fonts.css';
import './App.css';
import ArticlesPage from './pages/ArticlesPage';
import ProgramsPage from './pages/ProgramsPage';
import StoriesPage from './pages/StoriesPage';
import LivePage from './pages/LivePage';
import AudioLive from './pages/AudioLive';
import VedioAudioLive from "./pages/VedioAudioLive";
import ArticleDetail from "./pages/ArticleDetail";
import ProgramDetailspage from "./pages/ProgramDetail";
import ShortSegmentsPage from "./pages/ShortSegmentsPage";
import ProgramDetail from "./pages/ProgramDetail";
import ContactPage from './pages/ContactPage';
import PrayerRequest from './pages/PrayerRequest';
import SearchPage from './pages/SearchPage';








 


export default function App() {
  console.log('Header type:', typeof Header); // لازم function
  console.log('Footer type:', typeof Footer); // لازم function

  return (
    <Router>
      <div className="app-shell">
        <Header />
        <main className="app-main">
          <Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/articles" element={<ArticlesPage />} />
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

 
</Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
