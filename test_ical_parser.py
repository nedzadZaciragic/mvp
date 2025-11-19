#!/usr/bin/env python3
"""
Test iCal Parser - Verify it can extract guest booking information
"""

import asyncio
import httpx
import sys
from datetime import datetime

async def parse_ical_calendar(ical_url: str):
    """Parse iCal calendar and extract booking information"""
    try:
        print(f"📥 Fetching iCal from: {ical_url}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(ical_url)
            
        if response.status_code != 200:
            print(f"❌ Failed to fetch iCal: HTTP {response.status_code}")
            return []
            
        ical_content = response.text
        print(f"✅ Downloaded {len(ical_content)} characters of iCal data")
        
        bookings = []
        current_booking = {}
        
        lines = ical_content.split('\n')
        print(f"📄 Processing {len(lines)} lines...")
        
        for line in lines:
            line = line.strip()
            
            if line.startswith('BEGIN:VEVENT'):
                current_booking = {}
                
            elif line.startswith('END:VEVENT'):
                if current_booking:
                    bookings.append(current_booking)
                    
            elif line.startswith('DTSTART'):
                try:
                    date_str = line.split(':', 1)[1].strip()
                    # Handle different date formats
                    if 'T' in date_str:
                        date_str = date_str.split('T')[0]
                    if len(date_str) == 8:  # YYYYMMDD
                        current_booking['checkin_date'] = datetime.strptime(date_str, '%Y%m%d')
                        current_booking['start_date'] = date_str
                except Exception as e:
                    print(f"⚠️  Error parsing start date: {e}")
                    
            elif line.startswith('DTEND'):
                try:
                    date_str = line.split(':', 1)[1].strip()
                    if 'T' in date_str:
                        date_str = date_str.split('T')[0]
                    if len(date_str) == 8:
                        current_booking['checkout_date'] = datetime.strptime(date_str, '%Y%m%d')
                        current_booking['end_date'] = date_str
                except Exception as e:
                    print(f"⚠️  Error parsing end date: {e}")
                    
            elif line.startswith('SUMMARY'):
                summary = line.split(':', 1)[1].strip()
                current_booking['summary'] = summary
                # Try to extract guest name from summary
                # Common formats: "Reserved: John Smith", "John Smith", "Booking for John Smith"
                if ':' in summary:
                    parts = summary.split(':', 1)
                    guest_name = parts[1].strip()
                else:
                    guest_name = summary.strip()
                current_booking['guest_name'] = guest_name
                
            elif line.startswith('DESCRIPTION'):
                description = line.split(':', 1)[1].strip()
                current_booking['description'] = description
                # Try to extract email from description
                if '@' in description:
                    # Simple email extraction
                    words = description.split()
                    for word in words:
                        if '@' in word and '.' in word:
                            current_booking['guest_email'] = word.strip()
                            break
        
        print(f"\n✅ Found {len(bookings)} booking events in iCal")
        return bookings
        
    except Exception as e:
        print(f"❌ Error parsing iCal: {str(e)}")
        return []

async def test_ical_url(ical_url: str):
    """Test iCal parsing with a given URL"""
    
    print("=" * 80)
    print("🧪 iCAL PARSER TEST")
    print("=" * 80)
    print()
    
    bookings = await parse_ical_calendar(ical_url)
    
    if not bookings:
        print("\n❌ No bookings found or parsing failed")
        print("\n💡 This could mean:")
        print("   - No reservations in the calendar yet")
        print("   - iCal URL is invalid")
        print("   - Calendar is empty")
        return
    
    print("\n" + "=" * 80)
    print(f"📊 FOUND {len(bookings)} BOOKINGS")
    print("=" * 80)
    
    for i, booking in enumerate(bookings, 1):
        print(f"\n🎫 BOOKING #{i}:")
        print("-" * 80)
        
        # Guest Name
        guest_name = booking.get('guest_name', 'Not found')
        name_parts = guest_name.strip().split(' ', 1)
        first_name = name_parts[0] if len(name_parts) > 0 else 'Guest'
        last_name = name_parts[1] if len(name_parts) > 1 else 'User'
        
        print(f"👤 Guest Name: {guest_name}")
        print(f"   ├─ First Name: {first_name}")
        print(f"   └─ Last Name: {last_name}")
        
        # Email
        guest_email = booking.get('guest_email', 'Not found in iCal')
        print(f"📧 Email: {guest_email}")
        
        # Dates
        if booking.get('checkin_date'):
            checkin = booking['checkin_date'].strftime('%B %d, %Y')
            print(f"📅 Check-in: {checkin}")
        else:
            print(f"📅 Check-in: Not found")
            
        if booking.get('checkout_date'):
            checkout = booking['checkout_date'].strftime('%B %d, %Y')
            print(f"📅 Check-out: {checkout}")
        else:
            print(f"📅 Check-out: Not found")
        
        # Summary/Description
        if booking.get('summary'):
            print(f"📝 Summary: {booking['summary'][:100]}...")
        
        # What will be created
        print(f"\n✅ WHAT WILL BE CREATED:")
        print(f"   Database Record: guest_bookings")
        print(f"   ├─ first_name: {first_name}")
        print(f"   ├─ last_name: {last_name}")
        print(f"   ├─ email: {guest_email}")
        print(f"   ├─ check_in_date: {booking.get('start_date', 'N/A')}")
        print(f"   ├─ check_out_date: {booking.get('end_date', 'N/A')}")
        print(f"   └─ booking_source: ical")
        
        print(f"\n🔐 GUEST LOGIN WILL WORK WITH:")
        print(f"   First Name: {first_name}")
        print(f"   Last Name: {last_name}")
        print(f"   (Case-insensitive)")
    
    print("\n" + "=" * 80)
    print("✅ iCAL PARSER TEST COMPLETE")
    print("=" * 80)
    
    print("\n💡 NEXT STEPS:")
    print("   1. Add this iCal URL to your apartment in MyHostIQ")
    print("   2. System will auto-sync every 15 minutes")
    print("   3. When friend books, their info will be extracted automatically")
    print("   4. They can login with their first + last name")
    print("   5. Email will be sent (once we setup Mailgun)")

async def main():
    """Main test function"""
    
    if len(sys.argv) > 1:
        # iCal URL provided as argument
        ical_url = sys.argv[1]
        await test_ical_url(ical_url)
    else:
        # Show instructions
        print("=" * 80)
        print("🧪 iCAL PARSER TESTER")
        print("=" * 80)
        print()
        print("📋 USAGE:")
        print("   python test_ical_parser.py <ICAL_URL>")
        print()
        print("📖 EXAMPLE:")
        print("   python test_ical_parser.py 'https://www.airbnb.com/calendar/ical/12345.ics'")
        print()
        print("🔍 WHERE TO GET iCAL URL:")
        print()
        print("   AIRBNB:")
        print("   1. Go to your listing calendar")
        print("   2. Click 'Availability' → 'Sync calendars'")
        print("   3. Copy the 'Export Calendar' URL")
        print()
        print("   BOOKING.COM:")
        print("   1. Go to Extranet → Calendar")
        print("   2. Click 'Import/Export Calendar'")
        print("   3. Copy the 'Export Calendar' URL")
        print()
        print("💡 OR: Paste your iCal URL here now:")
        ical_url = input("   iCal URL: ").strip()
        
        if ical_url:
            await test_ical_url(ical_url)
        else:
            print("\n❌ No URL provided. Exiting.")

if __name__ == "__main__":
    asyncio.run(main())
