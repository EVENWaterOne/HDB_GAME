(function(root, factory) {
  const D = typeof module === 'object' && module.exports ? require('./data.js') : root.HDBData;
  const E = factory(D);
  if (typeof module === 'object' && module.exports) module.exports = E;
  else root.HDBEngine = E;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(D) {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const round = v => Math.round(v * 10) / 10;
  const owns = (obj,key) => Object.prototype.hasOwnProperty.call(obj,key);
  const dist = (a,b) => Math.max(Math.abs(a.gx-b.gx),Math.abs(a.gy-b.gy));
  const residential = t => ['hdb','condo'].includes(t.kind);
  const tile = (s,id) => s.tiles.find(t=>t.id===id);
  const chapter = s => s.mode==='history' ? Math.min(4,Math.floor((s.turn-1)/5)+1) : 4;
  const houses = s => s.tiles.filter(residential);
  const buildings = s => s.tiles.filter(t=>D.buildings[t.kind]);
  const capacity = t => t.kind==='hdb' ? D.settings.hdbCapacity[t.level] : t.kind==='condo' ? 320 : 0;
  const unlocked = (s,d) => (!d.dlc || s.dlc) && (s.mode!=='history' || d.unlock<=chapter(s));
  function random(s) { let x=s.rng; x^=x<<13; x^=x>>>17; x^=x<<5; s.rng=x>>>0 || 1; return s.rng/4294967296; }
  function shuffle(s,a) { for(let i=a.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }
  function makeCard(s,key,eventId) { return {uid:++s.uid,key,...(eventId?{eventId}:{})}; }
  function draw(s,n) {
    for(let i=0;i<n;i++) {
      if(!s.draw.length && s.discard.length) s.draw=shuffle(s,s.discard.splice(0));
      if(!s.draw.length) break;
      s.hand.push(s.draw.pop());
    }
  }
  function mod(s,kind,value,duration) { s.mods.push({kind,value,remaining:duration}); }
  const modifiers = (s,kind) => s.mods.filter(m=>m.kind===kind).reduce((sum,m)=>sum+m.value,0);
  function heat(s) {
    if(!s.dlc) return {level:0,id:null,end:0};
    const schedules=s.mode==='history' ? [[15,17],[19,20]] : s.mode==='eco' ? [[4,6]] : [[4,6],[11,13],[20,22],[29,31]];
    for(const [start,end] of schedules) if(s.turn>=start && s.turn<=end) return {level:s.turn===start+1?3:2,id:'heat-'+start,end};
    return {level:0,id:null,end:0};
  }
  function quality(s,t) {
    if(!residential(t)) return null;
    let food=0,transit=0,health=0,education=0,social=0,green=0,noise=0,shade=0;
    for(const f of buildings(s)) {
      const d=D.buildings[f.kind], distance=dist(t,f), age=(!residential(f)&&s.turn-f.builtAt>8&&s.maintainedUntil<s.turn)?0.72:1;
      if(distance<=(d.radius||0)) {
        food+=(d.food||0)*age; transit+=(d.transit||0)*age;
        health+=(d.health||0)*age; education+=(d.education||0)*age; social+=(d.social||0)*age;
      }
      if(d.noise&&distance<=1) noise+=d.noise;
      if(s.dlc && d.green && distance <= (d.radius||1)+(s.policies.fund?1:0)) green=1;
      if(s.dlc && f.kind==='hawker'&&f.shaded&&distance<=1) shade=1;
      if(s.dlc && s.cooling && ['cc','hawker'].includes(f.kind)&&distance<=1) shade=1;
    }
    const polTransit=s.policies.transit?7:0, relief=s.policies.relief?5:0;
    food=Math.min(12,food);transit=Math.min(13,transit+polTransit);health=Math.min(9,health);education=Math.min(7,education);social=Math.min(8,social);
    const population=houses(s).reduce((n,h)=>n+h.pop,0), privateShare=population?houses(s).filter(h=>h.kind==='condo').reduce((n,h)=>n+h.pop,0)/population:0;
    const pressure=t.kind==='hdb'?Math.max(0,privateShare-.2)*13:0;
    const base=(t.kind==='hdb'?D.buildings.hdb.base+(t.level-1)*4:D.buildings.condo.base);
    const socialTrust=(s.trust-55)*.055;
    const healthShock=Math.max(0,modifiers(s,'healthShock')-health*.5);
    let live=base+food*.7+transit*.55+health*.55+education*.55+social*.6-noise-pressure+socialTrust+relief+modifiers(s,'live');
    let stress=0,penalty=0;
    if(s.dlc) {
      live+=(t.retrofit?7:0)+(green?4:0);
      stress=Math.max(0,heat(s).level-(t.retrofit?1:0)-green-shade);
      penalty=stress*7;
      if(s.policies.subsidy && stress>=2) penalty*=.5;
      if(s.policies.subsidy && !heat(s).level) live+=1;
      live-=penalty;
    }
    live-=healthShock;
    return {base:round(base),live:round(clamp(live,0,100)),food:round(food),transit:round(transit),health:round(health),education:round(education),social:round(social),green,stress,penalty:round(penalty),noise:round(noise),pressure:round(pressure)};
  }
  function statistics(s) {
    const hs=houses(s),bs=buildings(s),pop=hs.reduce((n,h)=>n+h.pop,0),cap=hs.reduce((n,h)=>n+capacity(h),0);
    const details=hs.map(h=>({id:h.id,pop:h.pop,...quality(s,h)}));
    const weight=pop||hs.length||1;
    const live=details.reduce((n,q)=>n+q.live*(pop?q.pop:1),0)/weight;
    const foodCoverage=details.filter(q=>q.food>=7).reduce((n,q)=>n+(pop?q.pop:1),0)/weight*100;
    const transitCoverage=details.filter(q=>q.transit>=7).reduce((n,q)=>n+(pop?q.pop:1),0)/weight*100;
    const healthCoverage=details.filter(q=>q.health>=6).reduce((n,q)=>n+(pop?q.pop:1),0)/weight*100;
    const localJobs=bs.reduce((n,t)=>n+(D.buildings[t.kind].jobs||0),0);
    const accessibleJobs=localJobs+200+Math.round(transitCoverage*3.5);
    const workers=Math.round(pop*.46),employment=workers?clamp(accessibleJobs/workers,0,1)*100:100;
    const economy=clamp(1+modifiers(s,'economy'),.2,2);
    const commerceBuff=1+(s.policies.business?.35:0)+modifiers(s,'commerce');
    let receipts=0,maintenance=0,municipal=0,retrofit=0;
    for(const b of bs) {
      const d=D.buildings[b.kind]; maintenance+=(d.upkeep||0)+(b.kind==='hdb'?(b.level-1)*1.5:0);
      if(residential(b)) municipal+=b.pop*(b.kind==='condo'?.008:.026);
      if(d.revenue) {
        const nearbyPop=hs.filter(h=>dist(h,b)<=2).reduce((n,h)=>n+h.pop,0);
        const trade=['commerce'].includes(d.category)?clamp(.45+nearbyPop/900,.45,1.25):1;
        let v=d.revenue*trade;
        if(d.category==='commerce') v*=economy*commerceBuff;
        if(['office','tech'].includes(b.kind)) v+=s.innovation*5;
        if(d.dlc && s.turn-b.builtAt<2) v=0;
        receipts+=v;
      }
      if(b.retrofit) retrofit+=2;
    }
    const subsidyCost=Object.keys(s.policies).reduce((n,k)=>n+D.policies[k].cost,0);
    const funding=s.scenario==='tight'?44:62;
    const solar=bs.filter(t=>t.kind==='solar').length;
    const extraEnergy=s.dlc?Math.max(0,heat(s).level*bs.filter(t=>!residential(t)).length*1.6*(s.powerSaving?.5:1)-solar*3):0;
    const net=round(funding+municipal+receipts-maintenance-retrofit-subsidyCost-extraEnergy);
    const energy=s.dlc?round(Math.max(0,pop*.018*(1+heat(s).level*.22)+bs.length*1.3-solar*18-hs.filter(t=>t.retrofit).length*.8)):0;
    return {pop,cap,live:round(live),foodCoverage:round(foodCoverage),transitCoverage:round(transitCoverage),healthCoverage:round(healthCoverage),jobs:accessibleJobs,employment:round(employment),net,details,
      cashflow:{funding:round(funding),municipal:round(municipal),commerce:round(receipts),maintenance:round(-maintenance),retrofit:round(-retrofit),policies:-subsidyCost,energy:round(-extraEnergy)},
      hdb:hs.filter(t=>t.kind==='hdb').length,condo:hs.filter(t=>t.kind==='condo').length,upgrades:hs.filter(t=>t.kind==='hdb').reduce((n,t)=>n+t.level-1,0),
      services:bs.filter(t=>D.buildings[t.kind].category==='services').length,businesses:bs.filter(t=>D.buildings[t.kind].category==='commerce').length,
      retrofits:hs.filter(t=>t.retrofit).length,parks:bs.filter(t=>D.buildings[t.kind].green).length,greenCoverage:round(details.filter(q=>q.green).reduce((n,q)=>n+(pop?q.pop:1),0)/weight*100),
      energy,carbon:round(energy*.45),housingShare:pop?round(hs.filter(t=>t.kind==='hdb').reduce((n,t)=>n+t.pop,0)/pop*100):0,
    };
  }
  function setBuilding(s,t,kind,pop=0) {
    t.kind=kind;t.level=1;t.pop=pop;t.builtAt=s.turn;t.retrofit=false;t.shaded=false;
  }
  function goalsFor(s) {
    if(s.mode==='eco') return [
      {id:'eco-ready',name:['热季准备','Prepare for the heat'],due:3,checks:[['retrofits',3],['parks',2]],reward:90},
      {id:'eco-heat',name:['撑过热季','Survive the heat'],due:7,checks:[['live',70]],reward:130},
      {id:'eco-network',name:['绿色网络','A green network'],due:10,checks:[['greenCoverage',65],['retrofits',7]],reward:120},
      {id:'eco-budget',name:['可持续运行','Sustainable operation'],due:12,checks:[['live',75],['net',0]],reward:90},
    ];
    if(s.mode==='history') return [
      {id:'homes',name:['让居民安居','A place to call home'],due:5,checks:[['cap',2000],['foodCoverage',55]],reward:150},
      {id:'town',name:['让社区运转','A functioning community'],due:10,checks:[['pop',1700],['businesses',3],['transitCoverage',50]],reward:180},
      {id:'services',name:['成熟社区','A mature community'],due:15,checks:[['live',72],['healthCoverage',45],['upgrades',3]],reward:200},
      {id:'future',name:['面向未来','Ready for the future'],due:20,checks:[['pop',2500],['live',75],['net',25]],reward:220},
    ];
    const n=s.maxTurns;
    return [
      {id:'free-homes',name:['住房与生活','Homes and everyday life'],due:Math.ceil(n*.25),checks:[['cap',2200],['foodCoverage',55]],reward:150},
      {id:'free-work',name:['多元经济','A diverse economy'],due:Math.ceil(n*.5),checks:[['businesses',4],['transitCoverage',60]],reward:180},
      {id:'free-live',name:['社区生活','Community life'],due:Math.ceil(n*.75),checks:[['live',75],['healthCoverage',50]],reward:200},
      {id:'free-stable',name:['城市的长期账本','The long-term city budget'],due:n,checks:[['pop',2700],['net',25]],reward:220},
    ];
  }
  function createGame(options={}) {
    const mode=['history','free','eco'].includes(options.mode)?options.mode:'history';
    const dlc=mode==='eco'||Boolean(options.dlc);
    const s={version:D.version,mode,dlc,scenario:['newtown','mature','tight'].includes(options.scenario)?options.scenario:'newtown',turn:1,maxTurns:mode==='history'?20:mode==='eco'?12:[16,24,36].includes(options.maxTurns)?options.maxTurns:24,
      money:mode==='eco'?1250:options.scenario==='tight'?660:1050,pp:3,ppMax:3,trust:60,seed:(Number(options.seed)>>>0)||20261013,rng:(Number(options.seed)>>>0)||20261013,uid:0,
      tiles:[],hand:[],draw:[],discard:[],exhaust:[],policies:{},mods:[],events:[],eventHistory:[],eventCooldown:{},granted:{},goals:[],recoveries:[],history:[],reports:[],marked:[],lastChapter:1,
      heatSeen:null,cooling:false,powerSaving:false,innovation:0,maintainedUntil:0,deficitTurns:0,score:0,over:null,visits:0,landIncome:0,actions:[],initialDeck:[],undo:[]};
    for(let gy=0;gy<8;gy++) for(let gx=0;gx<9;gx++) s.tiles.push({id:gy*9+gx,gx,gy,kind:[2,5].includes(gy)?'road':'empty',level:1,pop:0,builtAt:1,retrofit:false,shaded:false,locked:gy>=6});
    const starting=[[0,0],[2,0],[5,0],[6,0],[0,1],[5,1]];
    for(const [gx,gy] of starting) setBuilding(s,tile(s,gy*9+gx),'hdb',130);
    for(const [gx,gy,kind] of [[4,3,'hawker'],[8,0,'cc'],[1,4,'bus'],[7,3,'carpark']]) setBuilding(s,tile(s,gy*9+gx),kind);
    if(mode==='eco'||s.scenario==='mature') {
      for(const [gx,gy] of [[2,1],[8,1],[1,3],[2,3],[1,4],[4,4],[7,4],[8,4]]) {
        const t=tile(s,gy*9+gx); if(t.kind==='empty') setBuilding(s,t,'hdb',170);
      }
      setBuilding(s,tile(s,1*9+4),'clinic');setBuilding(s,tile(s,3*9+6),'bus');
      setBuilding(s,tile(s,3*9+3),'shops');setBuilding(s,tile(s,4*9+5),'office');
    }
    let deck=mode==='eco'?D.ecoDeck:mode==='free'?D.freeDeck:D.campaignDeck;
    if(mode==='free'&&options.deck) {
      if(!Array.isArray(options.deck)||options.deck.length<10||options.deck.length>24) throw new Error('invalidDeck');
      const counts={};
      for(const key of options.deck){const c=D.cards[key];if(!owns(D.cards,key)||c.generated||(c.dlc&&!dlc)||((counts[key]=(counts[key]||0)+1)>3)) throw new Error('invalidDeck');}
      deck=options.deck;
    } else if(dlc&&mode!=='eco') deck=[...deck,'batchEco','plant','fund','saver'];
    s.initialDeck=[...deck];s.draw=shuffle(s,deck.map(k=>makeCard(s,k)));s.goals=goalsFor(s).map(g=>({...g,status:'pending',completedAt:null}));
    draw(s,D.settings.draw);startTurn(s);return s;
  }
  function queueEvent(s,key) {
    if(!D.events[key]||(D.events[key].dlc&&!s.dlc)) return;
    const id=key+'-'+s.turn;
    if(s.eventHistory.includes(id)||s.events.some(e=>e.id===id)) return;
    const d=D.events[key];
    if(d.mod) mod(s,d.mod.kind,d.mod.value,d.mod.duration);
    s.events.push({id,key,turn:s.turn});s.eventCooldown[key]=s.turn;
  }
  function startTurn(s) {
    const ch=chapter(s);
    if(s.mode==='history'&&ch>s.lastChapter) {
      const incoming=D.chapterCards[ch]||[];s.draw.push(...incoming.map(k=>makeCard(s,k)));shuffle(s,s.draw);s.lastChapter=ch;s.ppMax=Math.min(6,s.ppMax+1);
      s.actions.push({type:'chapter',chapter:ch,turn:s.turn});
    }
    const historic={2:'ownership',3:'cpf',8:'integration',10:'downturn',12:'health',17:'health'};
    if(s.mode==='history'&&historic[s.turn]) queueEvent(s,historic[s.turn]);
    if(s.mode==='free'&&[6,14,25].includes(s.turn)) queueEvent(s,'downturn');
    if(s.mode==='free'&&[10,21].includes(s.turn)) queueEvent(s,'health');
    const h=heat(s);
    if(h.level&&s.heatSeen!==h.id) {
      s.heatSeen=h.id;queueEvent(s,'heat');
      for(const key of ['subsidy','cool','heatVisit']) s.hand.push(makeCard(s,key,h.id));
    }
    if(s.dlc&&((s.mode==='eco'&&s.turn===10)||(s.mode!=='eco'&&s.turn===18))) {
      queueEvent(s,'rain');const drains=s.tiles.filter(t=>t.kind==='drainage').length;s.money-=Math.max(0,55-drains*25);
    }
    if(!s.events.length) {
      const st=statistics(s),eligible=key=>s.turn-(s.eventCooldown[key]||-20)>=5;
      if(s.money<160&&eligible('budget')) queueEvent(s,'budget');
      else if(st.cap&&st.pop/st.cap>.86&&eligible('shortage')) queueEvent(s,'shortage');
      else if(s.turn>=4&&st.foodCoverage<40&&eligible('complaints')) queueEvent(s,'complaints');
      else if(s.turn>=10&&eligible('ageing')) queueEvent(s,'ageing');
    }
  }
  function validTarget(s,key,t) {
    const c=D.cards[key];if(!c||!t||t.locked) return false;
    if(['empty','housingLots'].includes(c.target)) return t.kind==='empty';
    if(c.target==='upgrade') return t.kind==='hdb'&&t.level<3;
    if(c.target==='retrofit') return t.kind==='hdb'&&!t.retrofit;
    if(c.target==='hawker') return t.kind==='hawker'&&!t.shaded;
    return !c.target;
  }
  function upgradeCost(t) { return t.level>=3?0:D.settings.upgradeCosts[t.level]; }
  function cardCost(s,c,t) {
    const costs={community:35,commerce:45,mediation:25,publicWorks:60,healthResponse:50,innovation:100,expansion:180,saver:45,shade:45,housingAid:20};
    if(c.key==='renewal') return t?Math.ceil(upgradeCost(t)*.6):66;
    if(c.key==='buildHousing') return 115;
    if(c.key==='batchEco') return 65;
    return costs[c.key]||0;
  }
  function canPlay(s,c,targetId) {
    const d=c&&D.cards[c.key];if(!d||!s.hand.some(h=>h.uid===c.uid)) return {ok:false,error:'notInHand'};
    if(s.over) return {ok:false,error:'gameOver'};
    if(!unlocked(s,d)&&!d.generated) return {ok:false,error:'locked'};
    if(d.dlc&&!s.dlc) return {ok:false,error:'dlcOff'};
    if(d.cost>s.pp) return {ok:false,error:'political'};
    if(d.persist&&s.policies[d.persist]) return {ok:false,error:'alreadyActive'};
    if(d.stops&&!s.policies[d.stops]) return {ok:false,error:'notActive'};
    if(c.key==='expansion'&&!s.tiles.some(t=>t.locked)) return {ok:false,error:'alreadyExpanded'};
    if(c.eventId&&c.key!=='housingAid'&&c.eventId!==heat(s).id) return {ok:false,error:'expired'};
    if(c.eventId&&c.key==='housingAid'&&s.turn>Number(c.eventId.split('-').pop())+2) return {ok:false,error:'expired'};
    const t=targetId===undefined?null:tile(s,targetId);
    if(d.target&&targetId!==undefined&&!validTarget(s,c.key,t)) return {ok:false,error:'target'};
    if(cardCost(s,c,t)>0&&s.money<cardCost(s,c,t)) return {ok:false,error:'funds'};
    return {ok:true,needsTarget:Boolean(d.target&&targetId===undefined)};
  }
  function activateCard(s,c,t) {
    const d=D.cards[c.key],key=c.key;
    if(d.target&&!t) throw new Error('target');
    s.pp-=d.cost;
    if(d.persist) {s.policies[d.persist]={since:s.turn};s.hand.push(makeCard(s,D.policies[d.persist].stop));}
    if(d.stops) delete s.policies[d.stops];
    if(key==='grant') s.money+=90;
    if(key==='reserve') s.money+=150;
    if(key==='buildHousing') {
      const lots=[t,...s.tiles.filter(l=>!l.locked&&l.kind==='empty'&&l.gy===t.gy&&Math.abs(l.gx-t.gx)===1)];
      let made=0;for(const l of lots) {if(made>=2||s.money<115) break;s.money-=115;setBuilding(s,l,'hdb');made++;}
    }
    if(key==='renewal'){s.money-=Math.ceil(upgradeCost(t)*.6);t.level++;}
    if(key==='landTender'){setBuilding(s,t,'condo');s.money+=320;s.landIncome+=320;s.trust-=2;}
    if(key==='community'){s.money-=35;mod(s,'live',7,2);s.trust+=4;}
    if(key==='commerce'){s.money-=45;mod(s,'commerce',.22,3);}
    if(key==='austerity'){s.money+=110;mod(s,'live',-6,2);s.trust-=5;}
    if(key==='mediation'){s.money-=25;s.trust+=10;mod(s,'live',4,1);}
    if(key==='expansion'){s.money-=180;s.tiles.forEach(l=>l.locked=false);}
    if(key==='publicWorks'){s.money-=60;s.maintainedUntil=s.turn+3;}
    if(key==='healthResponse'){s.money-=50;mod(s,'healthShock',-7,2);mod(s,'live',6,2);}
    if(key==='innovation'){s.money-=100;s.innovation++;}
    if(key==='housingAid'){s.money-=20;mod(s,'appeal',10,1);}
    if(key==='visit'||key==='heatVisit') {
      draw(s,2);s.visits++;s.trust+=key==='visit'?2:0;
      const hs=houses(s);s.marked=hs.sort((a,b)=>key==='heatVisit'?quality(s,b).stress-quality(s,a).stress:quality(s,a).live-quality(s,b).live).slice(0,3).map(h=>h.id);
    }
    if(key==='batchEco') {
      for(const h of [t,...s.tiles.filter(l=>l.kind==='hdb'&&l.gy===t.gy&&Math.abs(l.gx-t.gx)===1)]) {
        if(h.retrofit||s.money<65) continue;s.money-=65;h.retrofit=true;
      }
    }
    if(key==='plant') setBuilding(s,t,'park');
    if(key==='saver'){s.money-=45;s.powerSaving=true;}
    if(key==='shade'){s.money-=45;t.shaded=true;}
    if(key==='cool') s.cooling=true;
    s.trust=clamp(s.trust,0,100);
    s.hand=s.hand.filter(h=>h.uid!==c.uid);
    (d.exhaust?s.exhaust:s.discard).push(c);
    s.actions.push({type:'play',key,target:t?t.id:null,turn:s.turn});
  }
  function checkGoals(s) {
    const st=statistics(s),notices=[];
    for(const g of s.goals) {
      if(g.status!=='pending') continue;
      if(g.checks.every(([key,val])=>st[key]>=val)) {
        g.status='done';g.completedAt=s.turn;const early=s.turn<g.due;s.money+=g.reward+(early?50:0);s.score+=early?150:100;
        if(early) s.ppMax=Math.min(6,s.ppMax+1);
        notices.push({kind:'goal',id:g.id,status:'done',early,reward:g.reward+(early?50:0)});
      } else if(s.turn>=g.due) {
        g.status='failed';s.trust=Math.max(0,s.trust-5);
        s.recoveries.push({goalId:g.id,due:s.turn+3,status:'pending',checks:clone(g.checks),reward:70});
        notices.push({kind:'goal',id:g.id,status:'failed'});
      }
    }
    for(const r of s.recoveries) {
      if(r.status!=='pending') continue;
      if(r.checks.every(([key,val])=>st[key]>=val)){r.status='done';s.money+=r.reward;s.score+=50;notices.push({kind:'recovery',id:r.goalId,status:'done',reward:r.reward});}
      else if(s.turn>=r.due){r.status='failed';notices.push({kind:'recovery',id:r.goalId,status:'failed'});}
    }
    return notices;
  }
  function settle(s) {
    if(s.events.length) throw new Error('eventPending');
    const before=statistics(s),changes=[];
    for(const h of houses(s)) {
      const q=quality(s,h),cap=capacity(h),jobFactor=before.employment<65?-5:0;
      const attraction=q.live+modifiers(s,'appeal')+jobFactor;
      let delta=0;
      if(attraction>=58) delta=Math.min(cap-h.pop,Math.max(0,Math.round((cap-h.pop)*.16+(attraction-58)*.5)));
      else if(attraction<48) delta=-Math.min(h.pop,Math.max(1,Math.round(h.pop*(48-attraction)/220)));
      const old=h.pop;h.pop=clamp(h.pop+delta,0,cap);if(h.pop!==old) changes.push({id:h.id,delta:h.pop-old});
    }
    const current=statistics(s);s.money=round(s.money+current.net);
    const goalNotices=checkGoals(s);
    if(s.money<0) s.deficitTurns++;else s.deficitTurns=0;
    const endedHeat=heat(s).id&&s.turn===heat(s).end;
    let expired=0;
    for(const pile of ['hand','draw','discard']) {
      const dead=s[pile].filter(c=>c.eventId&&((endedHeat&&c.eventId===heat(s).id)||(c.key==='housingAid'&&s.turn>=Number(c.eventId.split('-').pop())+2)));
      s.exhaust.push(...dead);s[pile]=s[pile].filter(c=>!dead.includes(c));expired+=dead.length;
    }
    const after=statistics(s);
    const report={turn:s.turn,before:{pop:before.pop,live:before.live,money:round(s.money-current.net-goalNotices.reduce((n,g)=>n+(g.reward||0),0))},after:{pop:after.pop,live:after.live,money:s.money},cashflow:current.cashflow,net:current.net,changes,goals:goalNotices,expired,heatEnded:Boolean(endedHeat)};
    s.reports.push(report);if(s.reports.length>60)s.reports.shift();
    s.history.push({turn:s.turn,pop:after.pop,live:after.live,money:s.money,net:current.net,capacity:after.cap,carbon:after.carbon});
    s.undo=[];
    if(s.deficitTurns>=2||s.money<=-200) s.over={kind:'bankrupt',turn:s.turn};
    else if(s.turn>=s.maxTurns) s.over={kind:'completed',turn:s.turn};
    if(s.over) return report;
    const keep=[],discard=[];
    for(const c of s.hand)(D.cards[c.key].retain?keep:discard).push(c);
    s.hand=keep;s.discard.push(...discard);
    s.mods=s.mods.map(m=>({...m,remaining:m.remaining-1})).filter(m=>m.remaining>0);
    s.cooling=false;s.marked=[];s.turn++;startTurn(s);s.pp=s.ppMax;draw(s,D.settings.draw);
    return report;
  }
  function step(state,action) {
    if(!action||typeof action.type!=='string') return {ok:false,state,error:'action'};
    if(state.over&&action.type!=='continue') return {ok:false,state,error:'gameOver'};
    const s=clone(state),previous=clone(state);previous.undo=[];
    let report=null;
    try {
      const t=tile(s,action.tileId);
      if(action.type==='play') {
        const c=s.hand.find(h=>h.uid===action.uid),check=canPlay(s,c,action.tileId);
        if(!check.ok)throw new Error(check.error);if(check.needsTarget)throw new Error('target');activateCard(s,c,t);
      } else if(action.type==='build') {
        const d=D.buildings[action.kind];
        if(!d||d.private) throw new Error('building');
        if(!unlocked(s,d)) throw new Error(d.dlc&&!s.dlc?'dlcOff':'locked');
        if(!t||t.locked||t.kind!=='empty')throw new Error('target');
        if(s.money<d.cost)throw new Error('funds');s.money-=d.cost;setBuilding(s,t,action.kind);
        s.actions.push({type:'build',kind:action.kind,tileId:t.id,turn:s.turn});
      } else if(action.type==='upgrade') {
        if(!t||t.kind!=='hdb'||t.level>=3)throw new Error('target');const price=upgradeCost(t);if(s.money<price)throw new Error('funds');s.money-=price;t.level++;
        s.actions.push({type:'upgrade',tileId:t.id,turn:s.turn});
      } else if(action.type==='retrofit') {
        if(!s.dlc)throw new Error('dlcOff');if(!t||t.kind!=='hdb'||t.retrofit)throw new Error('target');
        if(s.money<D.settings.retrofitCost)throw new Error('funds');s.money-=D.settings.retrofitCost;t.retrofit=true;
        s.actions.push({type:'retrofit',tileId:t.id,turn:s.turn});
      } else if(action.type==='demolish') {
        if(!t||!D.buildings[t.kind]||residential(t))throw new Error('protectedHousing');
        if(s.money<25)throw new Error('funds');s.money-=25;setBuilding(s,t,'empty');s.actions.push({type:'demolish',tileId:t.id,turn:s.turn});
      } else if(action.type==='resolveEvent') {
        const ev=s.events[0];if(!ev)throw new Error('noEvent');const d=D.events[ev.key],c=d.choices[action.choice];if(!c)throw new Error('choice');
        if((c.cost||0)>0&&s.money<c.cost)throw new Error('funds');s.money+=(c.gain||0)-(c.cost||0);s.trust=clamp(s.trust+(c.trust||0),0,100);
        if(c.mod)mod(s,c.mod.kind,c.mod.value,c.mod.duration);
        if(c.repair)s.maintainedUntil=s.turn+3;
        if(c.cards)for(const key of c.cards)s.hand.push(makeCard(s,key,ev.id));
        s.eventHistory.push(ev.id);s.events.shift();s.actions.push({type:'event',key:ev.key,choice:action.choice,turn:s.turn});
      } else if(action.type==='endTurn') report=settle(s);
      else if(action.type==='undo') {if(!s.undo.length)throw new Error('noUndo');const last=s.undo.pop();last.undo=s.undo;return {ok:true,state:last};}
      else if(action.type==='continue') {
        if(s.mode!=='free'||s.over?.kind!=='completed')throw new Error('cannotContinue');s.over=null;s.maxTurns+=12;
        const keep=s.hand.filter(c=>D.cards[c.key].retain);s.discard.push(...s.hand.filter(c=>!D.cards[c.key].retain));s.hand=keep;
        s.mods=s.mods.map(m=>({...m,remaining:m.remaining-1})).filter(m=>m.remaining>0);s.cooling=false;s.marked=[];s.turn++;startTurn(s);s.pp=s.ppMax;draw(s,D.settings.draw);s.undo=[];
      } else throw new Error('action');
      if(!['endTurn','continue'].includes(action.type)){s.undo.push(previous);if(s.undo.length>12)s.undo.shift();}
      s.money=round(s.money);s.actions=s.actions.slice(-300);return {ok:true,state:s,report};
    } catch(err) {return {ok:false,state,error:err.message};}
  }
  function assessment(s) {
    const st=statistics(s),done=s.goals.filter(g=>g.status==='done').length;
    const score=Math.round(st.live*4+Math.min(350,st.pop/9)+Math.max(0,Math.min(180,s.money/8))+Math.max(0,Math.min(120,st.net*1.5))+done*100+s.trust+(s.dlc?st.greenCoverage:0));
    let rank=score>=1200?'thriving':score>=950?'stable':score>=700?'fragile':'strained';if(s.over?.kind==='bankrupt')rank='bankrupt';
    return {score,rank,done,total:s.goals.length,...st};
  }
  function advice(s) {
    const st=statistics(s),issues=[];
    if(s.money<160||st.net<0)issues.push('budget');
    if(heat(s).level&&st.details.some(q=>q.stress>=2))issues.push('heat');
    if(s.policies.subsidy&&!heat(s).level)issues.push('stopSubsidy');
    if(st.foodCoverage<60)issues.push('food');
    if(st.cap&&st.pop/st.cap>.8)issues.push('housing');
    if(st.transitCoverage<55)issues.push('transit');
    if(st.healthCoverage<40&&s.turn>6)issues.push('health');
    if(st.live<68)issues.push('live');
    if(!issues.length)issues.push('steady');
    const keys={budget:['grant','reserve','austerity','landTender'],heat:['batchEco','plant','subsidy','cool','shade'],stopSubsidy:['stopSubsidy'],food:['buildHousing','community'],housing:['buildHousing','renewal','landTender','expansion'],transit:['transit'],health:['healthResponse','publicWorks'],live:['mediation','community','relief'],steady:['visit','renewal','innovation']};
    return {stats:st,issues:issues.slice(0,4),cards:[...new Set(issues.flatMap(k=>keys[k]||[]))]};
  }
  function validateState(s) {
    const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
    const integer=(n,min,max)=>Number.isInteger(n)&&finite(n,min,max);
    const safeText=v=>typeof v==='string'&&v.length<=300;
    if(!s||s.version!==1||!['history','free','eco'].includes(s.mode)||!['newtown','mature','tight'].includes(s.scenario)||typeof s.dlc!=='boolean'||s.mode==='eco'&&!s.dlc)throw new Error('invalidSave');
    for(const [key,min,max] of [['turn',1,10000],['maxTurns',1,10000],['money',-1e8,1e8],['trust',0,100],['pp',0,10],['ppMax',1,10],['uid',0,1e7],['rng',1,4294967295]])if(!finite(s[key],min,max))throw new Error('invalidSave');
    for(const key of ['turn','maxTurns','uid','pp','ppMax','innovation','maintainedUntil','deficitTurns','visits','lastChapter'])if(!integer(s[key],0,1e8))throw new Error('invalidSave');
    if(!integer(s.rng,1,4294967295)||!integer(s.seed,1,4294967295))throw new Error('invalidSave');
    if(!finite(s.score,0,1e8)||!finite(s.landIncome,0,1e8)||!s.eventCooldown||typeof s.eventCooldown!=='object'||s.over&&!['bankrupt','completed'].includes(s.over.kind))throw new Error('invalidSave');
    if(!Array.isArray(s.tiles)||s.tiles.length!==72)throw new Error('invalidSave');
    const seen=new Set();
    for(const t of s.tiles) {
      if(!Number.isInteger(t.id)||t.id<0||t.id>=72||seen.has(t.id)||t.gx!==t.id%9||t.gy!==Math.floor(t.id/9))throw new Error('invalidSave');seen.add(t.id);
      if(!['empty','road',...Object.keys(D.buildings)].includes(t.kind)||D.buildings[t.kind]?.dlc&&!s.dlc||!Number.isInteger(t.level)||t.level<1||t.level>3||!integer(t.pop,0,capacity(t))||!integer(t.builtAt,0,10000)||typeof t.locked!=='boolean'||typeof t.retrofit!=='boolean'||typeof t.shaded!=='boolean')throw new Error('invalidSave');
    }
    const uids=new Set();for(const p of ['hand','draw','discard','exhaust']) {
      if(!Array.isArray(s[p])||s[p].length>10000)throw new Error('invalidSave');
      for(const c of s[p]){if(!owns(D.cards,c.key)||D.cards[c.key].dlc&&!s.dlc||!Number.isInteger(c.uid)||c.uid<1||c.uid>s.uid||uids.has(c.uid)||c.eventId!==undefined&&(typeof c.eventId!=='string'||!/^[A-Za-z]+-\d+$/.test(c.eventId)))throw new Error('invalidSave');uids.add(c.uid);}
    }
    for(const p of ['mods','events','eventHistory','goals','recoveries','history','reports','marked','actions','initialDeck','undo'])if(!Array.isArray(s[p])||s[p].length>10000)throw new Error('invalidSave');
    if(!s.policies||typeof s.policies!=='object'||Object.keys(s.policies).some(k=>!owns(D.policies,k)||D.policies[k].dlc&&!s.dlc||!integer(s.policies[k].since,1,10000)))throw new Error('invalidSave');
    if(s.events.some(e=>!owns(D.events,e.key)||D.events[e.key].dlc&&!s.dlc||!integer(e.turn,1,10000)||e.id!==e.key+'-'+e.turn)||s.mods.some(m=>!['live','appeal','commerce','economy','healthShock'].includes(m.kind)||!finite(m.value,-100,100)||!integer(m.remaining,1,100)))throw new Error('invalidSave');
    const goalKeys=['cap','pop','foodCoverage','transitCoverage','healthCoverage','live','net','businesses','upgrades','retrofits','parks','greenCoverage'];
    const checks=c=>Array.isArray(c)&&c.length>0&&c.length<=6&&c.every(x=>Array.isArray(x)&&x.length===2&&goalKeys.includes(x[0])&&finite(x[1],0,100000));
    if(!s.goals.length||s.goals.length>12||s.goals.some(g=>!safeText(g.id)||!Array.isArray(g.name)||g.name.length!==2||!g.name.every(safeText)||!['pending','done','failed'].includes(g.status)||!checks(g.checks)||!integer(g.due,1,10000)||!finite(g.reward,0,100000)))throw new Error('invalidSave');
    if(s.recoveries.some(r=>!s.goals.some(g=>g.id===r.goalId)||!checks(r.checks)||!['pending','done','failed'].includes(r.status)||!integer(r.due,1,10000)||!finite(r.reward,0,100000)))throw new Error('invalidSave');
    if(s.initialDeck.some(k=>!owns(D.cards,k)||D.cards[k].dlc&&!s.dlc)||s.marked.some(id=>!integer(id,0,71)))throw new Error('invalidSave');
    if(s.history.some(h=>!integer(h.turn,1,10000)||!finite(h.pop,0,1e8)||!finite(h.money,-1e8,1e8)||!finite(h.live,0,100)))throw new Error('invalidSave');
    if(s.actions.some(a=>!integer(a.turn,1,10000)||!['play','build','event','upgrade','retrofit','demolish','chapter'].includes(a.type)||a.type==='play'&&!owns(D.cards,a.key)||a.type==='build'&&!owns(D.buildings,a.kind)||a.type==='event'&&(!owns(D.events,a.key)||!integer(a.choice,0,D.events[a.key].choices.length-1))||a.type==='chapter'&&!integer(a.chapter,1,4)||a.tileId!==undefined&&!integer(a.tileId,0,71)))throw new Error('invalidSave');
    if(s.undo.length>12)throw new Error('invalidSave');
    for(const snapshot of s.undo){if(snapshot.undo?.length)throw new Error('invalidSave');validateState(snapshot);}
    return s;
  }
  function serialize(s) { return JSON.stringify({format:'hdb-community-save',version:1,state:s}); }
  function restore(text) {
    if(typeof text!=='string'||text.length>5*1024*1024)throw new Error('invalidSave');
    let data;try{data=JSON.parse(text);}catch{throw new Error('invalidSave');}
    if(data.format!=='hdb-community-save'||data.version!==1)throw new Error('invalidSave');return validateState(data.state);
  }
  return {createGame,step,statistics,quality,heat,chapter,capacity,unlocked,canPlay,validTarget,upgradeCost,cardCost,assessment,advice,serialize,restore,validateState,clone,dist,data:D};
});
