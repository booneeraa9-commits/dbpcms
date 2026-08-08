/**
 * Demo banner — shows when running in preview/mock mode.
 * Helps the user understand the state and offers quick actions.
 */

import { useState } from 'react';
import { Sparkles, X, RotateCcw, Database } from 'lucide-react';
import { isMockMode } from '@/lib/api';
import { resetMockData } from '@/lib/mockApi';
import toast from 'react-hot-toast';

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('dbpcms_banner_dismissed') === 'true';
  });

  if (dismissed) return null;
  if (!isMockMode) return null; // Don't show in real production

  const dismiss = () => {
    sessionStorage.setItem('dbpcms_banner_dismissed', 'true');
    setDismissed(true);
  };

  const handleReset = () => {
    if (confirm('Reset all demo data? Any students/departments you created will be lost.')) {
      resetMockData();
      toast.success('Demo data reset! Refreshing…');
      setTimeout(() => window.location.reload(), 800);
    }
  };

  return (
    <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <Database className="h-4 w-4 flex-shrink-0" />
            <div className="text-xs sm:text-sm">
              <span className="font-semibold">Demo Mode</span>
              <span className="opacity-90 hidden sm:inline"> · Data is stored in your browser. Try creating students, departments, courses — everything works!</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleReset}
              className="text-xs flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
            <button
              onClick={dismiss}
              className="p-1 rounded hover:bg-white/20 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
