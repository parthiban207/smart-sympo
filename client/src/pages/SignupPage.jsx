// agent-notes: { ctx: "Dedicated Signup Page with modern SaaS aesthetics, feature highlights, and Auth component in signup mode", deps: ["src/components/Auth.tsx", "lucide-react", "react-router-dom"], state: "active", last: "antigravity@2026-08-31" }

import { useNavigate } from 'react-router-dom';
import Auth from '../components/Auth';
import { GraduationCap, Zap, UserCheck, Sparkles, CheckCircle2 } from 'lucide-react';

export default function SignupPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-950/95 relative overflow-hidden">
      {/* Background Subtle Gradient Accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative z-10">
        {/* Left column: Student Signup Features */}
        <div className="space-y-6 hidden md:block text-left pr-4">
          <div className="space-y-3">
            <span className="text-[11px] uppercase font-bold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 tracking-wider inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Join SmartSympo</span>
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
              Create Your Digital <br />
              <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-sky-400 bg-clip-text text-transparent">
                Symposium Pass
              </span>
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed font-normal">
              Register now to generate your dynamic attendance pass, register for technical tracks with real-time clash avoidance, and stay updated.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-xs">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white">Student Registration</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  All self-registrations automatically receive Student access and dynamic event credentials.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-xs">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white">Instant Track Access</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Browse tracks, detect schedule conflicts automatically, and claim seats in real-time.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-xs">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white">Role Governance Support</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Administrators can grant Coordinator or Staff permissions from the management console.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-2 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Free Attendee Access
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Instant QR Pass
            </span>
          </div>
        </div>

        {/* Right column: Auth Form */}
        <div>
          <Auth initialMode="signup" onSuccess={() => navigate('/student')} />
        </div>
      </div>
    </div>
  );
}
