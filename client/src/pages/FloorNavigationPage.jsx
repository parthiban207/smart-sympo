// agent-notes: { ctx: "Student-facing indoor navigation page with manual starting point & destination search, swap button, Dijkstra route finding, multi-floor support, and QR scanner", deps: ["src/services/indoorNavDataService.js", "src/services/indoorNavigationService.js", "src/components/FloorQRScannerModal.jsx", "lucide-react", "react-router-dom"], state: "active", last: "antigravity@2026-10-03" }

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchFloorMapData, fetchBuildings, fetchFloors, fetchNodes, fetchEdges, fetchLocations,
} from '../services/indoorNavDataService';
import {
  dijkstraMultiFloor, generateDirections, findNodeForLocation, formatDistance,
} from '../services/indoorNavigationService';
import FloorQRScannerModal from '../components/FloorQRScannerModal';
import {
  MapPin, Search, Navigation, ArrowLeft, Loader2, AlertCircle,
  Building2, Layers, CornerDownRight, RotateCcw,
  Footprints, ChevronDown, ChevronUp, X, QrCode, Camera, Accessibility,
  Compass, ArrowRight, ZoomIn, ZoomOut, ArrowUpDown, Check, LocateFixed, Clock,
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
  const [allFloors, setAllFloors] = useState([]);
  const [allLocations, setAllLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Directory of all buildings & floors for browsing
  const [buildings, setBuildings] = useState([]);
  const [publishedFloors, setPublishedFloors] = useState([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);

  // ─── Manual Route Selection States (No Auto-Start) ───
  const [startLocation, setStartLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [startSearchQuery, setStartSearchQuery] = useState('');
  const [destSearchQuery, setDestSearchQuery] = useState('');
  const [activePicker, setActivePicker] = useState(null); // 'start' | 'dest' | null

  // Route calculation results
  const [requireAccessible, setRequireAccessible] = useState(false);
  const [routeResult, setRouteResult] = useState(null);
  const [directions, setDirections] = useState([]);
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
      setStartLocation(null);
      setDestinationLocation(null);
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

        // NOTE: Starting point and Destination must remain null on QR scan.
        // The QR code only opens the floor map. Both are chosen manually by the student.
        setStartLocation(null);
        setDestinationLocation(null);
        setRouteResult(null);
        setDirections([]);
        setStartSearchQuery('');
        setDestSearchQuery('');
        setActivePicker(null);

        // Load multi-floor nodes, edges, and locations for cross-floor routing
        if (data.floor.building_id) {
          const floorsRes = await fetchFloors(data.floor.building_id);
          const allBldgFloors = (floorsRes.data || []).filter((f) => f.is_published);
          setAllFloors(allBldgFloors);

          const allNodeArrays = await Promise.all(allBldgFloors.map((f) => fetchNodes(f.id)));
          const allEdgeArrays = await Promise.all(allBldgFloors.map((f) => fetchEdges(f.id)));
          const allLocArrays = await Promise.all(allBldgFloors.map((f) => fetchLocations(f.id)));

          setAllNodes(allNodeArrays.flatMap((r) => r.data || []));
          setAllEdges(allEdgeArrays.flatMap((r) => r.data || []));
          setAllLocations(allLocArrays.flatMap((r) => r.data || []));
        } else {
          setAllFloors([data.floor]);
          setAllNodes(data.nodes || []);
          setAllEdges(data.edges || []);
          setAllLocations(data.locations || []);
        }
      } catch (err) {
        console.error('Failed to load floor data:', err);
        setError('Failed to load navigation data. Please check your connection.');
      }
      setLoading(false);
    })();
  }, [activeFloorId]);

  // Handle scanned floor (Only opens corresponding floor map, does NOT select start/dest)
  const handleFloorScanned = useCallback((scannedFloorId) => {
    setActiveFloorId(scannedFloorId);
    setStartLocation(null);
    setDestinationLocation(null);
    setRouteResult(null);
    setDirections([]);
    navigate(`/navigate/floor/${scannedFloorId}`, { replace: true });
  }, [navigate]);

  // ─── Compile All Navigable Locations & Points of Interest ───
  const navigableLocations = useMemo(() => {
    const list = [];
    const graphNodes = allNodes.length > 0 ? allNodes : nodes;
    const targetLocations = allLocations.length > 0 ? allLocations : locations;

    // 1. Rooms from campus_locations
    for (const loc of targetLocations) {
      if (loc.is_searchable === false || loc.location_type === 'corridor') continue;
      const n = graphNodes.find((node) => node.location_id === loc.id && !node.is_disabled);
      if (n) {
        const floorObj = allFloors.find((f) => f.id === loc.floor_id) || floor;
        list.push({
          id: loc.id,
          nodeId: n.id,
          name: loc.name,
          room_number: loc.room_number,
          department: loc.department,
          location_type: loc.location_type,
          floor_id: loc.floor_id,
          floor_name: floorObj?.name || 'Current Floor',
          isCurrentFloor: loc.floor_id === floor?.id,
          x: n.x,
          y: n.y,
          isRoom: true,
        });
      }
    }

    // 2. Navigation landmark nodes (Entrances, Stairs, Lifts)
    for (const n of graphNodes) {
      if (n.is_disabled) continue;
      if (n.node_type === 'entrance' || n.node_type === 'stairs' || n.node_type === 'lift') {
        const already = list.some((item) => item.nodeId === n.id);
        if (!already) {
          const floorObj = allFloors.find((f) => f.id === n.floor_id) || floor;
          const label = n.label || (n.node_type === 'entrance' ? 'Main Entrance' : n.node_type === 'stairs' ? 'Staircase' : 'Elevator / Lift');
          list.push({
            id: `node-${n.id}`,
            nodeId: n.id,
            name: label,
            room_number: null,
            department: null,
            location_type: n.node_type,
            floor_id: n.floor_id || floor?.id,
            floor_name: floorObj?.name || 'Current Floor',
            isCurrentFloor: (n.floor_id || floor?.id) === floor?.id,
            x: n.x,
            y: n.y,
            isRoom: false,
          });
        }
      }
    }

    // Sort: Current floor items first, then alphabetically
    return list.sort((a, b) => {
      if (a.isCurrentFloor !== b.isCurrentFloor) {
        return a.isCurrentFloor ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [locations, nodes, allNodes, allLocations, allFloors, floor]);

  // Filtered lists for dropdown search
  const filteredStartOptions = useMemo(() => {
    const q = startSearchQuery.trim().toLowerCase();
    return navigableLocations.filter((item) => {
      if (destinationLocation && item.nodeId === destinationLocation.nodeId) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.room_number && item.room_number.toLowerCase().includes(q)) ||
        (item.department && item.department.toLowerCase().includes(q)) ||
        item.location_type.toLowerCase().includes(q) ||
        item.floor_name.toLowerCase().includes(q)
      );
    });
  }, [navigableLocations, startSearchQuery, destinationLocation]);

  const filteredDestOptions = useMemo(() => {
    const q = destSearchQuery.trim().toLowerCase();
    return navigableLocations.filter((item) => {
      if (startLocation && item.nodeId === startLocation.nodeId) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.room_number && item.room_number.toLowerCase().includes(q)) ||
        (item.department && item.department.toLowerCase().includes(q)) ||
        item.location_type.toLowerCase().includes(q) ||
        item.floor_name.toLowerCase().includes(q)
      );
    });
  }, [navigableLocations, destSearchQuery, startLocation]);

  // ─── Swap Starting Point and Destination ───
  const handleSwap = () => {
    const prevStart = startLocation;
    const prevDest = destinationLocation;

    setStartLocation(prevDest);
    setDestinationLocation(prevStart);
    setStartSearchQuery('');
    setDestSearchQuery('');
    setActivePicker(null);

    // If both exist, recalculate route in reverse immediately
    if (prevDest && prevStart) {
      calculateShortestRoute(prevDest, prevStart, requireAccessible);
    } else {
      setRouteResult(null);
      setDirections([]);
    }
  };

  // ─── Calculate Shortest Route with Dijkstra ───
  const calculateShortestRoute = useCallback((startItem, destItem, accessibleMode = requireAccessible) => {
    if (!startItem) {
      setRouteResult({ error: 'Please select a Starting Point ("Where are you now?").' });
      setDirections([]);
      return;
    }
    if (!destItem) {
      setRouteResult({ error: 'Please select a Destination ("Where do you want to go?").' });
      setDirections([]);
      return;
    }
    if (startItem.nodeId === destItem.nodeId) {
      setRouteResult({ error: 'Starting point and destination cannot be the same place.' });
      setDirections([]);
      return;
    }

    const graphNodes = allNodes.length > 0 ? allNodes : nodes;
    const graphEdges = allEdges.length > 0 ? allEdges : edges;

    const startNode = graphNodes.find((n) => n.id === startItem.nodeId && !n.is_disabled);
    const destNode = graphNodes.find((n) => n.id === destItem.nodeId && !n.is_disabled);

    if (!startNode) {
      setRouteResult({ error: `Starting point "${startItem.name}" has no valid doorway access node.` });
      setDirections([]);
      return;
    }
    if (!destNode) {
      setRouteResult({ error: `Destination "${destItem.name}" has no valid doorway access node.` });
      setDirections([]);
      return;
    }

    const result = dijkstraMultiFloor(graphNodes, graphEdges, startNode.id, destNode.id, {
      requireAccessible: accessibleMode,
    });

    if (result.error || result.path.length === 0) {
      setRouteResult({
        error: accessibleMode
          ? 'No wheelchair-accessible path found. Elevators may not be connected between these locations.'
          : (result.error || `No connected walking path found between ${startItem.name} and ${destItem.name}.`),
      });
      setDirections([]);
    } else {
      setRouteResult(result);
      const dirs = generateDirections(result.pathDetails, result.nodeMap, allLocations.length > 0 ? allLocations : locations);
      setDirections(dirs);
      setShowDirections(true);
      setActivePicker(null);

      // Smooth auto-focus map viewBox to encompass the route on the current floor
      const currentFloorNodes = result.path
        .map((id) => result.nodeMap[id])
        .filter((n) => n && n.floor_id === floor?.id);

      if (currentFloorNodes.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const n of currentFloorNodes) {
          if (n.x < minX) minX = n.x;
          if (n.y < minY) minY = n.y;
          if (n.x > maxX) maxX = n.x;
          if (n.y > maxY) maxY = n.y;
        }
        const pad = 120;
        const rw = Math.max(450, maxX - minX + pad * 2);
        const rh = Math.max(300, maxY - minY + pad * 2);
        setViewBox({
          x: Math.round(minX - pad),
          y: Math.round(minY - pad),
          w: Math.round(rw),
          h: Math.round(rh),
        });
      }
    }
  }, [nodes, edges, allNodes, allEdges, locations, allLocations, floor, requireAccessible]);

  // Execute Find Route button
  const handleFindRouteClick = () => {
    calculateShortestRoute(startLocation, destinationLocation, requireAccessible);
  };

  // Toggle wheelchair accessible routing
  const handleToggleAccessible = () => {
    const nextAccessible = !requireAccessible;
    setRequireAccessible(nextAccessible);
    if (startLocation && destinationLocation) {
      calculateShortestRoute(startLocation, destinationLocation, nextAccessible);
    }
  };

  // Reset route
  const resetRoute = useCallback(() => {
    setStartLocation(null);
    setDestinationLocation(null);
    setRouteResult(null);
    setDirections([]);
    setStartSearchQuery('');
    setDestSearchQuery('');
    setActivePicker(null);
    if (floor?.svg_view_box) {
      const parts = floor.svg_view_box.split(' ').map(Number);
      if (parts.length === 4) setViewBox({ x: parts[0], y: parts[1], w: parts[2], h: parts[3] });
    }
  }, [floor]);

  // Direct room click on canvas
  const handleRoomClick = (loc) => {
    const item = navigableLocations.find((nl) => nl.id === loc.id);
    if (!item) return;

    if (activePicker === 'start' || (!startLocation && !destinationLocation)) {
      setStartLocation(item);
      setActivePicker(null);
      setStartSearchQuery('');
      if (destinationLocation && destinationLocation.nodeId !== item.nodeId) {
        calculateShortestRoute(item, destinationLocation, requireAccessible);
      }
    } else if (activePicker === 'dest' || (startLocation && !destinationLocation)) {
      setDestinationLocation(item);
      setActivePicker(null);
      setDestSearchQuery('');
      if (startLocation && startLocation.nodeId !== item.nodeId) {
        calculateShortestRoute(startLocation, item, requireAccessible);
      }
    } else {
      // Both chosen: replace destination by default
      setDestinationLocation(item);
      setActivePicker(null);
      if (startLocation && startLocation.nodeId !== item.nodeId) {
        calculateShortestRoute(startLocation, item, requireAccessible);
      }
    }
  };

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

  // Extract path nodes for drawing on current floor
  const currentFloorRouteNodes = useMemo(() => {
    if (!routeResult || !routeResult.path || routeResult.path.length === 0) return [];
    const nodeMap = routeResult.nodeMap || {};
    return routeResult.path
      .map((id) => nodeMap[id])
      .filter((n) => n && n.floor_id === floor?.id);
  }, [routeResult, floor]);

  // Check if route involves a floor transition
  const hasFloorTransition = useMemo(() => {
    if (!routeResult || !routeResult.pathDetails) return false;
    return routeResult.pathDetails.some((pd) => pd.isFloorTransition);
  }, [routeResult]);

  // Target transition floor if multi-floor
  const targetFloor = useMemo(() => {
    if (!hasFloorTransition || !destinationLocation) return null;
    return allFloors.find((f) => f.id === destinationLocation.floor_id) || null;
  }, [hasFloorTransition, destinationLocation, allFloors]);

  // Estimated walking time (average walking speed = 1.2 meters/sec)
  const walkingTimeMinutes = useMemo(() => {
    if (!routeResult || !routeResult.distance || routeResult.distance < 0) return 0;
    return Math.max(1, Math.round(routeResult.distance / 72));
  }, [routeResult]);

  // ─── RENDER: Campus Directory (When No Floor Selected) ───
  if (!activeFloorId && !loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col">
        {/* Header */}
        <div className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white">SmartSympo Indoor Wayfinding</h1>
              <p className="text-xs text-slate-400">Campus Maps &amp; Navigation</p>
            </div>
          </div>
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md"
          >
            <Camera className="w-4 h-4" />
            <span>Scan Floor QR</span>
          </button>
        </div>

        {/* Directory Body */}
        <div className="flex-1 max-w-4xl mx-auto w-full p-6 space-y-6">
          <div className="text-center py-6 space-y-2">
            <h2 className="text-2xl font-black text-white">Choose a Campus Building &amp; Floor</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Scan a wall QR code on any floor or pick your current building from the published directory below.
            </p>
          </div>

          {loadingDirectory ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Loading campus directory…</p>
            </div>
          ) : buildings.length === 0 ? (
            <div className="p-12 text-center bg-slate-950 rounded-3xl border border-slate-800 space-y-3">
              <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">No Campus Buildings Available</p>
              <p className="text-xs text-slate-500">Contact event administrators to publish floor maps.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {buildings.map((bldg) => {
                const bldgFloors = publishedFloors.filter((f) => f.building_id === bldg.id);
                return (
                  <div key={bldg.id} className="bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-white">{bldg.name}</h3>
                        <p className="text-xs text-slate-400">{bldg.short_name || 'Campus Building'}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Available Floors ({bldgFloors.length})
                      </p>
                      {bldgFloors.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-1">No published floors yet</p>
                      ) : (
                        bldgFloors.map((fl) => (
                          <button
                            key={fl.id}
                            onClick={() => {
                              setActiveFloorId(fl.id);
                              navigate(`/navigate/floor/${fl.id}`);
                            }}
                            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-900 hover:bg-indigo-950/60 border border-slate-800/60 hover:border-indigo-600/40 text-left transition group"
                          >
                            <div className="flex items-center gap-2">
                              <Layers className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition" />
                              <span className="text-xs font-bold text-white group-hover:text-indigo-300">
                                {fl.name}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 group-hover:text-indigo-400 font-semibold">
                              Floor {fl.floor_number} &rarr;
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <FloorQRScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onFloorScanned={handleFloorScanned}
        />
      </div>
    );
  }

  // ─── RENDER: Error State ───
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
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg"
            >
              <Camera className="w-4 h-4" /> Scan Another Floor QR
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

  // ─── RENDER: Loading State ───
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
      {/* ─── TOP HEADER ─── */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between shrink-0 z-30 shadow-md">
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
              {floor?.name} &bull; Floor {floor?.floor_number}
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
            title="Only use step-free walkways and elevators"
          >
            <Accessibility className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Accessible</span>
          </button>

          {/* QR Scan Button */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-extrabold shadow-md transition"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan QR</span>
          </button>

          {(startLocation || destinationLocation || routeResult) && (
            <button
              onClick={resetRoute}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
              title="Reset Route"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ─── MAIN CONTENT: MAP CANVAS + ROUTE SIDEBAR ─── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* SVG Navigation Map Canvas with touch-action:none */}
        <div
          className="flex-1 relative overflow-hidden bg-slate-950 order-2 md:order-1"
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

            {/* Render Floor Locations (Rooms, Halls) */}
            {locations.map((loc) => {
              const sd = loc.shape_data || {};
              const isStart = startLocation?.id === loc.id;
              const isDest = destinationLocation?.id === loc.id;
              const fill = loc.fill_color || LOCATION_COLORS[loc.location_type] || '#3b82f6';

              if (sd.type === 'rect') {
                return (
                  <g
                    key={loc.id}
                    onClick={() => handleRoomClick(loc)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={sd.x}
                      y={sd.y}
                      width={sd.width}
                      height={sd.height}
                      fill={fill}
                      fillOpacity={isStart ? 0.6 : isDest ? 0.7 : 0.25}
                      stroke={isStart ? '#10b981' : isDest ? '#f43f5e' : fill}
                      strokeWidth={isStart || isDest ? 3.5 : 1}
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

            {/* Render Calculated Route Polyline on Current Floor */}
            {currentFloorRouteNodes.length > 1 && (
              <g>
                {/* Thick glow background */}
                <polyline
                  points={currentFloorRouteNodes.map((n) => `${n.x},${n.y}`).join(' ')}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.3"
                />
                {/* Animated dash walking path */}
                <polyline
                  points={currentFloorRouteNodes.map((n) => `${n.x},${n.y}`).join(' ')}
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

            {/* Starting Point Pin Marker (Green) */}
            {startLocation && startLocation.floor_id === floor?.id && (
              <g>
                <circle cx={startLocation.x} cy={startLocation.y} r={11} fill="#10b981" stroke="#ffffff" strokeWidth={3} />
                <circle cx={startLocation.x} cy={startLocation.y} r={18} fill="none" stroke="#10b981" strokeWidth={2} opacity={0.7}>
                  <animate attributeName="r" values="10;24" dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0" dur="1.8s" repeatCount="indefinite" />
                </circle>
                <text x={startLocation.x} y={startLocation.y - 18} textAnchor="middle" fontSize={11} fontWeight="900" fill="#34d399">
                  📍 Start: {startLocation.name}
                </text>
              </g>
            )}

            {/* Destination Pin Marker (Red/Indigo) */}
            {destinationLocation && destinationLocation.floor_id === floor?.id && (
              <g>
                <circle cx={destinationLocation.x} cy={destinationLocation.y} r={11} fill="#f43f5e" stroke="#ffffff" strokeWidth={3} />
                <circle cx={destinationLocation.x} cy={destinationLocation.y} r={18} fill="none" stroke="#f43f5e" strokeWidth={2} opacity={0.7}>
                  <animate attributeName="r" values="10;24" dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0" dur="1.8s" repeatCount="indefinite" />
                </circle>
                <text x={destinationLocation.x} y={destinationLocation.y - 18} textAnchor="middle" fontSize={11} fontWeight="900" fill="#fb7185">
                  🎯 Goal: {destinationLocation.name}
                </text>
              </g>
            )}

            {/* Waypoint beads along route */}
            {currentFloorRouteNodes.map((n) => {
              if (startLocation && n.x === startLocation.x && n.y === startLocation.y) return null;
              if (destinationLocation && n.x === destinationLocation.x && n.y === destinationLocation.y) return null;
              return (
                <circle key={n.id} cx={n.x} cy={n.y} r={4.5} fill="#818cf8" stroke="#1e1b4b" strokeWidth={1.5} />
              );
            })}
          </svg>

          {/* Floating Zoom Controls (Bottom Right) */}
          <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-2xl">
            <button onClick={() => handleZoom(0.85)} className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800" title="Zoom In">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={() => handleZoom(1.15)} className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800" title="Zoom Out">
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── SIDEBAR: START/DESTINATION SEARCH + FIND ROUTE + DIRECTIONS ─── */}
        <div className="w-full md:w-96 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col shrink-0 max-h-[50vh] md:max-h-full overflow-hidden order-1 md:order-2 shadow-2xl z-20">
          {/* Route Planning Header Card */}
          <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-950/60 shrink-0">
            {/* Field 1: Starting Point */}
            <div className="space-y-1 relative">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <LocateFixed className="w-3.5 h-3.5" />
                  Starting Point
                </span>
                <span className="text-[10px] text-slate-500 font-normal">Where are you now?</span>
              </div>

              {startLocation ? (
                <div className="flex items-center justify-between p-2.5 bg-slate-900 border border-emerald-500/40 rounded-xl text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="font-extrabold text-white truncate">{startLocation.name}</span>
                    {startLocation.floor_name && startLocation.floor_id !== floor?.id && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {startLocation.floor_name}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setStartLocation(null);
                      setRouteResult(null);
                      setDirections([]);
                      setActivePicker('start');
                    }}
                    className="p-1 text-slate-400 hover:text-white"
                    title="Change starting point"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={startSearchQuery}
                    onFocus={() => setActivePicker('start')}
                    onChange={(e) => {
                      setStartSearchQuery(e.target.value);
                      setActivePicker('start');
                    }}
                    placeholder="Where are you now? (e.g. ML1, Entrance...)"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
              )}
            </div>

            {/* Swap Button */}
            <div className="flex items-center justify-center -my-1">
              <button
                onClick={handleSwap}
                className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition shadow-sm"
                title="Swap Starting Point & Destination"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Field 2: Destination */}
            <div className="space-y-1 relative">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span className="flex items-center gap-1.5 text-indigo-400">
                  <MapPin className="w-3.5 h-3.5" />
                  Destination
                </span>
                <span className="text-[10px] text-slate-500 font-normal">Where do you want to go?</span>
              </div>

              {destinationLocation ? (
                <div className="flex items-center justify-between p-2.5 bg-slate-900 border border-indigo-500/40 rounded-xl text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shrink-0" />
                    <span className="font-extrabold text-white truncate">{destinationLocation.name}</span>
                    {destinationLocation.floor_name && destinationLocation.floor_id !== floor?.id && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {destinationLocation.floor_name}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setDestinationLocation(null);
                      setRouteResult(null);
                      setDirections([]);
                      setActivePicker('dest');
                    }}
                    className="p-1 text-slate-400 hover:text-white"
                    title="Change destination"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={destSearchQuery}
                    onFocus={() => setActivePicker('dest')}
                    onChange={(e) => {
                      setDestSearchQuery(e.target.value);
                      setActivePicker('dest');
                    }}
                    placeholder="Where do you want to go? (e.g. Seminar Hall...)"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              )}
            </div>

            {/* "Find Route" Button */}
            <button
              onClick={handleFindRouteClick}
              disabled={!startLocation || !destinationLocation}
              className={`w-full py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition flex items-center justify-center gap-2 shadow-lg ${
                startLocation && destinationLocation
                  ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
              }`}
            >
              <Navigation className="w-4 h-4" />
              <span>Find Route</span>
            </button>
          </div>

          {/* Body: Location Picker OR Route Directions */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Active Dropdown Search List (When student is actively picking start or dest) */}
            {activePicker && (
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    Select {activePicker === 'start' ? 'Starting Point' : 'Destination'}
                  </span>
                  <button
                    onClick={() => setActivePicker(null)}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>

                <div className="space-y-1">
                  {(activePicker === 'start' ? filteredStartOptions : filteredDestOptions).length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No matching rooms or locations found.
                    </div>
                  ) : (
                    (activePicker === 'start' ? filteredStartOptions : filteredDestOptions).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (activePicker === 'start') {
                            setStartLocation(item);
                            setStartSearchQuery('');
                            setActivePicker(null);
                            if (destinationLocation && destinationLocation.nodeId !== item.nodeId) {
                              calculateShortestRoute(item, destinationLocation, requireAccessible);
                            }
                          } else {
                            setDestinationLocation(item);
                            setDestSearchQuery('');
                            setActivePicker(null);
                            if (startLocation && startLocation.nodeId !== item.nodeId) {
                              calculateShortestRoute(startLocation, item, requireAccessible);
                            }
                          }
                        }}
                        className="w-full p-2.5 rounded-xl flex items-center gap-3 text-left bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 hover:border-indigo-600/40 transition group"
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: (LOCATION_COLORS[item.location_type] || '#3b82f6') + '25' }}
                        >
                          <MapPin className="w-4 h-4" style={{ color: LOCATION_COLORS[item.location_type] || '#3b82f6' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white group-hover:text-indigo-300 truncate">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-400 capitalize">
                            {item.room_number ? `#${item.room_number} • ` : ''}
                            {item.location_type.replace('_', ' ')}
                            {item.floor_name && !item.isCurrentFloor ? ` • ${item.floor_name}` : ''}
                          </p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 transition" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Error Message Card */}
            {routeResult?.error && !activePicker && (
              <div className="p-3.5 rounded-2xl border bg-red-500/10 border-red-500/30 text-red-300 text-xs space-y-1 animate-in fade-in">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="font-bold leading-relaxed">{routeResult.error}</p>
                </div>
              </div>
            )}

            {/* Route Summary Card (When route is valid) */}
            {routeResult && !routeResult.error && !activePicker && (
              <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-white text-sm">Shortest Walking Route</span>
                  <span className="font-black text-emerald-400 text-sm">
                    {formatDistance(routeResult.distance)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-300 border-t border-indigo-900/40 pt-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    ~{walkingTimeMinutes} min walk
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Footprints className="w-3.5 h-3.5 text-slate-400" />
                    {routeResult.path.length} waypoints
                  </span>
                  {hasFloorTransition && (
                    <>
                      <span>&bull;</span>
                      <span className="text-amber-400 font-semibold">Multi-floor transition</span>
                    </>
                  )}
                </div>

                {/* Multi-floor transition switch button */}
                {hasFloorTransition && targetFloor && (
                  <button
                    onClick={() => {
                      setActiveFloorId(targetFloor.id);
                      navigate(`/navigate/floor/${targetFloor.id}`, { replace: true });
                    }}
                    className="w-full mt-1 py-1.5 px-3 bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Switch Map to {targetFloor.name}
                  </button>
                )}
              </div>
            )}

            {/* Turn-by-Turn Directions List */}
            {directions.length > 0 && !activePicker && (
              <div className="space-y-2 animate-in fade-in">
                <button
                  onClick={() => setShowDirections(!showDirections)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:text-white"
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

            {/* Default State Helper (When nothing is being calculated) */}
            {!routeResult && !activePicker && (
              <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/80 text-xs text-slate-400 space-y-2 text-center">
                <Compass className="w-8 h-8 text-indigo-400 mx-auto" />
                <p className="font-bold text-white">Interactive Walking Guide</p>
                <p className="text-[11px] leading-relaxed">
                  Select your current room in <strong className="text-emerald-400">Starting Point</strong> and your destination in <strong className="text-indigo-400">Destination</strong>, then tap <strong className="text-white">Find Route</strong>.
                </p>
                <p className="text-[10px] text-slate-500 pt-1">
                  💡 Tip: You can also tap rooms directly on the blueprint map!
                </p>
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
