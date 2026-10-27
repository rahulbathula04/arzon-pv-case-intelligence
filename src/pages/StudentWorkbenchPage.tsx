import React, { useState, useEffect } from 'react';
import { PVCase, Assignment, StudentSubmission } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  Laptop, Save, Send, CheckCircle2, AlertTriangle, 
  BookOpen, Pill, Activity, Shield, Calculator, FileText, 
  HelpCircle, ChevronRight, CheckSquare 
} from 'lucide-react';

interface StudentWorkbenchPageProps {
  initialCaseId?: string | null;
  initialAssignmentId?: string | null;
}

export const StudentWorkbenchPage: React.FC<StudentWorkbenchPageProps> = ({
  initialCaseId,
  initialAssignmentId
}) => {
  const { user } = useAuth();
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
        const headers: Record<string, string> = {};
        if (user?.id) headers['x-user-id'] = user.id;

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
        const headers: Record<string, string> = {};
        if (user?.id) headers['x-user-id'] = user.id;

        // Fetch case
        const caseRes = await fetch(`/api/cases/${selectedCaseId}`, { headers });
        if (caseRes.ok) {
          const caseData = await caseRes.json();
          setCurrentCase(caseData.case);

          // Populate initial verbatim if empty
          if (caseData.case.adverseEvents?.length > 0 && meddraCoding.length === 0) {
            setCurrentVerbatim(caseData.case.adverseEvents[0].verbatim);
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
            setIsSubmitted(false);
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
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.id) headers['x-user-id'] = user.id;

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
        setLastSavedTime(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Failed to save draft:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleFinalSubmit = async () => {
    try {
      setSaving(true);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.id) headers['x-user-id'] = user.id;

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
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-2 border-[#1B3F8B] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="font-mono text-xs text-stone-500 uppercase tracking-wider">Loading PV Workbench...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      
      {/* Workbench Header & Case Selector */}
      <div className="bg-white border border-stone-200 rounded-lg p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-mono text-xs font-bold bg-[#0B1325] text-white px-2 py-0.5 rounded tracking-wider">
              {currentCase?.caseNumber || 'SELECT CASE'}
            </span>
            <span className="font-mono text-[10px] uppercase bg-stone-100 text-stone-700 px-2 py-0.5 rounded border border-stone-200">
              {currentCase?.therapeuticArea}
            </span>
            <span className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
              isSubmitted 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-amber-100 text-amber-800'
            }`}>
              {isSubmitted ? 'SUBMITTED (LOCKED)' : 'DRAFT IN PROGRESS'}
            </span>
            {lastSavedTime && (
              <span className="text-[10px] font-mono text-stone-400 hidden sm:inline">
                Saved at {lastSavedTime}
              </span>
            )}
          </div>
          <h2 className="font-serif font-bold text-lg sm:text-xl text-stone-900 leading-snug">
            {currentCase?.title || 'No case selected'}
          </h2>
        </div>

        {/* Case Switcher & Save / Submit Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="border border-stone-300 rounded p-1.5 text-xs font-mono font-medium text-stone-800 bg-white"
          >
            {cases.map(c => (
              <option key={c.id} value={c.id}>
                {c.caseNumber} - {c.title.slice(0, 35)}...
              </option>
            ))}
          </select>

          {!isSubmitted ? (
            <>
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 px-3 py-1.5 rounded font-mono text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all"
              >
                <Save className="w-3.5 h-3.5 text-stone-600" />
                <span>Save Draft</span>
              </button>

              <button
                onClick={handleFinalSubmit}
                disabled={saving}
                className="bg-[#0B1325] hover:bg-[#1B3F8B] text-white px-4 py-1.5 rounded font-mono text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-sm transition-all"
              >
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>Submit ICSR</span>
              </button>
            </>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded font-mono text-xs font-bold flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>FINAL SUBMISSION LOCKED</span>
            </div>
          )}
        </div>
      </div>

      {/* Workbench Tab Navigation */}
      <div className="border-b border-stone-200 bg-white rounded-t-lg px-4 flex space-x-2 sm:space-x-4 overflow-x-auto text-xs font-mono">
        <button
          onClick={() => setActiveTab('intake')}
          className={`py-3 border-b-2 font-bold tracking-wider uppercase transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
            activeTab === 'intake'
              ? 'border-[#0B1325] text-stone-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>1. Intake Dossier</span>
        </button>

        <button
          onClick={() => setActiveTab('meddra')}
          className={`py-3 border-b-2 font-bold tracking-wider uppercase transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
            activeTab === 'meddra'
              ? 'border-[#0B1325] text-stone-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Pill className="w-3.5 h-3.5" />
          <span>2. MedDRA Coding ({meddraCoding.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('seriousness')}
          className={`py-3 border-b-2 font-bold tracking-wider uppercase transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
            activeTab === 'seriousness'
              ? 'border-[#0B1325] text-stone-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>3. Seriousness Evaluation</span>
        </button>

        <button
          onClick={() => setActiveTab('causality')}
          className={`py-3 border-b-2 font-bold tracking-wider uppercase transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
            activeTab === 'causality'
              ? 'border-[#0B1325] text-stone-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>4. Causality (Naranjo: {totalNaranjo})</span>
        </button>

        <button
          onClick={() => setActiveTab('narrative')}
          className={`py-3 border-b-2 font-bold tracking-wider uppercase transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
            activeTab === 'narrative'
              ? 'border-[#0B1325] text-stone-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>5. CIOMS Narrative</span>
        </button>

        <button
          onClick={() => setActiveTab('checklist')}
          className={`py-3 border-b-2 font-bold tracking-wider uppercase transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
            activeTab === 'checklist'
              ? 'border-[#0B1325] text-stone-900'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>6. Pre-Flight Check</span>
        </button>
      </div>

      {/* Main Tab Viewport */}
      <div className="bg-white border border-stone-200 rounded-b-lg p-6 shadow-sm min-h-[500px]">
        
        {/* TAB 1: INTAKE DOSSIER */}
        {activeTab === 'intake' && currentCase && (
          <div className="space-y-6">
            <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
              <h3 className="font-serif font-bold text-base text-stone-900 mb-2">
                Patient Demographics & Medical History (Section B.1)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
                <div><span className="font-mono text-stone-400">Initials:</span> <strong>{currentCase.patientInitials}</strong></div>
                <div><span className="font-mono text-stone-400">Age:</span> <strong>{currentCase.patientAge} Years</strong></div>
                <div><span className="font-mono text-stone-400">Gender:</span> <strong>{currentCase.patientGender}</strong></div>
                <div><span className="font-mono text-stone-400">Weight:</span> <strong>{currentCase.patientWeightKg || 'N/A'} kg</strong></div>
              </div>
              <p className="text-xs text-stone-700 font-sans leading-relaxed">
                <strong>Medical History:</strong> {currentCase.medicalHistory}
              </p>
            </div>

            {/* Suspect Medications */}
            <div>
              <h3 className="font-serif font-bold text-base text-stone-900 mb-2 flex items-center space-x-2">
                <Pill className="w-4 h-4 text-blue-600" />
                <span>Suspect Medicinal Products (Section B.4)</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-stone-200 font-mono text-[10px] uppercase text-stone-400 bg-stone-50">
                      <th className="py-2 px-3">Brand Name</th>
                      <th className="py-2 px-3">Active INN</th>
                      <th className="py-2 px-3">Dose / Route / Freq</th>
                      <th className="py-2 px-3">Start / Stop</th>
                      <th className="py-2 px-3">Indication</th>
                      <th className="py-2 px-3">Action Taken</th>
                      <th className="py-2 px-3">Dechallenge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {currentCase.suspectDrugs.map((d, i) => (
                      <tr key={i}>
                        <td className="py-2.5 px-3 font-semibold text-stone-900">{d.name}</td>
                        <td className="py-2.5 px-3 font-mono text-stone-600">{d.inn}</td>
                        <td className="py-2.5 px-3 text-stone-700">{d.dose} · {d.route}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">{d.startDate} {d.stopDate ? `to ${d.stopDate}` : ''}</td>
                        <td className="py-2.5 px-3 text-stone-700">{d.indication}</td>
                        <td className="py-2.5 px-3 font-medium text-stone-800">{d.actionTaken}</td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-emerald-700">{d.dechallenge}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Verbatim Narrative Quote */}
            <div>
              <h3 className="font-serif font-bold text-base text-stone-900 mb-2">
                Initial Reporter Verbatim Statement
              </h3>
              <blockquote className="p-4 rounded-lg bg-stone-50 border-l-4 border-[#0B1325] text-xs text-stone-800 leading-relaxed font-sans">
                {currentCase.verbatimNarrative}
              </blockquote>
            </div>

            {/* Labs */}
            {currentCase.labTests.length > 0 && (
              <div>
                <h3 className="font-serif font-bold text-base text-stone-900 mb-2">
                  Laboratory Investigations
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {currentCase.labTests.map((l, i) => (
                    <div key={i} className="p-2.5 rounded border border-stone-200 bg-stone-50 flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-stone-800">{l.testName}</div>
                        <div className="font-mono text-[10px] text-stone-400">Ref: {l.normalRange || 'N/A'}</div>
                      </div>
                      <div className="font-mono font-bold text-stone-900">
                        {l.value} {l.unit}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MEDDRA CODING */}
        {activeTab === 'meddra' && (
          <div className="space-y-6">
            <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
              <h3 className="font-serif font-bold text-base text-stone-900 mb-1">
                MedDRA Coding Console (ICH E2B Section B.2.i)
              </h3>
              <p className="text-xs text-stone-600 font-sans">
                Translate reported verbatim adverse events into standardized MedDRA terms. Select the Preferred Term (PT) and System Organ Class (SOC) that most accurately reflects the pathology.
              </p>
            </div>

            {/* Add term form */}
            {!isSubmitted && (
              <div className="bg-white border border-stone-300 rounded-lg p-5 shadow-sm space-y-4">
                <div className="font-mono text-xs font-bold text-stone-800 uppercase tracking-wider">
                  Add MedDRA Coded Adverse Event
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase mb-1">Reported Verbatim Reaction</label>
                    <input
                      type="text"
                      value={currentVerbatim}
                      onChange={(e) => setCurrentVerbatim(e.target.value)}
                      placeholder="e.g. acute heart inflammation and cardiogenic shock"
                      className="w-full border border-stone-300 rounded p-2 text-xs font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase mb-1">MedDRA Preferred Term (PT)</label>
                    <input
                      type="text"
                      value={currentPt}
                      onChange={(e) => setCurrentPt(e.target.value)}
                      placeholder="e.g. Myocarditis"
                      className="w-full border border-stone-300 rounded p-2 text-xs font-mono font-bold text-[#1B3F8B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase mb-1">System Organ Class (SOC)</label>
                    <select
                      value={currentSoc}
                      onChange={(e) => setCurrentSoc(e.target.value)}
                      className="w-full border border-stone-300 rounded p-2 text-xs font-sans"
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
                      placeholder="e.g. Directly supported by cardiac MRI late gadolinium enhancement"
                      className="w-full border border-stone-300 rounded p-2 text-xs font-sans"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleAddMeddraTerm}
                    className="bg-[#0B1325] hover:bg-[#1B3F8B] text-white px-4 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider"
                  >
                    + Add Coded Term
                  </button>
                </div>
              </div>
            )}

            {/* List of Coded Terms */}
            <div>
              <div className="font-mono text-xs font-bold text-stone-700 uppercase mb-2">
                Currently Coded ICSR Terms ({meddraCoding.length})
              </div>
              {meddraCoding.length === 0 ? (
                <p className="text-xs text-stone-400 italic">No MedDRA terms coded yet. Add terms above.</p>
              ) : (
                <div className="space-y-2">
                  {meddraCoding.map((term, idx) => (
                    <div key={idx} className="p-3 rounded border border-stone-200 bg-stone-50 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-semibold text-stone-900 font-sans">
                          Verbatim: "{term.verbatim}"
                        </div>
                        <div className="flex items-center space-x-2 font-mono text-[11px] text-stone-600 mt-1">
                          <span className="font-bold text-[#1B3F8B]">PT: {term.pt}</span>
                          <span>·</span>
                          <span>SOC: {term.soc}</span>
                        </div>
                        {term.justification && (
                          <div className="text-[11px] text-stone-500 font-sans mt-0.5">
                            Justification: {term.justification}
                          </div>
                        )}
                      </div>
                      {!isSubmitted && (
                        <button
                          onClick={() => setMeddraCoding(meddraCoding.filter((_, i) => i !== idx))}
                          className="text-stone-400 hover:text-rose-600 text-xs font-mono font-bold"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SERIOUSNESS EVALUATION */}
        {activeTab === 'seriousness' && (
          <div className="space-y-6">
            <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
              <h3 className="font-serif font-bold text-base text-stone-900 mb-1">
                ICH E2A Seriousness Criteria Assessment
              </h3>
              <p className="text-xs text-stone-600 font-sans">
                Determine whether the adverse reaction satisfies one or more international regulatory seriousness criteria.
              </p>
            </div>

            <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
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
                    className={`flex items-start space-x-3 p-3.5 rounded-lg border transition-all cursor-pointer ${
                      seriousnessCriteria[item.key as keyof typeof seriousnessCriteria]
                        ? 'border-[#1B3F8B] bg-blue-50/50'
                        : 'border-stone-200 hover:bg-stone-50'
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
                      className="mt-0.5 rounded text-[#1B3F8B]"
                    />
                    <div>
                      <div className="font-bold text-stone-900">{item.label}</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">{item.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Seriousness Summary Pill */}
              <div className="p-3.5 rounded-lg border border-stone-200 bg-stone-50 flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-stone-700 uppercase">
                  Overall ICSR Seriousness Determination:
                </span>
                <span className={`font-mono text-xs font-bold px-3 py-1 rounded uppercase ${
                  isSeriousSelected
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-stone-200 text-stone-700'
                }`}>
                  {isSeriousSelected ? '● SERIOUS ICSR (EXPEDITED REPORTING ELIGIBLE)' : 'NON-SERIOUS ICSR'}
                </span>
              </div>

              {/* Justification */}
              <div>
                <label className="block text-xs font-mono font-bold text-stone-600 uppercase mb-1">
                  Seriousness Clinical Justification
                </label>
                <textarea
                  rows={3}
                  disabled={isSubmitted}
                  value={seriousnessJustification}
                  onChange={(e) => setSeriousnessJustification(e.target.value)}
                  placeholder="Explain why the patient met the selected seriousness criteria based on ICU stay, shock, inotropic support..."
                  className="w-full border border-stone-300 rounded p-2 text-xs font-sans leading-relaxed"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CAUSALITY ASSESSMENT */}
        {activeTab === 'causality' && (
          <div className="space-y-6">
            <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
              <h3 className="font-serif font-bold text-base text-stone-900 mb-1">
                Causality Assessment Console (WHO-UMC & Naranjo Algorithm)
              </h3>
              <p className="text-xs text-stone-600 font-sans">
                Calculate the standardized Naranjo adverse drug reaction probability score and select the corresponding WHO-UMC causality category.
              </p>
            </div>

            {/* WHO-UMC Category */}
            <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm space-y-3">
              <label className="block text-xs font-mono font-bold text-stone-600 uppercase">
                WHO-UMC Causality Classification
              </label>
              <select
                disabled={isSubmitted}
                value={causalityWho}
                onChange={(e) => setCausalityWho(e.target.value as any)}
                className="w-full border border-stone-300 rounded p-2 text-xs font-sans font-bold text-stone-800"
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
            <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div>
                  <h4 className="font-serif font-bold text-base text-stone-900">
                    Naranjo Adverse Drug Reaction Probability Scale
                  </h4>
                  <div className="text-xs text-stone-500 font-sans">Answer all 10 clinical questions</div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-mono text-stone-400 uppercase">Total Naranjo Score</div>
                  <div className="font-mono font-bold text-xl text-[#1B3F8B]">
                    {totalNaranjo} <span className="text-xs text-stone-600">({naranjoInterpretation})</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {naranjoQuestions.map((q) => (
                  <div key={q.id} className="p-3 rounded border border-stone-100 bg-stone-50/60 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <span className="text-xs font-sans text-stone-800 flex-1">{q.text}</span>
                    <div className="inline-flex rounded-md border border-stone-200 bg-white p-0.5 text-xs font-mono">
                      {q.options.map((opt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          disabled={isSubmitted}
                          onClick={() => setNaranjoAnswers({ ...naranjoAnswers, [q.id]: opt.val })}
                          className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                            naranjoAnswers[q.id] === opt.val
                              ? 'bg-[#0B1325] text-white shadow-sm'
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
              <div className="pt-3 border-t border-stone-200">
                <label className="block text-xs font-mono font-bold text-stone-600 uppercase mb-1">
                  Causality Argumentation & Differential Diagnosis Rationale
                </label>
                <textarea
                  rows={3}
                  disabled={isSubmitted}
                  value={causalityRationale}
                  onChange={(e) => setCausalityRationale(e.target.value)}
                  placeholder="Detail the pharmacological mechanism, drug dechallenge kinetics, and reasons for excluding alternative causes..."
                  className="w-full border border-stone-300 rounded p-2 text-xs font-sans leading-relaxed"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CIOMS NARRATIVE COMPOSER */}
        {activeTab === 'narrative' && (
          <div className="space-y-6">
            <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
              <h3 className="font-serif font-bold text-base text-stone-900 mb-1">
                CIOMS-I / ICH E2B Standard Narrative Composer
              </h3>
              <p className="text-xs text-stone-600 font-sans">
                Draft a coherent, chronological safety case narrative following industry E2B conventions: Patient Demographics &rarr; Suspect Drug Regimen &rarr; Event Onset &rarr; Diagnostics &rarr; Action Taken & Dechallenge &rarr; Outcome & Causality.
              </p>
            </div>

            {/* Template helpers */}
            {!isSubmitted && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                <span className="text-stone-400 uppercase text-[10px]">Insert Section Stub:</span>
                <button
                  type="button"
                  onClick={() => setCiomsNarrative(ciomsNarrative + `This medically confirmed spontaneous report describes a ${currentCase?.patientAge}-year-old ${currentCase?.patientGender?.toLowerCase()} patient (${currentCase?.patientInitials}, ${currentCase?.patientWeightKg} kg) with a history of ${currentCase?.medicalHistory}.\n\n`)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-800 px-2 py-1 rounded text-[11px]"
                >
                  + Patient Header
                </button>
                <button
                  type="button"
                  onClick={() => setCiomsNarrative(ciomsNarrative + `The patient was receiving ${currentCase?.suspectDrugs[0]?.name} (${currentCase?.suspectDrugs[0]?.inn}) ${currentCase?.suspectDrugs[0]?.dose} ${currentCase?.suspectDrugs[0]?.route} for ${currentCase?.suspectDrugs[0]?.indication} initiated on ${currentCase?.suspectDrugs[0]?.startDate}.\n\n`)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-800 px-2 py-1 rounded text-[11px]"
                >
                  + Suspect Drug Regimen
                </button>
                <button
                  type="button"
                  onClick={() => setCiomsNarrative(ciomsNarrative + `On ${currentCase?.adverseEvents[0]?.onsetDate}, the patient developed ${currentCase?.adverseEvents[0]?.verbatim}. Diagnostic investigations revealed pertinent laboratory abnormalities. The suspect medication was withdrawn with positive dechallenge.\n\n`)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-800 px-2 py-1 rounded text-[11px]"
                >
                  + Timeline & Dechallenge
                </button>
              </div>
            )}

            {/* Textarea */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-stone-500 mb-1">
                <span>E2B Section B.5.1 Narrative Draft</span>
                <span>
                  Words: <strong>{ciomsNarrative.trim() ? ciomsNarrative.trim().split(/\s+/).length : 0}</strong> · Chars: <strong>{ciomsNarrative.length}</strong>
                </span>
              </div>
              <textarea
                rows={12}
                disabled={isSubmitted}
                value={ciomsNarrative}
                onChange={(e) => setCiomsNarrative(e.target.value)}
                placeholder="Compose the full chronological narrative here..."
                className="w-full border border-stone-300 rounded-lg p-4 text-xs font-sans leading-relaxed focus:ring-1 focus:ring-[#1B3F8B] focus:border-[#1B3F8B]"
              />
            </div>
          </div>
        )}

        {/* TAB 6: PRE-FLIGHT CHECKLIST & SUBMISSION */}
        {activeTab === 'checklist' && (
          <div className="space-y-6">
            <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
              <h3 className="font-serif font-bold text-base text-stone-900 mb-1">
                ICSR Pre-Flight Submission Audit
              </h3>
              <p className="text-xs text-stone-600 font-sans">
                Review your completed submission elements before final lock. Once submitted, your case will be routed to the AI Assessment Engine and your clinical mentor.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-lg border border-stone-200 bg-white flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    meddraCoding.length > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {meddraCoding.length > 0 ? '✓' : '!'}
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900 text-xs">MedDRA Coding Completed</div>
                    <div className="text-[11px] text-stone-500 font-mono">{meddraCoding.length} term(s) coded</div>
                  </div>
                </div>
                <button onClick={() => setActiveTab('meddra')} className="text-xs font-mono font-bold text-[#1B3F8B]">Edit</button>
              </div>

              <div className="p-4 rounded-lg border border-stone-200 bg-white flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isSeriousSelected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
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
                <button onClick={() => setActiveTab('seriousness')} className="text-xs font-mono font-bold text-[#1B3F8B]">Edit</button>
              </div>

              <div className="p-4 rounded-lg border border-stone-200 bg-white flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                    ✓
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900 text-xs">Causality Assessment</div>
                    <div className="text-[11px] text-stone-500 font-mono">
                      WHO: {causalityWho} · Naranjo Score: {totalNaranjo} ({naranjoInterpretation})
                    </div>
                  </div>
                </div>
                <button onClick={() => setActiveTab('causality')} className="text-xs font-mono font-bold text-[#1B3F8B]">Edit</button>
              </div>

              <div className="p-4 rounded-lg border border-stone-200 bg-white flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    ciomsNarrative.length > 50 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
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
                <button onClick={() => setActiveTab('narrative')} className="text-xs font-mono font-bold text-[#1B3F8B]">Edit</button>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-stone-200 flex justify-end">
              {!isSubmitted ? (
                <button
                  onClick={handleFinalSubmit}
                  disabled={saving}
                  className="bg-[#0B1325] hover:bg-[#1B3F8B] text-white px-6 py-2.5 rounded font-mono text-xs font-bold uppercase tracking-wider flex items-center space-x-2 shadow-sm transition-all"
                >
                  <Send className="w-4 h-4 text-emerald-400" />
                  <span>Final Submit & Lock ICSR</span>
                </button>
              ) : (
                <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg border border-emerald-200 w-full text-center font-mono text-xs font-bold">
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
