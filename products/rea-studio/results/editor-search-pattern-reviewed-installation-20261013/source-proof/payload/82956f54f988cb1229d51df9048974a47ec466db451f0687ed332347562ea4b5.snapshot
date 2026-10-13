// New standard-library implementation assisted by pinned MIT VS Code sources.
// Original createRegExp edge wrapping is verified separately; no vendor imports.
const WORD='[\\p{Alphabetic}\\p{M}\\p{Nd}\\p{Pc}\\u200c\\u200d]';
const NOT_WORD='[^\\p{Alphabetic}\\p{M}\\p{Nd}\\p{Pc}\\u200c\\u200d]';
const boundary=`(?:(?<!${WORD})(?=${WORD})|(?<=${WORD})(?!${WORD}))`;
const nonboundary=`(?:(?<=${WORD})(?=${WORD})|(?<!${WORD})(?!${WORD}))`;
export function sourcePattern(query,{useRegex=false,wholeWord=false}={}) {
  let source=useRegex?query:query.replace(/[\\{}*+?|^$.\[\]()]/g,'\\$&');
  // The released helper tests the source's first/last characters, without
  // wrapping an alternation in a group. Retain that documented finite contract.
  if(wholeWord){if(/[A-Za-z0-9_]/.test(source.charAt(0)))source='\\b'+source;if(/[A-Za-z0-9_]/.test(source.charAt(source.length-1)))source+='\\b';}
  return source;
}
export function unicodePattern(source) {
  let result='',inClass=false;
  for(let i=0;i<source.length;i++){
    const char=source[i];
    if(char==='\\'&&i+1<source.length){
      const escaped=source[++i];
      if(inClass){
        if(escaped==='w')result+='\\p{Alphabetic}\\p{M}\\p{Nd}\\p{Pc}\\u200c\\u200d';
        else if(escaped==='d')result+='\\p{Nd}';
        else if(escaped==='s')result+='\\p{White_Space}';
        else if('WDS'.includes(escaped))throw Error('Negated shorthand classes inside a character class are not supported.');
        else result+='\\'+escaped;
      }else result+=({w:WORD,W:NOT_WORD,d:'\\p{Nd}',D:'\\P{Nd}',s:'\\p{White_Space}',S:'\\P{White_Space}',b:boundary,B:nonboundary}[escaped]??'\\'+escaped);
    }else{if(char==='['&&!inClass)inClass=true;else if(char===']'&&inClass)inClass=false;result+=char;}
  }
  return result;
}
export function scanPatternFile(content,pattern,maxMatches) {
  const rows=[];let offset=0,line=1;
  // Saved-file line contract: no virtual terminal line or empty-file match.
  while(offset<content.length){
    const newline=content.indexOf('\n',offset),next=newline<0?content.length:newline;
    const end=next>offset&&content[next-1]==='\r'?next-1:next,text=content.slice(offset,end);
    pattern.lastIndex=0;let hit;
    while((hit=pattern.exec(text))){
      const previewStart=Math.max(0,hit.index-40);
      rows.push({line,column:hit.index+1,endColumn:hit.index+hit[0].length+1,start:offset+hit.index,end:offset+hit.index+hit[0].length,preview:text.slice(previewStart,previewStart+400),previewStartColumn:previewStart+1});
      if(rows.length===maxMatches)return rows;
      // ECMAScript exec leaves lastIndex unchanged after an empty match. Move
      // over one complete Unicode scalar, never into a surrogate pair.
      if(hit[0].length===0){const at=pattern.lastIndex;pattern.lastIndex=at+(text.codePointAt(at)>0xffff?2:1);}
    }
    if(newline<0)break;offset=next+1;line++;
  }
  return rows;
}
