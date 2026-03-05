import requests
import sys
import json
from datetime import datetime

class JapaneseReadingAppTester:
    def __init__(self, base_url="https://jp-books-learn.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.user_email = f"test_user_{datetime.now().strftime('%H%M%S')}@test.com"
        
    def log_result(self, test_name, passed, response_data=None, error=None):
        """Log test result"""
        self.tests_run += 1
        if passed:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            print(f"❌ {test_name} - FAILED: {error}")
        
        self.test_results.append({
            "test": test_name,
            "passed": passed,
            "response": response_data,
            "error": str(error) if error else None
        })
        
    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api{endpoint}"
        if not headers:
            headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
                if not success:
                    print(f"   Response: {json.dumps(response_data, indent=2)}")
            except:
                if not success:
                    print(f"   Response text: {response.text[:200]}...")
            
            if success:
                self.log_result(name, True, response_data)
                return True, response_data
            else:
                error = f"Expected {expected_status}, got {response.status_code}"
                self.log_result(name, False, response_data, error)
                return False, response_data

        except Exception as e:
            error = f"Request failed: {str(e)}"
            print(f"   Error: {error}")
            self.log_result(name, False, None, error)
            return False, {}

    def test_basic_connectivity(self):
        """Test basic API connectivity"""
        success, _ = self.run_test("Basic API Connectivity", "GET", "/", 200)
        return success

    def test_available_books_list(self):
        """Test /api/books/available/list endpoint"""
        success, response = self.run_test(
            "Available Books List", 
            "GET", 
            "/books/available/list", 
            200
        )
        
        if success and isinstance(response, list) and len(response) > 0:
            print(f"   Found {len(response)} available books")
            # Check for expected books
            book_keys = [book.get('book_key') for book in response]
            expected_books = ['pride-and-prejudice', 'alice-in-wonderland', 'anna-karenina']
            for expected in expected_books:
                if expected in book_keys:
                    print(f"   ✓ Found expected book: {expected}")
                else:
                    print(f"   ⚠ Missing expected book: {expected}")
        
        return success

    def test_gutenberg_search(self):
        """Test Project Gutenberg search"""
        success, response = self.run_test(
            "Gutenberg Search (dickens)", 
            "GET", 
            "/books/search/gutenberg?query=dickens", 
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} search results")
            if len(response) > 0:
                first_result = response[0]
                print(f"   First result: {first_result.get('title', 'No title')} by {first_result.get('author', 'Unknown')}")
        
        return success

    def test_register(self):
        """Test user registration"""
        user_data = {
            "email": self.user_email,
            "password": "TestPass123!",
            "username": "TestUser"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "/auth/register",
            200,
            data=user_data
        )
        
        if success and response.get('access_token'):
            self.token = response['access_token']
            print(f"   ✓ Registered user and got token")
        
        return success

    def test_login(self):
        """Test user login"""
        login_data = {
            "email": self.user_email,
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST", 
            "/auth/login",
            200,
            data=login_data
        )
        
        if success and response.get('access_token'):
            self.token = response['access_token']
            print(f"   ✓ Login successful, got token")
        
        return success

    def test_get_me(self):
        """Test getting current user info"""
        if not self.token:
            print("❌ Cannot test /auth/me - no token available")
            self.log_result("Get Current User", False, None, "No token available")
            return False
        
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "/auth/me",
            200
        )
        
        if success:
            print(f"   User: {response.get('username')} ({response.get('email')})")
        
        return success

    def test_books_endpoint(self):
        """Test getting books list"""
        success, response = self.run_test(
            "Get Books List",
            "GET", 
            "/books",
            200
        )
        
        if success:
            print(f"   Found {len(response)} books in library")
        
        return success

    def test_book_import_start(self):
        """Test starting a book import (doesn't wait for completion)"""
        if not self.token:
            print("❌ Cannot test book import - no token available")
            self.log_result("Book Import Start", False, None, "No token available")
            return False
        
        import_data = {
            "book_key": "alice-in-wonderland"
        }
        
        success, response = self.run_test(
            "Start Book Import (Alice in Wonderland)",
            "POST",
            "/books/import", 
            200,
            data=import_data
        )
        
        if success:
            status = response.get('status')
            book_id = response.get('book_id')
            print(f"   Import status: {status} for book: {book_id}")
        
        return success

    def test_vocabulary_endpoints(self):
        """Test vocabulary endpoints"""
        if not self.token:
            print("❌ Cannot test vocabulary - no token available") 
            self.log_result("Vocabulary Endpoints", False, None, "No token available")
            return False
        
        # Test getting vocabulary list
        success, response = self.run_test(
            "Get Vocabulary List",
            "GET",
            "/vocabulary", 
            200
        )
        
        return success

    def test_dictionary_lookup(self):
        """Test dictionary word lookup"""
        success, response = self.run_test(
            "Dictionary Lookup (こんにちは)",
            "GET",
            "/dictionary/こんにちは",
            200
        )
        
        if success:
            word = response.get('word', 'No word')
            meanings = response.get('meanings', [])
            print(f"   Word: {word}, Meanings: {meanings[:2]}")
        
        return success

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Japanese Reading App Backend Tests")
        print(f"   Base URL: {self.base_url}")
        print("="*60)
        
        # Basic connectivity
        self.test_basic_connectivity()
        
        # Core book import features
        self.test_available_books_list()
        self.test_gutenberg_search()
        
        # Authentication flow
        self.test_register()
        self.test_login() 
        self.test_get_me()
        
        # Book endpoints
        self.test_books_endpoint()
        
        # Dictionary
        self.test_dictionary_lookup()
        
        # Vocabulary (requires auth)
        self.test_vocabulary_endpoints()
        
        # Book import (requires auth)
        self.test_book_import_start()
        
        # Print results
        print("\n" + "="*60)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print("❌ Some tests failed. Check the output above for details.")
            return False

def main():
    tester = JapaneseReadingAppTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())