import requests
import json
import uuid

def test_comprehensive_location_fields():
    """Comprehensive test for location fields in recommendations"""
    base_url = "http://localhost:8001/api"
    
    # Generate unique email to avoid conflicts
    unique_id = str(uuid.uuid4())[:8]
    user_data = {
        "email": f"locationtest{unique_id}@example.com",
        "full_name": f"Location Test User {unique_id}",
        "password": "testpass123"
    }
    
    # Admin credentials
    admin_credentials = {
        "username": "myhomeiq_admin",
        "password": "Admin123!MyHomeIQ"
    }
    
    print("🚀 Comprehensive Location Fields Testing")
    print("=" * 50)
    
    # Step 1: Setup user authentication
    print("\n1. Setting up user authentication...")
    try:
        response = requests.post(f"{base_url}/auth/register", json=user_data, timeout=30)
        if response.status_code == 200:
            data = response.json()
            user_token = data['access_token']
            user_id = data['user']['id']
            print(f"   ✅ User registered: {user_id}")
        else:
            print(f"   ❌ User registration failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False
    
    user_headers = {'Authorization': f'Bearer {user_token}', 'Content-Type': 'application/json'}
    
    # Step 2: Test creating apartment with location fields
    print("\n2. Creating apartment with location fields...")
    apartment_data = {
        "name": "Mario's Italian Villa",
        "address": "Via Roma 123, Rome, Italy",
        "description": "Beautiful apartment in the heart of Rome",
        "rules": ["No smoking", "No parties"],
        "contact": {"email": "host@example.com", "phone": "+39 123 456 789"},
        "ical_url": "",
        "ai_tone": "friendly",
        "recommendations": {
            "restaurants": [
                {
                    "name": "Mario's Pizza",
                    "type": "Italian",
                    "location": "Via Roma 123",
                    "tip": "Best pizza in town"
                },
                {
                    "name": "Trattoria del Centro",
                    "type": "Traditional Italian",
                    "location": "Piazza Navona 45",
                    "tip": "Authentic Roman cuisine"
                }
            ],
            "hidden_gems": [
                {
                    "name": "Secret Garden",
                    "location": "Behind the old church",
                    "tip": "Beautiful sunset views"
                },
                {
                    "name": "Rooftop Terrace",
                    "location": "Via del Corso 100, 5th floor",
                    "tip": "Amazing city panorama"
                }
            ],
            "transport": "Metro station 2 minutes walk"
        }
    }
    
    try:
        response = requests.post(f"{base_url}/apartments", json=apartment_data, headers=user_headers, timeout=30)
        if response.status_code == 200:
            data = response.json()
            apartment_id = data['id']
            print(f"   ✅ Apartment created: {apartment_id}")
            
            # Verify location fields in creation response
            recommendations = data.get('recommendations', {})
            restaurants = recommendations.get('restaurants', [])
            hidden_gems = recommendations.get('hidden_gems', [])
            
            restaurants_with_location = [r for r in restaurants if 'location' in r and r['location']]
            gems_with_location = [g for g in hidden_gems if 'location' in g and g['location']]
            
            if len(restaurants_with_location) == 2 and len(gems_with_location) == 2:
                print("   ✅ All location fields created successfully")
                print(f"      Restaurants: {[r['name'] + ' @ ' + r['location'] for r in restaurants_with_location]}")
                print(f"      Hidden gems: {[g['name'] + ' @ ' + g['location'] for g in gems_with_location]}")
            else:
                print(f"   ❌ Location fields missing: {len(restaurants_with_location)}/2 restaurants, {len(gems_with_location)}/2 gems")
                return False
        else:
            print(f"   ❌ Apartment creation failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False
    
    # Step 3: Test retrieving apartment with location fields
    print("\n3. Testing apartment retrieval with location fields...")
    try:
        response = requests.get(f"{base_url}/apartments/{apartment_id}", headers=user_headers, timeout=30)
        if response.status_code == 200:
            data = response.json()
            recommendations = data.get('recommendations', {})
            restaurants = recommendations.get('restaurants', [])
            hidden_gems = recommendations.get('hidden_gems', [])
            
            # Verify specific location data
            mario_pizza = next((r for r in restaurants if r['name'] == "Mario's Pizza"), None)
            secret_garden = next((g for g in hidden_gems if g['name'] == "Secret Garden"), None)
            
            if (mario_pizza and mario_pizza.get('location') == "Via Roma 123" and
                secret_garden and secret_garden.get('location') == "Behind the old church"):
                print("   ✅ Location fields retrieved correctly")
            else:
                print("   ❌ Location fields not retrieved correctly")
                return False
        else:
            print(f"   ❌ Apartment retrieval failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False
    
    # Step 4: Test updating apartment with new location fields
    print("\n4. Testing apartment update with new location fields...")
    try:
        # Get current data
        response = requests.get(f"{base_url}/apartments/{apartment_id}", headers=user_headers, timeout=30)
        current_data = response.json()
        
        # Add new items with location fields
        current_data['recommendations']['restaurants'].append({
            "name": "New Pizzeria",
            "type": "Pizza",
            "location": "Via Nuova 456",
            "tip": "Great late night option"
        })
        
        current_data['recommendations']['hidden_gems'].append({
            "name": "Hidden Courtyard",
            "location": "Through the green door on Via Antica",
            "tip": "Peaceful spot for morning coffee"
        })
        
        # Remove fields that shouldn't be in update
        for field in ['id', 'user_id', 'created_at', 'total_chats', 'total_sessions', 'last_chat', 'last_ical_sync']:
            current_data.pop(field, None)
        
        response = requests.put(f"{base_url}/apartments/{apartment_id}", json=current_data, headers=user_headers, timeout=30)
        if response.status_code == 200:
            data = response.json()
            recommendations = data.get('recommendations', {})
            restaurants = recommendations.get('restaurants', [])
            hidden_gems = recommendations.get('hidden_gems', [])
            
            # Check new items
            new_pizzeria = next((r for r in restaurants if r['name'] == "New Pizzeria"), None)
            hidden_courtyard = next((g for g in hidden_gems if g['name'] == "Hidden Courtyard"), None)
            
            # Check original items still exist
            mario_pizza = next((r for r in restaurants if r['name'] == "Mario's Pizza"), None)
            
            if (new_pizzeria and new_pizzeria.get('location') == "Via Nuova 456" and
                hidden_courtyard and hidden_courtyard.get('location') == "Through the green door on Via Antica" and
                mario_pizza and mario_pizza.get('location') == "Via Roma 123"):
                print("   ✅ Apartment updated with new location fields successfully")
                print(f"      Total restaurants: {len(restaurants)}")
                print(f"      Total hidden gems: {len(hidden_gems)}")
            else:
                print("   ❌ Apartment update with location fields failed")
                return False
        else:
            print(f"   ❌ Apartment update failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False
    
    # Step 5: Test admin endpoints
    print("\n5. Testing admin endpoints with location fields...")
    try:
        # Admin login
        response = requests.post(f"{base_url}/admin/login", json=admin_credentials, timeout=30)
        if response.status_code == 200:
            data = response.json()
            admin_token = data['access_token']
            print("   ✅ Admin authenticated")
        else:
            print(f"   ❌ Admin authentication failed: {response.status_code}")
            return False
        
        admin_headers = {'Authorization': f'Bearer {admin_token}', 'Content-Type': 'application/json'}
        
        # Test admin apartments endpoint
        response = requests.get(f"{base_url}/admin/apartments", headers=admin_headers, timeout=30)
        if response.status_code == 200:
            apartments = response.json()  # Direct list
            print(f"   ✅ Admin retrieved {len(apartments)} apartments")
            
            # Find our test apartment
            test_apartment = next((apt for apt in apartments if apt.get('id') == apartment_id), None)
            
            if test_apartment:
                recommendations = test_apartment.get('recommendations', {})
                restaurants = recommendations.get('restaurants', [])
                hidden_gems = recommendations.get('hidden_gems', [])
                
                restaurants_with_location = [r for r in restaurants if 'location' in r and r['location']]
                gems_with_location = [g for g in hidden_gems if 'location' in g and g['location']]
                
                if len(restaurants_with_location) >= 2 and len(gems_with_location) >= 2:
                    print("   ✅ Admin endpoint returns location fields correctly")
                else:
                    print(f"   ❌ Admin endpoint missing location fields: {len(restaurants_with_location)} restaurants, {len(gems_with_location)} gems")
                    return False
            else:
                print("   ❌ Test apartment not found in admin response")
                return False
        else:
            print(f"   ❌ Admin apartments endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False
    
    # Step 6: Test backward compatibility
    print("\n6. Testing backward compatibility (no location fields)...")
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
        response = requests.post(f"{base_url}/apartments", json=legacy_apartment_data, headers=user_headers, timeout=30)
        if response.status_code == 200:
            data = response.json()
            legacy_apartment_id = data['id']
            print(f"   ✅ Legacy apartment created: {legacy_apartment_id}")
            
            # Verify it works without location fields
            recommendations = data.get('recommendations', {})
            restaurants = recommendations.get('restaurants', [])
            hidden_gems = recommendations.get('hidden_gems', [])
            
            # Check no unexpected location fields
            unexpected_locations = []
            for restaurant in restaurants:
                if 'location' in restaurant and restaurant['location']:
                    unexpected_locations.append(f"restaurant: {restaurant['name']}")
            
            for gem in hidden_gems:
                if 'location' in gem and gem['location']:
                    unexpected_locations.append(f"gem: {gem['name']}")
            
            if not unexpected_locations:
                print("   ✅ Legacy apartment works correctly without location fields")
            else:
                print(f"   ❌ Legacy apartment has unexpected location fields: {unexpected_locations}")
                return False
        else:
            print(f"   ❌ Legacy apartment creation failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False
    
    # Step 7: Test mixed recommendations
    print("\n7. Testing mixed recommendations (some with, some without location)...")
    mixed_apartment_data = {
        "name": "Mixed Recommendations Apartment",
        "address": "Mixed Street 789",
        "description": "Apartment with mixed recommendation formats",
        "rules": ["No smoking"],
        "contact": {"email": "mixed@example.com"},
        "ical_url": "",
        "recommendations": {
            "restaurants": [
                {
                    "name": "Restaurant with Location",
                    "type": "Modern",
                    "location": "Downtown Plaza 1",
                    "tip": "Has location field"
                },
                {
                    "name": "Restaurant without Location",
                    "type": "Traditional",
                    "tip": "No location field"
                }
            ],
            "hidden_gems": [
                {
                    "name": "Gem with Location",
                    "location": "Secret alley behind main street",
                    "tip": "Has location field"
                },
                {
                    "name": "Gem without Location",
                    "tip": "No location field"
                }
            ]
        }
    }
    
    try:
        response = requests.post(f"{base_url}/apartments", json=mixed_apartment_data, headers=user_headers, timeout=30)
        if response.status_code == 200:
            data = response.json()
            mixed_apartment_id = data['id']
            print(f"   ✅ Mixed apartment created: {mixed_apartment_id}")
            
            recommendations = data.get('recommendations', {})
            restaurants = recommendations.get('restaurants', [])
            hidden_gems = recommendations.get('hidden_gems', [])
            
            # Count items with and without location fields
            restaurants_with_location = [r for r in restaurants if 'location' in r and r['location']]
            restaurants_without_location = [r for r in restaurants if 'location' not in r or not r['location']]
            gems_with_location = [g for g in hidden_gems if 'location' in g and g['location']]
            gems_without_location = [g for g in hidden_gems if 'location' not in g or not g['location']]
            
            if (len(restaurants_with_location) == 1 and len(restaurants_without_location) == 1 and
                len(gems_with_location) == 1 and len(gems_without_location) == 1):
                print("   ✅ Mixed recommendations work correctly")
                print(f"      Restaurants: 1 with location, 1 without")
                print(f"      Hidden gems: 1 with location, 1 without")
            else:
                print(f"   ❌ Mixed recommendations failed: restaurants({len(restaurants_with_location)}/{len(restaurants_without_location)}), gems({len(gems_with_location)}/{len(gems_without_location)})")
                return False
        else:
            print(f"   ❌ Mixed apartment creation failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False
    
    # Cleanup
    print("\n8. Cleaning up test data...")
    try:
        requests.delete(f"{base_url}/apartments/{apartment_id}", headers=user_headers, timeout=30)
        requests.delete(f"{base_url}/apartments/{legacy_apartment_id}", headers=user_headers, timeout=30)
        requests.delete(f"{base_url}/apartments/{mixed_apartment_id}", headers=user_headers, timeout=30)
        print("   ✅ Test data cleaned up")
    except:
        print("   ⚠️ Cleanup may have failed")
    
    print("\n" + "=" * 50)
    print("✅ ALL COMPREHENSIVE LOCATION FIELDS TESTS PASSED!")
    print("=" * 50)
    return True

if __name__ == "__main__":
    success = test_comprehensive_location_fields()
    if not success:
        print("\n❌ COMPREHENSIVE LOCATION FIELDS TESTS FAILED!")
        exit(1)