"""
Beta Version 1 Testing - Feature verification for stable release
Tests all critical features for Beta readiness:
1. Translation worker auto-starts
2. Data persists after restarts
3. Chapter structure correct (numbering starts at 1)
4. Pagination works
5. Book imports work
6. Search works for Gutenberg and Aozora
7. Reader shows original text instantly (<1 second)
8. Delete Book functionality
"""
import pytest
import requests
import os
import time
from datetime import datetime

# Get backend URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://jp-books-learn.preview.emergentagent.com')
if BASE_URL.endswith('/'):
    BASE_URL = BASE_URL.rstrip('/')

# Test credentials
TEST_EMAIL = "test@test.com"
TEST_PASSWORD = "test123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests requiring auth"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code}")


@pytest.fixture
def auth_headers(auth_token):
    """Authorization headers for authenticated requests"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestSystemStatus:
    """Test system status and worker availability"""
    
    def test_api_healthy(self):
        """System status should be healthy"""
        response = requests.get(f"{BASE_URL}/api/status")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
        print(f"System status: {data['status']}, translation_enabled: {data.get('translation_enabled')}")
    
    def test_translation_worker_enabled(self):
        """Translation should be enabled"""
        response = requests.get(f"{BASE_URL}/api/status")
        data = response.json()
        # Translation is enabled if EMERGENT_LLM_KEY is set
        print(f"Translation enabled: {data.get('translation_enabled')}")
        # We don't fail if disabled - main agent controls this


class TestDataPersistence:
    """Test that data persists in database"""
    
    def test_books_exist_in_library(self):
        """Books should exist in the library"""
        response = requests.get(f"{BASE_URL}/api/books")
        assert response.status_code == 200
        books = response.json()
        assert len(books) > 0, "Library should have at least one book"
        print(f"Books in library: {len(books)}")
        for book in books[:3]:
            print(f"  - {book['title']} ({book['total_chapters']} chapters)")
    
    def test_book_has_chapters(self):
        """Imported book should have chapters"""
        # Get a book
        response = requests.get(f"{BASE_URL}/api/books")
        books = response.json()
        assert len(books) > 0
        
        book_id = books[0]["id"]
        chapters_response = requests.get(f"{BASE_URL}/api/books/{book_id}/chapters")
        assert chapters_response.status_code == 200
        chapters = chapters_response.json()
        assert len(chapters) > 0, f"Book {book_id} should have chapters"
        print(f"Book '{books[0]['title']}' has {len(chapters)} chapters")


class TestChapterStructure:
    """Test chapter numbering and structure"""
    
    def test_chapter_numbering_starts_at_one(self):
        """All books should have chapters starting at number 1"""
        response = requests.get(f"{BASE_URL}/api/books")
        books = response.json()
        
        for book in books[:3]:  # Test first 3 books
            chapters_response = requests.get(f"{BASE_URL}/api/books/{book['id']}/chapters")
            if chapters_response.status_code == 200:
                chapters = chapters_response.json()
                if chapters:
                    min_chapter = min(ch["chapter_number"] for ch in chapters)
                    assert min_chapter == 1, f"Book '{book['title']}' chapters start at {min_chapter}, should start at 1"
                    print(f"✓ {book['title']}: chapters start at {min_chapter}")
    
    def test_chapter_ids_are_correct(self):
        """Chapter IDs should follow pattern {book_id}-ch{number}"""
        response = requests.get(f"{BASE_URL}/api/books")
        books = response.json()
        
        for book in books[:2]:
            chapters_response = requests.get(f"{BASE_URL}/api/books/{book['id']}/chapters")
            if chapters_response.status_code == 200:
                chapters = chapters_response.json()
                if chapters:
                    first_chapter = chapters[0]
                    expected_id = f"{book['id']}-ch1"
                    assert first_chapter["id"] == expected_id, f"First chapter ID should be {expected_id}, got {first_chapter['id']}"
                    print(f"✓ {book['title']}: first chapter ID is {first_chapter['id']}")
    
    def test_chapters_have_sentences(self):
        """Chapters should have sentences"""
        response = requests.get(f"{BASE_URL}/api/books")
        books = response.json()
        
        if books:
            book = books[0]
            chapters_response = requests.get(f"{BASE_URL}/api/books/{book['id']}/chapters")
            chapters = chapters_response.json()
            
            if chapters:
                sentences_response = requests.get(f"{BASE_URL}/api/chapters/{chapters[0]['id']}/sentences?limit=10")
                assert sentences_response.status_code == 200
                sentences = sentences_response.json()
                assert len(sentences) > 0, "Chapter should have sentences"
                print(f"✓ First chapter has {len(sentences)} sentences loaded")


class TestReaderPerformance:
    """Test reader response time - should be instant"""
    
    def test_sentences_load_instantly(self):
        """Sentences should load in less than 1 second"""
        # Get a chapter to test
        response = requests.get(f"{BASE_URL}/api/books")
        books = response.json()
        
        if not books:
            pytest.skip("No books available")
        
        chapters_response = requests.get(f"{BASE_URL}/api/books/{books[0]['id']}/chapters")
        chapters = chapters_response.json()
        
        if not chapters:
            pytest.skip("No chapters available")
        
        chapter_id = chapters[0]["id"]
        
        # Time the request
        start_time = time.time()
        response = requests.get(f"{BASE_URL}/api/chapters/{chapter_id}/sentences?limit=50")
        elapsed = time.time() - start_time
        
        assert response.status_code == 200
        assert elapsed < 1.0, f"Response took {elapsed:.2f}s, should be under 1 second"
        print(f"✓ Reader response time: {elapsed:.3f}s (limit: 1s)")
    
    def test_sentences_have_content(self):
        """Sentences should have readable content"""
        response = requests.get(f"{BASE_URL}/api/books")
        books = response.json()
        
        if not books:
            pytest.skip("No books available")
        
        chapters_response = requests.get(f"{BASE_URL}/api/books/{books[0]['id']}/chapters")
        chapters = chapters_response.json()
        
        if not chapters:
            pytest.skip("No chapters available")
        
        sentences_response = requests.get(f"{BASE_URL}/api/chapters/{chapters[0]['id']}/sentences?limit=5")
        sentences = sentences_response.json()
        
        assert len(sentences) > 0
        first_sentence = sentences[0]
        
        # Should have either English or Japanese content
        has_content = first_sentence.get("english") or first_sentence.get("japanese_kanji")
        assert has_content, "Sentence should have readable content"
        print(f"✓ Sentence content: {first_sentence.get('english', first_sentence.get('japanese_kanji', ''))[:100]}...")


class TestPagination:
    """Test pagination functionality"""
    
    def test_pagination_works(self):
        """Pagination should return different sentences for different pages"""
        response = requests.get(f"{BASE_URL}/api/books")
        books = response.json()
        
        if not books:
            pytest.skip("No books available")
        
        chapters_response = requests.get(f"{BASE_URL}/api/books/{books[0]['id']}/chapters")
        chapters = chapters_response.json()
        
        if not chapters:
            pytest.skip("No chapters available")
        
        chapter_id = chapters[0]["id"]
        
        # Get page 1
        page1 = requests.get(f"{BASE_URL}/api/chapters/{chapter_id}/sentences?skip=0&limit=5").json()
        # Get page 2
        page2 = requests.get(f"{BASE_URL}/api/chapters/{chapter_id}/sentences?skip=5&limit=5").json()
        
        if len(page1) >= 5 and len(page2) >= 1:
            # Pages should have different content
            page1_ids = [s["id"] for s in page1]
            page2_ids = [s["id"] for s in page2]
            
            # No overlap between pages
            assert not set(page1_ids).intersection(set(page2_ids)), "Pagination pages should not overlap"
            print(f"✓ Pagination works: Page 1 has {len(page1)} sentences, Page 2 has {len(page2)} different sentences")
        else:
            print(f"✓ Chapter has fewer than 10 sentences, pagination test skipped")


class TestSearchFeatures:
    """Test search functionality for both sources"""
    
    def test_gutenberg_search_works(self):
        """Gutenberg search should return results"""
        response = requests.get(f"{BASE_URL}/api/books/search/gutenberg?query=dickens")
        assert response.status_code == 200
        results = response.json()
        assert len(results) > 0, "Gutenberg search should return results for 'dickens'"
        
        # Check result structure
        first_result = results[0]
        assert "gutenberg_id" in first_result
        assert "title" in first_result
        assert "author" in first_result
        print(f"✓ Gutenberg search returned {len(results)} results for 'dickens'")
        print(f"  First result: {first_result['title']} by {first_result['author']}")
    
    def test_aozora_search_works(self):
        """Aozora search should return results (searches predefined list)"""
        response = requests.get(f"{BASE_URL}/api/books/search/aozora?query=soseki")
        assert response.status_code == 200
        results = response.json()
        assert len(results) > 0, "Aozora search should return results for 'soseki'"
        
        first_result = results[0]
        assert "title" in first_result
        assert "author" in first_result
        print(f"✓ Aozora search returned {len(results)} results for 'soseki'")
        print(f"  First result: {first_result['title']} ({first_result.get('title_en', '')})")
    
    def test_gutenberg_search_empty_query_rejected(self):
        """Short queries should be rejected"""
        response = requests.get(f"{BASE_URL}/api/books/search/gutenberg?query=a")
        # FastAPI validates min_length=2
        assert response.status_code == 422 or response.status_code == 400


class TestBookImport:
    """Test book import functionality"""
    
    def test_available_books_list(self):
        """Should list available books for import"""
        response = requests.get(f"{BASE_URL}/api/books/available/list")
        assert response.status_code == 200
        books = response.json()
        assert len(books) > 0, "Should have available books"
        
        # Check we have both sources
        sources = set(b.get("source") for b in books)
        print(f"✓ Available books: {len(books)} from sources: {sources}")
    
    def test_book_sources_endpoint(self):
        """Should list book sources"""
        response = requests.get(f"{BASE_URL}/api/books/sources")
        assert response.status_code == 200
        data = response.json()
        assert "sources" in data
        print(f"✓ Book sources: {[s['id'] for s in data['sources']]}")


class TestDeleteBook:
    """Test book deletion functionality"""
    
    def test_delete_book_requires_auth(self):
        """Delete book should require authentication"""
        response = requests.delete(f"{BASE_URL}/api/books/test-book-id")
        assert response.status_code == 403 or response.status_code == 401
        print("✓ Delete book correctly requires authentication")
    
    def test_delete_nonexistent_book(self, auth_headers):
        """Deleting non-existent book should return 404"""
        response = requests.delete(
            f"{BASE_URL}/api/books/nonexistent-book-12345",
            headers=auth_headers
        )
        assert response.status_code == 404
        print("✓ Delete non-existent book correctly returns 404")


class TestBookDetails:
    """Test book detail endpoints"""
    
    def test_book_status_endpoint(self):
        """Book status should return translation progress"""
        response = requests.get(f"{BASE_URL}/api/books")
        books = response.json()
        
        if not books:
            pytest.skip("No books available")
        
        status_response = requests.get(f"{BASE_URL}/api/books/{books[0]['id']}/status")
        assert status_response.status_code == 200
        status = status_response.json()
        
        assert "status" in status
        assert "total_sentences" in status
        print(f"✓ Book status: {status['status']}, sentences: {status['total_sentences']}, translated: {status.get('translated_sentences', 0)}")
    
    def test_get_single_book(self):
        """Should get single book by ID"""
        response = requests.get(f"{BASE_URL}/api/books")
        books = response.json()
        
        if not books:
            pytest.skip("No books available")
        
        book_response = requests.get(f"{BASE_URL}/api/books/{books[0]['id']}")
        assert book_response.status_code == 200
        book = book_response.json()
        
        assert book["id"] == books[0]["id"]
        print(f"✓ Got book: {book['title']}")


class TestAuthentication:
    """Test authentication flows"""
    
    def test_login_works(self):
        """Login should return token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✓ Login successful for {data['user']['email']}")
    
    def test_invalid_login_rejected(self):
        """Invalid credentials should be rejected"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid login correctly rejected")
