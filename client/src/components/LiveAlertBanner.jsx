// agent-notes: { ctx: "Live Alert & Emergency Banner with individual user stop/dismiss option and Admin-only system-wide clear control", deps: ["src/context/AppContext.jsx", "lucide-react"], state: "active", last: "antigravity@2026-08-13" }

import { useApp } from '../context/AppContext';
import { Bell, AlertOctagon, Clock, ShieldAlert, Radio, X, StopCircle } from 'lucide-react';

export default function LiveAlertBanner() {
  const { liveAlerts, dismissedAlertIds, dismissLocalAlert, clearGlobalEmergencyBroadcast, currentUser } = useApp();

  if (!liveAlerts || liveAlerts.length === 0) return null;

  // Filter out alerts that this specific user has dismissed locally
  const activeVisibleAlerts = liveAlerts.filter(
    (a) => !dismissedAlertIds.includes(a.id)
  );

  if (activeVisibleAlerts.length === 0) return null;

  const currentAlert = activeVisibleAlerts[0];
  const isEmergency =
    currentAlert.isEmergency ||
    currentAlert.severity === 'emergency' ||
    currentAlert.severity === 'critical' ||
    currentAlert.type === 'emergency';

  const isAdmin = currentUser?.role === 'admin';

  const handleStopForMe = () => {
    dismissLocalAlert(currentAlert.id);
  };

  const handleClearSystemWide = async () => {
    await clearGlobalEmergencyBroadcast();
  };

  if (isEmergency) {
    return (
      <div className="bg-rose-600 text-white px-4 py-2.5 shadow-md border-b-2 border-rose-700 animate-pulse">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden text-ellipsis whitespace-nowrap">
            <div className="p-1.5 rounded-lg bg-rose-700 text-white shrink-0 shadow-xs border border-rose-500">
              <ShieldAlert className="w-5 h-5 text-white animate-bounce" />
            </div>
            <div className="text-left text-xs sm:text-sm">
              <span className="font-extrabold uppercase tracking-wider bg-rose-800 px-2 py-0.5 rounded text-[10px] mr-2 border border-rose-500">
                CRITICAL EMERGENCY BROADCAST
              </span>
              <span className="font-bold">{currentAlert.title || 'EMERGENCY ALERT'}: </span>
              <span>{currentAlert.message}</span>
              {currentAlert.hall_number && (
                <span className="ml-2 font-mono text-[11px] bg-rose-900 px-2 py-0.5 rounded text-rose-200">
                  Venue: {currentAlert.hall_number}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 text-[11px] bg-rose-800/80 px-2.5 py-1 rounded-full border border-rose-500 shrink-0 font-medium">
              <Radio className="w-3.5 h-3.5 text-rose-200 animate-ping" />
              <Clock className="w-3 h-3 text-rose-200" />
              <span>{currentAlert.time}</span>
            </div>

            {/* Individual Stop / Dismiss Button for Current User */}
            <button
              onClick={handleStopForMe}
              title="Stop alert for your session"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-800 hover:bg-rose-900 text-white text-xs font-bold border border-rose-500 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-rose-200" />
              <span>Dismiss (For Me)</span>
            </button>

            {/* System-wide Clear Option (Admin Authority ONLY) */}
            {isAdmin && (
              <button
                onClick={handleClearSystemWide}
                title="Stop emergency broadcast for ALL users (Admin Authority Only)"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-black text-amber-300 text-xs font-bold border border-amber-500/50 transition cursor-pointer shadow-xs"
              >
                <StopCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Stop All (Admin)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 shadow-2xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 overflow-hidden text-ellipsis whitespace-nowrap">
          <div className="p-1 rounded-md bg-amber-100 text-amber-800 shrink-0">
            {currentAlert.type === 'warning' ? (
              <AlertOctagon className="w-4 h-4 text-amber-700" />
            ) : (
              <Bell className="w-4 h-4 text-amber-700" />
            )}
          </div>
          <p className="text-xs sm:text-sm font-medium text-amber-900 truncate">
            <span className="font-bold text-amber-800 mr-1.5">[SYSTEM ANNOUNCEMENT]</span>
            {currentAlert.message}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-100/60 px-2.5 py-0.5 rounded-full border border-amber-200 shrink-0 font-medium">
            <Clock className="w-3 h-3 text-amber-700" />
            <span>{currentAlert.time}</span>
          </div>

          <button
            onClick={handleStopForMe}
            title="Dismiss announcement for your screen"
            className="p-1 rounded-md text-amber-700 hover:text-amber-900 hover:bg-amber-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
