// agent-notes: { ctx: "Neo-Glass Student Entry Pass Modal with frosted backdrop, lanyard badge holder, Esc listener, and responsive viewport sizing", deps: ["src/components/StudentQRPass.jsx", "src/context/AppContext.jsx", "lucide-react"], state: "active", last: "antigravity@2026-08-31" }

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0F19]/80 backdrop-blur-md animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm relative text-center animate-slideUp"
      >
        {/* Floating Top-Right Close ('✕') Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 rounded-xl bg-slate-900/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/80 hover:border-rose-500/40 transition-all cursor-pointer shadow-lg backdrop-blur-md z-20"
          title="Close Pass (Esc)"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Dynamic Refreshing Conference Lanyard Pass */}
        <StudentQRPass
          studentId={validStudentId}
          eventId={validEventId}
          registrationId={registrationId}
          studentName={currentUser?.full_name || currentUser?.name || 'Student Attendee'}
          studentEmail={currentUser?.email || ''}
          collegeId={currentUser?.roll_no || currentUser?.college_id || 'N/A'}
          collegeName={currentUser?.college_name || currentUser?.college || ''}
          department={currentUser?.department || 'CSE'}
          eventTitle={event.title}
          hallNumber={event.hall_number}
          user={currentUser}
          profile={currentUser}
        />
      </div>
    </div>
  );
}
