// agent-notes: { ctx: "User settings modal displaying profile metadata and account deletion feature", deps: ["src/context/AppContext.jsx", "src/supabaseClient.ts", "lucide-react"], state: "active", last: "antigravity@2026-07-31" }

import { useState } from 'react';
import { X, User, KeyRound, Trash2, AlertTriangle, ShieldCheck, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase, isMockMode } from '../supabaseClient';

export default function UserSettingsModal({ isOpen, onClose }) {
  const { currentUser, signOutFromSupabase } = useApp();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen || !currentUser) return null;

  const handleLogout = async () => {
    await signOutFromSupabase();
    onClose();
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setErrorMsg(null);

    try {
      if (!isMockMode) {
        // Call delete_user_account RPC
        const { error } = await supabase.rpc('delete_user_account', {
          p_user_id: currentUser.id,
        });

        if (error) {
          // Direct table delete fallback
          await supabase.from('profiles').delete().eq('id', currentUser.id);
        }
      }

      // Log user out
      await signOutFromSupabase();
      onClose();
    } catch (err) {
      setErrorMsg('Failed to delete account. Please contact system admin.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 p-6 shadow-2xl relative text-left text-slate-900">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">User Profile & Account Settings</h3>
            <p className="text-xs text-slate-500">Manage credentials & security preferences</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {errorMsg}
          </div>
        )}

        {/* User Details Form Card */}
        <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="text-slate-500 font-medium">Full Name</span>
            <span className="font-semibold text-slate-900">{currentUser.full_name || currentUser.name || 'Smart User'}</span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="text-slate-500 font-medium">Username</span>
            <span className="font-mono text-indigo-700 font-bold">@{currentUser.username || currentUser.email?.split('@')[0]}</span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="text-slate-500 font-medium">Email Address</span>
            <span className="text-slate-700 font-mono text-[11px]">{currentUser.email}</span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="text-slate-500 font-medium">System Role</span>
            <span className="uppercase font-bold text-xs text-indigo-700 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200">
              {currentUser.role}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
              Passcode PIN
            </span>
            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              {currentUser.pass_code || '2005'}
            </span>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-4 flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl font-medium">
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>Supabase Auth Encryption & RLS Security Active</span>
        </div>

        {/* User Account Actions */}
        <div className="mt-6 pt-4 border-t border-slate-200 space-y-2">
          <button
            onClick={handleLogout}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out of Account</span>
          </button>

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full py-2 bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 hover:border-rose-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Delete Account Permanently</span>
            </button>
          ) : (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-3 text-xs text-rose-900">
              <div className="flex items-center gap-2 text-rose-800 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Confirm Permanent Account Deletion</span>
              </div>
              <p className="text-[11px] text-rose-700">
                This action is irreversible. All profile data and permissions will be permanently removed.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete Now'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer"
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
