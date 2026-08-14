// agent-notes: { ctx: "Coordinator full-page QR attendance scanner with front/back camera selection and rich verification feedback", deps: ["html5-qrcode", "src/context/AppContext.jsx", "lucide-react"], state: "active", last: "antigravity@2026-08-13" }

import { useEffect, useState, useRef, FormEvent, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
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
  SwitchCamera,
  Check,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export interface ScanResultPayload {
  success: boolean;
  message: string;
  isDuplicate?: boolean;
  studentName?: string;
  eventTitle?: string;
  hallNumber?: string;
  collegeId?: string;
  attendee?: {
    registration_id?: string;
    event_id?: string;
    student_id?: string;
    user_id?: string;
  };
}

export default function CoordinatorScanner() {
  const navigate = useNavigate();
  const { markAttendance, verifyQRPass, events, registrations, profilesList, currentUser } = useApp();
  const [selectedHall, setSelectedHall] = useState<string>('Hall 1 (Main Auditorium)');
  const [scanResult, setScanResult] = useState<ScanResultPayload | null>(null);
  const [manualPayload, setManualPayload] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [lastScannedAttendee, setLastScannedAttendee] = useState<{
    registration_id?: string;
    event_id?: string;
    student_id?: string;
  } | null>(null);

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  const halls: string[] = Array.from(
    new Set((events || []).map((e: any) => e.hall_number || 'Hall 1 (Main Auditorium)'))
  );

  const startScanner = useCallback(async (mode: 'environment' | 'user') => {
    try {
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        await html5QrcodeRef.current.stop();
      }

      const qrScanner = new Html5Qrcode('coordinator-qr-reader-target');
      html5QrcodeRef.current = qrScanner;

      await qrScanner.start(
        { facingMode: mode },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          const res: ScanResultPayload = await verifyQRPass(decodedText, selectedHall);
          setScanResult(res);
          if (res.success && res.attendee) {
            setLastScannedAttendee(res.attendee);
          }
        },
        () => {}
      );
    } catch (err: any) {
      console.warn('[CoordinatorScanner Camera Error]:', err);
    }
  }, [selectedHall, verifyQRPass]);

  useEffect(() => {
    const timer = setTimeout(() => {
      startScanner(facingMode);
    }, 250);

    return () => {
      clearTimeout(timer);
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch(() => {});
      }
    };
  }, [facingMode, startScanner]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleManualVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!manualPayload.trim()) return;
    const res: ScanResultPayload = await verifyQRPass(manualPayload, selectedHall);
    setScanResult(res);
  };

  const handleSimulateScan = async () => {
    if (registrations.length > 0) {
      const sampleReg = registrations[0];
      const demoPayload = JSON.stringify({
        student_id: sampleReg.student_id,
        event_id: sampleReg.event_id,
        hall_number: selectedHall,
      });
      const res: ScanResultPayload = await verifyQRPass(demoPayload, selectedHall);
      setScanResult(res);
    } else {
      const samplePayload = JSON.stringify({
        student_id: currentUser?.id || '',
        event_id: events[0]?.id || '',
        hall_number: selectedHall,
      });
      const res: ScanResultPayload = await verifyQRPass(samplePayload, selectedHall);
      setScanResult(res);
    }
  };

  const handleWrongScanSim = async () => {
    const invalidPayload = 'INVALID_WRONG_QR_CODE_123';
    const res: ScanResultPayload = await verifyQRPass(invalidPayload, selectedHall);
    setScanResult(res);
  };

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
                Live Camera Active ({facingMode === 'environment' ? 'Back' : 'Front'})
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Scan student pass QR codes to verify participation & update <code className="font-mono text-indigo-700 font-bold">attended = true</code>
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
            <button
              onClick={toggleCamera}
              className="px-3 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <SwitchCamera className="w-3.5 h-3.5" />
              <span>Switch ({facingMode === 'environment' ? 'Front' : 'Back Main'})</span>
            </button>
          </div>

          {/* HTML5 QR Camera Element */}
          <div className="bg-slate-900 rounded-2xl p-2 border border-slate-700 overflow-hidden text-white relative min-h-[260px] flex items-center justify-center">
            <div id="coordinator-qr-reader-target" className="w-full text-white rounded-xl"></div>
          </div>

          {/* Manual Payload Simulator & Quick Scan Buttons */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <label className="text-xs font-semibold text-slate-700 block">
              Manual QR Code Payload Simulator
            </label>
            <form onSubmit={handleManualVerify} className="flex gap-2">
              <input
                type="text"
                placeholder='Paste QR JSON payload...'
                value={manualPayload}
                onChange={(e) => setManualPayload(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
              >
                Verify
              </button>
            </form>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleSimulateScan}
                className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Simulate Correct Code</span>
              </button>

              <button
                onClick={handleWrongScanSim}
                className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Simulate Wrong Code</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Toast Verification Feedback */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            Live Verification Toast Feed
          </h2>

          {scanResult ? (
            <div
              className={`p-5 rounded-2xl border shadow-sm space-y-4 animate-fadeIn ${
                scanResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50 border-rose-200 text-rose-950'
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
                  <h3 className="text-base font-extrabold flex items-center gap-2">
                    {scanResult.success ? '✅ Successfully Verified!' : '❌ Wrong QR Code!'}
                  </h3>
                  <p className="text-xs text-slate-700 mt-1 font-medium leading-relaxed">
                    {scanResult.message}
                  </p>
                </div>
              </div>

              {scanResult.success && (
                <div className="bg-white p-4 rounded-xl border border-emerald-200 space-y-2 text-xs text-slate-800">
                  <div className="flex justify-between items-center pb-2 border-b border-emerald-100">
                    <span className="text-slate-500 font-medium">Student Name:</span>
                    <span className="font-bold text-slate-900">
                      {scanResult.studentName || attendeeProfile?.full_name || 'Attendee'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-emerald-100">
                    <span className="text-slate-500 font-medium">Event Track:</span>
                    <span className="font-bold text-indigo-700">
                      {scanResult.eventTitle || 'Event Session'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-emerald-100">
                    <span className="text-slate-500 font-medium">Scan Venue:</span>
                    <span className="font-bold text-slate-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {scanResult.hallNumber || selectedHall}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Participation:</span>
                    <span className="font-bold text-emerald-800 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Registered & Attended
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
                Position student QR code inside the camera viewfinder to automatically verify event participation.
              </p>
            </div>
          )}

          {/* Security Notice Card */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 text-xs shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Real-Time Event Verification Active</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Scanning validates the student pass, marks event attendance, and updates real-time venue records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
