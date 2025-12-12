import { createContext, useContext, useState, useRef, useEffect } from 'react';
import axios from 'axios';

const AnalysisContext = createContext();

export const useAnalysis = () => useContext(AnalysisContext);

export const AnalysisProvider = ({ children }) => {
  const [lyrics, setLyrics] = useState('');
  const [language, setLanguage] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  // Timer related
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Effect to handle timer when loading state changes (persists across re-renders)
  useEffect(() => {
    if (loading) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now() - (elapsedTime * 1000);
      }
      
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      startTimeRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [loading]);

  const handleAnalyze = async () => {
    if (!lyrics.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setElapsedTime(0);
    startTimeRef.current = Date.now();

    try {
      const response = await axios.post(`/api/analyze`, {
        lyrics,
        language,
        title,
        artist
      });
      setResult(response.data);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || "Failed to analyze lyrics. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    lyrics, setLyrics,
    language, setLanguage,
    title, setTitle,
    artist, setArtist,
    loading,
    result, setResult,
    error, setError,
    elapsedTime,
    handleAnalyze
  };

  return (
    <AnalysisContext.Provider value={value}>
      {children}
    </AnalysisContext.Provider>
  );
};
