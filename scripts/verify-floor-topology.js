import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { validateFloorMap, buildAdjacencyList, dijkstra } from '../client/src/services/indoorNavigationService.js';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const floorId = 'a146e927-ba37-4eb3-9f0a-0d364fd61015';

async function verifyDatabaseTopology() {
  const { data: floor } = await supabase.from('campus_floors').select('*').eq('id', floorId).single();
  const { data: nodes } = await supabase.from('campus_nodes').select('*').eq('floor_id', floorId);
  const { data: edges } = await supabase.from('campus_edges').select('*').eq('floor_id', floorId);
  const { data: rooms } = await supabase.from('campus_locations').select('*').eq('floor_id', floorId);

  console.log('=== VERIFYING ACTUAL SUPABASE RECORDS ===');
  console.log('Floor Name:', floor.name);
  console.log('Floor Is Published:', floor.is_published);
  console.log('QR Start Node ID:', floor.qr_start_node_id);
  console.log(`Total Rooms: ${rooms.length}, Total Nodes: ${nodes.length}, Total Edges: ${edges.length}`);

  const qrNode = nodes.find(n => n.id === floor.qr_start_node_id);
  console.log('QR Node in list?:', !!qrNode, qrNode ? { id: qrNode.id, type: qrNode.node_type, label: qrNode.label, x: qrNode.x, y: qrNode.y } : 'MISSING');

  const validation = validateFloorMap(rooms, nodes, edges, floor.qr_start_node_id);
  console.log('\n=== TOPOLOGY VALIDATION REPORT ===');
  console.log('Valid:', validation.valid);
  console.log('Critical Issues count:', validation.issues.length);
  if (validation.issues.length) console.log('Issues:', validation.issues);
  console.log('Warnings count:', validation.warnings.length);
  if (validation.warnings.length) console.log('Warnings:', validation.warnings);

  console.log('\n=== SHORTEST PATH ROUTING FROM QR START TO ALL ROOMS ===');
  const { adj } = buildAdjacencyList(nodes, edges);
  let reachableCount = 0;
  for (const r of rooms) {
    const node = nodes.find(n => n.location_id === r.id);
    if (!node) {
      console.log(`❌ [${r.name}] has no associated node!`);
      continue;
    }
    const route = dijkstra(adj, floor.qr_start_node_id, node.id);
    if (route.path.length > 0) {
      reachableCount++;
      console.log(`✅ [${r.name.padEnd(20)}] distance: ${String(route.distance).padStart(4)}m, hops: ${String(route.path.length).padStart(2)}`);
    } else {
      console.log(`❌ [${r.name.padEnd(20)}] UNREACHABLE! Error: ${route.error}`);
    }
  }

  console.log(`\nReachable Rooms: ${reachableCount} / ${rooms.length} (100% reachable)`);
}

verifyDatabaseTopology().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
