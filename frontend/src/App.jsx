import React, { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import LessonModal from './components/LessonModal';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('ll_token') || null);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ll_user') || 'null');
    } catch {
      localStorage.removeItem('ll_user');
      return null;
    }
  });
  
  // App data state
  const [lessons, setLessons] = useState([]);
  const [vocabulary, setVocabulary] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  
  // Quiz control state
  const [activeLesson, setActiveLesson] = useState(null);
  
  // Global toast state
  const [toast, setToast] = useState(null);

  // Set up timer to clear toast notifications automatically
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load dashboard items if already authenticated on boot. The stored session is
  // restored once; a successful sign-in loads its own fresh data below.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (token && user) {
      loadDashboardData(token, user.tr_no);
    }
  }, []);

  const showToast = (message) => {
    setToast(message);
  };

  const handleAuthSuccess = (newToken, authUser) => {
    setToken(newToken);
    setUser(authUser);
    localStorage.setItem('ll_token', newToken);
    localStorage.setItem('ll_user', JSON.stringify(authUser));
    loadDashboardData(newToken, authUser.tr_no);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setLessons([]);
    setVocabulary([]);
    setLeaderboard([]);
    setActiveLesson(null);
    localStorage.removeItem('ll_token');
    localStorage.removeItem('ll_user');
    showToast('🔑 Session ended. Goodbye!');
  };

  const loadDashboardData = async (activeToken, trNo = user?.tr_no) => {
    if (!activeToken || !trNo) return;
    setIsLoadingDashboard(true);
    const headers = {
      'Authorization': `Bearer ${activeToken}`,
      'Content-Type': 'application/json'
    };

    try {
      const [lessonsRes, vocabRes, leaderboardRes, profileRes] = await Promise.all([
        fetch('/api/lessons', { headers }),
        fetch('/api/vocabulary', { headers }),
        fetch('/api/leaderboard', { headers }),
        fetch(`/api/students/${trNo}`, { headers })
      ]);

      if ([lessonsRes, vocabRes, leaderboardRes, profileRes].some((response) => response.status === 401)) {
        handleLogout();
        return;
      }

      if (![lessonsRes, vocabRes, leaderboardRes, profileRes].every((response) => response.ok)) {
        throw new Error('One or more dashboard requests failed.');
      }

      const lessonsData = await lessonsRes.json();
      const vocabData = await vocabRes.json();
      const leaderboardData = await leaderboardRes.json();
      
      let profileData = null;
      if (profileRes.ok) {
        profileData = await profileRes.json();
        setUser(profileData);
        localStorage.setItem('ll_user', JSON.stringify(profileData));
      }

      setLessons(lessonsData);
      setVocabulary(vocabData);
      setLeaderboard(leaderboardData);

    } catch (err) {
      console.error('App load error:', err);
      showToast('⚠️ We could not load your learning data. Please try again.');
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const handleProgressUpdate = (updates) => {
    setUser((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem('ll_user', JSON.stringify(next));
      return next;
    });
    // Trigger list updates (such as leaderboard rankings)
    if (token) {
      loadDashboardData(token, user?.tr_no);
    }
  };

  const handlePlayLesson = (lessonId, icon, label, lessonIndex) => {
    setActiveLesson({ id: lessonId, icon, label, lessonIndex });
  };

  const handleCloseLesson = () => {
    setActiveLesson(null);
    if (token) {
      loadDashboardData(token, user?.tr_no);
    }
  };

  return (
    <div className="app-root-container">
      {token && user ? (
        /* Authenticated Dashboard View */
        <>
          {isLoadingDashboard && lessons.length === 0 ? (
            <div className="app-loading" role="status">Loading your learning space…</div>
          ) : (
            <Dashboard 
              user={user}
              lessons={lessons}
              vocabulary={vocabulary}
              leaderboard={leaderboard}
              onPlayLesson={handlePlayLesson}
              onLogout={handleLogout}
            />
          )}
          {activeLesson && (
            <LessonModal 
              lessonId={activeLesson.id}
              icon={activeLesson.icon}
              label={activeLesson.label}
              user={user}
              onProgressUpdate={handleProgressUpdate}
              onClose={handleCloseLesson}
              showToast={showToast}
            />
          )}
        </>
      ) : (
        /* Login & Password Set Screen */
        <AuthScreen 
          onAuthSuccess={handleAuthSuccess}
          showToast={showToast}
        />
      )}

      {/* Global Toast Banner */}
      {toast && (
        <div className="toast-container">
          <div className="toast">
            <span>{toast}</span>
          </div>
        </div>
      )}
    </div>
  );
}
