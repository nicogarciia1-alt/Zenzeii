"""
Book Import Service - Handles fetching books from Project Gutenberg and processing them
"""
import re
import asyncio
import httpx
from typing import List, Dict, Optional, Tuple
import uuid
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

# Project Gutenberg book IDs for initial library
GUTENBERG_BOOKS = {
    "pride-and-prejudice": {
        "gutenberg_id": 1342,
        "title": "Pride and Prejudice",
        "author": "Jane Austen",
        "genre": "romance",
        "difficulty": "intermediate"
    },
    "alice-in-wonderland": {
        "gutenberg_id": 11,
        "title": "Alice's Adventures in Wonderland",
        "author": "Lewis Carroll",
        "genre": "fantasy",
        "difficulty": "beginner"
    },
    "anna-karenina": {
        "gutenberg_id": 1399,
        "title": "Anna Karenina",
        "author": "Leo Tolstoy",
        "genre": "literary",
        "difficulty": "advanced"
    },
    "sherlock-holmes": {
        "gutenberg_id": 1661,
        "title": "The Adventures of Sherlock Holmes",
        "author": "Arthur Conan Doyle",
        "genre": "mystery",
        "difficulty": "intermediate"
    },
    "moby-dick": {
        "gutenberg_id": 2701,
        "title": "Moby Dick",
        "author": "Herman Melville",
        "genre": "adventure",
        "difficulty": "advanced"
    }
}

# Cover images for books
BOOK_COVERS = {
    "pride-and-prejudice": "https://images.unsplash.com/photo-1474932430478-367dbb6832c1?w=400",
    "alice-in-wonderland": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400",
    "anna-karenina": "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400",
    "sherlock-holmes": "https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?w=400",
    "moby-dick": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    "default": "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400"
}


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
                    # Remove BOM if present
                    if text.startswith('\ufeff'):
                        text = text[1:]
                    return text
            except Exception as e:
                logger.warning(f"Failed to fetch from {url}: {e}")
                continue
    
    return None


def clean_gutenberg_text(text: str) -> str:
    """Remove Gutenberg headers and footers"""
    # Find start of actual content
    start_markers = [
        "*** START OF THE PROJECT GUTENBERG",
        "*** START OF THIS PROJECT GUTENBERG",
        "*END*THE SMALL PRINT",
        "***START OF THE PROJECT GUTENBERG",
    ]
    
    end_markers = [
        "*** END OF THE PROJECT GUTENBERG",
        "*** END OF THIS PROJECT GUTENBERG",
        "End of the Project Gutenberg",
        "End of Project Gutenberg",
    ]
    
    # Find start
    start_idx = 0
    for marker in start_markers:
        idx = text.find(marker)
        if idx != -1:
            # Find the end of this line
            newline_idx = text.find('\n', idx)
            if newline_idx != -1:
                start_idx = newline_idx + 1
                break
    
    # Find end
    end_idx = len(text)
    for marker in end_markers:
        idx = text.find(marker)
        if idx != -1:
            end_idx = idx
            break
    
    return text[start_idx:end_idx].strip()


def split_into_chapters(text: str, book_id: str) -> List[Dict]:
    """Split book text into chapters"""
    chapters = []
    
    # Common chapter patterns
    chapter_patterns = [
        r'^CHAPTER\s+([IVXLC\d]+)[.\s]*(.*)$',
        r'^Chapter\s+([IVXLC\d]+)[.\s]*(.*)$',
        r'^CHAPTER\s+([A-Z]+)[.\s]*(.*)$',
        r'^([IVXLC]+)\.\s*(.*)$',
        r'^ADVENTURE\s+([IVXLC\d]+)[.\s—\-]*(.*)$',
        r'^Adventure\s+([IVXLC\d]+)[.\s—\-]*(.*)$',
        r'^Part\s+([IVXLC\d]+)[.\s]*(.*)$',
        r'^PART\s+([IVXLC\d]+)[.\s]*(.*)$',
        r'^Book\s+([IVXLC\d]+)[.\s]*(.*)$',
        r'^BOOK\s+([IVXLC\d]+)[.\s]*(.*)$',
    ]
    
    lines = text.split('\n')
    current_chapter = None
    current_content = []
    chapter_num = 0
    
    for line in lines:
        is_chapter_header = False
        chapter_title = ""
        
        for pattern in chapter_patterns:
            match = re.match(pattern, line.strip(), re.IGNORECASE)
            if match:
                is_chapter_header = True
                chapter_title = match.group(2).strip() if match.group(2) else f"Chapter {match.group(1)}"
                break
        
        if is_chapter_header:
            # Save previous chapter
            if current_chapter and current_content:
                current_chapter['content'] = '\n'.join(current_content).strip()
                if len(current_chapter['content']) > 100:  # Only keep chapters with substantial content
                    chapters.append(current_chapter)
            
            # Start new chapter
            chapter_num += 1
            current_chapter = {
                'id': f"{book_id}-ch{chapter_num}",
                'book_id': book_id,
                'chapter_number': chapter_num,
                'title': chapter_title or f"Chapter {chapter_num}",
                'content': ''
            }
            current_content = []
        elif current_chapter:
            current_content.append(line)
    
    # Don't forget the last chapter
    if current_chapter and current_content:
        current_chapter['content'] = '\n'.join(current_content).strip()
        if len(current_chapter['content']) > 100:
            chapters.append(current_chapter)
    
    # If no chapters found, create one big chapter
    if not chapters:
        chapters.append({
            'id': f"{book_id}-ch1",
            'book_id': book_id,
            'chapter_number': 1,
            'title': "Full Text",
            'content': text
        })
    
    return chapters


def split_into_sentences(text: str) -> List[str]:
    """Split text into sentences"""
    # Clean up the text
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()
    
    # Split by sentence-ending punctuation
    # This regex handles: period, exclamation, question mark followed by space or end
    sentence_pattern = r'(?<=[.!?])\s+(?=[A-Z"\'])'
    sentences = re.split(sentence_pattern, text)
    
    # Clean and filter sentences
    cleaned_sentences = []
    for sentence in sentences:
        sentence = sentence.strip()
        # Skip very short sentences or those that are likely not real sentences
        if len(sentence) > 10 and any(c.isalpha() for c in sentence):
            cleaned_sentences.append(sentence)
    
    return cleaned_sentences


def roman_to_int(roman: str) -> int:
    """Convert Roman numeral to integer"""
    roman_values = {
        'I': 1, 'V': 5, 'X': 10, 'L': 50,
        'C': 100, 'D': 500, 'M': 1000
    }
    
    total = 0
    prev_value = 0
    
    for char in reversed(roman.upper()):
        if char not in roman_values:
            return 0
        value = roman_values[char]
        if value < prev_value:
            total -= value
        else:
            total += value
        prev_value = value
    
    return total


async def search_gutenberg(query: str) -> List[Dict]:
    """Search Project Gutenberg for books"""
    search_url = f"https://gutendex.com/books/?search={query}"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(search_url)
            if response.status_code == 200:
                data = response.json()
                books = []
                for book in data.get('results', [])[:20]:
                    # Get the first author
                    authors = book.get('authors', [])
                    author = authors[0]['name'] if authors else 'Unknown'
                    
                    books.append({
                        'gutenberg_id': book['id'],
                        'title': book['title'],
                        'author': author,
                        'languages': book.get('languages', []),
                        'download_count': book.get('download_count', 0)
                    })
                return books
        except Exception as e:
            logger.error(f"Gutenberg search failed: {e}")
    
    return []


def get_book_metadata(book_id: str) -> Optional[Dict]:
    """Get metadata for a known book"""
    return GUTENBERG_BOOKS.get(book_id)


def get_book_cover(book_id: str) -> str:
    """Get cover image URL for a book"""
    return BOOK_COVERS.get(book_id, BOOK_COVERS['default'])
