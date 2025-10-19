from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
client = MongoClient(MONGO_URI)

# Database and Collections
db = client['ecampus_db']
user_collection = db['users']
sub_collection = db['subjects']

def init_db():
    """Initialize database with indexes"""
    # Create indexes for faster queries
    user_collection.create_index('rollNo', unique=True)
    sub_collection.create_index('subject_code', unique=True)
    print("Database initialized successfully")

if __name__ == "__main__":
    init_db()
