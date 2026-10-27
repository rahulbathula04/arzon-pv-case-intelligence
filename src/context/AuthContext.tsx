import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

export interface ProvisionUserData {
  fullName: string;
  email: string;
  role: UserRole;
  cohort?: string;
  password?: string;
  mustChangePassword?: boolean;
}

export interface RegisterUserData {
  fullName: string;
  email: string;
  password: string;
  program: string;
  cohort?: string;
}

interface AuthContextType {
  user: User | null;
  users: User[];
  token: string | null;
  loading: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  isStudent: boolean;
  getAuthHeaders: () => Record<string, string>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterUserData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUsers: () => Promise<void>;
  provisionUser: (data: ProvisionUserData) => Promise<{ success: boolean; error?: string; temporaryPassword?: string; message?: string; user?: User }>;
  resetUserPassword: (userId: string) => Promise<{ success: boolean; error?: string; temporaryPassword?: string; message?: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  switchUser: (userId: string) => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('arzon_auth_token'));
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (user?.id) {
      headers['x-user-id'] = user.id;
    }
    return headers;
  };

  const refreshUsers = async (customToken?: string) => {
    try {
      const activeToken = customToken || token || localStorage.getItem('arzon_auth_token');
      if (!activeToken) return;
      const headers: Record<string, string> = { 'Authorization': `Bearer ${activeToken}` };
      const res = await fetch('/api/auth/users', { headers });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to refresh users:', err);
    }
  };

  const fetchUsersAndMe = async () => {
    try {
      setLoading(true);
      const storedToken = localStorage.getItem('arzon_auth_token');

      // If user has a stored token, authenticate session
      if (storedToken) {
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${storedToken}`
        };
        const meRes = await fetch('/api/auth/me', { headers });
        if (meRes.ok) {
          const meData = await meRes.json();
          setUser(meData.user);
          if (meData.token) {
            setToken(meData.token);
            localStorage.setItem('arzon_auth_token', meData.token);
          }
          // Now fetch users with valid token
          const usersRes = await fetch('/api/auth/users', { headers });
          if (usersRes.ok) {
            const data = await usersRes.json();
            setUsers(data.users || []);
          }
        } else {
          // Token expired or invalid
          setToken(null);
          setUser(null);
          setUsers([]);
          localStorage.removeItem('arzon_auth_token');
        }
      } else {
        // Zero-trust gate: no stored token means user must explicitly authenticate
        setUser(null);
        setToken(null);
        setUsers([]);
      }
    } catch (err) {
      console.error('Failed to load auth state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndMe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('arzon_auth_token', data.token);
        await refreshUsers(data.token);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  };

  const register = async (data: RegisterUserData): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setUser(resData.user);
        setToken(resData.token);
        localStorage.setItem('arzon_auth_token', resData.token);
        await refreshUsers(resData.token);
        return { success: true };
      }
      return { success: false, error: resData.error || 'Registration failed' };
    } catch (err: any) {
      console.error('Registration error:', err);
      return { success: false, error: err?.message || 'Network error during registration' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('arzon_auth_token');
    try {
      fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignored
    }
  };

  const provisionUser = async (data: ProvisionUserData) => {
    try {
      const res = await fetch('/api/auth/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (res.ok && result.success) {
        await refreshUsers();
        return {
          success: true,
          message: result.message,
          temporaryPassword: result.temporaryPassword,
          user: result.user
        };
      }
      return { success: false, error: result.error || result.message || 'Failed to provision user.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error during user provisioning.' };
    }
  };

  const resetUserPassword = async (userId: string) => {
    try {
      const res = await fetch(`/api/auth/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });
      const result = await res.json();
      if (res.ok && result.success) {
        await refreshUsers();
        return {
          success: true,
          message: result.message,
          temporaryPassword: result.temporaryPassword
        };
      }
      return { success: false, error: result.error || 'Failed to reset password.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error during password reset.' };
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/auth/users/${userId}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders()
        }
      });
      const result = await res.json();
      if (res.ok && result.success) {
        await refreshUsers();
        return { success: true, message: result.message };
      }
      return { success: false, error: result.error || 'Failed to revoke user account.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error during user revocation.' };
    }
  };

  const switchUser = async (userId: string) => {
    try {
      const res = await fetch('/api/auth/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.token) {
          setToken(data.token);
          localStorage.setItem('arzon_auth_token', data.token);
        }
      }
    } catch (err) {
      console.error('Failed to switch user:', err);
    }
  };

  const switchRole = async (targetRole: UserRole) => {
    const candidate = users.find(u => u.role === targetRole);
    if (candidate) {
      await switchUser(candidate.id);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      };
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers,
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.token) {
          setToken(data.token);
          localStorage.setItem('arzon_auth_token', data.token);
        }
        if (user) {
          setUser({ ...user, mustChangePassword: false });
        }
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error || data.message || 'Failed to rotate password.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error while rotating password.' };
    }
  };

  const isStaff = user?.role === 'admin' || user?.role === 'mentor';
  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';

  return (
    <AuthContext.Provider value={{
      user,
      users,
      token,
      loading,
      isStaff,
      isAdmin,
      isStudent,
      getAuthHeaders,
      login,
      register,
      logout,
      refreshUsers,
      provisionUser,
      resetUserPassword,
      deleteUser,
      switchUser,
      switchRole,
      changePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
