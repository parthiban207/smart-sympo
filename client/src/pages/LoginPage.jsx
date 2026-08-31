// agent-notes: { ctx: "Portal Entry Hub providing distinct SaaS login pathways for Student, Coordinator, and Administrator", deps: ["lucide-react"], state: "active", last: "antigravity@2026-08-31" }

import { useNavigate } from 'react-router-dom';
import { GraduationCap, UserCheck, Shield, ArrowRight, Sparkles, Check } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-64px)] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center relative overflow-hidden">
      <div className="max-w-6xl w-full space-y-10 text-center relative z-10">
        {/* Header Banner */}
        <div className="space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#8B1E24]/10 border border-[#8B1E24]/20 text-[#8B1E24] dark:text-red-300 text-xs font-bold uppercase tracking-wider font-mono">
            <Sparkles className="w-3.5 h-3.5 text-[#8B1E24] dark:text-red-400" />
            <span>Event Management Portal</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#1E293B] dark:text-white tracking-tight leading-tight">
            Select Your <span className="text-[#8B1E24] dark:text-red-400">Access Portal</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl mx-auto font-medium">
            Select your portal below to browse events, verify passes, or manage operations.
          </p>
        </div>

        {/* 3 Main Dedicated Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 text-left">
          {/* Card 1: Student Portal */}
          <div
            onClick={() => navigate('/login/student')}
            className="group relative bg-white border border-slate-200 hover:border-indigo-500 rounded-3xl p-7 shadow-xs hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xs group-hover:scale-105">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Student Entry
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Student Portal
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Browse events, get your digital pass, and view your schedule.
                </p>
              </div>

              <ul className="space-y-2.5 pt-4 text-xs text-slate-600 border-t border-slate-100">
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>15s TOTP anti-screenshot pass</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>Automatic clash detection</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>Self-service track registration</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              className="mt-8 w-full py-3 px-4 bg-indigo-50 group-hover:bg-indigo-600 text-indigo-700 group-hover:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <span>Student Sign In</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Card 2: Coordinator Portal */}
          <div
            onClick={() => navigate('/login/staff')}
            className="group relative bg-slate-900 border border-slate-800 hover:border-amber-400 rounded-3xl p-7 shadow-md hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 cursor-pointer flex flex-col justify-between text-white"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shadow-2xs group-hover:scale-105">
                  <UserCheck className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Coordinator
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                  Coordinator Console
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Scan and verify student attendance in real time.
                </p>
              </div>

              <ul className="space-y-2.5 pt-4 text-xs text-slate-300 border-t border-slate-800">
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>Instant QR scanner</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>Live attendance tracking</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>Passcode verification fallback</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              className="mt-8 w-full py-3 px-4 bg-amber-500/20 group-hover:bg-amber-500 text-amber-300 group-hover:text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs border border-amber-500/30"
            >
              <span>Coordinator Login</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Card 3: Administrator Portal */}
          <div
            onClick={() => navigate('/login/admin')}
            className="group relative bg-slate-900 border border-slate-800 hover:border-rose-400 rounded-3xl p-7 shadow-md hover:shadow-2xl hover:shadow-rose-500/10 transition-all duration-300 cursor-pointer flex flex-col justify-between text-white"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all shadow-2xs group-hover:scale-105">
                  <Shield className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Admin Authority
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-rose-400 transition-colors">
                  Admin Dashboard
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Manage events, live attendance, and user permissions.
                </p>
              </div>

              <ul className="space-y-2.5 pt-4 text-xs text-slate-300 border-t border-slate-800">
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>Full user & role governance</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>Emergency audio siren broadcast</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>Multi-sheet Excel & PDF exports</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              className="mt-8 w-full py-3 px-4 bg-rose-500/20 group-hover:bg-rose-500 text-rose-300 group-hover:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs border border-rose-500/30"
            >
              <span>Admin Sign In</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
