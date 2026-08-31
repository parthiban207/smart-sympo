// agent-notes: { ctx: "Clean Student QR Pass Modal with backdrop click-to-close, Esc key listener, and top-right close affordance", deps: ["src/components/StudentQRPass.jsx", "src/context/AppContext.jsx", "lucide-react"], state: "active", last: "antigravity@2026-08-31" }

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

  // 3. Listen for Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !event) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-sm rounded-3xl border border-slate-200/90 p-7 shadow-2xl text-center relative overflow-hidden animate-slideUp"
      >
        {/* Prominent Close ('✕') Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200/80 hover:border-rose-200 transition-all cursor-pointer shadow-2xs"
          title="Close Pass (Esc)"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col items-center mb-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mb-2 shadow-xs">
            <QrCode className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Symposium Entry Badge</h3>
          <p className="text-xs text-slate-500 mt-0.5">Show this QR code at the entrance to check in</p>
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
