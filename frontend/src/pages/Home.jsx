import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Loader2, BookOpen, Globe, Music, User } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Textarea } from '../components/ui/textarea'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { AnalysisResult } from '../components/AnalysisResult'


export function Home() {
  const [lyrics, setLyrics] = useState('')
  const [language, setLanguage] = useState('')
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const timerRef = useRef(null)

  const MAX_CHARS = 2000;
  const isOverLimit = lyrics.length > MAX_CHARS;

  useEffect(() => {
    if (loading) {
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setElapsedTime(0);
    }
    return () => clearInterval(timerRef.current);
  }, [loading]);

  const handleAnalyze = async () => {
    if (!lyrics.trim() || isOverLimit) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await axios.post(`/api/analyze`, {
        lyrics,
        language,
        title,
        artist
      })
      setResult(response.data)
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.detail || "Failed to analyze lyrics. Please try again.";
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight flex items-center justify-center gap-3">
          <Music className="w-10 h-10" />
          LyriStudy
        </h1>
        <p className="text-muted-foreground text-lg">
          Turn your favorite lyrics into language learning materials.
        </p>
      </header>

      {/* Input Section */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Input Lyrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Music className="w-4 h-4" />
                Song Title (Optional)
              </label>
              <Input 
                placeholder="Enter song title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                Artist (Optional)
              </label>
              <Input 
                placeholder="Enter artist name..."
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 space-y-1">
              <Textarea
                placeholder="Paste your lyrics here..."
                className="min-h-[200px] font-mono text-base"
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                disabled={loading}
              />
              <div className={`text-xs text-right ${isOverLimit ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                {lyrics.length} / {MAX_CHARS} characters
              </div>
            </div>
            <div className="w-48 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Language
                </label>
                <select 
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Auto (Detect)</option>
                  <option value="ja">Japanese (日本語)</option>
                  <option value="en">English</option>
                  <option value="ko">Korean (한국어)</option>
                  <option value="zh">Chinese (中文)</option>
                  <option value="fr">French (Français)</option>
                  <option value="es">Spanish (Español)</option>
                  <option value="de">German (Deutsch)</option>
                </select>
              </div>
              <Button 
                className="w-full" 
                onClick={handleAnalyze} 
                disabled={loading || !lyrics.trim() || isOverLimit}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing... ({elapsedTime}s)
                  </>
                ) : (
                  "Analyze"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-center">
          {error}
        </div>
      )}

      {/* Results Section */}
      <AnalysisResult result={result} />
    </div>
  )
}
