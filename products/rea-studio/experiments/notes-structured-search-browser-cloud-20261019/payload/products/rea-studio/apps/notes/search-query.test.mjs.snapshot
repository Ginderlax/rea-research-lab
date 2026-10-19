import test from 'node:test';
import assert from 'node:assert/strict';
import { compileStructuredSearch, metadataLike, parseSearchQuery } from './search-query.mjs';

const folder = (id, title, parent_id = '') => ({ type: 2, title, props: { id, parent_id } });
const records = { a: folder('a', 'Lab'), b: folder('b', 'Child', 'a'), c: folder('c', 'Elsewhere'), d: folder('d', 'Lab', 'c') };
const note = (id, title, body, tags, notebookId, todo = { isTodo: false, due: 0, completed: 0 }) => ({ id, title, body, tags, notebookId, todo });
const rows = [note('1', 'Project alpha', 'ready for review', ['work'], 'a'), note('2', 'Other', 'project alpha archived', ['work', 'spam'], 'b', { isTodo: true, due: 0, completed: 0 }), note('3', 'Project alpha', 'ready', [], 'd', { isTodo: true, due: 0, completed: 12 }), note('4', 'Elsewhere', 'nothing', [], 'c')];
const ids = query => rows.filter(compileStructuredSearch(query, records).matches).map(row => row.id);

test('field text and negation compose with literal substring semantics', () => {
  assert.deepEqual(ids('title:"project alpha" -body:archived'), ['1', '3']);
  assert.deepEqual(ids('"project alpha"'), ['1', '2', '3']);
  assert.deepEqual(ids('body:review'), ['1']);
  assert.deepEqual(ids('work'), []); // Unqualified Filters text does not implicitly search tags.
  assert.deepEqual(ids('tag:work -tag:spam'), ['1']);
  assert.deepEqual(ids('type:todo iscompleted:0'), ['2']);
  assert.deepEqual(ids('iscompleted:1'), ['3']);
  assert.deepEqual(ids('iscompleted:0 type:note'), []);
});

test('base notebook titles select all matching trees, descendants and explicit exclusions', () => {
  assert.deepEqual(ids('notebook:Lab'), ['1', '2', '3']);
  assert.deepEqual(ids('notebook:Lab -notebook:Child'), ['1', '3']);
  assert.deepEqual(ids('notebook:Child notebook:Elsewhere'), ['2', '3', '4']);
  assert.deepEqual(ids('-notebook:Lab'), ['4']);
  assert.deepEqual(ids('notebook:"Lab / Child"'), []);
  assert.deepEqual(ids('notebook:La_ type:todo'), ['2', '3']);
});

test('metadata patterns have bounded SQLite LIKE case, percent and code-point semantics', () => {
  for (const [value, pattern, expected] of [['Work', 'work', true], ['Équipe', 'équipe', false], ['a🧪b', 'a_b', true], ['ab', 'a_b', false], ['50 percent', '50%', true], ['abc', '%b%', true], ['abc', '%d%', false], ['abc', 'a_c', true], ['', '%', true], ['', '_', false], ['line\nbreak', 'line_break', true]]) assert.equal(metadataLike(value, pattern), expected);
  assert.deepEqual(ids('tag:*'), ['1', '2']);
  assert.deepEqual(ids('-tag:*'), ['3', '4']);
});

test('unsupported parsed clauses and text wildcards fail explicitly', () => {
  for (const query of ['any:0', 'any:1', 'created:2026', 'updated:2026', 'due:day-1', 'resource:image/*', 'sourceurl:https://example.invalid', 'latitude:12', 'longitude:12', 'altitude:12', 'id:abc']) assert.throws(() => compileStructuredSearch(query, records), /does not yet support/);
  for (const query of ['cat*', 'title:plan*', 'body:*secret']) assert.throws(() => compileStructuredSearch(query, records), /wildcards only in tag: and notebook:/);
  for (const query of ['-type:todo', '-iscompleted:1']) assert.throws(() => parseSearchQuery(query), /can't be negated/);
  assert.throws(() => parseSearchQuery('type:TODO'), /must be "note" or "todo"/);
  assert.throws(() => parseSearchQuery('iscompleted:true'), /must be "1" or "0"/);
});

test('empty parsed query has no condition and fields follow pinned partial-query behavior', () => {
  assert.deepEqual(ids(''), ['1', '2', '3', '4']);
  assert.deepEqual(ids('any:'), ['1', '2', '3', '4']); // The original parser drops a field with no value.
  assert.deepEqual(ids('title:""'), ['1', '2', '3', '4']); // Explicit local empty-substring policy, not FTS parity.
  assert.deepEqual(parseSearchQuery('boddy:hello'), [{ name: 'text', value: '"boddy:hello"', negated: false, quoted: false, wildcard: false }]);
  assert.deepEqual(ids('title:"project alpha'), ['1', '3']);
});

test('bounds, notebook integrity and immutable query records reject invalid input', () => {
  for (const query of [null, 1, 'x'.repeat(501), '\0']) assert.throws(() => parseSearchQuery(query), /500/);
  assert.throws(() => parseSearchQuery(Array(66).fill('a').join(' ')), /64 parsed terms/);
  const terms = parseSearchQuery('tag:work');
  assert.equal(Object.isFrozen(terms), true); assert.equal(Object.isFrozen(terms[0]), true);
  assert.throws(() => compileStructuredSearch('notebook:Lab', { a: folder('a', 'Lab', 'a') }), /cycle/);
  assert.throws(() => compileStructuredSearch('notebook:Lab', { a: folder('a', 'Lab', 'missing') }), /ancestor/);
  const before = JSON.stringify({ records, rows }); compileStructuredSearch('notebook:Lab tag:work', records).matches(rows[0]);
  assert.equal(JSON.stringify({ records, rows }), before);
});
