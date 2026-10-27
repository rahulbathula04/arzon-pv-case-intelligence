import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  users: User[];
  loading: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  isStudent: boolean;
  switchUser: (userId: string) => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsersAndMe = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        
        // Find current user or fallback
        const currentRes = await fetch('/api/auth/me');
        if (currentRes.ok) {
          const meData = await currentRes.json();
          setUser(meData.user);
        } else if (data.users.length > 0) {
          setUser(data.users[0]);
        }
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

  const isStaff = user?.role === 'admin' || user?.role === 'mentor';
  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';

  return (
    <AuthContext.Provider value={{
      user,
      users,
      loading,
      isStaff,
      isAdmin,
      isStudent,
      switchUser,
      switchRole
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
