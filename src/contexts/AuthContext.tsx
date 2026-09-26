import React from 'react';
import { api, hasStoredSession } from '../lib/api';
import { Admin, Customer, Seller, UserRole } from '../types';

export type AuthEntity = Customer | Seller | Admin;

interface AuthContextValue {
  isLoggedIn: boolean;
  isLoading: boolean;
  currentRole: UserRole;
  currentUser: AuthEntity | null;
  login: (role: UserRole, entity: AuthEntity) => void;
  logout: () => Promise<void>;
  updateCurrentUser: (entity: AuthEntity) => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentRole, setCurrentRole] = React.useState<UserRole>('customer');
  const [currentUser, setCurrentUser] = React.useState<AuthEntity | null>(null);

  const login = React.useCallback((role: UserRole, entity: AuthEntity) => {
    setCurrentRole(role);
    setCurrentUser(entity);
    setIsLoggedIn(true);
  }, []);

  const logout = React.useCallback(async () => {
    await api.logout();
    setIsLoggedIn(false);
    setCurrentRole('customer');
    setCurrentUser(null);
  }, []);

  const updateCurrentUser = React.useCallback((entity: AuthEntity) => {
    setCurrentUser(entity);
  }, []);

  React.useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener('marketpulse:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('marketpulse:unauthorized', handleUnauthorized);
  }, [logout]);

  React.useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      if (!hasStoredSession()) {
        setIsLoading(false);
        return;
      }

      try {
        const result = await api.getCurrentUser();
        if (!active) return;
        if (result.authenticated && result.user) {
          login(result.user.role, result.user.entity);
        } else {
          void api.logout().catch((error) => console.error('Session logout failed:', error));
        }
      } catch {
        void api.logout().catch((error) => console.error('Session logout failed:', error));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void restoreSession();
    return () => { active = false; };
  }, [login]);

  return (
    <AuthContext.Provider value={{ isLoggedIn, isLoading, currentRole, currentUser, login, logout, updateCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}