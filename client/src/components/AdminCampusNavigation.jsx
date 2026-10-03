// agent-notes: { ctx: "Admin Campus Navigation management: building/floor CRUD, floor-map editor launcher, QR generation", deps: ["src/services/indoorNavDataService.js", "src/context/AppContext.jsx", "lucide-react", "qrcode.react"], state: "active", last: "antigravity@2026-10-03" }

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  fetchBuildings, upsertBuilding, deleteBuilding,
  fetchFloors, upsertFloor, deleteFloor,
  fetchFloorMapData, upsertFloorQR,
} from '../services/indoorNavDataService';
import FloorMapEditor from './FloorMapEditor';
import {
  Building2, Plus, Pencil, Trash2, ChevronRight, Layers,
  MapPin, QrCode, Eye, EyeOff, Download, ArrowLeft, Loader2,
  Save, X, AlertCircle, CheckCircle2, Globe,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

// ─── Configurable base URL for QR codes ───
const BASE_URL = typeof window !== 'undefined'
  ? window.location.origin
  : (import.meta.env.VITE_APP_BASE_URL || 'https://smart-sympo.vercel.app');

// ─── Location type config ───
const LOCATION_TYPES = [
  { value: 'classroom', label: 'Classroom', color: '#3b82f6' },
  { value: 'laboratory', label: 'Laboratory', color: '#8b5cf6' },
  { value: 'department', label: 'Department', color: '#0ea5e9' },
  { value: 'seminar_hall', label: 'Seminar Hall', color: '#f59e0b' },
  { value: 'entrance', label: 'Entrance', color: '#10b981' },
  { value: 'corridor', label: 'Corridor', color: '#64748b' },
  { value: 'stairs', label: 'Stairs', color: '#ef4444' },
  { value: 'lift', label: 'Lift', color: '#ec4899' },
  { value: 'restroom', label: 'Restroom', color: '#06b6d4' },
  { value: 'other', label: 'Other', color: '#94a3b8' },
];

export default function AdminCampusNavigation() {
  const { currentUser } = useApp();
  const isAdmin = currentUser?.role === 'admin';

  // ─── State ───
  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [floors, setFloors] = useState([]);
  const [editingFloor, setEditingFloor] = useState(null); // floor being edited in the map editor
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Building form
  const [showBuildingForm, setShowBuildingForm] = useState(false);
  const [buildingForm, setBuildingForm] = useState({ name: '', short_name: '', description: '' });
  const [editingBuildingId, setEditingBuildingId] = useState(null);

  // Floor form
  const [showFloorForm, setShowFloorForm] = useState(false);
  const [floorForm, setFloorForm] = useState({ name: '', floor_number: 0 });
  const [editingFloorId, setEditingFloorId] = useState(null);

  // QR preview
  const [qrPreviewFloor, setQrPreviewFloor] = useState(null);

  // ─── Toast helper ───
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ─── Load buildings ───
  const loadBuildings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchBuildings();
    if (error) showToast(error.message, 'error');
    setBuildings(data || []);
    setLoading(false);
  }, [showToast]);

  useEffect(() => { loadBuildings(); }, [loadBuildings]);

  // ─── Load floors when building selected ───
  const loadFloors = useCallback(async (buildingId) => {
    if (!buildingId) { setFloors([]); return; }
    const { data, error } = await fetchFloors(buildingId);
    if (error) showToast(error.message, 'error');
    setFloors(data || []);
  }, [showToast]);

  useEffect(() => {
    if (selectedBuilding) loadFloors(selectedBuilding.id);
    else setFloors([]);
  }, [selectedBuilding, loadFloors]);

  // ─── Building CRUD ───
  const handleSaveBuilding = async () => {
    if (!buildingForm.name.trim()) return showToast('Building name is required', 'error');
    setSaving(true);
    const { data, error } = await upsertBuilding({
      ...(editingBuildingId ? { id: editingBuildingId } : {}),
      ...buildingForm,
    });
    setSaving(false);
    if (error) return showToast(error.message, 'error');
    showToast(editingBuildingId ? 'Building updated' : 'Building created');
    setShowBuildingForm(false);
    setBuildingForm({ name: '', short_name: '', description: '' });
    setEditingBuildingId(null);
    await loadBuildings();
    if (data) setSelectedBuilding(data);
  };

  const handleDeleteBuilding = async (id) => {
    if (!window.confirm('Delete this building and ALL its floors/maps? This cannot be undone.')) return;
    const { error } = await deleteBuilding(id);
    if (error) return showToast(error.message, 'error');
    showToast('Building deleted');
    if (selectedBuilding?.id === id) setSelectedBuilding(null);
    await loadBuildings();
  };

  // ─── Floor CRUD ───
  const handleSaveFloor = async () => {
    if (!floorForm.name.trim()) return showToast('Floor name is required', 'error');
    if (!selectedBuilding) return showToast('Select a building first', 'error');
    setSaving(true);
    const { error } = await upsertFloor({
      ...(editingFloorId ? { id: editingFloorId } : {}),
      building_id: selectedBuilding.id,
      ...floorForm,
    });
    setSaving(false);
    if (error) return showToast(error.message, 'error');
    showToast(editingFloorId ? 'Floor updated' : 'Floor created');
    setShowFloorForm(false);
    setFloorForm({ name: '', floor_number: 0 });
    setEditingFloorId(null);
    await loadFloors(selectedBuilding.id);
  };

  const handleDeleteFloor = async (id) => {
    if (!window.confirm('Delete this floor and its entire map? This cannot be undone.')) return;
    const { error } = await deleteFloor(id);
    if (error) return showToast(error.message, 'error');
    showToast('Floor deleted');
    await loadFloors(selectedBuilding.id);
  };

  const handleTogglePublish = async (floor) => {
    setSaving(true);
    const { error } = await upsertFloor({ ...floor, is_published: !floor.is_published });
    setSaving(false);
    if (error) return showToast(error.message, 'error');
    showToast(floor.is_published ? 'Floor unpublished' : 'Floor published');
    await loadFloors(selectedBuilding.id);
  };

  // ─── QR Code ───
  const handleGenerateQR = async (floor) => {
    const qrUrl = `${BASE_URL}/navigate/floor/${floor.id}`;
    setSaving(true);
    const { error } = await upsertFloorQR(floor.id, qrUrl);
    setSaving(false);
    if (error) return showToast(error.message, 'error');
    showToast('QR code generated');
    setQrPreviewFloor({ ...floor, qr_url: qrUrl });
  };

  const downloadQR = () => {
    const svg = document.getElementById('floor-qr-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      const a = document.createElement('a');
      a.download = `floor-qr-${qrPreviewFloor?.name || 'map'}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // ─── If editing a floor map, show the full editor ───
  if (editingFloor) {
    return (
      <FloorMapEditor
        floorId={editingFloor.id}
        buildingName={selectedBuilding?.name || ''}
        floorName={editingFloor.name}
        onBack={() => {
          setEditingFloor(null);
          loadFloors(selectedBuilding?.id);
        }}
      />
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <AlertCircle className="w-5 h-5 mr-2" />
        Admin access required
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 animate-slideInRight ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">Campus Navigation Manager</h1>
            <p className="text-xs text-slate-500">Create buildings, draw floor maps, generate QR codes</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Buildings Panel ─── */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Building2 className="w-4 h-4 text-indigo-500" />
              Buildings
            </div>
            <button
              onClick={() => { setShowBuildingForm(true); setEditingBuildingId(null); setBuildingForm({ name: '', short_name: '', description: '' }); }}
              className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {showBuildingForm && (
            <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3">
              <input
                value={buildingForm.name} onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })}
                placeholder="Building Name *" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <input
                value={buildingForm.short_name} onChange={(e) => setBuildingForm({ ...buildingForm, short_name: e.target.value })}
                placeholder="Short Name" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <textarea
                value={buildingForm.description} onChange={(e) => setBuildingForm({ ...buildingForm, description: e.target.value })}
                placeholder="Description" rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <div className="flex gap-2">
                <button onClick={handleSaveBuilding} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {editingBuildingId ? 'Update' : 'Create'}
                </button>
                <button onClick={() => setShowBuildingForm(false)} className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 transition">
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /></div>
            ) : buildings.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">No buildings yet. Create one to start.</div>
            ) : (
              buildings.map((b) => (
                <div
                  key={b.id}
                  className={`px-4 py-3 border-b border-slate-100 cursor-pointer transition hover:bg-indigo-50 flex items-center justify-between ${
                    selectedBuilding?.id === b.id ? 'bg-indigo-50 border-l-2 border-l-indigo-600' : ''
                  }`}
                  onClick={() => setSelectedBuilding(b)}
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800">{b.name}</p>
                    {b.short_name && <p className="text-xs text-slate-500">{b.short_name}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); setEditingBuildingId(b.id); setBuildingForm({ name: b.name, short_name: b.short_name || '', description: b.description || '' }); setShowBuildingForm(true); }}
                      className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteBuilding(b.id); }}
                      className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ─── Floors Panel ─── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Layers className="w-4 h-4 text-purple-500" />
              {selectedBuilding ? `Floors — ${selectedBuilding.name}` : 'Select a Building'}
            </div>
            {selectedBuilding && (
              <button
                onClick={() => { setShowFloorForm(true); setEditingFloorId(null); setFloorForm({ name: '', floor_number: floors.length }); }}
                className="p-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {showFloorForm && (
            <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3">
              <input
                value={floorForm.name} onChange={(e) => setFloorForm({ ...floorForm, name: e.target.value })}
                placeholder="Floor Name (e.g., Ground Floor) *" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <input
                type="number" value={floorForm.floor_number} onChange={(e) => setFloorForm({ ...floorForm, floor_number: parseInt(e.target.value) || 0 })}
                placeholder="Floor Number" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <div className="flex gap-2">
                <button onClick={handleSaveFloor} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition disabled:opacity-50">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {editingFloorId ? 'Update' : 'Create'}
                </button>
                <button onClick={() => setShowFloorForm(false)} className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 transition">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!selectedBuilding ? (
            <div className="p-8 text-center text-xs text-slate-400 space-y-2">
              <Building2 className="w-8 h-8 mx-auto text-slate-300" />
              <p>Select a building from the left to view and manage its floors.</p>
            </div>
          ) : floors.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 space-y-2">
              <Layers className="w-8 h-8 mx-auto text-slate-300" />
              <p>No floors yet. Add a floor to start drawing maps.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {floors.map((floor) => (
                <div key={floor.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-extrabold ${
                      floor.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      F{floor.floor_number}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{floor.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          floor.is_published
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {floor.is_published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setEditingFloor(floor)} title="Edit Floor Map"
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> Edit Map
                    </button>
                    <button onClick={() => handleTogglePublish(floor)} title={floor.is_published ? 'Unpublish' : 'Publish'}
                      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition">
                      {floor.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {floor.is_published && (
                      <button onClick={() => handleGenerateQR(floor)} title="Generate QR Code"
                        className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition">
                        <QrCode className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => { setEditingFloorId(floor.id); setFloorForm({ name: floor.name, floor_number: floor.floor_number }); setShowFloorForm(true); }}
                      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 transition">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteFloor(floor.id)}
                      className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── QR Code Preview Modal ─── */}
      {qrPreviewFloor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setQrPreviewFloor(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-800">Floor QR Code</h3>
              <button onClick={() => setQrPreviewFloor(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="bg-white p-4 rounded-xl border-2 border-slate-200">
                <QRCodeSVG
                  id="floor-qr-svg"
                  value={qrPreviewFloor.qr_url}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-xs text-slate-600 font-semibold text-center">{qrPreviewFloor.name}</p>
              <p className="text-[10px] text-slate-400 font-mono break-all text-center">{qrPreviewFloor.qr_url}</p>
              <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-semibold">
                <Globe className="w-3 h-3" /> Opens navigation page on any device
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={downloadQR}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition">
                <Download className="w-3.5 h-3.5" /> Download PNG
              </button>
              <button onClick={() => setQrPreviewFloor(null)}
                className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
