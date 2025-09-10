import requests
import json

def test_location_fields():
    """Simple test for location fields in recommendations"""
    base_url = "https://smart-host-ai.preview.emergentagent.com/api"
    
    # Test user data
    user_data = {
        "email": "locationtest2@example.com",
        "full_name": "Location Test User 2",
        "password": "testpass123"
    }
    
    print("🚀 Testing Location Fields in Recommendations")
    print("=" * 50)
    
    # Step 1: Register user
    print("\n1. Registering user...")
    try:
        response = requests.post(f"{base_url}/auth/register", json=user_data, timeout=30)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            token = data['access_token']
            user_id = data['user']['id']
            print(f"   ✅ User registered: {user_id}")
        elif response.status_code == 400:
            # User already exists, try login
            print("   User exists, trying login...")
            login_data = {"email": user_data["email"], "password": user_data["password"]}
            response = requests.post(f"{base_url}/auth/login", json=login_data, timeout=30)
            if response.status_code == 200:
                data = response.json()
                token = data['access_token']
                user_id = data['user']['id']
                print(f"   ✅ User logged in: {user_id}")
            else:
                print(f"   ❌ Login failed: {response.status_code}")
                return False
        else:
            print(f"   ❌ Registration failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False
    
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    # Step 2: Create apartment with location fields
    print("\n2. Creating apartment with location fields...")
    apartment_data = {
        "name": "Test Location Apartment",
        "address": "Via Roma 123, Rome, Italy",
        "description": "Test apartment for location fields",
        "rules": ["No smoking"],
        "contact": {"email": "host@example.com"},
        "ical_url": "",
        "recommendations": {
            "restaurants": [
                {
                    "name": "Mario's Pizza",
                    "type": "Italian",
                    "location": "Via Roma 123",
                    "tip": "Best pizza in town"
                }
            ],
            "hidden_gems": [
                {
                    "name": "Secret Garden",
                    "location": "Behind the old church",
                    "tip": "Beautiful sunset views"
                }
            ]
        }
    }
    
    try:
        response = requests.post(f"{base_url}/apartments", json=apartment_data, headers=headers, timeout=30)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            apartment_id = data['id']
            print(f"   ✅ Apartment created: {apartment_id}")
            
            # Check if location fields are in response
            recommendations = data.get('recommendations', {})
            restaurants = recommendations.get('restaurants', [])
            hidden_gems = recommendations.get('hidden_gems', [])
            
            # Check restaurant location
            mario_pizza = next((r for r in restaurants if r['name'] == "Mario's Pizza"), None)
            if mario_pizza and mario_pizza.get('location') == "Via Roma 123":
                print("   ✅ Restaurant location field created successfully")
            else:
                print("   ❌ Restaurant location field missing or incorrect")
                return False
            
            # Check hidden gem location
            secret_garden = next((g for g in hidden_gems if g['name'] == "Secret Garden"), None)
            if secret_garden and secret_garden.get('location') == "Behind the old church":
                print("   ✅ Hidden gem location field created successfully")
            else:
                print("   ❌ Hidden gem location field missing or incorrect")
                return False
            
        else:
            print(f"   ❌ Apartment creation failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False
    
    # Step 3: Retrieve apartment and verify location fields
    print("\n3. Retrieving apartment to verify location fields...")
    try:
        response = requests.get(f"{base_url}/apartments/{apartment_id}", headers=headers, timeout=30)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            recommendations = data.get('recommendations', {})
            restaurants = recommendations.get('restaurants', [])
            hidden_gems = recommendations.get('hidden_gems', [])
            
            # Verify restaurant location persisted
            mario_pizza = next((r for r in restaurants if r['name'] == "Mario's Pizza"), None)
            if mario_pizza and mario_pizza.get('location') == "Via Roma 123":
                print("   ✅ Restaurant location field retrieved successfully")
            else:
                print("   ❌ Restaurant location field not persisted")
                return False
            
            # Verify hidden gem location persisted
            secret_garden = next((g for g in hidden_gems if g['name'] == "Secret Garden"), None)
            if secret_garden and secret_garden.get('location') == "Behind the old church":
                print("   ✅ Hidden gem location field retrieved successfully")
            else:
                print("   ❌ Hidden gem location field not persisted")
                return False
            
        else:
            print(f"   ❌ Apartment retrieval failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False
    
    # Step 4: Update apartment with new location fields
    print("\n4. Updating apartment with additional location fields...")
    
    # Get current data first
    current_data = data.copy()
    
    # Add new restaurant with location
    current_data['recommendations']['restaurants'].append({
        "name": "New Trattoria",
        "type": "Italian",
        "location": "Piazza Navona 45",
        "tip": "Authentic Roman cuisine"
    })
    
    # Add new hidden gem with location
    current_data['recommendations']['hidden_gems'].append({
        "name": "Rooftop Terrace",
        "location": "Via del Corso 100, 5th floor",
        "tip": "Amazing city panorama"
    })
    
    # Remove fields that shouldn't be in update
    for field in ['id', 'user_id', 'created_at', 'total_chats', 'total_sessions', 'last_chat', 'last_ical_sync']:
        current_data.pop(field, None)
    
    try:
        response = requests.put(f"{base_url}/apartments/{apartment_id}", json=current_data, headers=headers, timeout=30)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            recommendations = data.get('recommendations', {})
            restaurants = recommendations.get('restaurants', [])
            hidden_gems = recommendations.get('hidden_gems', [])
            
            # Check new restaurant
            new_trattoria = next((r for r in restaurants if r['name'] == "New Trattoria"), None)
            if new_trattoria and new_trattoria.get('location') == "Piazza Navona 45":
                print("   ✅ New restaurant with location field added successfully")
            else:
                print("   ❌ New restaurant location field not added")
                return False
            
            # Check new hidden gem
            rooftop_terrace = next((g for g in hidden_gems if g['name'] == "Rooftop Terrace"), None)
            if rooftop_terrace and rooftop_terrace.get('location') == "Via del Corso 100, 5th floor":
                print("   ✅ New hidden gem with location field added successfully")
            else:
                print("   ❌ New hidden gem location field not added")
                return False
            
            # Verify original location fields still exist
            mario_pizza = next((r for r in restaurants if r['name'] == "Mario's Pizza"), None)
            if mario_pizza and mario_pizza.get('location') == "Via Roma 123":
                print("   ✅ Original restaurant location field preserved")
            else:
                print("   ❌ Original restaurant location field lost")
                return False
            
        else:
            print(f"   ❌ Apartment update failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False
    
    # Step 5: Test backward compatibility (apartment without location fields)
    print("\n5. Testing backward compatibility (no location fields)...")
    legacy_apartment_data = {
        "name": "Legacy Apartment",
        "address": "Old Street 123",
        "description": "Apartment without location fields",
        "rules": ["No smoking"],
        "contact": {"email": "legacy@example.com"},
        "ical_url": "",
        "recommendations": {
            "restaurants": [
                {
                    "name": "Old Restaurant",
                    "type": "Traditional",
                    "tip": "Good food, no location specified"
                }
            ],
            "hidden_gems": [
                {
                    "name": "Old Gem",
                    "tip": "Nice place, no location specified"
                }
            ]
        }
    }
    
    try:
        response = requests.post(f"{base_url}/apartments", json=legacy_apartment_data, headers=headers, timeout=30)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            legacy_apartment_id = data['id']
            print(f"   ✅ Legacy apartment created: {legacy_apartment_id}")
            
            # Verify it works without location fields
            recommendations = data.get('recommendations', {})
            restaurants = recommendations.get('restaurants', [])
            hidden_gems = recommendations.get('hidden_gems', [])
            
            if restaurants and hidden_gems:
                print("   ✅ Legacy apartment works without location fields")
                
                # Verify no unexpected location fields
                for restaurant in restaurants:
                    if 'location' in restaurant and restaurant['location']:
                        print("   ❌ Unexpected location field in legacy restaurant")
                        return False
                
                for gem in hidden_gems:
                    if 'location' in gem and gem['location']:
                        print("   ❌ Unexpected location field in legacy hidden gem")
                        return False
                
                print("   ✅ No unexpected location fields in legacy recommendations")
            else:
                print("   ❌ Legacy apartment missing recommendations")
                return False
        else:
            print(f"   ❌ Legacy apartment creation failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False
    
    # Cleanup
    print("\n6. Cleaning up test data...")
    try:
        requests.delete(f"{base_url}/apartments/{apartment_id}", headers=headers, timeout=30)
        requests.delete(f"{base_url}/apartments/{legacy_apartment_id}", headers=headers, timeout=30)
        print("   ✅ Test data cleaned up")
    except:
        print("   ⚠️ Cleanup may have failed")
    
    print("\n" + "=" * 50)
    print("✅ ALL LOCATION FIELDS TESTS PASSED!")
    print("=" * 50)
    return True

if __name__ == "__main__":
    success = test_location_fields()
    if not success:
        print("\n❌ LOCATION FIELDS TESTS FAILED!")
        exit(1)