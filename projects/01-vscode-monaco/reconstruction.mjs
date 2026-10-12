// Original reconstruction of the observed sequence-diff contract.
// No dependency on Monaco or its source. Coordinates are zero-based, half-open.
export function reconstructDiff(before, after, { isValid = () => true } = {}) {
  const width = before.length, height = after.length;
  const whole = timed => ({diffs:[{a:[0,width],b:[0,height]}],hitTimeout:timed});
  if (width === 0 || height === 0) return whole(false);
  const advance = (x, y) => {
    const start = x;
    while (x < width && y < height && before[x] === after[y]) { x++; y++; }
    return {x,run:x > start ? [start,y-(x-start),x-start] : null};
  };
  const initial = advance(0,0);
  const frontier = new Map([[0,initial.run ? [initial.run] : []]]);
  const distances=[new Int32Array(10),new Int32Array(10)];
  const slot=k=>[k<0?1:0,k<0?-k-1:k];
  const getX=k=>{const [side,index]=slot(k);return distances[side][index];};
  const putX=(k,x)=>{
    const [side,index]=slot(k);
    if(index>=distances[side].length){const expanded=new Int32Array(distances[side].length*2);expanded.set(distances[side]);distances[side]=expanded;}
    distances[side][index]=x;
  };
  putX(0,initial.x);
  let completed;
  for (let depth=1; !completed; depth++) {
    if (!isValid()) return whole(true);
    const low = -Math.min(depth,height+depth%2), high = Math.min(depth,width+depth%2);
    for (let diagonal=low; diagonal<=high; diagonal+=2) {
      const topX = diagonal===high ? -1 : getX(diagonal+1);
      const leftX = diagonal===low ? -1 : getX(diagonal-1)+1;
      const startX = Math.min(width,Math.max(topX,leftX)), startY = startX-diagonal;
      if (startX > width || startY > height) continue;
      const prior = frontier.get(startX===topX ? diagonal+1 : diagonal-1);
      const extended = advance(startX,startY);
      const runs=[...(prior || []),...(extended.run ? [extended.run] : [])];
      frontier.set(diagonal,runs);
      putX(diagonal,extended.x);
      if (getX(diagonal) === width && getX(diagonal)-diagonal === height) { completed=runs; break; }
    }
  }
  const changes=[];
  let x=0,y=0;
  for (const [runX,runY,length] of completed) {
    if (x!==runX || y!==runY) changes.push({a:[x,runX],b:[y,runY]});
    x=runX+length; y=runY+length;
  }
  if (x!==width || y!==height) changes.push({a:[x,width],b:[y,height]});
  return {diffs:changes,hitTimeout:false};
}

export function applyDiff(before,after,diffs) {
  const output=[];
  let offset=0;
  for(const diff of diffs){output.push(...before.slice(offset,diff.a[0]),...after.slice(...diff.b));offset=diff.a[1];}
  return output.concat(before.slice(offset));
}
