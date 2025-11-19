#!/usr/bin/env python3
"""
Automatic refactor script to remove iCal, Guest Login, and Scheduler functionality
"""

import re

def refactor_server():
    """Remove all iCal, guest booking, and scheduler code"""
    
    with open('/app/backend/server.py', 'r') as f:
        lines = f.readlines()
    
    new_lines = []
    skip_until = None
    skip_model = False
    skip_function = False
    indent_level = 0
    
    for i, line in enumerate(lines):
        # Skip APScheduler imports
        if 'from apscheduler' in line:
            continue
            
        # Skip GuestBooking model
        if line.startswith('class GuestBooking('):
            skip_model = True
            indent_level = len(line) - len(line.lstrip())
            continue
        
        # Skip GuestLoginRequest model
        if line.startswith('class GuestLoginRequest('):
            skip_model = True
            indent_level = len(line) - len(line.lstrip())
            continue
            
        # Skip GuestLoginResponse model
        if line.startswith('class GuestLoginResponse('):
            skip_model = True
            indent_level = len(line) - len(line.lstrip())
            continue
        
        # Skip parse_ical_calendar function
        if line.startswith('async def parse_ical_calendar('):
            skip_function = True
            indent_level = 0
            continue
            
        # Skip sync_apartment_calendar function  
        if line.startswith('async def sync_apartment_calendar('):
            skip_function = True
            indent_level = 0
            continue
        
        # Skip get_current_guest function
        if line.startswith('async def get_current_guest('):
            skip_function = True
            indent_level = 0
            continue
            
        # Check if we should stop skipping model
        if skip_model:
            current_indent = len(line) - len(line.lstrip())
            # If we hit another class or function at same/lower indent, stop skipping
            if line.strip() and current_indent <= indent_level and (line.startswith('class ') or line.startswith('async def ') or line.startswith('def ')):
                skip_model = False
            else:
                continue
        
        # Check if we should stop skipping function
        if skip_function:
            # If we hit another function or class at root level, stop skipping
            if line.strip() and not line.startswith(' ') and not line.startswith('\t'):
                if line.startswith('async def ') or line.startswith('def ') or line.startswith('class ') or line.startswith('@'):
                    skip_function = False
                else:
                    continue
            else:
                continue
        
        # Remove ical_url fields from models
        if 'ical_url' in line and ('str = ""' in line or 'str = \'\'' in line):
            continue
        
        # Remove last_ical_sync field
        if 'last_ical_sync' in line:
            continue
            
        # Skip guest-login endpoint
        if '@api_router.post("/guest-login' in line:
            skip_function = True
            indent_level = 0
            continue
        
        # Skip guest-bookings endpoint
        if '@api_router.get("/guest-bookings' in line or '@api_router.post("/guest-bookings' in line:
            skip_function = True
            indent_level = 0
            continue
        
        # Skip scheduler initialization code
        if 'scheduler = AsyncIOScheduler()' in line:
            continue
        if 'async def sync_all_apartments_calendars()' in line:
            skip_function = True
            indent_level = 0
            continue
        if 'scheduler.start()' in line:
            continue
        if 'scheduler.add_job(' in line:
            skip_function = True
            indent_level = 0
            continue
        if 'scheduler.shutdown()' in line:
            continue
        if 'await sync_all_apartments_calendars()' in line:
            continue
        
        new_lines.append(line)
    
    # Write refactored content
    with open('/app/backend/server.py', 'w') as f:
        f.writelines(new_lines)
    
    print(f"✅ Refactored: {len(lines)} → {len(new_lines)} lines")
    print(f"   Removed: {len(lines) - len(new_lines)} lines")

if __name__ == '__main__':
    refactor_server()
