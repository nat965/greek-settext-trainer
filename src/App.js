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

function idxToLetters(n) {
  // 0 -> A, 1 -> B, ... 25 -> Z, 26 -> AA, etc.
  let s = "";
  let x = n;
  while (x >= 0) {
    s = String.fromCharCode((x % 26) + 65) + s;
    x = Math.floor(x / 26) - 1;
  }
  return s;
}

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
  const [darkMode, setDarkMode] = useState(false);
  // Practice mode: "word" or "full"
  const [practiceMode, setPracticeMode] = useState("word");
  const [fullTranslationInput, setFullTranslationInput] = useState("");
  const [fullTranslationResult, setFullTranslationResult] = useState(null);
  const [selectedGloss, setSelectedGloss] = useState(null);

  const inputRef = useRef(null);
  const prevGradeRef = useRef(null);
  const prevLevelRef = useRef(null);

  const normalize = (str) =>
    str.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[.,;:!?()]/g, "")
      .toLowerCase()
      .trim();

  const FULL_MODE_STOPWORDS = new Set([
    "a", "an", "the", "and", "but", "or", "for", "nor", "so", "yet",
    "to", "of", "in", "on", "at", "by", "with", "from", "into", "onto",
    "up", "down", "over", "under", "through", "before", "after", "when",
    "while", "as", "that", "which", "who", "whom", "this", "these", "those",
    "is", "was", "were", "be", "been", "being", "am", "are",
    "do", "does", "did", "has", "have", "had", "will", "would", "shall", "should",
    "i", "me", "my", "you", "your", "he", "him", "his", "she", "her", "they", "them", "their",
    "we", "us", "our", "it", "its", "not"
  ]);

  const FULL_MODE_CANONICAL_MAP = {
    dear: "dear",
    dearest: "dear",
    beloved: "dear",
    sweet: "sweet",
    sweetsmelling: "sweet",
    fragrant: "sweet",
    smelling: "sweet",
    home: "house",
    house: "house",
    maid: "maid",
    maids: "maid",
    servant: "maid",
    servants: "maid",
    task: "work",
    tasks: "work",
    work: "work",
    works: "work",
    labor: "work",
    labour: "work",
    loom: "loom",
    spindle: "spindle",
    man: "man",
    men: "man",
    husband: "husband",
    wife: "wife",
    child: "son",
    son: "son",
    babe: "son",
    baby: "son",
    war: "war",
    battle: "war",
    fighting: "war",
    fate: "fate",
    doom: "fate",
    destiny: "fate",
    hades: "hades",
    ilium: "ilium",
    troy: "ilium",
    pity: "pity",
    pitied: "pity",
    grieve: "grieve",
    despair: "grieve",
    mourn: "grieve",
    weep: "grieve",
    weeping: "grieve",
    crying: "grieve",
    said: "say",
    say: "say",
    spoke: "say",
    speaking: "say",
    declared: "say",
    declare: "say",
    escaped: "escape",
    escape: "escape",
    fled: "escape",
    return: "return",
    returned: "return",
    come: "return",
    came: "return",
    go: "go",
    went: "go",
    look: "look",
    attend: "look",
    see: "look",
    saw: "look",
    order: "order",
    tell: "order",
    command: "order",
    stroke: "stroke",
    stroked: "stroke",
    touched: "stroke",
    hand: "hand"
  };

  function canonicalizeFullModeWord(word) {
    const normalized = normalize(word).replace(/'/g, "");
    return FULL_MODE_CANONICAL_MAP[normalized] || normalized;
  }

  function isFullModeContentWord(word) {
    const canonical = canonicalizeFullModeWord(word);
    return canonical && !FULL_MODE_STOPWORDS.has(canonical);
  }

  // --- Full translation helpers ---
  function getTargetText() {
    if (selectedSectionIdx === null) return "";
    if (practiceAll) {
      return sections[selectedSectionIdx].groups.map(g => g.english.join(" ")).join(" ");
    }
    return sections[selectedSectionIdx].groups[selectedLineIdx]?.english.join(" ") || "";
  }
  function getTargetWords() {
    return getTargetText().trim().split(/\s+/);
  }
  function evaluateFullTranslation() {
    const targetWords = getTargetWords();
    const typedWords = fullTranslationInput.trim() ? fullTranslationInput.trim().split(/\s+/) : [];

    const typedMeta = typedWords.map((word, idx) => ({
      original: word,
      normalized: normalize(word),
      canonical: canonicalizeFullModeWord(word),
      idx,
      used: false
    }));

    const wordResults = [];
    let matchedContentWords = 0;
    let totalContentWords = 0;

    for (let i = 0; i < targetWords.length; i++) {
      const expectedOriginal = targetWords[i];
      const expectedNormalized = normalize(expectedOriginal);
      const expectedCanonical = canonicalizeFullModeWord(expectedOriginal);
      const isContentWord = isFullModeContentWord(expectedOriginal);

      if (isContentWord) totalContentWords += 1;

      let matchIndex = -1;

      for (let j = 0; j < typedMeta.length; j++) {
        if (typedMeta[j].used) continue;

        const exactMatch = typedMeta[j].normalized === expectedNormalized;
        const closeSpellingMatch = typedMeta[j].normalized && expectedNormalized && levenshtein(typedMeta[j].normalized, expectedNormalized) <= 1;
        const canonicalMatch = typedMeta[j].canonical === expectedCanonical;

        if (exactMatch || closeSpellingMatch || canonicalMatch) {
          matchIndex = j;
          break;
        }
      }

      const matchedWord = matchIndex >= 0 ? typedMeta[matchIndex] : null;
      if (matchedWord) typedMeta[matchIndex].used = true;

      const isCorrect = Boolean(matchedWord) || !isContentWord;

      if (Boolean(matchedWord) && isContentWord) {
        matchedContentWords += 1;
      }

      wordResults.push({
        correct: isCorrect,
        expected: expectedOriginal,
        actual: matchedWord ? matchedWord.original : null,
        isContentWord
      });
    }

    const extraWords = typedMeta.filter(word => !word.used && isFullModeContentWord(word.original));
    const mistakes = Math.max(totalContentWords - matchedContentWords, 0) + extraWords.length;
    const accuracy = totalContentWords === 0 ? 100 : Math.round((matchedContentWords / totalContentWords) * 100);

    let grade = "C";
    if (accuracy === 100 && mistakes === 0) grade = "S";
    else if (accuracy >= 95) grade = "A";
    else if (accuracy >= 85) grade = "B";

    setFullTranslationResult({
      correct: matchedContentWords,
      total: totalContentWords,
      accuracy,
      grade,
      mistakes,
      wordResults,
      extraWords: extraWords.map(word => word.original)
    });
    setFeedback(`Marked: ${accuracy}% accuracy`);
  }

  const handleTyping = (e) => {
    const value = e.target.value;
    setCurrentWord(value);
    if (selectedSectionIdx === null) return;
    const targetWords = getTargetWords();
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
    const targetWords = getTargetWords();
    if (userWords.length < targetWords.length) {
      const firstLetter = targetWords[userWords.length][0];
      setFeedback(`Hint: starts with "${firstLetter}"`);
    }
  };

  const handleRevealWord = () => {
    if (selectedSectionIdx === null) return;
    const targetWords = getTargetWords();
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
    setPracticeMode("word");
    setFullTranslationInput("");
    setFullTranslationResult(null);
    setSelectedGloss(null);
  };
  
  const handleResetMistakes = () => {
    setMistakes(0);
    setMistakePositions([]);
  };

  const progress = (() => {
    if (selectedSectionIdx === null) return 0;
    if (!sections[selectedSectionIdx]) return 0;
    const totalWords = getTargetWords().length;
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

  // Group sections into prose and verse sets for selection screen
  const groupedSets = (() => {
    const prose = [];
    const verse = [];

    sections.forEach((section, idx) => {
      const t = section.type || "prose";
      if (t === "verse") verse.push({ idx, section });
      else prose.push({ idx, section });
    });

    const proseItems = prose.map((item, i) => ({
      ...item,
      buttonLabel: item.section.buttonLabel || String(i + 1),
    }));

    const verseItems = verse.map((item, i) => ({
      ...item,
      buttonLabel: item.section.buttonLabel || idxToLetters(i),
    }));

    const groups = [];
    if (proseItems.length) groups.push({ title: "Prose", items: proseItems });
    if (verseItems.length) groups.push({ title: "Verse", items: verseItems });
    return groups;
  })();

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

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [darkMode]);

  const cleanGreekToken = (token) =>
    token
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[.,;:!?··'’"“”()]/g, "")
      .toLowerCase()
      .trim();

  const getCurrentWordData = () => {
    if (selectedSectionIdx === null) return [];

    if (practiceAll) {
      return sections[selectedSectionIdx].groups.flatMap(group =>
        Array.isArray(group.wordData) ? group.wordData : []
      );
    }

    const group = sections[selectedSectionIdx].groups[selectedLineIdx];
    return Array.isArray(group?.wordData) ? group.wordData : [];
  };

  const renderGreekContent = () => {
    if (selectedSectionIdx === null) return null;

    const groupsToRender = practiceAll
      ? sections[selectedSectionIdx].groups
      : [sections[selectedSectionIdx].groups[selectedLineIdx]];

    const wordData = getCurrentWordData();
    const glossMap = new Map();

    wordData.forEach((entry) => {
      const key = cleanGreekToken(entry.greek || "");
      if (key && !glossMap.has(key)) {
        glossMap.set(key, entry.gloss);
      }
    });

    return groupsToRender.map((group, groupIdx) => (
      <div key={groupIdx} style={{ marginBottom: practiceAll ? "14px" : 0 }}>
        {group.greek.map((line, lineIdx) => (
          <div key={lineIdx} style={{ marginBottom: "6px" }}>
            {line.split(/(\s+)/).map((part, partIdx) => {
              if (/^\s+$/.test(part)) {
                return <span key={partIdx}>{part}</span>;
              }

              const cleaned = cleanGreekToken(part);
              const gloss = glossMap.get(cleaned);
              const isActive =
                selectedGloss?.greek === part && selectedGloss?.gloss === gloss;

              if (!gloss) {
                return <span key={partIdx}>{part}</span>;
              }

              return (
                <span
                  key={partIdx}
                  onClick={() => setSelectedGloss({ greek: part, gloss })}
                  title="Click to show gloss"
                  style={{
                    cursor: "pointer",
                    borderBottom: "2px dotted #90caf9",
                    backgroundColor: isActive ? "#e3f2fd" : "transparent",
                    borderRadius: "4px",
                    padding: "1px 2px"
                  }}
                >
                  {part}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    ));
  };

  const getCurrentPracticeLabel = () => {
    if (selectedSectionIdx === null) return "";

    const section = sections[selectedSectionIdx];
    const groupInfo = groupedSets.find(group =>
      group.items.some(item => item.idx === selectedSectionIdx)
    );
    const matchedItem = groupInfo?.items.find(item => item.idx === selectedSectionIdx);

    const type = groupInfo?.title || (section.type === "verse" ? "Verse" : "Prose");
    const sectionName = matchedItem?.buttonLabel || section.buttonLabel || section.label || `Section ${selectedSectionIdx + 1}`;

    const totalSets = section.groups.length;

    if (practiceAll) {
      return `${type} · ${sectionName} · All Lines (${totalSets} sets)`;
    }

    if (selectedLineIdx !== null) {
      const group = section.groups[selectedLineIdx];
      const explicitGroupLabel = group?.label?.trim();
      const fallbackGroupLabel = type === "Prose"
        ? `Part ${selectedLineIdx + 1}`
        : `Practice Set ${selectedLineIdx + 1}`;
      const groupName = explicitGroupLabel || fallbackGroupLabel;

      const current = selectedLineIdx + 1;

      return `${type} · ${sectionName} · ${groupName} (${current}/${totalSets})`;
    }

    return `${type} · ${sectionName}`;
  };

  return (
    <div style={{
      padding: "30px",
      maxWidth: "900px",
      margin: "0 auto",
      fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
      lineHeight: "1.6",
      background: "var(--bg)",
      color: "var(--text)",
      minHeight: "100vh"
    }}>
      <style>{`
        :root {
          --bg: #ffffff;
          --text: #111111;
          --mutedText: rgba(0,0,0,0.55);
          --panel: #f9f9f9;
          --card: rgba(255,255,255,0.75);
          --border: rgba(0,0,0,0.12);
          --shadow: rgba(0,0,0,0.10);
          --inputBg: #ffffff;
        }

        .dark {
          --bg: #0f1115;
          --text: #e8e8e8;
          --mutedText: rgba(255,255,255,0.62);
          --panel: #171a21;
          --card: rgba(23,26,33,0.85);
          --border: rgba(255,255,255,0.14);
          --shadow: rgba(0,0,0,0.45);
          --inputBg: #0f1115;
        }

        body {
          background: var(--bg);
          color: var(--text);
        }

        .statCard {
          background: var(--card);
          border: 1px solid var(--border);
          box-shadow: 0 6px 18px var(--shadow);
        }

        .label {
          color: var(--mutedText);
        }

        .toast {
          background: rgba(255,255,255,0.95);
          border: 1px solid var(--border);
        }

        .dark .toast {
          background: rgba(23,26,33,0.96);
        }

        .panel {
          background: var(--panel);
          border: 1px solid var(--border);
        }

        .input {
          background: var(--inputBg);
          color: var(--text);
          border: 1px solid var(--border);
        }

        .toggleBtn {
          padding: 10px 14px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--card);
          cursor: pointer;
          font-size: 14px;
          font-weight: 800;
          color: var(--text);
        }
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
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
        <button
          className="toggleBtn"
          onClick={() => setDarkMode((d) => !d)}
          aria-label="Toggle dark mode"
        >
          {darkMode ? "☀️ Light" : "🌙 Dark"}
        </button>
      </div>
      {selectedSectionIdx === null && (
        <div>
          <h2 style={{ fontWeight: "600", fontSize: "28px", marginBottom: "20px", textAlign: "center" }}>
            Choose a Set Text
          </h2>

          {groupedSets.map((group, groupIdx) => (
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
                {group.items.map(({ idx, buttonLabel }) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedSectionIdx(idx)}
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
                    {buttonLabel}
                  </button>
                ))}
              </div>

              {/* Optional mapping text per group */}
              {group.title === "Prose" && (
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
                </div>
              )}

              {group.title === "Verse" && (
                <div style={{ textAlign: "center", marginTop: "20px" }}>
                  <p><strong>Verse Mapping:</strong></p>
                  <p>A = Lines 370-380: Hector arrives home and finds Andromache absent. He asks one of the enslaved women in his
                  household where his wife is.</p>
                  <p>B = Lines 381-391: One of the female workers in Hector's house informs him that Andromache has gone to the tower to
                  watch the battle.</p>
                  <p>C = Lines 392-403: Hector rushes off, back to the battle. He bumps into his wife and son as he is about to pass through
                  the gates.</p>
                  <p>D = Lines 404-413: Hector greets Astyanax, and Andromache starts her attempt to persuade Hector not to return to the
                  front line.</p>
                  <p>E = Lines 429-439: Andromache advises Hector to fight by the fig tree.</p>
                  <p>F = Lines 440-449: Hector replies to Andromache, outlining that he is motivated by his desire to avoid shame and win glory.</p>
                  <p>G = Lines 450-461: Hector explains that his main motivation is to protect Andromache from being enslaved.</p>
                  <p>H = Lines 462-470: Hector finishes his prediction of Andromache's future and picks up Astyanax, who is frightened by his
                  father's helmet.</p>
                  <p>I = Lines 471-481: A warm and familial moment. Hector and Andromache laugh. Hector removes his helmet and prays
                  to Zeus.</p>
                  <p>J = Lines 482-493: Hector has accepted that he cannot avoid his fate. He tells Andromache to go back to her domestic tasks.</p>
                  <p>K = Lines 494-502: Hector puts his helmet back on and returns to battle. The women begin their lamenting in his absence.</p>
                  {/* Fill these in like your prose mapping */}
                </div>
              )}
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
                setPracticeMode("word");
                setFullTranslationInput("");
                setFullTranslationResult(null);
                setSelectedGloss(null);
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
                setPracticeMode("word");
                setFullTranslationInput("");
                setFullTranslationResult(null);
                setSelectedGloss(null);
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
                  setPracticeMode("word");
                  setFullTranslationInput("");
                  setFullTranslationResult(null);
                  setSelectedGloss(null);
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
          <div
            className="panel"
            style={{
              padding: "12px 16px",
              borderRadius: "10px",
              marginBottom: "16px",
              textAlign: "center",
              fontSize: "18px",
              fontWeight: "700"
            }}
          >
            {getCurrentPracticeLabel()}
          </div>
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
              setPracticeMode("word");
              setFullTranslationInput("");
              setFullTranslationResult(null);
              setSelectedGloss(null);
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
                setFullTranslationInput("");
                setFullTranslationResult(null);
                setSelectedGloss(null);
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
                    setPracticeMode("word");
                    setFullTranslationInput("");
                    setFullTranslationResult(null);
                    setSelectedGloss(null);
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
                  setPracticeMode("word");
                  setFullTranslationInput("");
                  setFullTranslationResult(null);
                  setSelectedGloss(null);
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
                <>
                  <div
                    className="panel"
                    style={{
                      padding: "15px",
                      borderRadius: "8px",
                      fontSize: "20px",
                      whiteSpace: "pre-wrap",
                      wordWrap: "break-word",
                      marginBottom: "12px",
                      fontFamily: "serif",
                      textAlign: "center",
                      lineHeight: "1.8"
                    }}
                  >
                    {renderGreekContent()}
                  </div>
                  <div
                    className="panel"
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      marginBottom: "20px",
                      fontSize: "15px",
                      textAlign: "center",
                      minHeight: "24px"
                    }}
                  >
                    {selectedGloss ? (
                      <>
                        <strong>{selectedGloss.greek}</strong>: {selectedGloss.gloss}
                      </>
                    ) : (
                      <span style={{ opacity: 0.7 }}>Click a Greek word to see its English gloss.</span>
                    )}
                  </div>
                </>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <h2>Your Translation:</h2>
              <div className="panel" style={{
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

          {/* Mode switch buttons */}
          <div style={{ marginTop: "10px", marginBottom: "10px", display: "flex", gap: "10px" }}>
            <button
              onClick={() => setPracticeMode("word")}
              style={{
                padding: "10px 18px",
                borderRadius: "6px",
                border: "2px solid",
                borderColor: practiceMode === "word" ? "#2196f3" : "#ccc",
                background: practiceMode === "word" ? "#e3f2fd" : "#f0f0f0",
                fontWeight: practiceMode === "word" ? 700 : 400,
                cursor: "pointer"
              }}
              disabled={practiceMode === "word"}
            >
              Word by Word
            </button>
            <button
              onClick={() => setPracticeMode("full")}
              style={{
                padding: "10px 18px",
                borderRadius: "6px",
                border: "2px solid",
                borderColor: practiceMode === "full" ? "#2196f3" : "#ccc",
                background: practiceMode === "full" ? "#e3f2fd" : "#f0f0f0",
                fontWeight: practiceMode === "full" ? 700 : 400,
                cursor: "pointer"
              }}
              disabled={practiceMode === "full"}
            >
              Type Full Translation
            </button>
          </div>

          {practiceMode === "word" && (
            <>
              <input
                ref={inputRef}
                className={`${shakeInput ? "shake" : ""} input`}
                type="text"
                placeholder="Type next English word, then space..."
                value={currentWord}
                onChange={handleTyping}
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: "16px",
                  marginTop: "10px",
                  borderRadius: "6px"
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
            </>
          )}
          {practiceMode === "full" && (
            <div style={{ marginTop: "10px" }}>
              <textarea
                value={fullTranslationInput}
                onChange={e => setFullTranslationInput(e.target.value)}
                rows={4}
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: "16px",
                  borderRadius: "6px",
                  resize: "vertical"
                }}
                placeholder="Type your full English translation here. Full mode focuses more on content words than exact phrasing..."
              />
              <div>
                <button
                  onClick={evaluateFullTranslation}
                  style={{
                    marginTop: "8px",
                    padding: "10px 20px",
                    borderRadius: "6px",
                    backgroundColor: "#2196f3",
                    color: "#fff",
                    fontWeight: 700,
                    border: "none",
                    fontSize: "16px",
                    cursor: "pointer"
                  }}
                >
                  Mark Translation
                </button>
              </div>
            </div>
          )}

          <p style={{ marginTop: "12px", fontSize: "18px", fontWeight: "600" }}>
            {feedback}
          </p>

          {/* Full translation result panel */}
          {practiceMode === "full" && fullTranslationResult && (
            <div
              style={{
                marginTop: "16px",
                padding: "16px",
                background: "#f9fbe7",
                borderRadius: "8px",
                border: "1px solid #dce775"
              }}
            >
              <div style={{ fontSize: "17px", marginBottom: "6px" }}>
                <strong>Accuracy:</strong> {fullTranslationResult.accuracy}%<br />
                <strong>Grade:</strong> {fullTranslationResult.grade}<br />
                <strong>Content Words:</strong> {fullTranslationResult.correct} / {fullTranslationResult.total}<br />
                <strong>Mistakes:</strong> {fullTranslationResult.mistakes}
              </div>
              <div style={{ marginTop: "10px", fontFamily: "monospace", fontSize: "16px", lineHeight: "2", wordBreak: "break-word" }}>
                {fullTranslationResult.wordResults.map((res, idx) => {
                  if (!res.isContentWord) {
                    return (
                      <span
                        key={idx}
                        style={{ background: "#eeeeee", color: "#666", borderRadius: "4px", padding: "2px 5px", marginRight: "3px", opacity: 0.75 }}
                        title="Function word: not strictly marked in full-translation mode"
                      >
                        {res.expected}
                      </span>
                    );
                  }

                  if (res.correct) {
                    return (
                      <span key={idx} style={{ background: "#c8e6c9", color: "#222", borderRadius: "4px", padding: "2px 5px", marginRight: "3px" }}>
                        {res.expected}
                      </span>
                    );
                  } else if (res.actual) {
                    return (
                      <span
                        key={idx}
                        style={{ background: "#ffcdd2", color: "#222", borderRadius: "4px", padding: "2px 5px", marginRight: "3px" }}
                        title={`You wrote: ${res.actual}`}
                      >
                        {res.expected}
                      </span>
                    );
                  } else {
                    return (
                      <span
                        key={idx}
                        style={{ background: "#ffcdd2", color: "#222", borderRadius: "4px", padding: "2px 5px", marginRight: "3px", opacity: 0.7 }}
                        title="Missing content word"
                      >
                        {res.expected}
                      </span>
                    );
                  }
                })}
              </div>
              {fullTranslationResult.extraWords.length > 0 && (
                <div style={{ marginTop: "12px", fontSize: "14px" }}>
                  <strong>Extra words you added:</strong> {fullTranslationResult.extraWords.join(", ")}
                </div>
              )}
            </div>
          )}

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

          {practiceMode === "word" && showFinishedPopup && (
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


