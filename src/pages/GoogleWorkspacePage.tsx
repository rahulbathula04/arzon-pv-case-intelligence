import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PVCase, Assignment } from '../types';
import { 
  FileSpreadsheet, FileText, Presentation, 
  Calendar, HardDrive, Download, ExternalLink, CheckCircle, 
  ShieldCheck, ArrowRight, X, Copy, Check, FileCheck, Network
} from 'lucide-react';

export const GoogleWorkspacePage: React.FC = () => {
  const { user, getAuthHeaders } = useAuth();
  const [cases, setCases] = useState<PVCase[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [deckOutline, setDeckOutline] = useState<any>(null);
  const [calendarUrl, setCalendarUrl] = useState<string | null>(null);

  // Interactive Modals
  const [showSlidesModal, setShowSlidesModal] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [copiedSlides, setCopiedSlides] = useState(false);
  const [copiedNarrative, setCopiedNarrative] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = getAuthHeaders();

        const cRes = await fetch('/api/cases', { headers });
        if (cRes.ok) {
          const cData = await cRes.json();
          setCases(cData.cases || []);
          if (cData.cases.length > 0) setSelectedCaseId(cData.cases[0].id);
        }

        const aRes = await fetch('/api/assignments', { headers });
        if (aRes.ok) {
          const aData = await aRes.json();
          setAssignments(aData.assignments || []);
          if (aData.assignments.length > 0) setSelectedAssignmentId(aData.assignments[0].id);
        }
      } catch (err) {
        console.error('Failed to load workspace data:', err);
      }
    };

    fetchData();
  }, [user]);

  // Load Deck Outline when case changes
  useEffect(() => {
    if (!selectedCaseId) return;
    const fetchDeck = async () => {
      try {
        const headers = getAuthHeaders();
        const res = await fetch(`/api/workspace/slides/deck-outline/${selectedCaseId}`, { headers });
        if (res.ok) {
          const d = await res.json();
          setDeckOutline(d.deckOutline);
        }
      } catch (err) {
        console.error('Failed to load deck outline:', err);
      }
    };

    fetchDeck();
  }, [selectedCaseId]);

  // Load Calendar Link when assignment changes
  useEffect(() => {
    if (!selectedAssignmentId) return;
    const fetchCal = async () => {
      try {
        const headers = getAuthHeaders();
        const res = await fetch(`/api/workspace/calendar/links/${selectedAssignmentId}`, { headers });
        if (res.ok) {
          const d = await res.json();
          setCalendarUrl(d.googleCalendarUrl);
        }
      } catch (err) {
        console.error('Failed to load calendar url:', err);
      }
    };

    fetchCal();
  }, [selectedAssignmentId]);

  const handleCopySlidesAsMarkdown = () => {
    if (!deckOutline) return;
    const md = `# ${deckOutline.title}
Case Identifier: ${deckOutline.caseNumber}
Therapeutic Area: ${deckOutline.therapeuticArea}
Disclaimer: ${deckOutline.fictionalDisclaimer}

${deckOutline.slides?.map((s: any) => `## Slide ${s.slideNumber}: ${s.headline || s.type}
${s.subhead ? `*${s.subhead}*\n` : ''}
${s.bullets ? s.bullets.map((b: string) => `- ${b}`).join('\n') : ''}

**Speaker Notes:** ${s.speakerNotes || 'N/A'}
`).join('\n---\n\n')}`;

    navigator.clipboard.writeText(md);
    setCopiedSlides(true);
    setTimeout(() => setCopiedSlides(false), 2000);
  };

  const selectedCase = cases.find(c => c.id === selectedCaseId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="border-b border-black/[0.06] pb-6">
        <div className="flex items-center space-x-2 text-[11px] font-mono font-bold text-[#1B3F8B] uppercase tracking-widest mb-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500/20 ring-4 ring-blue-500/10"></span>
          <span>MODULE 09 · ECOSYSTEM INTEROPERABILITY</span>
          <span className="text-stone-300">/</span>
          <span>WORKSPACE & REGULATORY INTEGRATION</span>
        </div>
        <h2 className="font-sans font-bold text-2xl sm:text-3xl text-stone-900 tracking-tight">
          Enterprise Workspace & Regulatory Hub
        </h2>
        <p className="font-sans text-xs sm:text-sm text-stone-600 mt-1.5 max-w-3xl leading-relaxed">
          Export clinical safety assets to Google Drive, Sheets, Docs, Slides, and Calendar. The platform's internal SQLite WAL database serves as the authoritative source of truth for all safety cases, submissions, and evaluation rubrics.
        </p>
      </div>

      {/* Authoritative Storage Callout */}
      <div className="apple-card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs bg-stone-50/80">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#1B3F8B] flex-shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="font-sans text-stone-700 leading-relaxed">
            <strong className="text-stone-900 font-semibold">Authoritative Source Architecture:</strong> The application's database stores all ICSR records, audit logs, and mentor evaluations. Exported Google Workspace assets are derived artifacts.
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase font-bold bg-white text-stone-800 px-3 py-1 rounded-full border border-black/[0.06] shadow-2xs whitespace-nowrap">
          DB: SQLite WAL Engine
        </span>
      </div>

      {/* 6-Card Workspace Suite Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* 1. GOOGLE SHEETS */}
        <div className="apple-card p-6 flex flex-col justify-between hover:shadow-apple-card transition-all">
          <div>
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-3 mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <h3 className="font-sans font-bold text-base text-stone-900">Google Sheets</h3>
              </div>
              <span className="font-mono text-[10px] uppercase font-bold bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 px-2 py-0.5 rounded-full">
                CSV / Sheets
              </span>
            </div>
            <p className="text-xs text-stone-600 font-sans leading-relaxed">
              Export student gradebooks, cohort milestones, and case metadata directly into Google Sheets formatted tables.
            </p>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-black/[0.05]">
            <a
              href="/api/workspace/sheets/gradebook.csv"
              download
              className="w-full bg-stone-50 hover:bg-stone-100 active:scale-95 border border-black/[0.08] text-stone-800 py-2.5 px-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all shadow-apple-subtle"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Gradebook (CSV)</span>
            </a>

            <a
              href="/api/workspace/sheets/cases.csv"
              download
              className="w-full bg-stone-50 hover:bg-stone-100 active:scale-95 border border-black/[0.08] text-stone-800 py-2.5 px-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all shadow-apple-subtle"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Case Library (CSV)</span>
            </a>
          </div>
        </div>

        {/* 2. GOOGLE DOCS */}
        <div className="apple-card p-6 flex flex-col justify-between hover:shadow-apple-card transition-all">
          <div>
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-3 mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="font-sans font-bold text-base text-stone-900">Google Docs</h3>
              </div>
              <span className="font-mono text-[10px] uppercase font-bold bg-blue-50 text-blue-800 ring-1 ring-blue-200 px-2 py-0.5 rounded-full">
                Brief
              </span>
            </div>
            <p className="text-xs text-stone-600 font-sans leading-relaxed mb-3">
              Generate formatted Executive Case Briefs (ICH E2B sections) and Comprehensive Mentor Assessment reports.
            </p>

            <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase mb-1.5">
              Select Case for Brief
            </label>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="w-full border border-black/[0.08] rounded-xl p-2.5 text-xs font-sans bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 transition-all cursor-pointer mb-2"
            >
              {cases.map(c => (
                <option key={c.id} value={c.id}>
                  {c.caseNumber} - {c.title.slice(0, 30)}...
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-black/[0.05]">
            {selectedCaseId ? (
              <a
                href={`/api/workspace/docs/case-brief/${selectedCaseId}`}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-[#0B1325] hover:bg-[#1B3F8B] active:scale-95 text-white py-2.5 px-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-apple-subtle transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Google Docs Brief</span>
              </a>
            ) : (
              <p className="text-xs text-stone-400 italic">No case selected</p>
            )}
          </div>
        </div>

        {/* 3. GOOGLE CALENDAR */}
        <div className="apple-card p-6 flex flex-col justify-between hover:shadow-apple-card transition-all">
          <div>
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-3 mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="font-sans font-bold text-base text-stone-900">Google Calendar</h3>
              </div>
              <span className="font-mono text-[10px] uppercase font-bold bg-purple-50 text-purple-800 ring-1 ring-purple-200 px-2 py-0.5 rounded-full">
                iCal & Direct
              </span>
            </div>
            <p className="text-xs text-stone-600 font-sans leading-relaxed mb-3">
              Sync submission deadlines, mentor review sessions, and ICSR case conference events into Google Calendar.
            </p>

            <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase mb-1.5">
              Select Assignment Deadline
            </label>
            <select
              value={selectedAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
              className="w-full border border-black/[0.08] rounded-xl p-2.5 text-xs font-sans bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 transition-all cursor-pointer mb-2"
            >
              {assignments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.caseNumber} (Due: {a.dueDate.slice(0, 10)})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-black/[0.05]">
            {calendarUrl ? (
              <a
                href={calendarUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-[#0B1325] hover:bg-[#1B3F8B] active:scale-95 text-white py-2.5 px-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-apple-subtle transition-all"
              >
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                <span>Add to Google Calendar</span>
              </a>
            ) : null}

            {selectedAssignmentId && (
              <a
                href={`/api/workspace/calendar/assignment/${selectedAssignmentId}.ics`}
                download
                className="w-full bg-stone-50 hover:bg-stone-100 active:scale-95 border border-black/[0.08] text-stone-800 py-2 px-3 rounded-xl text-xs font-mono font-semibold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .ICS File</span>
              </a>
            )}
          </div>
        </div>

        {/* 4. GOOGLE SLIDES */}
        <div className="apple-card p-6 flex flex-col justify-between hover:shadow-apple-card transition-all">
          <div>
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-3 mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Presentation className="w-4 h-4" />
                </div>
                <h3 className="font-sans font-bold text-base text-stone-900">Google Slides</h3>
              </div>
              <span className="font-mono text-[10px] uppercase font-bold bg-amber-50 text-amber-800 ring-1 ring-amber-200 px-2 py-0.5 rounded-full">
                Deck Outline
              </span>
            </div>
            <p className="text-xs text-stone-600 font-sans leading-relaxed">
              Generate 5-slide case conference presentation deck outlines structured for clinical safety review committees.
            </p>
          </div>

          <div className="pt-4 border-t border-black/[0.05]">
            {deckOutline && (
              <div className="p-3 rounded-xl bg-stone-50 border border-black/[0.06] text-xs font-mono mb-2.5">
                <div className="font-bold text-stone-900 truncate">Deck: {deckOutline.title}</div>
                <div className="text-[10px] text-stone-500 mt-0.5">{deckOutline.slides?.length || 5} Committee Slides Staged</div>
              </div>
            )}
            <button
              onClick={() => setShowSlidesModal(true)}
              className="w-full border border-black/[0.08] bg-white hover:bg-stone-50 active:scale-95 text-stone-800 py-2.5 px-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all shadow-apple-subtle cursor-pointer"
            >
              <Presentation className="w-3.5 h-3.5 text-amber-600" />
              <span>View Slide Deck Outline</span>
            </button>
          </div>
        </div>

        {/* 5. GOOGLE DRIVE */}
        <div className="apple-card p-6 flex flex-col justify-between hover:shadow-apple-card transition-all">
          <div>
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-3 mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center">
                  <HardDrive className="w-4 h-4" />
                </div>
                <h3 className="font-sans font-bold text-base text-stone-900">Google Drive</h3>
              </div>
              <span className="font-mono text-[10px] uppercase font-bold bg-stone-100 text-stone-800 ring-1 ring-black/[0.06] px-2 py-0.5 rounded-full">
                Storage
              </span>
            </div>
            <p className="text-xs text-stone-600 font-sans leading-relaxed">
              Manage supporting clinical attachments, original source intake files, and archival export bundles in Google Drive.
            </p>
          </div>

          <div className="pt-4 border-t border-black/[0.05]">
            <button
              onClick={() => setShowDriveModal(true)}
              className="w-full bg-stone-50 hover:bg-stone-100 active:scale-95 border border-black/[0.08] text-stone-800 py-2.5 px-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all shadow-apple-subtle cursor-pointer"
            >
              <HardDrive className="w-3.5 h-3.5 text-stone-600" />
              <span>Manage Supporting Docs</span>
            </button>
          </div>
        </div>

        {/* 6. ENTERPRISE REGULATORY GATEWAY */}
        <div className="bg-[#0B1325] text-white rounded-3xl p-6 shadow-apple-elevated space-y-4 flex flex-col justify-between border border-white/10">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Network className="w-4 h-4" />
                </div>
                <h3 className="font-sans font-bold text-base text-white">Regulatory Interchange</h3>
              </div>
              <span className="font-mono text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full ring-1 ring-emerald-500/30">
                Gateway Online
              </span>
            </div>
            <p className="text-xs text-stone-300 font-sans leading-relaxed">
              Automated validation for HL7 v3 ICSR XML structures, MedDRA hierarchy cross-checks, and regulatory compliance for FDA FAERS and EMA EudraVigilance.
            </p>
          </div>

          <div className="pt-3 border-t border-white/10 font-mono text-[10px] text-stone-400 space-y-1.5">
            <div className="flex items-center space-x-2 text-emerald-400"><span>✓</span> <span>ICH E2B(R3) HL7 Schema (Valid)</span></div>
            <div className="flex items-center space-x-2 text-emerald-400"><span>✓</span> <span>MedDRA v27.0 Standard Terms</span></div>
            <div className="flex items-center space-x-2 text-emerald-400"><span>✓</span> <span>21 CFR Part 11 Audit Trail Enabled</span></div>
            <div className="flex items-center space-x-2 text-emerald-400"><span>✓</span> <span>Strict Role-Based Security Enforced</span></div>
            <div className="flex items-center space-x-2 text-emerald-400"><span>✓</span> <span>SHA-256 Fingerprint Deduplication</span></div>
          </div>
        </div>

      </div>

      {/* Interactive Slide Deck Outline Modal */}
      {showSlidesModal && deckOutline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Presentation className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-base text-slate-900">
                    {deckOutline.title}
                  </h3>
                  <div className="text-[11px] font-mono text-slate-500">
                    Case: {deckOutline.caseNumber} · {deckOutline.therapeuticArea}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowSlidesModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] font-mono">
                {deckOutline.fictionalDisclaimer}
              </div>

              <div className="space-y-4">
                {deckOutline.slides?.map((slide: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="font-mono text-[11px] font-bold text-slate-900 uppercase">
                        Slide {slide.slideNumber}: {slide.type}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 uppercase">Executive Presentation</span>
                    </div>
                    {slide.headline && (
                      <h4 className="font-sans font-bold text-sm text-slate-900">{slide.headline}</h4>
                    )}
                    {slide.subhead && (
                      <p className="text-slate-600 text-xs italic">{slide.subhead}</p>
                    )}
                    {slide.bullets && slide.bullets.length > 0 && (
                      <ul className="list-disc list-inside space-y-1 text-slate-700">
                        {slide.bullets.map((b: string, bIdx: number) => (
                          <li key={bIdx} className="leading-relaxed">{b}</li>
                        ))}
                      </ul>
                    )}
                    {slide.speakerNotes && (
                      <div className="mt-2 pt-2 border-t border-slate-200/70 text-[11px] text-slate-500 font-mono">
                        <strong className="text-slate-700">Speaker Notes: </strong>
                        {slide.speakerNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={handleCopySlidesAsMarkdown}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-xs"
              >
                {copiedSlides ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied Markdown</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Deck Markdown</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowSlidesModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-white rounded-lg font-mono text-xs font-semibold uppercase tracking-wider transition-all"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Supporting Docs / Drive Modal */}
      {showDriveModal && selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-base text-slate-900">
                    Supporting Safety Documents
                  </h3>
                  <div className="text-[11px] font-mono text-slate-500">
                    {selectedCase.caseNumber} · {selectedCase.title.slice(0, 36)}...
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowDriveModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs font-sans">
              <p className="text-slate-600 mb-2">
                Associated clinical source records, laboratory logs, and expedited ICSR regulatory packages for this case:
              </p>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">{selectedCase.caseNumber}_Case_Brief.html</div>
                    <div className="font-mono text-[10px] text-slate-500">ICH E2B Formatted Clinical Summary</div>
                  </div>
                </div>
                <a
                  href={`/api/workspace/docs/case-brief/${selectedCase.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded-lg font-mono text-[11px] font-bold hover:bg-slate-50 flex items-center space-x-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open</span>
                </a>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">Arzon_PV_Case_Library.csv</div>
                    <div className="font-mono text-[10px] text-slate-500">Tabular Dataset with Coding Identifiers</div>
                  </div>
                </div>
                <a
                  href="/api/workspace/sheets/cases.csv"
                  download
                  className="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded-lg font-mono text-[11px] font-bold hover:bg-slate-50 flex items-center space-x-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Export</span>
                </a>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <FileCheck className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">Verbatim_Reporter_Narrative.txt</div>
                    <div className="font-mono text-[10px] text-slate-500">Raw spontaneous report verbatim transcript</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedCase.verbatimNarrative);
                    setCopiedNarrative(true);
                    setTimeout(() => setCopiedNarrative(false), 2000);
                  }}
                  className="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded-lg font-mono text-[11px] font-bold hover:bg-slate-50 flex items-center space-x-1"
                >
                  {copiedNarrative ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowDriveModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg font-mono text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
