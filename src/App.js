import { useState, useRef, useEffect } from "react";
import { sections } from "./texts";
import confetti from 'canvas-confetti';

const sectionImages = {
  "Lines 1–10": "/images/greek1.png",
  "Lines 11–20": "/images/greek2.png",
  "Lines 21–30": "/images/greek3.png",
  "Lines 31–40": "/images/greek4.png",
  "Lines 41–end": "/images/greek5.png"
};

function levenshtein(a, b) {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: bn + 1 }, (_, i) => [i]);
  matrix[0] = Array.from({ length: an + 1 }, (_, j) => j);
  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[bn][an];
}

export default function App() {
  const [selectedSectionIdx, setSelectedSectionIdx] = useState(null);
  const [selectedLineIdx, setSelectedLineIdx] = useState(null);
  const [practiceAll, setPracticeAll] = useState(false);
  const [currentWord, setCurrentWord] = useState("");
  const [userWords, setUserWords] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [mistakes, setMistakes] = useState(0);
  const [showFinishedPopup, setShowFinishedPopup] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [mistakePositions, setMistakePositions] = useState([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [shakeInput, setShakeInput] = useState(false);
  const [gradePulse, setGradePulse] = useState(false);
  const [toast, setToast] = useState(null);

  const inputRef = useRef(null);
  const prevGradeRef = useRef(null);
  const prevLevelRef = useRef(null);

  const normalize = (str) =>
    str.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[.,;:!?()]/g, "")
      .toLowerCase()
      .trim();

  const handleTyping = (e) => {
    const value = e.target.value;
    setCurrentWord(value);
  
    if (selectedSectionIdx === null) return;
  
    let targetText;
  
    if (practiceAll) {
      targetText = sections[selectedSectionIdx].groups.map(g => g.english.join(" ")).join(" ");
    } else {
      targetText = sections[selectedSectionIdx].groups[selectedLineIdx].english.join(" ");
    }
  
    const targetWords = targetText.trim().split(/\s+/);
  
    if (value.endsWith(" ")) {
      const typed = normalize(value.trim());
      const correctWord = normalize(targetWords[userWords.length] || "");

      if (typed === correctWord || levenshtein(typed, correctWord) <= 1) {
        setUserWords((prev) => [...prev, targetWords[userWords.length]]);
        setStreak(prev => {
          const next = prev + 1;
          setBestStreak(bs => Math.max(bs, next));
          if (next % 10 === 0) {
            confetti({
              particleCount: 40,
              spread: 45,
              origin: { y: 0.72 }
            });
          }
          return next;
        });
        setXp(prev => prev + 1);
        setCurrentWord("");
        setFeedback("Correct");

        if (userWords.length + 1 === targetWords.length) {
          setShowFinishedPopup(true);
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });
        }
      } else {
        setFeedback("Try again.");
setShakeInput(true);
setTimeout(() => setShakeInput(false), 240);
setStreak(0);
        if (!mistakePositions.includes(userWords.length)) {
          setMistakePositions((prev) => [...prev, userWords.length]);
        }
        if (!feedback.startsWith("Try again")) {
          setMistakes((prev) => prev + 1);
        }
      }
    }
  
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleHint = () => {
    if (selectedSectionIdx === null) return;
 
    const targetText = practiceAll
      ? sections[selectedSectionIdx].groups.map(g => g.english.join(" ")).join(" ")
      : sections[selectedSectionIdx].groups[selectedLineIdx].english.join(" ");
 
    const targetWords = targetText.trim().split(/\s+/);
    if (userWords.length < targetWords.length) {
      const firstLetter = targetWords[userWords.length][0];
      setFeedback(`Hint: starts with "${firstLetter}"`);
    }
  };

  const handleRevealWord = () => {
    if (selectedSectionIdx === null) return;

    const targetText = practiceAll
      ? sections[selectedSectionIdx].groups.map(g => g.english.join(" ")).join(" ")
      : sections[selectedSectionIdx].groups[selectedLineIdx].english.join(" ");

    const targetWords = targetText.trim().split(/\s+/);
    if (userWords.length < targetWords.length) {
      const nextWord = targetWords[userWords.length];
      setUserWords(prev => [...prev, nextWord]);
      setStreak(0);
      setXp(prev => Math.max(prev - 5, 0));
      setCurrentWord("");
      setFeedback("Word revealed.");
    }

    if (userWords.length + 1 === targetWords.length) {
      setShowFinishedPopup(true);
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    }

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleStartOver = () => {
    setSelectedSectionIdx(null);
    setSelectedLineIdx(null);
    setPracticeAll(false);
    setCurrentWord("");
    setUserWords([]);
    setFeedback("");
    setMistakes(0);
    setMistakePositions([]);
    setStreak(0);
    setBestStreak(0);
    setXp(0);
  };
  
  const handleResetMistakes = () => {
    setMistakes(0);
    setMistakePositions([]);
  };

  const progress = (() => {
    if (selectedSectionIdx === null) return 0;
    if (!sections[selectedSectionIdx]) return 0;
  
    const targetText = practiceAll
      ? sections[selectedSectionIdx].groups.map(g => g.english.join(" ")).join(" ")
      : (sections[selectedSectionIdx].groups[selectedLineIdx]?.english.join(" ") || "");
  
    const totalWords = targetText.trim().split(/\s+/).length;
    if (totalWords === 0) return 0;
  
    const safeProgress = Math.min((userWords.length / totalWords) * 100, 100);
    return Math.round(safeProgress);
  })();

  const accuracy = (() => {
    const correct = userWords.length;
    const total = correct + mistakes;
    if (total === 0) return 100;
    return Math.round((correct / total) * 100);
  })();

  const grade = (() => {
    if (accuracy === 100 && mistakes === 0) return "S";
    if (accuracy >= 95) return "A";
    if (accuracy >= 85) return "B";
    return "C";
  })();

  const level = Math.floor(xp / 200) + 1;
  const flameSpeedMs = streak >= 15 ? 450 : streak >= 5 ? 650 : 900;

  useEffect(() => {
    // Grade pulse when grade improves (C→B→A→S)
    const order = { C: 0, B: 1, A: 2, S: 3 };
    const prev = prevGradeRef.current;
    if (prev && order[grade] > order[prev]) {
      setGradePulse(true);
      const t = setTimeout(() => setGradePulse(false), 300);
      return () => clearTimeout(t);
    }
    prevGradeRef.current = grade;
  }, [grade]);

  useEffect(() => {
    // Level-up toast
    const prev = prevLevelRef.current;
    if (prev && level > prev) {
      setToast(`LEVEL ${level}!`);
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.65 }
      });
      const t = setTimeout(() => setToast(null), 1200);
      return () => clearTimeout(t);
    }
    prevLevelRef.current = level;
  }, [level]);

  const formatGreek = () => {
    if (selectedSectionIdx === null) return "";

    const lines = practiceAll
      ? sections[selectedSectionIdx].groups.map(g => g.greek.join(" "))
      : [sections[selectedSectionIdx].groups[selectedLineIdx].greek.join(" ")];

    const properNames = [];

    const formattedLines = lines.map((line) => {
      const trimmedLine = line.trim();
      const words = trimmedLine.split(/\s+/);

      const correctedWords = words.map(word => {
        const cleanWord = word.replace(/[^\w]/g, '');
        return properNames.includes(cleanWord)
          ? cleanWord
          : word;
      });

      const finalLine = correctedWords.join(" ");
      return finalLine;
    });

    if (practiceAll) {
      return formattedLines.join("\n");
    } else {
      return formattedLines.join(" ");
    }
  };

  return (
    <div style={{
      padding: "30px",
      maxWidth: "900px",
      margin: "0 auto",
      fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
      lineHeight: "1.6"
    }}>
      <style>{`
        @keyframes pop {
          0% { transform: scale(1); }
          30% { transform: scale(1.15); }
          60% { transform: scale(0.98); }
          100% { transform: scale(1); }
        }

        @keyframes flicker {
          0%   { transform: translateY(0) scale(1); filter: drop-shadow(0 0 6px rgba(255,120,0,.55)); }
          20%  { transform: translateY(-1px) scale(1.02); filter: drop-shadow(0 0 10px rgba(255,120,0,.8)); }
          40%  { transform: translateY(0) scale(.99); filter: drop-shadow(0 0 6px rgba(255,80,0,.6)); }
          60%  { transform: translateY(-2px) scale(1.03); filter: drop-shadow(0 0 12px rgba(255,170,0,.85)); }
          80%  { transform: translateY(0) scale(1.01); filter: drop-shadow(0 0 8px rgba(255,120,0,.7)); }
          100% { transform: translateY(-1px) scale(1); filter: drop-shadow(0 0 6px rgba(255,120,0,.55)); }
        }

        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }

        .hud {
          display: flex;
          gap: 14px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 10px;
        }

        .statCard {
          background: rgba(255,255,255,0.75);
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 12px;
          padding: 10px 14px;
          box-shadow: 0 6px 18px rgba(0,0,0,0.08);
          display: inline-flex;
          align-items: baseline;
          gap: 10px;
        }

        .label {
          font-size: 12px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: rgba(0,0,0,0.55);
          font-weight: 700;
        }

        .value {
          font-size: 22px;
          font-weight: 800;
          font-family: ui-rounded, system-ui, -apple-system, "Inter", "Helvetica Neue", Arial, sans-serif;
        }

        .valuePop {
          animation: pop 240ms ease-out;
        }

        .flame {
          display: inline-block;
          margin-right: 6px;
          animation: flicker 900ms infinite ease-in-out;
          transform-origin: 50% 80%;
        }

        .xpText {
          font-weight: 900;
          background: linear-gradient(90deg, #6a11cb, #2575fc, #6a11cb);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          background-size: 200% 200%;
          animation: shimmer 2.2s linear infinite;
        }

        .gradeBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 34px;
          height: 34px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid rgba(0,0,0,0.12);
          font-weight: 900;
          font-size: 18px;
          letter-spacing: 0.04em;
        }

        .gradeS { background: rgba(255, 215, 0, 0.25); }
        .gradeA { background: rgba(76, 175, 80, 0.20); }
        .gradeB { background: rgba(255, 152, 0, 0.20); }
        .gradeC { background: rgba(244, 67, 54, 0.18); }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }

        .shake {
          animation: shake 220ms ease-in-out;
        }

        @keyframes badgePulse {
          0% { transform: scale(1); }
          40% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }

        .gradePulse {
          animation: badgePulse 260ms ease-out;
        }

        @keyframes toast {
          0% { opacity: 0; transform: translateY(10px) scale(.98); }
          20% { opacity: 1; transform: translateY(0) scale(1.02); }
          100% { opacity: 0; transform: translateY(-6px) scale(1); }
        }

        .toast {
          position: fixed;
          top: 18px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 14px;
          border-radius: 999px;
          border: 1px solid rgba(0,0,0,0.12);
          background: rgba(255,255,255,0.95);
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          font-weight: 900;
          letter-spacing: 0.08em;
          font-size: 14px;
          z-index: 10000;
          animation: toast 1200ms ease-out;
        }

        .bar {
          position: relative;
          overflow: hidden;
        }
          /* Fluid progress fill (animate the filled part, not the whole container) */
.fillGreen {
  position: relative;
  height: 100%;
  border-radius: 10px;
  background: linear-gradient(90deg, #2e7d32, #66bb6a, #2e7d32);
  background-size: 200% 100%;
  animation: barFlow 1.8s linear infinite;
  transition: width 420ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: width;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.18), 0 6px 16px rgba(76,175,80,0.25);
}
.fillGreen::before {
  content: "";
  position: absolute;
  right: -10px;
  top: 0;
  width: 20px;
  height: 100%;
  background: radial-gradient(circle at left, rgba(255,255,255,0.38), transparent 62%);
  filter: blur(2px);
  opacity: 0.75;
  pointer-events: none;
}

.fillGreen::after {
  content: "";
  position: absolute;
  top: 0;
  left: -60px;
  width: 60px;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
  animation: glossSweep 1.9s ease-in-out infinite;
  opacity: 0.7;
  pointer-events: none;
}

@keyframes barFlow {
  0% { background-position: 0% 50%; }
  100% { background-position: 100% 50%; }
}

@keyframes glossSweep {
  0% { left: -60px; opacity: 0.0; }
  20% { opacity: 0.55; }
  100% { left: calc(100% + 60px); opacity: 0.0; }
}
      `}</style>
      {toast && <div className="toast">{toast}</div>}
      {selectedSectionIdx === null && (
        <div>
          <h2 style={{ fontWeight: "600", fontSize: "28px", marginBottom: "20px", textAlign: "center" }}>
            Choose a Set Text
          </h2>

          {[
  { title: "Tales from Herodotus, Selections", start: 0, end: sections.length, remove: "" }
].map((group, groupIdx) => (
            <div key={groupIdx} style={{ marginBottom: "40px" }}>
              <h3 style={{ fontWeight: "500", fontSize: "24px", marginBottom: "15px", textAlign: "center" }}>
                {group.title}
              </h3>
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                justifyContent: "center",
                marginBottom: "30px"
              }}>
                {sections.slice(group.start, group.end).map((section, idx) => (
                  <button
                    key={group.start + idx}
                    onClick={() => setSelectedSectionIdx(group.start + idx)}
                    style={{
                      padding: "12px 20px",
                      backgroundColor: "#f0f0f0",
                      border: "1px solid #ccc",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "16px",
                      minWidth: "150px",
                      textAlign: "center"
                    }}
                  >
                    {`${group.start + idx + 1}`}
                  </button>
                ))}
              </div>
              <div style={{ textAlign: "center", marginTop: "20px" }}>
                <p><strong>Section Mapping:</strong></p>
                <p>1 = XI (a): First capture of Babylon by Cyrus: Part one</p>
                <p>2 = XI (a): First capture of Babylon by Cyrus: Part two</p>
                <p>3 = XI (b): XI (a): First capture of Babylon by Cyrus: Part three</p>
                <p>4 = XI (c): XII: Rebuff to Darius for disturbing the tomb of Queen Nitocris</p>
                <p>5 = XIII: The Babylonian wife market</p>
                <p>6 = XIV (b): How Megacles was chosen by Cleisthenes as the best match for his daughter: Part one</p>
                <p>7 = XIV (b): How Megacles was chosen by Cleisthenes as the best match for his daughter: Part two</p>
                <p>8 = XIV (b): How Megacles was chosen by Cleisthenes as the best match for his daughter: Part three</p>
                {/* Add more lines as needed */}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedSectionIdx !== null && selectedLineIdx === null && !practiceAll && (
        <div>
          <h2 style={{ fontWeight: "600", fontSize: "24px", marginBottom: "20px" }}>
            Choose a Line
          </h2>
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            justifyContent: "center",
            marginBottom: "30px"
          }}>
            <button
              onClick={() => {
                const randomIdx = Math.floor(Math.random() * sections[selectedSectionIdx].groups.length);
                setSelectedLineIdx(randomIdx);
                setUserWords([]);
                setCurrentWord("");
                setFeedback("");
                setMistakes(0);
              }}
              style={{
                padding: "12px 20px",
                backgroundColor: "#d0e0ff",
                border: "1px solid #8ba6d9",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "16px",
                minWidth: "150px",
                textAlign: "center"
              }}
            >
              Random Practice Set
            </button>

            <button
              onClick={() => {
                setPracticeAll(true);
                setUserWords([]);
                setCurrentWord("");
                setFeedback("");
                setMistakes(0);
              }}
              style={{
                padding: "12px 20px",
                backgroundColor: "#d0ffd0",
                border: "1px solid #8bc34a",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "16px",
                minWidth: "150px",
                textAlign: "center"
              }}
            >
              Practice All Lines
            </button>

            {sections[selectedSectionIdx].groups.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedLineIdx(idx);
                  setUserWords([]);
                  setCurrentWord("");
                  setFeedback("");
                  setMistakes(0);
                }}
                style={{
                  padding: "12px 20px",
                  backgroundColor: "#f0f0f0",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "16px",
                  minWidth: "100px",
                  textAlign: "center"
                }}
              >
                {sections[selectedSectionIdx].groups[idx].label || `Practice set ${idx + 1}`}
              </button>
            ))}
          </div>
          <button
            onClick={handleStartOver}
            style={{
              marginTop: "10px",
              padding: "10px 16px",
              backgroundColor: "#ffe0e0",
              border: "1px solid #ffaaaa",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            Start Over
          </button>
        </div>
      )}

      {(selectedLineIdx !== null || practiceAll) && (
        <div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <button
            onClick={handleStartOver}
            style={{
              padding: "10px 16px",
              backgroundColor: "#ffe0e0",
              border: "1px solid #ffaaaa",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            Start Over
          </button>
 
          <button
            onClick={() => {
              setSelectedLineIdx(null);
              setPracticeAll(false);
              setUserWords([]);
              setCurrentWord("");
              setFeedback("");
              setMistakes(0);
            }}
            style={{
              padding: "10px 16px",
              backgroundColor: "#e0f7fa",
              border: "1px solid #00bcd4",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            Choose Another Line
          </button>
          
          <button
            onClick={handleResetMistakes}
            style={{
              padding: "10px 16px",
              backgroundColor: "#e8d0ff",
              border: "1px solid #c08be9",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            Reset Mistakes
          </button>
          <button
            onClick={() => {
              if (selectedLineIdx !== null || practiceAll) {
                setUserWords([]);
                setCurrentWord("");
                setFeedback("");
              }
            }}
            style={{
              padding: "10px 16px",
              backgroundColor: "#ffe8cc",
              border: "1px solid #ffb74d",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            Retry This Line
          </button>
          {selectedLineIdx !== null && !practiceAll && (
            <>
              <button
                onClick={() => {
                  const nextIdx = selectedLineIdx + 1;
                  if (nextIdx < sections[selectedSectionIdx].groups.length) {
                    setSelectedLineIdx(nextIdx);
                    setUserWords([]);
                    setCurrentWord("");
                    setFeedback("");
                    setMistakes(0);
                    setMistakePositions([]);
                  }
                }}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "#e0ffe0",
                  border: "1px solid #66bb6a",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                Next Practice Set
              </button>
              <button
                onClick={() => {
                  const randomIdx = Math.floor(Math.random() * sections[selectedSectionIdx].groups.length);
                  setSelectedLineIdx(randomIdx);
                  setUserWords([]);
                  setCurrentWord("");
                  setFeedback("");
                  setMistakes(0);
                  setMistakePositions([]);
                }}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "#e0f7ff",
                  border: "1px solid #4fc3f7",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                Random Practice Set
              </button>
            </>
          )}
          </div>

          <div style={{ display: "flex", gap: "20px", alignItems: "start" }}>
            <div style={{ flex: 1 }}>
              <h2>Greek:</h2>
              {practiceAll && sectionImages[sections[selectedSectionIdx].label] ? (
                <img
                  src={sectionImages[sections[selectedSectionIdx].label]}
                  alt="Greek passage"
                  style={{
                    width: "100%",
                    margin: "0 auto",
                    display: "block",
                    maxWidth: "800px",
                    borderRadius: "10px",
                  }}
                />
              ) : (
                <div
                  style={{
                    background: "#f9f9f9",
                    padding: "15px",
                    borderRadius: "8px",
                    fontSize: "20px",
                    whiteSpace: "pre-wrap",
                    wordWrap: "break-word",
                    marginBottom: "20px",
                    fontFamily: "serif",
                    textAlign: "center",
                    lineHeight: "1.8"
                  }}
                  dangerouslySetInnerHTML={{ __html: formatGreek() }}
                />
              )}
            </div>

            <div style={{ flex: 1 }}>
              <h2>Your Translation:</h2>
              <div style={{
                background: "#f9f9f9",
                padding: "15px",
                minHeight: "100px",
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
                borderRadius: "8px",
                fontSize: "16px",
                fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
              }}>
                {userWords.map((word, idx) => (
                  <span
                    key={idx}
                    style={{
                      backgroundColor: mistakePositions.includes(idx) ? "#ffcccc" : "transparent",
                      padding: "2px 4px",
                      borderRadius: "4px",
                      marginRight: "2px",
                      display: "inline-block"
                    }}
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <input
            ref={inputRef}
            className={shakeInput ? "shake" : ""}
            type="text"
            placeholder="Type next English word, then space..."
            value={currentWord}
            onChange={handleTyping}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "16px",
              marginTop: "10px",
              borderRadius: "6px",
              border: "1px solid #ccc"
            }}
          />

          <div style={{ marginTop: "15px" }}>
            <button onClick={handleHint} style={{
              marginRight: "10px",
              padding: "10px 16px",
              backgroundColor: "#e0e0e0",
              border: "1px solid #bbb",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "15px"
            }}>
              Hint
            </button>
            <button onClick={handleRevealWord} style={{
              marginRight: "10px",
              padding: "10px 16px",
              backgroundColor: "#fce4ec",
              border: "1px solid #f06292",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "15px"
            }}>
              Reveal Word
            </button>
            <div className="hud" style={{ width: "100%" }}>
              <div className="statCard">
                <span className="label">Mistakes</span>
                <span className={`value ${mistakes > 0 ? "valuePop" : ""}`}>{mistakes}</span>
              </div>

              <div className="statCard">
                <span className="label">Streak</span>
                <span className="value">
                  <span className="flame" style={{ animationDuration: `${flameSpeedMs}ms` }}>🔥</span>
                  <span className={streak > 0 ? "valuePop" : ""}>{streak}</span>
                  <span style={{ fontSize: "14px", fontWeight: 700, marginLeft: "8px", color: "rgba(0,0,0,0.55)" }}>
                    Best {bestStreak}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <p style={{ marginTop: "12px", fontSize: "18px", fontWeight: "600" }}>
            {feedback}
          </p>

          <div className="bar" style={{
            background: "#ddd",
            height: "20px",
            width: "100%",
            marginTop: "25px",
            borderRadius: "10px",
            overflow: "hidden"
          }}>
            <div
  className="fillGreen"
  style={{ width: `${progress}%` }}
></div>
          </div>

          <p style={{ textAlign: "center", marginTop: "8px", fontSize: "14px" }}>
            {progress}% complete
          </p>
          <div className="bar" style={{
            background: "#ddd",
            height: "14px",
            width: "100%",
            marginTop: "10px",
            borderRadius: "10px",
            overflow: "hidden"
          }}>
            <div style={{
              height: "100%",
              background: "#2196f3",
              width: `${accuracy}%`,
              transition: "width 0.4s ease",
              borderRadius: "10px"
            }}></div>
          </div>

          <p style={{ textAlign: "center", marginTop: "6px", fontSize: "14px" }}>
            {accuracy}% accuracy
          </p>
          <div className="hud" style={{ marginTop: "12px" }}>
            <div className="statCard">
              <span className="label">Grade</span>
              <span className={`gradeBadge ${gradePulse ? "gradePulse" : ""} ${grade === "S" ? "gradeS" : grade === "A" ? "gradeA" : grade === "B" ? "gradeB" : "gradeC"}`}>{grade}</span>
            </div>

            <div className="statCard">
              <span className="label">Level</span>
              <span className="value">{level}</span>
            </div>

            <div className="statCard">
              <span className="label">XP</span>
              <span className={`value xpText ${xp > 0 ? "valuePop" : ""}`}>{xp}</span>
            </div>
          </div>
          <div style={{
            marginTop: "10px",
            fontSize: "13px",
            color: "#555",
            textAlign: "center",
            lineHeight: "1.4"
          }}>
            <strong>Grade key:</strong> S = 100% accuracy, no mistakes · A ≥ 95% · B ≥ 85% · C &lt; 85%
          </div>
          <div style={{
            marginTop: "6px",
            fontSize: "13px",
            color: "#555",
            textAlign: "center",
            lineHeight: "1.4"
          }}>
            <strong>XP system:</strong> +1 XP per correct word · −5 XP per reveal · Levels increase every 200 XP
          </div>
          {sections[selectedSectionIdx].styleNotes && (
            <div style={{ marginTop: "20px", textAlign: "center" }}>
              <button
                onClick={() => setShowNotes((prev) => !prev)}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "#d9f0ff",
                  border: "1px solid #90caf9",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                {showNotes ? "Hide Style Notes" : "Show Style Notes"}
              </button>
            </div>
          )}
          
          {showNotes && sections[selectedSectionIdx].styleNotes && (
            <div style={{
              backgroundColor: "#f0f8ff",
              padding: "20px",
              borderRadius: "8px",
              marginTop: "20px",
              fontSize: "15px",
              lineHeight: "1.6"
            }}>
              <h3 style={{ textAlign: "center", marginBottom: "15px" }}>📜 Style Notes:</h3>
              <ul>
                {sections[selectedSectionIdx].styleNotes.map((note, idx) => (
                  <li key={idx} style={{ marginBottom: "10px" }}>
                    <strong>{note.quote}</strong>: {note.technique}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {showFinishedPopup && (
            <div style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.6)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 9999
            }}>
              <div style={{
                background: "#fff",
                padding: "30px 50px",
                borderRadius: "10px",
                textAlign: "center",
                boxShadow: "0 0 20px rgba(0,0,0,0.3)"
              }}>
                <h2 style={{ marginBottom: "20px" }}>🎉 You're finished! Great work!</h2>
                <button
                  onClick={() => setShowFinishedPopup(false)}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#4caf50",
                    color: "white",
                    fontSize: "16px",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer"
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


