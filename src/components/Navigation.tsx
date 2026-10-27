import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BookOpen, Sparkles, FileUp, Laptop, CheckSquare, 
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
  const { isStaff, isAdmin, isStudent } = useAuth();

  const tabs: Array<{ id: NavTab; label: string; icon: React.ReactNode; badge?: string; staffOnly?: boolean; adminOnly?: boolean }> = [
    {
      id: 'cases',
      label: 'PV Case Library',
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      id: 'workbench',
      label: 'PV Workbench',
      icon: <Laptop className="w-4 h-4" />,
      badge: isStudent ? 'Active Case' : undefined,
    },
    {
      id: 'assignments',
      label: 'Assignments',
      icon: <CheckSquare className="w-4 h-4" />,
    },
    {
      id: 'generator',
      label: 'AI Case Generator',
      icon: <Sparkles className="w-4 h-4 text-amber-500" />,
      badge: 'AI',
      staffOnly: true,
    },
    {
      id: 'importer',
      label: 'PDF Case Importer',
      icon: <FileUp className="w-4 h-4" />,
      staffOnly: true,
    },
    {
      id: 'reviews',
      label: 'Mentor Review',
      icon: <Award className="w-4 h-4 text-emerald-600" />,
      badge: 'Staff',
      staffOnly: true,
    },
    {
      id: 'dashboard',
      label: 'Admin Command',
      icon: <LayoutDashboard className="w-4 h-4" />,
      adminOnly: true,
    },
    {
      id: 'workspace',
      label: 'Google Workspace',
      icon: <CloudCog className="w-4 h-4 text-[#1B3F8B]" />,
      badge: 'G-Suite',
    },
  ];

  const visibleTabs = tabs.filter(tab => {
    if (tab.adminOnly && !isAdmin) return false;
    if (tab.staffOnly && !isStaff) return false;
    return true;
  });

  return (
    <nav className="border-b border-stone-200 bg-[#FAF9F6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none">
          {visibleTabs.map(tab => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-xs font-mono font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#0B1325] text-white shadow-sm font-semibold'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="uppercase tracking-wider">{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : 'bg-stone-200 text-stone-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
