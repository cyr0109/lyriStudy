import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Star, Music, User as UserIcon } from 'lucide-react'; // Renamed User to UserIcon to avoid conflict
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';


// Helper function to categorize part of speech
const mapPartOfSpeech = (pos) => {
  if (!pos) return "其他";
  pos = pos.toLowerCase();
  if (pos.includes("noun") || pos.includes("名詞") || pos === "n.") return "名詞";
  if (pos.includes("verb") || pos.includes("動詞") || pos === "v.") return "動詞";
  if (pos.includes("adjective") || pos.includes("形容詞") || pos === "adj.") return "形容詞";
  return "其他";
};

export function Vocabulary() {
  const [savedVocab, setSavedVocab] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('全部'); // '全部', '名詞', '動詞', '形容詞', '其他'

  useEffect(() => {
    fetchSavedVocab();
  }, []);

  const fetchSavedVocab = async () => {
    try {
      const response = await axios.get(`/api/vocab/saved`);
      setSavedVocab(response.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load saved vocabulary.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSave = async (vocabId) => {
    try {
      const response = await axios.post(`/api/vocab/toggle_save/${vocabId}`);
      // Filter out the unsaved vocab card locally
      setSavedVocab((prevVocab) => prevVocab.filter(card => card.id !== vocabId));
    } catch (err) {
      console.error(err);
      alert("Failed to update vocabulary save status.");
    }
  };

  const filteredVocab = savedVocab.filter(card => {
    if (activeTab === '全部') return true;
    return mapPartOfSpeech(card.part_of_speech) === activeTab;
  });

  if (loading) {
    return <div className="text-center py-10">Loading saved vocabulary...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-destructive">{error}</div>;
  }

  const tabs = ['全部', '名詞', '動詞', '形容詞', '其他'];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Saved Vocabulary</h1>

      <div className="flex space-x-2 border-b pb-2">
        {tabs.map(tab => (
          <Button 
            key={tab} 
            variant={activeTab === tab ? "default" : "outline"}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </Button>
        ))}
      </div>

      {filteredVocab.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          No saved vocabulary in this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVocab.map((card) => (
            <Card key={card.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl text-primary">{card.word}</CardTitle>
                    <p className="text-sm text-muted-foreground">{card.reading}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "text-muted-foreground hover:text-yellow-500",
                      card.is_saved && "text-yellow-500" // Highlight if saved
                    )}
                    onClick={() => handleToggleSave(card.id)}
                  >
                    <Star className="h-5 w-5" fill={card.is_saved ? "currentColor" : "none"} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{card.meaning}</p>
                  {card.lemma !== card.word && (
                    <p className="text-xs text-muted-foreground">Lemma: {card.lemma}</p>
                  )}
                </div>
                <div className="bg-muted/50 p-2 rounded text-sm italic">
                  <p>{card.example_sentence}</p>
                  <p className="text-muted-foreground not-italic mt-1 text-xs">
                    {card.example_translation}
                  </p>
                </div>
                <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                  <Music className="h-3 w-3" />
                  來自: <Link to={`/song/${card.song_id}`} className="hover:underline text-primary">
                    {card.song_title} - {card.song_artist}
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
