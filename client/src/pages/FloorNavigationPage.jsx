// agent-notes: { ctx: "Student-facing indoor floor navigation page opened via QR scan — shows map, searches destinations, calculates shortest route", deps: ["src/services/indoorNavDataService.js", "src/services/indoorNavigationService.js", "lucide-react", "react-router-dom"], state: "active", last: "antigravity@2026-10-03" }

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchFloorMapData, fetchBuildings, fetchFloors, fetchNodes, fetchEdges } from '../services/indoorNavDataService';
import {
  dijkstraMultiFloor, generateDirections, findNodeForLocation, formatDistance,
} from '../services/indoorNavigationService';
import {
  MapPin, Search, Navigation, ArrowLeft, Loader2, AlertCircle,
  CheckCircle2, Building2, Layers, CornerDownRight, RotateCcw,
  Footprints, ChevronDown, ChevronUp, X,
} from 'lucide-react';

const LOCATION_COLORS = {
  classroom: '#3b82f6', laboratory: '#8b5cf6', department: '#0ea5e9',
  seminar_hall: '#f59e0b', entrance: '#10b981', corridor: '#94a3b8',
  stairs: '#ef4444', lift: '#ec4899', restroom: '#06b6d4', other: '#64748b',
};

const NODE_COLORS = {
  waypoint: '#6b7280', entrance: '#10b981', stairs: '#ef4444',
  lift: '#ec4899', room_door: '#3b82f6', corridor_junction: '#f59e0b',
};

export default function FloorNavigationPage() {
  const { floorId } = useParams();

  // ─── State ───
  const [floor, setFloor] = useState(null);
  const [locations, setLocations] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [allNodes, setAllNodes] = useState([]);
  const [allEdges, setAllEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Navigation
  const [startNodeId, setStartNodeId] = useState(null);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [routeResult, setRouteResult] = useState(null);
  const [directions, setDirections] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDirections, setShowDirections] = useState(true);

  // View
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1200, h: 800 });
  const svgRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // ─── Load data ───
  useEffect(() => {
    if (!floorId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchFloorMapData(floorId);

        if (!data.floor) {
          setError('Floor not found. It may have been removed or the link is invalid.');
          setLoading(false);
          return;
        }

        if (!data.floor.is_published) {
          setError('This floor map has not been published yet. Please contact the administration.');
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

        // Set QR start node
        if (data.floor.qr_start_node_id) {
          setStartNodeId(data.floor.qr_start_node_id);
        }

        // Also load multi-floor nodes/edges for cross-floor routing
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
        setError('Failed to load navigation data. Please try again.');
      }
      setLoading(false);
    })();
  }, [floorId]);

  // ─── Search destinations ───
  const searchableLocations = useMemo(() => {
    return locations
      .filter((l) => l.is_searchable !== false)
      .filter((l) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return l.name.toLowerCase().includes(q) || l.location_type.toLowerCase().includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [locations, searchQuery]);

  // ─── Calculate route ───
  const calculateRoute = useCallback((destLocation) => {
    if (!startNodeId) return;

    const destNode = findNodeForLocation(allNodes.length > 0 ? allNodes : nodes, destLocation.id);
    if (!destNode) {
      setRouteResult({ error: 'No navigation node linked to this room. Contact the administrator.' });
      setDirections([]);
      return;
    }

    const graphNodes = allNodes.length > 0 ? allNodes : nodes;
    const graphEdges = allEdges.length > 0 ? allEdges : edges;

    const result = dijkstraMultiFloor(graphNodes, graphEdges, startNodeId, destNode.id);

    if (result.error || result.path.length === 0) {
      setRouteResult({ error: result.error || 'No valid route found. The destination may not be connected.' });
      setDirections([]);
    } else {
      setRouteResult(result);
      const dirs = generateDirections(result.pathDetails, result.nodeMap, locations);
      setDirections(dirs);
    }

    setSelectedDestination(destLocation);
    setShowDirections(true);
  }, [startNodeId, nodes, edges, allNodes, allEdges, locations]);

  // ─── Reset ───
  const resetRoute = useCallback(() => {
    setSelectedDestination(null);
    setRouteResult(null);
    setDirections([]);
    setSearchQuery('');
  }, []);

  // ─── Pan / Zoom (same as editor but simpler) ───
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setViewBox((vb) => {
      const factor = e.deltaY > 0 ? 1.15 : 0.87;
      const nw = Math.max(200, Math.min(4000, vb.w * factor));
      const nh = Math.max(133, Math.min(2666, vb.h * factor));
      return { x: vb.x + (vb.w - nw) / 2, y: vb.y + (vb.h - nh) / 2, w: nw, h: nh };
    });
  }, []);

  const handleMouseDown = useCallback((e) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isPanning) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const dx = ((e.clientX - panStart.x) / rect.width) * viewBox.w;
    const dy = ((e.clientY - panStart.y) / rect.height) * viewBox.h;
    setViewBox((vb) => ({ ...vb, x: vb.x - dx, y: vb.y - dy }));
    setPanStart({ x: e.clientX, y: e.clientY });
  }, [isPanning, panStart, viewBox]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  // Touch support
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      setIsPanning(true);
      setPanStart({ x: t.clientX, y: t.clientY });
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isPanning || e.touches.length !== 1) return;
    const t = e.touches[0];
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const dx = ((t.clientX - panStart.x) / rect.width) * viewBox.w;
    const dy = ((t.clientY - panStart.y) / rect.height) * viewBox.h;
    setViewBox((vb) => ({ ...vb, x: vb.x - dx, y: vb.y - dy }));
    setPanStart({ x: t.clientX, y: t.clientY });
  }, [isPanning, panStart, viewBox]);

  // ─── Route path for rendering ───
  const routePathNodes = useMemo(() => {
    if (!routeResult || !routeResult.path || routeResult.path.length === 0) return [];
    const nodeMap = {};
    for (const n of (allNodes.length > 0 ? allNodes : nodes)) {
      nodeMap[n.id] = n;
    }
    return routeResult.path.map((id) => nodeMap[id]).filter(Boolean);
  }, [routeResult, nodes, allNodes]);

  // ─── Error state ───
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">Navigation Unavailable</h2>
          <p className="text-sm text-slate-600">{error}</p>
          <Link to="/login" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition">
            <ArrowLeft className="w-4 h-4" /> Go to SmartSympo
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Loading floor map…</p>
        </div>
      </div>
    );
  }

  const buildingName = floor?.campus_buildings?.name || floor?.campus_buildings?.short_name || 'Campus Building';

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md">
            <Navigation className="w-4.5 h-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-extrabold text-slate-900 truncate">{buildingName}</h1>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <Layers className="w-3 h-3" /> {floor?.name} (Floor {floor?.floor_number})
              {startNodeId && <span className="text-emerald-600 font-semibold">• QR Location Set</span>}
            </div>
          </div>
          {selectedDestination && (
            <button onClick={resetRoute} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 transition">
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* ─── Map ─── */}
        <div className="flex-1 relative overflow-hidden">
          <svg
            ref={svgRef}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            {/* Grid */}
            <defs>
              <pattern id="navGrid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
              </pattern>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <rect x={viewBox.x - 2000} y={viewBox.y - 2000} width={viewBox.w + 4000} height={viewBox.h + 4000} fill="url(#navGrid)" />

            {/* Locations */}
            {locations.map((loc) => {
              const sd = loc.shape_data || {};
              const isDestination = selectedDestination?.id === loc.id;
              if (sd.type === 'rect') {
                return (
                  <g key={loc.id}>
                    <rect
                      x={sd.x} y={sd.y} width={sd.width} height={sd.height}
                      fill={loc.fill_color || '#e2e8f0'}
                      fillOpacity={isDestination ? 0.6 : 0.25}
                      stroke={isDestination ? '#4f46e5' : (loc.fill_color || '#94a3b8')}
                      strokeWidth={isDestination ? 3 : 1}
                      rx={4}
                    />
                    <text x={sd.x + sd.width / 2} y={sd.y + sd.height / 2}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={10} fontWeight="700" fill="#1e293b">
                      {loc.name}
                    </text>
                    <text x={sd.x + sd.width / 2} y={sd.y + sd.height / 2 + 13}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={7} fill="#64748b">
                      {loc.location_type.replace('_', ' ')}
                    </text>
                  </g>
                );
              }
              return null;
            })}

            {/* Route path (highlighted) */}
            {routePathNodes.length > 1 && (
              <g>
                {/* Route line shadow */}
                <polyline
                  points={routePathNodes.map((n) => `${n.x},${n.y}`).join(' ')}
                  fill="none" stroke="#4f46e5" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
                  opacity="0.2"
                />
                {/* Route line */}
                <polyline
                  points={routePathNodes.map((n) => `${n.x},${n.y}`).join(' ')}
                  fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray="8 4" filter="url(#glow)"
                >
                  <animate attributeName="stroke-dashoffset" values="0;-24" dur="1.5s" repeatCount="indefinite" />
                </polyline>
              </g>
            )}

            {/* Start marker */}
            {startNodeId && (() => {
              const startNode = nodes.find((n) => n.id === startNodeId) || (allNodes.length > 0 ? allNodes.find((n) => n.id === startNodeId) : null);
              if (!startNode) return null;
              return (
                <g>
                  <circle cx={startNode.x} cy={startNode.y} r={10} fill="#10b981" stroke="#fff" strokeWidth={3} />
                  <circle cx={startNode.x} cy={startNode.y} r={16} fill="none" stroke="#10b981" strokeWidth={2} opacity={0.4}>
                    <animate attributeName="r" values="12;22" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <text x={startNode.x} y={startNode.y - 18} textAnchor="middle" fontSize={10} fontWeight="800" fill="#059669">
                    📍 You are here
                  </text>
                </g>
              );
            })()}

            {/* Destination marker */}
            {selectedDestination && (() => {
              const destNode = findNodeForLocation(nodes, selectedDestination.id);
              if (!destNode) return null;
              return (
                <g>
                  <circle cx={destNode.x} cy={destNode.y} r={10} fill="#ef4444" stroke="#fff" strokeWidth={3} />
                  <circle cx={destNode.x} cy={destNode.y} r={16} fill="none" stroke="#ef4444" strokeWidth={2} opacity={0.4}>
                    <animate attributeName="r" values="12;22" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <text x={destNode.x} y={destNode.y - 18} textAnchor="middle" fontSize={10} fontWeight="800" fill="#dc2626">
                    🎯 {selectedDestination.name}
                  </text>
                </g>
              );
            })()}

            {/* Route waypoint nodes (subtle) */}
            {routePathNodes.map((n, i) => {
              if (n.id === startNodeId) return null;
              const destNode = selectedDestination && findNodeForLocation(nodes, selectedDestination.id);
              if (destNode && n.id === destNode.id) return null;
              return (
                <circle key={n.id} cx={n.x} cy={n.y} r={4} fill="#4f46e5" stroke="#fff" strokeWidth={1.5} opacity={0.6} />
              );
            })}
          </svg>
        </div>

        {/* ─── Sidebar: Search & Directions ─── */}
        <div className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col shrink-0 max-h-[45vh] md:max-h-full overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-slate-200 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search classroom, lab, or room…"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Route result */}
            {routeResult && (
              <div className={`mx-3 mt-3 p-3 rounded-xl border text-xs ${
                routeResult.error
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
                {routeResult.error ? (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p className="font-semibold">{routeResult.error}</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Footprints className="w-4 h-4" />
                      <span className="font-bold">Route Found</span>
                    </div>
                    <span className="font-extrabold">{formatDistance(routeResult.distance)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Directions */}
            {directions.length > 0 && (
              <div className="mx-3 mt-2 mb-3">
                <button onClick={() => setShowDirections(!showDirections)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-indigo-50 rounded-lg text-xs font-bold text-indigo-700">
                  <span className="flex items-center gap-1.5">
                    <CornerDownRight className="w-3.5 h-3.5" /> Directions ({directions.length} steps)
                  </span>
                  {showDirections ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {showDirections && (
                  <div className="mt-2 space-y-1.5">
                    {directions.map((dir) => (
                      <div key={dir.step} className={`flex items-start gap-2.5 px-3 py-2 rounded-lg text-xs ${
                        dir.type === 'start' ? 'bg-emerald-50 text-emerald-800' :
                        dir.type === 'destination' ? 'bg-indigo-50 text-indigo-800' :
                        dir.type === 'floor_transition' ? 'bg-amber-50 text-amber-800' :
                        'bg-slate-50 text-slate-700'
                      }`}>
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-extrabold bg-white shadow-sm shrink-0">
                          {dir.step}
                        </span>
                        <span className="font-semibold">{dir.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Destination list */}
            {!selectedDestination && (
              <div className="divide-y divide-slate-100">
                {searchableLocations.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No matching locations found.</div>
                ) : (
                  searchableLocations.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => calculateRoute(loc)}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-indigo-50 transition"
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: (LOCATION_COLORS[loc.location_type] || '#94a3b8') + '20' }}>
                        <MapPin className="w-4 h-4" style={{ color: LOCATION_COLORS[loc.location_type] || '#94a3b8' }} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{loc.name}</p>
                        <p className="text-[10px] text-slate-500 capitalize">{loc.location_type.replace('_', ' ')}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
