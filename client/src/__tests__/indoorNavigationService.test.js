// agent-notes: { ctx: "Test suite for Dijkstra shortest-path algorithm and navigation utilities", deps: ["src/services/indoorNavigationService.js"], state: "active", last: "antigravity@2026-10-03" }

/**
 * Indoor Navigation Service — Tests
 *
 * Run with: node client/src/__tests__/indoorNavigationService.test.js
 * (No test framework required — uses Node.js built-in assert)
 */

import {
  buildAdjacencyList,
  dijkstra,
  dijkstraMultiFloor,
  euclideanDistance,
  getDirection,
  generateDirections,
  findNodeForLocation,
  validateGraph,
  formatDistance,
} from '../services/indoorNavigationService.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ❌ ${name}: ${err.message}`);
  }
}

function assert(condition, msg = 'Assertion failed') {
  if (!condition) throw new Error(msg);
}

function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg} Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// ─── Test Data ───
const nodes = [
  { id: 'A', floor_id: 'f1', x: 0, y: 0, node_type: 'entrance', is_disabled: false, label: 'Entrance' },
  { id: 'B', floor_id: 'f1', x: 100, y: 0, node_type: 'corridor_junction', is_disabled: false, label: 'Junction B' },
  { id: 'C', floor_id: 'f1', x: 200, y: 0, node_type: 'room_door', is_disabled: false, label: 'Room 101', location_id: 'loc1' },
  { id: 'D', floor_id: 'f1', x: 100, y: 100, node_type: 'waypoint', is_disabled: false, label: 'Corridor D' },
  { id: 'E', floor_id: 'f1', x: 200, y: 100, node_type: 'room_door', is_disabled: false, label: 'Lab 201', location_id: 'loc2' },
  { id: 'F', floor_id: 'f1', x: 300, y: 50, node_type: 'waypoint', is_disabled: false },
  { id: 'X', floor_id: 'f1', x: 500, y: 500, node_type: 'waypoint', is_disabled: false, label: 'Disconnected' },
];

const edges = [
  { id: 'e1', floor_id: 'f1', from_node_id: 'A', to_node_id: 'B', distance: 100, is_bidirectional: true, is_disabled: false, edge_type: 'walkway' },
  { id: 'e2', floor_id: 'f1', from_node_id: 'B', to_node_id: 'C', distance: 100, is_bidirectional: true, is_disabled: false, edge_type: 'walkway' },
  { id: 'e3', floor_id: 'f1', from_node_id: 'B', to_node_id: 'D', distance: 100, is_bidirectional: true, is_disabled: false, edge_type: 'walkway' },
  { id: 'e4', floor_id: 'f1', from_node_id: 'D', to_node_id: 'E', distance: 100, is_bidirectional: true, is_disabled: false, edge_type: 'walkway' },
  { id: 'e5', floor_id: 'f1', from_node_id: 'C', to_node_id: 'F', distance: 110, is_bidirectional: true, is_disabled: false, edge_type: 'walkway' },
  { id: 'e6', floor_id: 'f1', from_node_id: 'E', to_node_id: 'F', distance: 120, is_bidirectional: true, is_disabled: false, edge_type: 'walkway' },
];

console.log('\n🧪 Indoor Navigation Service Tests\n');

// ─── buildAdjacencyList ───
console.log('📋 buildAdjacencyList');
test('builds adjacency list from nodes and edges', () => {
  const { adj, nodeMap } = buildAdjacencyList(nodes, edges);
  assert(Object.keys(adj).length === 7, 'Should have 7 nodes');
  assert(adj['A'].length === 1, 'A should have 1 neighbor (B)');
  assert(adj['B'].length === 3, 'B should have 3 neighbors (A, C, D)');
  assert(nodeMap['A'].label === 'Entrance');
});

test('excludes disabled nodes', () => {
  const disabledNodes = [...nodes.map((n) => ({ ...n }))];
  disabledNodes[1] = { ...disabledNodes[1], is_disabled: true }; // Disable B
  const { adj } = buildAdjacencyList(disabledNodes, edges);
  assert(!adj['B'], 'Disabled node B should not be in adjacency list');
  assert(adj['A'].length === 0, 'A should have 0 reachable neighbors with B disabled');
});

test('excludes disabled edges', () => {
  const disabledEdges = [...edges.map((e) => ({ ...e }))];
  disabledEdges[0] = { ...disabledEdges[0], is_disabled: true }; // Disable e1 (A→B)
  const { adj } = buildAdjacencyList(nodes, disabledEdges);
  assert(adj['A'].length === 0, 'A should have 0 neighbors with edge A→B disabled');
});

test('handles one-way edges', () => {
  const oneWayEdges = [
    { id: 'ow1', floor_id: 'f1', from_node_id: 'A', to_node_id: 'B', distance: 50, is_bidirectional: false, is_disabled: false, edge_type: 'walkway' },
  ];
  const { adj } = buildAdjacencyList(nodes, oneWayEdges);
  assert(adj['A'].length === 1, 'A should have 1 outgoing neighbor');
  assert(adj['B'].filter(n => n.to === 'A').length === 0, 'B should NOT have A as neighbor (one-way)');
});

// ─── dijkstra ───
console.log('\n📋 dijkstra');
test('finds shortest path A → E', () => {
  const { adj } = buildAdjacencyList(nodes, edges);
  const result = dijkstra(adj, 'A', 'E');
  assertEqual(result.distance, 300, 'Distance A→E');
  assert(result.path.length > 0, 'Path should not be empty');
  assertEqual(result.path[0], 'A', 'Path starts at A');
  assertEqual(result.path[result.path.length - 1], 'E', 'Path ends at E');
});

test('finds shortest path A → F via C (not via E)', () => {
  const { adj } = buildAdjacencyList(nodes, edges);
  const result = dijkstra(adj, 'A', 'F');
  // A→B (100) + B→C (100) + C→F (110) = 310
  // A→B (100) + B→D (100) + D→E (100) + E→F (120) = 420
  assertEqual(result.distance, 310, 'Distance A→F should be 310 via A-B-C-F');
  assert(result.path.includes('C'), 'Shortest path should go through C');
});

test('handles start === destination', () => {
  const { adj } = buildAdjacencyList(nodes, edges);
  const result = dijkstra(adj, 'A', 'A');
  assertEqual(result.distance, 0);
  assertEqual(result.path.length, 1);
  assertEqual(result.path[0], 'A');
});

test('returns error for disconnected destination', () => {
  const { adj } = buildAdjacencyList(nodes, edges);
  const result = dijkstra(adj, 'A', 'X');
  assert(result.path.length === 0, 'Path should be empty for disconnected node');
  assert(result.distance === Infinity, 'Distance should be Infinity');
  assert(result.error, 'Should have error message');
});

test('returns error for missing node', () => {
  const { adj } = buildAdjacencyList(nodes, edges);
  const result = dijkstra(adj, 'A', 'NONEXISTENT');
  assert(result.error, 'Should return error for missing node');
});

test('respects one-way edges in routing', () => {
  const oneWayEdges = [
    { id: 'ow1', floor_id: 'f1', from_node_id: 'A', to_node_id: 'B', distance: 50, is_bidirectional: false, is_disabled: false, edge_type: 'walkway' },
    { id: 'ow2', floor_id: 'f1', from_node_id: 'B', to_node_id: 'C', distance: 50, is_bidirectional: false, is_disabled: false, edge_type: 'walkway' },
  ];
  const { adj } = buildAdjacencyList(nodes, oneWayEdges);
  const fwd = dijkstra(adj, 'A', 'C');
  assertEqual(fwd.distance, 100, 'Forward one-way distance');
  const bwd = dijkstra(adj, 'C', 'A');
  assert(bwd.path.length === 0, 'Backward should fail for one-way edges');
});

// ─── dijkstraMultiFloor ───
console.log('\n📋 dijkstraMultiFloor');
test('finds path across floors via stairs', () => {
  const multiNodes = [
    { id: 'f1_a', floor_id: 'f1', x: 0, y: 0, node_type: 'entrance', is_disabled: false },
    { id: 'f1_stairs', floor_id: 'f1', x: 100, y: 0, node_type: 'stairs', is_disabled: false },
    { id: 'f2_stairs', floor_id: 'f2', x: 100, y: 0, node_type: 'stairs', is_disabled: false },
    { id: 'f2_room', floor_id: 'f2', x: 200, y: 0, node_type: 'room_door', is_disabled: false, label: 'Room 201' },
  ];
  const multiEdges = [
    { id: 'me1', floor_id: 'f1', from_node_id: 'f1_a', to_node_id: 'f1_stairs', distance: 100, is_bidirectional: true, is_disabled: false, edge_type: 'walkway' },
    { id: 'me2', floor_id: 'f1', from_node_id: 'f1_stairs', to_node_id: 'f2_stairs', distance: 20, is_bidirectional: true, is_disabled: false, edge_type: 'stairs' },
    { id: 'me3', floor_id: 'f2', from_node_id: 'f2_stairs', to_node_id: 'f2_room', distance: 100, is_bidirectional: true, is_disabled: false, edge_type: 'walkway' },
  ];
  const result = dijkstraMultiFloor(multiNodes, multiEdges, 'f1_a', 'f2_room');
  assertEqual(result.distance, 220);
  assert(result.path.includes('f1_stairs'), 'Route should use stairs on floor 1');
  assert(result.path.includes('f2_stairs'), 'Route should use stairs on floor 2');
  // Check floor transition detection
  const transitions = result.pathDetails.filter((p) => p.isFloorTransition);
  assert(transitions.length > 0, 'Should detect at least one floor transition');
});

// ─── euclideanDistance ───
console.log('\n📋 euclideanDistance');
test('calculates correct distance', () => {
  assertEqual(euclideanDistance(0, 0, 3, 4), 5);
  assertEqual(euclideanDistance(0, 0, 0, 0), 0);
  assert(Math.abs(euclideanDistance(1, 1, 4, 5) - 5) < 0.01);
});

// ─── getDirection ───
console.log('\n📋 getDirection');
test('returns correct cardinal directions', () => {
  assertEqual(getDirection({ x: 0, y: 0 }, { x: 100, y: 0 }), 'right');
  assertEqual(getDirection({ x: 0, y: 0 }, { x: -100, y: 0 }), 'left');
  assertEqual(getDirection({ x: 0, y: 0 }, { x: 0, y: 100 }), 'down');
  assertEqual(getDirection({ x: 0, y: 0 }, { x: 0, y: -100 }), 'up');
});

// ─── generateDirections ───
console.log('\n📋 generateDirections');
test('generates start and destination instructions', () => {
  const { adj, nodeMap } = buildAdjacencyList(nodes, edges);
  const result = dijkstra(adj, 'A', 'C');
  const pathDetails = result.path.map((id, i) => ({
    nodeId: id,
    node: nodeMap[id],
    isFloorTransition: false,
    stepIndex: i,
  }));
  const locs = [{ id: 'loc1', name: 'Room 101' }];
  const dirs = generateDirections(pathDetails, nodeMap, locs);
  assert(dirs.length >= 2, 'Should have at least start + destination');
  assert(dirs[0].type === 'start', 'First instruction should be start');
  assert(dirs[dirs.length - 1].type === 'destination', 'Last instruction should be destination');
});

test('handles single-node path', () => {
  const pathDetails = [{
    nodeId: 'A',
    node: nodes[0],
    isFloorTransition: false,
    stepIndex: 0,
  }];
  const dirs = generateDirections(pathDetails, {}, []);
  assert(dirs.length >= 1);
  assertEqual(dirs[0].text, 'You are already at the destination.');
});

// ─── findNodeForLocation ───
console.log('\n📋 findNodeForLocation');
test('finds node linked to location', () => {
  const node = findNodeForLocation(nodes, 'loc1');
  assert(node !== null, 'Should find a node');
  assertEqual(node.id, 'C');
});

test('returns null for unlinked location', () => {
  const node = findNodeForLocation(nodes, 'nonexistent');
  assert(node === null, 'Should return null');
});

// ─── validateGraph ───
console.log('\n📋 validateGraph');
test('validates a correct graph', () => {
  const result = validateGraph(nodes, edges);
  assert(result.valid, 'Graph should be valid');
  assertEqual(result.issues.length, 0);
});

test('detects self-loop edges', () => {
  const badEdges = [
    ...edges,
    { id: 'bad1', from_node_id: 'A', to_node_id: 'A', distance: 0 },
  ];
  const result = validateGraph(nodes, badEdges);
  assert(!result.valid, 'Graph with self-loop should be invalid');
  assert(result.issues.some((i) => i.includes('self-loop')));
});

test('detects negative distance', () => {
  const badEdges = [
    ...edges,
    { id: 'bad2', from_node_id: 'A', to_node_id: 'B', distance: -5 },
  ];
  const result = validateGraph(nodes, badEdges);
  assert(!result.valid);
  assert(result.issues.some((i) => i.includes('negative')));
});

test('detects missing node references', () => {
  const badEdges = [
    { id: 'bad3', from_node_id: 'MISSING', to_node_id: 'A', distance: 10 },
  ];
  const result = validateGraph(nodes, badEdges);
  assert(!result.valid);
  assert(result.issues.some((i) => i.includes('missing')));
});

// ─── formatDistance ───
console.log('\n📋 formatDistance');
test('formats distances correctly', () => {
  assertEqual(formatDistance(150), '~150 m');
  assertEqual(formatDistance(0.5), '< 1 m');
  assertEqual(formatDistance(Infinity), '—');
  assertEqual(formatDistance(null), '—');
});

// ─── Summary ───
console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

if (failed > 0) process.exit(1);
