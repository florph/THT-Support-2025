import * as SecureStore from 'expo-secure-store';
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

import { apiFetch, setUnauthorizedHandler } from '../lib/api';

const AuthContext = createContext({});

const UNAUTHENTICATED = {
  token: null,
  authenticated: false,
  loading: false,
  error: null,
  user: null,
};

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({ ...UNAUTHENTICATED, loading: true });

  const getUserData = useCallback(async (token) => {
    try {
      const response = await apiFetch('/user', { token });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Get user data error:', error?.message || error);
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync('userToken');
    } catch (error) {
      console.error('Logout error:', error?.message || error);
    } finally {
      setAuthState({ ...UNAUTHENTICATED });
    }
  }, []);

  // Allow the API layer to force a logout when a token is rejected (401).
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        if (!token) {
          setAuthState({ ...UNAUTHENTICATED });
          return;
        }

        const user = await getUserData(token);
        if (user) {
          setAuthState({ token, authenticated: true, loading: false, error: null, user });
        } else {
          // Token is missing/expired/invalid — don't leave the app in a half-authed state.
          await SecureStore.deleteItemAsync('userToken');
          setAuthState({ ...UNAUTHENTICATED });
        }
      } catch (error) {
        setAuthState({ ...UNAUTHENTICATED, error: 'Failed to load auth state' });
      }
    };

    loadToken();
  }, [getUserData]);

  const login = useCallback(async (email, password) => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }));

      const response = await apiFetch('/login', {
        method: 'POST',
        skipAuthRedirect: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = data?.message || 'Login failed';
        setAuthState({ ...UNAUTHENTICATED, error: message });
        return { success: false, error: message };
      }

      const { token, user } = data;
      await SecureStore.setItemAsync('userToken', token);
      setAuthState({ token, authenticated: true, loading: false, error: null, user });

      return { success: true };
    } catch (error) {
      const message = error?.message || 'Login failed';
      setAuthState({ ...UNAUTHENTICATED, error: message });
      return { success: false, error: message };
    }
  }, []);

  return (
    <AuthContext.Provider value={{ authState, login, logout }}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
