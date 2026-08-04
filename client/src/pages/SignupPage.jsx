// agent-notes: { ctx: "Dedicated Signup Page with feature highlights and Auth component in signup mode", deps: ["src/components/Auth.tsx", "lucide-react"], state: "active", last: "antigravity@2026-07-31" }

import { useNavigate } from 'react'
import Auth from '../components/Auth';
import { GraduationCap, ShieldCheck, Zap, UserCheck } from 'lucide-react';

export default function SignupPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4 bg-slate-950">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left column: Student Signup Features */}
        <div className="space-y-6 hidden md:block text-left">
          <div className="space-y-2">
            <span className="text-xs uppercase font-extrabold px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 tracking-wider">
              Join SmartSympo Platform
            </span>
            <h1 className="text-3xl font-black text-white leading-tight">
              Create Your Digital <br />
              <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
                Student Cyber Pass
              </span>
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Register now to generate your live symposium attendance pass, register for technical sessions without schedule clashes, and receive real-time hall updates.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white">Student Registration</h4>
                <p className="text-[11px] text-slate-400">All self-registrations automatically receive Student access credentials.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white">Instant Event Access</h4>
                <p className="text-[11px] text-slate-400">Browse sessions, detect time slot conflicts automatically, and claim seats.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white">Role Promotion Support</h4>
                <p className="text-[11px] text-slate-400">Administrators can grant Coordinator or Admin permissions from the governance console.</p>
              </div>
            </div>
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
