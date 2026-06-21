import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiClient, loginRequest, registerRequest, getMeRequest } from '../lib/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'zenzeii_token';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyToken = useCallback(async (newToken) => {
    if (newToken) {
      await SecureStore.setItemAsync(TOKEN_KEY, newToken);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      delete apiClient.defaults.headers.common['Authorization'];
    }
    setToken(newToken);
  }, []);

  const fetchUser = useCallback(async (tokenToUse) => {
    if (!tokenToUse) {
      setLoading(false);
      return;
    }
    try {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${tokenToUse}`;
      const res = await getMeRequest();
      setToken(tokenToUse);
      setUser(res.data);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        // JWT expired or rejected — clear and force re-login
        await applyToken(null);
      }
      // Network errors, timeouts, 5xx: keep the stored token so the
      // next cold start can retry rather than locking the user out permanently
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [applyToken]);

  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync(TOKEN_KEY);
      await fetchUser(stored);
    })();
  }, [fetchUser]);

  const login = async (email, password) => {
    const res = await loginRequest(email, password);
    await applyToken(res.data.access_token);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (email, password, username) => {
    const res = await registerRequest(email, password, username);
    await applyToken(res.data.access_token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    await applyToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const stored = await SecureStore.getItemAsync(TOKEN_KEY);
    await fetchUser(stored);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
