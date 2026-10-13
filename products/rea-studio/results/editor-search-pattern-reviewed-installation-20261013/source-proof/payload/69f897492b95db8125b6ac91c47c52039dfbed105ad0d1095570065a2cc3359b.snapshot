import test from 'node:test';
import assert from 'node:assert/strict';
import {Position, Range, Selection} from './position-range-selection.mjs';

// Installable finite regressions authored from the accepted documented contract.
// No vendor oracle/compiler import, filesystem output or independent-differential claim.
const point = p => [p.line, p.character];
const ends = r => [point(r.start), point(r.end)];

test('Position constructor, readonly coordinates and explicit negative failures', () => {
 const p=new Position(0,0);assert.deepEqual(point(p),[0,0]);
 for(const field of ['line','character'])assert.throws(()=>{p[field]=12;},TypeError);
 assert.deepEqual(point(p),[0,0]);assert.throws(()=>new Position(-1,0),/line must be non-negative/);assert.throws(()=>new Position(0,-1),/character must be non-negative/);
 const large=new Position(Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER);assert.deepEqual(point(large),[Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER]);
});

test('Position ordering, equality and compareTo agree at equal and adjacent coordinates', () => {
 const points=[[0,0],[0,1],[1,0],[1,3],[10,0]].map(([l,c])=>new Position(l,c));
 for(let i=0;i<points.length;i++)for(let j=0;j<points.length;j++){
  const a=points[i],b=points[j];assert.equal(a.isBefore(b),i<j);assert.equal(a.isBeforeOrEqual(b),i<=j);assert.equal(a.isAfter(b),i>j);assert.equal(a.isAfterOrEqual(b),i>=j);assert.equal(a.isEqual(b),i===j);assert.equal(a.compareTo(b),i<j?-1:i>j?1:0);
 }
});

test('Position translate overloads and both optional deltas retain unchanged identity', () => {
 const p=new Position(2,4);assert.equal(p.translate(),p);assert.equal(p.translate(0,0),p);assert.equal(p.translate({}),p);
 assert.deepEqual(point(p.translate(3,2)),[5,6]);assert.deepEqual(point(p.translate({lineDelta:3})),[5,4]);assert.deepEqual(point(p.translate({characterDelta:-2})),[2,2]);assert.deepEqual(point(p.translate({lineDelta:-1,characterDelta:1})),[1,5]);
 assert.throws(()=>p.translate(-3,0),/line must be non-negative/);assert.throws(()=>p.translate(null),/Illegal argument/);assert.deepEqual(point(p),[2,4]);
});

test('Position with overloads and both optional coordinates create only changed values', () => {
 const p=new Position(2,4);assert.equal(p.with(),p);assert.equal(p.with(2,4),p);assert.equal(p.with({}),p);
 assert.deepEqual(point(p.with(6,7)),[6,7]);assert.deepEqual(point(p.with({line:0})),[0,4]);assert.deepEqual(point(p.with({character:0})),[2,0]);assert.deepEqual(point(p.with({line:1,character:2})),[1,2]);assert.throws(()=>p.with(null),/Illegal argument/);assert.deepEqual(point(p),[2,4]);
});

test('Range constructor overloads order endpoints, expose readonly bounds and empty/single-line state', () => {
 const a=new Position(3,2),b=new Position(1,4),r=new Range(a,b);assert.equal(r.start,b);assert.equal(r.end,a);assert.deepEqual(ends(new Range(3,2,1,4)),[[1,4],[3,2]]);
 assert.equal(r.isEmpty,false);assert.equal(r.isSingleLine,false);assert.equal(new Range(1,4,1,4).isEmpty,true);assert.equal(new Range(1,4,1,8).isSingleLine,true);
 for(const key of ['start','end','isEmpty','isSingleLine'])assert.throws(()=>{r[key]=0;},TypeError);
 assert.throws(()=>new Range(-1,0,0,0),/line must be non-negative/);assert.throws(()=>new Range({},{}),/Invalid arguments/);
});

test('Range contains has inclusive point endpoints, nested ranges and complete-range equality', () => {
 const r=new Range(1,2,3,4);for(const p of [[1,2],[2,0],[3,4]])assert.equal(r.contains(new Position(...p)),true);for(const p of [[1,1],[3,5],[0,0]])assert.equal(r.contains(new Position(...p)),false);
 assert.equal(r.contains(new Range(2,0,3,4)),true);assert.equal(r.contains(new Range(0,0,2,0)),false);assert.equal(r.contains(null),false);assert.equal(r.isEqual(new Range(3,4,1,2)),true);assert.equal(r.isEqual(new Range(1,2,3,5)),false);
});

test('Range intersection handles disjoint, touching, nested and partial overlap without mutation', () => {
 const r=new Range(0,1,0,5);assert.equal(r.intersection(new Range(0,6,0,8)),undefined);const touching=r.intersection(new Range(0,5,0,8));assert.equal(touching.isEmpty,true);assert.deepEqual(ends(touching),[[0,5],[0,5]]);
 assert.deepEqual(ends(r.intersection(new Range(0,3,0,7))),[[0,3],[0,5]]);assert.deepEqual(ends(r.intersection(new Range(0,2,0,4))),[[0,2],[0,4]]);assert.deepEqual(ends(r),[[0,1],[0,5]]);
});

test('Range union reuses containing ranges and expands disjoint bounds', () => {
 const outer=new Range(1,0,4,0),inner=new Range(2,0,3,0);assert.equal(outer.union(inner),outer);assert.equal(inner.union(outer),outer);assert.deepEqual(ends(inner.union(new Range(0,3,1,0))),[[0,3],[3,0]]);assert.deepEqual(ends(inner),[[2,0],[3,0]]);
});

test('Range with overloads and both optional endpoints preserve alias identity when unchanged', () => {
 const a=new Position(1,2),b=new Position(3,4),r=new Range(a,b);assert.equal(r.with(),r);assert.equal(r.with(a,b),r);assert.equal(r.with({}),r);
 assert.deepEqual(ends(r.with(new Position(0,0),b)),[[0,0],[3,4]]);assert.deepEqual(ends(r.with({start:new Position(2,0)})),[[2,0],[3,4]]);assert.deepEqual(ends(r.with({end:new Position(2,5)})),[[1,2],[2,5]]);assert.throws(()=>r.with(null),/Illegal argument/);assert.deepEqual(ends(r),[[1,2],[3,4]]);
});

test('Selection constructor overloads preserve directional anchor/active and ordered range', () => {
 const a=new Position(3,4),b=new Position(1,2),s=new Selection(a,b);assert.equal(s.anchor,a);assert.equal(s.active,b);assert.equal(s.isReversed,true);assert.deepEqual(ends(s),[[1,2],[3,4]]);
 const forward=new Selection(1,2,3,4);assert.deepEqual(point(forward.anchor),[1,2]);assert.deepEqual(point(forward.active),[3,4]);assert.equal(forward.isReversed,false);assert.equal(new Selection(1,2,1,2).isEmpty,true);
 for(const key of ['anchor','active','isReversed'])assert.throws(()=>{s[key]=0;},TypeError);assert.equal(s instanceof Range,true);
});

test('Selection inherits ten nonconstructor Range declaration entries across nine names', () => {
 const s=new Selection(1,2,3,4),inner=new Range(2,0,3,0);assert.deepEqual(point(s.start),[1,2]);assert.deepEqual(point(s.end),[3,4]);assert.equal(s.isEmpty,false);assert.equal(s.isSingleLine,false);assert.equal(s.contains(inner),true);assert.equal(s.isEqual(new Range(1,2,3,4)),true);
 assert.deepEqual(ends(s.intersection(inner)),[[2,0],[3,0]]);assert.equal(s.union(inner),s);assert.equal(s.with(s.start,s.end),s);assert.equal(s.with({}),s);const changed=s.with({end:new Position(4,0)});assert.equal(changed instanceof Range,true);assert.equal(changed instanceof Selection,false);assert.deepEqual(ends(changed),[[1,2],[4,0]]);
});

test('Six released compatibility call/apply helpers construct new objects and preserve supplied receivers', () => {
 for(const [Type,args]of [[Position,[2,3]],[Range,[1,2,3,4]],[Selection,[3,4,1,2]]])for(const mode of ['call','apply']){
  const helper=Type[mode],receiver={constructor:Type,owned:'unchanged'};assert.equal(typeof helper,'function');assert.ok(Object.hasOwn(helper,'prototype'));assert.equal(helper.length,0);
  const invoked=mode==='call'?helper(receiver,...args):helper(receiver,args);assert.equal(invoked instanceof Type,true);assert.equal(receiver.owned,'unchanged');assert.deepEqual(Object.keys(receiver),['constructor','owned']);
  const values=mode==='call'?[receiver,...args]:[receiver,args];const constructed=Reflect.construct(helper,values);assert.equal(constructed instanceof Type,true);assert.deepEqual(Type===Position?point(constructed):ends(constructed),Type===Position?point(invoked):ends(invoked));
 }
});

test('Value objects serialize without document binding and tolerate source-supported noninteger numbers', () => {
 const p=new Position(1.5,Infinity);assert.deepEqual(point(p),[1.5,Infinity]);const r=new Range(0,1,2,3),s=new Selection(2,3,0,1);assert.equal(JSON.stringify(new Position(1,2)),'{"line":1,"character":2}');assert.equal(JSON.stringify(r),'[{"line":0,"character":1},{"line":2,"character":3}]');assert.deepEqual(JSON.parse(JSON.stringify(s)),{start:{line:0,character:1},end:{line:2,character:3},active:{line:0,character:1},anchor:{line:2,character:3}});
});
