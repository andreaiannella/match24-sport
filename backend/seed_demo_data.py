#!/usr/bin/env python3
"""
Script to populate the database with demo data for Match Sport 24
Run: python seed_demo_data.py
"""
import asyncio
import random
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from dotenv import load_dotenv

load_dotenv()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client.matchsport24

# Demo data
ITALIAN_CITIES = [
    {"name": "Milano", "region": "Lombardia"},
    {"name": "Roma", "region": "Lazio"},
    {"name": "Napoli", "region": "Campania"},
    {"name": "Torino", "region": "Piemonte"},
    {"name": "Firenze", "region": "Toscana"},
    {"name": "Bologna", "region": "Emilia-Romagna"},
    {"name": "Verona", "region": "Veneto"},
    {"name": "Palermo", "region": "Sicilia"},
]

CLUB_NAMES = [
    "Sporting Club", "Tennis & Padel Center", "Sport Village",
    "Racquet Club", "Athletic Center", "Padel Arena",
    "Sport Club", "Tennis Academy", "Match Point Club", "Game Set"
]

FIRST_NAMES = [
    "Marco", "Luca", "Alessandro", "Andrea", "Matteo",
    "Francesco", "Lorenzo", "Davide", "Simone", "Federico",
    "Giulia", "Chiara", "Sara", "Francesca", "Elena",
    "Valentina", "Martina", "Alessia", "Sofia", "Anna"
]

LAST_NAMES = [
    "Rossi", "Russo", "Ferrari", "Esposito", "Bianchi",
    "Romano", "Colombo", "Ricci", "Marino", "Greco",
    "Bruno", "Gallo", "Conti", "De Luca", "Costa"
]

SPORTS = ["padel", "tennis", "calcetto", "calcio8"]
SKILL_LEVELS = ["beginner", "intermediate", "advanced", "all"]

def generate_id(prefix):
    import secrets
    return f"{prefix}_{secrets.token_hex(6)}"

async def clear_demo_data():
    """Clear existing demo data"""
    print("🗑️  Clearing existing demo data...")
    # We'll only clear data with is_demo=True flag
    await db.users.delete_many({"is_demo": True})
    await db.player_profiles.delete_many({"is_demo": True})
    await db.clubs.delete_many({"is_demo": True})
    await db.courts.delete_many({"is_demo": True})
    await db.matches.delete_many({"is_demo": True})
    await db.match_participants.delete_many({"is_demo": True})
    await db.player_ratings.delete_many({"is_demo": True})
    print("✅ Demo data cleared")

async def create_demo_players(count=25):
    """Create demo player accounts"""
    print(f"👥 Creating {count} demo players...")
    players = []
    
    for i in range(count):
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)
        name = f"{first_name} {last_name}"
        email = f"demo.player{i+1}@matchsport24.test"
        user_id = generate_id("user")
        
        user = {
            "user_id": user_id,
            "email": email,
            "password_hash": pwd_context.hash("Demo123!"),
            "name": name,
            "role": "player",
            "is_active": True,
            "is_demo": True,
            "language": "it",
            "created_at": datetime.now(timezone.utc) - timedelta(days=random.randint(1, 90)),
            "updated_at": datetime.now(timezone.utc),
        }
        
        city = random.choice(ITALIAN_CITIES)
        profile = {
            "user_id": user_id,
            "bio": f"Appassionato di sport, gioco principalmente a {random.choice(['padel', 'tennis', 'calcetto'])}",
            "city": city["name"],
            "phone": f"+39 3{random.randint(10, 99)} {random.randint(100, 999)} {random.randint(1000, 9999)}",
            "preferred_sports": random.sample(SPORTS, k=random.randint(1, 3)),
            "skill_level": random.choice(["beginner", "intermediate", "advanced"]),
            "is_demo": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        
        await db.users.insert_one(user)
        await db.player_profiles.insert_one(profile)
        
        # Create ratings for each sport
        for sport in SPORTS:
            rating = {
                "user_id": user_id,
                "sport": sport,
                "rating": random.randint(1000, 1600),
                "matches_played": random.randint(0, 30),
                "wins": random.randint(0, 20),
                "losses": random.randint(0, 15),
                "draws": random.randint(0, 5),
                "is_demo": True,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
            await db.player_ratings.insert_one(rating)
        
        players.append({"user_id": user_id, "name": name, "city": city["name"]})
    
    print(f"✅ Created {count} demo players")
    return players

async def create_demo_clubs(count=8):
    """Create demo clubs with courts"""
    print(f"🏢 Creating {count} demo clubs...")
    clubs = []
    
    for i, city in enumerate(ITALIAN_CITIES[:count]):
        club_name = f"{random.choice(CLUB_NAMES)} {city['name']}"
        club_id = generate_id("club")
        admin_id = generate_id("user")
        
        # Create club admin user
        admin_user = {
            "user_id": admin_id,
            "email": f"club{i+1}@matchsport24.test",
            "password_hash": pwd_context.hash("Demo123!"),
            "name": f"Admin {club_name}",
            "role": "club_admin",
            "is_active": True,
            "is_demo": True,
            "language": "it",
            "created_at": datetime.now(timezone.utc) - timedelta(days=random.randint(30, 180)),
            "updated_at": datetime.now(timezone.utc),
        }
        await db.users.insert_one(admin_user)
        
        # Create club
        club = {
            "club_id": club_id,
            "admin_user_id": admin_id,
            "name": club_name,
            "description": f"Il miglior centro sportivo di {city['name']}. Campi di ultima generazione per padel, tennis e calcetto.",
            "address": f"Via dello Sport {random.randint(1, 100)}",
            "city": city["name"],
            "region": city["region"],
            "country": "Italia",
            "phone": f"+39 0{random.randint(2, 9)} {random.randint(1000, 9999)} {random.randint(1000, 9999)}",
            "email": f"info@{club_name.lower().replace(' ', '')}.it",
            "subscription_status": random.choice(["active", "trial", "active"]),
            "subscription_plan": random.choice(["monthly", "yearly"]),
            "subscription_expires_at": datetime.now(timezone.utc) + timedelta(days=random.randint(30, 365)),
            "is_demo": True,
            "created_at": datetime.now(timezone.utc) - timedelta(days=random.randint(30, 180)),
            "updated_at": datetime.now(timezone.utc),
        }
        await db.clubs.insert_one(club)
        
        # Create courts for the club
        court_count = random.randint(3, 6)
        club_courts = []
        for j in range(court_count):
            sport = random.choice(["padel", "tennis", "calcetto"])
            court = {
                "court_id": generate_id("court"),
                "club_id": club_id,
                "name": f"Campo {j+1} - {sport.capitalize()}",
                "sport": sport,
                "surface": random.choice(["erba sintetica", "cemento", "terra rossa", "indoor"]),
                "is_indoor": random.choice([True, False]),
                "is_active": True,
                "hourly_rate": random.randint(20, 50),
                "is_demo": True,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
            await db.courts.insert_one(court)
            club_courts.append(court)
        
        clubs.append({
            "club_id": club_id,
            "name": club_name,
            "city": city["name"],
            "admin_id": admin_id,
            "courts": club_courts
        })
    
    print(f"✅ Created {count} demo clubs with courts")
    return clubs

async def create_demo_matches(clubs, players, count=20):
    """Create demo matches"""
    print(f"🎾 Creating {count} demo matches...")
    
    statuses = ["open", "open", "open", "full", "completed", "cancelled"]
    
    for i in range(count):
        club = random.choice(clubs)
        court = random.choice(club["courts"])
        sport = court["sport"]
        
        # Determine max players based on sport
        max_players_map = {
            "padel": 4,
            "tennis": random.choice([2, 4]),
            "calcetto": 10,
            "calcio8": 16
        }
        max_players = max_players_map.get(sport, 4)
        
        status = random.choice(statuses)
        
        # Date: past for completed, future for open/full
        if status == "completed":
            match_date = datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30))
        else:
            match_date = datetime.now(timezone.utc) + timedelta(days=random.randint(1, 14))
        
        start_hour = random.randint(9, 20)
        
        match_id = generate_id("match")
        match = {
            "match_id": match_id,
            "club_id": club["club_id"],
            "club_name": club["name"],
            "club_city": club["city"],
            "court_id": court["court_id"],
            "court_name": court["name"],
            "sport": sport,
            "date": match_date.strftime("%Y-%m-%d"),
            "start_time": f"{start_hour:02d}:00",
            "end_time": f"{start_hour + 1:02d}:30",
            "max_players": max_players,
            "current_players": 0,
            "skill_level": random.choice(SKILL_LEVELS),
            "price_per_player": float(random.randint(5, 15)),
            "status": status,
            "created_by": club["admin_id"],
            "is_demo": True,
            "created_at": datetime.now(timezone.utc) - timedelta(days=random.randint(1, 7)),
            "updated_at": datetime.now(timezone.utc),
        }
        
        # Add participants
        if status in ["full", "completed"]:
            num_participants = max_players
        elif status == "open":
            num_participants = random.randint(1, max_players - 1)
        else:
            num_participants = random.randint(0, max_players)
        
        match["current_players"] = num_participants
        await db.matches.insert_one(match)
        
        # Select random players as participants
        match_players = random.sample(players, min(num_participants, len(players)))
        for player in match_players:
            participant = {
                "match_id": match_id,
                "user_id": player["user_id"],
                "user_name": player["name"],
                "status": "confirmed",
                "is_demo": True,
                "joined_at": datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 48)),
            }
            await db.match_participants.insert_one(participant)
    
    print(f"✅ Created {count} demo matches")

async def create_super_admin():
    """Create super admin account if not exists"""
    print("👑 Creating super admin account...")
    
    existing = await db.users.find_one({"email": "admin@matchsport24.com"})
    if existing:
        print("✅ Super admin already exists")
        return
    
    admin = {
        "user_id": generate_id("user"),
        "email": "admin@matchsport24.com",
        "password_hash": pwd_context.hash("Admin123!"),
        "name": "Super Admin",
        "role": "super_admin",
        "is_active": True,
        "language": "it",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(admin)
    print("✅ Super admin created (email: admin@matchsport24.com, password: Admin123!)")

async def create_apple_reviewer():
    """Create Apple App Store reviewer account"""
    print("🍎 Creating Apple Reviewer account...")
    
    existing = await db.users.find_one({"email": "reviewer@apple.com"})
    if existing:
        print("✅ Apple Reviewer account already exists")
        return
    
    reviewer = {
        "user_id": generate_id("user"),
        "email": "reviewer@apple.com",
        "password_hash": pwd_context.hash("AppleReview2024!"),
        "name": "Apple Reviewer",
        "role": "player",
        "is_active": True,
        "language": "it",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(reviewer)
    
    # Create player profile for reviewer
    profile = {
        "user_id": reviewer["user_id"],
        "bio": "Apple App Store Reviewer",
        "city": "Roma",
        "preferred_sports": ["padel", "tennis"],
        "skill_level": "intermediate",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await db.player_profiles.insert_one(profile)
    
    print("✅ Apple Reviewer created (email: reviewer@apple.com, password: AppleReview2024!)")

async def main():
    print("=" * 50)
    print("🚀 Match Sport 24 - Demo Data Seeder")
    print("=" * 50)
    
    # Clear old demo data
    await clear_demo_data()
    
    # Create demo data
    players = await create_demo_players(25)
    clubs = await create_demo_clubs(8)
    await create_demo_matches(clubs, players, 20)
    await create_super_admin()
    await create_apple_reviewer()
    
    print("=" * 50)
    print("✅ Demo data seeding complete!")
    print("=" * 50)
    print("\n📝 Test Accounts:")
    print("   Player: demo.player1@matchsport24.test / Demo123!")
    print("   Club:   club1@matchsport24.test / Demo123!")
    print("   Admin:  admin@matchsport24.com / Admin123!")
    print("   🍎 Apple Reviewer: reviewer@apple.com / AppleReview2024!")
    print("")

if __name__ == "__main__":
    asyncio.run(main())
