import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import './ChatBot.css';

function ChatBot({ rollNo }) {
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: 'Hello! I\'m your AI assistant. Ask me anything about your attendance, marks, or academic performance! 🎓'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

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

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message
    setMessages(prev => [...prev, { type: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const response = await api.chat(rollNo, userMessage);
      
      // Add bot response
      setMessages(prev => [
        ...prev,
        {
          type: 'bot',
          text: response.error || response.response || 'Sorry, I couldn\'t process that.'
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          type: 'bot',
          text: 'Sorry, I encountered an error. Please try again.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = [
    'What is my overall attendance?',
    'Which subjects have low attendance?',
    'Show my latest marks',
    'How many classes can I miss?',
  ];

  const handleQuickQuestion = (question) => {
    setInput(question);
  };

  return (
    <div className="chatbot">
      <div className="chat-header">
        <h2>💬 AI Assistant</h2>
        <p>Powered by Gemini AI</p>
      </div>

      <div className="quick-questions">
        <p>Quick questions:</p>
        <div className="question-buttons">
          {quickQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleQuickQuestion(q)}
              className="quick-question-btn"
              disabled={loading}
            >
              <span>{q}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.type}`}>
            <div className="message-bubble">
              {formatMessage(msg.text)}
            </div>
          </div>
        ))}
        {loading && (
          <div className="message bot">
            <div className="message-bubble typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me anything about your attendance or marks..."
          rows="2"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="send-button"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatBot;
