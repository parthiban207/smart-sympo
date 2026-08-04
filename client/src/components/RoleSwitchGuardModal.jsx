// agent-notes: { ctx: "Mandatory PIN/password verification modal with dual fallback (password or Security PIN 2005)", deps: ["src/supabaseClient.ts", "lucide-react"], state: "active", last: "antigravity@2026-07-31" }

import { useState } from 'react';
import { X, ShieldAlert, KeyRound, AlertCircle, CheckCircle2, Fingerprint } from 'lucide-react';
import { supabase, isMockMode, isValidUUID } from '../supabaseClient';

/**
 * RoleSwitchGuardModal
 * 
 * Prompts for password/PIN verification EVERY TIME a user navigates
 * to a role-restricted view (Coordinator or Admin).
 * 
 * Accepts:
 * 1. User's account password (via Supabase Auth)
 * 2. Security PIN (default: 2005, or pass_code from profiles table)
 */
export default function RoleSwitchGuardModal({
  isOpen,
  onClose,
  targetRole,
  userEmail,
  userId,
  onSuccess,
}) {
  const [credential, setCredential] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [mode, setMode] = useState('password');

  if (!isOpen) return null;

  const handleVerify = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    if (!credential) {
      setErrorMsg('Please enter your password or Security PIN (2005).');
      setLoading(false);
      return;
    }

    try {
      if (isMockMode || !isValidUUID(userId)) {
        if (credential === '2005' || credential.length >= 4) {
          setSuccessMsg('Identity verified! Unlocking access...');
          setTimeout(() => {
            onSuccess();
            resetAndClose();
          }, 500);
        } else {
          setErrorMsg('Invalid credentials. Access denied.');
        }
        setLoading(false);
        return;
      }

      let isVerified = false;

      // 1. If input is 2005 or 4-digit numeric PIN, verify via PIN first
      if (credential === '2005' || (mode === 'pin' && credential.length >= 4)) {
        if (credential === '2005') {
          isVerified = true;
        } else {
          // Check RPC or profiles table
          try {
            const { data } = await supabase.rpc('verify_student_pass_code', {
              p_student_id: userId,
              p_pass_code: credential,
            });
            if (data) isVerified = true;
          } catch {
            // direct check
          }

          if (!isVerified) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('pass_code')
              .eq('id', userId)
              .single();
            if (profile && (profile.pass_code === credential || profile.pass_code === '2005')) {
              isVerified = true;
            }
          }
        }
      }

      // 2. If not verified via PIN and in password mode, try Supabase Auth Password
      if (!isVerified && mode === 'password') {
        const { error } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: credential,
        });

        if (!error) {
          isVerified = true;
        }
      }

      // 3. Fallback PIN check if mode was password but user typed 2005 or PIN
      if (!isVerified) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('pass_code')
          .eq('id', userId)
          .single();

        if (profile && (profile.pass_code === credential || credential === '2005')) {
          isVerified = true;
        }
      }

      if (isVerified) {
        setSuccessMsg('Verification successful! Access granted.');
        setTimeout(() => {
          onSuccess();
          resetAndClose();
        }, 500);
      } else {
        setErrorMsg('Invalid password or Security PIN (2005). Access denied.');
      }
    } catch {
      setErrorMsg('Verification failed. Please enter PIN: 2005 or your password.');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setCredential('');
    setErrorMsg(null);
    setSuccessMsg(null);
    setMode('password');
    onClose();
  };

  const roleColorMap = {
    coordinator: {
      accent: 'amber',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      btn: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      label: 'Coordinator Dashboard',
    },
    admin: {
      accent: 'indigo',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      text: 'text-indigo-700',
      btn: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      label: 'Admin Control Panel',
    },
  };

  const colors = roleColorMap[targetRole] || roleColorMap.coordinator;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-sm rounded-2xl border border-slate-200 p-6 shadow-2xl relative text-center text-slate-900">
        {/* Close Button */}
        <button
          onClick={resetAndClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon */}
        <div className="flex flex-col items-center mb-5">
          <div className={`w-12 h-12 rounded-xl ${colors.bg} border ${colors.border} ${colors.text} flex items-center justify-center mb-3 shadow-2xs`}>
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Security Verification Required
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Authenticate to access{' '}
            <span className={`${colors.text} font-bold`}>{colors.label}</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Enter your account password or Security PIN: <strong className="text-amber-700 font-mono">2005</strong>
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1 mb-4 border border-slate-200">
          <button
            type="button"
            onClick={() => { setMode('password'); setCredential(''); setErrorMsg(null); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'password'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 inline mr-1" />
            Password
          </button>
          <button
            type="button"
            onClick={() => { setMode('pin'); setCredential(''); setErrorMsg(null); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'pin'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5 inline mr-1" />
            Security PIN (2005)
          </button>
        </div>

        {/* Error / Success Messages */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Credential Input */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="relative">
            {mode === 'password' ? (
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            ) : (
              <Fingerprint className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            )}
            <input
              type="password"
              required
              maxLength={mode === 'pin' ? 6 : 64}
              placeholder={mode === 'password' ? 'Enter password or PIN 2005' : 'Enter PIN: 2005'}
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              className={`w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all ${
                mode === 'pin' ? 'text-center tracking-[0.3em] text-lg font-mono' : 'text-xs'
              }`}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 ${colors.btn} font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
                </svg>
                Verifying...
              </span>
            ) : (
              `Verify & Access ${colors.label}`
            )}
          </button>
        </form>

        {/* Security Notice & Quick PIN Hint */}
        <p className="text-[11px] text-slate-500 mt-4 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          🔑 <strong>Quick Access:</strong> Enter Security PIN <span className="text-amber-800 font-mono font-bold">2005</span> or account password.
        </p>
      </div>
    </div>
  );
}
