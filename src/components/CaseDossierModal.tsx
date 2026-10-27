import React, { useState, useEffect } from 'react';
import { PVCase, CaseVersion } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  X, AlertTriangle, Shield, CheckCircle, FileText, 
  Activity, Pill, Clock, ArrowRight, History, Lock 
} from 'lucide-react';

interface CaseDossierModalProps {
  caseId: string;
  onClose: () => void;
  onLaunchWorkbench?: (caseId: string) => void;
}

export const CaseDossierModal: React.FC<CaseDossierModalProps> = ({ 
  caseId, 
  onClose, 
  onLaunchWorkbench 
}) => {
  const { isStaff, user } = useAuth();
  const [pvCase, setPvCase] = useState<PVCase | null>(null);
  const [versions, setVersions] = useState<CaseVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dossier' | 'reference' | 'versions'>('dossier');

  useEffect(() => {
    const fetchCase = async () => {
      try {
        setLoading(true);
        const headers: Record<string, string> = {};
        if (user?.id) headers['x-user-id'] = user.id;

        const res = await fetch(`/api/cases/${caseId}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setPvCase(data.case);
        }

        if (isStaff) {
          const vRes = await fetch(`/api/cases/${caseId}/versions`, { headers });
          if (vRes.ok) {
            const vData = await vRes.json();
            setVersions(vData.versions || []);
          }
        }
      } catch (err) {
        console.error('Failed to load case dossier:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCase();
  }, [caseId, user, isStaff]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 max-w-sm w-full text-center border border-stone-200 shadow-xl">
          <div className="w-8 h-8 border-2 border-[#1B3F8B] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="font-mono text-xs text-stone-600 uppercase tracking-wider">Loading Clinical Dossier...</p>
        </div>
      </div>
    );
  }

  if (!pvCase) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full border border-stone-200 shadow-xl">
          <p className="text-sm text-stone-800 mb-4">Case not found or access restricted.</p>
          <button 
            onClick={onClose}
            className="w-full bg-[#0B1325] text-white py-2 rounded text-xs font-mono font-bold uppercase tracking-wider"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-stone-300 shadow-2xl overflow-hidden my-auto">
        
        {/* Mandatory Fictional Warning Bar */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-amber-900 text-xs font-mono">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="font-bold tracking-wider uppercase">
              {pvCase.fictionalDisclaimer}
            </span>
          </div>
          <span className="text-[11px] text-amber-800 font-semibold hidden md:inline">
            ICSR VERSION {pvCase.activeVersion}.0
          </span>
        </div>

        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-stone-200 bg-[#FAF9F6] flex flex-wrap justify-between items-start gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1.5">
              <span className="font-mono text-xs font-bold bg-[#0B1325] text-white px-2 py-0.5 rounded tracking-wider">
                {pvCase.caseNumber}
              </span>
              <span className="font-mono text-[11px] font-semibold bg-stone-200 text-stone-800 px-2 py-0.5 rounded uppercase">
                {pvCase.therapeuticArea}
              </span>
              <span className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded uppercase ${
                pvCase.difficulty === 'Beginner' ? 'bg-emerald-100 text-emerald-800' :
                pvCase.difficulty === 'Intermediate' ? 'bg-blue-100 text-blue-800' :
                'bg-purple-100 text-purple-800'
              }`}>
                {pvCase.difficulty}
              </span>
              <span className="font-mono text-[10px] text-stone-500 uppercase">
                Receipt: {pvCase.receiptDate} · Reporter: {pvCase.reporterType}
              </span>
            </div>
            <h2 className="font-serif font-bold text-xl sm:text-2xl text-stone-900 tracking-tight">
              {pvCase.title}
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            {onLaunchWorkbench && (
              <button
                onClick={() => onLaunchWorkbench(pvCase.id)}
                className="bg-[#0B1325] hover:bg-[#1B3F8B] text-white px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-wider flex items-center space-x-2 shadow-sm transition-all"
              >
                <span>Launch in Workbench</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Sub-Tabs */}
        <div className="px-6 border-b border-stone-200 bg-white flex space-x-4 text-xs font-mono">
          <button
            onClick={() => setActiveTab('dossier')}
            className={`py-3 border-b-2 font-bold tracking-wider uppercase transition-colors flex items-center space-x-1.5 ${
              activeTab === 'dossier'
                ? 'border-[#0B1325] text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Clinical Intake Dossier</span>
          </button>

          {isStaff ? (
            <button
              onClick={() => setActiveTab('reference')}
              className={`py-3 border-b-2 font-bold tracking-wider uppercase transition-colors flex items-center space-x-1.5 ${
                activeTab === 'reference'
                  ? 'border-[#1B3F8B] text-[#1B3F8B]'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-purple-600" />
              <span className="flex items-center space-x-1">
                <span>Reference Rubric & Key</span>
                <span className="bg-purple-100 text-purple-800 text-[9px] px-1 rounded">RESTRICTED</span>
              </span>
            </button>
          ) : (
            <div className="py-3 text-stone-400 flex items-center space-x-1 cursor-not-allowed text-[11px]" title="Reference answers are protected and only released upon mentor review">
              <Lock className="w-3.5 h-3.5" />
              <span>Reference Answers (Locked)</span>
            </div>
          )}

          {isStaff && (
            <button
              onClick={() => setActiveTab('versions')}
              className={`py-3 border-b-2 font-bold tracking-wider uppercase transition-colors flex items-center space-x-1.5 ${
                activeTab === 'versions'
                  ? 'border-stone-800 text-stone-900'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Version History ({versions.length})</span>
            </button>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-stone-50/50">

          {/* TAB 1: CLINICAL INTAKE DOSSIER */}
          {activeTab === 'dossier' && (
            <div className="space-y-6">
              
              {/* Patient Demographics & Baseline */}
              <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-4">
                  <h3 className="font-serif font-bold text-base text-stone-900 flex items-center space-x-2">
                    <span>Patient Profile & Medical History</span>
                  </h3>
                  <span className="font-mono text-xs text-stone-500 uppercase">
                    E2B Section B.1
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-[10px] font-mono text-stone-400 uppercase">Patient Initials</div>
                    <div className="font-mono font-bold text-stone-900 text-sm">{pvCase.patientInitials}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-stone-400 uppercase">Age / Gender</div>
                    <div className="font-sans font-semibold text-stone-900 text-sm">
                      {pvCase.patientAge} Years · {pvCase.patientGender}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-stone-400 uppercase">Weight</div>
                    <div className="font-sans font-semibold text-stone-900 text-sm">
                      {pvCase.patientWeightKg ? `${pvCase.patientWeightKg} kg` : 'Not documented'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-stone-400 uppercase">Receipt Date</div>
                    <div className="font-mono text-stone-900 text-sm">{pvCase.receiptDate}</div>
                  </div>
                </div>

                <div className="bg-stone-50 rounded-md p-3 border border-stone-200">
                  <div className="text-[10px] font-mono font-bold text-stone-500 uppercase mb-1">
                    Pre-existing Medical History & Comorbidities
                  </div>
                  <p className="text-xs text-stone-700 leading-relaxed font-sans">
                    {pvCase.medicalHistory}
                  </p>
                </div>
              </div>

              {/* Suspect Medications */}
              <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-4">
                  <h3 className="font-serif font-bold text-base text-stone-900 flex items-center space-x-2">
                    <Pill className="w-4 h-4 text-blue-600" />
                    <span>Suspect Medicinal Products</span>
                  </h3>
                  <span className="font-mono text-xs text-stone-500 uppercase">
                    E2B Section B.4
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-stone-200 font-mono text-[10px] uppercase text-stone-400 bg-stone-50">
                        <th className="py-2 px-3">Role</th>
                        <th className="py-2 px-3">Product Name (Brand)</th>
                        <th className="py-2 px-3">Active Substance (INN)</th>
                        <th className="py-2 px-3">Dose / Route / Freq</th>
                        <th className="py-2 px-3">Start / Stop Date</th>
                        <th className="py-2 px-3">Indication</th>
                        <th className="py-2 px-3">Action Taken</th>
                        <th className="py-2 px-3">Dechallenge</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {pvCase.suspectDrugs.map((d, i) => (
                        <tr key={i} className="hover:bg-stone-50/80">
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                              {d.role}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-stone-900">{d.name}</td>
                          <td className="py-2.5 px-3 font-mono text-stone-600">{d.inn}</td>
                          <td className="py-2.5 px-3 text-stone-700">{d.dose} · {d.route} · {d.frequency}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-stone-600">
                            {d.startDate} {d.stopDate ? `to ${d.stopDate}` : '(Ongoing)'}
                          </td>
                          <td className="py-2.5 px-3 text-stone-700">{d.indication}</td>
                          <td className="py-2.5 px-3 font-medium text-stone-800">{d.actionTaken}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-emerald-700">{d.dechallenge}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {pvCase.concomitantDrugs.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-stone-200">
                    <div className="font-mono text-xs font-bold text-stone-600 uppercase mb-2">
                      Concomitant Medications ({pvCase.concomitantDrugs.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {pvCase.concomitantDrugs.map((c, i) => (
                        <div key={i} className="text-xs p-2 rounded bg-stone-50 border border-stone-200 flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-stone-900">{c.name}</span>
                            <span className="text-stone-500 font-mono text-[11px] ml-1">({c.inn})</span>
                          </div>
                          <span className="font-mono text-[10px] text-stone-500">{c.dose} · {c.indication}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Adverse Events & Verbatim Findings */}
              <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-4">
                  <h3 className="font-serif font-bold text-base text-stone-900 flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-rose-600" />
                    <span>Reported Adverse Events</span>
                  </h3>
                  <span className="font-mono text-xs text-stone-500 uppercase">
                    E2B Section B.2
                  </span>
                </div>

                <div className="space-y-3">
                  {pvCase.adverseEvents.map((ae, i) => (
                    <div key={i} className="p-3.5 rounded-lg border border-stone-200 bg-stone-50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <div>
                        <div className="font-mono text-[10px] text-stone-400 uppercase">Reported Verbatim Term</div>
                        <div className="text-sm font-semibold text-stone-900">
                          "{ae.verbatim}"
                        </div>
                        <div className="text-xs text-stone-500 font-mono mt-0.5">
                          Onset: {ae.onsetDate} {ae.resolutionDate ? `· Resolution: ${ae.resolutionDate}` : '· Ongoing'} · Outcome: {ae.outcome}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${
                          ae.seriousness.isSerious 
                            ? 'bg-rose-50 text-rose-700 border-rose-200' 
                            : 'bg-stone-100 text-stone-600 border-stone-200'
                        }`}>
                          {ae.seriousness.isSerious ? 'SERIOUS ICSR' : 'NON-SERIOUS'}
                        </span>
                        {ae.seriousness.criteria.lifeThreatening && (
                          <span className="text-[9px] font-mono uppercase bg-red-100 text-red-800 px-1.5 py-0.5 rounded">Life Threatening</span>
                        )}
                        {ae.seriousness.criteria.hospitalization && (
                          <span className="text-[9px] font-mono uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Hospitalization</span>
                        )}
                        {ae.seriousness.criteria.disability && (
                          <span className="text-[9px] font-mono uppercase bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">Disability</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lab Values & Diagnostic Procedures */}
              {pvCase.labTests.length > 0 && (
                <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-4">
                    <h3 className="font-serif font-bold text-base text-stone-900">
                      Laboratory Tests & Diagnostic Investigations
                    </h3>
                    <span className="font-mono text-xs text-stone-500 uppercase">
                      E2B Section B.3
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-sans">
                      <thead>
                        <tr className="border-b border-stone-200 font-mono text-[10px] uppercase text-stone-400 bg-stone-50">
                          <th className="py-2 px-3">Test / Diagnostic Procedure</th>
                          <th className="py-2 px-3">Reported Value</th>
                          <th className="py-2 px-3">Reference Range</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Clinical Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-mono text-xs">
                        {pvCase.labTests.map((t, i) => (
                          <tr key={i} className="hover:bg-stone-50">
                            <td className="py-2.5 px-3 font-semibold text-stone-800">{t.testName}</td>
                            <td className="py-2.5 px-3 font-bold text-stone-900">{t.value} {t.unit}</td>
                            <td className="py-2.5 px-3 text-stone-500">{t.normalRange || 'N/A'}</td>
                            <td className="py-2.5 px-3 text-stone-600">{t.testDate}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                t.interpretation === 'Critical' ? 'bg-rose-100 text-rose-800' :
                                t.interpretation === 'Elevated' ? 'bg-amber-100 text-amber-800' :
                                t.interpretation === 'Low' ? 'bg-blue-100 text-blue-800' :
                                'bg-emerald-100 text-emerald-800'
                              }`}>
                                {t.interpretation || 'Reported'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Full Verbatim Narrative */}
              <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-3">
                  <h3 className="font-serif font-bold text-base text-stone-900">
                    Source Verbatim Report Narrative
                  </h3>
                  <span className="font-mono text-xs text-stone-500 uppercase">
                    E2B Section B.5.1
                  </span>
                </div>
                <blockquote className="p-4 rounded-lg bg-stone-50 border-l-4 border-[#0B1325] text-xs sm:text-sm text-stone-800 leading-relaxed font-sans">
                  {pvCase.verbatimNarrative}
                </blockquote>
              </div>
            </div>
          )}

          {/* TAB 2: REFERENCE KEY & RUBRIC (STAFF ONLY) */}
          {activeTab === 'reference' && pvCase.referenceKey && (
            <div className="space-y-6">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-xs text-purple-900 font-sans">
                <strong>Faculty & Mentor Reference Key:</strong> These expected determinations and rubric definitions are strictly partitioned from student-facing queries. They serve as the benchmark for the AI Assessment Engine and mentor review evaluations.
              </div>

              {/* Expected MedDRA Terms */}
              <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm">
                <h4 className="font-serif font-bold text-base text-stone-900 mb-3 border-b border-stone-200 pb-2">
                  Expected MedDRA Coding (Gold Standard)
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="border-b border-stone-200 font-mono text-[10px] uppercase text-stone-400 bg-stone-50">
                        <th className="py-2 px-3">Reported Verbatim</th>
                        <th className="py-2 px-3">Expected MedDRA PT</th>
                        <th className="py-2 px-3">Expected System Organ Class (SOC)</th>
                        <th className="py-2 px-3">Clinical Justification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {pvCase.referenceKey.expectedMeddraTerms.map((m, i) => (
                        <tr key={i}>
                          <td className="py-2.5 px-3 font-medium text-stone-800">"{m.verbatim}"</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#1B3F8B]">{m.pt}</td>
                          <td className="py-2.5 px-3 font-mono text-stone-600">{m.soc}</td>
                          <td className="py-2.5 px-3 text-stone-600">{m.rationale}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Expected Causality & Naranjo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm">
                  <h4 className="font-serif font-bold text-base text-stone-900 mb-2 border-b border-stone-200 pb-2">
                    Expected Causality Assessment
                  </h4>
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="font-mono text-stone-500 uppercase">WHO-UMC Classification:</span>
                      <span className="ml-2 font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {pvCase.referenceKey.expectedCausalityWho}
                      </span>
                    </div>
                    <div>
                      <span className="font-mono text-stone-500 uppercase">Naranjo Total Score:</span>
                      <span className="ml-2 font-mono font-bold text-stone-900 text-sm">
                        {pvCase.referenceKey.expectedNaranjoScore} / 10
                      </span>
                      <span className="ml-2 text-stone-500 font-sans">
                        ({pvCase.referenceKey.expectedNaranjoScore >= 9 ? 'Definite' : pvCase.referenceKey.expectedNaranjoScore >= 5 ? 'Probable' : 'Possible'})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm">
                  <h4 className="font-serif font-bold text-base text-stone-900 mb-2 border-b border-stone-200 pb-2">
                    Expected Seriousness Determination
                  </h4>
                  <div className="text-xs space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-stone-500 uppercase">Serious ICSR:</span>
                      <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {pvCase.referenceKey.expectedSeriousness.isSerious ? 'YES (SERIOUS)' : 'NO'}
                      </span>
                    </div>
                    <div>
                      <span className="font-mono text-stone-500 uppercase">Applicable Criteria:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {pvCase.referenceKey.expectedSeriousness.criteria.map((c, i) => (
                          <span key={i} className="font-mono text-[10px] uppercase bg-stone-100 text-stone-800 px-2 py-0.5 rounded border border-stone-200">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Model CIOMS Narrative */}
              <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm">
                <h4 className="font-serif font-bold text-base text-stone-900 mb-2 border-b border-stone-200 pb-2">
                  Gold-Standard Model CIOMS-I Narrative
                </h4>
                <div className="p-4 rounded-md bg-stone-50 border border-stone-200 font-sans text-xs sm:text-sm text-stone-800 leading-relaxed whitespace-pre-line">
                  {pvCase.referenceKey.modelCiomsNarrative}
                </div>
              </div>

              {/* Grading Rubric Points */}
              <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm">
                <h4 className="font-serif font-bold text-base text-stone-900 mb-3 border-b border-stone-200 pb-2">
                  Grading Rubric Breakdown & Weighting (100 Total Points)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 font-mono text-xs">
                  <div className="p-2.5 rounded bg-blue-50 border border-blue-200 text-blue-900">
                    <div>MedDRA Coding</div>
                    <div className="font-bold text-lg">{pvCase.referenceKey.gradingRubric.meddraWeight}%</div>
                  </div>
                  <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-900">
                    <div>Seriousness</div>
                    <div className="font-bold text-lg">{pvCase.referenceKey.gradingRubric.seriousnessWeight}%</div>
                  </div>
                  <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900">
                    <div>Causality</div>
                    <div className="font-bold text-lg">{pvCase.referenceKey.gradingRubric.causalityWeight}%</div>
                  </div>
                  <div className="p-2.5 rounded bg-purple-50 border border-purple-200 text-purple-900">
                    <div>CIOMS Narrative</div>
                    <div className="font-bold text-lg">{pvCase.referenceKey.gradingRubric.narrativeWeight}%</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {pvCase.referenceKey.gradingRubric.rubricPoints?.map((pt, i) => (
                    <div key={i} className="text-xs p-2 rounded border border-stone-100 bg-stone-50/50 flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-stone-200 text-stone-700">
                          {pt.category}
                        </span>
                        <span className="text-stone-800 font-sans">{pt.criterion}</span>
                      </div>
                      <span className="font-mono font-bold text-stone-900 text-xs">
                        {pt.maxPoints} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VERSION HISTORY (STAFF ONLY) */}
          {activeTab === 'versions' && (
            <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm space-y-4">
              <h4 className="font-serif font-bold text-base text-stone-900 border-b border-stone-200 pb-2">
                Version Control & Audit Trail
              </h4>
              <div className="space-y-3">
                {versions.map(v => (
                  <div key={v.id} className="p-3.5 rounded border border-stone-200 bg-stone-50 flex items-start justify-between text-xs">
                    <div>
                      <div className="font-mono font-bold text-stone-900">
                        Version {v.versionNumber}.0
                      </div>
                      <div className="text-stone-700 font-sans mt-0.5">
                        {v.changelog}
                      </div>
                      <div className="font-mono text-[10px] text-stone-400 mt-1">
                        Committed by: {v.authorName || v.createdBy} · {v.createdAt}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-stone-200 text-stone-700">
                      Approved Snapshot
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-200 bg-[#FAF9F6] flex justify-between items-center text-xs font-mono">
          <span className="text-stone-500">
            Case ID: <span className="font-bold text-stone-800">{pvCase.id}</span>
          </span>
          <button
            onClick={onClose}
            className="border border-stone-300 bg-white hover:bg-stone-100 text-stone-800 px-4 py-2 rounded font-bold uppercase tracking-wider transition-colors"
          >
            Close Dossier
          </button>
        </div>

      </div>
    </div>
  );
};
