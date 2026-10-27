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
  const { user, isStaff, users } = useAuth();
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

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const headers: Record<string, string> = {};
      if (user?.id) headers['x-user-id'] = user.id;

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
      const headers: Record<string, string> = {};
      if (user?.id) headers['x-user-id'] = user.id;

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
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.id) headers['x-user-id'] = user.id;

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono font-bold text-[#1B3F8B] uppercase tracking-widest mb-1">
            <span>MODULE 04 · COHORT TASK ALLOCATION</span>
            <span>·</span>
            <span>TRAINING CADENCE</span>
          </div>
          <h2 className="font-serif font-bold text-2xl sm:text-3xl text-stone-900 tracking-tight">
            Student Case Assignments
          </h2>
          <p className="font-sans text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
            Monitor assigned ICSR practice scenarios, track submission milestones, and manage cohort deadlines across clinical training tracks.
          </p>
        </div>

        {isStaff && (
          <button
            onClick={() => setShowAssignModal(true)}
            className="bg-[#0B1325] hover:bg-[#1B3F8B] text-white px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-wider flex items-center space-x-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Assign Case to Cohort</span>
          </button>
        )}
      </div>

      {/* Assignment List */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-[#1B3F8B] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="font-mono text-xs text-stone-500 uppercase tracking-wider">Loading Assignments...</p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-16 bg-white border border-stone-200 rounded-lg p-8">
          <CheckSquare className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <h3 className="font-serif font-bold text-stone-800 text-lg">No Active Assignments</h3>
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
                className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm hover:border-stone-300 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-[#0B1325] text-white px-2 py-0.5 rounded">
                      {a.caseNumber}
                    </span>

                    {/* Status Badge */}
                    <span className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                      isSubmitted
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : isOverdue
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : isInProgress
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-stone-100 text-stone-700 border-stone-200'
                    }`}>
                      {a.status.replace('_', ' ')}
                    </span>

                    {isStaff && (
                      <span className="font-sans text-xs text-stone-600 flex items-center space-x-1">
                        <span className="text-stone-400">Student:</span>
                        <strong className="text-stone-800">{a.studentName}</strong>
                        <span className="text-stone-400 font-mono text-[11px]">({a.studentEmail})</span>
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif font-bold text-base text-stone-900">
                    {a.caseTitle}
                  </h3>

                  {a.instructions && (
                    <p className="text-xs text-stone-600 font-sans italic line-clamp-2">
                      "{a.instructions}"
                    </p>
                  )}

                  <div className="flex items-center space-x-3 text-xs font-mono text-stone-500 pt-1">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>Due: <strong>{a.dueDate}</strong></span>
                    </span>
                    {a.score !== undefined && a.score !== null && (
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Score: {a.score}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
                  <button
                    onClick={() => onOpenWorkbenchForCase(a.caseId, a.id)}
                    className="w-full md:w-auto bg-[#0B1325] hover:bg-[#1B3F8B] text-white px-4 py-2 rounded font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-sm transition-all"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 border border-stone-200 shadow-2xl space-y-4">
            <h3 className="font-serif font-bold text-lg text-stone-900 border-b border-stone-200 pb-2">
              Assign ICSR Case to Cohort
            </h3>

            {/* Select Case */}
            <div>
              <label className="block text-xs font-mono font-bold text-stone-600 uppercase mb-1">
                Select Case from Library
              </label>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="w-full border border-stone-300 rounded p-2 text-xs font-sans"
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
              <label className="block text-xs font-mono font-bold text-stone-600 uppercase mb-1">
                Select Students ({selectedStudentIds.length} selected)
              </label>
              <div className="max-h-36 overflow-y-auto border border-stone-200 rounded p-2 space-y-1.5 bg-stone-50">
                {studentUsers.map(st => {
                  const checked = selectedStudentIds.includes(st.id);
                  return (
                    <label 
                      key={st.id} 
                      className="flex items-center space-x-2 text-xs cursor-pointer p-1 rounded hover:bg-white transition-colors"
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
                        className="rounded text-[#1B3F8B]"
                      />
                      <span className="font-medium text-stone-800">{st.fullName}</span>
                      <span className="text-stone-400 font-mono text-[10px]">({st.email})</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-mono font-bold text-stone-600 uppercase mb-1">
                Submission Due Date & Time
              </label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-stone-300 rounded p-2 text-xs font-mono"
              />
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-xs font-mono font-bold text-stone-600 uppercase mb-1">
                Assignment Instructions & Evaluation Focus
              </label>
              <textarea
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Focus on MedDRA PT coding of multiorgan involvement and justify WHO-UMC causality..."
                className="w-full border border-stone-300 rounded p-2 text-xs font-sans"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 px-4 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateAssignment}
                disabled={creating || selectedStudentIds.length === 0}
                className="bg-[#0B1325] hover:bg-[#1B3F8B] text-white px-4 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider disabled:opacity-50"
              >
                {creating ? 'Assigning...' : 'Assign Case'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
