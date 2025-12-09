import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Loader2, Music, BookOpen, Globe, PenTool, User } from 'lucide-react'
import { Button } from './components/ui/button'
import { Textarea } from './components/ui/textarea'
import { Input } from './components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { cn } from './lib/utils'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Home } from './pages/Home'
import { History } from './pages/History'
import { SongDetail } from './pages/SongDetail'
import { Vocabulary } from './pages/Vocabulary'
import { Toaster } from './components/ui/sonner'

// API Base URL from environment variable or default
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
        <Navbar />
        <main className="flex-1 p-4 sm:p-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/history" element={<History />} />
            <Route path="/song/:id" element={<SongDetail />} />
            <Route path="/vocabulary" element={<Vocabulary />} />
          </Routes>
        </main>
        <Toaster />
      </div>
    </Router>
  )
}

export default App
