"""
Translation Service
Input: English text → Output: Japanese (kanji), hiragana, katakana, romaji

Engine selection (set in .env):
  OPENAI_API_KEY set  → GPT-4o-mini (batch, high quality)
  no key              → deep-translator / Google Translate (fallback)

pykakasi is always used locally for hiragana / katakana / romaji conversion.
"""
import os
import json
import logging
from typing import List, Dict

import pykakasi
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

_kakasi = None  # lazy-initialized on first use to avoid slow startup
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

def _get_kakasi():
    global _kakasi
    if _kakasi is None:
        _kakasi = pykakasi.kakasi()
    return _kakasi

# ── pykakasi: kanji → hiragana / katakana / romaji ───────────────────────────

def _to_readings(japanese: str) -> Dict[str, str]:
    """Convert Japanese text to hiragana, katakana, and romaji using pykakasi."""
    if not japanese:
        return {"japanese": japanese, "hiragana": "", "katakana": "", "romaji": ""}
    try:
        result = _get_kakasi().convert(japanese)
        hiragana = "".join(item.get("hira", item.get("orig", "")) for item in result)
        katakana = "".join(item.get("kana", item.get("orig", "")) for item in result)
        romaji = " ".join(item.get("hepburn", item.get("orig", "")) for item in result)
        return {"japanese": japanese, "hiragana": hiragana, "katakana": katakana, "romaji": romaji.strip()}
    except Exception as e:
        logger.warning(f"pykakasi error: {e}")
        return {"japanese": japanese, "hiragana": japanese, "katakana": japanese, "romaji": japanese}


# ── OpenAI batch translation ──────────────────────────────────────────────────

_SYSTEM_PROMPT = (
    "You are a literary Japanese translator. "
    "Translate each English sentence into natural, literary Japanese using kanji where appropriate. "
    "For proper nouns (names, places) use katakana. "
    "Preserve the tone and style of the original. "
    "Return ONLY a JSON array of objects with keys: n (integer, the sentence number), j (the Japanese translation). "
    "No explanation, no markdown, no extra keys."
)

_EXAMPLE = '[{"n":1,"j":"太陽が沈んでいた。"},{"n":2,"j":"彼女は優しく微笑んだ。"}]'


async def _translate_batch_openai(texts: List[str]) -> List[str]:
    """
    Translate a list of English sentences to Japanese using GPT-4o-mini.
    Returns a list of Japanese strings in the same order as input.
    Falls back to empty strings on failure (caller will retry or skip).
    """
    from openai import AsyncOpenAI

    numbered = "\n".join(f"{i+1}. {t}" for i, t in enumerate(texts))
    user_msg = f"Translate these {len(texts)} sentences:\n{numbered}\n\nExample output format: {_EXAMPLE}"

    client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.3,
            max_tokens=2048,
        )
        raw = response.choices[0].message.content.strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        items = json.loads(raw)
        # Build index by n, fill gaps with empty string
        by_n = {item["n"]: item["j"] for item in items}
        return [by_n.get(i + 1, "") for i in range(len(texts))]

    except Exception as e:
        logger.error(f"OpenAI translation failed: {e}")
        return [""] * len(texts)


# ── Fallback: deep-translator (Google Translate, no API key) ─────────────────

def _translate_single_google(text: str) -> str:
    from deep_translator import GoogleTranslator
    try:
        return GoogleTranslator(source="en", target="ja").translate(text.strip()) or text
    except Exception as e:
        logger.warning(f"Google Translate fallback failed: {e}")
        return text


async def _translate_japanese_to_english(text: str) -> str:
    """Translate Japanese text to English using OpenAI if available,
    else Google Translate."""
    if OPENAI_API_KEY:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=OPENAI_API_KEY)
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": (
                        "You are a literary translator specializing in Japanese literature. "
                        "Translate the Japanese sentence into natural, elegant English. "
                        "Preserve the tone, style and literary quality of the original. "
                        "Return ONLY the translated English sentence, nothing else."
                    )},
                    {"role": "user", "content": text}
                ],
                temperature=0.3,
                max_tokens=256,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.warning(f"OpenAI Japanese->English failed: {e}")

    from deep_translator import GoogleTranslator
    try:
        return GoogleTranslator(source="ja", target="en").translate(text.strip()) or ""
    except Exception as e:
        logger.warning(f"Japanese->English translation failed: {e}")
        return ""


async def translate_japanese_source_batch(
    sentence_ids: List[str],
    japanese_texts: List[str],
) -> Dict[str, Dict]:
    """
    Process sentences where source is already Japanese (Aozora books).
    1. Run pykakasi to get hiragana/katakana/romaji from japanese_original
    2. Translate Japanese->English using Google Translate
    """
    result = {}
    for sid, japanese in zip(sentence_ids, japanese_texts):
        if not japanese:
            result[sid] = {"translation_status": "pending"}
            continue
        readings = _to_readings(japanese)
        english = await _translate_japanese_to_english(japanese)
        result[sid] = {
            "kanji_text": readings["japanese"],
            "hiragana_text": readings["hiragana"],
            "katakana_text": readings["katakana"],
            "romaji_text": readings["romaji"],
            "english": english if english else japanese,
            "translation_status": "completed",
        }
    return result


# ── Public API ────────────────────────────────────────────────────────────────

def translate_to_japanese(text: str) -> Dict[str, str]:
    """
    Translate a single English string to Japanese (title/author use).
    Always uses Google Translate (synchronous, no key needed).
    Returns: { japanese, hiragana, katakana, romaji }
    """
    if not text or not text.strip():
        return {"japanese": "", "hiragana": "", "katakana": "", "romaji": ""}
    japanese = _translate_single_google(text)
    return _to_readings(japanese)


def get_word_forms(text: str) -> Dict[str, str]:
    """
    Return all four script forms for a word using pykakasi only — no translation.
    Used at vocabulary save time to store kanji/hiragana/katakana/romaji for matching.
    For non-Japanese input, pykakasi returns the original string in all fields.
    Returns: { kanji_form, hiragana_form, katakana_form, romaji_form }
    """
    if not text or not text.strip():
        return {"kanji_form": "", "hiragana_form": "", "katakana_form": "", "romaji_form": ""}
    readings = _to_readings(text)
    return {
        "kanji_form":    text,
        "hiragana_form": readings["hiragana"],
        "katakana_form": readings["katakana"],
        "romaji_form":   readings["romaji"],
    }


async def translate_batch_for_worker(
    sentence_ids: List[str],
    english_texts: List[str],
) -> Dict[str, Dict]:
    """
    Translate a batch of English sentences to Japanese.
    Uses OpenAI GPT-4o-mini if OPENAI_API_KEY is set, else Google Translate.
    Returns a dict keyed by sentence_id with DB-ready field names.
    """
    if OPENAI_API_KEY:
        japanese_list = await _translate_batch_openai(english_texts)
    else:
        # Synchronous fallback — one call per sentence
        japanese_list = [_translate_single_google(t) for t in english_texts]

    result = {}
    for sid, english, japanese in zip(sentence_ids, english_texts, japanese_list):
        if not japanese:
            # Translation failed — leave pending so the worker retries
            result[sid] = {"translation_status": "pending"}
            continue
        readings = _to_readings(japanese)
        result[sid] = {
            "kanji_text": readings["japanese"],
            "hiragana_text": readings["hiragana"],
            "katakana_text": readings["katakana"],
            "romaji_text": readings["romaji"],
            "translation_status": "completed",
        }
    return result


# ── Async wrappers for server.py (book import: title/author) ─────────────────

async def translate_title_simple(title: str) -> str:
    return translate_to_japanese(title)["japanese"]


async def translate_author_simple(author: str) -> str:
    return translate_to_japanese(author)["japanese"]
