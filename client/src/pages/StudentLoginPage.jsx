// agent-notes: { ctx: "Dedicated Student Login & Signup page using Supabase Auth", deps: ["src/components/Auth.tsx", "lucide-react"], state: "active", last: "antigravity@2026-08-13" }

import { useNavigate, Link } from 'react-router-dom';
import Auth from '../components/Auth';
import { GraduationCap, QrCode, Signal, ShieldCheck, ArrowRight } from 'lucide-react';

export default function StudentLoginPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4 bg-slate-50">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left column: Student Value Props */}
        <div className="space-y-6 hidden md:block text-left">
          <div className="space-y-2">
            <span className="text-[11px] uppercase font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 tracking-wider inline-flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              Student Access Portal
            </span>
            <h1 className="text-3xl font-bold text-slate-900 leading-tight tracking-tight">
              Student Symposium <br />
              <span className="text-indigo-600">Digital Access Pass</span>
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Register for technical sessions, detect time-slot schedule clashes automatically, and generate your live anti-screenshot TOTP digital attendance pass.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0 border border-indigo-100">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">15s TOTP Refreshing Pass</h4>
                <p className="text-[11px] text-slate-500">Expiring TOTP tokens prevent screenshot sharing and enforce hall security.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0 border border-emerald-100">
                <Signal className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Instant Event Registration</h4>
                <p className="text-[11px] text-slate-500">Clash detection engine prevents double booking across simultaneous tracks.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600 shrink-0 border border-purple-100">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Supabase Secure Auth</h4>
                <p className="text-[11px] text-slate-500">Self-registration with immediate Student role credentials & profile sync.</p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Link
              to="/login/staff"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 transition-colors"
            >
              <span>Are you a Coordinator or Admin? Go to Staff Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right column: Student Auth Form */}
        <div>
          <Auth targetRole="student" initialMode="login" onSuccess={() => navigate('/student')} />
        </div>
      </div>
    </div>
  );
}
