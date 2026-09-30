// agent-notes: { ctx: "Option B interactive Leaflet campus map with outdoor GPS, QR landmark wayfinding, and multi-campus switcher", deps: ["leaflet", "leaflet/dist/leaflet.css", "src/services/campusNavigationData.js", "src/components/LandmarkScannerModal.jsx", "src/context/AppContext.jsx", "lucide-react"], state: "active", last: "antigravity@2026-09-24" }

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Navigation,
  Compass,
  Search,
  Crosshair,
  ExternalLink,
  QrCode,
  Building,
  Clock,
  Users,
  Footprints,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  AlertCircle,
  ListOrdered,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  SlidersHorizontal,
  Globe,
  Layers,
  Map as MapIcon,
  Play,
  Square,
  Navigation2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  CAMPUSES,
  CAMPUS_BUILDINGS,
  CAMPUS_VENUES,
  CAMPUS_LANDMARKS,
  calculateDistanceMeters,
  generateCampusPath,
  getEstimatedWalkingTime,
  generateTurnByTurnInstructions,
} from '../services/campusNavigationData';
import LandmarkScannerModal from './LandmarkScannerModal';
import CampusConfigModal from './CampusConfigModal';

export default function CampusMap({ selectedVenueId = null, onSelectVenue = null }) {
  const { events = [] } = useApp();

  // State
  const [selectedCampus, setSelectedCampus] = useState(() => {
    try {
      const saved = localStorage.getItem('custom_campus_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read saved campus config:', e);
    }
    return CAMPUSES[0];
  });
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [activeFloor, setActiveFloor] = useState('all'); // 'all' | 0 | 1 | 2
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' | 'hall' | 'food' | 'registration' | 'restroom' | 'parking'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVenue, setActiveVenue] = useState(() => {
    if (!selectedVenueId) return null;
    return (
      CAMPUS_VENUES.find(
        (v) =>
          v.id === selectedVenueId ||
          v.name.toLowerCase().includes(String(selectedVenueId).toLowerCase()) ||
          v.synonyms?.some((s) => s.toLowerCase().includes(String(selectedVenueId).toLowerCase()))
      ) || null
    );
  });
  const [userLocation, setUserLocation] = useState(null); // { coords: [lat, lng], name: '...', isGps: boolean, isCustom: boolean }
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [showSteps, setShowSteps] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  // Satellite View & Live Navigation State (Google Maps Style)
  const [mapType, setMapType] = useState('satellite'); // 'satellite' | 'streets' | 'terrain'
  const [isNavigating, setIsNavigating] = useState(false);
  const [navProgressIdx, setNavProgressIdx] = useState(0);
  const [navPath, setNavPath] = useState([]);
  const [navCompleted, setNavCompleted] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);

  const baseTileLayerRef = useRef(null);

  // Voice Navigation Guidance (Google Maps voice)
  const speakInstruction = useCallback(
    (text) => {
      if (!('speechSynthesis' in window) || !isVoiceEnabled) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis error', e);
      }
    },
    [isVoiceEnabled]
  );

  // Stable references for Leaflet map event handlers
  const setUserLocationRef = useRef(setUserLocation);
  const setActiveVenueRef = useRef(setActiveVenue);
  const onSelectVenueRef = useRef(onSelectVenue);

  useEffect(() => {
    setUserLocationRef.current = setUserLocation;
    setActiveVenueRef.current = setActiveVenue;
    onSelectVenueRef.current = onSelectVenue;
  });

  // Synchronize active venue reactively if selectedVenueId prop changes
  useEffect(() => {
    if (!selectedVenueId) return;
    const found = CAMPUS_VENUES.find(
      (v) =>
        v.id === selectedVenueId ||
        v.name.toLowerCase().includes(String(selectedVenueId).toLowerCase()) ||
        v.synonyms?.some((s) => s.toLowerCase().includes(String(selectedVenueId).toLowerCase()))
    );
    if (found) {
      setActiveVenue(found);
      mapInstanceRef.current?.flyTo(found.coords, 19, { duration: 0.8 });
    }
  }, [selectedVenueId]);

  // Reset route and markers when switching campus
  useEffect(() => {
    setUserLocation(null);
    setRouteInfo(null);
    setShowSteps(false);
    setIsNavigating(false);
    setNavCompleted(false);
    setNavPath([]);
    if (routeLayerRef.current) routeLayerRef.current.clearLayers();
    if (userMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
  }, [selectedCampus]);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const buildingsLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const userMarkerRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: selectedCampus.center,
        zoom: selectedCampus.defaultZoom,
        maxZoom: 21,
        minZoom: 14,
        zoomControl: false,
      });

      // Add custom positioned zoom controls
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Layer groups
      buildingsLayerRef.current = L.layerGroup().addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);
      routeLayerRef.current = L.layerGroup().addTo(map);

      // Click anywhere on map to freely set Start point or Destination
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        const container = document.createElement('div');
        container.className = 'p-1 font-sans text-xs text-slate-800';
        container.innerHTML = `
          <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #4f46e5;"></span>
            <span>Selected Map Location</span>
          </div>
          <div style="font-size: 11px; color: #64748b; font-family: monospace; margin-bottom: 8px;">
            ${lat.toFixed(5)}, ${lng.toFixed(5)}
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <button id="map-btn-set-start" style="width: 100%; background: #10b981; color: white; border: none; border-radius: 8px; padding: 6px 10px; font-size: 11px; font-weight: 700; cursor: pointer;">
              🟢 Set as Starting Point
            </button>
            <button id="map-btn-set-dest" style="width: 100%; background: #4f46e5; color: white; border: none; border-radius: 8px; padding: 6px 10px; font-size: 11px; font-weight: 700; cursor: pointer;">
              🎯 Set as Destination
            </button>
          </div>
        `;

        L.popup({ minWidth: 200, offset: [0, -4] })
          .setLatLng(e.latlng)
          .setContent(container)
          .openOn(map);

        setTimeout(() => {
          const btnStart = container.querySelector('#map-btn-set-start');
          const btnDest = container.querySelector('#map-btn-set-dest');

          if (btnStart) {
            btnStart.onclick = () => {
              setUserLocationRef.current({
                coords: [lat, lng],
                name: `Custom Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                isCustom: true,
              });
              map.closePopup();
            };
          }

          if (btnDest) {
            btnDest.onclick = () => {
              const customDest = {
                id: `custom-dest-${Date.now()}`,
                name: `Custom Destination (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                coords: [lat, lng],
                category: 'custom',
                isCustom: true,
                type: 'Custom Point',
                description: `Manual location set via map click at [${lat.toFixed(5)}, ${lng.toFixed(5)}]`,
              };
              setActiveVenueRef.current(customDest);
              if (onSelectVenueRef.current) onSelectVenueRef.current(customDest);
              map.closePopup();
            };
          }
        }, 20);
      });

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView(selectedCampus.center, selectedCampus.defaultZoom);
    }

    // Render buildings polygon layer
    if (buildingsLayerRef.current) {
      buildingsLayerRef.current.clearLayers();
      CAMPUS_BUILDINGS.forEach((b) => {
        const poly = L.polygon(b.polygon, {
          color: b.color,
          fillColor: b.color,
          fillOpacity: 0.22,
          weight: 2.5,
          dashArray: '3, 4',
        });
        poly.bindTooltip(b.name, {
          permanent: false,
          direction: 'center',
          className: 'campus-building-tooltip text-xs font-bold text-white',
        });
        buildingsLayerRef.current.addLayer(poly);
      });
    }

    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);

    return () => {
      // Map cleanup if container is destroyed
    };
  }, [selectedCampus]);

  // Manage Google Maps Satellite vs Street Map vs Terrain Tiles
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (baseTileLayerRef.current) {
      mapInstanceRef.current.removeLayer(baseTileLayerRef.current);
      baseTileLayerRef.current = null;
    }

    let url = 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
    let attribution = '&copy; Google Maps';
    let subdomains = ['0', '1', '2', '3'];
    let maxZoom = 21;

    if (mapType === 'streets') {
      url = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      attribution = '&copy; OpenStreetMap contributors';
      subdomains = ['a', 'b', 'c'];
      maxZoom = 19;
    } else if (mapType === 'terrain') {
      url = 'https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}';
      attribution = '&copy; Google Maps';
      subdomains = ['0', '1', '2', '3'];
      maxZoom = 20;
    }

    baseTileLayerRef.current = L.tileLayer(url, {
      attribution,
      subdomains,
      maxZoom,
    }).addTo(mapInstanceRef.current);

    baseTileLayerRef.current.bringToBack();
  }, [mapType, selectedCampus]);

  // Filter venues based on search, floor, and category
  const filteredVenues = useMemo(() => {
    return CAMPUS_VENUES.filter((venue) => {
      // Floor filter
      if (activeFloor !== 'all' && venue.floor !== Number(activeFloor)) {
        return false;
      }
      // Category filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'hall' && !['hall', 'lab'].includes(venue.category)) return false;
        if (selectedCategory !== 'hall' && venue.category !== selectedCategory) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = venue.name.toLowerCase().includes(q);
        const matchesBuilding = venue.building.toLowerCase().includes(q);
        const matchesSynonyms = venue.synonyms?.some((s) => s.toLowerCase().includes(q));
        if (!matchesName && !matchesBuilding && !matchesSynonyms) return false;
      }
      return true;
    });
  }, [activeFloor, selectedCategory, searchQuery]);

  // Category Icon & Styling Helper
  const getCategoryTheme = (category) => {
    switch (category) {
      case 'hall':
      case 'lab':
        return {
          bg: 'bg-purple-600',
          text: 'text-purple-600',
          border: 'border-purple-500',
          ring: 'ring-purple-400/40',
          label: 'Event Venue',
        };
      case 'registration':
        return {
          bg: 'bg-emerald-600',
          text: 'text-emerald-600',
          border: 'border-emerald-500',
          ring: 'ring-emerald-400/40',
          label: 'Registration Desk',
        };
      case 'food':
        return {
          bg: 'bg-amber-600',
          text: 'text-amber-600',
          border: 'border-amber-500',
          ring: 'ring-amber-400/40',
          label: 'Dining & Refreshments',
        };
      case 'restroom':
        return {
          bg: 'bg-rose-500',
          text: 'text-rose-500',
          border: 'border-rose-400',
          ring: 'ring-rose-400/40',
          label: 'Restroom Facility',
        };
      case 'parking':
        return {
          bg: 'bg-slate-700',
          text: 'text-slate-700',
          border: 'border-slate-600',
          ring: 'ring-slate-400/40',
          label: 'Parking & Gate',
        };
      default:
        return {
          bg: 'bg-indigo-600',
          text: 'text-indigo-600',
          border: 'border-indigo-500',
          ring: 'ring-indigo-400/40',
          label: 'Campus Point',
        };
    }
  };

  // Render Venue & Landmark Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    filteredVenues.forEach((venue) => {
      const theme = getCategoryTheme(venue.category);
      const isSelected = activeVenue?.id === venue.id;

      // Custom HTML Marker using Tailwind
      const iconHtml = `
        <div class="relative group cursor-pointer">
          <div class="w-8 h-8 rounded-full ${theme.bg} text-white flex items-center justify-center shadow-lg transition-transform duration-200 transform ${
        isSelected ? 'scale-125 ring-4 ring-indigo-400' : 'hover:scale-110'
      }">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
          </div>
          <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none ${
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          } transition-opacity">
            ${venue.name}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-venue-pin',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const marker = L.marker(venue.coords, { icon: customIcon });

      marker.on('click', () => {
        setActiveVenue(venue);
        if (onSelectVenue) onSelectVenue(venue);
        mapInstanceRef.current?.flyTo(venue.coords, 19, { duration: 0.8 });
      });

      markersLayerRef.current.addLayer(marker);
    });

    // Render custom destination pin if activeVenue was set by clicking the map
    if (activeVenue && activeVenue.isCustom && activeVenue.coords) {
      const customDestHtml = `
        <div class="relative group cursor-pointer animate-bounce">
          <div class="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xl ring-4 ring-rose-300">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
              <circle cx="12" cy="12" r="7" stroke="currentColor" stroke-width="2" />
              <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            </svg>
          </div>
          <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-rose-950 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none">
            ${activeVenue.name}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: customDestHtml,
        className: 'custom-dest-pin',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const destMarker = L.marker(activeVenue.coords, { icon: customIcon, zIndexOffset: 950 });
      destMarker.bindPopup(`
        <div class="p-1 text-xs">
          <strong class="text-rose-600 font-bold block mb-1">🎯 Destination</strong>
          <span>${activeVenue.name}</span>
        </div>
      `);
      markersLayerRef.current.addLayer(destMarker);
    }
  }, [filteredVenues, activeVenue, onSelectVenue]);

  // Draw Dynamic Route when user has location and active target venue
  useEffect(() => {
    if (!mapInstanceRef.current || !routeLayerRef.current) return;

    routeLayerRef.current.clearLayers();

    if (userLocation?.coords && activeVenue?.coords) {
      const start = userLocation.coords;
      const end = activeVenue.coords;
      const distance = calculateDistanceMeters(start, end);
      const estTime = getEstimatedWalkingTime(distance);

      const pathCoords = generateCampusPath(start, end, selectedCampus.id);
      const steps = generateTurnByTurnInstructions(pathCoords, userLocation.name, activeVenue.name);

      setNavPath(pathCoords);
      setNavProgressIdx(0);

      setRouteInfo({
        startName: userLocation.name,
        targetName: activeVenue.name,
        distanceMeters: distance,
        walkingTime: estTime,
        steps,
      });

      // Glowing outer route
      const glowPoly = L.polyline(pathCoords, {
        color: '#818cf8',
        weight: 8,
        opacity: 0.45,
        lineCap: 'round',
        lineJoin: 'round',
      });

      // Sharp inner dashed walking path
      const innerPoly = L.polyline(pathCoords, {
        color: '#4f46e5',
        weight: 4,
        opacity: 0.95,
        dashArray: '6, 8',
        lineCap: 'round',
        lineJoin: 'round',
      });

      routeLayerRef.current.addLayer(glowPoly);
      routeLayerRef.current.addLayer(innerPoly);

      // Fit bounds nicely to encompass both user and destination
      const bounds = L.latLngBounds([start, end]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 19 });
    } else {
      setRouteInfo(null);
      setShowSteps(false);
      setNavPath([]);
      setIsNavigating(false);
      setNavCompleted(false);
    }
  }, [userLocation, activeVenue, selectedCampus]);

  // Live Navigation Walk Simulation (Google Maps style live progress)
  useEffect(() => {
    if (!isNavigating || !navPath || navPath.length < 2) return;

    setNavCompleted(false);
    const interval = setInterval(() => {
      setNavProgressIdx((prev) => {
        const next = prev + 1;
        if (next >= navPath.length) {
          setIsNavigating(false);
          setNavCompleted(true);
          speakInstruction(`You have arrived at ${activeVenue?.name || 'your destination'}`);
          if (navigator.vibrate) navigator.vibrate([150, 70, 150]);
          return prev;
        }

        const currentCoords = navPath[next];
        setUserLocation((u) => ({
          ...u,
          coords: currentCoords,
          name: `Walking towards ${activeVenue?.name || 'Destination'}`,
        }));

        mapInstanceRef.current?.panTo(currentCoords, { animate: true, duration: 0.6 });
        return next;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [isNavigating, navPath, activeVenue, speakInstruction]);

  // Update User Beacon Marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (userMarkerRef.current) {
      mapInstanceRef.current.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }

    if (userLocation?.coords) {
      const badgeText = userLocation.isGps
        ? 'You Are Here'
        : userLocation.isCustom
        ? 'Start Point'
        : 'Starting Point';

      const userHtml = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-10 h-10 bg-indigo-500/30 rounded-full animate-ping"></div>
          <div class="absolute w-8 h-8 bg-indigo-500/50 rounded-full animate-pulse"></div>
          <div class="w-4 h-4 bg-indigo-600 border-2 border-white rounded-full shadow-lg relative z-10"></div>
          <div class="absolute -top-7 whitespace-nowrap bg-indigo-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-md">
            ${badgeText}
          </div>
        </div>
      `;

      const userIcon = L.divIcon({
        html: userHtml,
        className: 'user-location-beacon',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker(userLocation.coords, { icon: userIcon, zIndexOffset: 1000 }).addTo(
        mapInstanceRef.current
      );

      marker.bindPopup(`
        <div class="text-xs p-1">
          <strong class="text-indigo-600 font-bold block mb-1">📍 ${badgeText}</strong>
          <span>${userLocation.name}</span>
        </div>
      `);

      userMarkerRef.current = marker;
    }
  }, [userLocation]);

  // Calibrated GPS Locate Me Handler with two-stage fallback
  const handleLocateMe = useCallback(() => {
    setGpsLoading(true);
    setGpsError(null);

    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser.');
      setGpsLoading(false);
      return;
    }

    const applyPosition = (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      const coords = [latitude, longitude];

      const distFromCenter = calculateDistanceMeters(coords, selectedCampus.center);
      let locName = 'Current Location';
      if (distFromCenter < 1200) {
        locName = `Campus GPS (±${Math.round(accuracy || 10)}m)`;
      } else {
        locName = `GPS Location (${(distFromCenter / 1000).toFixed(1)}km from center)`;
      }

      setUserLocation({
        coords,
        name: locName,
        isGps: true,
        accuracy,
      });

      setGpsLoading(false);
      mapInstanceRef.current?.flyTo(coords, Math.min(18, Math.max(16, mapInstanceRef.current.getZoom() || 17)), {
        duration: 1,
      });
    };

    // Stage 1: Try High-Accuracy (GPS Hardware) with 9s timeout
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyPosition(pos);
      },
      (err) => {
        console.warn('High-accuracy GPS failed or timed out, trying network fallback...', err);
        // Stage 2: Fallback to standard network/WiFi geolocation with 15s timeout
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            applyPosition(pos);
          },
          (fallbackErr) => {
            console.error('All geolocation attempts failed:', fallbackErr);
            let msg = 'Could not retrieve GPS position.';
            if (fallbackErr.code === 1) {
              msg = 'Location permission denied. Please allow location access in your browser address bar.';
            } else if (fallbackErr.code === 2) {
              msg = 'Position unavailable. Check your device location service or WiFi connection.';
            } else if (fallbackErr.code === 3) {
              msg = 'GPS timed out. You can tap or click anywhere on the map to set your location manually.';
            }
            setGpsError(msg);
            setGpsLoading(false);
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 }
        );
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 10000 }
    );
  }, [selectedCampus]);

  // Handle scanned landmark detection
  const handleLandmarkScanned = useCallback((landmark) => {
    setUserLocation({
      coords: landmark.coords,
      name: `${landmark.name} (${landmark.building}, Floor ${landmark.floor})`,
      landmarkId: landmark.id,
      isGps: false,
    });
    mapInstanceRef.current?.flyTo(landmark.coords, 19, { duration: 1 });
  }, []);

  // Handle manual starting point selection (Landmark, GPS, or Reset)
  const handleSelectStartPoint = useCallback(
    (landmarkIdOrValue) => {
      if (!landmarkIdOrValue) {
        setUserLocation(null);
        setRouteInfo(null);
        setShowSteps(false);
        return;
      }

      if (landmarkIdOrValue === 'gps') {
        handleLocateMe();
        return;
      }

      if (landmarkIdOrValue === 'scan') {
        setIsScannerOpen(true);
        return;
      }

      const landmark = CAMPUS_LANDMARKS.find((l) => l.id === landmarkIdOrValue);
      if (landmark) {
        setUserLocation({
          coords: landmark.coords,
          name: `${landmark.name} (${landmark.building})`,
          landmarkId: landmark.id,
          isGps: false,
        });
        mapInstanceRef.current?.flyTo(landmark.coords, 18, { duration: 0.8 });
      }
    },
    [handleLocateMe]
  );

  // Events currently matching the active venue
  const activeVenueEvents = useMemo(() => {
    if (!activeVenue) return [];
    return events.filter((e) => {
      const hall = (e.hall_number || e.venue || '').toLowerCase();
      const targetName = activeVenue.name.toLowerCase();
      return (
        hall.includes(targetName) ||
        targetName.includes(hall) ||
        activeVenue.synonyms?.some((s) => hall.includes(s.toLowerCase()))
      );
    });
  }, [activeVenue, events]);

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col md:flex-row overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
      {/* 1. Main Map Canvas Area */}
      <div className="relative flex-1 h-full min-h-[400px]">
        {/* Map Container */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Top Floating Controls Bar */}
        <div className="absolute top-3 left-3 right-3 sm:right-auto z-10 flex flex-wrap items-center gap-2 max-w-2xl pointer-events-auto">
          {gpsError && (
            <div className="w-full bg-rose-600/95 text-white text-xs px-3 py-2 rounded-2xl shadow-lg flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-200 shrink-0" />
              <span className="flex-1">{gpsError}</span>
              <button
                onClick={() => setGpsError(null)}
                className="text-white hover:text-rose-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {/* Campus Switcher Dropdown & Custom Settings Button */}
          <div className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-800 p-1 flex items-center">
            <Building className="w-4 h-4 ml-2.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <select
              value={selectedCampus.id}
              onChange={(e) => {
                const found = CAMPUSES.find((c) => c.id === e.target.value);
                if (found) setSelectedCampus(found);
              }}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 py-1.5 pl-2 pr-6 appearance-none focus:outline-none cursor-pointer max-w-[130px] sm:max-w-none truncate"
            >
              {CAMPUSES.map((c) => (
                <option
                  key={c.id}
                  value={c.id}
                  className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                >
                  {c.shortName} &bull; {c.city}
                </option>
              ))}
              {selectedCampus.isCustom && (
                <option
                  value={selectedCampus.id}
                  className="bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold"
                >
                  📍 {selectedCampus.shortName} (Custom)
                </option>
              )}
            </select>
            <button
              type="button"
              onClick={() => setIsConfigOpen(true)}
              title="Customize Campus Center Coordinates"
              className="p-1 mr-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Start Location Selector */}
          <div className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-800 p-1 flex items-center">
            <Compass className="w-4 h-4 ml-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <select
              value={
                userLocation?.landmarkId ||
                (userLocation?.isGps ? 'gps' : userLocation?.isCustom ? 'custom' : '')
              }
              onChange={(e) => handleSelectStartPoint(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 py-1.5 pl-2 pr-6 appearance-none focus:outline-none cursor-pointer max-w-[140px] sm:max-w-none truncate"
            >
              <option value="">Start: Choose Point ▾</option>
              {userLocation?.isCustom && (
                <option value="custom">📍 Selected Map Point</option>
              )}
              <option value="gps">📍 My Current GPS</option>
              {CAMPUS_LANDMARKS.map((lm) => (
                <option key={lm.id} value={lm.id}>
                  🚪 {lm.name} ({lm.building})
                </option>
              ))}
              <option value="scan">📷 Scan Landmark QR...</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 mr-2 text-slate-400 pointer-events-none shrink-0" />
          </div>

          {/* Quick Search */}
          <div className="relative flex-1 sm:w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-800 flex items-center px-3 py-1.5">
            <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
            <input
              type="text"
              placeholder="Find hall, lab, canteen, gate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Landmark Scanner Button (Highlight) */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all transform hover:scale-105 active:scale-95 shrink-0"
          >
            <QrCode className="w-4 h-4" />
            <span>Scan Landmark</span>
          </button>
        </div>

        {/* Top Live Navigation Turn HUD (Google Maps style) */}
        {isNavigating && routeInfo && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 w-11/12 max-w-lg bg-emerald-900/95 dark:bg-emerald-950/95 text-white backdrop-blur-md px-4 py-3 rounded-3xl shadow-2xl border border-emerald-400/40 flex items-center justify-between animate-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white text-emerald-900 flex items-center justify-center font-extrabold shadow-md shrink-0">
                <Navigation2 className="w-5 h-5 fill-current transform rotate-45" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-emerald-200 font-extrabold flex items-center gap-1.5">
                  <span>Live Walk Navigation</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                </div>
                <div className="text-sm font-extrabold text-white leading-tight line-clamp-1">
                  {routeInfo.steps?.[
                    Math.min(
                      routeInfo.steps.length - 1,
                      Math.floor((navProgressIdx / (navPath.length || 1)) * routeInfo.steps.length)
                    )
                  ]?.action || `Heading to ${routeInfo.targetName}`}
                </div>
                <div className="text-xs text-emerald-200/90 flex items-center gap-2 mt-0.5">
                  <span>
                    {Math.max(
                      0,
                      Math.round(
                        routeInfo.distanceMeters *
                          (1 - navProgressIdx / (navPath.length - 1 || 1))
                      )
                    )}
                    m remaining
                  </span>
                  <span>&bull;</span>
                  <span>
                    {Math.max(
                      1,
                      Math.ceil(
                        (routeInfo.distanceMeters *
                          (1 - navProgressIdx / (navPath.length - 1 || 1))) /
                          75
                      )
                    )}{' '}
                    min walk
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-800/80 rounded-xl transition"
                title={isVoiceEnabled ? 'Voice Guidance Active' : 'Voice Guidance Muted'}
              >
                {isVoiceEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4 text-emerald-400/50" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsNavigating(false)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow"
                title="Exit Navigation"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Exit</span>
              </button>
            </div>
          </div>
        )}

        {/* Arrival Success Toast */}
        {navCompleted && activeVenue && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-11/12 max-w-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 rounded-3xl shadow-2xl border border-emerald-300 flex items-center justify-between animate-in zoom-in-95">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
              <div className="text-xs font-bold">
                <span>Arrived! You have reached {activeVenue.name}</span>
              </div>
            </div>
            <button onClick={() => setNavCompleted(false)} className="p-1 hover:text-emerald-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Floating Quick Action Buttons & Google Maps Layer Switcher */}
        <div className="absolute bottom-6 left-4 z-10 flex flex-col sm:flex-row items-start sm:items-center gap-2 pointer-events-auto">
          {/* Map Layer Switcher: Satellite / Streets / Terrain */}
          <div className="bg-slate-900/90 dark:bg-slate-900/95 backdrop-blur-md p-1 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMapType('satellite')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mapType === 'satellite'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Google Maps Photorealistic Satellite View"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>Satellite</span>
            </button>
            <button
              type="button"
              onClick={() => setMapType('streets')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mapType === 'streets'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Standard Street Map"
            >
              <MapIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Map</span>
            </button>
            <button
              type="button"
              onClick={() => setMapType('terrain')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mapType === 'terrain'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Topographic Elevation Terrain View"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Terrain</span>
            </button>
          </div>

          {/* GPS Locate Me Button */}
          <button
            onClick={handleLocateMe}
            disabled={gpsLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-xl hover:border-indigo-500 transition-all text-xs font-bold"
            title="Calibrate via GPS"
          >
            <Crosshair
              className={`w-3.5 h-3.5 text-indigo-600 ${gpsLoading ? 'animate-spin' : ''}`}
            />
            <span>{gpsLoading ? 'Locating...' : 'Locate Me'}</span>
          </button>

          {/* Compass / Recenter Button */}
          <button
            onClick={() => {
              if (userLocation?.coords) {
                mapInstanceRef.current?.flyTo(userLocation.coords, 18, { duration: 0.8 });
              } else {
                mapInstanceRef.current?.flyTo(selectedCampus.center, selectedCampus.defaultZoom, {
                  duration: 0.8,
                });
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-xl hover:border-indigo-500 transition-all text-xs font-bold"
            title="Re-center to North / Campus"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Recenter</span>
          </button>

          {/* External Directions to College (for Outstation participants) */}
          <a
            href={selectedCampus.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-xl hover:text-indigo-600 text-xs font-semibold"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
            <span>Campus Directions</span>
          </a>
        </div>

        {/* Floor & Category Filter Tabs (Floating Bottom Center) */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 hidden sm:flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 text-xs font-semibold">
          {/* Floor selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
            <span className="text-[10px] text-slate-400 font-bold px-2 uppercase">Floor:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 0, label: 'Ground' },
              { id: 1, label: '1st' },
              { id: 2, label: '2nd' },
            ].map((fl) => (
              <button
                key={fl.id}
                onClick={() => setActiveFloor(fl.id)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                  activeFloor === fl.id
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {fl.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Category filter */}
          <div className="flex items-center gap-1">
            {[
              { id: 'all', label: 'All Places' },
              { id: 'hall', label: 'Halls & Labs' },
              { id: 'food', label: 'Dining' },
              { id: 'registration', label: 'Desk' },
              { id: 'restroom', label: 'Washrooms' },
              { id: 'parking', label: 'Parking' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-xl text-xs transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active Route HUD Banner */}
        {routeInfo && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 w-11/12 max-w-lg bg-slate-900/95 text-white backdrop-blur-md p-4 rounded-3xl shadow-2xl border border-indigo-500/40 animate-in slide-in-from-top-4 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-600/30">
                  <Footprints className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="text-[10px] text-indigo-300 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                    <span>Live Campus Navigation</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>
                  <div className="text-sm font-extrabold text-white leading-tight">
                    {routeInfo.targetName}
                  </div>
                  <div className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                    <span className="text-indigo-200 font-medium">From: {routeInfo.startName}</span>
                    <span>&bull;</span>
                    <strong className="text-white font-bold">{routeInfo.distanceMeters}m</strong>
                    <span>&bull;</span>
                    <span className="bg-indigo-600/80 px-2 py-0.5 rounded-full text-[10px] font-bold text-white">
                      {routeInfo.walkingTime}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Start Live Navigation Walk Button (Google Maps Style) */}
                <button
                  onClick={() => {
                    const willNav = !isNavigating;
                    setIsNavigating(willNav);
                    setNavProgressIdx(0);
                    if (willNav && activeVenue) {
                      speakInstruction(`Starting live navigation to ${activeVenue.name}. Follow highlighted path.`);
                    }
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md ${
                    isNavigating
                      ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                  }`}
                  title={
                    isNavigating
                      ? 'Stop live walk navigation'
                      : 'Start live turn-by-turn navigation walk'
                  }
                >
                  {isNavigating ? (
                    <Square className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>{isNavigating ? 'Stop' : 'Start'}</span>
                </button>

                {/* Direct Google Maps Route Link */}
                {userLocation?.coords && activeVenue?.coords && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation.coords[0]},${userLocation.coords[1]}&destination=${activeVenue.coords[0]},${activeVenue.coords[1]}&travelmode=walking`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                    title="Open live navigation in Google Maps app"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Google Maps</span>
                  </a>
                )}

                <button
                  onClick={() => setShowSteps(!showSteps)}
                  className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                    showSteps
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                  title={showSteps ? 'Hide turn-by-turn guidance' : 'View turn-by-turn guidance'}
                >
                  <ListOrdered className="w-4 h-4" />
                  <span className="hidden sm:inline">Directions</span>
                  {showSteps ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => {
                    setUserLocation(null);
                    setRouteInfo(null);
                    setShowSteps(false);
                    setIsNavigating(false);
                  }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                  title="Cancel route"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expandable Turn-by-Turn Guidance Sheet */}
            {showSteps && routeInfo.steps && routeInfo.steps.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 max-h-56 overflow-y-auto pr-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 mb-1 flex items-center justify-between">
                  <span>Walking Directions ({routeInfo.steps.length} steps)</span>
                  <span className="text-slate-400 normal-case font-normal text-[10px]">Follow highlighted walkway path</span>
                </div>
                {routeInfo.steps.map((step, idx) => (
                  <div
                    key={step.id || idx}
                    className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-800/70 border border-slate-700/60 text-xs"
                  >
                    <div className="w-5 h-5 rounded-full bg-indigo-600/80 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-100">{step.action}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{step.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Right-Side Drawer: Venue Details & Campus Directory */}
      <div className="w-full md:w-96 bg-white dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 flex flex-col h-auto md:h-full z-10 shadow-xl">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Campus Directory
              </h3>
              <p className="text-[11px] text-slate-500">
                {filteredVenues.length} points of interest found
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsScannerOpen(true)}
            className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold flex items-center gap-1"
          >
            <QrCode className="w-4 h-4" />
            <span>QR Scan</span>
          </button>
        </div>

        {/* Details or List View */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeVenue ? (
            /* Selected Venue Details Card */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 relative">
                <button
                  onClick={() => setActiveVenue(null)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      getCategoryTheme(activeVenue.category).bg
                    } text-white`}
                  >
                    {activeVenue.type || 'Custom Destination'}
                  </span>
                  {activeVenue.floor !== undefined && activeVenue.floorLabel ? (
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Floor {activeVenue.floor} ({activeVenue.floorLabel})
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-indigo-500">
                      Custom Pin
                    </span>
                  )}
                </div>

                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {activeVenue.name}
                </h4>
                {activeVenue.building && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
                    {activeVenue.building}
                  </p>
                )}

                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed">
                  {activeVenue.description || 'Target navigation destination.'}
                </p>

                {!activeVenue.isCustom && (activeVenue.capacity || activeVenue.airConditioned !== undefined) && (
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                    {activeVenue.capacity && (
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Capacity: {activeVenue.capacity} seats</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>{activeVenue.airConditioned ? 'Air Conditioned' : 'Well Ventilated'}</span>
                    </div>
                  </div>
                )}

                {/* Primary Action: Navigate Here */}
                <div className="mt-4 pt-3 space-y-2">
                  {userLocation ? (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200">
                        <div className="font-bold flex items-center justify-between">
                          <span>Active Route</span>
                          <span className="text-[10px] bg-indigo-200 dark:bg-indigo-800 px-1.5 py-0.5 rounded font-bold">
                            {routeInfo?.distanceMeters ? `${routeInfo.distanceMeters}m` : 'Calculating...'}
                          </span>
                        </div>
                        <div className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5 truncate">
                          From: {userLocation.name}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {/* Start Navigation Action in Details Card */}
                        <button
                          onClick={() => {
                            const willNav = !isNavigating;
                            setIsNavigating(willNav);
                            setNavProgressIdx(0);
                            mapInstanceRef.current?.flyTo(userLocation.coords, 19, { duration: 0.8 });
                            if (willNav) {
                              speakInstruction(`Starting live navigation to ${activeVenue.name}. Follow highlighted path.`);
                            }
                          }}
                          className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition ${
                            isNavigating
                              ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                          }`}
                        >
                          {isNavigating ? (
                            <Square className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current" />
                          )}
                          <span>
                            {isNavigating
                              ? 'Stop Live Navigation'
                              : 'Start Live Navigation Walk'}
                          </span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              mapInstanceRef.current?.flyTo(activeVenue.coords, 19, { duration: 0.8 });
                            }}
                            className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/25 flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Focus Venue</span>
                          </button>

                          <a
                            href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation.coords[0]},${userLocation.coords[1]}&destination=${activeVenue.coords[0]},${activeVenue.coords[1]}&travelmode=walking`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition"
                            title="Open in native Google Maps"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Google Maps</span>
                          </a>

                          <button
                            onClick={() => {
                              setUserLocation(null);
                              setRouteInfo(null);
                              setShowSteps(false);
                              setIsNavigating(false);
                            }}
                            className="py-2 px-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs transition cursor-pointer"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={() => handleSelectStartPoint('MAIN_GATE')}
                        className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <Navigation className="w-4 h-4" />
                        <span>Navigate from Main Entrance Arch</span>
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setIsScannerOpen(true)}
                          className="py-2 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-semibold text-[11px] border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Scan Landmark</span>
                        </button>
                        <button
                          onClick={handleLocateMe}
                          disabled={gpsLoading}
                          className="py-2 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-semibold text-[11px] border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <Crosshair className={`w-3.5 h-3.5 text-indigo-500 ${gpsLoading ? 'animate-spin' : ''}`} />
                          <span>Use My GPS</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Events Scheduled at this Venue */}
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Scheduled Events in this Venue ({activeVenueEvents.length})
                </h5>
                {activeVenueEvents.length > 0 ? (
                  <div className="space-y-2">
                    {activeVenueEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-sm"
                      >
                        <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                          {evt.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <Clock className="w-3 h-3 text-indigo-500" />
                          <span>{evt.category || 'Symposium Session'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs text-slate-500">
                    No active sessions currently scheduled in this room.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Venue Directory List */
            <div className="space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                Click any venue to highlight its location on the campus map or calculate walking
                directions.
              </p>
              {filteredVenues.map((v) => {
                const theme = getCategoryTheme(v.category);
                return (
                  <button
                    key={v.id}
                    onClick={() => {
                      setActiveVenue(v);
                      mapInstanceRef.current?.flyTo(v.coords, 19, { duration: 0.8 });
                    }}
                    className="w-full text-left p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md transition-all group flex items-start justify-between"
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-xl ${theme.bg} text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold`}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {v.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {v.building} &bull; Floor {v.floor}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-300 uppercase">
                      {v.type}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer Footer: College Info */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 text-[11px] text-slate-500">
          <div className="font-bold text-slate-700 dark:text-slate-300">
            {selectedCampus.name}
          </div>
          <p className="truncate text-slate-400">{selectedCampus.address}</p>
        </div>
      </div>

      {/* 3. Landmark Scanner Modal */}
      <LandmarkScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onLandmarkDetected={handleLandmarkScanned}
        initialTargetVenue={activeVenue}
      />

      {/* 4. Campus Configuration Modal */}
      <CampusConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        currentCampus={selectedCampus}
        onSaveCampus={(updatedCampus) => {
          setSelectedCampus(updatedCampus);
          mapInstanceRef.current?.setView(updatedCampus.center, updatedCampus.defaultZoom);
        }}
      />
    </div>
  );
}
