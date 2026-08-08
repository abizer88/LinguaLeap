import React, { useState } from 'react';
import { Flame, Zap, Heart, LogOut, BookOpen, Trophy, Sparkles, HelpCircle } from 'lucide-react';

// This defines the learning sequence independently from the order returned by
// the API, so lessons and their session words always follow the same journey.
const LESSON_PATH_ORDER = [7, 1, 4, 5, 6, 2, 3];

const getLessonPathPosition = (lessonId) => {
  const position = LESSON_PATH_ORDER.indexOf(Number(lessonId));
  return position === -1 ? LESSON_PATH_ORDER.length : position;
};

export default function Dashboard({ user, lessons, vocabulary, leaderboard, onPlayLesson, onLogout }) {
  const [vocabIdx, setVocabIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Daily study tips list
  const TIPS = [
    'Practice at the same time every day to build a strong habit!',
    'Read Arabic letters aloud — pronunciation is half the battle.',
    'Keep a vocabulary notebook: write, read, repeat.',
    'Try labeling objects around your house in Arabic.',
    'Watch Arabic cartoons with LSd subtitles for immersive learning.',
    'Celebrate small wins — every new word is progress!',
  ];

  const getDailyTip = () => {
    const day = new Date().getDate();
    return TIPS[day % TIPS.length];
  };

  const orderedLessons = [...lessons].sort((a, b) => getLessonPathPosition(a.id) - getLessonPathPosition(b.id));
  const orderedVocabulary = [...vocabulary].sort((a, b) => {
    const lessonOrder = getLessonPathPosition(a.lesson_id) - getLessonPathPosition(b.lesson_id);
    return lessonOrder || Number(a.id) - Number(b.id);
  });

  // Get the active word from the same lesson sequence as the curriculum path.
  const activeVocab = orderedVocabulary.length > 0
    ? orderedVocabulary[vocabIdx % orderedVocabulary.length]
    : { arabic: 'مرحبا', lsd: 'Hello' };

  const handleNextVocab = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setVocabIdx((prev) => (prev + 1) % (vocabulary?.length || 1));
    }, 200);
  };

  const handlePrevVocab = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setVocabIdx((prev) => (prev - 1 + (vocabulary?.length || 1)) % (vocabulary?.length || 1));
    }, 200);
  };

  // Calculate XP daily goal progress percentage (daily goal = 50 XP)
  const xpGoal = 50;
  const goalPct = Math.min((user.xp / xpGoal) * 100, 100);

  return (
    <div className="dashboard-container">
      {/* Navbar header */}
      <header className="dash-nav">
        <div className="nav-logo">
          🦜 LinguaLeap <span className="logo-badge-neon">LSd</span>
        </div>
        <div className="nav-stats">
          <div className="nav-stat-pill" title="Current Daily Streak">
            <Flame size={16} className="streak-icon" />
            <span>{user.streak} Days</span>
          </div>
          <div className="nav-stat-pill" title="Total XP Earned">
            <Zap size={16} className="xp-icon" />
            <span>{user.xp} XP</span>
          </div>
          <div className="nav-stat-pill" title="Remaining Lives">
            <Heart size={16} className="heart-icon" />
            <span className="hearts-display">
              {'❤️'.repeat(user.lives) + '🖤'.repeat(Math.max(0, 3 - user.lives))}
            </span>
          </div>
          <button onClick={onLogout} className="btn-logout" title="Sign Out">
            <LogOut size={16} />
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </header>

      <main className="dash-content">
        <div className="dash-main-grid">
          {/* LEFT PANEL: Path & Leaderboard */}
          <div className="dash-primary">
            
            {/* Welcome banner */}
            <div className="welcome-banner">
              <div className="welcome-text">
                <h2>Ahlan, {user.name || `Student ${user.tr_no}`}! 👋</h2>
                <p>Course: Arabic ➔ Lisan ud-Dawat (LSd)</p>
              </div>
              <div className="welcome-avatar">🇦🇪</div>
            </div>

            {/* Core Stats Overview */}
            <div className="stats-row">
              <div className="glass-card stat-card">
                <Flame className="sc-icon text-amber" size={28} />
                <span className="sc-val">{user.streak}</span>
                <span className="sc-lbl">Streak</span>
              </div>
              <div className="glass-card stat-card">
                <Zap className="sc-icon text-emerald" size={28} />
                <span className="sc-val">{user.xp}</span>
                <span className="sc-lbl">XP Earned</span>
              </div>
              <div className="glass-card stat-card">
                <BookOpen className="sc-icon text-primary" size={28} />
                <span className="sc-val">{user.lessons_completed}</span>
                <span className="sc-lbl">Lessons Completed</span>
              </div>
            </div>

            {/* Lesson Road Path */}
            <section className="glass-card path-section">
              <div className="card-header">
                <h3 className="section-title"><BookOpen size={18} /> Curriculum Lesson Path</h3>
                <div className="header-line"></div>
              </div>
              <div className="lessons-path-tree">
                {orderedLessons.map((l, i) => {
                  const isCompleted = i < user.lessons_completed;
                  const isActive = i === user.lessons_completed;
                  const isLocked = i > user.lessons_completed;
                  
                  let statusClass = 'locked';
                  if (isCompleted) statusClass = 'completed';
                  if (isActive) statusClass = 'active';

                  return (
                    <div key={l.id} className="lesson-tree-node">
                      <button 
                        onClick={() => onPlayLesson(l.id, l.icon, l.label, i)}
                        disabled={isLocked}
                        className={`lesson-node-btn ${statusClass}`}
                        title={l.label}
                      >
                        {isCompleted ? '✓' : l.icon}
                      </button>
                      <div className="lesson-node-info">
                        <span className="lesson-label">{l.label}</span>
                        <span className="lesson-status-txt">
                          {isCompleted ? 'Finished' : isActive ? 'Active' : 'Locked'}
                        </span>
                      </div>
                      {/* Keep connectors within each of the two horizontal rows. */}
                      {i < orderedLessons.length - 1 && i % 4 !== 3 && (
                        <div className={`lesson-connector-line ${isCompleted ? 'active' : ''}`}></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* RIGHT PANEL: Side widgets (Tip, Goal, Flashcard, Leaderboard) */}
          <div className="dash-secondary">
            
            {/* Daily Goal tracker */}
            <div className="glass-card side-widget">
              <h4 className="widget-title"><Zap size={16} /> Daily XP Progress</h4>
              <div className="goal-meter-container">
                <div className="goal-bar-bg">
                  <div className="goal-bar-fill" style={{ width: `${goalPct}%` }}></div>
                </div>
                <div className="goal-meta">
                  <span>{user.xp} / {xpGoal} XP</span>
                  <span>Goal {goalPct >= 100 ? 'Achieved! 🎉' : 'Active'}</span>
                </div>
              </div>
            </div>

            {/* Vocabulary Flip Flashcard */}
            <div className="glass-card side-widget">
              <div className="widget-header-with-action">
                <h4 className="widget-title"><Sparkles size={16} /> Word of the Session</h4>
                <div className="vocab-navigation-buttons">
                  <button onClick={handlePrevVocab} className="btn-vocab-nav">◀</button>
                  <button onClick={handleNextVocab} className="btn-vocab-nav">▶</button>
                </div>
              </div>
              
              {/* Flashcard container with flip trigger */}
              <div className="vocab-flashcard-container">
                <div 
                  className={`vocab-flashcard ${isFlipped ? 'flipped' : ''}`}
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  {/* Front Side */}
                  <div className="flashcard-face flashcard-front">
                    <span className="face-label">Arabic Word</span>
                    <span className="word-arabic">{activeVocab.arabic}</span>
                    <span className="flip-hint">Click card to reveal translation</span>
                  </div>
                  
                  {/* Back Side */}
                  <div className="flashcard-face flashcard-back">
                    <span className="face-label">LSd Translation</span>
                    <span className="word-translation">{activeVocab.lsd}</span>
                    <span className="flip-hint">Click card to flip back</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily study tip */}
            <div className="tip-box-glow">
              <div className="tip-header">
                <HelpCircle size={16} />
                <span>STUDY TIP</span>
              </div>
              <p className="tip-content-txt">{getDailyTip()}</p>
            </div>

            {/* Leaderboard widget */}
            <div className="glass-card side-widget">
              <h4 className="widget-title"><Trophy size={16} /> Leaderboard rankings</h4>
              <div className="leaderboard-list">
                {leaderboard.map((r, i) => {
                  const isYou = r.tr_no === user.tr_no;
                  const nameStr = isYou ? `${r.name || r.tr_no} (You)` : (r.name || r.tr_no);
                  const medals = ['🥇', '🥈', '🥉'];
                  
                  return (
                    <div key={r.tr_no} className={`lb-rank-row ${isYou ? 'you-row' : ''}`}>
                      <span className="rank-position">{medals[i] || i + 1}</span>
                      <div className="rank-avatar-lbl">{nameStr[0] || '?'}</div>
                      <span className="rank-student-name">{nameStr}</span>
                      <span className="rank-student-xp">{r.xp} XP</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </main>

      <footer className="site-footer">
        LinguaLeap Arabic to Lisan ud-Dawat Learning Portal · © 2026 Al Jamea tus Saifiyah
      </footer>

      <style>{`
        .dashboard-container {
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
        }

        /* Navbar */
        .dash-nav {
          background: rgba(11, 21, 16, 0.8);
          backdrop-filter: var(--glass-blur);
          border-bottom: 1px solid var(--border);
          padding: 0 40px;
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .nav-logo {
          font-size: 22px;
          font-weight: 900;
          color: var(--text);
          letter-spacing: -0.5px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .logo-badge-neon {
          background: var(--primary);
          color: #fff;
          font-size: 11px;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 99px;
          box-shadow: 0 0 10px var(--primary-glow);
          letter-spacing: 0.5px;
        }

        .nav-stats {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .nav-stat-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          border-radius: 99px;
          padding: 6px 16px;
          font-size: 14px;
          font-weight: 700;
        }

        .streak-icon { color: var(--accent); }
        .xp-icon { color: var(--primary); }
        .heart-icon { color: var(--danger); }

        .btn-logout {
          background: none;
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #EF4444;
          padding: 8px 16px;
          border-radius: 99px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .btn-logout:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: #EF4444;
        }

        @media (max-width: 768px) {
          .dash-nav { padding: 0 20px; }
          .logout-text { display: none; }
          .hearts-display { font-size: 12px; }
        }

        /* Content Layout */
        .dash-content {
          flex: 1;
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .dash-main-grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: 30px;
          align-items: start;
        }

        @media (max-width: 900px) {
          .dash-main-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Welcome Banner */
        .welcome-banner {
          background: linear-gradient(135deg, #0A1C14 0%, #112F22 100%);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          box-shadow: var(--shadow);
        }

        .welcome-text h2 {
          font-size: 24px;
          font-weight: 800;
          margin-bottom: 6px;
        }

        .welcome-text p {
          color: var(--text-muted);
          font-size: 14px;
        }

        .welcome-avatar {
          font-size: 48px;
          background: rgba(255,255,255,0.05);
          width: 80px; height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
        }

        /* Stats Row */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 30px;
        }

        .stat-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 20px;
        }

        .sc-icon { margin-bottom: 10px; }
        .text-amber { color: var(--accent); }
        .text-emerald { color: var(--primary); }
        .text-primary { color: #3B82F6; }

        .sc-val {
          font-size: 26px;
          font-weight: 900;
          color: var(--text);
        }

        .sc-lbl {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 4px;
          font-weight: 600;
        }

        /* Curriculum tree styling */
        .path-section {
          padding: 30px;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 36px;
        }

        .section-title {
          font-size: 16px;
          font-weight: 800;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }

        .header-line {
          flex: 1;
          height: 1px;
          background: rgba(16, 185, 129, 0.1);
        }

        .lessons-path-tree {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          align-items: flex-start;
          column-gap: 16px;
          row-gap: 32px;
          position: relative;
          padding: 8px 0 16px;
        }

        .lesson-tree-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 2;
          width: 100%;
        }

        .lesson-node-btn {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          font-size: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: 4px solid transparent;
          transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
          box-shadow: var(--shadow);
        }

        .lesson-node-btn.completed {
          background: var(--primary);
          border-color: #065F46;
          color: #fff;
          font-size: 24px;
          font-weight: bold;
        }

        .lesson-node-btn.active {
          background: var(--accent);
          border-color: #B45309;
          animation: pulse-glow 2s infinite;
        }

        .lesson-node-btn.locked {
          background: #111B15;
          border-color: rgba(255, 255, 255, 0.05);
          filter: opacity(0.4);
          cursor: not-allowed;
        }

        .lesson-node-btn:hover:not(:disabled) {
          transform: scale(1.1);
        }

        .lesson-node-info {
          text-align: center;
          margin-top: 10px;
        }

        .lesson-label {
          display: block;
          font-size: 14px;
          font-weight: 700;
          color: var(--text);
        }

        .lesson-status-txt {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: bold;
          margin-top: 2px;
          display: block;
        }

        .lesson-connector-line {
          position: absolute;
          top: 36px;
          left: calc(50% + 38px);
          width: calc(100% - 60px);
          height: 4px;
          background: rgba(255, 255, 255, 0.05);
          z-index: -1;
        }

        .lesson-connector-line.active {
          background: var(--primary);
          box-shadow: 0 0 10px var(--primary-glow);
        }

        @media (max-width: 600px) {
          .lessons-path-tree {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            row-gap: 28px;
          }

          .lesson-connector-line {
            display: none;
          }
        }

        /* Side widgets formatting */
        .side-widget {
          padding: 24px;
          margin-bottom: 24px;
        }

        .widget-title {
          font-size: 13px;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .widget-header-with-action {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .vocab-navigation-buttons {
          display: flex;
          gap: 6px;
          margin-bottom: 18px;
        }

        .btn-vocab-nav {
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border);
          color: var(--primary);
          width: 32px; height: 32px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          transition: all 0.2s;
        }

        .btn-vocab-nav:hover {
          background: var(--primary-glow);
          border-color: var(--primary);
        }

        /* Goal tracker progress bar */
        .goal-bar-bg {
          width: 100%;
          height: 12px;
          background: rgba(0,0,0,0.4);
          border-radius: 99px;
          border: 1px solid var(--border);
          overflow: hidden;
          margin-bottom: 8px;
        }

        .goal-bar-fill {
          height: 100%;
          border-radius: 99px;
          background: linear-gradient(90deg, var(--primary) 0%, #34D399 100%);
          box-shadow: 0 0 8px var(--primary-glow);
          transition: width 0.8s ease;
        }

        .goal-meta {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
        }

        /* Vocabulary Flashcard with Flip Animation */
        .vocab-flashcard-container {
          perspective: 1000px;
          width: 100%;
          height: 180px;
          cursor: pointer;
        }

        .vocab-flashcard {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .vocab-flashcard.flipped {
          transform: rotateY(180deg);
        }

        .flashcard-face {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          border-radius: var(--radius-md);
          border: 1.5px solid var(--border);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          box-shadow: var(--shadow);
        }

        .flashcard-front {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(6, 95, 70, 0.15) 100%);
          color: var(--text);
          border-color: var(--border-hover);
        }

        .flashcard-back {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(180, 83, 9, 0.15) 100%);
          color: var(--accent);
          transform: rotateY(180deg);
          border-color: var(--accent);
        }

        .face-label {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: var(--text-muted);
          margin-bottom: 12px;
        }

        .word-arabic {
          font-size: 28px;
          font-weight: 800;
          direction: rtl;
          color: var(--primary);
        }

        .word-translation {
          font-size: 26px;
          font-weight: 800;
          color: var(--accent);
        }

        .flip-hint {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 16px;
          opacity: 0.6;
        }

        /* Study tip box */
        .tip-box-glow {
          background: rgba(245, 158, 11, 0.02);
          border: 1px dashed var(--accent);
          border-radius: var(--radius-md);
          padding: 16px 20px;
          margin-bottom: 24px;
        }

        .tip-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 800;
          color: var(--accent);
          letter-spacing: 1px;
          margin-bottom: 6px;
        }

        .tip-content-txt {
          font-size: 13px;
          color: #FBBF24;
          line-height: 1.5;
        }

        /* Leaderboard ranks list */
        .leaderboard-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .lb-rank-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          background: rgba(255,255,255,0.01);
          border: 1px solid rgba(255, 255, 255, 0.02);
          transition: all 0.2s;
        }

        .lb-rank-row.you-row {
          background: var(--primary-glow);
          border-color: var(--primary);
          box-shadow: 0 0 10px rgba(16,185,129,0.1);
        }

        .rank-position {
          font-size: 14px;
          font-weight: 800;
          color: var(--text-muted);
          width: 24px;
          text-align: center;
        }

        .rank-avatar-lbl {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          color: var(--primary);
          flex-shrink: 0;
        }

        .lb-rank-row.you-row .rank-avatar-lbl {
          background: var(--primary);
          color: #fff;
          border-color: #065F46;
        }

        .rank-student-name {
          flex: 1;
          font-size: 14px;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .rank-student-xp {
          font-size: 13px;
          font-weight: 800;
          color: var(--primary);
        }

        .lb-rank-row.you-row .rank-student-xp {
          color: #34D399;
        }

        /* Footer */
        .site-footer {
          margin-top: 60px;
          padding: 30px 20px;
          border-top: 1px solid var(--border);
          text-align: center;
          font-size: 12px;
          color: var(--text-muted);
          background: rgba(0, 0, 0, 0.4);
        }
      `}</style>
    </div>
  );
}
