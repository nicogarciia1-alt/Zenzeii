"""
Translation Service - Optimized for background worker architecture
AI generates only Japanese text, local conversion for hiragana/katakana/romaji
"""
import os
import json
import asyncio
import logging
from typing import List, Dict, Optional
from emergentintegrations.llm.chat import LlmChat, UserMessage
from dotenv import load_dotenv
import pykakasi

load_dotenv()
logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Configuration
TRANSLATION_TIMEOUT = 90  # seconds per batch

# Initialize pykakasi for local Japanese text conversion
kakasi = pykakasi.kakasi()

# Optimized prompt - only requests Japanese text
BATCH_TRANSLATION_PROMPT = """You are a Japanese language expert. Translate the following English sentences into natural Japanese.

Rules:
- Use kanji where appropriate with natural kana
- For proper nouns (names, places), use katakana
- Keep translations natural and literary
- Maintain the tone and style of the original

Return your response as a JSON array with objects containing: sentence_num, japanese

Example input:
1. "The sun was setting."
2. "She smiled softly."

Example output:
[
  {"sentence_num": 1, "japanese": "太陽が沈んでいた。"},
  {"sentence_num": 2, "japanese": "彼女は優しく微笑んだ。"}
]

Now translate these sentences:
"""


def convert_japanese_text(japanese_text: str) -> Dict[str, str]:
    """
    Convert Japanese text (kanji+kana) to hiragana, katakana, and romaji using pykakasi.
    """
    if not japanese_text:
        return {"hiragana": "", "katakana": "", "romaji": ""}
    
    try:
        result = kakasi.convert(japanese_text)
        
        hiragana_parts = []
        katakana_parts = []
        romaji_parts = []
        
        for item in result:
            hiragana_parts.append(item.get('hira', item.get('orig', '')))
            katakana_parts.append(item.get('kana', item.get('orig', '')))
            romaji_parts.append(item.get('hepburn', item.get('orig', '')))
        
        return {
            "hiragana": ''.join(hiragana_parts),
            "katakana": ''.join(katakana_parts),
            "romaji": ' '.join(romaji_parts)
        }
    except Exception as e:
        logger.warning(f"pykakasi conversion error: {e}")
        return {"hiragana": japanese_text, "katakana": japanese_text, "romaji": japanese_text}


async def translate_batch_for_worker(
    sentence_ids: List[str],
    english_texts: List[str]
) -> Dict[str, Dict]:
    """
    Translate a batch of sentences - called by the background worker.
    Returns dict of {sentence_id: translation_data}
    """
    if not EMERGENT_LLM_KEY:
        logger.error("EMERGENT_LLM_KEY not configured")
        return {}
    
    if not sentence_ids or not english_texts:
        return {}
    
    to_translate = list(zip(sentence_ids, english_texts))
    
    try:
        # Build prompt
        numbered_sentences = "\n".join([
            f"{i+1}. \"{text}\"" 
            for i, (_, text) in enumerate(to_translate)
        ])
        
        prompt = BATCH_TRANSLATION_PROMPT + numbered_sentences
        
        logger.info(f"Translating batch of {len(to_translate)} sentences")
        
        # Call AI
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"worker-batch-{hash(tuple(s[0] for s in to_translate))}",
            system_message="You are a professional Japanese translator. Return only valid JSON."
        ).with_model("openai", "gpt-5.2")
        
        response = await asyncio.wait_for(
            chat.send_message(UserMessage(text=prompt)),
            timeout=TRANSLATION_TIMEOUT
        )
        
        # Parse response
        response = response.strip()
        if response.startswith("```"):
            lines = response.split("\n")
            response = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])
        
        translations = json.loads(response)
        
        # Map translations back to sentence IDs and convert locally
        results = {}
        for trans in translations:
            idx = trans.get("sentence_num", 0) - 1
            if 0 <= idx < len(to_translate):
                sid = to_translate[idx][0]
                japanese_text = trans.get("japanese", "")
                
                # Local conversion using pykakasi
                converted = convert_japanese_text(japanese_text)
                
                results[sid] = {
                    "kanji_text": japanese_text,
                    "hiragana_text": converted["hiragana"],
                    "katakana_text": converted["katakana"],
                    "romaji_text": converted["romaji"],
                    "translation_status": "completed"
                }
        
        logger.info(f"Successfully translated {len(results)}/{len(to_translate)} sentences")
        return results
        
    except asyncio.TimeoutError:
        logger.error(f"Translation batch timed out after {TRANSLATION_TIMEOUT}s")
        return {}
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse translation response: {e}")
        return {}
    except Exception as e:
        error_str = str(e)
        if "budget" in error_str.lower() or "exceeded" in error_str.lower():
            logger.error(f"API budget exceeded: {e}")
        else:
            logger.error(f"Translation error: {e}")
        return {}


async def translate_title_simple(title: str) -> str:
    """Simple title translation with fallback"""
    if not EMERGENT_LLM_KEY:
        return title
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"title-{hash(title)}",
            system_message="Translate to Japanese. Return only the Japanese text."
        ).with_model("openai", "gpt-5.2")
        
        response = await asyncio.wait_for(
            chat.send_message(UserMessage(text=f"Translate: {title}")),
            timeout=30
        )
        return response.strip()
    except:
        return title


async def translate_author_simple(author: str) -> str:
    """Simple author name to katakana with fallback"""
    if not EMERGENT_LLM_KEY:
        return author
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"author-{hash(author)}",
            system_message="Convert name to katakana. Return only the katakana."
        ).with_model("openai", "gpt-5.2")
        
        response = await asyncio.wait_for(
            chat.send_message(UserMessage(text=f"Convert: {author}")),
            timeout=30
        )
        return response.strip()
    except:
        return author
