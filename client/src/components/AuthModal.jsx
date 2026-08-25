// agent-notes: { ctx: "Upgraded Supabase Auth modal for login and signup with password visibility toggle and confirm password matching", deps: ["src/supabaseClient.js", "src/context/AppContext.jsx", "lucide-react"], state: "active", last: "antigravity@2026-08-25" }

import { useState } from 'react';
import {
  X,
  LogIn,
  UserPlus,
  Shield,
  UserCheck,
  GraduationCap,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Phone,
  School,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function AuthModal({ isOpen, onClose }) {
  const { signUpWithSupabase, signInWithSupabase } = useApp();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    collegeName: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    collegeId: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
        if (
          !formData.fullName.trim() ||
          !formData.email.trim() ||
          !formData.collegeName.trim() ||
          !formData.phone.trim() ||
          !formData.password ||
          !formData.confirmPassword
        ) {
          setErrorMsg('Please fill in all required fields (Full Name, Email, College Name, Phone, Password).');
          setLoading(false);
          return;
        }

        if (formData.password.length < 6) {
          setErrorMsg('Password must be at least 6 characters long.');
          setLoading(false);
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          setErrorMsg('Passwords do not match! Please check again.');
          setLoading(false);
          return;
        }

        const res = await signUpWithSupabase({
          email: formData.email.trim(),
          password: formData.password.trim(),
          fullName: formData.fullName.trim(),
          role: formData.role,
          collegeName: formData.collegeName.trim(),
          collegeId: formData.collegeId.trim() || `COL-${Math.floor(1000 + Math.random() * 9000)}`,
          phone: formData.phone.trim(),
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
        if (!formData.email.trim() || !formData.password.trim()) {
          setErrorMsg('Invalid credentials. If you are a new user, please Sign Up first.');
          setLoading(false);
          return;
        }

        const res = await signInWithSupabase({
          email: formData.email.trim(),
          password: formData.password.trim(),
        });

        if (!res.success) {
          setErrorMsg(res.message || 'Invalid credentials. If you are a new user, please Sign Up first.');
        } else {
          setSuccessMsg('Signed in successfully!');
          setTimeout(() => {
            onClose();
          }, 1000);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Invalid credentials. If you are a new user, please Sign Up first.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-md rounded-2xl border border-indigo-500/30 p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
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
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'login' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'signup' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Sign Up
            </button>
          </div>
        </div>

        {/* Error / Success Feedback */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-medium">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs text-left">
          {mode === 'signup' && (
            <>
              {/* Full Name */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Chen"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* College Name */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">College / University Name</label>
                <div className="relative">
                  <School className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anna University / Oxford Institute"
                    value={formData.collegeName}
                    onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email Address */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="user@college.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Password with Eye Toggle */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder={mode === 'signup' ? 'Create password (min 6 chars)' : '••••••••'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg pl-9 pr-10 py-2 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password with Eye Toggle (Sign Up only) */}
          {mode === 'signup' && (
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter password to match"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg pl-9 pr-10 py-2 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer"
                  title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Role Selection (Sign Up only) */}
          {mode === 'signup' && (
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Select Role</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'student' })}
                  className={`py-2 px-2 rounded-lg border text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
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
                  className={`py-2 px-2 rounded-lg border text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    formData.role === 'coordinator'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Coordinator</span>
                </button>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>Processing...</span>
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In with Password</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account & Register Profile</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
