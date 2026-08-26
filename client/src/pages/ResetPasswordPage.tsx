// agent-notes: { ctx: "Dedicated Reset Password Page listening for Supabase PASSWORD_RECOVERY event with eye toggles and secure password update", deps: ["src/supabaseClient.js", "lucide-react", "react-router-dom"], state: "active", last: "antigravity@2026-08-26" }

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase, isMockMode } from '../supabaseClient';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Loader2,
} from 'lucide-react';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [isRecoveryAuthorized, setIsRecoveryAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // 1. Listen for the Supabase PASSWORD_RECOVERY auth event
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth Recovery Event]:', event, Boolean(session));
      if (!isMounted) return;

      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setIsRecoveryAuthorized(true);
        setCheckingAuth(false);
        setErrorMsg(null);
      }
    });

    // 2. Check for PKCE ?code= param in URL or active session / hash tokens on initial mount
    const checkInitialState = async () => {
      try {
        const queryParams = new URLSearchParams(location.search);
        const code = queryParams.get('code');
        const hash = location.hash || '';

        // If PKCE exchange code is in URL
        if (code) {
          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error && data?.session) {
              if (isMounted) {
                setIsRecoveryAuthorized(true);
                setCheckingAuth(false);
                return;
              }
            }
          } catch (e) {
            console.warn('[PKCE Exchange Warning]:', e);
          }
        }

        // If recovery token in hash or existing session
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session || hash.includes('type=recovery') || hash.includes('access_token')) {
          if (isMounted) {
            setIsRecoveryAuthorized(true);
            setCheckingAuth(false);
            return;
          }
        }

        // In mock mode or dev fallback, allow access
        if (isMockMode) {
          if (isMounted) {
            setIsRecoveryAuthorized(true);
            setCheckingAuth(false);
            return;
          }
        }

        if (isMounted) {
          setCheckingAuth(false);
        }
      } catch (err) {
        console.warn('[Recovery Init Error]:', err);
        if (isMounted) setCheckingAuth(false);
      }
    };

    checkInitialState();

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validation 1: Password Length
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    // Validation 2: Passwords Match
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match! Please check and confirm your new password.');
      return;
    }

    setLoading(true);

    try {
      if (isMockMode) {
        setSuccessMsg('Password updated successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
        return;
      }

      // Execute Supabase Auth password update
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });

      if (error) {
        setErrorMsg(
          error.message ||
            'Password reset link is invalid or has expired. Please request a new reset link.'
        );
        setLoading(false);
        return;
      }

      // Update pass_code field in profiles table for synchronization
      if (data?.user?.id) {
        try {
          await supabase
            .from('profiles')
            .update({ pass_code: newPassword.trim() })
            .eq('id', data.user.id);
        } catch (e) {
          console.warn('[Profile pass_code sync warning]:', e);
        }
      }

      setSuccessMsg('Password updated successfully! Redirecting to login...');

      // Sign out recovery session and redirect to login
      setTimeout(async () => {
        try {
          await supabase.auth.signOut();
        } catch (e) {
          // ignore signout errors
        }
        navigate('/login', { replace: true });
      }, 2500);
    } catch (err: any) {
      console.error('[Reset Password Exception]:', err);
      setErrorMsg(err.message || 'An unexpected error occurred while resetting your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full">
        {/* Main Card Container */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl space-y-6 text-left relative overflow-hidden">
          {/* Top Decorative Header */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-xs">
              <KeyRound className="w-7 h-7 text-indigo-600" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              <span>Smart-Sympo Security</span>
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Reset Your Password
            </h1>

            <p className="text-xs text-slate-500 max-w-xs">
              Enter and confirm your new account password below to regain full portal access.
            </p>
          </div>

          {/* Checking Authentication Spinner */}
          {checkingAuth ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Verifying reset authorization...</p>
            </div>
          ) : !isRecoveryAuthorized && !isMockMode ? (
            /* Expired / Unauthorized Notice */
            <div className="space-y-4 pt-2 text-center">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs space-y-2">
                <AlertCircle className="w-6 h-6 text-amber-600 mx-auto" />
                <h4 className="font-bold text-sm text-amber-950">Password Reset Session Expired</h4>
                <p className="text-amber-800 leading-relaxed">
                  The recovery link you clicked is either expired or has already been used. Please request a fresh reset link.
                </p>
              </div>

              <Link
                to="/login"
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors"
              >
                <span>Request New Reset Link</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            /* Reset Password Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Success Feedback Alert */}
              {successMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2.5 font-semibold animate-fadeIn shadow-2xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Error Feedback Alert */}
              {errorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2.5 font-semibold animate-fadeIn shadow-2xs">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. New Password Field */}
              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter new password (min 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-xl pl-9 pr-10 py-2.5 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 2. Confirm New Password Field */}
              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter new password to confirm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-xl pl-9 pr-10 py-2.5 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Security Hint */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2 text-[11px] text-slate-500">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  Passwords must be at least 6 characters. Use letters, numbers, or symbols for maximum account protection.
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || Boolean(successMsg)}
                className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Save New Password & Log In</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="text-xs text-slate-500 hover:text-slate-900 font-medium inline-flex items-center gap-1 transition-colors"
                >
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
