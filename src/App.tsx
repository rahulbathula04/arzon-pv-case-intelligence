import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { LoginPage } from './pages/LoginPage';
import { CaseLibraryPage } from './pages/CaseLibraryPage';
import { CaseGeneratorPage } from './pages/CaseGeneratorPage';
import { PdfImporterPage } from './pages/PdfImporterPage';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { StudentWorkbenchPage } from './pages/StudentWorkbenchPage';
import { MentorReviewPage } from './pages/MentorReviewPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { GoogleWorkspacePage } from './pages/GoogleWorkspacePage';

export const AppContent: React.FC = () => {
  const { user, token, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [selectedCaseIdForWorkbench, setSelectedCaseIdForWorkbench] = useState<string | null>(null);

  // Set default tab on user login based on role
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') setCurrentTab('dashboard');
      else if (user.role === 'mentor') setCurrentTab('reviews');
      else setCurrentTab('workbench');
    }
  }, [user?.id, user?.role]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 text-stone-900">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0B1325] to-[#1E293B] text-white flex items-center justify-center font-sans text-2xl font-black shadow-apple-card mb-4 animate-pulse">
          A
        </div>
        <div className="w-6 h-6 border-2 border-[#1B3F8B] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="font-mono text-xs uppercase tracking-wider text-stone-500">
          Verifying Cryptographic Session Security...
        </p>
      </div>
    );
  }

  // Zero-Trust Security Gate: If not authenticated, require explicit Login
  if (!user || !token) {
    return <LoginPage />;
  }

  const handleSelectCaseForWorkbench = (caseId: string) => {
    setSelectedCaseIdForWorkbench(caseId);
    setCurrentTab('workbench');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6]">
      <Header onSelectTab={setCurrentTab} />
      <Navigation currentTab={currentTab} onSelectTab={setCurrentTab} />

      <main className="flex-1">
        {currentTab === 'cases' && (
          <CaseLibraryPage
            onSelectCaseForWorkbench={handleSelectCaseForWorkbench}
            onNavigateToGenerator={() => setCurrentTab('generator')}
            onNavigateToImporter={() => setCurrentTab('importer')}
          />
        )}

        {currentTab === 'workbench' && (
          <StudentWorkbenchPage
            initialCaseId={selectedCaseIdForWorkbench}
          />
        )}

        {currentTab === 'assignments' && (
          <AssignmentsPage
            onOpenWorkbenchForCase={(caseId, asgId) => {
              setSelectedCaseIdForWorkbench(caseId);
              setCurrentTab('workbench');
            }}
          />
        )}

        {currentTab === 'generator' && (
          <CaseGeneratorPage
            onCasePublished={(id) => {
              setCurrentTab('cases');
            }}
          />
        )}

        {currentTab === 'importer' && (
          <PdfImporterPage
            onCaseSaved={(id) => {
              setCurrentTab('cases');
            }}
          />
        )}

        {currentTab === 'reviews' && (
          <MentorReviewPage />
        )}

        {currentTab === 'dashboard' && (
          <AdminDashboardPage />
        )}

        {currentTab === 'workspace' && (
          <GoogleWorkspacePage />
        )}
      </main>

      {/* Authoritative Footer */}
      <footer className="border-t border-black/[0.06] apple-glass py-6 mt-16 text-xs font-mono text-stone-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <div className="flex items-center space-x-2">
            <span className="font-sans font-extrabold text-stone-900 tracking-tight">ARZON GLOBAL</span>
            <span className="text-stone-300">/</span>
            <span className="text-stone-600">HEALTHCARE CAREER INTELLIGENCE ARCHITECTURE</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
            <span>DATABASE: <strong className="text-stone-800">SQLITE (AUTHORITATIVE)</strong></span>
            <span className="text-stone-300">·</span>
            <span className="text-stone-400">CONTROLLED FICTIONAL ICSR SIMULATION</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
