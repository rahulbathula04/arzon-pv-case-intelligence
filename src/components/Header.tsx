import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, UserCheck, GraduationCap, ChevronDown, 
  KeyRound, AlertTriangle, CheckCircle2, X, 
  LogOut, ArrowRightLeft, FileText, Check, Sparkles,
  BookOpen, Award, SlidersHorizontal, User
} from 'lucide-react';
import { NavTab } from './Navigation';

interface HeaderProps {
  onSelectTab?: (tab: NavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ onSelectTab }) => {
  const { user, isAdmin, isStudent, logout, changePassword, switchUser } = useAuth();
  
  // Menus and Modals State
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [switching, setSwitching] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click or escape
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
        setShowPersonaModal(false);
      }
    };
    if (userMenuOpen || showPasswordModal || showPersonaModal) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen, showPasswordModal, showPersonaModal]);

  // Standard platform personas for testing and evaluation
  const personas = [
    {
      role: 'student',
      title: 'Student Workspace',
      subtitle: 'Clinical Case Intake, MedDRA Coding & Private ICSR Drafts',
      badge: 'Zero-Access Air-Gap',
      icon: GraduationCap,
      accentColor: 'blue',
      description: 'Strictly isolated learner interface. Gold-standard MedDRA terms and reference answer keys are masked until mentor evaluation.',
      users: [
        { id: 'usr-student-01', name: 'Rahul Varma', email: 'rahul.varma@arzon.student', cohort: 'Pharm.D 2026-Q1' },
        { id: 'usr-student-02', name: 'Ananya Sen', email: 'ananya.sen@arzon.student', cohort: 'M.Pharm 2026-Q1' },
        { id: 'usr-student-03', name: 'Rohit Mehta', email: 'rohit.mehta@arzon.student', cohort: 'B.Pharm 2026-Q1' }
      ]
    },
    {
      role: 'mentor',
      title: 'Faculty Mentor Console',
      subtitle: 'Submission Triage, AI Score Calibration & Qualitative Feedback',
      badge: 'Answer Keys & Rubrics',
      icon: UserCheck,
      accentColor: 'emerald',
      description: 'Academic evaluation interface. Access to reference answer keys, AI provisional scoring rubrics, and cohort submission metrics.',
      users: [
        { id: 'usr-mentor-01', name: 'Dr. Priya Sharma, MD', email: 'priya.sharma@arzon.global', cohort: 'PV Faculty' },
        { id: 'usr-mentor-02', name: 'Vikram Kumar, M.Pharm', email: 'vikram.kumar@arzon.global', cohort: 'Safety Operations' }
      ]
    },
    {
      role: 'admin',
      title: 'Executive Command Center',
      subtitle: 'LLM Case Synthesis, PDF Parser, Cohort Allocator & System Audit',
      badge: 'Super Administrator',
      icon: ShieldCheck,
      accentColor: 'purple',
      description: 'Full administrative clearance. Access to Gemini AI case generation, PDF case extraction, cohort management, and 21 CFR Part 11 audit trails.',
      users: [
        { id: 'usr-admin-01', name: 'Dr. Arzon Director', email: 'admin@arzon.global', cohort: 'Leadership' },
        { id: 'usr-admin-rahul', name: 'Rahul Bathula', email: 'rahulbathula04@gmail.com', cohort: 'Super Administrator' }
      ]
    }
  ];

  const handleSwitchPersona = async (targetUserId: string, targetRole: string) => {
    try {
      setSwitching(true);
      await switchUser(targetUserId);
      setShowPersonaModal(false);
      setUserMenuOpen(false);

      // Auto-route to the target persona's primary view
      if (onSelectTab) {
        if (targetRole === 'admin') onSelectTab('dashboard');
        else if (targetRole === 'mentor') onSelectTab('reviews');
        else onSelectTab('workbench');
      }
    } catch (err) {
      console.error('Failed to switch persona:', err);
    } finally {
      setSwitching(false);
    }
  };

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
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-black/[0.06] transition-all">
        {/* Top subtle hairline protocol banner */}
        <div className="bg-[#0B1325] text-slate-300 px-4 sm:px-6 py-1 text-[11px] font-mono tracking-wider uppercase flex justify-between items-center border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center text-emerald-400 font-semibold tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block mr-2 ring-4 ring-emerald-400/20 motion-safe:animate-pulse"></span>
              ARZON SAFETY CORE · ENTERPRISE PHARMACOVIGILANCE
            </span>
            <span className="text-slate-600 hidden sm:inline">/</span>
            <span className="text-slate-400 hidden sm:inline text-[10px]">ICSR CLINICAL INTELLIGENCE ARCHITECTURE</span>
          </div>
          <div className="flex items-center space-x-3 sm:space-x-4 text-[10px]">
            <span className="text-slate-400 hidden md:inline">AUDIT: <strong className="text-slate-200 font-semibold">21 CFR PART 11</strong></span>
            <span className="text-slate-600 hidden md:inline">·</span>
            <span className="text-slate-400">PROTOCOL: <strong className="text-slate-200 font-semibold">ICH E2B(R3) · CIOMS-I</strong></span>
          </div>
        </div>

        {/* Mandatory Password Change Alert Banner */}
        {user?.mustChangePassword && (
          <div className="bg-amber-50 text-amber-900 px-4 sm:px-6 py-2 text-xs font-sans font-medium flex justify-between items-center border-b border-amber-200">
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

        {/* Main Apple-Grade Navigation Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
          
          {/* Brandmark & Platform Title */}
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0B1325] to-[#1E293B] flex items-center justify-center text-white font-sans font-black text-base shadow-sm ring-1 ring-black/10 shrink-0">
              A
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h1 className="font-sans font-bold text-base sm:text-lg text-slate-900 tracking-tight truncate">
                  Arzon PV Case Intelligence
                </h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/60">
                  Enterprise
                </span>
              </div>
              <p className="font-sans text-[11px] text-slate-500 hidden md:block truncate">
                Pharmacovigilance Training & Individual Case Safety Report (ICSR) Console
              </p>
            </div>
          </div>

          {/* Center: Apple-Grade Active Persona Environment Capsule */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowPersonaModal(true)}
              className={`flex items-center space-x-2.5 px-3 py-1.5 rounded-full border text-xs font-sans transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs active:scale-98 ${
                isStudent
                  ? 'bg-blue-50/70 border-blue-200 text-blue-900 hover:bg-blue-100/70'
                  : user?.role === 'mentor'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 hover:bg-emerald-100/70'
                  : 'bg-purple-50/70 border-purple-200 text-purple-900 hover:bg-purple-100/70'
              }`}
              title="Click to switch operating environment (Student / Mentor / Admin)"
            >
              {/* Pulsing Status Dot */}
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isStudent ? 'bg-blue-400' : user?.role === 'mentor' ? 'bg-emerald-400' : 'bg-purple-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  isStudent ? 'bg-blue-600' : user?.role === 'mentor' ? 'bg-emerald-600' : 'bg-purple-600'
                }`}></span>
              </span>

              {/* Persona Label */}
              <div className="flex items-center space-x-1.5 text-left">
                {isStudent && <GraduationCap className="w-3.5 h-3.5 text-blue-700 shrink-0" />}
                {user?.role === 'mentor' && <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
                {isAdmin && <ShieldCheck className="w-3.5 h-3.5 text-purple-700 shrink-0" />}
                <span className="font-semibold tracking-tight text-xs">
                  {isStudent ? 'Student Workspace' : user?.role === 'mentor' ? 'Faculty Mentor Console' : 'Executive Command Center'}
                </span>
                <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">· {user?.fullName}</span>
              </div>

              {/* Apple-style Switch Pill */}
              <div className="flex items-center space-x-1 pl-1 border-l border-black/10 text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                <ArrowRightLeft className="w-3 h-3" />
                <span className="hidden lg:inline text-[10px]">Switch</span>
              </div>
            </button>
          </div>

          {/* Right Section: Brochure Link & User Profile Menu */}
          <div className="flex items-center space-x-2">
            
            {/* Direct Brochure / Field Manual Button */}
            <a
              href="/brochure.html"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-sans text-slate-700 bg-black/[0.03] hover:bg-black/[0.06] border border-black/[0.08] active:scale-98 transition-all"
              title="Open the Tri-Persona Operations Manual & Brochure"
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span className="font-medium text-[11px]">Operations Guide</span>
            </a>

            {/* User Profile Avatar Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 p-1 pl-2 rounded-full hover:bg-black/[0.05] active:scale-98 transition-all cursor-pointer border border-black/[0.08]"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                title="Account Settings & Security"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold text-white shadow-2xs ${
                  isStudent ? 'bg-blue-600' :
                  user?.role === 'mentor' ? 'bg-emerald-600' :
                  'bg-slate-900'
                }`}>
                  {user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2) : 'A'}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 pr-1 ${userMenuOpen ? 'rotate-180 text-slate-700' : ''}`} />
              </button>

              {/* macOS Style User Menu Popover */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-xl border border-black/[0.08] p-2 z-50 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                  {/* Identity Header */}
                  <div className="p-2.5">
                    <div className="font-sans font-bold text-xs text-slate-900 truncate">
                      {user?.fullName}
                    </div>
                    <div className="font-mono text-[10px] text-slate-500 truncate">
                      {user?.email}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
                      <span className={`px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                        isStudent ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                        user?.role === 'mentor' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        'bg-purple-50 text-purple-800 border border-purple-200'
                      }`}>
                        {isStudent ? 'Student Workspace' : user?.role === 'mentor' ? 'Faculty Mentor' : 'Super Admin'}
                      </span>
                      <span className="text-slate-400">{user?.cohort || 'General'}</span>
                    </div>
                  </div>

                  {/* Action Items */}
                  <div className="py-1.5 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setShowPersonaModal(true);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-sans text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 flex items-center space-x-2.5 transition-all cursor-pointer"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
                      <span>Switch Operating Persona</span>
                    </button>

                    <a
                      href="/brochure.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-sans text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 flex items-center space-x-2.5 transition-all cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>View Tri-Persona Brochure</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setShowPasswordModal(true);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-sans text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 flex items-center space-x-2.5 transition-all cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                      <span>Rotate Password</span>
                    </button>
                  </div>

                  {/* Sign Out */}
                  <div className="pt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-sans text-rose-600 hover:text-rose-800 hover:bg-rose-50 flex items-center space-x-2.5 transition-all cursor-pointer"
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

      {/* APPLE-GRADE PERSONA & OPERATING ENVIRONMENT CONSOLE (SHEET / MODAL) */}
      {showPersonaModal && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-black/[0.08] max-w-4xl w-full overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-100 bg-gradient-to-b from-slate-50/60 to-white flex justify-between items-start">
              <div>
                <div className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                  <span className="w-2 h-2 rounded-full bg-slate-900"></span>
                  <span>ENTERPRISE ROLE ISOLATION ARCHITECTURE</span>
                </div>
                <h2 className="font-sans font-extrabold text-xl sm:text-2xl text-slate-900 tracking-tight">
                  Switch Operating Persona
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
                  Each role executes inside a verified security perimeter. Select a persona below to experience the authentic role-isolated interface.
                </p>
              </div>
              <button
                onClick={() => setShowPersonaModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Persona Cards Grid */}
            <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-5 bg-[#FAF9F6]">
              {personas.map((p) => {
                const IconComponent = p.icon;
                const isCurrentRole = user?.role === p.role;
                return (
                  <div
                    key={p.role}
                    className={`rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between ${
                      isCurrentRole
                        ? p.role === 'student'
                          ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-500/20 shadow-sm'
                          : p.role === 'mentor'
                          ? 'bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm'
                          : 'bg-purple-50/50 border-purple-300 ring-2 ring-purple-500/20 shadow-sm'
                        : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    <div>
                      {/* Top Role Badge & Icon */}
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs ${
                          p.role === 'student' ? 'bg-blue-600' : p.role === 'mentor' ? 'bg-emerald-600' : 'bg-slate-900'
                        }`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          isCurrentRole 
                            ? 'bg-slate-900 text-white border-slate-900' 
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {isCurrentRole ? 'ACTIVE NOW' : p.badge}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h3 className="font-sans font-bold text-base text-slate-900 tracking-tight">
                        {p.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {p.description}
                      </p>

                      {/* User Cohort Roster */}
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                          Available Accounts:
                        </div>
                        {p.users.map((u) => {
                          const isThisUser = user?.id === u.id;
                          return (
                            <button
                              key={u.id}
                              disabled={switching}
                              onClick={() => handleSwitchPersona(u.id, p.role)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-sans transition-all flex items-center justify-between cursor-pointer ${
                                isThisUser
                                  ? 'bg-slate-900 text-white font-medium shadow-xs'
                                  : 'text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <div className="truncate pr-2">
                                <div className="font-medium truncate">{u.name}</div>
                                <div className={`text-[10px] font-mono truncate ${isThisUser ? 'text-slate-300' : 'text-slate-400'}`}>
                                  {u.cohort}
                                </div>
                              </div>
                              {isThisUser && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Primary Role Switch Trigger */}
                    <div className="mt-5 pt-3">
                      <button
                        type="button"
                        disabled={switching || isCurrentRole}
                        onClick={() => handleSwitchPersona(p.users[0].id, p.role)}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                          isCurrentRole
                            ? 'bg-slate-200/60 text-slate-400 cursor-default'
                            : p.role === 'student'
                            ? 'bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-xs'
                            : p.role === 'mentor'
                            ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white shadow-xs'
                            : 'bg-slate-900 hover:bg-slate-800 active:scale-98 text-white shadow-xs'
                        }`}
                      >
                        {isCurrentRole ? (
                          <span>Environment Active</span>
                        ) : (
                          <>
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>Enter {p.role === 'student' ? 'Student' : p.role === 'mentor' ? 'Mentor' : 'Admin'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer Note */}
            <div className="px-6 py-4 sm:px-8 bg-slate-50 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-2">
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>AUTHENTIC JWT CRYPTOGRAPHIC SESSIONS GENERATED ON SWITCH</span>
              </div>
              <div>
                <a
                  href="/brochure.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-700 hover:text-slate-900 font-semibold underline flex items-center space-x-1"
                >
                  <span>Download Tri-Persona Manual</span>
                  <span>→</span>
                </a>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* PORTAL-RENDERED PASSWORD MODAL */}
      {showPasswordModal && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-[#0B1325] text-white p-4 sm:p-5 flex justify-between items-start border-b border-slate-800">
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
