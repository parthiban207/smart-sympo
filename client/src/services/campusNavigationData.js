// agent-notes: { ctx: "Campus navigation landmarks, venues, and building geographic data", deps: [], state: "active", last: "antigravity@2026-09-24" }

export const CAMPUSES = [
  {
    id: 'main-campus',
    name: 'College of Engineering & Technology (Main Campus)',
    shortName: 'Main Campus',
    city: 'Chennai, Tamil Nadu',
    center: [13.0827, 80.2707],
    defaultZoom: 18,
    address: 'Sardar Patel Road, Guindy, Chennai 600025',
    googleMapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=13.0827,80.2707',
  },
  {
    id: 'city-campus',
    name: 'City Innovation & Incubation Center (Annex Campus)',
    shortName: 'City Annex',
    city: 'T. Nagar, Chennai',
    center: [13.0418, 80.2341],
    defaultZoom: 18,
    address: 'G.N. Chetty Road, T. Nagar, Chennai 600017',
    googleMapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=13.0418,80.2341',
  },
];

// Campus Buildings / Boundary Polygons for Main Campus
export const CAMPUS_BUILDINGS = [
  {
    id: 'b-auditorium',
    name: 'Grand Auditorium Complex',
    color: '#8b5cf6',
    polygon: [
      [13.0831, 80.2698],
      [13.0835, 80.2699],
      [13.0834, 80.2704],
      [13.0830, 80.2703],
    ],
  },
  {
    id: 'b-tech-block',
    name: 'Tech Block (CSE, IT & AI)',
    color: '#3b82f6',
    polygon: [
      [13.0828, 80.2709],
      [13.0833, 80.2710],
      [13.0832, 80.2716],
      [13.0827, 80.2715],
    ],
  },
  {
    id: 'b-admin-quad',
    name: 'Administrative Quad & Central Lawn',
    color: '#10b981',
    polygon: [
      [13.0821, 80.2701],
      [13.0826, 80.2702],
      [13.0825, 80.2708],
      [13.0820, 80.2707],
    ],
  },
  {
    id: 'b-library',
    name: 'Central Library & Research Center',
    color: '#06b6d4',
    polygon: [
      [13.0834, 80.2705],
      [13.0838, 80.2706],
      [13.0837, 80.2712],
      [13.0833, 80.2711],
    ],
  },
  {
    id: 'b-canteen',
    name: 'Student Cafeteria & Food Court',
    color: '#f59e0b',
    polygon: [
      [13.0818, 80.2710],
      [13.0823, 80.2711],
      [13.0822, 80.2717],
      [13.0817, 80.2716],
    ],
  },
];

// Physical Landmarks with QR code encoding for "You Are Here" wayfinding
export const CAMPUS_LANDMARKS = [
  {
    id: 'MAIN_GATE',
    code: 'SMARTSYMPO:LOC:MAIN_GATE',
    name: 'Main Entrance Arch & Welcome Booth',
    building: 'Campus Perimeter',
    floor: 0,
    coords: [13.0822, 80.2694],
    category: 'gate',
    description: 'Main campus security entrance on Sardar Patel Road. Security kiosk and symposium welcome banners.',
    instructions: 'Walk 60m east towards the Admin Quad for symposium registration.',
  },
  {
    id: 'REGISTRATION_QUAD',
    code: 'SMARTSYMPO:LOC:REGISTRATION_QUAD',
    name: 'Admin Quad & Registration Desks',
    building: 'Admin Quad',
    floor: 0,
    coords: [13.0823, 80.2704],
    category: 'helpdesk',
    description: 'Central helpdesk, kit distribution, and on-spot participant badge verification.',
    instructions: 'Turn left toward the Grand Auditorium, or head east into the Tech Block.',
  },
  {
    id: 'AUDITORIUM_FOYER',
    code: 'SMARTSYMPO:LOC:AUDITORIUM_FOYER',
    name: 'Main Auditorium Grand Portico',
    building: 'Auditorium Complex',
    floor: 0,
    coords: [13.0832, 80.2701],
    category: 'hall',
    description: 'Ground floor grand entrance to Hall 1 (Main Auditorium) for Keynotes and Paper presentations.',
    instructions: 'Enter double glass doors for Main Hall. Restrooms on the left corridor.',
  },
  {
    id: 'TECH_BLOCK_STAIRS',
    code: 'SMARTSYMPO:LOC:TECH_BLOCK_STAIRS',
    name: 'Tech Block - Main Staircase & Lift Lobby',
    building: 'Tech Block',
    floor: 1,
    coords: [13.0830, 80.2712],
    category: 'hall',
    description: 'Staircase access to 1st Floor Computing Lab (Hall 2) and 2nd Floor IoT Sandbox.',
    instructions: 'Take stairs to 1st floor, Hall 2 is directly across room 104.',
  },
  {
    id: 'LIBRARY_LAWN',
    code: 'SMARTSYMPO:LOC:LIBRARY_LAWN',
    name: 'Central Library Front Lawn',
    building: 'Central Library',
    floor: 0,
    coords: [13.0835, 80.2708],
    category: 'helpdesk',
    description: 'Symposium poster display pavilions and networking lounge.',
    instructions: 'Follow paved walkway south toward Admin Quad or west to Auditorium.',
  },
  {
    id: 'CANTEEN_COURT',
    code: 'SMARTSYMPO:LOC:CANTEEN_COURT',
    name: 'Campus Canteen & Refreshment Junction',
    building: 'Cafeteria',
    floor: 0,
    coords: [13.0820, 80.2713],
    category: 'food',
    description: 'Symposium lunch buffet, morning breakfast tokens, and tea/coffee stalls.',
    instructions: 'Water dispensers available at all counters.',
  },
  {
    id: 'NORTH_GATE_PARKING',
    code: 'SMARTSYMPO:LOC:NORTH_GATE_PARKING',
    name: 'North Gate & Guest Parking Area',
    building: 'Campus Perimeter',
    floor: 0,
    coords: [13.0839, 80.2702],
    category: 'parking',
    description: 'Designated parking for participant vehicles and outstation college college buses.',
    instructions: 'Follow path south towards the Auditorium entrance (90m).',
  },
];

// Symposium Venues & Points of Interest
export const CAMPUS_VENUES = [
  {
    id: 'venue-hall-1',
    name: 'Hall 1 (Main Auditorium)',
    synonyms: ['Hall 1', 'Main Auditorium', 'Auditorium'],
    building: 'Auditorium Complex',
    floor: 0,
    floorLabel: 'Ground Floor',
    coords: [13.0833, 80.2701],
    category: 'hall',
    type: 'Auditorium',
    capacity: 250,
    airConditioned: true,
    description: 'Main auditorium with 4K projection, Dolby audio, and presidential stage for inaugural keynote.',
  },
  {
    id: 'venue-hall-2',
    name: 'Hall 2 (Computing Lab)',
    synonyms: ['Hall 2', 'Computing Lab', 'Computer Lab', 'Lab 1'],
    building: 'Tech Block',
    floor: 1,
    floorLabel: '1st Floor',
    coords: [13.0831, 80.2713],
    category: 'lab',
    type: 'Computer Lab',
    capacity: 120,
    airConditioned: true,
    description: 'High-performance workstations with GPU nodes, Linux environment, and gigabit fiber.',
  },
  {
    id: 'venue-hall-3',
    name: 'Hall 3 (Seminar Room)',
    synonyms: ['Hall 3', 'Seminar Room', 'Seminar Hall'],
    building: 'Admin Quad',
    floor: 2,
    floorLabel: '2nd Floor',
    coords: [13.0824, 80.2705],
    category: 'hall',
    type: 'Seminar Room',
    capacity: 80,
    airConditioned: true,
    description: 'Acoustically treated conference room for roundtable debates and paper presentations.',
  },
  {
    id: 'venue-reg-desk',
    name: 'Symposium Registration & Helpdesk',
    synonyms: ['Registration', 'Helpdesk', 'Admin Desk', 'Kit Counter'],
    building: 'Admin Quad',
    floor: 0,
    floorLabel: 'Ground Floor',
    coords: [13.0823, 80.2704],
    category: 'registration',
    type: 'Helpdesk',
    capacity: 50,
    airConditioned: false,
    description: 'Physical badge verification, kit bags, food coupon distribution, and coordinator queries.',
  },
  {
    id: 'venue-canteen',
    name: 'Campus Dining Hall & Food Court',
    synonyms: ['Canteen', 'Cafeteria', 'Food Court', 'Lunch Mess'],
    building: 'Cafeteria',
    floor: 0,
    floorLabel: 'Ground Floor',
    coords: [13.0820, 80.2713],
    category: 'food',
    type: 'Dining',
    capacity: 350,
    airConditioned: false,
    description: 'Hot buffet lunch served 12:30 PM - 2:30 PM. Mineral water refilling station.',
  },
  {
    id: 'venue-restroom-auditorium',
    name: 'Restrooms & Washrooms (Auditorium)',
    synonyms: ['Restroom', 'Toilet', 'Washroom'],
    building: 'Auditorium Complex',
    floor: 0,
    floorLabel: 'Ground Floor',
    coords: [13.0830, 80.2699],
    category: 'restroom',
    type: 'Restroom',
    capacity: 20,
    airConditioned: false,
    description: 'Gents & Ladies restrooms with disability access ramps.',
  },
  {
    id: 'venue-restroom-tech',
    name: 'Restrooms & Washrooms (Tech Block)',
    synonyms: ['Tech Restroom', 'Block Washroom'],
    building: 'Tech Block',
    floor: 1,
    floorLabel: '1st Floor',
    coords: [13.0829, 80.2715],
    category: 'restroom',
    type: 'Restroom',
    capacity: 15,
    airConditioned: false,
    description: 'Located behind staircase on 1st & 2nd floors.',
  },
  {
    id: 'venue-parking',
    name: 'Visitor & College Bus Parking',
    synonyms: ['Parking', 'Vehicle Stand', 'Bikes'],
    building: 'Campus Perimeter',
    floor: 0,
    floorLabel: 'Ground',
    coords: [13.0839, 80.2702],
    category: 'parking',
    type: 'Parking',
    capacity: 100,
    airConditioned: false,
    description: 'Free parking for two-wheelers, cars, and outstation college team buses.',
  },
];

// ============================================================================
// Campus Walkway Network & Waypoint Pathfinding Graph
// ============================================================================

export const MAIN_CAMPUS_WALKWAYS = {
  w_main_gate: { id: 'w_main_gate', name: 'Main Entrance Arch', coords: [13.0822, 80.2694], neighbors: ['w_gate_boulevard'] },
  w_gate_boulevard: { id: 'w_gate_boulevard', name: 'West Entrance Boulevard', coords: [13.0822, 80.2700], neighbors: ['w_main_gate', 'w_admin_west'] },
  w_admin_west: { id: 'w_admin_west', name: 'Admin Quad West Pathway', coords: [13.0822, 80.2703], neighbors: ['w_gate_boulevard', 'w_admin_plaza', 'w_auditorium_south'] },
  w_admin_plaza: { id: 'w_admin_plaza', name: 'Admin Quad & Registration Plaza', coords: [13.0823, 80.2705], neighbors: ['w_admin_west', 'w_central_junction', 'w_canteen_north'] },
  w_central_junction: { id: 'w_central_junction', name: 'Central Campus Crossroads', coords: [13.0827, 80.2706], neighbors: ['w_admin_plaza', 'w_auditorium_south', 'w_tech_west', 'w_library_front'] },
  w_auditorium_south: { id: 'w_auditorium_south', name: 'Auditorium South Promenade', coords: [13.0829, 80.2702], neighbors: ['w_admin_west', 'w_central_junction', 'w_auditorium_portico'] },
  w_auditorium_portico: { id: 'w_auditorium_portico', name: 'Hall 1 Auditorium Grand Portico', coords: [13.0832, 80.2701], neighbors: ['w_auditorium_south', 'w_auditorium_east', 'w_north_gate_path'] },
  w_auditorium_east: { id: 'w_auditorium_east', name: 'Auditorium East Walkway', coords: [13.0833, 80.2705], neighbors: ['w_auditorium_portico', 'w_library_front'] },
  w_library_front: { id: 'w_library_front', name: 'Central Library Lawn Walkway', coords: [13.0835, 80.2706], neighbors: ['w_central_junction', 'w_auditorium_east', 'w_tech_entrance', 'w_north_gate_path'] },
  w_tech_west: { id: 'w_tech_west', name: 'Tech Block West Approach', coords: [13.0827, 80.2709], neighbors: ['w_central_junction', 'w_tech_entrance', 'w_canteen_north'] },
  w_tech_entrance: { id: 'w_tech_entrance', name: 'Tech Block Main Lobby & Stairs', coords: [13.0830, 80.2711], neighbors: ['w_tech_west', 'w_library_front', 'w_tech_lab_path'] },
  w_tech_lab_path: { id: 'w_tech_lab_path', name: 'Computing Lab Access Corridor', coords: [13.0831, 80.2713], neighbors: ['w_tech_entrance'] },
  w_canteen_north: { id: 'w_canteen_north', name: 'Cafeteria North Plaza', coords: [13.0823, 80.2711], neighbors: ['w_admin_plaza', 'w_tech_west', 'w_canteen_entrance'] },
  w_canteen_entrance: { id: 'w_canteen_entrance', name: 'Student Dining Hall Entrance', coords: [13.0820, 80.2713], neighbors: ['w_canteen_north'] },
  w_north_gate_path: { id: 'w_north_gate_path', name: 'North Gate Parking Walkway', coords: [13.0838, 80.2703], neighbors: ['w_auditorium_portico', 'w_library_front'] },
};

export const ANNEX_CAMPUS_WALKWAYS = {
  w_annex_gate: { id: 'w_annex_gate', name: 'Annex Main Gate', coords: [13.0415, 80.2338], neighbors: ['w_annex_courtyard'] },
  w_annex_courtyard: { id: 'w_annex_courtyard', name: 'Annex Central Courtyard', coords: [13.0418, 80.2341], neighbors: ['w_annex_gate', 'w_annex_main_block', 'w_annex_lab'] },
  w_annex_main_block: { id: 'w_annex_main_block', name: 'Innovation Hub Lobby', coords: [13.0421, 80.2343], neighbors: ['w_annex_courtyard'] },
  w_annex_lab: { id: 'w_annex_lab', name: 'Incubation Lab Entry', coords: [13.0419, 80.2346], neighbors: ['w_annex_courtyard'] },
};

// Helper to calculate walking distance in meters (Haversine formula)
export function calculateDistanceMeters(coord1, coord2) {
  if (!coord1 || !coord2) return 0;
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;
  const R = 6371e3; // Earth radius in metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Find nearest walkway junction node in a graph
function findNearestWalkwayNode(coord, graph) {
  let nearest = null;
  let minDistance = Infinity;

  Object.values(graph).forEach((node) => {
    const dist = calculateDistanceMeters(coord, node.coords);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = node;
    }
  });

  return nearest;
}

// Dijkstra shortest path on campus walkway graph
function findShortestWalkwayPath(startNodeId, endNodeId, graph) {
  if (!graph[startNodeId] || !graph[endNodeId]) return [];
  if (startNodeId === endNodeId) return [graph[startNodeId].coords];

  const distances = {};
  const previous = {};
  const unvisited = new Set(Object.keys(graph));

  Object.keys(graph).forEach((nodeId) => {
    distances[nodeId] = Infinity;
    previous[nodeId] = null;
  });
  distances[startNodeId] = 0;

  while (unvisited.size > 0) {
    // Find unvisited node with smallest distance
    let currentId = null;
    let smallestDist = Infinity;
    for (const nodeId of unvisited) {
      if (distances[nodeId] < smallestDist) {
        smallestDist = distances[nodeId];
        currentId = nodeId;
      }
    }

    if (!currentId || distances[currentId] === Infinity) break;
    if (currentId === endNodeId) break;

    unvisited.delete(currentId);

    const currentNode = graph[currentId];
    for (const neighborId of currentNode.neighbors) {
      if (unvisited.has(neighborId)) {
        const neighborNode = graph[neighborId];
        const edgeWeight = calculateDistanceMeters(currentNode.coords, neighborNode.coords);
        const alt = distances[currentId] + edgeWeight;
        if (alt < distances[neighborId]) {
          distances[neighborId] = alt;
          previous[neighborId] = currentId;
        }
      }
    }
  }

  // Reconstruct path
  const path = [];
  let curr = endNodeId;
  while (curr) {
    path.unshift(graph[curr].coords);
    curr = previous[curr];
  }

  return path;
}

// Smooth walkway corners using Catmull-Rom or fillet interpolation for realistic natural curves
function smoothCampusPath(points) {
  if (!points || points.length <= 2) return points || [];

  const smoothed = [];
  smoothed.push(points[0]);

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Subdivide each segment into 3 interpolated points
    for (let t = 0.33; t < 1; t += 0.33) {
      const t2 = t * t;
      const t3 = t2 * t;

      const lat =
        0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);

      const lng =
        0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);

      smoothed.push([lat, lng]);
    }
    smoothed.push(p2);
  }

  return smoothed;
}

// Generate realistic, natural campus path following real walkways with smooth bends
export function generateCampusPath(startCoord, endCoord, campusId = 'main-campus') {
  if (!startCoord || !endCoord) return [];

  // Determine appropriate campus walkway graph
  const isAnnex = campusId === 'city-campus' || Math.abs(startCoord[1] - 80.2341) < 0.02;
  const graph = isAnnex ? ANNEX_CAMPUS_WALKWAYS : MAIN_CAMPUS_WALKWAYS;

  // Snap start and end to nearest network junctions
  const startNode = findNearestWalkwayNode(startCoord, graph);
  const endNode = findNearestWalkwayNode(endCoord, graph);

  if (!startNode || !endNode) {
    return [startCoord, endCoord];
  }

  // Get shortest walkway sequence
  const walkwaySequence = findShortestWalkwayPath(startNode.id, endNode.id, graph);

  // Combine: Start -> Walkways -> Destination
  const rawPath = [startCoord];
  walkwaySequence.forEach((pt) => {
    // Avoid duplicate adjacent coordinates
    const last = rawPath[rawPath.length - 1];
    if (!last || last[0] !== pt[0] || last[1] !== pt[1]) {
      rawPath.push(pt);
    }
  });

  const lastCoord = rawPath[rawPath.length - 1];
  if (!lastCoord || lastCoord[0] !== endCoord[0] || lastCoord[1] !== endCoord[1]) {
    rawPath.push(endCoord);
  }

  // Apply smooth curvature so turns bend naturally along sidewalks
  return smoothCampusPath(rawPath);
}

// Format estimated walking time
export function getEstimatedWalkingTime(distanceMeters) {
  // Average brisk walking speed: ~75 meters/min
  const minutes = Math.max(1, Math.ceil(distanceMeters / 75));
  return `${minutes} min${minutes > 1 ? 's' : ''} walk`;
}

// Generate turn-by-turn guidance steps from path coordinates
export function generateTurnByTurnInstructions(pathCoords, startName = 'Current Location', targetName = 'Destination') {
  if (!pathCoords || pathCoords.length < 2) return [];

  const steps = [];
  let totalDist = 0;

  // Step 1: Start
  steps.push({
    id: 1,
    type: 'start',
    action: `Depart from ${startName}`,
    detail: 'Head onto the paved walkway',
    icon: 'start',
  });

  // Calculate segment distances and directions
  for (let i = 0; i < pathCoords.length - 1; i++) {
    const dist = calculateDistanceMeters(pathCoords[i], pathCoords[i + 1]);
    totalDist += dist;
  }

  // Intermediate guidance points
  if (pathCoords.length > 4) {
    const midIdx = Math.floor(pathCoords.length / 2);
    const midDist = Math.round(totalDist * 0.45);
    steps.push({
      id: 2,
      type: 'turn',
      action: 'Follow central campus promenade pathway',
      detail: `Continue straight along campus pedestrian corridor for ~${midDist}m`,
      icon: 'straight',
    });
    steps.push({
      id: 3,
      type: 'turn',
      action: `Turn towards ${targetName} approach`,
      detail: `Follow directional signage along the walkway (~${Math.round(totalDist * 0.45)}m)`,
      icon: 'turn',
    });
  } else {
    steps.push({
      id: 2,
      type: 'turn',
      action: `Walk along corridor toward ${targetName}`,
      detail: `Proceed directly along marked sidewalk (~${totalDist}m)`,
      icon: 'straight',
    });
  }

  // Final Step: Arrive
  steps.push({
    id: steps.length + 1,
    type: 'arrive',
    action: `Arrive at ${targetName}`,
    detail: 'Target venue entrance is directly ahead',
    icon: 'arrive',
  });

  return steps;
}
