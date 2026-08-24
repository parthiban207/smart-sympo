// agent-notes: { ctx: "QR Camera Scanner with front/back camera selection, Guest QR pass generator, and rich attendance verification feedback", deps: ["html5-qrcode", "react-qr-code", "src/context/AppContext.jsx", "lucide-react"], state: "active", last: "antigravity@2026-08-24" }

import { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'react-qr-code';
import {
  X, Camera, CheckCircle2, AlertCircle, RefreshCw, ScanLine, User, SwitchCamera,
  Check, QrCode, Sparkles, Copy, CheckCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function QRScannerModal({ isOpen, onClose, selectedHall, isGuestMode = false }) {
  const { verifyQRPass, checkinGuest, registrations, events = [] } = useApp();
  const [scanResult, setScanResult] = useState(null);
  const [manualPayload, setManualPayload] = useState('');
  const [facingMode, setFacingMode] = useState('environment');
  const [guestName, setGuestName] = useState('');
  const [guestEvent, setGuestEvent] = useState('');
  const [guestModeTab, setGuestModeTab] = useState('scan'); // 'scan' | 'generate'
  const [copied, setCopied] = useState(false);
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
      setCameraError('Camera access restricted or camera unavailable. Use manual verify or test simulator below.');
    }
  }, [isGuestMode, selectedHall, checkinGuest, verifyQRPass]);

  useEffect(() => {
    if (!isOpen || (isGuestMode && guestModeTab === 'generate')) return;

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
    setScanResult(res);
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
    setScanResult(res);
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
        student_id: '11111111-0000-4000-8000-000000000003',
        event_id: events[0]?.id || '',
        hall_number: selectedHall,
      });
      const res = await verifyQRPass(samplePayload, selectedHall);
      setScanResult(res);
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
            {isGuestMode ? 'Guest Check-in & QR Pass Center' : 'Live Event Attendance Scanner'}
          </h3>
        </div>

        <p className="text-xs text-slate-500 mb-3">
          Venue: <span className="font-semibold text-slate-800">{selectedHall || 'All Venues'}</span>
        </p>

        {/* Guest Mode Mode Selector Toggle (Camera Scan vs Generate QR Pass) */}
        {isGuestMode && (
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full mb-4">
            <button
              type="button"
              onClick={() => {
                setGuestModeTab('scan');
                setScanResult(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                guestModeTab === 'scan'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Scan Guest QR
            </button>

            <button
              type="button"
              onClick={() => {
                setGuestModeTab('generate');
                setScanResult(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                guestModeTab === 'generate'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              Generate Guest Pass
            </button>
          </div>
        )}

        {/* Scan Result Feedback Toast */}
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

              <div className="space-y-1 text-xs flex-1">
                <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                  {scanResult.success ? '✅ Verified & Checked In!' : '❌ Scan Error!'}
                </h4>
                <p className="font-medium text-slate-700">{scanResult.message}</p>

                {scanResult.success && (
                  <div className="mt-2 pt-2 border-t border-emerald-200/80 space-y-1 font-mono text-[11px] text-emerald-900">
                    <div className="flex justify-between">
                      <span className="text-emerald-700">Attendee:</span>
                      <span className="font-bold">{scanResult.studentName || guestName || 'Attendee'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-700">Event Session:</span>
                      <span className="font-bold">{scanResult.eventTitle || 'Symposium Session'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-700">Status:</span>
                      <span className="font-bold text-emerald-800 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        Checked-In Successfully
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: Camera Scanner View */}
        {(!isGuestMode || guestModeTab === 'scan') && (
          <>
            {/* Camera Switch Controls */}
            <div className="flex justify-center mb-3">
              <button
                onClick={toggleCamera}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <SwitchCamera className="w-3.5 h-3.5 text-indigo-600" />
                <span>Switch Camera ({facingMode === 'environment' ? 'Front' : 'Back'})</span>
              </button>
            </div>

            {/* HTML5 QR Camera Video Target Container */}
            <div className="bg-slate-900 rounded-2xl p-2 border border-slate-700 overflow-hidden relative min-h-[240px] flex items-center justify-center">
              <div id="qr-reader-target" className="w-full text-white"></div>

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
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">Guest Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. K. Ramanathan (Chief Guest)"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-600 transition-all font-medium"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">Target Event Session</label>
                <select
                  value={guestEvent}
                  onChange={(e) => setGuestEvent(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-600 transition-all font-medium"
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
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center space-y-3">
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Live Dynamic Guest QR Pass
              </span>

              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                <QRCode value={generatedGuestPayload} size={150} viewBox={`0 0 256 256`} />
              </div>

              <div className="text-center">
                <div className="font-bold text-xs text-slate-900">{guestName.trim() || 'Guest Attendee'}</div>
                <div className="text-[11px] text-slate-500 font-mono">{currentGuestEventObj?.title || 'Main Symposium Event'}</div>
              </div>

              <div className="flex gap-2 w-full pt-1">
                <button
                  onClick={handleDirectCheckinGenerated}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verify & Check-In Now</span>
                </button>

                <button
                  onClick={handleCopyPayload}
                  title="Copy QR Payload JSON"
                  className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                >
                  {copied ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Code Verification & Quick Dev Simulators */}
        {(!isGuestMode || guestModeTab === 'scan') && (
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
                className="flex-1 bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-mono"
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
                <span>Simulate Valid Code</span>
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
        )}
      </div>
    </div>
  );
}
