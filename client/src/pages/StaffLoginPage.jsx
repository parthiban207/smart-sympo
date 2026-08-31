// agent-notes: { ctx: "Dedicated Staff Login page with masked 2005 Security Passcode Gate and refined dark mode SaaS theme", deps: ["src/components/Auth.tsx", "lucide-react"], state: "active", last: "antigravity@2026-08-31" }

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Auth from '../components/Auth';
import { UserCheck, Shield, QrCode, Signal, ArrowRight, Lock, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function StaffLoginPage({ defaultRole = 'coordinator' }) {
  const navigate = useNavigate();
  const isAdminPortal = defaultRole === 'admin';
  const [passcode, setPasscode] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handlePasscodeSubmit = (e) => {
    e.preventDefault();
    if (passcode.trim() === '2005') {
      setIsUnlocked(true);
      setErrorMsg(null);
    } else {
      setErrorMsg('Invalid Staff Security Code. Access Restricted.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-950 text-white">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* Left column: Staff Value Props & Security Info */}
        <div className="space-y-6 hidden md:block text-left">
          <div className="space-y-2.5">
            <span className={`text-[11px] uppercase font-bold px-3 py-1 rounded-full tracking-wider inline-flex items-center gap-1.5 shadow-2xs ${
              isAdminPortal
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {isAdminPortal ? <Shield className="w-3.5 h-3.5 text-rose-400" /> : <UserCheck className="w-3.5 h-3.5 text-amber-400" />}
              {isAdminPortal ? 'Admin Portal' : 'Staff Portal'}
            </span>
            <h1 className="text-3xl font-extrabold text-white leading-tight tracking-tight">
              {isAdminPortal ? (
                <>
                  System Administrator <br />
                  <span className="text-rose-400">Admin Dashboard</span>
                </>
              ) : (
                <>
                  Event Coordinator <br />
                  <span className="text-amber-400">Coordinator Console</span>
                </>
              )}
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isAdminPortal
                ? 'Manage events, track live attendance, and oversee attendees.'
                : 'Scan and verify student attendance in real time.'}
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 shrink-0 border border-amber-500/30">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white">Coordinator QR Scanner</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">Fast scanning and verification of student attendance passes.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0 border border-emerald-500/30">
                <Signal className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white">Realtime Emergency Alerts</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">Broadcast urgent notifications to all students & venue coordinators.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
              <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 shrink-0 border border-rose-500/30">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white">Security Passcode Protection</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">Restricted staff security gate preventing unauthorized access.</p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Link
              to="/login/student"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1.5 transition-colors group"
            >
              <span>Are you a Student? Go to Student Access Portal</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Right column: Masked Security Passcode Gate OR Staff Auth */}
        <div>
          {!isUnlocked ? (
            <div className="w-full max-w-md mx-auto">
              <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 shadow-2xl text-left text-white space-y-6">
                <div className="flex flex-col items-center text-center space-y-2.5">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-inner">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Staff Security Gate
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Enter the authorized staff security code (Default: 2005) to unlock Coordinator & Admin login.
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 font-medium">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handlePasscodeSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                      Security Gate Passcode
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="password"
                        required
                        placeholder="••••"
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-amber-400 transition-all font-mono tracking-widest text-center text-lg shadow-inner"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all text-xs cursor-pointer active:scale-98"
                  >
                    <span>Verify Passcode</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="text-center pt-2 border-t border-slate-800/80">
                  <Link to="/login/student" className="text-xs text-slate-400 hover:text-white transition">
                    ← Back to Student Portal
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-emerald-500/15 border border-emerald-500/30 p-3.5 rounded-2xl text-emerald-300 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Security Code Verified. Staff Portal Unlocked.</span>
                </div>
                <button
                  onClick={() => setIsUnlocked(false)}
                  className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Lock
                </button>
              </div>

              <Auth
                targetRole={isAdminPortal ? 'admin' : 'staff'}
                initialMode="login"
                onSuccess={(user) => {
                  const role = (user?.role || '').toLowerCase();
                  if (role === 'admin') {
                    navigate('/admin', { replace: true });
                  } else if (role === 'coordinator') {
                    navigate('/coordinator', { replace: true });
                  } else {
                    navigate('/student', { replace: true });
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
