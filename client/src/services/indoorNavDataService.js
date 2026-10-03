// agent-notes: { ctx: "Supabase data access layer for campus indoor navigation tables", deps: ["src/supabaseClient.js"], state: "active", last: "antigravity@2026-10-03" }

import { supabase, isMockMode } from '../supabaseClient';

// ═══════════════════════════════════════════
// BUILDINGS
// ═══════════════════════════════════════════

export async function fetchBuildings() {
  if (isMockMode) return { data: [], error: null };
  const { data, error } = await supabase
    .from('campus_buildings')
    .select('*')
    .order('name');
  return { data: data || [], error };
}

export async function upsertBuilding(building) {
  if (isMockMode) return { data: null, error: { message: 'Mock mode: cannot save' } };
  const payload = {
    name: building.name,
    short_name: building.short_name || null,
    description: building.description || null,
    is_active: building.is_active !== false,
    updated_at: new Date().toISOString(),
  };
  if (building.id) {
    const { data, error } = await supabase
      .from('campus_buildings')
      .update(payload)
      .eq('id', building.id)
      .select()
      .single();
    return { data, error };
  } else {
    const { data, error } = await supabase
      .from('campus_buildings')
      .insert(payload)
      .select()
      .single();
    return { data, error };
  }
}

export async function deleteBuilding(id) {
  if (isMockMode) return { error: null };
  const { error } = await supabase.from('campus_buildings').delete().eq('id', id);
  return { error };
}

// ═══════════════════════════════════════════
// FLOORS
// ═══════════════════════════════════════════

export async function fetchFloors(buildingId) {
  if (isMockMode) return { data: [], error: null };
  let query = supabase.from('campus_floors').select('*').order('floor_number');
  if (buildingId) query = query.eq('building_id', buildingId);
  const { data, error } = await query;
  return { data: data || [], error };
}

export async function fetchFloorById(floorId) {
  if (isMockMode) return { data: null, error: null };
  const { data, error } = await supabase
    .from('campus_floors')
    .select('*, campus_buildings(name, short_name)')
    .eq('id', floorId)
    .single();
  return { data, error };
}

export async function upsertFloor(floor) {
  if (isMockMode) return { data: null, error: { message: 'Mock mode' } };
  const payload = {
    building_id: floor.building_id,
    name: floor.name,
    floor_number: floor.floor_number,
    is_published: floor.is_published || false,
    svg_view_box: floor.svg_view_box || '0 0 1200 800',
    qr_start_node_id: floor.qr_start_node_id || null,
    updated_at: new Date().toISOString(),
  };
  if (floor.id) {
    const { data, error } = await supabase
      .from('campus_floors')
      .update(payload)
      .eq('id', floor.id)
      .select()
      .single();
    return { data, error };
  } else {
    const { data, error } = await supabase
      .from('campus_floors')
      .insert(payload)
      .select()
      .single();
    return { data, error };
  }
}

export async function deleteFloor(id) {
  if (isMockMode) return { error: null };
  const { error } = await supabase.from('campus_floors').delete().eq('id', id);
  return { error };
}

// ═══════════════════════════════════════════
// LOCATIONS (rooms, labs, halls on the map)
// ═══════════════════════════════════════════

export async function fetchLocations(floorId) {
  if (isMockMode) return { data: [], error: null };
  const { data, error } = await supabase
    .from('campus_locations')
    .select('*')
    .eq('floor_id', floorId)
    .order('name');
  return { data: data || [], error };
}

export async function upsertLocation(loc) {
  if (isMockMode) return { data: null, error: { message: 'Mock mode' } };
  const payload = {
    floor_id: loc.floor_id,
    name: loc.name,
    location_type: loc.location_type || 'classroom',
    shape_data: loc.shape_data || {},
    label_offset: loc.label_offset || { x: 0, y: 0 },
    fill_color: loc.fill_color || '#e2e8f0',
    is_searchable: loc.is_searchable !== false,
    metadata: loc.metadata || {},
    updated_at: new Date().toISOString(),
  };
  if (loc.id) {
    const { data, error } = await supabase
      .from('campus_locations')
      .update(payload)
      .eq('id', loc.id)
      .select()
      .single();
    return { data, error };
  } else {
    const { data, error } = await supabase
      .from('campus_locations')
      .insert(payload)
      .select()
      .single();
    return { data, error };
  }
}

export async function deleteLocation(id) {
  if (isMockMode) return { error: null };
  const { error } = await supabase.from('campus_locations').delete().eq('id', id);
  return { error };
}

// ═══════════════════════════════════════════
// NODES (route graph vertices)
// ═══════════════════════════════════════════

export async function fetchNodes(floorId) {
  if (isMockMode) return { data: [], error: null };
  let query = supabase.from('campus_nodes').select('*');
  if (floorId) query = query.eq('floor_id', floorId);
  const { data, error } = await query;
  return { data: data || [], error };
}

export async function upsertNode(node) {
  if (isMockMode) return { data: null, error: { message: 'Mock mode' } };
  const payload = {
    floor_id: node.floor_id,
    location_id: node.location_id || null,
    x: node.x,
    y: node.y,
    node_type: node.node_type || 'waypoint',
    label: node.label || null,
    is_disabled: node.is_disabled || false,
    metadata: node.metadata || {},
    updated_at: new Date().toISOString(),
  };
  if (node.id) {
    const { data, error } = await supabase
      .from('campus_nodes')
      .update(payload)
      .eq('id', node.id)
      .select()
      .single();
    return { data, error };
  } else {
    const { data, error } = await supabase
      .from('campus_nodes')
      .insert(payload)
      .select()
      .single();
    return { data, error };
  }
}

export async function deleteNode(id) {
  if (isMockMode) return { error: null };
  const { error } = await supabase.from('campus_nodes').delete().eq('id', id);
  return { error };
}

// ═══════════════════════════════════════════
// EDGES (route graph edges)
// ═══════════════════════════════════════════

export async function fetchEdges(floorId) {
  if (isMockMode) return { data: [], error: null };
  let query = supabase.from('campus_edges').select('*');
  if (floorId) query = query.eq('floor_id', floorId);
  const { data, error } = await query;
  return { data: data || [], error };
}

export async function upsertEdge(edge) {
  if (isMockMode) return { data: null, error: { message: 'Mock mode' } };
  if (edge.from_node_id === edge.to_node_id) {
    return { data: null, error: { message: 'Cannot create self-loop edge' } };
  }
  if (edge.distance < 0) {
    return { data: null, error: { message: 'Edge distance must be non-negative' } };
  }
  const payload = {
    floor_id: edge.floor_id,
    from_node_id: edge.from_node_id,
    to_node_id: edge.to_node_id,
    distance: edge.distance,
    is_bidirectional: edge.is_bidirectional !== false,
    is_disabled: edge.is_disabled || false,
    is_accessible: edge.is_accessible !== false,
    edge_type: edge.edge_type || 'walkway',
    metadata: edge.metadata || {},
    updated_at: new Date().toISOString(),
  };
  if (edge.id) {
    const { data, error } = await supabase
      .from('campus_edges')
      .update(payload)
      .eq('id', edge.id)
      .select()
      .single();
    return { data, error };
  } else {
    const { data, error } = await supabase
      .from('campus_edges')
      .insert(payload)
      .select()
      .single();
    return { data, error };
  }
}

export async function deleteEdge(id) {
  if (isMockMode) return { error: null };
  const { error } = await supabase.from('campus_edges').delete().eq('id', id);
  return { error };
}

// ═══════════════════════════════════════════
// QR CODES
// ═══════════════════════════════════════════

export async function fetchFloorQR(floorId) {
  if (isMockMode) return { data: null, error: null };
  const { data, error } = await supabase
    .from('campus_floor_qr_codes')
    .select('*')
    .eq('floor_id', floorId)
    .maybeSingle();
  return { data, error };
}

export async function upsertFloorQR(floorId, qrUrl) {
  if (isMockMode) return { data: null, error: { message: 'Mock mode' } };
  // Check if exists
  const { data: existing } = await supabase
    .from('campus_floor_qr_codes')
    .select('id')
    .eq('floor_id', floorId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('campus_floor_qr_codes')
      .update({ qr_url: qrUrl, is_active: true, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    return { data, error };
  } else {
    const { data, error } = await supabase
      .from('campus_floor_qr_codes')
      .insert({ floor_id: floorId, qr_url: qrUrl, is_active: true })
      .select()
      .single();
    return { data, error };
  }
}

// ═══════════════════════════════════════════
// BULK FETCH for a floor (admin editor)
// ═══════════════════════════════════════════

export async function fetchFloorMapData(floorId) {
  if (isMockMode) {
    return { floor: null, locations: [], nodes: [], edges: [], qr: null, error: null };
  }

  const [floorRes, locRes, nodeRes, edgeRes, qrRes] = await Promise.all([
    fetchFloorById(floorId),
    fetchLocations(floorId),
    fetchNodes(floorId),
    fetchEdges(floorId),
    fetchFloorQR(floorId),
  ]);

  return {
    floor: floorRes.data,
    locations: locRes.data || [],
    nodes: nodeRes.data || [],
    edges: edgeRes.data || [],
    qr: qrRes.data,
    error: floorRes.error || locRes.error || nodeRes.error || edgeRes.error || null,
  };
}
