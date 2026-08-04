import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isMockMode } from '../supabaseClient';
import { useApp } from '../context/AppContext';
import { LogIn, UserPlus, AlertCircle, CheckCircle, KeyRound, Wifi, AtSign, Shield, UserCheck, GraduationCap } from 'lucide-react';

export type UserRole = 'student' | 'coordinator' | 'admin';

interface AuthProps {
  initialMode?: 'login' | 'signup' | 'forgot';
  onSuccess?: () => void;
}

export default function Auth({ initialMode = 'login', onSuccess }: AuthProps) {
  const navigate = useNavigate();
  const { switchRole, signInWithSupabase, currentUser } = useApp();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  const handleRoleQuickLogin = (targetRole: UserRole) => {
    switchRole(targetRole);
    setSuccessMsg(`Switched role to ${targetRole.toUpperCase()}! Redirecting...`);
    setTimeout(() => {
      if (targetRole === 'admin') navigate('/admin');
      else if (targetRole === 'coordinator') navigate('/coordinator');
      else navigate('/student');
    }, 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'forgot') {
        if (!email) {
          setErrorMsg('Please enter your email address.');
          setLoading(false);
          return;
        }

        if (isMockMode) {
          setSuccessMsg('Password reset link sent to your email (Demo Mode).');
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });

        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg('Password reset link sent! Check your inbox.');
        }
        setLoading(false);
        return;
      }

      if (mode === 'signup') {
        if (!email || !password || !fullName || !username) {
          setErrorMsg('Please fill in all required fields.');
          setLoading(false);
          return;
        }

        if (isMockMode) {
          setSuccessMsg(`Account created for ${fullName} (@${username}) as student!`);
          setTimeout(() => {
            if (onSuccess) onSuccess();
            else navigate('/student');
          }, 1000);
          setLoading(false);
          return;
        }

        const cleanUsername = username.replace('@', '').trim();
        const generatedCollegeId = `STU-${Math.floor(1000 + Math.random() * 9000)}`;

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              name: fullName,
              username: cleanUsername,
              role: 'student',
              college_id: generatedCollegeId,
            },
          },
        });

        if (error) {
          setErrorMsg(error.message);
        } else {
          if (data?.user) {
            const { error: profileErr } = await supabase.from('profiles').upsert([
              {
                id: data.user.id,
                name: fullName,
                email: email,
                role: 'student',
                college_id: generatedCollegeId,
              },
            ]);
            if (profileErr) {
              console.error('[Profile Upsert Error]', profileErr);
            }
          }
          setSuccessMsg('Student account created successfully! Welcome to SmartSympo.');
          setTimeout(() => {
            if (onSuccess) onSuccess();
            else navigate('/student');
          }, 1000);
        }
      } else {
        // LOGIN
        if (!email || !password) {
          setErrorMsg('Please enter email and password.');
          setLoading(false);
          return;
        }

        const res = await signInWithSupabase({ email, password });
        if (!res.success) {
          setErrorMsg(res.message);
        } else {
          setSuccessMsg('Signed in successfully!');
          setTimeout(() => {
            if (onSuccess) {
              onSuccess();
            } else {
              const role = currentUser?.role || 'student';
              if (role === 'admin') navigate('/admin');
              else if (role === 'coordinator') navigate('/coordinator');
              else navigate('/student');
            }
          }, 1000);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white w-full rounded-2xl border border-slate-200 p-8 shadow-sm relative text-left text-slate-900">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xs mb-3 text-white">
            <Wifi className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Smart Coordinator</h2>
          <p className="text-xs text-slate-500 mt-1">Multi-Venue Smart Routing & Access Platform</p>

          {/* Form Mode Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full mt-5">
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

        {/* Multi-Role Demo Quick Login Bar */}
        {mode === 'login' && (
          <div className="mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <p className="text-[11px] font-bold text-slate-600 mb-2 uppercase tracking-wider text-center">
              Quick Role Login Demo
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleRoleQuickLogin('student')}
                className="py-2 px-1.5 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-indigo-700 text-center font-bold text-[11px] flex flex-col items-center gap-1 transition-all cursor-pointer shadow-2xs"
              >
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                <span>Student</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleQuickLogin('coordinator')}
                className="py-2 px-1.5 rounded-lg bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-amber-700 text-center font-bold text-[11px] flex flex-col items-center gap-1 transition-all cursor-pointer shadow-2xs"
              >
                <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Coordinator</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleQuickLogin('admin')}
                className="py-2 px-1.5 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-rose-700 text-center font-bold text-[11px] flex flex-col items-center gap-1 transition-all cursor-pointer shadow-2xs"
              >
                <Shield className="w-3.5 h-3.5 text-rose-600" />
                <span>Admin</span>
              </button>
            </div>
          </div>
        )}

        {/* Notifications */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
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
            </>
          )}

          <div>
            <label className="text-slate-700 font-semibold block mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="user@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
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
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer text-xs"
          >
            {loading ? (
              <span>Processing...</span>
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Log In to Dashboard</span>
              </>
            ) : mode === 'signup' ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Student Account</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Send Reset Link</span>
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
