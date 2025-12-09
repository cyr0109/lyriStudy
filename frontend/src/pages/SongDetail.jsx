import { useState, useEffect } from 'react'
import axios from 'axios'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { AnalysisResult } from '../components/AnalysisResult'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export function SongDetail() {
  const { id } = useParams()
  const [song, setSong] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchSong = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/song/${id}`)
        setSong(response.data)
      } catch (err) {
        console.error(err)
        setError("Failed to load song details.")
      } finally {
        setLoading(false)
      }
    }
    fetchSong()
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-10 space-y-4">
        <p className="text-destructive text-lg">{error}</p>
        <Button asChild variant="outline">
          <Link to="/history">Back to History</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/history" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>
      
      <AnalysisResult result={song} />
    </div>
  )
}
