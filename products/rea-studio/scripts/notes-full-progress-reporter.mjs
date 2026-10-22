// Side-effect-only second Node reporter. TAP remains the first stdout reporter.
import fs from 'node:fs';
import path from 'node:path';
import {admit,projector,MAX_PROGRESS_BYTES} from './notes-full-progress-contract.mjs';
export default async function* safeFullProgress(events){
  const context=admit(),filename=path.join(context.suite,'module-progress.jsonl'),fd=fs.openSync(filename,'wx');let total=0,closed=false,timer=null,writeFailure=false;
  const emit=row=>{const b=Buffer.from(JSON.stringify(row)+'\n');if(total+b.length>MAX_PROGRESS_BYTES)throw new Error('PROGRESS_BOUND');fs.writeFileSync(fd,b);fs.fsyncSync(fd);total+=b.length;};
  const project=projector(context,emit);
  try{project.open();timer=setInterval(()=>{try{project.heartbeat();}catch{writeFailure=true;process.exitCode=1;clearInterval(timer);}},10000);timer.unref();
    for await(const event of events){if(writeFailure)throw new Error('PROGRESS_WRITE');project.accept(event);}project.end();
  }catch{try{if(!writeFailure)project.error();}catch{}process.exitCode=1;throw new Error('SAFE_PROGRESS_REPORTER_REFUSED');}
  finally{clearInterval(timer);if(!closed){fs.fsyncSync(fd);fs.closeSync(fd);closed=true;}}
  // No yield: never mix diagnostic JSON with TAP or raw child stderr.
}
