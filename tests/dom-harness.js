/* A DOM/event smoke harness. It is not a browser or a layout renderer. */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const decode=s=>s.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
class ClassList {
  constructor(el){this.el=el;}values(){return new Set((this.el.className||'').split(/\s+/).filter(Boolean));}
  add(...names){const s=this.values();names.forEach(n=>s.add(n));this.el.className=[...s].join(' ');}
  remove(...names){const s=this.values();names.forEach(n=>s.delete(n));this.el.className=[...s].join(' ');}
  contains(n){return this.values().has(n);}toggle(n,on){const s=this.values(),value=on===undefined?!s.has(n):on;if(value)s.add(n);else s.delete(n);this.el.className=[...s].join(' ');return value;}
}
class Element {
  constructor(tag,doc){this.tagName=tag.toUpperCase();this.doc=doc;this.children=[];this.attrs={};this.style={};this.dataset=new Proxy({}, {set:(obj,k,v)=>{obj[k]=String(v);this.attrs['data-'+String(k).replace(/[A-Z]/g,c=>'-'+c.toLowerCase())]=String(v);return true;}});this.listeners={};this.hidden=false;this.disabled=false;this.checked=false;this.classList=new ClassList(this);this._value=null;this._text='';}
  set id(v){this.attrs.id=v;}get id(){return this.attrs.id||'';}set className(v){this.attrs.class=v;}get className(){return this.attrs.class||'';}
  setAttribute(k,v){this.attrs[k]=String(v);if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(v);if(['hidden','checked','disabled'].includes(k))this[k]=true;}
  getAttribute(k){return this.attrs[k]??null;}
  set value(v){this._value=String(v);}get value(){if(this._value!==null)return this._value;if(this.tagName==='SELECT'){const a=this.querySelectorAll('option');return (a.find(a=>a.attrs.selected!==undefined)||a[0])?.value||'';}return this.attrs.value||'';}
  set textContent(v){this.children=[];this._text=String(v);}get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
  set innerHTML(v){this._html=String(v);this._text='';this.children=[];parse(this._html,this,this.doc);}get innerHTML(){return this._html||'';}
  append(...els){for(const el of els){el.parentElement=this;this.children.push(el);}}prepend(el){el.parentElement=this;this.children.unshift(el);}remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(c=>c!==this);}
  matches(selector){
    if(selector.includes(' ')){const parts=selector.trim().split(/\s+/),last=parts.pop();if(!this.matches(last))return false;let p=this.parentElement;while(p){if(p.matches(parts.join(' ')))return true;p=p.parentElement;}return false;}
    const attr=[...selector.matchAll(/\[([\w-]+)(?:=["']?([^\]"']+)["']?)?\]/g)];for(const a of attr){if(this.attrs[a[1]]===undefined||a[2]!==undefined&&this.attrs[a[1]]!==a[2])return false;}
    const base=selector.replace(/\[[^\]]+\]/g,'');const id=base.match(/#([\w-]+)/);if(id&&this.id!==id[1])return false;for(const c of base.matchAll(/\.([\w-]+)/g))if(!this.classList.contains(c[1]))return false;
    const tag=base.match(/^[a-zA-Z][\w-]*/);return !tag||this.tagName===tag[0].toUpperCase();
  }
  closest(s){let el=this;while(el){if(el.matches(s))return el;el=el.parentElement;}return null;}
  querySelectorAll(s){const sels=s.split(',').map(s=>s.trim()),out=[];const walk=el=>{for(const c of el.children){if(sels.some(s=>c.matches(s)))out.push(c);walk(c);}};walk(this);return out;}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
  addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}
  focus(){this.doc.activeElement=this;if(this.onfocus)this.onfocus();}
  click(){if(this.disabled)return;const e={target:this,preventDefault(){},stopPropagation(){}};if(this.onclick)this.onclick(e);for(const fn of this.listeners.click||[])fn(e);for(const fn of this.doc.listeners.click||[])fn(e);}
  getContext(type){if(type!=='2d')return null;return new Proxy({measureText:t=>({width:String(t).length*6}),createRadialGradient:()=>({addColorStop(){}})}, {get:(obj,key)=>obj[key]||(()=>{})});}
  getBoundingClientRect(){if(this.id==='stage'){const match=(this.style.transform||'').match(/translate\(([-\d.]+)px,([-\d.]+)px\) scale\(([-\d.]+)\)/);return {left:+(match?.[1]||0),top:+(match?.[2]||0),width:1280*+(match?.[3]||1),height:760*+(match?.[3]||1)};}return {left:0,top:0,width:1280,height:760};}
  setPointerCapture(){}releasePointerCapture(){}hasPointerCapture(){return false;}
}
function parse(html,parent,doc){const stack=[parent],tokens=html.match(/<[^>]*>|[^<]+/g)||[],voids=new Set(['META','LINK','INPUT','IMG','BR','HR','PATH','RECT','CIRCLE']);
  for(const token of tokens){if(token.startsWith('<!'))continue;if(token.startsWith('</')){const tag=token.match(/^<\/([\w-]+)/)?.[1]?.toUpperCase();let i=stack.length-1;while(i>0&&stack[i].tagName!==tag)i--;if(i>0)stack.length=i;continue;}
    if(token.startsWith('<')){const name=token.match(/^<([\w-]+)/)?.[1];if(!name)continue;const el=new Element(name,doc);const attrs=token.slice(name.length+1).replace(/\/?\s*>$/,'');for(const a of attrs.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g))el.setAttribute(a[1],decode(a[2]??a[3]??a[4]??''));stack[stack.length-1].append(el);if(!voids.has(el.tagName)&&!token.endsWith('/>'))stack.push(el);}
    else stack[stack.length-1]._text+=decode(token);
  }
}
const assetRoot=fs.existsSync(path.join(__dirname,'../dist/index.html'))?'../dist':'../prototype';
function boot(options={}) {
  const doc={listeners:{},visibilityState:'visible',title:'',activeElement:null};doc.documentElement=new Element('html',doc);doc.documentElement.innerHTML=fs.readFileSync(path.join(__dirname,assetRoot,'index.html'),'utf8');doc.body=doc.documentElement.querySelector('body');
  doc.getElementById=id=>doc.documentElement.querySelector('#'+id);doc.querySelectorAll=s=>doc.documentElement.querySelectorAll(s);doc.querySelector=s=>doc.documentElement.querySelector(s);doc.createElement=t=>new Element(t,doc);doc.addEventListener=(k,fn)=>(doc.listeners[k]??=[]).push(fn);
  const store=new Map(Object.entries(options.saved||{})),frames=[],timeouts=[];
  const ctx={document:doc,innerWidth:options.width||1400,innerHeight:options.height||900,devicePixelRatio:1,location:{hash:options.hash||''},navigator:{language:'zh'},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},performance:{now:()=>30},matchMedia:()=>({matches:false}),requestAnimationFrame:fn=>frames.push(fn),setTimeout:fn=>{timeouts.push(fn);return timeouts.length;},clearTimeout(){},addEventListener(){},Blob,URL,AbortController,Date,Intl,console,fetch:options.fetch||(()=>Promise.reject(new Error('no model')))};
  ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
  for(const file of ['data.js','engine.js','view.js','app.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,assetRoot,file),'utf8'),ctx,{filename:file});
  const click=s=>{const el=s.startsWith('#')?doc.getElementById(s.slice(1)):doc.querySelector(s);if(!el)throw new Error('Missing UI element '+s);el.click();return el;};
  return {ctx,doc,store,click,frame:()=>{const fn=frames.shift();if(fn)fn(60);},state:()=>JSON.parse(store.get('hdb-city-save-v1')||'null')?.state};
}
module.exports={boot};
