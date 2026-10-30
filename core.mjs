export const LIMITS = Object.freeze({chars:10000,lines:200,items:24,quote:1000});
export function sourceLines(text) {
  if(typeof text!=='string'||text.trim().length<20||text.length>LIMITS.chars)throw new Error('INVALID_DOCUMENT');
  const lines=text.replace(/\r\n?/g,'\n').split('\n');
  if(lines.length>LIMITS.lines)throw new Error('DOCUMENT_LINE_LIMIT');
  return lines.map((text,i)=>({id:i+1,text}));
}
const clean=(s,max=240)=>typeof s==='string'&&s.trim().length>0&&s.length<=max&&!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(s);
export function validateAnalysis(raw,text) {
  const lines=sourceLines(text);
  if(!raw||Array.isArray(raw)||typeof raw!=='object')throw new Error('INVALID_MODEL_STRUCTURE');
  const result={}; let total=0;
  for(const category of ['requirements','questions','conflicts']) {
    if(!Array.isArray(raw[category])||raw[category].length>LIMITS.items)throw new Error('INVALID_MODEL_STRUCTURE');
    result[category]=raw[category].map((item,index)=>{
      if(!item||!clean(item.title)||!Array.isArray(item.evidence)||!item.evidence.length||item.evidence.length>4)throw new Error('INVALID_MODEL_STRUCTURE');
      const seen=new Set();
      const evidence=item.evidence.map(e=>{
        if(!e||!Number.isInteger(e.line)||!clean(e.quote,LIMITS.quote)||!lines[e.line-1]?.text.includes(e.quote))throw new Error('UNGROUNDED_QUOTE');
        const key=JSON.stringify([e.line,e.quote]);if(seen.has(key))throw new Error('DUPLICATE_EVIDENCE');seen.add(key);
        return {line:e.line,quote:e.quote};
      });
      if(category==='conflicts'&&new Set(evidence.map(e=>e.line)).size<2)throw new Error('CONFLICT_NEEDS_TWO_LINES');
      total++;return {id:`${category}-${index+1}`,title:item.title.trim(),evidence,accepted:false};
    });
  }
  if(total>LIMITS.items||total===0)throw new Error('INVALID_MODEL_STRUCTURE');
  return result;
}
export function localNotes(text) {
  const lines=sourceLines(text).filter(l=>l.text.trim());
  if(lines.length>LIMITS.items)throw new Error('LOCAL_NOTE_LIMIT');
  return {requirements:lines.map(l=>({id:`note-${l.id}`,title:l.text.trim(),evidence:[{line:l.id,quote:l.text.trim()}],accepted:false})),questions:[],conflicts:[]};
}
export function makeExport(text,result,{mode,model=null,usage=null,reviewed=[]}={}) {
  const known=new Set(['requirements','questions','conflicts'].flatMap(k=>result[k].map(i=>i.id)));
  return {application:'ClearBrief',version:'0.1.0',createdAt:new Date().toISOString(),mode,model,usage,
    citationCheck:'Exact quotes and line numbers checked; meaning and completeness still require human review.',
    document:text,analysis:result,reviewed:reviewed.filter(id=>known.has(id)),actionsTaken:false};
}
