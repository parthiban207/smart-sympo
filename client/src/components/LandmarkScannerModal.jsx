// agent-notes: { ctx: "QR landmark scanner modal for You Are Here campus wayfinding with audio feedback and printable landmark badges", deps: ["html5-qrcode", "react-qr-code", "src/services/campusNavigationData.js", "src/utils/scanFeedback.js", "lucide-react"], state: "active", last: "antigravity@2026-09-24" }

import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import QRCode from 'react-qr-code';
import {
  X,
  Camera,
  MapPin,
  CheckCircle2,
  AlertCircle,
  SwitchCamera,
  Compass,
  Printer,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { CAMPUS_LANDMARKS } from '../services/campusNavigationData';
import {
  playScanSuccessSound,
  playScanWarningSound,
  playScanErrorSound,
  triggerScanHaptic,
} from '../utils/scanFeedback';

export default function LandmarkScannerModal({
  isOpen,
  onClose,
  onLandmarkDetected,
  initialTargetVenue = null,
}) {
  const [activeTab, setActiveTab] = useState('scanner'); // 'scanner' | 'simulate' | 'print'
  const [facingMode, setFacingMode] = useState('environment');
  const [cameraError, setCameraError] = useState(null);
  const [scannedLandmark, setScannedLandmark] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const html5QrcodeRef = useRef(null);
  const scannerContainerId = 'landmark-reader-viewport';

  // Process a landmark detection
  const handleRecognizeLandmark = useCallback(
    (landmarkIdOrCode) => {
      if (isProcessing) return;
      setIsProcessing(true);

      let found = null;
      // 1. Try finding by raw ID
      found = CAMPUS_LANDMARKS.find(
        (l) => l.id.toLowerCase() === String(landmarkIdOrCode).trim().toLowerCase()
      );

      // 2. Try finding by code prefix
      if (!found) {
        found = CAMPUS_LANDMARKS.find((l) => l.code === String(landmarkIdOrCode).trim());
      }

      // 3. Try parsing as JSON
      if (!found) {
        try {
          const parsed = JSON.parse(landmarkIdOrCode);
          if (parsed && (parsed.id || parsed.landmarkId)) {
            const targetId = parsed.id || parsed.landmarkId;
            found = CAMPUS_LANDMARKS.find(
              (l) => l.id.toLowerCase() === String(targetId).toLowerCase()
            );
          }
        } catch {
          // not JSON, continue
        }
      }

      // 4. Fallback search by text containment
      if (!found) {
        const query = String(landmarkIdOrCode).toUpperCase();
        found = CAMPUS_LANDMARKS.find(
          (l) => query.includes(l.id) || query.includes(l.name.toUpperCase())
        );
      }

      if (found) {
        playScanSuccessSound();
        triggerScanHaptic('success');
        setScannedLandmark(found);
        if (onLandmarkDetected) {
          onLandmarkDetected(found);
        }
      } else {
        playScanWarningSound();
        triggerScanHaptic('warning');
        setCameraError(`Unrecognized Landmark QR: "${String(landmarkIdOrCode).slice(0, 40)}"`);
      }

      setTimeout(() => {
        setIsProcessing(false);
      }, 1500);
    },
    [isProcessing, onLandmarkDetected]
  );

  // Start camera scanner
  const startScanner = useCallback(
    async (mode) => {
      setCameraError(null);
      try {
        if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }

        const scanner = new Html5Qrcode(scannerContainerId);
        html5QrcodeRef.current = scanner;

        const config = {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await scanner.start(
          { facingMode: mode },
          config,
          (decodedText) => {
            handleRecognizeLandmark(decodedText);
          },
          () => {
            // Ignore frame scan failures
          }
        );
      } catch (err) {
        console.warn('[Landmark Scanner Camera Start Error]:', err);
        setCameraError(
          err.message ||
            'Camera access denied or unavailable. You can use the "Simulate / Test" tab below.'
        );
      }
    },
    [handleRecognizeLandmark]
  );

  // Toggle Camera Facing Mode
  const toggleCamera = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      await html5QrcodeRef.current.stop();
    }
    startScanner(nextMode);
  };

  // Lifecycle
  useEffect(() => {
    let isMounted = true;
    if (isOpen && activeTab === 'scanner') {
      const timer = setTimeout(() => {
        if (isMounted) startScanner(facingMode);
      }, 300);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [isOpen, activeTab, facingMode, startScanner]);

  // Cleanup on close or tab switch
  useEffect(() => {
    return () => {
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleModalClose = () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      html5QrcodeRef.current.stop().catch(() => {});
    }
    setScannedLandmark(null);
    setCameraError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  "You Are Here" Landmark Scanner
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                  Indoor GPS
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Scan campus QR signboards on pillars or gates to locate yourself instantly
              </p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900 text-xs font-semibold">
          <button
            onClick={() => {
              setActiveTab('scanner');
              setScannedLandmark(null);
            }}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-all ${
              activeTab === 'scanner'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Camera className="w-4 h-4" />
            Live Camera Scan
          </button>
          <button
            onClick={() => {
              if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
                html5QrcodeRef.current.stop().catch(() => {});
              }
              setActiveTab('simulate');
            }}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-all ${
              activeTab === 'simulate'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            Quick Test Landmarks ({CAMPUS_LANDMARKS.length})
          </button>
          <button
            onClick={() => {
              if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
                html5QrcodeRef.current.stop().catch(() => {});
              }
              setActiveTab('print');
            }}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-all ${
              activeTab === 'print'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Printer className="w-4 h-4 text-emerald-500" />
            Print Landmark QR Badges
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: LIVE SCANNER */}
          {activeTab === 'scanner' && (
            <div className="space-y-4">
              {scannedLandmark ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 text-center space-y-3 animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Location Calibrated &bull; You Are Here
                    </span>
                    <h4 className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                      {scannedLandmark.name}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-md mx-auto">
                      {scannedLandmark.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    <span>
                      {scannedLandmark.building} &bull; Floor {scannedLandmark.floor} (
                      {scannedLandmark.floor === 0 ? 'Ground' : `${scannedLandmark.floor}st Floor`})
                    </span>
                  </div>

                  {scannedLandmark.instructions && (
                    <div className="bg-white/80 dark:bg-slate-900/80 rounded-xl p-3 text-xs text-slate-700 dark:text-slate-300 border border-emerald-100 dark:border-emerald-900/40 text-left flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-semibold text-slate-900 dark:text-white">
                          Immediate Walkway Guidance:{' '}
                        </strong>
                        {scannedLandmark.instructions}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-3 pt-3">
                    <button
                      onClick={() => setScannedLandmark(null)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition"
                    >
                      Scan Another Landmark
                    </button>
                    <button
                      onClick={handleModalClose}
                      className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/25 flex items-center gap-1.5 transition"
                    >
                      <span>Show on Campus Map</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {cameraError && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="flex-1 text-xs">
                        <div className="font-bold text-amber-800 dark:text-amber-300">
                          Camera Notice
                        </div>
                        <p className="text-amber-700 dark:text-amber-400 mt-0.5">{cameraError}</p>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">
                          Tip: Use the <strong>"Quick Test Landmarks"</strong> tab above to simulate
                          scanning any campus location in one click!
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="relative overflow-hidden rounded-2xl border-2 border-indigo-500/30 bg-slate-950 aspect-video sm:aspect-[4/3] flex items-center justify-center shadow-inner">
                    <div id={scannerContainerId} className="w-full h-full" />

                    {/* Reticle Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-56 h-56 border-2 border-indigo-400/80 rounded-2xl relative animate-pulse shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                        <div className="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
                        <div className="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
                        <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-bounce" />
                      </div>
                    </div>

                    {/* Camera Switcher */}
                    <button
                      onClick={toggleCamera}
                      className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white p-2.5 rounded-full hover:bg-black/80 transition-all border border-white/10"
                      title="Switch camera"
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                    Point your camera at any <strong>SmartSympo Landmark QR Code</strong> placed on
                    campus pillars, doors, or corridor arches.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SIMULATE / QUICK TEST LANDMARKS */}
          {activeTab === 'simulate' && (
            <div className="space-y-4">
              <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-4 text-xs text-indigo-900 dark:text-indigo-300 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-slate-900 dark:text-white">
                    One-Click Landmark Simulator
                  </h5>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Test the "You Are Here" positioning right from your browser without needing
                    physical printed signs. Click any location below to simulate scanning its QR
                    code.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CAMPUS_LANDMARKS.map((landmark) => (
                  <button
                    key={landmark.id}
                    onClick={() => {
                      handleRecognizeLandmark(landmark.id);
                      setActiveTab('scanner');
                    }}
                    className="p-4 text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md transition-all group relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {landmark.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {landmark.building} &bull; Floor {landmark.floor}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 font-bold uppercase">
                        {landmark.category}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 line-clamp-2">
                      {landmark.description}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                      <span>Simulate Scan</span>
                      <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PRINT LANDMARK QR BADGES */}
          {activeTab === 'print' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                    Campus Landmark Signboards (Print Ready)
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Print these posters and paste them onto building doors, pillars, and gates for
                    attendees.
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition"
                >
                  <Printer className="w-4 h-4" />
                  Print Signboards
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {CAMPUS_LANDMARKS.map((lm) => (
                  <div
                    key={lm.id}
                    className="p-5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col items-center text-center space-y-3 shadow-sm"
                  >
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs uppercase tracking-wider">
                      <Compass className="w-4 h-4" />
                      SmartSympo 2026 Landmark
                    </div>

                    <div className="p-3 bg-white rounded-xl shadow-md border border-slate-200 inline-block">
                      <QRCode
                        value={lm.code}
                        size={120}
                        style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                        viewBox={`0 0 120 120`}
                      />
                    </div>

                    <div>
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {lm.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                        {lm.building} &bull; Floor {lm.floor}
                      </div>
                    </div>

                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg px-2.5 py-1 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                      {lm.code}
                    </div>

                    <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                      "Scan with SmartSympo app for live turn-by-turn venue wayfinding"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            {initialTargetVenue
              ? `Target Destination: ${initialTargetVenue.name}`
              : 'Select any hall on the map to calculate walking route'}
          </span>
          <button
            onClick={handleModalClose}
            className="px-4 py-1.5 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
