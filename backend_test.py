import requests
import sys
import json
from datetime import datetime
import time

class MyHostIQAPITester:
    def __init__(self, base_url="https://hostiq.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_apartment_id = None
        self.token = None
        self.user_id = None
        
        # Test user data
        self.test_user = {
            "email": f"test_{int(time.time())}@hostiq.com",
            "full_name": "Test Host User",
            "password": "testpass123"
        }
        
        # Test whitelabel data
        self.test_whitelabel = {
            "brand_name": "Luxury Stays",
            "brand_logo_url": "https://example.com/logo.png",
            "brand_primary_color": "#e11d48",
            "brand_secondary_color": "#f59e0b"
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30, use_auth=True):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else f"{self.api_url}/"
        headers = {'Content-Type': 'application/json'}
        
        # Add authentication header if token is available and use_auth is True
        if use_auth and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        if use_auth and self.token:
            print(f"   Using auth: Bearer {self.token[:20]}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=timeout)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=timeout)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health check"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "",
            200,
            use_auth=False
        )
        return success

    def test_user_registration(self):
        """Test user registration - CRITICAL for SaaS"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=self.test_user,
            use_auth=False
        )
        
        if success and response.get('access_token'):
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   Registered user ID: {self.user_id}")
            print(f"   Token received: {self.token[:20]}...")
        
        return success

    def test_user_login(self):
        """Test user login"""
        login_data = {
            "email": self.test_user["email"],
            "password": self.test_user["password"]
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data,
            use_auth=False
        )
        
        if success and response.get('access_token'):
            # Update token (should be same as registration)
            self.token = response['access_token']
            print(f"   Login successful, token: {self.token[:20]}...")
        
        return success

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        
        if success:
            print(f"   User email: {response.get('email', 'Unknown')}")
            print(f"   Brand name: {response.get('brand_name', 'Unknown')}")
        
        return success

    def test_update_whitelabel_settings(self):
        """Test updating whitelabel settings - CRITICAL for SaaS"""
        success, response = self.run_test(
            "Update Whitelabel Settings",
            "PUT",
            "auth/whitelabel",
            200,
            data=self.test_whitelabel
        )
        
        if success:
            print(f"   Updated brand: {self.test_whitelabel['brand_name']}")
            print(f"   Primary color: {self.test_whitelabel['brand_primary_color']}")
        
        return success

    def test_create_apartment(self):
        """Test apartment creation with sample data - requires authentication"""
        test_data = {
            "name": "Sunny Rome Apartment",
            "address": "Via Roma 12, Rome, Italy", 
            "description": "Cozy 2-bedroom near Colosseum",
            "rules": ["No smoking", "Check-in after 2PM"],
            "contact": {"phone": "+39 123456789", "email": "host@test.com"},
            "recommendations": {
                "restaurants": [{"name": "Trattoria Mario", "type": "Italian", "tip": "Best pasta in area"}],
                "hidden_gems": [{"name": "Secret Garden", "tip": "Peaceful spot"}],
                "transport": "Bus 64 to Vatican"
            }
        }
        
        success, response = self.run_test(
            "Create Apartment",
            "POST",
            "apartments",
            200,
            data=test_data
        )
        
        if success and response.get('id'):
            self.created_apartment_id = response['id']
            print(f"   Created apartment ID: {self.created_apartment_id}")
        
        return success

    def test_get_apartments(self):
        """Test fetching user's apartments - requires authentication"""
        success, response = self.run_test(
            "Get User's Apartments",
            "GET",
            "apartments",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} apartments for user")
        
        return success

    def test_get_specific_apartment(self):
        """Test getting specific apartment by ID - requires authentication"""
        if not self.created_apartment_id:
            print("❌ Skipping - No apartment ID available")
            return False
            
        success, response = self.run_test(
            "Get Specific Apartment",
            "GET",
            f"apartments/{self.created_apartment_id}",
            200
        )
        
        if success:
            print(f"   Retrieved apartment: {response.get('name', 'Unknown')}")
        
        return success

    def test_public_apartment_access(self):
        """Test public apartment access (no auth required) - CRITICAL for guests"""
        if not self.created_apartment_id:
            print("❌ Skipping - No apartment ID available")
            return False
            
        success, response = self.run_test(
            "Public Apartment Access",
            "GET",
            f"public/apartments/{self.created_apartment_id}",
            200,
            use_auth=False
        )
        
        if success:
            apartment = response.get('apartment', {})
            branding = response.get('branding', {})
            print(f"   Apartment: {apartment.get('name', 'Unknown')}")
            print(f"   Brand: {branding.get('brand_name', 'Unknown')}")
            print(f"   Primary color: {branding.get('brand_primary_color', 'Unknown')}")
        
        return success

    def test_ai_chat(self):
        """Test AI chat functionality - MOST IMPORTANT - includes whitelabeling"""
        if not self.created_apartment_id:
            print("❌ Skipping - No apartment ID available")
            return False
            
        test_messages = [
            "What are the apartment rules?",
            "Can you recommend a good restaurant nearby?",
            "What's the check-in time?",
            "Tell me about local transport options"
        ]
        
        all_passed = True
        
        for message in test_messages:
            print(f"\n   Testing message: '{message}'")
            
            success, response = self.run_test(
                f"AI Chat - {message[:30]}...",
                "POST",
                "chat",
                200,
                data={
                    "apartment_id": self.created_apartment_id,
                    "message": message,
                    "session_id": f"test_session_{int(time.time())}"
                },
                timeout=60,  # AI responses can take longer
                use_auth=False  # Chat is public endpoint
            )
            
            if success:
                ai_response = response.get('response', '')
                apartment_name = response.get('apartment_name', '')
                branding = response.get('branding', {})
                
                print(f"   AI Response: {ai_response[:100]}...")
                print(f"   Apartment: {apartment_name}")
                print(f"   Brand: {branding.get('brand_name', 'Unknown')}")
                
                # Check if response contains apartment-specific info
                if any(keyword in ai_response.lower() for keyword in ['sunny rome', 'smoking', '2pm', 'mario', 'bus 64']):
                    print("   ✅ Response contains apartment-specific information")
                else:
                    print("   ⚠️  Response may be too generic")
                    
                # Check if branding is applied
                if branding.get('brand_name') == 'Luxury Stays':
                    print("   ✅ Whitelabel branding applied correctly")
                else:
                    print("   ⚠️  Whitelabel branding may not be applied")
            else:
                all_passed = False
            
            # Wait between requests to avoid rate limiting
            time.sleep(2)
        
        return all_passed

    def test_analytics_dashboard(self):
        """Test analytics dashboard - CRITICAL for SaaS"""
        success, response = self.run_test(
            "Analytics Dashboard",
            "GET",
            "analytics/dashboard",
            200
        )
        
        if success:
            overview = response.get('overview', {})
            apartments = response.get('apartments', [])
            print(f"   Total apartments: {overview.get('total_apartments', 0)}")
            print(f"   Total chats: {overview.get('total_chats', 0)}")
            print(f"   Active apartments: {overview.get('active_apartments', 0)}")
            print(f"   Apartment analytics: {len(apartments)} entries")
        
        return success

    def test_chat_history(self):
        """Test chat history retrieval - requires authentication"""
        if not self.created_apartment_id:
            print("❌ Skipping - No apartment ID available")
            return False
            
        success, response = self.run_test(
            "Get Chat History",
            "GET",
            f"apartments/{self.created_apartment_id}/chat-history",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} chat messages")
            if len(response) > 0:
                print(f"   Latest message: {response[0].get('message', 'N/A')[:50]}...")
        
        return success

def main():
    print("🚀 Starting My Host IQ API Testing...")
    print("=" * 60)
    
    # Initialize tester
    tester = MyHostIQAPITester()
    
    # Run tests in order
    tests = [
        ("Health Check", tester.test_health_check),
        ("Create Apartment", tester.test_create_apartment),
        ("Get All Apartments", tester.test_get_apartments),
        ("Get Specific Apartment", tester.test_get_specific_apartment),
        ("AI Chat (CRITICAL)", tester.test_ai_chat),
        ("Chat History", tester.test_chat_history),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ Test '{test_name}' crashed: {str(e)}")
            failed_tests.append(test_name)
    
    # Print final results
    print(f"\n{'='*60}")
    print(f"📊 FINAL RESULTS")
    print(f"{'='*60}")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed tests:")
        for test in failed_tests:
            print(f"   - {test}")
    else:
        print(f"\n✅ All tests passed!")
    
    if tester.created_apartment_id:
        print(f"\n🏠 Created apartment ID for frontend testing: {tester.created_apartment_id}")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())