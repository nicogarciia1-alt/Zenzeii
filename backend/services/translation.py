"""
Translation Service - Handles translating English text to Japanese using LLM
With timeout protection, retries, and error handling
"""
import os
import json
import asyncio
import logging
from typing import List, Dict, Optional
from emergentintegrations.llm.chat import LlmChat, UserMessage
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Configuration
TRANSLATION_TIMEOUT = 60  # seconds per batch
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds between retries

# Translation prompt template
TRANSLATION_SYSTEM_PROMPT = """You are a Japanese language expert specializing in literary translation. Your task is to translate English sentences into Japanese with multiple script representations.

For each English sentence, provide:
1. japanese_kanji: Natural Japanese using kanji where appropriate
2. japanese_hiragana: Same text in hiragana only
3. japanese_katakana: Same text in katakana only  
4. japanese_romaji: Romanized Japanese (Hepburn romanization)

Guidelines:
- Maintain the literary style and tone of the original
- Use natural, fluent Japanese
- For proper nouns (names, places), use katakana
- Keep translations accurate but readable

IMPORTANT: Return ONLY valid JSON array, no markdown, no code blocks, no extra text."""

TRANSLATION_USER_TEMPLATE = """Translate these English sentences to Japanese. Return a JSON array with objects containing: english, japanese_kanji, japanese_hiragana, japanese_katakana, japanese_romaji

Sentences to translate:
{sentences}

Return ONLY the JSON array, nothing else."""


async def translate_sentences_batch(
    sentences: List[str], 
    batch_size: int = 5,
    progress_callback: Optional[callable] = None
) -> List[Dict]:
    """Translate a batch of sentences to Japanese using LLM with retry logic"""
    if not EMERGENT_LLM_KEY:
        logger.error("EMERGENT_LLM_KEY not configured")
        return create_placeholder_translations(sentences)
    
    translated = []
    total = len(sentences)
    
    # Process in smaller batches to avoid token limits
    for i in range(0, len(sentences), batch_size):
        batch = sentences[i:i + batch_size]
        batch_num = i // batch_size + 1
        total_batches = (len(sentences) + batch_size - 1) // batch_size
        
        logger.info(f"Translating batch {batch_num}/{total_batches} ({len(batch)} sentences)")
        
        # Try with retries
        batch_result = None
        last_error = None
        
        for attempt in range(MAX_RETRIES):
            try:
                batch_result = await asyncio.wait_for(
                    translate_batch_with_timeout(batch),
                    timeout=TRANSLATION_TIMEOUT
                )
                break  # Success, exit retry loop
                
            except asyncio.TimeoutError:
                last_error = f"Timeout after {TRANSLATION_TIMEOUT}s"
                logger.warning(f"Translation timeout (attempt {attempt + 1}/{MAX_RETRIES}): {last_error}")
                
            except Exception as e:
                last_error = str(e)
                # Check for budget exceeded error
                if "budget" in last_error.lower() or "exceeded" in last_error.lower():
                    logger.error(f"API budget exceeded: {last_error}")
                    # Return placeholders immediately, no retry
                    return create_placeholder_translations(batch)
                logger.warning(f"Translation error (attempt {attempt + 1}/{MAX_RETRIES}): {last_error}")
            
            # Wait before retry (except on last attempt)
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(RETRY_DELAY * (attempt + 1))
        
        # If all retries failed, use placeholders for this batch
        if batch_result is None:
            logger.error(f"All {MAX_RETRIES} attempts failed for batch {batch_num}: {last_error}")
            batch_result = create_placeholder_translations(batch)
        
        translated.extend(batch_result)
        
        # Report progress if callback provided
        if progress_callback:
            try:
                await progress_callback(len(translated), total)
            except Exception as e:
                logger.warning(f"Progress callback error: {e}")
        
        # Small delay between batches to avoid rate limiting
        if i + batch_size < len(sentences):
            await asyncio.sleep(0.5)
    
    return translated


async def translate_batch_with_timeout(sentences: List[str]) -> List[Dict]:
    """Translate a small batch of sentences with timeout handling"""
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"translation-{id(sentences)}-{asyncio.get_event_loop().time()}",
        system_message=TRANSLATION_SYSTEM_PROMPT
    ).with_model("openai", "gpt-5.2")
    
    # Format sentences for prompt
    sentences_text = "\n".join([f"{i+1}. {s}" for i, s in enumerate(sentences)])
    
    user_message = UserMessage(
        text=TRANSLATION_USER_TEMPLATE.format(sentences=sentences_text)
    )
    
    response = await chat.send_message(user_message)
    
    # Parse JSON response
    response = response.strip()
    if response.startswith("```"):
        lines = response.split("\n")
        response = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
    
    translations = json.loads(response)
    
    # Validate and ensure we have all fields
    result = []
    for i, trans in enumerate(translations):
        if i < len(sentences):
            result.append({
                "english": sentences[i],
                "japanese_kanji": trans.get("japanese_kanji", sentences[i]),
                "japanese_hiragana": trans.get("japanese_hiragana", ""),
                "japanese_katakana": trans.get("japanese_katakana", ""),
                "japanese_romaji": trans.get("japanese_romaji", "")
            })
    
    # If we got fewer translations than sentences, add placeholders
    while len(result) < len(sentences):
        idx = len(result)
        result.append(create_placeholder_translation(sentences[idx]))
    
    return result


def create_placeholder_translation(sentence: str) -> Dict:
    """Create a placeholder translation when API fails"""
    return {
        "english": sentence,
        "japanese_kanji": f"[翻訳保留] {sentence}",  # [Translation pending]
        "japanese_hiragana": "",
        "japanese_katakana": "",
        "japanese_romaji": sentence.lower(),
        "translation_failed": True
    }


def create_placeholder_translations(sentences: List[str]) -> List[Dict]:
    """Create placeholder translations for a list of sentences"""
    return [create_placeholder_translation(s) for s in sentences]


async def translate_title(title: str) -> str:
    """Translate a book/chapter title to Japanese with timeout"""
    if not EMERGENT_LLM_KEY:
        return title
    
    for attempt in range(MAX_RETRIES):
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"title-{id(title)}-{attempt}",
                system_message="You are a translator. Translate the given English title to Japanese. Return ONLY the Japanese text, nothing else."
            ).with_model("openai", "gpt-5.2")
            
            user_message = UserMessage(text=f"Translate to Japanese: {title}")
            response = await asyncio.wait_for(
                chat.send_message(user_message),
                timeout=30
            )
            return response.strip()
            
        except asyncio.TimeoutError:
            logger.warning(f"Title translation timeout (attempt {attempt + 1}/{MAX_RETRIES})")
        except Exception as e:
            logger.warning(f"Title translation error (attempt {attempt + 1}/{MAX_RETRIES}): {e}")
        
        if attempt < MAX_RETRIES - 1:
            await asyncio.sleep(RETRY_DELAY)
    
    logger.error(f"Failed to translate title after {MAX_RETRIES} attempts: {title}")
    return title


async def translate_author(author: str) -> str:
    """Translate/transliterate author name to Japanese (katakana) with timeout"""
    if not EMERGENT_LLM_KEY:
        return author
    
    for attempt in range(MAX_RETRIES):
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"author-{id(author)}-{attempt}",
                system_message="You are a translator. Convert the given Western name to Japanese katakana. Return ONLY the katakana, nothing else."
            ).with_model("openai", "gpt-5.2")
            
            user_message = UserMessage(text=f"Convert to katakana: {author}")
            response = await asyncio.wait_for(
                chat.send_message(user_message),
                timeout=30
            )
            return response.strip()
            
        except asyncio.TimeoutError:
            logger.warning(f"Author translation timeout (attempt {attempt + 1}/{MAX_RETRIES})")
        except Exception as e:
            logger.warning(f"Author translation error (attempt {attempt + 1}/{MAX_RETRIES}): {e}")
        
        if attempt < MAX_RETRIES - 1:
            await asyncio.sleep(RETRY_DELAY)
    
    logger.error(f"Failed to translate author after {MAX_RETRIES} attempts: {author}")
    return author
