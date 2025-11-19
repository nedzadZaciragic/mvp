# MyHostIQ Simplification - Refactor Plan

## Changes Required:

### BACKEND (/app/backend/server.py):
1. Remove APScheduler imports and scheduler code
2. Remove all iCal parsing functions
3. Remove GuestBooking model
4. Remove GuestLoginRequest/Response models  
5. Remove guest login endpoint
6. Remove guest bookings endpoints
7. Simplify /guest-chat endpoint (no auth required)
8. Add rate limiting: 100 queries/day per apartment
9. Remove ical_url field from Apartment models
10. Remove sync_apartment_calendar function
11. Keep /public/apartments/{id} endpoint

### FRONTEND (/app/frontend/src/App.js):
1. Remove GuestLoginForm component
2. Remove guest bookings management UI
3. Remove iCal URL field from apartment forms
4. Add "Connect Your Chatbot" tutorial section to dashboard
5. Simplify QR code generation (just link, no login)
6. Update guest chat route (no login required)
7. Add rate limit display in chatbot

## Implementation Steps:
1. Backup current files ✓
2. Update backend models and routes
3. Update frontend components
4. Test simplified flow
5. Deploy

