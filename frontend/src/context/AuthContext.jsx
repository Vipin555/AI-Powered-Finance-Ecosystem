import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);
const API_URL = 'http://127.0.0.1:5000/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('finexo_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('finexo_token') || null);
  const [savedData, setSavedData] = useState({});
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setSavedData({});
    localStorage.removeItem('finexo_user');
    localStorage.removeItem('finexo_token');
  }, []);

  // Load user data on startup or token change
  const fetchUserData = useCallback(async (authToken) => {
    const activeToken = authToken || token;
    if (!activeToken) {
      setSavedData({});
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/user/data`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const json = await res.json();
        setSavedData(json.data || {});
      } else if (res.status === 401) {
        // Expired or invalid token
        logout();
      }
    } catch (err) {
      console.warn('Could not fetch user data:', err.message);
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    if (token) {
      fetchUserData(token);
    } else {
      setLoading(false);
    }
  }, [token, fetchUserData]);

  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Login failed. Please check your credentials.');
    }

    setUser(json.user);
    setToken(json.token);
    localStorage.setItem('finexo_user', JSON.stringify(json.user));
    localStorage.setItem('finexo_token', json.token);
    await fetchUserData(json.token);
    return json.user;
  };

  const signup = async (name, email, password) => {
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Signup failed. Please try again.');
    }

    setUser(json.user);
    setToken(json.token);
    localStorage.setItem('finexo_user', JSON.stringify(json.user));
    localStorage.setItem('finexo_token', json.token);
    await fetchUserData(json.token);
    return json.user;
  };

  const saveEngineData = async (engineId, data) => {
    // Optimistic update
    setSavedData((prev) => ({
      ...prev,
      [engineId]: { ...prev[engineId], ...data, updatedAt: new Date().toISOString() }
    }));

    if (!token) return;

    try {
      await fetch(`${API_URL}/user/data`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ engineId, data })
      });
    } catch (err) {
      console.warn(`Failed to persist data for engine ${engineId}:`, err.message);
    }
  };

  const getEngineData = (engineId) => {
    return savedData ? savedData[engineId] : null;
  };

  const value = {
    user,
    token,
    isAdmin: user?.role === 'admin',
    savedData,
    loading,
    login,
    signup,
    logout,
    saveEngineData,
    getEngineData,
    refreshUserData: () => fetchUserData(token)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
