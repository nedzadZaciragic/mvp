from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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
from datetime import datetime, timezone, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage

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
    hashed_password: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # Whitelabeling settings
    brand_name: str = "My Host IQ"
    brand_logo_url: str = ""
    brand_primary_color: str = "#6366f1"
    brand_secondary_color: str = "#10b981"

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str

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
    brand_primary_color: str = "#6366f1"
    brand_secondary_color: str = "#10b981"

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
    recommendations: Dict[str, Any] = {}

class AnalyticsData(BaseModel):
    apartment_id: str
    apartment_name: str
    total_chats: int
    total_sessions: int
    last_chat: Optional[datetime]
    popular_questions: List[dict]
    daily_chats: List[dict]

# Helper functions
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
                "brand_name": user.brand_name
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
                "brand_name": user.get('brand_name', 'My Host IQ')
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
        "brand_name": current_user.brand_name,
        "brand_logo_url": current_user.brand_logo_url,
        "brand_primary_color": current_user.brand_primary_color,
        "brand_secondary_color": current_user.brand_secondary_color
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
                "brand_secondary_color": settings.brand_secondary_color
            }}
        )
        return {"message": "Whitelabel settings updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Apartment Routes
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
        return apartment
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