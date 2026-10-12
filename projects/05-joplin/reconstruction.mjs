// SPDX-License-Identifier: AGPL-3.0-or-later
// Laboratory source revised 2026-10-12; see NOTICE.md for upstream attribution.
// Original interoperability implementation inferred from released JavaScript behavior.
export function decodeQueryFragment(value) {
  return decodeURIComponent(String(value).split('+').join(' '));
}
export function isResourceUrl(url) {
  if(typeof url!=='string') throw new TypeError('URL must be a string');
  let body;
  if(url.startsWith('joplin://')) body=url.slice(9);
  else if(url.startsWith(':/')) body=url.slice(2);
  else return false;
  const id=body.slice(0,32);
  if(id.length!==32 || [...id].some(c=> !/[a-z0-9]/i.test(c))) return false;
  const tail=body.slice(32);
  const whitespace=tail.search(/\s/);
  const fragment=whitespace<0 ? tail : tail.slice(0,whitespace);
  const annotation=whitespace<0 ? '' : tail.slice(whitespace);
  if(fragment && !fragment.startsWith('#')) return false;
  if(annotation && !/^\s"[^\n\r\u2028\u2029]*"$/.test(annotation)) return false;
  return true;
}
export function parseResourceUrl(url) {
  if(!isResourceUrl(url))return null;
  const body=url.slice(url.startsWith('joplin://')?9:2);
  const tail=body.slice(32);
  const fragment=tail.split(/\s/,1)[0];
  return {itemId:body.slice(0,32),hash:fragment ? decodeQueryFragment(fragment.slice(1)) : ''};
}
export function headingAnchors(headings) {
  const seen=new Set();
  return headings.map(text=>{
    const base=text.replace(/[^A-Za-z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase();
    let result=base,disambiguator=1;
    while(seen.has(result))result=base+'-'+disambiguator++;
    seen.add(result);return result;
  });
}
export function notebookNavigation(headings,resourceUrls) {
  return {headings:headings.map((title,i)=>({title,anchor:headingAnchors(headings)[i]})),links:resourceUrls.map(url=>({url,resource:parseResourceUrl(url)}))};
}
