import React, { useState, useEffect } from 'react';
import { X, Heart, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function LessonModal({ lessonId, icon, label, user, onProgressUpdate, onClose, showToast }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qIdx, setQIdx] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [chosenChoice, setChosenChoice] = useState(null);
  const [currentLives, setCurrentLives] = useState(user.lives ?? 3);
  const [confettiDots, setConfettiDots] = useState([]);

  // Fetch questions for this lesson from backend
  // These callbacks intentionally remain stable for the lifetime of an open modal.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let active = true;
    const loadQuestions = async () => {
      try {
        const token = localStorage.getItem('ll_token');
        const res = await fetch(`/api/lessons/${lessonId}/questions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (active) {
          if (!res.ok) {
            throw new Error(data.error || 'Unable to load this lesson.');
          }
          if (data && data.length > 0) {
            setQuestions(data);
          } else {
            showToast('⚠️ No questions found for this lesson.');
            onClose();
          }
          setLoading(false);
        }
      } catch {
        if (active) {
          showToast('⚠️ Error connecting to server.');
          onClose();
        }
      }
    };
    loadQuestions();
    return () => { active = false; };
  }, [lessonId]);

  // Clean up confetti dots
  useEffect(() => {
    if (confettiDots.length > 0) {
      const timer = setTimeout(() => {
        setConfettiDots([]);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [confettiDots]);

  if (loading) {
    return (
      <div className="modal-overlay-glass">
        <div className="modal-loading-card">
          <div className="loading-spinner"></div>
          <p>Downloading Quiz Data...</p>
        </div>
        <style>{`
          .modal-overlay-glass {
            position: fixed; inset: 0;
            background: rgba(7, 13, 10, 0.85);
            backdrop-filter: blur(15px);
            z-index: 1000;
            display: flex; align-items: center; justify-content: center;
          }
          .modal-loading-card {
            text-align: center; color: var(--text-muted);
          }
          .loading-spinner {
            width: 48px; height: 48px;
            border: 4px solid var(--border);
            border-top: 4px solid var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
          }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const activeQuestion = questions[qIdx];
  const totalQuestions = questions.length;

  const triggerConfetti = () => {
    const colors = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'];
    const dots = Array.from({ length: 24 }).map((_, idx) => ({
      id: idx,
      x: 30 + Math.random() * 40,
      y: 20 + Math.random() * 30,
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: 0.8 + Math.random() * 0.6
    }));
    setConfettiDots(dots);
  };

  const handleChoiceSelect = async (choice) => {
    if (answered) return;
    setChosenChoice(choice);
    setAnswered(true);

    const isCorrect = choice === activeQuestion.answer;

    if (isCorrect) {
      triggerConfetti();
    } else {
      // Wrong answer - deduct live immediately on Supabase backend
      try {
        const token = localStorage.getItem('ll_token');
        const res = await fetch('/api/progress', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ lesson_id: lessonId, passed: false })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Unable to save your answer.');
        setCurrentLives(data.lives);
        onProgressUpdate({ lives: data.lives });
      } catch {
        console.error('Failed to sync heart deduction:', err);
        showToast('⚠️ Your answer could not be saved. Check your connection and try again.');
      }
    }
  };

  const handleContinue = async () => {
    // If out of lives, close modal and trigger refresh
    if (currentLives === 0) {
      onClose();
      return;
    }

    // Go to next question or complete lesson
    if (qIdx < totalQuestions - 1) {
      setQIdx(qIdx + 1);
      setAnswered(false);
      setChosenChoice(null);
    } else {
      // Last question finished! Send pass command to award XP and unlock next level
      try {
        const token = localStorage.getItem('ll_token');
        const res = await fetch('/api/progress', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ lesson_id: lessonId, passed: true })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Unable to save lesson completion.');
        onProgressUpdate({
          xp: data.xp,
          lessons_completed: data.lessons_completed
        });

        showToast(`🎉 Lesson Completed! +${data.xp_earned} XP`);
        onClose();
      } catch {
        showToast('⚠️ Error saving completion progress.');
        onClose();
      }
    }
  };

  const isCorrectChoice = (choice) => choice === activeQuestion.answer;

  return (
    <div className="modal-overlay-glass">
      {/* Dynamic Confetti Burst */}
      {confettiDots.map(dot => (
        <div 
          key={dot.id}
          className="confetti-dot"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            backgroundColor: dot.color,
            animationDuration: `${dot.duration}s`
          }}
        />
      ))}

      <div className="glass-card modal-content-card">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="lesson-badge">
            <span className="lesson-badge-icon">{icon}</span>
            <span className="lesson-badge-lbl">{label}</span>
          </div>
          <div className="hearts-stat-row">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart 
                key={i} 
                className={`heart-icon-indicator ${i >= currentLives ? 'lost' : ''}`} 
                size={20} 
              />
            ))}
          </div>
          <button onClick={onClose} className="btn-modal-close" title="Exit Lesson">
            <X size={18} />
          </button>
        </div>

        {/* Progress Bar indicator */}
        <div className="lesson-progress-wrap">
          <div className="progress-label-txt">Question {qIdx + 1} of {totalQuestions}</div>
          <div className="modal-progress-bg">
            <div 
              className="modal-progress-fill" 
              style={{ width: `${((qIdx + (answered ? 1 : 0)) / totalQuestions) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question Title */}
        <div className="question-text-box">
          <h2>{activeQuestion.question}</h2>
        </div>

        {/* Choices Grid */}
        <div className="choices-grid-layout">
          {activeQuestion.choices.map((choice) => {
            let btnClass = '';
            if (answered) {
              if (isCorrectChoice(choice)) btnClass = 'correct-choice';
              else if (chosenChoice === choice) btnClass = 'wrong-choice';
              else btnClass = 'disabled-choice';
            }
            
            return (
              <button 
                key={choice}
                onClick={() => handleChoiceSelect(choice)}
                disabled={answered}
                className={`choice-card-btn ${btnClass}`}
              >
                <span className="choice-lbl-txt">{choice}</span>
              </button>
            );
          })}
        </div>

        {/* Real-time Answer Feedback Box */}
        {answered && (
          <div className={`feedback-alert-box ${chosenChoice === activeQuestion.answer ? 'success' : 'danger'}`}>
            {chosenChoice === activeQuestion.answer ? (
              <>
                <CheckCircle2 size={24} className="alert-icon" />
                <div className="alert-msg-txt">
                  <strong>Excellent!</strong> You correctly translated the word.
                </div>
              </>
            ) : (
              <>
                <AlertTriangle size={24} className="alert-icon" />
                <div className="alert-msg-txt">
                  <strong>Correct Translation:</strong> {activeQuestion.answer}
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer controls */}
        <div className="modal-footer-controls">
          {answered ? (
            <button onClick={handleContinue} className="btn-primary continue-btn-action">
              {currentLives === 0 
                ? 'Out of Lives - Close' 
                : qIdx === totalQuestions - 1 
                  ? 'Finish Lesson ➔' 
                  : 'Next Question ➔'}
            </button>
          ) : (
            <button onClick={onClose} className="btn-secondary-quit">
              Abandon Lesson
            </button>
          )}
        </div>
      </div>

      <style>{`
        .modal-overlay-glass {
          position: fixed; inset: 0;
          background: rgba(7, 13, 10, 0.85);
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
          z-index: 1000;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }

        .modal-content-card {
          width: 100%;
          max-width: 580px;
          border: 1px solid var(--border);
          position: relative;
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          background: #0B1510;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          padding-bottom: 16px;
        }

        .lesson-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(16, 185, 129, 0.05);
          border: 1px solid var(--border);
          padding: 6px 14px;
          border-radius: 99px;
        }

        .lesson-badge-icon {
          font-size: 16px;
        }

        .lesson-badge-lbl {
          font-size: 13px;
          font-weight: 700;
          color: var(--primary);
        }

        .hearts-stat-row {
          display: flex;
          gap: 6px;
        }

        .heart-icon-indicator {
          color: var(--danger);
          fill: var(--danger);
          transition: all 0.3s;
        }

        .heart-icon-indicator.lost {
          color: rgba(255, 255, 255, 0.1);
          fill: none;
          transform: scale(0.9);
        }

        .btn-modal-close {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          width: 32px; height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .btn-modal-close:hover {
          background: rgba(255,255,255,0.05);
          color: var(--text);
        }

        /* Progress Bar */
        .lesson-progress-wrap {
          margin-bottom: 30px;
        }

        .progress-label-txt {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }

        .modal-progress-bg {
          width: 100%;
          height: 8px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 99px;
          overflow: hidden;
        }

        .modal-progress-fill {
          height: 100%;
          border-radius: 99px;
          background: var(--primary);
          transition: width 0.3s ease;
          box-shadow: 0 0 8px var(--primary-glow);
        }

        /* Question Box */
        .question-text-box {
          margin-bottom: 24px;
          text-align: center;
        }

        .question-text-box h2 {
          font-size: 24px;
          font-weight: 800;
          color: var(--text);
          line-height: 1.4;
        }

        /* Choices Grid */
        .choices-grid-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 24px;
        }

        @media (max-width: 480px) {
          .choices-grid-layout {
            grid-template-columns: 1fr;
          }
        }

        .choice-card-btn {
          background: rgba(255, 255, 255, 0.02);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-md);
          padding: 16px;
          cursor: pointer;
          color: var(--text);
          font-weight: 700;
          font-size: 15px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .choice-card-btn:hover:not(:disabled) {
          border-color: var(--primary);
          background: var(--primary-glow);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);
        }

        .choice-card-btn.correct-choice {
          border-color: var(--primary);
          background: rgba(16, 185, 129, 0.15);
          color: #10B981;
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.2);
        }

        .choice-card-btn.wrong-choice {
          border-color: var(--danger);
          background: rgba(239, 68, 68, 0.15);
          color: #F87171;
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.2);
        }

        .choice-card-btn.disabled-choice {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Feedback box */
        .feedback-alert-box {
          display: flex;
          gap: 14px;
          align-items: center;
          padding: 16px 20px;
          border-radius: var(--radius-md);
          margin-bottom: 24px;
        }

        .feedback-alert-box.success {
          background: rgba(16, 185, 129, 0.1);
          border-left: 4px solid var(--primary);
          color: #A7F3D0;
        }

        .feedback-alert-box.danger {
          background: rgba(239, 68, 68, 0.1);
          border-left: 4px solid var(--danger);
          color: #FCA5A5;
        }

        .alert-icon {
          flex-shrink: 0;
        }

        .alert-msg-txt {
          font-size: 14px;
          line-height: 1.4;
        }

        .alert-msg-txt strong {
          display: block;
          font-size: 12px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-bottom: 2px;
        }

        .modal-footer-controls {
          display: flex;
          justify-content: flex-end;
          border-top: 1px solid rgba(255,255,255,0.03);
          padding-top: 20px;
        }

        .btn-secondary-quit {
          background: none;
          border: 1px solid rgba(255,255,255,0.08);
          color: var(--text-muted);
          padding: 12px 24px;
          border-radius: var(--radius-md);
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s;
        }

        .btn-secondary-quit:hover {
          background: rgba(255,255,255,0.02);
          color: var(--text);
          border-color: rgba(255,255,255,0.15);
        }

        .continue-btn-action {
          width: auto;
          min-width: 160px;
        }
      `}</style>
    </div>
  );
}
