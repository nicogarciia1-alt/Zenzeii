"""
Translation Service - Handles translating English text to Japanese using LLM
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


async def translate_sentences_batch(sentences: List[str], batch_size: int = 5) -> List[Dict]:
    """Translate a batch of sentences to Japanese using LLM"""
    if not EMERGENT_LLM_KEY:
        logger.error("EMERGENT_LLM_KEY not configured")
        return create_placeholder_translations(sentences)
    
    translated = []
    
    # Process in smaller batches to avoid token limits
    for i in range(0, len(sentences), batch_size):
        batch = sentences[i:i + batch_size]
        try:
            batch_result = await translate_batch(batch)
            translated.extend(batch_result)
            
            # Small delay between batches to avoid rate limiting
            if i + batch_size < len(sentences):
                await asyncio.sleep(0.5)
                
        except Exception as e:
            logger.error(f"Translation batch failed: {e}")
            # Use placeholder for failed batch
            translated.extend(create_placeholder_translations(batch))
    
    return translated


async def translate_batch(sentences: List[str]) -> List[Dict]:
    """Translate a small batch of sentences"""
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"translation-{id(sentences)}",
        system_message=TRANSLATION_SYSTEM_PROMPT
    ).with_model("openai", "gpt-5.2")
    
    # Format sentences for prompt
    sentences_text = "\n".join([f"{i+1}. {s}" for i, s in enumerate(sentences)])
    
    user_message = UserMessage(
        text=TRANSLATION_USER_TEMPLATE.format(sentences=sentences_text)
    )
    
    try:
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        # Clean response - remove markdown code blocks if present
        response = response.strip()
        if response.startswith("```"):
            # Remove markdown code block
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
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse translation response: {e}")
        return create_placeholder_translations(sentences)
    except Exception as e:
        logger.error(f"Translation API error: {e}")
        return create_placeholder_translations(sentences)


def create_placeholder_translation(sentence: str) -> Dict:
    """Create a placeholder translation when API fails"""
    return {
        "english": sentence,
        "japanese_kanji": sentence,  # Use English as fallback
        "japanese_hiragana": "",
        "japanese_katakana": "",
        "japanese_romaji": sentence.lower()
    }


def create_placeholder_translations(sentences: List[str]) -> List[Dict]:
    """Create placeholder translations for a list of sentences"""
    return [create_placeholder_translation(s) for s in sentences]


async def translate_title(title: str) -> str:
    """Translate a book/chapter title to Japanese"""
    if not EMERGENT_LLM_KEY:
        return title
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"title-{id(title)}",
        system_message="You are a translator. Translate the given English title to Japanese. Return ONLY the Japanese text, nothing else."
    ).with_model("openai", "gpt-5.2")
    
    try:
        user_message = UserMessage(text=f"Translate to Japanese: {title}")
        response = await chat.send_message(user_message)
        return response.strip()
    except Exception as e:
        logger.error(f"Title translation failed: {e}")
        return title


async def translate_author(author: str) -> str:
    """Translate/transliterate author name to Japanese (katakana)"""
    if not EMERGENT_LLM_KEY:
        return author
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"author-{id(author)}",
        system_message="You are a translator. Convert the given Western name to Japanese katakana. Return ONLY the katakana, nothing else."
    ).with_model("openai", "gpt-5.2")
    
    try:
        user_message = UserMessage(text=f"Convert to katakana: {author}")
        response = await chat.send_message(user_message)
        return response.strip()
    except Exception as e:
        logger.error(f"Author translation failed: {e}")
        return author
