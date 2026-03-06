"""
Book Import Service - Multi-source book fetching and processing
Supports: Project Gutenberg, Aozora Bunko, and more
"""
import re
import asyncio
import httpx
from typing import List, Dict, Optional, Tuple
import uuid
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

# Book sources configuration
BOOK_SOURCES = {
    "gutenberg": {
        "name": "Project Gutenberg",
        "description": "Public domain English literature",
        "language": "en",
        "base_url": "https://www.gutenberg.org"
    },
    "aozora": {
        "name": "Aozora Bunko (青空文庫)",
        "description": "Japanese public domain literature",
        "language": "ja",
        "base_url": "https://www.aozora.gr.jp"
    },
    "manga_toshokan": {
        "name": "Manga Toshokan Z",
        "description": "Free and out-of-print manga",
        "language": "ja",
        "base_url": "https://www.mangaz.com"
    },
    "japan_foundation": {
        "name": "Japan Foundation",
        "description": "Japanese literature resources",
        "language": "ja",
        "base_url": "https://www.jpf.go.jp"
    }
}

# Project Gutenberg book IDs for initial library
GUTENBERG_BOOKS = {
    "pride-and-prejudice": {
        "gutenberg_id": 1342,
        "title": "Pride and Prejudice",
        "author": "Jane Austen",
        "genre": "romance",
        "difficulty": "intermediate",
        "source": "gutenberg",
        "language": "en"
    },
    "alice-in-wonderland": {
        "gutenberg_id": 11,
        "title": "Alice's Adventures in Wonderland",
        "author": "Lewis Carroll",
        "genre": "fantasy",
        "difficulty": "beginner",
        "source": "gutenberg",
        "language": "en"
    },
    "anna-karenina": {
        "gutenberg_id": 1399,
        "title": "Anna Karenina",
        "author": "Leo Tolstoy",
        "genre": "literary",
        "difficulty": "advanced",
        "source": "gutenberg",
        "language": "en"
    },
    "sherlock-holmes": {
        "gutenberg_id": 1661,
        "title": "The Adventures of Sherlock Holmes",
        "author": "Arthur Conan Doyle",
        "genre": "mystery",
        "difficulty": "intermediate",
        "source": "gutenberg",
        "language": "en"
    },
    "moby-dick": {
        "gutenberg_id": 2701,
        "title": "Moby Dick",
        "author": "Herman Melville",
        "genre": "adventure",
        "difficulty": "advanced",
        "source": "gutenberg",
        "language": "en"
    }
}

# Aozora Bunko popular books
AOZORA_BOOKS = {
    "kokoro": {
        "aozora_id": "000148",
        "card_no": "773",
        "title": "こころ",
        "title_en": "Kokoro",
        "author": "夏目漱石",
        "author_en": "Natsume Soseki",
        "genre": "literary",
        "difficulty": "intermediate",
        "source": "aozora",
        "language": "ja"
    },
    "rashomon": {
        "aozora_id": "000879",
        "card_no": "127",
        "title": "羅生門",
        "title_en": "Rashomon",
        "author": "芥川龍之介",
        "author_en": "Akutagawa Ryunosuke",
        "genre": "literary",
        "difficulty": "intermediate",
        "source": "aozora",
        "language": "ja"
    },
    "botchan": {
        "aozora_id": "000148",
        "card_no": "752",
        "title": "坊っちゃん",
        "title_en": "Botchan",
        "author": "夏目漱石",
        "author_en": "Natsume Soseki",
        "genre": "literary",
        "difficulty": "beginner",
        "source": "aozora",
        "language": "ja"
    },
    "ningen-shikkaku": {
        "aozora_id": "000035",
        "card_no": "301",
        "title": "人間失格",
        "title_en": "No Longer Human",
        "author": "太宰治",
        "author_en": "Dazai Osamu",
        "genre": "literary",
        "difficulty": "advanced",
        "source": "aozora",
        "language": "ja"
    },
    "snow-country": {
        "aozora_id": "001475",
        "card_no": "2342",
        "title": "雪国",
        "title_en": "Snow Country",
        "author": "川端康成",
        "author_en": "Kawabata Yasunari",
        "genre": "literary",
        "difficulty": "advanced",
        "source": "aozora",
        "language": "ja"
    }
}

# Cover images for books
BOOK_COVERS = {
    "pride-and-prejudice": "https://images.unsplash.com/photo-1474932430478-367dbb6832c1?w=400",
    "alice-in-wonderland": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400",
    "anna-karenina": "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400",
    "sherlock-holmes": "https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?w=400",
    "moby-dick": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    "kokoro": "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400",
    "rashomon": "https://images.unsplash.com/photo-1480796927426-f609979314bd?w=400",
    "botchan": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400",
    "ningen-shikkaku": "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400",
    "snow-country": "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=400",
    "default": "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400"
}


def get_all_available_books() -> Dict:
    """Get all available books from all sources"""
    all_books = {}
    all_books.update(GUTENBERG_BOOKS)
    all_books.update(AOZORA_BOOKS)
    return all_books


async def fetch_gutenberg_text(gutenberg_id: int) -> Optional[str]:
    """Fetch book text from Project Gutenberg"""
    urls = [
        f"https://www.gutenberg.org/files/{gutenberg_id}/{gutenberg_id}-0.txt",
        f"https://www.gutenberg.org/cache/epub/{gutenberg_id}/pg{gutenberg_id}.txt",
        f"https://www.gutenberg.org/files/{gutenberg_id}/{gutenberg_id}.txt",
    ]
    
    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        for url in urls:
            try:
                response = await client.get(url)
                if response.status_code == 200:
                    text = response.text
                    if text.startswith('\ufeff'):
                        text = text[1:]
                    logger.info(f"Successfully fetched from {url}")
                    return text
            except Exception as e:
                logger.warning(f"Failed to fetch from {url}: {e}")
                continue
    
    logger.error(f"Failed to fetch Gutenberg book {gutenberg_id}")
    return None


async def fetch_aozora_text(aozora_id: str, card_no: str) -> Optional[str]:
    """Fetch book text from Aozora Bunko"""
    # Aozora Bunko URL format: https://www.aozora.gr.jp/cards/{author_id}/files/{card_no}_{ruby_type}.html
    urls = [
        f"https://www.aozora.gr.jp/cards/{aozora_id}/files/{card_no}_ruby_24939.zip",
        f"https://www.aozora.gr.jp/cards/{aozora_id}/files/{card_no}_ruby.html",
    ]
    
    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        for url in urls:
            try:
                response = await client.get(url)
                if response.status_code == 200:
                    # For HTML files, extract text content
                    if url.endswith('.html'):
                        text = extract_aozora_text_from_html(response.text)
                    else:
                        text = response.text
                    
                    if text:
                        logger.info(f"Successfully fetched Aozora book from {url}")
                        return text
            except Exception as e:
                logger.warning(f"Failed to fetch from Aozora {url}: {e}")
                continue
    
    # If direct fetch fails, try the card page and extract text links
    try:
        card_url = f"https://www.aozora.gr.jp/cards/{aozora_id}/card{card_no}.html"
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(card_url)
            if response.status_code == 200:
                # Parse card page to find text file link
                text_link = extract_text_link_from_aozora_card(response.text, aozora_id)
                if text_link:
                    text_response = await client.get(text_link)
                    if text_response.status_code == 200:
                        return extract_aozora_text_from_html(text_response.text)
    except Exception as e:
        logger.warning(f"Failed to fetch Aozora card page: {e}")
    
    logger.error(f"Failed to fetch Aozora book {aozora_id}/{card_no}")
    return None


def extract_aozora_text_from_html(html: str) -> Optional[str]:
    """Extract plain text from Aozora Bunko HTML format"""
    import re
    
    # Remove HTML tags but keep the text
    # Aozora uses special ruby notation for furigana
    text = re.sub(r'<ruby>([^<]+)<rp>（</rp><rt>([^<]+)</rt><rp>）</rp></ruby>', r'\1', html)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'［＃[^］]+］', '', text)  # Remove Aozora annotations
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text if len(text) > 100 else None


def extract_text_link_from_aozora_card(html: str, author_id: str) -> Optional[str]:
    """Extract the text file link from an Aozora card page"""
    import re
    
    # Look for links to text files
    matches = re.findall(r'href="(files/[^"]+\.html)"', html)
    for match in matches:
        if 'ruby' in match.lower():
            return f"https://www.aozora.gr.jp/cards/{author_id}/{match}"
    
    return None


async def search_gutenberg(query: str, limit: int = 10) -> List[Dict]:
    """Search Project Gutenberg catalog"""
    search_url = f"https://gutendex.com/books/?search={query}"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(search_url)
            if response.status_code == 200:
                data = response.json()
                results = []
                for book in data.get("results", [])[:limit]:
                    # Get author name
                    authors = book.get("authors", [])
                    author = authors[0].get("name", "Unknown") if authors else "Unknown"
                    
                    results.append({
                        "gutenberg_id": book.get("id"),
                        "title": book.get("title", "Unknown"),
                        "author": author,
                        "language": book.get("languages", ["en"])[0],
                        "download_count": book.get("download_count", 0),
                        "source": "gutenberg"
                    })
                return results
        except Exception as e:
            logger.error(f"Gutenberg search failed: {e}")
    
    return []


async def search_aozora(query: str, limit: int = 10) -> List[Dict]:
    """Search Aozora Bunko - returns predefined matches for now"""
    # Aozora doesn't have a public API, so we search our predefined list
    results = []
    query_lower = query.lower()
    
    for key, book in AOZORA_BOOKS.items():
        if (query_lower in book["title"].lower() or 
            query_lower in book.get("title_en", "").lower() or
            query_lower in book["author"].lower() or
            query_lower in book.get("author_en", "").lower()):
            results.append({
                "book_key": key,
                "title": book["title"],
                "title_en": book.get("title_en"),
                "author": book["author"],
                "author_en": book.get("author_en"),
                "language": "ja",
                "source": "aozora"
            })
    
    return results[:limit]


def clean_gutenberg_text(text: str) -> str:
    """Remove Gutenberg header/footer and clean the text"""
    # Find the start of actual content
    start_markers = [
        "*** START OF THIS PROJECT GUTENBERG",
        "*** START OF THE PROJECT GUTENBERG",
        "*END*THE SMALL PRINT",
        "*** END OF THIS PROJECT GUTENBERG"
    ]
    
    end_markers = [
        "*** END OF THIS PROJECT GUTENBERG",
        "*** END OF THE PROJECT GUTENBERG",
        "End of Project Gutenberg",
        "End of the Project Gutenberg"
    ]
    
    start_pos = 0
    for marker in start_markers:
        pos = text.find(marker)
        if pos != -1:
            # Find the end of the line
            newline_pos = text.find('\n', pos)
            if newline_pos != -1:
                start_pos = newline_pos + 1
                break
    
    end_pos = len(text)
    for marker in end_markers:
        pos = text.find(marker)
        if pos != -1:
            end_pos = pos
            break
    
    cleaned = text[start_pos:end_pos].strip()
    
    # Remove multiple blank lines
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    
    return cleaned


def clean_aozora_text(text: str) -> str:
    """Clean Aozora Bunko text format"""
    # Remove Aozora-specific markup
    cleaned = re.sub(r'［＃[^］]*］', '', text)  # Remove annotations
    cleaned = re.sub(r'《[^》]*》', '', cleaned)  # Remove furigana markers
    cleaned = re.sub(r'｜', '', cleaned)  # Remove ruby base markers
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    return cleaned.strip()


def split_into_chapters(text: str, book_id: str) -> List[Dict]:
    """Split book text into chapters"""
    chapter_patterns = [
        r'^CHAPTER\s+([IVXLCDM]+|\d+)[.\s]*(.*)$',
        r'^Chapter\s+([IVXLCDM]+|\d+)[.\s]*(.*)$',
        r'^BOOK\s+([IVXLCDM]+|\d+)[.\s]*(.*)$',
        r'^Part\s+([IVXLCDM]+|\d+)[.\s]*(.*)$',
        r'^第([一二三四五六七八九十百千]+)章\s*(.*)$',  # Japanese chapter format
        r'^([一二三四五六七八九十]+)[、．.\s]+(.*)$',    # Japanese numbered sections
    ]
    
    lines = text.split('\n')
    chapters = []
    current_chapter = None
    chapter_number = 0
    
    for i, line in enumerate(lines):
        line = line.strip()
        is_chapter_start = False
        chapter_title = ""
        
        for pattern in chapter_patterns:
            match = re.match(pattern, line, re.IGNORECASE)
            if match:
                is_chapter_start = True
                chapter_title = match.group(2).strip() if len(match.groups()) > 1 else line
                break
        
        if is_chapter_start:
            if current_chapter:
                chapters.append(current_chapter)
            
            chapter_number += 1
            current_chapter = {
                'id': f"{book_id}-ch{chapter_number + 12}",
                'chapter_number': chapter_number + 12,
                'title': chapter_title or f"Chapter {chapter_number}",
                'content': ""
            }
        elif current_chapter:
            current_chapter['content'] += line + '\n'
    
    if current_chapter:
        chapters.append(current_chapter)
    
    # If no chapters found, treat whole text as one chapter
    if not chapters:
        chapters = [{
            'id': f"{book_id}-ch1",
            'chapter_number': 1,
            'title': "Full Text",
            'content': text
        }]
    
    return chapters


def split_into_sentences(text: str) -> List[str]:
    """Split chapter text into sentences"""
    # Clean whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    if not text:
        return []
    
    # Sentence splitting - handles both English and Japanese
    # English patterns
    text = re.sub(r'([.!?])\s+(?=[A-Z""])', r'\1|||', text)
    # Japanese patterns (。！？)
    text = re.sub(r'([。！？])\s*', r'\1|||', text)
    
    sentences = [s.strip() for s in text.split('|||') if s.strip()]
    
    # Filter out very short sentences
    sentences = [s for s in sentences if len(s) > 10]
    
    return sentences


def get_book_cover(book_id: str) -> str:
    """Get cover image URL for a book"""
    return BOOK_COVERS.get(book_id, BOOK_COVERS["default"])


def detect_language(text: str) -> str:
    """Detect if text is primarily Japanese or English"""
    # Count Japanese characters
    japanese_chars = len(re.findall(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]', text[:1000]))
    total_chars = len(text[:1000].replace(' ', '').replace('\n', ''))
    
    if total_chars > 0 and japanese_chars / total_chars > 0.3:
        return "ja"
    return "en"
