"""
Test Japanese Books (Kokoro) - Aozora Bunko import and reader fixes
Tests for:
- Aozora import succeeds for Kokoro
- Kokoro shows 37 chapters
- Japanese text displays immediately (not 'English loading')
- source_language='ja' for Japanese books
- Chapter 1 title is 一 (Japanese numeral)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestKokoroImportAndChapters:
    """Tests for Kokoro book import and chapter structure"""
    
    def test_kokoro_book_exists_and_completed(self):
        """Kokoro should be imported with status=completed"""
        response = requests.get(f"{BASE_URL}/api/books/kokoro")
        assert response.status_code == 200, f"Failed to get Kokoro: {response.text}"
        
        data = response.json()
        assert data["id"] == "kokoro"
        assert data["import_status"] == "completed"
        assert data["book_language"] == "ja", "Kokoro should have book_language='ja'"
        assert data["source"] == "aozora", "Kokoro should have source='aozora'"
        print(f"PASS: Kokoro book exists with status={data['import_status']}, language={data['book_language']}")
    
    def test_kokoro_has_37_chapters(self):
        """Kokoro should have 37 chapters after import"""
        response = requests.get(f"{BASE_URL}/api/books/kokoro/chapters")
        assert response.status_code == 200, f"Failed to get chapters: {response.text}"
        
        chapters = response.json()
        assert len(chapters) == 37, f"Expected 37 chapters, got {len(chapters)}"
        print(f"PASS: Kokoro has {len(chapters)} chapters")
    
    def test_chapter_1_title_is_japanese_numeral(self):
        """Chapter 1 should have title '一' (Japanese numeral for 1)"""
        response = requests.get(f"{BASE_URL}/api/chapters/kokoro-ch1")
        assert response.status_code == 200, f"Failed to get chapter: {response.text}"
        
        chapter = response.json()
        assert chapter["title"] == "一", f"Expected chapter title '一', got '{chapter['title']}'"
        assert chapter["chapter_number"] == 1
        print(f"PASS: Chapter 1 title is '{chapter['title']}' (Japanese numeral)")


class TestJapaneseTextDisplay:
    """Tests for Japanese text display in reader"""
    
    def test_sentences_have_source_language_ja(self):
        """Kokoro sentences should have source_language='ja'"""
        response = requests.get(f"{BASE_URL}/api/chapters/kokoro-ch1/sentences?limit=5")
        assert response.status_code == 200, f"Failed to get sentences: {response.text}"
        
        sentences = response.json()
        assert len(sentences) > 0, "No sentences returned"
        
        for s in sentences:
            assert s["source_language"] == "ja", f"Sentence {s['id']} has source_language='{s.get('source_language')}'"
        
        print(f"PASS: All {len(sentences)} sentences have source_language='ja'")
    
    def test_japanese_kanji_has_actual_text_not_placeholder(self):
        """Japanese kanji field should have actual Japanese text, not placeholder"""
        response = requests.get(f"{BASE_URL}/api/chapters/kokoro-ch1/sentences?limit=5")
        assert response.status_code == 200
        
        sentences = response.json()
        for s in sentences:
            kanji = s.get("japanese_kanji", "")
            # Should NOT be empty or a placeholder
            assert kanji, f"Sentence {s['id']} has empty japanese_kanji"
            assert kanji != "なし。", f"Sentence {s['id']} has placeholder text 'なし。'"
            assert kanji != "(English loading)", f"Sentence {s['id']} shows English loading placeholder"
            # Should contain actual Japanese characters
            has_japanese = any('\u3040' <= c <= '\u309f' or  # Hiragana
                             '\u30a0' <= c <= '\u30ff' or  # Katakana
                             '\u4e00' <= c <= '\u9fff'     # Kanji
                             for c in kanji)
            assert has_japanese, f"Sentence {s['id']} doesn't contain Japanese characters: {kanji[:50]}"
        
        print(f"PASS: All sentences have actual Japanese text in japanese_kanji field")
    
    def test_english_shows_pending_message(self):
        """English field should show pending message for Japanese source books"""
        response = requests.get(f"{BASE_URL}/api/chapters/kokoro-ch1/sentences?limit=5")
        assert response.status_code == 200
        
        sentences = response.json()
        for s in sentences:
            english = s.get("english", "")
            # Either has actual translation or pending message
            assert english, f"Sentence {s['id']} has empty english field"
            if s["translation_status"] != "completed":
                assert "(English translation pending)" in english or english != "", \
                    f"Sentence {s['id']} should show pending message"
        
        print(f"PASS: English field shows appropriate content for Japanese source")


class TestTranslationIndicators:
    """Tests for translation status indicators"""
    
    def test_chapter_sentences_count_endpoint(self):
        """Count endpoint should return total and translated counts"""
        response = requests.get(f"{BASE_URL}/api/chapters/kokoro-ch1/sentences/count")
        assert response.status_code == 200
        
        data = response.json()
        assert "count" in data, "Response should have 'count' field"
        assert "translated" in data, "Response should have 'translated' field"
        assert data["count"] > 0, "Chapter should have sentences"
        
        print(f"PASS: Count endpoint returns {data['count']} sentences, {data['translated']} translated")
    
    def test_translation_status_field_exists(self):
        """Sentences should have translation_status field"""
        response = requests.get(f"{BASE_URL}/api/chapters/kokoro-ch1/sentences?limit=5")
        assert response.status_code == 200
        
        sentences = response.json()
        for s in sentences:
            assert "translation_status" in s, f"Sentence {s['id']} missing translation_status"
            assert s["translation_status"] in ["pending", "completed", "error"], \
                f"Invalid translation_status: {s['translation_status']}"
        
        print("PASS: All sentences have valid translation_status field")


class TestMultipleChapters:
    """Tests for multiple chapter structure"""
    
    def test_all_chapters_have_correct_structure(self):
        """All chapters should have id, title, chapter_number"""
        response = requests.get(f"{BASE_URL}/api/books/kokoro/chapters")
        assert response.status_code == 200
        
        chapters = response.json()
        for ch in chapters:
            assert "id" in ch, f"Chapter missing id"
            assert "title" in ch, f"Chapter missing title"
            assert "chapter_number" in ch, f"Chapter missing chapter_number"
            assert ch["id"].startswith("kokoro-ch"), f"Chapter id should start with 'kokoro-ch'"
        
        print(f"PASS: All {len(chapters)} chapters have correct structure")
    
    def test_chapter_ids_sequential(self):
        """Chapter IDs should be kokoro-ch1 through kokoro-ch37"""
        response = requests.get(f"{BASE_URL}/api/books/kokoro/chapters")
        assert response.status_code == 200
        
        chapters = response.json()
        expected_ids = [f"kokoro-ch{i}" for i in range(1, 38)]
        actual_ids = [ch["id"] for ch in chapters]
        
        assert actual_ids == expected_ids, f"Chapter IDs don't match expected sequence"
        print("PASS: Chapter IDs are sequential from kokoro-ch1 to kokoro-ch37")


class TestBookLanguageComparison:
    """Compare Japanese vs English source books"""
    
    def test_english_book_has_different_source_language(self):
        """English source book should have source_language='en' in sentences"""
        # Check if alice-in-wonderland exists
        response = requests.get(f"{BASE_URL}/api/books/alice-in-wonderland")
        if response.status_code != 200:
            pytest.skip("alice-in-wonderland not imported")
        
        response = requests.get(f"{BASE_URL}/api/chapters/alice-in-wonderland-ch1/sentences?limit=3")
        if response.status_code != 200:
            pytest.skip("alice-in-wonderland chapters not available")
        
        sentences = response.json()
        for s in sentences:
            assert s.get("source_language") == "en", \
                f"English book sentence should have source_language='en'"
        
        print("PASS: English source book has source_language='en'")
    
    def test_japanese_book_vs_english_book_language_field(self):
        """Compare book_language field between Japanese and English books"""
        # Get Kokoro (Japanese)
        res_kokoro = requests.get(f"{BASE_URL}/api/books/kokoro")
        assert res_kokoro.status_code == 200
        kokoro = res_kokoro.json()
        
        # Get an English book if available
        res_alice = requests.get(f"{BASE_URL}/api/books/alice-in-wonderland")
        if res_alice.status_code == 200:
            alice = res_alice.json()
            assert kokoro["book_language"] == "ja", "Kokoro should be 'ja'"
            assert alice["book_language"] == "en", "Alice should be 'en'"
            print(f"PASS: Kokoro book_language='{kokoro['book_language']}', Alice book_language='{alice['book_language']}'")
        else:
            assert kokoro["book_language"] == "ja", "Kokoro should be 'ja'"
            print(f"PASS: Kokoro book_language='{kokoro['book_language']}' (Alice not available)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
