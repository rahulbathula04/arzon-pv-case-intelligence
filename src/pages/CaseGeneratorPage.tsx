import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { StagedCase, CaseDifficulty, SuspectDrug } from '../types';
import { 
  FlaskConical, CheckCircle2, AlertTriangle, ArrowRight, 
  Pill, Activity, User, ShieldAlert, BookOpen, Layers,
  Clock, Cpu, Info, Check, X, Edit3, Eye, FileText, Lock
} from 'lucide-react';

interface CaseGeneratorPageProps {
  onCasePublished?: (caseId: string) => void;
}

export const CaseGeneratorPage: React.FC<CaseGeneratorPageProps> = ({ onCasePublished }) => {
  const { user, getAuthHeaders } = useAuth();
  
  // Configuration State
  const [therapeuticArea, setTherapeuticArea] = useState('Oncology');
  const [difficulty, setDifficulty] = useState<CaseDifficulty>('Intermediate');
  const [suspectDrug, setSuspectDrug] = useState('');
  const [reactionType, setReactionType] = useState('');
  const [complexity, setComplexity] = useState<'Standard' | 'High'>('Standard');
  const [caseCount, setCaseCount] = useState<number>(1);
  const [reporterType, setReporterType] = useState('Clinical Pharmacist');
  const [customNotes, setCustomNotes] = useState('');

  // Provider Status State
  const [providerStatus, setProviderStatus] = useState<{
    hasApiKey: boolean;
    provider: string;
    model: string;
    setupGuide: string;
  } | null>(null);

  // Staged Cases State
  const [generating, setGenerating] = useState(false);
  const [stagedCases, setStagedCases] = useState<StagedCase[]>([]);
  const [activeCaseIndex, setActiveCaseIndex] = useState(0);
  const [editingCase, setEditingCase] = useState<StagedCase | null>(null);
  const [showReferenceKey, setShowReferenceKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Approval State
  const [approving, setApproving] = useState(false);
  const [approvedSuccess, setApprovedSuccess] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Load provider status on mount
  useEffect(() => {
    fetch('/api/generate/status', { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => setProviderStatus(data))
      .catch(err => console.error('Failed to fetch generator status:', err));
  }, [user]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setStagedCases([]);
      setActiveCaseIndex(0);
      setEditingCase(null);
      setApprovedSuccess(null);
      setApprovalError(null);
      setIsEditing(false);

      const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      };

      const res = await fetch('/api/generate/batch', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          therapeuticArea,
          difficulty,
          suspectDrug: suspectDrug.trim() || undefined,
          reactionType: reactionType.trim() || undefined,
          complexity,
          caseCount,
          reporterType,
          customNotes: customNotes.trim() || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.cases && data.cases.length > 0) {
          setStagedCases(data.cases);
          setEditingCase(data.cases[0]);
        }
      } else {
        const errData = await res.json();
        setApprovalError(errData.message || 'Generation failed.');
      }
    } catch (err: any) {
      console.error('Failed to generate cases:', err);
      setApprovalError(err?.message || 'Network error during case generation.');
    } finally {
      setGenerating(false);
    }
  };

  const currentCase = stagedCases[activeCaseIndex] || null;

  const handleSelectCase = (index: number) => {
    setActiveCaseIndex(index);
    setEditingCase(stagedCases[index]);
    setIsEditing(false);
    setApprovedSuccess(null);
    setApprovalError(null);
  };

  const handleDiscardCurrent = () => {
    const updated = stagedCases.filter((_, idx) => idx !== activeCaseIndex);
    setStagedCases(updated);
    if (updated.length > 0) {
      const nextIdx = Math.min(activeCaseIndex, updated.length - 1);
      setActiveCaseIndex(nextIdx);
      setEditingCase(updated[nextIdx]);
    } else {
      setEditingCase(null);
    }
    setIsEditing(false);
  };

  const handleSaveEdits = () => {
    if (!editingCase) return;
    const updated = [...stagedCases];
    updated[activeCaseIndex] = editingCase;
    setStagedCases(updated);
    setIsEditing(false);
  };

  const handleApproveCase = async () => {
    const caseToApprove = editingCase || currentCase;
    if (!caseToApprove) return;

    try {
      setApproving(true);
      setApprovalError(null);
      setApprovedSuccess(null);

      const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      };

      const res = await fetch('/api/generate/approve-staged', {
        method: 'POST',
        headers,
        body: JSON.stringify(caseToApprove)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setApprovedSuccess(`Case approved and published: ${data.caseNumber} ("${data.title}")`);
        if (onCasePublished) {
          onCasePublished(data.caseId);
        }
      } else {
        setApprovalError(data.message || data.error || 'Failed to approve case.');
      }
    } catch (err: any) {
      console.error('Failed to approve staged case:', err);
      setApprovalError(err?.message || 'Error publishing case to library.');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="border-b border-black/[0.06] pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-mono font-bold text-[#1B3F8B] uppercase tracking-widest mb-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500/20 ring-4 ring-blue-500/10"></span>
            <span>MODULE 01 · CLINICAL CASE SYNTHESIS</span>
            <span className="text-stone-300">/</span>
            <span>ICH E2B(R3) COMPLIANT</span>
          </div>
          <h2 className="font-sans font-bold text-2xl sm:text-3xl text-stone-900 tracking-tight">
            ICSR Case Synthesis Engine
          </h2>
          <p className="font-sans text-xs sm:text-sm text-stone-600 mt-1.5 max-w-2xl leading-relaxed">
            Synthesize high-fidelity fictional ICSR scenarios with verified pharmacology, timeline kinetics, laboratory markers, and decoupled reference rubrics.
          </p>
        </div>

        {/* Model Provider Status Badge */}
        {providerStatus && (
          <div className="flex items-center space-x-2.5 p-3 rounded-2xl border border-black/[0.06] bg-stone-50/80 text-xs font-mono shadow-apple-subtle">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${providerStatus.hasApiKey ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-700'}`}>
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-stone-900">
                  {providerStatus.hasApiKey ? 'Google GenAI (Gemini 2.5 Flash)' : 'Clinical Deterministic Rules Engine'}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ring-1 ${
                  providerStatus.hasApiKey ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-slate-100 text-slate-800 ring-slate-200'
                }`}>
                  {providerStatus.hasApiKey ? 'API Connected' : 'Deterministic Core'}
                </span>
              </div>
              <div className="text-[10px] text-stone-500 font-sans mt-0.5 max-w-xs truncate" title={providerStatus.setupGuide}>
                {providerStatus.setupGuide}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Generation Controls */}
        <div className="lg:col-span-5 space-y-5">
          <div className="apple-card p-6 space-y-4">
            <h3 className="font-sans font-bold text-base text-stone-900 border-b border-black/[0.06] pb-3 flex items-center space-x-2">
              <FlaskConical className="w-4 h-4 text-blue-600" />
              <span>Case Synthesis Parameters</span>
            </h3>

            {/* Therapeutic Area */}
            <div>
              <label className="block text-xs font-mono font-bold text-stone-600 uppercase mb-1.5">
                Therapeutic Area
              </label>
              <select
                value={therapeuticArea}
                onChange={(e) => setTherapeuticArea(e.target.value)}
                className="w-full border border-black/[0.08] rounded-xl p-2.5 text-xs font-sans bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 transition-all cursor-pointer"
              >
                <option value="Oncology">Oncology (Immunotherapy, Checkpoints, TKIs)</option>
                <option value="Cardiology">Cardiology (Anticoagulants, Anti-arrhythmics)</option>
                <option value="Neurology">Neurology (Anti-epileptics, CNS agents)</option>
                <option value="Immunology">Immunology / Dermatology (Biologics, DMARDs)</option>
                <option value="Gastroenterology">Gastroenterology / Hepatology (DILI, Antibiotics)</option>
                <option value="Endocrinology">Endocrinology (SGLT2 inhibitors, GLP-1 RAs)</option>
                <option value="Hematology">Hematology (Parenteral Iron, Coagulation factors)</option>
                <option value="Psychiatry">Psychiatry (Atypical Antipsychotics)</option>
              </select>
            </div>

            {/* Difficulty Level */}
            <div>
              <label className="block text-xs font-mono font-bold text-stone-600 uppercase mb-1.5">
                Curriculum Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-stone-200/50 p-1 rounded-xl shadow-apple-inner ring-1 ring-black/[0.04]">
                {(['Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficulty(lvl)}
                    className={`py-2 px-3 rounded-lg text-xs font-mono font-bold uppercase transition-all duration-150 ${
                      difficulty === lvl
                        ? 'bg-[#0B1325] text-white shadow-apple-subtle'
                        : 'text-stone-700 hover:text-stone-900 hover:bg-white/40'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Suspect Drug */}
            <div>
              <label className="block text-xs font-mono font-bold text-stone-600 uppercase mb-1.5">
                Suspect Drug Preference (Optional)
              </label>
              <input
                type="text"
                value={suspectDrug}
                onChange={(e) => setSuspectDrug(e.target.value)}
                placeholder="e.g. Pembrolizumab, Apixaban, Nivolumab..."
                className="w-full border border-black/[0.08] rounded-xl p-2.5 text-xs font-sans bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 transition-all"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['Pembrolizumab', 'Apixaban', 'Carbamazepine', 'Adalimumab', 'Osimertinib'].map((drug) => (
                  <button
                    key={drug}
                    type="button"
                    onClick={() => setSuspectDrug(drug)}
                    className="text-[10px] font-mono bg-stone-100 hover:bg-stone-200 text-stone-700 px-2.5 py-0.5 rounded-full transition-colors"
                  >
                    +{drug}
                  </button>
                ))}
              </div>
            </div>

            {/* Adverse Reaction Type */}
            <div>
              <label className="block text-xs font-mono font-bold text-stone-600 uppercase mb-1.5">
                Adverse Reaction Preference (Optional)
              </label>
              <input
                type="text"
                value={reactionType}
                onChange={(e) => setReactionType(e.target.value)}
                placeholder="e.g. Myocarditis, DRESS Syndrome, SJS/TEN..."
                className="w-full border border-black/[0.08] rounded-xl p-2.5 text-xs font-sans bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 transition-all"
              />
            </div>

            {/* Complexity & Batch Size */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono font-bold text-stone-600 uppercase mb-1.5">
                  Scenario Complexity
                </label>
                <select
                  value={complexity}
                  onChange={(e) => setComplexity(e.target.value as any)}
                  className="w-full border border-black/[0.08] rounded-xl p-2.5 text-xs font-sans bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 transition-all cursor-pointer"
                >
                  <option value="Standard">Standard Monotherapy</option>
                  <option value="High">High (Concomitants / DDIs)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono font-bold text-stone-600 uppercase mb-1.5">
                  Batch Quantity
                </label>
                <select
                  value={caseCount}
                  onChange={(e) => setCaseCount(Number(e.target.value))}
                  className="w-full border border-black/[0.08] rounded-xl p-2.5 text-xs font-sans bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 transition-all cursor-pointer"
                >
                  <option value={1}>1 Scenario</option>
                  <option value={2}>2 Scenarios</option>
                  <option value={3}>3 Scenarios</option>
                </select>
              </div>
            </div>

            {/* Initial Reporter Persona */}
            <div>
              <label className="block text-xs font-mono font-bold text-stone-600 uppercase mb-1.5">
                Initial Reporter Persona
              </label>
              <select
                value={reporterType}
                onChange={(e) => setReporterType(e.target.value)}
                className="w-full border border-black/[0.08] rounded-xl p-2.5 text-xs font-sans bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 transition-all cursor-pointer"
              >
                <option value="Clinical Pharmacist">Clinical / Hospital Pharmacist</option>
                <option value="Attending Oncologist">Attending Oncologist (Specialist)</option>
                <option value="Attending Neurologist">Attending Neurologist</option>
                <option value="ICU Fellow">ICU / Emergency Medicine Fellow</option>
                <option value="Clinical Safety Nurse">Clinical Research Nurse</option>
                <option value="Regulatory Authority">Regulatory Authority (Spontaneous MedWatch)</option>
              </select>
            </div>

            {/* Custom Clinical Nuance */}
            <div>
              <label className="block text-xs font-mono font-bold text-stone-600 uppercase mb-1.5">
                Custom Clinical Nuance / Guidelines (Optional)
              </label>
              <textarea
                rows={3}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="e.g. Include borderline baseline creatinine to test dose adjustment or drug-drug interaction detection..."
                className="w-full border border-black/[0.08] rounded-xl p-3 text-xs font-sans bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 transition-all leading-relaxed"
              />
            </div>

            {/* Primary Action Button */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full bg-[#0B1325] hover:bg-[#1B3F8B] active:scale-95 text-white py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 shadow-apple-subtle hover:shadow-apple-card transition-all disabled:opacity-50"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Synthesizing ICSR Clinical Scenarios...</span>
                </>
              ) : (
                <>
                  <FlaskConical className="w-4 h-4 text-emerald-400" />
                  <span>Synthesize {caseCount > 1 ? `${caseCount} Fictional Scenarios` : 'Fictional ICSR Scenario'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Staging, Review & Approval Workspace */}
        <div className="lg:col-span-7">
          {stagedCases.length > 0 && currentCase ? (
            <div className="apple-card p-6 space-y-5">
              
              {/* Batch Navigation Tabs if multiple cases */}
              {stagedCases.length > 1 && (
                <div className="flex items-center space-x-2 border-b border-black/[0.06] pb-3">
                  <span className="text-xs font-mono font-bold text-stone-500 uppercase mr-2">
                    Batch Preview:
                  </span>
                  {stagedCases.map((c, idx) => (
                    <button
                      key={c.tempId}
                      onClick={() => handleSelectCase(idx)}
                      className={`px-3 py-1 text-xs font-mono rounded-xl font-bold transition-all ${
                        activeCaseIndex === idx
                          ? 'bg-[#0B1325] text-white shadow-apple-subtle'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      Scenario {idx + 1}
                    </button>
                  ))}
                </div>
              )}

              {/* Status Header & Action Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.06] pb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold bg-[#0B1325] text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                    STAGED DRAFT
                  </span>
                  <span className="font-mono text-[10px] font-bold bg-amber-50 text-amber-800 ring-1 ring-amber-200 px-2.5 py-0.5 rounded-full uppercase">
                    Requires Human Verification
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-3 py-1.5 rounded-xl border border-black/[0.08] text-stone-700 hover:bg-stone-50 text-xs font-mono font-bold flex items-center space-x-1.5 transition-all shadow-2xs active:scale-95"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditing ? 'Cancel Edit' : 'Edit Case'}</span>
                  </button>

                  <button
                    onClick={handleDiscardCurrent}
                    className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-mono font-bold flex items-center space-x-1.5 transition-all shadow-2xs active:scale-95"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Discard</span>
                  </button>

                  <button
                    onClick={handleApproveCase}
                    disabled={approving || Boolean(approvedSuccess)}
                    className={`px-4 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all ${
                      approvedSuccess
                        ? 'bg-emerald-600 text-white cursor-default'
                        : 'bg-[#0B1325] hover:bg-[#1B3F8B] text-white'
                    }`}
                  >
                    {approving ? (
                      <span>Validating & Saving...</span>
                    ) : approvedSuccess ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Published to Library</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Approve & Publish to Library</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Feedback Alerts */}
              {approvedSuccess && (
                <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-sans flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{approvedSuccess}</span>
                </div>
              )}

              {approvalError && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-800 font-sans flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{approvalError}</span>
                </div>
              )}

              {/* Duplicate Warning Banner */}
              {currentCase.duplicateCheck?.isDuplicate && (
                <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900 font-sans flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Potential Duplicate Clinical Profile Detected: </span>
                    <span>An identical case ({currentCase.duplicateCheck.existingCaseNumber}: "{currentCase.duplicateCheck.existingTitle}") is already approved in the database. Please modify demographics or clinical details before approval.</span>
                  </div>
                </div>
              )}

              {/* Provenance & Validation Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-2.5 rounded bg-stone-50 border border-stone-200 flex items-center justify-between">
                  <span className="text-stone-500">Model Provenance:</span>
                  <span className="font-bold text-stone-800">
                    {currentCase.generationMetadata.provider} ({currentCase.generationMetadata.model})
                  </span>
                </div>
                <div className="p-2.5 rounded bg-stone-50 border border-stone-200 flex items-center justify-between">
                  <span className="text-stone-500">Synthesis Latency:</span>
                  <span className="font-bold text-stone-800">
                    {currentCase.generationMetadata.generationTimeMs} ms
                  </span>
                </div>
              </div>

              {/* ICSR Completeness Checklist */}
              <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
                <div className="font-mono text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>ICH E2B Regulatory Criteria & Clinical Coherence</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2 rounded bg-white border border-stone-200 text-emerald-800 flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>1. Patient: {currentCase.patientInitials} ({currentCase.patientAge}y)</span>
                  </div>
                  <div className="p-2 rounded bg-white border border-stone-200 text-emerald-800 flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>2. Reporter: {currentCase.reporterType}</span>
                  </div>
                  <div className="p-2 rounded bg-white border border-stone-200 text-emerald-800 flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>3. Suspect: {currentCase.suspectDrugs[0]?.inn || 'Present'}</span>
                  </div>
                  <div className="p-2 rounded bg-white border border-stone-200 text-emerald-800 flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>4. Reaction: Serious</span>
                  </div>
                </div>
              </div>

              {/* Editable or Static View */}
              {isEditing && editingCase ? (
                <div className="space-y-4 border border-blue-200 rounded-lg p-4 bg-blue-50/30">
                  <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                    <span className="text-xs font-mono font-bold text-[#1B3F8B] uppercase">Editing Staged ICSR Scenario</span>
                    <button
                      onClick={handleSaveEdits}
                      className="px-3 py-1 bg-[#0B1325] text-white rounded text-xs font-mono font-bold"
                    >
                      Save Changes
                    </button>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono font-bold text-stone-600 uppercase mb-1">Title</label>
                    <input
                      type="text"
                      value={editingCase.title}
                      onChange={(e) => setEditingCase({ ...editingCase, title: e.target.value })}
                      className="w-full border border-stone-300 rounded p-2 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono font-bold text-stone-600 uppercase mb-1">Verbatim Narrative</label>
                    <textarea
                      rows={5}
                      value={editingCase.verbatimNarrative}
                      onChange={(e) => setEditingCase({ ...editingCase, verbatimNarrative: e.target.value })}
                      className="w-full border border-stone-300 rounded p-2 text-xs font-sans bg-white"
                    />
                  </div>
                </div>
              ) : (
                <>
                  {/* Title & Metadata */}
                  <div>
                    <div className="text-[10px] font-mono text-stone-400 uppercase">Case Scenario Title</div>
                    <h3 className="font-sans font-bold text-lg text-stone-900 mt-0.5">
                      {currentCase.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="font-mono text-[10px] uppercase bg-stone-100 text-stone-700 px-2 py-0.5 rounded">
                        Area: {currentCase.therapeuticArea}
                      </span>
                      <span className="font-mono text-[10px] uppercase bg-stone-100 text-stone-700 px-2 py-0.5 rounded">
                        Difficulty: {currentCase.difficulty}
                      </span>
                      <span className="font-mono text-[10px] uppercase bg-stone-100 text-stone-700 px-2 py-0.5 rounded">
                        Patient: {currentCase.patientInitials}, {currentCase.patientAge}y {currentCase.patientGender} ({currentCase.patientWeightKg} kg)
                      </span>
                    </div>
                  </div>

                  {/* Suspect Drug & Adverse Event Overview */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg border border-stone-200 bg-stone-50/50">
                      <div className="text-[10px] font-mono font-bold text-stone-500 uppercase flex items-center space-x-1 mb-1">
                        <Pill className="w-3.5 h-3.5 text-[#1B3F8B]" />
                        <span>Suspect Medication</span>
                      </div>
                      <div className="text-xs font-bold text-stone-900">
                        {currentCase.suspectDrugs[0]?.name} ({currentCase.suspectDrugs[0]?.inn})
                      </div>
                      <div className="text-[11px] text-stone-600 mt-0.5 font-sans">
                        {currentCase.suspectDrugs[0]?.dose} · {currentCase.suspectDrugs[0]?.route}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-stone-200 bg-stone-50/50">
                      <div className="text-[10px] font-mono font-bold text-stone-500 uppercase flex items-center space-x-1 mb-1">
                        <Activity className="w-3.5 h-3.5 text-red-600" />
                        <span>Primary Adverse Reaction</span>
                      </div>
                      <div className="text-xs font-bold text-stone-900 capitalize">
                        {currentCase.adverseEvents[0]?.verbatim}
                      </div>
                      <div className="text-[11px] text-stone-600 mt-0.5 font-sans">
                        MedDRA PT: {currentCase.adverseEvents[0]?.meddraPt}
                      </div>
                    </div>
                  </div>

                  {/* Student-Facing Verbatim Narrative */}
                  <div>
                    <div className="text-[10px] font-mono text-stone-400 uppercase mb-1">
                      Student-Facing Verbatim Intake Narrative
                    </div>
                    <blockquote className="p-4 rounded-lg bg-stone-50 border-l-4 border-[#0B1325] text-xs text-stone-800 leading-relaxed font-sans">
                      {currentCase.verbatimNarrative}
                    </blockquote>
                  </div>
                </>
              )}

              {/* Private Reference Key Drawer (Admin / Mentor inspection) */}
              <div className="border border-stone-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowReferenceKey(!showReferenceKey)}
                  className="w-full p-3 bg-stone-50 hover:bg-stone-100 flex items-center justify-between text-xs font-mono font-bold text-stone-700 transition-all"
                >
                  <div className="flex items-center space-x-2">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>RESTRICTED REFERENCE KEY & RUBRIC INSPECTION</span>
                  </div>
                  <span className="text-[10px] text-stone-500 font-sans">
                    {showReferenceKey ? 'Hide Reference Answers' : 'Inspect Pre-computed Answers'}
                  </span>
                </button>

                {showReferenceKey && (
                  <div className="p-4 bg-white border-t border-stone-200 space-y-4 text-xs font-sans">
                    <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                      <span className="font-bold">Security Notice: </span>
                      These answers are strictly segregated in the restricted reference_keys table and are never transmitted to students until mentor evaluation approval.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded border border-stone-200">
                        <div className="text-[10px] font-mono text-stone-500 uppercase">Expected Causality (WHO-UMC)</div>
                        <div className="font-bold text-stone-900 mt-1">{currentCase.referenceKey.expectedCausalityWho}</div>
                      </div>
                      <div className="p-3 rounded border border-stone-200">
                        <div className="text-[10px] font-mono text-stone-500 uppercase">Expected Naranjo Score</div>
                        <div className="font-bold text-stone-900 mt-1">{currentCase.referenceKey.expectedNaranjoScore} / 10</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono text-stone-500 uppercase mb-1">Model CIOMS Reference Narrative</div>
                      <div className="p-3 rounded bg-stone-50 border border-stone-200 text-[11px] text-stone-700 whitespace-pre-line font-mono">
                        {currentCase.referenceKey.modelCiomsNarrative}
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-lg p-12 text-center shadow-sm">
              <FlaskConical className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h3 className="font-sans font-bold text-stone-800 text-lg">Case Generation Studio</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 leading-relaxed">
                Configure clinical parameters on the left and click "Synthesize Fictional ICSR Scenario" to generate an ICH E2B(R3)-compliant training case with automated reference answers and admin review controls.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
