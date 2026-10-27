import React, { useState, useEffect } from 'react';
import { Assignment, PVCase, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  CheckSquare, Clock, AlertTriangle, ArrowRight, 
  Plus, Calendar, UserCheck, CheckCircle2, Laptop 
} from 'lucide-react';

interface AssignmentsPageProps {
  onOpenWorkbenchForCase: (caseId: string, assignmentId?: string) => void;
}

export const AssignmentsPage: React.FC<AssignmentsPageProps> = ({ onOpenWorkbenchForCase }) => {
  const { user, isStaff, users, getAuthHeaders } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Assignment Creation Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [cases, setCases] = useState<PVCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [instructions, setInstructions] = useState('');
  const [creating, setCreating] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();

      const res = await fetch('/api/assignments', { headers });
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments || []);
      }
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCasesForModal = async () => {
    try {
      const headers = getAuthHeaders();

      const res = await fetch('/api/cases', { headers });
      if (res.ok) {
        const data = await res.json();
        setCases(data.cases || []);
        if (data.cases.length > 0) {
          setSelectedCaseId(data.cases[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load cases:', err);
    }
  };

  useEffect(() => {
    fetchAssignments();
    if (isStaff) {
      fetchCasesForModal();
    }
  }, [user, isStaff]);

  const handleCreateAssignment = async () => {
    if (!selectedCaseId || selectedStudentIds.length === 0) return;

    try {
      setCreating(true);
      const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      };

      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          caseId: selectedCaseId,
          studentIds: selectedStudentIds,
          dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().replace('T', ' ').slice(0, 19),
          instructions
        })
      });

      if (res.ok) {
        setShowAssignModal(false);
        setSelectedStudentIds([]);
        setInstructions('');
        fetchAssignments();
      }
    } catch (err) {
      console.error('Failed to assign case:', err);
    } finally {
      setCreating(false);
    }
  };

  const studentUsers = users.filter(u => u.role === 'student');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-black/[0.06] pb-6">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-mono font-bold text-[#1B3F8B] uppercase tracking-widest mb-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500/20 ring-4 ring-blue-500/10"></span>
            <span>MODULE 04 · COHORT TASK ALLOCATION</span>
            <span className="text-stone-300">/</span>
            <span>TRAINING CADENCE</span>
          </div>
          <h2 className="font-sans font-bold text-2xl sm:text-3xl text-stone-900 tracking-tight">
            Student Case Assignments
          </h2>
          <p className="font-sans text-xs sm:text-sm text-stone-600 mt-1.5 max-w-2xl leading-relaxed">
            Monitor assigned ICSR practice scenarios, track submission milestones, and manage cohort deadlines across clinical training tracks.
          </p>
        </div>

        {isStaff && (
          <button
            onClick={() => setShowAssignModal(true)}
            className="bg-[#0B1325] hover:bg-[#1B3F8B] active:scale-95 text-white px-4 py-2 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center space-x-2 shadow-apple-subtle hover:shadow-apple-card transition-all"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Assign Case to Cohort</span>
          </button>
        )}
      </div>

      {/* Assignment List */}
      {loading ? (
        <div className="text-center py-20">
          <div className="w-9 h-9 border-2 border-[#1B3F8B] border-t-transparent rounded-full animate-spin mx-auto mb-3.5"></div>
          <p className="font-mono text-xs text-stone-500 uppercase tracking-wider">Loading Assignments...</p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-20 apple-card p-8">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-3 text-stone-400">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h3 className="font-sans font-bold text-stone-800 text-lg">No Active Assignments</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
            There are currently no assignments matching your profile. Faculty can allocate cases using the assign button above.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map(a => {
            const isOverdue = a.status === 'overdue';
            const isSubmitted = a.status === 'submitted' || a.status === 'completed';
            const isInProgress = a.status === 'in_progress';

            return (
              <div 
                key={a.id}
                className="apple-card p-5 sm:p-6 hover:shadow-apple-card transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-[#0B1325] text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                      {a.caseNumber}
                    </span>

                    {/* Status Badge */}
                    <span className={`font-mono text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ring-1 ${
                      isSubmitted
                        ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                        : isOverdue
                        ? 'bg-rose-50 text-rose-800 ring-rose-200'
                        : isInProgress
                        ? 'bg-blue-50 text-blue-800 ring-blue-200'
                        : 'bg-stone-100 text-stone-700 ring-stone-200'
                    }`}>
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
                        isSubmitted ? 'bg-emerald-500' : isOverdue ? 'bg-rose-500' : isInProgress ? 'bg-blue-500' : 'bg-stone-400'
                      }`}></span>
                      {a.status.replace('_', ' ')}
                    </span>

                    {isStaff && (
                      <span className="font-sans text-xs text-stone-600 flex items-center space-x-1.5 bg-stone-50 px-2.5 py-0.5 rounded-full border border-black/[0.05]">
                        <span className="text-stone-400 font-mono text-[10px] uppercase font-medium">Student:</span>
                        <strong className="text-stone-800">{a.studentName}</strong>
                        <span className="text-stone-400 font-mono text-[10px]">({a.studentEmail})</span>
                      </span>
                    )}
                  </div>

                  <h3 className="font-sans font-bold text-lg text-stone-900 group-hover:text-[#1B3F8B] transition-colors">
                    {a.caseTitle}
                  </h3>

                  {a.instructions && (
                    <p className="text-xs text-stone-600 font-sans italic line-clamp-2 leading-relaxed">
                      "{a.instructions}"
                    </p>
                  )}

                  <div className="flex items-center space-x-3 text-xs font-mono text-stone-500 pt-1">
                    <span className="flex items-center space-x-1.5 bg-stone-50 px-2.5 py-0.5 rounded-lg border border-black/[0.05]">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>Due: <strong className="text-stone-800">{a.dueDate}</strong></span>
                    </span>
                    {a.score !== undefined && a.score !== null && (
                      <span className="font-bold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 px-2.5 py-0.5 rounded-full tabular-nums">
                        Score: {a.score}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
                  <button
                    onClick={() => onOpenWorkbenchForCase(a.caseId, a.id)}
                    className="w-full md:w-auto bg-[#0B1325] hover:bg-[#1B3F8B] active:scale-95 text-white px-4 py-2 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 shadow-apple-subtle transition-all"
                  >
                    <Laptop className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isSubmitted ? 'View Submission' : 'Launch Workbench'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assignment Modal (Staff Only) */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-stone-950/40 backdrop-blur-md z-50 overflow-y-auto animate-in fade-in duration-200">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-black/[0.08] shadow-apple-modal space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="font-sans font-bold text-xl text-stone-900 border-b border-black/[0.06] pb-3">
              Assign ICSR Case to Cohort
            </h3>

            {/* Select Case */}
            <div>
              <label className="block text-xs font-mono font-bold text-stone-600 uppercase mb-1.5">
                Select Case from Library
              </label>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="w-full border border-black/[0.08] rounded-xl p-2.5 text-xs font-sans bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 transition-all cursor-pointer"
              >
                {cases.map(c => (
                  <option key={c.id} value={c.id}>
                    [{c.caseNumber}] {c.title} ({c.difficulty})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Students */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono font-bold text-stone-600 uppercase">
                  Select Students ({selectedStudentIds.length} / {studentUsers.length} selected)
                </label>
                <div className="space-x-2 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => {
                      const visibleIds = studentUsers
                        .filter(s => !studentSearch || s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase()) || (s.cohort || '').toLowerCase().includes(studentSearch.toLowerCase()))
                        .map(s => s.id);
                      setSelectedStudentIds(Array.from(new Set([...selectedStudentIds, ...visibleIds])));
                    }}
                    className="text-[#1B3F8B] hover:underline font-bold"
                  >
                    Select Visible
                  </button>
                  <span className="text-stone-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedStudentIds([])}
                    className="text-stone-500 hover:underline"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Student Search for High-Volume Scaling */}
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Filter by student name, email, or cohort..."
                className="w-full mb-2 px-3 py-1.5 border border-black/[0.08] rounded-xl text-xs font-sans bg-stone-50/70 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3F8B]"
              />

              <div className="max-h-36 overflow-y-auto border border-black/[0.08] rounded-2xl p-2.5 space-y-1.5 bg-stone-50/70">
                {studentUsers
                  .filter(st => !studentSearch || st.fullName.toLowerCase().includes(studentSearch.toLowerCase()) || st.email.toLowerCase().includes(studentSearch.toLowerCase()) || (st.cohort || '').toLowerCase().includes(studentSearch.toLowerCase()))
                  .map(st => {
                    const checked = selectedStudentIds.includes(st.id);
                    return (
                      <label 
                        key={st.id} 
                        className="flex items-center space-x-2 text-xs cursor-pointer p-1.5 rounded-lg hover:bg-white transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudentIds([...selectedStudentIds, st.id]);
                            } else {
                              setSelectedStudentIds(selectedStudentIds.filter(id => id !== st.id));
                            }
                          }}
                          className="rounded-md text-[#1B3F8B] focus:ring-0"
                        />
                        <span className="font-medium text-stone-800">{st.fullName}</span>
                        <span className="text-stone-400 font-mono text-[10px]">({st.email})</span>
                        {st.cohort && (
                          <span className="text-stone-500 font-mono text-[9px] bg-stone-200/60 px-1 rounded">
                            {st.cohort}
                          </span>
                        )}
                      </label>
                    );
                  })}
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-mono font-bold text-stone-600 uppercase mb-1.5">
                Submission Due Date & Time
              </label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-black/[0.08] rounded-xl p-2.5 text-xs font-mono bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 transition-all"
              />
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-xs font-mono font-bold text-stone-600 uppercase mb-1.5">
                Assignment Instructions & Evaluation Focus
              </label>
              <textarea
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Focus on MedDRA PT coding of multiorgan involvement and justify WHO-UMC causality..."
                className="w-full border border-black/[0.08] rounded-xl p-2.5 text-xs font-sans bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 transition-all"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-black/[0.06]">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateAssignment}
                disabled={creating || selectedStudentIds.length === 0}
                className="bg-[#0B1325] hover:bg-[#1B3F8B] active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider disabled:opacity-50 shadow-apple-subtle transition-all"
              >
                {creating ? 'Assigning...' : 'Assign Case'}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

    </div>
  );
};
