// agent-notes: { ctx: "Portal Entry Hub providing distinct login routes for Student, Coordinator, and Administrator", deps: ["lucide-react"], state: "active", last: "antigravity@2026-08-28" }

import { useNavigate } from 'react-router-dom';
import { GraduationCap, UserCheck, Shield, ArrowRight, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-80px)] py-12 px-4 bg-slate-50 flex flex-col justify-center items-center">
      <div className="max-w-6xl w-full space-y-10 text-center">
        {/* Header Banner */}
        <div className="space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Smart Coordinator Portal Access</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Select Your <span className="text-indigo-600">Access Portal</span>
          </h1>

          <p className="text-sm text-slate-600 leading-relaxed">
            Please choose your designated entry portal below to sign in or access your governance console.
          </p>
        </div>

        {/* 3 Main Dedicated Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* Card 1: Student Portal */}
          <div
            onClick={() => navigate('/login/student')}
            className="group relative bg-white border-2 border-slate-200 hover:border-indigo-500 rounded-3xl p-6 shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-2xs">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Student Entry
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Student Portal
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Browse tracks, claim dynamic passes, and monitor your attendance status.
                </p>
              </div>

              <ul className="space-y-2 pt-3 text-xs text-slate-600 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <span>15s TOTP anti-screenshot pass</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <span>Clash detection scheduling</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <span>Self-service registration</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              className="mt-6 w-full py-2.5 px-4 bg-indigo-50 group-hover:bg-indigo-600 text-indigo-700 group-hover:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <span>Student Sign In</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Card 2: Coordinator Portal */}
          <div
            onClick={() => navigate('/login/staff')}
            className="group relative bg-slate-900 border-2 border-slate-800 hover:border-amber-500 rounded-3xl p-6 shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between text-white"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-2xs">
                  <UserCheck className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Coordinator
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                  Coordinator Console
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Hall validation, camera attendance scanning, and attendee check-ins.
                </p>
              </div>

              <ul className="space-y-2 pt-3 text-xs text-slate-300 border-t border-slate-800">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span>Instant QR camera scanner</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span>Live hall attendance feed</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span>Passcode verification fallback</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              className="mt-6 w-full py-2.5 px-4 bg-amber-500/20 group-hover:bg-amber-500 text-amber-300 group-hover:text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs border border-amber-500/30"
            >
              <span>Coordinator Login</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Card 3: Administrator Portal */}
          <div
            onClick={() => navigate('/login/admin')}
            className="group relative bg-slate-900 border-2 border-slate-800 hover:border-rose-500 rounded-3xl p-6 shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between text-white"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shadow-2xs">
                  <Shield className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Admin Authority
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-rose-400 transition-colors">
                  Administrator Hub
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  System analytics, user permissions, emergency broadcast & audits.
                </p>
              </div>

              <ul className="space-y-2 pt-3 text-xs text-slate-300 border-t border-slate-800">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  <span>Full user & role management</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  <span>Emergency broadcast alert</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  <span>Multi-sheet Excel exports</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              className="mt-6 w-full py-2.5 px-4 bg-rose-500/20 group-hover:bg-rose-500 text-rose-300 group-hover:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs border border-rose-500/30"
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
