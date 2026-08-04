// agent-notes: { ctx: "Dedicated Login Page with feature highlights and Auth component in login mode", deps: ["src/components/Auth.tsx", "lucide-react"], state: "active", last: "antigravity@2026-07-31" }

import { useNavigate } from 'react-router-dom';
import Auth from '../components/Auth';
import { ShieldCheck, QrCode, Signal, Calendar } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4 bg-slate-50">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left column: App Value Props */}
        <div className="space-y-6 hidden md:block text-left">
          <div className="space-y-2">
            <span className="text-[11px] uppercase font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 tracking-wider">
              Smart Coordinator Platform
            </span>
            <h1 className="text-3xl font-bold text-slate-900 leading-tight tracking-tight">
              Welcome Back to <br />
              <span className="text-indigo-600">
                Smart Coordinator
              </span>
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Multi-venue event routing, dynamic anti-screenshot QR digital passes, real-time hall occupancy analytics, and automated attendance logging.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0 border border-indigo-100">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Dynamic Refreshing QR Pass</h4>
                <p className="text-[11px] text-slate-500">15-second expiring TOTP tokens prevent screenshot sharing and enforce venue security.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0 border border-emerald-100">
                <Signal className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Realtime Attendance Stream</h4>
                <p className="text-[11px] text-slate-500">PostgreSQL changes listener updates hall entries instantly without refreshing.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0 border border-amber-100">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Role-Based Access Guard</h4>
                <p className="text-[11px] text-slate-500">Strict PIN/password re-authentication on every role-sensitive tab transition.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Auth Form */}
        <div>
          <Auth initialMode="login" onSuccess={() => navigate('/student')} />
        </div>
      </div>
    </div>
  );
}
