import { useEffect, useState, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  ScanLine,
  ArrowLeft,
  UserCheck,
  ShieldCheck,
  Building2,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export interface ScanResultPayload {
  success: boolean;
  message: string;
  attendee?: {
    registration_id?: string;
    event_id?: string;
    student_id?: string;
    user_id?: string;
  };
}

export default function CoordinatorScanner() {
  const navigate = useNavigate();
  const { markAttendance, events, registrations, profilesList } = useApp();
  const [selectedHall, setSelectedHall] = useState<string>('Hall 1 (Main Auditorium)');
  const [scanResult, setScanResult] = useState<ScanResultPayload | null>(null);
  const [manualPayload, setManualPayload] = useState<string>('');
  const [lastScannedAttendee, setLastScannedAttendee] = useState<{
    registration_id?: string;
    event_id?: string;
    student_id?: string;
  } | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const halls: string[] = Array.from(
    new Set((events || []).map((e: any) => e.hall_number || 'Hall 1 (Main Auditorium)'))
  );

  useEffect(() => {
    // Initialize html5-qrcode scanner element
    const scanner = new Html5QrcodeScanner(
      'coordinator-qr-reader',
      { fps: 12, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render(
      async (decodedText: string) => {
        const res: ScanResultPayload = await markAttendance(decodedText, selectedHall);
        setScanResult(res);
        if (res.success && res.attendee) {
          setLastScannedAttendee(res.attendee);
        }
      },
      () => {
        // Silent frame warning while seeking QR code
      }
    );

    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch((err: any) => console.error(err));
      }
    };
  }, [selectedHall, markAttendance]);

  const handleManualVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!manualPayload) return;
    const res: ScanResultPayload = await markAttendance(manualPayload, selectedHall);
    setScanResult(res);
    if (res.success && res.attendee) {
      setLastScannedAttendee(res.attendee);
    }
  };

  const handleSimulateScan = async () => {
    const sampleReg = (registrations || []).find((r: any) => r.event_id && r.student_id) || {
      id: '11111111-9999-9999-9999-111111111111',
      student_id: '11111111-0000-0000-0000-000000000001',
      event_id: '11111111-1111-1111-1111-111111111111',
    };

    const simPayload = JSON.stringify({
      registration_id: sampleReg.id,
      event_id: sampleReg.event_id,
      user_id: sampleReg.student_id,
      student_id: sampleReg.student_id,
      timestamp: Date.now(),
    });

    const res: ScanResultPayload = await markAttendance(simPayload, selectedHall);
    setScanResult(res);
    if (res.success && res.attendee) {
      setLastScannedAttendee(res.attendee);
    }
  };

  // Find matching profile for last scanned student ID
  const attendeeProfile = lastScannedAttendee?.student_id
    ? (profilesList || []).find((p: any) => p.id === lastScannedAttendee.student_id)
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/coordinator')}
            className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            title="Return to Coordinator Console"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                QR Attendance Scanner
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1">
                <ScanLine className="w-3 h-3 text-emerald-600 animate-pulse" />
                Live Camera Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Scan student pass QR codes to update <code className="font-mono text-indigo-700 font-bold">attended = true</code> in Supabase
            </p>
          </div>
        </div>

        {/* Hall Selector */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs w-full sm:w-auto">
          <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="text-slate-500 font-medium whitespace-nowrap">Scan Hall:</span>
          <select
            value={selectedHall}
            onChange={(e) => setSelectedHall(e.target.value)}
            className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer w-full"
          >
            {halls.map((hall) => (
              <option key={hall} value={hall}>
                {hall}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Scanner Container Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Camera Scanner */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-600" />
              Venue Entry Door Scanner
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">
              Auto-marks attended = true
            </span>
          </div>

          {/* HTML5 QR Camera Element */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 overflow-hidden text-slate-900 shadow-2xs relative">
            <div id="coordinator-qr-reader" className="w-full text-slate-800 rounded-xl"></div>
          </div>

          {/* Developer Simulator Input & Quick Scan Button */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <label className="text-xs font-semibold text-slate-700 block">
              Manual QR Payload Simulator / Dev Check-in
            </label>
            <form onSubmit={handleManualVerify} className="flex gap-2">
              <input
                type="text"
                placeholder='Paste QR JSON string {"registration_id": "...", "event_id": "...", "user_id": "..."}'
                value={manualPayload}
                onChange={(e) => setManualPayload(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
              >
                Verify Pass
              </button>
            </form>

            <button
              onClick={handleSimulateScan}
              className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Simulate Valid Attendance Scan (Student Pass)
            </button>
          </div>
        </div>

        {/* Right Column: Live Toast Success Feedback Card */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            Live Verification Toast Feed
          </h2>

          {scanResult ? (
            <div
              className={`p-5 rounded-2xl border shadow-sm space-y-4 animate-fadeIn ${
                scanResult.success
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50/70 border-rose-200 text-rose-950'
              }`}
            >
              <div className="flex items-start gap-3">
                {scanResult.success ? (
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold">
                      {scanResult.success ? 'Attendance Verified!' : 'Verification Error'}
                    </h3>
                    {scanResult.success && (
                      <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-emerald-600 text-white shadow-2xs">
                        attended = true
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 mt-1 font-medium leading-relaxed">
                    {scanResult.message}
                  </p>
                </div>
              </div>

              {scanResult.success && (
                <div className="bg-white/80 backdrop-blur-xs p-4 rounded-xl border border-emerald-200/80 space-y-2 text-xs text-slate-800">
                  <div className="flex justify-between items-center pb-2 border-b border-emerald-100">
                    <span className="text-slate-500 font-medium">Attendee Name</span>
                    <span className="font-bold text-slate-900">
                      {attendeeProfile?.full_name || attendeeProfile?.name || 'Verified Student'}
                    </span>
                  </div>
                  {attendeeProfile?.college_id && (
                    <div className="flex justify-between items-center pb-2 border-b border-emerald-100">
                      <span className="text-slate-500 font-medium">College Reg No</span>
                      <span className="font-mono text-indigo-700 font-bold">
                        {attendeeProfile.college_id}
                      </span>
                    </div>
                  )}
                  {lastScannedAttendee?.registration_id && (
                    <div className="flex justify-between items-center pb-2 border-b border-emerald-100">
                      <span className="text-slate-500 font-medium">Registration ID</span>
                      <span className="font-mono text-xs text-slate-700 truncate max-w-[160px]">
                        {lastScannedAttendee.registration_id}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Scan Venue</span>
                    <span className="font-bold text-slate-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {selectedHall}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <ScanLine className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Ready to Scan Passes</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Position student QR code inside the camera viewfinder to automatically mark attendance on Supabase.
              </p>
            </div>
          )}

          {/* Security Notice Card */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 text-xs shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Real-Time Database Sync Active</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Scanning updates the <code className="font-mono text-indigo-700">registrations</code> table on Supabase setting <strong className="text-emerald-700 font-mono">attended = true</strong> and records an audit check-in log.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
