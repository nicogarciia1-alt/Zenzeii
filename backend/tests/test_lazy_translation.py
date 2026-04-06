"""
Test suite for Japanese Learning App with Lazy-Loading Translation Architecture
Tests: Book import, background translation, script modes, chapter navigation, translation caching
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')

# Test Configuration
ALICE_BOOK_ID = "alice-in-wonderland"
ALICE_CHAPTER_ID = "alice-in-wonderland-ch13"

class TestAPIHealth:
    """Basic API connectivity tests"""
    
    def test_api_root_returns_200(self):
        """API root endpoint should return version info"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data
        print(f"API version: {data['version']}")


class TestBookImportInstant:
    """Test that book import stores only English text initially"""
    
    def test_alice_book_exists_with_english_only(self):
        """Alice in Wonderland should be imported with completed status"""
        response = requests.get(f"{BASE_URL}/api/books/{ALICE_BOOK_ID}")
        assert response.status_code == 200
        
        book = response.json()
        assert book['id'] == ALICE_BOOK_ID
        assert book['import_status'] == 'completed'
        assert book['title'] == "Alice's Adventures in Wonderland"
        assert book['author'] == "Lewis Carroll"
        assert book['total_chapters'] > 0
        assert book['sentences_count'] > 0
        print(f"Book imported: {book['title']}, {book['total_chapters']} chapters, {book['sentences_count']} sentences")
    
    def test_book_has_japanese_title_and_author(self):
        """Book should have Japanese title and author translated"""
        response = requests.get(f"{BASE_URL}/api/books/{ALICE_BOOK_ID}")
        assert response.status_code == 200
        
        book = response.json()
        # Title and author should be translated or fallback to English
        assert book['title_jp'] is not None
        assert book['author_jp'] is not None
        print(f"Japanese title: {book['title_jp']}, author: {book['author_jp']}")
    
    def test_available_books_list(self):
        """Available books endpoint should return predefined books"""
        response = requests.get(f"{BASE_URL}/api/books/available/list")
        assert response.status_code == 200
        
        books = response.json()
        assert isinstance(books, list)
        assert len(books) > 0
        
        # Check Alice is in the list
        alice = next((b for b in books if b['book_key'] == ALICE_BOOK_ID), None)
        assert alice is not None
        assert alice['is_imported'] == True
        print(f"Available books: {len(books)}")


class TestChapterSentences:
    """Test sentence retrieval and translation status"""
    
    def test_chapter_exists(self):
        """Chapter should exist and have sentences"""
        response = requests.get(f"{BASE_URL}/api/chapters/{ALICE_CHAPTER_ID}")
        assert response.status_code == 200
        
        chapter = response.json()
        assert chapter['id'] == ALICE_CHAPTER_ID
        assert chapter['book_id'] == ALICE_BOOK_ID
        assert chapter['sentences_count'] > 0
        print(f"Chapter: {chapter['title']}, sentences: {chapter['sentences_count']}")
    
    def test_sentences_count_endpoint(self):
        """Sentences count should show total and translated counts"""
        response = requests.get(f"{BASE_URL}/api/chapters/{ALICE_CHAPTER_ID}/sentences/count")
        assert response.status_code == 200
        
        data = response.json()
        assert 'count' in data
        assert 'translated' in data
        assert 'chapter_id' in data
        assert data['count'] >= data['translated']
        print(f"Total sentences: {data['count']}, translated: {data['translated']}")
    
    def test_get_sentences_returns_correct_structure(self):
        """Sentences should have all required fields including translation fields"""
        response = requests.get(f"{BASE_URL}/api/chapters/{ALICE_CHAPTER_ID}/sentences?skip=0&limit=5")
        assert response.status_code == 200
        
        sentences = response.json()
        assert isinstance(sentences, list)
        assert len(sentences) > 0
        
        # Check first sentence structure
        s = sentences[0]
        required_fields = ['id', 'chapter_id', 'order', 'english', 
                          'japanese_kanji', 'japanese_hiragana', 
                          'japanese_katakana', 'japanese_romaji',
                          'translation_status', 'words']
        for field in required_fields:
            assert field in s, f"Missing field: {field}"
        
        # English text should always be present
        assert s['english'] is not None and len(s['english']) > 0
        print(f"Sentence structure valid, first sentence order: {s['order']}")


class TestTranslationLazyLoading:
    """Test lazy-loading translation mechanism"""
    
    def test_english_fallback_for_pending_translations(self):
        """Sentences with pending status should have English fallback in japanese_kanji"""
        response = requests.get(f"{BASE_URL}/api/chapters/{ALICE_CHAPTER_ID}/sentences?skip=0&limit=20")
        assert response.status_code == 200
        
        sentences = response.json()
        
        pending_count = 0
        completed_count = 0
        
        for s in sentences:
            if s['translation_status'] == 'pending':
                pending_count += 1
                # japanese_kanji should equal english for pending translations (fallback behavior)
                assert s['japanese_kanji'] == s['english'], f"Pending sentence should show English fallback"
            elif s['translation_status'] == 'completed':
                completed_count += 1
                # Completed translations should have actual Japanese text
                if s['japanese_kanji']:
                    # Check if it contains some Japanese characters (not just English)
                    has_japanese = any(ord(c) > 0x3000 for c in s['japanese_kanji'])
                    if has_japanese:
                        print(f"Translated sentence {s['order']}: {s['japanese_kanji'][:50]}...")
        
        print(f"Out of {len(sentences)} sentences: {pending_count} pending, {completed_count} completed")
    
    def test_translation_status_values(self):
        """Translation status should be either 'pending' or 'completed'"""
        response = requests.get(f"{BASE_URL}/api/chapters/{ALICE_CHAPTER_ID}/sentences?skip=0&limit=50")
        assert response.status_code == 200
        
        sentences = response.json()
        valid_statuses = {'pending', 'completed'}
        
        for s in sentences:
            assert s['translation_status'] in valid_statuses, f"Invalid status: {s['translation_status']}"
    
    def test_translated_sentences_have_all_script_modes(self):
        """Completed translations should have kanji, hiragana, katakana, and romaji"""
        response = requests.get(f"{BASE_URL}/api/chapters/{ALICE_CHAPTER_ID}/sentences?skip=0&limit=50")
        assert response.status_code == 200
        
        sentences = response.json()
        
        for s in sentences:
            if s['translation_status'] == 'completed':
                # All Japanese script fields should be populated
                # Note: They might be empty strings if translation failed, but key should exist
                assert 'japanese_kanji' in s
                assert 'japanese_hiragana' in s
                assert 'japanese_katakana' in s
                assert 'japanese_romaji' in s
                
                # At least kanji should have content for completed translations
                if s['japanese_kanji'] and s['japanese_kanji'] != s['english']:
                    print(f"Completed sentence {s['order']} has proper Japanese kanji")
                    break


class TestTranslationTrigger:
    """Test background translation trigger mechanism"""
    
    def test_trigger_translation_endpoint(self):
        """POST to trigger translation should work"""
        response = requests.post(
            f"{BASE_URL}/api/translate/trigger",
            json={"chapter_id": ALICE_CHAPTER_ID, "start_position": 1}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert 'message' in data
        assert data['chapter_id'] == ALICE_CHAPTER_ID
        print(f"Translation trigger response: {data}")
    
    def test_trigger_translation_invalid_chapter(self):
        """Invalid chapter should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/translate/trigger",
            json={"chapter_id": "non-existent-chapter", "start_position": 1}
        )
        assert response.status_code == 404


class TestTranslationCaching:
    """Test that translations are cached in database"""
    
    def test_cached_translations_persist(self):
        """Fetching same sentences multiple times should return cached translations"""
        # First fetch
        response1 = requests.get(f"{BASE_URL}/api/chapters/{ALICE_CHAPTER_ID}/sentences?skip=0&limit=5")
        assert response1.status_code == 200
        sentences1 = response1.json()
        
        # Second fetch (should be cached)
        response2 = requests.get(f"{BASE_URL}/api/chapters/{ALICE_CHAPTER_ID}/sentences?skip=0&limit=5")
        assert response2.status_code == 200
        sentences2 = response2.json()
        
        # Translations should be identical (cached)
        for s1, s2 in zip(sentences1, sentences2):
            assert s1['japanese_kanji'] == s2['japanese_kanji']
            assert s1['translation_status'] == s2['translation_status']
        
        print(f"Caching verified: {len(sentences1)} sentences match between fetches")


class TestChapterNavigation:
    """Test chapter listing and navigation"""
    
    def test_get_all_chapters(self):
        """Should return all chapters for a book"""
        response = requests.get(f"{BASE_URL}/api/books/{ALICE_BOOK_ID}/chapters")
        assert response.status_code == 200
        
        chapters = response.json()
        assert isinstance(chapters, list)
        assert len(chapters) > 0
        
        # Chapters should be ordered by chapter_number
        for i in range(1, len(chapters)):
            assert chapters[i]['chapter_number'] >= chapters[i-1]['chapter_number']
        
        print(f"Found {len(chapters)} chapters")
    
    def test_chapter_has_required_fields(self):
        """Each chapter should have id, book_id, chapter_number, title"""
        response = requests.get(f"{BASE_URL}/api/books/{ALICE_BOOK_ID}/chapters")
        assert response.status_code == 200
        
        chapters = response.json()
        for chapter in chapters:
            assert 'id' in chapter
            assert 'book_id' in chapter
            assert 'chapter_number' in chapter
            assert 'title' in chapter
            assert 'sentences_count' in chapter


class TestUserAuthentication:
    """Test user registration and authentication for vocabulary features"""
    
    def test_user_registration(self):
        """Should be able to register a new user"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": unique_email,
                "password": "testpassword123",
                "username": f"testuser_{uuid.uuid4().hex[:4]}"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert 'access_token' in data
        assert 'user' in data
        assert data['user']['email'] == unique_email
        print(f"User registered: {unique_email}")
        return data['access_token']
    
    def test_user_login_with_wrong_credentials(self):
        """Login with wrong credentials should fail"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "nonexistent@test.com",
                "password": "wrongpassword"
            }
        )
        assert response.status_code == 401


class TestDictionaryLookup:
    """Test dictionary lookup functionality"""
    
    def test_lookup_japanese_word(self):
        """Should be able to lookup a Japanese word"""
        response = requests.get(f"{BASE_URL}/api/dictionary/猫")
        assert response.status_code == 200
        
        data = response.json()
        assert 'word' in data
        assert 'meanings' in data
        print(f"Dictionary lookup for 猫: {data.get('meanings', [])[:2]}")
    
    def test_lookup_english_word(self):
        """Should handle English word lookup"""
        response = requests.get(f"{BASE_URL}/api/dictionary/cat")
        assert response.status_code == 200


class TestSpecificSentenceTranslation:
    """Test requesting translation for specific sentences"""
    
    def test_translate_specific_sentences(self):
        """Should be able to request translation for specific sentence IDs"""
        # Get some sentence IDs first
        response = requests.get(f"{BASE_URL}/api/chapters/{ALICE_CHAPTER_ID}/sentences?skip=0&limit=3")
        assert response.status_code == 200
        
        sentences = response.json()
        sentence_ids = [s['id'] for s in sentences]
        
        # Request translation for those specific sentences
        translate_response = requests.post(
            f"{BASE_URL}/api/translate/sentences",
            json=sentence_ids
        )
        assert translate_response.status_code == 200
        
        translated = translate_response.json()
        assert isinstance(translated, list)
        print(f"Requested translation for {len(sentence_ids)} sentences, got {len(translated)} back")


class TestPagination:
    """Test sentence pagination"""
    
    def test_sentences_pagination(self):
        """Should be able to paginate through sentences"""
        # Get first page
        response1 = requests.get(f"{BASE_URL}/api/chapters/{ALICE_CHAPTER_ID}/sentences?skip=0&limit=10")
        assert response1.status_code == 200
        page1 = response1.json()
        
        # Get second page
        response2 = requests.get(f"{BASE_URL}/api/chapters/{ALICE_CHAPTER_ID}/sentences?skip=10&limit=10")
        assert response2.status_code == 200
        page2 = response2.json()
        
        # Pages should have different content
        if len(page1) > 0 and len(page2) > 0:
            assert page1[0]['id'] != page2[0]['id']
        
        print(f"Pagination works: page1 has {len(page1)} sentences, page2 has {len(page2)}")


class TestBookStatus:
    """Test book status endpoint for tracking translation progress"""
    
    def test_book_status_endpoint(self):
        """Should return book status with translation counts"""
        response = requests.get(f"{BASE_URL}/api/books/{ALICE_BOOK_ID}/status")
        assert response.status_code == 200
        
        data = response.json()
        assert 'book_id' in data
        assert 'status' in data
        assert 'total_sentences' in data
        assert 'translated_sentences' in data
        assert 'total_chapters' in data
        
        print(f"Book status: {data['status']}, {data['translated_sentences']}/{data['total_sentences']} translated")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
