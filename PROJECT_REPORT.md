# AMA eCampus - Comprehensive Project Report

**Project Name:** Ask Me Anything (AMA) eCampus Student Portal  
**Type:** Full-Stack Web Application  
**Purpose:** AI-powered academic assistant for college students  
**Last Updated:** October 19, 2025

---

## 📋 Executive Summary

**AMA eCampus** is an innovative full-stack application that bridges the gap between college eCampus portals and artificial intelligence. It provides students with an intuitive interface to access their attendance and marks, powered by an AI assistant (Google Gemini) to help them understand their academic performance and make informed decisions about their studies.

The application automates web scraping from the college eCampus portal, eliminating the need for manual data collection, and provides intelligent insights through conversational AI.

---

## 🎯 Project Objectives

1. **Accessibility:** Provide easy access to attendance and marks data in one place
2. **Intelligence:** Leverage AI to provide personalized academic insights
3. **Automation:** Automatically fetch fresh data from eCampus without manual intervention
4. **User Experience:** Deliver a modern, intuitive interface for student interactions
5. **Security:** Maintain secure authentication and session management

---

## 🏗️ Architecture Overview

### System Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ GeminiChat Component                                     │   │
│  │ - Login Interface                                        │   │
│  │ - Chat Interface with Message History                  │   │
│  │ - Suggested Questions                                   │   │
│  │ - User Session Management                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│                    API Service Layer (api.js)                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
          ┌────────────────────────────────────────┐
          │    Backend (Flask + Python)             │
          ├────────────────────────────────────────┤
          │ /api/login         → Session Creation  │
          │ /api/attendance    → Data Scraping     │
          │ /api/marks         → Data Scraping     │
          │ /api/chat          → AI Processing     │
          │ /api/logout        → Session Cleanup   │
          └────────────────────────────────────────┘
                    ↓                    ↓
          ┌────────────────────┐ ┌──────────────────┐
          │  eCampus Portal    │ │  Gemini API      │
          │  (Web Scraping)    │ │  (AI Processing) │
          └────────────────────┘ └──────────────────┘
```

---

## 💻 Backend Architecture

### Technology Stack
- **Framework:** Flask 3.0.0 (Python web framework)
- **Scraping:** BeautifulSoup4 4.12.2, Requests 2.31.0
- **AI Integration:** Google-genai 0.2.2 (Gemini API)
- **CORS Support:** Flask-CORS 4.0.0
- **Configuration:** Python-dotenv 1.0.0

### Backend Structure
```
backend/
├── app.py                          # Main Flask application
├── database.py                     # MongoDB configuration (optional)
├── requirements.txt                # Python dependencies
├── .env.example                    # Environment variables template
└── scrapers/
    ├── __init__.py                 # Package initialization
    ├── login.py                    # eCampus authentication scraper
    ├── attendance_scraper.py       # Attendance data scraper
    └── marks_scraper.py            # Marks/CA data scraper
```

### Core Components

#### 1. **app.py** - Flask Application Server
**Responsibilities:**
- REST API endpoint management
- Session-based user data storage (in-memory)
- Request routing and error handling
- Gemini AI integration

**API Endpoints:**

| Endpoint | Method | Purpose | Request | Response |
|----------|--------|---------|---------|----------|
| `/api/login` | POST | Authenticate user with eCampus credentials | `{rollNo, password}` | `{success, rollNo, message}` |
| `/api/attendance` | POST | Fetch attendance data | `{rollNo}` | `{success, attendance[], rollNo}` |
| `/api/marks` | POST | Fetch CA marks data | `{rollNo}` | `{success, marks[], rollNo}` |
| `/api/chat` | POST | Get AI response about academic data | `{rollNo, message}` | `{success, response}` |
| `/api/logout` | POST | Clear user session data | `{rollNo}` | `{success, message}` |
| `/api/health` | GET | Health check endpoint | - | `{status, message}` |

**Key Features:**
- In-memory session storage using dictionary: `user_sessions = {rollNo: {session, attendance, marks}}`
- CORS enabled for frontend communication
- Error handling with appropriate HTTP status codes
- Gemini AI model: `gemini-2.0-flash-exp`

#### 2. **scrapers/login.py** - Authentication & Session Management
**Purpose:** Authenticate students with eCampus portal and maintain session

**Key Functions:**
```python
login(user: dict) -> Union[session, Tuple[bool, str]]
```

**Implementation Details:**
- Performs HTTP GET request to eCampus login page
- Parses HTML form using BeautifulSoup
- Extracts CSRF tokens and form fields
- Submits credentials via POST request
- Validates login success by checking for error elements
- Implements retry strategy (3 retries with exponential backoff)
- Disables SSL verification (temporary workaround for college portal)

**Error Handling:**
- Missing credentials validation
- Network error handling with timeout (10 seconds)
- Login form parsing failures
- Invalid credentials detection

#### 3. **scrapers/attendance_scraper.py** - Attendance Data Extraction
**Purpose:** Scrape attendance percentages and calculate bunk count

**Key Functions:**
```python
get_attendance(session, user_rollno: str) -> dict
```

**Data Processing:**
- Fetches attendance page from: `https://ecampus.psgtech.ac.in/StudZone/Attendance/StudentPercentage`
- Parses HTML table with id `example`
- Extracts columns: Subject, Total Hours, Present Hours, Attendance %, Bunk Count

**Bunk Count Calculation:**
```python
# Calculate classes that can be missed while maintaining 85% attendance
bunk_count = int((present_hours / 0.85) - total_hours)
# If already below 85%, bunk_count = 0
```

**Output Format:**
```json
{
  "success": true,
  "attendance": [
    {
      "Subject": "Data Structures",
      "Total hr": "45",
      "Total Present": "42",
      "Attendance %": "93.33%",
      "Bunk Count (85%)": 5
    }
  ],
  "rollNo": "22z123"
}
```

#### 4. **scrapers/marks_scraper.py** - Marks Data Extraction
**Purpose:** Scrape CA (Continuous Assessment) marks for all subjects

**Key Functions:**
```python
get_ca_marks(session, user_rollno: str) -> dict
```

**Data Processing:**
- Fetches marks page from: `https://ecampus.psgtech.ac.in/StudZone/ContinuousAssessment/CAMarksView`
- Parses multiple tables with class `table table-bordered table-striped`
- Extracts all CA assessment marks

**Output Format:**
```json
{
  "success": true,
  "marks": [
    {
      "Subject": "Data Structures",
      "CA1": "18",
      "CA2": "20",
      "CA3": "17",
      "Total": "55"
    }
  ],
  "rollNo": "22z123"
}
```

#### 5. **database.py** - Database Configuration
**Purpose:** MongoDB connection for optional persistent storage

**Current State:** Configured but not actively used (data stored in-memory)

**Configuration:**
- Connection URI: `mongodb://localhost:27017/` (default)
- Database: `ecampus_db`
- Collections:
  - `users` - Student information with index on `rollNo`
  - `subjects` - Subject data with index on `subject_code`

---

## 🎨 Frontend Architecture

### Technology Stack
- **Framework:** React 19.2.0
- **Build Tool:** react-scripts 5.0.1
- **Testing:** Jest, React Testing Library
- **Styling:** CSS3 with gradients and animations

### Frontend Structure
```
frontend/
├── src/
│   ├── App.js                      # Main React component
│   ├── index.js                    # React DOM entry point
│   ├── App.css                     # Global styles
│   ├── components/
│   │   ├── GeminiChat.js           # Main chat interface component
│   │   ├── GeminiChat.css          # Chat styling
│   │   ├── ChatBot.js              # Legacy chatbot component
│   │   ├── ChatBot.css
│   │   ├── Dashboard.js            # Dashboard component
│   │   ├── Dashboard.css
│   │   ├── AttendanceView.js       # Attendance display
│   │   ├── AttendanceView.css
│   │   ├── MarksView.js            # Marks display
│   │   ├── MarksView.css
│   │   ├── Login.js                # Login component
│   │   └── Login.css
│   ├── services/
│   │   └── api.js                  # API client service
│   ├── public/
│   │   ├── index.html              # HTML entry point
│   │   ├── manifest.json           # PWA manifest
│   │   └── robots.txt              # SEO robots
│   └── ...other test files
├── package.json
├── .env.example                    # Environment template
└── README.md
```

### Core Components

#### 1. **GeminiChat.js** - Main UI Component
**Purpose:** Primary user interface combining login and chat functionality

**State Management:**
```javascript
- isLoggedIn: boolean           // Authentication status
- rollNo: string                // Student roll number
- password: string              // Student password (cleared after login)
- messages: array               // Chat message history
- input: string                 // Current message input
- loading: boolean              // Loading state
- loginError: string            // Login error messages
- dataFetched: boolean          // Data fetch status
```

**Key Features:**

1. **Login Screen:**
   - Roll number input
   - Password input
   - Error message display
   - Loading spinner during authentication
   - Powered by Gemini branding

2. **Chat Interface:**
   - Message display area with auto-scroll
   - Conversation history
   - Typing indicators for AI responses
   - User and assistant message differentiation

3. **Suggested Questions:**
   ```
   - 📊 What is my overall attendance?
   - ⚠️ Which subjects have low attendance?
   - 📝 Show me my CA marks
   - 🎯 How many classes can I miss?
   - 📈 What is my best performing subject?
   - 💡 Give me suggestions to improve
   ```

4. **Session Persistence:**
   - Saves `rollNo` to localStorage
   - Auto-login if stored credentials exist
   - Clears on logout

**Lifecycle:**
```
1. Component Mount
   ├─ Check localStorage for saved rollNo
   ├─ If exists: Set logged in & initialize chat
   └─ If not: Show login form

2. Login Form Submit
   ├─ Call api.login(rollNo, password)
   ├─ Store rollNo in localStorage
   ├─ Set isLoggedIn = true
   ├─ Initialize chat greeting
   └─ Auto-fetch attendance & marks

3. Data Fetching
   ├─ Show "Fetching data..." message
   ├─ Parallel fetch: attendance & marks
   ├─ Update message with data summary
   └─ Set dataFetched = true

4. Chat Flow
   ├─ User sends message
   ├─ Show user message in chat
   ├─ Call api.chat(rollNo, message)
   ├─ Show AI response
   └─ Clear input field

5. Logout
   ├─ Call api.logout(rollNo)
   ├─ Remove localStorage.rollNo
   ├─ Clear state
   └─ Show login form
```

#### 2. **api.js** - API Service Layer
**Purpose:** Centralized API communication

**Base URL Configuration:**
```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api'
```

**API Methods:**
```javascript
api.login(rollNo, password) → Promise
api.getAttendance(rollNo) → Promise
api.getMarks(rollNo) → Promise
api.chat(rollNo, message) → Promise
api.logout(rollNo) → Promise
```

**Features:**
- JSON request/response handling
- Error propagation
- Centralized base URL management
- Environment variable support

---

## 🔐 Security Architecture

### Current Security Measures
1. **Session Management:**
   - In-memory session storage (roll number as key)
   - Session cleared on logout
   - No persistent credential storage

2. **SSL Handling:**
   - SSL verification disabled for eCampus portal (workaround)
   - Should be enabled in production

3. **Credential Handling:**
   - Credentials used only for scraping
   - Not stored in database
   - Cleared from memory after login

4. **CORS Protection:**
   - Flask-CORS enabled for controlled cross-origin requests

### Security Considerations & Recommendations

⚠️ **Current Limitations:**
- SSL verification disabled (temporary measure)
- Credentials not encrypted in transit
- No rate limiting implemented
- No authentication token system

✅ **Recommended Improvements:**
1. Enable SSL certificate verification in production
2. Implement JWT token-based authentication
3. Add rate limiting to prevent brute force attacks
4. Use environment-specific configurations
5. Implement Redis for distributed session management
6. Add request encryption for sensitive data
7. Implement audit logging
8. Add CSRF protection

---

## 📊 Data Flow

### Login & Session Creation Flow
```
Frontend (User Input)
        ↓
  api.login(rollNo, password)
        ↓
Backend /api/login
        ↓
  scrapers.login.login(credentials)
        ↓
  eCampus Portal (HTTPS Request)
        ↓
  Parse HTML Response
        ↓
  Validate Login Success
        ↓
Return: session object or error
        ↓
Store in user_sessions[rollNo]
        ↓
Frontend: localStorage.rollNo = rollNo
```

### Data Fetching Flow
```
Frontend: Fetch Attendance & Marks
        ↓
Backend /api/attendance & /api/marks
        ↓
Retrieve session from user_sessions[rollNo]
        ↓
scrapers.attendance_scraper.get_attendance(session)
scrapers.marks_scraper.get_ca_marks(session)
        ↓
Parse HTML Tables
        ↓
Calculate Metrics (e.g., bunk count)
        ↓
Return JSON Response
        ↓
Store in user_sessions[rollNo]
        ↓
Frontend: Update UI with data
```

### AI Chat Flow
```
User Message (Frontend)
        ↓
api.chat(rollNo, message)
        ↓
Backend /api/chat
        ↓
Retrieve user data from memory:
- user_sessions[rollNo].attendance
- user_sessions[rollNo].marks
        ↓
Create Gemini Prompt with context
        ↓
gemini_client.models.generate_content()
        ↓
Get AI Response
        ↓
Return to Frontend
        ↓
Display in Chat Interface
```

---

## 🚀 Deployment & Setup

### Prerequisites
- **Python:** 3.8 or higher
- **Node.js:** 14 or higher
- **npm:** Package manager for JavaScript
- **Google Gemini API Key:** [Get here](https://makersuite.google.com/app/apikey)
- **Optional:** MongoDB for persistent storage

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   .\venv\Scripts\Activate.ps1  # Windows PowerShell
   source venv/bin/activate      # Linux/Mac
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment:**
   ```bash
   Copy-Item .env.example .env    # Windows PowerShell
   cp .env.example .env           # Linux/Mac
   ```

5. **Edit `.env` file:**
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   MONGO_URI=mongodb://localhost:27017/  # Optional
   ```

6. **Run Flask server:**
   ```bash
   python app.py
   ```
   Server starts on: `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment (optional):**
   ```bash
   Copy-Item .env.example .env    # Windows PowerShell
   cp .env.example .env           # Linux/Mac
   ```

4. **Edit `.env` file (if needed):**
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   ```

5. **Start development server:**
   ```bash
   npm start
   ```
   App opens at: `http://localhost:3000`

### Production Deployment

**Backend:**
- Use production WSGI server (Gunicorn, uWSGI)
- Enable SSL/HTTPS
- Use environment variables for secrets
- Implement Redis for session management
- Set up monitoring and logging

**Frontend:**
- Build optimized bundle: `npm run build`
- Deploy to CDN or static hosting
- Configure API endpoint for production backend
- Enable gzip compression

---

## 🧪 Testing & Validation

### Backend Testing Points
- [ ] Login functionality with valid credentials
- [ ] Login failure with invalid credentials
- [ ] Attendance data parsing
- [ ] Marks data parsing
- [ ] AI chat response generation
- [ ] Session management
- [ ] Logout functionality
- [ ] Error handling and edge cases

### Frontend Testing Points
- [ ] Login form validation
- [ ] Message rendering
- [ ] Suggested questions functionality
- [ ] Scroll-to-bottom behavior
- [ ] localStorage persistence
- [ ] Auto-login from localStorage
- [ ] Responsive design
- [ ] API error handling

---

## 📈 Performance Considerations

### Current Performance Characteristics
- **Login Time:** ~2-3 seconds (eCampus scraping)
- **Data Fetch Time:** ~3-5 seconds (per endpoint)
- **AI Response Time:** ~2-10 seconds (Gemini API)
- **Session Memory:** Minimal (only one user's data in memory per session)

### Optimization Opportunities
1. **Caching:** Implement Redis to cache attendance/marks
2. **Rate Limiting:** Prevent excessive API calls
3. **Async Processing:** Use async/await for non-blocking operations
4. **Database:** Move to MongoDB for persistent storage & querying
5. **Frontend:** Implement code splitting and lazy loading

---

## 🐛 Known Issues & Limitations

| Issue | Description | Status | Workaround |
|-------|-------------|--------|-----------|
| SSL Verification | Disabled for eCampus portal | ⚠️ Active | Enable in production with proper certificates |
| Session Storage | In-memory only (lost on restart) | ⚠️ Active | Implement persistent storage |
| No Encryption | Data in-transit not encrypted | ⚠️ Active | Use HTTPS in production |
| Rate Limiting | No API rate limiting | ⚠️ Active | Implement in production |
| Error Messages | Some generic error messages | ℹ️ Minor | Add detailed logging |

---

## 🔮 Future Enhancements

### Short Term (v1.1)
- [ ] Add email notifications for low attendance
- [ ] Implement rate limiting
- [ ] Add comprehensive error logging
- [ ] Create admin dashboard
- [ ] Add user feedback system

### Medium Term (v1.2-v2.0)
- [ ] Marks comparison with classmates (anonymized)
- [ ] Attendance prediction models
- [ ] Export data to PDF/Excel
- [ ] Dark mode support
- [ ] Mobile-responsive design improvements
- [ ] Redis session caching
- [ ] MongoDB persistent storage

### Long Term
- [ ] Native mobile app (React Native/Flutter)
- [ ] Advanced analytics dashboard
- [ ] Personalized study recommendations
- [ ] Integration with calendar system
- [ ] Peer comparison (anonymized)
- [ ] Parent portal
- [ ] SMS notifications

---

## 📚 Dependencies & Versions

### Backend Dependencies
```
flask==3.0.0
flask-cors==4.0.0
requests==2.31.0
beautifulsoup4==4.12.2
google-genai==0.2.2
urllib3==2.1.0
python-dotenv==1.0.0
```

### Frontend Dependencies
```
react==19.2.0
react-dom==19.2.0
react-scripts==5.0.1
@testing-library/react==16.3.0
@testing-library/jest-dom==6.9.1
web-vitals==2.1.4
```

---

## 📋 API Response Examples

### Login Response
**Success:**
```json
{
  "success": true,
  "rollNo": "22z123",
  "message": "Login successful"
}
```

**Error:**
```json
{
  "error": "Invalid credentials."
}
```

### Attendance Response
```json
{
  "success": true,
  "attendance": [
    {
      "Subject": "Data Structures",
      "Total hr": "45",
      "Total Present": "42",
      "Attendance %": "93.33%",
      "Bunk Count (85%)": 5
    },
    {
      "Subject": "Web Development",
      "Total hr": "40",
      "Total Present": "34",
      "Attendance %": "85.00%",
      "Bunk Count (85%)": 0
    }
  ],
  "rollNo": "22z123"
}
```

### Chat Response
```json
{
  "success": true,
  "response": "Based on your attendance data, you have excellent attendance in Data Structures (93.33%) and exactly at the 85% threshold in Web Development. You can safely miss up to 5 more classes in Data Structures while maintaining 85% attendance. In Web Development, you need to attend all remaining classes to maintain your current attendance percentage."
}
```

---

## 🤝 Contributing Guidelines

1. **Code Style:** Follow PEP 8 for Python, ES6+ for JavaScript
2. **Commits:** Use descriptive commit messages
3. **Testing:** Write tests for new features
4. **Documentation:** Update docs when changing functionality
5. **Pull Requests:** Describe changes and link related issues

---

## 📞 Support & Troubleshooting

### Backend Issues

**Issue:** Import errors  
**Solution:** Ensure virtual environment is activated and dependencies installed
```bash
pip install -r requirements.txt
```

**Issue:** "GEMINI_API_KEY not found"  
**Solution:** Create `.env` file with your API key
```
GEMINI_API_KEY=your_key_here
```

**Issue:** "Cannot connect to eCampus"  
**Solution:** Check network connection and verify eCampus portal is accessible

### Frontend Issues

**Issue:** Cannot connect to backend  
**Solution:** Ensure backend is running on port 5000 and CORS is enabled

**Issue:** Data not loading  
**Solution:** Check browser console for errors; verify login credentials; refresh page

**Issue:** "localhost:3000 refuses to connect"  
**Solution:** Start frontend with `npm start`; check if port 3000 is available

---

## 📄 License

This project is for educational purposes only. Use responsibly in accordance with your institution's policies.

---

## 👥 Authors & Contributors

- **Project:** Ask Me Anything (AMA) eCampus
- **Institution:** PSG Institute of Technology
- **Purpose:** Student Academic Portal with AI Assistance
- **Built with ❤️ for students**

---

## ⚖️ Disclaimer

This application scrapes data from the eCampus portal. Users are responsible for:
- Following institutional policies regarding data access
- Using the application responsibly
- Not attempting unauthorized access
- Complying with terms of service

The developers are not responsible for any misuse or violation of institutional policies.
