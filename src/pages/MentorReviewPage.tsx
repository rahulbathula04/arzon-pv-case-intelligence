import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Award, CheckCircle, RotateCcw, AlertTriangle, 
  Sparkles, FileText, Pill, Shield, Calculator, UserCheck, CheckCircle2 
} from 'lucide-react';

export const MentorReviewPage: React.FC = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedSubIndex, setSelectedSubIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Mentor Review state
  const [adjustedScore, setAdjustedScore] = useState<number>(85);
  const [mentorComments, setMentorComments] = useState('');
  const [evaluatingAI, setEvaluatingAI] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  const fetchPendingReviews = async () => {
    try {
      setLoading(true);
      const headers: Record<string, string> = {};
      if (user?.id) headers['x-user-id'] = user.id;

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

  const currentSub = submissions[selectedSubIndex];

  // Run AI Assessment if missing
  const handleTriggerAI = async () => {
    if (!currentSub) return;
    try {
      setEvaluatingAI(true);
      const headers: Record<string, string> = {};
      if (user?.id) headers['x-user-id'] = user.id;

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

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.id) headers['x-user-id'] = user.id;

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
      <div className="border-b border-stone-200 pb-5">
        <div className="flex items-center space-x-2 text-xs font-mono font-bold text-[#1B3F8B] uppercase tracking-widest mb-1">
          <span>MODULE 07 · TWO-TIER EVALUATION & MENTOR REVIEW</span>
          <span>·</span>
          <span>FACULTY OVERSIGHT</span>
        </div>
        <h2 className="font-serif font-bold text-2xl sm:text-3xl text-stone-900 tracking-tight">
          Mentor Review Studio
        </h2>
        <p className="font-sans text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
          Review student ICSR submissions side-by-side with gold-standard reference answers and AI-provisional evaluations. Adjust scoring rubrics, record clinical mentorship feedback, and approve work.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-[#1B3F8B] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="font-mono text-xs text-stone-500 uppercase tracking-wider">Loading Submissions for Review...</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-16 bg-white border border-stone-200 rounded-lg p-8">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <h3 className="font-serif font-bold text-stone-800 text-lg">Review Queue Clear</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
            No submissions are currently pending mentor evaluation. Student submissions will appear here upon final lock.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Submission Selector Bar */}
          <div className="bg-white border border-stone-200 rounded-lg p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span className="font-mono text-xs font-bold text-stone-500 uppercase">
                Submission Queue ({submissions.length}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {submissions.map((sub, idx) => (
                  <button
                    key={sub.submissionId}
                    onClick={() => {
                      setSelectedSubIndex(idx);
                      setAdjustedScore(sub.aiAssessment?.totalScore || 85);
                      setReviewSuccess(null);
                    }}
                    className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                      idx === selectedSubIndex
                        ? 'bg-[#0B1325] text-white shadow-sm'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    {sub.studentName.split(' ')[0]} - {sub.caseNumber}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs font-mono text-stone-500">
              Submitted: <strong>{currentSub.submittedAt || 'Draft'}</strong>
            </div>
          </div>

          {reviewSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3.5 text-xs text-emerald-800 font-mono font-bold flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{reviewSuccess}</span>
            </div>
          )}

          {/* Three-Column Review Workbench */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* COLUMN 1: STUDENT SUBMISSION (4 Cols) */}
            <div className="lg:col-span-4 bg-white border border-stone-200 rounded-lg p-5 shadow-sm space-y-4">
              <div className="border-b border-stone-200 pb-2">
                <span className="font-mono text-[10px] text-stone-400 uppercase">Tier 1 · Student Work</span>
                <h3 className="font-serif font-bold text-base text-stone-900">
                  {currentSub.studentName}
                </h3>
                <div className="font-mono text-[11px] text-stone-500">
                  Cohort: {currentSub.studentCohort} · Case: {currentSub.caseNumber}
                </div>
              </div>

              {/* Student MedDRA Coding */}
              <div>
                <div className="font-mono text-xs font-bold text-stone-700 uppercase mb-1.5 flex items-center space-x-1">
                  <Pill className="w-3.5 h-3.5 text-blue-600" />
                  <span>Student MedDRA Coding</span>
                </div>
                {currentSub.studentWork.meddraCoding?.length === 0 ? (
                  <p className="text-xs text-rose-600 italic">No terms coded by student.</p>
                ) : (
                  <div className="space-y-1.5">
                    {currentSub.studentWork.meddraCoding.map((term: any, i: number) => (
                      <div key={i} className="p-2 rounded bg-stone-50 border border-stone-200 text-xs font-mono">
                        <div className="text-stone-800 font-semibold font-sans">"{term.verbatim}"</div>
                        <div className="text-[#1B3F8B] font-bold">PT: {term.pt}</div>
                        <div className="text-stone-500 text-[10px]">SOC: {term.soc}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Student Seriousness */}
              <div>
                <div className="font-mono text-xs font-bold text-stone-700 uppercase mb-1.5 flex items-center space-x-1">
                  <Shield className="w-3.5 h-3.5 text-rose-600" />
                  <span>Seriousness Determination</span>
                </div>
                <div className="p-2.5 rounded bg-stone-50 border border-stone-200 text-xs">
                  <div className="font-bold text-stone-900">
                    {currentSub.studentWork.seriousnessCriteria?.isSerious ? 'Marked as Serious' : 'Marked as Non-Serious'}
                  </div>
                  <div className="text-[11px] text-stone-600 font-sans mt-1">
                    Justification: {currentSub.studentWork.seriousnessCriteria?.justification || 'None provided'}
                  </div>
                </div>
              </div>

              {/* Student Causality */}
              <div>
                <div className="font-mono text-xs font-bold text-stone-700 uppercase mb-1.5 flex items-center space-x-1">
                  <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Causality (WHO & Naranjo)</span>
                </div>
                <div className="p-2.5 rounded bg-stone-50 border border-stone-200 text-xs font-mono">
                  <div>WHO-UMC: <strong>{currentSub.studentWork.causalityWho}</strong></div>
                  <div>Naranjo Score: <strong>{currentSub.studentWork.causalityNaranjo?.totalScore} ({currentSub.studentWork.causalityNaranjo?.interpretation})</strong></div>
                  <div className="text-[11px] text-stone-600 font-sans mt-1">
                    Rationale: {currentSub.studentWork.causalityRationale || 'None provided'}
                  </div>
                </div>
              </div>

              {/* Student Narrative */}
              <div>
                <div className="font-mono text-xs font-bold text-stone-700 uppercase mb-1.5 flex items-center space-x-1">
                  <FileText className="w-3.5 h-3.5 text-stone-600" />
                  <span>CIOMS-I Narrative Essay</span>
                </div>
                <div className="p-2.5 rounded bg-stone-50 border border-stone-200 text-xs font-sans text-stone-800 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {currentSub.studentWork.ciomsNarrative || 'No narrative provided'}
                </div>
              </div>
            </div>

            {/* COLUMN 2: BENCHMARK REFERENCE KEY (4 Cols) */}
            <div className="lg:col-span-4 bg-purple-50/50 border border-purple-200 rounded-lg p-5 shadow-sm space-y-4">
              <div className="border-b border-purple-200 pb-2">
                <span className="font-mono text-[10px] text-purple-600 uppercase font-bold">Gold Standard Reference Key</span>
                <h3 className="font-serif font-bold text-base text-purple-950">
                  Clinical Faculty Benchmark
                </h3>
                <div className="font-mono text-[11px] text-purple-700">
                  Isolated from student view until mentor approval
                </div>
              </div>

              {/* Expected MedDRA */}
              <div>
                <div className="font-mono text-xs font-bold text-purple-900 uppercase mb-1.5">
                  Expected MedDRA Terms
                </div>
                <div className="space-y-1.5">
                  {currentSub.referenceStandard.expectedMeddraTerms?.map((exp: any, i: number) => (
                    <div key={i} className="p-2 rounded bg-white border border-purple-200 text-xs font-mono">
                      <div className="text-purple-900 font-bold">PT: {exp.pt}</div>
                      <div className="text-purple-700 text-[10px]">SOC: {exp.soc}</div>
                      <div className="text-stone-500 font-sans text-[10px] mt-0.5">{exp.rationale}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expected Seriousness */}
              <div>
                <div className="font-mono text-xs font-bold text-purple-900 uppercase mb-1.5">
                  Expected Seriousness
                </div>
                <div className="p-2.5 rounded bg-white border border-purple-200 text-xs font-mono">
                  <div className="font-bold text-rose-800">
                    {currentSub.referenceStandard.expectedSeriousness?.isSerious ? 'SERIOUS ICSR' : 'NON-SERIOUS'}
                  </div>
                  <div className="text-[10px] text-purple-800 mt-1">
                    Criteria: {currentSub.referenceStandard.expectedSeriousness?.criteria?.join(', ')}
                  </div>
                  <div className="text-[10px] text-stone-600 font-sans mt-0.5">
                    {currentSub.referenceStandard.expectedSeriousness?.justification}
                  </div>
                </div>
              </div>

              {/* Expected Causality */}
              <div>
                <div className="font-mono text-xs font-bold text-purple-900 uppercase mb-1.5">
                  Expected Causality
                </div>
                <div className="p-2.5 rounded bg-white border border-purple-200 text-xs font-mono">
                  <div>WHO-UMC: <strong>{currentSub.referenceStandard.expectedCausalityWho}</strong></div>
                  <div>Naranjo Score: <strong>{currentSub.referenceStandard.expectedNaranjoScore}</strong></div>
                </div>
              </div>

              {/* Model Narrative */}
              <div>
                <div className="font-mono text-xs font-bold text-purple-900 uppercase mb-1.5">
                  Model CIOMS-I Narrative
                </div>
                <div className="p-2.5 rounded bg-white border border-purple-200 text-xs font-sans text-stone-800 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {currentSub.referenceStandard.modelCiomsNarrative}
                </div>
              </div>
            </div>

            {/* COLUMN 3: AI EVALUATION & MENTOR GRADING (4 Cols) */}
            <div className="lg:col-span-4 bg-white border border-stone-200 rounded-lg p-5 shadow-sm space-y-4">
              <div className="border-b border-stone-200 pb-2 flex justify-between items-start">
                <div>
                  <span className="font-mono text-[10px] text-amber-600 uppercase font-bold flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Tier 2 · AI Assessment</span>
                  </span>
                  <h3 className="font-serif font-bold text-base text-stone-900">
                    Mentor Grading Studio
                  </h3>
                </div>

                {!currentSub.aiAssessment && (
                  <button
                    onClick={handleTriggerAI}
                    disabled={evaluatingAI}
                    className="bg-[#0B1325] text-white px-2 py-1 rounded text-[10px] font-mono font-bold uppercase"
                  >
                    {evaluatingAI ? 'Scoring...' : 'Run AI Scoring'}
                  </button>
                )}
              </div>

              {/* AI Score Breakdown */}
              {currentSub.aiAssessment ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono uppercase text-amber-900 font-bold">Provisional AI Score</div>
                      <div className="text-[10px] text-amber-800 font-sans">Status: {currentSub.aiAssessment.status}</div>
                    </div>
                    <div className="font-mono font-bold text-2xl text-amber-900">
                      {currentSub.aiAssessment.totalScore}%
                    </div>
                  </div>

                  {/* Identified Omissions */}
                  {currentSub.aiAssessment.omissions?.length > 0 && (
                    <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-xs">
                      <div className="font-mono font-bold text-rose-800 text-[10px] uppercase mb-1">
                        Identified Omissions ({currentSub.aiAssessment.omissions.length})
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-900 font-sans">
                        {currentSub.aiAssessment.omissions.map((om: string, i: number) => (
                          <li key={i}>{om}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Strengths */}
                  {currentSub.aiAssessment.strengths?.length > 0 && (
                    <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-xs">
                      <div className="font-mono font-bold text-emerald-800 text-[10px] uppercase mb-1">
                        Student Strengths
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-900 font-sans">
                        {currentSub.aiAssessment.strengths.slice(0, 3).map((st: string, i: number) => (
                          <li key={i}>{st}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded bg-stone-50 border border-stone-200 text-center text-xs text-stone-500">
                  AI assessment has not run yet for this submission. Click "Run AI Scoring" above.
                </div>
              )}

              {/* Mentor Score Override & Feedback */}
              <div className="pt-3 border-t border-stone-200 space-y-3">
                <div>
                  <div className="flex justify-between items-center text-xs font-mono font-bold text-stone-800 mb-1">
                    <span>Final Adjusted Score:</span>
                    <span className="text-base text-[#1B3F8B]">{adjustedScore}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={adjustedScore}
                    onChange={(e) => setAdjustedScore(Number(e.target.value))}
                    className="w-full accent-[#1B3F8B]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase mb-1">
                    Mentor Feedback & Action Items
                  </label>
                  <textarea
                    rows={3}
                    value={mentorComments}
                    onChange={(e) => setMentorComments(e.target.value)}
                    placeholder="Enter actionable remarks for the student..."
                    className="w-full border border-stone-300 rounded p-2 text-xs font-sans leading-relaxed"
                  />
                </div>

                {/* Final Decision Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => handleDecision('revision_requested')}
                    disabled={submittingReview}
                    className="border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                    <span>Request Revision</span>
                  </button>

                  <button
                    onClick={() => handleDecision('approved')}
                    disabled={submittingReview}
                    className="bg-[#0B1325] hover:bg-[#1B3F8B] text-white py-2 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-1 shadow-sm"
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
