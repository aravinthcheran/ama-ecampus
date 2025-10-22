from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
import os
from dotenv import load_dotenv
from scrapers.login import login
from scrapers.marks_scraper import get_ca_marks
from scrapers.attendance_scraper import get_attendance
import json
import logging
import time
import certifi
from pymongo import MongoClient
from datetime import datetime

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection setup
MONGO_URI = os.getenv('MONGO_URI', 'mongodb+srv://22z212:TfVGyfVhyjG8hkNJ@cluster0.gbcugd2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')

def create_mongo_client():
    """Create MongoDB client with robust connection settings"""
    try:
        client = MongoClient(
            MONGO_URI,
            connectTimeoutMS=60000,
            socketTimeoutMS=60000,
            serverSelectionTimeoutMS=60000,
            maxPoolSize=50,
            minPoolSize=5,
            maxIdleTimeMS=300000,
            retryWrites=True,
            retryReads=True,
            tlsCAFile=certifi.where(),
            heartbeatFrequencyMS=10000,
            compressors=['zstd', 'zlib', 'snappy']
        )
        
        # Test the connection
        client.admin.command('ping')
        logger.info("✓ MongoDB connection established successfully")
        return client
    except Exception as e:
        logger.error(f"Failed to create MongoDB client: {e}")
        raise

def get_database_connection():
    """Get database connection with retry logic"""
    max_retries = 3
    retry_delay = 5
    
    for attempt in range(max_retries):
        try:
            client = create_mongo_client()
            db = client['ecampus']
            # Test database access
            db.command('ping')
            return client, db
        except Exception as e:
            logger.warning(f"Connection attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                logger.info(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                logger.error("All connection attempts failed")
                raise

# Initialize MongoDB connection
try:
    client, db = get_database_connection()
    user_collection = db['new_users']
    sub_collection = db['subjects']
    logger.info("✓ Database collections initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize database: {e}")
    # Create placeholder objects to prevent import errors
    client = None
    db = None
    user_collection = None
    sub_collection = None

app = Flask(__name__)

# Configure CORS with explicit settings
cors_config = {
    # allow both staging and production frontend domains as well as localhost for dev
    "origins": [
        "http://localhost:3000",
        "http://localhost:5000",
        "https://ama-ecampus-181d.vercel.app",
        "https://ama-ecampus.vercel.app",
    ],
    "methods": ["GET", "POST", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"],
    "supports_credentials": False,
}
CORS(app, resources={r"/api/*": cors_config})

# Configure Gemini API with new genai module
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if GEMINI_API_KEY:
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    print("✓ Gemini API configured successfully")
else:
    gemini_client = None
    print("Warning: GEMINI_API_KEY not found in environment variables")

# In-memory storage for active sessions and their data
# Structure: {rollNo: {'session': session_object, 'attendance': data, 'marks': data}}
user_sessions = {}

@app.route('/api/login', methods=['POST'])
def api_login():
    """Login endpoint"""
    try:
        data = request.json
        rollno = data.get('rollNo')
        password = data.get('password')
        
        if not rollno or not password:
            return jsonify({"error": "Roll number and password are required"}), 400
        
        # Attempt login
        user_data = {'rollNo': rollno, 'password': password}
        session_result = login(user_data)
        
        if isinstance(session_result, tuple):
            # Login failed
            return jsonify({"error": session_result[1]}), 401
        
        # Login successful - store session in memory
        user_sessions[rollno] = {
            'session': session_result,
            'attendance': None,
            'marks': None
        }
        
        return jsonify({
            "success": True,
            "rollNo": rollno,
            "message": "Login successful"
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/api/attendance', methods=['POST'])
def api_get_attendance():
    """Get attendance data"""
    try:
        data = request.json
        rollno = data.get('rollNo')
        
        if not rollno:
            return jsonify({"error": "Roll number is required"}), 400
        
        # Check if session exists
        if rollno not in user_sessions:
            return jsonify({"error": "Please login first"}), 401
        
        session = user_sessions[rollno]['session']
        attendance_data = get_attendance(session, rollno)
        
        # If scraper fails, try MongoDB fallback
        if "error" in attendance_data and user_collection:
            try:
                logger.info(f"Scraper failed for attendance, attempting MongoDB fallback for {rollno}")
                user_doc = user_collection.find_one({"rollNo": rollno})
                if user_doc and 'attendance_table' in user_doc:
                    attendance_data = {
                        "attendance": user_doc.get('attendance_table', []),
                        "source": "database",
                        "timestamp": user_doc.get('last_updated', datetime.now().isoformat())
                    }
                    logger.info(f"Retrieved attendance from MongoDB for {rollno}")
                else:
                    return jsonify(attendance_data), 400
            except Exception as db_error:
                logger.error(f"MongoDB fallback failed for attendance: {db_error}")
                return jsonify(attendance_data), 400
        elif "error" in attendance_data:
            return jsonify(attendance_data), 400
        
        # Store attendance data in memory for this session
        user_sessions[rollno]['attendance'] = attendance_data
        
        return jsonify(attendance_data), 200
        
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/api/marks', methods=['POST'])
def api_get_marks():
    """Get marks data"""
    try:
        data = request.json
        rollno = data.get('rollNo')
        
        if not rollno:
            return jsonify({"error": "Roll number is required"}), 400
        
        # Check if session exists
        if rollno not in user_sessions:
            return jsonify({"error": "Please login first"}), 401
        
        session = user_sessions[rollno]['session']
        marks_data = get_ca_marks(session, rollno)
        
        # If scraper fails, try MongoDB fallback
        if "error" in marks_data and user_collection:
            try:
                logger.info(f"Scraper failed for marks, attempting MongoDB fallback for {rollno}")
                user_doc = user_collection.find_one({"rollNo": rollno})
                if user_doc and 'marks' in user_doc:
                    marks_data = {
                        "marks": user_doc.get('marks', []),
                        "source": "database",
                        "timestamp": user_doc.get('last_updated', datetime.now().isoformat())
                    }
                    logger.info(f"Retrieved marks from MongoDB for {rollno}")
                else:
                    return jsonify(marks_data), 400
            except Exception as db_error:
                logger.error(f"MongoDB fallback failed for marks: {db_error}")
                return jsonify(marks_data), 400
        elif "error" in marks_data:
            return jsonify(marks_data), 400
        
        # Store marks data in memory for this session
        user_sessions[rollno]['marks'] = marks_data
        
        return jsonify(marks_data), 200
        
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/api/chat', methods=['POST'])
def api_chat():
    """Chat with Gemini AI about attendance and marks"""
    try:
        data = request.json
        rollno = data.get('rollNo')
        message = data.get('message')
        
        if not rollno or not message:
            return jsonify({"error": "Roll number and message are required"}), 400
        
        if not gemini_client:
            return jsonify({"error": "Gemini API is not configured"}), 500
        
        # Check if user session exists
        if rollno not in user_sessions:
            return jsonify({"error": "Please login first"}), 401
        
        # Get user data from memory
        user_data = user_sessions[rollno]
        attendance_data = user_data.get('attendance', {})
        marks_data = user_data.get('marks', {})
        
        # Check if data has been fetched
        if not attendance_data and not marks_data:
            return jsonify({"error": "Please fetch your attendance and marks data first using the refresh button"}), 400
        
        prompt = f"""
You are an AI assistant helping a student understand their academic performance.

Student Roll Number: {rollno}

Attendance Data:
{json.dumps(attendance_data.get('attendance', []), indent=2) if attendance_data else 'Not available'}

Marks Data:
{json.dumps(marks_data.get('marks', []), indent=2) if marks_data else 'Not available'}

Student's Question: {message}

Please provide a helpful, concise answer based on the data above. If the student asks about attendance percentages, bunk count, marks, or performance, use the data provided. Be friendly and supportive.
"""
        
        # Generate response using google-genai library (v0.2.2)
        response = gemini_client.models.generate_content(
            model='gemini-2.0-flash-exp',
            contents=prompt
        )
        
        return jsonify({
            "success": True,
            "response": response.text
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Error generating response: {str(e)}"}), 500

@app.route('/api/logout', methods=['POST'])
def api_logout():
    """Logout endpoint - clears session data"""
    try:
        data = request.json
        rollno = data.get('rollNo')
        
        if rollno and rollno in user_sessions:
            # Remove user session and all associated data from memory
            del user_sessions[rollno]
            return jsonify({"success": True, "message": "Logged out successfully"}), 200
        
        return jsonify({"success": True, "message": "No active session found"}), 200
        
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "message": "eCampus API is running"}), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)