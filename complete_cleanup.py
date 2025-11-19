#!/usr/bin/env python3
"""
Complete cleanup of iCal, Guest Login, and Scheduler code
"""

def complete_cleanup():
    with open('/app/backend/server.py', 'r') as f:
        content = f.read()
    
    # Remove entire endpoints by finding their start and next endpoint
    endpoints_to_remove = [
        '@api_router.post("/ical/detailed-test/{apartment_id}")',
        '@api_router.post("/ical/test-sync/{apartment_id}")',
        '@api_router.post("/guest-login"',
        '@api_router.get("/guest-bookings',
        '@api_router.post("/guest-bookings',
    ]
    
    lines = content.split('\n')
    new_lines = []
    skip_until_next_route = False
    brace_count = 0
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Check if this line starts an endpoint we want to remove
        should_skip = False
        for endpoint in endpoints_to_remove:
            if endpoint in line:
                should_skip = True
                break
        
        if should_skip:
            # Skip until we find the next @api_router or @app or end of file
            i += 1
            while i < len(lines):
                next_line = lines[i]
                # Stop skipping when we hit next route decorator or major section
                if (next_line.startswith('@api_router') or 
                    next_line.startswith('@app.') or
                    next_line.startswith('# ===') or
                    (next_line.startswith('class ') and not next_line.strip().startswith('#'))):
                    break
                i += 1
            continue
        
        # Remove lines mentioning these specific things
        if any(x in line for x in [
            'ical_url',
            'last_ical_sync', 
            'sync_apartment_calendar',
            'parse_ical_calendar',
            'GuestBooking(',
            'guest_booking',
            'AsyncIOScheduler',
            'scheduler.start',
            'scheduler.add_job',
            'scheduler.shutdown',
            'sync_all_apartments_calendars'
        ]):
            i += 1
            continue
        
        new_lines.append(line)
        i += 1
    
    new_content = '\n'.join(new_lines)
    
    with open('/app/backend/server.py', 'w') as f:
        f.write(new_content)
    
    print(f"✅ Complete cleanup done")
    print(f"   Original: {len(lines)} lines")
    print(f"   New: {len(new_lines)} lines")
    print(f"   Removed: {len(lines) - len(new_lines)} lines")

if __name__ == '__main__':
    complete_cleanup()
