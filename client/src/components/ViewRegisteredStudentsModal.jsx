import { useState } from 'react';
import { X, Users, Search, Mail, Hash, UserCheck, Calendar, FileSpreadsheet, FileText, Download, Trash2 } from 'lucide-react';
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

  // Map to full student profile objects
  const registeredStudents = eventRegs.map((reg) => {
    const profile = profilesList.find((p) => p.id === reg.student_id);
    return {
      id: reg.id || reg.student_id,
      student_id: reg.student_id,
      registered_at: reg.registered_at,
      name: profile?.full_name || profile?.name || `Student (${reg.student_id?.slice(0, 8)})`,
      username: profile?.username || 'student',
      email: profile?.email || 'N/A',
      college_id: profile?.college_id || reg.student_id?.slice(0, 10),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 p-6 shadow-2xl relative text-left text-slate-900 flex flex-col max-h-[85vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{event.title}</h3>
            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <span>{event.hall_number || 'Main Venue'}</span>
              <span>•</span>
              <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {eventRegs.length} / {event.max_capacity || event.max_seats || 100} Registered
              </span>
            </p>
          </div>
        </div>

        {/* Action Header: Search & Export Bar */}
        <div className="pt-4 pb-3 flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search registered students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => exportToCSV(event, registeredStudents)}
              disabled={isExportDisabled}
              title={isExportDisabled ? 'No registrations to export' : 'Export CSV Roster'}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 disabled:bg-slate-100 text-emerald-700 disabled:text-slate-400 border border-emerald-200 disabled:border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              CSV
            </button>

            <button
              onClick={() => exportToPDF(event, registeredStudents)}
              disabled={isExportDisabled}
              title={isExportDisabled ? 'No registrations to export' : 'Export PDF Roster'}
              className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 disabled:bg-slate-100 text-indigo-700 disabled:text-slate-400 border border-indigo-200 disabled:border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <FileText className="w-3.5 h-3.5" />
              PDF
            </button>
          </div>
        </div>

        {/* Registered Students Roster List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              {searchQuery ? 'No student records match your search query.' : 'No students registered for this event yet.'}
            </div>
          ) : (
            filteredStudents.map((student, idx) => (
              <div
                key={student.id || idx}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs hover:border-slate-300 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${student.student_id}`}
                    alt="Avatar"
                    className="w-9 h-9 rounded-full bg-white border border-slate-200 p-0.5 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                      <span>{student.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">@{student.username}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap mt-0.5">
                      <span className="flex items-center gap-1 text-slate-600 font-mono">
                        <Hash className="w-3 h-3 text-slate-400" />
                        {student.college_id}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {student.email}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      <UserCheck className="w-3 h-3 text-emerald-600" />
                      Confirmed
                    </span>
                    {student.registered_at && (
                      <div className="text-[9px] text-slate-400 font-mono mt-1 flex items-center justify-end gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(student.registered_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleRemoveRegistration(student)}
                    disabled={removingId === student.student_id}
                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/70 transition-colors cursor-pointer disabled:opacity-50"
                    title="Remove student from event"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 mt-2 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>Showing <strong>{filteredStudents.length}</strong> of <strong>{eventRegs.length}</strong> attendees</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
          >
            Close Roster
          </button>
        </div>
      </div>
    </div>
  );
}
