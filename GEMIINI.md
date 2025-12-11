# 專案上下文 (Project Context): LyriStudy

你是 **LyriStudy** 的首席開發者。
這是一個基於 AI 的語言學習工具，核心理念是「從歌詞中學習」。
目前的開發階段專注於 **MVP (最小可行性產品)**，目標是快速建立一個簡潔、人性化的流程，將歌詞轉換為結構化的學習教材（翻譯、文法、含例句的單字卡）。

**本次迭代重點：**
1.  **安全性升級**：實作完整的使用者註冊與登入系統 (JWT + Argon2)。
2.  **資源控管**：實作每日分析次數限制 (Rate Limiting) 防止 API 濫用。
3.  **架構優化**：前後端分離架構，前端使用 Vite/React，後端使用 FastAPI，並支援 Docker 化部署。
4.  **精準度**：透過使用者選擇的「語言」來優化 AI 的 System Prompt。

---

## 1. 技術堆棧 (Tech Stack)

### 前端 (Frontend)
* **框架**：React.js (Vite)。
* **UI 庫**：Tailwind CSS + shadcn/ui components (Button, Card, Input, Textarea)。
* **狀態管理**：React Hooks (`useState`, `useEffect`) + LocalStorage (Token)。
* **路由**：React Router (`react-router-dom`)，包含 Navbar 導覽與路由保護 (Private Route)。
* **通知**：`sonner` (Toast notifications)。

### 後端 (Backend)
* **框架**：FastAPI (Python)。
* **認證**：PyJWT (JWT Token) + Passlib (Argon2 密碼雜湊)。
* **AI 模型**：Google Gemini API (`gemini-2.5-flash`)。
* **資料庫**：SQLite (SQLModel ORM)。
* **部署**：Docker & Docker Compose (Volume for DB persistence)。

---

## 2. 核心功能與流程 (Core Workflow)

### 流程 1：認證 (Authentication)
1.  **註冊 (Register)**：使用者建立帳號 (Username, Password)，後端雜湊密碼並存入 DB。
2.  **登入 (Login)**：驗證成功後回傳 JWT Token，前端存入 LocalStorage。
3.  **路由保護**：未登入使用者無法訪問 Analyze、History 等頁面，會被導向登入頁。

### 流程 2：輸入與設定
1.  **導覽列 (Navbar)**：顯示使用者名稱與登出按鈕。可切換 Analyze (首頁)、History (歷史紀錄)、Vocabulary (單字庫)。
2.  **分析介面 (Home)**：
    *   輸入歌詞 Textarea。
    *   可選填：歌名 (Song Title) 與 藝人 (Artist)。
    *   語言選擇 (Language Select)。
    *   **限制檢查**：後端會檢查使用者今日分析次數 (預設每日 5 次)，超過則回傳 429 錯誤。

### 流程 3：AI 解析 (The Magic)
後端接收歌詞後，呼叫 Gemini API 執行以下任務：
1.  **逐行翻譯**：將歌詞翻譯成繁體中文。
2.  **文法整理**：針對每一行或關鍵句，列出文法重點 (助詞、句型變化)。
3.  **單字抽取**：
    * 抓出重要單字 (原形、讀音、詞性)。
    * **生成例句**：為每個單字生成一個簡單易懂的例句。

### 流程 4：學習視圖 (Result & Detail)
1.  **歌詞對照**：左側原文、右側翻譯。
2.  **互動詳情**：點擊歌詞某一行，展開該行的「文法解析」。
3.  **單字卡片**：
    *   顯示 AI 整理好的單字列表，包含例句。
    *   **收藏功能**：點擊星號可收藏/取消收藏單字 (實心黃色星號表示已收藏)。

### 流程 5：歷史與單字庫
1.  **歷史紀錄 (History)**：
    *   列出所有分析過的歌曲卡片。
    *   **刪除功能**：可刪除特定歌曲 (連動刪除相關歌詞與單字)。
2.  **單字庫 (Vocabulary)**：
    *   顯示所有已收藏 (`is_saved=True`) 的單字。
    *   **分類篩選**：可依詞性 (全部/名詞/動詞/形容詞/其他) 篩選。
    *   **來源連結**：點擊可跳回該單字所屬的歌曲詳情頁面。

---

## 3. 資料庫 Schema (SQLite/SQLModel)

```python
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    password_hash: str
    
    # Rate Limiting
    daily_analysis_count: int = Field(default=0)
    last_analysis_date: Optional[datetime] = Field(default=None)

class Song(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    artist: str
    source_text: str
    language: str  # 'ja', 'en', 'ko'
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships (Cascade Delete)
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
    grammar_notes: str
    
    song: Optional[Song] = Relationship(back_populates="lines")

class VocabCard(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    song_id: int = Field(foreign_key="song.id")
    
    word: str
    lemma: str
    reading: str
    meaning: str
    part_of_speech: str
    example_sentence: str
    example_translation: str
    
    is_saved: bool = Field(default=False)
    
    song: Optional[Song] = Relationship(back_populates="vocab_cards")
```

---

## 4. AI Prompt 策略 (Gemini)

* **Model**: `gemini-2.5-flash`
* **Output Requirement**: Strict JSON.
* **Special Rules**: 
    * Grammar notes in Traditional Chinese.
    * No Romanization for Korean (use Hangul).

---

## 5. API 規劃

### 認證 API
* `POST /api/register`: 註冊新帳號。
* `POST /api/login`: 登入並取得 JWT Token。

### 核心 API (需 Bearer Token)
* `POST /api/analyze`:
    * Input: `{ "lyrics": "...", "language": "ja", "title": "opt", "artist": "opt" }`
    * Output: Song object (autosaved).
    * **Rate Limit**: 預設每日 5 次。
* `GET /api/history`: 列出所有分析過的歌曲摘要。
* `GET /api/song/{id}`: 取得特定歌曲的完整詳細資料。
* `DELETE /api/song/{id}`: 刪除特定歌曲及關聯資料。
* `POST /api/vocab/toggle_save/{vocab_id}`: 切換單字收藏狀態。
* `GET /api/vocab/saved`: 取得所有已收藏的單字 (含來源歌曲資訊)。

---

## 6. 開發與部署 (Dev & Deploy)

* **Docker**: 專案包含 `Dockerfile` (Frontend & Backend) 與 `docker-compose.yml`。
* **啟動指令**: `docker-compose up -d --build`
* **環境變數 (.env)**:
    * `GOOGLE_API_KEY`: Gemini API Key (必填)
    * `DAILY_ANALYSIS_LIMIT`: 每日分析次數上限 (預設 5)
    * `SECRET_KEY`: 用於簽署 JWT 的密鑰
    * `SQLITE_DB_PATH`: 資料庫路徑 (Optional)
