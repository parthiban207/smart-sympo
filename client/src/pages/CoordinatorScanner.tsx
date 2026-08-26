// agent-notes: { ctx: "Streamlined Coordinator QR Scanner with prominent top-right close button, Esc key listener, animated scan line, and clean feedback", deps: ["html5-qrcode", "src/context/AppContext.jsx", "src/utils/scanFeedback.js", "lucide-react", "react-router-dom"], state: "active", last: "antigravity@2026-08-26" }

import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  ScanLine,
  X,
  UserCheck,
  Building2,
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
  const { verifyQRPass, events } = useApp();
  const [selectedHall, setSelectedHall] = useState<string>('Hall 1 (Main Auditorium)');
  const [scanResult, setScanResult] = useState<ScanResultPayload | null>(null);
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

  // Clean Exit & Stop Camera Stream
  const handleCloseScanner = useCallback(async () => {
    if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
      } catch (err) {
        console.warn('[Camera Stop Warning]:', err);
      }
    }
    navigate('/coordinator', { replace: true });
  }, [navigate]);

  // Escape key listener to close scanner immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseScanner();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCloseScanner]);

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
        { fps: 10, qrbox: { width: 240, height: 240 } },
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
    }, 200);

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5 animate-fadeIn">
      {/* Top Header Card with Prominent Close '✕' Button */}
      <div className="flex items-center justify-between bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                QR Attendance Scanner
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Active
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Venue: <span className="font-semibold text-slate-700">{selectedHall}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Hall Selector Dropdown */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <select
              value={selectedHall}
              onChange={(e) => setSelectedHall(e.target.value)}
              className="bg-transparent text-slate-900 font-semibold focus:outline-none cursor-pointer text-xs"
            >
              {halls.map((hall) => (
                <option key={hall} value={hall}>
                  {hall}
                </option>
              ))}
            </select>
          </div>

          {/* Prominent Close ('✕') Button */}
          <button
            onClick={handleCloseScanner}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer shadow-2xs"
            title="Close Scanner & Return to Dashboard (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Camera Viewfinder Card with Animated Green Scan Line */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <ScanLine className="w-4 h-4 text-indigo-600" />
            <span>Position Student QR Pass Inside Frame</span>
          </div>

          <button
            onClick={toggleCamera}
            className="px-3 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <SwitchCamera className="w-3.5 h-3.5" />
            <span>Switch ({facingMode === 'environment' ? 'Front' : 'Back'})</span>
          </button>
        </div>

        {/* Viewfinder Element Container */}
        <div
          className={`bg-slate-950 rounded-2xl p-2 border overflow-hidden text-white relative min-h-[300px] flex items-center justify-center transition-all duration-300 ${
            overlayState === 'success'
              ? 'border-emerald-500 ring-4 ring-emerald-500/40'
              : overlayState === 'warning'
              ? 'border-amber-500 ring-4 ring-amber-500/40'
              : overlayState === 'error'
              ? 'border-rose-500 ring-4 ring-rose-500/40'
              : 'border-slate-800'
          }`}
        >
          <div id="coordinator-qr-reader-target" className="w-full text-white rounded-xl"></div>

          {/* Animated Green Laser Scan Line Overlay */}
          {!overlayState && (
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 pointer-events-none h-44 flex items-center justify-center">
              <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse"></div>
            </div>
          )}

          {/* Smooth Overlay Scan Feedback */}
          {overlayState === 'success' && (
            <div className="absolute inset-0 bg-emerald-500/20 pointer-events-none flex items-center justify-center animate-fadeIn">
              <div className="bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                <CheckCircle2 className="w-4 h-4" />
                <span>✓ Attendance Verified Successfully</span>
              </div>
            </div>
          )}

          {overlayState === 'warning' && (
            <div className="absolute inset-0 bg-amber-500/20 pointer-events-none flex items-center justify-center animate-fadeIn">
              <div className="bg-amber-600 text-white font-bold text-xs px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                <AlertTriangle className="w-4 h-4" />
                <span>Already Checked-In</span>
              </div>
            </div>
          )}

          {overlayState === 'error' && (
            <div className="absolute inset-0 bg-rose-500/20 pointer-events-none flex items-center justify-center animate-fadeIn">
              <div className="bg-rose-600 text-white font-bold text-xs px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                <AlertCircle className="w-4 h-4" />
                <span>Invalid QR Code</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Verification Feedback Popup Card (Shows on Scan) */}
      {scanResult && (
        <div
          className={`p-5 rounded-2xl border shadow-lg space-y-3 animate-fadeIn ${
            scanResult.success
              ? 'bg-emerald-50/95 border-emerald-300 text-emerald-950 ring-2 ring-emerald-400/30'
              : scanResult.isDuplicate || scanResult.status === 'ALREADY_SCANNED'
              ? 'bg-amber-50/95 border-amber-300 text-amber-950 ring-2 ring-amber-400/30'
              : 'bg-rose-50/95 border-rose-300 text-rose-950 ring-2 ring-rose-400/30'
          }`}
        >
          {/* 1. SUCCESS CARD: Genuine Name, Email, College, Roll Number & Registered Event */}
          {scanResult.success && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-5 h-5" />
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

                <button
                  onClick={handleResetForNextScan}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Scan Next</span>
                </button>
              </div>

              <div className="bg-white/95 p-3.5 rounded-xl border border-emerald-200 space-y-2 text-xs text-slate-800 shadow-2xs">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Student Name:
                  </span>
                  <span className="font-bold text-slate-900">
                    {scanResult.studentName || scanResult.student?.name || 'Student Attendee'}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Email:
                  </span>
                  <span className="font-medium text-slate-800">
                    {scanResult.email || scanResult.student?.email || 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    College:
                  </span>
                  <span className="font-semibold text-slate-800">
                    {scanResult.college || scanResult.student?.college || 'Engineering College'}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    Roll Number:
                  </span>
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {scanResult.rollNumber || scanResult.collegeId || scanResult.student?.college_id || 'STU-REG'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Registered Event:
                  </span>
                  <span className="font-bold text-slate-900 truncate max-w-[200px]">
                    {scanResult.eventTitle || scanResult.event?.title || 'Symposium Session'}
                  </span>
                </div>
              </div>

              <div className="text-right text-[11px] text-emerald-800 font-medium flex items-center justify-end gap-1">
                <Clock className="w-3 h-3 text-emerald-600" />
                <span>Auto-resetting in {autoResetCountdown ?? 3}s...</span>
              </div>
            </div>
          )}

          {/* 2. ALREADY SCANNED WARNING CARD */}
          {(scanResult.isDuplicate || scanResult.status === 'ALREADY_SCANNED') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-amber-900">
                      {scanResult.message || '⚠️ Already Checked-In'}
                    </h3>
                    <p className="text-[11px] text-amber-800">
                      This registration pass was previously verified
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleResetForNextScan}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Scan Next</span>
                </button>
              </div>

              {scanResult.studentName && (
                <div className="bg-white/95 p-3 rounded-xl border border-amber-200 space-y-1.5 text-xs text-slate-800 shadow-2xs">
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
                  {scanResult.rollNumber && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Roll No:</span>
                      <span className="font-mono font-bold text-indigo-700">{scanResult.rollNumber}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. INVALID / ERROR CARD */}
          {!scanResult.success && !scanResult.isDuplicate && scanResult.status !== 'ALREADY_SCANNED' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-rose-900">
                    ❌ Invalid QR Code! No registration found.
                  </h3>
                  <p className="text-xs text-rose-700">
                    {scanResult.message || 'No valid registration could be matched with the provided pass.'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleResetForNextScan}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
