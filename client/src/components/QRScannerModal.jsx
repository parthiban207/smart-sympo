// agent-notes: { ctx: "QR Camera Scanner with front/back camera selection (preferring back camera) and rich event participation verification feedback", deps: ["html5-qrcode", "src/context/AppContext.jsx", "lucide-react"], state: "active", last: "antigravity@2026-08-13" }

import { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, CheckCircle2, AlertCircle, RefreshCw, ScanLine, User, SwitchCamera, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function QRScannerModal({ isOpen, onClose, selectedHall, isGuestMode = false }) {
  const { verifyQRPass, checkinGuest, registrations } = useApp();
  const [scanResult, setScanResult] = useState(null);
  const [manualPayload, setManualPayload] = useState('');
  const [facingMode, setFacingMode] = useState('environment');
  const [guestName, setGuestName] = useState('');
  const [guestEvent, setGuestEvent] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const html5QrcodeRef = useRef(null);

  const startScanner = useCallback(async (mode) => {
    setCameraError(null);
    try {
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        await html5QrcodeRef.current.stop();
      }

      const qrCodeScanner = new Html5Qrcode('qr-reader-target');
      html5QrcodeRef.current = qrCodeScanner;

      await qrCodeScanner.start(
        { facingMode: mode },
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
        },
        async (decodedText) => {
          let res;
          if (isGuestMode) {
            res = await checkinGuest(decodedText, selectedHall);
          } else {
            res = await verifyQRPass(decodedText, selectedHall);
          }
          setScanResult(res);
        },
        () => {
          // Seeking frame
        }
      );
      setIsScanning(true);
    } catch (err) {
      console.warn('[QR Scanner Camera Error]:', err);
      setIsScanning(false);
      setCameraError('Camera access restricted or back camera unavailable. Use manual verify below.');
    }
  }, [isGuestMode, selectedHall, checkinGuest, verifyQRPass]);

  useEffect(() => {
    if (!isOpen) return;

    // Small delay for DOM node readiness
    const timer = setTimeout(() => {
      startScanner(facingMode);
    }, 200);

    return () => {
      clearTimeout(timer);
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch(() => {});
      }
    };
  }, [isOpen, facingMode, startScanner]);

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
    setScanResult(res);
  };

  const handleManualGuestCheckin = async () => {
    if (!guestName) return;
    const targetEventId = guestEvent || events[0]?.id || '';
    const payload = JSON.stringify({
      guest_name: guestName,
      event_id: targetEventId,
      hall_number: selectedHall,
      is_guest: true,
    });
    const res = await checkinGuest(payload, selectedHall);
    setScanResult(res);
    if (res?.success) {
      setGuestName('');
      setGuestEvent('');
    }
  };

  const handleQuickDemoScan = async () => {
    if (isGuestMode) {
      const demoPayload = JSON.stringify({
        guest_name: 'Demo Guest',
        event_id: events[0]?.id || '',
        hall_number: selectedHall,
        is_guest: true,
      });
      const res = await checkinGuest(demoPayload, selectedHall);
      setScanResult(res);
    } else if (registrations.length > 0) {
      const sampleReg = registrations[0];
      const demoPayload = JSON.stringify({
        student_id: sampleReg.student_id,
        event_id: sampleReg.event_id,
        hall_number: selectedHall,
      });
      const res = await verifyQRPass(demoPayload, selectedHall);
      setScanResult(res);
    } else {
      const samplePayload = JSON.stringify({
        student_id: currentUser?.id || '',
        event_id: events[0]?.id || '',
        hall_number: selectedHall,
      });
      const res = await verifyQRPass(samplePayload, selectedHall);
      setScanResult(res);
    }
  };

  const handleWrongScanSim = async () => {
    const invalidPayload = 'INVALID_QR_CODE_STRING_999';
    const res = await verifyQRPass(invalidPayload, selectedHall);
    setScanResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 p-6 shadow-2xl relative text-center max-h-[90vh] overflow-y-auto text-slate-900">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-2 justify-center">
          <Camera className="w-5 h-5 text-indigo-600 animate-pulse" />
          <h3 className="text-base font-bold text-slate-900">
            {isGuestMode ? 'Guest QR Check-in Scanner' : 'Live Event Attendance Scanner'}
          </h3>
        </div>

        <p className="text-xs text-slate-500 mb-3">
          Scanning via <span className="font-bold text-indigo-600">{facingMode === 'environment' ? 'Back Camera (Main)' : 'Front Camera'}</span> at <span className="font-semibold text-slate-800">{selectedHall || 'All Venues'}</span>
        </p>

        {/* Camera Switch Controls */}
        <div className="flex justify-center mb-4">
          <button
            onClick={toggleCamera}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <SwitchCamera className="w-3.5 h-3.5 text-indigo-600" />
            <span>Switch Camera ({facingMode === 'environment' ? 'Use Front' : 'Use Back (Main)'})</span>
          </button>
        </div>

        {/* Scan Result Feedback Toast / Participation Box */}
        {scanResult && (
          <div
            className={`p-4 rounded-2xl mb-4 text-left border shadow-sm ${
              scanResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {scanResult.success ? (
                <div className="p-1.5 rounded-xl bg-emerald-600 text-white shrink-0 shadow-2xs">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
              ) : (
                <div className="p-1.5 rounded-xl bg-rose-600 text-white shrink-0 shadow-2xs">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
              )}

              <div className="space-y-1 text-xs">
                <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                  {scanResult.success ? '✅ Successfully Verified!' : '❌ Wrong QR Code!'}
                </h4>
                <p className="font-medium text-slate-700">{scanResult.message}</p>

                {scanResult.success && (
                  <div className="mt-2 pt-2 border-t border-emerald-200/80 space-y-1 font-mono text-[11px] text-emerald-900">
                    <div className="flex justify-between">
                      <span className="text-emerald-700">Student:</span>
                      <span className="font-bold">{scanResult.studentName || 'Registered Student'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-700">Event:</span>
                      <span className="font-bold">{scanResult.eventTitle || 'Symposium Session'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-700">Participation:</span>
                      <span className="font-bold text-emerald-800 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        Registered & Attended
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* HTML5 QR Camera Video Target Container */}
        <div className="bg-slate-900 rounded-2xl p-2 border border-slate-700 overflow-hidden relative min-h-[260px] flex items-center justify-center">
          <div id="qr-reader-target" className="w-full text-white"></div>

          {cameraError && (
            <div className="p-4 text-center text-xs text-rose-300 bg-rose-950/80 border border-rose-800 rounded-xl space-y-2 max-w-xs">
              <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" />
              <p>{cameraError}</p>
            </div>
          )}
        </div>

        {/* Manual Guest Check-in (Guest Mode Only) */}
        {isGuestMode && (
          <div className="mt-4 pt-3 border-t border-slate-200 text-left space-y-2">
            <label className="text-[11px] text-slate-600 block font-semibold flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              Manual Guest Registration (No QR)
            </label>
            <input
              type="text"
              placeholder="Guest Full Name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
            />
            <input
              type="text"
              placeholder="Event ID (optional)"
              value={guestEvent}
              onChange={(e) => setGuestEvent(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
            />
            <button
              onClick={handleManualGuestCheckin}
              disabled={!guestName}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Register Guest
            </button>
          </div>
        )}

        {/* Manual Code Verification & Scan Simulator */}
        <div className="mt-4 pt-3 border-t border-slate-200 text-left space-y-2">
          <label className="text-[11px] text-slate-500 block font-medium">
            Manual Test Scan / Dev Simulator
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste QR JSON string..."
              value={manualPayload}
              onChange={(e) => setManualPayload(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
            />
            <button
              onClick={handleManualSubmit}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Verify
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleQuickDemoScan}
              className="py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Simulate Correct Code</span>
            </button>

            <button
              onClick={handleWrongScanSim}
              className="py-2 px-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Simulate Wrong Code</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
