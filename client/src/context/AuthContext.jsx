import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load available users and restore active session
  useEffect(() => {
    async function initAuth() {
      try {
        const data = await api.getUsers();
        const users = data?.users || [];
        setAvailableUsers(users);

        const savedUserId = localStorage.getItem('minidocs_user_id');
        if (savedUserId) {
          const matched = users.find((u) => u.id === savedUserId);
          if (matched) {
            setUser(matched);
          } else {
            localStorage.removeItem('minidocs_user_id');
          }
        }
      } catch (err) {
        console.error('Failed to initialize auth personas:', err);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = (userId) => {
    const matched = availableUsers.find((u) => u.id === userId);
    if (matched) {
      localStorage.setItem('minidocs_user_id', matched.id);
      setUser(matched);
      return matched;
    }
    return null;
  };

  const logout = () => {
    localStorage.removeItem('minidocs_user_id');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        availableUsers,
        loading,
        login,
        logout,
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
