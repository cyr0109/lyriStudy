from fastapi import FastAPI, Depends, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Session, select, create_engine
from typing import List, Optional
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from pydantic import BaseModel
import os

# Import relative to the package if running as a module, but for simplicity assuming execution from root
# We will use relative imports assuming `uvicorn backend.main:app`
from models import Song, LyricsLine, VocabCard, User

# Make sure to import `analyze_lyrics_with_gemini`
from gemini_service import analyze_lyrics_with_gemini

# Import Auth functions
from auth import verify_password, get_password_hash, create_access_token, decode_access_token, ACCESS_TOKEN_EXPIRE_MINUTES

# Database Setup
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Fallback to SQLite for local dev if not provided
    sqlite_file_name = os.getenv("SQLITE_DB_PATH", "database.db")
    DATABASE_URL = f"sqlite:///{sqlite_file_name}"
    connect_args = {"check_same_thread": False}
else:
    connect_args = {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

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

# --- Authentication Models & Logic ---

class AuthRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    token: str
    username: str

# Dependency to verify token and get current user
def get_current_user(x_auth_token: str = Header(..., alias="x-auth-token"), session: Session = Depends(get_session)):
    payload = decode_access_token(x_auth_token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    
    # Optional: Verify user still exists in DB
    user = session.exec(select(User).where(User.username == username)).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
        
    return user

@app.post("/api/register", response_model=TokenResponse)
def register(creds: AuthRequest, session: Session = Depends(get_session)):
    # Check if user exists
    user = session.exec(select(User).where(User.username == creds.username)).first()
    if user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Create new user
    new_user = User(
        username=creds.username,
        password_hash=get_password_hash(creds.password)
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    
    # Create Token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.username}, expires_delta=access_token_expires
    )
    
    return {"token": access_token, "username": new_user.username}

@app.post("/api/login", response_model=TokenResponse)
def login(creds: AuthRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.username == creds.username)).first()
    if not user or not verify_password(creds.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"token": access_token, "username": user.username}

# ---------------------------


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

# Protected Endpoints (Added `user: User = Depends(get_current_user)`)

# --- Rate Limiting Logic ---
DAILY_ANALYSIS_LIMIT = int(os.getenv("DAILY_ANALYSIS_LIMIT", 5))

@app.post("/api/analyze", response_model=SongRead)
def analyze_lyrics(request: AnalyzeRequest, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    """
    Analyzes lyrics using Google Gemini, saves to DB, and returns the result.
    Enforces a daily limit of 5 requests per user.
    """
    
    # 1. Rate Limiting Check
    today = datetime.utcnow().date()
    
    if user.last_analysis_date is None or user.last_analysis_date.date() != today:
        # Reset counter for a new day
        user.daily_analysis_count = 0
        user.last_analysis_date = datetime.utcnow()
    
    if user.daily_analysis_count >= DAILY_ANALYSIS_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily analysis limit of {DAILY_ANALYSIS_LIMIT} reached. Please try again tomorrow."
        )
        
    # Increment counter
    user.daily_analysis_count += 1
    user.last_analysis_date = datetime.utcnow() # Update timestamp to now
    session.add(user)
    session.commit()
    session.refresh(user)

    # 2. Call Gemini Service
    try:
        # Note: This is a synchronous call. For high concurrency, consider making the service async 
        # or running in a threadpool (FastAPI does this for def endpoints automatically).
        data = analyze_lyrics_with_gemini(request.lyrics, request.language)
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "quota" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="AI Quota Exceeded (額度不足)"
            )
        # Optional: Revert counter on failure if you only want to count successful attempts
        # user.daily_analysis_count -= 1
        # session.add(user)
        # session.commit()
        raise HTTPException(status_code=500, detail=f"AI Processing failed: {error_msg}")

    # 3. Save to DB
    # Use provided title/artist if available, else use what AI found, else default
    final_title = request.title if request.title and request.title.strip() else data.get("title", "Unknown")
    final_artist = request.artist if request.artist and request.artist.strip() else data.get("artist", "Unknown")

    song = Song(
        title=final_title,
        artist=final_artist,
        source_text=request.lyrics,
        language=request.language,
        user_id=user.id # Link song to current user
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
    
    return song

@app.get("/api/history", response_model=List[Song])
def get_history(session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    """
    Returns a list of previously analyzed songs (summary only) for the current user.
    """
    songs = session.exec(select(Song).where(Song.user_id == user.id).order_by(Song.created_at.desc())).all()
    return songs

@app.get("/api/song/{song_id}", response_model=SongRead)
def get_song(song_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    """
    Returns full details of a specific song if it belongs to the user.
    """
    song = session.get(Song, song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    if song.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this song")
        
    return song

@app.delete("/api/song/{song_id}")
def delete_song(song_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    """
    Deletes a song and its associated data if it belongs to the user.
    """
    song = session.get(Song, song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    if song.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this song")
    
    session.delete(song)
    session.commit()
    return {"ok": True}

@app.post("/api/vocab/toggle_save/{vocab_id}", response_model=VocabCardRead)
def toggle_save_vocab(vocab_id: int, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    """
    Toggles the `is_saved` status of a vocabulary card.
    """
    vocab_card = session.get(VocabCard, vocab_id)
    if not vocab_card:
        raise HTTPException(status_code=404, detail="VocabCard not found")
    
    # Verify ownership through song relationship
    song = session.get(Song, vocab_card.song_id)
    if not song or song.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this vocabulary")
    
    vocab_card.is_saved = not vocab_card.is_saved
    session.add(vocab_card)
    session.commit()
    session.refresh(vocab_card)
    return vocab_card

@app.get("/api/vocab/saved", response_model=List[SavedVocabRead])
def get_saved_vocab(session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    """
    Returns a list of all saved vocabulary cards for the current user.
    """
    saved_vocab = (
        session.query(VocabCard, Song)
        .join(Song, VocabCard.song_id == Song.id)
        .filter(VocabCard.is_saved == True)
        .filter(Song.user_id == user.id) # Filter by current user
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