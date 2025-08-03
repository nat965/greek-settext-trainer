import { useState, useRef } from "react";
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

  const inputRef = useRef(null);

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
            <span style={{ fontSize: "14px", color: "#555" }}>
              Mistakes: {mistakes}
            </span>
          </div>

          <p style={{ marginTop: "12px", fontSize: "18px", fontWeight: "600" }}>
            {feedback}
          </p>

          <div style={{
            background: "#ddd",
            height: "20px",
            width: "100%",
            marginTop: "25px",
            borderRadius: "10px",
            overflow: "hidden"
          }}>
            <div style={{
              height: "100%",
              background: "#4caf50",
              width: `${progress}%`,
              transition: "width 0.4s ease",
              borderRadius: "10px"
            }}></div>
          </div>

          <p style={{ textAlign: "center", marginTop: "8px", fontSize: "14px" }}>
            {progress}% complete
          </p>
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


