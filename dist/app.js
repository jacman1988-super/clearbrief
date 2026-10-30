const LIMITS = Object.freeze({chars:10000,lines:200,items:24,quote:1000});
function sourceLines(text) {
  if(typeof text!=='string'||text.trim().length<20||text.length>LIMITS.chars)throw new Error('INVALID_DOCUMENT');
  const lines=text.replace(/\r\n?/g,'\n').split('\n');
  if(lines.length>LIMITS.lines)throw new Error('DOCUMENT_LINE_LIMIT');
  return lines.map((text,i)=>({id:i+1,text}));
}
const clean=(s,max=240)=>typeof s==='string'&&s.trim().length>0&&s.length<=max&&!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(s);
function validateAnalysis(raw,text) {
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
function localNotes(text) {
  const lines=sourceLines(text).filter(l=>l.text.trim());
  if(lines.length>LIMITS.items)throw new Error('LOCAL_NOTE_LIMIT');
  return {requirements:lines.map(l=>({id:`note-${l.id}`,title:l.text.trim(),evidence:[{line:l.id,quote:l.text.trim()}],accepted:false})),questions:[],conflicts:[]};
}
function makeExport(text,result,{mode,model=null,usage=null,reviewed=[]}={}) {
  const known=new Set(['requirements','questions','conflicts'].flatMap(k=>result[k].map(i=>i.id)));
  return {application:'ClearBrief',version:'0.1.0',createdAt:new Date().toISOString(),mode,model,usage,
    citationCheck:'Exact quotes and line numbers checked; meaning and completeness still require human review.',
    document:text,analysis:result,reviewed:reviewed.filter(id=>known.has(id)),actionsTaken:false};
}

const samples={pl:'Potrzebujemy prostej strony dla małej pracowni ceramicznej.\nStrona ma pokazać 8 produktów, zdjęcia i formularz kontaktowy.\nPierwsza wersja powinna być gotowa do 24 października.\nZdjęcia będą dostępne dopiero 28 października.\nNa razie nie chcemy koszyka ani płatności.\nKlient ma móc od razu kupić produkt online.\nNie ustaliliśmy jeszcze, kto napisze opisy produktów.',en:'We need a simple website for a small ceramics studio.\nThe site must show 8 products, photos and a contact form.\nThe first version should be ready by October 24.\nPhotos will only be available on October 28.\nWe do not want a cart or payments for now.\nThe customer must be able to buy a product online immediately.\nWe have not yet agreed who will write the product descriptions.'};
const words={pl:{eyebrow:'Z CHAOSU DO JASNEGO PLANU',headline:'Zanim zaczniesz.\nUstalmy, co jest ważne.',intro:'Wklej opis zadania. Zbierz wymagania, zauważ sprzeczności i sprawdź, o co warto dopytać.',yourBrief:'Twój opis zadania',sampleNote:'Przykład jest fikcyjny. Możesz go zastąpić własnym tekstem.',example:'Wczytaj przykład',local:'Uporządkuj lokalnie',cloudTitle:'Druga para oczu',cloudDescription:'Model NVIDIA może rozdzielić wymagania, pytania i sprzeczności. Wybrany tekst trafi do Nebius.',consent:'Zgadzam się wysłać ten tekst do Nebius. Nie zawiera haseł ani prywatnych danych.',ai:'Przeanalizuj z NVIDIA',cancel:'Anuluj',perspective:'MIEJSCE NA DOBRE DECYZJE',resultHeadline:'Najpierw jasność.\nPotem działanie.',resultIntro:'Każda notatka ma odnośnik do źródła. Cytat potwierdza treść fragmentu; interpretację sprawdzasz Ty.',requirements:'Wymagania',questions:'Pytania',conflicts:'Sprzeczności',export:'Pobierz notatki JSON',footer:'Wersja robocza. Niczego nie wysyła, nie zapisuje do kalendarza i nie przyjmuje zobowiązań za Ciebie. Tryb lokalny nie korzysta z AI.',unconfigured:'Połączenie Nebius nie jest jeszcze skonfigurowane. Tryb lokalny działa bez konta i bez wysyłania tekstu.',configured:'Nebius skonfigurowany. Do wysłania potrzebna jest Twoja zgoda. Pozostałe próby (limit zachowany po restarcie): ',working:'NVIDIA analizuje tekst…',localDone:'Notatki lokalne: każda niepusta linia pozostaje w oryginalnym brzmieniu. To nie jest analiza AI.',aiDone:'Szkic AI z cytatami sprawdzonymi znak po znaku. Sprawdź interpretację i ewentualne pominięcia.',changed:'Tekst zmieniony — poprzedni wynik usunięty.',reviewed:'Sprawdziłem/am tę notatkę',line:'Linia',note:'Notatka lokalna',cancelled:'Anulowano analizę.',error:'Nie udało się przygotować wyniku. ',source:'Źródło: ',noAi:'lokalne notatki, bez AI',sendConsent:'Najpierw zaznacz zgodę na wysłanie tekstu.',connect:'Połączenie lokalne niedostępne.',budget:'Limit prób wyczerpany. Restart go nie odnawia. Nie ponawiamy zapytań automatycznie.'},
en:{eyebrow:'FROM A MESS TO A CLEAR BEGINNING',headline:'Before you begin.\nLet’s make room for clarity.',intro:'Paste a task brief. Gather requirements, notice contradictions and see what is worth asking.',yourBrief:'Your task brief',sampleNote:'This example is fictional. Replace it with your own text.',example:'Load example',local:'Organize locally',cloudTitle:'A second pair of eyes',cloudDescription:'An NVIDIA model can separate requirements, questions and conflicts. The selected text will go to Nebius.',consent:'I agree to send this text to Nebius. It contains no passwords or private data.',ai:'Analyze with NVIDIA',cancel:'Cancel',perspective:'ROOM FOR BETTER DECISIONS',resultHeadline:'Clarity first.\nAction comes next.',resultIntro:'Each note points back to its source. The quote establishes the excerpt; you review the interpretation.',requirements:'Requirements',questions:'Questions',conflicts:'Conflicts',export:'Download notes JSON',footer:'Draft workspace. No messages, calendar changes or commitments are made for you. Local mode does not use AI.',unconfigured:'Nebius is not configured yet. Local mode works without an account and without sending your text.',configured:'Nebius configured. Your permission is needed before sending. Attempts remaining (limit survives restart): ',working:'NVIDIA is reviewing the text…',localDone:'Local notes: each nonempty line keeps its original wording. This is not AI analysis.',aiDone:'AI draft with quotes checked character by character. Review interpretations and possible omissions.',changed:'Text changed — previous result removed.',reviewed:'I reviewed this note',line:'Line',note:'Local note',cancelled:'Analysis cancelled.',error:'Could not prepare the result. ',source:'Source: ',noAi:'local notes, no AI',sendConsent:'First confirm permission to send the text.',connect:'Local connection is unavailable.',budget:'Attempt limit reached. Restarting does not renew it. Requests are never retried automatically.'}};
function mount(doc=document,fetchImpl=fetch) {
  let lang='pl',result=null,mode=null,model=null,usage=null,controller=null,generation=0,configured=false,remaining=0,edited=false;
  const $=id=>doc.getElementById(id),t=key=>words[lang][key];
  const clear=()=>{generation++;controller?.abort();controller=null;result=null;mode=null;model=null;usage=null;$('cards').replaceChildren();for(const key of ['requirements','questions','conflicts'])$(key+'Count').textContent='—';$('requirementsLabel').textContent=t('requirements');$('export').disabled=true;$('provenance').textContent='';$('cancel').hidden=true;};
  function status(){$('providerStatus').textContent=configured?t('configured')+remaining:t('unconfigured');$('ai').disabled=!configured||remaining<=0||!$('cloudConsent').checked||!!controller;}
  function language(){doc.documentElement.lang=lang;for(const el of doc.querySelectorAll('[data-i]')){el.textContent=t(el.dataset.i);el.style.whiteSpace='pre-line';}$('language').textContent=lang==='pl'?'English':'Polski';status();}
  function render(){
    $('cards').replaceChildren();$('requirementsLabel').textContent=mode==='local'?t('note'):t('requirements');
    for(const key of ['requirements','questions','conflicts']) {
      $(key+'Count').textContent=result[key].length;
      for(const item of result[key]) {
        const card=doc.createElement('article');card.className='card';
        const label=doc.createElement('p');label.className='card-label';label.textContent=mode==='local'?t('note'):t(key);card.append(label);
        const title=doc.createElement('h3');title.textContent=item.title;card.append(title);
        for(const e of item.evidence){const quote=doc.createElement('blockquote');const ref=doc.createElement('span');ref.className='citation';ref.textContent=t('line')+' '+e.line;quote.append(ref,doc.createElement('br'),doc.createTextNode('“'+e.quote+'”'));card.append(quote);}
        const check=doc.createElement('label');check.className='review';const input=doc.createElement('input');input.type='checkbox';input.checked=item.accepted;input.addEventListener('change',()=>{item.accepted=input.checked;});check.append(input,doc.createTextNode(t('reviewed')));card.append(check);$('cards').append(card);
      }
    }
    $('export').disabled=false;$('provenance').textContent=t('source')+(mode==='local'?t('noAi'):'Nebius Token Factory · '+model+(usage?.total_tokens!==null?' · '+usage?.total_tokens+' tokens':''));
  }
  $('brief').value=samples[lang];
  function count(){$('count').textContent=$('brief').value.length+' / 10000';}
  $('brief').addEventListener('input',()=>{edited=true;clear();$('cloudConsent').checked=false;count();$('message').textContent=t('changed');status();});
  $('cloudConsent').addEventListener('change',status);
  $('example').addEventListener('click',()=>{clear();edited=false;$('cloudConsent').checked=false;$('brief').value=samples[lang];count();$('message').textContent='';status();});
  $('language').addEventListener('click',()=>{clear();lang=lang==='pl'?'en':'pl';if(!edited)$('brief').value=samples[lang];$('cloudConsent').checked=false;language();count();$('message').textContent='';});
  $('local').addEventListener('click',()=>{clear();try{result=localNotes($('brief').value);mode='local';render();$('message').textContent=t('localDone');}catch(error){$('message').textContent=t('error')+error.message;}status();});
  $('ai').addEventListener('click',async()=>{
    if(!configured||remaining<=0)return;if(!$('cloudConsent').checked){$('message').textContent=t('sendConsent');return;}
    clear();const revision=generation,text=$('brief').value;controller=new AbortController();const current=controller;$('cancel').hidden=false;status();$('message').textContent=t('working');
    try {
      const response=await fetchImpl('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,lang,cloudConsent:true}),signal:current.signal});
      const data=await response.json();if(revision!==generation)return;
      if(!response.ok)throw new Error(data.error||'REQUEST_FAILED');
      result=data.result;mode=data.mode;model=data.model;usage=data.usage;remaining=data.remainingCalls;render();$('message').textContent=t('aiDone');
    }catch(error){if(revision===generation)$('message').textContent=error.name==='AbortError'?t('cancelled'):t('error')+(['SESSION_CALL_LIMIT','PERSISTENT_CALL_LIMIT'].includes(error.message)?t('budget'):error.message);}
    finally {if(controller===current){controller=null;$('cancel').hidden=true;status();await refreshStatus();}}
  });
  $('cancel').addEventListener('click',()=>{clear();$('message').textContent=t('cancelled');status();});
  $('export').addEventListener('click',()=>{if(!result)return;const reviewed=['requirements','questions','conflicts'].flatMap(k=>result[k].filter(i=>i.accepted).map(i=>i.id));const content=makeExport($('brief').value,result,{mode,model,usage,reviewed});const url=URL.createObjectURL(new Blob([JSON.stringify(content,null,2)],{type:'application/json'}));const a=doc.createElement('a');a.href=url;a.download='ClearBrief-'+mode+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  async function refreshStatus(){if(location.protocol==='file:')return;try{const response=await fetchImpl('/api/status');if(!response.ok)throw new Error();const data=await response.json();configured=data.configured===true;remaining=data.remainingCalls??0;status();}catch{configured=false;status();}}
  language();count();refreshStatus();return {clear};
}
if(typeof document!=='undefined') {
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mount(),{once:true});
  else mount();
}

