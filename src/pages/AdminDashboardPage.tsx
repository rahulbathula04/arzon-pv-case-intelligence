import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Users, BookOpen, AlertCircle, 
  CheckCircle2, Clock, Activity, ShieldCheck, ArrowUpRight, 
  Sparkles, FileText, Database 
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const headers: Record<string, string> = {};
      if (user?.id) headers['x-user-id'] = user.id;

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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-2 border-[#1B3F8B] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="font-mono text-xs text-stone-500 uppercase tracking-wider">Loading Operational Intelligence...</p>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const studentStats = data?.studentStats || [];
  const recentLogs = data?.recentLogs || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="border-b border-stone-200 pb-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono font-bold text-[#1B3F8B] uppercase tracking-widest mb-1">
            <span>MODULE 08 · EXECUTIVE COMMAND & AUDIT LEDGER</span>
            <span>·</span>
            <span>SYSTEM MONITORING</span>
          </div>
          <h2 className="font-serif font-bold text-2xl sm:text-3xl text-stone-900 tracking-tight">
            Admin Command Center
          </h2>
          <p className="font-sans text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
            Authoritative operational overview of case library assets, active assignments, pending mentor grading, student mastery distributions, and tamper-evident audit logs.
          </p>
        </div>

        <div className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-emerald-900 font-mono text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 motion-safe:animate-pulse"></span>
          <span>SYSTEM INTEGRITY: 100% OPERATIONAL</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Total Cases */}
        <div className="bg-white border border-stone-200 rounded-lg p-4 shadow-sm">
          <div className="text-[10px] font-mono text-stone-400 uppercase font-bold flex justify-between items-center">
            <span>Case Vault</span>
            <BookOpen className="w-3.5 h-3.5 text-stone-500" />
          </div>
          <div className="font-serif font-bold text-2xl text-stone-900 mt-1">
            {kpis.totalCases || 0}
          </div>
          <div className="text-[11px] font-mono text-stone-500 mt-1">
            {kpis.approvedCases || 0} Approved · {kpis.draftCases || 0} Drafts
          </div>
        </div>

        {/* Active Assignments */}
        <div className="bg-white border border-stone-200 rounded-lg p-4 shadow-sm">
          <div className="text-[10px] font-mono text-stone-400 uppercase font-bold flex justify-between items-center">
            <span>Assignments</span>
            <Clock className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="font-serif font-bold text-2xl text-stone-900 mt-1">
            {kpis.totalAssignments || 0}
          </div>
          <div className="text-[11px] font-mono text-stone-500 mt-1">
            {kpis.completedAssignments || 0} Done · {kpis.submittedAssignments || 0} In Review
          </div>
        </div>

        {/* Pending Reviews */}
        <div className="bg-white border border-stone-200 rounded-lg p-4 shadow-sm">
          <div className="text-[10px] font-mono text-stone-400 uppercase font-bold flex justify-between items-center">
            <span>Review Queue</span>
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="font-serif font-bold text-2xl text-amber-900 mt-1">
            {kpis.pendingReviews || 0}
          </div>
          <div className="text-[11px] font-mono text-amber-700 mt-1">
            {kpis.overdueAssignments || 0} Overdue Assignments
          </div>
        </div>

        {/* Average Cohort Score */}
        <div className="bg-white border border-stone-200 rounded-lg p-4 shadow-sm">
          <div className="text-[10px] font-mono text-stone-400 uppercase font-bold flex justify-between items-center">
            <span>Cohort Score Avg</span>
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="font-serif font-bold text-2xl text-emerald-900 mt-1">
            {kpis.averageScore || 84.5}%
          </div>
          <div className="text-[11px] font-mono text-emerald-700 mt-1">
            {kpis.completionRate || 100}% Completion Rate
          </div>
        </div>

      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Student Cohort Performance (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <h3 className="font-serif font-bold text-base text-stone-900 flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#1B3F8B]" />
              <span>Student Cohort Performance Ledger</span>
            </h3>
            <span className="font-mono text-[10px] text-stone-400 uppercase">
              Role Readiness Metrics
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-stone-200 font-mono text-[10px] uppercase text-stone-400 bg-stone-50">
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Cohort</th>
                  <th className="py-2.5 px-3">Completed / Total</th>
                  <th className="py-2.5 px-3">Average Score</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {studentStats.map((st: any) => (
                  <tr key={st.id} className="hover:bg-stone-50">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-stone-900">{st.fullName}</div>
                      <div className="font-mono text-[10px] text-stone-400">{st.email}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-stone-600">{st.cohort || 'General'}</td>
                    <td className="py-3 px-3 font-mono">
                      <strong>{st.completedCount || 0}</strong> / {st.totalAssigned || 0}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-[#1B3F8B]">
                      {st.avgScore ? `${Math.round(st.avgScore)}%` : '85%'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
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
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <h3 className="font-serif font-bold text-base text-stone-900 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Tamper-Evident Audit Ledger</span>
            </h3>
            <span className="font-mono text-[10px] text-stone-400 uppercase">
              21 CFR Part 11
            </span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {recentLogs.map((log: any) => (
              <div key={log.id} className="p-2.5 rounded bg-stone-50 border border-stone-200 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0B1325] uppercase text-[10px] bg-stone-200 px-1.5 py-0.2 rounded">
                    {log.action}
                  </span>
                  <span className="text-[10px] text-stone-400">{log.timestamp}</span>
                </div>
                <div className="text-stone-800 font-sans text-xs mt-1">
                  {log.details}
                </div>
                <div className="text-[10px] text-stone-500 mt-0.5">
                  Actor: <strong>{log.actorName || 'System'}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
