"""
Test suite for Japanese Reading App - Focus on chapter numbering fixes
Tests: 
1. Chapter numbering starts at 1
2. Full chapter content with paragraphs
3. Translation system is active
4. Book import creates chapters correctly
5. Homepage shows correct chapter counts
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')


class TestChapterNumbering:
    """Test that chapters start at 1, not 13 or higher (Bug fix verification)"""
    
    def test_alice_chapters_start_at_1(self):
        """Verify Alice in Wonderland chapters start at chapter 1"""
        response = requests.get(f"{BASE_URL}/api/books/alice-in-wonderland/chapters")
        assert response.status_code == 200
        
        chapters = response.json()
        assert len(chapters) == 12, f"Expected 12 chapters, got {len(chapters)}"
        
        # First chapter should be chapter_number 1
        assert chapters[0]['chapter_number'] == 1, f"First chapter number should be 1, got {chapters[0]['chapter_number']}"
        assert chapters[0]['id'] == 'alice-in-wonderland-ch1', f"First chapter ID should be alice-in-wonderland-ch1"
        
        # Verify sequential numbering
        for i, ch in enumerate(chapters):
            assert ch['chapter_number'] == i + 1, f"Chapter {i+1} has wrong number: {ch['chapter_number']}"
    
    def test_moby_dick_chapters_start_at_1(self):
        """Verify Moby Dick chapters start at chapter 1"""
        response = requests.get(f"{BASE_URL}/api/books/moby-dick/chapters")
        assert response.status_code == 200
        
        chapters = response.json()
        assert len(chapters) == 151, f"Expected 151 chapters, got {len(chapters)}"
        
        # First chapter should be chapter_number 1
        assert chapters[0]['chapter_number'] == 1
        assert chapters[0]['id'] == 'moby-dick-ch1'
        
        # Verify first 5 chapters are sequential
        for i in range(min(5, len(chapters))):
            assert chapters[i]['chapter_number'] == i + 1


class TestChapterContent:
    """Test that reader shows full chapter content with proper paragraphs"""
    
    def test_alice_chapter_has_full_paragraphs(self):
        """Verify chapter content has full paragraphs, not fragmented sentences"""
        response = requests.get(f"{BASE_URL}/api/chapters/alice-in-wonderland-ch1/sentences?limit=25")
        assert response.status_code == 200
        
        sentences = response.json()
        assert len(sentences) >= 10, f"Chapter should have substantial content, got {len(sentences)} sentences"
        
        # Check that sentences are full paragraphs (substantial length)
        long_paragraphs = [s for s in sentences if len(s.get('english', '')) > 100]
        assert len(long_paragraphs) >= 3, "Should have several full paragraphs (>100 chars)"
    
    def test_chapter_count_matches_book_metadata(self):
        """Verify book's total_chapters matches actual chapters count"""
        book_response = requests.get(f"{BASE_URL}/api/books/alice-in-wonderland")
        assert book_response.status_code == 200
        book = book_response.json()
        
        chapters_response = requests.get(f"{BASE_URL}/api/books/alice-in-wonderland/chapters")
        assert chapters_response.status_code == 200
        chapters = chapters_response.json()
        
        assert book['total_chapters'] == len(chapters), \
            f"Book reports {book['total_chapters']} chapters but found {len(chapters)}"


class TestTranslationSystem:
    """Test that translation system is active and translations appear"""
    
    def test_sentences_have_japanese_translations(self):
        """Verify sentences have Japanese translations in all formats"""
        response = requests.get(f"{BASE_URL}/api/chapters/alice-in-wonderland-ch1/sentences?limit=5")
        assert response.status_code == 200
        
        sentences = response.json()
        assert len(sentences) >= 3
        
        # Check translations exist
        for s in sentences[:3]:
            assert s.get('translation_status') == 'completed', f"Sentence {s['id']} not translated"
            assert s.get('japanese_kanji'), f"Sentence {s['id']} missing kanji translation"
            assert s.get('japanese_hiragana'), f"Sentence {s['id']} missing hiragana translation"
            assert s.get('japanese_romaji'), f"Sentence {s['id']} missing romaji translation"
    
    def test_translation_status_endpoint(self):
        """Verify translation count endpoint works"""
        response = requests.get(f"{BASE_URL}/api/chapters/alice-in-wonderland-ch1/sentences/count")
        assert response.status_code == 200
        
        data = response.json()
        assert 'count' in data
        assert 'translated' in data
        assert data['translated'] >= 1, "Should have at least some translations"
    
    def test_system_status_shows_translation_enabled(self):
        """Verify system status shows translation is enabled"""
        response = requests.get(f"{BASE_URL}/api/status")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('status') == 'healthy'
        assert data.get('translation_enabled') is True


class TestChapterNavigation:
    """Test chapter navigation works correctly"""
    
    def test_get_next_chapter(self):
        """Verify we can navigate to next chapter"""
        response = requests.get(f"{BASE_URL}/api/books/alice-in-wonderland/chapters")
        chapters = response.json()
        
        # Navigate from chapter 1 to chapter 2
        ch1_id = chapters[0]['id']
        ch2_id = chapters[1]['id']
        
        # Get chapter 2 details
        ch2_response = requests.get(f"{BASE_URL}/api/chapters/{ch2_id}")
        assert ch2_response.status_code == 200
        ch2 = ch2_response.json()
        
        assert ch2['chapter_number'] == 2
        assert ch2['id'] == 'alice-in-wonderland-ch2'
    
    def test_get_chapter_sentences(self):
        """Verify we can get sentences for different chapters"""
        # Get chapter 2 sentences
        response = requests.get(f"{BASE_URL}/api/chapters/alice-in-wonderland-ch2/sentences?limit=10")
        assert response.status_code == 200
        
        sentences = response.json()
        assert len(sentences) >= 5
        assert all(s['chapter_id'] == 'alice-in-wonderland-ch2' for s in sentences)


class TestBookLibrary:
    """Test homepage shows book library with correct chapter counts"""
    
    def test_books_list_has_chapter_counts(self):
        """Verify books list includes accurate total_chapters"""
        response = requests.get(f"{BASE_URL}/api/books")
        assert response.status_code == 200
        
        books = response.json()
        assert len(books) >= 1
        
        # Find Alice in Wonderland
        alice = next((b for b in books if b['id'] == 'alice-in-wonderland'), None)
        assert alice is not None, "Alice in Wonderland should be in library"
        assert alice['total_chapters'] == 12, f"Alice should have 12 chapters, got {alice['total_chapters']}"
        assert alice['import_status'] == 'completed'
    
    def test_books_have_required_fields(self):
        """Verify books have all required fields for homepage display"""
        response = requests.get(f"{BASE_URL}/api/books")
        books = response.json()
        
        required_fields = ['id', 'title', 'author', 'total_chapters', 'import_status', 'difficulty', 'genre']
        
        for book in books:
            for field in required_fields:
                assert field in book, f"Book {book.get('id')} missing field: {field}"


class TestScriptModes:
    """Test script toggle buttons work correctly"""
    
    def test_sentences_have_all_script_formats(self):
        """Verify sentences support all script formats (kanji, hiragana, katakana, romaji, EN)"""
        response = requests.get(f"{BASE_URL}/api/chapters/alice-in-wonderland-ch1/sentences?limit=3")
        sentences = response.json()
        
        for s in sentences:
            # English is always present (source text)
            assert 'english' in s
            
            # Japanese formats
            if s.get('translation_status') == 'completed':
                assert 'japanese_kanji' in s
                assert 'japanese_hiragana' in s
                assert 'japanese_romaji' in s


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
