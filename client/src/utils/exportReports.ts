// agent-notes: { ctx: "Report export utilities supporting CSV, PDF, and XLSX spreadsheets with file-saver", deps: ["jspdf", "jspdf-autotable", "xlsx", "file-saver"], state: "active", last: "antigravity@2026-08-24" }

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export interface ExportStudent {
  id: string;
  student_id: string;
  name: string;
  username: string;
  email: string;
  college_id: string;
  role: string;
  registered_at?: string;
}

export interface ExportEvent {
  id: string;
  title: string;
  hall_number?: string;
  category?: string;
  start_time?: string;
  end_time?: string;
  max_capacity?: number;
  max_seats?: number;
}

/**
 * Generic Excel spreadsheet export utility using XLSX and FileSaver
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  sheetName: string,
  fileName: string
) {
  if (!data || data.length === 0) {
    const emptySheet = XLSX.utils.json_to_sheet([{ Note: 'No records found for this export.' }]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, emptySheet, sheetName);
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });
    saveAs(blob, fileName);
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Dynamic column width calculation for clean readability
  const colWidths = Object.keys(data[0] || {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...data.map((row) => (row[key] !== undefined && row[key] !== null ? String(row[key]).length : 0))
    );
    return { wch: Math.min(Math.max(maxLen + 4, 14), 50) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
  });
  saveAs(blob, fileName);
}

/**
 * 1. Export All Registered Users (.xlsx) with College Name, Phone, and Role
 * Filename: All_Users_Report.xlsx
 */
export function exportAllUsersExcel(users: any[]) {
  const formattedUsers = (users || []).map((user) => ({
    'Name': user.full_name || user.name || 'N/A',
    'Username': user.username || 'N/A',
    'Email': user.email || 'N/A',
    'College / Institution': user.college_name || user.college || user.college_id || 'N/A',
    'College ID': user.college_id || 'N/A',
    'Phone': user.phone_number || user.phone || user.contact || 'N/A',
    'Role': (user.role || 'student').toUpperCase(),
    'Created At': user.created_at ? new Date(user.created_at).toLocaleString() : 'N/A',
  }));

  exportToExcel(formattedUsers, 'Registered Users', 'All_Users_Report.xlsx');
}

/**
 * 1b. Export Multi-Sheet Workbook: Distinct Excel Sheets for Students, Coordinators, and Admins
 * Filename: All_Users_Directory_By_Role.xlsx
 */
export function exportMultiSheetUsersWorkbook(users: any[]) {
  const workbook = XLSX.utils.book_new();

  // 1. Students Sheet
  const students = (users || []).filter((u) => (u.role || 'student').toLowerCase() === 'student');
  const formattedStudents = (students.length > 0 ? students : [null]).map((u, idx) => {
    if (!u) return { Note: 'No student accounts registered yet.' };
    return {
      'S.No': idx + 1,
      'Student Name': u.full_name || u.name || 'N/A',
      'Username': u.username || 'N/A',
      'Email': u.email || 'N/A',
      'College / Institution': u.college_name || u.college || 'N/A',
      'College ID': u.college_id || 'N/A',
      'Phone': u.phone_number || u.phone || 'N/A',
      'Registered Date': u.created_at ? new Date(u.created_at).toLocaleString() : 'N/A',
    };
  });
  const studentsSheet = XLSX.utils.json_to_sheet(formattedStudents);
  studentsSheet['!cols'] = [
    { wch: 6 }, { wch: 24 }, { wch: 18 }, { wch: 28 }, { wch: 32 }, { wch: 18 }, { wch: 16 }, { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(workbook, studentsSheet, 'Students');

  // 2. Coordinators Sheet
  const coordinators = (users || []).filter((u) => (u.role || '').toLowerCase() === 'coordinator');
  const formattedCoordinators = (coordinators.length > 0 ? coordinators : [null]).map((u, idx) => {
    if (!u) return { Note: 'No coordinator accounts registered yet.' };
    return {
      'S.No': idx + 1,
      'Coordinator Name': u.full_name || u.name || 'N/A',
      'Username': u.username || 'N/A',
      'Email': u.email || 'N/A',
      'Department / Institution': u.college_name || u.college || 'N/A',
      'Faculty ID': u.college_id || 'N/A',
      'Phone': u.phone_number || u.phone || 'N/A',
      'Role': 'COORDINATOR',
      'Registered Date': u.created_at ? new Date(u.created_at).toLocaleString() : 'N/A',
    };
  });
  const coordSheet = XLSX.utils.json_to_sheet(formattedCoordinators);
  coordSheet['!cols'] = [
    { wch: 6 }, { wch: 24 }, { wch: 18 }, { wch: 28 }, { wch: 32 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(workbook, coordSheet, 'Coordinators');

  // 3. Admins Sheet
  const admins = (users || []).filter((u) => (u.role || '').toLowerCase() === 'admin');
  const formattedAdmins = (admins.length > 0 ? admins : [null]).map((u, idx) => {
    if (!u) return { Note: 'No admin accounts registered.' };
    return {
      'S.No': idx + 1,
      'Admin Name': u.full_name || u.name || 'N/A',
      'Username': u.username || 'N/A',
      'Email': u.email || 'N/A',
      'Admin ID': u.college_id || 'N/A',
      'Role': 'ADMIN',
      'Registered Date': u.created_at ? new Date(u.created_at).toLocaleString() : 'N/A',
    };
  });
  const adminSheet = XLSX.utils.json_to_sheet(formattedAdmins);
  adminSheet['!cols'] = [
    { wch: 6 }, { wch: 24 }, { wch: 18 }, { wch: 28 }, { wch: 18 }, { wch: 12 }, { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(workbook, adminSheet, 'Admins');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
  });
  saveAs(blob, 'All_Users_Directory_By_Role.xlsx');
}

/**
 * 1c. Export Individual Students List (.xlsx)
 */
export function exportStudentsExcel(users: any[]) {
  const students = (users || []).filter((u) => (u.role || 'student').toLowerCase() === 'student');
  const formatted = students.map((u, idx) => ({
    'S.No': idx + 1,
    'Student Name': u.full_name || u.name || 'N/A',
    'Username': u.username || 'N/A',
    'Email': u.email || 'N/A',
    'College / Institution': u.college_name || u.college || 'N/A',
    'College ID': u.college_id || 'N/A',
    'Phone': u.phone_number || u.phone || 'N/A',
    'Registered Date': u.created_at ? new Date(u.created_at).toLocaleString() : 'N/A',
  }));
  exportToExcel(formatted, 'Students', 'Registered_Students_Report.xlsx');
}

/**
 * 1d. Export Individual Coordinators List (.xlsx)
 */
export function exportCoordinatorsExcel(users: any[]) {
  const coords = (users || []).filter((u) => (u.role || '').toLowerCase() === 'coordinator');
  const formatted = coords.map((u, idx) => ({
    'S.No': idx + 1,
    'Coordinator Name': u.full_name || u.name || 'N/A',
    'Username': u.username || 'N/A',
    'Email': u.email || 'N/A',
    'Department / Institution': u.college_name || u.college || 'N/A',
    'Faculty ID': u.college_id || 'N/A',
    'Phone': u.phone_number || u.phone || 'N/A',
    'Registered Date': u.created_at ? new Date(u.created_at).toLocaleString() : 'N/A',
  }));
  exportToExcel(formatted, 'Coordinators', 'Coordinators_Directory_Report.xlsx');
}

/**
 * 1e. Export Individual Admins List (.xlsx)
 */
export function exportAdminsExcel(users: any[]) {
  const admins = (users || []).filter((u) => (u.role || '').toLowerCase() === 'admin');
  const formatted = admins.map((u, idx) => ({
    'S.No': idx + 1,
    'Admin Name': u.full_name || u.name || 'N/A',
    'Username': u.username || 'N/A',
    'Email': u.email || 'N/A',
    'Admin ID': u.college_id || 'N/A',
    'Role': 'ADMIN',
    'Registered Date': u.created_at ? new Date(u.created_at).toLocaleString() : 'N/A',
  }));
  exportToExcel(formatted, 'Admin Staff', 'Admin_Staff_Report.xlsx');
}

/**
 * 2. Export Event-wise Registrations (.xlsx)
 * Filename: Event_Participants_Report.xlsx
 */
export function exportEventRegistrationsExcel(
  registrations: any[],
  events: any[] = [],
  profiles: any[] = []
) {
  const formattedRegistrations = (registrations || []).map((reg) => {
    const event = events.find((e) => e.id === reg.event_id);
    const profile = profiles.find((p) => p.id === reg.student_id);

    return {
      'Event Name': event?.title || reg.event_title || 'Unknown Event',
      'Category': event?.category || reg.category || 'General',
      'Student Name':
        reg.student_name ||
        profile?.full_name ||
        profile?.name ||
        (reg.student_id ? `Student (${reg.student_id.slice(0, 8)})` : 'Attendee'),
      'Student Email': reg.student_email || profile?.email || 'N/A',
      'Registration Time': reg.registered_at ? new Date(reg.registered_at).toLocaleString() : 'N/A',
    };
  });

  exportToExcel(formattedRegistrations, 'Event Registrations', 'Event_Participants_Report.xlsx');
}

/**
 * 3. Export Overall Attendance Records (.xlsx)
 * Filename: Live_Attendance_Report.xlsx
 */
export function exportAttendanceRecordsExcel(
  recordsOrLogs: any[],
  events: any[] = [],
  profiles: any[] = []
) {
  const formattedLogs = (recordsOrLogs || []).map((item, idx) => {
    const event = events.find((e) => e.id === item.event_id);
    const profile = profiles.find((p) => p.id === (item.student_id || item.id));

    const studentName =
      item.student_name ||
      item.guest_name ||
      item.profiles?.full_name ||
      item.profiles?.name ||
      profile?.full_name ||
      profile?.name ||
      (item.student_id ? `Student (${item.student_id.slice(0, 8)})` : 'Student');

    const rollNo =
      item.roll_no ||
      item.profiles?.roll_no ||
      item.profiles?.college_id ||
      profile?.roll_no ||
      profile?.college_id ||
      item.college_id ||
      'N/A';

    const email =
      item.email ||
      item.profiles?.email ||
      profile?.email ||
      item.student_email ||
      'N/A';

    const college =
      item.college ||
      item.college_name ||
      item.profiles?.college ||
      item.profiles?.college_name ||
      profile?.college ||
      profile?.college_name ||
      'Main Campus';

    const department =
      item.department ||
      item.profiles?.department ||
      profile?.department ||
      'General';

    const eventName =
      item.event_title ||
      item.events?.title ||
      event?.title ||
      'Symposium Event';

    const isAttended = Boolean(
      item.is_attended ||
      item.attended ||
      item.status === 'Checked-In' ||
      item.check_in_time ||
      item.checked_in_at ||
      item.attended_at
    );

    const checkInTime =
      item.checked_in_at ||
      item.attended_at ||
      item.check_in_time ||
      item.scanned_at ||
      null;

    const scannedBy =
      item.scanned_by_name ||
      item.scanned_by ||
      (isAttended ? 'Door Scanner' : 'N/A');

    return {
      'S.No': idx + 1,
      'Student Name': studentName,
      'Roll No': rollNo,
      'Email': email,
      'College': college,
      'Department': department,
      'Event Name': eventName,
      'Live Status': isAttended ? 'Attended' : 'Pending',
      'Check-in Time': checkInTime ? new Date(checkInTime).toLocaleString() : 'N/A',
      'Scanned By': scannedBy,
    };
  });

  exportToExcel(formattedLogs, 'Live Attendance Feed', 'Live_Attendance_Report.xlsx');
}

/**
 * 4. Export Email Dispatch Audit Log (.xlsx)
 * Filename: Email_Dispatch_Audit_Report.xlsx
 */
export function exportEmailDispatchExcel(
  registrations: any[],
  events: any[] = [],
  profiles: any[] = []
) {
  const formattedLogs = (registrations || []).map((reg, idx) => {
    const event = events.find((e) => e.id === reg.event_id);
    const profile = profiles.find((p) => p.id === reg.student_id);

    const studentName =
      reg.student_name ||
      profile?.full_name ||
      profile?.name ||
      'Registered Student';
    const studentEmail = reg.student_email || profile?.email || 'N/A';
    const eventTitle = event?.title || reg.event_title || 'Symposium Event';
    const category = event?.category || reg.category || 'General';
    const regDate = reg.registered_at ? new Date(reg.registered_at).toLocaleString() : 'N/A';

    const rawStatus = reg.email_status || 'SENT';
    const dispatchStatus = rawStatus.toUpperCase() === 'FAILED' ? 'Failed' : 'Delivered';

    const sentAt = reg.email_sent_at
      ? new Date(reg.email_sent_at).toLocaleString()
      : reg.registered_at
      ? new Date(reg.registered_at).toLocaleString()
      : 'N/A';

    return {
      'S.No': idx + 1,
      'Student Name': studentName,
      'Student Email': studentEmail,
      'Event Title': eventTitle,
      'Category': category,
      'Registration Date': regDate,
      'Email Dispatch Status': dispatchStatus,
      'Email Sent Timestamp': sentAt,
    };
  });

  exportToExcel(formattedLogs, 'Email Dispatch Log', 'Email_Dispatch_Audit_Report.xlsx');
}

/**
 * Export student roster to CSV file download
 */
export function exportToCSV(event: ExportEvent, students: ExportStudent[]) {
  if (!students || students.length === 0) return;

  const headers = ['S.No', 'Student Name', 'Username', 'College ID', 'Email', 'Role', 'Registered Date'];
  const rows = students.map((s, idx) => [
    idx + 1,
    `"${(s.name || '').replace(/"/g, '""')}"`,
    `"${(s.username || '').replace(/"/g, '""')}"`,
    `"${(s.college_id || '').replace(/"/g, '""')}"`,
    `"${(s.email || '').replace(/"/g, '""')}"`,
    `"${(s.role || '').replace(/"/g, '""')}"`,
    `"${s.registered_at ? new Date(s.registered_at).toLocaleString() : 'N/A'}"`,
  ]);

  const csvContent = [
    `"Event Title: ${(event.title || '').replace(/"/g, '""')}"`,
    `"Venue: ${(event.hall_number || 'Main Venue').replace(/"/g, '""')}"`,
    `"Exported Date: ${new Date().toLocaleString()}"`,
    `"Total Registered: ${students.length}"`,
    '',
    headers.join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const sanitizedTitle = (event.title || 'Event').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  link.setAttribute('href', url);
  link.setAttribute('download', `${sanitizedTitle}_registered_students.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export student roster to formatted PDF document download
 */
export function exportToPDF(event: ExportEvent, students: ExportStudent[]) {
  if (!students || students.length === 0) return;

  const doc = new jsPDF();

  // Document Title Header
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // slate-900
  doc.text('Smart Coordinator — Event Roster', 14, 20);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.text(event.title || 'Symposium Event', 14, 28);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Venue: ${event.hall_number || 'Main Hall'} | Total Registered: ${students.length}`, 14, 35);
  doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, 41);

  // Table Columns & Rows
  const tableColumn = ['#', 'Student Name', 'College ID', 'Email', 'Role', 'Registered Date'];
  const tableRows = students.map((s, idx) => [
    idx + 1,
    s.name || 'N/A',
    s.college_id || 'N/A',
    s.email || 'N/A',
    s.role || 'student',
    s.registered_at ? new Date(s.registered_at).toLocaleDateString() : 'N/A',
  ]);

  autoTable(doc, {
    startY: 48,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229], // indigo-600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85], // slate-700
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    margin: { top: 48, left: 14, right: 14 },
  });

  const sanitizedTitle = (event.title || 'Event').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`${sanitizedTitle}_registered_students.pdf`);
}
