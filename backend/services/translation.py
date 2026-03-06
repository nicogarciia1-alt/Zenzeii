"""
Translation Service - On-demand lazy translation system
OPTIMIZED: AI generates only Japanese text, local conversion for hiragana/katakana/romaji
"""
import os
import json
import asyncio
import logging
from typing import List, Dict, Optional, Set
from motor.motor_asyncio import AsyncIOMotorDatabase
from emergentintegrations.llm.chat import LlmChat, UserMessage
from dotenv import load_dotenv
import pykakasi

load_dotenv()
logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Configuration
TRANSLATION_TIMEOUT = 90  # seconds per batch
MAX_RETRIES = 2
BATCH_SIZE = 15  # Can increase batch size since we're only getting 1 output per sentence
PRELOAD_AHEAD = 100  # sentences to preload ahead of reader

# Track in-progress translations to avoid duplicates
translation_in_progress: Set[str] = set()

# Initialize pykakasi for local Japanese text conversion
kakasi = pykakasi.kakasi()

# OPTIMIZED PROMPT - Only requests Japanese text (kanji+kana), not all 4 forms
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
    This is done locally, saving AI tokens.
    """
    if not japanese_text:
        return {
            "hiragana": "",
            "katakana": "",
            "romaji": ""
        }
    
    try:
        result = kakasi.convert(japanese_text)
        
        # Build full strings from tokens
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
            "romaji": ' '.join(romaji_parts)  # Space between words for romaji
        }
    except Exception as e:
        logger.warning(f"pykakasi conversion error: {e}")
        # Fallback: return original text
        return {
            "hiragana": japanese_text,
            "katakana": japanese_text,
            "romaji": japanese_text
        }


async def translate_batch(
    db: AsyncIOMotorDatabase,
    sentence_ids: List[str],
    english_texts: List[str]
) -> Dict[str, Dict]:
    """
    Translate a batch of sentences and save to database.
    OPTIMIZED: AI generates only Japanese text, local conversion for other forms.
    """
    if not EMERGENT_LLM_KEY:
        logger.error("EMERGENT_LLM_KEY not configured")
        return {}
    
    if not sentence_ids or not english_texts:
        return {}
    
    # Filter out sentences already being translated
    to_translate = []
    for sid, text in zip(sentence_ids, english_texts):
        if sid not in translation_in_progress:
            to_translate.append((sid, text))
            translation_in_progress.add(sid)
    
    if not to_translate:
        logger.debug("All sentences already being translated")
        return {}
    
    try:
        # Build prompt
        numbered_sentences = "\n".join([
            f"{i+1}. \"{text}\"" 
            for i, (_, text) in enumerate(to_translate)
        ])
        
        prompt = BATCH_TRANSLATION_PROMPT + numbered_sentences
        
        logger.info(f"Translating batch of {len(to_translate)} sentences (optimized)")
        
        # Call AI - only get Japanese text
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"batch-{hash(tuple(s[0] for s in to_translate))}",
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
                
                # Save to database
                await db.sentences.update_one(
                    {"id": sid},
                    {"$set": results[sid]}
                )
        
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
    finally:
        # Remove from in-progress set
        for sid, _ in to_translate:
            translation_in_progress.discard(sid)


async def get_sentences_needing_translation(
    db: AsyncIOMotorDatabase,
    chapter_id: str,
    start_order: int = 1,
    limit: int = PRELOAD_AHEAD
) -> List[Dict]:
    """
    Get sentences that need translation from a chapter.
    Returns sentences where kanji_text is null.
    """
    sentences = await db.sentences.find(
        {
            "chapter_id": chapter_id,
            "order": {"$gte": start_order},
            "$or": [
                {"kanji_text": None},
                {"kanji_text": {"$exists": False}},
                {"translation_status": {"$ne": "completed"}}
            ]
        },
        {"_id": 0, "id": 1, "english": 1, "order": 1}
    ).sort("order", 1).limit(limit).to_list(limit)
    
    return sentences


async def trigger_chapter_translation(
    db: AsyncIOMotorDatabase,
    chapter_id: str,
    reader_position: int = 1
):
    """
    Trigger background translation for a chapter starting from reader position.
    This preloads translations ahead of where the user is reading.
    """
    # Get sentences needing translation
    sentences = await get_sentences_needing_translation(
        db, chapter_id, reader_position, PRELOAD_AHEAD
    )
    
    if not sentences:
        logger.debug(f"No sentences need translation in chapter {chapter_id}")
        return
    
    logger.info(f"Queueing {len(sentences)} sentences for translation in chapter {chapter_id}")
    
    # Process in batches
    for i in range(0, len(sentences), BATCH_SIZE):
        batch = sentences[i:i + BATCH_SIZE]
        sentence_ids = [s["id"] for s in batch]
        english_texts = [s["english"] for s in batch]
        
        # Run translation (fire and forget for background)
        asyncio.create_task(translate_batch(db, sentence_ids, english_texts))
        
        # Small delay between batches
        await asyncio.sleep(0.1)


async def ensure_sentences_translated(
    db: AsyncIOMotorDatabase,
    sentence_ids: List[str]
) -> Dict[str, Dict]:
    """
    Ensure specific sentences are translated.
    Returns translations for requested sentences (from cache or new).
    """
    if not sentence_ids:
        return {}
    
    # Check which sentences need translation
    sentences = await db.sentences.find(
        {
            "id": {"$in": sentence_ids},
            "$or": [
                {"kanji_text": None},
                {"kanji_text": {"$exists": False}},
                {"translation_status": {"$ne": "completed"}}
            ]
        },
        {"_id": 0}
    ).to_list(len(sentence_ids))
    
    if not sentences:
        return {}
    
    # Translate missing ones
    ids = [s["id"] for s in sentences]
    texts = [s["english"] for s in sentences]
    
    return await translate_batch(db, ids, texts)


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
