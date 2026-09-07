// agent-notes: { ctx: "Neo-Glass Student Entry Pass Modal with frosted backdrop, lanyard badge holder, Esc listener, and responsive viewport sizing", deps: ["src/components/StudentQRPass.jsx", "src/context/AppContext.jsx", "lucide-react"], state: "active", last: "antigravity@2026-09-01" }

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase, isMockMode, isValidUUID } from '../supabaseClient';
import StudentQRPass from './StudentQRPass';

export default function StudentQRModal({ isOpen, onClose, event }) {
  const { currentUser, registrations } = useApp();
  const [dbRegistrationId, setDbRegistrationId] = useState('');

  const displayEvent = event || {
    id: 'general-symposium-pass',
    title: 'SmartSympo 2026 General Access Pass',
    hall_number: 'All Venues',
  };

  const validStudentId = currentUser?.id || '';
  const validEventId = displayEvent?.id || '';

  // 1. Locate registration from in-memory state
  const userReg = registrations.find(
    (r) =>
      (r.student_id === validStudentId || r.user_id === validStudentId) &&
      (r.event_id === validEventId || (displayEvent?.title && r.event_title === displayEvent.title))
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

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm relative text-center animate-slideUp flex flex-col items-center"
      >
        {/* Dynamic Refreshing Conference Lanyard Pass */}
        <StudentQRPass
          studentId={validStudentId}
          eventId={validEventId}
          registrationId={registrationId}
          studentName={
            currentUser?.full_name ||
            currentUser?.name ||
            (currentUser?.email ? currentUser.email.split('@')[0] : 'Delegate')
          }
          studentEmail={currentUser?.email || ''}
          collegeId={currentUser?.roll_no || currentUser?.college_id || 'STU-2026'}
          collegeName={currentUser?.college_name || currentUser?.college || ''}
          department={currentUser?.department || 'CSE'}
          eventTitle={displayEvent.title}
          hallNumber={displayEvent.hall_number}
          event={displayEvent}
          startTime={displayEvent.start_time}
          endTime={displayEvent.end_time}
          user={currentUser}
          profile={currentUser}
          onClose={onClose}
        />

        {/* Bottom Floating Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 px-6 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-bold font-mono transition-all cursor-pointer shadow-lg inline-flex items-center gap-2 active:scale-95"
        >
          <X className="w-3.5 h-3.5 text-rose-400" />
          <span>Close Entry Pass</span>
        </button>
      </div>
    </div>
  );
}
