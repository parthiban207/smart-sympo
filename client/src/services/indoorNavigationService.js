// agent-notes: { ctx: "Dijkstra shortest-path algorithm and navigation utilities for indoor floor maps", deps: [], state: "active", last: "antigravity@2026-10-03" }

/**
 * Dijkstra's shortest-path algorithm for campus indoor navigation.
 *
 * Operates on a graph of nodes and edges loaded from the campus_nodes / campus_edges tables.
 * Supports:
 *   - Bidirectional and one-way edges
 *   - Disabled nodes/edges exclusion
 *   - Multi-floor stair/lift transitions
 *   - Clear no-route results
 *   - Direction instruction generation
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
export function buildAdjacencyList(nodes, edges) {
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
export function dijkstraMultiFloor(allNodes, allEdges, startId, endId) {
  const enabledNodes = allNodes.filter((n) => !n.is_disabled);
  const enabledEdges = allEdges.filter((e) => !e.is_disabled);
  const { adj, nodeMap } = buildAdjacencyList(enabledNodes, enabledEdges);
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

  return { ...result, pathDetails, nodeMap };
}

// ──────────────────────────────────────────────
// Calculate Euclidean distance between two nodes
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
        text: `Take the ${transType} to reach the next floor`,
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
    // Skip unmarked waypoints to keep instructions concise
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
  // distances are in arbitrary map units; display as meters (1 unit ≈ 1 meter)
  if (d < 1) return '< 1 m';
  return `~${Math.round(d)} m`;
}
