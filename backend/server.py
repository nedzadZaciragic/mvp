from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
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

# Models
class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    apartment_id: str
    message: str
    response: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatRequest(BaseModel):
    apartment_id: str
    message: str

class Apartment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    address: str
    description: str
    rules: List[str] = []
    contact: Dict[str, str] = {}
    recommendations: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ApartmentCreate(BaseModel):
    name: str
    address: str
    description: str
    rules: List[str] = []
    contact: Dict[str, str] = {}
    recommendations: Dict[str, Any] = {}

# Helper functions
def prepare_for_mongo(data):
    """Prepare data for MongoDB storage"""
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
    return data

def create_ai_system_prompt(apartment_data: dict) -> str:
    """Create a personalized AI system prompt based on apartment data"""
    base_prompt = "You are a helpful AI concierge for this apartment. "
    
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
    
    base_prompt += "Always be helpful, friendly, and provide accurate information about the apartment and local area. If you don't have specific information, provide general helpful advice."
    
    return base_prompt

# Routes
@api_router.get("/")
async def root():
    return {"message": "My Host IQ API - AI-powered apartment concierge"}

@api_router.post("/apartments", response_model=Apartment)
async def create_apartment(apartment_data: ApartmentCreate):
    """Create a new apartment with host data"""
    try:
        apartment = Apartment(**apartment_data.dict())
        apartment_dict = prepare_for_mongo(apartment.dict())
        
        await db.apartments.insert_one(apartment_dict)
        return apartment
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/apartments", response_model=List[Apartment])
async def get_apartments():
    """Get all apartments"""
    try:
        apartments = await db.apartments.find().to_list(1000)
        return [Apartment(**apt) for apt in apartments]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/apartments/{apartment_id}", response_model=Apartment)
async def get_apartment(apartment_id: str):
    """Get specific apartment by ID"""
    try:
        apartment = await db.apartments.find_one({"id": apartment_id})
        if not apartment:
            raise HTTPException(status_code=404, detail="Apartment not found")
        return Apartment(**apartment)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/chat")
async def chat_with_ai(chat_request: ChatRequest):
    """Chat with AI assistant for specific apartment"""
    try:
        # Get apartment data
        apartment = await db.apartments.find_one({"id": chat_request.apartment_id})
        if not apartment:
            raise HTTPException(status_code=404, detail="Apartment not found")
        
        # Create personalized system prompt
        system_prompt = create_ai_system_prompt(apartment)
        
        # Initialize AI chat
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        session_id = f"apartment_{chat_request.apartment_id}"
        
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
            response=response
        )
        
        chat_dict = prepare_for_mongo(chat_message.dict())
        await db.chat_messages.insert_one(chat_dict)
        
        return {
            "message": chat_request.message,
            "response": response,
            "apartment_name": apartment.get("name", "Unknown")
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

@api_router.get("/apartments/{apartment_id}/chat-history")
async def get_chat_history(apartment_id: str):
    """Get chat history for an apartment"""
    try:
        messages = await db.chat_messages.find(
            {"apartment_id": apartment_id}
        ).sort("timestamp", -1).limit(50).to_list(50)
        
        return [ChatMessage(**msg) for msg in messages]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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