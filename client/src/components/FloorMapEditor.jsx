// agent-notes: { ctx: "Ultra-responsive SVG floor map editor with pointer events, touch-action:none, drag-to-draw, move/resize handles, undo/redo, background tracing, templates, auto-connection, and validation", deps: ["src/services/indoorNavDataService.js", "src/services/indoorNavigationService.js", "lucide-react"], state: "active", last: "antigravity@2026-10-03" }

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  fetchFloorMapData, upsertLocation, deleteLocation,
  upsertNode, deleteNode, upsertEdge, deleteEdge,
  upsertFloor, duplicateFloor,
} from '../services/indoorNavDataService';
import {
  euclideanDistance, validateFloorMap, findNearestWaypoint,
} from '../services/indoorNavigationService';
import {
  ArrowLeft, Save, Loader2, Plus, Trash2, MousePointer2, Square, Circle,
  Link2, Undo2, Redo2, ZoomIn, ZoomOut, Move, Navigation, AlertCircle,
  CheckCircle2, X, Copy, Grid, Image as ImageIcon,
  Sparkles, Layers, AlertTriangle,
  DoorOpen, Footprints, ShieldCheck, FileCheck, ArrowUpRight,
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

const NODE_COLORS = {
  waypoint: '#6b7280',
  entrance: '#10b981',
  stairs: '#ef4444',
  lift: '#ec4899',
  room_door: '#3b82f6',
  corridor_junction: '#f59e0b',
};

const ROOM_TEMPLATES = [
  { label: 'Classroom', type: 'classroom', w: 120, h: 80, name: 'Classroom' },
  { label: 'Computer Lab', type: 'laboratory', w: 160, h: 100, name: 'Computer Lab' },
  { label: 'Faculty Office', type: 'office', w: 90, h: 70, name: 'Faculty Office' },
  { label: 'Seminar Hall', type: 'seminar_hall', w: 220, h: 140, name: 'Seminar Hall' },
  { label: 'Toilet / Restroom', type: 'toilet', w: 70, h: 50, name: 'Restroom' },
  { label: 'Main Entrance', type: 'entrance', w: 100, h: 60, name: 'Entrance' },
  { label: 'Staircase', type: 'stairs', w: 60, h: 60, name: 'Stairs' },
  { label: 'Elevator / Lift', type: 'lift', w: 50, h: 50, name: 'Lift' },
  { label: 'Corridor Segment', type: 'corridor', w: 260, h: 40, name: 'Corridor' },
];

const TOOLS = {
  SELECT: 'select',
  MOVE: 'move',
  RESIZE: 'resize',
  ADD_ROOM: 'add_room',
  ADD_CORRIDOR: 'add_corridor',
  ADD_ENTRANCE: 'add_entrance',
  ADD_STAIRS: 'add_stairs',
  ADD_LIFT: 'add_lift',
  ADD_NODE: 'add_node',
  ADD_EDGE: 'add_edge',
  PAN: 'pan',
  DELETE: 'delete',
};

export default function FloorMapEditor({ floorId, buildingName, floorName, onBack }) {
  // ─── Data State ───
  const [floor, setFloor] = useState(null);
  const [locations, setLocations] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // ─── Active Tool & Selection ───
  const [tool, setTool] = useState(TOOLS.SELECT);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [edgeStartNode, setEdgeStartNode] = useState(null);

  // ─── Pan/Zoom ViewBox ───
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1200, h: 800 });
  const svgRef = useRef(null);

  // ─── Grid & Snapping ───
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);

  // ─── Background Tracing Image ───
  const [bgImage, setBgImage] = useState('');
  const [bgOpacity, setBgOpacity] = useState(0.5);
  const [showBgModal, setShowBgModal] = useState(false);
  const [showBgImage, setShowBgImage] = useState(true);

  // ─── Modals / Drawers ───
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomModalData, setRoomModalData] = useState({
    name: '',
    room_number: '',
    department: '',
    description: '',
    location_type: 'classroom',
    x: 100,
    y: 100,
    width: 120,
    height: 80,
  });
  const [showValidationDrawer, setShowValidationDrawer] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicateNumber, setDuplicateNumber] = useState(1);

  // ─── History Stack (Undo / Redo) ───
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pushSnapshot = useCallback((newLocs, newNodes, newEdges) => {
    const snapshot = {
      locations: JSON.parse(JSON.stringify(newLocs)),
      nodes: JSON.parse(JSON.stringify(newNodes)),
      edges: JSON.parse(JSON.stringify(newEdges)),
    };
    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    nextHistory.push(snapshot);
    if (nextHistory.length > 30) nextHistory.shift();
    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
    setHasUnsavedChanges(true);
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const snap = historyRef.current[historyIndexRef.current];
    if (snap) {
      setLocations(snap.locations);
      setNodes(snap.nodes);
      setEdges(snap.edges);
      setSelectedLocation(null);
      setSelectedNode(null);
      setSelectedEdge(null);
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(true);
      setHasUnsavedChanges(true);
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const snap = historyRef.current[historyIndexRef.current];
    if (snap) {
      setLocations(snap.locations);
      setNodes(snap.nodes);
      setEdges(snap.edges);
      setSelectedLocation(null);
      setSelectedNode(null);
      setSelectedEdge(null);
      setCanUndo(true);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      setHasUnsavedChanges(true);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedLocation) handleDeleteLocation(selectedLocation.id);
        else if (selectedNode) handleDeleteNode(selectedNode.id);
        else if (selectedEdge) handleDeleteEdge(selectedEdge.id);
      } else if (e.key === 'Escape') {
        setSelectedLocation(null);
        setSelectedNode(null);
        setSelectedEdge(null);
        setEdgeStartNode(null);
        setShowRoomModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, selectedLocation, selectedNode, selectedEdge]);

  // ─── Toast helper ───
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ─── Load data ───
  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await fetchFloorMapData(floorId);
    if (data.error) showToast(data.error.message, 'error');
    setFloor(data.floor);
    const locs = data.locations || [];
    const nds = data.nodes || [];
    const edgs = data.edges || [];
    setLocations(locs);
    setNodes(nds);
    setEdges(edgs);

    if (data.floor?.background_image) {
      setBgImage(data.floor.background_image);
    }

    if (data.floor?.svg_view_box) {
      const parts = data.floor.svg_view_box.split(' ').map(Number);
      if (parts.length === 4) setViewBox({ x: parts[0], y: parts[1], w: parts[2], h: parts[3] });
    }

    // Initialize undo history
    historyRef.current = [{ locations: locs, nodes: nds, edges: edgs }];
    historyIndexRef.current = 0;
    setCanUndo(false);
    setCanRedo(false);
    setHasUnsavedChanges(false);
    setLoading(false);
  }, [floorId, showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── SVG Coordinate Helper ───
  const getSvgPoint = useCallback((clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const rawX = viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.w;
    const rawY = viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.h;

    if (snapToGrid) {
      return {
        x: Math.round(rawX / gridSize) * gridSize,
        y: Math.round(rawY / gridSize) * gridSize,
      };
    }
    return { x: Math.round(rawX), y: Math.round(rawY) };
  }, [viewBox, snapToGrid, gridSize]);

  // ─── Gesture & Pointer Interaction State ───
  const gestureRef = useRef({
    active: false,
    mode: null, // 'pan' | 'draw' | 'move_loc' | 'move_node' | 'resize_loc'
    pointerId: null,
    startX: 0,
    startY: 0,
    startClientX: 0,
    startClientY: 0,
    targetItem: null,
    resizeHandle: null,
    initialShape: null,
  });

  const [drawPreview, setDrawPreview] = useState(null); // { x, y, width, height }

  // ─── Pointer Down ───
  const handlePointerDown = (e) => {
    // Only handle primary button or single touch
    if (e.button !== 0 && e.button !== 1 && e.pointerType === 'mouse') return;

    const svg = svgRef.current;
    if (!svg) return;
    svg.setPointerCapture(e.pointerId);

    const pt = getSvgPoint(e.clientX, e.clientY);
    const isPanAction = tool === TOOLS.PAN || e.button === 1 || e.spaceKey;

    if (isPanAction) {
      gestureRef.current = {
        active: true,
        mode: 'pan',
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startVB: { ...viewBox },
      };
      return;
    }

    if (tool === TOOLS.ADD_ROOM || tool === TOOLS.ADD_CORRIDOR) {
      gestureRef.current = {
        active: true,
        mode: 'draw',
        pointerId: e.pointerId,
        startX: pt.x,
        startY: pt.y,
        toolType: tool === TOOLS.ADD_CORRIDOR ? 'corridor' : 'classroom',
      };
      setDrawPreview({ x: pt.x, y: pt.y, width: 0, height: 0 });
      return;
    }

    // Direct placement tools
    if (tool === TOOLS.ADD_NODE || tool === TOOLS.ADD_ENTRANCE || tool === TOOLS.ADD_STAIRS || tool === TOOLS.ADD_LIFT) {
      const nodeType = tool === TOOLS.ADD_ENTRANCE ? 'entrance' : tool === TOOLS.ADD_STAIRS ? 'stairs' : tool === TOOLS.ADD_LIFT ? 'lift' : 'waypoint';
      handleQuickPlaceNode(pt.x, pt.y, nodeType);
      return;
    }
  };

  // ─── Pointer Move ───
  const handlePointerMove = (e) => {
    const g = gestureRef.current;
    if (!g.active || g.pointerId !== e.pointerId) return;

    if (g.mode === 'pan') {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const dx = ((e.clientX - g.startClientX) / rect.width) * g.startVB.w;
      const dy = ((e.clientY - g.startClientY) / rect.height) * g.startVB.h;
      setViewBox({
        ...g.startVB,
        x: Math.round(g.startVB.x - dx),
        y: Math.round(g.startVB.y - dy),
      });
      return;
    }

    const currentPt = getSvgPoint(e.clientX, e.clientY);

    if (g.mode === 'draw') {
      const x = Math.min(g.startX, currentPt.x);
      const y = Math.min(g.startY, currentPt.y);
      const width = Math.max(10, Math.abs(currentPt.x - g.startX));
      const height = Math.max(10, Math.abs(currentPt.y - g.startY));
      setDrawPreview({ x, y, width, height });
      return;
    }

    if (g.mode === 'move_loc' && g.targetItem) {
      const dx = currentPt.x - g.startX;
      const dy = currentPt.y - g.startY;
      const newX = g.initialShape.x + dx;
      const newY = g.initialShape.y + dy;

      setLocations((prev) =>
        prev.map((loc) =>
          loc.id === g.targetItem.id
            ? { ...loc, shape_data: { ...loc.shape_data, x: newX, y: newY } }
            : loc
        )
      );
      return;
    }

    if (g.mode === 'resize_loc' && g.targetItem) {
      const dx = currentPt.x - g.startX;
      const dy = currentPt.y - g.startY;
      const init = g.initialShape;
      let newX = init.x;
      let newY = init.y;
      let newW = init.width;
      let newH = init.height;

      if (g.resizeHandle === 'se') {
        newW = Math.max(30, init.width + dx);
        newH = Math.max(30, init.height + dy);
      } else if (g.resizeHandle === 'sw') {
        newW = Math.max(30, init.width - dx);
        newX = init.x + (init.width - newW);
        newH = Math.max(30, init.height + dy);
      } else if (g.resizeHandle === 'ne') {
        newW = Math.max(30, init.width + dx);
        newH = Math.max(30, init.height - dy);
        newY = init.y + (init.height - newH);
      } else if (g.resizeHandle === 'nw') {
        newW = Math.max(30, init.width - dx);
        newX = init.x + (init.width - newW);
        newH = Math.max(30, init.height - dy);
        newY = init.y + (init.height - newH);
      }

      setLocations((prev) =>
        prev.map((loc) =>
          loc.id === g.targetItem.id
            ? { ...loc, shape_data: { ...loc.shape_data, x: newX, y: newY, width: newW, height: newH } }
            : loc
        )
      );
      return;
    }

    if (g.mode === 'move_node' && g.targetItem) {
      const dx = currentPt.x - g.startX;
      const dy = currentPt.y - g.startY;
      const newX = g.initialNodePos.x + dx;
      const newY = g.initialNodePos.y + dy;

      setNodes((prev) =>
        prev.map((node) =>
          node.id === g.targetItem.id
            ? { ...node, x: newX, y: newY }
            : node
        )
      );
      return;
    }
  };

  // ─── Pointer Up / Finish ───
  const handlePointerUp = async (e) => {
    const g = gestureRef.current;
    if (!g.active || g.pointerId !== e.pointerId) return;

    const svg = svgRef.current;
    if (svg && svg.hasPointerCapture(e.pointerId)) {
      svg.releasePointerCapture(e.pointerId);
    }

    if (g.mode === 'draw' && drawPreview) {
      const w = drawPreview.width;
      const h = drawPreview.height;
      setDrawPreview(null);

      // If drawn rectangle is small (like a single click/tap), use default template
      const finalW = w > 20 ? w : g.toolType === 'corridor' ? 240 : 120;
      const finalH = h > 20 ? h : g.toolType === 'corridor' ? 40 : 80;

      setRoomModalData({
        name: g.toolType === 'corridor' ? 'Corridor' : 'Room',
        room_number: '',
        department: '',
        description: '',
        location_type: g.toolType,
        x: drawPreview.x,
        y: drawPreview.y,
        width: finalW,
        height: finalH,
      });
      setShowRoomModal(true);
    } else if (g.mode === 'move_loc' || g.mode === 'resize_loc') {
      const updatedLoc = locations.find((l) => l.id === g.targetItem.id);
      if (updatedLoc) {
        pushSnapshot(locations, nodes, edges);
        // Persist location update
        await upsertLocation(updatedLoc);
        // Update connected door node if exists
        const doorNode = nodes.find((n) => n.location_id === updatedLoc.id);
        if (doorNode) {
          const sd = updatedLoc.shape_data;
          const cx = Math.round(sd.x + sd.width / 2);
          const cy = Math.round(sd.y + sd.height / 2);
          const updatedNode = { ...doorNode, x: cx, y: cy };
          setNodes((prev) => prev.map((n) => n.id === doorNode.id ? updatedNode : n));
          await upsertNode(updatedNode);
        }
      }
    } else if (g.mode === 'move_node') {
      const updatedNode = nodes.find((n) => n.id === g.targetItem.id);
      if (updatedNode) {
        pushSnapshot(locations, nodes, edges);
        await upsertNode(updatedNode);
      }
    }

    gestureRef.current = { active: false, mode: null, pointerId: null };
  };

  // ─── Quick Place Node ───
  const handleQuickPlaceNode = async (x, y, nodeType = 'waypoint') => {
    setSaving(true);
    const { data, error } = await upsertNode({
      floor_id: floorId,
      x,
      y,
      node_type: nodeType,
      label: nodeType !== 'waypoint' ? nodeType.toUpperCase() : '',
    });
    setSaving(false);
    if (error) return showToast(error.message, 'error');
    if (data) {
      const nextNodes = [...nodes, data];
      setNodes(nextNodes);
      pushSnapshot(locations, nextNodes, edges);
      showToast(`Placed ${nodeType.replace('_', ' ')} node`);
    }
  };

  // ─── Save Room from Modal ───
  const handleConfirmRoomModal = async () => {
    if (!roomModalData.name.trim()) return showToast('Room name is required', 'error');
    setSaving(true);

    const { data, error } = await upsertLocation({
      floor_id: floorId,
      name: roomModalData.name.trim(),
      room_number: roomModalData.room_number.trim() || null,
      department: roomModalData.department.trim() || null,
      description: roomModalData.description.trim() || null,
      location_type: roomModalData.location_type,
      shape_data: {
        type: 'rect',
        x: roomModalData.x,
        y: roomModalData.y,
        width: roomModalData.width,
        height: roomModalData.height,
      },
      fill_color: LOCATION_COLORS[roomModalData.location_type] || '#e2e8f0',
    });

    if (error) {
      setSaving(false);
      return showToast(error.message, 'error');
    }

    let nextNodes = [...nodes];
    if (data) {
      const nextLocs = [...locations, data];
      setLocations(nextLocs);

      // Create linked door/access node at center
      const cx = Math.round(roomModalData.x + roomModalData.width / 2);
      const cy = Math.round(roomModalData.y + roomModalData.height / 2);
      const nodeType = roomModalData.location_type === 'stairs'
        ? 'stairs'
        : roomModalData.location_type === 'lift'
        ? 'lift'
        : roomModalData.location_type === 'entrance'
        ? 'entrance'
        : 'room_door';

      const nodeRes = await upsertNode({
        floor_id: floorId,
        location_id: data.id,
        x: cx,
        y: cy,
        node_type: nodeType,
        label: roomModalData.name,
      });

      if (nodeRes.data) {
        nextNodes = [...nextNodes, nodeRes.data];
        setNodes(nextNodes);
      }

      pushSnapshot(nextLocs, nextNodes, edges);
      setSelectedLocation(data);
    }

    setSaving(false);
    setShowRoomModal(false);
    showToast(`Added ${roomModalData.name}`);
    setTool(TOOLS.SELECT);
  };

  // ─── Insert Preset Template ───
  const handleInsertTemplate = (tmpl) => {
    // Insert at center of current viewbox
    const cx = Math.round(viewBox.x + viewBox.w / 2 - tmpl.w / 2);
    const cy = Math.round(viewBox.y + viewBox.h / 2 - tmpl.h / 2);

    setRoomModalData({
      name: tmpl.name,
      room_number: '',
      department: '',
      description: '',
      location_type: tmpl.type,
      x: cx,
      y: cy,
      width: tmpl.w,
      height: tmpl.h,
    });
    setShowRoomModal(true);
  };

  // ─── Location Selection & Drag Initiation ───
  const handleLocationPointerDown = (e, loc) => {
    e.stopPropagation();

    if (tool === TOOLS.DELETE) {
      handleDeleteLocation(loc.id);
      return;
    }

    setSelectedLocation(loc);
    setSelectedNode(null);
    setSelectedEdge(null);

    if (tool === TOOLS.SELECT || tool === TOOLS.MOVE) {
      const pt = getSvgPoint(e.clientX, e.clientY);
      const svg = svgRef.current;
      if (svg) svg.setPointerCapture(e.pointerId);

      gestureRef.current = {
        active: true,
        mode: 'move_loc',
        pointerId: e.pointerId,
        startX: pt.x,
        startY: pt.y,
        targetItem: loc,
        initialShape: { ...loc.shape_data },
      };
    }
  };

  // ─── Resize Handle Pointer Down ───
  const handleResizePointerDown = (e, loc, handle) => {
    e.stopPropagation();
    const pt = getSvgPoint(e.clientX, e.clientY);
    const svg = svgRef.current;
    if (svg) svg.setPointerCapture(e.pointerId);

    gestureRef.current = {
      active: true,
      mode: 'resize_loc',
      pointerId: e.pointerId,
      startX: pt.x,
      startY: pt.y,
      targetItem: loc,
      resizeHandle: handle,
      initialShape: { ...loc.shape_data },
    };
  };

  // ─── Node Interaction ───
  const handleNodePointerDown = (e, node) => {
    e.stopPropagation();

    if (tool === TOOLS.DELETE) {
      handleDeleteNode(node.id);
      return;
    }

    if (tool === TOOLS.ADD_EDGE) {
      if (!edgeStartNode) {
        setEdgeStartNode(node);
        showToast('First node selected. Now click the second node to connect.', 'info');
      } else if (edgeStartNode.id !== node.id) {
        handleCreateEdge(edgeStartNode, node);
      }
      return;
    }

    setSelectedNode(node);
    setSelectedLocation(null);
    setSelectedEdge(null);

    if (tool === TOOLS.SELECT || tool === TOOLS.MOVE) {
      const pt = getSvgPoint(e.clientX, e.clientY);
      const svg = svgRef.current;
      if (svg) svg.setPointerCapture(e.pointerId);

      gestureRef.current = {
        active: true,
        mode: 'move_node',
        pointerId: e.pointerId,
        startX: pt.x,
        startY: pt.y,
        targetItem: node,
        initialNodePos: { x: node.x, y: node.y },
      };
    }
  };

  // ─── Edge Creation ───
  const handleCreateEdge = async (fromNode, toNode) => {
    const dist = euclideanDistance(fromNode.x, fromNode.y, toNode.x, toNode.y);
    setSaving(true);
    const { data, error } = await upsertEdge({
      floor_id: floorId,
      from_node_id: fromNode.id,
      to_node_id: toNode.id,
      distance: Math.round(dist),
      is_bidirectional: true,
      edge_type: fromNode.node_type === 'stairs' || toNode.node_type === 'stairs' ? 'stairs' : 'walkway',
      is_accessible: fromNode.node_type !== 'stairs' && toNode.node_type !== 'stairs',
    });
    setSaving(false);
    if (error) return showToast(error.message, 'error');
    if (data) {
      const nextEdges = [...edges, data];
      setEdges(nextEdges);
      pushSnapshot(locations, nodes, nextEdges);
      showToast('Connected nodes with path');
      setEdgeStartNode(null);
    }
  };

  // ─── Edge Interaction ───
  const handleEdgeClick = (e, edge) => {
    e.stopPropagation();
    if (tool === TOOLS.DELETE) {
      handleDeleteEdge(edge.id);
      return;
    }
    setSelectedEdge(edge);
    setSelectedNode(null);
    setSelectedLocation(null);
  };

  // ─── Delete Operations ───
  const handleDeleteLocation = async (id) => {
    setSaving(true);
    const { error } = await deleteLocation(id);
    setSaving(false);
    if (error) return showToast(error.message, 'error');

    const nextLocs = locations.filter((l) => l.id !== id);
    setLocations(nextLocs);
    pushSnapshot(nextLocs, nodes, edges);
    setSelectedLocation(null);
    showToast('Room deleted');
  };

  const handleDeleteNode = async (id) => {
    setSaving(true);
    const { error } = await deleteNode(id);
    setSaving(false);
    if (error) return showToast(error.message, 'error');

    const nextNodes = nodes.filter((n) => n.id !== id);
    const nextEdges = edges.filter((e) => e.from_node_id !== id && e.to_node_id !== id);
    setNodes(nextNodes);
    setEdges(nextEdges);
    pushSnapshot(locations, nextNodes, nextEdges);
    setSelectedNode(null);
    showToast('Node deleted');
  };

  const handleDeleteEdge = async (id) => {
    setSaving(true);
    const { error } = await deleteEdge(id);
    setSaving(false);
    if (error) return showToast(error.message, 'error');

    const nextEdges = edges.filter((e) => e.id !== id);
    setEdges(nextEdges);
    pushSnapshot(locations, nodes, nextEdges);
    setSelectedEdge(null);
    showToast('Edge deleted');
  };

  // ─── Set Primary QR Start Node ───
  const handleSetQRStartNode = async (nodeId) => {
    setSaving(true);
    const { error } = await upsertFloor({ ...floor, qr_start_node_id: nodeId });
    setSaving(false);
    if (error) return showToast(error.message, 'error');
    setFloor((prev) => ({ ...prev, qr_start_node_id: nodeId }));
    showToast('Primary floor QR start location updated');
  };

  // ─── Publish Floor Toggle ───
  const handleTogglePublish = async () => {
    const val = validateFloorMap(locations, nodes, edges, floor?.qr_start_node_id);
    if (!floor.is_published && val.issues.length > 0) {
      setShowValidationDrawer(true);
      return showToast('Cannot publish: resolve critical map errors first', 'error');
    }

    setSaving(true);
    const nextPublished = !floor.is_published;
    const { error } = await upsertFloor({ ...floor, is_published: nextPublished });
    setSaving(false);
    if (error) return showToast(error.message, 'error');
    setFloor((prev) => ({ ...prev, is_published: nextPublished }));
    showToast(nextPublished ? 'Floor published to students!' : 'Floor set to draft');
  };

  // ─── Background Tracing Save ───
  const handleSaveBackground = async () => {
    setSaving(true);
    const { error } = await upsertFloor({ ...floor, background_image: bgImage });
    setSaving(false);
    if (error) return showToast(error.message, 'error');
    setFloor((prev) => ({ ...prev, background_image: bgImage }));
    setShowBgModal(false);
    showToast('Background tracing image updated');
  };

  // ─── Duplicate Floor ───
  const handleDuplicateFloor = async () => {
    if (!duplicateName.trim()) return showToast('New floor name required', 'error');
    setSaving(true);
    const { data, error } = await duplicateFloor(floor.id, floor.building_id, duplicateName.trim(), Number(duplicateNumber));
    setSaving(false);
    if (error) return showToast(error.message, 'error');
    setShowDuplicateModal(false);
    showToast(`Floor duplicated as "${duplicateName}"!`);
  };

  // ─── Auto-Connection Suggestion for Selected Room / Door Node ───
  const autoConnectionSuggestion = useMemo(() => {
    if (!selectedLocation && !selectedNode) return null;
    let targetNode = selectedNode;
    if (!targetNode && selectedLocation) {
      targetNode = nodes.find((n) => n.location_id === selectedLocation.id);
    }
    if (!targetNode) return null;

    return findNearestWaypoint(targetNode, nodes, edges, 260);
  }, [selectedLocation, selectedNode, nodes, edges]);

  // ─── Graph & Map Health Validation ───
  const validationReport = useMemo(() => {
    return validateFloorMap(locations, nodes, edges, floor?.qr_start_node_id);
  }, [locations, nodes, edges, floor?.qr_start_node_id]);

  // ─── Zoom Controls ───
  const handleZoom = (factor) => {
    setViewBox((vb) => {
      const nw = Math.max(200, Math.min(4000, vb.w * factor));
      const nh = Math.max(133, Math.min(2666, vb.h * factor));
      return {
        x: vb.x + (vb.w - nw) / 2,
        y: vb.y + (vb.h - nh) / 2,
        w: nw,
        h: nh,
      };
    });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    handleZoom(e.deltaY > 0 ? 1.15 : 0.87);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white gap-3">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
        <p className="text-sm font-semibold tracking-wide">Loading interactive floor map editor…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 overflow-hidden select-none">
      {/* ─── TOAST ─── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-top-4 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : toast.type === 'info' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ─── HEADER BAR ─── */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 py-2 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Back to Buildings"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold text-white tracking-tight">
                {buildingName} &bull; {floorName}
              </h1>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
                floor?.is_published ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {floor?.is_published ? 'Published' : 'Draft'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {locations.length} rooms &bull; {nodes.length} nodes &bull; {edges.length} paths
              {floor?.qr_start_node_id && <span className="text-emerald-400 ml-2 font-semibold">✓ QR Start set</span>}
            </p>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {/* Validation report trigger */}
          <button
            onClick={() => setShowValidationDrawer(!showValidationDrawer)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
              validationReport.issues.length > 0
                ? 'bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30'
                : validationReport.warnings.length > 0
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Map Health</span>
            {(validationReport.issues.length + validationReport.warnings.length > 0) && (
              <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-extrabold">
                {validationReport.issues.length + validationReport.warnings.length}
              </span>
            )}
          </button>

          {/* Background tracing blueprint button */}
          <button
            onClick={() => setShowBgModal(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Blueprint Tracing</span>
          </button>

          {/* Duplicate floor button */}
          <button
            onClick={() => {
              setDuplicateName(`${floor.name} (Copy)`);
              setDuplicateNumber(floor.floor_number + 1);
              setShowDuplicateModal(true);
            }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate Floor</span>
          </button>

          {/* Publish Toggle Button */}
          <button
            onClick={handleTogglePublish}
            disabled={saving}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition shadow-md disabled:opacity-50 ${
              floor?.is_published
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
            }`}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />}
            <span>{floor?.is_published ? 'Unpublish' : 'Publish Floor'}</span>
          </button>
        </div>
      </div>

      {/* ─── TOOLBAR (Responsive with Horizontal Scroll & Touch-Friendly Hit Areas) ─── */}
      <div className="bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center justify-between shrink-0 z-20 gap-2 overflow-x-auto no-scrollbar">
        {/* Main Tools Group */}
        <div className="flex items-center gap-1">
          {[
            { id: TOOLS.SELECT, icon: MousePointer2, label: 'Select' },
            { id: TOOLS.MOVE, icon: Move, label: 'Move' },
            { id: TOOLS.ADD_ROOM, icon: Square, label: 'Add Room' },
            { id: TOOLS.ADD_CORRIDOR, icon: Footprints, label: 'Corridor' },
            { id: TOOLS.ADD_ENTRANCE, icon: DoorOpen, label: 'Entrance' },
            { id: TOOLS.ADD_STAIRS, icon: ArrowUpRight, label: 'Stairs' },
            { id: TOOLS.ADD_LIFT, icon: Layers, label: 'Lift' },
            { id: TOOLS.ADD_NODE, icon: Circle, label: 'Waypoint' },
            { id: TOOLS.ADD_EDGE, icon: Link2, label: 'Connect' },
            { id: TOOLS.PAN, icon: Move, label: 'Pan' },
            { id: TOOLS.DELETE, icon: Trash2, label: 'Delete' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTool(t.id);
                setEdgeStartNode(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap min-h-[38px] ${
                tool === t.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Action controls (Undo / Redo / Zoom / Grid) */}
        <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-slate-800">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-slate-800 mx-1" />

          {/* Grid snap toggle */}
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`p-2 rounded-xl transition ${
              snapToGrid ? 'bg-indigo-900/60 text-indigo-400 border border-indigo-700/50' : 'text-slate-500 hover:bg-slate-800'
            }`}
            title="Toggle Snap to Grid (20px)"
          >
            <Grid className="w-4 h-4" />
          </button>

          {/* Zoom controls */}
          <button
            onClick={() => handleZoom(1.15)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(0.87)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewBox({ x: 0, y: 0, w: 1200, h: 800 })}
            className="px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            Reset
          </button>
        </div>
      </div>

      {/* ─── AUTO-CONNECTION BANNER (If nearest waypoint detected) ─── */}
      {autoConnectionSuggestion && (
        <div className="bg-indigo-950/90 border-b border-indigo-800/60 px-4 py-2 flex items-center justify-between text-xs z-20 animate-in slide-in-from-top-1">
          <div className="flex items-center gap-2 text-indigo-200">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              Suggest connecting <strong>{selectedLocation?.name || 'Selected Node'}</strong> to nearby corridor waypoint ({autoConnectionSuggestion.distance}m)?
            </span>
          </div>
          <button
            onClick={() => {
              const targetNode = selectedNode || nodes.find((n) => n.location_id === selectedLocation.id);
              if (targetNode) handleCreateEdge(targetNode, autoConnectionSuggestion.node);
            }}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs shadow-sm transition"
          >
            Connect Now
          </button>
        </div>
      )}

      {/* ─── MAIN EDITOR WORKSPACE ─── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* SVG Canvas Area with touch-action:none */}
        <div
          className="flex-1 relative overflow-hidden bg-slate-950"
          style={{ touchAction: 'none' }}
        >
          <svg
            ref={svgRef}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            className={`w-full h-full select-none ${
              tool === TOOLS.PAN ? 'cursor-grab active:cursor-grabbing' :
              tool === TOOLS.ADD_ROOM || tool === TOOLS.ADD_CORRIDOR ? 'cursor-crosshair' :
              tool === TOOLS.MOVE ? 'cursor-move' :
              tool === TOOLS.ADD_NODE ? 'cursor-cell' :
              tool === TOOLS.ADD_EDGE ? 'cursor-pointer' :
              tool === TOOLS.DELETE ? 'cursor-not-allowed' :
              'cursor-default'
            }`}
            style={{ touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
          >
            {/* SVG Definitions */}
            <defs>
              <pattern id="editorGridSmall" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
              </pattern>
              <pattern id="editorGridLarge" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#334155" strokeWidth="1" />
              </pattern>
            </defs>

            {/* Grid layers */}
            <rect x={viewBox.x - 4000} y={viewBox.y - 4000} width={viewBox.w + 8000} height={viewBox.h + 8000} fill="url(#editorGridSmall)" />
            <rect x={viewBox.x - 4000} y={viewBox.y - 4000} width={viewBox.w + 8000} height={viewBox.h + 8000} fill="url(#editorGridLarge)" />

            {/* Optional Blueprint Background Tracing Layer */}
            {bgImage && showBgImage && (
              <image
                href={bgImage}
                x="0"
                y="0"
                width="1200"
                height="800"
                opacity={bgOpacity}
                preserveAspectRatio="xMidYMid meet"
                className="pointer-events-none"
              />
            )}

            {/* Render Locations (Rooms, Halls, Corridors) */}
            {locations.map((loc) => {
              const sd = loc.shape_data || {};
              const isSelected = selectedLocation?.id === loc.id;
              const fill = loc.fill_color || LOCATION_COLORS[loc.location_type] || '#3b82f6';

              if (sd.type === 'rect') {
                return (
                  <g
                    key={loc.id}
                    onPointerDown={(e) => handleLocationPointerDown(e, loc)}
                    className="cursor-pointer"
                  >
                    {/* Main Room Rect */}
                    <rect
                      x={sd.x}
                      y={sd.y}
                      width={sd.width}
                      height={sd.height}
                      fill={fill}
                      fillOpacity={isSelected ? 0.45 : 0.22}
                      stroke={isSelected ? '#6366f1' : fill}
                      strokeWidth={isSelected ? 3 : 1.5}
                      rx={loc.location_type === 'corridor' ? 2 : 6}
                    />

                    {/* Room Name & Badge */}
                    <text
                      x={sd.x + sd.width / 2}
                      y={sd.y + sd.height / 2 - (loc.room_number ? 6 : 0)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={Math.max(10, Math.min(14, Math.floor(sd.width / 8)))}
                      fontWeight="800"
                      fill="#f8fafc"
                      className="pointer-events-none"
                    >
                      {loc.name}
                    </text>

                    {/* Room Number / Type secondary label */}
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
                      {loc.room_number ? `#${loc.room_number} • ` : ''}{loc.location_type.replace('_', ' ')}
                    </text>

                    {/* Resize Handles for Selected Room */}
                    {isSelected && (
                      <g>
                        {/* Bounding box highlight */}
                        <rect
                          x={sd.x - 2}
                          y={sd.y - 2}
                          width={sd.width + 4}
                          height={sd.height + 4}
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="1.5"
                          strokeDasharray="4 3"
                        />
                        {/* Corner Handles */}
                        {[
                          { id: 'nw', cx: sd.x, cy: sd.y, cursor: 'nwse-resize' },
                          { id: 'ne', cx: sd.x + sd.width, cy: sd.y, cursor: 'nesw-resize' },
                          { id: 'se', cx: sd.x + sd.width, cy: sd.y + sd.height, cursor: 'nwse-resize' },
                          { id: 'sw', cx: sd.x, cy: sd.y + sd.height, cursor: 'nesw-resize' },
                        ].map((h) => (
                          <circle
                            key={h.id}
                            cx={h.cx}
                            cy={h.cy}
                            r={6}
                            fill="#6366f1"
                            stroke="#fff"
                            strokeWidth={2}
                            style={{ cursor: h.cursor }}
                            onPointerDown={(e) => handleResizePointerDown(e, loc, h.id)}
                          />
                        ))}
                      </g>
                    )}
                  </g>
                );
              }
              return null;
            })}

            {/* Render Edges (Pathways) */}
            {edges.map((edge) => {
              const fromNode = nodes.find((n) => n.id === edge.from_node_id);
              const toNode = nodes.find((n) => n.id === edge.to_node_id);
              if (!fromNode || !toNode) return null;
              const isSelected = selectedEdge?.id === edge.id;

              return (
                <g key={edge.id} onClick={(e) => handleEdgeClick(e, edge)} className="cursor-pointer">
                  {/* Thick invisible hit area for easy touch selection */}
                  <line
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke="transparent"
                    strokeWidth={18}
                  />
                  {/* Visible Edge Line */}
                  <line
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke={
                      edge.is_disabled ? '#ef4444' :
                      isSelected ? '#6366f1' :
                      edge.edge_type === 'stairs' ? '#f59e0b' :
                      edge.edge_type === 'lift' ? '#ec4899' :
                      '#64748b'
                    }
                    strokeWidth={isSelected ? 3.5 : 2}
                    strokeDasharray={edge.is_disabled ? '6 4' : !edge.is_bidirectional ? '8 4' : 'none'}
                    opacity={edge.is_disabled ? 0.4 : 0.85}
                  />
                  {/* Distance badge */}
                  <text
                    x={(fromNode.x + toNode.x) / 2}
                    y={(fromNode.y + toNode.y) / 2 - 6}
                    textAnchor="middle"
                    fontSize={8}
                    fontWeight="700"
                    fill="#94a3b8"
                    className="pointer-events-none"
                  >
                    {Math.round(edge.distance)}m
                  </text>
                </g>
              );
            })}

            {/* Edge Drawing Preview Line */}
            {edgeStartNode && (
              <circle
                cx={edgeStartNode.x}
                cy={edgeStartNode.y}
                r={12}
                fill="none"
                stroke="#6366f1"
                strokeWidth={2.5}
                strokeDasharray="4 2"
                className="animate-spin-slow"
              />
            )}

            {/* Render Nodes (Graph vertices) */}
            {nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const isQRStart = floor?.qr_start_node_id === node.id;
              const color = NODE_COLORS[node.node_type] || '#6b7280';

              return (
                <g
                  key={node.id}
                  onPointerDown={(e) => handleNodePointerDown(e, node)}
                  className="cursor-pointer"
                >
                  {/* Touch hit circle */}
                  <circle cx={node.x} cy={node.y} r={16} fill="transparent" />

                  {/* Outer pulse for QR Start node */}
                  {isQRStart && (
                    <circle cx={node.x} cy={node.y} r={12} fill="none" stroke="#10b981" strokeWidth={2} opacity={0.6}>
                      <animate attributeName="r" values="8;16" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Core Node Circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isSelected ? 8 : 6}
                    fill={isQRStart ? '#10b981' : color}
                    stroke={isSelected ? '#fff' : isQRStart ? '#059669' : '#0f172a'}
                    strokeWidth={isSelected ? 3 : 2}
                  />

                  {/* QR Start Marker text */}
                  {isQRStart && (
                    <text x={node.x} y={node.y - 14} textAnchor="middle" fontSize={10} fontWeight="900" fill="#10b981">
                      ★ QR START
                    </text>
                  )}

                  {/* Node label */}
                  {node.label && (
                    <text x={node.x + 10} y={node.y + 3} fontSize={9} fontWeight="700" fill="#cbd5e1" className="pointer-events-none">
                      {node.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Live Drag-to-Draw Preview Rectangle */}
            {drawPreview && (
              <rect
                x={drawPreview.x}
                y={drawPreview.y}
                width={drawPreview.width}
                height={drawPreview.height}
                fill="#6366f1"
                fillOpacity={0.3}
                stroke="#6366f1"
                strokeWidth={2}
                strokeDasharray="6 3"
                rx={4}
                className="pointer-events-none"
              />
            )}
          </svg>

          {/* Quick Floating Templates Bar (Bottom Left) */}
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 p-1.5 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl overflow-x-auto max-w-[calc(100vw-32px)] md:max-w-md">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 shrink-0">
              Templates:
            </span>
            {ROOM_TEMPLATES.slice(0, 5).map((tmpl) => (
              <button
                key={tmpl.label}
                onClick={() => handleInsertTemplate(tmpl)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3 h-3 text-indigo-400" /> {tmpl.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── PROPERTIES SIDEBAR / BOTTOM DRAWER ─── */}
        <div className={`w-full md:w-80 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col shrink-0 max-h-[45vh] md:max-h-full overflow-y-auto ${
          !selectedLocation && !selectedNode && !selectedEdge ? 'hidden md:flex' : 'flex'
        }`}>
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">Properties & Controls</h2>
            {(selectedLocation || selectedNode || selectedEdge) && (
              <button
                onClick={() => {
                  setSelectedLocation(null);
                  setSelectedNode(null);
                  setSelectedEdge(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="p-4 space-y-4 flex-1">
            {/* 1. Selected Location Inspector */}
            {selectedLocation && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400">Selected Room</span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    {selectedLocation.location_type}
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Display Name</label>
                  <input
                    type="text"
                    value={selectedLocation.name}
                    onChange={(e) => {
                      const updated = { ...selectedLocation, name: e.target.value };
                      setSelectedLocation(updated);
                      setLocations((prev) => prev.map((l) => l.id === updated.id ? updated : l));
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Room #</label>
                    <input
                      type="text"
                      value={selectedLocation.room_number || ''}
                      onChange={(e) => {
                        const updated = { ...selectedLocation, room_number: e.target.value };
                        setSelectedLocation(updated);
                        setLocations((prev) => prev.map((l) => l.id === updated.id ? updated : l));
                      }}
                      placeholder="e.g. 204"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Department</label>
                    <input
                      type="text"
                      value={selectedLocation.department || ''}
                      onChange={(e) => {
                        const updated = { ...selectedLocation, department: e.target.value };
                        setSelectedLocation(updated);
                        setLocations((prev) => prev.map((l) => l.id === updated.id ? updated : l));
                      }}
                      placeholder="e.g. CSE"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Category Type</label>
                  <select
                    value={selectedLocation.location_type}
                    onChange={(e) => {
                      const updated = {
                        ...selectedLocation,
                        location_type: e.target.value,
                        fill_color: LOCATION_COLORS[e.target.value] || '#3b82f6',
                      };
                      setSelectedLocation(updated);
                      setLocations((prev) => prev.map((l) => l.id === updated.id ? updated : l));
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    {Object.keys(LOCATION_COLORS).map((k) => (
                      <option key={k} value={k}>{k.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={async () => {
                      setSaving(true);
                      await upsertLocation(selectedLocation);
                      pushSnapshot(locations, nodes, edges);
                      setSaving(false);
                      showToast('Room details saved');
                    }}
                    disabled={saving}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" /> Save
                  </button>
                  <button
                    onClick={() => handleDeleteLocation(selectedLocation.id)}
                    className="px-3 py-2 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded-xl text-xs font-bold transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* 2. Selected Node Inspector */}
            {selectedNode && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-400">Selected Node</span>
                  {floor?.qr_start_node_id === selectedNode.id && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                      QR START NODE
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Node Label</label>
                  <input
                    type="text"
                    value={selectedNode.label || ''}
                    onChange={(e) => {
                      const updated = { ...selectedNode, label: e.target.value };
                      setSelectedNode(updated);
                      setNodes((prev) => prev.map((n) => n.id === updated.id ? updated : n));
                    }}
                    placeholder="e.g. Entrance Gate 1"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Node Role</label>
                  <select
                    value={selectedNode.node_type}
                    onChange={(e) => {
                      const updated = { ...selectedNode, node_type: e.target.value };
                      setSelectedNode(updated);
                      setNodes((prev) => prev.map((n) => n.id === updated.id ? updated : n));
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    {Object.keys(NODE_COLORS).map((k) => (
                      <option key={k} value={k}>{k.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                  Coordinates: ({selectedNode.x}, {selectedNode.y})
                </div>

                <button
                  onClick={() => handleSetQRStartNode(selectedNode.id)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Set as Floor QR Start Point
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      setSaving(true);
                      await upsertNode(selectedNode);
                      pushSnapshot(locations, nodes, edges);
                      setSaving(false);
                      showToast('Node updated');
                    }}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => handleDeleteNode(selectedNode.id)}
                    className="px-3 py-2 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded-xl text-xs font-bold transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* 3. Selected Edge Inspector */}
            {selectedEdge && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-amber-400">Selected Pathway Edge</span>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Distance (Meters)</label>
                  <input
                    type="number"
                    value={selectedEdge.distance}
                    onChange={(e) => {
                      const updated = { ...selectedEdge, distance: Math.max(0, Number(e.target.value)) };
                      setSelectedEdge(updated);
                      setEdges((prev) => prev.map((edge) => edge.id === updated.id ? updated : edge));
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Path Type</label>
                  <select
                    value={selectedEdge.edge_type}
                    onChange={(e) => {
                      const updated = { ...selectedEdge, edge_type: e.target.value };
                      setSelectedEdge(updated);
                      setEdges((prev) => prev.map((edge) => edge.id === updated.id ? updated : edge));
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value="walkway">Walkway</option>
                    <option value="stairs">Staircase</option>
                    <option value="lift">Elevator / Lift</option>
                    <option value="ramp">Ramp</option>
                  </select>
                </div>

                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={selectedEdge.is_bidirectional}
                      onChange={(e) => {
                        const updated = { ...selectedEdge, is_bidirectional: e.target.checked };
                        setSelectedEdge(updated);
                        setEdges((prev) => prev.map((edge) => edge.id === updated.id ? updated : edge));
                      }}
                      className="rounded bg-slate-800 border-slate-700 text-indigo-600"
                    />
                    Bidirectional (walk both ways)
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={selectedEdge.is_accessible !== false}
                      onChange={(e) => {
                        const updated = { ...selectedEdge, is_accessible: e.target.checked };
                        setSelectedEdge(updated);
                        setEdges((prev) => prev.map((edge) => edge.id === updated.id ? updated : edge));
                      }}
                      className="rounded bg-slate-800 border-slate-700 text-indigo-600"
                    />
                    Wheelchair Accessible
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={selectedEdge.is_disabled || false}
                      onChange={(e) => {
                        const updated = { ...selectedEdge, is_disabled: e.target.checked };
                        setSelectedEdge(updated);
                        setEdges((prev) => prev.map((edge) => edge.id === updated.id ? updated : edge));
                      }}
                      className="rounded bg-slate-800 border-slate-700 text-red-500"
                    />
                    Temporarily Blocked / Closed
                  </label>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={async () => {
                      setSaving(true);
                      await upsertEdge(selectedEdge);
                      pushSnapshot(locations, nodes, edges);
                      setSaving(false);
                      showToast('Edge updated');
                    }}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => handleDeleteEdge(selectedEdge.id)}
                    className="px-3 py-2 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded-xl text-xs font-bold transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Default State: Quick Instruction Guide */}
            {!selectedLocation && !selectedNode && !selectedEdge && (
              <div className="space-y-3 text-[11px] text-slate-400">
                <p className="font-extrabold text-white text-xs">Editor Controls</p>
                <div className="space-y-1.5 leading-relaxed">
                  <p>• <strong>Add Room / Corridor:</strong> Drag across the canvas or click once to place with default size.</p>
                  <p>• <strong>Move & Resize:</strong> Click a room to reveal corner handles. Drag inside to move; drag corners to resize.</p>
                  <p>• <strong>Touch & Pointer:</strong> Full touch support with zero page scrolling or lag.</p>
                  <p>• <strong>Waypoints & Connect:</strong> Click Connect, click first node, then click second node to link path.</p>
                  <p>• <strong>QR Start:</strong> Click entrance node and select "Set as Floor QR Start Point".</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── ROOM CREATION MODAL / DIALOG ─── */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white">Create New Room / Area</h3>
              <button onClick={() => setShowRoomModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Room / Hall Name *</label>
                <input
                  type="text"
                  value={roomModalData.name}
                  onChange={(e) => setRoomModalData({ ...roomModalData, name: e.target.value })}
                  placeholder="e.g. Physics Laboratory 1"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Room # (Optional)</label>
                  <input
                    type="text"
                    value={roomModalData.room_number}
                    onChange={(e) => setRoomModalData({ ...roomModalData, room_number: e.target.value })}
                    placeholder="e.g. 101"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Department</label>
                  <input
                    type="text"
                    value={roomModalData.department}
                    onChange={(e) => setRoomModalData({ ...roomModalData, department: e.target.value })}
                    placeholder="e.g. Mechanical"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Type</label>
                <select
                  value={roomModalData.location_type}
                  onChange={(e) => setRoomModalData({ ...roomModalData, location_type: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                >
                  {Object.keys(LOCATION_COLORS).map((k) => (
                    <option key={k} value={k}>{k.replace('_', ' ').toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Width (px)</label>
                  <input
                    type="number"
                    value={roomModalData.width}
                    onChange={(e) => setRoomModalData({ ...roomModalData, width: Math.max(20, Number(e.target.value)) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Height (px)</label>
                  <input
                    type="number"
                    value={roomModalData.height}
                    onChange={(e) => setRoomModalData({ ...roomModalData, height: Math.max(20, Number(e.target.value)) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleConfirmRoomModal}
                disabled={saving || !roomModalData.name.trim()}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md disabled:opacity-50"
              >
                {saving ? 'Placing Room…' : 'Place on Floor Map'}
              </button>
              <button
                onClick={() => setShowRoomModal(false)}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── BLUEPRINT TRACING MODAL ─── */}
      {showBgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-extrabold text-white">Blueprint Tracing Image</h3>
              </div>
              <button onClick={() => setShowBgModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Import a CAD drawing, floor plan blueprint, or architectural photo as a tracing background underneath your SVG map.
            </p>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Image URL or Data URI</label>
              <input
                type="text"
                value={bgImage}
                onChange={(e) => setBgImage(e.target.value)}
                placeholder="https://.../floor1-blueprint.png"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
                <span>Tracing Opacity</span>
                <span>{Math.round(bgOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={bgOpacity}
                onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={showBgImage}
                onChange={(e) => setShowBgImage(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-indigo-600"
              />
              Show tracing image on canvas
            </label>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveBackground}
                disabled={saving}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md"
              >
                Apply & Save Background
              </button>
              <button
                onClick={() => setShowBgModal(false)}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── VALIDATION & HEALTH DRAWER ─── */}
      {showValidationDrawer && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-slate-900 border-l border-slate-800 shadow-2xl p-5 flex flex-col space-y-4 animate-in slide-in-from-right">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-extrabold text-white">Floor Map Health</h3>
            </div>
            <button onClick={() => setShowValidationDrawer(false)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {/* Status header */}
            <div className={`p-4 rounded-2xl border text-xs ${
              validationReport.issues.length > 0
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : validationReport.warnings.length > 0
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}>
              <p className="font-extrabold text-sm mb-1">
                {validationReport.issues.length > 0
                  ? 'Critical Errors Detected'
                  : validationReport.warnings.length > 0
                  ? 'Warnings to Review'
                  : 'Map Ready for Publishing'}
              </p>
              <p className="text-[11px] opacity-80">
                {validationReport.issues.length} critical issues &bull; {validationReport.warnings.length} warnings
              </p>
            </div>

            {/* Critical Issues */}
            {validationReport.issues.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-red-400">Critical Issues (Blocks Publish):</p>
                {validationReport.issues.map((iss, i) => (
                  <div key={i} className="p-2.5 bg-red-950/40 border border-red-800/40 rounded-xl text-xs text-red-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{iss}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Warnings */}
            {validationReport.warnings.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-amber-400">Topology Warnings:</p>
                {validationReport.warnings.map((warn, i) => (
                  <div key={i} className="p-2.5 bg-amber-950/40 border border-amber-800/40 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{warn}</span>
                  </div>
                ))}
              </div>
            )}

            {validationReport.issues.length === 0 && validationReport.warnings.length === 0 && (
              <div className="p-6 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-white">All Navigation Paths Valid</p>
                <p className="text-xs text-slate-400">
                  Every room has an access node, no overlaps detected, and all nodes are connected to the QR start point.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── DUPLICATE FLOOR MODAL ─── */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-sm font-extrabold text-white">Duplicate Floor Layout</h3>
            <p className="text-xs text-slate-400">
              Clone this floor's entire blueprint, rooms, nodes, and pathways as a new floor template.
            </p>
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">New Floor Name</label>
              <input
                type="text"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">New Floor Number</label>
              <input
                type="number"
                value={duplicateNumber}
                onChange={(e) => setDuplicateNumber(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleDuplicateFloor}
                disabled={saving}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md"
              >
                {saving ? 'Duplicating…' : 'Duplicate Floor'}
              </button>
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
