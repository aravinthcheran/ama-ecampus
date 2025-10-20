import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import './GeminiChat.css';

function GeminiChat() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [rollNo, setRollNo] = useState('');
  const [password, setPassword] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [dataFetched, setDataFetched] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Function to format message text with proper styling
  const formatMessage = (text) => {
    if (!text) return text;

    // Split by lines
    const lines = text.split('\n');
    const formattedLines = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Skip empty lines but add spacing
      if (line.trim() === '') {
        formattedLines.push(<br key={`br-${i}`} />);
        continue;
      }

      // Handle bullet points (*, -, •)
      if (line.trim().match(/^[\*\-•]\s+/)) {
        const content = line.replace(/^[\*\-•]\s+/, '');
        formattedLines.push(
          <div key={i} className="message-list-item">
            <span className="bullet">•</span>
            <span dangerouslySetInnerHTML={{ __html: formatInlineStyles(content) }} />
          </div>
        );
      }
      // Handle numbered lists
      else if (line.trim().match(/^\d+\.\s+/)) {
        const match = line.match(/^(\d+)\.\s+(.+)/);
        if (match) {
          formattedLines.push(
            <div key={i} className="message-list-item">
              <span className="number">{match[1]}.</span>
              <span dangerouslySetInnerHTML={{ __html: formatInlineStyles(match[2]) }} />
            </div>
          );
        }
      }
      // Handle headers (lines that end with :)
      else if (line.trim().endsWith(':') && line.length < 100) {
        formattedLines.push(
          <div key={i} className="message-header">
            {line}
          </div>
        );
      }
      // Regular text
      else {
        formattedLines.push(
          <div key={i} className="message-text" dangerouslySetInnerHTML={{ __html: formatInlineStyles(line) }} />
        );
      }
    }

    return <div className="formatted-message">{formattedLines}</div>;
  };

  // Function to format inline styles (bold, code, etc.)
  const formatInlineStyles = (text) => {
    // Bold text **text** or __text__
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // Italic text *text* or _text_
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/_(.+?)_/g, '<em>$1</em>');
    
    // Code `text`
    text = text.replace(/`(.+?)`/g, '<code>$1</code>');
    
    return text;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const savedRollNo = localStorage.getItem('rollNo');
    if (savedRollNo) {
      setRollNo(savedRollNo);
      setIsLoggedIn(true);
      initializeChat();
    }
  }, []);

  const initializeChat = () => {
    setMessages([
      {
        type: 'assistant',
        text: '👋 Hello! I\'m your eCampus AI Assistant powered by Gemini.\n\nI can help you understand your attendance and marks. First, let me fetch your latest data...'
      }
    ]);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    try {
      const result = await api.login(rollNo, password);
      
      if (result.error) {
        setLoginError(result.error);
      } else if (result.success) {
        localStorage.setItem('rollNo', rollNo);
        setIsLoggedIn(true);
        initializeChat();
        
        // Fetch data automatically
        setTimeout(() => fetchInitialData(), 1000);
      }
    } catch (err) {
      setLoginError('Failed to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialData = async () => {
    setMessages(prev => [...prev, {
      type: 'assistant',
      text: 'Fetching your attendance and marks data...',
      loading: true
    }]);

    try {
      const [attendance, marks] = await Promise.all([
        api.getAttendance(rollNo),
        api.getMarks(rollNo)
      ]);

      let successMsg = '✅ Data loaded successfully!\n\n';
      
      if (attendance.attendance && attendance.attendance.length > 0) {
        successMsg += `📊 Attendance: ${attendance.attendance.length} subjects\n`;
      }
      
      if (marks.marks && marks.marks.length > 0) {
        successMsg += `📝 Marks: ${marks.marks.length} records\n`;
      }

      successMsg += '\nYou can now ask me anything about your academic performance!';

      setMessages(prev => prev.filter(m => !m.loading).concat({
        type: 'assistant',
        text: successMsg
      }));
      
      setDataFetched(true);
    } catch (err) {
      setMessages(prev => prev.filter(m => !m.loading).concat({
        type: 'assistant',
        text: '⚠️ Could not fetch data. Please refresh and try again.'
      }));
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    
    setMessages(prev => [...prev, { type: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const response = await api.chat(rollNo, userMessage);
      
      setMessages(prev => [
        ...prev,
        {
          type: 'assistant',
          text: response.error || response.response || 'Sorry, I couldn\'t process that.'
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          type: 'assistant',
          text: '❌ Sorry, I encountered an error. Please try again.'
        }
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout(rollNo);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('rollNo');
      setIsLoggedIn(false);
      setRollNo('');
      setPassword('');
      setMessages([]);
      setDataFetched(false);
    }
  };

  const suggestedQuestions = [
    '📊 What is my overall attendance?',
    '⚠️ Which subjects have low attendance?',
    '📝 Show me my CA marks',
    '🎯 How many classes can I miss?',
    '📈 What is my best performing subject?',
    '💡 Give me suggestions to improve',
  ];

  if (!isLoggedIn) {
    return (
      <div className="gemini-container">
        <div className="login-wrapper">
          <div className="gemini-logo-container">
            <div className="gemini-logo">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="url(#gradient1)"/>
                <path d="M2 17L12 22L22 17V7L12 12L2 7V17Z" fill="url(#gradient2)"/>
                <defs>
                  <linearGradient id="gradient1" x1="2" y1="2" x2="22" y2="12">
                    <stop offset="0%" stopColor="#4285f4"/>
                    <stop offset="100%" stopColor="#9b72f2"/>
                  </linearGradient>
                  <linearGradient id="gradient2" x1="2" y1="7" x2="22" y2="22">
                    <stop offset="0%" stopColor="#9b72f2"/>
                    <stop offset="100%" stopColor="#d96570"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="gemini-title">
              Ask Me Anything - <span className="highlight">eCampus</span>
            </h1>
            <p className="gemini-subtitle">Your AI-powered academic assistant</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <input
                type="text"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                placeholder="Roll Number"
                required
                className="gemini-input"
              />
            </div>

            <div className="input-group">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="gemini-input"
              />
            </div>

            {loginError && <div className="error-message">{loginError}</div>}

            <button type="submit" disabled={loading} className="gemini-button">
              {loading ? (
                <span className="button-content">
                  <span className="spinner"></span>
                  Signing in...
                </span>
              ) : (
                'Sign in with eCampus'
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>Powered by Google Gemini AI</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gemini-container">
      {/* Header */}
      <header className="gemini-header">
        <div className="header-left">
          <div className="gemini-logo-small">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="8" r="6" fill="url(#gradient1)"/>
              <path d="M6 22C6 18.6863 8.68629 16 12 16C15.3137 16 18 18.6863 18 22" fill="url(#gradient2)"/>
              <defs>
                <linearGradient id="gradient1" x1="6" y1="2" x2="18" y2="14">
                  <stop offset="0%" stopColor="#4285f4"/>
                  <stop offset="50%" stopColor="#9b72f2"/>
                  <stop offset="100%" stopColor="#d96570"/>
                </linearGradient>
                <linearGradient id="gradient2" x1="6" y1="16" x2="18" y2="22">
                  <stop offset="0%" stopColor="#9b72f2"/>
                  <stop offset="100%" stopColor="#d96570"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="app-title">Ask Me Anything</span>
        </div>
        <div className="header-right">
          <span className="user-badge">{rollNo}</span>
          <button onClick={handleLogout} className="logout-button">
            Sign out
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <div className="chat-container">
        <div className="messages-area">
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="gemini-logo-large">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="8" r="6" fill="url(#gradient1)"/>
                  <path d="M6 22C6 18.6863 8.68629 16 12 16C15.3137 16 18 18.6863 18 22" fill="url(#gradient2)"/>
                  <defs>
                    <linearGradient id="gradient1" x1="6" y1="2" x2="18" y2="14">
                      <stop offset="0%" stopColor="#4285f4"/>
                      <stop offset="50%" stopColor="#9b72f2"/>
                      <stop offset="100%" stopColor="#d96570"/>
                    </linearGradient>
                    <linearGradient id="gradient2" x1="6" y1="16" x2="18" y2="22">
                      <stop offset="0%" stopColor="#9b72f2"/>
                      <stop offset="100%" stopColor="#d96570"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h2>Hello, {rollNo.split('@')[0]}</h2>
              <p>How can I help you today?</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`message ${msg.type}`}>
                {msg.type === 'assistant' && (
                  <div className="message-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="8" r="6" fill="url(#gradient1)"/>
                      <path d="M6 22C6 18.6863 8.68629 16 12 16C15.3137 16 18 18.6863 18 22" fill="url(#gradient2)"/>
                      <defs>
                        <linearGradient id="gradient1" x1="6" y1="2" x2="18" y2="14">
                          <stop offset="0%" stopColor="#4285f4"/>
                          <stop offset="50%" stopColor="#9b72f2"/>
                          <stop offset="100%" stopColor="#d96570"/>
                        </linearGradient>
                        <linearGradient id="gradient2" x1="6" y1="16" x2="18" y2="22">
                          <stop offset="0%" stopColor="#9b72f2"/>
                          <stop offset="100%" stopColor="#d96570"/>
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                )}
                {msg.type === 'user' && (
                  <div className="message-icon">
                    {rollNo.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="message-content">
                  {msg.loading ? (
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  ) : (
                    formatMessage(msg.text)
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="message assistant">
              <div className="message-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="8" r="6" fill="url(#gradient1)"/>
                  <path d="M6 22C6 18.6863 8.68629 16 12 16C15.3137 16 18 18.6863 18 22" fill="url(#gradient2)"/>
                  <defs>
                    <linearGradient id="gradient1" x1="6" y1="2" x2="18" y2="14">
                      <stop offset="0%" stopColor="#4285f4"/>
                      <stop offset="50%" stopColor="#9b72f2"/>
                      <stop offset="100%" stopColor="#d96570"/>
                    </linearGradient>
                    <linearGradient id="gradient2" x1="6" y1="16" x2="18" y2="22">
                      <stop offset="0%" stopColor="#9b72f2"/>
                      <stop offset="100%" stopColor="#d96570"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions */}
        {messages.length > 0 && !loading && (
          <div className="suggestions">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => {
                  setInput(question);
                  inputRef.current?.focus();
                }}
                className="suggestion-chip"
              >
                {question}
              </button>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="input-area">
          <div className="input-wrapper">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask anything about your attendance or marks..."
              rows="1"
              disabled={loading}
              className="chat-input"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="send-button"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
              </svg>
            </button>
          </div>
          <div className="input-footer">
            Gemini can make mistakes. Check important info.
          </div>
        </div>
      </div>
    </div>
  );
}

export default GeminiChat;
