const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://ama-ecampus-181d.vercel.app';

export const api = {
  // Login
  login: async (rollNo, password) => {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
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
    const response = await fetch(`${API_BASE_URL}/api/attendance`, {
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
    const response = await fetch(`${API_BASE_URL}/api/marks`, {
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
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
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
    const response = await fetch(`${API_BASE_URL}/api/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rollNo }),
    });
    return response.json();
  },
};
