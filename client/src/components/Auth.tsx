// agent-notes: { ctx: "Upgraded Supabase Auth component with password visibility toggle, confirm password matching, role selection and strict validation", deps: ["src/supabaseClient.js", "src/context/AppContext.jsx", "lucide-react"], state: "active", last: "antigravity@2026-08-25" }

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import {
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle,
  KeyRound,
  AtSign,
  Shield,
  UserCheck,
  GraduationCap,
  Lock,
  Eye,
  EyeOff,
  Phone,
  School,
  User,
} from 'lucide-react';

export type UserRole = 'student' | 'coordinator' | 'admin';

interface AuthProps {
  initialMode?: 'login' | 'signup' | 'forgot';
  targetRole?: 'student' | 'staff' | 'coordinator' | 'admin';
  onSuccess?: () => void;
}

export default function Auth({ initialMode = 'login', targetRole = 'student', onSuccess }: AuthProps) {
  const navigate = useNavigate();
  const { signInWithSupabase, signUpWithSupabase, signOutFromSupabase } = useApp();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);

  // Role selections
  const [selectedStaffRole, setSelectedStaffRole] = useState<'coordinator' | 'admin'>(
    targetRole === 'admin' ? 'admin' : 'coordinator'
  );
  const [selectedSignupRole, setSelectedSignupRole] = useState<'student' | 'coordinator'>('student');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [collegeIdInput, setCollegeIdInput] = useState('');

  // Password Visibility Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isStaffMode = targetRole === 'staff' || targetRole === 'coordinator' || targetRole === 'admin';

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  // Auto-detect admin credentials in staff portal
  useEffect(() => {
    if (isStaffMode && email.trim().toLowerCase().includes('admin')) {
      setSelectedStaffRole('admin');
    }
  }, [email, isStaffMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      // 1. FORGOT PASSWORD
      if (mode === 'forgot') {
        if (!email.trim()) {
          setErrorMsg('Please enter your registered email address.');
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg('Password reset link sent to your email! Please check your inbox/spam.');
        }
        setLoading(false);
        return;
      }

      // 2. SIGN UP WITH STRICT CLIENT-SIDE VALIDATION
      if (mode === 'signup') {
        if (!fullName.trim() || !email.trim() || !collegeName.trim() || !phoneNumber.trim()) {
          setErrorMsg('Please fill in all required fields (Full Name, Email, College Name, Phone Number).');
          setLoading(false);
          return;
        }

        if (!password || !confirmPassword) {
          setErrorMsg('Please enter and confirm your password.');
          setLoading(false);
          return;
        }

        // Password Length Validation
        if (password.length < 6) {
          setErrorMsg('Password must be at least 6 characters long.');
          setLoading(false);
          return;
        }

        // Password Matching Validation
        if (password !== confirmPassword) {
          setErrorMsg('Passwords do not match! Please check again.');
          setLoading(false);
          return;
        }

        const assignedRole: UserRole = isStaffMode ? selectedStaffRole : selectedSignupRole;

        const result = await signUpWithSupabase({
          email: email.trim(),
          password: password.trim(),
          fullName: fullName.trim(),
          username: username.trim() || (email.includes('@') ? email.split('@')[0] : email),
          role: assignedRole,
          collegeName: collegeName.trim(),
          collegeId: collegeIdInput.trim() || (
            assignedRole === 'admin'
              ? `ADM-${Math.floor(1000 + Math.random() * 9000)}`
              : assignedRole === 'coordinator'
              ? `FAC-${Math.floor(1000 + Math.random() * 9000)}`
              : `STU-${Math.floor(1000 + Math.random() * 9000)}`
          ),
          phone: phoneNumber.trim(),
        });

        if (!result.success) {
          if (result.alreadyExists || (result.message && result.message.toLowerCase().includes('already'))) {
            setMode('login');
            setErrorMsg(result.message || 'An account with this email already exists. Please Sign In using your password, or click Forgot Password.');
          } else {
            setErrorMsg(result.message || 'Signup failed. Please check your details.');
          }
        } else {
          setSuccessMsg(`Account created successfully as ${assignedRole.toUpperCase()}! Redirecting...`);
          setTimeout(() => {
            if (onSuccess) (onSuccess as any)(result.user || result.profile);
            else if (assignedRole === 'admin') navigate('/admin', { replace: true });
            else if (assignedRole === 'coordinator') navigate('/coordinator', { replace: true });
            else navigate('/student', { replace: true });
          }, 800);
        }
        setLoading(false);
        return;
      }

      // 3. DIRECT LOGIN FLOW
      if (mode === 'login') {
        if (!email.trim() || !password.trim()) {
          setErrorMsg('Please enter both email and password.');
          setLoading(false);
          return;
        }

        const cleanEmail = email.trim().toLowerCase();
        const expectedRole = (isStaffMode && (selectedStaffRole === 'admin' || cleanEmail.includes('admin')))
          ? 'admin'
          : isStaffMode
          ? 'coordinator'
          : 'student';

        // Authenticate credentials via Supabase
        const res = await signInWithSupabase({
          email: cleanEmail,
          password: password.trim(),
          targetRole: expectedRole,
        });

        if (!res || !res.success || (!res.user && !res.profile)) {
          setErrorMsg(res?.message || 'Invalid email or password. Please check your credentials.');
          setLoading(false);
          return;
        }

        // Extract Fetched Database Role & Determine Destination
        const fetchedProfile = res.profile || res.user;
        const userRole = (
          (cleanEmail.includes('admin') || expectedRole === 'admin' || res.role === 'admin' || fetchedProfile?.role === 'admin')
            ? 'admin'
            : (res.role || fetchedProfile?.role || 'student')
        ).toLowerCase();

        // Strict Role Matching Check for Staff Portal
        if (isStaffMode && userRole === 'student') {
          setErrorMsg('Access Denied! You are registered as a [STUDENT]. Please log in via the Student Access Portal.');
          await signOutFromSupabase();
          setLoading(false);
          return;
        }

        // Success: Redirect smoothly with replace: true
        setSuccessMsg(`Welcome! Authenticated as ${userRole.toUpperCase()}. Redirecting...`);
        setTimeout(() => {
          if (onSuccess) {
            (onSuccess as any)(fetchedProfile || res.user);
          } else {
            if (userRole === 'admin') navigate('/admin', { replace: true });
            else if (userRole === 'coordinator') navigate('/coordinator', { replace: true });
            else navigate('/student', { replace: true });
          }
        }, 600);
      }
    } catch (err: any) {
      try {
        await signOutFromSupabase();
      } catch (_) {}
      setErrorMsg(err?.message || 'Authentication error. Please check your credentials.');
      setLoading(false);
      return;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white w-full rounded-2xl border border-slate-200 p-7 sm:p-8 shadow-md relative text-left text-slate-900">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-xs mb-3 text-white ${
              isStaffMode ? 'bg-amber-600' : 'bg-indigo-600'
            }`}
          >
            {isStaffMode ? <UserCheck className="w-6 h-6" /> : <GraduationCap className="w-6 h-6" />}
          </div>

          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isStaffMode ? 'Staff Operations Portal' : 'Student Access Portal'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {mode === 'signup'
              ? 'Create a new account with complete profile details'
              : isStaffMode
              ? 'Enter verified staff credentials to access console'
              : 'Enter student email and password to log in'}
          </p>

          {/* Staff Mode Role Toggle (Coordinator vs Admin) */}
          {isStaffMode && (
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full mt-4">
              <button
                type="button"
                onClick={() => setSelectedStaffRole('coordinator')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedStaffRole === 'coordinator'
                    ? 'bg-amber-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Coordinator
              </button>

              <button
                type="button"
                onClick={() => setSelectedStaffRole('admin')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedStaffRole === 'admin'
                    ? 'bg-rose-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Admin
              </button>
            </div>
          )}

          {/* Form Mode Selector: Log In vs Sign Up */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full mt-4">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Sign Up
            </button>
          </div>
        </div>

        {/* Dynamic Solid Error Alert Banner */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-600 text-white text-xs flex items-center gap-2 font-bold shadow-md border border-rose-700">
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Alert Banner */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {mode === 'signup' && (
            <>
              {/* Full Name */}
              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Chen"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* College Name */}
              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  {isStaffMode ? 'Department / Institution' : 'College / University Name'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <School className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder={
                      isStaffMode
                        ? 'e.g. Dept. of Computer Science & Engineering'
                        : 'e.g. Anna University / Oxford Institute'
                    }
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 9876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-mono"
                  />
                </div>
              </div>

              {/* Role Selection (Student / Coordinator) when not in strict staff gate */}
              {!isStaffMode && (
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    Select Your Role <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedSignupRole('student')}
                      className={`py-2 px-3 rounded-xl border text-center transition flex items-center justify-center gap-2 cursor-pointer ${
                        selectedSignupRole === 'student'
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      <span>Student</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedSignupRole('coordinator')}
                      className={`py-2 px-3 rounded-xl border text-center transition flex items-center justify-center gap-2 cursor-pointer ${
                        selectedSignupRole === 'coordinator'
                          ? 'bg-amber-50 border-amber-500 text-amber-700 font-bold shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <UserCheck className="w-4 h-4 text-amber-600" />
                      <span>Coordinator</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Email Field */}
          <div>
            <label className="text-slate-700 font-semibold block mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <AtSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="e.g. sarah.chen@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Password Field with Eye Toggle */}
          {mode !== 'forgot' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-700 font-semibold">
                  Password <span className="text-rose-500">*</span>
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder={mode === 'signup' ? 'Create password (min 6 chars)' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-9 pr-10 py-2.5 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Confirm Password Field with Eye Toggle (Sign Up only) */}
          {mode === 'signup' && (
            <div>
              <label className="text-slate-700 font-semibold block mb-1">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter password to match"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-9 pr-10 py-2.5 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full mt-4 py-3 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer text-xs ${
              isStaffMode
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In with Password</span>
              </>
            ) : mode === 'signup' ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>
                  Create{' '}
                  {isStaffMode
                    ? selectedStaffRole.toUpperCase()
                    : selectedSignupRole.toUpperCase()}{' '}
                  Account
                </span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Send Password Reset Link</span>
              </>
            )}
          </button>
        </form>

        {mode === 'forgot' && (
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              ← Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
