import requests
import json

def test_admin_location_fields():
    """Test admin endpoints with location fields"""
    base_url = "http://localhost:8001/api"
    
    # Test user data
    user_data = {
        "email": "adminlocationtest@example.com",
        "full_name": "Admin Location Test User",
        "password": "testpass123"
    }
    
    # Admin credentials
    admin_credentials = {
        "username": "myhomeiq_admin",
        "password": "Admin123!MyHomeIQ"
    }
    
    print("🚀 Testing Admin Endpoints with Location Fields")
    print("=" * 55)
    
    # Step 1: Register user and create apartment
    print("\n1. Setting up test data...")
    try:
        # Register user
        response = requests.post(f"{base_url}/auth/register", json=user_data, timeout=30)
        if response.status_code == 400:
            # User exists, login
            login_data = {"email": user_data["email"], "password": user_data["password"]}
            response = requests.post(f"{base_url}/auth/login", json=login_data, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            user_token = data['access_token']
            user_id = data['user']['id']
            print(f"   ✅ User authenticated: {user_id}")
        else:
            print(f"   ❌ User authentication failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False
    
    user_headers = {'Authorization': f'Bearer {user_token}', 'Content-Type': 'application/json'}
    
    # Create apartment with location fields
    apartment_data = {
        "name": "Admin Test Location Apartment",
        "address": "Via Admin 456, Rome, Italy",
        "description": "Test apartment for admin location fields testing",
        "rules": ["No smoking", "No parties"],
        "contact": {"email": "adminhost@example.com", "phone": "+39 456 789 012"},
        "ical_url": "",
        "recommendations": {
            "restaurants": [
                {
                    "name": "Admin's Pizza Palace",
                    "type": "Italian",
                    "location": "Via Admin 456",
                    "tip": "Best admin pizza in town"
                },
                {
                    "name": "Executive Dining",
                    "type": "Fine Dining",
                    "location": "Corporate Plaza 1",
                    "tip": "Perfect for business meetings"
                }
            ],
            "hidden_gems": [
                {
                    "name": "Admin Secret Garden",
                    "location": "Behind the admin building",
                    "tip": "Quiet place for admin breaks"
                },
                {
                    "name": "Executive Lounge",
                    "location": "Top floor of main building",
                    "tip": "Great city views for admins"
                }
            ],
            "transport": "Admin shuttle every 15 minutes"
        }
    }
    
    try:
        response = requests.post(f"{base_url}/apartments", json=apartment_data, headers=user_headers, timeout=30)
        if response.status_code == 200:
            data = response.json()
            apartment_id = data['id']
            print(f"   ✅ Test apartment created: {apartment_id}")
        else:
            print(f"   ❌ Apartment creation failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False
    
    # Step 2: Admin login
    print("\n2. Admin authentication...")
    try:
        response = requests.post(f"{base_url}/admin/login", json=admin_credentials, timeout=30)
        if response.status_code == 200:
            data = response.json()
            admin_token = data['access_token']
            print("   ✅ Admin authenticated successfully")
        else:
            print(f"   ❌ Admin authentication failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False
    
    admin_headers = {'Authorization': f'Bearer {admin_token}', 'Content-Type': 'application/json'}
    
    # Step 3: Test admin apartments endpoint
    print("\n3. Testing admin apartments endpoint with location fields...")
    try:
        response = requests.get(f"{base_url}/admin/apartments", headers=admin_headers, timeout=30)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            apartments = response.json()  # Direct list, not wrapped in object
            print(f"   ✅ Retrieved {len(apartments)} apartments")
            
            # Find our test apartment
            test_apartment = None
            for apt in apartments:
                if apt.get('id') == apartment_id:
                    test_apartment = apt
                    break
            
            if test_apartment:
                print("   ✅ Test apartment found in admin response")
                
                # Check location fields in admin response
                recommendations = test_apartment.get('recommendations', {})
                restaurants = recommendations.get('restaurants', [])
                hidden_gems = recommendations.get('hidden_gems', [])
                
                # Verify restaurant location fields
                admin_pizza = next((r for r in restaurants if r['name'] == "Admin's Pizza Palace"), None)
                if admin_pizza and admin_pizza.get('location') == "Via Admin 456":
                    print("   ✅ Restaurant location field returned by admin endpoint")
                else:
                    print("   ❌ Restaurant location field missing in admin response")
                    return False
                
                executive_dining = next((r for r in restaurants if r['name'] == "Executive Dining"), None)
                if executive_dining and executive_dining.get('location') == "Corporate Plaza 1":
                    print("   ✅ Second restaurant location field returned by admin endpoint")
                else:
                    print("   ❌ Second restaurant location field missing in admin response")
                    return False
                
                # Verify hidden gem location fields
                admin_garden = next((g for g in hidden_gems if g['name'] == "Admin Secret Garden"), None)
                if admin_garden and admin_garden.get('location') == "Behind the admin building":
                    print("   ✅ Hidden gem location field returned by admin endpoint")
                else:
                    print("   ❌ Hidden gem location field missing in admin response")
                    return False
                
                executive_lounge = next((g for g in hidden_gems if g['name'] == "Executive Lounge"), None)
                if executive_lounge and executive_lounge.get('location') == "Top floor of main building":
                    print("   ✅ Second hidden gem location field returned by admin endpoint")
                else:
                    print("   ❌ Second hidden gem location field missing in admin response")
                    return False
                
                print("   ✅ All location fields properly returned by admin apartments endpoint")
                
            else:
                print("   ❌ Test apartment not found in admin response")
                return False
        else:
            print(f"   ❌ Admin apartments endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False
    
    # Step 4: Test admin stats endpoint (should include apartments with location fields)
    print("\n4. Testing admin stats endpoint...")
    try:
        response = requests.get(f"{base_url}/admin/stats", headers=admin_headers, timeout=30)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            total_apartments = data.get('total_apartments', 0)
            print(f"   ✅ Admin stats retrieved - Total apartments: {total_apartments}")
            
            # Check if recent activity includes our apartment
            recent_apartments = data.get('recent_apartments', [])
            if recent_apartments:
                print(f"   ✅ Recent apartments data available: {len(recent_apartments)} apartments")
                
                # Check if any recent apartment has location fields
                has_location_fields = False
                for apt in recent_apartments:
                    recommendations = apt.get('recommendations', {})
                    restaurants = recommendations.get('restaurants', [])
                    hidden_gems = recommendations.get('hidden_gems', [])
                    
                    for restaurant in restaurants:
                        if 'location' in restaurant and restaurant['location']:
                            has_location_fields = True
                            break
                    
                    if not has_location_fields:
                        for gem in hidden_gems:
                            if 'location' in gem and gem['location']:
                                has_location_fields = True
                                break
                    
                    if has_location_fields:
                        break
                
                if has_location_fields:
                    print("   ✅ Admin stats include apartments with location fields")
                else:
                    print("   ⚠️ Admin stats may not include location fields (acceptable)")
            else:
                print("   ⚠️ No recent apartments in stats (acceptable)")
        else:
            print(f"   ❌ Admin stats endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False
    
    # Step 5: Test mixed apartments (some with, some without location fields)
    print("\n5. Testing mixed apartments scenario...")
    
    # Create another apartment without location fields
    legacy_apartment_data = {
        "name": "Admin Legacy Apartment",
        "address": "Old Admin Street 789",
        "description": "Legacy apartment without location fields",
        "rules": ["No smoking"],
        "contact": {"email": "adminlegacy@example.com"},
        "ical_url": "",
        "recommendations": {
            "restaurants": [
                {
                    "name": "Old Admin Restaurant",
                    "type": "Traditional",
                    "tip": "Good food, no location specified"
                }
            ],
            "hidden_gems": [
                {
                    "name": "Old Admin Gem",
                    "tip": "Nice place, no location specified"
                }
            ]
        }
    }
    
    try:
        response = requests.post(f"{base_url}/apartments", json=legacy_apartment_data, headers=user_headers, timeout=30)
        if response.status_code == 200:
            data = response.json()
            legacy_apartment_id = data['id']
            print(f"   ✅ Legacy apartment created: {legacy_apartment_id}")
        else:
            print(f"   ❌ Legacy apartment creation failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False
    
    # Test admin endpoint with mixed apartments
    try:
        response = requests.get(f"{base_url}/admin/apartments", headers=admin_headers, timeout=30)
        if response.status_code == 200:
            apartments = response.json()  # Direct list, not wrapped in object
            
            # Find both apartments
            location_apartment = None
            legacy_apartment = None
            
            for apt in apartments:
                if apt.get('id') == apartment_id:
                    location_apartment = apt
                elif apt.get('id') == legacy_apartment_id:
                    legacy_apartment = apt
            
            if location_apartment and legacy_apartment:
                print("   ✅ Both apartments found in admin response")
                
                # Verify location apartment has location fields
                loc_recommendations = location_apartment.get('recommendations', {})
                loc_restaurants = loc_recommendations.get('restaurants', [])
                has_location_fields = any('location' in r and r['location'] for r in loc_restaurants)
                
                if has_location_fields:
                    print("   ✅ Location apartment has location fields in admin response")
                else:
                    print("   ❌ Location apartment missing location fields in admin response")
                    return False
                
                # Verify legacy apartment doesn't have location fields
                leg_recommendations = legacy_apartment.get('recommendations', {})
                leg_restaurants = leg_recommendations.get('restaurants', [])
                has_unexpected_location = any('location' in r and r['location'] for r in leg_restaurants)
                
                if not has_unexpected_location:
                    print("   ✅ Legacy apartment correctly has no location fields in admin response")
                else:
                    print("   ❌ Legacy apartment has unexpected location fields in admin response")
                    return False
                
            else:
                print("   ❌ Not all test apartments found in admin response")
                return False
        else:
            print(f"   ❌ Admin apartments endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False
    
    # Cleanup
    print("\n6. Cleaning up test data...")
    try:
        requests.delete(f"{base_url}/apartments/{apartment_id}", headers=user_headers, timeout=30)
        requests.delete(f"{base_url}/apartments/{legacy_apartment_id}", headers=user_headers, timeout=30)
        print("   ✅ Test data cleaned up")
    except:
        print("   ⚠️ Cleanup may have failed")
    
    print("\n" + "=" * 55)
    print("✅ ALL ADMIN LOCATION FIELDS TESTS PASSED!")
    print("=" * 55)
    return True

if __name__ == "__main__":
    success = test_admin_location_fields()
    if not success:
        print("\n❌ ADMIN LOCATION FIELDS TESTS FAILED!")
        exit(1)