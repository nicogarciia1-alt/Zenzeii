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

# Aozora Bunko popular books - with correct file paths
AOZORA_BOOKS = {
    "kokoro": {
        "aozora_id": "000148",
        "file_path": "files/773_14560.html",
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
        "file_path": "files/127_15260.html",
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
        "file_path": "files/752_14964.html",
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
        "file_path": "files/301_14912.html",
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
        "file_path": "files/52435_49812.html",
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


async def fetch_aozora_text(aozora_id: str, file_path: str) -> Optional[str]:
    """
    Fetch book text from Aozora Bunko.
    Aozora uses HTML files with Japanese text in Shift-JIS encoding.
    """
    base_url = f"https://www.aozora.gr.jp/cards/{aozora_id}/{file_path}"
    
    logger.info(f"Fetching Aozora text from: {base_url}")
    
    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        try:
            response = await client.get(base_url)
            
            if response.status_code != 200:
                logger.warning(f"Aozora returned status {response.status_code} for {base_url}")
                return None
            
            # Aozora files are Shift-JIS encoded - must decode from bytes
            try:
                text = response.content.decode('shift-jis')
            except UnicodeDecodeError:
                try:
                    text = response.content.decode('euc-jp')
                except UnicodeDecodeError:
                    text = response.content.decode('utf-8', errors='replace')
            
            # Extract main text from HTML
            extracted = extract_aozora_text_from_html(text)
            
            if extracted and len(extracted) > 100:
                logger.info(f"Successfully fetched Aozora book: {len(extracted)} characters")
                return extracted
            else:
                logger.warning(f"Extracted text too short or empty from {base_url}")
                return None
                
        except httpx.TimeoutException:
            logger.error(f"Timeout fetching from Aozora: {base_url}")
            return None
        except Exception as e:
            logger.error(f"Error fetching Aozora text: {e}")
            return None


def extract_aozora_text_from_html(html: str) -> Optional[str]:
    """
    Extract plain text from Aozora Bunko HTML format.
    Removes HTML tags, ruby annotations, and Aozora-specific markup.
    """
    import re
    
    if not html:
        return None
    
    # Find the main text body - usually inside <div class="main_text">
    main_text_match = re.search(r'<div class="main_text">(.*?)</div>', html, re.DOTALL)
    if main_text_match:
        html = main_text_match.group(1)
    
    # Remove ruby annotations but keep the base text
    # <ruby><rb>漢字</rb><rp>(</rp><rt>かんじ</rt><rp>)</rp></ruby> -> 漢字
    html = re.sub(r'<ruby>.*?<rb>([^<]+)</rb>.*?</ruby>', r'\1', html, flags=re.DOTALL)
    html = re.sub(r'<ruby>([^<]+)<rp>[（(]</rp><rt>[^<]+</rt><rp>[）)]</rp></ruby>', r'\1', html)
    
    # Remove Aozora-specific annotations in brackets
    html = re.sub(r'［＃[^］]*］', '', html)
    html = re.sub(r'《[^》]*》', '', html)  # Furigana in angle brackets
    html = re.sub(r'｜', '', html)  # Ruby base markers
    
    # Remove all remaining HTML tags
    html = re.sub(r'<br\s*/?>', '\n', html)
    html = re.sub(r'<[^>]+>', '', html)
    
    # Clean up entities
    html = html.replace('&nbsp;', ' ')
    html = html.replace('&lt;', '<')
    html = html.replace('&gt;', '>')
    html = html.replace('&amp;', '&')
    html = html.replace('&quot;', '"')
    
    # Clean up whitespace
    text = re.sub(r'[ \t]+', ' ', html)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = text.strip()
    
    return text if len(text) > 50 else None


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
    """
    Split book text into chapters.
    Preserves chapter titles from the source text.
    Skips table of contents entries (short lines).
    """
    # Patterns that detect chapter headers
    # Group 1: chapter number, Group 2: optional subtitle
    chapter_patterns = [
        (r'^CHAPTER\s+([IVXLCDM]+|\d+)[.\s]*(.*)$', "Chapter"),
        (r'^Chapter\s+([IVXLCDM]+|\d+)[.\s]*(.*)$', "Chapter"),
        (r'^BOOK\s+([IVXLCDM]+|\d+)[.\s]*(.*)$', "Book"),
        (r'^Part\s+([IVXLCDM]+|\d+)[.\s]*(.*)$', "Part"),
        (r'^第([一二三四五六七八九十百千]+)章\s*(.*)$', "第"),  # Japanese
        (r'^([一二三四五六七八九十]+)[、．.\s]+(.*)$', ""),    # Japanese numbered
    ]
    
    lines = text.split('\n')
    chapters = []
    current_chapter = None
    chapter_number = 0
    seen_chapter_nums = set()  # Track which chapter numbers we've seen
    
    for i, line in enumerate(lines):
        line = line.strip()
        is_chapter_start = False
        chapter_title = ""
        chapter_num_str = ""
        
        for pattern, prefix in chapter_patterns:
            match = re.match(pattern, line, re.IGNORECASE)
            if match:
                chapter_num_str = match.group(1)
                subtitle = match.group(2).strip() if len(match.groups()) > 1 else ""
                
                # Check if this is a TOC entry (short line) vs actual chapter header
                # TOC entries are usually followed by other chapter listings
                # Real chapters are followed by content
                
                # Look at next few lines to determine if this is TOC
                next_lines_content = 0
                for j in range(i+1, min(i+5, len(lines))):
                    next_line = lines[j].strip()
                    if next_line and len(next_line) > 50:  # Substantial content
                        next_lines_content += 1
                
                # If we already saw this chapter number, this is the real one
                if chapter_num_str in seen_chapter_nums:
                    is_chapter_start = True
                    seen_chapter_nums.discard(chapter_num_str)  # Reset to allow reuse
                elif next_lines_content >= 2:
                    # Has content after it - it's a real chapter
                    is_chapter_start = True
                else:
                    # Likely a TOC entry - mark as seen but don't create chapter
                    seen_chapter_nums.add(chapter_num_str)
                
                if is_chapter_start:
                    # Build the title
                    if prefix:
                        original_header = f"{prefix} {chapter_num_str}"
                    else:
                        original_header = chapter_num_str
                    
                    if subtitle:
                        chapter_title = f"{original_header}: {subtitle}"
                    else:
                        chapter_title = original_header
                break
        
        if is_chapter_start:
            if current_chapter and current_chapter['content'].strip():
                chapters.append(current_chapter)
            
            chapter_number += 1
            current_chapter = {
                'id': f"{book_id}-ch{chapter_number}",
                'chapter_number': chapter_number,
                'title': chapter_title,
                'content': ""
            }
        elif current_chapter:
            current_chapter['content'] += line + '\n'
    
    if current_chapter and current_chapter['content'].strip():
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


def split_into_paragraphs(text: str) -> List[str]:
    """
    Split chapter text into natural paragraphs.
    Preserves the reading flow by keeping paragraphs together.
    """
    if not text:
        return []
    
    # Split on double newlines (paragraph breaks)
    paragraphs = re.split(r'\n\s*\n', text)
    
    # Clean each paragraph
    result = []
    for para in paragraphs:
        # Clean up whitespace within paragraph
        cleaned = re.sub(r'\s+', ' ', para).strip()
        
        # Skip very short paragraphs (likely artifacts)
        if len(cleaned) < 20:
            continue
        
        # If paragraph is too long (>2000 chars), split into sentences
        if len(cleaned) > 2000:
            sentences = split_long_text_into_sentences(cleaned)
            result.extend(sentences)
        else:
            result.append(cleaned)
    
    return result


def split_long_text_into_sentences(text: str) -> List[str]:
    """
    Split a long text block into individual sentences.
    Only used for very long paragraphs.
    """
    # English sentence patterns
    text = re.sub(r'([.!?])\s+(?=[A-Z"\'\(])', r'\1|||SPLIT|||', text)
    # Japanese sentence endings
    text = re.sub(r'([。！？」])\s*', r'\1|||SPLIT|||', text)
    
    sentences = [s.strip() for s in text.split('|||SPLIT|||') if s.strip()]
    
    # Filter out very short fragments
    return [s for s in sentences if len(s) > 30]


def split_into_sentences(text: str) -> List[str]:
    """
    Split chapter text into readable units (paragraphs preferred).
    This is the main function called during import.
    """
    return split_into_paragraphs(text)


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
