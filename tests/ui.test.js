const test=require('node:test'),assert=require('node:assert/strict');
const {boot}=require('./dom-harness.js');
test('desktop boots without WebGL, starts the campaign, plays keyboard cards, saves, and reaches a historical event',()=>{
  const b=boot();assert.equal(b.doc.documentElement.dataset.gameReady,'true');b.frame();b.click('#startGame');assert.equal(b.state().mode,'history');assert.equal(b.state().dlc,false);assert.equal(b.doc.getElementById('gameMenu').hidden,true);
  const state=b.state(),card=state.hand.find(c=>c.key==='grant'||c.key==='reserve');if(card){const el=b.doc.querySelector(`[data-uid="${card.uid}"]`);el.onkeydown({key:'Enter',preventDefault(){},stopPropagation(){}});assert.ok(b.state().money>state.money);}
  b.click('#endTurn');assert.equal(b.state().turn,2);assert.equal(b.doc.getElementById('endTurn').disabled,true);b.click('[data-event-choice="1"]');assert.equal(b.state().events.length,0);b.click('[data-do="report"]');assert.equal(b.doc.getElementById('overlay').hidden,false);b.click('#closeModal');b.click('[data-do="menu"]');b.click('#resumeGame');assert.equal(b.state().turn,2);
});
test('free deck editor retains its menu context, changes cards, and launches the requested length',()=>{
  const b=boot();b.click('[data-mode="free"]');const length=b.doc.getElementById('lengthSelect');length.value='16';length.onchange();b.click('#editDeck');const count=b.doc.querySelector('[data-deck-plus="mediation"]');count.click();b.click('#confirmDeck');assert.equal(b.doc.getElementById('gameMenu').hidden,false);b.click('#startGame');assert.equal(b.state().mode,'free');assert.equal(b.state().maxTurns,16);assert.equal(b.state().initialDeck.filter(k=>k==='mediation').length,2);
});
test('portrait can build a house from catalogue and a lot selector, inspect/upgrade it, and undo',()=>{
  const b=boot({width:390,height:844});assert.equal(b.doc.body.classList.contains('mobile-modal'),true);b.click('#startGame');assert.equal(b.doc.getElementById('mobileControls').hidden,false);b.click('[data-mobile-tab="build"]');b.click('[data-do="catalog"]');assert.equal(b.doc.querySelector('[data-build="park"]'),null);b.click('[data-build="hdb"]');const target=+b.doc.getElementById('targetLot').value;b.click('#confirmTarget');assert.equal(b.state().tiles[target].kind,'hdb');assert.equal(b.doc.getElementById('overlay').hidden,true);b.click('[data-mobile-tab="build"]');b.doc.getElementById('mobileTileList').value=String(target);b.click('#inspectMobileTile');b.click(`[data-upgrade="${target}"]`);assert.equal(b.state().tiles[target].level,2);b.click('[data-do="undo"]');assert.equal(b.state().tiles[target].level,1);
});
test('DLC selects the eco campaign with its own cards, buildings, and phone reports',()=>{
  const b=boot({width:390,height:844});b.click('[data-mode="eco"]');b.click('#startGame');assert.equal(b.state().dlc,true);assert.equal(b.state().mode,'eco');b.click('[data-mobile-tab="build"]');b.click('[data-do="catalog"]');assert.ok(b.doc.querySelector('[data-build="park"]'));b.click('#closeModal');b.click('#mobileEnd');assert.equal(b.state().turn,2);assert.equal(b.doc.getElementById('overlay').hidden,false);b.click('#reportContinue');assert.equal(b.doc.getElementById('mobileControls').hidden,false);
});
test('model responses are text, never actions; keys are not saved to storage or city saves',async()=>{
  let request;const b=boot({fetch:async(url,opts)=>{request={url,opts};return {ok:true,json:async()=>({choices:[{message:{content:'<script>grantMoney(99999)</script> Keep your cash flow steady.'}}]})};}});
  b.click('#startGame');b.click('[data-do="menu"]');b.click('[data-do="settings"]');b.doc.getElementById('modelUrl').value='https://api.example.test/v1/chat/completions';b.doc.getElementById('modelName').value='test-model';b.doc.getElementById('modelKey').value='session-only-key';b.click('#saveSettings');b.click('#resumeGame');const before=JSON.stringify(b.state());b.click('#advBtn');b.click('#askModel');await new Promise(r=>setImmediate(r));assert.ok(request);assert.equal(request.opts.headers.Authorization,'Bearer session-only-key');assert.equal(JSON.stringify(b.state()),before);assert.ok(b.doc.getElementById('aiAnswer').textContent.includes('<script>'));assert.equal(b.doc.getElementById('aiAnswer').querySelector('script'),null);assert.ok(![...b.store.values()].some(v=>v.includes('session-only-key')));
});
test('every campaign can reach its ending through the real UI event handlers',()=>{
  for(const mode of ['history','free','eco']) {
    const b=boot();if(mode!=='history')b.click(`[data-mode="${mode}"]`);b.click('#startGame');let turns=0;
    while(!b.state().over&&turns++<40){while(b.state().events.length){const key=b.state().events[0].key,choices=b.ctx.HDBData.events[key].choices,index=choices.findIndex(c=>(c.cost||0)===0);b.click(`[data-event-choice="${index<0?choices.length-1:index}"]`);}b.click('#endTurn');}
    assert.ok(b.state().over);assert.equal(b.doc.getElementById('overlay').hidden,false);assert.ok(b.doc.getElementById('endingNew'));
  }
});
