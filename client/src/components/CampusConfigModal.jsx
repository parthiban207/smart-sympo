// agent-notes: { ctx: "Campus configuration modal to customize campus center coordinates, name, and presets", deps: ["lucide-react"], state: "active", last: "antigravity@2026-09-30" }

import { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Crosshair,
  RotateCcw,
  Check,
  Building2,
  Navigation,
  Sparkles,
  Info,
} from 'lucide-react';
import { CAMPUSES } from '../services/campusNavigationData';

export default function CampusConfigModal({
  isOpen,
  onClose,
  currentCampus,
  onSaveCampus,
}) {
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [city, setCity] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [defaultZoom, setDefaultZoom] = useState(18);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (currentCampus) {
      setName(currentCampus.name || '');
      setShortName(currentCampus.shortName || '');
      setCity(currentCampus.city || '');
      setLatitude(
        currentCampus.center?.[0] !== undefined ? String(currentCampus.center[0]) : '13.0827'
      );
      setLongitude(
        currentCampus.center?.[1] !== undefined ? String(currentCampus.center[1]) : '80.2707'
      );
      setDefaultZoom(currentCampus.defaultZoom || 18);
    }
  }, [currentCampus, isOpen]);

  if (!isOpen) return null;

  // Auto-detect current GPS to set as campus center
  const handleDetectCurrentLocation = () => {
    setIsDetectingGps(true);
    setGpsError(null);

    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser.');
      setIsDetectingGps(false);
      return;
    }

    const onCoords = (lat, lng) => {
      setLatitude(lat.toFixed(6));
      setLongitude(lng.toFixed(6));
      if (!name) setName('My University Campus');
      if (!shortName) setShortName('My Campus');
      setIsDetectingGps(false);
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onCoords(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.warn('High accuracy failed, attempting standard...', err);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            onCoords(pos.coords.latitude, pos.coords.longitude);
          },
          (fallbackErr) => {
            setIsDetectingGps(false);
            setGpsError('Could not get GPS fix. You can enter latitude and longitude manually.');
          },
          { enableHighAccuracy: false, timeout: 10000 }
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Quick preset loader
  const handleLoadPreset = (preset) => {
    setName(preset.name);
    setShortName(preset.shortName);
    setCity(preset.city);
    setLatitude(String(preset.center[0]));
    setLongitude(String(preset.center[1]));
    setDefaultZoom(preset.defaultZoom || 18);
    setGpsError(null);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setGpsError('Please provide valid latitude (-90 to 90) and longitude (-180 to 180).');
      return;
    }

    const updatedCampus = {
      id: currentCampus?.id?.startsWith('custom-') ? currentCampus.id : `custom-${Date.now()}`,
      name: name.trim() || 'My College Campus',
      shortName: shortName.trim() || 'Campus Center',
      city: city.trim() || 'Campus Grounds',
      center: [lat, lng],
      defaultZoom: Number(defaultZoom) || 18,
      address: city.trim() || '',
      googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      isCustom: true,
    };

    // Save to localStorage
    try {
      localStorage.setItem('custom_campus_config', JSON.stringify(updatedCampus));
    } catch (err) {
      console.warn('Could not persist campus to localStorage', err);
    }

    onSaveCampus(updatedCampus);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Customize Campus Coordinates
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Center map and navigation around your real college/event location
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {gpsError && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>{gpsError}</span>
            </div>
          )}

          {/* Quick GPS Auto-Detect Button */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Crosshair className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Use My Current Physical Location
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Detect your GPS coordinates and set as campus center
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDetectCurrentLocation}
              disabled={isDetectingGps}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
            >
              <Navigation className={`w-3.5 h-3.5 ${isDetectingGps ? 'animate-spin' : ''}`} />
              <span>{isDetectingGps ? 'Detecting...' : 'Detect GPS'}</span>
            </button>
          </div>

          {/* Campus Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Campus / College Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. SRM Institute / IIT Madras"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Short Label
              </label>
              <input
                type="text"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="e.g. Main Campus"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* City / Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              City / Location Description
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Chennai, Tamil Nadu"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Coordinates (Latitude & Longitude) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Latitude (e.g. 13.0827)
              </label>
              <input
                type="number"
                step="any"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="13.0827"
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Longitude (e.g. 80.2707)
              </label>
              <input
                type="number"
                step="any"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="80.2707"
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Zoom Level */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Default Zoom: <span className="font-mono text-indigo-600 dark:text-indigo-400">{defaultZoom}</span>
              </label>
              <span className="text-[11px] text-slate-400">16 (Wider) &ndash; 19 (Close-up)</span>
            </div>
            <input
              type="range"
              min="15"
              max="20"
              value={defaultZoom}
              onChange={(e) => setDefaultZoom(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Quick Presets */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Default Campus Presets
            </span>
            <div className="flex flex-wrap gap-2">
              {CAMPUSES.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleLoadPreset(preset)}
                  className="px-2.5 py-1.5 text-[11px] font-medium rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>{preset.shortName}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Save & Center Map</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
