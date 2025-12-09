from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Session, select, create_engine
from typing import List, Optional
from contextlib import asynccontextmanager
from datetime import datetime
from pydantic import BaseModel

# Import relative to the package if running as a module, but for simplicity assuming execution from root
# We will use relative imports assuming `uvicorn backend.main:app`
from .models import Song, LyricsLine, VocabCard

# Make sure to import `analyze_lyrics_with_gemini`
from .gemini_service import analyze_lyrics_with_gemini

# Database Setup
sqlite_file_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"
engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)

# CORS Configuration
origins = [
    "http://localhost:5173",  # Vite default port
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Models
class AnalyzeRequest(BaseModel):
    lyrics: str
    language: str
    title: Optional[str] = None
    artist: Optional[str] = None

# Response Models
class LyricsLineRead(SQLModel):
    id: int
    line_index: int
    original_text: str
    translation_text: str
    grammar_notes: str

class VocabCardRead(SQLModel):
    id: int
    word: str
    lemma: str
    reading: str
    meaning: str
    part_of_speech: str
    example_sentence: str
    example_translation: str
    is_saved: bool

class SongRead(SQLModel):
    id: int
    title: str
    artist: str
    language: str
    created_at: datetime
    lines: List[LyricsLineRead] = []
    vocab_cards: List[VocabCardRead] = []

class SavedVocabRead(SQLModel):
    id: int
    word: str
    lemma: str
    reading: str
    meaning: str
    part_of_speech: str
    example_sentence: str
    example_translation: str
    is_saved: bool
    
    song_id: int
    song_title: str
    song_artist: str

@app.post("/api/analyze", response_model=SongRead)
def analyze_lyrics(request: AnalyzeRequest, session: Session = Depends(get_session)):
    """
    Analyzes lyrics using Google Gemini, saves to DB, and returns the result.
    """
    # 1. Call Gemini Service
    try:
        # Note: This is a synchronous call. For high concurrency, consider making the service async 
        # or running in a threadpool (FastAPI does this for def endpoints automatically).
        data = analyze_lyrics_with_gemini(request.lyrics, request.language)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Processing failed: {str(e)}")

    # 2. Save to DB
    # Use provided title/artist if available, else use what AI found, else default
    final_title = request.title if request.title and request.title.strip() else data.get("title", "Unknown")
    final_artist = request.artist if request.artist and request.artist.strip() else data.get("artist", "Unknown")

    song = Song(
        title=final_title,
        artist=final_artist,
        source_text=request.lyrics,
        language=request.language
    )
    session.add(song)
    session.commit()
    session.refresh(song)
    
    # Add Lines
    for line_data in data.get("lines", []):
        line = LyricsLine(
            song_id=song.id,
            line_index=line_data.get("line_index"),
            original_text=line_data.get("original_text"),
            translation_text=line_data.get("translation_text"),
            grammar_notes=line_data.get("grammar_notes", "")
        )
        session.add(line)
        
    # Add Vocab
    for vocab_data in data.get("vocab", []):
        vocab = VocabCard(
            song_id=song.id,
            word=vocab_data.get("word"),
            lemma=vocab_data.get("lemma", ""),
            reading=vocab_data.get("reading", ""),
            meaning=vocab_data.get("meaning", ""),
            part_of_speech=vocab_data.get("part_of_speech", ""),
            example_sentence=vocab_data.get("example_sentence", ""),
            example_translation=vocab_data.get("example_translation", "")
        )
        session.add(vocab)
    
    session.commit()
    session.refresh(song)
    
    # Ensure relationships are loaded for the response model
    # Accessing them here triggers the load if they are lazy
    # (Though FastAPI's response serialization would also trigger it)
    return song

@app.get("/api/history", response_model=List[Song])
def get_history(session: Session = Depends(get_session)):
    """
    Returns a list of previously analyzed songs (summary only).
    """
    # We return the Song model which doesn't include the relationships by default, 
    # fitting for a list view.
    songs = session.exec(select(Song).order_by(Song.created_at.desc())).all()
    return songs

@app.get("/api/song/{song_id}", response_model=SongRead)
def get_song(song_id: int, session: Session = Depends(get_session)):
    """
    Returns full details of a specific song.
    """
    song = session.get(Song, song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    return song

@app.delete("/api/song/{song_id}")
def delete_song(song_id: int, session: Session = Depends(get_session)):
    """
    Deletes a song and its associated data.
    """
    song = session.get(Song, song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    session.delete(song)
    session.commit()
    return {"ok": True}

@app.post("/api/vocab/toggle_save/{vocab_id}", response_model=VocabCardRead)
def toggle_save_vocab(vocab_id: int, session: Session = Depends(get_session)):
    """
    Toggles the `is_saved` status of a vocabulary card.
    """
    vocab_card = session.get(VocabCard, vocab_id)
    if not vocab_card:
        raise HTTPException(status_code=404, detail="VocabCard not found")
    
    vocab_card.is_saved = not vocab_card.is_saved
    session.add(vocab_card)
    session.commit()
    session.refresh(vocab_card)
    return vocab_card

@app.get("/api/vocab/saved", response_model=List[SavedVocabRead])
def get_saved_vocab(session: Session = Depends(get_session)):
    """
    Returns a list of all saved vocabulary cards with their associated song details.
    """
    saved_vocab = (
        session.query(VocabCard, Song)
        .join(Song, VocabCard.song_id == Song.id)
        .filter(VocabCard.is_saved == True)
        .all()
    )
    
    results = []
    for vocab, song in saved_vocab:
        results.append(
            SavedVocabRead(
                id=vocab.id,
                word=vocab.word,
                lemma=vocab.lemma,
                reading=vocab.reading,
                meaning=vocab.meaning,
                part_of_speech=vocab.part_of_speech,
                example_sentence=vocab.example_sentence,
                example_translation=vocab.example_translation,
                is_saved=vocab.is_saved,
                song_id=song.id,
                song_title=song.title,
                song_artist=song.artist,
            )
        )
    return results


@app.get("/")
def read_root():
    return {"message": "Welcome to LyriStudy API"}
