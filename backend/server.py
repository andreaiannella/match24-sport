from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, Query
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.middleware.gzip import GZipMiddleware
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import hashlib
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import httpx
import socketio
import stripe
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from functools import lru_cache
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection with connection pooling
mongo_url = os.environ['MONGO_URL']
# Configure connection pool for optimal performance
client = AsyncIOMotorClient(
    mongo_url,
    maxPoolSize=50,           # Maximum connections in pool
    minPoolSize=10,           # Minimum connections maintained
    maxIdleTimeMS=30000,      # Close idle connections after 30 seconds
    serverSelectionTimeoutMS=5000,  # Fail fast if can't connect
    connectTimeoutMS=5000,    # Connection timeout
    socketTimeoutMS=30000,    # Socket timeout for operations
)
db = client[os.environ['DB_NAME']]

# JWT Configuration
_JWT_DEFAULT = 'match_sport_24_secret_key'
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', _JWT_DEFAULT)
if JWT_SECRET_KEY == _JWT_DEFAULT:
    import sys
    print(
        "WARNING: JWT_SECRET_KEY is not set - using the insecure built-in default. "
        "Set a real random secret in your environment before going to production, "
        "or existing user sessions/tokens can be forged.",
        file=sys.stderr
    )
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Stripe Configuration
# Uses the official `stripe` package directly (not the Emergent-only `emergentintegrations`
# wrapper) so this backend can run on any host, not just Emergent's environment.
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
stripe.api_key = STRIPE_API_KEY

# Gmail SMTP Configuration
SMTP_EMAIL = os.environ.get('SMTP_EMAIL', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
APP_NAME = os.environ.get('APP_NAME', 'Match Sport 24')

# Create the main app
app = FastAPI(title="Match Sport 24 API")

# Add GZIP compression middleware - compresses responses > 500 bytes
app.add_middleware(GZipMiddleware, minimum_size=500)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Socket.IO setup for real-time chat
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio, app)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ======================= IN-MEMORY CACHE =======================

class SimpleCache:
    """Simple in-memory cache with TTL support"""
    def __init__(self):
        self._cache: Dict[str, Any] = {}
        self._expiry: Dict[str, datetime] = {}
    
    def get(self, key: str) -> Optional[Any]:
        if key in self._cache:
            if key in self._expiry and datetime.now(timezone.utc) > self._expiry[key]:
                # Expired
                del self._cache[key]
                del self._expiry[key]
                return None
            return self._cache[key]
        return None
    
    def set(self, key: str, value: Any, ttl_seconds: int = 300):
        """Set a cache value with TTL (default 5 minutes)"""
        self._cache[key] = value
        self._expiry[key] = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)
    
    def delete(self, key: str):
        if key in self._cache:
            del self._cache[key]
        if key in self._expiry:
            del self._expiry[key]
    
    def clear(self):
        self._cache.clear()
        self._expiry.clear()
    
    def invalidate_pattern(self, pattern: str):
        """Delete all keys matching a pattern (simple string contains)"""
        keys_to_delete = [k for k in self._cache.keys() if pattern in k]
        for key in keys_to_delete:
            self.delete(key)

# Global cache instance
cache = SimpleCache()

# ======================= EMAIL FUNCTIONS =======================

def send_password_reset_email(to_email: str, reset_token: str, user_name: str = "Utente") -> bool:
    """Send password reset email via Gmail SMTP"""
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured, skipping email send")
        return False
    
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"🔐 {APP_NAME} - Recupera la tua Password"
        msg['From'] = f"{APP_NAME} <{SMTP_EMAIL}>"
        msg['To'] = to_email
        
        # Plain text version
        text_content = f"""
Ciao {user_name},

Hai richiesto di reimpostare la password del tuo account {APP_NAME}.

Il tuo codice di recupero è: {reset_token}

Apri l'app {APP_NAME} e inserisci questo codice nella schermata "Recupera Password".

Se non hai richiesto tu questa operazione, puoi ignorare questa email.

Il link scade tra 1 ora.

Buone partite!
Il Team di {APP_NAME}
        """
        
        # HTML version
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0d1117; color: #ffffff; padding: 20px; }}
        .container {{ max-width: 500px; margin: 0 auto; background: linear-gradient(135deg, #1a1f2e 0%, #0d1117 100%); border-radius: 16px; padding: 32px; }}
        .logo {{ text-align: center; margin-bottom: 24px; }}
        .logo-text {{ font-size: 28px; font-weight: bold; color: #00d68f; }}
        h1 {{ color: #ffffff; font-size: 24px; margin-bottom: 16px; text-align: center; }}
        p {{ color: #a0aec0; line-height: 1.6; margin-bottom: 16px; }}
        .token-box {{ background: rgba(0, 214, 143, 0.1); border: 2px solid #00d68f; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }}
        .token {{ font-family: monospace; font-size: 18px; color: #00d68f; letter-spacing: 2px; word-break: break-all; }}
        .footer {{ text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #2d3748; color: #718096; font-size: 12px; }}
        .warning {{ color: #f6ad55; font-size: 13px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <span class="logo-text">⚽ {APP_NAME}</span>
        </div>
        <h1>Recupera la tua Password</h1>
        <p>Ciao <strong>{user_name}</strong>,</p>
        <p>Hai richiesto di reimpostare la password del tuo account.</p>
        <p>Ecco il tuo codice di recupero:</p>
        <div class="token-box">
            <div class="token">{reset_token}</div>
        </div>
        <p>Apri l'app <strong>{APP_NAME}</strong> e inserisci questo codice nella schermata "Recupera Password".</p>
        <p class="warning">⚠️ Questo codice scade tra <strong>1 ora</strong>.</p>
        <p>Se non hai richiesto tu questa operazione, puoi ignorare questa email in tutta sicurezza.</p>
        <div class="footer">
            <p>Buone partite! 🎾⚽🏸</p>
            <p>Il Team di {APP_NAME}</p>
        </div>
    </div>
</body>
</html>
        """
        
        # Attach both versions
        part1 = MIMEText(text_content, 'plain', 'utf-8')
        part2 = MIMEText(html_content, 'html', 'utf-8')
        msg.attach(part1)
        msg.attach(part2)
        
        # Send email
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        
        logger.info(f"Password reset email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send password reset email to {to_email}: {str(e)}")
        return False

# ======================= PUSH NOTIFICATIONS =======================

async def send_push_notification(expo_token: str, title: str, body: str, data: dict = None):
    """Send push notification via Expo Push Service"""
    if not expo_token or not expo_token.startswith('ExponentPushToken'):
        return False
    
    try:
        message = {
            "to": expo_token,
            "sound": "default",
            "title": title,
            "body": body,
            "data": data or {}
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://exp.host/--/api/v2/push/send",
                json=message,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                logger.info(f"Push notification sent to {expo_token[:30]}...")
                return True
            else:
                logger.warning(f"Push notification failed: {response.text}")
                return False
                
    except Exception as e:
        logger.error(f"Error sending push notification: {e}")
        return False

async def create_notification(
    user_id: str,
    title: str,
    message: str,
    notification_type: str,
    match_id: str = None,
    sender_id: str = None,
    data: dict = None
) -> dict:
    """Create notification in database and send push notification"""
    
    notification = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": notification_type,
        "match_id": match_id,
        "sender_id": sender_id,
        "data": data or {},
        "is_read": False,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.notifications.insert_one(notification)
    logger.info(f"Notification created: {notification_type} for user {user_id}")
    
    # Try to send push notification
    user = await db.users.find_one({"user_id": user_id})
    if user and user.get("expo_push_token"):
        await send_push_notification(
            user["expo_push_token"],
            title,
            message,
            {
                "type": notification_type,
                "match_id": match_id,
                "notification_id": notification["notification_id"],
                **(data or {})
            }
        )
    
    return notification

# ======================= MODELS =======================

# Sports enum
SPORTS = ["padel", "tennis", "calcetto", "calcio8"]
MATCH_FORMATS = {
    "padel": {"min_players": 4, "max_players": 4},
    "tennis_singles": {"min_players": 2, "max_players": 2},
    "tennis_doubles": {"min_players": 4, "max_players": 4},
    "calcetto": {"min_players": 10, "max_players": 12},
    "calcio8": {"min_players": 16, "max_players": 18}
}

# Match duration in minutes per sport
MATCH_DURATIONS = {
    "padel": 90,          # 1 ora 30 minuti
    "tennis": 60,         # 1 ora  
    "tennis_singles": 60,
    "tennis_doubles": 90,
    "calcetto": 60,       # 1 ora
    "calcio8": 90         # 1 ora 30 minuti
}

# User roles
ROLES = ["player", "club_admin", "super_admin"]

# Notification types
NOTIFICATION_TYPES = {
    "MATCH_CHAT_MESSAGE": "chat_message",
    "MATCH_PLAYER_JOINED": "player_joined", 
    "MATCH_FULL": "match_full",
    "MATCH_RESULT_SUBMITTED": "result_submitted",
    "MATCH_RESULT_CONFIRMED": "result_confirmed",
    "BOOKING": "booking"
}

# Subscription plans
SUBSCRIPTION_PLANS = {
    "monthly": {"name": "Mensile", "price": 49.99, "duration_days": 30},
    "yearly": {"name": "Annuale", "price": 399.99, "duration_days": 365}
}
# Clubs on one of these paid plans get premium perks (featured listing, broadcast messages).
# "free" (the default plan for every club) is intentionally excluded: it must never be gated
# out of core functionality - only these extra growth/visibility tools are paid add-ons.
PREMIUM_PLAN_IDS = set(SUBSCRIPTION_PLANS.keys())

# Auth Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "player"
    referral_code: Optional[str] = None  # club invite code, set when signing up via a club's invite

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

# Player Profile Models
class PlayerProfileCreate(BaseModel):
    nickname: Optional[str] = None
    city: str
    preferred_sports: List[str] = []
    bio: Optional[str] = None
    profile_picture: Optional[str] = None

class PlayerProfileUpdate(BaseModel):
    nickname: Optional[str] = None
    city: Optional[str] = None
    preferred_sports: Optional[List[str]] = None
    bio: Optional[str] = None
    profile_picture: Optional[str] = None
    skill_levels: Optional[Dict[str, str]] = None

# Club Models
class ClubCreate(BaseModel):
    name: str
    description: Optional[str] = None
    address: str
    city: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    logo: Optional[str] = None
    photos: List[str] = []

class ClubUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    logo: Optional[str] = None
    photos: Optional[List[str]] = None

# Court Models
class CourtCreate(BaseModel):
    name: str
    sport: str
    available_hours: List[str] = []  # e.g., ["09:00-10:00", "10:00-11:00"]
    notes: Optional[str] = None
    is_active: bool = True
    is_indoor: bool = False

class CourtUpdate(BaseModel):
    name: Optional[str] = None
    sport: Optional[str] = None
    available_hours: Optional[List[str]] = None
    notes: Optional[str] = None
    is_indoor: Optional[bool] = None
    is_active: Optional[bool] = None

# Match Models
class MatchCreate(BaseModel):
    sport: str
    format: str  # e.g., "padel", "tennis_singles", "tennis_doubles", "calcetto"
    court_id: str
    date: str  # ISO format date
    start_time: str  # e.g., "10:00"
    end_time: str  # e.g., "11:00"
    duration_minutes: int = 60  # Default 60 minutes, padel uses 90
    max_players: int
    skill_level: str = "all"  # "beginner", "intermediate", "advanced", "all"
    price_per_player: float = 0.0
    notes: Optional[str] = None

class MatchUpdate(BaseModel):
    date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    skill_level: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

# Match Result Models
class MatchResultSubmit(BaseModel):
    score_team_a: str  # e.g., "6-4, 7-5" or "3"
    score_team_b: str
    winner_team: str  # "A" or "B" or "draw"
    team_a_players: List[str]  # user_ids
    team_b_players: List[str]  # user_ids

# Chat Models
class ChatMessage(BaseModel):
    content: str

# Notification Models
class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str  # "booking", "match_full", "result", "chat", "subscription"

# ======================= HELPER FUNCTIONS =======================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

async def get_current_user(request: Request) -> dict:
    # Check cookie first
    token = request.cookies.get("session_token")
    
    # Then check Authorization header
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if it's a session token (from Google OAuth)
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if session:
        expires_at = session.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
        
        user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    
    # Try JWT token
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_optional_user(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None

async def generate_club_referral_code() -> str:
    """Generate a short, human-friendly, unique invite code for a club (e.g. 'MSP-A7K2').
    Short enough to read out loud or type manually, unlike a raw club_id."""
    import random, string
    alphabet = string.ascii_uppercase + string.digits
    for _ in range(10):  # retry on the rare collision
        code = "MSP-" + "".join(random.choices(alphabet, k=4))
        if not await db.clubs.find_one({"referral_code": code}):
            return code
    # Extremely unlikely fallback: widen the code
    return "MSP-" + uuid.uuid4().hex[:6].upper()

def calculate_elo_change(player_rating: int, opponent_rating: int, result: float, k: int = 32) -> int:
    """Calculate Elo rating change. result: 1 for win, 0.5 for draw, 0 for loss"""
    expected = 1 / (1 + 10 ** ((opponent_rating - player_rating) / 400))
    return int(k * (result - expected))

async def update_player_ratings_after_match(match_id: str):
    """
    Update player ratings after a match result is confirmed.
    This function should be called by BOTH player confirmation and club confirmation.
    """
    result = await db.match_results.find_one({"match_id": match_id})
    if not result:
        logger.warning(f"No result found for match {match_id}")
        return False
    
    # Check if ratings were already updated for this match
    if result.get("ratings_updated"):
        logger.info(f"Ratings already updated for match {match_id}")
        return True
    
    match = await db.matches.find_one({"match_id": match_id})
    if not match:
        logger.warning(f"Match {match_id} not found")
        return False
    
    sport = match["sport"]
    winner_team = result.get("winner_team")
    team_a_players = result.get("team_a_players", [])
    team_b_players = result.get("team_b_players", [])
    
    if not team_a_players and not team_b_players:
        logger.warning(f"No team players found for match {match_id}")
        return False
    
    # Calculate average ratings for each team
    async def get_team_avg_rating(player_ids):
        total = 0
        count = 0
        for pid in player_ids:
            rating = await db.player_ratings.find_one({"user_id": pid, "sport": sport})
            if rating:
                total += rating.get("rating", 1200)
                count += 1
            else:
                total += 1200
                count += 1
        return total / count if count > 0 else 1200
    
    team_a_avg = await get_team_avg_rating(team_a_players)
    team_b_avg = await get_team_avg_rating(team_b_players)
    
    logger.info(f"Updating ratings for match {match_id}: Team A avg={team_a_avg}, Team B avg={team_b_avg}, winner={winner_team}")
    
    # Update ratings for Team A players
    for player_id in team_a_players:
        current_rating = await db.player_ratings.find_one({"user_id": player_id, "sport": sport})
        if not current_rating:
            # Create rating if doesn't exist
            current_rating = {"user_id": player_id, "sport": sport, "rating": 1200, "matches_played": 0, "wins": 0, "losses": 0}
            await db.player_ratings.insert_one(current_rating)
        
        if winner_team == "A":
            result_score = 1.0
            win_inc, loss_inc = 1, 0
        elif winner_team == "B":
            result_score = 0.0
            win_inc, loss_inc = 0, 1
        else:
            result_score = 0.5
            win_inc, loss_inc = 0, 0
        
        rating_change = calculate_elo_change(current_rating["rating"], int(team_b_avg), result_score)
        new_rating = current_rating["rating"] + rating_change
        
        await db.player_ratings.update_one(
            {"user_id": player_id, "sport": sport},
            {
                "$set": {"rating": new_rating, "updated_at": datetime.now(timezone.utc)},
                "$inc": {"matches_played": 1, "wins": win_inc, "losses": loss_inc}
            }
        )
        
        # Save rating history
        history = {
            "user_id": player_id,
            "sport": sport,
            "match_id": match_id,
            "old_rating": current_rating["rating"],
            "new_rating": new_rating,
            "change": rating_change,
            "created_at": datetime.now(timezone.utc)
        }
        await db.player_rating_history.insert_one(history)
        logger.info(f"Updated rating for player {player_id}: {current_rating['rating']} -> {new_rating} ({rating_change:+d})")
    
    # Update ratings for Team B players
    for player_id in team_b_players:
        current_rating = await db.player_ratings.find_one({"user_id": player_id, "sport": sport})
        if not current_rating:
            current_rating = {"user_id": player_id, "sport": sport, "rating": 1200, "matches_played": 0, "wins": 0, "losses": 0}
            await db.player_ratings.insert_one(current_rating)
        
        if winner_team == "B":
            result_score = 1.0
            win_inc, loss_inc = 1, 0
        elif winner_team == "A":
            result_score = 0.0
            win_inc, loss_inc = 0, 1
        else:
            result_score = 0.5
            win_inc, loss_inc = 0, 0
        
        rating_change = calculate_elo_change(current_rating["rating"], int(team_a_avg), result_score)
        new_rating = current_rating["rating"] + rating_change
        
        await db.player_ratings.update_one(
            {"user_id": player_id, "sport": sport},
            {
                "$set": {"rating": new_rating, "updated_at": datetime.now(timezone.utc)},
                "$inc": {"matches_played": 1, "wins": win_inc, "losses": loss_inc}
            }
        )
        
        history = {
            "user_id": player_id,
            "sport": sport,
            "match_id": match_id,
            "old_rating": current_rating["rating"],
            "new_rating": new_rating,
            "change": rating_change,
            "created_at": datetime.now(timezone.utc)
        }
        await db.player_rating_history.insert_one(history)
        logger.info(f"Updated rating for player {player_id}: {current_rating['rating']} -> {new_rating} ({rating_change:+d})")
    
    # --- Gamification: streak, classifica di circolo, avanzamento tabellone torneo ---
    # Nello stesso punto in cui si aggiorna l'ELO, cosi' ogni partita (normale o di torneo)
    # alimenta automaticamente streak e classifica senza duplicare la logica altrove.
    is_tournament_match = bool(match.get("tournament_id"))
    points_per_win = 30 if is_tournament_match else 10
    winners = team_a_players if winner_team == "A" else (team_b_players if winner_team == "B" else [])
    losers = team_b_players if winner_team == "A" else (team_a_players if winner_team == "B" else [])

    for player_id in winners:
        await db.player_streaks.update_one(
            {"user_id": player_id},
            {
                "$inc": {"current_streak": 1},
                "$set": {"updated_at": datetime.now(timezone.utc)},
                "$setOnInsert": {"user_id": player_id}
            },
            upsert=True
        )
        streak_doc = await db.player_streaks.find_one({"user_id": player_id})
        if streak_doc and streak_doc.get("current_streak", 0) > streak_doc.get("best_streak", 0):
            await db.player_streaks.update_one(
                {"user_id": player_id},
                {"$set": {"best_streak": streak_doc["current_streak"]}}
            )
        if match.get("club_id"):
            await db.club_leaderboard.update_one(
                {"club_id": match["club_id"], "user_id": player_id},
                {
                    "$inc": {"points": points_per_win, "wins": 1},
                    "$set": {"updated_at": datetime.now(timezone.utc)},
                    "$setOnInsert": {"club_id": match["club_id"], "user_id": player_id}
                },
                upsert=True
            )

    for player_id in losers:
        await db.player_streaks.update_one(
            {"user_id": player_id},
            {"$set": {"current_streak": 0, "updated_at": datetime.now(timezone.utc)}, "$setOnInsert": {"user_id": player_id, "best_streak": 0}},
            upsert=True
        )
        if match.get("club_id"):
            await db.club_leaderboard.update_one(
                {"club_id": match["club_id"], "user_id": player_id},
                {"$inc": {"losses": 1}, "$set": {"updated_at": datetime.now(timezone.utc)},
                 "$setOnInsert": {"club_id": match["club_id"], "user_id": player_id, "points": 0}},
                upsert=True
            )

    if is_tournament_match:
        await advance_tournament_bracket(match["tournament_id"], match_id)

    # Mark ratings as updated to prevent double updates
    await db.match_results.update_one(
        {"match_id": match_id},
        {"$set": {"ratings_updated": True, "ratings_updated_at": datetime.now(timezone.utc)}}
    )
    
    logger.info(f"Successfully updated all ratings for match {match_id}")
    return True

# ======================= AUTH ENDPOINTS =======================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user already exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_password = get_password_hash(user_data.password)
    
    user = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hashed_password,
        "role": user_data.role,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "is_active": True,
        "language": "it"
    }
    
    await db.users.insert_one(user)
    
    # Create player profile if player role
    if user_data.role == "player":
        player_profile = {
            "user_id": user_id,
            "nickname": user_data.name,
            "city": "",
            "preferred_sports": [],
            "bio": "",
            "profile_picture": None,
            "skill_levels": {"padel": "beginner", "tennis": "beginner", "calcetto": "beginner", "calcio8": "beginner"},
            "created_at": datetime.now(timezone.utc)
        }
        await db.player_profiles.insert_one(player_profile)
        
        # Initialize ratings
        for sport in SPORTS:
            rating = {
                "user_id": user_id,
                "sport": sport,
                "rating": 1200,
                "matches_played": 0,
                "wins": 0,
                "losses": 0,
                "draws": 0,
                "updated_at": datetime.now(timezone.utc)
            }
            await db.player_ratings.insert_one(rating)
        
        # Attribute signup to the inviting club, if the user came from a club invite code/link
        if user_data.referral_code:
            inviting_club = await db.clubs.find_one({"referral_code": user_data.referral_code.upper()})
            if inviting_club:
                # Auto-follow the inviting club (matches player's UX expectation: "I joined via my club")
                await db.favorite_clubs.insert_one({
                    "user_id": user_id,
                    "club_id": inviting_club["club_id"],
                    "created_at": datetime.now(timezone.utc)
                })
                # Track growth attribution on the club
                await db.clubs.update_one(
                    {"club_id": inviting_club["club_id"]},
                    {"$inc": {"referred_players_count": 1}}
                )
                # Log a referral record for auditability/future analytics
                await db.club_referrals.insert_one({
                    "referral_id": f"ref_{uuid.uuid4().hex[:12]}",
                    "club_id": inviting_club["club_id"],
                    "user_id": user_id,
                    "created_at": datetime.now(timezone.utc)
                })
                # Notify the club admin that their invite is working
                await create_notification(
                    user_id=inviting_club["admin_user_id"],
                    title="Nuovo giocatore dal tuo invito! 🎉",
                    message=f"{user_data.name} si è iscritto tramite il link del tuo circolo.",
                    notification_type="club_referral"
                )
    
    user_response = {k: v for k, v in user.items() if k != "password_hash" and k != "_id"}
    
    return TokenResponse(access_token=access_token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(user_data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user["user_id"]})
    
    user_response = {k: v for k, v in user.items() if k != "password_hash"}
    
    return TokenResponse(access_token=access_token, user=user_response)

@api_router.post("/auth/google/session")
async def google_auth_session(request: Request):
    """Exchange session_id from Google OAuth for session token"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth to get user data
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        auth_data = response.json()
    
    # Check if user exists
    user = await db.users.find_one({"email": auth_data["email"]}, {"_id": 0})
    
    if not user:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "picture": auth_data.get("picture"),
            "role": "player",  # Default role for Google OAuth
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "is_active": True,
            "language": "it",
            "auth_provider": "google"
        }
        await db.users.insert_one(user)
        
        # Create player profile
        player_profile = {
            "user_id": user_id,
            "nickname": auth_data["name"],
            "city": "",
            "preferred_sports": [],
            "bio": "",
            "profile_picture": auth_data.get("picture"),
            "skill_levels": {"padel": "beginner", "tennis": "beginner", "calcetto": "beginner"},
            "created_at": datetime.now(timezone.utc)
        }
        await db.player_profiles.insert_one(player_profile)
        
        # Initialize ratings
        for sport in SPORTS:
            rating = {
                "user_id": user_id,
                "sport": sport,
                "rating": 1200,
                "matches_played": 0,
                "wins": 0,
                "losses": 0,
                "draws": 0,
                "updated_at": datetime.now(timezone.utc)
            }
            await db.player_ratings.insert_one(rating)
    else:
        user_id = user["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"picture": auth_data.get("picture"), "updated_at": datetime.now(timezone.utc)}}
        )
    
    # Create session
    session_token = auth_data.get("session_token", f"session_{uuid.uuid4().hex}")
    session = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session)
    
    # Get updated user
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    user_response = {k: v for k, v in user.items() if k != "password_hash"}
    
    response = JSONResponse(content={"user": user_response, "session_token": session_token})
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    return response

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {k: v for k, v in user.items() if k != "password_hash"}

@api_router.post("/auth/logout")
async def logout(request: Request):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    
    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie(key="session_token", path="/")
    return response

# ======================= ACCOUNT DELETION ENDPOINT (Apple Guideline 5.1.1(v)) =======================

class DeleteAccountRequest(BaseModel):
    password: str
    confirmation: str = "DELETE"

@api_router.delete("/auth/delete-account")
async def delete_account(request: DeleteAccountRequest, user: dict = Depends(get_current_user)):
    """
    Permanently delete user account and all associated data.
    Complies with Apple App Store Review Guideline 5.1.1(v).
    
    This endpoint:
    1. Verifies the user's password for security
    2. Deletes all personal data associated with the account
    3. Removes the account from the authentication system
    4. Preserves only data required for legal/compliance reasons
    """
    user_id = user["user_id"]
    
    # Step 1: Verify password
    full_user = await db.users.find_one({"user_id": user_id})
    if not full_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify password
    if not verify_password(request.password, full_user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect password")
    
    # Step 2: Verify confirmation
    if request.confirmation.upper() != "DELETE":
        raise HTTPException(status_code=400, detail="Please confirm deletion by typing DELETE")
    
    logger.info(f"[ACCOUNT_DELETION] Starting deletion for user {user_id} ({user['email']})")
    
    try:
        # Step 3: Delete all user data
        
        # 3a. Delete push notification tokens
        await db.users.update_one(
            {"user_id": user_id},
            {"$unset": {"expo_push_token": ""}}
        )
        logger.info(f"[ACCOUNT_DELETION] Removed push tokens for user {user_id}")
        
        # 3b. Delete favorite clubs
        deleted_favorites = await db.favorite_clubs.delete_many({"user_id": user_id})
        logger.info(f"[ACCOUNT_DELETION] Deleted {deleted_favorites.deleted_count} favorite clubs")
        
        # 3c. Delete notifications
        deleted_notifications = await db.notifications.delete_many({"user_id": user_id})
        logger.info(f"[ACCOUNT_DELETION] Deleted {deleted_notifications.deleted_count} notifications")
        
        # 3d. Delete match participations
        deleted_participations = await db.match_participants.delete_many({"user_id": user_id})
        logger.info(f"[ACCOUNT_DELETION] Deleted {deleted_participations.deleted_count} match participations")
        
        # 3e. Anonymize chat messages (keep for match history integrity, but remove personal data)
        await db.chat_messages.update_many(
            {"user_id": user_id},
            {"$set": {"user_id": "deleted_user", "user_name": "Utente eliminato"}}
        )
        logger.info(f"[ACCOUNT_DELETION] Anonymized chat messages for user {user_id}")
        
        # 3f. Anonymize match results (keep for rating history integrity)
        await db.match_results.update_many(
            {"submitted_by": user_id},
            {"$set": {"submitted_by": "deleted_user"}}
        )
        
        # 3g. Delete player profile
        deleted_profile = await db.player_profiles.delete_one({"user_id": user_id})
        logger.info(f"[ACCOUNT_DELETION] Deleted player profile: {deleted_profile.deleted_count}")
        
        # 3h. Anonymize player ratings (keep for historical rating calculations)
        await db.player_ratings.update_many(
            {"user_id": user_id},
            {"$set": {
                "user_id": f"deleted_{user_id[:8]}",
                "anonymized": True,
                "anonymized_at": datetime.now(timezone.utc)
            }}
        )
        logger.info("[ACCOUNT_DELETION] Anonymized player ratings")
        
        # 3i. Anonymize rating history
        await db.player_rating_history.update_many(
            {"user_id": user_id},
            {"$set": {
                "user_id": f"deleted_{user_id[:8]}",
                "anonymized": True
            }}
        )
        
        # 3j. Delete all user sessions
        deleted_sessions = await db.user_sessions.delete_many({"user_id": user_id})
        logger.info(f"[ACCOUNT_DELETION] Deleted {deleted_sessions.deleted_count} sessions")
        
        # 3k. Delete password reset tokens
        await db.password_resets.delete_many({"user_id": user_id})
        
        # 3l. If user is a club admin, transfer or mark club
        club = await db.clubs.find_one({"admin_user_id": user_id})
        if club:
            # Mark club as needing new admin
            await db.clubs.update_one(
                {"club_id": club["club_id"]},
                {"$set": {
                    "admin_user_id": None,
                    "status": "inactive",
                    "admin_deleted_at": datetime.now(timezone.utc),
                    "needs_new_admin": True
                }}
            )
            logger.info(f"[ACCOUNT_DELETION] Marked club {club['club_id']} as needing new admin")
        
        # Step 4: Finally delete the user account
        deleted_user = await db.users.delete_one({"user_id": user_id})
        
        if deleted_user.deleted_count == 0:
            logger.error(f"[ACCOUNT_DELETION] Failed to delete user {user_id}")
            raise HTTPException(status_code=500, detail="Failed to delete account")
        
        logger.info(f"[ACCOUNT_DELETION] Successfully deleted account for user {user_id}")
        
        # Create audit log for legal compliance (anonymized)
        await db.account_deletions.insert_one({
            "deleted_at": datetime.now(timezone.utc),
            "user_id_hash": hashlib.sha256(user_id.encode()).hexdigest(),
            "email_domain": user["email"].split("@")[1] if "@" in user["email"] else "unknown",
            "reason": "user_requested",
            "data_deleted": [
                "user_account",
                "player_profile", 
                "favorite_clubs",
                "notifications",
                "match_participations",
                "sessions",
                "password_reset_tokens"
            ],
            "data_anonymized": [
                "chat_messages",
                "player_ratings",
                "rating_history",
                "match_results"
            ]
        })
        
        return {
            "success": True,
            "message": "Your account has been deleted successfully.",
            "details": "All your personal data has been removed. Some anonymized data may be retained for legal or fraud-prevention purposes."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ACCOUNT_DELETION] Error deleting account: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while deleting your account. Please try again or contact support."
        )

class PushTokenRequest(BaseModel):
    expo_push_token: str

@api_router.put("/auth/push-token")
async def update_push_token(request: PushTokenRequest, user: dict = Depends(get_current_user)):
    """Register or update Expo push token for the current user"""
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"expo_push_token": request.expo_push_token}}
    )
    logger.info(f"Push token updated for user {user['user_id']}")
    return {"message": "Push token updated successfully"}

# ======================= PASSWORD RESET ENDPOINTS =======================

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Request password reset - sends a reset token via email"""
    user = await db.users.find_one({"email": request.email})
    
    if not user:
        # Return success even if user doesn't exist (security best practice)
        return {"message": "Se l'email esiste, riceverai le istruzioni per il reset"}
    
    # Generate reset token
    reset_token = f"reset_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Store reset token
    await db.password_resets.delete_many({"user_id": user["user_id"]})  # Remove old tokens
    await db.password_resets.insert_one({
        "user_id": user["user_id"],
        "token": reset_token,
        "email": request.email,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc),
        "used": False
    })
    
    # Send password reset email
    user_name = user.get("name", "Utente")
    email_sent = send_password_reset_email(request.email, reset_token, user_name)
    
    if email_sent:
        logger.info(f"Password reset email sent to {request.email}")
    else:
        logger.warning(f"Failed to send password reset email to {request.email}, token: {reset_token}")
    
    return {"message": "Se l'email esiste, riceverai le istruzioni per il reset"}

@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using the reset token"""
    # Find valid reset token
    reset_record = await db.password_resets.find_one({
        "token": request.token,
        "used": False,
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    })
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Token non valido o scaduto")
    
    # Validate password
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="La password deve avere almeno 6 caratteri")
    
    # Update password
    password_hash = get_password_hash(request.new_password)
    await db.users.update_one(
        {"user_id": reset_record["user_id"]},
        {"$set": {"password_hash": password_hash, "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Mark token as used
    await db.password_resets.update_one(
        {"token": request.token},
        {"$set": {"used": True}}
    )
    
    return {"message": "Password aggiornata con successo"}

@api_router.get("/auth/verify-reset-token/{token}")
async def verify_reset_token(token: str):
    """Verify if a reset token is valid"""
    reset_record = await db.password_resets.find_one({
        "token": token,
        "used": False,
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    })
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Token non valido o scaduto")
    
    return {"valid": True, "email": reset_record["email"]}

# ======================= PLAYER PROFILE ENDPOINTS =======================

@api_router.get("/player/profile")
async def get_player_profile(user: dict = Depends(get_current_user)):
    profile = await db.player_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@api_router.put("/player/profile")
async def update_player_profile(profile_data: PlayerProfileUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in profile_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.player_profiles.update_one(
        {"user_id": user["user_id"]},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        # Create profile if it doesn't exist
        profile = {
            "user_id": user["user_id"],
            **update_data,
            "created_at": datetime.now(timezone.utc)
        }
        await db.player_profiles.insert_one(profile)
    
    profile = await db.player_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return profile

@api_router.get("/player/ratings")
async def get_player_ratings(user: dict = Depends(get_current_user)):
    ratings = await db.player_ratings.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(10)
    return ratings

@api_router.get("/player/ratings/{user_id}")
async def get_user_ratings(user_id: str):
    ratings = await db.player_ratings.find({"user_id": user_id}, {"_id": 0}).to_list(10)
    if not ratings:
        raise HTTPException(status_code=404, detail="Ratings not found")
    return ratings

@api_router.get("/player/stats")
async def get_player_stats(user: dict = Depends(get_current_user)):
    ratings = await db.player_ratings.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(10)
    
    total_matches = sum(r.get("matches_played", 0) for r in ratings)
    total_wins = sum(r.get("wins", 0) for r in ratings)
    total_losses = sum(r.get("losses", 0) for r in ratings)
    total_draws = sum(r.get("draws", 0) for r in ratings)
    
    return {
        "total_matches": total_matches,
        "total_wins": total_wins,
        "total_losses": total_losses,
        "total_draws": total_draws,
        "ratings_by_sport": ratings
    }

@api_router.get("/player/history")
async def get_player_match_history(
    user: dict = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    """
    Get player's match history - ONLY completed matches with confirmed results
    """
    # Get all matches where user participated
    participations = await db.match_participants.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    match_ids = [p["match_id"] for p in participations]
    
    # Only get matches that are completed AND have confirmed result
    matches = await db.matches.find(
        {
            "match_id": {"$in": match_ids},
            "status": "completed"  # Only completed matches
        },
        {"_id": 0}
    ).sort("date", -1).skip(skip).limit(limit).to_list(limit)
    
    # Filter further: only include matches with confirmed results
    confirmed_matches = []
    for match in matches:
        result = await db.match_results.find_one(
            {"match_id": match["match_id"], "status": "confirmed"},  # Only confirmed results
            {"_id": 0}
        )
        if result:
            match["result"] = result
            confirmed_matches.append(match)
    
    return confirmed_matches

@api_router.get("/player/my-matches")
async def get_player_my_matches(
    user: dict = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    """
    Get ALL matches where the player is registered (upcoming + past).
    This is different from /player/history which only returns completed matches with confirmed results.
    """
    # Get all matches where user is a participant
    participations = await db.match_participants.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    match_ids = [p["match_id"] for p in participations]
    
    if not match_ids:
        return {"upcoming": [], "past": []}
    
    # Get all matches
    matches = await db.matches.find(
        {"match_id": {"$in": match_ids}},
        {"_id": 0}
    ).sort("date", -1).to_list(limit)
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now_time = datetime.now(timezone.utc).strftime("%H:%M")
    
    upcoming = []
    past = []
    
    for match in matches:
        # Enrich with participants
        participants = await db.match_participants.find(
            {"match_id": match["match_id"]},
            {"_id": 0}
        ).to_list(20)
        match["participants"] = participants
        
        # Add result if exists
        result = await db.match_results.find_one(
            {"match_id": match["match_id"]},
            {"_id": 0}
        )
        if result:
            match["result"] = result
        
        # Categorize as upcoming or past
        match_date = match.get("date", "")
        match_start_time = match.get("start_time", "00:00")
        
        # A match is upcoming if:
        # 1. Its date is in the future, OR
        # 2. Its date is today AND its start time hasn't passed yet
        # Also must not be completed or cancelled
        is_future_date = match_date > today
        is_today_future_time = match_date == today and match_start_time > now_time
        is_active_status = match.get("status") not in ["completed", "cancelled"]
        
        if (is_future_date or is_today_future_time) and is_active_status:
            upcoming.append(match)
        else:
            past.append(match)
    
    # Sort upcoming by date ascending (nearest first)
    upcoming.sort(key=lambda m: (m.get("date", ""), m.get("start_time", "")))
    
    # Sort past by date descending (most recent first)
    past.sort(key=lambda m: (m.get("date", ""), m.get("start_time", "")), reverse=True)
    
    return {"upcoming": upcoming, "past": past}

# ======================= CLUB ENDPOINTS =======================

@api_router.post("/club/register")
async def register_club(club_data: ClubCreate, user: dict = Depends(get_current_user)):
    # Check if user already has a club
    existing = await db.clubs.find_one({"admin_user_id": user["user_id"]})
    if existing:
        raise HTTPException(status_code=400, detail="User already has a club")
    
    club_id = f"club_{uuid.uuid4().hex[:12]}"
    referral_code = await generate_club_referral_code()
    
    club = {
        "club_id": club_id,
        "admin_user_id": user["user_id"],
        **club_data.dict(),
        "is_active": True,
        # Business model change: club listing/management is free by default, no forced trial/expiry.
        # "active" + no expiration = free tier. "subscription_plan" left as "free" so we can later
        # distinguish free clubs from clubs that opt into a paid premium plan (see /club/subscription).
        "subscription_status": "active",
        "subscription_plan": "free",
        "subscription_expires_at": None,
        "referral_code": referral_code,       # short code to invite the club's own player base
        "referred_players_count": 0,  # players who joined via this club's invite link
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.clubs.insert_one(club)
    
    # Update user role to club_admin
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"role": "club_admin", "club_id": club_id}}
    )
    
    return {k: v for k, v in club.items() if k != "_id"}

@api_router.get("/club/my")
async def get_my_club(user: dict = Depends(get_current_user)):
    club = await db.clubs.find_one({"admin_user_id": user["user_id"]}, {"_id": 0})
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    return club

@api_router.put("/club/my")
async def update_my_club(club_data: ClubUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in club_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.clubs.update_one(
        {"admin_user_id": user["user_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Club not found")
    
    club = await db.clubs.find_one({"admin_user_id": user["user_id"]}, {"_id": 0})
    
    # Invalidate cache
    cache.invalidate_pattern("clubs_list")
    cache.delete(f"club:{club['club_id']}")
    cache.delete("cities_list")
    
    return club

@api_router.get("/clubs")
async def list_clubs(
    city: Optional[str] = None,
    sport: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    # Cache key includes filters
    cache_key = f"clubs_list:{city or 'all'}:{sport or 'all'}:{limit}:{skip}"
    cached = cache.get(cache_key)
    if cached:
        return cached
    
    query = {"is_active": True}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    
    # Premium clubs (paid plan) are surfaced first - this is the "featured listing" perk.
    # Everyone else still shows up right after, just not first; nobody is hidden or blocked.
    pipeline = [
        {"$match": query},
        {"$addFields": {"is_premium": {"$in": ["$subscription_plan", list(PREMIUM_PLAN_IDS)]}}},
        {"$sort": {"is_premium": -1, "rating_average": -1}},
        {"$skip": skip},
        {"$limit": limit},
        {"$project": {"_id": 0}},
    ]
    clubs = await db.clubs.aggregate(pipeline).to_list(limit)
    
    # If sport filter, filter clubs that have courts for that sport
    if sport:
        filtered_clubs = []
        for club in clubs:
            courts = await db.courts.find(
                {"club_id": club["club_id"], "sport": sport, "is_active": True}
            ).to_list(1)
            if courts:
                filtered_clubs.append(club)
        clubs = filtered_clubs
    
    # Cache for 5 minutes
    cache.set(cache_key, clubs, ttl_seconds=300)
    return clubs

@api_router.get("/clubs/{club_id}")
async def get_club(club_id: str):
    # Cache individual club data for 2 minutes
    cache_key = f"club:{club_id}"
    cached = cache.get(cache_key)
    if cached:
        return cached
    
    club = await db.clubs.find_one({"club_id": club_id}, {"_id": 0})
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    club["is_premium"] = club.get("subscription_plan") in PREMIUM_PLAN_IDS
    
    # Get courts
    courts = await db.courts.find({"club_id": club_id, "is_active": True}, {"_id": 0}).to_list(100)
    club["courts"] = courts
    
    cache.set(cache_key, club, ttl_seconds=120)
    return club

# ======================= CLUB REVIEWS ENDPOINTS =======================

# Review Models
class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5 stars")
    comment: Optional[str] = Field(None, max_length=500, description="Optional review comment")

class ReviewUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=500)

class ReviewReport(BaseModel):
    reason: str = Field(..., min_length=5, max_length=200)

# Review status constants
REVIEW_STATUSES = ["active", "hidden", "removed"]

async def update_club_rating(club_id: str):
    """Recalculate and update club's average rating and review count"""
    pipeline = [
        {"$match": {"club_id": club_id, "status": "active"}},
        {"$group": {
            "_id": None,
            "avg_rating": {"$avg": "$rating"},
            "count": {"$sum": 1}
        }}
    ]
    
    result = await db.reviews.aggregate(pipeline).to_list(1)
    
    if result:
        avg_rating = round(result[0]["avg_rating"], 1)
        count = result[0]["count"]
    else:
        avg_rating = 0
        count = 0
    
    await db.clubs.update_one(
        {"club_id": club_id},
        {"$set": {
            "rating_average": avg_rating,
            "reviews_count": count,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    # Invalidate cache
    cache.delete(f"club:{club_id}")
    cache.invalidate_pattern("clubs_list")
    
    return avg_rating, count

@api_router.post("/clubs/{club_id}/reviews")
async def create_review(club_id: str, review_data: ReviewCreate, user: dict = Depends(get_current_user)):
    """Create a new review for a club. Only authenticated players can review."""
    
    # Verify user is a player
    if user.get("role") != "player":
        raise HTTPException(status_code=403, detail="Solo i giocatori possono lasciare recensioni")
    
    # Verify club exists
    club = await db.clubs.find_one({"club_id": club_id})
    if not club:
        raise HTTPException(status_code=404, detail="Circolo non trovato")
    
    # Check if user already reviewed this club
    existing = await db.reviews.find_one({
        "user_id": user["user_id"],
        "club_id": club_id,
        "status": {"$in": ["active", "hidden"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Hai già recensito questo circolo")
    
    # Sanitize comment
    comment = review_data.comment.strip() if review_data.comment else None
    if comment and len(comment) > 500:
        comment = comment[:500]
    
    review_id = f"rev_{uuid.uuid4().hex[:12]}"
    
    review = {
        "review_id": review_id,
        "user_id": user["user_id"],
        "user_name": user.get("name", "Utente"),
        "club_id": club_id,
        "rating": review_data.rating,
        "comment": comment,
        "status": "active",
        "is_reported": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.reviews.insert_one(review)
    
    # Update club rating
    avg_rating, count = await update_club_rating(club_id)
    
    logger.info(f"Review created: {review_id} for club {club_id} by user {user['user_id']}")
    
    return {
        "review": {k: v for k, v in review.items() if k != "_id"},
        "club_rating_average": avg_rating,
        "club_reviews_count": count
    }

@api_router.get("/clubs/{club_id}/reviews")
async def get_club_reviews(
    club_id: str,
    sort: str = Query("recent", enum=["recent", "oldest", "highest", "lowest"]),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    request: Request = None
):
    """Get reviews for a club with sorting options"""
    
    # Verify club exists
    club = await db.clubs.find_one({"club_id": club_id})
    if not club:
        raise HTTPException(status_code=404, detail="Circolo non trovato")
    
    # Build sort criteria
    sort_map = {
        "recent": [("created_at", -1)],
        "oldest": [("created_at", 1)],
        "highest": [("rating", -1), ("created_at", -1)],
        "lowest": [("rating", 1), ("created_at", -1)]
    }
    sort_criteria = sort_map.get(sort, [("created_at", -1)])
    
    # Get reviews
    reviews = await db.reviews.find(
        {"club_id": club_id, "status": "active"},
        {"_id": 0}
    ).sort(sort_criteria).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with user profile pictures
    for review in reviews:
        profile = await db.player_profiles.find_one(
            {"user_id": review["user_id"]},
            {"profile_picture": 1, "nickname": 1}
        )
        if profile:
            review["user_profile_picture"] = profile.get("profile_picture")
            review["user_nickname"] = profile.get("nickname")
    
    # Get current user's review if authenticated
    user_review = None
    try:
        user = await get_optional_user(request)
        if user:
            user_review = await db.reviews.find_one(
                {"user_id": user["user_id"], "club_id": club_id, "status": {"$in": ["active", "hidden"]}},
                {"_id": 0}
            )
    except:
        pass
    
    return {
        "reviews": reviews,
        "total": await db.reviews.count_documents({"club_id": club_id, "status": "active"}),
        "club_rating_average": club.get("rating_average", 0),
        "club_reviews_count": club.get("reviews_count", 0),
        "user_review": user_review
    }

@api_router.patch("/reviews/{review_id}")
async def update_review(review_id: str, review_data: ReviewUpdate, user: dict = Depends(get_current_user)):
    """Update a review. Only the author can update their review."""
    
    review = await db.reviews.find_one({"review_id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Recensione non trovata")
    
    # Check ownership
    if review["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Non puoi modificare questa recensione")
    
    # Check status
    if review["status"] == "removed":
        raise HTTPException(status_code=400, detail="Questa recensione è stata rimossa")
    
    # Build update data
    update_data = {"updated_at": datetime.now(timezone.utc)}
    
    if review_data.rating is not None:
        update_data["rating"] = review_data.rating
    
    if review_data.comment is not None:
        comment = review_data.comment.strip() if review_data.comment else None
        if comment and len(comment) > 500:
            comment = comment[:500]
        update_data["comment"] = comment
    
    await db.reviews.update_one(
        {"review_id": review_id},
        {"$set": update_data}
    )
    
    # Update club rating
    avg_rating, count = await update_club_rating(review["club_id"])
    
    updated_review = await db.reviews.find_one({"review_id": review_id}, {"_id": 0})
    
    logger.info(f"Review updated: {review_id} by user {user['user_id']}")
    
    return {
        "review": updated_review,
        "club_rating_average": avg_rating,
        "club_reviews_count": count
    }

@api_router.delete("/reviews/{review_id}")
async def delete_review(review_id: str, user: dict = Depends(get_current_user)):
    """Delete a review. Only the author can delete their review."""
    
    review = await db.reviews.find_one({"review_id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Recensione non trovata")
    
    # Check ownership
    if review["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Non puoi eliminare questa recensione")
    
    club_id = review["club_id"]
    
    # Soft delete - change status to removed
    await db.reviews.update_one(
        {"review_id": review_id},
        {"$set": {"status": "removed", "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Update club rating
    avg_rating, count = await update_club_rating(club_id)
    
    logger.info(f"Review deleted: {review_id} by user {user['user_id']}")
    
    return {
        "message": "Recensione eliminata con successo",
        "club_rating_average": avg_rating,
        "club_reviews_count": count
    }

@api_router.post("/reviews/{review_id}/report")
async def report_review(review_id: str, report_data: ReviewReport, user: dict = Depends(get_current_user)):
    """Report a review as inappropriate"""
    
    review = await db.reviews.find_one({"review_id": review_id, "status": "active"})
    if not review:
        raise HTTPException(status_code=404, detail="Recensione non trovata")
    
    # Check if already reported by this user
    existing_report = await db.review_reports.find_one({
        "review_id": review_id,
        "reported_by": user["user_id"]
    })
    if existing_report:
        raise HTTPException(status_code=400, detail="Hai già segnalato questa recensione")
    
    report_id = f"report_{uuid.uuid4().hex[:12]}"
    
    report = {
        "report_id": report_id,
        "review_id": review_id,
        "reported_by": user["user_id"],
        "reason": report_data.reason.strip()[:200],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.review_reports.insert_one(report)
    
    # Mark review as reported
    await db.reviews.update_one(
        {"review_id": review_id},
        {"$set": {"is_reported": True}}
    )
    
    logger.info(f"Review reported: {review_id} by user {user['user_id']}")
    
    return {"message": "Segnalazione inviata. Grazie per il tuo contributo."}

@api_router.get("/player/my-reviews")
async def get_my_reviews(
    user: dict = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    """Get all reviews by the current user"""
    
    reviews = await db.reviews.find(
        {"user_id": user["user_id"], "status": {"$in": ["active", "hidden"]}},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with club names
    for review in reviews:
        club = await db.clubs.find_one({"club_id": review["club_id"]}, {"name": 1, "city": 1})
        if club:
            review["club_name"] = club.get("name")
            review["club_city"] = club.get("city")
    
    return reviews

# ======================= COURT ENDPOINTS =======================

@api_router.post("/club/courts")
async def create_court(court_data: CourtCreate, user: dict = Depends(get_current_user)):
    club = await db.clubs.find_one({"admin_user_id": user["user_id"]})
    if not club:
        raise HTTPException(status_code=403, detail="Not a club admin")
    
    court_id = f"court_{uuid.uuid4().hex[:12]}"
    
    court = {
        "court_id": court_id,
        "club_id": club["club_id"],
        **court_data.dict(),
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.courts.insert_one(court)
    return {k: v for k, v in court.items() if k != "_id"}

@api_router.get("/club/courts")
async def get_club_courts(user: dict = Depends(get_current_user)):
    club = await db.clubs.find_one({"admin_user_id": user["user_id"]})
    if not club:
        raise HTTPException(status_code=403, detail="Not a club admin")
    
    courts = await db.courts.find({"club_id": club["club_id"]}, {"_id": 0}).to_list(100)
    return courts

@api_router.put("/club/courts/{court_id}")
async def update_court(court_id: str, court_data: CourtUpdate, user: dict = Depends(get_current_user)):
    club = await db.clubs.find_one({"admin_user_id": user["user_id"]})
    if not club:
        raise HTTPException(status_code=403, detail="Not a club admin")
    
    update_data = {k: v for k, v in court_data.dict().items() if v is not None}
    
    result = await db.courts.update_one(
        {"court_id": court_id, "club_id": club["club_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Court not found")
    
    court = await db.courts.find_one({"court_id": court_id}, {"_id": 0})
    return court

@api_router.delete("/club/courts/{court_id}")
async def delete_court(court_id: str, permanent: bool = False, user: dict = Depends(get_current_user)):
    club = await db.clubs.find_one({"admin_user_id": user["user_id"]})
    if not club:
        raise HTTPException(status_code=403, detail="Not a club admin")
    
    if permanent:
        # Permanent delete
        result = await db.courts.delete_one(
            {"court_id": court_id, "club_id": club["club_id"]}
        )
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Court not found")
        return {"message": "Court permanently deleted"}
    else:
        # Soft delete (deactivate)
        result = await db.courts.update_one(
            {"court_id": court_id, "club_id": club["club_id"]},
            {"$set": {"is_active": False}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Court not found")
        return {"message": "Court deactivated"}

# ======================= FAVORITE CLUBS ENDPOINTS =======================

@api_router.get("/player/favorite-clubs")
async def get_favorite_clubs(user: dict = Depends(get_current_user)):
    """Get player's favorite clubs"""
    favorites = await db.favorite_clubs.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    club_ids = [f["club_id"] for f in favorites]
    
    if not club_ids:
        return []
    
    clubs = await db.clubs.find({"club_id": {"$in": club_ids}}, {"_id": 0}).to_list(100)
    return clubs

@api_router.post("/player/favorite-clubs/{club_id}")
async def add_favorite_club(club_id: str, user: dict = Depends(get_current_user)):
    """Add a club to favorites"""
    # Check if club exists
    club = await db.clubs.find_one({"club_id": club_id})
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    # Check if already in favorites
    existing = await db.favorite_clubs.find_one({"user_id": user["user_id"], "club_id": club_id})
    if existing:
        return {"message": "Already in favorites", "is_favorite": True}
    
    # Add to favorites
    await db.favorite_clubs.insert_one({
        "user_id": user["user_id"],
        "club_id": club_id,
        "created_at": datetime.now(timezone.utc)
    })
    
    return {"message": "Added to favorites", "is_favorite": True}

@api_router.delete("/player/favorite-clubs/{club_id}")
async def remove_favorite_club(club_id: str, user: dict = Depends(get_current_user)):
    """Remove a club from favorites"""
    result = await db.favorite_clubs.delete_one({"user_id": user["user_id"], "club_id": club_id})
    
    if result.deleted_count == 0:
        return {"message": "Not in favorites", "is_favorite": False}
    
    return {"message": "Removed from favorites", "is_favorite": False}

@api_router.get("/player/favorite-clubs/{club_id}/status")
async def check_favorite_status(club_id: str, user: dict = Depends(get_current_user)):
    """Check if a club is in favorites"""
    existing = await db.favorite_clubs.find_one({"user_id": user["user_id"], "club_id": club_id})
    return {"is_favorite": existing is not None}

# ======================= MATCH ENDPOINTS =======================

@api_router.post("/matches")
async def create_match(match_data: MatchCreate, user: dict = Depends(get_current_user)):
    club = await db.clubs.find_one({"admin_user_id": user["user_id"]})
    if not club:
        raise HTTPException(status_code=403, detail="Not a club admin")
    
    # Verify court belongs to club
    court = await db.courts.find_one({"court_id": match_data.court_id, "club_id": club["club_id"]})
    if not court:
        raise HTTPException(status_code=404, detail="Court not found")
    
    match_id = f"match_{uuid.uuid4().hex[:12]}"
    
    match = {
        "match_id": match_id,
        "club_id": club["club_id"],
        "club_name": club["name"],
        "club_city": club["city"],
        **match_data.dict(),
        "court_name": court["name"],
        "current_players": 0,
        "status": "open",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.matches.insert_one(match)
    return {k: v for k, v in match.items() if k != "_id"}

@api_router.get("/matches")
async def list_matches(
    city: Optional[str] = None,
    sport: Optional[str] = None,
    date: Optional[str] = None,
    skill_level: Optional[str] = None,
    club_id: Optional[str] = None,
    status: str = "open",
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    query = {"status": status}
    
    # Filter out past matches - only show today and future
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    now_time = datetime.now(timezone.utc).strftime("%H:%M")
    
    if date:
        # If specific date requested, use that instead
        query["date"] = date
    else:
        # Default: only future matches
        query["date"] = {"$gte": today}
    
    if city:
        query["club_city"] = {"$regex": city, "$options": "i"}
    if sport:
        query["sport"] = sport
    if skill_level and skill_level != "all":
        query["$or"] = [{"skill_level": skill_level}, {"skill_level": "all"}]
    if club_id:
        query["club_id"] = club_id
    
    matches = await db.matches.find(query, {"_id": 0}).sort("date", 1).skip(skip).limit(limit).to_list(limit)
    
    # Filter out today's matches that have already started
    filtered_matches = []
    for match in matches:
        match_date = match.get("date", "")
        match_start_time = match.get("start_time", "00:00")
        
        # If match is today, check if start time has passed
        if match_date == today:
            if match_start_time <= now_time:
                # Skip past matches from today
                continue
        
        # Enrich with participants
        participants = await db.match_participants.find(
            {"match_id": match["match_id"]},
            {"_id": 0}
        ).to_list(20)
        match["participants"] = participants
        filtered_matches.append(match)
    
    # Tag matches from premium clubs (visibility perk) - does NOT change the date-based sort,
    # since "soonest match" must stay the top priority for something people book same-day.
    club_ids_in_page = list({m["club_id"] for m in filtered_matches if m.get("club_id")})
    if club_ids_in_page:
        premium_clubs = await db.clubs.find(
            {"club_id": {"$in": club_ids_in_page}, "subscription_plan": {"$in": list(PREMIUM_PLAN_IDS)}},
            {"_id": 0, "club_id": 1}
        ).to_list(len(club_ids_in_page))
        premium_club_ids = {c["club_id"] for c in premium_clubs}
        for match in filtered_matches:
            match["club_is_premium"] = match["club_id"] in premium_club_ids
    
    return filtered_matches

@api_router.get("/matches/{match_id}")
async def get_match(match_id: str, request: Request):
    match = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Get participants with user info
    participants = await db.match_participants.find({"match_id": match_id}, {"_id": 0}).to_list(20)
    for p in participants:
        user = await db.users.find_one({"user_id": p["user_id"]}, {"_id": 0, "password_hash": 0})
        profile = await db.player_profiles.find_one({"user_id": p["user_id"]}, {"_id": 0})
        p["user"] = user
        p["profile"] = profile
    
    match["participants"] = participants
    
    # Get result if exists
    result = await db.match_results.find_one({"match_id": match_id}, {"_id": 0})
    match["result"] = result
    
    # Get club info
    club = await db.clubs.find_one({"club_id": match["club_id"]}, {"_id": 0})
    if club:
        club["is_premium"] = club.get("subscription_plan") in PREMIUM_PLAN_IDS
    match["club"] = club
    match["club_is_premium"] = bool(club and club.get("is_premium"))
    
    return match

@api_router.post("/matches/{match_id}/join")
async def join_match(match_id: str, user: dict = Depends(get_current_user)):
    match = await db.matches.find_one({"match_id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if match["status"] != "open":
        raise HTTPException(status_code=400, detail="Match is not open for registration")
    
    if match["current_players"] >= match["max_players"]:
        raise HTTPException(status_code=400, detail="Match is full")
    
    # Check if already joined
    existing = await db.match_participants.find_one({
        "match_id": match_id,
        "user_id": user["user_id"]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already joined this match")
    
    participant = {
        "match_id": match_id,
        "user_id": user["user_id"],
        "user_name": user["name"],
        "joined_at": datetime.now(timezone.utc),
        "status": "confirmed"
    }
    
    await db.match_participants.insert_one(participant)
    
    # Update match player count
    new_count = match["current_players"] + 1
    new_status = "full" if new_count >= match["max_players"] else "open"
    
    await db.matches.update_one(
        {"match_id": match_id},
        {"$set": {"current_players": new_count, "status": new_status, "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Create notification for the joining user
    await create_notification(
        user_id=user["user_id"],
        title="Prenotazione confermata",
        message=f"Ti sei iscritto alla partita di {match['sport']} del {match['date']}",
        notification_type=NOTIFICATION_TYPES["BOOKING"],
        match_id=match_id
    )
    
    # Notify other participants that someone joined
    participants = await db.match_participants.find({"match_id": match_id}).to_list(100)
    for p in participants:
        if p["user_id"] != user["user_id"]:
            await create_notification(
                user_id=p["user_id"],
                title="Nuovo giocatore",
                message=f"{user['name']} si è iscritto alla partita di {match['sport']}",
                notification_type=NOTIFICATION_TYPES["MATCH_PLAYER_JOINED"],
                match_id=match_id,
                sender_id=user["user_id"]
            )
    
    # If match is now full, notify the club
    if new_status == "full":
        club = await db.clubs.find_one({"club_id": match["club_id"]})
        if club:
            club_user = await db.users.find_one({"user_id": club.get("admin_user_id")})
            if club_user:
                await create_notification(
                    user_id=club_user["user_id"],
                    title="Partita al completo!",
                    message=f"La partita di {match['sport']} del {match['date']} alle {match['time']} ha raggiunto il numero massimo di giocatori",
                    notification_type=NOTIFICATION_TYPES["MATCH_FULL"],
                    match_id=match_id
                )
    
    return {"message": "Joined successfully", "current_players": new_count, "status": new_status}

@api_router.post("/matches/{match_id}/leave")
async def leave_match(match_id: str, user: dict = Depends(get_current_user)):
    match = await db.matches.find_one({"match_id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if match["status"] == "completed":
        raise HTTPException(status_code=400, detail="Cannot leave a completed match")
    
    result = await db.match_participants.delete_one({
        "match_id": match_id,
        "user_id": user["user_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="Not a participant of this match")
    
    # Update match player count
    new_count = max(0, match["current_players"] - 1)
    
    await db.matches.update_one(
        {"match_id": match_id},
        {"$set": {"current_players": new_count, "status": "open", "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": "Left successfully", "current_players": new_count}

@api_router.put("/matches/{match_id}")
async def update_match(match_id: str, match_data: MatchUpdate, user: dict = Depends(get_current_user)):
    club = await db.clubs.find_one({"admin_user_id": user["user_id"]})
    if not club:
        raise HTTPException(status_code=403, detail="Not a club admin")
    
    update_data = {k: v for k, v in match_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.matches.update_one(
        {"match_id": match_id, "club_id": club["club_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Match not found")
    
    match = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
    return match

@api_router.get("/club/matches")
async def get_club_matches(
    user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    include_past: bool = False,
    limit: int = Query(50, ge=1, le=100)
):
    """
    Get club matches.
    - For open/full: only show today and future
    - For completed: show all (history with confirmed results)
    """
    club = await db.clubs.find_one({"admin_user_id": user["user_id"]})
    if not club:
        raise HTTPException(status_code=403, detail="Not a club admin")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    query = {"club_id": club["club_id"]}
    
    if status:
        query["status"] = status
        # For open/full matches, only show future
        if status in ["open", "full"] and not include_past:
            query["date"] = {"$gte": today}
    else:
        # Default: show only current/future open and full matches
        if not include_past:
            query["$or"] = [
                {"status": "completed"},  # All completed
                {"status": {"$in": ["open", "full"]}, "date": {"$gte": today}}  # Future open/full
            ]
    
    matches = await db.matches.find(query, {"_id": 0}).sort("date", 1).limit(limit).to_list(limit)
    
    for match in matches:
        participants = await db.match_participants.find(
            {"match_id": match["match_id"]},
            {"_id": 0}
        ).to_list(20)
        match["participants"] = participants
        
        # Get result if exists
        result = await db.match_results.find_one({"match_id": match["match_id"]}, {"_id": 0})
        match["result"] = result
    
    return matches

@api_router.get("/club/dashboard")
async def get_club_dashboard(user: dict = Depends(get_current_user)):
    # Search for club by admin_user_id regardless of user role
    club = await db.clubs.find_one({"admin_user_id": user["user_id"]}, {"_id": 0})
    if not club:
        raise HTTPException(status_code=403, detail="Not a club admin")
    
    # Count courts
    courts_count = await db.courts.count_documents({"club_id": club["club_id"], "is_active": True})
    
    # Count matches by status
    open_matches = await db.matches.count_documents({"club_id": club["club_id"], "status": "open"})
    full_matches = await db.matches.count_documents({"club_id": club["club_id"], "status": "full"})
    completed_matches = await db.matches.count_documents({"club_id": club["club_id"], "status": "completed"})
    
    # Count total bookings
    match_ids = await db.matches.distinct("match_id", {"club_id": club["club_id"]})
    total_bookings = await db.match_participants.count_documents({"match_id": {"$in": match_ids}})
    
    return {
        "club": club,
        "stats": {
            "courts_count": courts_count,
            "open_matches": open_matches,
            "full_matches": full_matches,
            "completed_matches": completed_matches,
            "total_bookings": total_bookings
        }
    }

@api_router.get("/club/invite")
async def get_club_invite(user: dict = Depends(get_current_user)):
    """Return the club's invite code/link + how many players joined through it so far,
    so a club admin can invite their existing player base at zero acquisition cost."""
    club = await db.clubs.find_one({"admin_user_id": user["user_id"]}, {"_id": 0})
    if not club:
        raise HTTPException(status_code=403, detail="Not a club admin")
    
    # Backfill: clubs registered before this feature existed won't have a code yet
    referral_code = club.get("referral_code")
    if not referral_code:
        referral_code = await generate_club_referral_code()
        await db.clubs.update_one({"club_id": club["club_id"]}, {"$set": {"referral_code": referral_code}})
    
    deep_link = f"matchsport24://auth/register?ref={referral_code}"
    share_message = (
        f"Gioco su Match Sport 24, l'app per trovare partite di padel, tennis e calcetto al {club['name']}! "
        f"Scarica l'app e usa il codice {referral_code} in fase di iscrizione (o apri questo link se ce l'hai già installata): {deep_link}"
    )
    followers_count = await db.favorite_clubs.count_documents({"club_id": club["club_id"]})
    
    return {
        "referral_code": referral_code,
        "deep_link": deep_link,
        "share_message": share_message,
        "referred_players_count": club.get("referred_players_count", 0),
        "is_premium": club.get("subscription_plan") in PREMIUM_PLAN_IDS,
        "followers_count": followers_count
    }

@api_router.get("/clubs/by-code/{referral_code}")
async def get_club_by_referral_code(referral_code: str):
    """Public lookup used by the registration screen to show 'invited by <club>'."""
    club = await db.clubs.find_one(
        {"referral_code": referral_code.upper()},
        {"_id": 0, "club_id": 1, "name": 1, "city": 1, "logo": 1}
    )
    if not club:
        raise HTTPException(status_code=404, detail="Invite code not found")
    return club

# ======================= PREMIUM: CLUB BROADCAST ENDPOINT =======================

class ClubBroadcastMessage(BaseModel):
    title: str
    message: str

@api_router.post("/club/broadcast")
async def send_club_broadcast(data: ClubBroadcastMessage, user: dict = Depends(get_current_user)):
    """Premium perk: let a club send a message to every player who follows it.
    Free clubs get a clear 403 pointing at the upgrade, everything else about the app stays free."""
    club = await db.clubs.find_one({"admin_user_id": user["user_id"]})
    if not club:
        raise HTTPException(status_code=403, detail="Not a club admin")
    
    if club.get("subscription_plan") not in PREMIUM_PLAN_IDS:
        raise HTTPException(
            status_code=403,
            detail="I messaggi broadcast sono una funzione Premium. Passa a un piano a pagamento per usarla."
        )
    
    title = data.title.strip()
    message = data.message.strip()
    if not title or not message:
        raise HTTPException(status_code=400, detail="Titolo e messaggio sono obbligatori")
    if len(title) > 80 or len(message) > 500:
        raise HTTPException(status_code=400, detail="Titolo o messaggio troppo lunghi")
    
    # Simple anti-spam guardrail: at most one broadcast per club per day.
    # This is a marketing channel to real people who follow the club - protecting it from
    # being spammed protects its value for every premium club, not just this one.
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    recent_count = await db.club_broadcasts.count_documents({"club_id": club["club_id"], "created_at": {"$gte": since}})
    if recent_count >= 1:
        raise HTTPException(status_code=429, detail="Puoi inviare al massimo un messaggio broadcast ogni 24 ore")
    
    favorites = await db.favorite_clubs.find({"club_id": club["club_id"]}, {"_id": 0, "user_id": 1}).to_list(5000)
    recipient_ids = [f["user_id"] for f in favorites]
    
    if recipient_ids:
        await asyncio.gather(*[
            create_notification(
                user_id=uid,
                title=f"{club['name']}: {title}",
                message=message,
                notification_type="club_broadcast"
            )
            for uid in recipient_ids
        ])
    
    await db.club_broadcasts.insert_one({
        "broadcast_id": f"bc_{uuid.uuid4().hex[:12]}",
        "club_id": club["club_id"],
        "title": title,
        "message": message,
        "recipients_count": len(recipient_ids),
        "created_at": datetime.now(timezone.utc)
    })
    
    return {"message": "Messaggio inviato", "recipients_count": len(recipient_ids)}

# ======================= MATCH RESULTS ENDPOINTS =======================

@api_router.post("/matches/{match_id}/result")
async def submit_match_result(match_id: str, result_data: MatchResultSubmit, user: dict = Depends(get_current_user)):
    match = await db.matches.find_one({"match_id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Verify user is participant or club admin
    is_participant = await db.match_participants.find_one({
        "match_id": match_id,
        "user_id": user["user_id"]
    })
    
    club = await db.clubs.find_one({"club_id": match["club_id"], "admin_user_id": user["user_id"]})
    
    if not is_participant and not club:
        raise HTTPException(status_code=403, detail="Not authorized to submit result")
    
    # Check if result already exists
    existing_result = await db.match_results.find_one({"match_id": match_id})
    
    result_id = f"result_{uuid.uuid4().hex[:12]}"
    
    result = {
        "result_id": result_id,
        "match_id": match_id,
        "submitted_by": user["user_id"],
        **result_data.dict(),
        "status": "pending_confirmation",
        "confirmations": [user["user_id"]],
        "created_at": datetime.now(timezone.utc)
    }
    
    if existing_result:
        # Update existing result
        await db.match_results.update_one(
            {"match_id": match_id},
            {"$set": result}
        )
    else:
        await db.match_results.insert_one(result)
    
    # Notify club about result submission
    match_club = await db.clubs.find_one({"club_id": match["club_id"]})
    if match_club:
        club_user = await db.users.find_one({"user_id": match_club.get("admin_user_id")})
        if club_user and club_user["user_id"] != user["user_id"]:
            await create_notification(
                user_id=club_user["user_id"],
                title="Risultato da confermare",
                message=f"{user['name']} ha inserito il risultato della partita di {match['sport']} del {match['date']}",
                notification_type=NOTIFICATION_TYPES["MATCH_RESULT_SUBMITTED"],
                match_id=match_id,
                sender_id=user["user_id"],
                data={"score_a": result_data.score_team_a, "score_b": result_data.score_team_b}
            )
    
    # Notify other participants
    participants = await db.match_participants.find({"match_id": match_id}).to_list(20)
    for p in participants:
        if p["user_id"] != user["user_id"]:
            await create_notification(
                user_id=p["user_id"],
                title="Risultato da confermare",
                message=f"È stato inserito il risultato della partita di {match['sport']}",
                notification_type=NOTIFICATION_TYPES["MATCH_RESULT_SUBMITTED"],
                match_id=match_id,
                sender_id=user["user_id"]
            )
    
    return {k: v for k, v in result.items() if k != "_id"}

@api_router.post("/matches/{match_id}/result/confirm")
async def confirm_match_result(match_id: str, user: dict = Depends(get_current_user)):
    """Player confirmation of match result"""
    # Verify user is participant
    is_participant = await db.match_participants.find_one({
        "match_id": match_id,
        "user_id": user["user_id"]
    })
    
    if not is_participant:
        raise HTTPException(status_code=403, detail="Not a participant")
    
    result = await db.match_results.find_one({"match_id": match_id})
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    
    if user["user_id"] in result.get("confirmations", []):
        raise HTTPException(status_code=400, detail="Already confirmed")
    
    # Add confirmation
    await db.match_results.update_one(
        {"match_id": match_id},
        {"$push": {"confirmations": user["user_id"]}}
    )
    
    result = await db.match_results.find_one({"match_id": match_id})
    
    # Check if enough confirmations (at least 2 or majority)
    participants = await db.match_participants.find({"match_id": match_id}).to_list(20)
    required_confirmations = min(2, len(participants))
    
    if len(result.get("confirmations", [])) >= required_confirmations:
        # Mark result as confirmed
        await db.match_results.update_one(
            {"match_id": match_id},
            {"$set": {"status": "confirmed"}}
        )
        
        await db.matches.update_one(
            {"match_id": match_id},
            {"$set": {"status": "completed", "updated_at": datetime.now(timezone.utc)}}
        )
        
        # Update ratings using shared function
        logger.info(f"Players confirmed result for match {match_id}, updating ratings...")
        await update_player_ratings_after_match(match_id)
        
        # Notify all participants
        match = await db.matches.find_one({"match_id": match_id})
        for p in participants:
            await create_notification(
                user_id=p["user_id"],
                title="Risultato confermato!",
                message=f"Il risultato della partita di {match['sport']} del {match['date']} è stato confermato ufficialmente",
                notification_type=NOTIFICATION_TYPES["MATCH_RESULT_CONFIRMED"],
                match_id=match_id
            )
        
        return {"message": "Result confirmed and ratings updated", "status": "confirmed"}
    
    return {"message": "Confirmation added", "confirmations": len(result.get("confirmations", [])) + 1}

@api_router.post("/club/matches/{match_id}/result/confirm")
async def club_confirm_match_result(match_id: str, user: dict = Depends(get_current_user)):
    """Endpoint for club admin to confirm match result - immediate confirmation WITH rating update"""
    match = await db.matches.find_one({"match_id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Verify user is club admin for this match's club
    club = await db.clubs.find_one({"club_id": match["club_id"]})
    if not club or club.get("admin_user_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized. Only club admin can confirm results.")
    
    result = await db.match_results.find_one({"match_id": match_id})
    if not result:
        raise HTTPException(status_code=404, detail="No result submitted for this match")
    
    if result.get("status") == "confirmed":
        raise HTTPException(status_code=400, detail="Result already confirmed")
    
    # Club admin confirmation is final - mark as confirmed
    await db.match_results.update_one(
        {"match_id": match_id},
        {"$set": {"status": "confirmed", "confirmed_by_club": True, "confirmed_at": datetime.now(timezone.utc)}}
    )
    
    await db.matches.update_one(
        {"match_id": match_id},
        {"$set": {"status": "completed", "updated_at": datetime.now(timezone.utc)}}
    )
    
    # CRITICAL: Update player ratings when club confirms
    logger.info(f"Club confirmed result for match {match_id}, updating player ratings...")
    ratings_updated = await update_player_ratings_after_match(match_id)
    if not ratings_updated:
        logger.warning(f"Failed to update ratings for match {match_id}")
    
    # Notify all participants that result is confirmed
    participants = await db.match_participants.find({"match_id": match_id}).to_list(20)
    for p in participants:
        await create_notification(
            user_id=p["user_id"],
            title="Risultato confermato dal circolo",
            message=f"Il circolo {club['name']} ha confermato il risultato della partita di {match['sport']} del {match['date']}",
            notification_type=NOTIFICATION_TYPES["MATCH_RESULT_CONFIRMED"],
            match_id=match_id
        )
    
    return {"message": "Result confirmed by club", "status": "confirmed", "ratings_updated": ratings_updated}

@api_router.get("/club/matches/pending-results")
async def get_club_pending_results(user: dict = Depends(get_current_user)):
    """Get all matches with pending results for the club admin to confirm"""
    club = await db.clubs.find_one({"admin_user_id": user["user_id"]})
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    # Find all matches for this club with pending results
    matches = await db.matches.find({"club_id": club["club_id"]}).to_list(100)
    match_ids = [m["match_id"] for m in matches]
    
    pending_results = await db.match_results.find({
        "match_id": {"$in": match_ids},
        "status": "pending_confirmation"
    }).to_list(100)
    
    # Enrich with match details
    result_list = []
    for result in pending_results:
        match = next((m for m in matches if m["match_id"] == result["match_id"]), None)
        if match:
            submitter = await db.users.find_one({"user_id": result["submitted_by"]})
            result_list.append({
                **{k: v for k, v in result.items() if k != "_id"},
                "match": {
                    "sport": match["sport"],
                    "date": match["date"],
                    "start_time": match["start_time"],
                    "end_time": match["end_time"],
                    "court_id": match.get("court_id")
                },
                "submitted_by_name": submitter["name"] if submitter else "Unknown"
            })
    
    return result_list

# ======================= TOURNAMENTS (gamification) =======================
# Ogni partita di torneo e' un documento normale nella collezione "matches" (con
# tournament_id/tournament_round in piu'), cosi' eredita gratis tutta la logica gia'
# esistente di sottomissione/conferma risultato, notifiche e aggiornamento ELO -
# vedi l'hook aggiunto in update_player_ratings_after_match per streak/classifica.

class TournamentCreate(BaseModel):
    sport: str
    format: str = "eliminazione"  # "eliminazione" (unico formato v1, girone/americano in futuro)
    date: str  # ISO date
    start_time: str
    max_players: int  # deve essere una potenza di 2 (4, 8, 16...) per il tabellone a eliminazione diretta
    registration_mode: str  # "individual" (padel/tennis) | "team" (calcetto/calcio8)
    team_size: int  # 1 (tennis singolo), 2 (padel/tennis doppio), 5 (calcetto), 8 (calcio8)
    court_ids: List[str] = []  # campi assegnati al torneo, usati per generare le partite

class TournamentTeamCreate(BaseModel):
    team_name: str

def _validate_bracket_size(max_players: int, team_size: int):
    num_teams = max_players // team_size
    if num_teams < 2 or (num_teams & (num_teams - 1)) != 0:
        raise HTTPException(
            status_code=400,
            detail="Il numero di squadre (max_players / team_size) deve essere una potenza di 2 (2, 4, 8, 16...) per il tabellone a eliminazione diretta"
        )

@api_router.post("/tournaments")
async def create_tournament(data: TournamentCreate, user: dict = Depends(get_current_user)):
    club = await db.clubs.find_one({"admin_user_id": user["user_id"]})
    if not club:
        raise HTTPException(status_code=403, detail="Not a club admin")
    if data.sport not in SPORTS:
        raise HTTPException(status_code=400, detail="Sport non valido")
    if data.registration_mode not in ("individual", "team"):
        raise HTTPException(status_code=400, detail="registration_mode deve essere 'individual' o 'team'")
    _validate_bracket_size(data.max_players, data.team_size)

    tournament = {
        "tournament_id": f"trn_{uuid.uuid4().hex[:12]}",
        "club_id": club["club_id"],
        "sport": data.sport,
        "format": data.format,
        "date": data.date,
        "start_time": data.start_time,
        "max_players": data.max_players,
        "current_players": 0,
        "registration_mode": data.registration_mode,
        "team_size": data.team_size,
        "court_ids": data.court_ids,
        "status": "open",
        "created_at": datetime.now(timezone.utc)
    }
    await db.tournaments.insert_one(tournament)
    return {k: v for k, v in tournament.items() if k != "_id"}

@api_router.get("/tournaments")
async def list_tournaments(
    club_id: Optional[str] = None,
    sport: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100)
):
    query = {}
    if club_id: query["club_id"] = club_id
    if sport: query["sport"] = sport
    if status: query["status"] = status
    tournaments = await db.tournaments.find(query, {"_id": 0}).sort("date", 1).to_list(limit)
    return tournaments

@api_router.get("/tournaments/{tournament_id}")
async def get_tournament(tournament_id: str):
    tournament = await db.tournaments.find_one({"tournament_id": tournament_id}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    if tournament["registration_mode"] == "individual":
        participants = await db.tournament_participants.find({"tournament_id": tournament_id}, {"_id": 0}).to_list(200)
        tournament["participants"] = participants
    else:
        teams = await db.tournament_teams.find({"tournament_id": tournament_id}, {"_id": 0}).to_list(50)
        tournament["teams"] = teams

    matches = await db.matches.find({"tournament_id": tournament_id}, {"_id": 0}).sort("tournament_round_order", 1).to_list(200)
    tournament["matches"] = matches
    return tournament

@api_router.post("/tournaments/{tournament_id}/join")
async def join_tournament_individual(tournament_id: str, user: dict = Depends(get_current_user)):
    """Iscrizione individuale - per padel/tennis (registration_mode='individual')."""
    tournament = await db.tournaments.find_one({"tournament_id": tournament_id})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    if tournament["registration_mode"] != "individual":
        raise HTTPException(status_code=400, detail="Questo torneo richiede l'iscrizione a squadra, usa /teams")
    if tournament["status"] != "open":
        raise HTTPException(status_code=400, detail="Le iscrizioni sono chiuse")
    if tournament["current_players"] >= tournament["max_players"]:
        raise HTTPException(status_code=400, detail="Torneo al completo")

    existing = await db.tournament_participants.find_one({"tournament_id": tournament_id, "user_id": user["user_id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Sei gia' iscritto")

    await db.tournament_participants.insert_one({
        "tournament_id": tournament_id,
        "user_id": user["user_id"],
        "joined_at": datetime.now(timezone.utc)
    })
    new_count = tournament["current_players"] + 1
    update = {"current_players": new_count}
    if new_count >= tournament["max_players"]:
        update["status"] = "full"
    await db.tournaments.update_one({"tournament_id": tournament_id}, {"$set": update})
    return {"message": "Iscrizione avvenuta", "current_players": new_count}

@api_router.post("/tournaments/{tournament_id}/teams")
async def create_tournament_team(tournament_id: str, data: TournamentTeamCreate, user: dict = Depends(get_current_user)):
    """Crea una squadra e ti unisci come capitano - per calcetto/calcio8 (registration_mode='team')."""
    tournament = await db.tournaments.find_one({"tournament_id": tournament_id})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    if tournament["registration_mode"] != "team":
        raise HTTPException(status_code=400, detail="Questo torneo ha iscrizione individuale, usa /join")
    if tournament["status"] != "open":
        raise HTTPException(status_code=400, detail="Le iscrizioni sono chiuse")

    num_teams = tournament["max_players"] // tournament["team_size"]
    existing_teams = await db.tournament_teams.count_documents({"tournament_id": tournament_id})
    if existing_teams >= num_teams:
        raise HTTPException(status_code=400, detail="Numero massimo di squadre raggiunto")

    team = {
        "team_id": f"team_{uuid.uuid4().hex[:10]}",
        "tournament_id": tournament_id,
        "team_name": data.team_name,
        "captain_user_id": user["user_id"],
        "member_user_ids": [user["user_id"]],
        "created_at": datetime.now(timezone.utc)
    }
    await db.tournament_teams.insert_one(team)
    await db.tournaments.update_one({"tournament_id": tournament_id}, {"$inc": {"current_players": 1}})
    return {k: v for k, v in team.items() if k != "_id"}

@api_router.post("/tournaments/{tournament_id}/teams/{team_id}/join")
async def join_tournament_team(tournament_id: str, team_id: str, user: dict = Depends(get_current_user)):
    tournament = await db.tournaments.find_one({"tournament_id": tournament_id})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    team = await db.tournament_teams.find_one({"team_id": team_id, "tournament_id": tournament_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if user["user_id"] in team["member_user_ids"]:
        raise HTTPException(status_code=400, detail="Sei gia' in questa squadra")
    if len(team["member_user_ids"]) >= tournament["team_size"]:
        raise HTTPException(status_code=400, detail="Squadra al completo")

    await db.tournament_teams.update_one({"team_id": team_id}, {"$push": {"member_user_ids": user["user_id"]}})
    await db.tournaments.update_one({"tournament_id": tournament_id}, {"$inc": {"current_players": 1}})

    updated_tournament = await db.tournaments.find_one({"tournament_id": tournament_id})
    if updated_tournament["current_players"] >= updated_tournament["max_players"]:
        await db.tournaments.update_one({"tournament_id": tournament_id}, {"$set": {"status": "full"}})
    return {"message": "Ti sei unito alla squadra"}

ROUND_NAMES = {1: "finale", 2: "semifinale", 4: "quarti", 8: "ottavi", 16: "sedicesimi"}

@api_router.post("/tournaments/{tournament_id}/generate-bracket")
async def generate_bracket(tournament_id: str, user: dict = Depends(get_current_user)):
    """Il club admin chiude le iscrizioni e genera il tabellone (assegnazione random)."""
    tournament = await db.tournaments.find_one({"tournament_id": tournament_id})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    club = await db.clubs.find_one({"club_id": tournament["club_id"]})
    if not club or club["admin_user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Solo l'admin del circolo puo' generare il tabellone")
    if tournament["status"] not in ("open", "full"):
        raise HTTPException(status_code=400, detail="Il tabellone e' gia' stato generato")

    import random
    if tournament["registration_mode"] == "individual":
        participants = await db.tournament_participants.find({"tournament_id": tournament_id}).to_list(200)
        player_ids = [p["user_id"] for p in participants]
        random.shuffle(player_ids)
        team_size = tournament["team_size"]
        entrants = [player_ids[i:i+team_size] for i in range(0, len(player_ids), team_size)]
    else:
        teams = await db.tournament_teams.find({"tournament_id": tournament_id}).to_list(50)
        entrants = [t["member_user_ids"] for t in teams]

    num_entrants = len(entrants)
    if num_entrants < 2 or (num_entrants & (num_entrants - 1)) != 0:
        raise HTTPException(status_code=400, detail=f"Servono un numero di squadre/coppie potenza di 2 (trovate {num_entrants})")

    random.shuffle(entrants)
    round_name = ROUND_NAMES.get(num_entrants // 2, f"round da {num_entrants}")
    courts = tournament.get("court_ids") or [None]

    created_matches = []
    for i in range(0, num_entrants, 2):
        team_a, team_b = entrants[i], entrants[i+1]
        match_id = f"match_{uuid.uuid4().hex[:12]}"
        match = {
            "match_id": match_id,
            "club_id": tournament["club_id"],
            "sport": tournament["sport"],
            "format": tournament["sport"],
            "court_id": courts[(i // 2) % len(courts)],
            "date": tournament["date"],
            "start_time": tournament["start_time"],
            "end_time": tournament["start_time"],
            "duration_minutes": 60,
            "max_players": len(team_a) + len(team_b),
            "current_players": len(team_a) + len(team_b),
            "skill_level": "all",
            "price_per_player": 0.0,
            "status": "full",
            "tournament_id": tournament_id,
            "tournament_round": round_name,
            "tournament_round_order": num_entrants,  # piu' alto = round piu' precoce, usato per ordinare
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.matches.insert_one(match)
        for uid in team_a + team_b:
            await db.match_participants.insert_one({
                "match_id": match_id, "user_id": uid,
                "team": "A" if uid in team_a else "B",
                "joined_at": datetime.now(timezone.utc)
            })
        created_matches.append(match_id)

    await db.tournaments.update_one({"tournament_id": tournament_id}, {"$set": {"status": "in_progress"}})
    return {"message": "Tabellone generato", "round": round_name, "matches_created": len(created_matches)}

async def advance_tournament_bracket(tournament_id: str, completed_match_id: str):
    """Chiamata dopo la conferma di un risultato di una partita di torneo: se tutto il round
    e' completo, genera il round successivo pescando i vincitori; se era la finale, chiude
    il torneo e assegna il bonus punti/badge."""
    completed_match = await db.matches.find_one({"match_id": completed_match_id})
    if not completed_match:
        return
    round_order = completed_match.get("tournament_round_order")

    round_matches = await db.matches.find({
        "tournament_id": tournament_id, "tournament_round_order": round_order
    }).to_list(50)
    if any(m["status"] != "completed" for m in round_matches):
        return  # round non ancora finito, aspettiamo le altre partite

    winners = []
    for m in round_matches:
        result = await db.match_results.find_one({"match_id": m["match_id"]})
        if not result:
            continue
        participants = await db.match_participants.find({"match_id": m["match_id"]}).to_list(20)
        team = result.get("winner_team")
        winners.append([p["user_id"] for p in participants if p.get("team") == team])

    tournament = await db.tournaments.find_one({"tournament_id": tournament_id})

    if len(winners) == 1:
        # Era la finale: torneo completato, bonus al team vincitore
        champions = winners[0]
        for uid in champions:
            await db.club_leaderboard.update_one(
                {"club_id": tournament["club_id"], "user_id": uid},
                {"$inc": {"points": 100}, "$set": {"updated_at": datetime.now(timezone.utc)}},
                upsert=True
            )
            await db.player_badges.insert_one({
                "badge_id": f"badge_{uuid.uuid4().hex[:10]}",
                "user_id": uid, "club_id": tournament["club_id"],
                "badge_type": "torneo_vinto", "tournament_id": tournament_id,
                "earned_at": datetime.now(timezone.utc)
            })
            await create_notification(
                user_id=uid, title="🏆 Hai vinto il torneo!",
                message="Complimenti, sei il campione! +100 punti classifica.",
                notification_type="tournament_won"
            )
        await db.tournaments.update_one({"tournament_id": tournament_id}, {"$set": {"status": "completed"}})
        return

    # Round successivo: badge di partecipazione al round raggiunto + pairing random dei vincitori
    import random
    random.shuffle(winners)
    next_round_order = round_order // 2
    round_name = ROUND_NAMES.get(next_round_order, f"round da {next_round_order*2}")
    courts = tournament.get("court_ids") or [None]

    for i in range(0, len(winners), 2):
        team_a, team_b = winners[i], winners[i+1]
        match_id = f"match_{uuid.uuid4().hex[:12]}"
        match = {
            "match_id": match_id, "club_id": tournament["club_id"], "sport": tournament["sport"],
            "format": tournament["sport"], "court_id": courts[(i // 2) % len(courts)],
            "date": tournament["date"], "start_time": tournament["start_time"], "end_time": tournament["start_time"],
            "duration_minutes": 60, "max_players": len(team_a) + len(team_b), "current_players": len(team_a) + len(team_b),
            "skill_level": "all", "price_per_player": 0.0, "status": "full",
            "tournament_id": tournament_id, "tournament_round": round_name, "tournament_round_order": next_round_order,
            "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)
        }
        await db.matches.insert_one(match)
        for uid in team_a + team_b:
            await db.match_participants.insert_one({
                "match_id": match_id, "user_id": uid, "team": "A" if uid in team_a else "B",
                "joined_at": datetime.now(timezone.utc)
            })
            await create_notification(
                user_id=uid, title=f"⚔️ Sei in {round_name}!",
                message="Hai vinto il turno precedente, la prossima sfida ti aspetta.",
                notification_type="tournament_advance"
            )

@api_router.get("/clubs/{club_id}/leaderboard")
async def get_club_leaderboard(club_id: str, period: str = Query("all_time", regex="^(week|month|all_time)$"), limit: int = Query(20, ge=1, le=100)):
    """Classifica del circolo. Nota v1: 'week'/'month' filtrano sui punti totali correnti
    (non c'e' ancora uno storico segmentato per periodo - prossimo passo se serve davvero)."""
    entries = await db.club_leaderboard.find({"club_id": club_id}, {"_id": 0}).sort("points", -1).to_list(limit)
    for e in entries:
        user = await db.users.find_one({"user_id": e["user_id"]}, {"_id": 0, "name": 1})
        e["name"] = user["name"] if user else "Giocatore"
        streak = await db.player_streaks.find_one({"user_id": e["user_id"]}, {"_id": 0})
        e["current_streak"] = streak["current_streak"] if streak else 0
    return entries

@api_router.get("/player/streak")
async def get_my_streak(user: dict = Depends(get_current_user)):
    streak = await db.player_streaks.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not streak:
        return {"current_streak": 0, "best_streak": 0}
    return streak

@api_router.get("/player/badges")
async def get_my_badges(user: dict = Depends(get_current_user)):
    badges = await db.player_badges.find({"user_id": user["user_id"]}, {"_id": 0}).sort("earned_at", -1).to_list(100)
    return badges

# ======================= CHAT ENDPOINTS =======================

@api_router.get("/matches/{match_id}/chat")
async def get_match_chat(match_id: str, user: dict = Depends(get_current_user)):
    # Verify user is participant
    is_participant = await db.match_participants.find_one({
        "match_id": match_id,
        "user_id": user["user_id"]
    })
    
    if not is_participant:
        raise HTTPException(status_code=403, detail="Not a participant")
    
    # Check if match is active (not completed more than 24h ago)
    match = await db.matches.find_one({"match_id": match_id})
    if match and match.get("status") == "completed":
        completed_at = match.get("updated_at", datetime.now(timezone.utc))
        if isinstance(completed_at, str):
            completed_at = datetime.fromisoformat(completed_at)
        if completed_at.tzinfo is None:
            completed_at = completed_at.replace(tzinfo=timezone.utc)
        
        if datetime.now(timezone.utc) - completed_at > timedelta(hours=24):
            raise HTTPException(status_code=400, detail="Chat is no longer available")
    
    messages = await db.chat_messages.find(
        {"match_id": match_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    
    return messages

@api_router.post("/matches/{match_id}/chat")
async def send_chat_message(match_id: str, message: ChatMessage, user: dict = Depends(get_current_user)):
    # Check if match exists first
    match = await db.matches.find_one({"match_id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Partita non trovata")
    
    # Verify user is participant OR is the club admin who created the match
    is_participant = await db.match_participants.find_one({
        "match_id": match_id,
        "user_id": user["user_id"]
    })
    
    # Also check if user is the club admin for this match
    is_club_admin = False
    if match.get("club_id"):
        club = await db.clubs.find_one({"club_id": match["club_id"]})
        if club and club.get("admin_user_id") == user["user_id"]:
            is_club_admin = True
    
    if not is_participant and not is_club_admin:
        raise HTTPException(status_code=403, detail="Devi essere iscritto alla partita per inviare messaggi")
    
    # Check if match is active
    if match.get("status") == "completed":
        completed_at = match.get("updated_at", datetime.now(timezone.utc))
        if isinstance(completed_at, str):
            completed_at = datetime.fromisoformat(completed_at)
        if completed_at.tzinfo is None:
            completed_at = completed_at.replace(tzinfo=timezone.utc)
        
        if datetime.now(timezone.utc) - completed_at > timedelta(hours=24):
            raise HTTPException(status_code=400, detail="Chat is no longer available")
    
    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    
    chat_message = {
        "message_id": message_id,
        "match_id": match_id,
        "user_id": user["user_id"],
        "user_name": user["name"],
        "content": message.content,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.chat_messages.insert_one(chat_message)
    
    # Emit socket event
    await sio.emit(f"chat_{match_id}", {k: v for k, v in chat_message.items() if k != "_id"})
    
    # Send push notifications to other participants (excluding sender)
    participants = await db.match_participants.find({"match_id": match_id}).to_list(20)
    for p in participants:
        if p["user_id"] != user["user_id"]:
            await create_notification(
                user_id=p["user_id"],
                title=f"Nuovo messaggio da {user['name']}",
                message=message.content[:100] + ("..." if len(message.content) > 100 else ""),
                notification_type=NOTIFICATION_TYPES["MATCH_CHAT_MESSAGE"],
                match_id=match_id,
                sender_id=user["user_id"]
            )
    
    return {k: v for k, v in chat_message.items() if k != "_id"}

# ======================= NOTIFICATIONS ENDPOINTS =======================

@api_router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user), limit: int = Query(20, ge=1, le=100)):
    notifications = await db.notifications.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    result = await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user["user_id"]},
        {"$set": {"is_read": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Marked as read"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": user["user_id"]},
        {"$set": {"is_read": True}}
    )
    return {"message": "All notifications marked as read"}

# ======================= PROMO CODE ENDPOINTS =======================

class PromoCodeValidate(BaseModel):
    code: str

# Promo code types:
# - trial_months: gives X months free trial
# - percentage: gives X% discount
PROMO_CODES = {
    "TRIAL3MESI": {"type": "trial_months", "value": 3, "description": "3 mesi di prova gratuita"},
    "SCONTO20": {"type": "percentage", "value": 20, "description": "Sconto 20%"},
    "SCONTO50": {"type": "percentage", "value": 50, "description": "Sconto 50%"},
    "WELCOME10": {"type": "percentage", "value": 10, "description": "Sconto di benvenuto 10%"}
}

@api_router.post("/promo/validate")
async def validate_promo_code(data: PromoCodeValidate):
    code = data.code.upper().strip()
    
    if code not in PROMO_CODES:
        return {"valid": False, "message": "Codice promozionale non valido"}
    
    promo = PROMO_CODES[code]
    
    if promo["type"] == "trial_months":
        return {
            "valid": True,
            "code": code,
            "type": "trial_months",
            "value": promo["value"],
            "discount": 100,  # 100% discount for trial
            "message": f"Codice valido! {promo['description']}"
        }
    elif promo["type"] == "percentage":
        return {
            "valid": True,
            "code": code,
            "type": "percentage",
            "value": promo["value"],
            "discount": promo["value"],
            "message": f"Codice valido! {promo['description']}"
        }
    
    return {"valid": False, "message": "Codice non valido"}

@api_router.post("/promo/apply-trial")
async def apply_trial_promo(data: PromoCodeValidate, user: dict = Depends(get_current_user)):
    """Apply a trial promo code directly to the club subscription"""
    code = data.code.upper().strip()
    
    if code not in PROMO_CODES:
        raise HTTPException(status_code=400, detail="Codice promozionale non valido")
    
    promo = PROMO_CODES[code]
    
    if promo["type"] != "trial_months":
        raise HTTPException(status_code=400, detail="Questo codice non è valido per una prova gratuita")
    
    # Get club
    club = await db.clubs.find_one({"admin_user_id": user["user_id"]})
    if not club:
        raise HTTPException(status_code=403, detail="Non sei un amministratore di un circolo")
    
    # Check if promo was already used by this club
    existing = await db.promo_usage.find_one({"club_id": club["club_id"], "code": code})
    if existing:
        raise HTTPException(status_code=400, detail="Questo codice è già stato utilizzato")
    
    # Apply the trial
    trial_months = promo["value"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=trial_months * 30)
    
    await db.clubs.update_one(
        {"club_id": club["club_id"]},
        {
            "$set": {
                "subscription_status": "trial",
                "subscription_plan": f"trial_{trial_months}m",
                "subscription_expires_at": expires_at,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    
    # Record promo usage
    await db.promo_usage.insert_one({
        "club_id": club["club_id"],
        "code": code,
        "used_at": datetime.now(timezone.utc)
    })
    
    return {
        "success": True,
        "message": f"Prova gratuita di {trial_months} mesi attivata!",
        "expires_at": expires_at.isoformat()
    }

# ======================= SUBSCRIPTION & PAYMENT ENDPOINTS =======================

@api_router.get("/subscription/plans")
async def get_subscription_plans():
    return SUBSCRIPTION_PLANS

@api_router.post("/subscription/checkout")
async def create_subscription_checkout(request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    plan_id = body.get("plan_id")
    origin_url = body.get("origin_url")
    
    if plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    plan = SUBSCRIPTION_PLANS[plan_id]
    
    # Get club
    club = await db.clubs.find_one({"admin_user_id": user["user_id"]})
    if not club:
        raise HTTPException(status_code=403, detail="Not a club admin")
    
    success_url = f"{origin_url}/club/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/club/subscription"
    
    session = await asyncio.to_thread(
        stripe.checkout.Session.create,
        mode="payment",
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "eur",
                "product_data": {"name": f"Match Sport 24 - {plan['name']}"},
                "unit_amount": int(round(plan["price"] * 100)),  # Stripe wants amounts in cents
            },
            "quantity": 1,
        }],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user["user_id"],
            "club_id": club["club_id"],
            "plan_id": plan_id
        }
    )
    
    # Create payment transaction record
    transaction = {
        "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
        "session_id": session.id,
        "user_id": user["user_id"],
        "club_id": club["club_id"],
        "plan_id": plan_id,
        "amount": plan["price"],
        "currency": "eur",
        "payment_status": "initiated",
        "created_at": datetime.now(timezone.utc)
    }
    await db.payment_transactions.insert_one(transaction)
    
    return {"url": session.url, "session_id": session.id}

@api_router.get("/subscription/status/{session_id}")
async def get_subscription_status(session_id: str, user: dict = Depends(get_current_user)):
    session = await asyncio.to_thread(stripe.checkout.Session.retrieve, session_id)
    
    # Update transaction
    if session.payment_status == "paid":
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        if transaction and transaction.get("payment_status") != "paid":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc)}}
            )
            
            # Update club subscription
            plan_id = transaction.get("plan_id")
            if plan_id in SUBSCRIPTION_PLANS:
                plan = SUBSCRIPTION_PLANS[plan_id]
                expires_at = datetime.now(timezone.utc) + timedelta(days=plan["duration_days"])
                
                await db.clubs.update_one(
                    {"club_id": transaction["club_id"]},
                    {
                        "$set": {
                            "subscription_status": "active",
                            "subscription_plan": plan_id,
                            "subscription_expires_at": expires_at,
                            "updated_at": datetime.now(timezone.utc)
                        }
                    }
                )
    
    return {
        "status": session.status,
        "payment_status": session.payment_status,
        "amount_total": session.amount_total,
        "currency": session.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    try:
        if STRIPE_WEBHOOK_SECRET:
            event = await asyncio.to_thread(
                stripe.Webhook.construct_event, body, signature, STRIPE_WEBHOOK_SECRET
            )
        else:
            # No webhook secret configured yet: parse without signature verification.
            # This still works but is insecure - set STRIPE_WEBHOOK_SECRET (from the
            # Stripe Dashboard > Developers > Webhooks > your endpoint) as soon as possible.
            logger.warning("STRIPE_WEBHOOK_SECRET not set - webhook signature not verified")
            event = json.loads(body)
        
        if event.get("type") == "checkout.session.completed":
            session = event["data"]["object"]
            
            if session.get("payment_status") == "paid":
                session_id = session["id"]
                transaction = await db.payment_transactions.find_one({"session_id": session_id})
                if transaction and transaction.get("payment_status") != "paid":
                    await db.payment_transactions.update_one(
                        {"session_id": session_id},
                        {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc)}}
                    )
                    
                    metadata = session.get("metadata", {})
                    plan_id = metadata.get("plan_id")
                    club_id = metadata.get("club_id")
                    
                    if plan_id in SUBSCRIPTION_PLANS and club_id:
                        plan = SUBSCRIPTION_PLANS[plan_id]
                        expires_at = datetime.now(timezone.utc) + timedelta(days=plan["duration_days"])
                        
                        await db.clubs.update_one(
                            {"club_id": club_id},
                            {
                                "$set": {
                                    "subscription_status": "active",
                                    "subscription_plan": plan_id,
                                    "subscription_expires_at": expires_at,
                                    "updated_at": datetime.now(timezone.utc)
                                }
                            }
                        )
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

# ======================= IN-APP PURCHASE ENDPOINTS (iOS/Android) =======================

class IAPValidationRequest(BaseModel):
    platform: str  # 'ios' or 'android'
    product_id: str  # e.g., 'com.matchsport24.subscription.monthly.v2'
    transaction_id: str
    receipt: str  # iOS receipt data or Android purchase token
    plan_id: str  # 'monthly' or 'yearly'

@api_router.post("/subscription/iap/validate")
async def validate_iap_purchase(request: IAPValidationRequest, user: dict = Depends(get_current_user)):
    """
    Validate and activate an In-App Purchase subscription.
    Supports both iOS (StoreKit) and Android (Google Play Billing).
    """
    logger.info(f"[IAP] Validating purchase for user {user['user_id']}: platform={request.platform}, product={request.product_id}")
    
    # Check if this is a club user
    club = await db.clubs.find_one({"admin_user_id": user["user_id"]})
    if not club:
        raise HTTPException(status_code=400, detail="Solo i circoli possono sottoscrivere abbonamenti")
    
    # Validate platform
    if request.platform not in ["ios", "android"]:
        raise HTTPException(status_code=400, detail="Piattaforma non supportata")
    
    # Map product_id to plan_id
    plan_id = request.plan_id
    if plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Piano non valido")
    
    # Check for duplicate transaction
    existing_transaction = await db.iap_transactions.find_one({
        "transaction_id": request.transaction_id,
        "status": "completed"
    })
    if existing_transaction:
        logger.warning(f"[IAP] Duplicate transaction: {request.transaction_id}")
        return {
            "success": True,
            "message": "Acquisto già elaborato",
            "subscription_status": club.get("subscription_status", "active"),
            "already_processed": True
        }
    
    # Store the transaction
    transaction_record = {
        "transaction_id": request.transaction_id,
        "user_id": user["user_id"],
        "club_id": club["club_id"],
        "platform": request.platform,
        "product_id": request.product_id,
        "plan_id": plan_id,
        "receipt": request.receipt[:500] if request.receipt else None,  # Store partial receipt for reference
        "status": "pending",
        "created_at": datetime.now(timezone.utc)
    }
    
    try:
        # In a production environment, you would validate the receipt with Apple/Google servers
        # For iOS: https://buy.itunes.apple.com/verifyReceipt
        # For Android: Google Play Developer API
        
        # For this implementation, we trust the client-side validation
        # and activate the subscription immediately
        # In production, add proper server-side receipt validation
        
        # Get plan details
        plan = SUBSCRIPTION_PLANS[plan_id]
        expires_at = datetime.now(timezone.utc) + timedelta(days=plan["duration_days"])
        
        # Activate subscription
        await db.clubs.update_one(
            {"club_id": club["club_id"]},
            {
                "$set": {
                    "subscription_status": "active",
                    "subscription_plan": plan_id,
                    "subscription_expires_at": expires_at,
                    "subscription_source": f"iap_{request.platform}",
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # Mark transaction as completed
        transaction_record["status"] = "completed"
        transaction_record["activated_at"] = datetime.now(timezone.utc)
        transaction_record["expires_at"] = expires_at
        await db.iap_transactions.insert_one(transaction_record)
        
        logger.info(f"[IAP] Subscription activated for club {club['club_id']}: plan={plan_id}, expires={expires_at}")
        
        return {
            "success": True,
            "message": "Abbonamento attivato con successo!",
            "subscription_status": "active",
            "subscription_plan": plan_id,
            "subscription_expires_at": expires_at.isoformat(),
            "club_id": club["club_id"]
        }
        
    except Exception as e:
        logger.error(f"[IAP] Validation error: {e}")
        transaction_record["status"] = "failed"
        transaction_record["error"] = str(e)
        await db.iap_transactions.insert_one(transaction_record)
        raise HTTPException(status_code=500, detail="Errore durante la validazione dell'acquisto")

@api_router.post("/subscription/iap/restore")
async def restore_iap_purchases(user: dict = Depends(get_current_user)):
    """
    Restore In-App Purchase subscriptions.
    Called when user wants to restore previous purchases.
    """
    logger.info(f"[IAP] Restore request for user {user['user_id']}")
    
    club = await db.clubs.find_one({"admin_user_id": user["user_id"]})
    if not club:
        raise HTTPException(status_code=400, detail="Solo i circoli possono gestire abbonamenti")
    
    # Check for existing active IAP transactions for this user
    active_transaction = await db.iap_transactions.find_one({
        "user_id": user["user_id"],
        "status": "completed",
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    })
    
    if active_transaction:
        # Reactivate subscription from stored transaction
        plan_id = active_transaction.get("plan_id")
        expires_at = active_transaction.get("expires_at")
        
        await db.clubs.update_one(
            {"club_id": club["club_id"]},
            {
                "$set": {
                    "subscription_status": "active",
                    "subscription_plan": plan_id,
                    "subscription_expires_at": expires_at,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        logger.info(f"[IAP] Restored subscription for club {club['club_id']}")
        
        return {
            "success": True,
            "message": "Abbonamento ripristinato con successo!",
            "subscription_status": "active",
            "subscription_plan": plan_id,
            "subscription_expires_at": expires_at.isoformat() if expires_at else None
        }
    
    # No active subscription found
    return {
        "success": False,
        "message": "Nessun abbonamento attivo da ripristinare",
        "subscription_status": club.get("subscription_status", "none")
    }

@api_router.get("/subscription/iap/status")
async def get_iap_subscription_status(user: dict = Depends(get_current_user)):
    """Get current IAP subscription status for the club."""
    club = await db.clubs.find_one({"admin_user_id": user["user_id"]})
    if not club:
        raise HTTPException(status_code=400, detail="Circolo non trovato")
    
    return {
        "subscription_status": club.get("subscription_status", "none"),
        "subscription_plan": club.get("subscription_plan"),
        "subscription_expires_at": club.get("subscription_expires_at").isoformat() if club.get("subscription_expires_at") else None,
        "subscription_source": club.get("subscription_source", "unknown"),
        "is_active": club.get("subscription_status") == "active"
    }

# ======================= ADMIN ENDPOINTS =======================

@api_router.get("/admin/matches")
async def admin_get_matches(user: dict = Depends(get_current_user), limit: int = Query(50, ge=1, le=200)):
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    matches = await db.matches.find({}, {"_id": 0}).limit(limit).to_list(limit)
    return matches

@api_router.put("/admin/users/{user_id}")
async def admin_update_user(user_id: str, request: Request, user: dict = Depends(get_current_user)):
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    body = await request.json()
    allowed_fields = ["is_active", "role"]
    update_data = {k: v for k, v in body.items() if k in allowed_fields}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    result = await db.users.update_one({"user_id": user_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User updated"}

# ======================= UTILITY ENDPOINTS =======================

@api_router.get("/cities")
async def get_cities():
    """Get list of cities with clubs - cached for 10 minutes"""
    cache_key = "cities_list"
    cached = cache.get(cache_key)
    if cached:
        return cached
    
    cities = await db.clubs.distinct("city")
    result = sorted([c for c in cities if c])
    cache.set(cache_key, result, ttl_seconds=600)  # 10 minutes
    return result

@api_router.get("/sports")
async def get_sports():
    """Get available sports - cached indefinitely (static data)"""
    return SPORTS

@api_router.get("/sports/durations")
async def get_sports_durations():
    """Get match duration in minutes for each sport - static data"""
    return MATCH_DURATIONS

# ======================= ADMIN ENDPOINTS =======================

@api_router.get("/admin/stats")
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
    """Get admin dashboard statistics (super_admin only)"""
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Count users
        total_users = await db.users.count_documents({})
        total_players = await db.users.count_documents({"role": "player"})
        total_clubs = await db.clubs.count_documents({})
        total_matches = await db.matches.count_documents({})
        
        # Active paid subscriptions - read from the clubs themselves (the real source of truth:
        # Stripe checkout and IAP validation both write subscription_plan/subscription_expires_at
        # directly on the club document; the old "club_subscriptions" collection this used to
        # query is never written to anywhere, so that count was always zero).
        now = datetime.now(timezone.utc)
        premium_plan_clubs = await db.clubs.find(
            {"subscription_plan": {"$in": list(PREMIUM_PLAN_IDS)}},
            {"_id": 0, "subscription_plan": 1, "subscription_expires_at": 1}
        ).to_list(10000)
        active_premium_clubs = [
            c for c in premium_plan_clubs
            if c.get("subscription_expires_at") and c["subscription_expires_at"] > now
        ]
        active_subscriptions = len(active_premium_clubs)
        premium_clubs = len(premium_plan_clubs)
        free_clubs = total_clubs - premium_clubs
        
        # Monthly-equivalent revenue: normalize yearly plans to a per-month figure so
        # "revenue_month" is a fair MRR-like number instead of assuming everyone is monthly.
        revenue_month = 0.0
        for c in active_premium_clubs:
            plan = SUBSCRIPTION_PLANS.get(c["subscription_plan"])
            if plan:
                revenue_month += plan["price"] / (plan["duration_days"] / 30)
        revenue_month = round(revenue_month, 2)
        
        # Recent registrations (last 7 days)
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        recent_registrations = await db.users.count_documents({
            "created_at": {"$gte": seven_days_ago}
        })
        
        # Matches today
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        matches_today = await db.matches.count_documents({
            "date": {"$gte": today_start.strftime("%Y-%m-%d"), "$lt": today_end.strftime("%Y-%m-%d")}
        })
        
        # Growth-channel metrics (business model pivot: is the free invite channel working?)
        total_referred_players = await db.club_referrals.count_documents({})
        clubs_using_invites = len(await db.club_referrals.distinct("club_id"))
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        broadcasts_sent_month = await db.club_broadcasts.count_documents({"created_at": {"$gte": thirty_days_ago}})
        
        return {
            "total_users": total_users,
            "total_players": total_players,
            "total_clubs": total_clubs,
            "total_matches": total_matches,
            "active_subscriptions": active_subscriptions,
            "recent_registrations": recent_registrations,
            "matches_today": matches_today,
            "revenue_month": revenue_month,
            "free_clubs": free_clubs,
            "premium_clubs": premium_clubs,
            "total_referred_players": total_referred_players,
            "clubs_using_invites": clubs_using_invites,
            "broadcasts_sent_month": broadcasts_sent_month
        }
    except Exception as e:
        logger.error(f"Error fetching admin stats: {e}")
        return {
            "total_users": 0,
            "total_players": 0,
            "total_clubs": 0,
            "total_matches": 0,
            "active_subscriptions": 0,
            "recent_registrations": 0,
            "matches_today": 0,
            "revenue_month": 0,
            "free_clubs": 0,
            "premium_clubs": 0,
            "total_referred_players": 0,
            "clubs_using_invites": 0,
            "broadcasts_sent_month": 0
        }

@api_router.get("/admin/users")
async def get_admin_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    role: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all users (super_admin only)"""
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    if role:
        query["role"] = role
    
    cursor = db.users.find(query).skip(skip).limit(limit).sort("created_at", -1)
    users = []
    async for user in cursor:
        users.append({
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "is_active": user.get("is_active", True),
            "created_at": user.get("created_at", "").isoformat() if isinstance(user.get("created_at"), datetime) else str(user.get("created_at", ""))
        })
    
    return users

@api_router.patch("/admin/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    status_update: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update user active status (super_admin only)"""
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"is_active": status_update.get("is_active", True)}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User status updated"}

@api_router.get("/admin/clubs")
async def get_admin_clubs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Get all clubs with stats (super_admin only)"""
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    cursor = db.clubs.find({}).skip(skip).limit(limit).sort("created_at", -1)
    now = datetime.now(timezone.utc)
    clubs = []
    async for club in cursor:
        # Get courts count
        courts_count = await db.courts.count_documents({"club_id": club["club_id"]})
        # Get matches count
        matches_count = await db.matches.count_documents({"club_id": club["club_id"]})
        
        # Subscription status lives on the club document itself (Stripe/IAP write it there
        # directly) - the separate "club_subscriptions" collection this used to read from
        # is never populated by any code path.
        plan = club.get("subscription_plan")
        expires_at = club.get("subscription_expires_at")
        is_premium = plan in PREMIUM_PLAN_IDS and bool(expires_at and expires_at > now)
        
        clubs.append({
            "club_id": club["club_id"],
            "name": club["name"],
            "city": club.get("city", ""),
            "address": club.get("address", ""),
            "courts_count": courts_count,
            "matches_count": matches_count,
            "subscription_status": club.get("subscription_status", "active"),
            "subscription_plan": plan,
            "subscription_expires": expires_at.isoformat() if expires_at else None,
            "is_premium": is_premium,
            "referred_players_count": club.get("referred_players_count", 0)
        })
    
    return clubs

# ======================= LOCAL SPONSORS =======================
# A small, honest ad product: local businesses (a racket shop, a sports bar, a physio near
# the club) sponsor a slot shown to players in that city. This is sold directly by the app
# owner, not through an ad network - so there's no self-serve purchase flow, just admin
# management + a public read endpoint for the app to display active sponsors.

class LocalSponsorCreate(BaseModel):
    business_name: str
    tagline: Optional[str] = None
    logo_url: Optional[str] = None
    link_url: Optional[str] = None
    phone: Optional[str] = None
    city: str

class LocalSponsorUpdate(BaseModel):
    business_name: Optional[str] = None
    tagline: Optional[str] = None
    logo_url: Optional[str] = None
    link_url: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    is_active: Optional[bool] = None

@api_router.post("/admin/sponsors")
async def create_local_sponsor(data: LocalSponsorCreate, user: dict = Depends(get_current_user)):
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    sponsor = {
        "sponsor_id": f"sponsor_{uuid.uuid4().hex[:12]}",
        **data.dict(),
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    await db.local_sponsors.insert_one(sponsor)
    cache.delete(f"sponsors:{sponsor['city'].lower()}")
    return {k: v for k, v in sponsor.items() if k != "_id"}

@api_router.get("/admin/sponsors")
async def list_local_sponsors_admin(
    city: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    sponsors = await db.local_sponsors.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return sponsors

@api_router.patch("/admin/sponsors/{sponsor_id}")
async def update_local_sponsor(sponsor_id: str, data: LocalSponsorUpdate, user: dict = Depends(get_current_user)):
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    sponsor = await db.local_sponsors.find_one({"sponsor_id": sponsor_id})
    if not sponsor:
        raise HTTPException(status_code=404, detail="Sponsor not found")
    
    await db.local_sponsors.update_one({"sponsor_id": sponsor_id}, {"$set": update_data})
    
    # Invalidate the cache for both the old and new city, in case the city changed
    cache.delete(f"sponsors:{sponsor['city'].lower()}")
    if "city" in update_data:
        cache.delete(f"sponsors:{update_data['city'].lower()}")
    
    updated = await db.local_sponsors.find_one({"sponsor_id": sponsor_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/sponsors/{sponsor_id}")
async def delete_local_sponsor(sponsor_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    sponsor = await db.local_sponsors.find_one({"sponsor_id": sponsor_id})
    if not sponsor:
        raise HTTPException(status_code=404, detail="Sponsor not found")
    
    await db.local_sponsors.delete_one({"sponsor_id": sponsor_id})
    cache.delete(f"sponsors:{sponsor['city'].lower()}")
    return {"message": "Sponsor deleted"}

@api_router.get("/sponsors")
async def get_active_sponsors(city: str = Query(...), limit: int = Query(3, ge=1, le=10)):
    """Public endpoint: active sponsors for a city, shown to players browsing that area."""
    cache_key = f"sponsors:{city.lower()}"
    cached = cache.get(cache_key)
    if cached:
        return cached[:limit]
    
    sponsors = await db.local_sponsors.find(
        {"city": {"$regex": f"^{city}$", "$options": "i"}, "is_active": True},
        {"_id": 0}
    ).to_list(20)
    cache.set(cache_key, sponsors, ttl_seconds=300)
    return sponsors[:limit]

@api_router.get("/")
async def root():
    return {"message": "Match Sport 24 API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# ======================= LEGAL PAGES (Apple App Store Compliance) =======================

@api_router.get("/privacy", response_class=HTMLResponse)
async def privacy_policy():
    """Privacy Policy page - Required for Apple App Store"""
    return """
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - Match Sport 24</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #0F172A; color: #F8FAFC; }
        h1 { color: #10B981; }
        h2 { color: #10B981; margin-top: 30px; }
        p, li { line-height: 1.6; color: #CBD5E1; }
        .updated { color: #64748B; font-style: italic; }
    </style>
</head>
<body>
    <h1>Privacy Policy</h1>
    <p class="updated">Ultimo aggiornamento: Marzo 2026</p>
    
    <h2>1. Informazioni Raccolte</h2>
    <p>Match Sport 24 raccoglie le seguenti informazioni:</p>
    <ul>
        <li>Email e nome per la creazione dell'account</li>
        <li>Foto del profilo (opzionale)</li>
        <li>Informazioni sul circolo sportivo per i gestori</li>
        <li>Dati di utilizzo dell'app per migliorare il servizio</li>
    </ul>
    
    <h2>2. Utilizzo delle Informazioni</h2>
    <p>Utilizziamo le informazioni raccolte per:</p>
    <ul>
        <li>Fornire e migliorare i nostri servizi</li>
        <li>Gestire il tuo account e abbonamento</li>
        <li>Comunicare aggiornamenti importanti</li>
        <li>Garantire la sicurezza della piattaforma</li>
    </ul>
    
    <h2>3. Condivisione dei Dati</h2>
    <p>Non vendiamo i tuoi dati personali. Condividiamo informazioni solo:</p>
    <ul>
        <li>Con fornitori di servizi necessari (pagamenti, hosting)</li>
        <li>Quando richiesto dalla legge</li>
        <li>Con il tuo consenso esplicito</li>
    </ul>
    
    <h2>4. Sicurezza</h2>
    <p>Implementiamo misure di sicurezza tecniche e organizzative per proteggere i tuoi dati, inclusa la crittografia delle comunicazioni e l'accesso limitato ai dati personali.</p>
    
    <h2>5. I Tuoi Diritti</h2>
    <p>Hai il diritto di:</p>
    <ul>
        <li>Accedere ai tuoi dati personali</li>
        <li>Correggere dati inesatti</li>
        <li>Richiedere la cancellazione del tuo account</li>
        <li>Esportare i tuoi dati</li>
    </ul>
    
    <h2>6. Cancellazione Account</h2>
    <p>Puoi richiedere la cancellazione del tuo account in qualsiasi momento attraverso le Impostazioni dell'app. Tutti i tuoi dati verranno eliminati entro 30 giorni dalla richiesta, salvo obblighi legali di conservazione.</p>
    
    <h2>7. Abbonamenti</h2>
    <p>Gli abbonamenti sono gestiti tramite App Store (iOS) o Google Play (Android). I pagamenti vengono processati direttamente da Apple o Google. L'abbonamento si rinnova automaticamente a meno che non venga annullato almeno 24 ore prima della fine del periodo corrente.</p>
    
    <h2>8. Contatti</h2>
    <p>Per domande sulla privacy, contattaci a: support@matchsport24.com</p>
    
    <p style="margin-top: 50px; text-align: center; color: #64748B;">&copy; 2026 Match Sport 24. Tutti i diritti riservati.</p>
</body>
</html>
"""

@api_router.get("/terms", response_class=HTMLResponse)
async def terms_of_use():
    """Terms of Use page - Redirects to Apple Standard EULA"""
    return """
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Termini di Utilizzo - Match Sport 24</title>
    <meta http-equiv="refresh" content="0;url=https://www.apple.com/legal/internet-services/itunes/dev/stdeula/">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #0F172A; color: #F8FAFC; text-align: center; }
        a { color: #10B981; }
    </style>
</head>
<body>
    <h1>Termini di Utilizzo</h1>
    <p>Stai per essere reindirizzato ai Termini di Utilizzo Standard Apple.</p>
    <p><a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/">Clicca qui se non vieni reindirizzato automaticamente</a></p>
</body>
</html>
"""

# Include the router in the main app
app.include_router(api_router)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Socket.IO events
@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

@sio.event
async def join_match_chat(sid, data):
    match_id = data.get("match_id")
    if match_id:
        await sio.enter_room(sid, f"chat_{match_id}")
        logger.info(f"Client {sid} joined chat room: chat_{match_id}")

@sio.event
async def leave_match_chat(sid, data):
    match_id = data.get("match_id")
    if match_id:
        await sio.leave_room(sid, f"chat_{match_id}")
        logger.info(f"Client {sid} left chat room: chat_{match_id}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

@app.on_event("startup")
async def startup_tasks():
    """Initialize database indexes and demo accounts on startup"""
    logger.info("=== Starting Match Sport 24 Backend ===")
    
    # Create database indexes for optimal performance
    await create_database_indexes()
    
    # Create demo accounts
    await startup_create_demo_accounts()
    
    # Cleanup past data
    await cleanup_past_matches()
    
    logger.info("=== Startup completed ===")

async def create_database_indexes():
    """Create MongoDB indexes for optimal query performance"""
    logger.info("Creating database indexes...")
    
    try:
        # Users collection
        await db.users.create_index("user_id", unique=True)
        await db.users.create_index("email", unique=True)
        await db.users.create_index("role")
        
        # Clubs collection
        await db.clubs.create_index("club_id", unique=True)
        await db.clubs.create_index("admin_user_id")
        await db.clubs.create_index("city")
        await db.clubs.create_index("is_active")
        await db.clubs.create_index([("city", 1), ("is_active", 1)])
        await db.clubs.create_index("referral_code", unique=True, sparse=True)
        
        # Club referrals indexes (growth attribution)
        await db.club_referrals.create_index("club_id")
        await db.club_referrals.create_index("user_id")
        
        # Club broadcasts indexes (premium perk rate-limiting)
        await db.club_broadcasts.create_index([("club_id", 1), ("created_at", -1)])
        
        # Local sponsors indexes
        await db.local_sponsors.create_index("sponsor_id", unique=True)
        await db.local_sponsors.create_index([("city", 1), ("is_active", 1)])
        
        # Tournaments (gamification) indexes
        await db.tournaments.create_index("tournament_id", unique=True)
        await db.tournaments.create_index([("club_id", 1), ("status", 1)])
        await db.tournament_participants.create_index([("tournament_id", 1), ("user_id", 1)], unique=True)
        await db.tournament_teams.create_index("team_id", unique=True)
        await db.tournament_teams.create_index("tournament_id")
        await db.matches.create_index([("tournament_id", 1), ("tournament_round_order", 1)])
        await db.club_leaderboard.create_index([("club_id", 1), ("user_id", 1)], unique=True)
        await db.club_leaderboard.create_index([("club_id", 1), ("points", -1)])
        await db.player_streaks.create_index("user_id", unique=True)
        await db.player_badges.create_index("user_id")
        
        # Courts collection
        await db.courts.create_index("court_id", unique=True)
        await db.courts.create_index("club_id")
        await db.courts.create_index("sport")
        await db.courts.create_index([("club_id", 1), ("is_active", 1)])
        
        # Matches collection - critical for search performance
        await db.matches.create_index("match_id", unique=True)
        await db.matches.create_index("club_id")
        await db.matches.create_index("court_id")
        await db.matches.create_index("status")
        await db.matches.create_index("date")
        await db.matches.create_index("sport")
        await db.matches.create_index([("status", 1), ("date", 1)])  # Compound for filtering
        await db.matches.create_index([("club_id", 1), ("date", 1)])
        await db.matches.create_index([("sport", 1), ("status", 1), ("date", 1)])  # Search queries
        
        # Match participants
        await db.match_participants.create_index([("match_id", 1), ("user_id", 1)], unique=True)
        await db.match_participants.create_index("user_id")
        await db.match_participants.create_index("match_id")
        
        # Match results
        await db.match_results.create_index("match_id", unique=True)
        await db.match_results.create_index("status")
        await db.match_results.create_index([("status", 1), ("match_id", 1)])
        
        # Player ratings - critical for leaderboards
        await db.player_ratings.create_index([("user_id", 1), ("sport", 1)], unique=True)
        await db.player_ratings.create_index([("sport", 1), ("rating", -1)])  # Leaderboard query
        
        # Rating history
        await db.player_rating_history.create_index("user_id")
        await db.player_rating_history.create_index([("user_id", 1), ("sport", 1), ("created_at", -1)])
        
        # Notifications - important for quick retrieval
        await db.notifications.create_index("user_id")
        await db.notifications.create_index([("user_id", 1), ("is_read", 1)])
        await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
        
        # Chat messages
        await db.chat_messages.create_index("match_id")
        await db.chat_messages.create_index([("match_id", 1), ("created_at", 1)])
        
        # Password resets - TTL index for automatic cleanup
        await db.password_resets.create_index("token", unique=True)
        await db.password_resets.create_index("expires_at", expireAfterSeconds=0)  # Auto-delete expired
        
        # Favorite clubs
        await db.favorite_clubs.create_index([("user_id", 1), ("club_id", 1)], unique=True)
        await db.favorite_clubs.create_index("user_id")
        
        # Reviews - CRITICAL: unique constraint user+club
        await db.reviews.create_index("review_id", unique=True)
        await db.reviews.create_index([("user_id", 1), ("club_id", 1)], unique=True)
        await db.reviews.create_index("club_id")
        await db.reviews.create_index([("club_id", 1), ("status", 1), ("created_at", -1)])
        await db.reviews.create_index([("club_id", 1), ("status", 1), ("rating", -1)])
        
        # Review reports
        await db.review_reports.create_index("report_id", unique=True)
        await db.review_reports.create_index("review_id")
        await db.review_reports.create_index([("review_id", 1), ("reported_by", 1)], unique=True)
        
        logger.info("Database indexes created successfully!")
        
    except Exception as e:
        logger.warning(f"Error creating indexes (may already exist): {e}")

async def startup_create_demo_accounts():
    """Create demo accounts on startup if they don't exist"""
    logger.info("Checking demo accounts...")
    
    # Create Apple Reviewer account
    apple_reviewer = await db.users.find_one({"email": "reviewer@apple.com"})
    if not apple_reviewer:
        logger.info("Creating Apple Reviewer account...")
        apple_user = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": "reviewer@apple.com",
            "password_hash": pwd_context.hash("AppleReview2024!"),
            "name": "Apple Reviewer",
            "role": "player",
            "is_active": True,
            "language": "it",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        await db.users.insert_one(apple_user)
        
        # Create player profile
        profile = {
            "user_id": apple_user["user_id"],
            "bio": "Apple App Store Reviewer",
            "city": "Roma",
            "preferred_sports": ["padel", "tennis"],
            "skill_level": "intermediate",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        await db.player_profiles.insert_one(profile)
        logger.info("Apple Reviewer account created successfully!")
    else:
        logger.info("Apple Reviewer account already exists")
    
    # Create Demo Club account
    demo_club = await db.users.find_one({"email": "demo@club.com"})
    if not demo_club:
        logger.info("Creating Demo Club account...")
        demo_club_user = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": "demo@club.com",
            "password_hash": pwd_context.hash("DemoClub2024!"),
            "name": "Demo Club Admin",
            "role": "club",
            "is_active": True,
            "language": "it",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        await db.users.insert_one(demo_club_user)
        
        # Create club
        demo_club_data = {
            "club_id": f"club_{uuid.uuid4().hex[:12]}",
            "admin_user_id": demo_club_user["user_id"],
            "name": "Centro Sportivo Demo",
            "description": "Centro sportivo dimostrativo con campi da padel, tennis e calcetto. Prenota la tua partita!",
            "address": "Via Roma 123",
            "city": "Roma",
            "phone": "+39 06 1234567",
            "email": "demo@club.com",
            "website": "https://matchsport24.com",
            "is_active": True,
            "subscription_status": "active",
            "subscription_plan": "premium",
            "rating_average": 4.5,
            "reviews_count": 0,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        await db.clubs.insert_one(demo_club_data)
        
        # Create demo courts
        courts = [
            {"name": "Campo Padel 1", "sport": "padel", "surface": "erba_sintetica", "indoor": False},
            {"name": "Campo Padel 2", "sport": "padel", "surface": "erba_sintetica", "indoor": True},
            {"name": "Campo Tennis", "sport": "tennis", "surface": "terra_rossa", "indoor": False},
            {"name": "Campo Calcetto", "sport": "calcetto", "surface": "erba_sintetica", "indoor": False},
        ]
        for court in courts:
            court_data = {
                "court_id": f"court_{uuid.uuid4().hex[:12]}",
                "club_id": demo_club_data["club_id"],
                "name": court["name"],
                "sport": court["sport"],
                "surface": court["surface"],
                "indoor": court["indoor"],
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
            }
            await db.courts.insert_one(court_data)
        
        logger.info("Demo Club account created successfully!")
    else:
        logger.info("Demo Club account already exists")
    
    # Clean up past matches
    await cleanup_past_matches()

async def cleanup_past_matches():
    """
    Clean up past matches with proper logic:
    1. Matches that were "full" but past → mark as "completed"
    2. Matches that were "open" (not full) and past → DELETE completely (not archived)
    3. Only matches with confirmed results go to player history
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    logger.info(f"Cleaning up past matches (before {today})...")
    
    deleted_count = 0
    completed_count = 0
    
    # 1. Find all past matches that are "open" (not enough players) - DELETE THEM
    past_open_matches = await db.matches.find({
        "date": {"$lt": today},
        "status": "open"
    }).to_list(1000)
    
    for match in past_open_matches:
        match_id = match.get("match_id")
        # Delete the match and all related data completely - NOT archived
        await db.matches.delete_one({"match_id": match_id})
        await db.match_participants.delete_many({"match_id": match_id})
        await db.chat_messages.delete_many({"match_id": match_id})
        await db.match_results.delete_many({"match_id": match_id})
        deleted_count += 1
    
    # 2. Find all past matches that are "full" but not yet "completed" - mark as completed
    past_full_matches = await db.matches.find({
        "date": {"$lt": today},
        "status": "full"
    }).to_list(1000)
    
    for match in past_full_matches:
        match_id = match.get("match_id")
        # Mark as completed so it appears in history
        await db.matches.update_one(
            {"match_id": match_id},
            {"$set": {"status": "completed", "updated_at": datetime.now(timezone.utc)}}
        )
        completed_count += 1
    
    # 3. Clean up any stray "pending" or other status matches that are past
    past_other_matches = await db.matches.find({
        "date": {"$lt": today},
        "status": {"$nin": ["open", "full", "completed", "cancelled"]}
    }).to_list(1000)
    
    for match in past_other_matches:
        match_id = match.get("match_id")
        current_players = match.get("current_players", 0)
        max_players = match.get("max_players", 4)
        
        if current_players >= max_players:
            # Was full - mark completed
            await db.matches.update_one(
                {"match_id": match_id},
                {"$set": {"status": "completed"}}
            )
            completed_count += 1
        else:
            # Was not full - delete
            await db.matches.delete_one({"match_id": match_id})
            await db.match_participants.delete_many({"match_id": match_id})
            await db.chat_messages.delete_many({"match_id": match_id})
            deleted_count += 1
    
    logger.info(f"Cleanup complete: {deleted_count} deleted, {completed_count} marked as completed")

async def archive_old_data():
    """Archive old data to keep main collections lean
    This should be called periodically (e.g., weekly) via a cron job
    """
    from datetime import timedelta
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=90)
    cutoff_str = cutoff_date.strftime("%Y-%m-%d")
    
    logger.info(f"Archiving data older than {cutoff_str}...")
    
    # Archive old completed matches (keep last 90 days in main collection)
    old_matches = await db.matches.find({
        "date": {"$lt": cutoff_str},
        "status": "completed"
    }).to_list(5000)
    
    if old_matches:
        # Insert into archive collection
        for match in old_matches:
            match["archived_at"] = datetime.now(timezone.utc)
        await db.matches_archive.insert_many(old_matches)
        
        # Delete from main collection
        match_ids = [m["match_id"] for m in old_matches]
        await db.matches.delete_many({"match_id": {"$in": match_ids}})
        logger.info(f"Archived {len(old_matches)} old matches")
    
    # Archive old chat messages (older than 90 days)
    old_messages = await db.chat_messages.find({
        "created_at": {"$lt": cutoff_date}
    }).to_list(10000)
    
    if old_messages:
        for msg in old_messages:
            msg["archived_at"] = datetime.now(timezone.utc)
        await db.chat_messages_archive.insert_many(old_messages)
        await db.chat_messages.delete_many({"created_at": {"$lt": cutoff_date}})
        logger.info(f"Archived {len(old_messages)} old chat messages")
    
    # Archive old notifications (older than 30 days and read)
    notif_cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    old_notifs = await db.notifications.find({
        "created_at": {"$lt": notif_cutoff},
        "is_read": True
    }).to_list(10000)
    
    if old_notifs:
        for notif in old_notifs:
            notif["archived_at"] = datetime.now(timezone.utc)
        await db.notifications_archive.insert_many(old_notifs)
        await db.notifications.delete_many({
            "created_at": {"$lt": notif_cutoff},
            "is_read": True
        })
        logger.info(f"Archived {len(old_notifs)} old notifications")
    
    logger.info("Archive process completed")

@api_router.post("/admin/archive-old-data")
async def trigger_archive(user: dict = Depends(get_current_user)):
    """Admin endpoint to manually trigger data archival"""
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await archive_old_data()
    return {"message": "Archive process completed"}

@api_router.get("/admin/db-stats")
async def get_db_stats(user: dict = Depends(get_current_user)):
    """Get database statistics for monitoring"""
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    stats = {
        "users": await db.users.count_documents({}),
        "clubs": await db.clubs.count_documents({}),
        "courts": await db.courts.count_documents({}),
        "matches_active": await db.matches.count_documents({"status": {"$in": ["open", "full"]}}),
        "matches_completed": await db.matches.count_documents({"status": "completed"}),
        "matches_archived": await db.matches_archive.count_documents({}) if "matches_archive" in await db.list_collection_names() else 0,
        "notifications_unread": await db.notifications.count_documents({"is_read": False}),
        "chat_messages": await db.chat_messages.count_documents({}),
    }
    return stats

@api_router.get("/admin/cache-stats")
async def get_cache_stats(user: dict = Depends(get_current_user)):
    """Get cache statistics"""
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return {
        "cached_keys": len(cache._cache),
        "keys": list(cache._cache.keys())[:50],  # Show first 50 keys
    }

@api_router.post("/admin/cache-clear")
async def clear_cache(user: dict = Depends(get_current_user)):
    """Clear all cache"""
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    cache.clear()
    return {"message": "Cache cleared"}

# Mount socket app
app.mount("/socket.io", socket_app)
