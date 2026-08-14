// agent-notes: { ctx: "Emergency Notification Broadcast Modal with Admin-only system-wide clear authority", deps: ["src/context/AppContext.jsx", "lucide-react"], state: "active", last: "antigravity@2026-08-13" }

import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldAlert, AlertTriangle, Radio, CheckCircle2, X, StopCircle } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-rose-600/80 rounded-2xl max-w-lg w-full p-6 text-white shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 shrink-0 animate-pulse">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Emergency Broadcast Controls
            </h3>
            <p className="text-xs text-slate-400">
              Broadcast urgent notifications instantly to all Students & Coordinators.
            </p>
          </div>
        </div>

        {statusMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Admin Authority Banner to Stop Broadcast */}
        {isAdmin && hasActiveEmergency && (
          <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-600/60 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-rose-300">
              <StopCircle className="w-4 h-4 text-rose-400 animate-pulse shrink-0" />
              <span className="font-semibold">Active Emergency Broadcast is currently live.</span>
            </div>
            <button
              onClick={handleClearSystemWide}
              className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-2xs whitespace-nowrap"
            >
              Stop All System-Wide
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Broadcast Alert Severity
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSeverity('emergency')}
                className={`py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                  severity === 'emergency'
                    ? 'bg-rose-600 text-white border-rose-400 shadow-md'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Emergency</span>
              </button>

              <button
                type="button"
                onClick={() => setSeverity('warning')}
                className={`py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                  severity === 'warning'
                    ? 'bg-amber-600 text-white border-amber-400 shadow-md'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Warning</span>
              </button>

              <button
                type="button"
                onClick={() => setSeverity('info')}
                className={`py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                  severity === 'info'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Info Alert</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Alert Headline / Title</label>
            <input
              type="text"
              required
              placeholder="e.g. URGENT: Hall Evacuation Test"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-rose-500 transition"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Target Venue / Hall</label>
            <select
              value={hallNumber}
              onChange={(e) => setHallNumber(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-rose-500 transition cursor-pointer"
            >
              {halls.map((h, i) => (
                <option key={i} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Emergency Broadcast Message Body
            </label>
            <textarea
              required
              rows={3}
              placeholder="Enter urgent emergency instructions or announcement to broadcast to all active student passes and staff consoles..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-3 focus:outline-none focus:border-rose-500 transition resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition cursor-pointer text-xs uppercase tracking-wider"
          >
            <Radio className="w-4 h-4 text-white animate-pulse" />
            <span>{loading ? 'Broadcasting Emergency Alert...' : 'Send Emergency Alert to All Users'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
