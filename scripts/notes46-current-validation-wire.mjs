// Current Notes46 publication wire boundary only. Historical predicate modules
// and their returned runtime objects are never mutated or rewritten here.
import assert from 'node:assert/strict';
import { types } from 'node:util';

export const NOTES46_ABSENT_HISTORICAL_RESOLVER_PATH = Object.freeze([
  'historicalValidation', 'followupEvidence', 'notesInlineVerification', 'resolveHistorical',
]);
const limits = Object.freeze({ nodes: 262144, depth: 64, bytes: 8 * 1024 * 1024 });
const isAbsentResolver = keys => keys.length === NOTES46_ABSENT_HISTORICAL_RESOLVER_PATH.length &&
  keys.every((key, index) => key === NOTES46_ABSENT_HISTORICAL_RESOLVER_PATH[index]);

export function createNotes46CurrentValidationWire(input) {
  const active = new WeakSet(); let nodes = 0, omitted = 0;
  function copy(value, keys, depth) {
    assert(++nodes <= limits.nodes && depth <= limits.depth, 'Current validation wire data bounds');
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') {
      assert(Number.isFinite(value) && !Object.is(value, -0), 'Current validation requires lossless JSON numbers');
      return value;
    }
    assert(value !== undefined && typeof value === 'object', 'Unexpected non-JSON current validation value');
    assert(!types.isProxy(value), 'Proxy current validation values are unsupported');
    const array = Array.isArray(value);
    assert.equal(Object.getPrototypeOf(value), array ? Array.prototype : Object.prototype, 'Only ordinary JSON data containers');
    assert(!active.has(value), 'Cyclic current validation data');
    assert(!('toJSON' in value), 'Current validation toJSON hooks are unsupported');
    active.add(value);
    try {
      const descriptors = Object.getOwnPropertyDescriptors(value), names = Reflect.ownKeys(descriptors);
      assert(names.every(name => typeof name === 'string'), 'Symbol current validation keys are unsupported');
      if (array) {
        const length = descriptors.length;
        assert(length && Object.hasOwn(length, 'value') && length.enumerable === false);
        assert(Number.isSafeInteger(length.value) && length.value >= 0 && length.value < limits.nodes);
        assert.equal(names.length, length.value + 1, 'Sparse arrays or extra array fields are unsupported');
        const result = [];
        for (let index = 0; index < length.value; index++) {
          const descriptor = descriptors[String(index)];
          assert(descriptor && Object.hasOwn(descriptor, 'value') && descriptor.enumerable === true, 'Sparse/accessor array entries are unsupported');
          result.push(copy(descriptor.value, [...keys, String(index)], depth + 1));
        }
        return result;
      }
      const result = {};
      for (const name of names) {
        const descriptor = descriptors[name], next = [...keys, name];
        assert(Object.hasOwn(descriptor, 'value') && descriptor.enumerable === true, 'Accessor/nonenumerable current validation fields are unsupported');
        if (isAbsentResolver(next)) {
          assert.equal(descriptor.value, undefined, 'Only the known absent historical resolver may be omitted');
          assert(++omitted <= 1); continue;
        }
        // defineProperty preserves an ordinary own "__proto__" data key without
        // invoking Object.prototype's legacy assignment setter.
        Object.defineProperty(result, name, { value: copy(descriptor.value, next, depth + 1), enumerable: true, writable: true, configurable: true });
      }
      return result;
    } finally { active.delete(value); }
  }
  const wire = copy(input, [], 0);
  assert.equal(wire.schema, 'rea-notes46-current-publication-validation/v1', 'Current publication schema only');
  assert.equal(wire.status, 'passed');
  assert.equal(wire.historicalValidation?.schema, 'rea-notes46-historical2a-record-predicates/v1');
  const inline = wire.historicalValidation.followupEvidence?.notesInlineVerification;
  assert(inline && typeof inline === 'object' && !Array.isArray(inline), 'Exact historical inline summary is required');
  assert.equal(inline.sourceOnly, true); assert.equal(inline.sourceStable, true);
  assert.equal(Object.hasOwn(inline, 'resolveHistorical'), false);
  const encoded = JSON.stringify(wire);
  assert(Buffer.byteLength(encoded) <= limits.bytes, 'Current validation wire member bound');
  // These are assertions, not a JSON normalizer. Every remaining value has
  // already passed the explicit type/descriptor/container checks above.
  assert.equal(encoded, JSON.stringify(input), 'Every originally serialized field must be retained exactly');
  assert.deepEqual(JSON.parse(encoded), wire, 'Current validation wire must be lossless JSON data');
  return wire;
}
