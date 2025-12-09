from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime

class Song(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(default="Unknown Title")
    artist: str = Field(default="Unknown Artist")
    source_text: str
    language: str  # 'ja', 'en', 'ko'
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    lines: List["LyricsLine"] = Relationship(
        back_populates="song",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    vocab_cards: List["VocabCard"] = Relationship(
        back_populates="song",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

class LyricsLine(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    song_id: int = Field(foreign_key="song.id")
    line_index: int
    original_text: str
    translation_text: str
    grammar_notes: str  # 存儲 JSON 字串或 Markdown 格式的文法解說
    
    song: Optional[Song] = Relationship(back_populates="lines")

class VocabCard(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    song_id: int = Field(foreign_key="song.id")
    
    word: str          # 單字 (如：愛してる)
    lemma: str         # 原形 (如：愛する)
    reading: str       # 讀音/拼音
    meaning: str       # 中文解釋
    part_of_speech: str # 詞性
    
    example_sentence: str # 例句 (原文)
    example_translation: str # 例句 (翻譯)

    is_saved: bool = Field(default=False) # New field for vocabulary saving
    
    song: Optional[Song] = Relationship(back_populates="vocab_cards")
