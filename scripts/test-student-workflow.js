import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dijkstraMultiFloor, generateDirections } from '../client/src/services/indoorNavigationService.js';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const floorId = 'a146e927-ba37-4eb3-9f0a-0d364fd61015';

async function testWorkflow() {
  const { data: nodes } = await supabase.from('campus_nodes').select('*').eq('floor_id', floorId);
  const { data: edges } = await supabase.from('campus_edges').select('*').eq('floor_id', floorId);
  const { data: locations } = await supabase.from('campus_locations').select('*').eq('floor_id', floorId);

  const ml1Loc = locations.find(l => l.name === 'ML1');
  const seminarLoc = locations.find(l => l.name === 'Seminar Hall');

  const ml1Node = nodes.find(n => n.location_id === ml1Loc.id);
  const seminarNode = nodes.find(n => n.location_id === seminarLoc.id);

  console.log(`Starting Point: ${ml1Loc.name} (${ml1Node.id})`);
  console.log(`Destination: ${seminarLoc.name} (${seminarNode.id})`);

  const route = dijkstraMultiFloor(nodes, edges, ml1Node.id, seminarNode.id);
  console.log(`\n✅ Forward route: ${route.distance}m, Hops: ${route.path.length}`);

  const directions = generateDirections(route.pathDetails, route.nodeMap, locations);
  console.log('Turn-by-turn directions:');
  directions.forEach(d => console.log(`  ${d.step}. ${d.text}`));

  // Test reverse (Swap button simulation)
  const routeRev = dijkstraMultiFloor(nodes, edges, seminarNode.id, ml1Node.id);
  console.log(`\n✅ Swapped route: ${routeRev.distance}m, Hops: ${routeRev.path.length}`);
  const dirRev = generateDirections(routeRev.pathDetails, routeRev.nodeMap, locations);
  dirRev.forEach(d => console.log(`  ${d.step}. ${d.text}`));
}

testWorkflow().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
