// agent-notes: { ctx: "Streamlined modern SaaS Coordinator QR Scanner with camera switch, laser line guide, instant feedback overlay, and recent scan list", deps: ["html5-qrcode", "src/context/AppContext.jsx", "src/utils/scanFeedback.js", "lucide-react", "react-router-dom"], state: "active", last: "antigravity@2026-08-31" }

import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  CheckCircle2,
  AlertCircle,
  ScanLine,
  X,
  SwitchCamera,
  AlertTriangle,
  Building,
  Hash,
  Calendar,
  Clock,
  User,
  Mail,
  RefreshCw,
  MapPin,
  Sparkles,
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

    // 3-Second Auto-Reset Countdown
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

      const qrCodeScanner = new Html5Qrcode('coordinator-qr-reader-target', {
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });
      html5QrcodeRef.current = qrCodeScanner;

      await qrCodeScanner.start(
        { facingMode: mode },
        {
          fps: 25,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const boxSize = Math.max(200, Math.floor(minEdge * 0.78));
            return { width: boxSize, height: boxSize };
          },
        },
        async (decodedText) => {
          if (isProcessingScanRef.current) return;
          isProcessingScanRef.current = true;
          try {
            const res = await verifyQRPass(decodedText, selectedHall);
            handleProcessScan(res);
          } catch (err: any) {
            handleProcessScan({
              success: false,
              message: err?.message || 'Failed to verify pass',
              status: 'SCAN_ERROR',
            });
          }
        },
        () => {}
      );
    } catch (err) {
      console.warn('[Camera Start Warning]:', err);
    }
  }, [selectedHall, verifyQRPass, handleProcessScan]);

  useEffect(() => {
    startScanner(facingMode);
    return () => {
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
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shadow-xs">
            <ScanLine className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
              QR Scanner
            </h1>
            <p className="text-xs text-slate-500 font-medium">Scan and verify student attendance in real time</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700">
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
            <select
              value={selectedHall}
              onChange={(e) => setSelectedHall(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              {halls.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCloseScanner}
            className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer shadow-2xs"
            title="Exit Scanner (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Camera Viewfinder Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Position Student QR Pass Inside Frame</span>
          </div>

          <button
            onClick={toggleCamera}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <SwitchCamera className="w-3.5 h-3.5" />
            <span>Switch Lens</span>
          </button>
        </div>

        {/* Viewfinder Element Container */}
        <div
          className={`bg-slate-950 rounded-2xl p-2 border overflow-hidden text-white relative min-h-[300px] flex items-center justify-center transition-all duration-300 ${
            overlayState === 'success'
              ? 'border-emerald-500 ring-4 ring-emerald-500/30'
              : overlayState === 'warning'
              ? 'border-amber-500 ring-4 ring-amber-500/30'
              : overlayState === 'error'
              ? 'border-rose-500 ring-4 ring-rose-500/30'
              : 'border-slate-800'
          }`}
        >
          <div id="coordinator-qr-reader-target" className="w-full text-white rounded-xl"></div>

          {/* Animated Green Laser Scan Line */}
          {!overlayState && (
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 pointer-events-none h-44 flex items-center justify-center">
              <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse"></div>
            </div>
          )}

          {/* Overlay Feedback States */}
          {overlayState === 'success' && (
            <div className="absolute inset-0 bg-emerald-500/20 pointer-events-none flex items-center justify-center animate-fadeIn">
              <div className="bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                <CheckCircle2 className="w-4 h-4" />
                <span>Attendance Verified Successfully</span>
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

      {/* Live Verification Result Popup Card */}
      {scanResult && (
        <div
          className={`p-6 rounded-3xl border shadow-xl space-y-4 animate-slideUp ${
            scanResult.success
              ? 'bg-emerald-50/95 border-emerald-300 text-emerald-950 ring-2 ring-emerald-400/20'
              : scanResult.isDuplicate || scanResult.status === 'ALREADY_SCANNED'
              ? 'bg-amber-50/95 border-amber-300 text-amber-950 ring-2 ring-amber-400/20'
              : 'bg-rose-50/95 border-rose-300 text-rose-950 ring-2 ring-rose-400/20'
          }`}
        >
          {/* Success Card Details */}
          {scanResult.success && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-emerald-900">
                      Attendance Verified Successfully
                    </h3>
                    <p className="text-[11px] text-emerald-700 font-medium">
                      Student attendance recorded & synchronized
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleResetForNextScan}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Scan Next</span>
                </button>
              </div>

              <div className="bg-white/95 p-4 rounded-2xl border border-emerald-200/90 space-y-2.5 text-xs text-slate-800 shadow-2xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Student Name
                  </span>
                  <span className="font-bold text-slate-900">
                    {scanResult.studentName || scanResult.student?.name || 'Student Attendee'}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Email
                  </span>
                  <span className="font-medium text-slate-800">
                    {scanResult.email || scanResult.student?.email || 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    Institution
                  </span>
                  <span className="font-semibold text-slate-800">
                    {scanResult.college || scanResult.student?.college || 'Engineering College'}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    Roll / Reg Number
                  </span>
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                    {scanResult.rollNumber || scanResult.collegeId || scanResult.student?.college_id || 'STU-REG'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Registered Track
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

          {/* Already Scanned or Warning Card */}
          {(scanResult.isDuplicate || scanResult.status === 'ALREADY_SCANNED') && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-amber-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-amber-900">
                      {scanResult.message || 'Already Checked-In'}
                    </h3>
                    <p className="text-[11px] text-amber-800">
                      This registration pass was previously validated
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleResetForNextScan}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Scan Next</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Card */}
          {!scanResult.success && !scanResult.isDuplicate && scanResult.status !== 'ALREADY_SCANNED' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-rose-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-rose-900">
                      Verification Failed
                    </h3>
                    <p className="text-[11px] text-rose-800">
                      {scanResult.message || 'Invalid or expired token'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleResetForNextScan}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
