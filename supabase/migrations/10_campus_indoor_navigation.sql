-- =============================================================
-- 10: Campus Indoor Navigation (Buildings, Floors, Locations,
--     Route Nodes, Edges, Floor QR Codes)
-- =============================================================

-- 1. CAMPUS BUILDINGS
CREATE TABLE IF NOT EXISTS public.campus_buildings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CAMPUS FLOORS
CREATE TABLE IF NOT EXISTS public.campus_floors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID NOT NULL REFERENCES public.campus_buildings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  floor_number INT NOT NULL DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  svg_view_box TEXT DEFAULT '0 0 1200 800',
  qr_start_node_id UUID,  -- filled after nodes are created
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(building_id, floor_number)
);

-- 3. CAMPUS LOCATIONS (rooms, labs, halls drawn on the map)
CREATE TABLE IF NOT EXISTS public.campus_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  floor_id UUID NOT NULL REFERENCES public.campus_floors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'classroom'
    CHECK (location_type IN (
      'classroom', 'laboratory', 'department', 'seminar_hall',
      'entrance', 'corridor', 'stairs', 'lift', 'restroom', 'other'
    )),
  -- SVG shape data stored as JSON:
  -- { "type": "rect"|"polygon", "x": n, "y": n, "width": n, "height": n, "points": [...] }
  shape_data JSONB NOT NULL DEFAULT '{}',
  label_offset JSONB DEFAULT '{"x": 0, "y": 0}',
  fill_color TEXT DEFAULT '#e2e8f0',
  is_searchable BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CAMPUS ROUTE NODES (graph vertices for pathfinding)
CREATE TABLE IF NOT EXISTS public.campus_nodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  floor_id UUID NOT NULL REFERENCES public.campus_floors(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.campus_locations(id) ON DELETE SET NULL,
  x DOUBLE PRECISION NOT NULL,
  y DOUBLE PRECISION NOT NULL,
  node_type TEXT NOT NULL DEFAULT 'waypoint'
    CHECK (node_type IN (
      'waypoint', 'entrance', 'stairs', 'lift', 'room_door', 'corridor_junction'
    )),
  label TEXT,
  is_disabled BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK for qr_start_node_id now that campus_nodes exists
ALTER TABLE public.campus_floors
  ADD CONSTRAINT fk_qr_start_node
  FOREIGN KEY (qr_start_node_id) REFERENCES public.campus_nodes(id)
  ON DELETE SET NULL;

-- 5. CAMPUS EDGES (graph edges for pathfinding)
CREATE TABLE IF NOT EXISTS public.campus_edges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  floor_id UUID NOT NULL REFERENCES public.campus_floors(id) ON DELETE CASCADE,
  from_node_id UUID NOT NULL REFERENCES public.campus_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES public.campus_nodes(id) ON DELETE CASCADE,
  distance DOUBLE PRECISION NOT NULL CHECK (distance >= 0),
  is_bidirectional BOOLEAN DEFAULT true,
  is_disabled BOOLEAN DEFAULT false,
  is_accessible BOOLEAN DEFAULT true,
  edge_type TEXT DEFAULT 'walkway'
    CHECK (edge_type IN ('walkway', 'stairs', 'lift', 'ramp')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent duplicate edges between same node pair on same floor
  CONSTRAINT no_self_loop CHECK (from_node_id <> to_node_id)
);

-- 6. CAMPUS FLOOR QR CODES (one per published floor)
CREATE TABLE IF NOT EXISTS public.campus_floor_qr_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  floor_id UUID NOT NULL REFERENCES public.campus_floors(id) ON DELETE CASCADE UNIQUE,
  qr_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =================== INDEXES ===================
CREATE INDEX IF NOT EXISTS idx_campus_floors_building ON public.campus_floors(building_id);
CREATE INDEX IF NOT EXISTS idx_campus_locations_floor ON public.campus_locations(floor_id);
CREATE INDEX IF NOT EXISTS idx_campus_nodes_floor ON public.campus_nodes(floor_id);
CREATE INDEX IF NOT EXISTS idx_campus_edges_floor ON public.campus_edges(floor_id);
CREATE INDEX IF NOT EXISTS idx_campus_edges_from ON public.campus_edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_campus_edges_to ON public.campus_edges(to_node_id);
CREATE INDEX IF NOT EXISTS idx_campus_nodes_location ON public.campus_nodes(location_id);

-- =================== RLS POLICIES ===================

-- Buildings: admins can CRUD, everyone can read active
ALTER TABLE public.campus_buildings ENABLE ROW LEVEL SECURITY;

CREATE POLICY campus_buildings_read ON public.campus_buildings
  FOR SELECT USING (true);

CREATE POLICY campus_buildings_admin_insert ON public.campus_buildings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY campus_buildings_admin_update ON public.campus_buildings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY campus_buildings_admin_delete ON public.campus_buildings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Floors: admins can CRUD, everyone can read published
ALTER TABLE public.campus_floors ENABLE ROW LEVEL SECURITY;

CREATE POLICY campus_floors_read ON public.campus_floors
  FOR SELECT USING (true);

CREATE POLICY campus_floors_admin_insert ON public.campus_floors
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY campus_floors_admin_update ON public.campus_floors
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY campus_floors_admin_delete ON public.campus_floors
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Locations: admins can CRUD, everyone can read
ALTER TABLE public.campus_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY campus_locations_read ON public.campus_locations
  FOR SELECT USING (true);

CREATE POLICY campus_locations_admin_insert ON public.campus_locations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY campus_locations_admin_update ON public.campus_locations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY campus_locations_admin_delete ON public.campus_locations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Nodes: admins can CRUD, everyone can read
ALTER TABLE public.campus_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY campus_nodes_read ON public.campus_nodes
  FOR SELECT USING (true);

CREATE POLICY campus_nodes_admin_insert ON public.campus_nodes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY campus_nodes_admin_update ON public.campus_nodes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY campus_nodes_admin_delete ON public.campus_nodes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Edges: admins can CRUD, everyone can read
ALTER TABLE public.campus_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY campus_edges_read ON public.campus_edges
  FOR SELECT USING (true);

CREATE POLICY campus_edges_admin_insert ON public.campus_edges
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY campus_edges_admin_update ON public.campus_edges
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY campus_edges_admin_delete ON public.campus_edges
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- QR Codes: admins can CRUD, everyone can read active
ALTER TABLE public.campus_floor_qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY campus_qr_read ON public.campus_floor_qr_codes
  FOR SELECT USING (true);

CREATE POLICY campus_qr_admin_insert ON public.campus_floor_qr_codes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY campus_qr_admin_update ON public.campus_floor_qr_codes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY campus_qr_admin_delete ON public.campus_floor_qr_codes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.campus_buildings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campus_floors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campus_locations;
