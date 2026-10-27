import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertTriangle, Eye, EyeOff, User, GraduationCap, CheckCircle2, UserCheck } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login, register } = useAuth();
  
  // Mode: 'login' | 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Sign In State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Registration State
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [program, setProgram] = useState('Pharm.D');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Password Policy Validation for Registration
  const hasMinLength = regPassword.length >= 10;
  const hasUpper = /[A-Z]/.test(regPassword);
  const hasLower = /[a-z]/.test(regPassword);
  const hasNumber = /[0-9]/.test(regPassword);
  const hasSymbol = /[^A-Za-z0-9]/.test(regPassword);
  const passwordsMatch = regPassword === regConfirmPassword && regPassword.length > 0;
  const isPolicySatisfied = hasMinLength && hasUpper && hasLower && hasNumber && hasSymbol && passwordsMatch;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please provide both your institutional email and password.');
      return;
    }

    try {
      setSubmitting(true);
      const success = await login(email.trim(), password);
      if (success) {
        if (onLoginSuccess) onLoginSuccess();
      } else {
        setError('Invalid credentials. Please verify your institutional email and password.');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check network connectivity.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Please provide your full legal or professional name (minimum 2 characters).');
      return;
    }

    if (!regEmail.trim()) {
      setError('Please provide your institutional email address.');
      return;
    }

    if (!isPolicySatisfied) {
      setError('Please satisfy all password complexity and matching requirements.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await register({
        fullName: fullName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        program
      });

      if (res.success) {
        if (onLoginSuccess) onLoginSuccess();
      } else {
        setError(res.error || 'Failed to complete institutional registration.');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error during registration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#FAF9F6] text-stone-900 selection:bg-[#0B1325] selection:text-white">
      {/* Top authoritative hairline banner */}
      <div className="bg-[#0B1325] text-stone-300 px-4 sm:px-6 py-2 text-[11px] font-mono tracking-wider uppercase flex justify-between items-center border-b border-white/[0.08]">
        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block mr-2 ring-4 ring-emerald-400/20 motion-safe:animate-pulse"></span>
            ARZON GLOBAL · ZERO-TRUST CLINICAL ACCESS GATE
          </span>
          <span className="text-stone-600 hidden sm:inline">/</span>
          <span className="text-stone-400 hidden sm:inline text-[10px]">HEALTHCARE CAREER INTELLIGENCE SYSTEM</span>
        </div>
        <div className="flex items-center space-x-3 text-[10px]">
          <span className="text-stone-400">SPEC: <strong className="text-stone-200">ICH E2B(R3) · 21 CFR PART 11</strong></span>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <div className="w-full max-w-md bg-white rounded-3xl p-7 sm:p-9 border border-black/[0.08] shadow-apple-modal relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Subtle top brand glow */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#0B1325] via-[#1B3F8B] to-emerald-500"></div>

          {/* Brand Monogram */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0B1325] to-[#1E293B] flex items-center justify-center text-white font-serif font-bold text-2xl shadow-apple-card ring-1 ring-black/10 mb-3.5 transition-transform hover:scale-105">
              A
            </div>
            <h2 className="font-serif font-bold text-2xl text-stone-900 tracking-tight">
              Arzon Clinical Access Gate
            </h2>
            <p className="font-sans text-xs text-stone-500 mt-1 max-w-xs leading-relaxed">
              Institutional single sign-on for Pharmacovigilance associates, faculty mentors, and executive operations.
            </p>
          </div>

          {/* Mode Switcher Segmented Control */}
          <div className="bg-stone-100 p-1 rounded-2xl ring-1 ring-black/[0.04] flex space-x-1 mb-5">
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setError(null); }}
              className={`flex-1 py-2 rounded-xl font-mono text-xs font-semibold uppercase tracking-wider transition-all duration-150 ${
                authMode === 'login'
                  ? 'bg-white text-stone-900 shadow-apple-subtle font-bold ring-1 ring-black/[0.04]'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setError(null); }}
              className={`flex-1 py-2 rounded-xl font-mono text-xs font-semibold uppercase tracking-wider transition-all duration-150 ${
                authMode === 'register'
                  ? 'bg-white text-stone-900 shadow-apple-subtle font-bold ring-1 ring-black/[0.04]'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Register Account
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2.5 animate-in fade-in duration-150">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* SIGN IN FORM */}
          {authMode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                  Institutional Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. associate@institution.edu"
                    className="w-full pl-10 pr-3.5 py-2.5 border border-stone-300 rounded-xl text-xs font-sans focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 focus:border-[#1B3F8B] transition-all bg-stone-50/50 focus:bg-white"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                  Account Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your security password"
                    className="w-full pl-10 pr-10 py-2.5 border border-stone-300 rounded-xl text-xs font-sans focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 focus:border-[#1B3F8B] transition-all bg-stone-50/50 focus:bg-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 p-0.5 rounded cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 bg-[#0B1325] hover:bg-[#1B3F8B] active:scale-[0.99] text-white py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-apple-subtle hover:shadow-apple-card flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <span>Verifying Credentials...</span>
                ) : (
                  <>
                    <span>Authenticate & Enter Portal</span>
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </>
                )}
              </button>

              <div className="text-center pt-3">
                <button
                  type="button"
                  onClick={() => { setAuthMode('register'); setError(null); }}
                  className="text-xs font-sans text-stone-500 hover:text-[#1B3F8B] transition-colors"
                >
                  New healthcare associate or student? <strong className="underline">Create an institutional account</strong>
                </button>
              </div>

              {/* Quick Select Demo Accounts */}
              <div className="mt-5 pt-4 border-t border-black/[0.06]">
                <div className="text-[10px] font-mono uppercase font-bold text-stone-400 mb-2 text-center tracking-wider">
                  Quick Access Profiles
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('rahulbathula04@gmail.com');
                      setPassword('Arzon@123');
                      setError(null);
                    }}
                    className="p-2 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/70 text-left transition-all cursor-pointer"
                  >
                    <div className="flex items-center space-x-1 text-purple-700 mb-0.5">
                      <ShieldCheck className="w-3 h-3" />
                      <span className="font-mono text-[9px] font-bold uppercase">Super Admin</span>
                    </div>
                    <div className="text-[11px] font-medium text-stone-900 truncate">Rahul Bathula</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEmail('priya.sharma@arzon.global');
                      setPassword('ArzonSecure2026!');
                      setError(null);
                    }}
                    className="p-2 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-left transition-all cursor-pointer"
                  >
                    <div className="flex items-center space-x-1 text-emerald-700 mb-0.5">
                      <UserCheck className="w-3 h-3" />
                      <span className="font-mono text-[9px] font-bold uppercase">Mentor</span>
                    </div>
                    <div className="text-[11px] font-medium text-stone-900 truncate">Dr. Priya</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEmail('ananya.sen@arzon.student');
                      setPassword('ArzonSecure2026!');
                      setError(null);
                    }}
                    className="p-2 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 text-left transition-all cursor-pointer"
                  >
                    <div className="flex items-center space-x-1 text-blue-700 mb-0.5">
                      <GraduationCap className="w-3 h-3" />
                      <span className="font-mono text-[9px] font-bold uppercase">Student</span>
                    </div>
                    <div className="text-[11px] font-medium text-stone-900 truncate">Ananya Sen</div>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* REGISTRATION FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Full Legal / Professional Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Ayesha Khan"
                    className="w-full pl-10 pr-3.5 py-2 border border-stone-300 rounded-xl text-xs font-sans focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 focus:border-[#1B3F8B] transition-all bg-stone-50/50 focus:bg-white"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Institutional Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. ayesha.khan@institution.edu"
                    className="w-full pl-10 pr-3.5 py-2 border border-stone-300 rounded-xl text-xs font-sans focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 focus:border-[#1B3F8B] transition-all bg-stone-50/50 focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Degree / Clinical Track
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <select
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2 border border-stone-300 rounded-xl text-xs font-sans focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 focus:border-[#1B3F8B] transition-all bg-stone-50/50 focus:bg-white cursor-pointer"
                  >
                    <option value="Pharm.D">Pharm.D (Doctor of Pharmacy)</option>
                    <option value="B.Pharm">B.Pharm (Bachelor of Pharmacy)</option>
                    <option value="M.Pharm">M.Pharm (Master of Pharmacy / Pharmacology)</option>
                    <option value="MBBS">MBBS (Bachelor of Medicine & Surgery)</option>
                    <option value="BDS">BDS (Dental Surgery)</option>
                    <option value="Life Sciences">Life Sciences (Biotech / Biochem / Microbiology)</option>
                    <option value="Clinical Operations">Clinical Operations / Pharmacovigilance Professional</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Security Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min 10 chars, uppercase, lowercase, number, symbol"
                    className="w-full pl-10 pr-10 py-2 border border-stone-300 rounded-xl text-xs font-sans focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 focus:border-[#1B3F8B] transition-all bg-stone-50/50 focus:bg-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 p-0.5 rounded cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Re-enter security password"
                    className="w-full pl-10 pr-3.5 py-2 border border-stone-300 rounded-xl text-xs font-sans focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 focus:border-[#1B3F8B] transition-all bg-stone-50/50 focus:bg-white"
                    required
                  />
                </div>
              </div>

              {/* Password Quality Checklist */}
              <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-[10px] font-mono space-y-1">
                <div className="text-stone-500 font-bold uppercase mb-1">ICH Security Standard</div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                  <div className={`flex items-center space-x-1 ${hasMinLength ? 'text-emerald-700 font-bold' : 'text-stone-400'}`}>
                    <span>{hasMinLength ? '✓' : '○'}</span>
                    <span>10+ characters</span>
                  </div>
                  <div className={`flex items-center space-x-1 ${hasUpper ? 'text-emerald-700 font-bold' : 'text-stone-400'}`}>
                    <span>{hasUpper ? '✓' : '○'}</span>
                    <span>Uppercase (A-Z)</span>
                  </div>
                  <div className={`flex items-center space-x-1 ${hasLower ? 'text-emerald-700 font-bold' : 'text-stone-400'}`}>
                    <span>{hasLower ? '✓' : '○'}</span>
                    <span>Lowercase (a-z)</span>
                  </div>
                  <div className={`flex items-center space-x-1 ${hasNumber ? 'text-emerald-700 font-bold' : 'text-stone-400'}`}>
                    <span>{hasNumber ? '✓' : '○'}</span>
                    <span>Number (0-9)</span>
                  </div>
                  <div className={`flex items-center space-x-1 ${hasSymbol ? 'text-emerald-700 font-bold' : 'text-stone-400'}`}>
                    <span>{hasSymbol ? '✓' : '○'}</span>
                    <span>Symbol (!@#$)</span>
                  </div>
                  <div className={`flex items-center space-x-1 ${passwordsMatch ? 'text-emerald-700 font-bold' : 'text-stone-400'}`}>
                    <span>{passwordsMatch ? '✓' : '○'}</span>
                    <span>Passwords match</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !isPolicySatisfied}
                className="w-full mt-2 bg-[#0B1325] hover:bg-[#1B3F8B] active:scale-[0.99] text-white py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-apple-subtle hover:shadow-apple-card flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <span>Registering Account...</span>
                ) : (
                  <>
                    <span>Register & Access ICSR Workbench</span>
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setError(null); }}
                  className="text-xs font-sans text-stone-500 hover:text-[#1B3F8B] transition-colors"
                >
                  Already have an institutional account? <strong className="underline">Sign in</strong>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Footer authoritative security note */}
      <div className="text-center py-4 text-[11px] font-mono text-stone-400 border-t border-black/[0.06] bg-stone-100/40">
        ARZON CAREER INTELLIGENCE · STRICT 21 CFR PART 11 AUDIT INTEGRITY · AIR-GAPPED EVALUATION ARCHITECTURE
      </div>
    </div>
  );
};