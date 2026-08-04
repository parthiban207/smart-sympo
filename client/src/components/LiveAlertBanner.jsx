import { useApp } from '../context/AppContext';
import { Bell, AlertTriangle, Clock } from 'lucide-react';

export default function LiveAlertBanner() {
  const { liveAlerts } = useApp();

  if (!liveAlerts || liveAlerts.length === 0) return null;

  const currentAlert = liveAlerts[0];

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 shadow-2xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 overflow-hidden text-ellipsis whitespace-nowrap">
          <div className="p-1 rounded-md bg-amber-100 text-amber-800 shrink-0">
            {currentAlert.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
          </div>
          <p className="text-xs sm:text-sm font-medium text-amber-900 truncate">
            <span className="font-bold text-amber-800 mr-1.5">[LIVE BROADCAST]</span>
            {currentAlert.message}
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-100/60 px-2.5 py-0.5 rounded-full border border-amber-200 shrink-0 font-medium">
          <Clock className="w-3 h-3 text-amber-700" />
          <span>{currentAlert.time}</span>
        </div>
      </div>
    </div>
  );
}
