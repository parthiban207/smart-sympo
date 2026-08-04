// agent-notes: { ctx: "Pass code PIN verification modal guard for admins and coordinators viewing student passes", deps: ["src/supabaseClient.ts", "lucide-react"], state: "active", last: "antigravity@2026-07-31" }

import { useState } from 'react';
import { X, Lock, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase, isMockMode } from '../supabaseClient';

export default function PassCodeGuardModal({ isOpen, onClose, studentId, studentName, onSuccess }) {
  const [passCode, setPassCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleVerify = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    if (!passCode) {
      setErrorMsg('Please enter student pass PIN.');
      setLoading(false);
      return;
    }

    try {
      if (isMockMode) {
        // Default demo PIN is 2005
        if (passCode === '2005' || passCode.length >= 4) {
          setSuccessMsg('Pass code verified!');
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 600);
        } else {
          setErrorMsg('Invalid Pass Code. Access Denied.');
        }
        setLoading(false);
        return;
      }

      // Call Supabase RPC verify_student_pass_code
      const { data: isValid, error } = await supabase.rpc('verify_student_pass_code', {
        p_student_id: studentId,
        p_pass_code: passCode,
      });

      if (error) {
        // Direct query fallback if RPC is pending
        const { data: profile } = await supabase
          .from('profiles')
          .select('pass_code')
          .eq('id', studentId)
          .single();

        if (profile && profile.pass_code === passCode) {
          setSuccessMsg('Pass code verified!');
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 600);
        } else {
          setErrorMsg('Invalid Pass Code. Access Denied.');
        }
      } else if (isValid) {
        setSuccessMsg('Pass code verified!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 600);
      } else {
        setErrorMsg('Invalid Pass Code. Access Denied.');
      }
    } catch (err) {
      setErrorMsg('Invalid Pass Code. Access Denied.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-sm rounded-2xl border border-slate-200 p-6 shadow-2xl relative text-center text-slate-900">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mb-2 shadow-2xs">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Student Pass Verification Guard</h3>
          <p className="text-xs text-slate-500 mt-1">
            Enter Student Pass PIN / Password to View Pass for{' '}
            <span className="text-amber-800 font-semibold">{studentName || 'Student'}</span>
          </p>
        </div>

        {/* Notifications */}
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

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="password"
              maxLength={6}
              required
              placeholder="Enter 4-digit PIN (e.g. 2005)"
              value={passCode}
              onChange={(e) => setPassCode(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-center tracking-widest text-lg font-mono rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Verifying PIN...' : 'Verify & Unlock Pass'}
          </button>
        </form>
      </div>
    </div>
  );
}
