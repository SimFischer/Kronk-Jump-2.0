/* Kronk springt! Kein Framework, kein Server, keine externen Dienste. */
"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $("canvas"), ctx = canvas.getContext("2d");
  const W = 600, H = 540, GRAVITY = 600, JUMP = 700, SPEED = 480;
  const ROW_Y = 410, START_Y = 515, GAP = START_Y - ROW_Y;
  let canvasDpr = 0, renderHeight = H;
  
  function resizeCanvas() {
    const bounds = document.querySelector(".playfield").getBoundingClientRect();
    const displayWidth = Math.min(bounds.width, bounds.height * W / renderHeight);
    if (displayWidth <= 0) return;
    canvasDpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(displayWidth * canvasDpr));
    const height = Math.max(1, Math.round(displayWidth * renderHeight / W * canvasDpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width; canvas.height = height;
    }
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / renderHeight, 0, 0);
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
    renderHeight = H;
    questions = []; index = 0; score = 0; camera = 0; oldRows = []; row = null; player = null;
    hold = 0; apexUsed = false; failText = ""; celebration = 0; accumulator = 0; last = 0; facing = 1;
    particles = [];
    clearInput(); $("score").textContent = `0 Punkte (Gesamt: ${gesamtPunkte})`;
    $("pause").disabled = true; $("pause").textContent = "Pause";
  }
  function chooseTopic() {
    resetRound(); mode = "ready";
    showPanel("Hoch hinaus mit Kronk!", "Kronk springt von allein. Halte links oder rechts gedrückt und lande mit seinen Füßen auf der richtigen Antwort. Falsche Plattformen brechen weg!", "Los geht’s!", true);
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
      if (q.erklaerung !== undefined && typeof q.erklaerung !== "string") throw Error(`Frage ${i + 1}: erklaerung muss Text sein.`);
    });
  }
  
  function makeRow(y) {
    const q = questions[index];
    const answers = shuffle(q.antworten);
    const gap = 10, margin = 12, width = (W - margin * 2 - gap * (answers.length - 1)) / answers.length;
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
  
  function setQuestion() {
    $("question").textContent = row.q.frage;
    $("score").textContent = `${score} Punkte (Gesamt: ${gesamtPunkte})`;
    $("progress").textContent = `Aufgabe ${index + 1} von ${questions.length}`;
    $("status").textContent = "Füße auf eine richtige Plattform!";
    ctx.font = "600 22px system-ui";
    const answerHeight = Math.max(...row.platforms.map(p => Math.max(52, textLines(p.text, p.width - 16).length * 26 + 18)));
    renderHeight = Math.max(H, row.y - camera + 16 + answerHeight + 20);
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
  
  function finish(won) {
    mode = won ? "won" : "lost"; $("pause").disabled = true;
    showPanel(won ? "Ganz oben angekommen!" : "Noch ein Sprung?", won ? `Kronk hat alle ${questions.length} Aufgaben geschafft. ${score} Punkte!` : `${score} Punkte. ${failText || "Du hast die Plattform verfehlt."} Richtig: ${row.q.antworten.filter(a => a.richtig).map(a => a.text).join(", ")} ${row.q.erklaerung || ""}`, "Noch einmal spielen", true);
    $("status").textContent = won ? "Alle Aufgaben geschafft!" : "Lies die Lösung und versuche es noch einmal.";
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
      $("status").textContent = `Denkpause · ${Math.ceil(hold)} s · Kronk lässt sich weiter steuern`;
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

          $("score").textContent = `${score} Punkte (Gesamt: ${gesamtPunkte})`;
          player.y = row.y; player.vy = -JUMP; hold = 0; apexUsed = false; celebration = .5;
          oldRows.push(row); oldRows = oldRows.slice(-1); index++;
          if (index === questions.length) { finish(true); return; }
          row = makeRow(row.y - GAP);
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
  
  function textLines(text, maxWidth) {
    const lines = []; let line = "";
    for (const word of text.split(/\s+/)) {
      let next = line ? line + " " + word : word;
      if (ctx.measureText(next).width <= maxWidth) { line = next; continue; }
      if (line) lines.push(line);
      line = "";
      for (const char of word) {
        if (ctx.measureText(line + char).width > maxWidth && line) { lines.push(line); line = ""; }
        line += char;
      }
    }
    if (line) lines.push(line);
    return lines;
  }
  function wrapped(text, x, y, maxWidth) {
    const lines = textLines(text, maxWidth);
    const height = Math.max(52, lines.length * 26 + 18);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(x - maxWidth / 2 - 8, y, maxWidth + 16, height);
    ctx.fillStyle = "#293f77";
    lines.forEach((s, i) => ctx.fillText(s, x, y + 32 + i * 26));
  }
  
  function drawRow(r, old = false) {
    const y = r.y - camera;
    if (y < -200 || y > H + 100) return;
    ctx.globalAlpha = old ? .22 : 1;
    for (const p of r.platforms) {
      ctx.fillStyle = p.broken ? "#e94232" : "#293f77";
      if (p.broken) {
        ctx.save(); ctx.translate(p.x + p.width / 2, y + 15); ctx.rotate(.2); ctx.fillRect(-p.width / 2, 0, p.width * .45, 10); ctx.rotate(-.4); ctx.fillRect(0, 0, p.width * .45, 10); ctx.restore();
      } else { ctx.fillRect(p.x, y, p.width, 14); }
      ctx.textAlign = "center"; ctx.font = "600 22px system-ui";
      if (!old) wrapped(p.text, p.x + p.width / 2, y + 16, p.width - 16);
    }
    ctx.globalAlpha = 1;
  }
  
  function draw() {
    if (canvasDpr !== (window.devicePixelRatio || 1)) resizeCanvas();
    const height = renderHeight;
    ctx.clearRect(0, 0, W, height);
    ctx.fillStyle = "#f0f4fa"; ctx.fillRect(0, 0, W, height);
    ctx.strokeStyle = "#dce4f0"; ctx.lineWidth = 1;
    for (let y = ((-camera * .3) % 60) - 60; y < height; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    if (!player) return;
    oldRows.forEach(r => drawRow(r, true)); drawRow(row);
    
    // Partikel zeichnen
    particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / 0.6);
      ctx.fillRect(p.x, p.y - camera, p.size, p.size);
    });
    ctx.globalAlpha = 1;

    const img = celebration > 0 || mode === "won" ? images.jubel : player.vy < 0 ? images.sprung : images.normal;
    if (img) {
      const height = 95, width = height * img.naturalWidth / img.naturalHeight;
      ctx.save(); ctx.translate(player.x, player.y - camera); ctx.scale(facing, 1);
      ctx.drawImage(img, -width / 2, -height, width, height); ctx.restore();
      ctx.fillStyle = "#e94232"; ctx.fillRect(player.x - 7, player.y - camera - 3, 14, 3);
    }
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
  
  window.addEventListener("keydown", e => {
    if ($("unlock-dialog").open || e.target.tagName === "SELECT") return;
    if (["ArrowLeft", "ArrowRight"].includes(e.key)) { e.preventDefault(); if (mode === "playing") keys.add(e.key); }
    if (e.key.toLowerCase() === "p" && !e.repeat) pause();
    
    if (["1", "2", "3", "4"].includes(e.key) && mode === "playing" && row) {
      const idx = parseInt(e.key) - 1;
      if (idx < row.platforms.length) {
        player.x = row.platforms[idx].x + row.platforms[idx].width / 2;
      }
    }
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
  init();
})();
