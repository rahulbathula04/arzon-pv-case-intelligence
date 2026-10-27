import React, { useState, useEffect } from 'react';
import { PVCase } from '../types';
import { useAuth } from '../context/AuthContext';
import { CaseDossierModal } from '../components/CaseDossierModal';
import { 
  Search, BookOpen, FlaskConical, FileUp, Shield, 
  Pill, Activity, ArrowRight, Trash2, Clock
} from 'lucide-react';

interface CaseLibraryPageProps {
  onSelectCaseForWorkbench: (caseId: string) => void;
  onNavigateToGenerator?: () => void;
  onNavigateToImporter?: () => void;
}

export const CaseLibraryPage: React.FC<CaseLibraryPageProps> = ({
  onSelectCaseForWorkbench,
  onNavigateToGenerator,
  onNavigateToImporter
}) => {
  const { isStaff, isAdmin, user, getAuthHeaders } = useAuth();
  const [cases, setCases] = useState<PVCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedArea, setSelectedArea] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [activeModalCaseId, setActiveModalCaseId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [caseToDelete, setCaseToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedArea !== 'All') params.append('therapeuticArea', selectedArea);
      if (selectedDifficulty !== 'All') params.append('difficulty', selectedDifficulty);

      const headers = getAuthHeaders();

      const res = await fetch(`/api/cases?${params.toString()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setCases(data.cases || []);
      }
    } catch (err) {
      console.error('Failed to fetch cases:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!caseToDelete) return;
    try {
      setDeletingId(caseToDelete.id);
      setDeleteError(null);
      const headers = getAuthHeaders();
      const res = await fetch(`/api/cases/${caseToDelete.id}`, {
        method: 'DELETE',
        headers
      });

      if (res.ok) {
        setCases(prev => prev.filter(c => c.id !== caseToDelete.id));
        setCaseToDelete(null);
      } else {
        const err = await res.json();
        setDeleteError(err.message || err.error || 'Failed to delete case.');
      }
    } catch (err: any) {
      console.error('Error deleting case:', err);
      setDeleteError(err?.message || 'Network error while attempting to delete case.');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [search, selectedArea, selectedDifficulty, user]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-5">
      
      {/* Enterprise Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-slate-900"></span>
            <span>ICSR MASTER SAFETY VAULT</span>
            <span className="text-slate-300">/</span>
            <span>ICH E2B(R3) PROTOCOL</span>
          </div>
          <h2 className="font-sans font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Pharmacovigilance Case Library
          </h2>
          <p className="font-sans text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Standardized ICSR training scenarios. Gold-standard MedDRA terms, seriousness matrices, and grading rubrics are strictly isolated from student access until mentor review.
          </p>
        </div>

        {isStaff && (
          <div className="flex items-center space-x-2">
            {onNavigateToGenerator && (
              <button
                onClick={onNavigateToGenerator}
                className="bg-slate-900 hover:bg-slate-800 active:scale-95 text-white px-3.5 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
              >
                <FlaskConical className="w-3.5 h-3.5 text-blue-400" />
                <span>Synthesize Case</span>
              </button>
            )}
            {onNavigateToImporter && (
              <button
                onClick={onNavigateToImporter}
                className="border border-slate-300 bg-white hover:bg-slate-50 active:scale-95 text-slate-800 px-3.5 py-2 rounded-lg font-mono text-xs font-semibold uppercase tracking-wider flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <FileUp className="w-3.5 h-3.5 text-slate-600" />
                <span>Import PDF</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Discrete Regulatory Simulation Indicator */}
      <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
          <span className="font-semibold text-slate-800">SIMULATION VAULT:</span>
          <span>Controlled Fictional Training Scenarios · Synthetic Clinical Records</span>
        </div>
        <span className="text-[10px] text-slate-500 uppercase hidden sm:inline">SPEC: ICH E2B(R3) · 21 CFR PART 11</span>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search cases by drug, verbatim term, case ID, or clinical indication..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-md text-xs font-sans focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50 focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center space-x-2">
          {/* Therapeutic Area */}
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="py-1.5 px-2.5 border border-slate-200 rounded-md text-xs font-mono font-medium text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all cursor-pointer"
          >
            <option value="All">All Therapeutic Areas</option>
            <option value="Oncology">Oncology</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Immunology">Immunology</option>
            <option value="Neurology">Neurology</option>
            <option value="Gastroenterology">Gastroenterology</option>
            <option value="Psychiatry">Psychiatry</option>
            <option value="Anti-Infectives">Anti-Infectives</option>
          </select>

          {/* Difficulty */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="py-1.5 px-2.5 border border-slate-200 rounded-md text-xs font-mono font-medium text-slate-700 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all cursor-pointer"
          >
            <option value="All">All Difficulties</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>
      </div>

      {/* Case Grid */}
      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="font-mono text-xs text-slate-500 uppercase tracking-wider">Loading Case Library...</p>
        </div>
      ) : cases.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-slate-200 p-8">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="font-sans font-bold text-slate-900 text-base">No ICSR Cases Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            No approved safety cases match your current filters. Clear filters or add a new case to the repository.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cases.map((c) => (
            <div 
              key={c.id} 
              className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition-all duration-150 group"
            >
              <div>
                {/* Meta Bar */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="font-mono text-[11px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {c.caseNumber}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono text-[10px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded uppercase">
                      {c.therapeuticArea}
                    </span>
                    <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                      c.difficulty === 'Beginner' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                      c.difficulty === 'Intermediate' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                      'bg-purple-50 text-purple-800 border-purple-200'
                    }`}>
                      {c.difficulty}
                    </span>
                  </div>
                </div>

                {/* Case Title */}
                <h3 className="font-sans font-bold text-sm text-slate-900 leading-snug line-clamp-2 mb-2 group-hover:text-slate-700 transition-colors">
                  {c.title}
                </h3>

                {/* Patient Summary & Suspect Drug */}
                <div className="space-y-1.5 text-xs text-slate-600 font-sans mb-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono text-[10px] uppercase text-slate-400 font-medium">Patient:</span>
                    <span className="font-semibold text-slate-800">{c.patientAge}yo {c.patientGender}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-500 font-mono text-[11px]">{c.patientInitials}</span>
                    {c.patientWeightKg && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500 text-[11px]">{c.patientWeightKg} kg</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5 text-xs">
                    <Pill className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="font-mono text-[11px] font-medium text-slate-800 truncate">
                      {c.suspectDrugs.map(d => `${d.name} (${d.inn})`).join(', ')}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 text-xs">
                    <Activity className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="text-slate-700 truncate text-[11px]">
                      {c.adverseEvents.map(ae => ae.verbatim).join(', ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveModalCaseId(c.id)}
                  className="px-2.5 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-mono font-medium transition-all cursor-pointer"
                >
                  Inspect Dossier
                </button>

                <div className="flex items-center space-x-1.5">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setCaseToDelete({ id: c.id, title: c.title });
                      }}
                      disabled={deletingId === c.id}
                      className="p-1.5 rounded-md border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                      title="Delete Case"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onSelectCaseForWorkbench(c.id)}
                    className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <span>Workbench</span>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Case Dossier Modal */}
      {activeModalCaseId && (
        <CaseDossierModal
          caseId={activeModalCaseId}
          onClose={() => setActiveModalCaseId(null)}
          onLaunchWorkbench={(id) => {
            setActiveModalCaseId(null);
            onSelectCaseForWorkbench(id);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {caseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-base text-slate-900">Confirm Case Deletion</h3>
                <div className="text-xs text-slate-500 font-mono">Irreversible Database Action</div>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900 font-semibold">"{caseToDelete.title}"</strong>? All associated versions, reference keys, student assignments, and submissions will be permanently purged from the database.
            </p>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-mono">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCaseToDelete(null)}
                disabled={Boolean(deletingId)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-mono font-medium transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={Boolean(deletingId)}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-xs disabled:opacity-50"
              >
                {deletingId ? (
                  <span>Deleting...</span>
                ) : (
                  <span>Delete Case</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};