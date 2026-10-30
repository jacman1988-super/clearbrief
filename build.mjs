import {readFile,writeFile} from 'node:fs/promises';
const core=await readFile(new URL('./core.mjs',import.meta.url),'utf8'),ui=await readFile(new URL('./ui.mjs',import.meta.url),'utf8');
const runtime=core.replace(/^export /gm,'')+'\n'+ui.replace(/^import .*\n/gm,'').replace(/^export /gm,'');
await writeFile(new URL('./dist/app.js',import.meta.url),runtime);
const html=await readFile(new URL('./dist/index.html',import.meta.url),'utf8'),css=await readFile(new URL('./dist/style.css',import.meta.url),'utf8');
await writeFile(new URL('../ClearBrief-demo.html',import.meta.url),html.replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+css+'</style>').replace('<script defer src="app.js"></script>',()=>'<script defer>'+runtime.replace(/<\/script/gi,'<\\/script')+'</script>'));
console.log('ClearBrief local bundle ready. No API calls performed.');
