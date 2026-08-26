// agent-notes: { ctx: "Coordinator full-page QR attendance scanner with real details display, 3s auto-reset timeout, and manual Scan Next button", deps: ["html5-qrcode", "src/context/AppContext.jsx", "src/utils/scanFeedback.js", "lucide-react"], state: "active", last: "antigravity@2026-08-26" }

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
  AlertTriangle,
  Building,
  Hash,
  Calendar,
  Clock,
  User,
  Mail,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  playScanSuccessSound,
  playScanWarningSound,
  playScanErrorSound,
  triggerScanHaptic,
} from '../utils/scanFeedback';

export interface ScanResultPayload {
  success: boolean;
  message: string;
  status?: string;
  isDuplicate?: boolean;
  attended_at?: string;
  studentName?: string;
  email?: string;
  college?: string;
  rollNumber?: string;
  eventTitle?: string;
  hallNumber?: string;
  collegeId?: string;
  timeSlot?: string;
  student?: {
    id?: string;
    name?: string;
    college?: string;
    college_id?: string;
    email?: string;
  };
  event?: {
    id?: string;
    title?: string;
    hall_number?: string;
    category?: string;
  };
  attendee?: {
    registration_id?: string;
    event_id?: string;
    student_id?: string;
    user_id?: string;
  };
}

export default function CoordinatorScanner() {
  const navigate = useNavigate();
  const { verifyQRPass, events, registrations, currentUser } = useApp();
  const [selectedHall, setSelectedHall] = useState<string>('Hall 1 (Main Auditorium)');
  const [scanResult, setScanResult] = useState<ScanResultPayload | null>(null);
  const [manualPayload, setManualPayload] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [overlayState, setOverlayState] = useState<'success' | 'warning' | 'error' | null>(null);
  const [autoResetCountdown, setAutoResetCountdown] = useState<number | null>(null);

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const isProcessingScanRef = useRef<boolean>(false);
  const autoResetTimerRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);

  const halls: string[] = Array.from(
    new Set((events || []).map((e: any) => e.hall_number || 'Hall 1 (Main Auditorium)'))
  );

  const handleResetForNextScan = useCallback(() => {
    if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setScanResult(null);
    setOverlayState(null);
    setAutoResetCountdown(null);
    isProcessingScanRef.current = false;
  }, []);

  const handleProcessScan = useCallback((res: ScanResultPayload) => {
    isProcessingScanRef.current = true;
    setScanResult(res);

    if (res.success) {
      playScanSuccessSound();
      triggerScanHaptic('success');
      setOverlayState('success');
    } else if (res.isDuplicate || res.status === 'ALREADY_SCANNED') {
      playScanWarningSound();
      triggerScanHaptic('warning');
      setOverlayState('warning');
    } else {
      playScanErrorSound();
      triggerScanHaptic('error');
      setOverlayState('error');
    }

    // 3-Second Visual Countdown & Auto-Reset for Seamless Next Scan
    setAutoResetCountdown(3);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = setInterval(() => {
      setAutoResetCountdown((prev) => (prev && prev > 1 ? prev - 1 : null));
    }, 1000);

    if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
    autoResetTimerRef.current = setTimeout(() => {
      handleResetForNextScan();
    }, 3000);
  }, [handleResetForNextScan]);

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
          if (isProcessingScanRef.current) return;
          const res: ScanResultPayload = await verifyQRPass(decodedText, selectedHall);
          handleProcessScan(res);
        },
        () => {}
      );
    } catch (err: any) {
      console.warn('[CoordinatorScanner Camera Error]:', err);
    }
  }, [selectedHall, verifyQRPass, handleProcessScan]);

  useEffect(() => {
    const timer = setTimeout(() => {
      startScanner(facingMode);
    }, 250);

    return () => {
      clearTimeout(timer);
      if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
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
    handleProcessScan(res);
  };

  const handleSimulateScan = async () => {
    if (registrations.length > 0) {
      const sampleReg = registrations[0];
      const demoPayload = JSON.stringify({
        registrationId: sampleReg.id,
        studentId: sampleReg.student_id,
        email: sampleReg.student_email || sampleReg.profiles?.email || 'student@college.edu',
        eventId: sampleReg.event_id,
        hall_number: selectedHall,
      });
      const res: ScanResultPayload = await verifyQRPass(demoPayload, selectedHall);
      handleProcessScan(res);
    } else {
      const samplePayload = JSON.stringify({
        studentId: currentUser?.id || '33333333-0000-4000-8000-000000000003',
        registrationId: '33333333-0000-4000-8000-000000000003',
        email: currentUser?.email || 'student@college.edu',
        eventId: events[0]?.id || '',
        hall_number: selectedHall,
      });
      const res: ScanResultPayload = await verifyQRPass(samplePayload, selectedHall);
      handleProcessScan(res);
    }
  };

  const handleWrongScanSim = async () => {
    const invalidPayload = 'INVALID_WRONG_QR_CODE_123';
    const res: ScanResultPayload = await verifyQRPass(invalidPayload, selectedHall);
    handleProcessScan(res);
  };

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

          {/* HTML5 QR Camera Element with Feedback Overlay */}
          <div
            className={`bg-slate-900 rounded-2xl p-2 border overflow-hidden text-white relative min-h-[260px] flex items-center justify-center transition-all duration-300 ${
              overlayState === 'success'
                ? 'border-emerald-500 ring-4 ring-emerald-500/40 shadow-lg shadow-emerald-500/20'
                : overlayState === 'warning'
                ? 'border-amber-500 ring-4 ring-amber-500/40 shadow-lg shadow-amber-500/20'
                : overlayState === 'error'
                ? 'border-rose-500 ring-4 ring-rose-500/40 shadow-lg shadow-rose-500/20'
                : 'border-slate-700'
            }`}
          >
            <div id="coordinator-qr-reader-target" className="w-full text-white rounded-xl"></div>

            {/* Smooth Overlay Scan Feedback */}
            {overlayState === 'success' && (
              <div className="absolute inset-0 bg-emerald-500/20 pointer-events-none flex items-center justify-center animate-pulse">
                <div className="bg-emerald-600/90 text-white font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>✓ Attendance Verified Successfully</span>
                </div>
              </div>
            )}

            {overlayState === 'warning' && (
              <div className="absolute inset-0 bg-amber-500/20 pointer-events-none flex items-center justify-center animate-pulse">
                <div className="bg-amber-600/90 text-white font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Already Checked-In</span>
                </div>
              </div>
            )}

            {overlayState === 'error' && (
              <div className="absolute inset-0 bg-rose-500/20 pointer-events-none flex items-center justify-center animate-pulse">
                <div className="bg-rose-600/90 text-white font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                  <AlertCircle className="w-4 h-4" />
                  <span>Invalid QR Code</span>
                </div>
              </div>
            )}
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

        {/* Right Column: Live Toast Verification Feedback with Auto-Reset & Scan Next Student */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Live Verification Feedback
            </h2>
            {scanResult && (
              <button
                onClick={handleResetForNextScan}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 text-indigo-600" />
                Scan Next Student
              </button>
            )}
          </div>

          {scanResult ? (
            <div
              className={`p-5 rounded-2xl border shadow-md space-y-3 animate-fadeIn ${
                scanResult.success
                  ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 ring-2 ring-emerald-400/30'
                  : scanResult.isDuplicate || scanResult.status === 'ALREADY_SCANNED'
                  ? 'bg-amber-50/90 border-amber-300 text-amber-950 ring-2 ring-amber-400/30'
                  : 'bg-rose-50/90 border-rose-300 text-rose-950 ring-2 ring-rose-400/30'
              }`}
            >
              {/* 1. SUCCESS CARD: Genuine Name, Email, College, Roll Number & Registered Event */}
              {scanResult.success && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 pb-2 border-b border-emerald-200">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs animate-bounce">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-emerald-900">
                        ✓ Attendance Verified Successfully
                      </h3>
                      <p className="text-[11px] text-emerald-700 font-medium">
                        Participation confirmed & synced in real-time
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/90 p-3.5 rounded-xl border border-emerald-200 space-y-2 text-xs text-slate-800 shadow-2xs">
                    {/* Genuine Student Name */}
                    <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        Student Name:
                      </span>
                      <span className="font-bold text-slate-900">
                        {scanResult.studentName || scanResult.student?.name || 'Student Attendee'}
                      </span>
                    </div>

                    {/* Genuine Email */}
                    <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        Email:
                      </span>
                      <span className="font-medium text-slate-800">
                        {scanResult.email || scanResult.student?.email || 'N/A'}
                      </span>
                    </div>

                    {/* Genuine College */}
                    <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400" />
                        College:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {scanResult.college || scanResult.student?.college || 'Engineering College'}
                      </span>
                    </div>

                    {/* Genuine Roll / Reg Number */}
                    <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <Hash className="w-3 h-3 text-slate-400" />
                        Roll Number:
                      </span>
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {scanResult.rollNumber || scanResult.collegeId || scanResult.student?.college_id || 'STU-REG'}
                      </span>
                    </div>

                    {/* Genuine Registered Event */}
                    <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Registered Event:
                      </span>
                      <span className="font-bold text-slate-900 truncate max-w-[180px]">
                        {scanResult.eventTitle || scanResult.event?.title || 'Symposium Session'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Verified At:
                      </span>
                      <span className="font-mono text-[11px] text-emerald-800 font-semibold">
                        {scanResult.attended_at ? new Date(scanResult.attended_at).toLocaleTimeString() : 'Just now'}
                      </span>
                    </div>
                  </div>

                  {/* Auto-Reset 3s countdown status & manual Scan Next button */}
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-emerald-800 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-600" />
                      Auto-resetting in {autoResetCountdown ?? 3}s...
                    </span>
                    <button
                      onClick={handleResetForNextScan}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Scan Next Student</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 2. ALREADY SCANNED WARNING CARD */}
              {(scanResult.isDuplicate || scanResult.status === 'ALREADY_SCANNED') && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-amber-900">
                        {scanResult.message || '⚠️ Already Checked-In'}
                      </h3>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        This registration pass was previously verified.
                      </p>
                    </div>
                  </div>

                  {scanResult.studentName && (
                    <div className="bg-white/90 p-3 rounded-xl border border-amber-200 space-y-1.5 text-xs text-slate-800 shadow-2xs">
                      <div className="flex justify-between pb-1 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">Attendee:</span>
                        <span className="font-bold text-slate-900">{scanResult.studentName}</span>
                      </div>
                      {scanResult.email && (
                        <div className="flex justify-between pb-1 border-b border-slate-100">
                          <span className="text-slate-500 font-medium">Email:</span>
                          <span className="font-medium text-slate-800">{scanResult.email}</span>
                        </div>
                      )}
                      {scanResult.college && (
                        <div className="flex justify-between pb-1 border-b border-slate-100">
                          <span className="text-slate-500 font-medium">College:</span>
                          <span className="font-semibold text-slate-800">{scanResult.college}</span>
                        </div>
                      )}
                      {scanResult.rollNumber && (
                        <div className="flex justify-between pb-1 border-b border-slate-100">
                          <span className="text-slate-500 font-medium">Roll No:</span>
                          <span className="font-mono font-bold text-indigo-700">{scanResult.rollNumber}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Event:</span>
                        <span className="font-semibold text-slate-900">{scanResult.eventTitle || 'Session'}</span>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-amber-800 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      Auto-resetting in {autoResetCountdown ?? 3}s...
                    </span>
                    <button
                      onClick={handleResetForNextScan}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Scan Next Student</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 3. INVALID / ERROR CARD */}
              {!scanResult.success && !scanResult.isDuplicate && scanResult.status !== 'ALREADY_SCANNED' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-rose-900">
                        ❌ Invalid QR Code! No registration found.
                      </h3>
                      <p className="text-xs text-rose-700 mt-1">
                        {scanResult.message || 'No valid registration could be matched with the provided QR pass.'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-rose-800 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3 text-rose-600" />
                      Auto-resetting in {autoResetCountdown ?? 3}s...
                    </span>
                    <button
                      onClick={handleResetForNextScan}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Try Again</span>
                    </button>
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
              Scanning validates the student pass, marks event attendance (<code className="text-indigo-700 font-bold font-mono">attended=true</code>), and broadcasts updates in real-time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
