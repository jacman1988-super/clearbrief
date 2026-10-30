import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createAnalyzer} from './nebius.mjs';
import {createAttemptBudget} from './attempt-budget.mjs';
export function createHandler({port=8820,analyzer=null}={}) {
  const origin=`http://127.0.0.1:${port}`;
  const assets=new Map([['/','index.html'],['/style.css','style.css'],['/app.js','app.js']]);
  return async(req,res)=>{
    const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
      'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"};
    const send=(status,value,type='application/json; charset=utf-8')=>{if(res.destroyed)return;res.writeHead(status,{...headers,'Content-Type':type});res.end(type.startsWith('application/json')?JSON.stringify(value):value);};
    try {
      if(req.headers.host!==`127.0.0.1:${port}`)return send(403,{error:'LOCAL_HOST_REQUIRED'});
      if((req.headers.origin&&req.headers.origin!==origin)||req.headers['sec-fetch-site']==='cross-site')return send(403,{error:'LOCAL_ORIGIN_REQUIRED'});
      if(req.method==='GET'&&req.url==='/api/status')return send(200,{configured:!!analyzer,...analyzer?.status(),provider:'Nebius Token Factory'});
      if(req.method==='GET'&&assets.has(req.url)) {
        const file=assets.get(req.url),bytes=await readFile(new URL(`./dist/${file}`,import.meta.url));
        return send(200,bytes,file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8');
      }
      if(req.method!=='POST'||req.url!=='/api/analyze')return send(404,{error:'NOT_FOUND'});
      if(req.headers.origin!==origin)return send(403,{error:'LOCAL_ORIGIN_REQUIRED'});
      if(req.headers['content-type']!=='application/json')return send(415,{error:'JSON_REQUIRED'});
      let size=0;const chunks=[];
      for await(const chunk of req){size+=chunk.length;if(size>32768)return send(413,{error:'BODY_LIMIT'});chunks.push(chunk);}
      let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return send(400,{error:'INVALID_JSON'});}
      if(body?.cloudConsent!==true||!['pl','en'].includes(body.lang))return send(400,{error:'CLOUD_CONSENT_REQUIRED'});
      if(!analyzer)return send(409,{error:'NEBIUS_NOT_CONFIGURED'});
      const controller=new AbortController();const disconnected=()=>{if(!res.writableEnded)controller.abort();};res.on('close',disconnected);
      try {return send(200,await analyzer.analyze(body.text,{lang:body.lang,signal:controller.signal}));}
      finally{res.off('close',disconnected);}
    } catch(error) {
      const code=String(error.message);
      const allowed=/^NEBIUS_HTTP_\d{3}$/.test(code)||['INVALID_DOCUMENT','DOCUMENT_LINE_LIMIT','NEBIUS_BUSY','SESSION_CALL_LIMIT','PERSISTENT_CALL_LIMIT','ATTEMPT_BUDGET_UNAVAILABLE','REQUEST_CANCELLED','NEBIUS_TIMEOUT','NEBIUS_REQUEST_FAILED','NEBIUS_INVALID_JSON','NEBIUS_RESPONSE_LIMIT','NEBIUS_EMPTY_RESPONSE','NEBIUS_INCOMPLETE_RESULT','NEBIUS_INVALID_MODEL_JSON','INVALID_MODEL_STRUCTURE','UNGROUNDED_QUOTE','DUPLICATE_EVIDENCE','CONFLICT_NEEDS_TWO_LINES'].includes(code);
      return send(code==='NEBIUS_BUSY'?409:['SESSION_CALL_LIMIT','PERSISTENT_CALL_LIMIT'].includes(code)?429:502,{error:allowed?code:'REQUEST_FAILED'});
    }
  };
}
export function start({key=null,freeCreditsConfirmed=false}={}) {
  if(key&&!freeCreditsConfirmed)throw new Error('FREE_CREDITS_CONFIRMATION_REQUIRED');
  const analyzer=key?createAnalyzer({key,attemptBudget:createAttemptBudget(fileURLToPath(new URL('./private-attempt-budget',import.meta.url)))}):null;
  const server=http.createServer(createHandler({analyzer}));server.requestTimeout=70000;server.headersTimeout=10000;
  server.listen(8820,'127.0.0.1',()=>console.log(`ClearBrief: http://127.0.0.1:8820/ — ${analyzer?'Nebius configured (not yet verified)':'local mode, no API calls'}`));
  return server;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  // Default startup is fully local. There is no automatic environment-key discovery.
  const server=start();for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
}

