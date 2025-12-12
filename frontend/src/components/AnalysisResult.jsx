import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { cn } from '../lib/utils'
import { Star } from 'lucide-react'
import axios from 'axios'
import { Button } from './ui/button'
import { toast } from 'sonner' // Import toast

export function AnalysisResult({ result }) {
  const [expandedLines, setExpandedLines] = useState([])
  const [internalResult, setInternalResult] = useState(result);

  useEffect(() => {
    setInternalResult(result);
  }, [result]);


  const toggleLine = (index) => {
    setExpandedLines((prevExpandedLines) => {
      if (prevExpandedLines.includes(index)) {
        return prevExpandedLines.filter((i) => i !== index)
      } else {
        return [...prevExpandedLines, index]
      }
    })
  }

  const handleToggleSave = async (vocabId) => {
    try {
      const response = await axios.post(`/api/vocab/toggle_save/${vocabId}`);
      const updatedVocabCard = response.data;

      setInternalResult(prevResult => {
        if (!prevResult) return prevResult;
        const updatedVocabCards = prevResult.vocab_cards.map(card => 
          card.id === updatedVocabCard.id ? updatedVocabCard : card
        );
        return { ...prevResult, vocab_cards: updatedVocabCards };
      });

      if (updatedVocabCard.is_saved) {
        toast.success(`Saved "${updatedVocabCard.word}" to vocabulary`);
      } else {
        toast.info(`Removed "${updatedVocabCard.word}" from vocabulary`);
      }

    } catch (err) {
      console.error(err);
      toast.error("Failed to update vocabulary save status.");
    }
  };

  if (!internalResult) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Song Info */}
      <div className="text-center">
        <h2 className="text-3xl font-bold">{internalResult.title}</h2>
        <p className="text-xl text-muted-foreground">{internalResult.artist}</p>
      </div>

      {/* Lyrics & Translation */}
      <div className="grid md:grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Lyrics Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {internalResult.lines.map((line, index) => (
              <div 
                key={line.id} 
                className={cn(
                  "p-3 rounded-lg transition-colors cursor-pointer border border-transparent",
                  expandedLines.includes(index) ? "bg-accent border-border" : "hover:bg-accent/50"
                )}
                onClick={() => toggleLine(index)}
              >
                <div className="flex flex-col md:flex-row md:justify-between md:gap-4">
                  <p className="text-lg font-medium flex-1">{line.original_text}</p>
                  <p className="text-muted-foreground flex-1 md:text-right">{line.translation_text}</p>
                </div>
                
                {/* Grammar Notes (Collapsible) */}
                {expandedLines.includes(index) && line.grammar_notes && (
                  <div className="mt-3 pt-3 border-t border-border/50 text-sm text-muted-foreground">
                    <strong className="text-primary block mb-1">Grammar Notes:</strong>
                    {line.grammar_notes}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Vocabulary Cards */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold">Vocabulary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {internalResult.vocab_cards.map((card) => (
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
                      card.is_saved && "text-yellow-500" // Ensure text-yellow-500 is applied when saved
                    )}
                    onClick={() => handleToggleSave(card.id)}
                  >
                    {/* Fill with currentColor if saved, otherwise none */}
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
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

    </div>
  )
}
