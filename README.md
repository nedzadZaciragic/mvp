# MyHostIQ

AI-powered virtual concierge for short-term rental hosts. MyHostIQ lets property owners create intelligent chatbots for their apartments that answer guest questions about check-in instructions, WiFi, house rules, local recommendations, and nearby places — all in the guest's language.

Hosts share a simple link (or QR code) with guests through Airbnb/Booking.com automated messages. Guests click the link and chat directly with an AI assistant that knows everything about the property and its surroundings.

---

## Features

- AI chatbot per apartment powered by GPT-4o-mini
- Smart proximity search via Mapbox (host recommendations prioritized over API results)
- Multilingual support (Bosnian, English, German, French, Spanish, Italian)
- Property import from Airbnb and Booking.com URLs
- Local recommendations with address autocomplete and walking distances
- QR code PDF generation for easy guest access
- White-label branding (custom name, colors, assistant name)
- Admin dashboard for platform management
- Analytics with AI-powered insights
- Email integration via SendGrid

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Tailwind CSS, Shadcn/UI |
| Backend | FastAPI (Python), Motor (async MongoDB) |
| Database | MongoDB |
| AI | OpenAI GPT-4o-mini via Emergent Integrations |
| Maps | Mapbox Geocoding & Search API |
| Email | SendGrid |

---

## Prerequisites

- Node.js v18+ and Yarn
- Python 3.10+
- MongoDB (local install or free MongoDB Atlas cluster)

---

## Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/myhost-iq.git
cd myhost-iq
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
```

Create `backend/.env`:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=myhostiq
JWT_SECRET=change-this-to-a-strong-random-string
ENCRYPTION_KEY=change-this-32-character-string!!
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=*
OPENAI_LLM_KEY=your-openai-key
MAPBOX_API_KEY=your-mapbox-key
SENDGRID_API_KEY=your-sendgrid-key
```

> If using MongoDB Atlas, replace `MONGO_URL` with your Atlas connection string.

Start the backend:

```bash
uvicorn server:app --reload --port 8001
```

### 3. Frontend

```bash
cd frontend
yarn install
```

Create `frontend/.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

Start the frontend:

```bash
yarn start
```

App opens at `http://localhost:3000`.

---

## Where to Get API Keys

| Key | Source |
|---|---|
| `OPENAI_LLM_KEY` | [platform.openai.com](https://platform.openai.com/api-keys) → Settings → API Keys |
| `MAPBOX_API_KEY` | [account.mapbox.com](https://account.mapbox.com) → Access Tokens |
| `SENDGRID_API_KEY` | [app.sendgrid.com](https://app.sendgrid.com) → Settings → API Keys |
