// agent-notes: { ctx: "Student-facing indoor navigation page with built-in camera QR scanner, building/floor browser, wheelchair accessible routing, search, shortest path, and turn-by-turn directions", deps: ["src/services/indoorNavDataService.js", "src/services/indoorNavigationService.js", "src/components/FloorQRScannerModal.jsx", "lucide-react", "react-router-dom"], state: "active", last: "antigravity@2026-10-03" }

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchFloorMapData, fetchBuildings, fetchFloors, fetchNodes, fetchEdges,
} from '../services/indoorNavDataService';
import {
  dijkstraMultiFloor, generateDirections, findNodeForLocation, formatDistance,
} from '../services/indoorNavigationService';
import FloorQRScannerModal from '../components/FloorQRScannerModal';
import {
  MapPin, Search, Navigation, ArrowLeft, Loader2, AlertCircle,
  Building2, Layers, CornerDownRight, RotateCcw,
  Footprints, ChevronDown, ChevronUp, X, QrCode, Camera, Accessibility,
  Compass, ArrowRight, ZoomIn, ZoomOut,
} from 'lucide-react';

const LOCATION_COLORS = {
  classroom: '#3b82f6',
  laboratory: '#8b5cf6',
  office: '#6366f1',
  department: '#0ea5e9',
  seminar_hall: '#f59e0b',
  toilet: '#06b6d4',
  restroom: '#06b6d4',
  entrance: '#10b981',
  exit: '#14b8a6',
  corridor: '#94a3b8',
  stairs: '#ef4444',
  lift: '#ec4899',
  other: '#64748b',
};

export default function FloorNavigationPage() {
  const { floorId: paramFloorId } = useParams();
  const navigate = useNavigate();

  // Active Floor ID
  const [activeFloorId, setActiveFloorId] = useState(paramFloorId || null);

  // Scanner modal state
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Floor map data state
  const [floor, setFloor] = useState(null);
  const [locations, setLocations] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [allNodes, setAllNodes] = useState([]);
  const [allEdges, setAllEdges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Directory of all buildings & floors for browsing
  const [buildings, setBuildings] = useState([]);
  const [publishedFloors, setPublishedFloors] = useState([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);

  // Navigation & Route states
  const [startNodeId, setStartNodeId] = useState(null);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [requireAccessible, setRequireAccessible] = useState(false);
  const [routeResult, setRouteResult] = useState(null);
  const [directions, setDirections] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDirections, setShowDirections] = useState(true);

  // Pan / Zoom ViewBox
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1200, h: 800 });
  const svgRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, vbX: 0, vbY: 0 });

  // Sync parameter change
  useEffect(() => {
    if (paramFloorId) {
      setActiveFloorId(paramFloorId);
    }
  }, [paramFloorId]);

  // Load campus directory when no floor is selected
  useEffect(() => {
    if (!activeFloorId) {
      (async () => {
        setLoadingDirectory(true);
        const { data: bldgs } = await fetchBuildings();
        setBuildings(bldgs || []);
        if (bldgs && bldgs.length > 0) {
          const floorsPromises = bldgs.map((b) => fetchFloors(b.id));
          const allFloorsRes = await Promise.all(floorsPromises);
          const pub = allFloorsRes.flatMap((r) => (r.data || []).filter((f) => f.is_published));
          setPublishedFloors(pub);
        }
        setLoadingDirectory(false);
      })();
    }
  }, [activeFloorId]);

  // Load floor data when activeFloorId changes
  useEffect(() => {
    if (!activeFloorId) {
      setFloor(null);
      setLocations([]);
      setNodes([]);
      setEdges([]);
      setStartNodeId(null);
      setSelectedDestination(null);
      setRouteResult(null);
      setDirections([]);
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchFloorMapData(activeFloorId);

        if (!data.floor) {
          setError('Floor not found. It may have been removed or the QR link is outdated.');
          setLoading(false);
          return;
        }

        if (!data.floor.is_published) {
          setError(`"${data.floor.name}" has not been published yet by campus administration.`);
          setLoading(false);
          return;
        }

        setFloor(data.floor);
        setLocations(data.locations || []);
        setNodes(data.nodes || []);
        setEdges(data.edges || []);

        if (data.floor.svg_view_box) {
          const parts = data.floor.svg_view_box.split(' ').map(Number);
          if (parts.length === 4) setViewBox({ x: parts[0], y: parts[1], w: parts[2], h: parts[3] });
        }

        // Set primary QR start node
        if (data.floor.qr_start_node_id) {
          setStartNodeId(data.floor.qr_start_node_id);
        } else if (data.nodes && data.nodes.length > 0) {
          // Fallback to entrance or first node
          const entranceNode = data.nodes.find((n) => n.node_type === 'entrance') || data.nodes[0];
          setStartNodeId(entranceNode.id);
        }

        // Load multi-floor nodes/edges for cross-floor routing
        if (data.floor.building_id) {
          const floorsRes = await fetchFloors(data.floor.building_id);
          const allFloors = floorsRes.data || [];
          const allNodeArrays = await Promise.all(allFloors.map((f) => fetchNodes(f.id)));
          const allEdgeArrays = await Promise.all(allFloors.map((f) => fetchEdges(f.id)));
          setAllNodes(allNodeArrays.flatMap((r) => r.data || []));
          setAllEdges(allEdgeArrays.flatMap((r) => r.data || []));
        } else {
          setAllNodes(data.nodes || []);
          setAllEdges(data.edges || []);
        }
      } catch (err) {
        console.error('Failed to load floor data:', err);
        setError('Failed to load navigation data. Please check your connection.');
      }
      setLoading(false);
    })();
  }, [activeFloorId]);

  // Handle scanned floor
  const handleFloorScanned = useCallback((scannedFloorId, scannedStartNodeId) => {
    setActiveFloorId(scannedFloorId);
    if (scannedStartNodeId) {
      setStartNodeId(scannedStartNodeId);
    }
    // Update browser URL without reloading
    navigate(`/navigate/floor/${scannedFloorId}`, { replace: true });
  }, [navigate]);

  // Search filter
  const searchableLocations = useMemo(() => {
    return locations
      .filter((l) => l.is_searchable !== false && l.location_type !== 'corridor')
      .filter((l) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          l.name.toLowerCase().includes(q) ||
          (l.room_number && l.room_number.toLowerCase().includes(q)) ||
          (l.department && l.department.toLowerCase().includes(q)) ||
          l.location_type.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [locations, searchQuery]);

  // Calculate shortest path route
  const calculateRoute = useCallback((destLocation, accessibleMode = requireAccessible) => {
    if (!startNodeId) {
      setRouteResult({ error: 'No starting location set for this floor. Please scan a floor QR poster.' });
      return;
    }

    const graphNodes = allNodes.length > 0 ? allNodes : nodes;
    const graphEdges = allEdges.length > 0 ? allEdges : edges;

    const destNode = findNodeForLocation(graphNodes, destLocation.id);
    if (!destNode) {
      setRouteResult({
        error: `"${destLocation.name}" has no doorway access point connected. Please contact administration.`,
      });
      setDirections([]);
      setSelectedDestination(destLocation);
      return;
    }

    const result = dijkstraMultiFloor(graphNodes, graphEdges, startNodeId, destNode.id, {
      requireAccessible: accessibleMode,
    });

    if (result.error || result.path.length === 0) {
      setRouteResult({
        error: accessibleMode
          ? 'No wheelchair-accessible route found. Elevator access may not be configured between these points.'
          : (result.error || 'No connected walking route found between these locations.'),
      });
      setDirections([]);
    } else {
      setRouteResult(result);
      const dirs = generateDirections(result.pathDetails, result.nodeMap, locations);
      setDirections(dirs);
    }

    setSelectedDestination(destLocation);
    setShowDirections(true);
  }, [startNodeId, nodes, edges, allNodes, allEdges, locations, requireAccessible]);

  // Toggle wheelchair accessible routing
  const handleToggleAccessible = () => {
    const nextAccessible = !requireAccessible;
    setRequireAccessible(nextAccessible);
    if (selectedDestination) {
      calculateRoute(selectedDestination, nextAccessible);
    }
  };

  // Reset route
  const resetRoute = useCallback(() => {
    setSelectedDestination(null);
    setRouteResult(null);
    setDirections([]);
    setSearchQuery('');
  }, []);

  // Zoom & Pan
  const handleZoom = (factor) => {
    setViewBox((vb) => {
      const nw = Math.max(200, Math.min(4000, vb.w * factor));
      const nh = Math.max(133, Math.min(2666, vb.h * factor));
      return { x: vb.x + (vb.w - nw) / 2, y: vb.y + (vb.h - nh) / 2, w: nw, h: nh };
    });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    handleZoom(e.deltaY > 0 ? 1.15 : 0.87);
  };

  const handlePointerDown = (e) => {
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      vbX: viewBox.x,
      vbY: viewBox.y,
    };
    const svg = svgRef.current;
    if (svg) svg.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isPanning) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const dx = ((e.clientX - panStartRef.current.x) / rect.width) * viewBox.w;
    const dy = ((e.clientY - panStartRef.current.y) / rect.height) * viewBox.h;
    setViewBox({
      ...viewBox,
      x: Math.round(panStartRef.current.vbX - dx),
      y: Math.round(panStartRef.current.vbY - dy),
    });
  };

  const handlePointerUp = (e) => {
    setIsPanning(false);
    const svg = svgRef.current;
    if (svg && svg.hasPointerCapture(e.pointerId)) {
      svg.releasePointerCapture(e.pointerId);
    }
  };

  // Extract path nodes for drawing
  const routePathNodes = useMemo(() => {
    if (!routeResult || !routeResult.path || routeResult.path.length === 0) return [];
    const nodeMap = {};
    for (const n of (allNodes.length > 0 ? allNodes : nodes)) {
      nodeMap[n.id] = n;
    }
    return routeResult.path.map((id) => nodeMap[id]).filter(Boolean);
  }, [routeResult, nodes, allNodes]);

  // Render Directory Landing when no floor selected
  if (!activeFloorId && !loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col">
        {/* Header */}
        <div className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Compass className="w-5 h-5 text-white animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight">SmartSympo Campus Navigation</h1>
              <p className="text-xs text-slate-400">Scan floor poster or choose your destination</p>
            </div>
          </div>
        </div>

        {/* Hero Section with Prominent Scan Floor QR Button */}
        <div className="max-w-3xl mx-auto w-full p-6 space-y-6 my-auto">
          <div className="bg-gradient-to-br from-indigo-900/60 to-purple-900/40 border border-indigo-500/30 rounded-3xl p-8 text-center space-y-4 shadow-2xl relative overflow-hidden">
            <div className="w-20 h-20 rounded-3xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-indigo-600/40">
              <QrCode className="w-10 h-10" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-extrabold tracking-tight">At the Campus Right Now?</h2>
              <p className="text-sm text-indigo-200 max-w-md mx-auto">
                Scan the primary QR code displayed at your building or floor entrance to immediately set your starting position and navigate.
              </p>
            </div>
            <button
              onClick={() => setIsScannerOpen(true)}
              className="px-8 py-3.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-2xl font-extrabold text-sm shadow-xl shadow-indigo-600/40 transition hover:scale-105 active:scale-95 inline-flex items-center gap-2.5"
            >
              <Camera className="w-5 h-5" />
              <span>Scan Floor QR</span>
            </button>
          </div>

          {/* Directory of Published Floors */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" /> Or Browse Campus Buildings & Floors
            </h3>

            {loadingDirectory ? (
              <div className="p-8 text-center text-slate-500 text-xs">Loading campus buildings…</div>
            ) : publishedFloors.length === 0 ? (
              <div className="p-8 bg-slate-800/40 rounded-2xl border border-slate-800 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-sm font-bold text-slate-300">No Published Floor Maps Yet</p>
                <p className="text-xs text-slate-400">
                  Campus administration has not published floor maps yet. Scan a floor QR when posted.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {publishedFloors.map((fl) => {
                  const bldg = buildings.find((b) => b.id === fl.building_id);
                  return (
                    <button
                      key={fl.id}
                      onClick={() => handleFloorScanned(fl.id, fl.qr_start_node_id)}
                      className="p-4 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 rounded-2xl text-left transition flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-extrabold text-white group-hover:text-indigo-300 transition">
                            {fl.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {bldg?.name || 'Campus Building'} (Floor {fl.floor_number})
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* QR Scanner Modal */}
        <FloorQRScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onFloorScanned={handleFloorScanned}
        />
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-950 rounded-3xl border border-slate-800 p-8 max-w-md text-center space-y-4 shadow-2xl text-white">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-lg font-extrabold">Floor Unavailable</h2>
          <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => setIsScannerOpen(true)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" /> Scan Another QR
            </button>
            <button
              onClick={() => setActiveFloorId(null)}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
            >
              Back to Campus Directory
            </button>
          </div>
        </div>

        <FloorQRScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onFloorScanned={handleFloorScanned}
        />
      </div>
    );
  }

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-300">Loading interactive floor navigation…</p>
        </div>
      </div>
    );
  }

  const buildingName = floor?.campus_buildings?.name || floor?.campus_buildings?.short_name || 'Campus Building';

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden select-none">
      {/* ─── HEADER ─── */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveFloorId(null)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Browse all campus floors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-white tracking-tight">{buildingName}</h1>
            <p className="text-[11px] text-slate-400">
              {floor?.name} (Floor {floor?.floor_number})
              {startNodeId && <span className="text-emerald-400 ml-1.5 font-bold">• You Are Here</span>}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* Wheelchair Accessible Toggle */}
          <button
            onClick={handleToggleAccessible}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              requireAccessible
                ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Only use elevators and step-free paths"
          >
            <Accessibility className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Accessible</span>
          </button>

          {/* Scan Another QR Code Button */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-extrabold shadow-md transition"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan QR</span>
          </button>

          {selectedDestination && (
            <button
              onClick={resetRoute}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              title="Reset Route"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ─── MAIN CONTENT: MAP + SIDEBAR ─── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* SVG Navigation Map Canvas with touch-action:none */}
        <div
          className="flex-1 relative overflow-hidden bg-slate-950"
          style={{ touchAction: 'none' }}
        >
          <svg
            ref={svgRef}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            className="w-full h-full cursor-grab active:cursor-grabbing select-none"
            style={{ touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
          >
            <defs>
              <pattern id="navGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
              </pattern>
              <filter id="routeGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Grid */}
            <rect x={viewBox.x - 3000} y={viewBox.y - 3000} width={viewBox.w + 6000} height={viewBox.h + 6000} fill="url(#navGrid)" />

            {/* Background Image if uploaded */}
            {floor?.background_image && (
              <image
                href={floor.background_image}
                x="0"
                y="0"
                width="1200"
                height="800"
                opacity="0.35"
                preserveAspectRatio="xMidYMid meet"
                className="pointer-events-none"
              />
            )}

            {/* Render Floor Locations */}
            {locations.map((loc) => {
              const sd = loc.shape_data || {};
              const isDestination = selectedDestination?.id === loc.id;
              const fill = loc.fill_color || LOCATION_COLORS[loc.location_type] || '#3b82f6';

              if (sd.type === 'rect') {
                return (
                  <g
                    key={loc.id}
                    onClick={() => calculateRoute(loc)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={sd.x}
                      y={sd.y}
                      width={sd.width}
                      height={sd.height}
                      fill={fill}
                      fillOpacity={isDestination ? 0.65 : 0.25}
                      stroke={isDestination ? '#818cf8' : fill}
                      strokeWidth={isDestination ? 3 : 1}
                      rx={loc.location_type === 'corridor' ? 2 : 6}
                    />
                    <text
                      x={sd.x + sd.width / 2}
                      y={sd.y + sd.height / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={Math.max(10, Math.min(13, Math.floor(sd.width / 8)))}
                      fontWeight="800"
                      fill="#ffffff"
                      className="pointer-events-none"
                    >
                      {loc.name}
                    </text>
                    {loc.room_number && (
                      <text
                        x={sd.x + sd.width / 2}
                        y={sd.y + sd.height / 2 + 12}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={8}
                        fontWeight="600"
                        fill="#94a3b8"
                        className="pointer-events-none"
                      >
                        #{loc.room_number}
                      </text>
                    )}
                  </g>
                );
              }
              return null;
            })}

            {/* Render Calculated Route Line (Pulsing Animated) */}
            {routePathNodes.length > 1 && (
              <g>
                {/* Thick glow track */}
                <polyline
                  points={routePathNodes.map((n) => `${n.x},${n.y}`).join(' ')}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.3"
                />
                {/* Animated dash line */}
                <polyline
                  points={routePathNodes.map((n) => `${n.x},${n.y}`).join(' ')}
                  fill="none"
                  stroke="#a5b4fc"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="8 6"
                  filter="url(#routeGlow)"
                >
                  <animate attributeName="stroke-dashoffset" values="0;-28" dur="1.2s" repeatCount="indefinite" />
                </polyline>
              </g>
            )}

            {/* Start Node Marker (Scanned QR Location) */}
            {startNodeId && (() => {
              const startNode = nodes.find((n) => n.id === startNodeId) || allNodes.find((n) => n.id === startNodeId);
              if (!startNode) return null;
              return (
                <g>
                  <circle cx={startNode.x} cy={startNode.y} r={10} fill="#10b981" stroke="#fff" strokeWidth={3} />
                  <circle cx={startNode.x} cy={startNode.y} r={16} fill="none" stroke="#10b981" strokeWidth={2} opacity={0.6}>
                    <animate attributeName="r" values="10;22" dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                  <text x={startNode.x} y={startNode.y - 16} textAnchor="middle" fontSize={11} fontWeight="900" fill="#34d399">
                    📍 You are here
                  </text>
                </g>
              );
            })()}

            {/* Destination Marker */}
            {selectedDestination && (() => {
              const destNode = findNodeForLocation(nodes.length > 0 ? nodes : allNodes, selectedDestination.id);
              if (!destNode) return null;
              return (
                <g>
                  <circle cx={destNode.x} cy={destNode.y} r={10} fill="#ef4444" stroke="#fff" strokeWidth={3} />
                  <circle cx={destNode.x} cy={destNode.y} r={16} fill="none" stroke="#ef4444" strokeWidth={2} opacity={0.6}>
                    <animate attributeName="r" values="10;22" dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                  <text x={destNode.x} y={destNode.y - 16} textAnchor="middle" fontSize={11} fontWeight="900" fill="#f87171">
                    🎯 {selectedDestination.name}
                  </text>
                </g>
              );
            })()}

            {/* Intermediate waypoints on active path */}
            {routePathNodes.map((n) => {
              if (n.id === startNodeId) return null;
              const destNode = selectedDestination && findNodeForLocation(nodes, selectedDestination.id);
              if (destNode && n.id === destNode.id) return null;
              return (
                <circle key={n.id} cx={n.x} cy={n.y} r={4} fill="#818cf8" stroke="#1e1b4b" strokeWidth={1.5} />
              );
            })}
          </svg>

          {/* Floating Zoom Buttons (Bottom Right) */}
          <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-2xl">
            <button onClick={() => handleZoom(0.85)} className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800" title="Zoom In">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={() => handleZoom(1.15)} className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800" title="Zoom Out">
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── SIDEBAR: SEARCH & DIRECTIONS ─── */}
        <div className="w-full md:w-80 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col shrink-0 max-h-[46vh] md:max-h-full overflow-hidden">
          {/* Search Bar */}
          <div className="p-3 border-b border-slate-800 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search room, lab, hall, office…"
                className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 transition"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Route Status Card */}
            {routeResult && (
              <div className={`p-3 rounded-2xl border text-xs ${
                routeResult.error
                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}>
                {routeResult.error ? (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="font-semibold leading-relaxed">{routeResult.error}</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Footprints className="w-4 h-4 text-emerald-400" />
                      <span className="font-extrabold">Shortest Walking Path</span>
                    </div>
                    <span className="font-extrabold text-sm">{formatDistance(routeResult.distance)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Turn-by-Turn Directions List */}
            {directions.length > 0 && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowDirections(!showDirections)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-indigo-950/70 border border-indigo-800/40 rounded-xl text-xs font-bold text-indigo-300"
                >
                  <span className="flex items-center gap-1.5">
                    <CornerDownRight className="w-3.5 h-3.5 text-indigo-400" />
                    Turn-by-Turn Directions ({directions.length} steps)
                  </span>
                  {showDirections ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showDirections && (
                  <div className="space-y-1.5 pl-1">
                    {directions.map((dir) => (
                      <div
                        key={dir.step}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl text-xs ${
                          dir.type === 'start' ? 'bg-emerald-950/40 border border-emerald-800/30 text-emerald-200' :
                          dir.type === 'destination' ? 'bg-indigo-950/40 border border-indigo-800/30 text-indigo-200' :
                          dir.type === 'floor_transition' ? 'bg-amber-950/40 border border-amber-800/30 text-amber-200' :
                          'bg-slate-950 border border-slate-800/60 text-slate-300'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold bg-slate-800 text-white shrink-0 mt-0.5">
                          {dir.step}
                        </span>
                        <div className="leading-relaxed font-medium">{dir.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Destination Search Results List */}
            {!selectedDestination && (
              <div className="space-y-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1 mb-2">
                  Destinations on This Floor ({searchableLocations.length})
                </p>
                {searchableLocations.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No matching classrooms or rooms found.
                  </div>
                ) : (
                  searchableLocations.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => calculateRoute(loc)}
                      className="w-full p-2.5 rounded-xl flex items-center gap-3 text-left hover:bg-slate-800 transition group"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: (LOCATION_COLORS[loc.location_type] || '#3b82f6') + '25' }}
                      >
                        <MapPin className="w-4 h-4" style={{ color: LOCATION_COLORS[loc.location_type] || '#3b82f6' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white group-hover:text-indigo-300 truncate">
                          {loc.name}
                        </p>
                        <p className="text-[10px] text-slate-400 capitalize">
                          {loc.room_number ? `#${loc.room_number} • ` : ''}{loc.location_type.replace('_', ' ')}
                        </p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 transition" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── FLOOR QR SCANNER MODAL ─── */}
      <FloorQRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onFloorScanned={handleFloorScanned}
      />
    </div>
  );
}
