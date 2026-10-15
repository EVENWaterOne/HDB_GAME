import {existsSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
const dir=existsSync('dist/index.html')?'dist':'prototype';
for(const file of ['data.js','engine.js','view.js','app.js']) {
  const result=spawnSync(process.execPath,['--check',join(dir,file)],{encoding:'utf8'});
  if(result.status!==0){process.stderr.write(result.stderr);process.exit(result.status||1);}
}
const html=readFileSync(join(dir,'index.html'),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
if(new Set(ids).size!==ids.length)throw new Error('Duplicate static DOM IDs');
for(const m of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g))if(!m[1].startsWith('http')&&!existsSync(join(dir,m[1])))throw new Error('Missing asset: '+m[1]);
for(const file of ['data.js','engine.js','view.js','app.js']) {
  const source=readFileSync(join(dir,file),'utf8');
  if(/\b(?:eval|new Function)\s*\(/.test(source))throw new Error('Unexpected dynamic execution in '+file);
}
console.log('JavaScript syntax, static DOM IDs, local assets, and script execution checks passed.');
