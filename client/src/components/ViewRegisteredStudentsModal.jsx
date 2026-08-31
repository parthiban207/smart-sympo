// agent-notes: { ctx: "View registered students modal with search, attendance status pills, CSV/PDF export, and remove actions", deps: ["src/context/AppContext.jsx", "src/utils/exportReports.ts", "lucide-react"], state: "active", last: "antigravity@2026-08-31" }

import { useState } from 'react';
import { X, Users, Search, FileSpreadsheet, FileText, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { exportToCSV, exportToPDF } from '../utils/exportReports';
import { useApp } from '../context/AppContext';

export default function ViewRegisteredStudentsModal({
  isOpen,
  onClose,
  event,
  registrations = [],
  profilesList = [],
}) {
  const { unregisterForEvent } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [removingId, setRemovingId] = useState(null);

  if (!isOpen || !event) return null;

  // Filter registrations for this specific event
  const eventRegs = registrations.filter((r) => r.event_id === event.id);

  // Map to full student profile objects with real student names & roll numbers
  const registeredStudents = eventRegs.map((reg) => {
    const profile = reg.profiles || profilesList.find((p) => p.id === reg.student_id);
    const resolvedName =
      profile?.full_name ||
      profile?.name ||
      (profile?.email ? profile.email.split('@')[0] : null) ||
      `Student (${reg.student_id?.slice(0, 8)})`;
    const resolvedEmail = profile?.email || reg.student_email || 'N/A';
    const resolvedRollNo = profile?.roll_no || profile?.college_id || reg.student_id?.slice(0, 10);
    const resolvedCollege = profile?.college || profile?.college_name || 'Main Campus';

    return {
      id: reg.id || reg.student_id,
      student_id: reg.student_id,
      registered_at: reg.registered_at,
      attended: Boolean(reg.attended),
      checked_in_at: reg.checked_in_at || reg.attended_at,
      name: resolvedName,
      username: profile?.username || (profile?.email ? profile.email.split('@')[0] : 'student'),
      email: resolvedEmail,
      college_id: resolvedRollNo,
      roll_no: resolvedRollNo,
      college: resolvedCollege,
      role: profile?.role || 'student',
    };
  });

  // Filter based on search query
  const filteredStudents = registeredStudents.filter((student) => {
    const query = searchQuery.toLowerCase();
    return (
      student.name.toLowerCase().includes(query) ||
      student.email.toLowerCase().includes(query) ||
      student.college_id.toLowerCase().includes(query) ||
      student.roll_no.toLowerCase().includes(query) ||
      student.college.toLowerCase().includes(query) ||
      student.username.toLowerCase().includes(query)
    );
  });

  const handleRemoveRegistration = async (student) => {
    if (!window.confirm(`Are you sure you want to remove ${student.name} from "${event.title}"?`)) {
      return;
    }
    setRemovingId(student.student_id);
    try {
      await unregisterForEvent(event.id, student.student_id);
    } finally {
      setRemovingId(null);
    }
  };

  const isExportDisabled = registeredStudents.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200/90 p-7 shadow-2xl relative text-left text-slate-900 flex flex-col max-h-[88vh] animate-slideUp">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">{event.title}</h3>
            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 font-medium">
              <span>{event.hall_number || 'Main Venue'}</span>
              <span>•</span>
              <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                {eventRegs.length} / {event.max_capacity || event.max_seats || 100} Registered
              </span>
            </p>
          </div>
        </div>

        {/* Search Bar & Export Hub */}
        <div className="py-3.5 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between border-b border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by student name, roll number, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-xl pl-10 pr-3.5 py-2 focus:outline-none focus:border-indigo-600 focus:bg-white transition font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => exportToCSV(registeredStudents, `${event.title.replace(/\s+/g, '_')}_Attendees`)}
              disabled={isExportDisabled}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => exportToPDF(registeredStudents, event.title)}
              disabled={isExportDisabled}
              className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-800 border border-indigo-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* Attendees List Table */}
        <div className="flex-1 overflow-y-auto py-2 space-y-2 max-h-[420px] pr-1">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400 font-medium">
              No registered students match your search criteria.
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div
                key={student.id}
                className="p-3.5 bg-slate-50/80 hover:bg-slate-100/90 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 text-xs transition shadow-2xs"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 truncate">{student.name}</span>
                    <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/70">
                      {student.roll_no}
                    </span>
                    {student.attended ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Attended
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 truncate">
                    <span className="truncate">{student.email}</span>
                    <span>•</span>
                    <span className="truncate text-slate-600">{student.college}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveRegistration(student)}
                  disabled={removingId === student.student_id}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer shrink-0 disabled:opacity-50"
                  title="Remove from track"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
          <span>Showing {filteredStudents.length} of {registeredStudents.length} attendees</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
