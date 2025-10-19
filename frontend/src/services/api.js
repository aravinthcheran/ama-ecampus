const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const api = {
  // Login
  login: async (rollNo, password) => {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rollNo, password }),
    });
    return response.json();
  },

  // Get attendance
  getAttendance: async (rollNo) => {
    const response = await fetch(`${API_BASE_URL}/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rollNo }),
    });
    return response.json();
  },

  // Get marks
  getMarks: async (rollNo) => {
    const response = await fetch(`${API_BASE_URL}/marks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rollNo }),
    });
    return response.json();
  },

  // Chat with AI
  chat: async (rollNo, message) => {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rollNo, message }),
    });
    return response.json();
  },

  // Logout
  logout: async (rollNo) => {
    const response = await fetch(`${API_BASE_URL}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rollNo }),
    });
    return response.json();
  },
};
