// Original executable model of the observed standard Grafana field fold.
const numberLike=value=>typeof value==='number' || Object.prototype.toString.call(value)==='[object Number]';
export function reconstructStandardCalcs(field,ignoreNulls=true,nullAsZero=false){
  const out={sum:0,max:-Number.MAX_VALUE,min:Number.MAX_VALUE,logmin:Number.MAX_VALUE,mean:null,last:null,first:null,lastNotNull:null,firstNotNull:null,count:0,nonNullCount:0,allIsNull:true,allIsZero:true,range:null,diff:null,delta:0,step:Number.MAX_VALUE,diffperc:0,previousDeltaUp:true};
  if(!field.values)return out;
  const numeric=['number','time'].includes(field.type);
  for(const [index,raw] of field.values.entries()){
    if(index===0)out.first=raw;
    out.last=raw;
    if(raw==null && ignoreNulls)continue;
    const value=raw==null && nullAsZero ? 0 : raw;
    out.count++;
    if(value==null || Number.isNaN(value))continue;
    const seen=out.firstNotNull!==null;
    if(!seen)out.firstNotNull=value;
    if(numeric){
      out.sum+=value || 0;
      out.allIsNull=false;
      out.nonNullCount++;
      if(seen){
        const difference=value-out.lastNotNull;
        if(out.step>difference)out.step=difference;
        const falling=out.lastNotNull>value;
        if(!falling && out.previousDeltaUp)out.delta+=difference;
        out.previousDeltaUp=!falling;
      }
      out.max=value>out.max ? value : out.max;
      out.min=value<out.min ? value : out.min;
      out.logmin=value>0 && value<out.logmin ? value : out.logmin;
    }
    if(value!==0)out.allIsZero=false;
    out.lastNotNull=value;
  }
  if(out.max===-Number.MAX_VALUE)out.max=null;
  if(out.min===Number.MAX_VALUE)out.min=null;
  if(out.step===Number.MAX_VALUE)out.step=null;
  if(out.nonNullCount)out.mean=out.sum/out.nonNullCount;
  if(out.allIsNull)out.allIsZero=false;
  if(out.min!==null && out.max!==null)out.range=out.max-out.min;
  if(numberLike(out.firstNotNull) && numberLike(out.lastNotNull))out.diff=out.lastNotNull-out.firstNotNull;
  if(numberLike(out.firstNotNull) && numberLike(out.diff))out.diffperc=out.diff/out.firstNotNull*100;
  return out;
}
