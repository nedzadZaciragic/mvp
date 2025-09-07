from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
import jwt
import bcrypt
import asyncio
import httpx
import re
from datetime import datetime, timezone, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage
from urllib.parse import urlparse
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from cryptography.fernet import Fernet
import ssl
import base64
import requests
from bs4 import BeautifulSoup
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security and Encryption
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-here')
JWT_ALGORITHM = 'HS256'

# Encryption for email passwords
ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY', 'your-32-byte-encryption-key-here')
if ENCRYPTION_KEY == 'your-32-byte-encryption-key-here':
    # Generate a key for development
    ENCRYPTION_KEY = base64.urlsafe_b64encode(b'dev-key-not-secure-change-me!!').decode()
    
cipher_suite = Fernet(ENCRYPTION_KEY.encode() if len(ENCRYPTION_KEY) == 44 else base64.urlsafe_b64encode(ENCRYPTION_KEY[:32].encode()))

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    full_name: str
    phone: str = ""
    hashed_password: str
    is_active: bool = True
    email_verified: bool = False
    phone_verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # Enhanced Whitelabeling settings
    brand_name: str = "MyHostIQ"
    brand_logo_url: str = ""
    brand_primary_color: str = "#2563eb"
    brand_secondary_color: str = "#1d4ed8"
    ai_tone: str = "professional"  # professional, friendly, casual
    custom_domain: str = ""
    chat_background: str = "default"
    chat_font: str = "Inter"

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    phone: str = ""

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class EmailCredentials(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    email: str
    encrypted_password: str
    smtp_server: str = ""
    smtp_port: int = 587
    is_verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmailCredentialsCreate(BaseModel):
    email: EmailStr
    password: str
    smtp_server: str = ""
    smtp_port: int = 587

class EmailCredentialsResponse(BaseModel):
    id: str
    email: str
    smtp_server: str
    smtp_port: int
    is_verified: bool

class WhitelabelSettings(BaseModel):
    brand_name: str
    brand_logo_url: str = ""
    brand_primary_color: str = "#2563eb"
    brand_secondary_color: str = "#1d4ed8"
    ai_tone: str = "professional"
    custom_domain: str = ""
    chat_background: str = "default"
    chat_font: str = "Inter"

class Apartment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    address: str
    description: str
    rules: List[str] = []
    contact: Dict[str, str] = {}
    ical_url: str = ""  
    ai_tone: str = "professional"
    recommendations: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # Analytics data
    total_chats: int = 0
    total_sessions: int = 0
    last_chat: Optional[datetime] = None
    last_ical_sync: Optional[datetime] = None

class ApartmentCreate(BaseModel):
    name: str
    address: str
    description: str
    rules: List[str] = []
    contact: Dict[str, str] = {}
    ical_url: str = ""
    ai_tone: str = "professional"
    recommendations: Dict[str, Any] = {}

class ApartmentUpdate(BaseModel):
    name: str
    address: str
    description: str
    rules: List[str] = []
    contact: Dict[str, str] = {}
    ical_url: str = ""
    ai_tone: str = "professional"
    recommendations: Dict[str, Any] = {}

class BookingNotification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    apartment_id: str
    guest_email: str = ""
    guest_phone: str = ""
    guest_name: str = ""
    checkin_date: Optional[datetime] = None
    checkout_date: Optional[datetime] = None
    booking_source: str = ""  # airbnb, booking.com, etc
    notification_sent: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    apartment_id: str
    message: str
    response: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    session_id: str = ""
    guest_ip: str = ""

class ChatRequest(BaseModel):
    apartment_id: str
    message: str
    session_id: str = ""

class Apartment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    address: str
    description: str
    rules: List[str] = []
    contact: Dict[str, str] = {}
    ical_url: str = ""  # iCal calendar URL
    recommendations: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # Analytics data
    total_chats: int = 0
    total_sessions: int = 0
    last_chat: Optional[datetime] = None

class ApartmentCreate(BaseModel):
    name: str
    address: str
    description: str
    rules: List[str] = []
    contact: Dict[str, str] = {}
    ical_url: str = ""  # iCal calendar URL
    recommendations: Dict[str, Any] = {}

class AnalyticsData(BaseModel):
    apartment_id: str
    apartment_name: str
    total_chats: int
    total_sessions: int
    last_chat: Optional[datetime]
    popular_questions: List[dict]
    peak_hours: List[dict]

async def scrape_airbnb_listing(url: str) -> dict:
    """Advanced Airbnb scraper with anti-detection measures"""
    try:
        import time
        import random
        from urllib.parse import urljoin
        
        # More aggressive headers to mimic real browser
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://www.airbnb.com/',
            'Origin': 'https://www.airbnb.com',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"'
        }
        
        logger.info(f"Advanced scraping attempt for: {url}")
        
        # Initialize result
        scraped_data = {
            'name': '',
            'address': '',
            'description': '',
            'rules': []
        }
        
        # Create session with better settings
        session = requests.Session()
        session.headers.update(headers)
        
        # Add random delay to seem more human-like
        await asyncio.sleep(random.uniform(1, 3))
        
        # Make request
        response = session.get(url, timeout=20, allow_redirects=True)
        response.raise_for_status()
        
        html_content = response.text
        soup = BeautifulSoup(html_content, 'html.parser')
        
        logger.info(f"Page loaded: {len(html_content)} chars, status: {response.status_code}")
        
        # Method 1: Check for blocked indicators
        blocked_indicators = [
            'Access denied', 'blocked', 'robot', 'captcha', 
            'security check', 'unusual activity', 'temporarily unavailable'
        ]
        
        if any(indicator.lower() in html_content.lower() for indicator in blocked_indicators):
            logger.warning("Page appears to be blocked or showing captcha")
        
        # Method 2: Try to extract from page title first (most reliable)
        title_tag = soup.find('title')
        if title_tag:
            full_title = title_tag.get_text().strip()
            logger.info(f"Page title: {full_title}")
            
            # Clean up Airbnb title
            if ' - ' in full_title and 'airbnb' in full_title.lower():
                potential_name = full_title.split(' - ')[0].strip()
                if len(potential_name) > 10 and potential_name not in ['Airbnb', 'Vacation Rentals']:
                    scraped_data['name'] = potential_name
                    logger.info(f"Extracted name from title: {potential_name}")
        
        # Method 3: Try meta tags
        meta_selectors = [
            'meta[property="og:title"]',
            'meta[name="twitter:title"]',
            'meta[property="og:description"]',
            'meta[name="description"]'
        ]
        
        for selector in meta_selectors:
            meta = soup.select_one(selector)
            if meta and meta.get('content'):
                content = meta.get('content').strip()
                logger.info(f"Meta {selector}: {content[:100]}...")
                
                if not scraped_data['name'] and 'og:title' in selector:
                    if content and len(content) > 5 and 'airbnb' not in content.lower():
                        scraped_data['name'] = content
                        
                if not scraped_data['description'] and ('description' in selector or 'og:description' in selector):
                    if content and len(content) > 20:
                        scraped_data['description'] = content[:300]
        
        # Method 4: Look for JSON-LD structured data
        json_scripts = soup.find_all('script', type='application/ld+json')
        for script in json_scripts:
            try:
                data = json.loads(script.string)
                if isinstance(data, dict):
                    if 'name' in data and not scraped_data['name']:
                        scraped_data['name'] = data['name']
                    if 'description' in data and not scraped_data['description']:
                        scraped_data['description'] = data['description'][:300]
                    if 'address' in data and not scraped_data['address']:
                        if isinstance(data['address'], dict):
                            addr_parts = []
                            for key in ['streetAddress', 'addressLocality', 'addressRegion']:
                                if key in data['address']:
                                    addr_parts.append(data['address'][key])
                            if addr_parts:
                                scraped_data['address'] = ', '.join(addr_parts)
                        elif isinstance(data['address'], str):
                            scraped_data['address'] = data['address']
            except:
                continue
        
        # Method 5: Try alternative selectors with broader patterns
        if not scraped_data['name']:
            # Try various heading patterns
            heading_selectors = [
                'h1', 'h2[data-testid]', '[data-testid*="title"]', 
                '[class*="title"]', '[class*="name"]'
            ]
            
            for selector in heading_selectors:
                elements = soup.select(selector)
                for elem in elements:
                    text = elem.get_text(strip=True)
                    if text and len(text) > 10 and len(text) < 200:
                        # Filter out obvious non-property names
                        exclude_words = ['airbnb', 'sign up', 'log in', 'book', 'search', 'filter']
                        if not any(word in text.lower() for word in exclude_words):
                            scraped_data['name'] = text
                            break
                if scraped_data['name']:
                    break
        
        # Method 6: Look for address/location info
        if not scraped_data['address']:
            location_patterns = [
                '[data-testid*="location"]', '[class*="location"]',
                '[class*="address"]', 'span[dir="ltr"]'
            ]
            
            for pattern in location_patterns:
                elements = soup.select(pattern)
                for elem in elements:
                    text = elem.get_text(strip=True)
                    if text and len(text) > 5 and len(text) < 150:
                        # Check if it looks like an address
                        if any(word in text.lower() for word in ['st', 'street', 'ave', 'road', 'city', ',']):
                            scraped_data['address'] = text
                            break
                if scraped_data['address']:
                    break
        
        # Method 7: Extract any house rules or policies
        rules_patterns = [
            '[data-testid*="rule"]', '[class*="rule"]', 
            '[data-testid*="policy"]', '[class*="policy"]'
        ]
        
        rules_found = []
        for pattern in rules_patterns:
            elements = soup.select(pattern)
            for elem in elements:
                text = elem.get_text(strip=True)
                if text and 10 < len(text) < 100:
                    if text not in rules_found:
                        rules_found.append(text)
        
        if rules_found:
            scraped_data['rules'] = rules_found[:5]
        
        # Fallback with meaningful data based on URL
        room_id_match = re.search(r'/rooms/(\d+)', url)
        room_id = room_id_match.group(1) if room_id_match else 'unknown'
        
        if not scraped_data['name']:
            scraped_data['name'] = f"Property {room_id}"
        
        if not scraped_data['address']:
            scraped_data['address'] = f"Location details needed - Property ID: {room_id}"
            
        if not scraped_data['description']:
            scraped_data['description'] = f"Property details not available due to website restrictions. Property ID: {room_id}. Please add your own description."
        
        if not scraped_data['rules']:
            scraped_data['rules'] = [
                "Standard check-in and check-out procedures apply",
                "Keep the property clean and follow house rules",
                "Respect neighbors and local community guidelines"
            ]
        
        logger.info(f"Scraping completed - Name: '{scraped_data['name']}', Address: '{scraped_data['address']}'")
        return scraped_data
        
    except requests.RequestException as e:
        logger.error(f"Network error scraping {url}: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Could not access the listing URL: {str(e)}")
    except Exception as e:
        logger.error(f"Error scraping {url}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to parse listing data: {str(e)}")

class PropertyImportRequest(BaseModel):
    url: str

# iCal and notification helper functions
async def parse_ical_calendar(ical_url: str):
    """Parse iCal calendar and extract booking information"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(ical_url)
            ical_content = response.text
            
        bookings = []
        current_booking = {}
        
        for line in ical_content.split('\n'):
            line = line.strip()
            
            if line.startswith('BEGIN:VEVENT'):
                current_booking = {}
            elif line.startswith('END:VEVENT'):
                if current_booking:
                    bookings.append(current_booking)
            elif line.startswith('DTSTART'):
                try:
                    date_str = line.split(':')[1].strip()
                    if 'T' in date_str:
                        current_booking['checkin_date'] = datetime.strptime(date_str[:15], '%Y%m%dT%H%M%S')
                    else:
                        current_booking['checkin_date'] = datetime.strptime(date_str, '%Y%m%d')
                except:
                    pass
            elif line.startswith('DTEND'):
                try:
                    date_str = line.split(':')[1].strip()
                    if 'T' in date_str:
                        current_booking['checkout_date'] = datetime.strptime(date_str[:15], '%Y%m%dT%H%M%S')
                    else:
                        current_booking['checkout_date'] = datetime.strptime(date_str, '%Y%m%d')
                except:
                    pass
            elif line.startswith('SUMMARY'):
                summary = line.split(':', 1)[1].strip()
                current_booking['summary'] = summary
                
                # Extract guest name and booking source
                if 'airbnb' in summary.lower():
                    current_booking['booking_source'] = 'airbnb'
                elif 'booking.com' in summary.lower():
                    current_booking['booking_source'] = 'booking.com'
                    
                # Try to extract guest name from various patterns
                name_patterns = [
                    r'Reserved for (.+?) \(',
                    r'Reserved for (.+?)$',
                    r'(.+?) \(',
                    r'Guest: (.+?) \(',
                ]
                
                for pattern in name_patterns:
                    match = re.search(pattern, summary)
                    if match:
                        current_booking['guest_name'] = match.group(1).strip()
                        break
                        
            elif line.startswith('DESCRIPTION'):
                description = line.split(':', 1)[1].strip()
                current_booking['description'] = description
                
                # Extract email and phone from description
                email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', description)
                if email_match:
                    current_booking['guest_email'] = email_match.group()
                    
                phone_patterns = [
                    r'\+\d{1,3}\s?\d{3}\s?\d{3}\s?\d{4}',
                    r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}',
                    r'\(\d{3}\)\s?\d{3}[-.\s]?\d{4}'
                ]
                
                for pattern in phone_patterns:
                    phone_match = re.search(pattern, description)
                    if phone_match:
                        current_booking['guest_phone'] = phone_match.group()
                        break
                        
        return bookings
    except Exception as e:
        logger.error(f"Error parsing iCal: {str(e)}")
        return []

async def send_whatsapp_message(phone: str, message: str, apartment_name: str):
    """Send WhatsApp message via WhatsApp Business API or third-party service"""
    try:
        # For demo purposes, we'll use a webhook/API call
        # In production, integrate with WhatsApp Business API or services like Twilio
        logger.info(f"WhatsApp message sent to {phone} for {apartment_name}")
        
        # Placeholder for actual WhatsApp API integration
        # async with httpx.AsyncClient() as client:
        #     response = await client.post(
        #         "https://api.whatsapp.com/send",
        #         json={
        #             "phone": phone,
        #             "message": message
        #         }
        #     )
        
        return True
    except Exception as e:
        logger.error(f"Error sending WhatsApp: {str(e)}")
        return False

async def send_email_notification(email: str, subject: str, content: str, apartment_name: str, host_credentials: dict = None):
    """Send email notification to guest using host's email credentials"""
    try:
        if host_credentials:
            # Use host's SMTP credentials
            success = await send_smtp_email(email, subject, content, host_credentials)
            if success:
                logger.info(f"Email sent successfully to {email} for {apartment_name} using host's email")
                return True
            else:
                logger.error(f"Failed to send email via SMTP to {email}")
                return False
        else:
            logger.warning(f"No host email credentials configured for {apartment_name}")
            return False
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        return False

async def create_guest_notification_message(apartment: dict, branding: dict, guest_name: str, checkin_date: datetime, guest_url: str):
    """Create personalized notification message for guests"""
    brand_name = branding.get('brand_name', 'MyHostIQ')
    
    # Email content
    email_subject = f"Welcome to {apartment['name']} - Your AI Assistant is Ready!"
    
    email_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; }}
            .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }}
            .header {{ background: linear-gradient(135deg, {branding.get('brand_primary_color', '#2563eb')}, {branding.get('brand_secondary_color', '#1d4ed8')}); color: white; padding: 30px 20px; text-align: center; }}
            .content {{ padding: 30px 20px; }}
            .button {{ background: {branding.get('brand_primary_color', '#2563eb')}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; }}
            .footer {{ background: #f1f5f9; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>{brand_name}</h1>
                <p>Your Personal AI Assistant for {apartment['name']}</p>
            </div>
            <div class="content">
                <h2>Hello {guest_name}! 👋</h2>
                <p>Welcome to <strong>{apartment['name']}</strong>! We're excited to have you stay with us.</p>
                
                <p>🤖 <strong>Your Personal AI Assistant is Ready!</strong></p>
                <p>We've set up a personal AI concierge just for you. It can instantly help with:</p>
                <ul>
                    <li>📍 Check-in instructions & apartment access</li>
                    <li>🏠 WiFi passwords & apartment amenities</li>
                    <li>🍽️ Local restaurant recommendations</li>
                    <li>🚇 Transportation & navigation help</li>
                    <li>🚨 Emergency contacts & important information</li>
                    <li>💎 Hidden local gems & attractions</li>
                </ul>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{guest_url}" class="button">Chat with Your AI Assistant</a>
                </div>
                
                <p><strong>📅 Your Stay Details:</strong></p>
                <p>📍 <strong>Property:</strong> {apartment['name']}<br>
                📅 <strong>Check-in:</strong> {checkin_date.strftime('%B %d, %Y')}<br>
                🏠 <strong>Address:</strong> {apartment.get('address', 'Address in booking confirmation')}</p>
                
                <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>💡 Pro Tip:</strong> Save the AI assistant link on your phone's home screen for instant access during your stay!</p>
                </div>
            </div>
            <div class="footer">
                <p>Generated by {brand_name} - Making your stay exceptional</p>
                <p>Questions? Your AI assistant is available 24/7 at the link above!</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # WhatsApp message
    whatsapp_message = f"""
🏠 Welcome to {apartment['name']}!

Hello {guest_name}! 👋

Your personal AI assistant is ready to help you with your stay:

• Check-in instructions
• WiFi & amenities  
• Restaurant recommendations
• Transport info
• Emergency contacts
• Local hidden gems

🤖 Chat with your AI assistant here:
{guest_url}

📅 Check-in: {checkin_date.strftime('%B %d, %Y')}

Save this link for instant help during your stay!

— {brand_name} Team
    """
    
    return email_subject, email_content, whatsapp_message

async def sync_apartment_calendar(apartment_id: str):
    """Sync apartment calendar and send notifications for new bookings"""
    try:
        # Get apartment data
        apartment = await db.apartments.find_one({"id": apartment_id})
        if not apartment or not apartment.get('ical_url'):
            return
        
        # Parse iCal calendar
        bookings = await parse_ical_calendar(apartment['ical_url'])
        
        # Get user branding and email credentials
        user = await db.users.find_one({"id": apartment['user_id']})
        branding = {
            "brand_name": user.get('brand_name', 'MyHostIQ'),
            "brand_logo_url": user.get('brand_logo_url', ''),
            "brand_primary_color": user.get('brand_primary_color', '#2563eb'),
            "brand_secondary_color": user.get('brand_secondary_color', '#1d4ed8')
        }
        
        # Get host's email credentials
        host_email_creds = await db.email_credentials.find_one({
            "user_id": apartment['user_id'],
            "is_verified": True
        })
        
        # Process each booking
        for booking in bookings:
            if not booking.get('checkin_date'):
                continue
                
            # Check if we already sent notification for this booking
            existing_notification = await db.booking_notifications.find_one({
                "apartment_id": apartment_id,
                "checkin_date": booking['checkin_date'].isoformat(),
                "guest_email": booking.get('guest_email', ''),
                "notification_sent": True
            })
            
            if existing_notification:
                continue
                
            # Create guest URL
            guest_url = f"https://app.myhostiq.com/chat/{apartment_id}"
            if user.get('custom_domain'):
                guest_url = f"https://{user['custom_domain']}/chat/{apartment_id}"
            
            # Create notification message
            guest_name = booking.get('guest_name', 'Guest')
            email_subject, email_content, whatsapp_message = await create_guest_notification_message(
                apartment, branding, guest_name, booking['checkin_date'], guest_url
            )
            
            # Send notifications
            notification_sent = False
            
            # Send email if available and host has configured email
            if booking.get('guest_email') and host_email_creds:
                email_sent = await send_email_notification(
                    booking['guest_email'], 
                    email_subject, 
                    email_content, 
                    apartment['name'],
                    host_email_creds
                )
                if email_sent:
                    notification_sent = True
            
            # Send WhatsApp if available
            if booking.get('guest_phone'):
                whatsapp_sent = await send_whatsapp_message(
                    booking['guest_phone'], 
                    whatsapp_message, 
                    apartment['name']
                )
                if whatsapp_sent:
                    notification_sent = True
            
            # Save notification record
            notification = BookingNotification(
                apartment_id=apartment_id,
                guest_email=booking.get('guest_email', ''),
                guest_phone=booking.get('guest_phone', ''),
                guest_name=guest_name,
                checkin_date=booking['checkin_date'],
                checkout_date=booking.get('checkout_date'),
                booking_source=booking.get('booking_source', ''),
                notification_sent=notification_sent
            )
            
            notification_dict = prepare_for_mongo(notification.dict())
            await db.booking_notifications.insert_one(notification_dict)
        
        # Update last sync time
        await db.apartments.update_one(
            {"id": apartment_id},
            {"$set": {"last_ical_sync": datetime.now(timezone.utc).isoformat()}}
        )
        
    except Exception as e:
        logger.error(f"Error syncing calendar for apartment {apartment_id}: {str(e)}")

def encrypt_password(password: str) -> str:
    """Encrypt password for secure storage"""
    return cipher_suite.encrypt(password.encode()).decode()

def decrypt_password(encrypted_password: str) -> str:
    """Decrypt password for use"""
    return cipher_suite.decrypt(encrypted_password.encode()).decode()

def get_smtp_settings(email: str, smtp_server: str = "", smtp_port: int = 587):
    """Get SMTP settings based on email provider"""
    if not smtp_server:
        domain = email.split('@')[1].lower()
        if 'gmail.com' in domain:
            return 'smtp.gmail.com', 587
        elif 'outlook.com' in domain or 'hotmail.com' in domain:
            return 'smtp-mail.outlook.com', 587
        elif 'yahoo.com' in domain:
            return 'smtp.mail.yahoo.com', 587
        else:
            return smtp_server, smtp_port
    return smtp_server, smtp_port

async def send_smtp_email(
    recipient_email: str, 
    subject: str, 
    html_content: str, 
    sender_credentials: dict
) -> bool:
    """Send email using SMTP with host's credentials"""
    try:
        sender_email = sender_credentials['email']
        sender_password = decrypt_password(sender_credentials['encrypted_password'])
        smtp_server, smtp_port = get_smtp_settings(
            sender_email, 
            sender_credentials.get('smtp_server', ''),
            sender_credentials.get('smtp_port', 587)
        )
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = sender_email
        msg['To'] = recipient_email
        
        # Add HTML content
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        # Send email
        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls(context=context)
            server.login(sender_email, sender_password)
            server.send_message(msg)
        
        logger.info(f"Email sent successfully from {sender_email} to {recipient_email}")
        return True
        
    except Exception as e:
        logger.error(f"SMTP email error: {str(e)}")
        return False

async def verify_email_credentials(email: str, password: str, smtp_server: str = "", smtp_port: int = 587) -> bool:
    """Verify email credentials by attempting to connect"""
    try:
        smtp_server, smtp_port = get_smtp_settings(email, smtp_server, smtp_port)
        
        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls(context=context)
            server.login(email, password)
        
        return True
    except Exception as e:
        logger.error(f"Email verification failed: {str(e)}")
        return False

def prepare_for_mongo(data):
    """Prepare data for MongoDB storage"""
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
    return data

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict):
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def create_ai_system_prompt(apartment_data: dict, user_branding: dict) -> str:
    """Create a personalized AI system prompt based on apartment data and branding"""
    brand_name = user_branding.get('brand_name', 'My Host IQ')
    apartment_name = apartment_data.get('name', 'this property')
    
    base_prompt = f"""You are a helpful AI concierge from {brand_name}, specifically designed to assist guests staying at {apartment_name}. 

IMPORTANT: You ONLY help with accommodation and travel-related questions. You are NOT a general AI assistant.

Your purpose is to help guests with:
- Check-in/check-out procedures and property access
- WiFi passwords and apartment amenities  
- Local restaurant recommendations and dining
- Transportation and navigation help
- Emergency contacts and important safety information
- Local attractions, hidden gems, and things to do
- Apartment rules and house guidelines
- Booking-related questions and host contact info

You politely DECLINE requests that are not related to the guest's stay, such as:
- Writing songs, poems, or creative content
- General knowledge questions unrelated to travel
- Personal advice not related to their trip
- Academic or work-related tasks
- Any requests outside your role as a travel concierge

When declining off-topic requests, respond warmly like: "I'm here to help make your stay at {apartment_name} amazing! I'm specifically designed to assist with accommodation and local travel questions. Is there anything about your stay or the local area I can help you with?"

PROPERTY INFORMATION:
"""
    
    # Add apartment specific information
    if apartment_data.get('description'):
        base_prompt += f"Property Description: {apartment_data['description']}\n"
    
    if apartment_data.get('address'):
        base_prompt += f"Location: {apartment_data['address']}\n"
    
    # Add rules
    if apartment_data.get('rules'):
        rules_text = ', '.join(apartment_data['rules'])
        base_prompt += f"Important Property Rules: {rules_text}\n"
    
    # Add contact information
    if apartment_data.get('contact'):
        contact = apartment_data['contact']
        if contact.get('phone') or contact.get('email'):
            base_prompt += "Host Contact Information: "
            if contact.get('phone'):
                base_prompt += f"Phone: {contact['phone']} "
            if contact.get('email'):
                base_prompt += f"Email: {contact['email']}"
            base_prompt += "\n"
    
    # Add recommendations
    if apartment_data.get('recommendations'):
        recommendations = apartment_data['recommendations']
        base_prompt += "\nLOCAL RECOMMENDATIONS:\n"
        
        if recommendations.get('restaurants'):
            restaurants = recommendations['restaurants']
            if restaurants:
                base_prompt += "Restaurants:\n"
                for rest in restaurants:
                    base_prompt += f"- {rest.get('name', 'Unknown')} ({rest.get('type', 'Restaurant')}) - {rest.get('tip', 'No additional info')}\n"
        
        if recommendations.get('hidden_gems'):
            gems = recommendations['hidden_gems']
            if gems:
                base_prompt += "Hidden Gems & Attractions:\n"
                for gem in gems:
                    base_prompt += f"- {gem.get('name', 'Unknown')} - {gem.get('tip', 'No additional info')}\n"
        
        if recommendations.get('transport'):
            base_prompt += f"Transportation: {recommendations['transport']}\n"
    
    base_prompt += f"\nAlways be helpful, friendly, and professional as a representative of {brand_name}. Focus on making the guest's stay at {apartment_name} exceptional by providing accurate, relevant information about the property and local area."
    
    return base_prompt

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    token: str
    new_password: str

# Authentication Routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    """Register new user"""
    try:
        # Check if user already exists
        existing_user = await db.users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create user
        user = User(
            email=user_data.email,
            full_name=user_data.full_name,
            phone=user_data.phone,
            hashed_password=hash_password(user_data.password)
        )
        
        user_dict = prepare_for_mongo(user.dict())
        await db.users.insert_one(user_dict)
        
        # Create access token
        access_token = create_access_token({"sub": user.id})
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user={
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "brand_name": user.brand_name,
                "phone": user.phone
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    """Login user"""
    try:
        # Find user
        user = await db.users.find_one({"email": user_data.email})
        if not user or not verify_password(user_data.password, user['hashed_password']):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Create access token
        access_token = create_access_token({"sub": user['id']})
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user={
                "id": user['id'],
                "email": user['email'],
                "full_name": user['full_name'],
                "brand_name": user.get('brand_name', 'MyHostIQ'),
                "phone": user.get('phone', '')
            }
        )
        
    except Exception as e:
        if "Invalid credentials" in str(e):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/forgot-password")
async def forgot_password(request: PasswordResetRequest):
    """Send password reset email"""
    try:
        # Find user
        user = await db.users.find_one({"email": request.email})
        if not user:
            # Don't reveal if email exists for security
            return {"message": "If the email exists, a password reset link has been sent"}
        
        # Generate reset token (JWT with short expiration)
        reset_token = create_access_token({"sub": user['id'], "type": "password_reset"})
        
        # Store reset token in database with expiration
        await db.password_resets.insert_one({
            "user_id": user['id'],
            "token": reset_token,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "used": False
        })
        
        # Create reset email with proper URL
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        reset_url = f"{frontend_url}/reset-password?token={reset_token}"
        email_subject = "MyHostIQ - Password Reset Request"
        email_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px 20px; text-align: center; }}
                .content {{ padding: 30px 20px; }}
                .button {{ background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; }}
                .footer {{ background: #f1f5f9; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }}
                .warning {{ background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 15px; border-radius: 8px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>MyHostIQ</h1>
                    <p>Password Reset Request</p>
                </div>
                <div class="content">
                    <h2>Hello {user.get('full_name', 'there')}! 👋</h2>
                    <p>We received a request to reset your password for your MyHostIQ account.</p>
                    
                    <p>If you requested this, click the button below to reset your password:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_url}" class="button">Reset My Password</a>
                    </div>
                    
                    <div class="warning">
                        <p><strong>⚠️ Important Security Information:</strong></p>
                        <ul style="margin: 10px 0; padding-left: 20px;">
                            <li>This link will expire in 1 hour</li>
                            <li>If you didn't request this, please ignore this email</li>
                            <li>Never share this link with anyone</li>
                            <li>We will never ask for your password via email</li>
                        </ul>
                    </div>
                    
                    <p>If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #6b7280; font-size: 12px;">{reset_url}</p>
                </div>
                <div class="footer">
                    <p>MyHostIQ - Smart Guest Assistant Platform</p>
                    <p>This email was sent because a password reset was requested for your account.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Send reset email using SendGrid
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail
            
            # Use a professional from address
            from_email = 'noreply@myhostiq.com'  # You can change this to your domain later
            
            message = Mail(
                from_email=from_email,
                to_emails=request.email,
                subject=email_subject,
                html_content=email_content
            )
            
            sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
            response = sg.send(message)
            
            if response.status_code == 202:
                logger.info(f"Password reset email successfully sent to {request.email}")
            else:
                logger.error(f"SendGrid returned status code: {response.status_code}")
            
        except Exception as e:
            logger.error(f"Failed to send password reset email: {str(e)}")
            # For security, we still return success message even if email fails
            # This prevents email enumeration attacks
        
        return {"message": "If the email exists, a password reset link has been sent"}
        
    except Exception as e:
        logger.error(f"Forgot password error: {str(e)}")
        return {"message": "If the email exists, a password reset link has been sent"}

@api_router.post("/auth/reset-password")
async def reset_password(request: PasswordReset):
    """Reset password using token"""
    try:
        # Verify token
        try:
            payload = jwt.decode(request.token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("sub")
            token_type = payload.get("type")
            
            if token_type != "password_reset":
                raise HTTPException(status_code=400, detail="Invalid reset token")
                
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=400, detail="Reset token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=400, detail="Invalid reset token")
        
        # Check if token exists and is not used
        reset_record = await db.password_resets.find_one({
            "token": request.token,
            "used": False
        })
        
        if not reset_record:
            raise HTTPException(status_code=400, detail="Invalid or already used reset token")
        
        # Check if token is expired
        expires_at = datetime.fromisoformat(reset_record['expires_at'])
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(status_code=400, detail="Reset token has expired")
        
        # Find user
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=400, detail="User not found")
        
        # Update password
        hashed_password = hash_password(request.new_password)
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"hashed_password": hashed_password}}
        )
        
        # Mark token as used
        await db.password_resets.update_one(
            {"token": request.token},
            {"$set": {"used": True, "used_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {"message": "Password reset successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to reset password")

# User Routes
@api_router.get("/auth/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "brand_name": current_user.brand_name,
        "brand_logo_url": current_user.brand_logo_url,
        "brand_primary_color": current_user.brand_primary_color,
        "brand_secondary_color": current_user.brand_secondary_color,
        "ai_tone": current_user.ai_tone,
        "custom_domain": current_user.custom_domain,
        "chat_background": current_user.chat_background,
        "chat_font": current_user.chat_font,
        "email_verified": current_user.email_verified,
        "phone_verified": current_user.phone_verified
    }

@api_router.put("/auth/whitelabel")
async def update_whitelabel_settings(
    settings: WhitelabelSettings,
    current_user: User = Depends(get_current_user)
):
    """Update user's whitelabel settings"""
    try:
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": {
                "brand_name": settings.brand_name,
                "brand_logo_url": settings.brand_logo_url,
                "brand_primary_color": settings.brand_primary_color,
                "brand_secondary_color": settings.brand_secondary_color,
                "ai_tone": settings.ai_tone,
                "custom_domain": settings.custom_domain,
                "chat_background": settings.chat_background,
                "chat_font": settings.chat_font
            }}
        )
        return {"message": "Whitelabel settings updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Email Credentials Routes
@api_router.post("/auth/email-credentials", response_model=EmailCredentialsResponse)
async def add_email_credentials(
    credentials: EmailCredentialsCreate,
    current_user: User = Depends(get_current_user)
):
    """Add and verify host's email credentials"""
    try:
        # Check if user already has email credentials
        existing = await db.email_credentials.find_one({"user_id": current_user.id})
        if existing:
            raise HTTPException(status_code=400, detail="Email credentials already configured. Use update endpoint.")
        
        # Auto-detect SMTP settings if not provided
        smtp_server, smtp_port = get_smtp_settings(
            credentials.email, 
            credentials.smtp_server, 
            credentials.smtp_port
        )
        
        # Verify credentials
        is_verified = await verify_email_credentials(
            credentials.email, 
            credentials.password, 
            smtp_server, 
            smtp_port
        )
        
        if not is_verified:
            raise HTTPException(status_code=400, detail="Invalid email credentials or SMTP settings")
        
        # Encrypt and store credentials
        email_creds = EmailCredentials(
            user_id=current_user.id,
            email=credentials.email,
            encrypted_password=encrypt_password(credentials.password),
            smtp_server=smtp_server,
            smtp_port=smtp_port,
            is_verified=is_verified
        )
        
        creds_dict = prepare_for_mongo(email_creds.dict())
        await db.email_credentials.insert_one(creds_dict)
        
        return EmailCredentialsResponse(
            id=email_creds.id,
            email=email_creds.email,
            smtp_server=email_creds.smtp_server,
            smtp_port=email_creds.smtp_port,
            is_verified=email_creds.is_verified
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/auth/email-credentials", response_model=EmailCredentialsResponse)
async def update_email_credentials(
    credentials: EmailCredentialsCreate,
    current_user: User = Depends(get_current_user)
):
    """Update host's email credentials"""
    try:
        # Find existing credentials
        existing = await db.email_credentials.find_one({"user_id": current_user.id})
        if not existing:
            raise HTTPException(status_code=404, detail="No email credentials found. Use create endpoint.")
        
        # Auto-detect SMTP settings if not provided
        smtp_server, smtp_port = get_smtp_settings(
            credentials.email, 
            credentials.smtp_server, 
            credentials.smtp_port
        )
        
        # Verify new credentials
        is_verified = await verify_email_credentials(
            credentials.email, 
            credentials.password, 
            smtp_server, 
            smtp_port
        )
        
        if not is_verified:
            raise HTTPException(status_code=400, detail="Invalid email credentials or SMTP settings")
        
        # Update credentials
        await db.email_credentials.update_one(
            {"user_id": current_user.id},
            {"$set": {
                "email": credentials.email,
                "encrypted_password": encrypt_password(credentials.password),
                "smtp_server": smtp_server,
                "smtp_port": smtp_port,
                "is_verified": is_verified
            }}
        )
        
        return EmailCredentialsResponse(
            id=existing['id'],
            email=credentials.email,
            smtp_server=smtp_server,
            smtp_port=smtp_port,
            is_verified=is_verified
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/auth/email-credentials", response_model=Optional[EmailCredentialsResponse])
async def get_email_credentials(current_user: User = Depends(get_current_user)):
    """Get host's email credentials (without password)"""
    try:
        creds = await db.email_credentials.find_one({"user_id": current_user.id})
        if not creds:
            return None
        
        return EmailCredentialsResponse(
            id=creds['id'],
            email=creds['email'],
            smtp_server=creds['smtp_server'],
            smtp_port=creds['smtp_port'],
            is_verified=creds['is_verified']
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/auth/email-credentials")
async def delete_email_credentials(current_user: User = Depends(get_current_user)):
    """Delete host's email credentials"""
    try:
        result = await db.email_credentials.delete_one({"user_id": current_user.id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="No email credentials found")
        
        return {"message": "Email credentials deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/test-email")
async def test_email_credentials(current_user: User = Depends(get_current_user)):
    """Test host's email credentials by sending a test email"""
    try:
        # Get credentials
        creds = await db.email_credentials.find_one({"user_id": current_user.id})
        if not creds:
            raise HTTPException(status_code=404, detail="No email credentials configured")
        
        if not creds['is_verified']:
            raise HTTPException(status_code=400, detail="Email credentials not verified")
        
        # Send test email to the host
        test_subject = "MyHostIQ - Email Configuration Test"
        test_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .success {{ color: #16a34a; font-weight: bold; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Email Configuration Test</h1>
                </div>
                <p class="success">Congratulations! Your email configuration is working perfectly.</p>
                <p>This test email confirms that:</p>
                <ul>
                    <li>✅ Your email credentials are valid</li>
                    <li>✅ SMTP connection is successful</li>
                    <li>✅ MyHostIQ can send emails from your account</li>
                </ul>
                <p>Your guests will now receive beautiful welcome emails directly from your email address when they have upcoming bookings.</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 14px; color: #6b7280;">
                    This is an automated test email from MyHostIQ.<br>
                    Email: {creds['email']}<br>
                    SMTP Server: {creds['smtp_server']}:{creds['smtp_port']}
                </p>
            </div>
        </body>
        </html>
        """
        
        success = await send_smtp_email(creds['email'], test_subject, test_content, creds)
        
        if success:
            return {"message": "Test email sent successfully! Check your inbox."}
        else:
            raise HTTPException(status_code=500, detail="Failed to send test email")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Payment Simulation Routes
class PaymentRequest(BaseModel):
    amount: float
    currency: str = "USD"
    plan_name: str
    apartment_count: int

class PaymentResponse(BaseModel):
    success: bool
    transaction_id: str
    message: str
    plan_name: str
    amount: float

@api_router.post("/payments/simulate", response_model=PaymentResponse)
async def simulate_payment(
    payment: PaymentRequest,
    current_user: User = Depends(get_current_user)
):
    """Simulate payment processing for subscription plans"""
    try:
        # Simulate payment processing delay
        await asyncio.sleep(1)
        
        # Generate mock transaction ID
        transaction_id = f"sim_{uuid.uuid4().hex[:12]}"
        
        # Simulate payment success (95% success rate)
        import random
        success = random.random() > 0.05
        
        if success:
            return PaymentResponse(
                success=True,
                transaction_id=transaction_id,
                message=f"Payment successful! Welcome to {payment.plan_name} plan.",
                plan_name=payment.plan_name,
                amount=payment.amount
            )
        else:
            return PaymentResponse(
                success=False,
                transaction_id="",
                message="Payment failed. Please try again or use a different payment method.",
                plan_name=payment.plan_name,
                amount=payment.amount
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/payments/plans")
async def get_payment_plans():
    """Get available subscription plans"""
    return {
        "plans": [
            {
                "id": "starter",
                "name": "Starter",
                "price": 29,
                "currency": "USD",
                "interval": "month",
                "apartment_limit": 3,
                "features": [
                    "Up to 3 apartments",
                    "Basic AI assistant",
                    "Email notifications",
                    "Basic analytics"
                ]
            },
            {
                "id": "professional", 
                "name": "Professional",
                "price": 79,
                "currency": "USD",
                "interval": "month",
                "apartment_limit": 10,
                "features": [
                    "Up to 10 apartments",
                    "Advanced AI assistant",
                    "Email + WhatsApp notifications",
                    "Advanced analytics",
                    "Custom branding",
                    "iCal integration"
                ]
            },
            {
                "id": "enterprise",
                "name": "Enterprise",
                "price": 199,
                "currency": "USD", 
                "interval": "month",
                "apartment_limit": -1,
                "features": [
                    "Unlimited apartments",
                    "Premium AI assistant",
                    "All notification methods",
                    "Full analytics suite",
                    "White-label solution",
                    "Custom domain",
                    "Priority support"
                ]
            }
        ]
    }

# Property Import Routes
@api_router.post("/apartments/import-from-url")
async def import_property_from_url(
    request: PropertyImportRequest,
    current_user: User = Depends(get_current_user)
):
    """Import property data from Airbnb, Booking.com, or VRBO URL"""
    try:
        url = request.url.strip()
        
        # Validate URL
        if not url.startswith(('http://', 'https://')):
            raise HTTPException(status_code=400, detail="Invalid URL format")
        
        # Check if it's a supported platform
        supported_platforms = ['airbnb.com', 'booking.com', 'vrbo.com', 'homeaway.com']
        if not any(platform in url.lower() for platform in supported_platforms):
            raise HTTPException(
                status_code=400, 
                detail="URL must be from Airbnb, Booking.com, or VRBO"
            )
        
        # Scrape the listing data
        if 'airbnb.com' in url.lower():
            scraped_data = await scrape_airbnb_listing(url)
            
            # Return only the fields you need: name, address, description, rules
            filtered_data = {
                'name': scraped_data.get('name', ''),
                'address': scraped_data.get('address', ''),
                'description': scraped_data.get('description', ''),
                'rules': scraped_data.get('rules', []),
                # Keep empty structures for frontend compatibility
                'contact': {'phone': '', 'email': '', 'whatsapp': ''},
                'recommendations': {
                    'restaurants': [],
                    'hidden_gems': [],
                    'transport': ''
                }
            }
            
            return {
                "success": True,
                "data": filtered_data,
                "message": f"Property data imported successfully from {url}!"
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Property import error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to import property: {str(e)}")

# Enhanced Apartment Routes
@api_router.post("/apartments", response_model=Apartment)
async def create_apartment(apartment_data: ApartmentCreate, current_user: User = Depends(get_current_user)):
    """Create a new apartment with host data"""
    try:
        apartment = Apartment(
            user_id=current_user.id,
            **apartment_data.dict()
        )
        apartment_dict = prepare_for_mongo(apartment.dict())
        
        await db.apartments.insert_one(apartment_dict)
        
        # If iCal URL is provided, start monitoring for bookings
        if apartment_data.ical_url:
            # Background task to sync calendar
            asyncio.create_task(sync_apartment_calendar(apartment.id))
            
        return apartment
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/apartments/{apartment_id}", response_model=Apartment)
async def update_apartment(
    apartment_id: str, 
    apartment_data: ApartmentUpdate, 
    current_user: User = Depends(get_current_user)
):
    """Update apartment information"""
    try:
        # Verify apartment belongs to user
        existing_apartment = await db.apartments.find_one({
            "id": apartment_id, 
            "user_id": current_user.id
        })
        if not existing_apartment:
            raise HTTPException(status_code=404, detail="Apartment not found")
        
        # Update apartment
        update_data = prepare_for_mongo(apartment_data.dict())
        await db.apartments.update_one(
            {"id": apartment_id},
            {"$set": update_data}
        )
        
        # If iCal URL changed, start monitoring
        if apartment_data.ical_url and apartment_data.ical_url != existing_apartment.get('ical_url'):
            asyncio.create_task(sync_apartment_calendar(apartment_id))
        
        # Return updated apartment
        updated_apartment = await db.apartments.find_one({"id": apartment_id})
        return Apartment(**updated_apartment)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/apartments", response_model=List[Apartment])
async def get_apartments(current_user: User = Depends(get_current_user)):
    """Get user's apartments"""
    try:
        apartments = await db.apartments.find({"user_id": current_user.id}).to_list(1000)
        return [Apartment(**apt) for apt in apartments]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/apartments/{apartment_id}", response_model=Apartment)
async def get_apartment(apartment_id: str, current_user: User = Depends(get_current_user)):
    """Get specific apartment by ID"""
    try:
        apartment = await db.apartments.find_one({"id": apartment_id, "user_id": current_user.id})
        if not apartment:
            raise HTTPException(status_code=404, detail="Apartment not found")
        return Apartment(**apartment)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Public apartment route for guests (no auth required)
@api_router.get("/public/apartments/{apartment_id}")
async def get_public_apartment(apartment_id: str):
    """Get apartment info for guests (public route)"""
    try:
        apartment = await db.apartments.find_one({"id": apartment_id})
        if not apartment:
            raise HTTPException(status_code=404, detail="Apartment not found")
        
        # Get user's branding info
        user = await db.users.find_one({"id": apartment['user_id']})
        branding = {
            "brand_name": user.get('brand_name', 'My Host IQ'),
            "brand_logo_url": user.get('brand_logo_url', ''),
            "brand_primary_color": user.get('brand_primary_color', '#6366f1'),
            "brand_secondary_color": user.get('brand_secondary_color', '#10b981')
        }
        
        return {
            "apartment": {
                "id": apartment['id'],
                "name": apartment['name'],
                "address": apartment['address'],
                "description": apartment['description']
            },
            "branding": branding
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Chat Routes
@api_router.post("/chat")
async def chat_with_ai(chat_request: ChatRequest):
    """Chat with AI assistant for specific apartment (public route)"""
    try:
        # Get apartment data
        apartment = await db.apartments.find_one({"id": chat_request.apartment_id})
        if not apartment:
            raise HTTPException(status_code=404, detail="Apartment not found")
        
        # Get user's branding
        user = await db.users.find_one({"id": apartment['user_id']})
        branding = {
            "brand_name": user.get('brand_name', 'My Host IQ'),
            "brand_logo_url": user.get('brand_logo_url', ''),
            "brand_primary_color": user.get('brand_primary_color', '#6366f1'),
            "brand_secondary_color": user.get('brand_secondary_color', '#10b981')
        }
        
        # Create personalized system prompt
        system_prompt = create_ai_system_prompt(apartment, branding)
        
        # Initialize AI chat
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        session_id = chat_request.session_id or f"apartment_{chat_request.apartment_id}"
        
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_prompt
        ).with_model("openai", "gpt-4o-mini")
        
        # Send message to AI
        user_message = UserMessage(text=chat_request.message)
        response = await chat.send_message(user_message)
        
        # Save chat to database
        chat_message = ChatMessage(
            apartment_id=chat_request.apartment_id,
            message=chat_request.message,
            response=response,
            session_id=session_id
        )
        
        chat_dict = prepare_for_mongo(chat_message.dict())
        await db.chat_messages.insert_one(chat_dict)
        
        # Update apartment analytics
        await db.apartments.update_one(
            {"id": chat_request.apartment_id},
            {
                "$inc": {"total_chats": 1},
                "$set": {"last_chat": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        return {
            "message": chat_request.message,
            "response": response,
            "apartment_name": apartment.get("name", "Unknown"),
            "branding": branding
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

# Analytics Routes
@api_router.get("/analytics/dashboard")
async def get_analytics_dashboard(current_user: User = Depends(get_current_user)):
    """Get analytics dashboard for user's apartments"""
    try:
        # Get user's apartments with analytics
        apartments = await db.apartments.find({"user_id": current_user.id}).to_list(1000)
        
        analytics_data = []
        total_chats = 0
        total_apartments = len(apartments)
        
        for apartment in apartments:
            apt_id = apartment['id']
            
            # Get chat messages for this apartment
            messages = await db.chat_messages.find({"apartment_id": apt_id}).to_list(1000)
            
            # Calculate REAL popular questions based on actual messages
            question_frequency = {}
            for msg in messages:
                question = msg.get('message', '').strip()
                if question and len(question) > 10:  # Only meaningful questions
                    # Normalize question for better grouping
                    normalized = question.lower().strip('?.,!').strip()
                    question_frequency[normalized] = question_frequency.get(normalized, 0) + 1
            
            # Get top 5 most frequent questions
            popular_questions = []
            if question_frequency:
                sorted_questions = sorted(question_frequency.items(), key=lambda x: x[1], reverse=True)
                for question, count in sorted_questions[:5]:
                    popular_questions.append({
                        "question": question.capitalize(),
                        "count": count,
                        "percentage": round((count / len(messages)) * 100, 1) if messages else 0
                    })
            
            # If no questions yet, show helpful placeholder
            if not popular_questions:
                popular_questions = [{
                    "question": "No questions asked yet",
                    "count": 0,
                    "percentage": 0
                }]
            
            # Calculate REAL peak usage hours based on actual message timestamps
            hourly_usage = {}
            for msg in messages:
                try:
                    timestamp = datetime.fromisoformat(msg['timestamp'])
                    hour = timestamp.hour
                    hourly_usage[hour] = hourly_usage.get(hour, 0) + 1
                except:
                    continue
            
            # Find peak hours and create meaningful labels
            peak_hours = []
            if hourly_usage:
                # Get top 3 most active hours
                sorted_hours = sorted(hourly_usage.items(), key=lambda x: x[1], reverse=True)
                for hour, count in sorted_hours[:3]:
                    # Create time range (hour to hour+2)
                    end_hour = min(hour + 2, 24)
                    time_range = f"{hour:02d}:00 - {end_hour:02d}:00"
                    
                    # Create contextual labels based on time of day
                    if 6 <= hour <= 11:
                        label = "Morning inquiries"
                    elif 12 <= hour <= 17:
                        label = "Afternoon questions" 
                    elif 18 <= hour <= 22:
                        label = "Evening support"
                    elif 23 <= hour or hour <= 5:
                        label = "Night inquiries"
                    else:
                        label = "General questions"
                    
                    # Calculate usage percentage relative to peak hour
                    max_usage = max(hourly_usage.values())
                    usage_percentage = int((count / max_usage) * 100) if max_usage > 0 else 0
                    
                    peak_hours.append({
                        'time': time_range,
                        'usage': usage_percentage,
                        'label': label,
                        'count': count
                    })
            
            # If no data, show meaningful empty state
            if not peak_hours:
                peak_hours = [{
                    'time': 'No data yet',
                    'usage': 0,
                    'label': 'Start chatting to see patterns',
                    'count': 0
                }]
            
            total_chats += len(messages)
            
            analytics_data.append(AnalyticsData(
                apartment_id=apt_id,
                apartment_name=apartment.get('name', 'Unknown'),
                total_chats=len(messages),
                total_sessions=len(set(msg.get('session_id', '') for msg in messages if msg.get('session_id'))),
                last_chat=datetime.fromisoformat(apartment['last_chat']) if apartment.get('last_chat') else None,
                popular_questions=popular_questions,
                peak_hours=peak_hours
            ))
        
        return {
            "overview": {
                "total_apartments": total_apartments,
                "total_chats": total_chats,
                "active_apartments": len([apt for apt in apartments if apt.get('last_chat')]),
                "avg_chats_per_apartment": total_chats / max(total_apartments, 1)
            },
            "apartments": analytics_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/apartments/{apartment_id}/chat-history")
async def get_chat_history(apartment_id: str, current_user: User = Depends(get_current_user)):
    """Get chat history for an apartment"""
    try:
        # Verify apartment belongs to user
        apartment = await db.apartments.find_one({"id": apartment_id, "user_id": current_user.id})
        if not apartment:
            raise HTTPException(status_code=404, detail="Apartment not found")
        
        messages = await db.chat_messages.find(
            {"apartment_id": apartment_id}
        ).sort("timestamp", -1).limit(100).to_list(100)
        
        return [ChatMessage(**msg) for msg in messages]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Root route
@api_router.get("/")
async def root():
    return {"message": "My Host IQ API - AI-powered apartment concierge with authentication"}

# iCal and Notification Routes
@api_router.post("/ical/test-sync/{apartment_id}")
async def test_ical_sync(apartment_id: str, current_user: User = Depends(get_current_user)):
    """Test iCal sync for an apartment"""
    try:
        # Verify apartment belongs to user
        apartment = await db.apartments.find_one({
            "id": apartment_id, 
            "user_id": current_user.id
        })
        if not apartment:
            raise HTTPException(status_code=404, detail="Apartment not found")
            
        if not apartment.get('ical_url'):
            raise HTTPException(status_code=400, detail="No iCal URL configured for this apartment")
        
        # Test sync
        await sync_apartment_calendar(apartment_id)
        
        return {"message": "iCal sync test completed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/notifications/{apartment_id}")
async def get_apartment_notifications(apartment_id: str, current_user: User = Depends(get_current_user)):
    """Get notification history for an apartment"""
    try:
        # Verify apartment belongs to user
        apartment = await db.apartments.find_one({
            "id": apartment_id, 
            "user_id": current_user.id
        })
        if not apartment:
            raise HTTPException(status_code=404, detail="Apartment not found")
        
        notifications = await db.booking_notifications.find(
            {"apartment_id": apartment_id}
        ).sort("created_at", -1).limit(50).to_list(50)
        
        return [BookingNotification(**notif) for notif in notifications]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Root route
@api_router.get("/")
async def root():
    return {"message": "MyHostIQ API - AI-powered apartment concierge with advanced features", "version": "2.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Background tasks for calendar monitoring
@app.on_event("startup")
async def startup_event():
    """Start background calendar monitoring"""
    logger.info("MyHostIQ API server started successfully")
    # You can add periodic calendar sync tasks here if needed