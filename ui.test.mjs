import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
class Element {
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.style={};this.events={};this.value='';this.checked=false;this.disabled=false;this._text='';}
  set textContent(value){this._text=String(value);this.children=[];}
  get textContent(){return this._text+this.children.map(e=>e.textContent).join('');}
  append(...elements){this.children.push(...elements);}
  replaceChildren(...elements){this._text='';this.children=elements;}
  addEventListener(name,handler){this.events[name]=handler;}
  fire(name){return this.events[name]?.();}
  click(){return this.fire('click');}
}
function setup({server=false,fetchImpl,loading=false}={}) {
  const html=readFileSync(new URL('./dist/index.html',import.meta.url),'utf8'),script=readFileSync(new URL('./dist/app.js',import.meta.url),'utf8');
  const elements=[];
  for(const [,tag,attrs] of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/g)) {
    if(!/\bid=|data-i=/.test(attrs))continue;const e=new Element(tag);
    for(const [,name,value] of attrs.matchAll(/([a-z-]+)="([^"]*)"/g)){if(name==='id')e.id=value;if(name==='data-i')e.dataset.i=value;}
    if(/\bdisabled\b/.test(attrs))e.disabled=true;elements.push(e);
  }
  const get=id=>elements.find(e=>e.id===id),exports=[],events={},timers=[];
  const document={readyState:loading?'loading':'complete',documentElement:{lang:'pl'},getElementById:get,querySelectorAll:()=>elements.filter(e=>e.dataset.i),createElement:tag=>new Element(tag),createTextNode:text=>{const e=new Element('text');e.textContent=text;return e;},addEventListener:(name,fn)=>{events[name]=fn;}};
  vm.runInNewContext(script,{document,location:{protocol:server?'http:':'file:'},fetch:fetchImpl??(()=>{throw new Error('Unexpected outbound request');}),AbortController,Blob,URL:{createObjectURL:blob=>{exports.push(blob);return 'blob:test';},revokeObjectURL:()=>{}},setTimeout:(fn)=>timers.push(fn),Date});
  return {get,document,exports,events,edit(value){get('brief').value=value;get('brief').fire('input');}};
}
test('shipped offline script waits for document readiness, then runs local review and export',async()=>{const p=setup({loading:true});assert.equal(p.get('brief').value,'');p.events.DOMContentLoaded();assert.match(p.get('brief').value,/ceramicznej/);p.get('local').click();assert.equal(p.get('cards').children.length,7);assert.equal(p.get('ai').disabled,true);p.get('export').click();const report=JSON.parse(await p.exports[0].text());assert.equal(report.mode,'local');assert.equal(report.model,null);assert.equal(report.analysis.requirements.length,7);});
test('edit and language changes clear stale results and reset consent',()=>{const p=setup();p.get('local').click();p.get('cloudConsent').checked=true;p.edit('A different brief with enough characters.');assert.equal(p.get('cards').children.length,0);assert.equal(p.get('export').disabled,true);assert.equal(p.get('cloudConsent').checked,false);p.get('language').click();assert.equal(p.document.documentElement.lang,'en');assert.equal(p.get('brief').value,'A different brief with enough characters.');});
test('HTML-looking source is represented as text and reviewed checkbox reaches export',async()=>{const p=setup();p.edit('<img src=x onerror=attack()> This is untrusted text.');p.get('local').click();const card=p.get('cards').children[0];assert.equal(card.children[1].tag,'h3');assert.match(card.textContent,/<img src=x/);const check=card.children.at(-1).children[0];check.checked=true;check.fire('change');p.get('export').click();assert.equal(JSON.parse(await p.exports[0].text()).reviewed.length,1);});
test('late cloud response is discarded after editing, with no new request',async()=>{let release,requests=0;const p=setup({server:true,fetchImpl:async(url)=>{if(url==='/api/status')return {ok:true,json:async()=>({configured:true,remainingCalls:4})};requests++;return new Promise(r=>release=()=>r({ok:true,json:async()=>({result:{requirements:[{id:'r1',title:'Old draft',evidence:[{line:1,quote:'old'}]}],questions:[],conflicts:[]},mode:'nebius',model:'test',usage:{total_tokens:10},remainingCalls:3})}));}});await new Promise(r=>setImmediate(r));p.get('cloudConsent').checked=true;p.get('cloudConsent').fire('change');const call=p.get('ai').click();p.edit('New document after the request started.');release();await call;assert.equal(p.get('cards').children.length,0);assert.equal(p.get('export').disabled,true);assert.equal(requests,1);assert.match(p.get('message').textContent,/zmieniony/);});
