'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { logoutAction } from '@/features/auth/actions/logoutAction';
import { clearCacheByPrefix, CACHE_PREFIX } from '@/shared/hooks/useLocalStorageCache';

interface User {
  name: string | null;
  nickname: string | null;
  email: string | null;
  emailVerified?: Date | null;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user_profile');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('user_profile');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user_profile', JSON.stringify(userData));
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('user_profile');
    // A02 — limpa TODOS os snapshots client-side (transactions/dashboard) antes
    // do signOut: se o logoutAction falhar, o cache já foi removido e o próximo
    // usuário no mesmo navegador não verá dados financeiros da conta anterior.
    clearCacheByPrefix(CACHE_PREFIX);
    await logoutAction();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}