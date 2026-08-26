// agent-notes: { ctx: "Modal wrapper for StudentQRPass displaying dynamic student venue pass with genuine Supabase user and registration IDs", deps: ["src/components/StudentQRPass.jsx", "src/context/AppContext.jsx", "lucide-react"], state: "active", last: "antigravity@2026-08-26" }

import { useEffect, useState } from 'react';
import { X, QrCode } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase, isMockMode, isValidUUID } from '../supabaseClient';
import StudentQRPass from './StudentQRPass';

export default function StudentQRModal({ isOpen, onClose, event }) {
  const { currentUser, registrations } = useApp();
  const [dbRegistrationId, setDbRegistrationId] = useState('');

  const validStudentId = currentUser?.id || '';
  const validEventId = event?.id || '';

  // 1. Locate registration from in-memory state
  const userReg = registrations.find(
    (r) =>
      (r.student_id === validStudentId || r.user_id === validStudentId) &&
      (r.event_id === validEventId || (event?.title && r.event_title === event.title))
  );

  const registrationId = userReg?.id || dbRegistrationId;

  // 2. Query Supabase directly if in-memory id is not yet populated
  useEffect(() => {
    if (!isOpen || !validStudentId || !validEventId) return;

    if (userReg?.id) {
      setDbRegistrationId(userReg.id);
      return;
    }

    if (!isMockMode && isValidUUID(validStudentId) && isValidUUID(validEventId)) {
      supabase
        .from('registrations')
        .select('id')
        .eq('student_id', validStudentId)
        .eq('event_id', validEventId)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.id) {
            setDbRegistrationId(data.id);
          }
        })
        .catch((err) => console.warn('[StudentQRModal Fetch Reg Error]:', err));
    }
  }, [isOpen, validStudentId, validEventId, userReg?.id]);

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
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
          studentId={validStudentId}
          eventId={validEventId}
          registrationId={registrationId}
          studentName={currentUser?.full_name || currentUser?.name || 'Student Attendee'}
          studentEmail={currentUser?.email || ''}
          collegeId={currentUser?.college_id}
          collegeName={currentUser?.college_name || currentUser?.college}
          eventTitle={event.title}
          hallNumber={event.hall_number}
        />
      </div>
    </div>
  );
}
