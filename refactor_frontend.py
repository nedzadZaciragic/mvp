#!/usr/bin/env python3
"""
Frontend refactor script - Remove guest login, iCal, add tutorials
"""

import re

def refactor_frontend():
    with open('/app/frontend/src/App.js', 'r') as f:
        content = f.read()
    
    # Remove GuestLogin component (lines 1687-1788)
    # Find and remove the entire GuestLogin component
    content = re.sub(
        r'const GuestLogin = \(\{ apartmentId, onLoginSuccess \}\) => \{.*?\n\};',
        '',
        content,
        flags=re.DOTALL
    )
    
    # Remove guest login state and logic from GuestChat
    # Remove isLoggedIn, guestData states
    content = content.replace('const [guestData, setGuestData] = useState(null);', '')
    content = content.replace('const [isLoggedIn, setIsLoggedIn] = useState(false);', '')
    
    # Remove guest login check in useEffect
    content = re.sub(
        r'// Check if guest is already logged in.*?fetchApartmentInfo\(\);.*?\}',
        'fetchApartmentInfo();',
        content,
        flags=re.DOTALL
    )
    
    # Simplify sendMessage to always use public endpoint without auth
    old_send = '''      if (isLoggedIn && guestData) {
        // Use guest chat endpoint with token
        const guestToken = localStorage.getItem('guestToken');
        response = await axios.post(`${API}/guest-chat`, {
          apartment_id: apartmentId,
          message: messageToSend,
          session_id: `guest_${guestData.first_name}_${guestData.last_name}_${apartmentId}`
        }, {
          headers: {
            'Authorization': `Bearer ${guestToken}`
          }
        });
      } else {
        // Use regular public chat endpoint
        response = await axios.post(`${API}/chat`, {
          apartment_id: apartmentId,
          message: messageToSend,
          session_id: `public_${apartmentId}`
        });
      }'''
    
    new_send = '''      // Use public guest chat endpoint (no authentication)
      response = await axios.post(`${API}/guest-chat`, {
        apartment_id: apartmentId,
        message: messageToSend,
        session_id: sessionId
      });'''
    
    content = content.replace(old_send, new_send)
    
    # Remove handleGuestLoginSuccess function
    content = re.sub(
        r'const handleGuestLoginSuccess = \(loginResponse\) => \{.*?\};',
        '',
        content,
        flags=re.DOTALL
    )
    
    # Remove the login check that returns GuestLogin component
    content = re.sub(
        r'if \(!isLoggedIn\) \{\s*return <GuestLogin.*?\/>\;\s*\}',
        '',
        content,
        flags=re.DOTALL
    )
    
    # Remove iCal test results state and function
    content = content.replace('const [icalTestResults, setIcalTestResults] = useState(null);', '')
    
    # Remove iCal test function
    content = re.sub(
        r'const response = await axios\.post\(`\$\{API\}\/ical\/detailed-test.*?\}\);',
        '',
        content,
        flags=re.DOTALL
    )
    
    # Remove iCal view from activeView
    content = content.replace("setActiveView('ical');", "// iCal removed")
    
    # Remove iCal results display
    content = re.sub(
        r'\{activeView === \'ical\' && icalTestResults &&.*?\}\)',
        '',
        content,
        flags=re.DOTALL
    )
    
    # Remove ical_url from apartment display
    content = re.sub(
        r'\{apartment\.ical_url \? \'✅ Connected\' : \'❌ Not connected\'\}',
        "'N/A - Manual only'",
        content
    )
    
    # Remove iCal URL input field from forms
    content = re.sub(
        r'<div>.*?<label.*?>iCal.*?<\/label>.*?<Input.*?ical_url.*?<\/div>',
        '',
        content,
        flags=re.DOTALL | re.IGNORECASE
    )
    
    with open('/app/frontend/src/App.js', 'w') as f:
        f.write(content)
    
    print("✅ Frontend refactored successfully")

if __name__ == '__main__':
    refactor_frontend()
