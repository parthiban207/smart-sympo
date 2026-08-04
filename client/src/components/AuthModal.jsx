// agent-notes: { ctx: "Supabase Auth modal for login and signup with profile linking", deps: ["src/supabaseClient.js", "src/context/AppContext.jsx", "lucide-react"], state: "active", last: "antigravity@2026-07-31" }

import { useState } from 'react';
import { X, LogIn, UserPlus, Shield, UserCheck, GraduationCap, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function AuthModal({ isOpen, onClose }) {
  const { signUpWithSupabase, signInWithSupabase } = useApp();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'student',
    collegeId: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!formData.fullName || !formData.email || !formData.password || !formData.collegeId) {
          setErrorMsg('Please fill in all required fields.');
          setLoading(false);
          return;
        }

        const res = await signUpWithSupabase({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          role: formData.role,
          collegeId: formData.collegeId,
        });

        if (!res.success) {
          setErrorMsg(res.message);
        } else {
          setSuccessMsg('Account created successfully! Profile linked to Supabase.');
          setTimeout(() => {
            onClose();
          }, 1200);
        }
      } else {
        if (!formData.email || !formData.password) {
          setErrorMsg('Please enter your email and password.');
          setLoading(false);
          return;
        }

        const res = await signInWithSupabase({
          email: formData.email,
          password: formData.password,
        });

        if (!res.success) {
          setErrorMsg(res.message);
        } else {
          setSuccessMsg('Signed in successfully!');
          setTimeout(() => {
            onClose();
          }, 1000);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-md rounded-2xl border border-indigo-500/30 p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header & Tabs */}
        <div className="text-center mb-5">
          <h3 className="text-xl font-bold text-white tracking-tight">SmartSympo Authentication</h3>
          <p className="text-xs text-slate-400 mt-1">Supabase Auth & Automatic Profile Linking</p>

          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 mt-4">
            <button
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                mode === 'signup'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Sign Up
            </button>
          </div>
        </div>

        {/* Error / Success Feedback */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {mode === 'signup' && (
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Alex Rivera"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="user@college.edu"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {mode === 'signup' && (
            <>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">College ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS2026-8941"
                  value={formData.collegeId}
                  onChange={(e) => setFormData({ ...formData, collegeId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Select Role</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'student' })}
                    className={`py-2 px-2 rounded-lg border text-center transition flex flex-col items-center gap-1 ${
                      formData.role === 'student'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>Student</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'coordinator' })}
                    className={`py-2 px-2 rounded-lg border text-center transition flex flex-col items-center gap-1 ${
                      formData.role === 'coordinator'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Coordinator</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'admin' })}
                    className={`py-2 px-2 rounded-lg border text-center transition flex flex-col items-center gap-1 ${
                      formData.role === 'admin'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin</span>
                  </button>
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {loading ? (
              <span>Processing...</span>
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In to SmartSympo</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account & Link Profile</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
