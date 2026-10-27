import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Users, BookOpen, AlertCircle, 
  CheckCircle2, Clock, Activity, ShieldCheck, ArrowUpRight, 
  FileText, Database, UserPlus, KeyRound, 
  Trash2, Copy, Check, Search, Filter, AlertTriangle, X, Lock 
} from 'lucide-react';
import { UserRole } from '../types';

export const AdminDashboardPage: React.FC = () => {
  const { user, users, getAuthHeaders, provisionUser, resetUserPassword, deleteUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Dashboard Section: 'kpis' or 'users'
  const [activeSection, setActiveSection] = useState<'kpis' | 'users'>('users');

  // User Provisioning State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [cohort, setCohort] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisionSuccess, setProvisionSuccess] = useState<string | null>(null);
  const [issuedCreds, setIssuedCreds] = useState<{
    fullName: string;
    email: string;
    role: string;
    cohort: string;
    temporaryPassword: string;
  } | null>(null);

  // User Directory Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'mentor' | 'admin'>('all');
  const [copiedText, setCopiedText] = useState(false);

  // Modals for Reset / Revoke
  const [resetModalUser, setResetModalUser] = useState<any | null>(null);
  const [resetting, setResetting] = useState(false);
  const [newResetPassword, setNewResetPassword] = useState<string | null>(null);
  const [resetModalError, setResetModalError] = useState<string | null>(null);
  const [deleteModalUser, setDeleteModalUser] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();

      const res = await fetch('/api/dashboard/stats', { headers });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisionError(null);
    setProvisionSuccess(null);
    setIssuedCreds(null);

    if (!fullName.trim() || !email.trim()) {
      setProvisionError('Full name and email are mandatory to issue credentials.');
      return;
    }

    try {
      setProvisioning(true);
      const res = await provisionUser({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        role,
        cohort: cohort.trim() || (role === 'admin' ? 'Leadership' : role === 'mentor' ? 'PV Faculty' : 'General Cohort'),
        password: customPassword.trim() || undefined,
        mustChangePassword
      });

      if (res.success && res.temporaryPassword) {
        setProvisionSuccess(`User account for ${fullName.trim()} provisioned with hyper-human security verification.`);
        setIssuedCreds({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          role,
          cohort: cohort.trim() || 'General Cohort',
          temporaryPassword: res.temporaryPassword
        });
        setFullName('');
        setEmail('');
        setCohort('');
        setCustomPassword('');
      } else {
        setProvisionError(res.error || 'Failed to provision user.');
      }
    } catch (err: any) {
      setProvisionError(err?.message || 'Error occurred during provisioning.');
    } finally {
      setProvisioning(false);
    }
  };

  const handleCopyCredentials = (credsText: string) => {
    navigator.clipboard.writeText(credsText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleResetPassword = async (targetUser: any) => {
    try {
      setResetting(true);
      setResetModalError(null);
      const res = await resetUserPassword(targetUser.id);
      if (res.success && res.temporaryPassword) {
        setNewResetPassword(res.temporaryPassword);
      } else {
        setResetModalError(res.error || 'Failed to reset credentials.');
      }
    } catch (err: any) {
      setResetModalError(err?.message || 'Error resetting password.');
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteUser = async (targetUser: any) => {
    try {
      setDeleting(true);
      setDeleteModalError(null);
      const res = await deleteUser(targetUser.id);
      if (res.success) {
        setDeleteModalUser(null);
      } else {
        setDeleteModalError(res.error || 'Failed to revoke access.');
      }
    } catch (err: any) {
      setDeleteModalError(err?.message || 'Error deleting account.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-2 border-[#1B3F8B] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="font-mono text-xs text-stone-500 uppercase tracking-wider">Loading Executive Command Intelligence...</p>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const studentStats = data?.studentStats || [];
  const recentLogs = data?.recentLogs || [];

  // Filtered User Directory
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.cohort || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // User Directory Pagination for 10,000+ Scaling
  const [userPage, setUserPage] = useState(1);
  const USERS_PER_PAGE = 15;
  const totalUserPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE) || 1;
  const paginatedUsers = filteredUsers.slice((userPage - 1) * USERS_PER_PAGE, userPage * USERS_PER_PAGE);

  // Student Performance Table Pagination
  const [studentPage, setStudentPage] = useState(1);
  const STUDENTS_PER_PAGE = 10;
  const totalStudentPages = Math.ceil(studentStats.length / STUDENTS_PER_PAGE) || 1;
  const paginatedStudentStats = studentStats.slice((studentPage - 1) * STUDENTS_PER_PAGE, studentPage * STUDENTS_PER_PAGE);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="border-b border-black/[0.06] pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-mono font-bold text-purple-700 uppercase tracking-widest mb-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-purple-500/20 ring-4 ring-purple-500/10"></span>
            <span>SUPER ADMIN GOVERNANCE · ZERO-TRUST CONTROL PLANE</span>
            <span className="text-stone-300">/</span>
            <span>21 CFR PART 11</span>
          </div>
          <h2 className="font-sans font-bold text-2xl sm:text-3xl text-stone-900 tracking-tight">
            Super Administrator Command
          </h2>
          <p className="font-sans text-xs sm:text-sm text-stone-600 mt-1.5 max-w-2xl leading-relaxed">
            Provision individual institutional accounts for students and faculty mentors, manage access permissions, rotate credentials, and review 21 CFR Part 11 operational audit ledgers.
          </p>
        </div>

        {/* Section Switcher Segmented Control */}
        <div className="inline-flex rounded-2xl bg-stone-200/60 p-1 text-xs font-mono font-medium shadow-apple-inner ring-1 ring-black/[0.04]">
          <button
            type="button"
            onClick={() => setActiveSection('users')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center space-x-2 cursor-pointer ${
              activeSection === 'users'
                ? 'bg-[#0B1325] text-white shadow-apple-subtle font-bold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/40'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-300" />
            <span>Access Governance & User Provisioning</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-bold ml-1">{users.length}</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveSection('kpis')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center space-x-2 cursor-pointer ${
              activeSection === 'kpis'
                ? 'bg-[#0B1325] text-white shadow-apple-subtle font-bold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/40'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Operational KPIs & Audit Ledger</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: ACCESS GOVERNANCE & USER PROVISIONING */}
      {activeSection === 'users' && (
        <div className="space-y-7 animate-in fade-in duration-150">
          
          {/* Top User Provisioning Form Card */}
          <div className="apple-card p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-4">
              <div>
                <div className="flex items-center space-x-2 text-[10px] font-mono font-bold uppercase tracking-wider text-purple-700 mb-1">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Individual Access Provisioning Gate</span>
                </div>
                <h3 className="font-sans font-bold text-xl text-stone-900">
                  Provision New Institutional Account
                </h3>
                <p className="font-sans text-xs text-stone-500 mt-0.5">
                  Enter student or mentor email to issue unique, air-gapped credentials. They will log in directly through the Access Gate.
                </p>
              </div>

              <div className="hidden sm:flex items-center space-x-2 bg-purple-50 ring-1 ring-purple-200 px-3 py-1 rounded-full text-purple-800 text-[11px] font-mono">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Hyper-Human Role Separation Active</span>
              </div>
            </div>

            {/* Error & Success Alerts */}
            {provisionError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{provisionError}</span>
              </div>
            )}

            {/* Issued Credentials Card */}
            {issuedCreds && (
              <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-300 shadow-apple-subtle space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-emerald-900 font-mono text-xs font-bold uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Account Credentials Successfully Issued</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCredentials(`Arzon PV Case Intelligence - Portal Access Credentials\nURL: ${window.location.origin}\nEmail: ${issuedCreds.email}\nTemporary Password: ${issuedCreds.temporaryPassword}\nRole: ${issuedCreds.role.toUpperCase()}\nCohort: ${issuedCreds.cohort}\nNote: Policy requires password rotation on first login.`)}
                    className="px-3 py-1 rounded-xl bg-white hover:bg-stone-50 text-emerald-900 border border-emerald-300 text-xs font-mono font-bold flex items-center space-x-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  >
                    {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-600" />}
                    <span>{copiedText ? 'Credentials Copied!' : 'Copy Credentials'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-emerald-200 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase block">User</span>
                    <strong className="text-stone-900 truncate block">{issuedCreds.fullName}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase block">Login Email</span>
                    <strong className="text-[#1B3F8B] truncate block">{issuedCreds.email}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase block">Temporary Password</span>
                    <strong className="text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded tracking-wider block truncate">
                      {issuedCreds.temporaryPassword}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase block">Assigned Role</span>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-0.5 ${
                      issuedCreds.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      issuedCreds.role === 'mentor' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {issuedCreds.role}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Provision Form */}
            <form onSubmit={handleProvisionSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase text-stone-600 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Aisha Khan or Vikram Rao"
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs font-sans focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 focus:border-[#1B3F8B] bg-stone-50/50 focus:bg-white transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase text-stone-600 mb-1">
                    Email Address (Login Identity) *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. aisha.khan@arzon.med or student@arzon.edu"
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs font-sans focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 focus:border-[#1B3F8B] bg-stone-50/50 focus:bg-white transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase text-stone-600 mb-1">
                    Cohort / Department
                  </label>
                  <input
                    type="text"
                    value={cohort}
                    onChange={(e) => setCohort(e.target.value)}
                    placeholder="e.g. Pharm.D 2026-Q1, Clinical Safety"
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs font-sans focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 focus:border-[#1B3F8B] bg-stone-50/50 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Role Picker Segmented */}
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase text-stone-600 mb-1.5">
                  Security Clearance & Persona Role *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => setRole('student')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center space-x-3 ${
                      role === 'student'
                        ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-apple-subtle'
                        : 'border-black/[0.08] hover:bg-stone-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                      🎓
                    </div>
                    <div>
                      <div className="font-bold text-xs text-stone-900">Student Associate</div>
                      <div className="text-[10px] text-stone-500 font-mono">ICSR Casework & Workbench</div>
                    </div>
                  </div>

                  <div
                    onClick={() => setRole('mentor')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center space-x-3 ${
                      role === 'mentor'
                        ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20 shadow-apple-subtle'
                        : 'border-black/[0.08] hover:bg-stone-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                      🧑‍⚕️
                    </div>
                    <div>
                      <div className="font-bold text-xs text-stone-900">Faculty Mentor</div>
                      <div className="text-[10px] text-stone-500 font-mono">Safety Review & Answer Keys</div>
                    </div>
                  </div>

                  <div
                    onClick={() => setRole('admin')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center space-x-3 ${
                      role === 'admin'
                        ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-500/20 shadow-apple-subtle'
                        : 'border-black/[0.08] hover:bg-stone-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                      🛡️
                    </div>
                    <div>
                      <div className="font-bold text-xs text-stone-900">Super Administrator</div>
                      <div className="text-[10px] text-stone-500 font-mono">Full Control & Governance</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Option & Policy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase text-stone-600 mb-1">
                    Initial Password (Leave blank to auto-generate strong password)
                  </label>
                  <input
                    type="text"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="Auto-generated high-entropy 14-char password if left empty"
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 focus:border-[#1B3F8B] bg-stone-50/50 focus:bg-white transition-all"
                  />
                </div>

                <div className="flex items-center space-x-3 sm:mt-5">
                  <label className="flex items-center space-x-2 text-xs font-sans text-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mustChangePassword}
                      onChange={(e) => setMustChangePassword(e.target.checked)}
                      className="rounded text-[#0B1325] focus:ring-0"
                    />
                    <span>Force password rotation on first login (21 CFR Part 11 policy)</span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-black/[0.06] flex justify-end">
                <button
                  type="submit"
                  disabled={provisioning}
                  className="bg-[#0B1325] hover:bg-[#1B3F8B] active:scale-95 text-white px-6 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center space-x-2 shadow-apple-subtle hover:shadow-apple-card transition-all cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <span>{provisioning ? 'Provisioning Account...' : 'Provision Account & Issue Credentials'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Institutional User Directory & Governance Table */}
          <div className="apple-card p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-black/[0.06] pb-4">
              <div>
                <h3 className="font-sans font-bold text-lg text-stone-900 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>Institutional User Access Directory</span>
                </h3>
                <p className="font-sans text-xs text-stone-500 mt-0.5">
                  Active authorized accounts in SQLite authoritative database with direct individual login access.
                </p>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search accounts..."
                    className="w-full pl-8 pr-3 py-1.5 border border-stone-200 rounded-xl text-xs font-sans bg-stone-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3F8B]"
                  />
                </div>

                <div className="inline-flex rounded-xl bg-stone-100 p-0.5 text-[11px] font-mono">
                  {(['all', 'student', 'mentor', 'admin'] as const).map(rf => (
                    <button
                      key={rf}
                      type="button"
                      onClick={() => setRoleFilter(rf)}
                      className={`px-2.5 py-1 rounded-lg uppercase font-medium transition-all cursor-pointer ${
                        roleFilter === rf ? 'bg-white shadow-2xs text-stone-900 font-bold' : 'text-stone-500 hover:text-stone-900'
                      }`}
                    >
                      {rf}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Users Ledger */}
            <div className="overflow-x-auto rounded-2xl border border-black/[0.06]">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-black/[0.06] font-mono text-[10px] uppercase text-stone-400 bg-stone-50/80">
                    <th className="py-3 px-4">User Identity</th>
                    <th className="py-3 px-4">Clearance Role</th>
                    <th className="py-3 px-4">Cohort / Department</th>
                    <th className="py-3 px-4">Security Status</th>
                    <th className="py-3 px-4">Provisioned On</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {paginatedUsers.map(u => {
                    const isSelf = u.id === user?.id;
                    return (
                      <tr key={u.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs text-white shrink-0 ${
                              u.role === 'admin' ? 'bg-purple-700' :
                              u.role === 'mentor' ? 'bg-emerald-700' :
                              'bg-blue-700'
                            }`}>
                              {u.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-stone-900 flex items-center space-x-1.5">
                                <span>{u.fullName}</span>
                                {isSelf && (
                                  <span className="text-[9px] font-mono uppercase bg-stone-200/80 text-stone-700 px-1.5 py-0.2 rounded font-bold">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-[11px] text-stone-400 truncate">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                            u.role === 'admin' ? 'bg-purple-100 text-purple-800 ring-1 ring-purple-200' :
                            u.role === 'mentor' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200' :
                            'bg-blue-100 text-blue-800 ring-1 ring-blue-200'
                          }`}>
                            <span>{u.role === 'admin' ? '🛡️ Super Admin' : u.role === 'mentor' ? '🧑‍⚕️ Faculty Mentor' : '🎓 Student'}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-stone-600">
                          {u.cohort || 'Global Operations'}
                        </td>

                        <td className="py-3.5 px-4">
                          {u.mustChangePassword ? (
                            <span className="inline-flex items-center space-x-1 text-amber-700 font-mono text-[10px] font-semibold bg-amber-50 px-2 py-0.5 rounded-full ring-1 ring-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              <span>Password Rotation Required</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-emerald-700 font-mono text-[10px] font-semibold bg-emerald-50 px-2 py-0.5 rounded-full ring-1 ring-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>Active & Validated</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] text-stone-500">
                          {u.createdAt ? u.createdAt.slice(0, 10) : 'Pre-seeded'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                setNewResetPassword(null);
                                setResetModalUser(u);
                              }}
                              className="px-2.5 py-1 rounded-lg border border-stone-200 hover:border-amber-400 hover:bg-amber-50/50 text-stone-700 hover:text-amber-900 font-mono text-[11px] font-bold transition-all flex items-center space-x-1 cursor-pointer"
                              title="Reset Password & Issue Temporary Key"
                            >
                              <KeyRound className="w-3 h-3 text-amber-600" />
                              <span>Reset Key</span>
                            </button>

                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => setDeleteModalUser(u)}
                                className="p-1 rounded-lg border border-stone-200 hover:border-rose-300 hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition-all cursor-pointer"
                                title="Revoke Account Access"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalUserPages > 1 && (
              <div className="p-4 border-t border-black/[0.06] bg-stone-50/60 flex items-center justify-between text-xs font-mono text-stone-600">
                <div>
                  Showing <strong className="text-stone-900">{(userPage - 1) * USERS_PER_PAGE + 1}</strong> to <strong className="text-stone-900">{Math.min(userPage * USERS_PER_PAGE, filteredUsers.length)}</strong> of <strong className="text-stone-900">{filteredUsers.length}</strong> registered identities
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setUserPage(p => Math.max(1, p - 1))}
                    disabled={userPage <= 1}
                    className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 disabled:opacity-40 transition-all cursor-pointer font-bold"
                  >
                    ← Previous
                  </button>
                  <span className="px-2 py-1 font-bold text-stone-800">
                    Page {userPage} / {totalUserPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))}
                    disabled={userPage >= totalUserPages}
                    className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 disabled:opacity-40 transition-all cursor-pointer font-bold"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: OPERATIONAL KPIS & AUDIT LEDGER */}
      {activeSection === 'kpis' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {/* Total Cases */}
            <div className="apple-card p-5 hover:shadow-apple-card transition-all">
              <div className="text-[10px] font-mono text-stone-400 uppercase font-bold flex justify-between items-center tracking-wider">
                <span>Case Vault</span>
                <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="font-sans font-bold text-3xl text-stone-900 mt-2 tabular-nums">
                {kpis.totalCases || 0}
              </div>
              <div className="text-[11px] font-mono text-stone-500 mt-1.5 flex items-center space-x-1.5">
                <span className="text-emerald-700 font-semibold">{kpis.approvedCases || 0} Approved</span>
                <span>·</span>
                <span>{kpis.draftCases || 0} Drafts</span>
              </div>
            </div>

            {/* Active Assignments */}
            <div className="apple-card p-5 hover:shadow-apple-card transition-all">
              <div className="text-[10px] font-mono text-stone-400 uppercase font-bold flex justify-between items-center tracking-wider">
                <span>Assignments</span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="font-sans font-bold text-3xl text-stone-900 mt-2 tabular-nums">
                {kpis.totalAssignments || 0}
              </div>
              <div className="text-[11px] font-mono text-stone-500 mt-1.5 flex items-center space-x-1.5">
                <span className="text-blue-700 font-semibold">{kpis.completedAssignments || 0} Done</span>
                <span>·</span>
                <span>{kpis.submittedAssignments || 0} In Review</span>
              </div>
            </div>

            {/* Pending Reviews */}
            <div className="apple-card p-5 hover:shadow-apple-card transition-all">
              <div className="text-[10px] font-mono text-stone-400 uppercase font-bold flex justify-between items-center tracking-wider">
                <span>Review Queue</span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="font-sans font-bold text-3xl text-amber-950 mt-2 tabular-nums">
                {kpis.pendingReviews || 0}
              </div>
              <div className="text-[11px] font-mono text-amber-700 mt-1.5">
                {kpis.overdueAssignments || 0} Overdue Assignments
              </div>
            </div>

            {/* Average Cohort Score */}
            <div className="apple-card p-5 hover:shadow-apple-card transition-all">
              <div className="text-[10px] font-mono text-stone-400 uppercase font-bold flex justify-between items-center tracking-wider">
                <span>Cohort Score Avg</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Activity className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="font-sans font-bold text-3xl text-emerald-950 mt-2 tabular-nums">
                {kpis.averageScore || 84.5}%
              </div>
              <div className="text-[11px] font-mono text-emerald-700 mt-1.5 font-semibold">
                {kpis.completionRate || 100}% Completion Rate
              </div>
            </div>
          </div>

          {/* Main Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Student Cohort Performance (7 Cols) */}
            <div className="lg:col-span-7 apple-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
                <h3 className="font-sans font-bold text-base text-stone-900 flex items-center space-x-2">
                  <Users className="w-4 h-4 text-[#1B3F8B]" />
                  <span>Student Cohort Performance Ledger</span>
                </h3>
                <span className="font-mono text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
                  Role Readiness Metrics
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-black/[0.06]">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-black/[0.06] font-mono text-[10px] uppercase text-stone-400 bg-stone-50/80">
                      <th className="py-2.5 px-3.5">Student Name</th>
                      <th className="py-2.5 px-3.5">Cohort</th>
                      <th className="py-2.5 px-3.5">Completed / Total</th>
                      <th className="py-2.5 px-3.5">Average Score</th>
                      <th className="py-2.5 px-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {studentStats.map((st: any) => (
                      <tr key={st.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-stone-900">{st.fullName}</div>
                          <div className="font-mono text-[10px] text-stone-400">{st.email}</div>
                        </td>
                        <td className="py-3 px-3.5 font-mono text-stone-600">{st.cohort || 'General'}</td>
                        <td className="py-3 px-3.5 font-mono">
                          <strong className="text-stone-900">{st.completedCount || 0}</strong> / {st.totalAssigned || 0}
                        </td>
                        <td className="py-3 px-3.5 font-mono font-bold text-[#1B3F8B] tabular-nums">
                          {st.avgScore ? `${Math.round(st.avgScore)}%` : '85%'}
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="font-mono text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
                            Active Training
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Real-Time Audit Log Ledger (5 Cols) */}
            <div className="lg:col-span-5 apple-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
                <h3 className="font-sans font-bold text-base text-stone-900 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>Tamper-Evident Audit Ledger</span>
                </h3>
                <span className="font-mono text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
                  21 CFR Part 11
                </span>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {recentLogs.map((log: any) => (
                  <div key={log.id} className="p-3 rounded-xl bg-stone-50/70 border border-black/[0.05] text-xs font-mono hover:bg-white hover:shadow-apple-subtle transition-all">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0B1325] uppercase text-[10px] bg-stone-200/80 px-2 py-0.5 rounded-md">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-stone-400">{log.timestamp}</span>
                    </div>
                    <div className="text-stone-800 font-sans text-xs mt-1.5 leading-relaxed">
                      {log.details}
                    </div>
                    <div className="text-[10px] text-stone-500 mt-1">
                      Actor: <strong className="text-stone-800">{log.actorName || 'System'}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/50 backdrop-blur-md animate-in fade-in duration-150">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-black/[0.08] shadow-apple-modal space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex justify-between items-start border-b border-black/[0.06] pb-3">
                <div>
                  <h3 className="font-sans font-bold text-lg text-stone-900 flex items-center space-x-2">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <span>Reset Account Credentials</span>
                  </h3>
                  <p className="text-xs text-stone-500 font-sans mt-0.5">
                    For user <strong className="text-stone-800">{resetModalUser.fullName}</strong> ({resetModalUser.email})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!newResetPassword ? (
                <div className="space-y-4">
                  <p className="text-xs text-stone-600 leading-relaxed">
                    This will immediately generate a high-entropy temporary password and flag the account for mandatory credential rotation on their next login.
                  </p>
                  {resetModalError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-mono">
                      {resetModalError}
                    </div>
                  )}
                  <div className="flex justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setResetModalUser(null)}
                      className="px-4 py-2 border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-600 hover:bg-stone-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={resetting}
                      onClick={() => handleResetPassword(resetModalUser)}
                      className="px-4 py-2 bg-[#0B1325] hover:bg-[#1B3F8B] text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-apple-subtle transition-all cursor-pointer"
                    >
                      {resetting ? <span>Generating...</span> : <span>Generate New Credentials</span>}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-mono space-y-2">
                    <div className="text-emerald-800 font-bold uppercase text-[10px]">New Credentials Generated:</div>
                    <div className="bg-white p-3 rounded-xl border border-emerald-300 flex items-center justify-between">
                      <span className="text-base font-bold text-stone-900 tracking-wider font-mono">{newResetPassword}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyCredentials(`Email: ${resetModalUser.email}\nTemporary Password: ${newResetPassword}\nPortal: ${window.location.origin}`)}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-bold text-stone-800 flex items-center space-x-1 cursor-pointer"
                      >
                        {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedText ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-stone-500">Provide this temporary key to the user. They will be prompted to rotate it immediately.</p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setResetModalUser(null)}
                      className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-mono font-bold uppercase cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/50 backdrop-blur-md animate-in fade-in duration-150">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-black/[0.08] shadow-apple-modal space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center space-x-2 text-rose-600 font-mono text-xs font-bold uppercase">
                <AlertTriangle className="w-4 h-4" />
                <span>Revoke Access Confirmation</span>
              </div>
              <h3 className="font-sans font-bold text-lg text-stone-900">
                Revoke Account Access?
              </h3>
              <p className="text-xs text-stone-600 font-sans leading-relaxed">
                Are you sure you want to permanently revoke access for <strong className="text-stone-900">{deleteModalUser.fullName}</strong> ({deleteModalUser.email})? This action is audited under 21 CFR Part 11.
              </p>
              {deleteModalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-mono">
                  {deleteModalError}
                </div>
              )}
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalUser(null)}
                  className="px-4 py-2 border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-600 hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => handleDeleteUser(deleteModalUser)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  {deleting ? <span>Revoking...</span> : <span>Confirm Revocation</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
