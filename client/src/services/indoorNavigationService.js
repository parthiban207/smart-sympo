// agent-notes: { ctx: "Dijkstra routing, floor map validation, wall-collision safe connection suggestions, and geometry helpers", deps: [], state: "active", last: "antigravity@2026-10-03" }

/**
 * Dijkstra's shortest-path algorithm for campus indoor navigation.
 *
 * Operates on a graph of nodes and edges loaded from the campus_nodes / campus_edges tables.
 * Supports:
 *   - Bidirectional and one-way edges
 *   - Disabled nodes/edges exclusion
 *   - Multi-floor stair/lift transitions
 *   - Wheelchair-accessible routing (avoids stairs and non-accessible paths)
 *   - Clear no-route results
 *   - Direction instruction generation
 *   - Automatic corridor/waypoint connection suggestions
 *   - Comprehensive floor map validation (overlapping rooms, missing doors, unreachable destinations)
 */

// ──────────────────────────────────────────────
// Priority Queue (Min-Heap) for Dijkstra
// ──────────────────────────────────────────────
class MinHeap {
  constructor() {
    this.heap = [];
  }

  push(item) {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return null;
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  get size() {
    return this.heap.length;
  }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent].dist <= this.heap[i].dist) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  _sinkDown(i) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.heap[left].dist < this.heap[smallest].dist) smallest = left;
      if (right < n && this.heap[right].dist < this.heap[smallest].dist) smallest = right;
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }
}

// ──────────────────────────────────────────────
// Build adjacency list from edges
// ──────────────────────────────────────────────
export function buildAdjacencyList(nodes, edges, options = {}) {
  const { requireAccessible = false } = options;
  const adj = {};
  const nodeMap = {};

  for (const node of nodes) {
    if (node.is_disabled) continue;
    adj[node.id] = [];
    nodeMap[node.id] = node;
  }

  for (const edge of edges) {
    if (edge.is_disabled) continue;
    if (!adj[edge.from_node_id] || !adj[edge.to_node_id]) continue;

    // Wheelchair accessible filter: exclude stairs or explicitly non-accessible edges
    if (requireAccessible) {
      if (edge.is_accessible === false || edge.edge_type === 'stairs') {
        continue;
      }
    }

    adj[edge.from_node_id].push({
      to: edge.to_node_id,
      distance: edge.distance,
      edge,
    });

    if (edge.is_bidirectional) {
      adj[edge.to_node_id].push({
        to: edge.from_node_id,
        distance: edge.distance,
        edge,
      });
    }
  }

  return { adj, nodeMap };
}

// ──────────────────────────────────────────────
// Dijkstra's Algorithm
// ──────────────────────────────────────────────
export function dijkstra(adj, startId, endId) {
  if (startId === endId) {
    return { path: [startId], distance: 0, edges: [] };
  }

  if (!adj[startId] || !adj[endId]) {
    return { path: [], distance: Infinity, edges: [], error: 'Start or destination node not found in graph.' };
  }

  const dist = {};
  const prev = {};
  const prevEdge = {};
  const visited = new Set();
  const pq = new MinHeap();

  for (const nodeId of Object.keys(adj)) {
    dist[nodeId] = Infinity;
  }
  dist[startId] = 0;
  pq.push({ id: startId, dist: 0 });

  while (pq.size > 0) {
    const { id: u, dist: d } = pq.pop();

    if (visited.has(u)) continue;
    visited.add(u);

    if (u === endId) break;

    for (const neighbor of adj[u]) {
      if (visited.has(neighbor.to)) continue;
      const alt = d + neighbor.distance;
      if (alt < dist[neighbor.to]) {
        dist[neighbor.to] = alt;
        prev[neighbor.to] = u;
        prevEdge[neighbor.to] = neighbor.edge;
        pq.push({ id: neighbor.to, dist: alt });
      }
    }
  }

  if (dist[endId] === Infinity) {
    return { path: [], distance: Infinity, edges: [], error: 'No valid route found between these locations.' };
  }

  // Reconstruct path
  const path = [];
  const edges = [];
  let current = endId;
  while (current !== undefined) {
    path.unshift(current);
    if (prevEdge[current]) edges.unshift(prevEdge[current]);
    current = prev[current];
  }

  return { path, distance: dist[endId], edges };
}

// ──────────────────────────────────────────────
// Multi-floor Dijkstra
// ──────────────────────────────────────────────
export function dijkstraMultiFloor(allNodes, allEdges, startId, endId, options = {}) {
  const { requireAccessible = false } = options;
  const enabledNodes = allNodes.filter((n) => !n.is_disabled);
  const enabledEdges = allEdges.filter((e) => !e.is_disabled);
  const { adj, nodeMap } = buildAdjacencyList(enabledNodes, enabledEdges, { requireAccessible });
  const result = dijkstra(adj, startId, endId);

  if (result.path.length === 0) return result;

  // Annotate path with node details and floor transitions
  const pathDetails = result.path.map((nodeId, i) => {
    const node = nodeMap[nodeId];
    const prevNode = i > 0 ? nodeMap[result.path[i - 1]] : null;
    const isFloorTransition = prevNode && prevNode.floor_id !== node.floor_id;
    return {
      nodeId,
      node,
      isFloorTransition,
      stepIndex: i,
    };
  });

  return { ...result, pathDetails, nodeMap, isAccessible: requireAccessible };
}

// ──────────────────────────────────────────────
// Calculate Euclidean distance between two points/nodes
// ──────────────────────────────────────────────
export function euclideanDistance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// ──────────────────────────────────────────────
// Generate cardinal direction between nodes
// ──────────────────────────────────────────────
export function getDirection(fromNode, toNode) {
  const dx = toNode.x - fromNode.x;
  const dy = toNode.y - fromNode.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // SVG coords: +y is down, +x is right
  if (angle >= -22.5 && angle < 22.5) return 'right';
  if (angle >= 22.5 && angle < 67.5) return 'down-right';
  if (angle >= 67.5 && angle < 112.5) return 'down';
  if (angle >= 112.5 && angle < 157.5) return 'down-left';
  if (angle >= 157.5 || angle < -157.5) return 'left';
  if (angle >= -157.5 && angle < -112.5) return 'up-left';
  if (angle >= -112.5 && angle < -67.5) return 'up';
  if (angle >= -67.5 && angle < -22.5) return 'up-right';
  return 'ahead';
}

// ──────────────────────────────────────────────
// Generate turn-by-turn instructions
// ──────────────────────────────────────────────
export function generateDirections(pathDetails, nodeMap, locations = []) {
  if (!pathDetails || pathDetails.length < 2) {
    return [{ step: 1, text: 'You are already at the destination.', type: 'info' }];
  }

  const locationMap = {};
  for (const loc of locations) {
    locationMap[loc.id] = loc;
  }

  const instructions = [];
  let stepNum = 1;

  // Start instruction
  const startNode = pathDetails[0].node;
  const startLabel = startNode.label || (startNode.location_id && locationMap[startNode.location_id]?.name) || 'QR scan location';
  instructions.push({
    step: stepNum++,
    text: `Start at ${startLabel}`,
    type: 'start',
    nodeId: startNode.id,
  });

  for (let i = 1; i < pathDetails.length; i++) {
    const prev = pathDetails[i - 1].node;
    const curr = pathDetails[i].node;
    const dir = getDirection(prev, curr);

    // Floor transition
    if (pathDetails[i].isFloorTransition) {
      const transType = curr.node_type === 'lift' ? 'lift' : 'stairs';
      instructions.push({
        step: stepNum++,
        text: `Take the ${transType} to reach the destination floor`,
        type: 'floor_transition',
        nodeId: curr.id,
      });
      continue;
    }

    // Named location arrival
    const currLabel = curr.label || (curr.location_id && locationMap[curr.location_id]?.name);
    if (currLabel && i === pathDetails.length - 1) {
      instructions.push({
        step: stepNum++,
        text: `Arrive at ${currLabel}`,
        type: 'destination',
        nodeId: curr.id,
      });
    } else if (currLabel) {
      instructions.push({
        step: stepNum++,
        text: `Walk ${dir} past ${currLabel}`,
        type: 'waypoint',
        nodeId: curr.id,
      });
    } else if (curr.node_type === 'corridor_junction') {
      instructions.push({
        step: stepNum++,
        text: `Continue ${dir} at the corridor junction`,
        type: 'junction',
        nodeId: curr.id,
      });
    }
  }

  // Ensure we have a destination instruction
  if (instructions.length > 0 && instructions[instructions.length - 1].type !== 'destination') {
    const lastNode = pathDetails[pathDetails.length - 1].node;
    const lastLabel = lastNode.label || (lastNode.location_id && locationMap[lastNode.location_id]?.name) || 'destination';
    instructions.push({
      step: stepNum++,
      text: `Arrive at ${lastLabel}`,
      type: 'destination',
      nodeId: lastNode.id,
    });
  }

  return instructions;
}

// ──────────────────────────────────────────────
// Find a node linked to a specific location
// ──────────────────────────────────────────────
export function findNodeForLocation(nodes, locationId) {
  return nodes.find((n) => n.location_id === locationId && !n.is_disabled) || null;
}

// ──────────────────────────────────────────────
// Find nearest corridor/waypoint for auto-connection
// ──────────────────────────────────────────────
export function findNearestWaypoint(fromNode, allNodes, existingEdges = [], maxDist = 250) {
  if (!fromNode) return null;

  // Set of node IDs already directly connected to fromNode
  const connectedIds = new Set();
  for (const e of existingEdges) {
    if (e.from_node_id === fromNode.id) connectedIds.add(e.to_node_id);
    if (e.to_node_id === fromNode.id) connectedIds.add(e.from_node_id);
  }

  let bestNode = null;
  let bestDist = maxDist;

  for (const n of allNodes) {
    if (n.id === fromNode.id) continue;
    if (n.floor_id !== fromNode.floor_id) continue;
    if (n.is_disabled) continue;
    if (connectedIds.has(n.id)) continue;

    // Prefer corridor_junction, waypoint, or entrance
    const d = euclideanDistance(fromNode.x, fromNode.y, n.x, n.y);
    if (d < bestDist) {
      bestDist = d;
      bestNode = { node: n, distance: Math.round(d) };
    }
  }

  return bestNode;
}

// ──────────────────────────────────────────────
// Check if two line segments intersect (p1-p2 and p3-p4)
// ──────────────────────────────────────────────
export function lineSegmentsIntersect(p1, p2, p3, p4) {
  const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(d) < 1e-6) return false;
  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
  const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / d;
  return t > 0.01 && t < 0.99 && u >= 0 && u <= 1;
}

// ──────────────────────────────────────────────
// Check if line segment between p1 and p2 cuts through a room rectangle
// ──────────────────────────────────────────────
export function doLineSegmentIntersectsRect(p1, p2, rect) {
  if (!rect || rect.type !== 'rect') return false;
  const rx1 = rect.x;
  const ry1 = rect.y;
  const rx2 = rect.x + rect.width;
  const ry2 = rect.y + rect.height;

  const lines = [
    [{ x: rx1, y: ry1 }, { x: rx2, y: ry1 }], // top
    [{ x: rx2, y: ry1 }, { x: rx2, y: ry2 }], // right
    [{ x: rx2, y: ry2 }, { x: rx1, y: ry2 }], // bottom
    [{ x: rx1, y: ry2 }, { x: rx1, y: ry1 }], // left
  ];

  return lines.some(([p3, p4]) => lineSegmentsIntersect(p1, p2, p3, p4));
}

// ──────────────────────────────────────────────
// Suggest safe, non-wall-penetrating connections for disconnected nodes
// ──────────────────────────────────────────────
export function suggestSafeConnections(locations = [], nodes = [], edges = [], maxDistance = 650) {
  const existingPairSet = new Set();
  for (const e of edges) {
    if (e.is_disabled) continue;
    existingPairSet.add(`${e.from_node_id}:${e.to_node_id}`);
    existingPairSet.add(`${e.to_node_id}:${e.from_node_id}`);
  }

  const degrees = new Map();
  for (const n of nodes) {
    if (!n.is_disabled) degrees.set(n.id, 0);
  }
  for (const e of edges) {
    if (!e.is_disabled) {
      if (degrees.has(e.from_node_id)) degrees.set(e.from_node_id, degrees.get(e.from_node_id) + 1);
      if (degrees.has(e.to_node_id)) degrees.set(e.to_node_id, degrees.get(e.to_node_id) + 1);
    }
  }

  const roomRects = locations
    .filter((loc) => loc.shape_data && loc.shape_data.type === 'rect' && loc.location_type !== 'corridor')
    .map((loc) => ({ locationId: loc.id, name: loc.name, shape: loc.shape_data }));

  const disconnectedNodes = nodes.filter((n) => !n.is_disabled && (degrees.get(n.id) === 0));
  const suggestions = [];

  for (const targetNode of disconnectedNodes) {
    let bestCandidate = null;
    let minDistance = maxDistance;

    for (const candidate of nodes) {
      if (candidate.id === targetNode.id || candidate.is_disabled) continue;
      if (existingPairSet.has(`${targetNode.id}:${candidate.id}`)) continue;

      const dist = euclideanDistance(targetNode.x, targetNode.y, candidate.x, candidate.y);
      if (dist >= minDistance) continue;

      // Check if straight line between targetNode and candidate intersects any unrelated room's walls
      let penetratesWall = false;
      for (const room of roomRects) {
        if (room.locationId === targetNode.location_id || room.locationId === candidate.location_id) {
          continue;
        }
        if (doLineSegmentIntersectsRect(targetNode, candidate, room.shape)) {
          penetratesWall = true;
          break;
        }
      }

      if (!penetratesWall) {
        minDistance = dist;
        bestCandidate = candidate;
      }
    }

    if (bestCandidate) {
      suggestions.push({
        id: `${targetNode.id}-${bestCandidate.id}`,
        fromNode: targetNode,
        toNode: bestCandidate,
        distance: Math.round(minDistance),
        edge_type: (targetNode.node_type === 'stairs' || bestCandidate.node_type === 'stairs') ? 'stairs' : 'walkway',
        is_accessible: targetNode.node_type !== 'stairs' && bestCandidate.node_type !== 'stairs',
        is_bidirectional: true,
      });
    }
  }

  return suggestions;
}

// ──────────────────────────────────────────────
// Check if two rectangular shapes overlap
// ──────────────────────────────────────────────
export function doRectanglesOverlap(r1, r2) {
  // AABB collision detection
  // r1: { x, y, width, height }
  const r1Right = r1.x + r1.width;
  const r1Bottom = r1.y + r1.height;
  const r2Right = r2.x + r2.width;
  const r2Bottom = r2.y + r2.height;

  return !(
    r1Right <= r2.x ||
    r1.x >= r2Right ||
    r1Bottom <= r2.y ||
    r1.y >= r2Bottom
  );
}

// ──────────────────────────────────────────────
// Comprehensive Floor Map Validation
// ──────────────────────────────────────────────
export function validateFloorMap(locations = [], nodes = [], edges = [], qrStartNodeId = null) {
  const issues = [];
  const warnings = [];

  const nodeMap = new Map();
  for (const n of nodes) nodeMap.set(n.id, n);

  // 1. Basic graph edge integrity
  for (const edge of edges) {
    if (!nodeMap.has(edge.from_node_id)) {
      issues.push(`Edge references missing start node (${edge.from_node_id})`);
    }
    if (!nodeMap.has(edge.to_node_id)) {
      issues.push(`Edge references missing end node (${edge.to_node_id})`);
    }
    if (edge.from_node_id === edge.to_node_id) {
      issues.push(`Self-loop detected on node ${edge.from_node_id}`);
    }
    if (edge.distance < 0) {
      issues.push(`Edge has invalid negative distance (${edge.distance})`);
    }
  }

  // 2. Overlapping rooms check
  const rectLocations = locations.filter((l) => l.shape_data && l.shape_data.type === 'rect');
  for (let i = 0; i < rectLocations.length; i++) {
    for (let j = i + 1; j < rectLocations.length; j++) {
      const locA = rectLocations[i];
      const locB = rectLocations[j];
      // Skip corridors overlapping rooms as corridors might be designed through
      if (locA.location_type === 'corridor' || locB.location_type === 'corridor') continue;

      if (doRectanglesOverlap(locA.shape_data, locB.shape_data)) {
        warnings.push(`Room "${locA.name}" overlaps with "${locB.name}"`);
      }
    }
  }

  // 3. Rooms missing doors / nodes
  const locationNodeCount = new Map();
  for (const n of nodes) {
    if (n.location_id) {
      locationNodeCount.set(n.location_id, (locationNodeCount.get(n.location_id) || 0) + 1);
    }
  }

  for (const loc of locations) {
    if (loc.location_type === 'corridor') continue;
    const count = locationNodeCount.get(loc.id) || 0;
    if (count === 0) {
      warnings.push(`Room "${loc.name}" has no door/navigation node linked`);
    }
  }

  // 4. Disconnected nodes (degree 0)
  const nodeDegrees = new Map();
  for (const n of nodes) {
    if (!n.is_disabled) nodeDegrees.set(n.id, 0);
  }
  for (const e of edges) {
    if (!e.is_disabled) {
      if (nodeDegrees.has(e.from_node_id)) nodeDegrees.set(e.from_node_id, nodeDegrees.get(e.from_node_id) + 1);
      if (nodeDegrees.has(e.to_node_id)) nodeDegrees.set(e.to_node_id, nodeDegrees.get(e.to_node_id) + 1);
    }
  }

  for (const [nodeId, deg] of nodeDegrees.entries()) {
    if (deg === 0) {
      const n = nodeMap.get(nodeId);
      if (n?.is_disabled) continue;
      const label = n?.label || (n?.location_id && locations.find((l) => l.id === n.location_id)?.name) || nodeId.slice(0, 8);
      warnings.push(`Node "${label}" is disconnected (0 connected paths)`);
    }
  }

  // 5. QR Start Node check & reachability
  let unreachableDestinations = [];
  if (!qrStartNodeId) {
    warnings.push('No primary QR starting node has been set for this floor');
  } else if (!nodeMap.has(qrStartNodeId)) {
    issues.push('Configured QR start node does not exist in nodes list');
  } else {
    // Run reachability test from QR start node
    const { adj } = buildAdjacencyList(nodes, edges);
    for (const loc of locations) {
      if (loc.is_searchable === false) continue;
      const targetNode = nodes.find((n) => n.location_id === loc.id && !n.is_disabled);
      if (targetNode && targetNode.id !== qrStartNodeId) {
        const route = dijkstra(adj, qrStartNodeId, targetNode.id);
        if (route.path.length === 0) {
          unreachableDestinations.push(loc.name);
        }
      }
    }
    if (unreachableDestinations.length > 0) {
      warnings.push(`${unreachableDestinations.length} destination(s) unreachable from QR start: ${unreachableDestinations.slice(0, 3).join(', ')}${unreachableDestinations.length > 3 ? '...' : ''}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings,
    isFullyConnected: issues.length === 0 && warnings.length === 0,
    unreachableCount: unreachableDestinations.length,
  };
}

// ──────────────────────────────────────────────
// Validate graph integrity
// ──────────────────────────────────────────────
export function validateGraph(nodes, edges) {
  const issues = [];
  const nodeIds = new Set(nodes.map((n) => n.id));

  for (const edge of edges) {
    if (!nodeIds.has(edge.from_node_id)) {
      issues.push(`Edge ${edge.id} references missing from_node ${edge.from_node_id}`);
    }
    if (!nodeIds.has(edge.to_node_id)) {
      issues.push(`Edge ${edge.id} references missing to_node ${edge.to_node_id}`);
    }
    if (edge.from_node_id === edge.to_node_id) {
      issues.push(`Edge ${edge.id} is a self-loop`);
    }
    if (edge.distance < 0) {
      issues.push(`Edge ${edge.id} has negative distance ${edge.distance}`);
    }
  }

  return { valid: issues.length === 0, issues };
}

// ──────────────────────────────────────────────
// Format distance for display
// ──────────────────────────────────────────────
export function formatDistance(d) {
  if (d === Infinity || d === null || d === undefined) return '—';
  if (d < 1) return '< 1 m';
  return `~${Math.round(d)} m`;
}
