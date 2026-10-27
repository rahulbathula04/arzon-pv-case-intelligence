import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, UserCheck, GraduationCap, ChevronDown, 
  KeyRound, AlertTriangle, CheckCircle2, X, 
  LogOut
} from 'lucide-react';
import { NavTab } from './Navigation';

interface HeaderProps {
  onSelectTab?: (tab: NavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ onSelectTab }) => {
  const { user, isAdmin, isStudent, logout, changePassword } = useAuth();
  
  // User Menu & Password Modal State
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close Popover on Outside Click or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
        setShowPasswordModal(false);
      }
    };
    if (userMenuOpen || showPasswordModal) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen, showPasswordModal]);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [submittingPw, setSubmittingPw] = useState(false);

  // Password Policy Checks
  const hasMinLength = newPassword.length >= 10;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;
  const isPolicySatisfied = hasMinLength && hasUpper && hasLower && hasNumber && hasSymbol && passwordsMatch;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (!isPolicySatisfied) {
      setPwError('Please satisfy all password complexity and matching requirements.');
      return;
    }

    try {
      setSubmittingPw(true);
      const res = await changePassword(currentPassword, newPassword);
      if (res.success) {
        setPwSuccess(res.message || 'Password successfully updated.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setShowPasswordModal(false);
          setPwSuccess(null);
        }, 1500);
      } else {
        setPwError(res.error || 'Failed to rotate password.');
      }
    } catch (err: any) {
      setPwError(err?.message || 'Error occurred while rotating password.');
    } finally {
      setSubmittingPw(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 transition-all">
        {/* Top authoritative hairline banner */}
        <div className="bg-slate-900 text-slate-300 px-4 sm:px-6 py-1.5 text-[11px] font-mono tracking-wider uppercase flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block mr-2 ring-4 ring-emerald-400/20 motion-safe:animate-pulse"></span>
              ARZON SAFETY CORE · ENTERPRISE PHARMACOVIGILANCE
            </span>
            <span className="text-slate-600 hidden sm:inline">/</span>
            <span className="text-slate-400 hidden sm:inline text-[10px]">ICSR SAFETY DATA MANAGEMENT PLATFORM</span>
          </div>
          <div className="flex items-center space-x-3 sm:space-x-4 text-[10px]">
            <span className="text-slate-400 hidden md:inline">AUDIT: <strong className="text-slate-200 font-semibold">21 CFR PART 11</strong></span>
            <span className="text-slate-600 hidden md:inline">·</span>
            <span className="text-slate-400">STANDARD: <strong className="text-slate-200 font-semibold">ICH E2B(R3) · CIOMS-I</strong></span>
          </div>
        </div>

        {/* Mandatory Password Change Alert Banner (only if user explicitly requires it and not seed admin) */}
        {user?.mustChangePassword && (
          <div className="bg-amber-50 text-amber-900 px-4 sm:px-6 py-2 text-xs font-sans font-medium flex justify-between items-center border-b border-amber-200 shadow-xs">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                <strong>Security Alert:</strong> Temporary credentials active. Please rotate your account password for compliance.
              </span>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="bg-amber-800 hover:bg-amber-900 active:scale-95 text-white font-mono text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-md shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-300" />
              <span>Rotate Password</span>
            </button>
          </div>
        )}

        {/* Main navigation header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
          {/* Brandmark & Platform Title */}
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white font-sans font-extrabold text-base shadow-xs shrink-0 ring-1 ring-slate-800">
              A
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h1 className="font-sans font-bold text-base sm:text-lg text-slate-900 tracking-tight truncate">
                  Arzon PV Case Intelligence
                </h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  Enterprise
                </span>
              </div>
              <p className="font-sans text-[11px] text-slate-500 hidden md:block truncate">
                Pharmacovigilance Training & Individual Case Safety Report (ICSR) Console
              </p>
            </div>
          </div>

          {/* Center: Authoritative Role Security Badge */}
          <div className="hidden sm:flex items-center">
            {isAdmin && (
              <div className="flex items-center space-x-2 px-3 py-1 rounded-md bg-purple-50 border border-purple-200 text-purple-900 text-xs font-mono font-medium shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-purple-700" />
                <span className="font-bold tracking-tight">SUPER ADMINISTRATOR</span>
              </div>
            )}
            {user?.role === 'mentor' && (
              <div className="flex items-center space-x-2 px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-mono font-medium shadow-2xs">
                <UserCheck className="w-4 h-4 text-emerald-700" />
                <span className="font-bold tracking-tight">FACULTY MENTOR CONSOLE</span>
              </div>
            )}
            {isStudent && (
              <div className="flex items-center space-x-2 px-3 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-900 text-xs font-mono font-medium shadow-2xs">
                <GraduationCap className="w-4 h-4 text-blue-700" />
                <span className="font-bold tracking-tight">PV ASSOCIATE WORKBENCH</span>
              </div>
            )}
          </div>

          {/* Right Section: User Profile Menu */}
          <div className="flex items-center space-x-2.5">
            {/* User Profile Dropdown Anchor */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2.5 p-1 pl-2.5 rounded-lg hover:bg-slate-100 active:scale-98 transition-all cursor-pointer border border-slate-200"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                title="User Account & Security"
              >
                <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-mono font-bold text-white shadow-2xs ${
                  isStudent ? 'bg-blue-700' :
                  user?.role === 'mentor' ? 'bg-emerald-700' :
                  'bg-slate-900'
                }`}>
                  {user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2) : 'A'}
                </div>
                <div className="text-left hidden lg:block pr-1">
                  <div className="text-xs font-semibold text-slate-900 flex items-center leading-tight">
                    <span>{user?.fullName}</span>
                    <ChevronDown className={`w-3 h-3 ml-1 text-slate-400 transition-transform duration-150 ${userMenuOpen ? 'rotate-180 text-slate-700' : ''}`} />
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase flex items-center space-x-1">
                    <span>{user?.role === 'admin' ? 'Super Admin' : user?.role === 'mentor' ? 'Faculty Mentor' : 'Student'}</span>
                    <span>·</span>
                    <span>{user?.cohort || 'Global'}</span>
                  </div>
                </div>
              </button>

              {/* Popover Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2.5 z-50 divide-y divide-slate-100">
                  {/* Active User Identity Card */}
                  <div className="pb-2.5 px-1">
                    <div className="flex items-center space-x-2.5 mb-1.5">
                      <div className={`w-9 h-9 rounded-md flex items-center justify-center text-xs font-mono font-bold text-white shadow-2xs ${
                        isStudent ? 'bg-blue-700' :
                        user?.role === 'mentor' ? 'bg-emerald-700' :
                        'bg-slate-900'
                      }`}>
                        {user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2) : 'A'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-sans font-bold text-xs text-slate-900 truncate">
                          {user?.fullName}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500 truncate">
                          {user?.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono mt-2">
                      <span className={`px-2 py-0.5 rounded font-semibold uppercase tracking-wider ${
                        isStudent ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                        user?.role === 'mentor' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        'bg-purple-50 text-purple-800 border border-purple-200'
                      }`}>
                        {isStudent ? 'Student Workspace' : user?.role === 'mentor' ? 'Faculty Mentor' : 'Super Admin'}
                      </span>
                      <span className="text-slate-400">Cohort: {user?.cohort || 'General'}</span>
                    </div>
                  </div>

                  {/* Popover Actions */}
                  <div className="pt-2 px-1 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setShowPasswordModal(true);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-sans text-slate-700 hover:text-slate-900 hover:bg-slate-50 flex items-center space-x-2 transition-all cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                      <span>Rotate Password</span>
                    </button>

                    {/* Sign Out Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-sans text-rose-600 hover:text-rose-800 hover:bg-rose-50 flex items-center space-x-2 transition-all cursor-pointer border-t border-slate-100 mt-1"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-600" />
                      <span className="font-semibold">Sign Out & Lock Gate</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* PORTAL-RENDERED MODAL: Rendered directly on document.body so it is NEVER clipped by backdrop-filter */}
      {showPasswordModal && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex justify-between items-start border-b border-slate-800">
              <div>
                <div className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-wider text-amber-400 mb-1">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Credential Security Hardening</span>
                </div>
                <h3 className="font-sans font-bold text-base text-white">Rotate Password</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update credentials for <strong className="text-white">{user?.email}</strong>
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPwError(null);
                  setPwSuccess(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="p-5 sm:p-6 space-y-4">
              {pwError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{pwError}</span>
                </div>
              )}

              {pwSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{pwSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono font-medium uppercase text-slate-600 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-sans focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium uppercase text-slate-600 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 10 chars, uppercase, lowercase, number, symbol"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-sans focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium uppercase text-slate-600 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-sans focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required
                />
              </div>

              {/* Live Password Policy Checklist */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] font-mono space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Compliance Requirements:</div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                  <div className={`flex items-center space-x-1 ${hasMinLength ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                    <span>{hasMinLength ? '✓' : '○'}</span>
                    <span>10+ chars</span>
                  </div>
                  <div className={`flex items-center space-x-1 ${hasUpper ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                    <span>{hasUpper ? '✓' : '○'}</span>
                    <span>Uppercase (A-Z)</span>
                  </div>
                  <div className={`flex items-center space-x-1 ${hasLower ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                    <span>{hasLower ? '✓' : '○'}</span>
                    <span>Lowercase (a-z)</span>
                  </div>
                  <div className={`flex items-center space-x-1 ${hasNumber ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                    <span>{hasNumber ? '✓' : '○'}</span>
                    <span>Number (0-9)</span>
                  </div>
                  <div className={`flex items-center space-x-1 ${hasSymbol ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                    <span>{hasSymbol ? '✓' : '○'}</span>
                    <span>Symbol (!@#$)</span>
                  </div>
                  <div className={`flex items-center space-x-1 ${passwordsMatch ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                    <span>{passwordsMatch ? '✓' : '○'}</span>
                    <span>Passwords match</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-mono font-semibold uppercase text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isPolicySatisfied || submittingPw}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider disabled:opacity-50 transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  {submittingPw ? (
                    <span>Verifying...</span>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};