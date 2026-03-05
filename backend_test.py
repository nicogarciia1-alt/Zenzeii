import requests
import sys
import json
from datetime import datetime

class JapaneseReadingAPITester:
    def __init__(self, base_url="https://jp-books-learn.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_result(self, test_name, success, message="", response_data=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}: {message}")
        else:
            print(f"❌ {test_name}: {message}")
        
        self.test_results.append({
            "test_name": test_name,
            "success": success,
            "message": message,
            "response_data": response_data
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, auth_required=True):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            try:
                response_data = response.json() if response.text else {}
            except:
                response_data = {"raw_response": response.text}

            if success:
                self.log_result(name, True, f"Status: {response.status_code}", response_data)
                return True, response_data
            else:
                self.log_result(name, False, f"Expected {expected_status}, got {response.status_code}. Response: {response.text[:200]}")
                return False, response_data

        except Exception as e:
            self.log_result(name, False, f"Request failed: {str(e)}")
            return False, {}

    def test_basic_connectivity(self):
        """Test basic API connectivity"""
        print("\n📡 Testing Basic Connectivity...")
        success, response = self.run_test(
            "API Root Endpoint",
            "GET",
            "",
            200,
            auth_required=False
        )
        return success

    def test_user_registration(self):
        """Test user registration"""
        print("\n👤 Testing User Registration...")
        
        # Generate unique test user
        timestamp = datetime.now().strftime('%H%M%S')
        test_user = {
            "email": f"test_user_{timestamp}@example.com",
            "password": "TestPass123!",
            "username": f"testuser{timestamp}"
        }

        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user,
            auth_required=False
        )

        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user = response.get('user', {})
            self.log_result("Token Received", True, f"User ID: {self.user.get('id', 'N/A')}")
            return True
        else:
            self.log_result("Token Received", False, "No access token in response")
            return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        print("\n🔐 Testing User Login...")
        
        if not self.user:
            self.log_result("Login Test Skipped", False, "No user to test login with")
            return False

        login_data = {
            "email": self.user.get('email'),
            "password": "TestPass123!"
        }

        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data,
            auth_required=False
        )

        if success and 'access_token' in response:
            # Update token for subsequent tests
            self.token = response['access_token']
            return True
        return success

    def test_auth_me_endpoint(self):
        """Test getting current user info"""
        print("\n📋 Testing Auth Me Endpoint...")
        
        if not self.token:
            self.log_result("Auth Me Test Skipped", False, "No authentication token")
            return False

        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_database_seeding(self):
        """Test database seeding functionality"""
        print("\n🌱 Testing Database Seeding...")
        
        success, response = self.run_test(
            "Seed Database",
            "POST",
            "seed",
            200,
            auth_required=False
        )

        if success:
            books_count = response.get('books', 0)
            if books_count >= 4:
                self.log_result("Expected Books Count", True, f"Seeded {books_count} books (expected 4+)")
            else:
                self.log_result("Expected Books Count", False, f"Only {books_count} books seeded, expected 4+")
        
        return success

    def test_books_endpoints(self):
        """Test books-related endpoints"""
        print("\n📚 Testing Books Endpoints...")
        
        # Get all books
        success, books_response = self.run_test(
            "Get All Books",
            "GET",
            "books",
            200,
            auth_required=False
        )

        if not success or not books_response:
            return False

        books = books_response if isinstance(books_response, list) else []
        
        if len(books) >= 4:
            self.log_result("Books Available", True, f"Found {len(books)} books")
        else:
            self.log_result("Books Available", False, f"Only {len(books)} books, expected 4+")
            return False

        # Test individual book endpoint
        first_book = books[0]
        book_id = first_book.get('id')
        
        if book_id:
            success, _ = self.run_test(
                "Get Individual Book",
                "GET",
                f"books/{book_id}",
                200,
                auth_required=False
            )

            # Test chapters endpoint
            success, chapters_response = self.run_test(
                "Get Book Chapters",
                "GET",
                f"books/{book_id}/chapters",
                200,
                auth_required=False
            )

            if success and chapters_response:
                chapters = chapters_response if isinstance(chapters_response, list) else []
                if chapters:
                    self.log_result("Chapters Available", True, f"Found {len(chapters)} chapters")
                    
                    # Test sentences endpoint
                    first_chapter = chapters[0]
                    chapter_id = first_chapter.get('id')
                    if chapter_id:
                        success, _ = self.run_test(
                            "Get Chapter Sentences",
                            "GET",
                            f"chapters/{chapter_id}/sentences",
                            200,
                            auth_required=False
                        )
                else:
                    self.log_result("Chapters Available", False, "No chapters found")

        return True

    def test_dictionary_lookup(self):
        """Test dictionary lookup functionality"""
        print("\n📖 Testing Dictionary Lookup...")
        
        test_words = ["本", "読む", "hello"]  # Japanese and English test words
        
        for word in test_words:
            success, response = self.run_test(
                f"Dictionary Lookup: {word}",
                "GET",
                f"dictionary/{word}",
                200,
                auth_required=False
            )
            
            if success and response:
                meanings = response.get('meanings', [])
                if meanings:
                    self.log_result(f"Meanings for {word}", True, f"Found {len(meanings)} meanings")
                else:
                    self.log_result(f"Meanings for {word}", False, "No meanings returned")

        return True

    def test_vocabulary_management(self):
        """Test vocabulary management endpoints"""
        print("\n📝 Testing Vocabulary Management...")
        
        if not self.token:
            self.log_result("Vocabulary Test Skipped", False, "No authentication token")
            return False

        # Get initial vocabulary
        success, vocab_response = self.run_test(
            "Get Vocabulary List",
            "GET",
            "vocabulary",
            200
        )

        if not success:
            return False

        # Save a test word
        test_word = {
            "word": "テスト",
            "reading": "てすと",
            "romaji": "tesuto",
            "meanings": ["test"],
            "parts_of_speech": ["noun"],
            "notes": "Test word for API testing"
        }

        success, save_response = self.run_test(
            "Save Word to Vocabulary",
            "POST",
            "vocabulary",
            200,
            data=test_word
        )

        if success and save_response:
            word_id = save_response.get('id')
            if word_id:
                # Test updating the word
                update_data = {"notes": "Updated test notes"}
                success, _ = self.run_test(
                    "Update Vocabulary Word",
                    "PUT",
                    f"vocabulary/{word_id}",
                    200,
                    data=update_data
                )

                # Test deleting the word
                success, _ = self.run_test(
                    "Delete Vocabulary Word",
                    "DELETE",
                    f"vocabulary/{word_id}",
                    200
                )

        return True

    def test_profile_and_stats(self):
        """Test profile and stats endpoints"""
        print("\n📊 Testing Profile and Stats...")
        
        if not self.token:
            self.log_result("Stats Test Skipped", False, "No authentication token")
            return False

        # Test stats endpoint
        success, stats_response = self.run_test(
            "Get User Stats",
            "GET",
            "stats",
            200
        )

        if success and stats_response:
            vocab_count = stats_response.get('vocabulary_count', 0)
            books_progress = stats_response.get('books_in_progress', 0)
            self.log_result("Stats Data", True, f"Vocab: {vocab_count}, Books: {books_progress}")

        # Test reading progress
        success, _ = self.run_test(
            "Get Reading Progress",
            "GET",
            "progress",
            200
        )

        return True

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🧪 Starting Japanese Reading App API Tests")
        print(f"🌐 Testing against: {self.base_url}")
        print("=" * 60)

        tests = [
            self.test_basic_connectivity,
            self.test_database_seeding,  # Seed first so books are available
            self.test_user_registration,
            self.test_user_login,
            self.test_auth_me_endpoint,
            self.test_books_endpoints,
            self.test_dictionary_lookup,
            self.test_vocabulary_management,
            self.test_profile_and_stats
        ]

        for test in tests:
            try:
                test()
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {e}")

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} test(s) failed")
            return 1

def main():
    tester = JapaneseReadingAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())