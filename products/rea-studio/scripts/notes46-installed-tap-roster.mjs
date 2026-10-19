// Pure bounded TAP data contract. Importing this file does not execute tests.
import assert from 'node:assert/strict';

const resultLimit = 4096, titleLimit = 4096;
const plain = node => ({ title: node.title, children: node.children.map(plain) });
function expectedTree(nodes) {
  assert(Array.isArray(nodes) && nodes.length > 0 && nodes.length <= resultLimit);
  let results = 0;
  for (const node of nodes) {
    assert(typeof node.title === 'string' && node.title.length > 0 && node.title.length <= titleLimit && !/[\r\n]/.test(node.title));
    assert(Array.isArray(node.children) && node.children.length <= 256);
    for (const child of node.children) {
      assert(typeof child.title === 'string' && child.title.length > 0 && child.title.length <= titleLimit && !/[\r\n]/.test(child.title));
      assert.deepEqual(child.children, [], 'Only the explicitly reviewed one-level nested comparisons are allowed');
    }
    results += 1 + node.children.length;
  }
  assert(results <= resultLimit); return results;
}

export function parseNotes46Tap(raw, expectedNodes, expectedResults, label) {
  assert(Buffer.isBuffer(raw) && raw.length > 0 && raw.length <= 16 * 1024 * 1024, 'Bounded raw TAP required: ' + label);
  const text = new TextDecoder('utf-8', { fatal: true }).decode(raw);
  const count = expectedTree(expectedNodes); assert.equal(count, expectedResults);
  const lines = text.split(/\r?\n/); assert(lines.length <= 1_000_000);
  assert.equal(lines.filter(line => line === 'TAP version 13').length, 1, 'Exactly one TAP header: ' + label);
  assert(!/^\s*(?:Bail out!|not ok\b)/m.test(text), 'Failed or bailed-out result: ' + label);
  const nodes = []; let top = null, child = null, childPlan = null, rootPlan = null;
  for (const line of lines) {
    let match;
    if ((match = /^# Subtest: (.+)$/.exec(line))) {
      assert(top === null && child === null && rootPlan === null, 'Unexpected top-level registration: ' + label);
      top = { title: match[1], children: [] }; childPlan = null;
    } else if ((match = /^    # Subtest: (.*)$/.exec(line))) {
      assert(top && child === null && childPlan === null, 'Unexpected nested registration: ' + label);
      child = { title: match[1], children: [] };
    } else if ((match = /^    ok ([0-9]+) - (.*)$/.exec(line))) {
      assert(top && child && childPlan === null, 'Unregistered nested result: ' + label);
      assert.equal(Number(match[1]), top.children.length + 1, 'Nested ordinal: ' + label);
      assert.equal(match[2], child.title, 'Nested registration/result title: ' + label);
      assert(!/\s#\s*(?:SKIP|TODO)\b/i.test(match[2]), 'Skipped nested result: ' + label);
      top.children.push(child); child = null;
    } else if ((match = /^    1\.\.([0-9]+)$/.exec(line))) {
      assert(top && child === null && childPlan === null, 'Unexpected nested plan: ' + label);
      childPlan = Number(match[1]); assert.equal(childPlan, top.children.length, 'Nested plan cardinality: ' + label);
      assert(childPlan > 0, 'An empty nested parent cannot replace a comparison: ' + label);
    } else if ((match = /^ok ([0-9]+) - (.+)$/.exec(line))) {
      assert(top && child === null && rootPlan === null, 'Unregistered top-level result: ' + label);
      assert.equal(Number(match[1]), nodes.length + 1, 'Top-level ordinal: ' + label);
      assert.equal(match[2], top.title, 'Top-level registration/result title: ' + label);
      assert(!/\s#\s*(?:SKIP|TODO)\b/i.test(match[2]), 'Skipped top-level result: ' + label);
      assert.equal(childPlan, top.children.length ? top.children.length : null, 'Nested parent plan is mandatory: ' + label);
      nodes.push(top); top = null; childPlan = null;
    } else if ((match = /^1\.\.([0-9]+)$/.exec(line))) {
      assert(top === null && child === null && rootPlan === null, 'Unexpected root plan: ' + label);
      rootPlan = Number(match[1]); assert.equal(rootPlan, nodes.length, 'Root plan cardinality: ' + label);
    } else {
      assert(!/^\s+(?:(?:not )?ok [0-9]+ |# Subtest: |1\.\.[0-9]+)/.test(line), 'Unreviewed TAP nesting or structure: ' + label);
    }
  }
  assert(top === null && child === null && rootPlan !== null, 'Incomplete TAP structure: ' + label);
  assert.equal(rootPlan, expectedNodes.length, 'Exact root plan: ' + label);
  assert.deepEqual(nodes, expectedNodes.map(plain), 'Exact ordered source/title/parent-child contract: ' + label);
  const summary = {};
  for (const name of ['tests', 'suites', 'pass', 'fail', 'cancelled', 'skipped', 'todo', 'duration_ms']) {
    const matches = [...text.matchAll(new RegExp('^# ' + name + ' ([0-9]+(?:\\.[0-9]+)?)\\r?$', 'gm'))];
    assert.equal(matches.length, 1, 'One final TAP summary: ' + name + ': ' + label);
    const value = Number(matches[0][1]); assert(Number.isFinite(value) && value >= 0); summary[name] = value;
  }
  assert.equal(summary.tests, expectedResults); assert.equal(summary.pass, expectedResults);
  for (const name of ['suites', 'fail', 'cancelled', 'skipped', 'todo']) assert.equal(summary[name], 0, 'Nonpassing TAP summary: ' + name);
  return { nodes, summary, topLevelResults: nodes.length, nestedChildResults: expectedResults - nodes.length, totalResults: expectedResults };
}

export function notes46FullExpectedNodes(floor) {
  assert.equal(floor.schema, 'rea-notes46-installed-search-regression-floor/v1');
  assert.equal(floor.retained1142OrderedTopLevelNames.length, 1142);
  assert.equal(floor.full.selectedTestPins.length, 167);
  const nodes = floor.retained1142OrderedTopLevelNames.map(title => ({ title, children: [] }));
  const offset = floor.full.insertBeforeRetainedTopLevelOrdinal - 1;
  assert.equal(nodes[offset].title, floor.full.insertBeforeRetainedTitle);
  let nextOrdinal = offset + 1; const bindings = [], added = [];
  for (const module of floor.full.newModules) {
    assert.equal(module.selectedFullSourceOrdinal, floor.full.selectedTestPins.findIndex(row => 'products/rea-studio/' + row.path === module.path) + 1);
    assert.equal(module.firstFullTopLevelOrdinal, nextOrdinal);
    const results = expectedTree(module.topLevelNodes); assert.equal(results, module.results);
    bindings.push({ sourcePath: module.path, selectedSourceOrdinal: module.selectedFullSourceOrdinal, firstTopLevelOrdinal: nextOrdinal,
      topLevelResults: module.topLevelNodes.length, nestedChildResults: results - module.topLevelNodes.length, results,
      sourceBinding: 'Exact ordered aggregate command/current source pin and literal source registration contract; no per-event filename is asserted.' });
    added.push(...module.topLevelNodes.map(plain)); nextOrdinal += module.topLevelNodes.length;
  }
  assert.equal(bindings.length, 4); assert.equal(added.length, 14);
  nodes.splice(offset, 0, ...added);
  assert.equal(nodes.length, 1156); assert.equal(expectedTree(nodes), 1236);
  return { nodes, bindings };
}
