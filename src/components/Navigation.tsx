import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BookOpen, FlaskConical, FileUp, Laptop, CheckSquare, 
  Award, LayoutDashboard, CloudCog 
} from 'lucide-react';

export type NavTab = 
  | 'cases' 
  | 'generator' 
  | 'importer' 
  | 'workbench' 
  | 'assignments' 
  | 'reviews' 
  | 'dashboard' 
  | 'workspace';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentTab, onSelectTab }) => {
  const { user, isAdmin, isStudent } = useAuth();

  // Role-Isolated Navigation Tabs
  let visibleTabs: Array<{ id: NavTab; label: string; icon: React.ReactNode }> = [];

  if (isStudent) {
    visibleTabs = [
      {
        id: 'assignments',
        label: 'Assigned Work',
        icon: <CheckSquare className="w-3.5 h-3.5" />,
      },
      {
        id: 'workbench',
        label: 'Clinical Workbench',
        icon: <Laptop className="w-3.5 h-3.5" />,
      },
      {
        id: 'cases',
        label: 'Case Library',
        icon: <BookOpen className="w-3.5 h-3.5" />,
      },
    ];
  } else if (user?.role === 'mentor') {
    visibleTabs = [
      {
        id: 'reviews',
        label: 'Review Studio',
        icon: <Award className="w-3.5 h-3.5" />,
      },
      {
        id: 'assignments',
        label: 'Cohort Submissions',
        icon: <CheckSquare className="w-3.5 h-3.5" />,
      },
      {
        id: 'cases',
        label: 'Master Case Vault',
        icon: <BookOpen className="w-3.5 h-3.5" />,
      },
      {
        id: 'workspace',
        label: 'Conference Decks',
        icon: <CloudCog className="w-3.5 h-3.5" />,
      },
    ];
  } else {
    // Executive Admin Console
    visibleTabs = [
      {
        id: 'dashboard',
        label: 'Operations Command',
        icon: <LayoutDashboard className="w-3.5 h-3.5" />,
      },
      {
        id: 'cases',
        label: 'Case Vault',
        icon: <BookOpen className="w-3.5 h-3.5" />,
      },
      {
        id: 'generator',
        label: 'Case Synthesis',
        icon: <FlaskConical className="w-3.5 h-3.5" />,
      },
      {
        id: 'importer',
        label: 'Clinical PDF Parser',
        icon: <FileUp className="w-3.5 h-3.5" />,
      },
      {
        id: 'assignments',
        label: 'Cohort Allocator',
        icon: <CheckSquare className="w-3.5 h-3.5" />,
      },
      {
        id: 'reviews',
        label: 'Quality Reviews',
        icon: <Award className="w-3.5 h-3.5" />,
      },
      {
        id: 'workspace',
        label: 'Workspace Export',
        icon: <CloudCog className="w-3.5 h-3.5" />,
      },
    ];
  }

  // Ensure currentTab is strictly valid for the current role
  useEffect(() => {
    const isCurrentTabValid = visibleTabs.some(t => t.id === currentTab);
    if (!isCurrentTabValid && visibleTabs.length > 0) {
      onSelectTab(visibleTabs[0].id);
    }
  }, [user?.role, currentTab, visibleTabs, onSelectTab]);

  return (
    <nav className="border-b border-slate-200 bg-white sticky top-[61px] z-30 transition-all shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 overflow-x-auto py-2 scrollbar-none items-center">
          {visibleTabs.map(tab => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-mono transition-all duration-150 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-500'}>{tab.icon}</span>
                <span className="uppercase tracking-wider">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};