// agent-notes: { ctx: "QR Camera Scanner Modal with guest check-in support and checkin_attendee RPC call", deps: ["html5-qrcode", "src/context/AppContext.jsx", "lucide-react"], state: "active", last: "antigravity@2026-07-31" }

import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera, CheckCircle2, AlertCircle, RefreshCw, ScanLine, User } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function QRScannerModal({ isOpen, onClose, selectedHall, isGuestMode = false }) {
  const { verifyQRPass, checkinGuest, registrations } = useApp();
  const [scanResult, setScanResult] = useState(null);
  const [manualPayload, setManualPayload] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEvent, setGuestEvent] = useState('');
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Initialize html5-qrcode scanner element
    const scanner = new Html5QrcodeScanner(
      'qr-reader-container',
      { fps: 10, qrbox: { width: 220, height: 220 } },
      /* verbose= */ false
    );

    scanner.render(
      async (decodedText) => {
        if (isGuestMode) {
          // Guest mode: call checkinGuest RPC
          const res = await checkinGuest(decodedText, selectedHall);
          setScanResult(res);
        } else {
          const res = await verifyQRPass(decodedText, selectedHall);
          setScanResult(res);
        }
      },
      () => {
        // Silent scan warning while seeking QR code frame
      }
    );

    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch((err) => console.error(err));
      }
    };
  }, [isOpen, selectedHall, verifyQRPass, checkinGuest, isGuestMode]);

  if (!isOpen) return null;

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualPayload) return;

    if (isGuestMode) {
      const res = await checkinGuest(manualPayload, selectedHall);
      setScanResult(res);
    } else {
      const res = await verifyQRPass(manualPayload, selectedHall);
      setScanResult(res);
    }
  };

  // Manual guest registration (form-based fallback when QR is unavailable)
  const handleManualGuestCheckin = async () => {
    if (!guestName) return;
    const payload = JSON.stringify({
      guest_name: guestName,
      event_id: guestEvent || '11111111-1111-1111-1111-111111111111',
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

  // Quick test shortcut to simulate scanning a registered student's pass
  const handleQuickDemoScan = async () => {
    if (isGuestMode) {
      const demoPayload = JSON.stringify({
        guest_name: 'Demo Guest',
        event_id: '11111111-1111-1111-1111-111111111111',
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
        exp: Date.now() + 86400000,
      });
      const res = await verifyQRPass(demoPayload, selectedHall);
      setScanResult(res);
    }
  };

  const borderColor = 'border-slate-200';
  const accentColor = 'text-indigo-600';
  const accentBg = 'bg-indigo-600';
  const accentHover = 'hover:bg-indigo-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 p-6 shadow-2xl relative text-center max-h-[90vh] overflow-y-auto text-slate-900">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-3 justify-center">
          {isGuestMode ? (
            <ScanLine className={`w-5 h-5 ${accentColor} animate-pulse`} />
          ) : (
            <Camera className={`w-5 h-5 ${accentColor} animate-pulse`} />
          )}
          <h3 className="text-base font-bold text-slate-900">
            {isGuestMode ? 'Guest QR Check-in Scanner' : 'Live Hall QR Scanner'}
          </h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          {isGuestMode ? (
            <>Scanning guest QR codes for live registration at <span className={`${accentColor} font-semibold`}>{selectedHall || 'All Venues'}</span></>
          ) : (
            <>Scanning for <span className={`${accentColor} font-semibold`}>{selectedHall || 'All Halls'}</span></>
          )}
        </p>

        {/* Scan Result Feedback Toast */}
        {scanResult && (
          <div
            className={`p-3 rounded-xl mb-4 flex items-center gap-2 text-xs font-semibold ${
              scanResult.success
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {scanResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="truncate">{scanResult.message}</span>
          </div>
        )}

        {/* HTML5 QR Camera Container */}
        <div className="bg-slate-50 rounded-xl p-2 border border-slate-200 overflow-hidden text-slate-900">
          <div id="qr-reader-container" className="w-full text-slate-800"></div>
        </div>

        {/* Manual Guest Registration (Guest Mode Only) */}
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
              placeholder="Event ID (optional, e.g. 11111111-...)"
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

        {/* Manual Test Scan Box */}
        <div className="mt-4 pt-3 border-t border-slate-200 text-left">
          <label className="text-[11px] text-slate-500 block mb-1.5 font-medium">
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
              className={`px-3 py-2 ${accentBg} ${accentHover} text-white font-bold text-xs rounded-xl transition-colors cursor-pointer`}
            >
              Verify
            </button>
          </div>
          <button
            onClick={handleQuickDemoScan}
            className="w-full mt-2 py-2 bg-slate-50 hover:bg-slate-100 text-indigo-700 border border-slate-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {isGuestMode ? 'Simulate Guest QR Scan' : 'Simulate Valid Scan (Registered Student 1)'}
          </button>
        </div>
      </div>
    </div>
  );
}
