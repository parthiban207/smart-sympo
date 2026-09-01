// agent-notes: { ctx: "QR Camera Scanner Modal with audio/haptic feedback, genuine student details, 3s auto-reset timeout, and Scan Next button", deps: ["html5-qrcode", "react-qr-code", "src/context/AppContext.jsx", "src/utils/scanFeedback.js", "lucide-react"], state: "active", last: "antigravity@2026-08-31" }

import { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'react-qr-code';
import {
  X, Camera, CheckCircle2, AlertCircle, RefreshCw, User, SwitchCamera,
  QrCode, Copy, CheckCheck, AlertTriangle, Building, Hash, Calendar, Clock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  playScanSuccessSound,
  playScanWarningSound,
  playScanErrorSound,
  triggerScanHaptic,
} from '../utils/scanFeedback';

export default function QRScannerModal({ isOpen, onClose, selectedHall, isGuestMode = false }) {
  const { verifyQRPass, checkinGuest, registrations, events = [] } = useApp();
  const [scanResult, setScanResult] = useState(null);
  const [manualPayload, setManualPayload] = useState('');
  const [facingMode, setFacingMode] = useState('environment');
  const [guestName, setGuestName] = useState('');
  const [guestEvent, setGuestEvent] = useState('');
  const [guestModeTab, setGuestModeTab] = useState('scan'); // 'scan' | 'generate'
  const [copied, setCopied] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [overlayState, setOverlayState] = useState(null); // 'success' | 'warning' | 'error' | null
  const [autoResetCountdown, setAutoResetCountdown] = useState(null);

  const html5QrcodeRef = useRef(null);
  const isProcessingScanRef = useRef(false);
  const autoResetTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const handleResetForNextScan = useCallback(() => {
    if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setScanResult(null);
    setOverlayState(null);
    setAutoResetCountdown(null);
    isProcessingScanRef.current = false;
  }, []);

  const processScanResult = useCallback((res) => {
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

    // 3-Second Visual Countdown & Auto-Reset
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

  const startScanner = useCallback(async (mode) => {
    setCameraError(null);
    try {
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        await html5QrcodeRef.current.stop();
      }

      const qrCodeScanner = new Html5Qrcode('qr-reader-target', {
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
          aspectRatio: 1.0,
          videoConstraints: {
            facingMode: mode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        async (decodedText) => {
          if (isProcessingScanRef.current) return;
          let res;
          if (isGuestMode) {
            res = await checkinGuest(decodedText, selectedHall);
          } else {
            res = await verifyQRPass(decodedText, selectedHall);
          }
          processScanResult(res);
        },
        () => {}
      );
    } catch (err) {
      console.warn('[QR Scanner Camera Error]:', err);
      setCameraError('Camera access restricted or unavailable. Use manual verify or dev simulator below.');
    }
  }, [isGuestMode, selectedHall, checkinGuest, verifyQRPass, processScanResult]);

  useEffect(() => {
    if (!isOpen || (isGuestMode && guestModeTab === 'generate')) return;

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
  }, [isOpen, facingMode, guestModeTab, isGuestMode, startScanner]);

  if (!isOpen) return null;

  const toggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualPayload.trim()) return;

    let res;
    if (isGuestMode) {
      res = await checkinGuest(manualPayload, selectedHall);
    } else {
      res = await verifyQRPass(manualPayload, selectedHall);
    }
    processScanResult(res);
  };

  const currentGuestEventId = guestEvent || events[0]?.id || '';
  const currentGuestEventObj = events.find((e) => e.id === currentGuestEventId);

  const generatedGuestPayload = JSON.stringify({
    guest_name: guestName.trim() || 'Chief Guest Attendee',
    event_id: currentGuestEventId,
    event_title: currentGuestEventObj?.title || 'Symposium Main Session',
    hall_number: selectedHall || currentGuestEventObj?.hall_number || 'Main Venue',
    is_guest: true,
    created_at: new Date().toISOString(),
  });

  const handleDirectCheckinGenerated = async () => {
    const res = await checkinGuest(generatedGuestPayload, selectedHall || currentGuestEventObj?.hall_number || 'Main Venue');
    processScanResult(res);
  };

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(generatedGuestPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickDemoScan = async () => {
    if (isGuestMode) {
      const demoPayload = JSON.stringify({
        guest_name: 'VIP Keynote Speaker',
        event_id: events[0]?.id || '',
        event_title: events[0]?.title || 'Main Keynote Session',
        hall_number: selectedHall || 'Main Auditorium',
        is_guest: true,
      });
      const res = await checkinGuest(demoPayload, selectedHall);
      processScanResult(res);
    } else if (registrations.length > 0) {
      const sampleReg = registrations[0];
      const demoPayload = JSON.stringify({
        registrationId: sampleReg.id,
        studentId: sampleReg.student_id,
        email: sampleReg.student_email || 'student@college.edu',
        eventId: sampleReg.event_id,
        hall_number: selectedHall,
      });
      const res = await verifyQRPass(demoPayload, selectedHall);
      processScanResult(res);
    } else {
      const samplePayload = JSON.stringify({
        studentId: '33333333-0000-4000-8000-000000000003',
        registrationId: '33333333-0000-4000-8000-000000000003',
        email: 'student@college.edu',
        eventId: events[0]?.id || '',
        hall_number: selectedHall,
      });
      const res = await verifyQRPass(samplePayload, selectedHall);
      processScanResult(res);
    }
  };

  const handleWrongScanSim = async () => {
    const invalidPayload = 'INVALID_UNRECOGNIZED_QR_CODE_STRING_999';
    let res;
    if (isGuestMode) {
      res = await checkinGuest(invalidPayload, selectedHall);
    } else {
      res = await verifyQRPass(invalidPayload, selectedHall);
    }
    processScanResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0F19]/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#151D2F]/95 border border-slate-700/60 w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl shadow-indigo-950/50 relative text-center max-h-[90vh] overflow-y-auto text-white animate-slideUp backdrop-blur-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700/60 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-1 justify-center">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <Camera className="w-4 h-4" />
          </div>
          <h3 className="text-base font-extrabold text-white tracking-tight">
            {isGuestMode ? 'Guest Check-in' : 'QR Scanner'}
          </h3>
        </div>

        <p className="text-xs text-slate-400 mb-4 font-medium">
          Venue: <span className="font-bold text-cyan-400">{selectedHall || 'All Venues'}</span>
        </p>

        {/* Guest Mode Mode Selector Toggle */}
        {isGuestMode && (
          <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 w-full mb-4">
            <button
              type="button"
              onClick={() => {
                setGuestModeTab('scan');
                handleResetForNextScan();
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                guestModeTab === 'scan'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Scan Guest QR
            </button>

            <button
              type="button"
              onClick={() => {
                setGuestModeTab('generate');
                handleResetForNextScan();
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                guestModeTab === 'generate'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              Generate Guest Pass
            </button>
          </div>
        )}

        {/* Scan Result Feedback Card */}
        {scanResult && (
          <div
            className={`p-4 rounded-2xl mb-4 text-left border shadow-lg transition-all duration-300 ${
              scanResult.success
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100 ring-2 ring-emerald-500/20'
                : scanResult.isDuplicate || scanResult.status === 'ALREADY_SCANNED'
                ? 'bg-amber-950/90 border-amber-500/50 text-amber-100 ring-2 ring-amber-500/20'
                : 'bg-rose-950/90 border-rose-500/50 text-rose-100 ring-2 ring-rose-500/20'
            }`}
          >
            {/* 1. SUCCESS STATE */}
            {scanResult.success && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-800/60">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500 text-slate-950 shrink-0 shadow-xs">
                      <CheckCircle2 className="w-5 h-5 text-slate-950 stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-emerald-300">
                          Verified ✅
                        </h4>
                        <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          {scanResult.checked_in_at ? new Date(scanResult.checked_in_at).toLocaleTimeString() : new Date().toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-400/90 font-medium">
                        Student attendance recorded in real-time
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleResetForNextScan}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                    title="Scan Next Student"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Scan Next</span>
                  </button>
                </div>

                {/* Student & Event Details Card */}
                <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-emerald-500/30 space-y-2 text-xs text-slate-200 shadow-2xs">
                  <div className="flex justify-between items-center pb-1.5 border-b border-slate-800">
                    <span className="text-slate-400 font-medium flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      Student Name:
                    </span>
                    <span className="font-bold text-white">
                      {scanResult.studentProfile?.full_name || scanResult.parsedData?.full_name || scanResult.studentName || (scanResult.studentProfile?.email ? scanResult.studentProfile.email.split('@')[0] : 'Delegate')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-1.5 border-b border-slate-800">
                    <span className="text-slate-400 font-medium flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5 text-slate-500" />
                      Roll Number:
                    </span>
                    <span className="font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
                      {scanResult.studentProfile?.roll_no || scanResult.parsedData?.roll_no || scanResult.rollNumber || 'N/A'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-1.5 border-b border-slate-800">
                    <span className="text-slate-400 font-medium flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-slate-500" />
                      Department & College:
                    </span>
                    <span className="font-semibold text-slate-300 text-right truncate max-w-[200px]">
                      {scanResult.studentProfile?.department || scanResult.parsedData?.department || scanResult.department || 'CSE'}
                      {(scanResult.studentProfile?.college || scanResult.parsedData?.college || scanResult.college) ? ` • ${scanResult.studentProfile?.college || scanResult.parsedData?.college || scanResult.college}` : ''}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-1.5 border-b border-slate-800">
                    <span className="text-slate-400 font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      Registered Track:
                    </span>
                    <span className="font-bold text-cyan-300 truncate max-w-[180px]">
                      {scanResult.eventTitle || scanResult.event?.title || 'Symposium Track'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Check-in Status:
                    </span>
                    <span className="font-mono text-[11px] text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                      <span>Verified ✅</span>
                      <span>{scanResult.checked_in_at ? new Date(scanResult.checked_in_at).toLocaleTimeString() : new Date().toLocaleTimeString()}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    Auto-resetting in {autoResetCountdown ?? 3}s...
                  </span>
                  <button
                    onClick={handleResetForNextScan}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Scan Next Student</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2. ALREADY SCANNED WARNING STATE */}
            {(scanResult.isDuplicate || scanResult.status === 'ALREADY_SCANNED') && (
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500 text-slate-950 shrink-0 shadow-xs">
                    <AlertTriangle className="w-5 h-5 text-slate-950 stroke-[2.5]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-extrabold text-xs text-amber-300">
                      {scanResult.message || 'Already Checked-In'}
                    </h4>
                    <p className="text-[11px] text-amber-400/90 mt-0.5">
                      This QR code was already scanned earlier for this session.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-amber-400 font-medium">
                    Auto-resetting in {autoResetCountdown ?? 3}s...
                  </span>
                  <button
                    onClick={handleResetForNextScan}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Scan Next</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3. INVALID / ERROR STATE */}
            {!scanResult.success && !scanResult.isDuplicate && scanResult.status !== 'ALREADY_SCANNED' && (
              <div className="space-y-2">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-500 text-white shrink-0 shadow-xs">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-rose-300">
                      Invalid QR Code
                    </h4>
                    <p className="text-xs text-rose-400 mt-0.5">
                      {scanResult.message || 'No valid registration found for this event.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-rose-400 font-medium">
                    Auto-resetting in {autoResetCountdown ?? 3}s...
                  </span>
                  <button
                    onClick={handleResetForNextScan}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: Camera Scanner View */}
        {(!isGuestMode || guestModeTab === 'scan') && (
          <>
            {/* Camera Switch Controls */}
            <div className="flex justify-center mb-3">
              <button
                onClick={toggleCamera}
                className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <SwitchCamera className="w-3.5 h-3.5 text-indigo-400" />
                <span>Switch Lens ({facingMode === 'environment' ? 'Front' : 'Back'})</span>
              </button>
            </div>

            {/* HTML5 QR Camera Video Target Container with Laser Line */}
            <div
              className={`bg-slate-950 rounded-2xl p-2 border overflow-hidden relative min-h-[250px] flex items-center justify-center transition-all duration-300 ${
                overlayState === 'success'
                  ? 'border-emerald-500 ring-4 ring-emerald-500/30'
                  : overlayState === 'warning'
                  ? 'border-amber-500 ring-4 ring-amber-500/30'
                  : overlayState === 'error'
                  ? 'border-rose-500 ring-4 ring-rose-500/30'
                  : 'border-slate-800'
              }`}
            >
              <div id="qr-reader-target" className="w-full text-white"></div>

              {/* Animated Laser Scan Line */}
              {!overlayState && (
                <div className="laser-scan-line"></div>
              )}

              {/* Scanning Overlay feedback glow */}
              {overlayState === 'success' && (
                <div className="absolute inset-0 bg-emerald-500/20 pointer-events-none flex items-center justify-center animate-pulse">
                  <div className="bg-emerald-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Attendance Verified Successfully</span>
                  </div>
                </div>
              )}

              {overlayState === 'warning' && (
                <div className="absolute inset-0 bg-amber-500/20 pointer-events-none flex items-center justify-center animate-pulse">
                  <div className="bg-amber-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Already Checked-In</span>
                  </div>
                </div>
              )}

              {overlayState === 'error' && (
                <div className="absolute inset-0 bg-rose-500/20 pointer-events-none flex items-center justify-center animate-pulse">
                  <div className="bg-rose-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                    <AlertCircle className="w-4 h-4" />
                    <span>Invalid QR Code</span>
                  </div>
                </div>
              )}

              {cameraError && (
                <div className="p-4 text-center text-xs text-rose-300 bg-rose-950/80 border border-rose-800 rounded-xl space-y-2 max-w-xs">
                  <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" />
                  <p>{cameraError}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: Generate Guest Pass View */}
        {isGuestMode && guestModeTab === 'generate' && (
          <div className="space-y-4 text-left">
            <div className="space-y-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Guest Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. K. Ramanathan (Chief Guest)"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition-all font-medium"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Target Event Session</label>
                <select
                  value={guestEvent}
                  onChange={(e) => setGuestEvent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 transition-all font-medium"
                >
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.title} ({evt.hall_number || 'Main Venue'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Generated Live QR Pass Preview */}
            <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col items-center justify-center space-y-3">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                Live Dynamic Guest QR Pass
              </span>

              <div className="p-3 bg-white border border-slate-700 rounded-xl shadow-xs">
                <QRCode value={generatedGuestPayload} size={150} viewBox={`0 0 256 256`} />
              </div>

              <div className="text-center">
                <div className="font-bold text-xs text-white">{guestName.trim() || 'Guest Attendee'}</div>
                <div className="text-[11px] text-slate-400 font-mono">{currentGuestEventObj?.title || 'Main Symposium Event'}</div>
              </div>

              <div className="flex gap-2 w-full pt-1">
                <button
                  onClick={handleDirectCheckinGenerated}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verify & Check-In Now</span>
                </button>

                <button
                  onClick={handleCopyPayload}
                  title="Copy QR Payload JSON"
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                >
                  {copied ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Code Verification & Quick Dev Simulators */}
        {(!isGuestMode || guestModeTab === 'scan') && (
          <div className="mt-4 pt-3 border-t border-slate-800 text-left space-y-2">
            <label className="text-[11px] text-slate-400 block font-medium">
              Manual Test Verification / Simulator
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Paste QR JSON string..."
                value={manualPayload}
                onChange={(e) => setManualPayload(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 focus:bg-slate-950 transition-all font-mono"
              />
              <button
                onClick={handleManualSubmit}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Verify
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleQuickDemoScan}
                className="py-2 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simulate Valid Pass</span>
              </button>

              <button
                onClick={handleWrongScanSim}
                className="py-2 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Simulate Invalid Code</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
