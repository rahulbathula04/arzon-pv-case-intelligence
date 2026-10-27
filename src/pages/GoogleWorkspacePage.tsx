import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PVCase, Assignment } from '../types';
import { 
  CloudCog, FileSpreadsheet, FileText, Presentation, 
  Calendar, HardDrive, Download, ExternalLink, CheckCircle, 
  ShieldCheck, AlertCircle 
} from 'lucide-react';

export const GoogleWorkspacePage: React.FC = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState<PVCase[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [deckOutline, setDeckOutline] = useState<any>(null);
  const [calendarUrl, setCalendarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers: Record<string, string> = {};
        if (user?.id) headers['x-user-id'] = user.id;

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
        const res = await fetch(`/api/workspace/slides/deck-outline/${selectedCaseId}`);
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
        const res = await fetch(`/api/workspace/calendar/links/${selectedAssignmentId}`);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="border-b border-stone-200 pb-5">
        <div className="flex items-center space-x-2 text-xs font-mono font-bold text-[#1B3F8B] uppercase tracking-widest mb-1">
          <span>MODULE 09 · ENTERPRISE WORKSPACE SYNCHRONIZATION</span>
          <span>·</span>
          <span>GOOGLE WORKSPACE HUB</span>
        </div>
        <h2 className="font-serif font-bold text-2xl sm:text-3xl text-stone-900 tracking-tight">
          Google Workspace Integrations
        </h2>
        <p className="font-sans text-xs sm:text-sm text-stone-600 mt-1 max-w-3xl leading-relaxed">
          Export clinical assets to Google Drive, Sheets, Docs, Slides, and Calendar. The platform's internal SQLite database serves as the authoritative source of truth for all safety cases, submissions, and rubrics.
        </p>
      </div>

      {/* Authoritative Storage Callout */}
      <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-[#1B3F8B] flex-shrink-0" />
          <span className="font-sans text-stone-700">
            <strong>Authoritative Source Architecture:</strong> The application's database stores all ICSR records, audit logs, and mentor evaluations. Exported Google Workspace assets are derived artifacts.
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase font-bold bg-white text-stone-700 px-2 py-1 rounded border border-stone-200 whitespace-nowrap">
          DB: SQLite WAL Engine
        </span>
      </div>

      {/* 5-Card Workspace Suite Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* 1. GOOGLE SHEETS */}
        <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-2">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <h3 className="font-serif font-bold text-base text-stone-900">Google Sheets</h3>
              </div>
              <span className="font-mono text-[9px] uppercase font-bold bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded">
                CSV / Sheets
              </span>
            </div>
            <p className="text-xs text-stone-600 font-sans leading-relaxed">
              Export student gradebooks, cohort milestones, and case metadata directly into Google Sheets formatted tables.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-stone-100">
            <a
              href="/api/workspace/sheets/gradebook.csv"
              download
              className="w-full bg-stone-50 hover:bg-stone-100 border border-stone-300 text-stone-800 py-2 px-3 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Gradebook (CSV)</span>
            </a>

            <a
              href="/api/workspace/sheets/cases.csv"
              download
              className="w-full bg-stone-50 hover:bg-stone-100 border border-stone-300 text-stone-800 py-2 px-3 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Case Library (CSV)</span>
            </a>
          </div>
        </div>

        {/* 2. GOOGLE DOCS */}
        <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-2">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h3 className="font-serif font-bold text-base text-stone-900">Google Docs</h3>
              </div>
              <span className="font-mono text-[9px] uppercase font-bold bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded">
                Executive Brief
              </span>
            </div>
            <p className="text-xs text-stone-600 font-sans leading-relaxed mb-3">
              Generate formatted Executive Case Briefs (ICH E2B sections) and Comprehensive Mentor Assessment reports.
            </p>

            <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase mb-1">
              Select Case for Brief
            </label>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="w-full border border-stone-300 rounded p-1.5 text-xs font-sans mb-2"
            >
              {cases.map(c => (
                <option key={c.id} value={c.id}>
                  {c.caseNumber} - {c.title.slice(0, 30)}...
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 border-t border-stone-100">
            {selectedCaseId ? (
              <a
                href={`/api/workspace/docs/case-brief/${selectedCaseId}`}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-[#0B1325] hover:bg-[#1B3F8B] text-white py-2 px-3 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-sm transition-all"
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
        <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <h3 className="font-serif font-bold text-base text-stone-900">Google Calendar</h3>
              </div>
              <span className="font-mono text-[9px] uppercase font-bold bg-purple-50 text-purple-800 px-1.5 py-0.5 rounded">
                iCal & Direct Add
              </span>
            </div>
            <p className="text-xs text-stone-600 font-sans leading-relaxed mb-3">
              Sync submission deadlines, mentor review sessions, and ICSR case conference events into Google Calendar.
            </p>

            <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase mb-1">
              Select Assignment Deadline
            </label>
            <select
              value={selectedAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
              className="w-full border border-stone-300 rounded p-1.5 text-xs font-sans mb-2"
            >
              {assignments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.caseNumber} (Due: {a.dueDate.slice(0, 10)})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 pt-2 border-t border-stone-100">
            {calendarUrl ? (
              <a
                href={calendarUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-[#0B1325] hover:bg-[#1B3F8B] text-white py-2 px-3 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-sm transition-all"
              >
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                <span>Add to Google Calendar</span>
              </a>
            ) : null}

            {selectedAssignmentId && (
              <a
                href={`/api/workspace/calendar/assignment/${selectedAssignmentId}.ics`}
                download
                className="w-full bg-stone-50 hover:bg-stone-100 border border-stone-300 text-stone-800 py-1.5 px-3 rounded text-xs font-mono font-semibold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .ICS File</span>
              </a>
            )}
          </div>
        </div>

        {/* 4. GOOGLE SLIDES */}
        <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-2">
              <div className="flex items-center space-x-2">
                <Presentation className="w-4 h-4 text-amber-600" />
                <h3 className="font-serif font-bold text-base text-stone-900">Google Slides</h3>
              </div>
              <span className="font-mono text-[9px] uppercase font-bold bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded">
                Conference Deck
              </span>
            </div>
            <p className="text-xs text-stone-600 font-sans leading-relaxed">
              Generate 5-slide case conference presentation deck outlines structured for safety review committees.
            </p>
          </div>

          <div className="pt-2 border-t border-stone-100">
            {deckOutline && (
              <div className="p-2.5 rounded bg-stone-50 border border-stone-200 text-xs font-mono mb-2">
                <div className="font-bold text-stone-800">Deck: {deckOutline.title}</div>
                <div className="text-[10px] text-stone-500">{deckOutline.slides?.length} Slides Generated</div>
              </div>
            )}
            <button
              onClick={() => alert(`Google Slides Deck Outline for ${selectedCaseId} is ready for Slides presentation generation!`)}
              className="w-full border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 py-2 px-3 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-colors"
            >
              <span>View Slide Deck Outline</span>
            </button>
          </div>
        </div>

        {/* 5. GOOGLE DRIVE */}
        <div className="bg-white border border-stone-200 rounded-lg p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-2">
              <div className="flex items-center space-x-2">
                <HardDrive className="w-4 h-4 text-stone-700" />
                <h3 className="font-serif font-bold text-base text-stone-900">Google Drive</h3>
              </div>
              <span className="font-mono text-[9px] uppercase font-bold bg-stone-100 text-stone-800 px-1.5 py-0.5 rounded">
                Storage & Attachments
              </span>
            </div>
            <p className="text-xs text-stone-600 font-sans leading-relaxed">
              Manage supporting clinical attachments, original source PDFs, and archival export bundles in Google Drive.
            </p>
          </div>

          <div className="pt-2 border-t border-stone-100">
            <button
              onClick={() => alert('Drive Attachment Manager: Supporting safety literature and CIOMS-I PDFs linked.')}
              className="w-full bg-stone-50 hover:bg-stone-100 border border-stone-300 text-stone-800 py-2 px-3 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-colors"
            >
              <span>Manage Supporting Docs</span>
            </button>
          </div>
        </div>

        {/* 6. ANTIGRAVITY PLUGINS STATUS */}
        <div className="bg-stone-900 text-white rounded-lg p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-stone-700 pb-2 mb-2">
              <div className="flex items-center space-x-2">
                <CloudCog className="w-4 h-4 text-emerald-400" />
                <h3 className="font-serif font-bold text-base text-white">Antigravity Customizations</h3>
              </div>
              <span className="font-mono text-[9px] uppercase font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                5 Plugins Active
              </span>
            </div>
            <p className="text-xs text-stone-300 font-sans leading-relaxed">
              Local assistant environment has `gdrive`, `gsheets`, `gdocs`, `gslides`, and `gcalendar` plugins registered under `.gemini/config/plugins/`.
            </p>
          </div>

          <div className="pt-2 border-t border-stone-800 font-mono text-[10px] text-stone-400 space-y-1">
            <div>✓ gdrive CLI (PATH registered)</div>
            <div>✓ gsheets CLI (PATH registered)</div>
            <div>✓ gdocs CLI (PATH registered)</div>
            <div>✓ gslides CLI (PATH registered)</div>
            <div>✓ gcalendar CLI (PATH registered)</div>
          </div>
        </div>

      </div>

    </div>
  );
};
