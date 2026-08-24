// agent-notes: { ctx: "Strict Supabase Auth with DB role vs target UI role matching check to prevent role bypass vulnerability", deps: ["src/supabaseClient.js", "src/context/AppContext.jsx", "lucide-react"], state: "active", last: "antigravity@2026-08-24" }

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import { LogIn, UserPlus, AlertCircle, CheckCircle, KeyRound, AtSign, Shield, UserCheck, GraduationCap, Lock, ShieldAlert, Timer } from 'lucide-react';

export type UserRole = 'student' | 'coordinator' | 'admin';

interface AuthProps {
  initialMode?: 'login' | 'signup' | 'forgot';
  targetRole?: 'student' | 'staff' | 'coordinator' | 'admin';
  onSuccess?: () => void;
}

export default function Auth({ initialMode = 'login', targetRole = 'student', onSuccess }: AuthProps) {
  const navigate = useNavigate();
  const { signInWithSupabase, signUpWithSupabase, signOutFromSupabase, currentUser } = useApp();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [selectedStaffRole, setSelectedStaffRole] = useState<'coordinator' | 'admin'>('coordinator');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [collegeIdInput, setCollegeIdInput] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Rate Limiting & Failed Attempts Security Lockout State
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(30);

  const isStaffMode = targetRole === 'staff' || targetRole === 'coordinator' || targetRole === 'admin';

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  // Rate Limiting Lockout Countdown Timer Effect
  useEffect(() => {
    let timer: any;
    if (isLockedOut && lockoutSeconds > 0) {
      timer = setInterval(() => {
        setLockoutSeconds((prev) => prev - 1);
      }, 1000);
    } else if (lockoutSeconds === 0 && isLockedOut) {
      setIsLockedOut(false);
      setFailedAttempts(0);
      setLockoutSeconds(30);
      setErrorMsg(null);
    }
    return () => clearInterval(timer);
  }, [isLockedOut, lockoutSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // If account is currently locked out, prevent submission immediately
    if (mode === 'login' && isLockedOut) {
      setErrorMsg(`Too many failed login attempts! Account temporarily locked for ${lockoutSeconds} seconds. Please wait before trying again.`);
      return;
    }

    setLoading(true);

    try {
      // FORGOT PASSWORD
      if (mode === 'forgot') {
        if (!email.trim()) {
          setErrorMsg('Please enter your registered email address.');
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/login',
        });

        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg('Password reset link sent successfully! Check your email inbox.');
        }
        setLoading(false);
        return;
      }

      // SIGN UP
      if (mode === 'signup') {
        if (!email.trim() || !password.trim() || !fullName.trim() || !username.trim()) {
          setErrorMsg('Please complete all required signup fields.');
          setLoading(false);
          return;
        }

        const assignedRole: UserRole = isStaffMode ? selectedStaffRole : 'student';

        const result = await signUpWithSupabase({
          email,
          password,
          fullName,
          username,
          role: assignedRole,
          collegeName: collegeName.trim() || (isStaffMode ? 'Symposium Faculty Department' : 'University College Campus'),
          collegeId: collegeIdInput.trim() || (isStaffMode
            ? `${assignedRole === 'admin' ? 'ADM' : 'FAC'}-${Math.floor(1000 + Math.random() * 9000)}`
            : `STU-${Math.floor(1000 + Math.random() * 9000)}`),
          phone: phoneNumber.trim(),
        });

        if (!result.success) {
          setErrorMsg(result.message || 'Signup failed. Please check details.');
        } else {
          setSuccessMsg(`Account created as ${assignedRole.toUpperCase()}! Redirecting to dashboard...`);
          setTimeout(() => {
            if (onSuccess) onSuccess();
            else if (assignedRole === 'admin') navigate('/admin');
            else if (assignedRole === 'coordinator') navigate('/coordinator');
            else navigate('/student');
          }, 800);
        }
        setLoading(false);
        return;
      }

      // LOGIN — Strict Authentication & Database Role Matching Verification
      if (mode === 'login') {
        if (!email.trim() || !password.trim()) {
          const nextCount = failedAttempts + 1;
          setFailedAttempts(nextCount);
          if (nextCount >= 3) {
            setIsLockedOut(true);
            setLockoutSeconds(30);
            setErrorMsg('Too many failed login attempts! Account temporarily locked for 30 seconds. Please wait before trying again.');
          } else {
            setErrorMsg('Invalid Email or Password!');
          }
          setLoading(false);
          return;
        }

        const expectedRole = isStaffMode ? selectedStaffRole.toLowerCase() : 'student';

        // 1. Authenticate Email & Password using Supabase Auth (signInWithPassword)
        const res = await signInWithSupabase({ email, password, targetRole: expectedRole });

        if (!res || !res.success || (!res.user && !res.profile)) {
          const nextFailed = failedAttempts + 1;
          setFailedAttempts(nextFailed);

          if (nextFailed >= 3) {
            setIsLockedOut(true);
            setLockoutSeconds(30);
            setErrorMsg('Too many failed login attempts! Account temporarily locked for 30 seconds. Please wait before trying again.');
          } else {
            setErrorMsg(res?.message || 'Invalid Email or Password!');
          }

          setLoading(false);
          return; // STOPS ACCESS BYPASS HERE!
        }

        // 2. Extract Fetched Database Role & Determine Currently Selected UI Tab Role
        const fetchedProfile = res.profile || res.user;
        const userRole = (fetchedProfile.role || 'student').toLowerCase();

        // 3. Strict Role Matching Check
        // Compare DB role with selected tab role (e.g. 'student', 'coordinator', 'admin')
        if (userRole !== expectedRole) {
          // Allow Admin users to access Coordinator console if explicitly intended
          if (userRole === 'admin' && expectedRole === 'coordinator') {
            // Authorized admin access
          } else {
            setErrorMsg(`Access Denied! You are registered as a [${userRole.toUpperCase()}]. You cannot log in as [${expectedRole.toUpperCase()}].`);
            await signOutFromSupabase(); // Clean up session to prevent unauthorized token retention
            setLoading(false);
            return; // STOPS ROLE BYPASS VULNERABILITY HERE!
          }
        }

        // 4. Safe Navigation to Specific Role Dashboard
        setFailedAttempts(0);
        setIsLockedOut(false);
        setSuccessMsg(`Role Match Verified! Authenticated as ${userRole.toUpperCase()}. Redirecting...`);
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            if (userRole === 'admin') navigate('/admin');
            else if (userRole === 'coordinator') navigate('/coordinator');
            else navigate('/student');
          }
        }, 600);
      }
    } catch (err: any) {
      const nextFailed = failedAttempts + 1;
      setFailedAttempts(nextFailed);
      if (nextFailed >= 3) {
        setIsLockedOut(true);
        setLockoutSeconds(30);
        setErrorMsg('Too many failed login attempts! Account temporarily locked for 30 seconds. Please wait before trying again.');
      } else {
        setErrorMsg('Invalid Email or Password!');
      }
      setLoading(false);
      return;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white w-full rounded-2xl border border-slate-200 p-8 shadow-md relative text-left text-slate-900">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-xs mb-3 text-white ${isStaffMode ? 'bg-amber-600' : 'bg-indigo-600'}`}>
            {isStaffMode ? <UserCheck className="w-6 h-6" /> : <GraduationCap className="w-6 h-6" />}
          </div>

          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isStaffMode ? 'Staff Operations Portal' : 'Student Access Portal'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isStaffMode
              ? 'Enter correct staff credentials to log in'
              : 'Enter correct student username/email and password to log in'}
          </p>

          {/* Staff Role Selector Toggle (Coordinator vs Admin) */}
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
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Log In
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
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

        {/* Temporary Lockout Alert Banner */}
        {isLockedOut && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-600 text-white text-xs flex items-start gap-2.5 shadow-md border border-rose-700 animate-pulse">
            <ShieldAlert className="w-5 h-5 text-white shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Account Security Lockout Active</h4>
              <p className="mt-0.5 leading-relaxed text-rose-100">
                Too many failed login attempts! Account temporarily locked for{' '}
                <span className="font-mono font-extrabold underline">{lockoutSeconds}s</span>. Please wait before trying again.
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Solid Error Alert Banner */}
        {!isLockedOut && errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-600 text-white text-xs flex items-center gap-2 font-bold shadow-md border border-rose-700">
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

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
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Chen"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Username</label>
                <div className="relative">
                  <AtSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="sarah_chen"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  {isStaffMode ? 'Department / Institution' : 'College / University Name'}
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder={isStaffMode ? 'e.g. Dept. of Computer Science & Engineering' : 'e.g. Anna University / Oxford Institute'}
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    {isStaffMode ? 'Staff ID (Optional)' : 'College Roll / Student ID'}
                  </label>
                  <input
                    type="text"
                    placeholder={isStaffMode ? 'e.g. FAC-2024' : 'e.g. 2024-CS-101'}
                    value={collegeIdInput}
                    onChange={(e) => setCollegeIdInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 9876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-mono"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-slate-700 font-semibold block mb-1">Email Address or Username</label>
            <input
              type="text"
              required
              disabled={isLockedOut}
              placeholder="Enter your registered email / username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all disabled:opacity-60"
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-700 font-semibold">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMsg(null);
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
                  type="password"
                  required
                  disabled={isLockedOut}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-mono disabled:opacity-60"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || isLockedOut}
            className={`w-full mt-4 py-3 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer text-xs ${
              isLockedOut
                ? 'bg-slate-700 hover:bg-slate-700'
                : isStaffMode
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isLockedOut ? (
              <>
                <Timer className="w-4 h-4 text-amber-300 animate-spin" />
                <span>Account Temporarily Locked ({lockoutSeconds}s)</span>
              </>
            ) : loading ? (
              <span>Authenticating Credentials...</span>
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Log In with Password</span>
              </>
            ) : mode === 'signup' ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create {isStaffMode ? selectedStaffRole.toUpperCase() : 'STUDENT'} Account</span>
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
              onClick={() => setMode('login')}
              className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              ← Back to Log In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
