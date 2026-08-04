import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
