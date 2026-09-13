// Kleine Beispielsammlung. Diese Datei kann als Vorlage kopiert werden.
// Sie zeigt auch, wie "warum" bei einer falschen Antwort den eigenen
// Denkfehler erklärt. Das Feld ist optional.
window.KRONK_SAMMLUNGEN["deutsch-6-zeitformen"] = {
  mischen: true,
  fragen: [
    { frage: "Welcher Satz steht im Präteritum?", antworten: [
      { text: "Ich spielte.", richtig: true },
      { text: "Ich spiele.", richtig: false, warum: "Das ist das Präsens: Es passiert gerade jetzt." },
      { text: "Ich werde spielen.", richtig: false, warum: "Das ist das Futur I: Es passiert erst in der Zukunft." }
    ], erklaerung: "Ich spielte steht im Präteritum, einer Zeitform der Vergangenheit." },
    { frage: "Welcher Satz steht im Perfekt?", antworten: [
      { text: "Wir haben gelacht.", richtig: true },
      { text: "Wir lachten.", richtig: false, warum: "Das ist das Präteritum. Es kommt ohne haben oder sein aus – genau daran erkennst du den Unterschied zum Perfekt." }
    ], erklaerung: "Das Perfekt wird mit haben oder sein und dem Partizip II gebildet: haben gelacht." },
    { frage: "Welche Sätze stehen im Präsens? Lande auf einer der richtigen Antworten.", antworten: [
      { text: "Du liest.", richtig: true },
      { text: "Wir lernen.", richtig: true },
      { text: "Sie hat gelesen.", richtig: false, warum: "Das ist das Perfekt: hat plus Partizip II (gelesen)." },
      { text: "Er lernte.", richtig: false, warum: "Das ist das Präteritum. Die Endung -te zeigt die Vergangenheit an." }
    ], erklaerung: "Du liest und Wir lernen stehen im Präsens. Sie hat gelesen steht im Perfekt; Er lernte im Präteritum." }
  ]
};
