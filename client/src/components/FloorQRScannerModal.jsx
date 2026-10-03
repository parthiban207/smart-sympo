// agent-notes: { ctx: "In-page camera QR scanner for student campus navigation with camera switcher, file upload fallback, manual entry, and robust URL/UUID validation", deps: ["html5-qrcode", "lucide-react", "src/services/indoorNavDataService.js", "src/utils/scanFeedback.js"], state: "active", last: "antigravity@2026-10-03" }

import { useEffect, useState, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  X, Camera, AlertCircle, RefreshCw, SwitchCamera, Upload,
  Link as LinkIcon, CheckCircle2, Loader2, Sparkles, AlertTriangle,
  QrCode,
} from 'lucide-react';
import { fetchFloorById } from '../services/indoorNavDataService';
import {
  playScanSuccessSound,
  playScanErrorSound,
  playScanWarningSound,
  triggerScanHaptic,
} from '../utils/scanFeedback';

const UUID_REGEX = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

export default function FloorQRScannerModal({ isOpen, onClose, onFloorScanned }) {
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'file' | 'manual'
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (rear) | 'user' (front)
  const [cameraError, setCameraError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error'|'warning', msg: string }

  const html5QrCodeRef = useRef(null);
  const isScanningRef = useRef(false);
  const isProcessingRef = useRef(false);
  const fileInputRef = useRef(null);

  // ─── Extract floor ID and start node from text ───
  const parseQRText = useCallback((text) => {
    if (!text || typeof text !== 'string') return null;
    const trimmed = text.trim();

    // Check for UUID directly
    const match = trimmed.match(UUID_REGEX);
    if (!match) return null;

    const floorId = match[0];
    let startNodeId = null;

    try {
      if (trimmed.includes('?')) {
        const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://dummy.local/${trimmed}`);
        startNodeId = urlObj.searchParams.get('start') || null;
      }
    } catch {
      // not a full URL, that's okay
    }

    return { floorId, startNodeId };
  }, []);

  // ─── Validate floor existence & publication status ───
  const validateAndSelectFloor = useCallback(async (scannedText) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    setFeedback(null);

    const parsed = parseQRText(scannedText);
    if (!parsed) {
      playScanErrorSound();
      triggerScanHaptic('error');
      setFeedback({
        type: 'error',
        msg: 'Invalid QR Code. Please scan an official SmartSympo floor QR poster.',
      });
      setIsProcessing(false);
      isProcessingRef.current = false;
      return;
    }

    try {
      const { data: floor, error } = await fetchFloorById(parsed.floorId);
      if (error || !floor) {
        playScanErrorSound();
        triggerScanHaptic('error');
        setFeedback({
          type: 'error',
          msg: 'Floor not found. This QR may be expired or the floor was removed.',
        });
        setIsProcessing(false);
        isProcessingRef.current = false;
        return;
      }

      if (!floor.is_published) {
        playScanWarningSound();
        triggerScanHaptic('warning');
        setFeedback({
          type: 'warning',
          msg: `"${floor.name}" is currently in draft. Only published floors can be accessed by students.`,
        });
        setIsProcessing(false);
        isProcessingRef.current = false;
        return;
      }

      // Valid & published floor!
      playScanSuccessSound();
      triggerScanHaptic('success');
      setFeedback({
        type: 'success',
        msg: `Connected to ${floor.campus_buildings?.name || 'Campus'} — ${floor.name}!`,
      });

      // Stop scanner immediately
      await stopScanner();

      // Pass floor back to caller
      setTimeout(() => {
        onFloorScanned(floor.id, parsed.startNodeId || floor.qr_start_node_id);
        onClose();
      }, 700);
    } catch (err) {
      console.error('[QR Validation Error]:', err);
      setFeedback({
        type: 'error',
        msg: 'Failed to verify floor information. Please check your internet connection.',
      });
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  }, [parseQRText, onFloorScanned, onClose]);

  // ─── Stop Camera ───
  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current && isScanningRef.current) {
      try {
        isScanningRef.current = false;
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping html5QrCode:', err);
      }
    }
  }, []);

  // ─── Start Camera Scanner ───
  const startScanner = useCallback(async (mode) => {
    setCameraError(null);
    setIsInitializing(true);
    await stopScanner();

    // Check DOM element
    const container = document.getElementById('floor-qr-reader-target');
    if (!container) {
      setIsInitializing(false);
      return;
    }

    try {
      const qrScanner = new Html5Qrcode('floor-qr-reader-target', { verbose: false });
      html5QrCodeRef.current = qrScanner;

      await qrScanner.start(
        { facingMode: mode },
        {
          fps: 20,
          qrbox: (w, h) => {
            const min = Math.min(w, h);
            const size = Math.max(200, Math.floor(min * 0.72));
            return { width: size, height: size };
          },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          if (isProcessingRef.current) return;
          await validateAndSelectFloor(decodedText);
        },
        () => {} // error callback on frame scan failure (ignore)
      );

      isScanningRef.current = true;
      setIsInitializing(false);
    } catch (err) {
      console.warn('[Camera Access Error]:', err);
      setIsInitializing(false);
      isScanningRef.current = false;
      const errorMsg = String(err).toLowerCase();
      if (errorMsg.includes('permission') || errorMsg.includes('denied') || errorMsg.includes('notallowederror')) {
        setCameraError('Camera permission was denied. Please allow camera access in your browser settings, or upload a photo of the QR code below.');
      } else if (errorMsg.includes('notfounderror') || errorMsg.includes('device')) {
        setCameraError('No camera found on this device. You can upload a QR image or enter the link manually.');
      } else {
        setCameraError('Unable to start camera. Please ensure permissions are granted, or use the file upload / link fallback.');
      }
    }
  }, [stopScanner, validateAndSelectFloor]);

  // Lifecycle
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      const timer = setTimeout(() => {
        startScanner(facingMode);
      }, 250);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, activeTab, facingMode, startScanner, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  if (!isOpen) return null;

  // ─── Camera toggle ───
  const toggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // ─── File upload scan ───
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setFeedback(null);
    try {
      const qrScanner = new Html5Qrcode('floor-qr-file-scratch');
      const decodedText = await qrScanner.scanFile(file, true);
      qrScanner.clear();
      await validateAndSelectFloor(decodedText);
    } catch (err) {
      console.warn('File QR scan error:', err);
      playScanErrorSound();
      triggerScanHaptic('error');
      setFeedback({
        type: 'error',
        msg: 'Could not read a QR code from this image. Please ensure the QR is clear and well-lit.',
      });
      setIsProcessing(false);
    }
  };

  // ─── Manual submit ───
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    validateAndSelectFloor(manualInput.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight">Scan Floor QR</h2>
              <p className="text-[10px] text-slate-400">Scan poster at your floor entrance</p>
            </div>
          </div>
          <button
            onClick={() => { stopScanner(); onClose(); }}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 p-1 shrink-0">
          <button
            onClick={() => { setActiveTab('camera'); setFeedback(null); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'camera' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" /> Camera
          </button>
          <button
            onClick={() => { setActiveTab('file'); setFeedback(null); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'file' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Upload Photo
          </button>
          <button
            onClick={() => { setActiveTab('manual'); setFeedback(null); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'manual' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" /> Enter Code
          </button>
        </div>

        {/* Body content */}
        <div className="p-4 flex-1 overflow-y-auto">
          {/* Feedback alerts */}
          {feedback && (
            <div className={`mb-3 p-3 rounded-2xl border text-xs flex items-start gap-2 animate-in slide-in-from-top-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : feedback.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : feedback.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="font-semibold leading-relaxed">{feedback.msg}</div>
            </div>
          )}

          {/* TAB 1: Camera */}
          {activeTab === 'camera' && (
            <div className="flex flex-col items-center">
              {cameraError ? (
                <div className="p-6 bg-red-50 rounded-2xl border border-red-200 text-center space-y-3 w-full">
                  <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-red-900">Camera Access Issue</h3>
                  <p className="text-xs text-red-700 leading-relaxed">{cameraError}</p>
                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      onClick={() => startScanner(facingMode)}
                      className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition"
                    >
                      Retry Camera
                    </button>
                    <button
                      onClick={() => setActiveTab('file')}
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
                    >
                      Upload QR Photo Instead
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative w-full max-w-[320px] aspect-square bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                  {/* Viewfinder target div for Html5Qrcode */}
                  <div id="floor-qr-reader-target" className="w-full h-full" />

                  {isInitializing && (
                    <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center text-white gap-2 z-10">
                      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                      <p className="text-xs font-medium text-slate-300">Activating camera preview…</p>
                    </div>
                  )}

                  {isProcessing && (
                    <div className="absolute inset-0 bg-indigo-950/85 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-2 z-20 animate-in fade-in">
                      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                      <p className="text-xs font-bold text-white">Verifying floor map…</p>
                    </div>
                  )}

                  {/* Corner viewfinder frame */}
                  {!isInitializing && (
                    <div className="absolute inset-6 pointer-events-none border-2 border-indigo-400/40 rounded-xl flex items-center justify-center">
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-pulse" />
                    </div>
                  )}
                </div>
              )}

              {/* Camera flip control */}
              {!cameraError && (
                <div className="mt-3 flex items-center justify-between w-full max-w-[320px] text-xs">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Camera: {facingMode === 'environment' ? 'Rear (Back)' : 'Front (Selfie)'}
                  </span>
                  <button
                    onClick={toggleCamera}
                    disabled={isInitializing || isProcessing}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition disabled:opacity-50"
                  >
                    <SwitchCamera className="w-3.5 h-3.5" /> Flip Camera
                  </button>
                </div>
              )}

              <p className="mt-3 text-[11px] text-center text-slate-500 leading-normal max-w-xs">
                Align the floor QR poster inside the frame. The map will load automatically once scanned.
              </p>
            </div>
          )}

          {/* TAB 2: File Upload */}
          {activeTab === 'file' && (
            <div className="flex flex-col items-center p-4 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/40 rounded-2xl p-8 cursor-pointer transition flex flex-col items-center gap-3 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Select QR Code Image</p>
                  <p className="text-xs text-slate-500 mt-0.5">JPEG, PNG, or screenshot of floor QR</p>
                </div>
                <button
                  type="button"
                  className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-indigo-700 transition"
                >
                  Choose File
                </button>
              </div>

              {/* Hidden target div for file scanning */}
              <div id="floor-qr-file-scratch" className="hidden" />
            </div>
          )}

          {/* TAB 3: Enter Code / URL */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-3 p-2">
              <p className="text-xs text-slate-600 leading-relaxed">
                If your camera is unable to focus, paste the floor link or UUID printed on the bottom of the poster.
              </p>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Floor URL or UUID
                </label>
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="e.g. https://smart-sympo.vercel.app/navigate/floor/..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>
              <button
                type="submit"
                disabled={!manualInput.trim() || isProcessing}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Open Floor Map
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span>SmartSympo Indoor Wayfinding</span>
          <span>Single QR per floor entrance</span>
        </div>
      </div>
    </div>
  );
}
