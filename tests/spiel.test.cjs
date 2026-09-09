// Ausführen mit: node tests/spiel.test.cjs (nur Entwicklung, kein Build-Schritt).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');

class Element {
  constructor() { this.value = ''; this.hidden = false; this.disabled = false; this.textContent = ''; this.events = {}; this.options = []; this.classList = { add() {}, remove() {} }; }
  addEventListener(name, fn) { this.events[name] = fn; }
  replaceChildren(...options) { this.options = options; this.value = options[0]?.value || ''; }
  add(option) { this.options.push(option); if (!this.value) this.value = option.value; }
  showModal() { this.open = true; } close() { this.open = false; }
  getBoundingClientRect() { return this.bounds || {width: 720, height: 648}; }
  focus() {} setPointerCapture() {} remove() {}
}
async function boot(extra = {}) {
  const elements = new Map();
  const get = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  get('thinking').value = '2';
  get('canvas').getContext = () => new Proxy({}, { get: (_, key) => key === 'measureText' ? text => ({width: text.length * 10}) : () => {} });
  const events = {}, docEvents = {};
  const storage = new Map();
  const context = vm.createContext({ localStorage: {getItem: key => storage.get(key) || null, setItem: (key,value) => storage.set(key,String(value))}, console, setTimeout, clearTimeout, requestAnimationFrame() {},
    Option: function(text, value) { this.text = text; this.value = value; },
    Image: class { set src(value) { this.naturalWidth = 100; this.naturalHeight = 100; queueMicrotask(() => this.onload()); } },
    document: { hidden: false, getElementById: get, querySelector: get, addEventListener(name,fn) { docEvents[name] = fn; }, createElement: () => new Element(), head: { append(script) {
      queueMicrotask(() => { try {
        const code = extra[script.src] ?? fs.readFileSync(path.join(root, script.src), 'utf8');
        vm.runInContext(code, context); script.onload();
      } catch (_) { script.onerror(); } });
    } } }
  });
  context.window = context;
  context.addEventListener = (name,fn) => { events[name] = fn; };
  vm.runInContext(fs.readFileSync(path.join(root,'aufgaben.js'),'utf8'), context);
  if (extra.catalog) context.KRONK_KATALOG.push(extra.catalog);
  let source = fs.readFileSync(path.join(root,'spiel.js'),'utf8');
  source = source.replace('  init();', `  window.test = {
    resizeCanvas, draw, start, step, pause, chooseTopic, updateGrades, updateTopics, updateSelected, validate, makeRow,
    get state() { return {mode, questions, index, score, camera, row, oldRows, player, hold, thinking, apexUsed}; },
    keys, pointers, constants: {W,H,GAP,GRAVITY,JUMP,SPEED,ROW_Y},
    position(x, y, vy) { player.x=x; player.y=y; player.vy=vy; },
    fixture(q) { selected = {id:'test', fach:'Test', klasse:5, thema:'Test', data:{mischen:false,fragen:q}}; mode='ready'; }
  }; window.ready = init();`);
  vm.runInContext(source, context);
  await context.ready;
  return {t:context.test, get, events, docEvents, context};
}
module.exports = (async () => {
  const {t,get,events,docEvents,context} = await boot();
  assert.equal(t.state.mode,'ready');
  assert.deepEqual(get('subject').options.map(o=>o.value),['Deutsch','Religion']);
  assert.equal(t.state.thinking,2);
  get('grade').value='6'; t.updateTopics();
  assert.equal(get('topic').options.length,2);
  get('topic').value='deutsch-6-satzglieder'; t.updateSelected(); t.start();
  assert.equal(t.state.questions.length,2);
  assert.match(get('question').textContent,/Subjekt|Prädikat/);
  t.chooseTopic(); get('subject').value='Religion'; t.updateGrades();
  assert.deepEqual(get('grade').options.map(o=>o.value),['6']);
  assert.equal(get('topic').value,'religion-6-feste');
  t.start(); assert.equal(t.state.questions.length,3);
  t.chooseTopic();
  const q = {frage:'Testfrage',antworten:[{text:'Ja',richtig:true},{text:'Nein',richtig:false}]};
  // Mehr Flugzeit ohne längere Denkpause; Kronk bleibt auch nach dem Kamerawechsel im Bild.
  const allCorrect = {...q,antworten:[{text:'Links',richtig:true},{text:'Mitte',richtig:true},{text:'Rechts',richtig:true}]};
  for (const seconds of [0,2]) {
    t.fixture([allCorrect,allCorrect,allCorrect]); get('thinking').value=String(seconds); t.start();
    for (let jump=0;jump<2;jump++) {
      assert.equal(t.state.row.y-t.state.camera,350);
      assert.ok(t.state.player.y-t.state.camera <= t.constants.H);
      let steps=0, top=Infinity;
      while(t.state.index===jump && steps<1200) {
        top=Math.min(top,t.state.player.y-t.state.camera-95);
        t.step(1/120); steps++;
      }
      const flight=steps/120-seconds;
      assert.ok(flight>2.04 && flight<2.10,`Flugzeit: ${flight}`);
      assert.ok(flight>1.75*1.16,'Mindestens 16 Prozent mehr Zeit als zuvor');
      assert.ok(top>=10,`Kronks Kopf bleibt sichtbar: ${top}`);
      assert.equal(t.state.index,jump+1);
    }
  }
  // Retina-Auflösung folgt der tatsächlich eingepassten Fläche, auch nach Drehung/Zoom.
  const canvas = get('canvas'), field = get('.playfield');
  for (const dpr of [1, 2, 3]) {
    context.devicePixelRatio = dpr;
    for (const bounds of [{width:744,height:640},{width:820,height:350}]) {
      field.bounds = bounds; t.resizeCanvas();
      const width = Math.min(bounds.width, bounds.height * 600 / 540);
      assert.equal(canvas.width, Math.round(width*dpr));
      assert.equal(canvas.height, Math.round(width*540/600*dpr));
      t.draw(); assert.equal(canvas.width, Math.round(width*dpr));
    }
  }
  assert.equal(t.constants.SPEED,480);
  assert.equal(t.constants.JUMP,700); assert.equal(t.constants.GRAVITY,600); assert.equal(t.constants.GAP,165);
  // Seitliche Eingabe beeinflusst Sprunghöhe und Fallgeschwindigkeit in keinem Zeitschritt.
  const trajectories = [];
  for (const direction of ['', 'ArrowLeft', 'ArrowRight']) {
    t.fixture([q,q]); get('thinking').value='0'; t.start();
    if (direction) t.keys.add(direction);
    const trajectory = [];
    for (let i=0;i<200;i++) { t.step(1/120); trajectory.push([t.state.player.y,t.state.player.vy]); }
    trajectories.push(trajectory);
  }
  assert.deepEqual(trajectories[0],trajectories[1]); assert.deepEqual(trajectories[0],trajectories[2]);
  // Lange Antworten vergrößern die Zeichenfläche; die einzige Frage bleibt unter dem Canvas.
  t.fixture([{...q,antworten:q.antworten.map(a=>({...a,text:a.text.repeat(250)}))}]); t.start();
  assert.ok(canvas.height/canvas.width > 540/600);
  const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.equal((html.match(/id="question"/g)||[]).length,1);
  assert.ok(html.indexOf('id="question"') > html.indexOf('</canvas>'));
  const key = (name,type='keydown') => events[type]({key:name,target:{tagName:'CANVAS'},preventDefault(){},repeat:false});
  // Tatsächliche Physik, alle fünf Denkzeiten, Steuerung vor/am/nach dem Scheitel.
  for (const seconds of [0,1,2,4,6,8,10]) {
    t.fixture([q,q]); get('thinking').value=String(seconds); t.start();
    key('ArrowLeft'); const x=t.state.player.x; t.step(1/120); assert.ok(t.state.player.x < x); key('ArrowLeft','keyup');
    for(let i=0;i<200 && !t.state.apexUsed;i++) t.step(1/120);
    assert.equal(t.state.apexUsed,true);
    t.step(1/120);
    assert.equal(t.state.thinking,seconds);
    if(seconds===0) { assert.equal(t.state.hold,0); assert.ok(t.state.player.vy>0); assert.doesNotMatch(get('status').textContent,/Denkpause/); }
    else { assert.ok(t.state.hold>0); const y=t.state.player.y; key('ArrowRight'); t.step(1/120); assert.equal(t.state.player.y,y); key('ArrowRight','keyup'); }
    const y=t.state.player.y, hold=t.state.hold; t.pause(); t.step(1); assert.equal(t.state.player.y,y); assert.equal(t.state.hold,hold); t.pause();
    get('left').events.pointerdown({preventDefault(){},pointerId:1}); const px=t.state.player.x; t.step(1/120); assert.ok(t.state.player.x<px);
    get('left').events.pointercancel({pointerId:1}); assert.equal(t.pointers.size,0);
    events.blur(); assert.equal(t.state.mode,'paused'); assert.equal(t.keys.size,0); t.pause();
    context.document.hidden=true; docEvents.visibilitychange(); assert.equal(t.state.mode,'paused'); context.document.hidden=false;
    t.chooseTopic(); assert.equal(t.state.hold,0); assert.equal(t.state.player,null); assert.equal(t.state.oldRows.length,0); assert.equal(t.state.score,0);
  }
  // Jede Plattformmitte von beiden äußersten Landepositionen bei 0 s erreichbar.
  let routes=0;
  for(const count of [2,3,4]) for(const origin of [28,572]) for(let target=0;target<count;target++) {
    const allRight={frage:'Erreichbarkeit',antworten:Array.from({length:count},(_,i)=>({text:String(i),richtig:true}))};
    t.fixture([allRight,allRight]); get('thinking').value='0'; t.start(); t.position(origin,t.state.player.y,t.state.player.vy);
    const p=t.state.row.platforms[target], goal=p.x+p.width/2;
    for(let i=0;i<300 && t.state.index===0;i++) {
      t.keys.clear(); const dx=goal-t.state.player.x;
      if(Math.abs(dx)>t.constants.SPEED/120/2) t.keys.add(dx>0?'ArrowRight':'ArrowLeft');
      t.step(1/120);
    }
    assert.equal(t.state.score,100,`Route ${count}/${origin}/${target}`); assert.equal(t.state.index,1); routes++;
    assert.equal(get('question').textContent,t.state.row.q.frage);
    assert.equal(t.state.row.y-t.state.camera,t.constants.ROW_Y);
  }
  // Falsche Landung bricht, zeigt alle Lösungen; Neustart behält Sammlung.
  t.fixture([q,q]); t.start();
  const wrong=t.state.row.platforms.find(p=>!p.richtig); t.position(wrong.x+wrong.width/2,t.state.row.y-.5,100); t.step(1/120);
  assert.equal(wrong.broken,true);
  for(let i=0;i<600 && t.state.mode==='playing';i++) t.step(1/120);
  assert.equal(t.state.mode,'lost'); assert.match(get('panel-text').textContent,/Richtig: Ja/);
  t.start(); assert.equal(t.state.score,0); assert.equal(t.state.index,0); assert.equal(t.state.oldRows.length,0); assert.equal(t.state.hold,0);
  // Verfehlen und vollständiger Sieg.
  t.position(300,t.state.row.y-.5,100); t.step(1/120);
  for(let i=0;i<600 && t.state.mode==='playing';i++) t.step(1/120);
  assert.equal(t.state.mode,'lost');
  t.fixture([q]); t.start(); const right=t.state.row.platforms.find(p=>p.richtig); t.position(right.x+right.width/2,t.state.row.y-.5,100); t.step(1/120);
  assert.equal(t.state.mode,'won'); assert.equal(t.state.score,100);
  // Schema, fehlende Datei, Syntaxfehler und abweichende Kennung.
  for(const data of [null,{fragen:[]},{fragen:[null]},{fragen:[{...q,antworten:[null,null]}]},{fragen:[{...q,antworten:[{text:'Nein',richtig:false},{text:'Auch nein',richtig:false}]}]}]) assert.throws(()=>t.validate(data));
  for(const [file,code] of [['fehlt.js',undefined],['kaputt.js','(()'],['falsche-id.js','window.KRONK_SAMMLUNGEN.anders = {};']]) {
    const extra={catalog:{id:'defekt',fach:'Defekt',klasse:9,thema:'Defekt',datei:'aufgaben/'+file}};
    if(code!==undefined) extra['aufgaben/'+file]=code;
    const b=await boot(extra);
    assert.equal(b.t.state.mode,'ready'); assert.match(b.get('load-errors').textContent,new RegExp(file.replace('.','\\.')));
    assert.equal(b.get('subject').options.length,2); assert.equal(b.get('load-errors').hidden,false);
  }
  console.log(`OK: Retina/Drehung/Zoom, Frage nur unten, lange Antworten, höherer Sprung mit mehr Flugzeit, Auswahl, Inhalte, 7 Denkzeiten, ${routes} Querwechsel ohne Denkpause, Tastatur/Pointer, Pause, Landungen, Neustart, Sieg und 3 Ladefehler.`);
})();
