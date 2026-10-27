import React, { useState, useEffect } from 'react';
import { PVCase, Assignment, StudentSubmission } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  Laptop, Save, Send, CheckCircle2, AlertTriangle, 
  BookOpen, Pill, Activity, Shield, Calculator, FileText, 
  HelpCircle, ChevronRight, CheckSquare, ChevronLeft, ArrowRight 
} from 'lucide-react';

interface StudentWorkbenchPageProps {
  initialCaseId?: string | null;
  initialAssignmentId?: string | null;
}

export const StudentWorkbenchPage: React.FC<StudentWorkbenchPageProps> = ({
  initialCaseId,
  initialAssignmentId
}) => {
  const { user, getAuthHeaders } = useAuth();
  const [cases, setCases] = useState<PVCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(initialCaseId || '');
  const [currentCase, setCurrentCase] = useState<PVCase | null>(null);
  const [assignmentId, setAssignmentId] = useState<string>(initialAssignmentId || '');
  
  const [activeTab, setActiveTab] = useState<'intake' | 'meddra' | 'seriousness' | 'causality' | 'narrative' | 'checklist'>('intake');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Student Input State
  const [meddraCoding, setMeddraCoding] = useState<Array<{
    verbatim: string;
    pt: string;
    soc: string;
    llt?: string;
    justification: string;
  }>>([]);
  const [currentVerbatim, setCurrentVerbatim] = useState('');
  const [currentPt, setCurrentPt] = useState('');
  const [currentSoc, setCurrentSoc] = useState('Cardiac disorders');
  const [currentJustification, setCurrentJustification] = useState('');

  const [seriousnessCriteria, setSeriousnessCriteria] = useState({
    death: false,
    lifeThreatening: false,
    hospitalization: false,
    disability: false,
    congenitalAnomaly: false,
    otherMedicallyImportant: false
  });
  const [seriousnessJustification, setSeriousnessJustification] = useState('');

  const [causalityWho, setCausalityWho] = useState<'Certain' | 'Probable' | 'Possible' | 'Unlikely' | 'Conditional' | 'Unassessable'>('Probable');
  const [naranjoAnswers, setNaranjoAnswers] = useState<Record<string, number>>({
    q1: 1, q2: 2, q3: 1, q4: 0, q5: 1, q6: 0, q7: 0, q8: 0, q9: 0, q10: 1
  });
  const [causalityRationale, setCausalityRationale] = useState('');
  const [ciomsNarrative, setCiomsNarrative] = useState('');

  // Fetch Cases and Assignments
  useEffect(() => {
    const fetchCases = async () => {
      try {
        setLoading(true);
        const headers = getAuthHeaders();

        const res = await fetch('/api/cases', { headers });
        if (res.ok) {
          const data = await res.json();
          setCases(data.cases || []);
          if (!selectedCaseId && data.cases.length > 0) {
            setSelectedCaseId(data.cases[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load workbench cases:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, [user]);

  // Load Selected Case & Existing Submission
  useEffect(() => {
    if (!selectedCaseId) return;

    const loadCaseAndSubmission = async () => {
      try {
        const headers = getAuthHeaders();

        // Fetch case
        let loadedCase: any = null;
        const caseRes = await fetch(`/api/cases/${selectedCaseId}`, { headers });
        if (caseRes.ok) {
          const caseData = await caseRes.json();
          loadedCase = caseData.case;
          setCurrentCase(loadedCase);

          // Populate initial verbatim if empty
          if (loadedCase.adverseEvents?.length > 0 && meddraCoding.length === 0) {
            setCurrentVerbatim(loadedCase.adverseEvents[0].verbatim);
          }
        }

        // Fetch existing submission / draft
        const subRes = await fetch(`/api/submissions/case/${selectedCaseId}`, { headers });
        if (subRes.ok) {
          const subData = await subRes.json();
          if (subData.submission) {
            const sub = subData.submission as StudentSubmission;
            setAssignmentId(sub.assignmentId || assignmentId);
            setMeddraCoding(sub.meddraCoding || []);
            setSeriousnessCriteria(sub.seriousnessCriteria?.criteria || {
              death: false, lifeThreatening: false, hospitalization: false,
              disability: false, congenitalAnomaly: false, otherMedicallyImportant: false
            });
            setSeriousnessJustification(sub.seriousnessCriteria?.justification || '');
            setCausalityWho(sub.causalityWho || 'Probable');
            setNaranjoAnswers(sub.causalityNaranjo?.answers || {
              q1: 1, q2: 2, q3: 1, q4: 0, q5: 1, q6: 0, q7: 0, q8: 0, q9: 0, q10: 1
            });
            setCausalityRationale(sub.causalityRationale || '');
            setCiomsNarrative(sub.ciomsNarrative || '');
            setIsSubmitted(sub.status === 'submitted');
            setLastSavedTime(sub.updatedAt || sub.createdAt);
          } else {
            // Clean slate for newly selected unworked case
            setAssignmentId('');
            setMeddraCoding([]);
            setSeriousnessCriteria({
              death: false, lifeThreatening: false, hospitalization: false,
              disability: false, congenitalAnomaly: false, otherMedicallyImportant: false
            });
            setSeriousnessJustification('');
            setCausalityWho('Probable');
            setNaranjoAnswers({
              q1: 1, q2: 2, q3: 1, q4: 0, q5: 1, q6: 0, q7: 0, q8: 0, q9: 0, q10: 1
            });
            setCausalityRationale('');
            setCiomsNarrative('');
            setIsSubmitted(false);
            setLastSavedTime(null);
            if (loadedCase?.adverseEvents?.length > 0) {
              setCurrentVerbatim(loadedCase.adverseEvents[0].verbatim);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load case data:', err);
      }
    };

    loadCaseAndSubmission();
  }, [selectedCaseId, user]);

  // Calculate Naranjo Score
  const calculateNaranjoScore = () => {
    return Object.values(naranjoAnswers).reduce((sum, val) => sum + val, 0);
  };
  const totalNaranjo = calculateNaranjoScore();
  const naranjoInterpretation = totalNaranjo >= 9 ? 'Definite' : totalNaranjo >= 5 ? 'Probable' : totalNaranjo >= 1 ? 'Possible' : 'Doubtful';

  const isSeriousSelected = Object.values(seriousnessCriteria).some(Boolean);

  const handleAddMeddraTerm = () => {
    if (!currentPt) return;
    setMeddraCoding([
      ...meddraCoding,
      {
        verbatim: currentVerbatim || currentCase?.adverseEvents[0]?.verbatim || 'Reported Reaction',
        pt: currentPt,
        soc: currentSoc,
        llt: currentPt,
        justification: currentJustification || 'Selected based on clinical manifestation'
      }
    ]);
    setCurrentPt('');
    setCurrentJustification('');
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      };

      const payload = {
        assignmentId: assignmentId || `asg-direct-${selectedCaseId}`,
        caseId: selectedCaseId,
        meddraCoding,
        seriousnessCriteria: {
          isSerious: isSeriousSelected,
          criteria: seriousnessCriteria,
          justification: seriousnessJustification
        },
        causalityWho,
        causalityNaranjo: {
          answers: naranjoAnswers,
          totalScore: totalNaranjo,
          interpretation: naranjoInterpretation
        },
        causalityRationale,
        ciomsNarrative
      };

      const res = await fetch('/api/submissions/draft', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.assignmentId) setAssignmentId(data.assignmentId);
        setLastSavedTime(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Failed to save draft:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleProceedToNext = async (nextTab: 'intake' | 'meddra' | 'seriousness' | 'causality' | 'narrative' | 'checklist') => {
    await handleSaveDraft();
    setActiveTab(nextTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinalSubmit = async () => {
    try {
      setSaving(true);
      const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      };

      const payload = {
        assignmentId: assignmentId || `asg-direct-${selectedCaseId}`,
        caseId: selectedCaseId,
        meddraCoding,
        seriousnessCriteria: {
          isSerious: isSeriousSelected,
          criteria: seriousnessCriteria,
          justification: seriousnessJustification
        },
        causalityWho,
        causalityNaranjo: {
          answers: naranjoAnswers,
          totalScore: totalNaranjo,
          interpretation: naranjoInterpretation
        },
        causalityRationale,
        ciomsNarrative
      };

      const res = await fetch('/api/submissions/submit', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.assignmentId) setAssignmentId(data.assignmentId);
        setIsSubmitted(true);
        setLastSavedTime(new Date().toLocaleTimeString());
        setActiveTab('checklist');
      }
    } catch (err) {
      console.error('Failed to submit final ICSR:', err);
    } finally {
      setSaving(false);
    }
  };

  // Naranjo Question definitions
  const naranjoQuestions = [
    { id: 'q1', text: '1. Are there previous conclusive reports on this reaction?', options: [{ label: 'Yes (+1)', val: 1 }, { label: 'No (0)', val: 0 }, { label: 'Do not know (0)', val: 0 }] },
    { id: 'q2', text: '2. Did the adverse event appear after the suspected drug was administered?', options: [{ label: 'Yes (+2)', val: 2 }, { label: 'No (-1)', val: -1 }, { label: 'Do not know (0)', val: 0 }] },
    { id: 'q3', text: '3. Did the adverse reaction improve when the drug was discontinued or antagonist given?', options: [{ label: 'Yes (+1)', val: 1 }, { label: 'No (0)', val: 0 }, { label: 'Do not know (0)', val: 0 }] },
    { id: 'q4', text: '4. Did the adverse reaction reappear when the drug was readministered?', options: [{ label: 'Yes (+2)', val: 2 }, { label: 'No (-1)', val: -1 }, { label: 'Do not know (0)', val: 0 }] },
    { id: 'q5', text: '5. Are there alternative causes (other than the drug) that could have caused the reaction?', options: [{ label: 'Yes (-1)', val: -1 }, { label: 'No (+2)', val: 2 }, { label: 'Do not know (0)', val: 0 }] },
    { id: 'q6', text: '6. Did the reaction appear when a placebo was given?', options: [{ label: 'Yes (-1)', val: -1 }, { label: 'No (+1)', val: 1 }, { label: 'Do not know (0)', val: 0 }] },
    { id: 'q7', text: '7. Was the drug detected in blood or fluids in toxic concentrations?', options: [{ label: 'Yes (+1)', val: 1 }, { label: 'No (0)', val: 0 }, { label: 'Do not know (0)', val: 0 }] },
    { id: 'q8', text: '8. Was the reaction more severe when dose increased, or less severe when decreased?', options: [{ label: 'Yes (+1)', val: 1 }, { label: 'No (0)', val: 0 }, { label: 'Do not know (0)', val: 0 }] },
    { id: 'q9', text: '9. Did the patient have a similar reaction to the same or similar drug in the past?', options: [{ label: 'Yes (+1)', val: 1 }, { label: 'No (0)', val: 0 }, { label: 'Do not know (0)', val: 0 }] },
    { id: 'q10', text: '10. Was the adverse event confirmed by any objective clinical evidence?', options: [{ label: 'Yes (+1)', val: 1 }, { label: 'No (0)', val: 0 }, { label: 'Do not know (0)', val: 0 }] },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-9 h-9 border-2 border-[#1B3F8B] border-t-transparent rounded-full animate-spin mx-auto mb-3.5"></div>
        <p className="font-mono text-xs text-stone-500 uppercase tracking-wider">Loading PV Workbench...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Workbench Header & Case Selector */}
      <div className="apple-card p-5 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-mono text-xs font-bold bg-[#0B1325] text-white px-2.5 py-0.5 rounded-full tracking-wider shadow-2xs">
              {currentCase?.caseNumber || 'SELECT CASE'}
            </span>
            <span className="font-mono text-[10px] uppercase bg-stone-100/90 text-stone-700 px-2.5 py-0.5 rounded-full ring-1 ring-black/[0.05]">
              {currentCase?.therapeuticArea}
            </span>
            <span className={`font-mono text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full ring-1 ${
              isSubmitted 
                ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' 
                : 'bg-amber-50 text-amber-800 ring-amber-200'
            }`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${isSubmitted ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              {isSubmitted ? 'SUBMITTED (LOCKED)' : 'DRAFT IN PROGRESS'}
            </span>
            {lastSavedTime && (
              <span className="text-[10px] font-mono text-stone-400 hidden sm:inline ml-1">
                Auto-saved {lastSavedTime}
              </span>
            )}
          </div>
          <h2 className="font-sans font-bold text-xl sm:text-2xl text-stone-900 leading-snug">
            {currentCase?.title || 'No case selected'}
          </h2>
        </div>

        {/* Case Switcher & Save / Submit Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="border border-black/[0.08] rounded-xl px-3 py-2 text-xs font-mono font-medium text-stone-800 bg-stone-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 transition-all cursor-pointer shadow-apple-subtle"
          >
            {cases.map(c => (
              <option key={c.id} value={c.id}>
                {c.caseNumber} - {c.title.slice(0, 32)}...
              </option>
            ))}
          </select>

          {!isSubmitted ? (
            <>
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="border border-black/[0.09] bg-white/90 hover:bg-white active:scale-95 text-stone-800 px-3.5 py-2 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-apple-subtle hover:shadow-apple-card disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5 text-stone-600" />
                <span>Save Draft</span>
              </button>

              <button
                onClick={handleFinalSubmit}
                disabled={saving}
                className="bg-[#0B1325] hover:bg-[#1B3F8B] active:scale-95 text-white px-4 py-2 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-apple-subtle hover:shadow-apple-card transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>Submit ICSR</span>
              </button>
            </>
          ) : (
            <div className="bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 px-3.5 py-2 rounded-xl font-mono text-xs font-bold flex items-center space-x-1.5 shadow-apple-subtle">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>FINAL SUBMISSION LOCKED</span>
            </div>
          )}
        </div>
      </div>

      {/* Apple Segmented Workbench Workflow Tab Navigation */}
      <div className="bg-stone-200/50 p-1.5 rounded-2xl ring-1 ring-black/[0.04] shadow-apple-inner flex space-x-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('intake')}
          className={`flex-1 min-w-max py-2 px-3.5 rounded-xl font-mono text-xs font-medium tracking-wider uppercase transition-all duration-150 flex items-center justify-center space-x-1.5 ${
            activeTab === 'intake'
              ? 'bg-white text-stone-900 shadow-apple-subtle font-bold ring-1 ring-black/[0.04]'
              : 'text-stone-600 hover:text-stone-900 hover:bg-white/40'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>1. Intake</span>
        </button>

        <button
          onClick={() => setActiveTab('meddra')}
          className={`flex-1 min-w-max py-2 px-3.5 rounded-xl font-mono text-xs font-medium tracking-wider uppercase transition-all duration-150 flex items-center justify-center space-x-1.5 ${
            activeTab === 'meddra'
              ? 'bg-white text-stone-900 shadow-apple-subtle font-bold ring-1 ring-black/[0.04]'
              : 'text-stone-600 hover:text-stone-900 hover:bg-white/40'
          }`}
        >
          <Pill className="w-3.5 h-3.5" />
          <span>2. MedDRA ({meddraCoding.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('seriousness')}
          className={`flex-1 min-w-max py-2 px-3.5 rounded-xl font-mono text-xs font-medium tracking-wider uppercase transition-all duration-150 flex items-center justify-center space-x-1.5 ${
            activeTab === 'seriousness'
              ? 'bg-white text-stone-900 shadow-apple-subtle font-bold ring-1 ring-black/[0.04]'
              : 'text-stone-600 hover:text-stone-900 hover:bg-white/40'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>3. Seriousness</span>
        </button>

        <button
          onClick={() => setActiveTab('causality')}
          className={`flex-1 min-w-max py-2 px-3.5 rounded-xl font-mono text-xs font-medium tracking-wider uppercase transition-all duration-150 flex items-center justify-center space-x-1.5 ${
            activeTab === 'causality'
              ? 'bg-white text-stone-900 shadow-apple-subtle font-bold ring-1 ring-black/[0.04]'
              : 'text-stone-600 hover:text-stone-900 hover:bg-white/40'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>4. Causality (Score: {totalNaranjo})</span>
        </button>

        <button
          onClick={() => setActiveTab('narrative')}
          className={`flex-1 min-w-max py-2 px-3.5 rounded-xl font-mono text-xs font-medium tracking-wider uppercase transition-all duration-150 flex items-center justify-center space-x-1.5 ${
            activeTab === 'narrative'
              ? 'bg-white text-stone-900 shadow-apple-subtle font-bold ring-1 ring-black/[0.04]'
              : 'text-stone-600 hover:text-stone-900 hover:bg-white/40'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>5. Narrative</span>
        </button>

        <button
          onClick={() => setActiveTab('checklist')}
          className={`flex-1 min-w-max py-2 px-3.5 rounded-xl font-mono text-xs font-medium tracking-wider uppercase transition-all duration-150 flex items-center justify-center space-x-1.5 ${
            activeTab === 'checklist'
              ? 'bg-white text-stone-900 shadow-apple-subtle font-bold ring-1 ring-black/[0.04]'
              : 'text-stone-600 hover:text-stone-900 hover:bg-white/40'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>6. Pre-Flight Check</span>
        </button>
      </div>

      {/* Main Tab Viewport */}
      <div className="apple-card p-6 sm:p-8 min-h-[520px]">
        
        {/* TAB 1: INTAKE DOSSIER */}
        {activeTab === 'intake' && currentCase && (
          <div className="space-y-6">
            <div className="bg-stone-50/80 rounded-2xl p-5 border border-black/[0.06]">
              <div className="flex items-center space-x-2 text-[10px] font-mono uppercase font-bold text-[#1B3F8B] mb-1">
                <span>E2B Section B.1</span>
                <span>·</span>
                <span>Patient Demographics</span>
              </div>
              <h3 className="font-sans font-bold text-lg text-stone-900 mb-3">
                Patient Demographics & Medical History
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs mb-4">
                <div className="bg-white p-3 rounded-xl border border-black/[0.05] shadow-2xs">
                  <span className="font-mono text-stone-400 block text-[10px] uppercase">Initials</span>
                  <strong className="text-stone-900 font-sans text-base">{currentCase.patientInitials}</strong>
                </div>
                <div className="bg-white p-3 rounded-xl border border-black/[0.05] shadow-2xs">
                  <span className="font-mono text-stone-400 block text-[10px] uppercase">Age</span>
                  <strong className="text-stone-900 text-base">{currentCase.patientAge} <span className="text-xs font-normal text-stone-500">Years</span></strong>
                </div>
                <div className="bg-white p-3 rounded-xl border border-black/[0.05] shadow-2xs">
                  <span className="font-mono text-stone-400 block text-[10px] uppercase">Gender</span>
                  <strong className="text-stone-900 text-base">{currentCase.patientGender}</strong>
                </div>
                <div className="bg-white p-3 rounded-xl border border-black/[0.05] shadow-2xs">
                  <span className="font-mono text-stone-400 block text-[10px] uppercase">Weight</span>
                  <strong className="text-stone-900 text-base">{currentCase.patientWeightKg || 'N/A'} <span className="text-xs font-normal text-stone-500">kg</span></strong>
                </div>
              </div>
              <p className="text-xs text-stone-700 font-sans leading-relaxed bg-white p-3.5 rounded-xl border border-black/[0.05]">
                <strong className="font-semibold text-stone-900">Medical History:</strong> {currentCase.medicalHistory}
              </p>
            </div>

            {/* Suspect Medications */}
            <div>
              <h3 className="font-sans font-bold text-base text-stone-900 mb-2.5 flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Pill className="w-3.5 h-3.5" />
                </div>
                <span>Suspect Medicinal Products (Section B.4)</span>
              </h3>
              <div className="overflow-x-auto rounded-xl border border-black/[0.06]">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-black/[0.06] font-mono text-[10px] uppercase text-stone-400 bg-stone-50/80">
                      <th className="py-2.5 px-3.5">Brand Name</th>
                      <th className="py-2.5 px-3.5">Active INN</th>
                      <th className="py-2.5 px-3.5">Dose / Route / Freq</th>
                      <th className="py-2.5 px-3.5">Start / Stop</th>
                      <th className="py-2.5 px-3.5">Indication</th>
                      <th className="py-2.5 px-3.5">Action Taken</th>
                      <th className="py-2.5 px-3.5">Dechallenge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {currentCase.suspectDrugs.map((d, i) => (
                      <tr key={i} className="hover:bg-stone-50/50 transition-colors">
                        <td className="py-3 px-3.5 font-semibold text-stone-900">{d.name}</td>
                        <td className="py-3 px-3.5 font-mono text-stone-600">{d.inn}</td>
                        <td className="py-3 px-3.5 text-stone-700">{d.dose} · {d.route}</td>
                        <td className="py-3 px-3.5 font-mono text-[11px] text-stone-500">{d.startDate} {d.stopDate ? `to ${d.stopDate}` : ''}</td>
                        <td className="py-3 px-3.5 text-stone-700">{d.indication}</td>
                        <td className="py-3 px-3.5 font-medium text-stone-800">{d.actionTaken}</td>
                        <td className="py-3 px-3.5">
                          <span className="font-mono text-[10px] font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 px-2 py-0.5 rounded-full">
                            {d.dechallenge}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Verbatim Narrative Quote */}
            <div>
              <h3 className="font-sans font-bold text-base text-stone-900 mb-2">
                Initial Reporter Verbatim Statement
              </h3>
              <blockquote className="p-4 rounded-2xl bg-stone-50/70 border-l-4 border-[#0B1325] text-xs text-stone-800 leading-relaxed font-sans shadow-2xs">
                "{currentCase.verbatimNarrative}"
              </blockquote>
            </div>

            {/* Labs */}
            {currentCase.labTests.length > 0 && (
              <div>
                <h3 className="font-sans font-bold text-base text-stone-900 mb-2.5">
                  Laboratory Investigations
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  {currentCase.labTests.map((l, i) => (
                    <div key={i} className="p-3 rounded-xl border border-black/[0.06] bg-stone-50/60 flex justify-between items-center hover:bg-white hover:shadow-apple-subtle transition-all">
                      <div>
                        <div className="font-semibold text-stone-800">{l.testName}</div>
                        <div className="font-mono text-[10px] text-stone-400">Ref: {l.normalRange || 'N/A'}</div>
                      </div>
                      <div className="font-mono font-bold text-stone-900 bg-white px-2.5 py-1 rounded-lg border border-black/[0.05]">
                        {l.value} {l.unit}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1 Footer Action Bar */}
            <div className="pt-6 border-t border-black/[0.06] flex items-center justify-between">
              <div className="text-xs font-mono text-stone-400">
                Step 1 of 6 · Clinical Intake
              </div>
              <button
                type="button"
                onClick={() => handleProceedToNext('meddra')}
                className="px-5 py-2.5 rounded-xl bg-[#0B1325] hover:bg-[#1B3F8B] active:scale-95 text-white text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-apple-subtle hover:shadow-apple-card flex items-center space-x-2 cursor-pointer"
              >
                <span>Proceed to Step 2: MedDRA Coding</span>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: MEDDRA CODING */}
        {activeTab === 'meddra' && (
          <div className="space-y-6">
            <div className="bg-stone-50/80 rounded-2xl p-5 border border-black/[0.06]">
              <div className="flex items-center space-x-2 text-[10px] font-mono uppercase font-bold text-[#1B3F8B] mb-1">
                <span>E2B Section B.2.i</span>
                <span>·</span>
                <span>Standardized Terminology</span>
              </div>
              <h3 className="font-sans font-bold text-lg text-stone-900 mb-1">
                MedDRA Coding Console
              </h3>
              <p className="text-xs text-stone-600 font-sans leading-relaxed">
                Translate reported verbatim adverse events into standardized MedDRA terms. Select the Preferred Term (PT) and System Organ Class (SOC) that most accurately reflects the pathology.
              </p>
            </div>

            {/* Add term form */}
            {!isSubmitted && (
              <div className="apple-card p-6 space-y-4">
                <div className="font-mono text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#1B3F8B]"></span>
                  <span>Add MedDRA Coded Adverse Event</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase mb-1">Reported Verbatim Reaction</label>
                    <input
                      type="text"
                      value={currentVerbatim}
                      onChange={(e) => setCurrentVerbatim(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddMeddraTerm();
                        }
                      }}
                      placeholder="e.g. acute heart inflammation and cardiogenic shock"
                      className="w-full border border-black/[0.08] rounded-xl p-2.5 text-xs font-sans bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase mb-1">MedDRA Preferred Term (PT)</label>
                    <input
                      type="text"
                      value={currentPt}
                      onChange={(e) => setCurrentPt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddMeddraTerm();
                        }
                      }}
                      placeholder="e.g. Myocarditis"
                      className="w-full border border-black/[0.08] rounded-xl p-2.5 text-xs font-mono font-bold text-[#1B3F8B] bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase mb-1">System Organ Class (SOC)</label>
                    <select
                      value={currentSoc}
                      onChange={(e) => setCurrentSoc(e.target.value)}
                      className="w-full border border-black/[0.08] rounded-xl p-2.5 text-xs font-sans bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 transition-all cursor-pointer"
                    >
                      <option value="Cardiac disorders">Cardiac disorders</option>
                      <option value="Nervous system disorders">Nervous system disorders</option>
                      <option value="Skin and subcutaneous tissue disorders">Skin and subcutaneous tissue disorders</option>
                      <option value="Vascular disorders">Vascular disorders</option>
                      <option value="Gastrointestinal disorders">Gastrointestinal disorders</option>
                      <option value="Hepatobiliary disorders">Hepatobiliary disorders</option>
                      <option value="Blood and lymphatic system disorders">Blood and lymphatic system disorders</option>
                      <option value="Immune system disorders">Immune system disorders</option>
                      <option value="Renal and urinary disorders">Renal and urinary disorders</option>
                      <option value="General disorders and administration site conditions">General disorders and administration site conditions</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase mb-1">Coding Clinical Justification</label>
                    <input
                      type="text"
                      value={currentJustification}
                      onChange={(e) => setCurrentJustification(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddMeddraTerm();
                        }
                      }}
                      placeholder="e.g. Directly supported by cardiac MRI late gadolinium enhancement"
                      className="w-full border border-black/[0.08] rounded-xl p-2.5 text-xs font-sans bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 transition-all"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] font-mono text-stone-400">
                    Press <kbd className="px-1.5 py-0.5 bg-stone-100 rounded border border-black/10 font-bold text-stone-600">Enter</kbd> to add term to table
                  </span>
                  <button
                    onClick={handleAddMeddraTerm}
                    className="bg-[#0B1325] hover:bg-[#1B3F8B] active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-apple-subtle transition-all cursor-pointer"
                  >
                    + Add Coded Term
                  </button>
                </div>
              </div>
            )}

            {/* List of Coded Terms */}
            <div>
              <div className="font-mono text-xs font-bold text-stone-700 uppercase mb-3 flex items-center justify-between">
                <span>Currently Coded ICSR Terms</span>
                <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full text-[10px]">
                  {meddraCoding.length} Total
                </span>
              </div>
              {meddraCoding.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-stone-300 rounded-2xl bg-stone-50/40">
                  <p className="text-xs text-stone-400 italic">No MedDRA terms coded yet. Add terms using the console above.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {meddraCoding.map((term, idx) => (
                    <div key={idx} className="p-4 rounded-2xl border border-black/[0.06] bg-stone-50/60 flex justify-between items-center text-xs hover:bg-white hover:shadow-apple-subtle transition-all">
                      <div>
                        <div className="font-semibold text-stone-900 font-sans text-sm">
                          "{term.verbatim}"
                        </div>
                        <div className="flex items-center space-x-2 font-mono text-[11px] text-stone-600 mt-1">
                          <span className="font-bold text-[#1B3F8B] bg-blue-50 px-2 py-0.5 rounded-md ring-1 ring-blue-200/60">PT: {term.pt}</span>
                          <span>·</span>
                          <span className="bg-stone-100 px-2 py-0.5 rounded-md">SOC: {term.soc}</span>
                        </div>
                        {term.justification && (
                          <div className="text-[11px] text-stone-500 font-sans mt-1">
                            Rationale: {term.justification}
                          </div>
                        )}
                      </div>
                      {!isSubmitted && (
                        <button
                          onClick={() => setMeddraCoding(meddraCoding.filter((_, i) => i !== idx))}
                          className="text-stone-400 hover:text-rose-600 text-xs font-mono font-bold px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2 Footer Action Bar */}
            <div className="pt-6 border-t border-black/[0.06] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('intake')}
                className="px-4 py-2 rounded-xl text-xs font-mono font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Intake</span>
              </button>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl border border-black/[0.08] bg-white hover:bg-stone-50 text-stone-700 text-xs font-mono font-semibold transition-all shadow-apple-subtle hover:shadow-apple-card flex items-center space-x-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-stone-500" />
                  <span>{saving ? 'Saving...' : 'Save Draft'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleProceedToNext('seriousness')}
                  className="px-5 py-2.5 rounded-xl bg-[#0B1325] hover:bg-[#1B3F8B] active:scale-95 text-white text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-apple-subtle hover:shadow-apple-card flex items-center space-x-2 cursor-pointer"
                >
                  <span>Proceed to Step 3: Seriousness</span>
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SERIOUSNESS EVALUATION */}
        {activeTab === 'seriousness' && (
          <div className="space-y-6">
            <div className="bg-stone-50/80 rounded-2xl p-5 border border-black/[0.06]">
              <div className="flex items-center space-x-2 text-[10px] font-mono uppercase font-bold text-[#1B3F8B] mb-1">
                <span>ICH E2A Guideline</span>
                <span>·</span>
                <span>Regulatory Thresholds</span>
              </div>
              <h3 className="font-sans font-bold text-lg text-stone-900 mb-1">
                ICH E2A Seriousness Criteria Assessment
              </h3>
              <p className="text-xs text-stone-600 font-sans leading-relaxed">
                Determine whether the adverse reaction satisfies one or more international regulatory seriousness criteria.
              </p>
            </div>

            <div className="apple-card p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs font-sans">
                {[
                  { key: 'death', label: 'Results in Death', desc: 'Patient expired as a direct or indirect consequence' },
                  { key: 'lifeThreatening', label: 'Life-Threatening', desc: 'Immediate risk of dying at the time of the event' },
                  { key: 'hospitalization', label: 'Inpatient Hospitalization', desc: 'Required initial hospital admission or prolonged existing stay' },
                  { key: 'disability', label: 'Persistent Disability / Incapacity', desc: 'Substantial disruption of ability to conduct normal life functions' },
                  { key: 'congenitalAnomaly', label: 'Congenital Anomaly / Birth Defect', desc: 'Structural or functional abnormalities in offspring' },
                  { key: 'otherMedicallyImportant', label: 'Other Medically Important (IME)', desc: 'May jeopardize patient or require medical intervention to prevent above' }
                ].map((item) => (
                  <label 
                    key={item.key} 
                    className={`flex items-start space-x-3.5 p-4 rounded-2xl border transition-all cursor-pointer ${
                      seriousnessCriteria[item.key as keyof typeof seriousnessCriteria]
                        ? 'border-[#1B3F8B]/40 bg-blue-50/40 shadow-apple-subtle ring-1 ring-[#1B3F8B]/20'
                        : 'border-black/[0.06] hover:bg-stone-50/80'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={isSubmitted}
                      checked={seriousnessCriteria[item.key as keyof typeof seriousnessCriteria]}
                      onChange={(e) => setSeriousnessCriteria({
                        ...seriousnessCriteria,
                        [item.key]: e.target.checked
                      })}
                      className="mt-1 rounded-md text-[#1B3F8B] focus:ring-0 focus:outline-none cursor-pointer"
                    />
                    <div>
                      <div className="font-bold text-stone-900">{item.label}</div>
                      <div className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">{item.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Seriousness Summary Pill */}
              <div className="p-4 rounded-2xl border border-black/[0.06] bg-stone-50/70 flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-stone-700 uppercase">
                  Overall ICSR Seriousness Determination:
                </span>
                <span className={`font-mono text-xs font-bold px-3 py-1 rounded-full uppercase ring-1 ${
                  isSeriousSelected
                    ? 'bg-rose-50 text-rose-800 ring-rose-200'
                    : 'bg-stone-200/80 text-stone-700 ring-stone-300'
                }`}>
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${isSeriousSelected ? 'bg-rose-500' : 'bg-stone-400'}`}></span>
                  {isSeriousSelected ? 'SERIOUS ICSR (EXPEDITED REPORTING ELIGIBLE)' : 'NON-SERIOUS ICSR'}
                </span>
              </div>

              {/* Justification */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-mono font-bold text-stone-600 uppercase">
                    Seriousness Clinical Justification
                  </label>
                  <span className="text-[10px] font-mono text-stone-400">
                    Press <kbd className="px-1.5 py-0.5 bg-stone-100 rounded border border-black/10 font-bold text-stone-600">Ctrl + Enter</kbd> to proceed
                  </span>
                </div>
                <textarea
                  rows={4}
                  disabled={isSubmitted}
                  value={seriousnessJustification}
                  onChange={(e) => setSeriousnessJustification(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleProceedToNext('causality');
                    }
                  }}
                  placeholder="Explain why the patient met the selected seriousness criteria based on ICU stay, shock, inotropic support..."
                  className="w-full border border-black/[0.08] rounded-xl p-3 text-xs font-sans leading-relaxed bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 transition-all shadow-apple-inner"
                />
              </div>
            </div>

            {/* Step 3 Footer Action Bar */}
            <div className="pt-6 border-t border-black/[0.06] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('meddra')}
                className="px-4 py-2 rounded-xl text-xs font-mono font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to MedDRA</span>
              </button>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl border border-black/[0.08] bg-white hover:bg-stone-50 text-stone-700 text-xs font-mono font-semibold transition-all shadow-apple-subtle hover:shadow-apple-card flex items-center space-x-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-stone-500" />
                  <span>{saving ? 'Saving...' : 'Save Draft'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleProceedToNext('causality')}
                  className="px-5 py-2.5 rounded-xl bg-[#0B1325] hover:bg-[#1B3F8B] active:scale-95 text-white text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-apple-subtle hover:shadow-apple-card flex items-center space-x-2 cursor-pointer"
                >
                  <span>Proceed to Step 4: Causality Assessment</span>
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CAUSALITY ASSESSMENT */}
        {activeTab === 'causality' && (
          <div className="space-y-6">
            <div className="bg-stone-50/80 rounded-2xl p-5 border border-black/[0.06]">
              <div className="flex items-center space-x-2 text-[10px] font-mono uppercase font-bold text-[#1B3F8B] mb-1">
                <span>Algorithmic Validation</span>
                <span>·</span>
                <span>WHO-UMC & Naranjo</span>
              </div>
              <h3 className="font-sans font-bold text-lg text-stone-900 mb-1">
                Causality Assessment Console
              </h3>
              <p className="text-xs text-stone-600 font-sans leading-relaxed">
                Calculate the standardized Naranjo adverse drug reaction probability score and select the corresponding WHO-UMC causality category.
              </p>
            </div>

            {/* WHO-UMC Category */}
            <div className="apple-card p-6 space-y-3">
              <label className="block text-xs font-mono font-bold text-stone-600 uppercase">
                WHO-UMC Causality Classification
              </label>
              <select
                disabled={isSubmitted}
                value={causalityWho}
                onChange={(e) => setCausalityWho(e.target.value as any)}
                className="w-full border border-black/[0.08] rounded-xl p-3 text-xs font-sans font-bold text-stone-800 bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 transition-all cursor-pointer"
              >
                <option value="Certain">Certain - Plausible time relationship, dechallenge positive, rechallenge positive, no alternative cause</option>
                <option value="Probable">Probable / Likely - Reasonable time relationship, dechallenge positive, alternative causes unlikely</option>
                <option value="Possible">Possible - Reasonable time sequence, could also be explained by disease or other drugs</option>
                <option value="Unlikely">Unlikely - Improbable time relationship, disease provides plausible explanation</option>
                <option value="Conditional">Conditional / Unclassified - More data needed to complete assessment</option>
                <option value="Unassessable">Unassessable / Unclassifiable - Contradictory or unresolvable information</option>
              </select>
            </div>

            {/* Interactive Naranjo Algorithm Table */}
            <div className="apple-card p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/[0.06] pb-4 gap-3">
                <div>
                  <h4 className="font-sans font-bold text-base text-stone-900">
                    Naranjo Adverse Drug Reaction Probability Scale
                  </h4>
                  <div className="text-xs text-stone-500 font-sans mt-0.5">Answer all 10 clinical questions</div>
                </div>

                <div className="text-left sm:text-right bg-stone-50 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none">
                  <div className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">Total Naranjo Score</div>
                  <div className="font-mono font-bold text-2xl text-[#1B3F8B] tabular-nums">
                    {totalNaranjo} <span className="text-xs font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-full ring-1 ring-black/[0.05]">({naranjoInterpretation})</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {naranjoQuestions.map((q) => (
                  <div key={q.id} className="p-3.5 rounded-2xl border border-black/[0.05] bg-stone-50/50 flex flex-col sm:flex-row justify-between sm:items-center gap-2.5 hover:bg-stone-50 transition-colors">
                    <span className="text-xs font-sans text-stone-800 flex-1 leading-relaxed">{q.text}</span>
                    <div className="inline-flex rounded-xl bg-stone-200/60 p-1 text-xs font-mono shadow-apple-inner ring-1 ring-black/[0.04]">
                      {q.options.map((opt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          disabled={isSubmitted}
                          onClick={() => setNaranjoAnswers({ ...naranjoAnswers, [q.id]: opt.val })}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all duration-150 ${
                            naranjoAnswers[q.id] === opt.val
                              ? 'bg-[#0B1325] text-white shadow-apple-subtle'
                              : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Rationale */}
              <div className="pt-3 border-t border-black/[0.06]">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-mono font-bold text-stone-600 uppercase">
                    Causality Argumentation & Differential Diagnosis Rationale
                  </label>
                  <span className="text-[10px] font-mono text-stone-400">
                    Press <kbd className="px-1.5 py-0.5 bg-stone-100 rounded border border-black/10 font-bold text-stone-600">Ctrl + Enter</kbd> to proceed
                  </span>
                </div>
                <textarea
                  rows={4}
                  disabled={isSubmitted}
                  value={causalityRationale}
                  onChange={(e) => setCausalityRationale(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleProceedToNext('narrative');
                    }
                  }}
                  placeholder="Detail the pharmacological mechanism, drug dechallenge kinetics, and reasons for excluding alternative causes..."
                  className="w-full border border-black/[0.08] rounded-xl p-3 text-xs font-sans leading-relaxed bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 transition-all shadow-apple-inner"
                />
              </div>
            </div>

            {/* Step 4 Footer Action Bar */}
            <div className="pt-6 border-t border-black/[0.06] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('seriousness')}
                className="px-4 py-2 rounded-xl text-xs font-mono font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Seriousness</span>
              </button>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl border border-black/[0.08] bg-white hover:bg-stone-50 text-stone-700 text-xs font-mono font-semibold transition-all shadow-apple-subtle hover:shadow-apple-card flex items-center space-x-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-stone-500" />
                  <span>{saving ? 'Saving...' : 'Save Draft'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleProceedToNext('narrative')}
                  className="px-5 py-2.5 rounded-xl bg-[#0B1325] hover:bg-[#1B3F8B] active:scale-95 text-white text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-apple-subtle hover:shadow-apple-card flex items-center space-x-2 cursor-pointer"
                >
                  <span>Proceed to Step 5: Narrative Composer</span>
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CIOMS NARRATIVE COMPOSER */}
        {activeTab === 'narrative' && (
          <div className="space-y-6">
            <div className="bg-stone-50/80 rounded-2xl p-5 border border-black/[0.06]">
              <div className="flex items-center space-x-2 text-[10px] font-mono uppercase font-bold text-[#1B3F8B] mb-1">
                <span>E2B Section B.5.1</span>
                <span>·</span>
                <span>Medical Case History</span>
              </div>
              <h3 className="font-sans font-bold text-lg text-stone-900 mb-1">
                CIOMS-I / ICH E2B Standard Narrative Composer
              </h3>
              <p className="text-xs text-stone-600 font-sans leading-relaxed">
                Draft a coherent, chronological safety case narrative following industry E2B conventions: Patient Demographics &rarr; Suspect Drug Regimen &rarr; Event Onset &rarr; Diagnostics &rarr; Action Taken & Dechallenge &rarr; Outcome & Causality.
              </p>
            </div>

            {/* Template helpers */}
            {!isSubmitted && (
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="text-stone-400 uppercase text-[10px] font-bold">Insert Section Stub:</span>
                <button
                  type="button"
                  onClick={() => setCiomsNarrative(ciomsNarrative + `This medically confirmed spontaneous report describes a ${currentCase?.patientAge}-year-old ${currentCase?.patientGender?.toLowerCase()} patient (${currentCase?.patientInitials}, ${currentCase?.patientWeightKg} kg) with a history of ${currentCase?.medicalHistory}.\n\n`)}
                  className="bg-white hover:bg-stone-100 text-stone-800 px-3 py-1.5 rounded-xl text-[11px] border border-black/[0.08] shadow-apple-subtle transition-all active:scale-95"
                >
                  + Patient Header
                </button>
                <button
                  type="button"
                  onClick={() => setCiomsNarrative(ciomsNarrative + `The patient was receiving ${currentCase?.suspectDrugs[0]?.name} (${currentCase?.suspectDrugs[0]?.inn}) ${currentCase?.suspectDrugs[0]?.dose} ${currentCase?.suspectDrugs[0]?.route} for ${currentCase?.suspectDrugs[0]?.indication} initiated on ${currentCase?.suspectDrugs[0]?.startDate}.\n\n`)}
                  className="bg-white hover:bg-stone-100 text-stone-800 px-3 py-1.5 rounded-xl text-[11px] border border-black/[0.08] shadow-apple-subtle transition-all active:scale-95"
                >
                  + Suspect Drug Regimen
                </button>
                <button
                  type="button"
                  onClick={() => setCiomsNarrative(ciomsNarrative + `On ${currentCase?.adverseEvents[0]?.onsetDate}, the patient developed ${currentCase?.adverseEvents[0]?.verbatim}. Diagnostic investigations revealed pertinent laboratory abnormalities. The suspect medication was withdrawn with positive dechallenge.\n\n`)}
                  className="bg-white hover:bg-stone-100 text-stone-800 px-3 py-1.5 rounded-xl text-[11px] border border-black/[0.08] shadow-apple-subtle transition-all active:scale-95"
                >
                  + Timeline & Dechallenge
                </button>
              </div>
            )}

            {/* Textarea */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-stone-500 mb-1.5">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-stone-700">Narrative Draft</span>
                  <span className="text-[10px] text-stone-400 hidden sm:inline">
                    (Press <kbd className="px-1 py-0.5 bg-stone-100 rounded border border-black/10 font-bold text-stone-600">Ctrl + Enter</kbd> to proceed)
                  </span>
                </div>
                <span className="bg-stone-100 px-2.5 py-0.5 rounded-full text-[11px] ring-1 ring-black/[0.04]">
                  Words: <strong className="text-stone-900">{ciomsNarrative.trim() ? ciomsNarrative.trim().split(/\s+/).length : 0}</strong> · Chars: <strong className="text-stone-900">{ciomsNarrative.length}</strong>
                </span>
              </div>
              <textarea
                rows={12}
                disabled={isSubmitted}
                value={ciomsNarrative}
                onChange={(e) => setCiomsNarrative(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleProceedToNext('checklist');
                  }
                }}
                placeholder="Compose the full chronological narrative here..."
                className="w-full border border-black/[0.08] rounded-2xl p-4 text-xs font-sans leading-relaxed bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 transition-all shadow-apple-inner"
              />
            </div>

            {/* Step 5 Footer Action Bar */}
            <div className="pt-6 border-t border-black/[0.06] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('causality')}
                className="px-4 py-2 rounded-xl text-xs font-mono font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Causality</span>
              </button>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl border border-black/[0.08] bg-white hover:bg-stone-50 text-stone-700 text-xs font-mono font-semibold transition-all shadow-apple-subtle hover:shadow-apple-card flex items-center space-x-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-stone-500" />
                  <span>{saving ? 'Saving...' : 'Save Draft'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleProceedToNext('checklist')}
                  className="px-5 py-2.5 rounded-xl bg-[#0B1325] hover:bg-[#1B3F8B] active:scale-95 text-white text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-apple-subtle hover:shadow-apple-card flex items-center space-x-2 cursor-pointer"
                >
                  <span>Proceed to Step 6: Pre-Flight Check</span>
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: PRE-FLIGHT CHECKLIST & SUBMISSION */}
        {activeTab === 'checklist' && (
          <div className="space-y-6">
            <div className="bg-stone-50/80 rounded-2xl p-5 border border-black/[0.06]">
              <div className="flex items-center space-x-2 text-[10px] font-mono uppercase font-bold text-[#1B3F8B] mb-1">
                <span>Pre-Flight Gate</span>
                <span>·</span>
                <span>Verification & Routing</span>
              </div>
              <h3 className="font-sans font-bold text-lg text-stone-900 mb-1">
                ICSR Pre-Flight Submission Audit
              </h3>
              <p className="text-xs text-stone-600 font-sans leading-relaxed">
                Review your completed submission elements before final lock. Once submitted, your case will be routed to the AI Assessment Engine and your clinical mentor.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl border border-black/[0.06] bg-stone-50/50 hover:bg-white hover:shadow-apple-subtle transition-all flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-1 ${
                    meddraCoding.length > 0 ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-rose-50 text-rose-800 ring-rose-200'
                  }`}>
                    {meddraCoding.length > 0 ? '✓' : '!'}
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900 text-xs">MedDRA Coding Completed</div>
                    <div className="text-[11px] text-stone-500 font-mono">{meddraCoding.length} term(s) coded</div>
                  </div>
                </div>
                <button onClick={() => setActiveTab('meddra')} className="text-xs font-mono font-bold text-[#1B3F8B] hover:underline px-2 py-1">Edit</button>
              </div>

              <div className="p-4 rounded-2xl border border-black/[0.06] bg-stone-50/50 hover:bg-white hover:shadow-apple-subtle transition-all flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-1 ${
                    isSeriousSelected ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-amber-50 text-amber-800 ring-amber-200'
                  }`}>
                    {isSeriousSelected ? '✓' : '—'}
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900 text-xs">Seriousness Evaluation</div>
                    <div className="text-[11px] text-stone-500 font-mono">
                      {isSeriousSelected ? 'Serious Criteria Flagged' : 'Marked Non-Serious'}
                    </div>
                  </div>
                </div>
                <button onClick={() => setActiveTab('seriousness')} className="text-xs font-mono font-bold text-[#1B3F8B] hover:underline px-2 py-1">Edit</button>
              </div>

              <div className="p-4 rounded-2xl border border-black/[0.06] bg-stone-50/50 hover:bg-white hover:shadow-apple-subtle transition-all flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 flex items-center justify-center text-xs font-bold">
                    ✓
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900 text-xs">Causality Assessment</div>
                    <div className="text-[11px] text-stone-500 font-mono">
                      WHO: {causalityWho} · Naranjo Score: {totalNaranjo} ({naranjoInterpretation})
                    </div>
                  </div>
                </div>
                <button onClick={() => setActiveTab('causality')} className="text-xs font-mono font-bold text-[#1B3F8B] hover:underline px-2 py-1">Edit</button>
              </div>

              <div className="p-4 rounded-2xl border border-black/[0.06] bg-stone-50/50 hover:bg-white hover:shadow-apple-subtle transition-all flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-1 ${
                    ciomsNarrative.length > 50 ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-rose-50 text-rose-800 ring-rose-200'
                  }`}>
                    {ciomsNarrative.length > 50 ? '✓' : '!'}
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900 text-xs">CIOMS-I Narrative</div>
                    <div className="text-[11px] text-stone-500 font-mono">
                      {ciomsNarrative.length > 50 ? `${ciomsNarrative.trim().split(/\s+/).length} words composed` : 'Narrative is too short or empty'}
                    </div>
                  </div>
                </div>
                <button onClick={() => setActiveTab('narrative')} className="text-xs font-mono font-bold text-[#1B3F8B] hover:underline px-2 py-1">Edit</button>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-6 border-t border-black/[0.06] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('narrative')}
                className="px-4 py-2 rounded-xl text-xs font-mono font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Narrative</span>
              </button>

              {!isSubmitted ? (
                <button
                  onClick={handleFinalSubmit}
                  disabled={saving}
                  className="bg-[#0B1325] hover:bg-[#1B3F8B] active:scale-95 text-white px-6 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center space-x-2 shadow-apple-subtle hover:shadow-apple-card transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4 text-emerald-400" />
                  <span>{saving ? 'Submitting & Evaluating...' : 'Final Submit & Lock ICSR'}</span>
                </button>
              ) : (
                <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl border border-emerald-200/80 w-full text-center font-mono text-xs font-bold shadow-2xs">
                  ✓ SUBMISSION LOCKED · ROUTED TO AI EVALUATION ENGINE & MENTOR REVIEW QUEUE
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
