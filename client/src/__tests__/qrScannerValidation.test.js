// agent-notes: { ctx: "Validation test suite for QR parser, payload security, and floor navigation resolving", deps: [], state: "active", last: "antigravity@2026-10-03" }

import assert from 'assert';

const UUID_REGEX = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

function parseQRText(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();

  const match = trimmed.match(UUID_REGEX);
  if (!match) return null;

  const floorId = match[0];
  let startNodeId = null;

  try {
    if (trimmed.includes('?')) {
      const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://dummy.local/${trimmed}`);
      startNodeId = urlObj.searchParams.get('start') || null;
    }
  } catch {
    // not a full URL, that's okay
  }

  return { floorId, startNodeId };
}

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log(`  ✅ ${name}`);
}

console.log('🧪 QR Scanner Parsing & Security Tests\n');

test('parses full production floor navigation URL', () => {
  const result = parseQRText('https://smart-sympo.vercel.app/navigate/floor/89662758-c9c4-42ea-a48a-72efb6d1912f');
  assert.notStrictEqual(result, null);
  assert.strictEqual(result.floorId, '89662758-c9c4-42ea-a48a-72efb6d1912f');
  assert.strictEqual(result.startNodeId, null);
});

test('parses floor URL with start node query parameter', () => {
  const result = parseQRText('https://smart-sympo.vercel.app/navigate/floor/89662758-c9c4-42ea-a48a-72efb6d1912f?start=41bbcb97-e7bf-4c7d-8ae5-e51fbc15d78a');
  assert.notStrictEqual(result, null);
  assert.strictEqual(result.floorId, '89662758-c9c4-42ea-a48a-72efb6d1912f');
  assert.strictEqual(result.startNodeId, '41bbcb97-e7bf-4c7d-8ae5-e51fbc15d78a');
});

test('parses raw floor UUID directly', () => {
  const result = parseQRText('89662758-c9c4-42ea-a48a-72efb6d1912f');
  assert.notStrictEqual(result, null);
  assert.strictEqual(result.floorId, '89662758-c9c4-42ea-a48a-72efb6d1912f');
});

test('rejects arbitrary external URLs without floor UUID', () => {
  const result = parseQRText('https://evil-phishing-site.com/login');
  assert.strictEqual(result, null);
});

test('rejects empty or whitespace inputs', () => {
  assert.strictEqual(parseQRText(''), null);
  assert.strictEqual(parseQRText('   '), null);
  assert.strictEqual(parseQRText(null), null);
  assert.strictEqual(parseQRText(undefined), null);
});

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`  ${passed} QR tests passed`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
