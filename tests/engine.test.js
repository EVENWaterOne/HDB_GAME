const test=require('node:test');
const assert=require('node:assert/strict');
const assetRoot=require('node:fs').existsSync(require('node:path').join(__dirname,'../dist/engine.js'))?'../dist/':'../prototype/';
const E=require(assetRoot+'engine.js'),D=require(assetRoot+'data.js');
const blank=s=>s.tiles.find(t=>t.kind==='empty'&&!t.locked);
function apply(s,a){const r=E.step(s,a);assert.equal(r.ok,true,JSON.stringify(a)+' failed: '+r.error);return r.state;}
function card(s,key,eventId){const c={uid:++s.uid,key,...(eventId?{eventId}:{})};s.hand.push(c);return c;}
function resolve(s){let i=0;while(s.events.length&&i++<10){const cs=D.events[s.events[0].key].choices;const choice=cs.findIndex(c=>(c.cost||0)===0);s=apply(s,{type:'resolveEvent',choice:choice<0?cs.length-1:choice});}return s;}
function play(s,key,tileId){const c=card(s,key);return apply(s,{type:'play',uid:c.uid,...(tileId===undefined?{}:{tileId})});}
test('construction is a treasury action, supports several builds, and upgrade increases capacity',()=>{
  let s=E.createGame();const pp=s.pp,cap=E.statistics(s).cap;s=apply(s,{type:'build',kind:'hdb',tileId:blank(s).id});s=apply(s,{type:'build',kind:'shops',tileId:blank(s).id});assert.equal(s.pp,pp);assert.equal(E.statistics(s).cap,cap+240);
  const h=s.tiles.find(t=>t.kind==='hdb');s=apply(s,{type:'upgrade',tileId:h.id});assert.equal(E.capacity(s.tiles[h.id]),320);assert.equal(s.pp,pp);assert.equal(s.tiles[h.id].pop,h.pop);
});
test('Condo only comes from a land tender; brings one-off income and adds housing capacity',()=>{
  let s=E.createGame({mode:'free'});const t=blank(s).id,before=s.money,cap=E.statistics(s).cap;
  assert.equal(E.step(s,{type:'build',kind:'condo',tileId:t}).ok,false);s=play(s,'landTender',t);assert.equal(s.money,before+320);assert.equal(s.landIncome,320);assert.equal(s.tiles[t].kind,'condo');assert.equal(E.statistics(s).cap,cap+320);
  s=resolve(s);s=apply(s,{type:'endTurn'});assert.ok(s.tiles[t].pop>0);assert.ok(E.statistics(s).pop>=s.tiles[t].pop);
});
test('failed actions are atomic: invalid targets, insufficient funds, insufficient political points',()=>{
  const s=E.createGame(),snapshot=E.serialize(s);s.money=0;const poor=E.serialize(s);const fail=E.step(s,{type:'build',kind:'hdb',tileId:blank(s).id});assert.equal(fail.error,'funds');assert.equal(E.serialize(s),poor);assert.strictEqual(fail.state,s);
  const a=E.restore(snapshot),c=card(a,'renewal');const noTarget=E.step(a,{type:'play',uid:c.uid,tileId:blank(a).id});assert.equal(noTarget.error,'target');const saved=E.serialize(a);a.pp=0;assert.equal(E.step(a,{type:'play',uid:c.uid,tileId:0}).error,'political');assert.equal(E.restore(saved).money,a.money);
});
test('spatial service coverage depends on position and has diminishing returns',()=>{
  let near=E.createGame({mode:'free'}),far=E.createGame({mode:'free'});near=apply(near,{type:'build',kind:'hawker',tileId:1});far=apply(far,{type:'build',kind:'hawker',tileId:35});assert.ok(E.quality(near,near.tiles[0]).live>E.quality(far,far.tiles[0]).live);
  const one=E.quality(near,near.tiles[0]).food;near=apply(near,{type:'build',kind:'hawker',tileId:10});assert.equal(E.quality(near,near.tiles[0]).food,one);assert.ok(E.statistics(near).net<E.statistics(far).net+20);
});
test('ongoing policies make one retained stop card and can be ended for free while in debt',()=>{
  let s=E.createGame({mode:'free'});s=play(s,'business');assert.ok(s.policies.business);const stop=s.hand.find(c=>c.key==='stopBusiness');assert.ok(stop);assert.equal(E.canPlay(s,card(s,'business')).error,'alreadyActive');s.money=-30;s.pp=0;
  const before=E.statistics(s).net;s=apply(s,{type:'play',uid:stop.uid});assert.equal(s.policies.business,undefined);assert.ok(s.exhaust.some(c=>c.uid===stop.uid));assert.ok(E.statistics(s).net>before);
});
test('negative cash does not block free event responses or funding cards',()=>{
  let s=E.createGame({mode:'free'});s.money=-40;s.events=[{id:'budget-1',key:'budget',turn:1}];s=apply(s,{type:'resolveEvent',choice:0});assert.equal(s.money,50);s.money=-10;s=play(s,'grant');assert.equal(s.money,80);
});
test('all base campaigns run to completion without any green buildings, cards, heat or green goals',()=>{
  for(const mode of ['history','free'])for(const seed of [1,9,20261013]){
    let s=E.createGame({mode,seed});while(!s.over){s=resolve(s);s=apply(s,{type:'endTurn'});E.validateState(s);assert.equal(E.heat(s).level,0);assert.equal(E.statistics(s).energy,0);assert.ok(s.tiles.every(t=>!D.buildings[t.kind]?.dlc));assert.ok(['hand','draw','discard','exhaust'].every(p=>s[p].every(c=>!D.cards[c.key].dlc)));}
    assert.equal(s.over.kind,'completed');assert.equal(s.history.length,s.maxTurns);assert.ok(E.assessment(s).score>0);
  }
});
test('campaign unlocks new cards and facilities by chapter, with fixed historical milestones',()=>{
  let s=E.createGame();assert.equal(E.step(s,{type:'build',kind:'office',tileId:blank(s).id}).error,'locked');s=apply(s,{type:'endTurn'});assert.equal(s.events[0].key,'ownership');s=resolve(s);s=apply(s,{type:'endTurn'});assert.equal(s.events[0].key,'cpf');
  while(s.turn<6){s=resolve(s);s=apply(s,{type:'endTurn'});}assert.equal(E.chapter(s),2);assert.ok(['hand','draw','discard'].some(p=>s[p].some(c=>c.key==='landTender')));assert.equal(E.unlocked(s,D.buildings.office),true);
});
test('DLC eco-retrofit changes only its own building, keeps housing capacity, and is excluded when off',()=>{
  let s=E.createGame({mode:'eco'});const a=s.tiles[0],b=s.tiles[2],ca=E.capacity(a),beforeOther=E.quality(s,b).live,before=E.quality(s,a).live;s=apply(s,{type:'retrofit',tileId:a.id});assert.equal(E.capacity(s.tiles[a.id]),ca);assert.ok(E.quality(s,s.tiles[a.id]).live>before);assert.equal(E.quality(s,s.tiles[b.id]).live,beforeOther);
  const off=E.createGame({mode:'free'});assert.equal(E.step(off,{type:'retrofit',tileId:0}).error,'dlcOff');assert.equal(E.step(off,{type:'build',kind:'park',tileId:blank(off).id}).error,'dlcOff');
});
test('heat grants retained emergency cards, expires unused copies, and never auto-ends a started subsidy',()=>{
  let s=E.createGame({mode:'eco'});while(s.turn<4){s=resolve(s);s=apply(s,{type:'endTurn'});}s=resolve(s);assert.equal(E.heat(s).level,2);const sub=s.hand.find(c=>c.key==='subsidy'),cool=s.hand.find(c=>c.key==='cool');assert.ok(sub&&cool);s=apply(s,{type:'play',uid:sub.uid});
  while(s.turn<7){s=resolve(s);s=apply(s,{type:'endTurn'});}assert.equal(E.heat(s).level,0);assert.ok(s.policies.subsidy);assert.ok(s.exhaust.some(c=>c.uid===cool.uid));assert.ok(s.hand.some(c=>c.key==='stopSubsidy'));assert.equal(E.statistics(s).cashflow.policies,-30);
  const stop=s.hand.find(c=>c.key==='stopSubsidy');s=apply(s,{type:'play',uid:stop.uid});assert.equal(s.policies.subsidy,undefined);
});
test('missed goals open recovery tasks rather than ending the city',()=>{
  let s=E.createGame();while(s.turn<6){s=resolve(s);s=apply(s,{type:'endTurn'});}assert.equal(s.goals[0].status,'failed');assert.ok(s.recoveries.some(r=>r.goalId===s.goals[0].id));assert.equal(s.over,null);
});
test('free mode deck is validated, and continued play settles a fresh turn',()=>{
  assert.throws(()=>E.createGame({mode:'free',deck:['grant']}));assert.throws(()=>E.createGame({mode:'free',deck:Array(12).fill('grant')}));assert.throws(()=>E.createGame({mode:'free',deck:[...D.freeDeck,'plant']}));
  let s=E.createGame({mode:'free',maxTurns:16,deck:D.freeDeck});while(!s.over){s=resolve(s);s=apply(s,{type:'endTurn'});}s=apply(s,{type:'continue'});assert.equal(s.turn,17);assert.equal(s.maxTurns,28);assert.equal(s.over,null);s=resolve(s);s=apply(s,{type:'endTurn'});assert.equal(s.history.length,17);
});
test('undo restores the full pre-action state and cannot cross a settled turn',()=>{
  let s=E.createGame();const original=E.serialize(s);s=apply(s,{type:'build',kind:'hdb',tileId:blank(s).id});s=apply(s,{type:'undo'});assert.equal(E.serialize(s),original);s=apply(s,{type:'endTurn'});assert.equal(E.step(s,{type:'undo'}).error,'noUndo');
});
test('save round-trip preserves RNG and every subsequent turn, malformed saves fail closed',()=>{
  let s=E.createGame({mode:'free',dlc:true,seed:91});s=apply(s,{type:'build',kind:'park',tileId:blank(s).id});let restored=E.restore(E.serialize(s));assert.deepEqual(restored,s);
  for(let i=0;i<7;i++){s=resolve(s);restored=resolve(restored);s=apply(s,{type:'endTurn'});restored=apply(restored,{type:'endTurn'});assert.deepEqual(restored,s);}
  assert.throws(()=>E.restore('not JSON'));const corrupt=JSON.parse(E.serialize(s));corrupt.state.tiles[0].pop=999999;assert.throws(()=>E.restore(JSON.stringify(corrupt)));corrupt.state.tiles[0].pop=0;corrupt.state.hand[0].key='__proto__';assert.throws(()=>E.restore(JSON.stringify(corrupt)));
});
test('seeded simulations preserve economic and map invariants over mixed actions',()=>{
  for(const mode of ['history','free','eco'])for(let seed=1;seed<=5;seed++) {
    let s=E.createGame({mode,seed,dlc:mode==='free'&&seed%2===0}),ticks=0;
    while(!s.over&&ticks++<40){s=resolve(s);const space=blank(s);if(space&&s.money>220){const kinds=['hdb','hawker','shops','bus','clinic'];const kind=kinds[(s.turn+seed)%kinds.length],r=E.step(s,{type:'build',kind,tileId:space.id});if(r.ok)s=r.state;}
      for(const c of [...s.hand]){const target=s.tiles.find(t=>E.validTarget(s,c.key,t));const r=E.step(s,{type:'play',uid:c.uid,...(D.cards[c.key].target?{tileId:target?.id}:{})});if(r.ok)s=r.state;}
      s=resolve(s);s=apply(s,{type:'endTurn'});E.validateState(s);const st=E.statistics(s);assert.ok(Number.isFinite(st.net));assert.ok(st.pop<=st.cap);assert.ok(s.pp>=0);assert.ok(s.tiles.every(t=>t.pop>=0&&t.pop<=E.capacity(t)));}
    assert.ok(s.over);
  }
});
test('a normal city-building strategy can meet every campaign goal without enabling green DLC',()=>{
  let s=E.createGame();
  const plan={1:[['hawker',1],['bus',4],['hdb',12]],2:[['hdb',16]],3:[['hawker',7]],4:[['hdb',32]],6:[['shops',30],['office',35]],7:[['office',3]],8:[['clinic',10]],10:[['school',33]],11:[['metro',41]],12:[['library',39]]};
  while(!s.over){s=resolve(s);for(const c of [...s.hand])if(['grant','reserve'].includes(c.key)){const r=E.step(s,{type:'play',uid:c.uid});if(r.ok)s=r.state;}
    for(const [kind,id] of plan[s.turn]||[]){const r=E.step(s,{type:'build',kind,tileId:id});if(r.ok)s=r.state;}
    if(s.turn>=6&&s.money>200){const h=s.tiles.find(t=>t.kind==='hdb'&&t.level===1);if(h)s=apply(s,{type:'upgrade',tileId:h.id});}
    if(s.turn>=13&&s.money>250){const h=s.tiles.find(t=>t.kind==='hdb'&&t.level<3);if(h)s=apply(s,{type:'upgrade',tileId:h.id});}
    s=apply(s,{type:'endTurn'});
  }
  assert.equal(s.goals.filter(g=>g.status==='done').length,4);assert.equal(s.over.kind,'completed');assert.equal(E.statistics(s).parks,0);assert.ok(E.assessment(s).score>=1200);
});
