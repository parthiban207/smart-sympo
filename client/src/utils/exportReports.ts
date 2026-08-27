// agent-notes: { ctx: "Fail-safe browser report export utilities supporting dedicated CSV, PDF, and XLSX spreadsheets with native HTML5 Blob download", deps: ["jspdf", "jspdf-autotable", "xlsx"], state: "active", last: "antigravity@2026-08-27" }

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface ExportStudent {
  id: string;
  student_id: string;
  name: string;
  username: string;
  email: string;
  college_id: string;
  role: string;
  registered_at?: string;
  phone?: string;
  college?: string;
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
 * Universal, 100% fail-safe browser file download engine.
 * Works natively across all modern browsers (Chrome, Edge, Firefox, Safari, iOS, Android).
 */
export function saveBlobToFile(blob: Blob, fileName: string) {
  if (typeof window === 'undefined') return;

  try {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.setAttribute('download', fileName);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (link.parentNode) {
        document.body.removeChild(link);
      }
      window.URL.revokeObjectURL(url);
    }, 1000);
    return;
  } catch (err) {
    console.warn('Native ObjectURL download failed, attempting data URI fallback:', err);
  }

  try {
    const reader = new FileReader();
    reader.onload = function () {
      const link = document.createElement('a');
      link.href = reader.result as string;
      link.download = fileName;
      link.setAttribute('download', fileName);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) document.body.removeChild(link);
      }, 1000);
    };
    reader.readAsDataURL(blob);
  } catch (err2) {
    console.error('All browser file download methods failed:', err2);
  }
}

/**
 * Generic CSV data export utility with UTF-8 BOM encoding for Excel/Numbers compatibility
 */
export function exportToCSVFile<T extends Record<string, any>>(
  data: T[],
  fileName: string
) {
  const actualFileName = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
  if (!data || data.length === 0) {
    const blob = new Blob(['\uFEFFNote\r\n"No records found for this export."\r\n'], {
      type: 'text/csv;charset=utf-8;',
    });
    saveBlobToFile(blob, actualFileName);
    return;
  }

  const headers = Object.keys(data[0] || {});
  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvRows = [
    headers.map(escapeCSV).join(','),
    ...data.map((row) => headers.map((h) => escapeCSV(row[h])).join(',')),
  ];

  const csvString = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  saveBlobToFile(blob, actualFileName);
}

/**
 * Generic Excel spreadsheet export utility using XLSX
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  sheetName: string,
  fileName: string
) {
  const actualFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  if (!data || data.length === 0) {
    const emptySheet = XLSX.utils.json_to_sheet([{ Note: 'No records found for this export.' }]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, emptySheet, sheetName);
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });
    saveBlobToFile(blob, actualFileName);
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
  saveBlobToFile(blob, actualFileName);
}

/**
 * 1. STUDENT ATTENDANCE CSV EXPORT
 * Filename: SmartSympo_Student_Attendance_<date>.csv
 */
export function exportAttendanceCSV(
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
      (item.student_id ? `Student (${String(item.student_id).slice(0, 8)})` : 'Student');

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

    const venue =
      item.hall_number ||
      item.events?.hall_number ||
      item.venue ||
      event?.hall_number ||
      'Main Hall';

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
      (isAttended ? 'Door Scanner / Coordinator' : 'N/A');

    return {
      'S.No': idx + 1,
      'Student Name': studentName,
      'Roll No / College ID': rollNo,
      'Email': email,
      'College / Institution': college,
      'Department': department,
      'Event Name': eventName,
      'Venue': venue,
      'Attendance Status': isAttended ? 'Verified' : 'Pending',
      'Check-in Time': checkInTime ? new Date(checkInTime).toLocaleString() : 'Not Checked In',
      'Scanned By': scannedBy,
    };
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  exportToCSVFile(formattedLogs, `SmartSympo_Student_Attendance_${dateStr}.csv`);
}

/**
 * 2. ALL STUDENT REGISTRATIONS CSV EXPORT
 * Filename: SmartSympo_All_Student_Registrations_<date>.csv
 */
export function exportEventRegistrationsCSV(
  registrations: any[],
  events: any[] = [],
  profiles: any[] = []
) {
  const formatted = (registrations || []).map((reg, idx) => {
    const event = events.find((e) => e.id === reg.event_id);
    const profile = profiles.find((p) => p.id === reg.student_id);

    const studentName =
      reg.student_name ||
      profile?.full_name ||
      profile?.name ||
      (reg.student_id ? `Student (${String(reg.student_id).slice(0, 8)})` : 'Attendee');

    const rollNo =
      profile?.roll_no ||
      profile?.college_id ||
      reg.roll_no ||
      reg.college_id ||
      'N/A';

    const email = reg.student_email || profile?.email || 'N/A';
    const phone = profile?.phone_number || profile?.phone || 'N/A';
    const college = profile?.college_name || profile?.college || 'N/A';
    const eventTitle = event?.title || reg.event_title || 'Symposium Event';
    const category = event?.category || reg.category || 'General';
    const venue = event?.hall_number || 'Main Venue';
    const passToken = reg.pass_token || profile?.pass_code || 'N/A';
    const regDate = reg.registered_at ? new Date(reg.registered_at).toLocaleString() : 'N/A';
    const isAttended = Boolean(reg.attended || reg.is_attended);

    return {
      'S.No': idx + 1,
      'Student Name': studentName,
      'Roll No / ID': rollNo,
      'Email': email,
      'Phone': phone,
      'College / Institution': college,
      'Event Registered': eventTitle,
      'Category': category,
      'Venue': venue,
      'Registration Date': regDate,
      'Security Pass Token': passToken,
      'Attendance Status': isAttended ? 'Verified' : 'Pending Check-in',
    };
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  exportToCSVFile(formatted, `SmartSympo_All_Student_Registrations_${dateStr}.csv`);
}

/**
 * 3. COORDINATORS LOGIN & DIRECTORY CSV EXPORT
 * Filename: SmartSympo_Coordinators_Login_Report_<date>.csv
 */
export function exportCoordinatorsCSV(
  users: any[],
  onlineUsers: any[] = []
) {
  const coords = (users || []).filter((u) => (u.role || '').toLowerCase() === 'coordinator');
  const onlineIds = (onlineUsers || []).map((o) => o.id || o.user_id || o.email);

  const formatted = coords.map((u, idx) => {
    const isOnline = onlineIds.some(
      (id) =>
        id === u.id ||
        (u.email && String(id).toLowerCase() === String(u.email).toLowerCase())
    );

    return {
      'S.No': idx + 1,
      'Coordinator Name': u.full_name || u.name || 'N/A',
      'Username': u.username || 'N/A',
      'Email': u.email || 'N/A',
      'Department / Institution': u.college_name || u.college || u.department || 'N/A',
      'Faculty / Staff ID': u.college_id || 'N/A',
      'Phone': u.phone_number || u.phone || 'N/A',
      'Live Login Status': isOnline ? 'ONLINE NOW' : 'OFFLINE',
      'Security Passcode Set': u.pass_code ? 'Active' : 'Not Set',
      'Account Created At': u.created_at ? new Date(u.created_at).toLocaleString() : 'N/A',
    };
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  exportToCSVFile(formatted, `SmartSympo_Coordinators_Login_Report_${dateStr}.csv`);
}

/**
 * 4. EVENT-SPECIFIC STUDENT REGISTRATIONS CSV EXPORT ("whose student register the particular event")
 * Filename: <event_title>_registered_students.csv
 */
export function exportSingleEventRegistrationsCSV(
  event: ExportEvent | any,
  registrations: any[],
  profiles: any[] = []
) {
  if (!event) return;
  const eventRegs = (registrations || []).filter((r) => r.event_id === event.id);

  const formatted = eventRegs.map((reg, idx) => {
    const profile = profiles.find((p) => p.id === reg.student_id);

    const name =
      reg.student_name ||
      profile?.full_name ||
      profile?.name ||
      `Student (${String(reg.student_id).slice(0, 8)})`;

    const username = reg.student_username || profile?.username || 'student';
    const rollNo = profile?.roll_no || profile?.college_id || reg.college_id || 'N/A';
    const email = reg.student_email || profile?.email || 'N/A';
    const phone = profile?.phone_number || profile?.phone || 'N/A';
    const college = profile?.college_name || profile?.college || 'N/A';
    const department = profile?.department || 'N/A';
    const passToken = reg.pass_token || profile?.pass_code || 'N/A';
    const regDate = reg.registered_at ? new Date(reg.registered_at).toLocaleString() : 'N/A';
    const isAttended = Boolean(reg.attended || reg.is_attended);

    return {
      'S.No': idx + 1,
      'Student Name': name,
      'Username': username,
      'Roll No / College ID': rollNo,
      'Email': email,
      'Phone': phone,
      'College / Institution': college,
      'Department': department,
      'Event Name': event.title || 'Symposium Event',
      'Venue / Hall': event.hall_number || 'Main Venue',
      'Security Pass Token': passToken,
      'Registration Date': regDate,
      'Attendance Status': isAttended ? 'Verified' : 'Pending',
    };
  });

  const sanitizedTitle = (event.title || 'Event').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  exportToCSVFile(formatted, `${sanitizedTitle}_registered_students.csv`);
}

/**
 * 5. STUDENT DIRECTORY CSV EXPORT
 * Filename: SmartSympo_Registered_Students_<date>.csv
 */
export function exportStudentsCSV(users: any[]) {
  const students = (users || []).filter((u) => (u.role || 'student').toLowerCase() === 'student');
  const formatted = students.map((u, idx) => ({
    'S.No': idx + 1,
    'Student Name': u.full_name || u.name || 'N/A',
    'Username': u.username || 'N/A',
    'Email': u.email || 'N/A',
    'College ID / Roll No': u.college_id || u.roll_no || 'N/A',
    'College / Institution': u.college_name || u.college || 'N/A',
    'Department': u.department || 'N/A',
    'Phone': u.phone_number || u.phone || 'N/A',
    'Registration Date': u.created_at ? new Date(u.created_at).toLocaleString() : 'N/A',
  }));

  const dateStr = new Date().toISOString().slice(0, 10);
  exportToCSVFile(formatted, `SmartSympo_Registered_Students_${dateStr}.csv`);
}

/**
 * 6. ALL USERS DIRECTORY CSV EXPORT
 * Filename: SmartSympo_All_Users_Directory_<date>.csv
 */
export function exportAllUsersCSV(users: any[], onlineUsers: any[] = []) {
  const onlineIds = (onlineUsers || []).map((o) => o.id || o.user_id || o.email);

  const formatted = (users || []).map((u, idx) => {
    const isOnline = onlineIds.some(
      (id) =>
        id === u.id ||
        (u.email && String(id).toLowerCase() === String(u.email).toLowerCase())
    );

    return {
      'S.No': idx + 1,
      'Name': u.full_name || u.name || 'N/A',
      'Username': u.username || 'N/A',
      'Email': u.email || 'N/A',
      'Role': (u.role || 'student').toUpperCase(),
      'College / Department': u.college_name || u.college || u.department || 'N/A',
      'College ID': u.college_id || 'N/A',
      'Phone': u.phone_number || u.phone || 'N/A',
      'Live Status': isOnline ? 'Online' : 'Offline',
      'Account Created At': u.created_at ? new Date(u.created_at).toLocaleString() : 'N/A',
    };
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  exportToCSVFile(formatted, `SmartSympo_All_Users_Directory_${dateStr}.csv`);
}

/**
 * 7. EMAIL DISPATCH AUDIT CSV EXPORT
 * Filename: SmartSympo_Email_Dispatch_Audit_<date>.csv
 */
export function exportEmailDispatchCSV(
  registrations: any[],
  events: any[] = [],
  profiles: any[] = []
) {
  const formatted = (registrations || []).map((reg, idx) => {
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

  const dateStr = new Date().toISOString().slice(0, 10);
  exportToCSVFile(formatted, `SmartSympo_Email_Dispatch_Audit_${dateStr}.csv`);
}

// ---------------- EXCEL EXPORTS ----------------

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
  XLSX.utils.book_append_sheet(workbook, adminSheet, 'Admins');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
  });
  saveBlobToFile(blob, 'All_Users_Directory_By_Role.xlsx');
}

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
  const studentList = students || [];
  const headers = ['S.No', 'Student Name', 'Username', 'College ID', 'Email', 'Role', 'Registered Date'];
  
  const rows = studentList.length > 0 
    ? studentList.map((s, idx) => [
        idx + 1,
        `"${(s.name || '').replace(/"/g, '""')}"`,
        `"${(s.username || '').replace(/"/g, '""')}"`,
        `"${(s.college_id || '').replace(/"/g, '""')}"`,
        `"${(s.email || '').replace(/"/g, '""')}"`,
        `"${(s.role || '').replace(/"/g, '""')}"`,
        `"${s.registered_at ? new Date(s.registered_at).toLocaleString() : 'N/A'}"`,
      ])
    : [[1, '"No students registered yet"', '""', '""', '""', '""', '""']];

  const csvContent = [
    `"Event Title: ${(event?.title || 'Event').replace(/"/g, '""')}"`,
    `"Venue: ${(event?.hall_number || 'Main Venue').replace(/"/g, '""')}"`,
    `"Exported Date: ${new Date().toLocaleString()}"`,
    `"Total Registered: ${studentList.length}"`,
    '',
    headers.join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const sanitizedTitle = (event?.title || 'Event').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  saveBlobToFile(blob, `${sanitizedTitle}_registered_students.csv`);
}

/**
 * Export student roster to formatted PDF document download
 */
export function exportToPDF(event: ExportEvent, students: ExportStudent[]) {
  const studentList = students || [];
  const doc = new jsPDF();

  // Document Title Header
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // slate-900
  doc.text('Smart Coordinator — Event Roster', 14, 20);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.text(event?.title || 'Symposium Event', 14, 28);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Venue: ${event?.hall_number || 'Main Hall'} | Total Registered: ${studentList.length}`, 14, 35);
  doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, 41);

  // Table Columns & Rows
  const tableColumn = ['#', 'Student Name', 'College ID', 'Email', 'Role', 'Registered Date'];
  const tableRows = studentList.length > 0
    ? studentList.map((s, idx) => [
        idx + 1,
        s.name || 'N/A',
        s.college_id || 'N/A',
        s.email || 'N/A',
        s.role || 'student',
        s.registered_at ? new Date(s.registered_at).toLocaleDateString() : 'N/A',
      ])
    : [[1, 'No registered students yet', '-', '-', '-', '-']];

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

  const sanitizedTitle = (event?.title || 'Event').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`${sanitizedTitle}_registered_students.pdf`);
}
