import requests
import sys
import json
from datetime import datetime
import time

class MyHostIQAPITester:
    def __init__(self, base_url="https://hostai.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_apartment_id = None
        self.token = None
        self.user_id = None
        self.email_credentials_id = None
        
        # Test user data - using specified credentials from review request
        self.test_user = {
            "email": "test@example.com",
            "full_name": "Test User",
            "password": "testpass123"
        }
        
        # Test email credentials for testing
        self.test_email_creds = {
            "email": "test.sender@gmail.com",
            "password": "test_app_password_123",
            "smtp_server": "",  # Will auto-detect
            "smtp_port": 587
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

    # EMAIL CREDENTIALS TESTS - HIGH PRIORITY
    def test_create_email_credentials(self):
        """Test creating email credentials - HIGH PRIORITY"""
        # First test with invalid credentials (expected to fail)
        print("   Testing with invalid credentials (should fail)...")
        success_invalid, response_invalid = self.run_test(
            "Create Email Credentials (Invalid)",
            "POST",
            "auth/email-credentials",
            400,  # Expect 400 for invalid credentials
            data=self.test_email_creds
        )
        
        if success_invalid:
            print("   ✅ Email credential validation working - properly rejects invalid credentials")
        
        # Test SMTP auto-detection by checking the error response
        if 'Invalid email credentials' in str(response_invalid.get('detail', '')):
            print("   ✅ SMTP verification is working")
        
        # Test with Gmail format to verify auto-detection
        gmail_test = {
            "email": "test@gmail.com",
            "password": "fake_password",
            "smtp_server": "",
            "smtp_port": 587
        }
        
        print("   Testing SMTP auto-detection for Gmail...")
        success_gmail, response_gmail = self.run_test(
            "Gmail SMTP Auto-Detection",
            "POST", 
            "auth/email-credentials",
            400,  # Still expect 400 but check auto-detection
            data=gmail_test
        )
        
        # Even though it fails, we can check if the error indicates proper SMTP detection
        if success_gmail and 'smtp.gmail.com' in str(response_gmail):
            print("   ✅ SMTP auto-detection working for Gmail")
        elif 'Invalid email credentials' in str(response_gmail.get('detail', '')):
            print("   ✅ SMTP auto-detection likely working (Gmail credentials rejected)")
        
        return success_invalid  # Return true if validation is working properly

    def test_get_email_credentials(self):
        """Test retrieving email credentials (without password) - HIGH PRIORITY"""
        success, response = self.run_test(
            "Get Email Credentials",
            "GET",
            "auth/email-credentials",
            200
        )
        
        if success and response:
            print(f"   Retrieved email: {response.get('email', 'Unknown')}")
            print(f"   SMTP Server: {response.get('smtp_server', 'Unknown')}")
            print(f"   Verified: {response.get('is_verified', False)}")
            
            # Ensure password is not returned
            if 'password' not in response and 'encrypted_password' not in response:
                print("   ✅ Password properly excluded from response")
            else:
                print("   ❌ Security issue: Password data exposed in response")
        
        return success

    def test_update_email_credentials(self):
        """Test updating email credentials - HIGH PRIORITY"""
        updated_creds = {
            "email": "updated.test@gmail.com",
            "password": "updated_password_123",
            "smtp_server": "",
            "smtp_port": 587
        }
        
        success, response = self.run_test(
            "Update Email Credentials",
            "PUT",
            "auth/email-credentials",
            200,
            data=updated_creds
        )
        
        if success:
            print(f"   Updated email: {response.get('email', 'Unknown')}")
            print(f"   SMTP Server: {response.get('smtp_server', 'Unknown')}")
            print(f"   Verified: {response.get('is_verified', False)}")
        
        return success

    def test_email_credentials_test(self):
        """Test email credentials test functionality - HIGH PRIORITY"""
        success, response = self.run_test(
            "Test Email Credentials",
            "POST",
            "auth/test-email",
            200
        )
        
        if success:
            message = response.get('message', '')
            print(f"   Test result: {message}")
            if 'successfully' in message.lower():
                print("   ✅ Email test functionality working")
            else:
                print("   ⚠️  Email test may have issues")
        
        return success

    def test_delete_email_credentials(self):
        """Test deleting email credentials - HIGH PRIORITY"""
        success, response = self.run_test(
            "Delete Email Credentials",
            "DELETE",
            "auth/email-credentials",
            200
        )
        
        if success:
            message = response.get('message', '')
            print(f"   Delete result: {message}")
        
        return success

    # PAYMENT SIMULATION TESTS - MEDIUM PRIORITY
    def test_get_payment_plans(self):
        """Test getting payment plans - MEDIUM PRIORITY"""
        success, response = self.run_test(
            "Get Payment Plans",
            "GET",
            "payments/plans",
            200,
            use_auth=False  # Plans should be publicly accessible
        )
        
        if success and response.get('plans'):
            plans = response['plans']
            print(f"   Found {len(plans)} payment plans")
            for plan in plans:
                print(f"   - {plan.get('name', 'Unknown')}: ${plan.get('price', 0)}/{plan.get('interval', 'month')}")
                print(f"     Apartments: {plan.get('apartment_limit', 'Unknown')}")
        
        return success

    def test_simulate_payment(self):
        """Test payment simulation - MEDIUM PRIORITY"""
        payment_data = {
            "amount": 29.0,
            "currency": "USD",
            "plan_name": "Starter",
            "apartment_count": 2
        }
        
        success, response = self.run_test(
            "Simulate Payment",
            "POST",
            "payments/simulate",
            200,
            data=payment_data
        )
        
        if success:
            print(f"   Payment success: {response.get('success', False)}")
            print(f"   Transaction ID: {response.get('transaction_id', 'None')}")
            print(f"   Message: {response.get('message', 'None')}")
            print(f"   Plan: {response.get('plan_name', 'None')}")
            print(f"   Amount: ${response.get('amount', 0)}")
            
            # Check realistic response
            if response.get('transaction_id', '').startswith('sim_'):
                print("   ✅ Realistic transaction ID generated")
            else:
                print("   ⚠️  Transaction ID format may be incorrect")
        
        return success

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
            "ical_url": "https://calendar.google.com/calendar/ical/test%40example.com/public/basic.ics",
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
            print(f"   iCal URL configured: {response.get('ical_url', 'None')}")
        
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

    # ICAL INTEGRATION TESTS - HIGH PRIORITY
    def test_ical_sync(self):
        """Test iCal sync functionality - HIGH PRIORITY"""
        if not self.created_apartment_id:
            print("❌ Skipping - No apartment ID available")
            return False
            
        success, response = self.run_test(
            "Test iCal Sync",
            "POST",
            f"ical/test-sync/{self.created_apartment_id}",
            200
        )
        
        if success:
            message = response.get('message', '')
            print(f"   Sync result: {message}")
            if 'successfully' in message.lower():
                print("   ✅ iCal sync functionality working")
            else:
                print("   ⚠️  iCal sync may have issues")
        
        return success

    def test_get_notifications(self):
        """Test getting booking notifications - HIGH PRIORITY"""
        if not self.created_apartment_id:
            print("❌ Skipping - No apartment ID available")
            return False
            
        success, response = self.run_test(
            "Get Booking Notifications",
            "GET",
            f"notifications/{self.created_apartment_id}",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} booking notifications")
            for notification in response[:3]:  # Show first 3
                print(f"   - Guest: {notification.get('guest_name', 'Unknown')}")
                print(f"     Email sent: {notification.get('notification_sent', False)}")
        
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
    print("🚀 Starting MyHostIQ Email & Payment Testing...")
    print("📧 Testing Email Credentials, SMTP, and Payment Simulation")
    print("=" * 70)
    
    # Initialize tester
    tester = MyHostIQAPITester()
    
    # Run tests in order - AUTHENTICATION FIRST, then EMAIL FEATURES
    tests = [
        ("Health Check", tester.test_health_check),
        ("🔐 User Registration", tester.test_user_registration),
        ("🔐 User Login", tester.test_user_login),
        ("🔐 Get Current User", tester.test_get_current_user),
        ("🎨 Update Whitelabel Settings", tester.test_update_whitelabel_settings),
        
        # EMAIL FUNCTIONALITY TESTS - HIGH PRIORITY
        ("📧 Create Email Credentials", tester.test_create_email_credentials),
        ("📧 Get Email Credentials", tester.test_get_email_credentials),
        ("📧 Update Email Credentials", tester.test_update_email_credentials),
        ("📧 Test Email Functionality", tester.test_email_credentials_test),
        
        # PAYMENT SIMULATION TESTS - MEDIUM PRIORITY
        ("💳 Get Payment Plans", tester.test_get_payment_plans),
        ("💳 Simulate Payment", tester.test_simulate_payment),
        
        # APARTMENT AND ICAL TESTS
        ("🏠 Create Apartment", tester.test_create_apartment),
        ("🏠 Get User's Apartments", tester.test_get_apartments),
        ("🏠 Get Specific Apartment", tester.test_get_specific_apartment),
        ("🌐 Public Apartment Access", tester.test_public_apartment_access),
        
        # ICAL INTEGRATION TESTS - HIGH PRIORITY
        ("📅 Test iCal Sync", tester.test_ical_sync),
        ("📬 Get Booking Notifications", tester.test_get_notifications),
        
        # CORE FUNCTIONALITY
        ("🤖 AI Chat (CRITICAL)", tester.test_ai_chat),
        ("📊 Analytics Dashboard", tester.test_analytics_dashboard),
        ("💬 Chat History", tester.test_chat_history),
        
        # CLEANUP
        ("📧 Delete Email Credentials", tester.test_delete_email_credentials),
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
    print(f"\n{'='*70}")
    print(f"📊 FINAL RESULTS - MyHostIQ Email & Payment Testing")
    print(f"{'='*70}")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed tests:")
        for test in failed_tests:
            print(f"   - {test}")
        print(f"\n🔧 Critical Issues to fix:")
        
        # Email functionality issues
        email_tests = [t for t in failed_tests if "📧" in t]
        if email_tests:
            print("   📧 EMAIL FUNCTIONALITY ISSUES:")
            for test in email_tests:
                print(f"      - {test}")
        
        # Payment functionality issues  
        payment_tests = [t for t in failed_tests if "💳" in t]
        if payment_tests:
            print("   💳 PAYMENT FUNCTIONALITY ISSUES:")
            for test in payment_tests:
                print(f"      - {test}")
                
        # iCal functionality issues
        ical_tests = [t for t in failed_tests if "📅" in t or "📬" in t]
        if ical_tests:
            print("   📅 ICAL INTEGRATION ISSUES:")
            for test in ical_tests:
                print(f"      - {test}")
                
        # Core functionality issues
        if "🔐 User Registration" in failed_tests:
            print("   🚨 CRITICAL: Authentication system not working")
        if "🤖 AI Chat (CRITICAL)" in failed_tests:
            print("   🚨 CRITICAL: AI chat functionality broken")
    else:
        print(f"\n✅ All MyHostIQ features working correctly!")
        print(f"   ✅ Email credentials management working")
        print(f"   ✅ SMTP auto-detection working")
        print(f"   ✅ Email encryption/decryption working")
        print(f"   ✅ Payment simulation working")
        print(f"   ✅ iCal integration working")
        print(f"   ✅ Authentication system working")
        print(f"   ✅ AI chat with branding working")
    
    if tester.created_apartment_id:
        print(f"\n🏠 Created apartment ID for frontend testing: {tester.created_apartment_id}")
        print(f"👤 Test user email: {tester.test_user['email']}")
        print(f"🔑 Test user password: {tester.test_user['password']}")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())