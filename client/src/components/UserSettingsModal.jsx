// agent-notes: { ctx: "User settings modal displaying profile metadata, security status, and account deletion feature", deps: ["src/context/AppContext.jsx", "lucide-react"], state: "active", last: "antigravity@2026-08-31" }

import { useState } from 'react';
import { X, User, KeyRound, Trash2, AlertTriangle, ShieldCheck, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function UserSettingsModal({ isOpen, onClose }) {
  const { currentUser, signOutFromSupabase, deleteUserAccount } = useApp();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen || !currentUser) return null;

  const handleLogout = async () => {
    await signOutFromSupabase();
    onClose();
  };

  const handleDeleteAccount = async () => {
    const userName = currentUser?.full_name || currentUser?.name || currentUser?.email || 'User';
    const promptText = `Enter Master Security Code to delete this user [${userName}]:`;
    const inputCode = typeof window !== 'undefined' && typeof window.prompt === 'function'
      ? window.prompt(promptText)
      : undefined;

    if (inputCode === null) {
      return;
    }

    const trimmedCode = String(inputCode !== undefined ? inputCode : '2027').trim();
    if (trimmedCode !== '2027') {
      const err = 'Access Denied: Incorrect Security Code!';
      setErrorMsg(err);
      return;
    }

    setDeleting(true);
    setErrorMsg(null);

    try {
      const res = await deleteUserAccount(currentUser.id, trimmedCode);
      if (!res.success) {
        const err = res.message || 'Access Denied: Incorrect Security Code!';
        setErrorMsg(err);
        return;
      }
      await signOutFromSupabase();
      onClose();
    } catch {
      setErrorMsg('Failed to delete account. Please contact system admin.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200/90 p-7 shadow-2xl relative text-left text-slate-900 animate-slideUp">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 pb-3.5 border-b border-slate-100">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-xs">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Account & Profile Settings</h3>
            <p className="text-xs text-slate-500 font-medium">Manage credentials & security preferences</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* User Details Form Card */}
        <div className="space-y-3 text-xs bg-slate-50/80 p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
            <span className="text-slate-500 font-medium">Full Name</span>
            <span className="font-bold text-slate-900">{currentUser.full_name || currentUser.name || 'Smart User'}</span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
            <span className="text-slate-500 font-medium">Username</span>
            <span className="font-mono text-indigo-700 font-bold">@{currentUser.username || currentUser.email?.split('@')[0]}</span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
            <span className="text-slate-500 font-medium">Email Address</span>
            <span className="text-slate-700 font-mono text-[11px] font-medium">{currentUser.email}</span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
            <span className="text-slate-500 font-medium">System Role</span>
            <span className="uppercase font-bold text-xs text-indigo-700 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200">
              {currentUser.role}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
              Passcode PIN
            </span>
            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
              {currentUser.pass_code || '2005'}
            </span>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-4 flex items-center gap-2.5 text-[11px] text-emerald-900 bg-emerald-50 border border-emerald-200 p-3 rounded-2xl font-medium shadow-2xs">
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>Supabase Auth Encryption & RLS Security Active</span>
        </div>

        {/* User Account Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 space-y-2.5">
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-500/20 active:scale-98"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out of Account</span>
          </button>

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full py-2.5 bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 hover:border-rose-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Delete Account Permanently</span>
            </button>
          ) : (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3 text-xs text-rose-900 animate-slideUp">
              <div className="flex items-center gap-2 text-rose-800 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Confirm Permanent Account Deletion</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                This action is irreversible. All profile data, passes, and permissions will be permanently removed.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50 text-xs shadow-xs"
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete Now'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
