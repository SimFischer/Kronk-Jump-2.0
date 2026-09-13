/* Kronk springt! Kein Framework, kein Server, keine externen Dienste. */
"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $("canvas"), ctx = canvas.getContext("2d");
  const W = 600, H = 540, GRAVITY = 600, JUMP = 700, SPEED = 480;
  const ROW_Y = 410, START_Y = 515, GAP = START_Y - ROW_Y;
  let canvasDpr = 0, renderHeight = H;
  
  function resizeCanvas() {
    const field = document.querySelector(".playfield");
    const bounds = field.getBoundingClientRect();
    const displayWidth = Math.min(bounds.width, bounds.height * W / renderHeight);
    if (displayWidth <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvasDpr = dpr;
    // Erst die Gerätepixel festlegen, dann die CSS-Größe exakt daraus
    // zurückrechnen. Würden beide getrennt gerundet, passte das Verhältnis
    // nicht mehr genau zur Pixeldichte und der Browser müsste das fertige
    // Bild um Bruchteile eines Pixels skalieren – alles wirkte verwaschen.
    // Bei ganzzahliger Pixeldichte zusätzlich auf ein Vielfaches davon
    // abrunden, damit die CSS-Größe eine ganze Zahl bleibt: Browser legen
    // CSS-Pixel auf ein 1/64-Raster, krumme Werte verschieben die Fläche
    // wieder um Bruchteile eines Gerätepixels.
    const raster = Number.isInteger(dpr) ? dpr : 1;
    const trim = value => Math.max(raster, value - value % raster);
    const width = trim(Math.round(displayWidth * dpr));
    const height = trim(Math.round(width * renderHeight / W));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width; canvas.height = height;
    }
    // Der sichtbare Rahmen sitzt an der Zeichenfläche selbst, damit um sie
    // herum keine andersfarbigen Streifen stehen bleiben.
    if (canvas.style) {
      canvas.style.width = `${width / dpr}px`;
      canvas.style.height = `${height / dpr}px`;
      // Zentrierung selbst rechnen und auf das Gerätepixelraster einrasten.
      // Über top/left 50 Prozent plus translate(-50%,-50%) landet die Fläche
      // sonst auf einem halben Pixel und wird ebenfalls weichgezeichnet.
      const originX = bounds.left || 0, originY = bounds.top || 0;
      const left = originX + (bounds.width - width / dpr) / 2;
      const top = originY + (bounds.height - height / dpr) / 2;
      canvas.style.left = `${Math.round(left * dpr) / dpr - originX}px`;
      canvas.style.top = `${Math.round(top * dpr) / dpr - originY}px`;
      canvas.style.transform = "none";
    }
    ctx.setTransform(width / W, 0, 0, height / renderHeight, 0, 0);
  }
  
  const images = {};
  let mode = "loading", questions = [], index = 0, score = 0, camera = 0;
  let row, oldRows = [], player, last = 0, accumulator = 0, hold = 0, apexUsed = false, thinking = 2;
  let failText = "", facing = 1, celebration = 0;
  const keys = new Set(), pointers = new Map();
  
  const shuffle = list => {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  
  let collections = [], selected = null;
  let particles = []; // Konfetti / Partikel für Erfolgseffekt

  // --- KRONK CHARAKTER, FREISCHALT-SYSTEM & LERNSTAND ---
  const kronkLevel = [
    { id: 'kronk', name: 'Standard Kronk', pointsNeeded: 0 },
    { id: 'kronk_silber', name: 'Silberner Kronk', pointsNeeded: 1000 },
    { id: 'kronk_gold', name: 'Goldener Kronk', pointsNeeded: 2500 }
  ];
  let gesamtPunkte = 0;
  let freigeschalteteKronks = ['kronk'];
  let aktiverKronk = 'kronk';
  
  let fehlerSpeicher = {}; 
  let consecutiveCorrect = 0;
  let currentThinking = 2;

  function ladeSpielstand() {
    const pts = localStorage.getItem('kronk_gesamtpunkte');
    if (pts) gesamtPunkte = parseInt(pts);
    const chars = localStorage.getItem('kronk_freigeschaltet');
    if (chars) freigeschalteteKronks = JSON.parse(chars);
    const aktiv = localStorage.getItem('kronk_aktiv');
    if (aktiv) aktiverKronk = aktiv;
    
    const fehler = localStorage.getItem('kronk_fehler');
    if (fehler) fehlerSpeicher = JSON.parse(fehler);
  }

  function speichereSpielstand() {
    localStorage.setItem('kronk_gesamtpunkte', gesamtPunkte);
    localStorage.setItem('kronk_freigeschaltet', JSON.stringify(freigeschalteteKronks));
    localStorage.setItem('kronk_aktiv', aktiverKronk);
    localStorage.setItem('kronk_fehler', JSON.stringify(fehlerSpeicher));
  }

  function aktualisiereKronkMenue() {
    const select = $("kronk-select");
    if (!select) return;
    select.replaceChildren();
    kronkLevel.forEach(char => {
      if (freigeschalteteKronks.includes(char.id)) {
        select.add(new Option(char.name, char.id));
      }
    });
    select.value = aktiverKronk;
  }

  const unlockQueue = [];
  function showNextUnlock() {
    if (!unlockQueue.length || $("unlock-dialog").open) return;
    const char = unlockQueue.shift();
    clearInput();
    $("unlock-title").textContent = char.name;
    $("unlock-image").src = `assets/${char.id}-jubel.png`;
    $("unlock-image").alt = char.name;
    $("unlock-description").textContent = `Stark gemacht! Du hast ${gesamtPunkte.toLocaleString("de-DE")} Gesamtpunkte gesammelt und einen neuen Kronk freigeschaltet.`;
    $("unlock-continue").textContent = unlockQueue.length ? "Nächsten Kronk ansehen" : mode === "playing" ? "Weiterspielen" : "Weiter";
    $("unlock-dialog").showModal();
  }
  function closeUnlock() {
    $("unlock-dialog").close();
    clearInput(); accumulator = 0; last = 0;
    if (unlockQueue.length) showNextUnlock();
    else (mode === "playing" ? canvas : $("start")).focus({preventScroll:true});
  }
  $("unlock-continue").addEventListener("click", closeUnlock);
  $("unlock-dialog").addEventListener("cancel", e => { e.preventDefault(); closeUnlock(); });
  
  function pruefeFreischaltungen() {
    let neuFreigeschaltet = false;
    kronkLevel.forEach(char => {
      if (gesamtPunkte >= char.pointsNeeded && !freigeschalteteKronks.includes(char.id)) {
        freigeschalteteKronks.push(char.id);
        neuFreigeschaltet = true;
        unlockQueue.push(char);
      }
    });
    if (neuFreigeschaltet) {
      speichereSpielstand();
      aktualisiereKronkMenue();
    }
  }

  function gradeTitle(grade) { return String(grade) === "E" ? "E-Jahrgang" : `Klasse ${grade}`; }
  function collectionTitle(c) { return `${c.fach} · ${gradeTitle(c.klasse)} · ${c.thema}${c.beispiel ? " (Beispiel)" : ""}`; }
  function fillSelect(id, options) {
    const select = $(id), previous = select.value;
    select.replaceChildren(...options.map(([value, text]) => new Option(text, value)));
    if (options.some(([value]) => value === previous)) select.value = previous;
    select.disabled = !options.length;
  }
  function updateTopics() {
    const matches = collections.filter(c => c.fach === $("subject").value && String(c.klasse) === $("grade").value);
    fillSelect("topic", matches.map(c => [c.id, c.thema + (c.beispiel ? " (Beispiel)" : "")]));
    updateSelected();
  }
  function updateGrades() {
    const grades = [...new Set(collections.filter(c => c.fach === $("subject").value).map(c => String(c.klasse)))].sort((a,b) => a === "E" ? 1 : b === "E" ? -1 : Number(a)-Number(b));
    fillSelect("grade", grades.map(g => [g, gradeTitle(g)]));
    updateTopics();
  }
  function updateSelected() {
    selected = collections.find(c => c.id === $("topic").value) || null;
    $("start").disabled = !selected || mode === "loading";
    $("set-title").textContent = selected ? collectionTitle(selected) : "Keine Sammlung verfügbar";
    $("collection-info").textContent = selected ? `${selected.data.fragen.length} Aufgaben${selected.beispiel ? " · Kleine Beispielsammlung zum Ausprobieren" : ""}` : "";
  }
  function resetRound() {
    closeFeedback();
    renderHeight = H;
    questions = []; index = 0; score = 0; camera = 0; oldRows = []; row = null; player = null;
    hold = 0; apexUsed = false; failText = ""; celebration = 0; accumulator = 0; last = 0; facing = 1;
    particles = [];
    renderAnswerControls();
    clearInput(); $("score").textContent = `0 Punkte · Gesamt ${gesamtPunkte.toLocaleString("de-DE")}`;
    $("pause").disabled = true; $("pause").textContent = "Pause";
  }
  function chooseTopic() {
    resetRound(); mode = "ready";
    showPanel("Hoch hinaus mit Kronk!", "Kronk springt von allein. Halte die linke oder rechte Hälfte des Spielfelds gedrückt – am Computer gehen auch ← → oder die Ziffer der Antwortkarte. Der rote Fußmarker muss auf der richtigen Karte landen; falsche Karten brechen weg.", "Los geht’s!", true);
    $("selection").hidden = false; $("choose-topic").hidden = true;
    $("question").textContent = "Bereit für den nächsten Sprung?";
    $("progress").textContent = "Mit Kronk nach oben";
    $("status").textContent = "Wähle ein Thema und starte das Spiel.";
    aktualisiereKronkMenue();
    updateSelected(); $("subject").focus({preventScroll:true});
  }
  
  function loadCollection(entry) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      let timer;
      const done = error => {
        clearTimeout(timer); script.remove();
        if (error) reject(Error(`${entry.datei}: ${error.message}`));
        else resolve({...entry, data: window.KRONK_SAMMLUNGEN[entry.id]});
      };
      script.onload = () => {
        try { validate(window.KRONK_SAMMLUNGEN[entry.id]); done(); }
        catch (error) { done(error); }
      };
      script.onerror = () => done(Error("Datei konnte nicht geladen werden. Dateiname und Groß-/Kleinschreibung prüfen."));
      timer = setTimeout(() => done(Error("Laden dauert zu lange. Verbindung prüfen und Seite neu laden.")), 10000);
      script.src = entry.datei;
      document.head.append(script);
    });
  }
  
  async function loadCollections() {
    const list = window.KRONK_KATALOG;
    if (!Array.isArray(list) || !list.length || !window.KRONK_SAMMLUNGEN) throw Error("Die zentrale Liste aufgaben.js fehlt oder ist fehlerhaft.");
    const ids = new Set(), files = new Set(), labels = new Set(), errors = [];
    for (const entry of list) {
      try {
        if (!entry || ![entry.id, entry.fach, entry.thema, entry.datei].every(v => typeof v === "string" && v.trim()) ||
            !(entry.klasse === "E" || (Number.isInteger(entry.klasse) && entry.klasse >= 1)) || !/^aufgaben\/[a-z0-9-]+\.js$/.test(entry.datei) ||
            (entry.beispiel !== undefined && typeof entry.beispiel !== "boolean")) throw Error("Ungültiger Katalogeintrag in aufgaben.js: id, fach, klasse, thema und datei prüfen.");
        const label = JSON.stringify([entry.fach, entry.klasse, entry.thema]);
        if (ids.has(entry.id) || files.has(entry.datei) || labels.has(label)) throw Error(`Doppelter Katalogeintrag: ${entry.id}`);
        ids.add(entry.id); files.add(entry.datei); labels.add(label);
        collections.push(await loadCollection(entry));
      } catch (error) { errors.push(error.message); }
    }
    $("load-errors").textContent = errors.length ? "Diese Sammlungen sind nicht verfügbar:\n" + errors.join("\n") : "";
    $("load-errors").hidden = !errors.length;
    if (!collections.length) throw Error("Keine gültige Aufgabensammlung verfügbar. Bitte die unten genannten Dateien korrigieren und die Seite neu laden.");
    fillSelect("subject", [...new Set(collections.map(c => c.fach))].map(f => [f,f]));
    updateGrades();
  }

  function validate(data) {
    if (!data || !Array.isArray(data.fragen) || !data.fragen.length) throw Error("Keine gültigen Aufgaben registriert. Kennung in der Aufgabendatei mit id in aufgaben.js vergleichen; mindestens eine Frage eintragen.");
    if (data.mischen !== undefined && typeof data.mischen !== "boolean") throw Error("mischen muss true oder false sein.");
    data.fragen.forEach((q, i) => {
      if (!q || typeof q.frage !== "string" || !q.frage.trim() || !Array.isArray(q.antworten) || q.antworten.length < 2 || q.antworten.length > 4 ||
          q.antworten.some(a => !a || typeof a.text !== "string" || !a.text.trim() || typeof a.richtig !== "boolean") || !q.antworten.some(a => a.richtig)) {
        throw Error(`Frage ${i + 1}: Fragetext, 2–4 Antworten und mindestens einmal richtig: true erforderlich.`);
      }
      if (q.antworten.some(a => a.warum !== undefined && typeof a.warum !== "string")) {
        throw Error(`Frage ${i + 1}: warum muss Text sein.`);
      }
      if (q.erklaerung !== undefined && typeof q.erklaerung !== "string") throw Error(`Frage ${i + 1}: erklaerung muss Text sein.`);
    });
  }
  
  function makeRow(y, previousX = null) {
    const q = questions[index];
    const answers = shuffle(q.antworten);
    const gap = 12, margin = 26, width = (W - margin * 2 - gap * (answers.length - 1)) / answers.length;
    // After a correct landing, usually require a new horizontal position.
    // Keep a small random chance, so the previous lane is not always wrong.
    if (previousX !== null) {
      const sameLane = answers.findIndex((a, i) => {
        const x = margin + i * (width + gap);
        return previousX >= x && previousX <= x + width;
      });
      const wrongLanes = answers.map((a, i) => a.richtig ? -1 : i).filter(i => i >= 0);
      if (sameLane >= 0 && answers[sameLane].richtig && wrongLanes.length && Math.random() < 0.9) {
        const other = wrongLanes[Math.floor(Math.random() * wrongLanes.length)];
        [answers[sameLane], answers[other]] = [answers[other], answers[sameLane]];
      }
    }
    return { y, q, platforms: answers.map((a, i) => ({
      ...a, 
      x: margin + i * (width + gap), 
      width, 
      broken: false
    })) };
  }
  
  function clearInput() {
    keys.clear(); pointers.clear();
    $("left").classList.remove("held"); $("right").classList.remove("held");
  }
  
  function showPanel(title, text, button, settings = false) {
    $("panel-title").textContent = title; $("panel-text").textContent = text;
    $("start").textContent = button; $("time-label").hidden = !settings;
    $("selection").hidden = mode !== "ready" && mode !== "error";
    $("choose-topic").hidden = !["paused", "won", "lost"].includes(mode);
    $("overlay").hidden = false; clearInput();
  }
  
  function attr(element, name, value) {
    if (typeof element.setAttribute === "function") element.setAttribute(name, value);
  }

  // Kronk auf die Mitte einer Antwortkarte setzen – gemeinsame Grundlage
  // für die Ziffern 1–4 und die Antwortknöpfe.
  function aimAt(i) {
    if (mode !== "playing" || !row || !player || !row.platforms[i]) return;
    const p = row.platforms[i];
    player.x = Math.max(28, Math.min(W - 28, p.x + p.width / 2));
    $("status").textContent = `Feld ${i + 1} gewählt · „${p.text}“`;
  }

  // Dieselbe Runde ohne Blick aufs Spielfeld: je Antwort ein echter Knopf.
  function renderAnswerControls() {
    const box = $("answer-controls");
    if (!box) return;
    if (!row) { box.hidden = true; box.replaceChildren(); return; }
    box.hidden = false;
    box.replaceChildren(...row.platforms.map((p, i) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${i + 1}. ${p.text}`;
      attr(button, "aria-label", `Antwort ${i + 1} von ${row.platforms.length}: ${p.text}`);
      button.addEventListener("click", () => aimAt(i));
      return button;
    }));
  }

  function setQuestion() {
    $("question").textContent = row.q.frage;
    $("score").textContent = `${score} Punkte · Gesamt ${gesamtPunkte.toLocaleString("de-DE")}`;
    $("progress").textContent = `Aufgabe ${index + 1} von ${questions.length}`;
    $("status").textContent = "Füße auf eine richtige Plattform!";
    renderHeight = Math.max(H, row.y - camera + 16 + rowHeight(row) + 24);
    renderAnswerControls();
    resizeCanvas();
  }
  
  function start() {
    if (!selected || !["ready", "won", "lost"].includes(mode)) return;
    resetRound();
    const data = selected.data;
    
    let fehlerFuerThema = fehlerSpeicher[selected.id] || [];
    if (data.mischen) {
      let baseFragen = data.fragen.slice();
      let priorisiert = baseFragen.filter(q => fehlerFuerThema.includes(q.frage));
      let normal = baseFragen.filter(q => !fehlerFuerThema.includes(q.frage));
      questions = [...shuffle(priorisiert), ...shuffle(normal)];
    } else {
      questions = data.fragen.slice();
    }

    thinking = Number($("thinking").value); 
    if (![0, 1, 2, 4, 6, 8, 10].includes(thinking)) thinking = 2;
    currentThinking = thinking;
    consecutiveCorrect = 0;
    
    index = 0; score = 0; camera = 0; oldRows = [];
    row = makeRow(ROW_Y); player = { x: W / 2, y: START_Y, vy: -JUMP };
    hold = 0; apexUsed = false; failText = ""; celebration = 0; accumulator = 0;
    mode = "playing"; clearInput(); $("overlay").hidden = true;
    $("pause").disabled = false; $("pause").textContent = "Pause"; setQuestion(); canvas.focus({preventScroll:true});
  }
  
  function pause() {
    if ($("unlock-dialog").open) return;
    if (mode === "playing") {
      mode = "paused"; $("pause").textContent = "Weiter";
      showPanel("Kurze Pause", "Kronk wartet auf dich. Dein Spielstand bleibt erhalten.", "Weiterspielen");
    } else if (mode === "paused") {
      mode = "playing"; $("pause").textContent = "Pause"; $("overlay").hidden = true; accumulator = 0; last = 0; canvas.focus({preventScroll:true});
    }
  }
  
  function closeFeedback() {
    if ($("feedback-dialog").open) $("feedback-dialog").close();
  }

  function showFeedback() {
    const q = row.q;
    const chosen = row.platforms.find(p => p.broken);
    const correct = q.antworten.filter(a => a.richtig);
    $("overlay").hidden = true;
    $("feedback-title").textContent = chosen ? "Schau dir die Lösung an" : "Die Plattform knapp verfehlt";
    $("feedback-intro").textContent = chosen
      ? "Diese Antwort passt noch nicht. Vergleiche sie mit der Lösung und probiere die Aufgabe danach noch einmal."
      : "Das war ein verfehlter Sprung. Nimm dir Zeit für die Lösung und versuche es noch einmal.";
    $("feedback-progress").textContent = index + " von " + questions.length + " Aufgaben geschafft · " + score + " Punkte";
    $("feedback-question").textContent = q.frage;
    $("feedback-chosen-block").hidden = !chosen;
    $("feedback-chosen").textContent = chosen ? chosen.text : "";
    // Rückmeldung auf den eigenen Denkfehler, nicht nur auf die Lösung.
    const warum = chosen && typeof chosen.warum === "string" ? chosen.warum.trim() : "";
    $("feedback-chosen-why").textContent = warum;
    $("feedback-chosen-why").hidden = !warum;
    $("feedback-correct-title").textContent = correct.length === 1 ? "Die richtige Antwort" : "Die richtigen Antworten";
    $("feedback-correct").replaceChildren(...correct.map(a => {
      const item = document.createElement("li");
      item.textContent = a.text;
      return item;
    }));
    $("feedback-explanation-block").hidden = !q.erklaerung || !q.erklaerung.trim();
    $("feedback-explanation").textContent = q.erklaerung || "";
    $("feedback-reflection").textContent = correct.length === 1
      ? "Erkläre dir kurz: Warum passt diese Antwort zur Aufgabe?"
      : "Erkläre dir kurz: Warum passen diese Antworten zur Aufgabe? Für den Sprung genügt eine davon.";
    $("feedback-thinking").value = $("thinking").value;
    $("feedback-settings").open = false;
    $("feedback-dialog").showModal();
    $("feedback-title").focus({preventScroll:true});
    $("feedback-dialog").scrollTop = 0;
  }

  function retryQuestion() {
    if (mode !== "lost" || !row) return;
    const requested = Number($("feedback-thinking").value);
    if ([0, 1, 2, 4, 6, 8, 10].includes(requested)) {
      thinking = requested;
      $("thinking").value = String(thinking);
    }
    closeFeedback();
    row = makeRow(row.y);
    camera = row.y - ROW_Y;
    player = { x: W / 2, y: row.y + GAP, vy: -JUMP };
    hold = 0; apexUsed = false; failText = ""; celebration = 0;
    accumulator = 0; last = 0; facing = 1; particles = [];
    consecutiveCorrect = 0; currentThinking = thinking;
    mode = "playing"; clearInput(); $("overlay").hidden = true;
    $("pause").disabled = false; $("pause").textContent = "Pause";
    setQuestion(); canvas.focus({preventScroll:true});
  }

  $("feedback-retry").addEventListener("click", retryQuestion);
  $("feedback-restart").addEventListener("click", () => {
    $("thinking").value = $("feedback-thinking").value;
    start();
  });
  $("feedback-topics").addEventListener("click", chooseTopic);
  $("feedback-dialog").addEventListener("cancel", e => {
    e.preventDefault(); chooseTopic();
  });

  function finish(won) {
    mode = won ? "won" : "lost";
    $("pause").disabled = true;
    clearInput();
    if (won) {
      showPanel("Ganz oben angekommen!", "Kronk hat alle " + questions.length + " Aufgaben geschafft. " + score + " Punkte!", "Noch einmal spielen", true);
    } else {
      showFeedback();
    }
    $("status").textContent = won ? "Alle Aufgaben geschafft!" : "Lernpause: Lösung ansehen und erneut üben.";
  }

  // Sagt in Worten, worauf Kronk gerade zielt – auch für Vorlesehilfen.
  function aimLabel() {
    if (!row || !player) return "Kronk lässt sich weiter steuern";
    const i = row.platforms.findIndex(p => player.x >= p.x && player.x <= p.x + p.width);
    return i < 0 ? "Noch kein Feld unter Kronk" : `Ziel: Feld ${i + 1} · „${row.platforms[i].text}“`;
  }

  function step(dt) {
    if (mode !== "playing" || $("unlock-dialog").open) return;
    
    // Partikel aktualisieren
    particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 400 * dt;
      p.life -= dt;
    });
    particles = particles.filter(p => p.life > 0);

    const left = keys.has("ArrowLeft") || [...pointers.values()].includes(-1);
    const right = keys.has("ArrowRight") || [...pointers.values()].includes(1);
    const direction = Number(right) - Number(left);
    if (direction) facing = direction;
    player.x = Math.max(28, Math.min(W - 28, player.x + direction * SPEED * dt));
    const previousY = player.y;
    
    if (hold > 0) {
      hold = Math.max(0, hold - dt);
      $("status").textContent = `Denkpause · ${Math.ceil(hold)} s · ${aimLabel()}`;
      if (!hold) $("status").textContent = "Jetzt auf der richtigen Antwort landen!";
    } else {
      player.vy += GRAVITY * dt;
      if (!apexUsed && player.vy >= 0) {
        apexUsed = true;
        if (currentThinking > 0) { hold = currentThinking; player.vy = 0; }
      }
      player.y += player.vy * dt;
    }
    celebration = Math.max(0, celebration - dt);
    
    if (!failText && player.vy > 0 && previousY <= row.y && player.y >= row.y) {
      const hit = row.platforms.find(p => !p.broken && player.x >= p.x && player.x <= p.x + p.width);
      if (hit) {
        if (hit.richtig) {
          consecutiveCorrect++;
          if (consecutiveCorrect >= 3 && currentThinking > 0.5) {
             currentThinking = Math.max(0, currentThinking - 0.5);
          }
          if (fehlerSpeicher[selected.id]) {
             fehlerSpeicher[selected.id] = fehlerSpeicher[selected.id].filter(f => f !== row.q.frage);
          }
          
          score += 100;
          gesamtPunkte += 100;
          pruefeFreischaltungen();
          speichereSpielstand();
          
          // Konfetti / Partikel erzeugen
          for (let i = 0; i < 15; i++) {
            particles.push({
              x: player.x,
              y: row.y,
              vx: (Math.random() - 0.5) * 250,
              vy: Math.random() * -300 - 50,
              color: Math.random() > 0.5 ? "#2ecc71" : "#ff9900",
              size: Math.random() * 6 + 4,
              life: 0.6
            });
          }

          // Grünes Aufleuchten auslösen
          const pf = document.querySelector(".playfield");
          pf.classList.remove("success-flash");
          void pf.offsetWidth;
          pf.classList.add("success-flash");

          $("score").textContent = `${score} Punkte · Gesamt ${gesamtPunkte.toLocaleString("de-DE")}`;
          hit.solved = true;
          player.y = row.y; player.vy = -JUMP; hold = 0; apexUsed = false; celebration = .5;
          oldRows.push(row); oldRows = oldRows.slice(-1); index++;
          if (index === questions.length) { finish(true); return; }
          row = makeRow(row.y - GAP, player.x);
          camera = row.y - ROW_Y; setQuestion();
        } else {
          consecutiveCorrect = 0;
          currentThinking = thinking; 
          
          if (!fehlerSpeicher[selected.id]) fehlerSpeicher[selected.id] = [];
          if (!fehlerSpeicher[selected.id].includes(row.q.frage)) {
              fehlerSpeicher[selected.id].push(row.q.frage);
              speichereSpielstand();
          }

          hit.broken = true; failText = `„${hit.text}“ war hier nicht richtig.`;
          $("status").textContent = "Diese Plattform bricht weg …";
          
          const pf = document.querySelector(".playfield");
          pf.classList.remove("shake");
          void pf.offsetWidth;
          pf.classList.add("shake");
        }
      }
    }
    if (player.y - camera > H + 110) finish(false);
  }
  
  /* ================================================================
     Zeichnen: Höhenwelt, Antwortkarten, Zielhilfe, Denkpause
     ================================================================ */
  const SURFACE = 22;                                  // Höhe der Landefläche mit Ziffer
  const CARD_PAD_TOP = 12, CARD_PAD_BOTTOM = 14;
  const ANSWER_SIZES = [24, 22, 20, 18, 16];
  const answerFont = size => `700 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  const UI_FONT = '750 15px system-ui, -apple-system, "Segoe UI", sans-serif';
  const BLUE = "#293f77", BLUE_DARK = "#172b59", ORANGE = "#ff9900";
  const GREEN = "#2f8f5b", GREEN_SOFT = "#eaf7ef", RED = "#d3392c", RED_SOFT = "#fdeeec";

  // Farbverlauf mit Rückfallfarbe: in Testumgebungen ohne echten Canvas-Kontext
  // liefert createLinearGradient nichts, dann wird einfach die letzte Farbe benutzt.
  function vGradient(y0, y1, stops) {
    try {
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      for (const [pos, color] of stops) g.addColorStop(pos, color);
      return g;
    } catch (_) { return stops[stops.length - 1][1]; }
  }

  function roundPath(x, y, w, h, r) {
    const rad = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  function textLines(text, maxWidth) {
    const lines = []; let line = "";
    for (const word of text.split(/\s+/)) {
      let next = line ? line + " " + word : word;
      if (ctx.measureText(next).width <= maxWidth) { line = next; continue; }
      if (line) lines.push(line);
      line = "";
      // Sehr lange Wörter werden getrennt – mit Bindestrich, damit die
      // Trennstelle als solche zu erkennen ist.
      for (const char of word) {
        if (line && ctx.measureText(line + char + "-").width > maxWidth) { lines.push(line + "-"); line = ""; }
        line += char;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  // Alle Karten einer Reihe teilen sich eine Schriftgröße: die größte,
  // bei der kein Antwortwort mitten im Wort umbrochen werden muss.
  function measureRow(r) {
    if (r.fontSize) return r;
    r.fontSize = ANSWER_SIZES[ANSWER_SIZES.length - 1];
    for (const size of ANSWER_SIZES) {
      ctx.font = answerFont(size);
      const passt = r.platforms.every(p =>
        p.text.split(/\s+/).every(word => ctx.measureText(word).width <= p.width - 26));
      if (passt) { r.fontSize = size; break; }
    }
    r.lineHeight = Math.round(r.fontSize * 1.14);
    return r;
  }
  function cardHeight(r, p) {
    measureRow(r);
    ctx.font = answerFont(r.fontSize);
    const lines = textLines(p.text, p.width - 26).length;
    return SURFACE + CARD_PAD_TOP + lines * r.lineHeight + CARD_PAD_BOTTOM;
  }
  function rowHeight(r) { return Math.max(...r.platforms.map(p => cardHeight(r, p))); }

  /* ---------------- Hintergrund: Himmel, Wolken, Höhenleiste ---------------- */
  const CLOUDS = [
    { x: 96, y: 60, s: 1.00, d: .16 }, { x: 438, y: 150, s: .72, d: .16 },
    { x: 262, y: 292, s: .58, d: .30 }, { x: 508, y: 386, s: .88, d: .30 },
    { x: 58, y: 434, s: .66, d: .44 }, { x: 344, y: -26, s: .82, d: .44 }
  ];
  function cloudShape(x, y, s) {
    ctx.beginPath();
    ctx.arc(x, y, 24 * s, 0, Math.PI * 2);
    ctx.arc(x + 30 * s, y - 13 * s, 31 * s, 0, Math.PI * 2);
    ctx.arc(x + 64 * s, y + 1 * s, 22 * s, 0, Math.PI * 2);
    ctx.fill();
    roundPath(x - 22 * s, y + 2 * s, 108 * s, 22 * s, 11 * s);
    ctx.fill();
  }
  function drawSky(height) {
    const climb = questions.length ? Math.min(1, index / questions.length) : 0;
    // Je höher Kronk kommt, desto tiefer und klarer wird der Himmel oben.
    const top = climb < .34 ? "#dfeaf9" : climb < .67 ? "#cfe0f7" : "#bed4f4";
    ctx.fillStyle = vGradient(0, height, [[0, top], [.5, "#e9f1fc"], [1, "#fbfcff"]]);
    ctx.fillRect(0, 0, W, height);

    const span = height + 260;
    ctx.fillStyle = "rgba(255,255,255,.62)";
    for (const c of CLOUDS) {
      const y = ((c.y - camera * c.d) % span + span) % span - 130;
      cloudShape(c.x, y, c.s);
    }
    drawRail(height);
  }

  // Höhenleiste am rechten Rand: Wie weit ist die Route geschafft?
  function drawRail(height) {
    if (!questions.length) return;
    const x = W - 18, top = 54, bottom = height - 54, h = bottom - top;
    if (h <= 20) return;
    ctx.fillStyle = "rgba(41,63,119,.10)";
    roundPath(x, top, 9, h, 5); ctx.fill();
    const done = Math.min(index, questions.length) / questions.length;
    if (done > 0) {
      ctx.fillStyle = ORANGE;
      roundPath(x, bottom - h * done, 9, h * done, 5); ctx.fill();
    }
    // Sprossen: eine je Aufgabe, gefüllt sobald geschafft
    const steps = Math.min(questions.length, 24);
    for (let i = 0; i < steps; i++) {
      const cy = bottom - (h * (i + .5)) / steps;
      ctx.fillStyle = i < index * steps / questions.length ? "#ffffff" : "rgba(41,63,119,.22)";
      ctx.beginPath(); ctx.arc(x + 4.5, cy, 2.4, 0, Math.PI * 2); ctx.fill();
    }
    // Ziel-Fähnchen ganz oben
    ctx.fillStyle = BLUE;
    ctx.beginPath(); ctx.moveTo(x + 4, top - 6); ctx.lineTo(x + 4, top - 26);
    ctx.lineTo(x + 22, top - 20); ctx.lineTo(x + 4, top - 14); ctx.fill();
    ctx.fillRect(x + 2.5, top - 26, 3, 22);
  }

  /* ---------------- Antwortkarten ---------------- */
  function drawPlatform(r, p, i, y) {
    const h = cardHeight(r, p);
    const fill = p.broken ? RED_SOFT : p.solved ? GREEN_SOFT : "#ffffff";
    const edge = p.broken ? RED : p.solved ? GREEN : "#c6d4ea";
    const bar = p.broken ? RED : p.solved ? GREEN : BLUE;

    ctx.save();
    if (p.broken) { ctx.translate(p.x + p.width / 2, y + h / 2); ctx.rotate(.05); ctx.translate(-(p.x + p.width / 2), -(y + h / 2)); }

    ctx.fillStyle = "rgba(23,43,89,.13)";
    roundPath(p.x + 1, y + 7, p.width, h, 15); ctx.fill();
    ctx.fillStyle = fill; roundPath(p.x, y, p.width, h, 15); ctx.fill();

    // Landefläche mit Ziffer – dieselbe Ziffer wie auf der Tastatur
    ctx.save(); roundPath(p.x, y, p.width, h, 15); ctx.clip();
    ctx.fillStyle = bar; ctx.fillRect(p.x, y, p.width, SURFACE);
    ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.fillRect(p.x, y, p.width, 3);
    ctx.restore();

    ctx.lineWidth = 2.5; ctx.strokeStyle = edge;
    roundPath(p.x, y, p.width, h, 15); ctx.stroke();

    ctx.fillStyle = "#ffffff"; ctx.font = '800 14px system-ui, sans-serif';
    ctx.textAlign = "left"; ctx.fillText(String(i + 1), p.x + 12, y + 16);
    if (p.solved || p.broken) {
      ctx.textAlign = "right";
      ctx.fillText(p.solved ? "RICHTIG" : "FALSCH", p.x + p.width - 12, y + 16);
    }

    ctx.font = answerFont(r.fontSize); ctx.textAlign = "center";
    ctx.fillStyle = p.broken ? "#8d2a20" : p.solved ? "#1d6340" : BLUE;
    const baseline = y + SURFACE + CARD_PAD_TOP + Math.round(r.fontSize * 0.82);
    textLines(p.text, p.width - 26).forEach((s, n) =>
      ctx.fillText(s, p.x + p.width / 2, baseline + n * r.lineHeight));
    ctx.restore();

    // Bruchstücke der weggebrochenen Plattform
    if (p.broken) {
      ctx.save(); ctx.fillStyle = RED; ctx.globalAlpha = .8;
      ctx.translate(p.x + p.width / 2, y + h + 14); ctx.rotate(.24);
      ctx.fillRect(-p.width / 2, 0, p.width * .4, 9);
      ctx.rotate(-.5); ctx.fillRect(6, 0, p.width * .4, 9);
      ctx.restore();
    }
  }

  // Geschaffte Reihen bleiben als schmaler Routenbalken sichtbar –
  // in derselben orangen Farbe wie die Höhenleiste, damit er nicht mit
  // einer Antwortmarkierung der aktuellen Aufgabe verwechselt wird.
  function drawTrail(r) {
    const y = r.y - camera;
    if (y < -60 || y > H + 120) return;
    ctx.save(); ctx.globalAlpha = .45; ctx.fillStyle = ORANGE;
    for (const p of r.platforms) {
      if (!p.richtig) continue;
      roundPath(p.x + 6, y, p.width - 12, 8, 4); ctx.fill();
    }
    ctx.restore();
  }

  function drawRow(r, old = false) {
    if (old) { drawTrail(r); return; }
    const y = r.y - camera;
    if (y < -260 || y > H + 160) return;
    measureRow(r);
    r.platforms.forEach((p, i) => drawPlatform(r, p, i, y));
  }

  /* ---------------- Zielhilfe, Schatten, Denkpause ---------------- */
  function targetPlatform() {
    return row && row.platforms.find(p => player.x >= p.x && player.x <= p.x + p.width) || null;
  }

  function drawAim() {
    if (mode !== "playing" || !row || !player || failText) return;
    const rowY = row.y - camera, py = player.y - camera;
    if (py > rowY - 4) return;
    const target = targetPlatform();
    if (!target) return;
    // Landeschatten auf der Zielfläche – zeigt die Entfernung an
    const near = Math.max(.18, Math.min(1, 1 - (rowY - py) / 380));
    ctx.save(); ctx.globalAlpha = .22 + near * .25; ctx.fillStyle = BLUE_DARK;
    ctx.beginPath(); ctx.ellipse(player.x, rowY + SURFACE / 2, 16 + near * 14, 4 + near * 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.save(); ctx.lineWidth = 4; ctx.strokeStyle = ORANGE;
    roundPath(target.x - 4, rowY - 4, target.width + 8, cardHeight(row, target) + 8, 18); ctx.stroke();
    ctx.restore();
  }

  // Denkpause: nur die verbleibenden Sekunden über Kronk, ohne Ring.
  function drawHold() {
    if (!(hold > 0) || !player) return;
    const cx = player.x, chipY = player.y - camera + 10;
    ctx.save();
    ctx.fillStyle = BLUE; roundPath(cx - 21, chipY, 42, 30, 15); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.font = '800 19px system-ui, sans-serif'; ctx.textAlign = "center";
    ctx.fillText(String(Math.ceil(hold)), cx, chipY + 21);
    ctx.restore();
  }

  // Serie: sichtbare Belohnung für mehrere richtige Antworten hintereinander
  function drawStreak() {
    if (mode !== "playing" || consecutiveCorrect < 2) return;
    const text = `Serie × ${consecutiveCorrect}`;
    ctx.save(); ctx.font = UI_FONT;
    const w = ctx.measureText(text).width + 28;
    ctx.fillStyle = ORANGE; roundPath(16, 16, w, 32, 16); ctx.fill();
    ctx.fillStyle = BLUE; ctx.textAlign = "center"; ctx.fillText(text, 16 + w / 2, 37);
    ctx.restore();
  }

  function draw() {
    if (canvasDpr !== (window.devicePixelRatio || 1)) resizeCanvas();
    const height = renderHeight;
    ctx.clearRect(0, 0, W, height);
    drawSky(height);
    if (!player) return;

    oldRows.forEach(r => drawRow(r, true));
    drawAim();
    drawRow(row);

    particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / 0.6);
      roundPath(p.x, p.y - camera, p.size, p.size, p.size / 3); ctx.fill();
    });
    ctx.globalAlpha = 1;

    const img = celebration > 0 || mode === "won" ? images.jubel : player.vy < 0 ? images.sprung : images.normal;
    if (img) {
      const h = 95, w = h * img.naturalWidth / img.naturalHeight;
      ctx.save(); ctx.translate(player.x, player.y - camera); ctx.scale(facing, 1);
      ctx.drawImage(img, -w / 2, -h, w, h); ctx.restore();
      // Fußmarker: zeigt genau die Stelle, die zählt
      ctx.fillStyle = RED;
      roundPath(player.x - 11, player.y - camera - 4, 22, 5, 2.5); ctx.fill();
    }
    drawHold();
    drawStreak();
  }

  function frame(time) {
    const dt = Math.min((time - last) / 1000 || 0, .05); last = time;
    if (mode === "playing" && !$("unlock-dialog").open) { accumulator += dt; while (accumulator >= 1 / 120) { step(1 / 120); accumulator -= 1 / 120; } } else accumulator = 0;
    showNextUnlock(); draw(); requestAnimationFrame(frame);
  }
  
  for (const [id, direction] of [["left", -1], ["right", 1]]) {
    const button = $(id);
    button.addEventListener("pointerdown", e => { e.preventDefault(); if (mode !== "playing") return; button.setPointerCapture(e.pointerId); pointers.set(e.pointerId, direction); button.classList.add("held"); });
    const release = e => { pointers.delete(e.pointerId); if (![...pointers.values()].includes(direction)) button.classList.remove("held"); };
    button.addEventListener("pointerup", release); button.addEventListener("pointercancel", release); button.addEventListener("lostpointercapture", release);
    button.addEventListener("contextmenu", e => e.preventDefault());
  }
  
  // Auf dem Spielfeld selbst steuern: linke oder rechte Hälfte gedrückt halten.
  {
    const field = document.querySelector(".playfield");
    const markHeld = () => {
      const dirs = [...pointers.values()];
      $("left").classList.toggle("held", dirs.includes(-1));
      $("right").classList.toggle("held", dirs.includes(1));
    };
    field.addEventListener("pointerdown", e => {
      if (mode !== "playing") return;
      e.preventDefault();
      const bounds = field.getBoundingClientRect();
      const direction = e.clientX - bounds.left < bounds.width / 2 ? -1 : 1;
      try { field.setPointerCapture(e.pointerId); } catch (_) {}
      pointers.set(e.pointerId, direction); markHeld();
    });
    const release = e => { pointers.delete(e.pointerId); markHeld(); };
    field.addEventListener("pointerup", release);
    field.addEventListener("pointercancel", release);
    field.addEventListener("lostpointercapture", release);
    field.addEventListener("contextmenu", e => e.preventDefault());
  }

  window.addEventListener("keydown", e => {
    if ($("unlock-dialog").open || $("feedback-dialog").open || e.target.tagName === "SELECT") return;
    if (["ArrowLeft", "ArrowRight"].includes(e.key)) { e.preventDefault(); if (mode === "playing") keys.add(e.key); }
    if (e.key.toLowerCase() === "p" && !e.repeat) pause();
    
    if (["1", "2", "3", "4"].includes(e.key)) aimAt(Number(e.key) - 1);
  });
  
  window.addEventListener("keyup", e => keys.delete(e.key));
  window.addEventListener("blur", () => { clearInput(); if (mode === "playing") pause(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && mode === "playing") pause(); });
  
  $("kronk-select").addEventListener("change", async (e) => {
    aktiverKronk = e.target.value;
    speichereSpielstand();
    await Promise.all(["normal", "jubel", "sprung"].map(name => new Promise((resolve) => {
      const img = new Image(); 
      img.onload = () => { images[name] = img; resolve(); };
      img.src = `assets/${aktiverKronk}-${name}.png`;
    })));
  });

  $("subject").addEventListener("change", updateGrades);
  $("grade").addEventListener("change", updateTopics);
  $("topic").addEventListener("change", updateSelected);
  $("choose-topic").addEventListener("click", chooseTopic);
  $("pause").addEventListener("click", pause);
  $("start").addEventListener("click", () => mode === "paused" ? pause() : start());

  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(entries => {
      const height = entries[0].target.getBoundingClientRect().height + 12;
      document.querySelector(".stage").style.setProperty("--question-height", `${height}px`);
    }).observe(document.querySelector(".question"));
    new ResizeObserver(resizeCanvas).observe(document.querySelector(".playfield"));
  }
  window.addEventListener("resize", resizeCanvas);

  async function init() {
    try {
      await loadCollections();
      $("start").disabled = true;
      ladeSpielstand();
      aktualisiereKronkMenue();
      await Promise.all(["normal", "jubel", "sprung"].map(name => new Promise((resolve, reject) => {
        const img = new Image(); img.onload = () => { images[name] = img; resolve(); };
        img.onerror = () => reject(Error(`Kronk-Bild fehlt: assets/${aktiverKronk}-${name}.png`)); 
        img.src = `assets/${aktiverKronk}-${name}.png`;
      })));
      chooseTopic();
    } catch (e) { mode = "error"; showPanel("Dateien prüfen", e.message, "Bitte Dateien korrigieren"); $("start").disabled = true; }
    resizeCanvas(); requestAnimationFrame(frame);
  }
  // Offline-Betrieb; beim direkten Öffnen der Datei (file://) nicht möglich.
  if (typeof navigator !== "undefined" && navigator.serviceWorker &&
      typeof location !== "undefined" && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }

  init();
})();
