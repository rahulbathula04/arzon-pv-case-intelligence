import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { CaseLibraryPage } from './pages/CaseLibraryPage';
import { CaseGeneratorPage } from './pages/CaseGeneratorPage';
import { PdfImporterPage } from './pages/PdfImporterPage';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { StudentWorkbenchPage } from './pages/StudentWorkbenchPage';
import { MentorReviewPage } from './pages/MentorReviewPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { GoogleWorkspacePage } from './pages/GoogleWorkspacePage';

export const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('cases');
  const [selectedCaseIdForWorkbench, setSelectedCaseIdForWorkbench] = useState<string | null>(null);

  const handleSelectCaseForWorkbench = (caseId: string) => {
    setSelectedCaseIdForWorkbench(caseId);
    setCurrentTab('workbench');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6]">
      <Header />
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
      <footer className="border-t border-stone-200 bg-white py-6 mt-12 text-center text-xs font-mono text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-serif font-bold text-stone-800">ARZON GLOBAL</span>
            <span>·</span>
            <span>HEALTHCARE CAREER INTELLIGENCE ARCHITECTURE</span>
          </div>
          <div>
            DATABASE ENGINE: <span className="text-stone-700 font-bold">SQLITE (AUTHORITATIVE)</span> · ALL ICSRS FICTIONAL
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
