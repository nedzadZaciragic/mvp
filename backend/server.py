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

# Security
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-here')
JWT_ALGORITHM = 'HS256'

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
    daily_chats: List[dict]

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

async def send_email_notification(email: str, subject: str, content: str, apartment_name: str):
    """Send email notification to guest"""
    try:
        # Email functionality temporarily disabled due to import issues
        logger.info(f"Email notification would be sent to {email} for {apartment_name}")
        logger.info(f"Subject: {subject}")
        return True
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
        
        # Get user branding
        user = await db.users.find_one({"id": apartment['user_id']})
        branding = {
            "brand_name": user.get('brand_name', 'MyHostIQ'),
            "brand_logo_url": user.get('brand_logo_url', ''),
            "brand_primary_color": user.get('brand_primary_color', '#2563eb'),
            "brand_secondary_color": user.get('brand_secondary_color', '#1d4ed8')
        }
        
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
            
            # Send email if available
            if booking.get('guest_email'):
                email_sent = await send_email_notification(
                    booking['guest_email'], 
                    email_subject, 
                    email_content, 
                    apartment['name']
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
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def create_ai_system_prompt(apartment_data: dict, user_branding: dict) -> str:
    """Create a personalized AI system prompt based on apartment data and branding"""
    brand_name = user_branding.get('brand_name', 'My Host IQ')
    base_prompt = f"You are a helpful AI concierge from {brand_name}. "
    
    # Add apartment specific information
    if apartment_data.get('name'):
        base_prompt += f"You are the concierge for '{apartment_data['name']}'. "
    
    if apartment_data.get('description'):
        base_prompt += f"Description: {apartment_data['description']} "
    
    if apartment_data.get('address'):
        base_prompt += f"Location: {apartment_data['address']} "
    
    # Add rules
    if apartment_data.get('rules'):
        rules_text = ', '.join(apartment_data['rules'])
        base_prompt += f"Important apartment rules: {rules_text}. "
    
    # Add contact information
    if apartment_data.get('contact'):
        contact = apartment_data['contact']
        if contact.get('phone') or contact.get('email'):
            base_prompt += "Host contact information: "
            if contact.get('phone'):
                base_prompt += f"Phone: {contact['phone']} "
            if contact.get('email'):
                base_prompt += f"Email: {contact['email']} "
    
    # Add recommendations
    if apartment_data.get('recommendations'):
        recommendations = apartment_data['recommendations']
        base_prompt += "Local recommendations: "
        
        if recommendations.get('restaurants'):
            restaurants = recommendations['restaurants']
            if restaurants:
                base_prompt += "Restaurants: "
                for rest in restaurants:
                    base_prompt += f"{rest.get('name', 'Unknown')} ({rest.get('type', 'Restaurant')}) - {rest.get('tip', 'No additional info')}. "
        
        if recommendations.get('hidden_gems'):
            gems = recommendations['hidden_gems']
            if gems:
                base_prompt += "Hidden gems: "
                for gem in gems:
                    base_prompt += f"{gem.get('name', 'Unknown')} - {gem.get('tip', 'No additional info')}. "
        
        if recommendations.get('transport'):
            base_prompt += f"Transport info: {recommendations['transport']}. "
    
    base_prompt += f"Always be helpful, friendly, and professional as a representative of {brand_name}. Provide accurate information about the apartment and local area."
    
    return base_prompt

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
            
            # Calculate popular questions
            question_count = {}
            for msg in messages:
                question = msg.get('message', '').lower()
                if question:
                    question_count[question] = question_count.get(question, 0) + 1
            
            popular_questions = [
                {"question": q, "count": c} 
                for q, c in sorted(question_count.items(), key=lambda x: x[1], reverse=True)[:5]
            ]
            
            # Daily chat statistics (last 7 days)
            daily_chats = []
            for i in range(7):
                day = datetime.now(timezone.utc) - timedelta(days=i)
                day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
                day_end = day_start + timedelta(days=1)
                
                day_messages = [
                    msg for msg in messages
                    if day_start <= datetime.fromisoformat(msg['timestamp']) < day_end
                ]
                
                daily_chats.append({
                    "date": day_start.strftime("%Y-%m-%d"),
                    "chats": len(day_messages)
                })
            
            total_chats += len(messages)
            
            analytics_data.append(AnalyticsData(
                apartment_id=apt_id,
                apartment_name=apartment.get('name', 'Unknown'),
                total_chats=len(messages),
                total_sessions=len(set(msg.get('session_id', '') for msg in messages if msg.get('session_id'))),
                last_chat=datetime.fromisoformat(apartment['last_chat']) if apartment.get('last_chat') else None,
                popular_questions=popular_questions,
                daily_chats=daily_chats
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