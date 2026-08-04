// agent-notes: { ctx: "Modal wrapper for StudentQRPass displaying dynamic student venue pass", deps: ["src/components/StudentQRPass.jsx", "src/context/AppContext.jsx"], state: "active", last: "antigravity@2026-07-31" }

import { X, QrCode } from 'lucide-react';
import { useApp } from '../context/AppContext';
import StudentQRPass from './StudentQRPass';

export default function StudentQRModal({ isOpen, onClose, event }) {
  const { currentUser } = useApp();

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-sm rounded-2xl border border-slate-200 p-6 shadow-2xl text-center relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col items-center mb-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center mb-2 shadow-2xs">
            <QrCode className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Smart Dynamic Student Pass</h3>
          <p className="text-xs text-slate-500 mt-0.5">Present live QR code at venue entrance scanner</p>
        </div>

        {/* Dynamic Refreshing QR Pass Component */}
        <StudentQRPass
          studentId={currentUser?.id || 'student-demo-1'}
          eventId={event.id}
          studentName={currentUser?.name}
          collegeId={currentUser?.college_id}
          eventTitle={event.title}
          hallNumber={event.hall_number}
        />
      </div>
    </div>
  );
}
