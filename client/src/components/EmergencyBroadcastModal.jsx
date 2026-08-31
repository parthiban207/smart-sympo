// agent-notes: { ctx: "Emergency Notification Broadcast Modal with Admin-only system-wide clear authority and dark mode styling", deps: ["src/context/AppContext.jsx", "lucide-react"], state: "active", last: "antigravity@2026-08-31" }

import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldAlert, Radio, CheckCircle2, X, StopCircle } from 'lucide-react';

export default function EmergencyBroadcastModal({ isOpen, onClose }) {
  const { broadcastEmergencyAlert, clearGlobalEmergencyBroadcast, events, currentUser, liveAlerts } = useApp();
  const [title, setTitle] = useState('URGENT EMERGENCY ANNOUNCEMENT');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('emergency');
  const [hallNumber, setHallNumber] = useState('All Venues');
  const [statusMsg, setStatusMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isAdmin = currentUser?.role === 'admin';
  const hasActiveEmergency = (liveAlerts || []).some(
    (a) => a.isEmergency || a.severity === 'emergency' || a.type === 'emergency'
  );
  const halls = ['All Venues', ...Array.from(new Set(events.map((e) => e.hall_number)))];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);

    const res = await broadcastEmergencyAlert({
      title: title || 'EMERGENCY BROADCAST',
      message,
      severity,
      hallNumber,
    });

    setLoading(false);
    setStatusMsg(res.message);
    setTimeout(() => {
      setStatusMsg(null);
      setMessage('');
      onClose();
    }, 1200);
  };

  const handleClearSystemWide = async () => {
    const res = await clearGlobalEmergencyBroadcast();
    setStatusMsg(res.message);
    setTimeout(() => {
      setStatusMsg(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-7 text-white shadow-2xl space-y-6 relative animate-slideUp text-left">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-rose-600/20 text-rose-400 border border-rose-500/30 shrink-0 animate-pulse">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-white tracking-tight">
              Emergency Broadcast Controls
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Broadcast urgent notifications instantly to all Students & Venue Coordinators.
            </p>
          </div>
        </div>

        {statusMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Admin Authority Banner to Stop Broadcast */}
        {isAdmin && hasActiveEmergency && (
          <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-600/60 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-rose-300">
              <StopCircle className="w-4 h-4 text-rose-400 animate-pulse shrink-0" />
              <span className="font-semibold">Active Emergency Broadcast is currently live.</span>
            </div>
            <button
              onClick={handleClearSystemWide}
              className="py-2 px-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-2xs whitespace-nowrap active:scale-95"
            >
              Stop All System-Wide
            </button>
          </div>
        )}

        {/* Emergency Broadcast Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 font-bold block mb-1">Alert Headline / Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-rose-500 transition font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-bold block mb-1">Severity Level</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-rose-500 cursor-pointer font-medium"
              >
                <option value="emergency">🚨 Critical Emergency (Audio Siren)</option>
                <option value="warning">⚠️ Warning Announcement</option>
                <option value="info">📢 General Notice</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Target Venue</label>
              <select
                value={hallNumber}
                onChange={(e) => setHallNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-rose-500 cursor-pointer font-medium"
              >
                {halls.map((h, i) => (
                  <option key={i} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-bold block mb-1">Detailed Message / Instruction</label>
            <textarea
              required
              rows={3}
              placeholder="Enter specific instructions (e.g., immediate evacuation, venue relocation)..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-rose-500 transition resize-none font-medium leading-relaxed"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold rounded-xl shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 active:scale-98"
            >
              <Radio className="w-4 h-4" />
              <span>{loading ? 'Dispatching Broadcast...' : 'Broadcast Emergency Alert'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
