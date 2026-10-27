import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Award, CheckCircle, RotateCcw, AlertTriangle, 
  Cpu, FileText, Pill, Shield, Calculator, UserCheck, CheckCircle2,
  Search, Filter, CheckCheck 
} from 'lucide-react';

export const MentorReviewPage: React.FC = () => {
  const { user, getAuthHeaders } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedSubIndex, setSelectedSubIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Search & Triage Filter State for High-Volume Cohorts
  const [searchQuery, setSearchQuery] = useState('');
  const [scoreFilter, setScoreFilter] = useState<'all' | 'high' | 'needs_attention'>('all');

  // Mentor Review state
  const [adjustedScore, setAdjustedScore] = useState<number>(85);
  const [mentorComments, setMentorComments] = useState('');
  const [evaluatingAI, setEvaluatingAI] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  const fetchPendingReviews = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();

      const res = await fetch('/api/reviews/pending', { headers });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
        if (data.submissions.length > 0) {
          const first = data.submissions[0];
          setAdjustedScore(first.aiAssessment?.totalScore || 85);
        }
      }
    } catch (err) {
      console.error('Failed to load pending reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingReviews();
  }, [user]);

  const filteredSubmissions = submissions.filter(sub => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      (sub.studentName && sub.studentName.toLowerCase().includes(q)) ||
      (sub.studentEmail && sub.studentEmail.toLowerCase().includes(q)) ||
      (sub.caseNumber && sub.caseNumber.toLowerCase().includes(q));
    
    if (!matchesSearch) return false;
    const score = sub.aiAssessment?.totalScore || 0;
    if (scoreFilter === 'high') return score >= 85;
    if (scoreFilter === 'needs_attention') return score < 85;
    return true;
  });

  const currentSub = filteredSubmissions[selectedSubIndex] || submissions[0];

  // Run AI Assessment if missing
  const handleTriggerAI = async () => {
    if (!currentSub) return;
    try {
      setEvaluatingAI(true);
      const headers = getAuthHeaders();

      const res = await fetch(`/api/assess/evaluate/${currentSub.submissionId}`, {
        method: 'POST',
        headers
      });

      if (res.ok) {
        await fetchPendingReviews();
      }
    } catch (err) {
      console.error('Failed to trigger AI assessment:', err);
    } finally {
      setEvaluatingAI(false);
    }
  };

  const handleDecision = async (decision: 'approved' | 'revision_requested') => {
    if (!currentSub) return;
    try {
      setSubmittingReview(true);
      setReviewSuccess(null);

      const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      };

      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          submissionId: currentSub.submissionId,
          assessmentId: currentSub.aiAssessment?.assessmentId,
          adjustedTotalScore: adjustedScore,
          mentorComments: mentorComments || (decision === 'approved' ? 'Approved based on solid ICSR coding and narrative.' : 'Please revise MedDRA coding and Naranjo causality.'),
          decision
        })
      });

      if (res.ok) {
        const data = await res.json();
        setReviewSuccess(`Submission successfully marked: ${decision.replace('_', ' ').toUpperCase()}`);
        fetchPendingReviews();
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="border-b border-black/[0.06] pb-6">
        <div className="flex items-center space-x-2 text-[11px] font-mono font-bold text-[#1B3F8B] uppercase tracking-widest mb-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500/20 ring-4 ring-emerald-500/10"></span>
          <span>MODULE 07 · TWO-TIER EVALUATION & MENTOR REVIEW</span>
          <span className="text-stone-300">/</span>
          <span>FACULTY OVERSIGHT</span>
        </div>
        <h2 className="font-sans font-bold text-2xl sm:text-3xl text-stone-900 tracking-tight">
          Mentor Review Studio
        </h2>
        <p className="font-sans text-xs sm:text-sm text-stone-600 mt-1.5 max-w-2xl leading-relaxed">
          Review student ICSR submissions side-by-side with gold-standard reference answers and AI-provisional evaluations. Adjust scoring rubrics, record clinical mentorship feedback, and approve work.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="w-9 h-9 border-2 border-[#1B3F8B] border-t-transparent rounded-full animate-spin mx-auto mb-3.5"></div>
          <p className="font-mono text-xs text-stone-500 uppercase tracking-wider">Loading Submissions for Review...</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-20 apple-card p-8">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-sans font-bold text-stone-800 text-lg">Review Queue Clear</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
            No submissions are currently pending mentor evaluation. Student submissions will appear here upon final lock.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Submission Selector Bar with High-Volume Cohort Triage */}
          <div className="apple-card p-5 space-y-3.5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-black/[0.05]">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-stone-900 uppercase">
                  Pending Review Queue ({filteredSubmissions.length} of {submissions.length})
                </span>
              </div>

              {/* Triage Search & Filters */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedSubIndex(0);
                    }}
                    placeholder="Filter student or case..."
                    className="w-full pl-8 pr-3 py-1.5 border border-black/[0.08] rounded-xl text-xs font-sans bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 transition-all"
                  />
                </div>

                <div className="inline-flex rounded-xl bg-stone-200/50 p-1 text-[10px] font-mono shadow-apple-inner ring-1 ring-black/[0.04]">
                  <button
                    onClick={() => { setScoreFilter('all'); setSelectedSubIndex(0); }}
                    className={`px-2.5 py-1 rounded-lg transition-all ${scoreFilter === 'all' ? 'bg-white font-bold text-stone-900 shadow-apple-subtle' : 'text-stone-600 hover:text-stone-900'}`}
                  >
                    All ({submissions.length})
                  </button>
                  <button
                    onClick={() => { setScoreFilter('high'); setSelectedSubIndex(0); }}
                    className={`px-2.5 py-1 rounded-lg transition-all ${scoreFilter === 'high' ? 'bg-white font-bold text-emerald-700 shadow-apple-subtle' : 'text-stone-600 hover:text-stone-900'}`}
                    title="Submissions with AI Provisional Score >= 85%"
                  >
                    AI High ≥85%
                  </button>
                  <button
                    onClick={() => { setScoreFilter('needs_attention'); setSelectedSubIndex(0); }}
                    className={`px-2.5 py-1 rounded-lg transition-all ${scoreFilter === 'needs_attention' ? 'bg-white font-bold text-amber-700 shadow-apple-subtle' : 'text-stone-600 hover:text-stone-900'}`}
                    title="Submissions needing mentor attention (AI score < 85%)"
                  >
                    Focus &lt;85%
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Submission Chips */}
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pt-1">
              {filteredSubmissions.map((sub, idx) => {
                const aiScore = sub.aiAssessment?.totalScore;
                const isSelected = idx === selectedSubIndex;
                return (
                  <button
                    key={sub.submissionId}
                    onClick={() => {
                      setSelectedSubIndex(idx);
                      setAdjustedScore(aiScore || 85);
                      setMentorComments('');
                      setReviewSuccess(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all flex items-center space-x-1.5 active:scale-95 ${
                      isSelected
                        ? 'bg-[#0B1325] text-white shadow-apple-subtle ring-1 ring-black/10'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-800 border border-black/[0.06]'
                    }`}
                  >
                    <span className="font-bold">{sub.studentName.split(' ')[0]}</span>
                    <span className="text-[10px] opacity-75">· {sub.caseNumber}</span>
                    {aiScore !== undefined && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected 
                          ? 'bg-white/20 text-white' 
                          : aiScore >= 85 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                      }`}>
                        {aiScore}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {currentSub && (
              <div className="text-[11px] font-mono text-stone-500 pt-1.5 flex justify-between items-center border-t border-black/[0.05]">
                <span>Selected: <strong className="text-stone-800">{currentSub.studentName}</strong> ({currentSub.studentEmail})</span>
                <span>Submitted: <strong>{currentSub.submittedAt ? new Date(currentSub.submittedAt).toLocaleString() : 'Draft'}</strong></span>
              </div>
            )}
          </div>

          {reviewSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-800 font-mono font-bold flex items-center space-x-2.5 shadow-apple-subtle">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{reviewSuccess}</span>
            </div>
          )}

          {/* Three-Column Review Workbench */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* COLUMN 1: STUDENT SUBMISSION (4 Cols) */}
            <div className="lg:col-span-4 apple-card p-6 space-y-4">
              <div className="border-b border-black/[0.06] pb-3">
                <span className="font-mono text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Tier 1 · Student Work</span>
                <h3 className="font-sans font-bold text-lg text-stone-900 mt-0.5">
                  {currentSub.studentName}
                </h3>
                <div className="font-mono text-[11px] text-stone-500">
                  Cohort: {currentSub.studentCohort} · Case: {currentSub.caseNumber}
                </div>
              </div>

              {/* Student MedDRA Coding */}
              <div>
                <div className="font-mono text-xs font-bold text-stone-700 uppercase mb-2 flex items-center space-x-1.5">
                  <Pill className="w-3.5 h-3.5 text-blue-600" />
                  <span>Student MedDRA Coding</span>
                </div>
                {currentSub.studentWork.meddraCoding?.length === 0 ? (
                  <p className="text-xs text-rose-600 italic">No terms coded by student.</p>
                ) : (
                  <div className="space-y-2">
                    {currentSub.studentWork.meddraCoding.map((term: any, i: number) => (
                      <div key={i} className="p-3 rounded-xl bg-stone-50/70 border border-black/[0.05] text-xs font-mono">
                        <div className="text-stone-800 font-semibold font-sans">"{term.verbatim}"</div>
                        <div className="text-[#1B3F8B] font-bold mt-1">PT: {term.pt}</div>
                        <div className="text-stone-500 text-[10px]">SOC: {term.soc}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Student Seriousness */}
              <div>
                <div className="font-mono text-xs font-bold text-stone-700 uppercase mb-2 flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-rose-600" />
                  <span>Seriousness Determination</span>
                </div>
                <div className="p-3 rounded-xl bg-stone-50/70 border border-black/[0.05] text-xs">
                  <div className="font-bold text-stone-900">
                    {currentSub.studentWork.seriousnessCriteria?.isSerious ? 'Marked as Serious' : 'Marked as Non-Serious'}
                  </div>
                  <div className="text-[11px] text-stone-600 font-sans mt-1 leading-relaxed">
                    Justification: {currentSub.studentWork.seriousnessCriteria?.justification || 'None provided'}
                  </div>
                </div>
              </div>

              {/* Student Causality */}
              <div>
                <div className="font-mono text-xs font-bold text-stone-700 uppercase mb-2 flex items-center space-x-1.5">
                  <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Causality (WHO & Naranjo)</span>
                </div>
                <div className="p-3 rounded-xl bg-stone-50/70 border border-black/[0.05] text-xs font-mono">
                  <div>WHO-UMC: <strong className="text-stone-900">{currentSub.studentWork.causalityWho}</strong></div>
                  <div>Naranjo Score: <strong className="text-stone-900">{currentSub.studentWork.causalityNaranjo?.totalScore} ({currentSub.studentWork.causalityNaranjo?.interpretation})</strong></div>
                  <div className="text-[11px] text-stone-600 font-sans mt-1.5 leading-relaxed">
                    Rationale: {currentSub.studentWork.causalityRationale || 'None provided'}
                  </div>
                </div>
              </div>

              {/* Student Narrative */}
              <div>
                <div className="font-mono text-xs font-bold text-stone-700 uppercase mb-2 flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-stone-600" />
                  <span>CIOMS-I Narrative Essay</span>
                </div>
                <div className="p-3 rounded-xl bg-stone-50/70 border border-black/[0.05] text-xs font-sans text-stone-800 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {currentSub.studentWork.ciomsNarrative || 'No narrative provided'}
                </div>
              </div>
            </div>

            {/* COLUMN 2: BENCHMARK REFERENCE KEY (4 Cols) */}
            <div className="lg:col-span-4 bg-purple-50/40 border border-purple-200/80 rounded-2xl p-6 shadow-apple-subtle space-y-4">
              <div className="border-b border-purple-200/60 pb-3">
                <span className="font-mono text-[10px] text-purple-700 uppercase font-bold tracking-wider">Gold Standard Reference Key</span>
                <h3 className="font-sans font-bold text-lg text-purple-950 mt-0.5">
                  Clinical Faculty Benchmark
                </h3>
                <div className="font-mono text-[11px] text-purple-700/80">
                  Isolated from student view until mentor approval
                </div>
              </div>

              {/* Expected MedDRA */}
              <div>
                <div className="font-mono text-xs font-bold text-purple-900 uppercase mb-2">
                  Expected MedDRA Terms
                </div>
                <div className="space-y-2">
                  {currentSub.referenceStandard.expectedMeddraTerms?.map((exp: any, i: number) => (
                    <div key={i} className="p-3 rounded-xl bg-white border border-purple-100 text-xs font-mono shadow-2xs">
                      <div className="text-purple-950 font-bold">PT: {exp.pt}</div>
                      <div className="text-purple-700 text-[10px]">SOC: {exp.soc}</div>
                      <div className="text-stone-500 font-sans text-[10px] mt-1">{exp.rationale}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expected Seriousness */}
              <div>
                <div className="font-mono text-xs font-bold text-purple-900 uppercase mb-2">
                  Expected Seriousness
                </div>
                <div className="p-3 rounded-xl bg-white border border-purple-100 text-xs font-mono shadow-2xs">
                  <div className="font-bold text-rose-800">
                    {currentSub.referenceStandard.expectedSeriousness?.isSerious ? 'SERIOUS ICSR' : 'NON-SERIOUS'}
                  </div>
                  <div className="text-[10px] text-purple-800 mt-1">
                    Criteria: {currentSub.referenceStandard.expectedSeriousness?.criteria?.join(', ')}
                  </div>
                  <div className="text-[10px] text-stone-600 font-sans mt-1 leading-relaxed">
                    {currentSub.referenceStandard.expectedSeriousness?.justification}
                  </div>
                </div>
              </div>

              {/* Expected Causality */}
              <div>
                <div className="font-mono text-xs font-bold text-purple-900 uppercase mb-2">
                  Expected Causality
                </div>
                <div className="p-3 rounded-xl bg-white border border-purple-100 text-xs font-mono shadow-2xs">
                  <div>WHO-UMC: <strong className="text-stone-900">{currentSub.referenceStandard.expectedCausalityWho}</strong></div>
                  <div>Naranjo Score: <strong className="text-stone-900">{currentSub.referenceStandard.expectedNaranjoScore}</strong></div>
                </div>
              </div>

              {/* Model Narrative */}
              <div>
                <div className="font-mono text-xs font-bold text-purple-900 uppercase mb-2">
                  Model CIOMS-I Narrative
                </div>
                <div className="p-3 rounded-xl bg-white border border-purple-100 text-xs font-sans text-stone-800 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap shadow-2xs">
                  {currentSub.referenceStandard.modelCiomsNarrative}
                </div>
              </div>
            </div>

            {/* COLUMN 3: AI EVALUATION & MENTOR GRADING (4 Cols) */}
            <div className="lg:col-span-4 apple-card p-6 space-y-4">
              <div className="border-b border-black/[0.06] pb-3 flex justify-between items-start">
                <div>
                  <span className="font-mono text-[10px] text-slate-700 uppercase font-bold flex items-center space-x-1">
                    <Cpu className="w-3 h-3 text-slate-600" />
                    <span>Tier 2 · Automated Scoring Rubric</span>
                  </span>
                  <h3 className="font-sans font-bold text-lg text-stone-900 mt-0.5">
                    Mentor Grading Studio
                  </h3>
                </div>

                {!currentSub.aiAssessment && (
                  <button
                    onClick={handleTriggerAI}
                    disabled={evaluatingAI}
                    className="bg-[#0B1325] hover:bg-[#1B3F8B] active:scale-95 text-white px-3 py-1 rounded-xl text-[10px] font-mono font-bold uppercase shadow-apple-subtle transition-all"
                  >
                    {evaluatingAI ? 'Scoring...' : 'Run AI Scoring'}
                  </button>
                )}
              </div>

              {/* AI Score Breakdown */}
              {currentSub.aiAssessment ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-amber-500/[0.08] border border-amber-500/20 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono uppercase text-amber-900 font-bold tracking-wider">Provisional AI Score</div>
                      <div className="text-[10px] text-amber-800 font-sans mt-0.5">Status: {currentSub.aiAssessment.status}</div>
                    </div>
                    <div className="font-mono font-bold text-3xl text-amber-950 tabular-nums">
                      {currentSub.aiAssessment.totalScore}%
                    </div>
                  </div>

                  {/* Identified Omissions */}
                  {currentSub.aiAssessment.omissions?.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200/70 text-xs">
                      <div className="font-mono font-bold text-rose-800 text-[10px] uppercase mb-1.5 tracking-wider">
                        Identified Omissions ({currentSub.aiAssessment.omissions.length})
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-950 font-sans">
                        {currentSub.aiAssessment.omissions.map((om: string, i: number) => (
                          <li key={i}>{om}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Strengths */}
                  {currentSub.aiAssessment.strengths?.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/70 text-xs">
                      <div className="font-mono font-bold text-emerald-800 text-[10px] uppercase mb-1.5 tracking-wider">
                        Student Strengths
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-[11px] text-emerald-950 font-sans">
                        {currentSub.aiAssessment.strengths.slice(0, 3).map((st: string, i: number) => (
                          <li key={i}>{st}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-stone-50 border border-dashed border-stone-300 text-center text-xs text-stone-500">
                  AI assessment has not run yet for this submission. Click "Run AI Scoring" above.
                </div>
              )}

              {/* Mentor Score Override & Feedback */}
              <div className="pt-3 border-t border-black/[0.06] space-y-3.5">
                <div>
                  <div className="flex justify-between items-center text-xs font-mono font-bold text-stone-800 mb-1.5">
                    <span>Final Adjusted Score:</span>
                    <span className="text-lg text-[#1B3F8B] tabular-nums">{adjustedScore}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={adjustedScore}
                    onChange={(e) => setAdjustedScore(Number(e.target.value))}
                    className="w-full accent-[#1B3F8B] cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase mb-1.5">
                    Mentor Feedback & Action Items
                  </label>
                  <textarea
                    rows={3}
                    value={mentorComments}
                    onChange={(e) => setMentorComments(e.target.value)}
                    placeholder="Enter actionable remarks for the student..."
                    className="w-full border border-black/[0.08] rounded-xl p-3 text-xs font-sans leading-relaxed bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3F8B]/30 transition-all"
                  />
                </div>

                {/* Final Decision Buttons */}
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <button
                    onClick={() => handleDecision('revision_requested')}
                    disabled={submittingReview}
                    className="border border-amber-300/80 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-900 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all shadow-apple-subtle disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                    <span>Request Revision</span>
                  </button>

                  <button
                    onClick={() => handleDecision('approved')}
                    disabled={submittingReview}
                    className="bg-[#0B1325] hover:bg-[#1B3F8B] active:scale-95 text-white py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-apple-subtle hover:shadow-apple-card transition-all disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Approve Work</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
