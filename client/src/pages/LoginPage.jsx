// agent-notes: { ctx: "Portal Entry Hub providing distinct login routes for Student vs Staff (Coordinator & Admin)", deps: ["lucide-react"], state: "active", last: "antigravity@2026-08-13" }

import { useNavigate } from 'react-router-dom';
import { GraduationCap, UserCheck, Shield, ArrowRight, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-80px)] py-12 px-4 bg-slate-50 flex flex-col justify-center items-center">
      <div className="max-w-4xl w-full space-y-10 text-center">
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
            Please choose the appropriate entry portal below to log in or register with your account.
          </p>
        </div>

        {/* 2 Main Separate Portal Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
          {/* Card 1: Student Portal */}
          <div
            onClick={() => navigate('/login/student')}
            className="group relative bg-white border-2 border-slate-200 hover:border-indigo-500 rounded-3xl p-8 shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-2xs">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Student Entry
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Student Portal
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-1.5 leading-relaxed">
                  Sign in or create a student account to browse sessions, claim digital passes, and track symposium schedules.
                </p>
              </div>

              <ul className="space-y-2 pt-3 text-xs text-slate-600 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <span>Browse technical & masterclass tracks</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <span>Automatic time slot clash detection</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <span>15s TOTP anti-screenshot digital pass</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              className="mt-8 w-full py-3 px-5 bg-indigo-50 group-hover:bg-indigo-600 text-indigo-700 group-hover:text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <span>Student Portal Login & Signup</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Card 2: Staff Operations Portal (Coordinator & Admin) */}
          <div
            onClick={() => navigate('/login/staff')}
            className="group relative bg-slate-900 border-2 border-slate-800 hover:border-amber-500 rounded-3xl p-8 shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between text-white"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-2xs">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shadow-2xs">
                    <Shield className="w-5 h-5" />
                  </div>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Staff Entry
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white group-hover:text-amber-400 transition-colors">
                  Staff Portal (Coordinator & Admin)
                </h3>
                <p className="text-xs font-medium text-slate-400 mt-1.5 leading-relaxed">
                  Dedicated portal for event coordinators and system administrators to verify QR passes and manage venues.
                </p>
              </div>

              <ul className="space-y-2 pt-3 text-xs text-slate-300 border-t border-slate-800">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span>Coordinator QR camera scanner & live feed</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span>Real-time postgres hall attendance streams</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  <span>Admin event management & system broadcast</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              className="mt-8 w-full py-3 px-5 bg-amber-500/20 group-hover:bg-amber-500 text-amber-300 group-hover:text-slate-950 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs border border-amber-500/30"
            >
              <span>Staff Portal Login & Signup</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
