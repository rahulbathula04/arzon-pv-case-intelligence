import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserCheck, GraduationCap, Building2, ChevronDown, Activity } from 'lucide-react';
import { UserRole } from '../types';

export const Header: React.FC = () => {
  const { user, users, isStaff, isAdmin, isStudent, switchUser, switchRole } = useAuth();

  return (
    <header className="border-b border-stone-200 bg-white sticky top-0 z-40">
      {/* Top authoritative hairline banner */}
      <div className="bg-[#0B1325] text-stone-300 px-4 py-1.5 text-[11px] font-mono tracking-wider uppercase flex justify-between items-center border-b border-stone-800">
        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block mr-1.5 motion-safe:animate-pulse"></span>
            ARZON GLOBAL · PV CASE INTELLIGENCE
          </span>
          <span className="text-stone-500 hidden sm:inline">|</span>
          <span className="text-stone-400 hidden sm:inline">HEALTHCARE CAREER INTELLIGENCE & ROLE READINESS SYSTEM</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-stone-400">DATABASE: <strong className="text-stone-200">AUTHORITATIVE SQLITE</strong></span>
          <span className="text-stone-500">|</span>
          <span className="text-stone-400">ICSR STANDARD: <strong className="text-stone-200">ICH E2B(R3) / CIOMS-I</strong></span>
        </div>
      </div>

      {/* Main navigation header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#0B1325] flex items-center justify-center text-white font-serif font-bold text-xl shadow-sm border border-stone-800">
            A
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-serif font-bold text-lg text-stone-900 tracking-tight">
                Arzon PV Case Intelligence
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-stone-100 text-[#1B3F8B] border border-stone-200">
                v1.0 Operational
              </span>
            </div>
            <p className="font-sans text-xs text-stone-500">
              AI-Powered Pharmacovigilance Simulation & Mentor-Vetted ICSR Training Platform
            </p>
          </div>
        </div>

        {/* Role Switcher & User Profile Pill */}
        <div className="flex items-center space-x-3">
          {/* Quick Role Switcher Buttons */}
          <div className="inline-flex rounded-lg border border-stone-300 bg-stone-50 p-0.5 text-xs font-mono font-medium">
            <button
              onClick={() => switchRole('student')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1 ${
                isStudent
                  ? 'bg-white text-stone-900 shadow-sm font-bold border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Switch to Student view (Rahul Varma)"
            >
              <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
              <span>STUDENT</span>
            </button>

            <button
              onClick={() => switchRole('mentor')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1 ${
                user?.role === 'mentor'
                  ? 'bg-white text-stone-900 shadow-sm font-bold border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Switch to Mentor view (Dr. Priya Sharma)"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>MENTOR</span>
            </button>

            <button
              onClick={() => switchRole('admin')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1 ${
                isAdmin
                  ? 'bg-white text-stone-900 shadow-sm font-bold border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Switch to Admin view (Dr. Arzon Director)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>ADMIN</span>
            </button>
          </div>

          {/* Active user details dropdown */}
          <div className="relative group">
            <div className="flex items-center space-x-2 pl-3 border-l border-stone-200 cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-300 flex items-center justify-center text-xs font-mono font-bold text-stone-700">
                {user?.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-semibold text-stone-900 flex items-center">
                  {user?.fullName}
                  <ChevronDown className="w-3 h-3 ml-1 text-stone-400" />
                </div>
                <div className="text-[10px] font-mono text-stone-500 uppercase">
                  {user?.role} · {user?.cohort || 'Global'}
                </div>
              </div>
            </div>

            {/* Dropdown menu for picking exact user */}
            <div className="absolute right-0 mt-2 w-64 bg-white border border-stone-200 rounded-lg shadow-xl py-1 hidden group-hover:block z-50">
              <div className="px-3 py-1.5 border-b border-stone-100 text-[10px] font-mono text-stone-400 uppercase tracking-wider">
                Simulate System User
              </div>
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => switchUser(u.id)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-stone-50 transition-colors ${
                    u.id === user?.id ? 'bg-stone-50 font-semibold text-[#1B3F8B]' : 'text-stone-700'
                  }`}
                >
                  <div>
                    <div>{u.fullName}</div>
                    <div className="text-[10px] text-stone-400 font-mono">{u.email}</div>
                  </div>
                  <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                    u.role === 'admin' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                    u.role === 'mentor' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {u.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
