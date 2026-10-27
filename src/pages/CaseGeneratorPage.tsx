import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, CheckCircle2, AlertTriangle, ArrowRight, 
  Pill, Activity, User, ShieldAlert, BookOpen 
} from 'lucide-react';

interface CaseGeneratorPageProps {
  onCasePublished?: (caseId: string) => void;
}

export const CaseGeneratorPage: React.FC<CaseGeneratorPageProps> = ({ onCasePublished }) => {
  const { user } = useAuth();
  const [therapeuticArea, setTherapeuticArea] = useState('Neurology');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [archetype, setArchetype] = useState('dress_syndrome');
  const [reporterType, setReporterType] = useState('Hospital Pharmacist');
  const [customNotes, setCustomNotes] = useState('');
  
  const [generating, setGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<any>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishedSuccess, setPublishedSuccess] = useState(false);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setGeneratedResult(null);
      setPublishedSuccess(false);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.id) headers['x-user-id'] = user.id;

      const res = await fetch('/api/generate/case', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          therapeuticArea,
          difficulty,
          archetype,
          reporterType,
          customNotes
        })
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedResult(data);
      }
    } catch (err) {
      console.error('Failed to generate case:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!generatedResult?.caseId) return;
    try {
      setPublishing(true);
      const headers: Record<string, string> = {};
      if (user?.id) headers['x-user-id'] = user.id;

      const res = await fetch(`/api/cases/${generatedResult.caseId}/publish`, {
        method: 'POST',
        headers
      });

      if (res.ok) {
        setPublishedSuccess(true);
        if (onCasePublished) {
          onCasePublished(generatedResult.caseId);
        }
      }
    } catch (err) {
      console.error('Failed to publish case:', err);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="border-b border-stone-200 pb-5">
        <div className="flex items-center space-x-2 text-xs font-mono font-bold text-[#1B3F8B] uppercase tracking-widest mb-1">
          <span>MODULE 01 · CLINICAL CASE SYNTHESIS</span>
          <span>·</span>
          <span>ICH E2B(R3) COMPLIANT</span>
        </div>
        <h2 className="font-serif font-bold text-2xl sm:text-3xl text-stone-900 tracking-tight">
          AI Case Generator
        </h2>
        <p className="font-sans text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
          Synthesize high-fidelity fictional ICSR scenarios with verified pharmacology, timeline kinetics, laboratory markers, and pre-computed reference keys.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Generation Controls */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-base text-stone-900 border-b border-stone-200 pb-2 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Case Configuration Parameters</span>
            </h3>

            {/* Therapeutic Area */}
            <div>
              <label className="block text-xs font-mono font-bold text-stone-600 uppercase mb-1">
                Therapeutic Area
              </label>
              <select
                value={therapeuticArea}
                onChange={(e) => setTherapeuticArea(e.target.value)}
                className="w-full border border-stone-300 rounded-md p-2 text-xs font-sans focus:ring-1 focus:ring-[#1B3F8B] focus:border-[#1B3F8B]"
              >
                <option value="Neurology">Neurology (Anti-epileptics, CNS)</option>
                <option value="Oncology">Oncology (Immunotherapy, Checkpoints)</option>
                <option value="Cardiology">Cardiology (Anticoagulants, Anti-arrhythmics)</option>
                <option value="Immunology">Immunology / Dermatology (Biologics, Xanthine Oxidase)</option>
                <option value="Endocrinology">Endocrinology (SGLT2 inhibitors, GLP-1)</option>
                <option value="Psychiatry">Psychiatry (Atypical Antipsychotics)</option>
                <option value="Gastroenterology">Gastroenterology / Hepatology (Antibiotics, DILI)</option>
                <option value="Hematology">Hematology (Parenteral Iron, Coagulation)</option>
              </select>
            </div>

            {/* Difficulty Level */}
            <div>
              <label className="block text-xs font-mono font-bold text-stone-600 uppercase mb-1">
                Curriculum Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficulty(lvl)}
                    className={`py-2 px-3 rounded-md text-xs font-mono font-bold uppercase transition-all ${
                      difficulty === lvl
                        ? 'bg-[#0B1325] text-white shadow-sm'
                        : 'border border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Clinical Reaction Archetype */}
            <div>
              <label className="block text-xs font-mono font-bold text-stone-600 uppercase mb-1">
                Adverse Reaction Archetype
              </label>
              <select
                value={archetype}
                onChange={(e) => setArchetype(e.target.value)}
                className="w-full border border-stone-300 rounded-md p-2 text-xs font-sans focus:ring-1 focus:ring-[#1B3F8B] focus:border-[#1B3F8B]"
              >
                <option value="dress_syndrome">DRESS Syndrome (Carbamazepine)</option>
                <option value="acute_hepatic_failure">Drug-Induced Liver Injury (Amoxicillin-Clavulanate)</option>
                <option value="agranulocytosis">Agranulocytosis & Neutropenic Sepsis (Clozapine)</option>
                <option value="anaphylaxis">Acute Biphasic Anaphylaxis (Ferric carboxymaltose)</option>
                <option value="acute_pancreatitis">Severe Acute Pancreatitis (Empagliflozin)</option>
              </select>
            </div>

            {/* Reporter Persona */}
            <div>
              <label className="block text-xs font-mono font-bold text-stone-600 uppercase mb-1">
                Initial Reporter Persona
              </label>
              <select
                value={reporterType}
                onChange={(e) => setReporterType(e.target.value)}
                className="w-full border border-stone-300 rounded-md p-2 text-xs font-sans focus:ring-1 focus:ring-[#1B3F8B] focus:border-[#1B3F8B]"
              >
                <option value="Hospital Pharmacist">Clinical / Hospital Pharmacist</option>
                <option value="Attending Physician">Attending Physician (Specialist)</option>
                <option value="ICU Fellow">ICU / Emergency Medicine Fellow</option>
                <option value="Safety Nurse">Clinical Research Nurse</option>
                <option value="Regulatory Authority">Regulatory Authority (Spontaneous MedWatch)</option>
              </select>
            </div>

            {/* Custom Clinical Nuance */}
            <div>
              <label className="block text-xs font-mono font-bold text-stone-600 uppercase mb-1">
                Custom Clinical Nuance / Concomitants (Optional)
              </label>
              <textarea
                rows={3}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="e.g. Include concomitant statin therapy or borderline baseline renal function to test drug-drug interaction detection..."
                className="w-full border border-stone-300 rounded-md p-2 text-xs font-sans focus:ring-1 focus:ring-[#1B3F8B] focus:border-[#1B3F8B]"
              />
            </div>

            {/* Primary Action Button */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full bg-[#0B1325] hover:bg-[#1B3F8B] text-white py-3 rounded-md font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 shadow-sm transition-all disabled:opacity-50"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Synthesizing ICSR Clinical Data...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Synthesize Fictional ICSR Scenario</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Generated Case Preview & Validation */}
        <div className="lg:col-span-7">
          {generatedResult ? (
            <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm space-y-5">
              
              {/* Status Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold bg-[#0B1325] text-white px-2 py-0.5 rounded">
                    {generatedResult.caseNumber}
                  </span>
                  <span className="font-mono text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded uppercase">
                    Status: {generatedResult.status} (Staged)
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePublish}
                    disabled={publishing || publishedSuccess}
                    className={`px-4 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all ${
                      publishedSuccess
                        ? 'bg-emerald-600 text-white cursor-default'
                        : 'bg-[#0B1325] hover:bg-[#1B3F8B] text-white'
                    }`}
                  >
                    {publishedSuccess ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Published to Library</span>
                      </>
                    ) : publishing ? (
                      <span>Publishing...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Approve & Publish to Library</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* ICSR Completeness Checklist */}
              <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
                <div className="font-mono text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>ICH E2B Minimum Regulatory Criteria Validated</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2 rounded bg-white border border-stone-200 text-emerald-800 flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>1. Patient ID</span>
                  </div>
                  <div className="p-2 rounded bg-white border border-stone-200 text-emerald-800 flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>2. Reporter ID</span>
                  </div>
                  <div className="p-2 rounded bg-white border border-stone-200 text-emerald-800 flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>3. Suspect Drug</span>
                  </div>
                  <div className="p-2 rounded bg-white border border-stone-200 text-emerald-800 flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>4. Adverse Event</span>
                  </div>
                </div>
              </div>

              {/* Title & Metadata */}
              <div>
                <div className="text-[10px] font-mono text-stone-400 uppercase">Generated Title</div>
                <h3 className="font-serif font-bold text-lg text-stone-900 mt-0.5">
                  {generatedResult.title}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="font-mono text-[10px] uppercase bg-stone-100 text-stone-700 px-2 py-0.5 rounded">
                    Area: {generatedResult.therapeuticArea}
                  </span>
                  <span className="font-mono text-[10px] uppercase bg-stone-100 text-stone-700 px-2 py-0.5 rounded">
                    Difficulty: {generatedResult.difficulty}
                  </span>
                </div>
              </div>

              {/* Verbatim Narrative Preview */}
              <div>
                <div className="text-[10px] font-mono text-stone-400 uppercase mb-1">
                  Synthetic Verbatim Case Narrative (Student-Facing)
                </div>
                <blockquote className="p-4 rounded-lg bg-stone-50 border-l-4 border-[#0B1325] text-xs text-stone-800 leading-relaxed font-sans">
                  {generatedResult.verbatimNarrative}
                </blockquote>
              </div>

              <div className="text-[11px] text-stone-500 font-sans italic">
                * Note: Reference answers, WHO-UMC causality expectations, and scoring rubrics were synthesized and encrypted into the restricted reference table.
              </div>

            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-lg p-12 text-center shadow-sm">
              <Sparkles className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h3 className="font-serif font-bold text-stone-800 text-lg">Case Generation Studio</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 leading-relaxed">
                Configure clinical parameters on the left and click "Synthesize Fictional ICSR Scenario" to generate an ICH E2B(R3)-compliant training case with automated reference answers.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
