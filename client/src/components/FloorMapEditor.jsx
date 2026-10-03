// agent-notes: { ctx: "SVG interactive floor-map editor: draw rooms, place nodes, connect edges, set QR start point", deps: ["src/services/indoorNavDataService.js", "src/services/indoorNavigationService.js", "lucide-react"], state: "active", last: "antigravity@2026-10-03" }

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchFloorMapData, upsertLocation, deleteLocation,
  upsertNode, deleteNode, upsertEdge, deleteEdge,
  upsertFloor,
} from '../services/indoorNavDataService';
import { euclideanDistance, validateGraph } from '../services/indoorNavigationService';
import {
  ArrowLeft, Save, Loader2, Plus, Trash2, MousePointer2, Square, Circle,
  Link2, MapPin, Undo2, ZoomIn, ZoomOut, Move, Navigation, AlertCircle,
  CheckCircle2, Eye, Pencil, X, CornerDownRight,
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

const TOOLS = {
  SELECT: 'select',
  ADD_ROOM: 'add_room',
  ADD_NODE: 'add_node',
  ADD_EDGE: 'add_edge',
  PAN: 'pan',
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

  // ─── Editor State ───
  const [tool, setTool] = useState(TOOLS.SELECT);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [edgeStartNode, setEdgeStartNode] = useState(null);

  // ─── Pan/Zoom ───
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1200, h: 800 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);

  // ─── Room placement form ───
  const [roomForm, setRoomForm] = useState({ name: '', location_type: 'classroom', width: 100, height: 60 });
  const [showRoomForm, setShowRoomForm] = useState(false);

  // ─── Node edit form ───
  const [nodeForm, setNodeForm] = useState({ label: '', node_type: 'waypoint' });
  const [showNodeForm, setShowNodeForm] = useState(false);

  // ─── Edge edit form ───
  const [edgeForm, setEdgeForm] = useState({ distance: 0, is_bidirectional: true, edge_type: 'walkway', is_disabled: false });
  const [showEdgeForm, setShowEdgeForm] = useState(false);

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
    setLocations(data.locations || []);
    setNodes(data.nodes || []);
    setEdges(data.edges || []);
    if (data.floor?.svg_view_box) {
      const parts = data.floor.svg_view_box.split(' ').map(Number);
      if (parts.length === 4) setViewBox({ x: parts[0], y: parts[1], w: parts[2], h: parts[3] });
    }
    setLoading(false);
  }, [floorId, showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── SVG coordinate conversion ───
  const svgCoords = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = viewBox.x + ((e.clientX - rect.left) / rect.width) * viewBox.w;
    const y = viewBox.y + ((e.clientY - rect.top) / rect.height) * viewBox.h;
    return { x: Math.round(x), y: Math.round(y) };
  }, [viewBox]);

  // ─── Zoom ───
  const handleZoom = useCallback((delta) => {
    setViewBox((vb) => {
      const factor = delta > 0 ? 1.15 : 0.87;
      const nw = Math.max(200, Math.min(4000, vb.w * factor));
      const nh = Math.max(133, Math.min(2666, vb.h * factor));
      return {
        x: vb.x + (vb.w - nw) / 2,
        y: vb.y + (vb.h - nh) / 2,
        w: nw,
        h: nh,
      };
    });
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    handleZoom(e.deltaY);
  }, [handleZoom]);

  // ─── Pan ───
  const handleMouseDown = useCallback((e) => {
    if (tool === TOOLS.PAN || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  }, [tool]);

  const handleMouseMove = useCallback((e) => {
    if (isPanning) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const dx = ((e.clientX - panStart.x) / rect.width) * viewBox.w;
      const dy = ((e.clientY - panStart.y) / rect.height) * viewBox.h;
      setViewBox((vb) => ({ ...vb, x: vb.x - dx, y: vb.y - dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [isPanning, panStart, viewBox]);

  const handleMouseUp = useCallback(() => { setIsPanning(false); }, []);

  // ─── Click on canvas ───
  const handleCanvasClick = useCallback(async (e) => {
    if (tool === TOOLS.PAN) return;
    const pos = svgCoords(e);

    if (tool === TOOLS.ADD_ROOM) {
      setShowRoomForm(true);
      setRoomForm((f) => ({ ...f, _x: pos.x, _y: pos.y }));
      return;
    }

    if (tool === TOOLS.ADD_NODE) {
      setSaving(true);
      const { data, error } = await upsertNode({
        floor_id: floorId,
        x: pos.x,
        y: pos.y,
        node_type: 'waypoint',
        label: '',
      });
      setSaving(false);
      if (error) return showToast(error.message, 'error');
      if (data) setNodes((prev) => [...prev, data]);
      showToast('Node placed');
      return;
    }

    // Deselect
    setSelectedLocation(null);
    setSelectedNode(null);
    setSelectedEdge(null);
    setEdgeStartNode(null);
    setShowRoomForm(false);
    setShowNodeForm(false);
    setShowEdgeForm(false);
  }, [tool, floorId, svgCoords, showToast]);

  // ─── Click on a node ───
  const handleNodeClick = useCallback((e, node) => {
    e.stopPropagation();

    if (tool === TOOLS.ADD_EDGE) {
      if (!edgeStartNode) {
        setEdgeStartNode(node);
        showToast('Click another node to connect', 'info');
      } else if (edgeStartNode.id !== node.id) {
        // Create edge
        const dist = euclideanDistance(edgeStartNode.x, edgeStartNode.y, node.x, node.y);
        (async () => {
          setSaving(true);
          const { data, error } = await upsertEdge({
            floor_id: floorId,
            from_node_id: edgeStartNode.id,
            to_node_id: node.id,
            distance: Math.round(dist),
            is_bidirectional: true,
            edge_type: 'walkway',
          });
          setSaving(false);
          if (error) return showToast(error.message, 'error');
          if (data) setEdges((prev) => [...prev, data]);
          showToast('Edge created');
          setEdgeStartNode(null);
        })();
      }
      return;
    }

    setSelectedNode(node);
    setSelectedLocation(null);
    setSelectedEdge(null);
    setNodeForm({ label: node.label || '', node_type: node.node_type || 'waypoint' });
    setShowNodeForm(true);
    setShowRoomForm(false);
    setShowEdgeForm(false);
  }, [tool, edgeStartNode, floorId, showToast]);

  // ─── Click on edge ───
  const handleEdgeClick = useCallback((e, edge) => {
    e.stopPropagation();
    setSelectedEdge(edge);
    setSelectedNode(null);
    setSelectedLocation(null);
    setEdgeForm({
      distance: edge.distance || 0,
      is_bidirectional: edge.is_bidirectional !== false,
      edge_type: edge.edge_type || 'walkway',
      is_disabled: edge.is_disabled || false,
    });
    setShowEdgeForm(true);
    setShowRoomForm(false);
    setShowNodeForm(false);
  }, []);

  // ─── Click on location ───
  const handleLocationClick = useCallback((e, loc) => {
    e.stopPropagation();
    setSelectedLocation(loc);
    setSelectedNode(null);
    setSelectedEdge(null);
    setShowRoomForm(false);
    setShowNodeForm(false);
    setShowEdgeForm(false);
  }, []);

  // ─── Save Room ───
  const handleSaveRoom = async () => {
    if (!roomForm.name.trim()) return showToast('Name required', 'error');
    setSaving(true);
    const { data, error } = await upsertLocation({
      floor_id: floorId,
      name: roomForm.name,
      location_type: roomForm.location_type,
      shape_data: { type: 'rect', x: roomForm._x || 100, y: roomForm._y || 100, width: roomForm.width || 100, height: roomForm.height || 60 },
      fill_color: LOCATION_COLORS[roomForm.location_type] || '#e2e8f0',
    });
    setSaving(false);
    if (error) return showToast(error.message, 'error');
    if (data) {
      setLocations((prev) => [...prev, data]);
      // Also place a node at center of room
      const cx = (roomForm._x || 100) + (roomForm.width || 100) / 2;
      const cy = (roomForm._y || 100) + (roomForm.height || 60) / 2;
      const nodeRes = await upsertNode({
        floor_id: floorId,
        location_id: data.id,
        x: cx, y: cy,
        node_type: 'room_door',
        label: roomForm.name,
      });
      if (nodeRes.data) setNodes((prev) => [...prev, nodeRes.data]);
    }
    showToast('Room added');
    setShowRoomForm(false);
    setRoomForm({ name: '', location_type: 'classroom', width: 100, height: 60 });
    setTool(TOOLS.SELECT);
  };

  // ─── Update Node ───
  const handleUpdateNode = async () => {
    if (!selectedNode) return;
    setSaving(true);
    const { data, error } = await upsertNode({
      ...selectedNode,
      label: nodeForm.label,
      node_type: nodeForm.node_type,
    });
    setSaving(false);
    if (error) return showToast(error.message, 'error');
    if (data) setNodes((prev) => prev.map((n) => n.id === data.id ? data : n));
    showToast('Node updated');
    setShowNodeForm(false);
  };

  // ─── Delete Node ───
  const handleDeleteNode = async () => {
    if (!selectedNode) return;
    if (!window.confirm('Delete this node and all connected edges?')) return;
    setSaving(true);
    const { error } = await deleteNode(selectedNode.id);
    setSaving(false);
    if (error) return showToast(error.message, 'error');
    setNodes((prev) => prev.filter((n) => n.id !== selectedNode.id));
    setEdges((prev) => prev.filter((e) => e.from_node_id !== selectedNode.id && e.to_node_id !== selectedNode.id));
    setSelectedNode(null);
    setShowNodeForm(false);
    showToast('Node deleted');
  };

  // ─── Update Edge ───
  const handleUpdateEdge = async () => {
    if (!selectedEdge) return;
    setSaving(true);
    const { data, error } = await upsertEdge({
      ...selectedEdge,
      ...edgeForm,
    });
    setSaving(false);
    if (error) return showToast(error.message, 'error');
    if (data) setEdges((prev) => prev.map((e) => e.id === data.id ? data : e));
    showToast('Edge updated');
    setShowEdgeForm(false);
  };

  // ─── Delete Edge ───
  const handleDeleteEdge = async () => {
    if (!selectedEdge) return;
    setSaving(true);
    const { error } = await deleteEdge(selectedEdge.id);
    setSaving(false);
    if (error) return showToast(error.message, 'error');
    setEdges((prev) => prev.filter((e) => e.id !== selectedEdge.id));
    setSelectedEdge(null);
    setShowEdgeForm(false);
    showToast('Edge deleted');
  };

  // ─── Delete Location ───
  const handleDeleteLocation = async () => {
    if (!selectedLocation) return;
    if (!window.confirm('Delete this room?')) return;
    setSaving(true);
    const { error } = await deleteLocation(selectedLocation.id);
    setSaving(false);
    if (error) return showToast(error.message, 'error');
    setLocations((prev) => prev.filter((l) => l.id !== selectedLocation.id));
    setSelectedLocation(null);
    showToast('Room deleted');
  };

  // ─── Set QR Start Node ───
  const handleSetQRStart = async () => {
    if (!selectedNode || !floor) return;
    setSaving(true);
    const { error } = await upsertFloor({ ...floor, qr_start_node_id: selectedNode.id });
    setSaving(false);
    if (error) return showToast(error.message, 'error');
    setFloor({ ...floor, qr_start_node_id: selectedNode.id });
    showToast('QR start location set');
  };

  // ─── Render ───
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : toast.type === 'info' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-sm font-extrabold text-slate-900">{buildingName} — {floorName}</p>
            <p className="text-[10px] text-slate-500">
              {locations.length} rooms · {nodes.length} nodes · {edges.length} edges
              {floor?.qr_start_node_id && <span className="text-emerald-600 ml-2">✓ QR start set</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {saving && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
          <span className="text-slate-400 text-[10px]">Auto-saved to database</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 py-1.5 flex items-center gap-1 shrink-0 z-20 overflow-x-auto">
        {[
          { id: TOOLS.SELECT, icon: MousePointer2, label: 'Select' },
          { id: TOOLS.PAN, icon: Move, label: 'Pan' },
          { id: TOOLS.ADD_ROOM, icon: Square, label: 'Add Room' },
          { id: TOOLS.ADD_NODE, icon: Circle, label: 'Add Node' },
          { id: TOOLS.ADD_EDGE, icon: Link2, label: 'Connect' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => { setTool(t.id); setEdgeStartNode(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              tool === t.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <button onClick={() => handleZoom(1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={() => handleZoom(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={() => setViewBox({ x: 0, y: 0, w: 1200, h: 800 })} className="px-2 py-1 text-[10px] font-semibold text-slate-500 hover:text-slate-800 transition">
          Reset View
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* ─── SVG Canvas ─── */}
        <div className="flex-1 relative overflow-hidden">
          <svg
            ref={svgRef}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            className={`w-full h-full ${tool === TOOLS.PAN ? 'cursor-grab' : tool === TOOLS.ADD_ROOM ? 'cursor-crosshair' : tool === TOOLS.ADD_NODE ? 'cursor-copy' : 'cursor-default'} ${isPanning ? 'cursor-grabbing' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onClick={handleCanvasClick}
          >
            {/* Grid */}
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
              </pattern>
              <pattern id="gridLarge" width="200" height="200" patternUnits="userSpaceOnUse">
                <path d="M 200 0 L 0 0 0 200" fill="none" stroke="#cbd5e1" strokeWidth="1" />
              </pattern>
            </defs>
            <rect x={viewBox.x - 2000} y={viewBox.y - 2000} width={viewBox.w + 4000} height={viewBox.h + 4000} fill="url(#grid)" />
            <rect x={viewBox.x - 2000} y={viewBox.y - 2000} width={viewBox.w + 4000} height={viewBox.h + 4000} fill="url(#gridLarge)" />

            {/* Locations (rooms) */}
            {locations.map((loc) => {
              const sd = loc.shape_data || {};
              const isSelected = selectedLocation?.id === loc.id;
              if (sd.type === 'rect') {
                return (
                  <g key={loc.id} onClick={(e) => handleLocationClick(e, loc)} style={{ cursor: 'pointer' }}>
                    <rect
                      x={sd.x} y={sd.y} width={sd.width} height={sd.height}
                      fill={loc.fill_color || '#e2e8f0'}
                      fillOpacity={0.3}
                      stroke={isSelected ? '#4f46e5' : (loc.fill_color || '#94a3b8')}
                      strokeWidth={isSelected ? 3 : 1.5}
                      rx={4}
                    />
                    <text
                      x={sd.x + sd.width / 2} y={sd.y + sd.height / 2}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={11} fontWeight="700"
                      fill="#1e293b"
                    >
                      {loc.name}
                    </text>
                    <text
                      x={sd.x + sd.width / 2} y={sd.y + sd.height / 2 + 14}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={8} fill="#64748b"
                    >
                      {loc.location_type.replace('_', ' ')}
                    </text>
                  </g>
                );
              }
              return null;
            })}

            {/* Edges */}
            {edges.map((edge) => {
              const fromNode = nodes.find((n) => n.id === edge.from_node_id);
              const toNode = nodes.find((n) => n.id === edge.to_node_id);
              if (!fromNode || !toNode) return null;
              const isSelected = selectedEdge?.id === edge.id;
              return (
                <g key={edge.id} onClick={(e) => handleEdgeClick(e, edge)} style={{ cursor: 'pointer' }}>
                  <line
                    x1={fromNode.x} y1={fromNode.y} x2={toNode.x} y2={toNode.y}
                    stroke={edge.is_disabled ? '#fca5a5' : isSelected ? '#4f46e5' : edge.edge_type === 'stairs' ? '#ef4444' : edge.edge_type === 'lift' ? '#ec4899' : '#94a3b8'}
                    strokeWidth={isSelected ? 3 : 2}
                    strokeDasharray={edge.is_disabled ? '6 4' : edge.is_bidirectional ? 'none' : '8 4'}
                    opacity={edge.is_disabled ? 0.5 : 1}
                  />
                  {/* Distance label */}
                  <text
                    x={(fromNode.x + toNode.x) / 2} y={(fromNode.y + toNode.y) / 2 - 6}
                    textAnchor="middle" fontSize={8} fill="#64748b"
                  >
                    {Math.round(edge.distance)}m
                  </text>
                  {/* Direction arrow for one-way */}
                  {!edge.is_bidirectional && (
                    <polygon
                      points={(() => {
                        const mx = (fromNode.x + toNode.x) / 2;
                        const my = (fromNode.y + toNode.y) / 2;
                        const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
                        const s = 6;
                        return `${mx + s * Math.cos(angle)},${my + s * Math.sin(angle)} ${mx + s * Math.cos(angle + 2.5)},${my + s * Math.sin(angle + 2.5)} ${mx + s * Math.cos(angle - 2.5)},${my + s * Math.sin(angle - 2.5)}`;
                      })()}
                      fill="#64748b"
                    />
                  )}
                </g>
              );
            })}

            {/* Edge preview line when connecting */}
            {edgeStartNode && (
              <circle cx={edgeStartNode.x} cy={edgeStartNode.y} r={10} fill="none" stroke="#4f46e5" strokeWidth={2} strokeDasharray="4 2" />
            )}

            {/* Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const isQRStart = floor?.qr_start_node_id === node.id;
              const color = NODE_COLORS[node.node_type] || '#6b7280';
              return (
                <g key={node.id} onClick={(e) => handleNodeClick(e, node)} style={{ cursor: 'pointer' }}>
                  <circle
                    cx={node.x} cy={node.y} r={isSelected ? 8 : 6}
                    fill={isQRStart ? '#10b981' : color}
                    stroke={isSelected ? '#4f46e5' : isQRStart ? '#059669' : '#fff'}
                    strokeWidth={isSelected ? 3 : 2}
                    opacity={node.is_disabled ? 0.4 : 1}
                  />
                  {isQRStart && (
                    <text x={node.x} y={node.y - 12} textAnchor="middle" fontSize={9} fontWeight="800" fill="#059669">
                      QR ▼
                    </text>
                  )}
                  {node.label && (
                    <text x={node.x + 10} y={node.y + 3} fontSize={9} fontWeight="600" fill="#374151">
                      {node.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* ─── Properties Panel ─── */}
        <div className="w-72 bg-white border-l border-slate-200 overflow-y-auto shrink-0 hidden md:block">
          <div className="p-3 border-b border-slate-200">
            <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Properties</p>
          </div>

          {/* Room form */}
          {showRoomForm && (
            <div className="p-3 space-y-2.5 border-b border-slate-200">
              <p className="text-xs font-bold text-indigo-600">Add New Room</p>
              <input value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                placeholder="Room Name *" className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs" />
              <select value={roomForm.location_type} onChange={(e) => setRoomForm({ ...roomForm, location_type: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs">
                {Object.entries(LOCATION_COLORS).map(([k]) => (
                  <option key={k} value={k}>{k.replace('_', ' ')}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <input type="number" value={roomForm.width} onChange={(e) => setRoomForm({ ...roomForm, width: parseInt(e.target.value) || 100 })}
                  placeholder="Width" className="w-1/2 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs" />
                <input type="number" value={roomForm.height} onChange={(e) => setRoomForm({ ...roomForm, height: parseInt(e.target.value) || 60 })}
                  placeholder="Height" className="w-1/2 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveRoom} disabled={saving}
                  className="flex-1 px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50">
                  {saving ? 'Saving...' : 'Place Room'}
                </button>
                <button onClick={() => { setShowRoomForm(false); setTool(TOOLS.SELECT); }}
                  className="px-2.5 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold">Cancel</button>
              </div>
            </div>
          )}

          {/* Node edit */}
          {showNodeForm && selectedNode && (
            <div className="p-3 space-y-2.5 border-b border-slate-200">
              <p className="text-xs font-bold text-purple-600">Edit Node</p>
              <input value={nodeForm.label} onChange={(e) => setNodeForm({ ...nodeForm, label: e.target.value })}
                placeholder="Label" className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs" />
              <select value={nodeForm.node_type} onChange={(e) => setNodeForm({ ...nodeForm, node_type: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs">
                {Object.keys(NODE_COLORS).map((k) => (
                  <option key={k} value={k}>{k.replace('_', ' ')}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400">Position: ({selectedNode.x}, {selectedNode.y})</p>
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={handleUpdateNode} disabled={saving}
                  className="flex-1 px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50">
                  Save
                </button>
                <button onClick={handleSetQRStart}
                  className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition" title="Set as QR start point">
                  Set QR Start
                </button>
                <button onClick={handleDeleteNode}
                  className="px-2.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition">
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* Edge edit */}
          {showEdgeForm && selectedEdge && (
            <div className="p-3 space-y-2.5 border-b border-slate-200">
              <p className="text-xs font-bold text-amber-600">Edit Edge</p>
              <label className="text-[10px] text-slate-500 block">Distance (meters)</label>
              <input type="number" value={edgeForm.distance} onChange={(e) => setEdgeForm({ ...edgeForm, distance: Math.max(0, parseFloat(e.target.value) || 0) })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs" min={0} />
              <select value={edgeForm.edge_type} onChange={(e) => setEdgeForm({ ...edgeForm, edge_type: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs">
                <option value="walkway">Walkway</option>
                <option value="stairs">Stairs</option>
                <option value="lift">Lift</option>
                <option value="ramp">Ramp</option>
              </select>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" checked={edgeForm.is_bidirectional} onChange={(e) => setEdgeForm({ ...edgeForm, is_bidirectional: e.target.checked })} className="rounded" />
                Bidirectional
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" checked={edgeForm.is_disabled} onChange={(e) => setEdgeForm({ ...edgeForm, is_disabled: e.target.checked })} className="rounded" />
                Disabled (excluded from routing)
              </label>
              <div className="flex gap-2">
                <button onClick={handleUpdateEdge} disabled={saving}
                  className="flex-1 px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50">
                  Save
                </button>
                <button onClick={handleDeleteEdge}
                  className="px-2.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition">
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* Selected location info */}
          {selectedLocation && !showRoomForm && (
            <div className="p-3 space-y-2.5 border-b border-slate-200">
              <p className="text-xs font-bold text-blue-600">Room: {selectedLocation.name}</p>
              <p className="text-[10px] text-slate-500">Type: {selectedLocation.location_type.replace('_', ' ')}</p>
              <button onClick={handleDeleteLocation}
                className="w-full px-2.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition">
                Delete Room
              </button>
            </div>
          )}

          {/* Instructions */}
          {!showRoomForm && !showNodeForm && !showEdgeForm && !selectedLocation && (
            <div className="p-3 space-y-3 text-[10px] text-slate-500">
              <div className="space-y-1.5">
                <p className="font-bold text-slate-700 text-xs">Quick Guide</p>
                <p>• <strong>Add Room</strong> → click canvas → name & save</p>
                <p>• <strong>Add Node</strong> → click canvas to place waypoints</p>
                <p>• <strong>Connect</strong> → click first node, then second</p>
                <p>• Click any element to edit/delete</p>
                <p>• Set a node as <strong>QR Start</strong> for scan entry point</p>
                <p>• <strong>Scroll</strong> to zoom, <strong>Pan</strong> tool to move</p>
              </div>

              {/* Graph validation */}
              <div className="pt-2 border-t border-slate-200">
                <p className="font-bold text-slate-700 text-xs mb-1">Graph Status</p>
                {(() => {
                  const v = validateGraph(nodes, edges);
                  return v.valid
                    ? <p className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Valid graph</p>
                    : <div className="space-y-1 text-red-600">{v.issues.slice(0, 3).map((iss, i) => <p key={i}>⚠ {iss}</p>)}</div>;
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
