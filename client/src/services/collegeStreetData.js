// agent-notes: { ctx: "College Street View & Hallway 3D Walkthrough node network, floor connections, and hall interiors", deps: [], state: "active", last: "antigravity@2026-09-30" }

export const STREET_VIEW_NODES = {
  // ==========================================
  // GROUND FLOOR (Floor 0)
  // ==========================================
  main_gate: {
    id: 'main_gate',
    name: 'Main Entrance Arch & Welcome Boulevard',
    building: 'Campus Perimeter',
    floor: 0,
    floorName: 'Ground Floor',
    coords: [13.0822, 80.2694],
    heading: 90, // Facing East towards Admin Quad
    category: 'outdoor',
    bannerText: 'WELCOME TO SMARTSYMPO 2026 • COLLEGE OF ENGINEERING',
    wallSign: 'Main Campus Security Gate 1 • Welcome All Delegates',
    leftView: 'Campus Boulevard Palms & Flower Beds',
    rightView: 'Security Welcome Desk & Participant Help Kiosk',
    visualTheme: 'outdoor_arch',
    connections: {
      forward: { targetId: 'admin_quad', label: 'Walk Forward to Admin Quad (60m)' },
      left: { targetId: 'auditorium_portico', label: 'Turn Left to Auditorium Portico (90m)' },
      right: { targetId: 'canteen_entrance', label: 'Turn Right to Cafeteria (110m)' },
    },
  },

  admin_quad: {
    id: 'admin_quad',
    name: 'Admin Quad & Registration Desks',
    building: 'Admin Quad',
    floor: 0,
    floorName: 'Ground Floor',
    coords: [13.0823, 80.2704],
    heading: 45, // Facing North-East
    category: 'plaza',
    venueId: 'venue-reg-desk',
    bannerText: 'REGISTRATION & BADGE VERIFICATION DESKS (COUNTERS 1 - 6)',
    wallSign: 'Admin Block Ground Floor • Delegate Kits & Symposium Helpdesk',
    leftView: 'Auditorium South Garden Promenade',
    rightView: 'Tech Block Entrance & Central Lawn',
    visualTheme: 'admin_plaza',
    connections: {
      forward: { targetId: 'tech_lobby_ground', label: 'Enter Tech Block Lobby (Ground Floor)' },
      left: { targetId: 'auditorium_portico', label: 'Walk to Hall 1 Grand Auditorium' },
      right: { targetId: 'canteen_entrance', label: 'Walk to Food Court & Canteen' },
      back: { targetId: 'main_gate', label: 'Return to Main Entrance Arch' },
    },
  },

  auditorium_portico: {
    id: 'auditorium_portico',
    name: 'Hall 1 Auditorium Grand Portico',
    building: 'Auditorium Complex',
    floor: 0,
    floorName: 'Ground Floor',
    coords: [13.0832, 80.2701],
    heading: 0, // Facing North
    category: 'hallway',
    venueId: 'venue-hall-1',
    bannerText: 'HALL 1: GRAND AUDITORIUM • PRESIDENTIAL INAUGURAL KEYNOTE',
    wallSign: 'Auditorium Grand Foyer • Restrooms on Left Wing',
    leftView: 'Auditorium Restroom Wing & Disability Ramp',
    rightView: 'Walkway to Central Library Lawn',
    visualTheme: 'auditorium_foyer',
    hasHallVisit: true,
    hallTargetId: 'hall_1_interior',
    hallButtonLabel: '🚪 Enter Hall 1 (Main Auditorium)',
    connections: {
      forward: { targetId: 'hall_1_interior', label: 'Step Inside Hall 1 (Auditorium)' },
      right: { targetId: 'library_walk', label: 'Walk to Central Library Lawn' },
      back: { targetId: 'admin_quad', label: 'Walk Back to Admin Quad' },
      left: { targetId: 'main_gate', label: 'Walk to Main Entrance Gate' },
    },
  },

  hall_1_interior: {
    id: 'hall_1_interior',
    name: 'Inside Hall 1 (Main Auditorium Stage & Seating)',
    building: 'Auditorium Complex',
    floor: 0,
    floorName: 'Ground Floor',
    coords: [13.0833, 80.2701],
    heading: 0,
    category: 'hall_interior',
    isHall: true,
    venueId: 'venue-hall-1',
    bannerText: 'HALL 1 • CENTRAL STAGE & DOLBY SURROUND THEATRE',
    visualTheme: 'auditorium_interior',
    interiorData: {
      capacity: '250 Seats',
      ac: 'Central Air Conditioned',
      audioVisual: '4K Laser Projection • Dual Podium Microphones • Yamaha Digital Audio',
      sessionName: 'Symposium Inauguration & AI Keynote Address',
      scheduleTime: '09:30 AM - 11:30 AM',
      coordinator: 'Prof. S. Ranganathan (Ext: 402)',
    },
    connections: {
      back: { targetId: 'auditorium_portico', label: 'Exit Hall 1 to Auditorium Portico' },
    },
  },

  tech_lobby_ground: {
    id: 'tech_lobby_ground',
    name: 'Tech Block Ground Floor Lobby & Staircase',
    building: 'Tech Block',
    floor: 0,
    floorName: 'Ground Floor',
    coords: [13.0830, 80.2711],
    heading: 0, // Facing North towards stairs
    category: 'staircase',
    bannerText: 'TECH BLOCK • CSE, IT & ARTIFICIAL INTELLIGENCE DEPARTMENTS',
    wallSign: 'Ground Floor: Department Office | 1st Floor: Hall 2 Computing Labs',
    leftView: 'Faculty Notice Board & Academic Dean Office',
    rightView: 'Student Project Display Showcase & Server Room',
    visualTheme: 'tech_lobby',
    canChangeFloor: true,
    connections: {
      forward: { targetId: 'library_walk', label: 'North Exit to Library Lawn' },
      upStairs: { targetId: 'tech_stairs_1f', label: '🪜 Take Stairs to 1st Floor (Hall 2 Computing Lab)', targetFloor: 1 },
      back: { targetId: 'admin_quad', label: 'Exit South to Admin Quad & Registration' },
      right: { targetId: 'canteen_entrance', label: 'Side Corridor to Canteen' },
    },
  },

  library_walk: {
    id: 'library_walk',
    name: 'Central Library Lawn & Research Center Walkway',
    building: 'Central Library',
    floor: 0,
    floorName: 'Ground Floor',
    coords: [13.0835, 80.2708],
    heading: 270, // Facing West towards Auditorium
    category: 'outdoor',
    bannerText: 'CENTRAL LIBRARY & RESEARCH REPOSITORY • POSTER PAVILION',
    wallSign: 'Library Wing A • Symposium Poster Presentation Canopy',
    leftView: 'Quiet Reading Garden & Shaded Benches',
    rightView: 'Digital Research Archive Entry Arch',
    visualTheme: 'library_lawn',
    connections: {
      forward: { targetId: 'auditorium_portico', label: 'Walk West to Auditorium Portico' },
      left: { targetId: 'tech_lobby_ground', label: 'Enter Tech Block Lobby' },
      back: { targetId: 'admin_quad', label: 'Walk South to Admin Quad' },
    },
  },

  canteen_entrance: {
    id: 'canteen_entrance',
    name: 'Campus Cafeteria & Food Court Entrance',
    building: 'Cafeteria',
    floor: 0,
    floorName: 'Ground Floor',
    coords: [13.0820, 80.2713],
    heading: 180, // Facing South
    category: 'plaza',
    venueId: 'venue-canteen',
    bannerText: 'CAMPUS DINING HALL & REFRESHMENTS • LUNCH BUFFET (12:30 - 2:30 PM)',
    wallSign: 'Food Coupon Verification Counter • Drinking Water Station',
    leftView: 'Juice Bar & Morning Tea/Coffee Counters',
    rightView: 'Handwash Area & Recycling Station',
    visualTheme: 'canteen_entrance',
    hasHallVisit: true,
    hallTargetId: 'canteen_interior',
    hallButtonLabel: '🍽️ Enter Dining Hall',
    connections: {
      forward: { targetId: 'canteen_interior', label: 'Step Inside Dining Hall' },
      left: { targetId: 'tech_lobby_ground', label: 'Walk North to Tech Block' },
      right: { targetId: 'admin_quad', label: 'Walk West to Admin Quad' },
      back: { targetId: 'main_gate', label: 'Walk to Main Entrance Gate' },
    },
  },

  canteen_interior: {
    id: 'canteen_interior',
    name: 'Inside Student Dining Hall & Refreshment Court',
    building: 'Cafeteria',
    floor: 0,
    floorName: 'Ground Floor',
    coords: [13.0820, 80.2713],
    heading: 180,
    category: 'hall_interior',
    isHall: true,
    venueId: 'venue-canteen',
    bannerText: 'CAMPUS FOOD COURT • VEG & NON-VEG BUFFET SPREAD',
    visualTheme: 'canteen_interior',
    interiorData: {
      capacity: '350 Seats',
      ac: 'Well Ventilated High-Ceiling Dining Space',
      audioVisual: 'Digital Token Display Screens',
      sessionName: 'Symposium Lunch & Evening Networking Tea',
      scheduleTime: 'Lunch: 12:30 PM - 02:30 PM | Tea: 04:00 PM',
      coordinator: 'Student Hospitality Team (Ext: 215)',
    },
    connections: {
      back: { targetId: 'canteen_entrance', label: 'Exit to Canteen Courtyard' },
    },
  },

  // ==========================================
  // FIRST FLOOR (Floor 1)
  // ==========================================
  tech_stairs_1f: {
    id: 'tech_stairs_1f',
    name: 'Tech Block 1st Floor Landing & Lab Corridor',
    building: 'Tech Block',
    floor: 1,
    floorName: '1st Floor',
    coords: [13.0830, 80.2712],
    heading: 0, // Facing North down the corridor
    category: 'staircase',
    bannerText: '1ST FLOOR • DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING',
    wallSign: 'Room 101: Faculty HOD | Room 104: Hall 2 Advanced Computing Lab',
    leftView: 'Department Notice Board & Student AI Project Posters',
    rightView: 'Restrooms & Purified RO Water Dispenser',
    visualTheme: 'tech_corridor_1f',
    canChangeFloor: true,
    connections: {
      forward: { targetId: 'hall_2_entrance', label: 'Walk Forward to Hall 2 (Computing Lab)' },
      downStairs: { targetId: 'tech_lobby_ground', label: '🪜 Take Stairs Down to Ground Floor Lobby', targetFloor: 0 },
      upStairs: { targetId: 'tech_stairs_2f', label: '🪜 Take Stairs Up to 2nd Floor (Seminar Room)', targetFloor: 2 },
      right: { targetId: 'tech_corridor_south_1f', label: 'South Wing Faculty Corridor' },
    },
  },

  hall_2_entrance: {
    id: 'hall_2_entrance',
    name: 'Hall 2 (Computing Lab) Entrance Doorway',
    building: 'Tech Block',
    floor: 1,
    floorName: '1st Floor',
    coords: [13.0831, 80.2713],
    heading: 90, // Facing East into lab
    category: 'hallway',
    venueId: 'venue-hall-2',
    bannerText: 'HALL 2: ADVANCED COMPUTING & AI RESEARCH LAB • ROOM 104',
    wallSign: 'Coding Hackathon & Web Bug-Hunt Battle Arena',
    leftView: 'Linux Server Rack & Cloud Gateway Indicator',
    rightView: 'Participant Bag & Backpack Storage Shelves',
    visualTheme: 'lab_entrance',
    hasHallVisit: true,
    hallTargetId: 'hall_2_interior',
    hallButtonLabel: '💻 Step Inside Hall 2 (Computing Lab)',
    connections: {
      forward: { targetId: 'hall_2_interior', label: 'Step Inside Hall 2 (Computing Lab)' },
      back: { targetId: 'tech_stairs_1f', label: 'Walk Back to Staircase Landing' },
    },
  },

  hall_2_interior: {
    id: 'hall_2_interior',
    name: 'Inside Hall 2 (High-Performance Computing Lab)',
    building: 'Tech Block',
    floor: 1,
    floorName: '1st Floor',
    coords: [13.0831, 80.2713],
    heading: 90,
    category: 'hall_interior',
    isHall: true,
    venueId: 'venue-hall-2',
    bannerText: 'HALL 2 • 120 DUAL-MONITOR GPU WORKSTATIONS • GIGABIT FIBER',
    visualTheme: 'computing_lab_interior',
    interiorData: {
      capacity: '120 Workstations',
      ac: 'Fully Air Conditioned Lab Facility',
      audioVisual: 'Dual Interactive Smart Boards • High-Speed LAN • GPU Nodes',
      sessionName: 'Algorithmic Coding Marathon & Web Development Hackathon',
      scheduleTime: '10:00 AM - 01:00 PM',
      coordinator: 'Dr. M. K. Sundaram (Ext: 512)',
    },
    connections: {
      back: { targetId: 'hall_2_entrance', label: 'Exit Hall 2 to 1st Floor Corridor' },
    },
  },

  tech_corridor_south_1f: {
    id: 'tech_corridor_south_1f',
    name: 'Tech Block 1st Floor South Wing Corridor',
    building: 'Tech Block',
    floor: 1,
    floorName: '1st Floor',
    coords: [13.0828, 80.2712],
    heading: 180, // Facing South
    category: 'hallway',
    bannerText: 'SOUTH WING • STAFF ROOMS & TECHNICAL COMMITTEES',
    wallSign: 'Symposium Jury Room 108 • Query Desk',
    leftView: 'Jury Evaluation Chambers',
    rightView: 'First Aid & Emergency Rest Area',
    visualTheme: 'tech_corridor_1f',
    connections: {
      forward: { targetId: 'tech_stairs_1f', label: 'Walk to Main Staircase & Hall 2' },
      downStairs: { targetId: 'tech_lobby_ground', label: '🪜 Stairs to Ground Floor', targetFloor: 0 },
    },
  },

  // ==========================================
  // SECOND FLOOR (Floor 2)
  // ==========================================
  tech_stairs_2f: {
    id: 'tech_stairs_2f',
    name: 'Tech Block 2nd Floor Landing & Seminar Hall Foyer',
    building: 'Tech Block',
    floor: 2,
    floorName: '2nd Floor',
    coords: [13.0830, 80.2712],
    heading: 0, // Facing North
    category: 'staircase',
    bannerText: '2ND FLOOR • EXECUTIVE SEMINAR SUITES & IOT SANDBOX',
    wallSign: 'Room 201: Hall 3 Seminar Hall • IoT Hardware Showcase',
    leftView: 'Robotics Showcase Pavilion & Drone Display',
    rightView: 'Executive Restrooms & Guest Lounge',
    visualTheme: 'seminar_foyer',
    canChangeFloor: true,
    connections: {
      forward: { targetId: 'hall_3_entrance', label: 'Walk Forward to Hall 3 (Seminar Room)' },
      downStairs: { targetId: 'tech_stairs_1f', label: '🪜 Take Stairs Down to 1st Floor (Computing Lab)', targetFloor: 1 },
    },
  },

  hall_3_entrance: {
    id: 'hall_3_entrance',
    name: 'Hall 3 (Seminar Room) Entrance & Registration Arch',
    building: 'Tech Block',
    floor: 2,
    floorName: '2nd Floor',
    coords: [13.0829, 80.2711],
    heading: 270, // Facing West into seminar hall
    category: 'hallway',
    venueId: 'venue-hall-3',
    bannerText: 'HALL 3: EXECUTIVE SEMINAR ROOM • PAPER PRESENTATIONS',
    wallSign: 'Technical Paper Presentation & Case-Study Defense',
    leftView: 'Digital Poster Displays & Presenter Stage Timer',
    rightView: 'Judge Evaluation Desk & Certificate Counter',
    visualTheme: 'seminar_entrance',
    hasHallVisit: true,
    hallTargetId: 'hall_3_interior',
    hallButtonLabel: '🎤 Step Inside Hall 3 (Seminar Room)',
    connections: {
      forward: { targetId: 'hall_3_interior', label: 'Step Inside Hall 3 (Seminar Room)' },
      back: { targetId: 'tech_stairs_2f', label: 'Walk Back to 2nd Floor Landing' },
    },
  },

  hall_3_interior: {
    id: 'hall_3_interior',
    name: 'Inside Hall 3 (Acoustic Seminar Room & Stage)',
    building: 'Tech Block',
    floor: 2,
    floorName: '2nd Floor',
    coords: [13.0829, 80.2711],
    heading: 270,
    category: 'hall_interior',
    isHall: true,
    venueId: 'venue-hall-3',
    bannerText: 'HALL 3 • ACOUSTIC ROUNDTABLE & DEFENSE PODIUM',
    visualTheme: 'seminar_interior',
    interiorData: {
      capacity: '80 Executive Seats',
      ac: 'Soundproof & Climate Controlled',
      audioVisual: 'Interactive Touch Podium • Dual High-Definition Side Monitors',
      sessionName: 'National Student Technical Paper Presentation & Debate',
      scheduleTime: '11:00 AM - 03:30 PM',
      coordinator: 'Prof. Ananya Varma (Ext: 318)',
    },
    connections: {
      back: { targetId: 'hall_3_entrance', label: 'Exit Hall 3 to 2nd Floor Foyer' },
    },
  },
};

// Quick helper to get node by ID with fallback
export function getStreetViewNode(nodeId) {
  if (!nodeId) return STREET_VIEW_NODES.main_gate;
  return STREET_VIEW_NODES[nodeId] || STREET_VIEW_NODES.main_gate;
}

// Find closest street view node to a given lat/lng or venue ID
export function findClosestStreetNode(coordsOrVenueId) {
  if (typeof coordsOrVenueId === 'string') {
    // If it's a venue ID, check if any node links directly to it
    const match = Object.values(STREET_VIEW_NODES).find(
      (n) => n.venueId === coordsOrVenueId || n.id === coordsOrVenueId || n.hallTargetId === coordsOrVenueId
    );
    if (match) return match;
  }

  if (Array.isArray(coordsOrVenueId) && coordsOrVenueId.length === 2) {
    const [lat, lng] = coordsOrVenueId;
    let closest = STREET_VIEW_NODES.main_gate;
    let minDist = Infinity;

    Object.values(STREET_VIEW_NODES).forEach((node) => {
      const dLat = node.coords[0] - lat;
      const dLng = node.coords[1] - lng;
      const dist = dLat * dLat + dLng * dLng;
      if (dist < minDist) {
        minDist = dist;
        closest = node;
      }
    });

    return closest;
  }

  return STREET_VIEW_NODES.main_gate;
}

// Pre-defined Quick Starting Points for "My Location" Picker
export const QUICK_STARTING_LOCATIONS = [
  { id: 'main_gate', name: '🏫 Main Entrance Arch & Gate', floor: 0, floorName: 'Ground Floor', building: 'Campus Perimeter' },
  { id: 'admin_quad', name: '📋 Admin Quad & Registration Desk', floor: 0, floorName: 'Ground Floor', building: 'Admin Quad' },
  { id: 'auditorium_portico', name: '🎭 Hall 1 Grand Auditorium Portico', floor: 0, floorName: 'Ground Floor', building: 'Auditorium Complex' },
  { id: 'tech_lobby_ground', name: '🏢 Tech Block Ground Floor Lobby', floor: 0, floorName: 'Ground Floor', building: 'Tech Block' },
  { id: 'tech_stairs_1f', name: '🪜 Tech Block 1st Floor Landing (Stairs)', floor: 1, floorName: '1st Floor', building: 'Tech Block' },
  { id: 'hall_2_entrance', name: '💻 Hall 2 (Computing Lab) Corridor', floor: 1, floorName: '1st Floor', building: 'Tech Block' },
  { id: 'tech_stairs_2f', name: '🪜 Tech Block 2nd Floor Landing (Stairs)', floor: 2, floorName: '2nd Floor', building: 'Tech Block' },
  { id: 'hall_3_entrance', name: '🎤 Hall 3 (Seminar Room) Entrance', floor: 2, floorName: '2nd Floor', building: 'Tech Block' },
  { id: 'library_walk', name: '📚 Central Library Front Lawn', floor: 0, floorName: 'Ground Floor', building: 'Central Library' },
  { id: 'canteen_entrance', name: '🍽️ Campus Cafeteria & Food Court', floor: 0, floorName: 'Ground Floor', building: 'Cafeteria' },
];
