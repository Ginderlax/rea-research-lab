import assert from 'node:assert/strict';
// Source-assisted reversal of Node v24.16.0 tapEscape. JSON.stringify has
// already escaped controls; the TAP layer adds only backslash and # escapes.
export function unescapeTapJson(text){let result='';for(let n=0;n<text.length;n++){const ch=text[n];if(ch!=='\\'){result+=ch;continue;}const next=text[++n];assert.ok(next==='\\'||next==='#','Invalid or truncated TAP escape');result+=next;}return result;}
export function collect(stdout,label){
 assert.match(label,/^[A-Za-z][A-Za-z0-9]*$/);const lines=stdout.split(/\r?\n/),prefix='# {"'+label+'":',starts=lines.map((line,index)=>line.startsWith(prefix)?index:-1).filter(n=>n>=0);assert.equal(starts.length,1,'Exactly one observation marker required');
 let encoded='',lastError;for(let n=starts[0];n<lines.length&&n<starts[0]+4096;n++){const line=lines[n];if(!line.startsWith('# ')||line.startsWith('# Subtest:'))break;encoded+=line.slice(2);assert.ok(encoded.length<=1024*1024,'Observation bound exceeded');try{const value=JSON.parse(unescapeTapJson(encoded));assert.equal(Object.keys(value).length,1);assert.ok(Object.hasOwn(value,label));return value[label];}catch(e){lastError=e;}}
 throw new Error('Incomplete observation: '+lastError?.message);
}
export const readRabinObservation=collect;
