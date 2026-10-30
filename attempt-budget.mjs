import {mkdirSync,readdirSync} from 'node:fs';
import {join} from 'node:path';

// Counts attempts before sending, including failures. Slots survive restarts and
// mkdir's exclusive creation coordinates independent local server processes.
// This limits this application only, not the provider account's monetary bill.
export function createAttemptBudget(directory) {
  const limit=4;
  try {mkdirSync(directory,{recursive:true});} catch {throw new Error('ATTEMPT_BUDGET_UNAVAILABLE');}
  const used=()=>{
    try {return readdirSync(directory).filter(name=>/^[0-3]$/.test(name)).length;}
    catch {throw new Error('ATTEMPT_BUDGET_UNAVAILABLE');}
  };
  return {
    remaining:()=>limit-used(),
    reserve(){
      for(let slot=0;slot<limit;slot++) {
        try {mkdirSync(join(directory,String(slot)));return;}
        catch(error){if(error.code!=='EEXIST')throw new Error('ATTEMPT_BUDGET_UNAVAILABLE');}
      }
      throw new Error('PERSISTENT_CALL_LIMIT');
    }
  };
}
