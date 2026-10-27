import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FileUp, CheckCircle, AlertTriangle, FileText, 
  ArrowRight, ShieldCheck, Pill, Activity, Sparkles 
} from 'lucide-react';

interface PdfImporterPageProps {
  onCaseSaved?: (caseId: string) => void;
}

export const PdfImporterPage: React.FC<PdfImporterPageProps> = ({ onCaseSaved }) => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Extracted staging data
  const [extractedData, setExtractedData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form editable states
  const [title, setTitle] = useState('');
  const [therapeuticArea, setTherapeuticArea] = useState('Cardiology');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [patientInitials, setPatientInitials] = useState('');
  const [patientAge, setPatientAge] = useState(56);
  const [patientGender, setPatientGender] = useState<'Male' | 'Female' | 'Other' | 'Unknown'>('Male');
  const [patientWeightKg, setPatientWeightKg] = useState(70);
  const [suspectDrugName, setSuspectDrugName] = useState('');
  const [suspectDrugInn, setSuspectDrugInn] = useState('');
  const [suspectDose, setSuspectDose] = useState('');
  const [indication, setIndication] = useState('');
  const [adverseEventVerbatim, setAdverseEventVerbatim] = useState('');
  const [verbatimNarrative, setVerbatimNarrative] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUploadAndExtract = async () => {
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      setExtractedData(null);
      setSavedSuccess(false);

      const formData = new FormData();
      formData.append('file', file);

      const headers: Record<string, string> = {};
      if (user?.id) headers['x-user-id'] = user.id;

      const res = await fetch('/api/import/pdf', {
        method: 'POST',
        headers,
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to parse PDF');
      }

      const data = await res.json();
      const ext = data.extracted;
      setExtractedData(ext);

      // Populate editable fields
      setTitle(ext.title || 'Extracted ICSR Safety Case');
      setTherapeuticArea(ext.therapeuticArea || 'Cardiology');
      setPatientInitials(ext.patientInitials || 'P.T.');
      setPatientAge(ext.patientAge || 56);
      setPatientGender(ext.patientGender || 'Male');
      setPatientWeightKg(ext.patientWeightKg || 70);
      setSuspectDrugName(ext.suspectDrug?.name || 'Suspect Drug');
      setSuspectDrugInn(ext.suspectDrug?.inn || 'Active Ingredient');
      setSuspectDose(ext.suspectDrug?.dose || 'Standard therapeutic dose');
      setIndication(ext.suspectDrug?.indication || 'Primary indication');
      setAdverseEventVerbatim(ext.adverseEvent?.verbatim || 'Reported adverse event');
      setVerbatimNarrative(ext.rawTextPreview || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSamplePdfCase = () => {
    // Allows instant testing of extraction pipeline without needing an external PDF
    const sampleText = `
CLINICAL SAFETY REPORT & PHARMACOVIGILANCE DOSSIER
CASE REFERENCE: MEDWATCH-2026-CARD-883
Patient Initials: J.M.
Age: 64 years old
Gender: Female
Weight: 68 kg
Medical History: Hypertension, Dyslipidemia, Mild Renal Insufficiency.

Suspect Drug: Eliquis (Apixaban) 5 mg BID initiated on 2026-06-10 for Non-valvular Atrial Fibrillation.
Concomitant Drug: Fluconazole 200 mg daily prescribed on 2026-06-25 for esophageal candidiasis.

Adverse Event Narrative:
On 2026-06-29, the patient presented with spontaneous gross hematuria and extensive ecchymoses over both upper extremities following co-administration of Fluconazole and Apixaban. Hemoglobin decreased from 13.2 g/dL to 8.4 g/dL. Patient was hospitalized for severe bleeding and hemodynamic monitoring. Apixaban was discontinued with positive dechallenge. Bleeding resolved following supportive red blood cell transfusions. The clinical team assessed the event as life-threatening coagulopathy precipitated by azole inhibition of CYP3A4 and P-glycoprotein.
    `;

    const blob = new Blob([sampleText], { type: 'application/pdf' });
    const sampleFile = new File([blob], 'Apixaban_Bleeding_Case_Study.pdf', { type: 'application/pdf' });
    setFile(sampleFile);
  };

  const handleVerifyAndSave = async () => {
    try {
      setSaving(true);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.id) headers['x-user-id'] = user.id;

      const payload = {
        title,
        therapeuticArea,
        difficulty,
        patientInitials,
        patientAge,
        patientGender,
        patientWeightKg,
        medicalHistory: 'Extracted from source clinical document.',
        suspectDrugs: [
          {
            name: suspectDrugName,
            inn: suspectDrugInn,
            role: 'Suspect',
            dose: suspectDose,
            route: 'Oral',
            frequency: 'Standard',
            startDate: '2026-06-10',
            indication,
            actionTaken: 'Drug Withdrawn',
            dechallenge: 'Positive',
            rechallenge: 'Not Done'
          }
        ],
        concomitantDrugs: [],
        adverseEvents: [
          {
            verbatim: adverseEventVerbatim,
            meddraPt: 'Haematuria',
            meddraSoc: 'Renal and urinary disorders',
            onsetDate: '2026-06-29',
            outcome: 'Recovering/Resolving',
            seriousness: {
              isSerious: true,
              criteria: {
                death: false,
                lifeThreatening: true,
                hospitalization: true,
                disability: false,
                congenitalAnomaly: false,
                otherMedicallyImportant: false
              }
            }
          }
        ],
        labTests: extractedData?.labs || [],
        verbatimNarrative,
        reporterType: 'Clinical Case Report',
        sourceFilename: file?.name || 'Imported PDF',
        referenceKey: {
          expectedMeddraTerms: [
            { verbatim: adverseEventVerbatim, pt: 'Haematuria', soc: 'Renal and urinary disorders' }
          ],
          expectedSeriousness: {
            isSerious: true,
            criteria: ['hospitalization', 'life_threatening'],
            justification: 'Severe hemorrhagic event requiring hospitalization and blood transfusion.'
          },
          expectedCausalityWho: 'Probable',
          expectedNaranjoScore: 6,
          expectedNaranjoBreakdown: {
            q1_previous_conclusive_reports: 1,
            q2_adverse_event_after_drug: 2,
            q3_adverse_event_improved_dechallenge: 1,
            q4_rechallenge_adverse_event: 0,
            q5_alternative_causes: 1,
            q6_placebo_reaction: 0,
            q7_drug_detected_body: 0,
            q8_dose_relationship: 0,
            q9_similar_reaction_in_past: 0,
            q10_objective_evidence_confirmed: 1
          },
          modelCiomsNarrative: verbatimNarrative
        }
      };

      const res = await fetch('/api/import/verify-and-save', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setSavedSuccess(true);
        if (onCaseSaved) {
          onCaseSaved(data.caseId);
        }
      }
    } catch (err) {
      console.error('Failed to save verified case:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="border-b border-stone-200 pb-5">
        <div className="flex items-center space-x-2 text-xs font-mono font-bold text-[#1B3F8B] uppercase tracking-widest mb-1">
          <span>MODULE 02 · SOURCE DOCUMENT INGESTION</span>
          <span>·</span>
          <span>HUMAN-IN-THE-LOOP VERIFICATION</span>
        </div>
        <h2 className="font-serif font-bold text-2xl sm:text-3xl text-stone-900 tracking-tight">
          PDF Case Importer
        </h2>
        <p className="font-sans text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
          Upload PDF case studies, CIOMS-I reports, or medical literature. The ingestion engine parses clinical entities and stages them for human administrative verification prior to publication.
        </p>
      </div>

      {/* Upload Box */}
      <div className="bg-white border-2 border-dashed border-stone-300 rounded-lg p-6 text-center hover:border-stone-400 transition-colors">
        <FileUp className="w-10 h-10 text-stone-400 mx-auto mb-2" />
        <h3 className="font-serif font-bold text-base text-stone-800">
          Upload Pharmacovigilance Case PDF
        </h3>
        <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
          Select a medical journal case report, CIOMS-I form, or hospital safety summary.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            id="pdf-upload-input"
            className="hidden"
          />
          <label
            htmlFor="pdf-upload-input"
            className="cursor-pointer bg-[#0B1325] hover:bg-[#1B3F8B] text-white px-4 py-2 rounded-md font-mono text-xs font-bold uppercase tracking-wider transition-all"
          >
            Choose PDF File
          </label>

          <button
            type="button"
            onClick={handleLoadSamplePdfCase}
            className="border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-700 px-3 py-2 rounded-md font-mono text-xs font-semibold uppercase tracking-wider transition-all"
          >
            Load Sample Case Study
          </button>
        </div>

        {file && (
          <div className="mt-4 inline-flex items-center space-x-2 text-xs font-mono bg-stone-100 px-3 py-1.5 rounded border border-stone-200">
            <span className="font-bold text-stone-800">{file.name}</span>
            <span className="text-stone-500">({(file.size / 1024).toFixed(1)} KB)</span>
            <button
              onClick={handleUploadAndExtract}
              disabled={loading}
              className="ml-3 bg-[#1B3F8B] hover:bg-blue-800 text-white px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {loading ? 'Extracting...' : 'Parse & Stage Entities'}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-3 text-xs text-rose-700 font-mono">
            {error}
          </div>
        )}
      </div>

      {/* Human-in-the-Loop Verification Staging View */}
      {extractedData && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 flex items-center justify-between text-xs text-emerald-900 font-mono">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              <span className="font-bold uppercase tracking-wider">
                Entities Extracted · Review and verify fields before saving to Case Library
              </span>
            </div>
            <span>Source: {extractedData.sourceFilename}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Pane: Raw Document Preview & Provenance */}
            <div className="lg:col-span-5 bg-white border border-stone-200 rounded-lg p-5 shadow-sm space-y-3">
              <h4 className="font-serif font-bold text-base text-stone-900 border-b border-stone-200 pb-2 flex items-center justify-between">
                <span>Source Document Text</span>
                <span className="font-mono text-[10px] text-stone-400 uppercase">Provenance</span>
              </h4>
              <div className="h-[460px] overflow-y-auto p-3 rounded bg-stone-50 border border-stone-200 font-mono text-[11px] text-stone-700 leading-relaxed whitespace-pre-wrap">
                {extractedData.rawTextPreview}
              </div>
            </div>

            {/* Right Pane: Editable Structured Fields */}
            <div className="lg:col-span-7 bg-white border border-stone-200 rounded-lg p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <h4 className="font-serif font-bold text-base text-stone-900">
                  Administrative Verification Form
                </h4>
                <button
                  onClick={handleVerifyAndSave}
                  disabled={saving || savedSuccess}
                  className={`px-4 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all ${
                    savedSuccess
                      ? 'bg-emerald-600 text-white cursor-default'
                      : 'bg-[#0B1325] hover:bg-[#1B3F8B] text-white'
                  }`}
                >
                  {savedSuccess ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Verified & Saved to Library</span>
                    </>
                  ) : saving ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Verify & Publish to Library</span>
                    </>
                  )}
                </button>
              </div>

              {/* Case Title */}
              <div>
                <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase mb-1">Case Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-stone-300 rounded p-2 text-xs font-sans"
                />
              </div>

              {/* Area & Difficulty */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase mb-1">Therapeutic Area</label>
                  <select
                    value={therapeuticArea}
                    onChange={(e) => setTherapeuticArea(e.target.value)}
                    className="w-full border border-stone-300 rounded p-1.5 text-xs font-sans"
                  >
                    <option value="Cardiology">Cardiology</option>
                    <option value="Oncology">Oncology</option>
                    <option value="Immunology">Immunology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Gastroenterology">Gastroenterology</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full border border-stone-300 rounded p-1.5 text-xs font-sans"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              {/* Patient Demographics */}
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase mb-1">Initials</label>
                  <input
                    type="text"
                    value={patientInitials}
                    onChange={(e) => setPatientInitials(e.target.value)}
                    className="w-full border border-stone-300 rounded p-1.5 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase mb-1">Age</label>
                  <input
                    type="number"
                    value={patientAge}
                    onChange={(e) => setPatientAge(Number(e.target.value))}
                    className="w-full border border-stone-300 rounded p-1.5 text-xs font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase mb-1">Gender</label>
                  <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value as any)}
                    className="w-full border border-stone-300 rounded p-1.5 text-xs font-sans"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={patientWeightKg}
                    onChange={(e) => setPatientWeightKg(Number(e.target.value))}
                    className="w-full border border-stone-300 rounded p-1.5 text-xs font-sans"
                  />
                </div>
              </div>

              {/* Suspect Drug */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-200">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase mb-1">Brand Name</label>
                  <input
                    type="text"
                    value={suspectDrugName}
                    onChange={(e) => setSuspectDrugName(e.target.value)}
                    className="w-full border border-stone-300 rounded p-1.5 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase mb-1">Active Substance (INN)</label>
                  <input
                    type="text"
                    value={suspectDrugInn}
                    onChange={(e) => setSuspectDrugInn(e.target.value)}
                    className="w-full border border-stone-300 rounded p-1.5 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Adverse Event Verbatim */}
              <div>
                <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase mb-1">Reported Adverse Event Verbatim</label>
                <input
                  type="text"
                  value={adverseEventVerbatim}
                  onChange={(e) => setAdverseEventVerbatim(e.target.value)}
                  className="w-full border border-stone-300 rounded p-2 text-xs font-semibold text-rose-900 bg-rose-50/50"
                />
              </div>

              {/* Verbatim Narrative */}
              <div>
                <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase mb-1">Clinical Case Narrative</label>
                <textarea
                  rows={4}
                  value={verbatimNarrative}
                  onChange={(e) => setVerbatimNarrative(e.target.value)}
                  className="w-full border border-stone-300 rounded p-2 text-xs font-sans leading-relaxed"
                />
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
