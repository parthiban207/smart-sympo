// agent-notes: { ctx: "Campus Navigation and Wayfinding page hosting Option B Leaflet interactive map with QR landmark scanner", deps: ["src/components/CampusMap.jsx", "lucide-react", "react-router-dom"], state: "active", last: "antigravity@2026-09-24" }

import { useSearchParams } from 'react-router-dom';
import CampusMap from '../components/CampusMap';
import { Compass, Sparkles } from 'lucide-react';

export default function CampusNavigationPage() {
  const [searchParams] = useSearchParams();
  const targetVenueId = searchParams.get('venue');

  return (
    <div className="flex flex-col h-full w-full">
      {/* Top Banner / Breadcrumb */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-slate-900 dark:text-white">
                Campus Navigation & Wayfinding
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm">
                3D Street View &bull; Floor Navigation &bull; Hall Walkthrough
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive 3D first-person college street view, stairs & floor navigation, hallway arrows, customizable starting location, and hall interior visits
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Multi-Location & Outstation Ready</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Map Component */}
      <div className="flex-1 w-full relative">
        <CampusMap selectedVenueId={targetVenueId} />
      </div>
    </div>
  );
}
