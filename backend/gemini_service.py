import os
import json
import google.generativeai as genai
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure the API key
GENAI_API_KEY = os.getenv("GOOGLE_API_KEY")
if GENAI_API_KEY:
    genai.configure(api_key=GENAI_API_KEY)

def analyze_lyrics_with_gemini(lyrics: str, language: str) -> Dict[str, Any]:
    """
    Analyzes lyrics using Google Gemini API to produce translation, grammar notes, and vocabulary.
    """
    if not GENAI_API_KEY:
        # For development/testing without key, you might want to mock this or raise error
        # print("Warning: GOOGLE_API_KEY not set. Using mock response.") 
        # return _mock_response() 
        raise ValueError("GOOGLE_API_KEY environment variable not set")

    # 'gemini-1.5-flash' was not found. Switching to 'gemini-2.5-flash-lite'
    # which is available in the user's region/tier, though with limited RPD (20).
    model = genai.GenerativeModel('gemini-2.5-flash-lite')

    prompt = f"""
    You are an expert language teacher specializing in {language}.
    
    Your task is to analyze the following lyrics:
    ---
    {lyrics}
    ---
    
    Perform the following steps:
    1. Identify the song title and artist if possible (or infer/leave generic).
    2. Translate the lyrics to Traditional Chinese line-by-line.
    3. Provide brief grammar notes for each line in Traditional Chinese (繁體中文).
    4. Extract key vocabulary words (suitable for learners) from the lyrics.
    5. For each vocabulary word, provide its lemma (dictionary form), reading (pronunciation), part of speech, meaning in Traditional Chinese, and a simple example sentence with translation.
       Important: If the language is Korean, do NOT use Romanization for the reading; use Hangul. For Japanese, use Hiragana.

    Output REQUIREMENT:
    Return raw JSON only. Do not use Markdown formatting (no ```json ... ```).
    
    The JSON structure must be:
    {{
        "title": "String",
        "artist": "String",
        "lines": [
            {{
                "line_index": Integer (0-based),
                "original_text": "String",
                "translation_text": "String",
                "grammar_notes": "String"
            }}
        ],
        "vocab": [
            {{
                "word": "String",
                "lemma": "String",
                "reading": "String",
                "meaning": "String",
                "part_of_speech": "String",
                "example_sentence": "String",
                "example_translation": "String"
            }}
        ]
    }}
    """

    try:
        response = model.generate_content(prompt)
        text_response = response.text.strip()
        
        # Simple cleanup if the model still adds markdown code blocks despite instructions
        if text_response.startswith("```json"):
            text_response = text_response[7:]
        elif text_response.startswith("```"):
            text_response = text_response[3:]
            
        if text_response.endswith("```"):
            text_response = text_response[:-3]
            
        return json.loads(text_response.strip())
        
    except Exception as e:
        print(f"Error processing with Gemini: {e}")
        raise e

def _mock_response():
    # Helper for testing without burning tokens/quota
    return {
        "title": "Test Song",
        "artist": "Test Artist",
        "lines": [
            {
                "line_index": 0,
                "original_text": "Hello world",
                "translation_text": "你好世界",
                "grammar_notes": "Basic greeting"
            }
        ],
        "vocab": []
    }
