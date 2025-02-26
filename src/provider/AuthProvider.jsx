import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { serverbaseURL } from '../constant';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${serverbaseURL}login`, {
        login: username,
        password: password
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': process.env.DISCOURSE_API_KEY,
          'Api-Username': 'system'
        }
      });
      
      if (response.data.user) {
        setUser(response.data.user);
        localStorage.setItem('discourse_token', response.data.token);
        return { success: true };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Invalid username or password' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${serverbaseURL}register`, userData);
      
      if (response.data.success && response.data.user && !response.data.user.errors) {
        setUser(response.data.user);
        localStorage.setItem('discourse_token', response.data.token);
        return { success: true };
      } else {
        // Handle validation errors from Discourse
        const errors = response.data.user.errors || {};
        const errorMessages = Object.entries(errors)
          .map(([key, value]) => `${key}: ${value.join(', ')}`)
          .join('\n');
        
        return { 
          success: false, 
          error: errorMessages || response.data.user.message || 'Registration failed'
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('discourse_token');
  };

  useEffect(() => {
    const token = localStorage.getItem('discourse_token');
    if (token) {
      axios.get(`${serverbaseURL}auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(response => {
        if (response.data.user) {
          setUser(response.data.user);
        }
      })
      .catch(() => {
        localStorage.removeItem('discourse_token');
      })
      .finally(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}; 