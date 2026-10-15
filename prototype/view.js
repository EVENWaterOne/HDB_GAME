(function(root) {
  'use strict';
  const D=root.HDBData, E=root.HDBEngine;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const palettes=['#e4cba5','#bbceca','#d8b29b','#b4c9dc','#e1d2b6','#bacbc1'];
  class CityView {
    constructor(canvas,fx) {
      this.canvas=canvas;this.fx=fx;this.ctx=fx.getContext('2d');this.W=1280;this.H=760;this.res=1;
      this.camera={az:Math.PI/4,el:.66,zoom:1,taz:Math.PI/4,tel:.66,tzoom:1};
      this.state=null;this.models=new Map();this.pickables=[];this.hover=null;this.selected=null;this.pending=null;this.layer='city';this.lang='zh';this.time=0;this.floats=[];this.renderer=null;
      this.fallbackPicks=[];this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(root.THREE)try{this.init3D();}catch{if(this.renderer)this.renderer.dispose();this.renderer=null;}
      canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.renderer=null;this.fallbackPicks=[];});
    }
    init3D() {
      const T=root.THREE;
      this.renderer=new T.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:true});this.renderer.setClearColor(0,0);
      this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
      this.scene=new T.Scene();this.cam=new T.OrthographicCamera(-1,1,1,-1,.1,150);this.cam.setViewOffset(this.W,this.H,-60,46,this.W,this.H);
      this.hemi=new T.HemisphereLight(0xdceaff,0x3c4e4d,.78);this.scene.add(this.hemi);
      this.sun=new T.DirectionalLight(0xfff0d4,.86);this.sun.position.set(6,14,5);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);Object.assign(this.sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:1,far:40});this.sun.shadow.bias=-.001;this.scene.add(this.sun);
      this.world=new T.Group();this.scene.add(this.world);this.raycaster=new T.Raycaster();
      this.ground=new T.MeshLambertMaterial({color:0x89908a});
      const plinth=new T.Mesh(new T.BoxGeometry(9.3,.46,8.3),new T.MeshLambertMaterial({color:0x283638}));plinth.position.y=-.23;plinth.receiveShadow=true;this.scene.add(plinth);
      this.materials=new Map();this.textures=new Map();this.geometries=new Map();
    }
    mat(color,opts={}) {
      const key=String(color)+JSON.stringify(opts);if(!this.materials.has(key))this.materials.set(key,new THREE.MeshLambertMaterial({color,...opts}));return this.materials.get(key);
    }
    box(g,w,h,d,color,x=0,y=0,z=0) {
      const geoKey=[w,h,d].join(',');if(!this.geometries.has(geoKey))this.geometries.set(geoKey,new THREE.BoxGeometry(w,h,d));
      const m=new THREE.Mesh(this.geometries.get(geoKey),typeof color==='object'?color:this.mat(color));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m;
    }
    tree(g,x,z,size=1,y=.12) {
      const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,.16,5),this.mat('#6d5138'));trunk.position.set(x,y+.08*size,z);trunk.scale.setScalar(size);
      const crown=new THREE.Mesh(new THREE.ConeGeometry(.17,.48,5),this.mat('#79aa64'));crown.position.set(x,y+.37*size,z);crown.scale.setScalar(size);crown.rotation.y=x*6;crown.castShadow=true;g.add(trunk,crown);
    }
    facade(color,level,retrofit,glass=false) {
      const key=[color,level,retrofit,glass].join('|');if(this.textures.has(key))return this.textures.get(key);
      const c=document.createElement('canvas');c.width=64;c.height=256;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,64,256);
      const floors=glass?15:10+level*3;const fh=256/floors;
      for(let f=1;f<floors;f++) {
        const y=f*fh;x.fillStyle=glass?'#446473':'#506467';
        for(let i=5;i<62;i+=11)x.fillRect(i,y+3,6,Math.max(4,fh*.44));
        x.fillStyle=glass?'#e4ecea':'#899c99';x.fillRect(0,y+fh-1,64,1);
        if(retrofit&&f%2===0){x.fillStyle='#639158';x.fillRect(0,y+fh-5,64,4);}
      }
      x.fillStyle=retrofit?'#73ac67':'#e6dcbf';x.fillRect(0,0,64,7);
      const tex=new THREE.CanvasTexture(c);tex.anisotropy=2;this.textures.set(key,tex);return tex;
    }
    height(t) {if(t.kind==='hdb')return 1.7+t.level*.42;if(t.kind==='condo')return 3.1;if(t.kind==='office')return 2.45;if(t.kind==='tech')return 2.9;return {cc:.85,clinic:.55,school:.62,eldercare:.54,library:.75,shops:.55,market:.65,foodcourt:.62,carpark:.7,hawker:.58,bus:.38,metro:.45,solar:.35}[t.kind]||.15;}
    build(t) {
      const old=this.models.get(t.id);
      if(old){this.world.remove(old.group);old.group.traverse(o=>{if(o.geometry&&!Array.from(this.geometries.values()).includes(o.geometry))o.geometry.dispose();if(o.material&&!Array.from(this.materials.values()).includes(o.material)&&o.material!==this.ground&&!Array.isArray(o.material))o.material.dispose();});}
      const g=new THREE.Group();g.position.set(t.gx-4,0,t.gy-3.5);const d=D.buildings[t.kind];
      const ground=t.locked?'#46595d':t.kind==='road'?'#3e4b50':d?.green?'#629957':t.kind==='empty'?'#a09279':'#96978a';
      const slab=this.box(g,.97,.12,.97,ground,0,.06,0),picks=[slab];
      const m={group:g,sig:this.signature(t),picks,top:this.height(t)+.12,glow:null,side:null};
      if(t.kind==='road'){for(const x of [-.25,.25])this.box(g,.19,.008,.035,'#dcd8c7',x,.126,0);m.top=.12;}
      if(t.kind==='empty') {
        if(t.locked){this.box(g,.8,.04,.025,'#748186',0,.14,-.38);this.box(g,.8,.04,.025,'#748186',0,.14,.38);}
        else{for(const [x,z] of [[0,-.35],[0,.35]])this.box(g,.7,.012,.016,'#cabfa6',x,.128,z);for(const [x,z] of [[-.35,0],[.35,0]])this.box(g,.016,.012,.7,'#cabfa6',x,.128,z);}
        m.top=.12;
      }
      if(['hdb','condo','office','tech'].includes(t.kind)) {
        const h=this.height(t),color=t.kind==='hdb'?palettes[t.id%palettes.length]:d.color;
        const side=new THREE.MeshLambertMaterial({map:this.facade(color,t.level,t.retrofit,t.kind!=='hdb'),emissive:0x000000});m.side=side;
        const roof=t.retrofit?this.mat('#67a15c'):this.mat(t.kind==='hdb'?'#dbd5c2':'#aababe');
        const b=this.box(g,.72,h,.72,[side,side,roof,roof,side,side],0,.12+h/2,0);picks.push(b);
        this.box(g,.32,.12,.28,t.retrofit?'#b2cb9b':'#d5d0c0',.1,.18+h,.05);
        if(t.retrofit)for(const [x,z] of [[-.22,-.2],[.2,-.18],[-.18,.22]])this.tree(g,x,z,.65,.12+h);
        if(t.kind==='condo'){this.box(g,.23,.026,.48,'#5096ae',.29,.138,0);this.box(g,.84,.045,.84,'#a6b3b0',0,.14,0);}
      } else if(t.kind==='hawker') {
        const b=this.box(g,.83,.27,.84,'#d2ba8d',0,.25,0);picks.push(b);
        const roof=new THREE.Mesh(new THREE.ConeGeometry(.69,.31,4),this.mat(t.shaded?'#739568':'#ce6341'));roof.rotation.y=Math.PI/4;roof.position.y=.53;roof.castShadow=true;g.add(roof);picks.push(roof);m.top=.69;
        for(const x of [-.25,0,.25])this.box(g,.16,.15,.04,'#4a635b',x,.2,.44);
      } else if(['park','garden','drainage'].includes(t.kind)) {
        const count=t.kind==='garden'?6:4;for(let i=0;i<count;i++){const a=i*2.4;this.tree(g,Math.cos(a)*.26,Math.sin(a)*.25,.8+i%3*.18);}
        if(t.kind==='drainage')this.box(g,.65,.027,.2,'#74afad',0,.14,.2);
        if(t.kind==='garden')for(const x of [-.24,.2])this.box(g,.13,.07,.64,'#bc9a64',x,.15,0);
        m.top=.58;
      } else if(t.kind==='solar') {
        for(const x of [-.24,.17]) {const panel=this.box(g,.31,.04,.73,'#4a76a2',x,.34,0);panel.rotation.z=-.15;for(const z of [-.2,0,.2])this.box(g,.32,.011,.011,'#8db5d2',x,.365,z);this.box(g,.06,.18,.48,'#949ea2',x,.23,0);}m.top=.4;
      } else if(t.kind==='bus'||t.kind==='metro') {
        this.box(g,.88,.07,.68,d.color,0,.48,0);for(const x of [-.32,.32])this.box(g,.03,.37,.46,'#c3c6bc',x,.3,0);
        const bus=this.box(g,.55,.22,.25,t.kind==='metro'?'#b26767':'#a7c794',0,.25,0);picks.push(bus);this.box(g,.48,.065,.01,'#3d6268',0,.28,.135);m.top=.53;
      } else if(t.kind==='plaza') {
        this.box(g,.8,.03,.8,'#b6aa91',0,.15,0);for(const x of [-.25,.25]){this.box(g,.04,.15,.32,'#9d7654',x,.22,0);this.box(g,.05,.2,.025,'#ab805a',x,.27,-.14);}m.top=.3;
      } else if(d) {
        const h=this.height(t);const b=this.box(g,.8,h,.8,d.color,0,.12+h/2,0);picks.push(b);this.box(g,.85,.07,.85,'#bec7bc',0,.16+h,0);
        for(const x of [-.25,0,.25])this.box(g,.14,.12,.012,'#40616a',x,.12+h*.5,.405);
        if(t.kind==='clinic'){this.box(g,.24,.02,.07,'#ce6b63',0,.203+h,0);this.box(g,.07,.02,.24,'#ce6b63',0,.204+h,0);}
        if(t.kind==='school'){this.box(g,.12,.33,.04,'#d3a26d',.25,h+.31,.25);this.box(g,.17,.1,.025,'#ca5654',.33,h+.45,.25);}
        if(t.kind==='cc'){this.box(g,.025,.35,.025,'#dcdacb',.29,h+.34,.25);this.box(g,.15,.09,.015,'#cf625c',.36,h+.45,.25);}
        if(t.kind==='carpark'){for(const y of [.3,.49])this.box(g,.76,.04,.012,'#3d5357',0,y,.407);}
        m.top=h+.23;
      }
      m.glow=new THREE.Mesh(new THREE.PlaneGeometry(.96,.96),new THREE.MeshBasicMaterial({color:0xc3dfa4,transparent:true,opacity:.25,depthWrite:false}));m.glow.rotation.x=-Math.PI/2;m.glow.position.y=.131;m.glow.visible=false;g.add(m.glow);
      picks.forEach(o=>o.userData.tileId=t.id);this.world.add(g);this.models.set(t.id,m);
    }
    signature(t){return [t.kind,t.level,t.retrofit,t.shaded,t.locked].join('|');}
    update(s,stats) {
      this.state=s;this.stats=stats;
      if(this.renderer){s.tiles.forEach(t=>{if(this.models.get(t.id)?.sig!==this.signature(t))this.build(t);});this.pickables=[...this.models.values()].flatMap(m=>m.picks);}
    }
    resize(res) {this.res=res;this.fx.width=this.W*res;this.fx.height=this.H*res;if(this.renderer){this.renderer.setPixelRatio(res);this.renderer.setSize(this.W,this.H,false);}}
    setPortrait(on){if(this.portrait===on)return;this.portrait=on;this.camera.tzoom=on?1.48:1;if(this.renderer)this.cam.setViewOffset(this.W,this.H,on?-10:-60,on?-80:46,this.W,this.H);}
    rotate(n){this.camera.taz+=n*Math.PI/2;}
    reset(){this.camera.taz=Math.PI/4;this.camera.tel=.66;this.camera.tzoom=1;}
    float(id,text,color='#e3c37b'){this.floats.push({id,text,color,at:performance.now()});}
    project(x,y,z) {
      if(this.renderer){const v=new THREE.Vector3(x,y,z).project(this.cam);return [(v.x+1)*this.W/2,(1-v.y)*this.H/2,v.z];}
      const a=this.camera.az-Math.PI/4,rX=x*Math.cos(a)-z*Math.sin(a),rZ=x*Math.sin(a)+z*Math.cos(a),scale=this.camera.zoom;
      return [(this.portrait?640:701)+(rX-rZ)*40*scale,(this.portrait?470:345)+(rX+rZ)*20*scale-y*53*scale,rX+rZ];
    }
    screen(id,lift=0){const t=this.state?.tiles.find(t=>t.id===id);if(!t)return [700,300,0];return this.project(t.gx-4,(this.models.get(id)?.top||this.height(t)+.12)+lift,t.gy-3.5);}
    pick(x,y) {
      if(this.renderer){this.raycaster.setFromCamera({x:x/this.W*2-1,y:-(y/this.H*2-1)},this.cam);const hit=this.raycaster.intersectObjects(this.pickables,false)[0];return hit?this.state.tiles.find(t=>t.id===hit.object.userData.tileId):null;}
      for(const p of [...this.fallbackPicks].reverse())if(x>=p.left&&x<=p.right&&y>=p.top&&y<=p.bottom)return this.state.tiles.find(t=>t.id===p.id);
      return null;
    }
    pendingTarget(t){if(!this.pending)return false;if(this.pending.kind==='card')return E.validTarget(this.state,this.pending.key,t);return !t.locked&&t.kind==='empty';}
    layerColor(t) {
      if(t.id===this.selected)return '#f1d282';if(t.id===this.hover)return '#d6e7e9';if(this.pendingTarget(t))return '#d7c887';
      const q=this.stats?.details.find(q=>q.id===t.id);if(!q)return null;
      if(this.layer==='food')return q.food>=7?'#81c7a0':'#d89565';if(this.layer==='transit')return q.transit>=7?'#82bfc8':'#d4a475';
      if(this.layer==='live')return q.live>=75?'#8dcb96':q.live>=60?'#ccca7d':'#df876b';if(this.layer==='heat')return q.stress>=2?'#e48755':q.stress===1?'#dbbe75':'#81bc9a';return null;
    }
    draw(ts) {
      this.time=ts;if(!this.state||!this.ctx)return;
      const c=this.camera,f=this.reduced?1:.16;c.az+=(c.taz-c.az)*f;c.el+=(c.tel-c.el)*f;c.zoom+=(c.tzoom-c.zoom)*f;
      const x=this.ctx;x.setTransform(this.res,0,0,this.res,0,0);x.clearRect(0,0,this.W,this.H);
      if(this.renderer) {
        const d=30;this.cam.position.set(Math.sin(c.az)*Math.cos(c.el)*d,Math.sin(c.el)*d,Math.cos(c.az)*Math.cos(c.el)*d);this.cam.lookAt(0,0,0);
        const hh=6.3/c.zoom;this.cam.left=-hh*this.W/this.H;this.cam.right=hh*this.W/this.H;this.cam.top=hh;this.cam.bottom=-hh;this.cam.updateProjectionMatrix();
        this.sun.color.set(E.heat(this.state).level?0xffd9b4:0xfff0d4);
        this.state.tiles.forEach(t=>{const m=this.models.get(t.id),col=this.layerColor(t);m.glow.visible=Boolean(col);if(col){m.glow.material.color.set(col);m.glow.material.opacity=t.id===this.selected?.45:.25;}if(m.side){const q=this.stats.details.find(q=>q.id===t.id);m.side.emissive.set(t.id===this.selected?'#edbd5b':q?.stress>=2?'#aa4820':'#000000');m.side.emissiveIntensity=t.id===this.selected?.15:q?.stress>=2?.11:0;}});
        this.renderer.render(this.scene,this.cam);
      } else this.drawFallback();
      this.drawLabels();this.floats=this.floats.filter(f=>ts-f.at<1450);
      for(const f of this.floats){const k=(ts-f.at)/1450,[px,py]=this.screen(f.id,.12);x.globalAlpha=1-k*k;x.font='700 13px system-ui';x.textAlign='center';x.lineWidth=3;x.strokeStyle='#07151cc9';x.strokeText(f.text,px,py-k*36);x.fillStyle=f.color;x.fillText(f.text,px,py-k*36);x.globalAlpha=1;}
    }
    polygon(points,fill,stroke) {
      const x=this.ctx;x.beginPath();points.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.closePath();x.fillStyle=fill;x.fill();if(stroke){x.strokeStyle=stroke;x.lineWidth=.7;x.stroke();}
    }
    drawFallback() {
      const s=this.state,scale=this.camera.zoom,x=this.ctx;this.fallbackPicks=[];
      const ordered=s.tiles.map(t=>({t,p:this.project(t.gx-4,.12,t.gy-3.5)})).sort((a,b)=>a.p[2]-b.p[2]);
      for(const {t,p:[px,py]} of ordered) {
        const hw=39*scale,hh=19*scale,d=D.buildings[t.kind];const col=t.locked?'#43565e':t.kind==='road'?'#384a52':d?.green?'#639a5b':t.kind==='empty'?'#8f8571':'#929581';
        this.polygon([[px,py-hh],[px+hw,py],[px,py+hh],[px-hw,py]],col,'#142b33');
        const overlay=this.layerColor(t);if(overlay){x.globalAlpha=.42;this.polygon([[px,py-hh],[px+hw,py],[px,py+hh],[px-hw,py]],overlay);x.globalAlpha=1;}
        const h=d?this.height(t)*53*scale:0;
        if(d&&!d.green&&t.kind!=='plaza'&&t.kind!=='solar') {
          const w=26*scale,sh=13*scale,b=t.kind==='hdb'?palettes[t.id%6]:d.color;
          this.polygon([[px-w,py],[px,py+sh],[px,py+sh-h],[px-w,py-h]],b,'#476065');
          this.polygon([[px,py+sh],[px+w,py],[px+w,py-h],[px,py+sh-h]],'#7d9397','#476065');
          this.polygon([[px-w,py-h],[px,py-sh-h],[px+w,py-h],[px,py+sh-h]],t.retrofit?'#74a568':t.kind==='hawker'?'#bd6945':b,'#637978');
          x.fillStyle='#3d5662';for(let yy=py-h+10*scale;yy<py;yy+=11*scale)for(let xx=px-w+5*scale;xx<px-2;xx+=9*scale)x.fillRect(xx,yy+(xx-px+w)*.5,4*scale,4*scale);
        } else if(d?.green){for(const i of [-1,0,1]){const xx=px+i*16*scale,yy=py+i*3*scale;this.polygon([[xx-9*scale,yy],[xx,yy-32*scale],[xx+9*scale,yy]],'#9abd79','#55794f');x.fillStyle='#705840';x.fillRect(xx-1,yy,2,5);}}
        else if(t.kind==='solar'){for(const i of [-1,1])this.polygon([[px+i*14-9,py-5],[px+i*14+8,py-10],[px+i*14+9,py+3],[px+i*14-8,py+8]],'#5082a7','#a5c5d2');}
        else if(t.kind==='empty'&&!t.locked){x.fillStyle='#c8b99a';x.font='18px system-ui';x.textAlign='center';x.fillText('+',px,py+5);}
        this.fallbackPicks.push({id:t.id,left:px-hw*.8,right:px+hw*.8,top:py-h-hh,bottom:py+hh*.7});
      }
    }
    pill(px,py,text,color='#173440',ink='#dfdfd2') {
      const x=this.ctx;x.font='500 10px system-ui';x.textAlign='center';const w=x.measureText(text).width+14;x.fillStyle=color;x.beginPath();if(x.roundRect)x.roundRect(px-w/2,py-10,w,17,7);else x.rect(px-w/2,py-10,w,17);x.fill();x.fillStyle=ink;x.fillText(text,px,py+2);
    }
    drawLabels() {
      for(const t of this.state.tiles) {
        if(t.kind==='road'||t.kind==='empty')continue;const d=D.buildings[t.kind],q=this.stats.details.find(q=>q.id===t.id);
        const [px,py]=this.screen(t.id,.16);
        if(q&&(this.layer!=='city'||this.state.marked.includes(t.id)||t.id===this.selected)) {
          const value=this.layer==='food'?Math.round(q.food):this.layer==='transit'?Math.round(q.transit):this.layer==='heat'?q.stress:Math.round(q.live);
          this.pill(px,py,'B'+(101+t.id)+' · '+value,this.layerColor(t)||'#28464e');
        } else if(['hawker','bus','metro','cc','office'].includes(t.kind)||t.id===this.selected)this.pill(px,py,d.name[this.lang==='en'?1:0]);
        else if(q&&this.state.dlc&&q.stress>=2)this.pill(px+10,py,(this.lang==='en'?'Heat ':'热 ')+q.stress,'#c27c47','#241c12');
      }
    }
  }
  root.HDBCityView=CityView;
})(typeof globalThis!=='undefined'?globalThis:this);
