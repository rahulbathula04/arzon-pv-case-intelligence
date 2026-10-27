import React, { useState, useEffect } from 'react';
import { PVCase } from '../types';
import { useAuth } from '../context/AuthContext';
import { CaseDossierModal } from '../components/CaseDossierModal';
import { 
  Search, Filter, BookOpen, AlertCircle, ArrowUpRight, 
  Sparkles, FileUp, CheckCircle, Shield, Pill, Activity, Laptop 
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
  const { isStaff, user } = useAuth();
  const [cases, setCases] = useState<PVCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedArea, setSelectedArea] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [activeModalCaseId, setActiveModalCaseId] = useState<string | null>(null);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedArea !== 'All') params.append('therapeuticArea', selectedArea);
      if (selectedDifficulty !== 'All') params.append('difficulty', selectedDifficulty);

      const headers: Record<string, string> = {};
      if (user?.id) headers['x-user-id'] = user.id;

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

  useEffect(() => {
    fetchCases();
  }, [search, selectedArea, selectedDifficulty, user]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Editorial Headline & Mission */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono font-bold text-[#1B3F8B] uppercase tracking-widest mb-1">
            <span>MODULE 03 · ICSR CASE VAULT</span>
            <span>·</span>
            <span>VERSION CONTROLLED</span>
          </div>
          <h2 className="font-serif font-bold text-2xl sm:text-3xl text-stone-900 tracking-tight">
            Pharmacovigilance Case Library
          </h2>
          <p className="font-sans text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
            Search, inspect, and assign verified ICSR training scenarios. Expected reference keys, MedDRA codings, and grading rubrics are strictly isolated from student access until mentor review.
          </p>
        </div>

        {isStaff && (
          <div className="flex items-center space-x-2">
            {onNavigateToGenerator && (
              <button
                onClick={onNavigateToGenerator}
                className="bg-[#0B1325] hover:bg-[#1B3F8B] text-white px-3.5 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-sm transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>AI Case Generator</span>
              </button>
            )}
            {onNavigateToImporter && (
              <button
                onClick={onNavigateToImporter}
                className="border border-stone-300 bg-white hover:bg-stone-100 text-stone-900 px-3.5 py-2 rounded-md font-mono text-xs font-semibold uppercase tracking-wider flex items-center space-x-1.5 transition-all"
              >
                <FileUp className="w-3.5 h-3.5 text-stone-600" />
                <span>Import PDF</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mandatory Fictional Training Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3.5 flex items-center space-x-3 text-amber-900">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <div className="text-xs">
          <span className="font-mono font-bold uppercase tracking-wider block sm:inline">
            ● CONTROLLED FICTIONAL TRAINING SCENARIOS ONLY:
          </span>{' '}
          <span className="font-sans text-amber-800">
            All ICSR safety records are synthetic educational constructs developed for pharmacovigilance competency training. They contain no real-world patient or reporter health identifiers.
          </span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search cases by drug, verbatim term, case ID, or clinical indication..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-stone-300 rounded-md text-xs font-sans focus:outline-none focus:ring-1 focus:ring-[#1B3F8B] focus:border-[#1B3F8B]"
          />
        </div>

        <div className="flex items-center space-x-2">
          {/* Therapeutic Area */}
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="py-2 px-3 border border-stone-300 rounded-md text-xs font-mono font-medium text-stone-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3F8B]"
          >
            <option value="All">All Therapeutic Areas</option>
            <option value="Oncology">Oncology</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Immunology">Immunology</option>
            <option value="Neurology">Neurology</option>
            <option value="Anti-Infectives">Anti-Infectives</option>
          </select>

          {/* Difficulty */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="py-2 px-3 border border-stone-300 rounded-md text-xs font-mono font-medium text-stone-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3F8B]"
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
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-[#1B3F8B] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="font-mono text-xs text-stone-500 uppercase tracking-wider">Loading Case Library...</p>
        </div>
      ) : cases.length === 0 ? (
        <div className="text-center py-16 bg-white border border-stone-200 rounded-lg p-8">
          <BookOpen className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <h3 className="font-serif font-bold text-stone-800 text-lg">No ICSR Cases Found</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
            No approved safety cases match your current search parameters. Try clearing filters or create a new case.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cases.map((c) => (
            <div 
              key={c.id} 
              className="dossier-card rounded-lg p-5 flex flex-col justify-between border border-stone-200 bg-white"
            >
              <div>
                {/* Meta pills */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="font-mono text-[11px] font-bold text-[#0B1325] bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                    {c.caseNumber}
                  </span>
                  <div className="flex items-center space-x-1">
                    <span className="font-mono text-[10px] font-semibold text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded uppercase">
                      {c.therapeuticArea}
                    </span>
                    <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      c.difficulty === 'Beginner' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      c.difficulty === 'Intermediate' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-purple-50 text-purple-700 border border-purple-200'
                    }`}>
                      {c.difficulty}
                    </span>
                  </div>
                </div>

                {/* Case Title */}
                <h3 className="font-serif font-bold text-base text-stone-900 leading-snug line-clamp-2 mb-2">
                  {c.title}
                </h3>

                {/* Patient Summary & Suspect Drug */}
                <div className="space-y-1.5 text-xs text-stone-600 font-sans mb-3 pb-3 border-b border-stone-100">
                  <div className="flex items-center space-x-1">
                    <span className="font-mono text-[10px] uppercase text-stone-400">Patient:</span>
                    <span className="font-semibold text-stone-800">{c.patientAge}yo {c.patientGender}</span>
                    <span className="text-stone-300">·</span>
                    <span className="text-stone-500">{c.patientInitials}</span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <Pill className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <span className="font-mono text-[11px] font-medium text-stone-800 truncate">
                      {c.suspectDrugs.map(d => `${d.name} (${d.inn})`).join(', ')}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <Activity className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                    <span className="text-stone-700 truncate text-[11px]">
                      {c.adverseEvents.map(ae => ae.verbatim).join(', ')}
                    </span>
                  </div>
                </div>

                {/* Short narrative snippet */}
                <p className="font-sans text-xs text-stone-500 line-clamp-3 leading-relaxed mb-4">
                  {c.verbatimNarrative}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setActiveModalCaseId(c.id)}
                  className="text-stone-700 hover:text-stone-900 font-mono text-[11px] font-bold uppercase tracking-wider py-1.5 px-2 hover:bg-stone-50 rounded transition-colors flex items-center space-x-1"
                >
                  <span>Open Dossier</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-stone-400" />
                </button>

                <button
                  onClick={() => onSelectCaseForWorkbench(c.id)}
                  className="bg-[#0B1325] hover:bg-[#1B3F8B] text-white px-3 py-1.5 rounded font-mono text-[11px] font-bold uppercase tracking-wider flex items-center space-x-1 shadow-sm transition-all"
                >
                  <Laptop className="w-3 h-3 text-emerald-400" />
                  <span>Workbench</span>
                </button>
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
    </div>
  );
};
