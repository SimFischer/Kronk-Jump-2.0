/* Kronk springt! Kein Framework, kein Server, keine externen Dienste. */
"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $("canvas"), ctx = canvas.getContext("2d");
  const W = 600, H = 540, GAP = 165, GRAVITY = 600, JUMP = 620, SPEED = 400;
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
  function collectionTitle(c) {
    return `${c.fach} · Klasse ${c.klasse} · ${c.thema}${c.beispiel ? " (Beispiel)" : ""}`;
  }
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
    const grades = [...new Set(collections.filter(c => c.fach === $("subject").value).map(c => String(c.klasse)))].sort((a,b) => Number(a)-Number(b));
    fillSelect("grade", grades.map(g => [g, `Klasse ${g}`]));
    updateTopics();
  }
  function updateSelected() {
    selected = collections.find(c => c.id === $("topic").value) || null;
    $("start").disabled = !selected || mode === "loading";
    $("set-title").textContent = selected ? collectionTitle(selected) : "Keine Sammlung verfügbar";
    $("collection-info").textContent = selected ? `${selected.data.fragen.length} Aufgaben${selected.beispiel ? " · Kleine Beispielsammlung zum Ausprobieren" : ""}` : "";
  }
  function resetRound() {
    questions = []; index = 0; score = 0; camera = 0; oldRows = []; row = null; player = null;
    hold = 0; apexUsed = false; failText = ""; celebration = 0; accumulator = 0; last = 0; facing = 1;
    clearInput(); $("score").textContent = "0 Punkte";
    $("pause").disabled = true; $("pause").textContent = "Pause";
  }
  function chooseTopic() {
    resetRound(); mode = "ready";
    showPanel("Hoch hinaus mit Kronk!", "Kronk springt von allein. Halte links oder rechts gedrückt und lande mit seinen Füßen auf einer richtigen Antwort. Falsche Plattformen brechen weg!", "Los geht’s!", true);
    $("selection").hidden = false; $("choose-topic").hidden = true;
    $("question").textContent = "Bereit für den nächsten Sprung?";
    $("progress").textContent = "Mit Kronk nach oben";
    $("status").textContent = "Wähle ein Thema und starte das Spiel.";
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
            !Number.isInteger(entry.klasse) || entry.klasse < 1 || !/^aufgaben\/[a-z0-9-]+\.js$/.test(entry.datei) ||
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
    const gap = 14, margin = 20, width = (W - margin * 2 - gap * (answers.length - 1)) / answers.length;
    return { y, q, platforms: answers.map((a, i) => ({...a, x: margin + i * (width + gap), width, broken: false})) };
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
    $("score").textContent = `${score} Punkte`;
    $("progress").textContent = `Aufgabe ${index + 1} von ${questions.length}`;
    $("status").textContent = "Füße auf eine richtige Plattform!";
  }
  function start() {
    if (!selected || !["ready", "won", "lost"].includes(mode)) return;
    resetRound();
    const data = selected.data;
    questions = data.mischen ? shuffle(data.fragen) : data.fragen.slice();
    thinking = Number($("thinking").value); index = 0; score = 0; camera = 0; oldRows = [];
    if (![0, 1, 2, 4, 6, 8, 10].includes(thinking)) thinking = 2;
    row = makeRow(300); player = { x: W / 2, y: 300 + GAP, vy: -JUMP };
    hold = 0; apexUsed = false; failText = ""; celebration = 0; accumulator = 0;
    mode = "playing"; clearInput(); $("overlay").hidden = true;
    $("pause").disabled = false; $("pause").textContent = "Pause"; setQuestion(); canvas.focus({preventScroll:true});
  }
  function pause() {
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
    if (mode !== "playing") return;
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
        // Bei 0 Sekunden die natürliche Fallgeschwindigkeit unverändert lassen.
        if (thinking > 0) { hold = thinking; player.vy = 0; }
      }
      player.y += player.vy * dt;
    }
    celebration = Math.max(0, celebration - dt);
    if (!failText && player.vy > 0 && previousY <= row.y && player.y >= row.y) {
      // Nur die schmale Fußposition zählt, nicht Kronks langer Schnabel.
      const hit = row.platforms.find(p => !p.broken && player.x >= p.x && player.x <= p.x + p.width);
      if (hit) {
        if (hit.richtig) {
          score += 100; $("score").textContent = `${score} Punkte`;
          player.y = row.y; player.vy = -JUMP; hold = 0; apexUsed = false; celebration = .5;
          oldRows.push(row); oldRows = oldRows.slice(-1); index++;
          if (index === questions.length) { finish(true); return; }
          row = makeRow(row.y - GAP);
          // Kamera nur mit der Aufgabe wechseln: Die aktive Reihe bleibt auf Höhe 300.
          camera = row.y - 300; setQuestion();
        } else {
          hit.broken = true; failText = `„${hit.text}“ war hier nicht richtig.`;
          $("status").textContent = "Diese Plattform bricht weg …";
        }
      }
    }
    if (player.y - camera > H + 110) finish(false);
  }
  function textLines(text, maxWidth) {
    // Zeichenweises Umbrechen funktioniert auch bei langen deutschen Wörtern.
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
    // Plattformetikett wächst nach unten; Text wird weder gekürzt noch überlagert.
    const height = Math.max(46, lines.length * 23 + 16);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(x - maxWidth / 2 - 8, y, maxWidth + 16, height);
    ctx.fillStyle = "#102743";
    lines.forEach((s, i) => ctx.fillText(s, x, y + 29 + i * 23));
  }
  function drawRow(r, old = false) {
    const y = r.y - camera;
    if (y < -200 || y > H + 100) return;
    ctx.globalAlpha = old ? .22 : 1;
    for (const p of r.platforms) {
      ctx.fillStyle = p.broken ? "#e94232" : "#102743";
      if (p.broken) {
        ctx.save(); ctx.translate(p.x + p.width / 2, y + 15); ctx.rotate(.2); ctx.fillRect(-p.width / 2, 0, p.width * .45, 10); ctx.rotate(-.4); ctx.fillRect(0, 0, p.width * .45, 10); ctx.restore();
      } else { ctx.fillRect(p.x, y, p.width, 10); }
      ctx.textAlign = "center"; ctx.font = "600 20px system-ui";
      if (!old) wrapped(p.text, p.x + p.width / 2, y + 12, p.width - 16);
    }
    ctx.globalAlpha = 1;
  }
  function nearbyQuestion() {
    if (!row || !player) return null;
    if (row.nearby) return row.nearby;
    ctx.font = "600 20px system-ui";
    const answerHeight = Math.max(...row.platforms.map(p =>
      Math.max(46, textLines(p.text, p.width - 16).length * 23 + 16)));
    ctx.font = "700 24px system-ui";
    const lines = textLines(row.q.frage, W - 72);
    return row.nearby = { lines, y: row.y - camera + 12 + answerHeight + 14,
      height: lines.length * 30 + 24 };
  }
  function drawNearbyQuestion(question) {
    if (!question) return;
    const { lines, y, height } = question;
    ctx.fillStyle = "#fff5ce";
    ctx.fillRect(20, y, W - 40, height);
    ctx.strokeStyle = "#102743"; ctx.lineWidth = 2;
    ctx.strokeRect(20, y, W - 40, height);
    ctx.fillStyle = "#102743"; ctx.textAlign = "center";
    ctx.font = "700 24px system-ui";
    lines.forEach((line, i) => ctx.fillText(line, W / 2, y + 33 + i * 30));
  }
  function draw() {
    // Dieselbe Frage wie oben, direkt unter der längsten Antwort.
    const nearby = nearbyQuestion();
    const height = nearby ? Math.max(H, Math.ceil(nearby.y + nearby.height + 20)) : H;
    if (canvas.height !== height) canvas.height = height;
    ctx.clearRect(0, 0, W, height);
    ctx.fillStyle = "#d8f0fb"; ctx.fillRect(0, 0, W, height);
    ctx.strokeStyle = "#bddfeF"; ctx.lineWidth = 1;
    for (let y = ((-camera * .3) % 60) - 60; y < height; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    if (!player) return;
    oldRows.forEach(r => drawRow(r, true)); drawRow(row);
    const img = celebration > 0 || mode === "won" ? images.jubel : player.vy < 0 ? images.sprung : images.normal;
    if (img) {
      const height = 95, width = height * img.naturalWidth / img.naturalHeight;
      ctx.save(); ctx.translate(player.x, player.y - camera); ctx.scale(facing, 1);
      ctx.drawImage(img, -width / 2, -height, width, height); ctx.restore();
      // Kleiner Fußmarker macht die Landeposition eindeutig.
      ctx.fillStyle = "#e94232"; ctx.fillRect(player.x - 7, player.y - camera - 3, 14, 3);
    }
    drawNearbyQuestion(nearby);
  }
  function frame(time) {
    const dt = Math.min((time - last) / 1000 || 0, .05); last = time;
    if (mode === "playing") { accumulator += dt; while (accumulator >= 1 / 120) { step(1 / 120); accumulator -= 1 / 120; } } else accumulator = 0;
    draw(); requestAnimationFrame(frame);
  }
  for (const [id, direction] of [["left", -1], ["right", 1]]) {
    const button = $(id);
    button.addEventListener("pointerdown", e => { e.preventDefault(); if (mode !== "playing") return; button.setPointerCapture(e.pointerId); pointers.set(e.pointerId, direction); button.classList.add("held"); });
    const release = e => { pointers.delete(e.pointerId); if (![...pointers.values()].includes(direction)) button.classList.remove("held"); };
    button.addEventListener("pointerup", release); button.addEventListener("pointercancel", release); button.addEventListener("lostpointercapture", release);
    button.addEventListener("contextmenu", e => e.preventDefault());
  }
  window.addEventListener("keydown", e => {
    if (e.target.tagName === "SELECT") return;
    if (["ArrowLeft", "ArrowRight"].includes(e.key)) { e.preventDefault(); if (mode === "playing") keys.add(e.key); }
    if (e.key.toLowerCase() === "p" && !e.repeat) pause();
  });
  window.addEventListener("keyup", e => keys.delete(e.key));
  window.addEventListener("blur", () => { clearInput(); if (mode === "playing") pause(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && mode === "playing") pause(); });
  $("subject").addEventListener("change", updateGrades);
  $("grade").addEventListener("change", updateTopics);
  $("topic").addEventListener("change", updateSelected);
  $("choose-topic").addEventListener("click", chooseTopic);
  $("pause").addEventListener("click", pause);
  $("start").addEventListener("click", () => mode === "paused" ? pause() : start());
  // Reserve genug Platz für beliebig mehrzeilige Fragen, auch nach einer Drehung.
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(entries => {
      const height = entries[0].target.getBoundingClientRect().height + 12;
      document.querySelector(".stage").style.setProperty("--question-height", `${height}px`);
    }).observe(document.querySelector(".question"));
  }
  async function init() {
    try {
      await loadCollections();
      $("start").disabled = true;
      await Promise.all(["normal", "jubel", "sprung"].map(name => new Promise((resolve, reject) => {
        const img = new Image(); img.onload = () => { images[name] = img; resolve(); };
        img.onerror = () => reject(Error(`Kronk-Bild fehlt: assets/kronk-${name}.png`)); img.src = `assets/kronk-${name}.png`;
      })));
      chooseTopic();
    } catch (e) { mode = "error"; showPanel("Dateien prüfen", e.message, "Bitte Dateien korrigieren"); $("start").disabled = true; }
    requestAnimationFrame(frame);
  }
  init();
})();
