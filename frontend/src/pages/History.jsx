import { useState, useEffect } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { Trash2, Calendar, Music, User, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'



export function History() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`/api/history`)
      setSongs(response.data)
    } catch (err) {
      console.error(err)
      setError("Failed to load history.")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (e, id) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this song?")) return;

    try {
      await axios.delete(`/api/song/${id}`)
      // Update list locally
      setSongs(songs.filter(song => song.id !== id))
    } catch (err) {
      console.error(err)
      alert("Failed to delete song.")
    }
  }

  if (loading) {
    return <div className="text-center py-10">Loading history...</div>
  }

  if (error) {
    return <div className="text-center py-10 text-destructive">{error}</div>
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Analysis History</h1>
      
      {songs.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          No songs analyzed yet. Go to <Link to="/" className="text-primary underline">Home</Link> to start.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {songs.map((song) => (
            <Link key={song.id} to={`/song/${song.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group relative">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl truncate" title={song.title}>
                    {song.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <User className="mr-2 h-4 w-4" />
                    <span className="truncate">{song.artist}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>{new Date(song.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="pt-2 flex justify-between items-center">
                    <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground font-medium uppercase">
                      {song.language}
                    </span>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:text-destructive z-10"
                        onClick={(e) => handleDelete(e, song.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
