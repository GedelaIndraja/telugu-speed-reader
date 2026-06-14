'use client';

import { useEffect, useState } from 'react';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type ProgressItem = {
  date: string;
  wpm: number;
  attempts: number;
};

export default function Home() {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [speed, setSpeed] = useState(300);

  const [playing, setPlaying] = useState(false);

  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const [startTime, setStartTime] = useState<number | null>(null);

  const [readingTime, setReadingTime] = useState(0);

  const [wpm, setWpm] = useState(0);

  const [monthlyProgress, setMonthlyProgress] = useState<ProgressItem[]>([]);

  const [streak, setStreak] = useState(0);

  // LOAD SAVED DATA
  useEffect(() => {
    try {
      const savedProgress = localStorage.getItem('monthlyProgress');

      const savedStreak = localStorage.getItem('readingStreak');

      if (savedProgress) {
        const parsed = JSON.parse(savedProgress);

        if (Array.isArray(parsed)) {
          setMonthlyProgress(parsed);
        }
      }

      if (savedStreak) {
        setStreak(Number(savedStreak));
      }
    } catch (error) {
      console.log(error);

      localStorage.clear();
    }
  }, []);

  // READING ENGINE
  useEffect(() => {
    let timer: any;

    if (playing && words.length > 0) {
      const currentWord = words[index];

      // SPEAK FUNCTION
      const speakWord = async () => {
        if (!voiceEnabled || !currentWord) {
          moveNext();
          return;
        }

        window.speechSynthesis.cancel();

        const speech = new SpeechSynthesisUtterance(currentWord);

        // Telugu voice settings
        speech.lang = 'te-IN';

        speech.rate = 0.8;

        speech.pitch = 1.2;

        speech.volume = 1;

        // SELECT SOFT VOICE
        const voices = window.speechSynthesis.getVoices();

        const femaleVoice = voices.find(
          (voice) =>
            voice.lang.includes('en-IN') || voice.lang.includes('te-IN')
        );

        if (femaleVoice) {
          speech.voice = femaleVoice;
        }

        speech.onend = () => {
          moveNext();
        };

        window.speechSynthesis.speak(speech);
      };

      // MOVE NEXT WORD
      const moveNext = () => {
        timer = setTimeout(() => {
          setIndex((prev) => {
            if (prev < words.length - 1) {
              return prev + 1;
            } else {
              finishReading();
              return prev;
            }
          });
        }, speed);
      };

      speakWord();
    }

    return () => {
      clearTimeout(timer);

      window.speechSynthesis.cancel();
    };
  }, [playing, index, voiceEnabled, words, speed]);

  // START
  const startReading = () => {
    const splitWords = text.split(/\s+/).filter((word) => word.length > 0);

    setWords(splitWords);

    // restart from beginning
    setIndex(0);

    setPlaying(true);

    setStartTime(Date.now());
  };

  // FINISH
  const finishReading = () => {
    setPlaying(false);

    if (startTime) {
      const totalSeconds = (Date.now() - startTime) / 1000;

      setReadingTime(totalSeconds);

      const calculatedWpm = Math.round(words.length / (totalSeconds / 60));

      setWpm(calculatedWpm);

      const today = new Date().toLocaleDateString();

      const savedProgress = JSON.parse(
        localStorage.getItem('monthlyProgress') || '[]'
      );

      const existingIndex = savedProgress.findIndex(
        (item: ProgressItem) => item.date === today
      );

      if (existingIndex !== -1) {
        const oldWpm = savedProgress[existingIndex].wpm;

        const attempts = savedProgress[existingIndex].attempts || 1;

        // AVERAGE TODAY
        const averageWpm = Math.round(
          (oldWpm * attempts + calculatedWpm) / (attempts + 1)
        );

        savedProgress[existingIndex] = {
          date: today,
          wpm: averageWpm,
          attempts: attempts + 1,
        };
      } else {
        savedProgress.push({
          date: today,
          wpm: calculatedWpm,
          attempts: 1,
        });
      }

      const updatedProgress = savedProgress.slice(-30);

      setMonthlyProgress(updatedProgress);

      localStorage.setItem('monthlyProgress', JSON.stringify(updatedProgress));

      // STREAK
      const updatedStreak = streak + 1;

      setStreak(updatedStreak);

      localStorage.setItem('readingStreak', updatedStreak.toString());
    }

    // RESET
    setIndex(0);
  };

  // FILE UPLOAD
  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      const content = await file.text();

      setText(content);
    }
  };

  // LOAD ARTICLE
  const loadFromLink = async () => {
    try {
      const response = await fetch(url);

      const html = await response.text();

      const parser = new DOMParser();

      const doc = parser.parseFromString(html, 'text/html');

      const paragraphs = Array.from(doc.querySelectorAll('p'))
        .map((p) => p.textContent)
        .filter(Boolean);

      const articleText = paragraphs.join(' ');

      const teluguOnly = articleText
        .replace(/[^\u0C00-\u0C7F\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const sentences = teluguOnly
        .split('।')
        .map((s) => s.trim())
        .filter((s) => s.length > 20);

      const uniqueSentences = Array.from(new Set(sentences));

      setText(uniqueSentences.join('। '));

      setWords([]);
      setIndex(0);
      setPlaying(false);
    } catch (error) {
      alert('Unable to load article');
    }
  };

  // LEVEL
  const improvementLevel = () => {
    if (wpm < 100) return 'Beginner';

    if (wpm < 200) return 'Intermediate';

    return 'Advanced';
  };

  // CHART
  const chartData = {
    labels: monthlyProgress.map((item) => item.date),

    datasets: [
      {
        label: 'Average Reading WPM',
        data: monthlyProgress.map((item) => item.wpm),
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56,189,248,0.2)',
        tension: 0.4,
      },
    ],
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0f172a',
        color: 'white',
        padding: '40px',
        fontFamily: 'Arial',
      }}
    >
      <div
        style={{
          maxWidth: '1000px',
          margin: 'auto',
        }}
      >
        <h1
          style={{
            textAlign: 'center',
            fontSize: '48px',
            marginBottom: '10px',
          }}
        >
          📖 AI Telugu Reading Coach
        </h1>

        <p
          style={{
            textAlign: 'center',
            color: '#94a3b8',
            marginBottom: '30px',
          }}
        >
          Improve Telugu reading speed daily
        </p>

        {/* URL */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}
        >
          <input
            type="text"
            placeholder="Paste newspaper/article URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={inputStyle}
          />

          <button onClick={loadFromLink} style={buttonStyle('#f59e0b')}>
            Load Link
          </button>
        </div>

        {/* TEXT */}
        <textarea
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste Telugu content..."
          style={{
            width: '100%',
            padding: '20px',
            borderRadius: '12px',
            border: 'none',
            fontSize: '18px',
            background: '#1e293b',
            color: 'white',
          }}
        />

        {/* BUTTONS */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            marginTop: '20px',
            flexWrap: 'wrap',
          }}
        >
          <button onClick={startReading} style={buttonStyle('#22c55e')}>
            ▶ Start
          </button>

          <button
            onClick={() => setPlaying((prev) => !prev)}
            style={buttonStyle('#ef4444')}
          >
            {playing ? '⏸ Pause' : '▶ Resume'}
          </button>

          <button
            onClick={() => setVoiceEnabled((prev) => !prev)}
            style={buttonStyle('#14b8a6')}
          >
            {voiceEnabled ? '🔊 Voice ON' : '🔇 Voice OFF'}
          </button>

          <button
            onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
            style={buttonStyle('#f97316')}
          >
            ⬅ Back
          </button>

          <button
            onClick={() => setSpeed(speed + 100)}
            style={buttonStyle('#3b82f6')}
          >
            Slow
          </button>

          <button
            onClick={() => setSpeed(Math.max(100, speed - 100))}
            style={buttonStyle('#8b5cf6')}
          >
            Fast
          </button>

          <input type="file" accept=".txt" onChange={uploadFile} />
        </div>

        {/* WORD */}
        <div
          style={{
            marginTop: '80px',
            textAlign: 'center',
            fontSize: '72px',
            fontWeight: 'bold',
            color: '#38bdf8',
            minHeight: '120px',
          }}
        >
          {words[index]}
        </div>

        {/* SPEED */}
        <div
          style={{
            marginTop: '40px',
            textAlign: 'center',
            color: '#cbd5e1',
            fontSize: '20px',
          }}
        >
          Speed: {speed} ms per word
        </div>

        {/* ANALYTICS */}
        <div
          style={{
            marginTop: '40px',
            background: '#1e293b',
            padding: '20px',
            borderRadius: '12px',
          }}
        >
          <h2>📊 Reading Analytics</h2>

          <p>Total Words: {words.length}</p>

          <p>Reading Time: {readingTime.toFixed(1)} seconds</p>

          <p>Reading Speed: {wpm} WPM</p>

          <p>Level: {improvementLevel()}</p>

          <p>🔥 Daily Streak: {streak}</p>
        </div>

        {/* GRAPH */}
        <div
          style={{
            marginTop: '30px',
            background: '#1e293b',
            padding: '20px',
            borderRadius: '12px',
          }}
        >
          <h2>📈 30 Day Progress</h2>

          <Line data={chartData} />
        </div>
      </div>
    </main>
  );
}

function buttonStyle(color: string) {
  return {
    background: color,
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
  };
}

const inputStyle = {
  flex: 1,
  padding: '14px',
  borderRadius: '10px',
  border: 'none',
  fontSize: '16px',
  background: '#1e293b',
  color: 'white',
};
