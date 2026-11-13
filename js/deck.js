/* Presentation mode for the lecture notes.

   Slides live in <template id="slides">. Elements with class "step" are revealed one at a time.
   An interactive slide has a <div class="slot" data-fig="selector">: when the slide is shown,
   the live figure from the notes is moved into the slot (keeping its state), and every
   figure goes back to its place in the notes when you return to reading mode. */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const tpl = $("#slides"), deck = $("#deck");
  if (!tpl || !deck) return;
  const stage = $(".deck-stage", deck), contents = $(".deck-contents", deck);
  const PARTS = { 1: "What is a moduli space?", 2: "Graphs, rigorously", 3: "The moduli space of graphs", 4: "Examples", 5: "Why geometers care" };
  let slides = [], cur = 0, built = false;
  const homes = new Map(); // figure -> comment marking its place in the notes

  function build() {
    stage.insertBefore(tpl.content.cloneNode(true), contents);
    slides = [...stage.querySelectorAll(".slide")];
    slides.forEach((s, i) => {
      const p = +s.dataset.part || 0;
      if (p) s.insertAdjacentHTML("afterbegin", `<div class="slide-part eyebrow">Part ${p} · ${PARTS[p]}</div>`);
      s.setAttribute("role", "group");
      s.setAttribute("aria-roledescription", "slide");
      s.setAttribute("aria-label", `${i + 1} of ${slides.length}: ${s.dataset.title}`);
    });
    let h = "";
    [0, 1, 2, 3, 4, 5].forEach((p) => {
      const idx = slides.map((_, i) => i).filter((i) => (+slides[i].dataset.part || 0) === p);
      if (!idx.length) return;
      h += `<div class="toc-part"><div class="eyebrow">${p ? "Part " + p : "Start"}</div><h3>${p ? PARTS[p] : "Title"}</h3><ol>${idx.map((i) =>
        `<li><button type="button" data-go="${i}"><span>${i + 1}</span><span class="t">${slides[i].dataset.title}${slides[i].classList.contains("interactive") ? ' <i class="tag-i">interactive</i>' : ""}</span></button></li>`).join("")}</ol></div>`;
    });
    $(".deck-contents-grid", deck).innerHTML = h;
    $(".deck-parts", deck).innerHTML = [1, 2, 3, 4, 5].map((p) => `<button type="button" data-part="${p}" title="Part ${p}: ${PARTS[p]}">${p}</button>`).join("");
    built = true;
  }

  const steps = (s) => [...s.querySelectorAll(".step")];
  const hiddenSteps = (s) => steps(s).filter((x) => !x.classList.contains("on"));

  /* move the slide's figures in from the notes */
  function place(s) {
    s.querySelectorAll(".slot").forEach((slot) => {
      const fig = document.querySelector(slot.dataset.fig);
      if (!fig || slot.contains(fig)) return;
      if (!homes.has(fig)) {
        const mark = document.createComment(" figure home ");
        fig.parentNode.insertBefore(mark, fig);
        homes.set(fig, mark);
      }
      slot.appendChild(fig);
    });
  }
  function giveBack() { homes.forEach((mark, fig) => mark.parentNode.insertBefore(fig, mark)); }

  function show(i, revealAll) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    if (slides[cur]) slides[cur].classList.remove("current");
    cur = i;
    const s = slides[cur];
    place(s);
    steps(s).forEach((x) => x.classList.toggle("on", !!revealAll));
    s.classList.add("current");
    s.scrollTop = 0;
    update();
  }
  function update() {
    const s = slides[cur], p = +s.dataset.part || 0;
    $(".deck-count", deck).textContent = `${cur + 1} / ${slides.length}`;
    $(".deck-progress i", deck).style.width = ((cur + 1) / slides.length) * 100 + "%";
    $(".deck-title", deck).textContent = s.dataset.title;
    deck.querySelectorAll(".deck-parts button").forEach((b) => b.setAttribute("aria-current", String(+b.dataset.part === p)));
    deck.querySelectorAll(".deck-contents button[data-go]").forEach((b) => b.setAttribute("aria-current", String(+b.dataset.go === cur)));
    $(".deck-next", deck).setAttribute("aria-label", hiddenSteps(s).length ? "Reveal the next point" : "Next slide");
    try { history.replaceState(null, "", "#slide-" + (cur + 1)); } catch (e) { /* ignore */ }
  }
  function next() {
    const h = hiddenSteps(slides[cur]);
    if (h.length) { h[0].classList.add("on"); update(); }
    else if (cur < slides.length - 1) show(cur + 1);
  }
  function prev() {
    const on = steps(slides[cur]).filter((x) => x.classList.contains("on"));
    if (on.length) { on[on.length - 1].classList.remove("on"); update(); }
    else if (cur > 0) show(cur - 1, true);
  }
  const firstOfPart = (p) => slides.findIndex((s) => +s.dataset.part === p);

  function fullscreen(on) {
    try {
      if (on && !document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
      if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    } catch (e) { /* full screen is optional */ }
  }
  document.addEventListener("fullscreenchange", () => {
    $(".deck-full", deck).textContent = document.fullscreenElement ? "Exit full screen" : "Full screen";
  });

  function setModeButtons(presenting) {
    const r = $("#mode-read"), p = $("#mode-present");
    if (r) r.setAttribute("aria-pressed", String(!presenting));
    if (p) p.setAttribute("aria-pressed", String(presenting));
  }
  function enter(i, full = true) {
    if (!built) build();
    document.body.classList.add("presenting");
    deck.hidden = false;
    setModeButtons(true);
    show(i == null ? cur : i);
    if (full) fullscreen(true);
    deck.focus({ preventScroll: true });
  }
  function exit() {
    closeContents();
    fullscreen(false);
    const p = +slides[cur].dataset.part || 0;
    giveBack();
    deck.hidden = true;
    document.body.classList.remove("presenting");
    setModeButtons(false);
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* ignore */ }
    const target = p ? document.getElementById("part" + p) : null;
    if (target) target.scrollIntoView({ block: "start" });
    else window.scrollTo(0, 0);
  }
  function openContents() { contents.hidden = false; const b = contents.querySelector(`button[data-go="${cur}"]`); if (b) b.focus(); }
  function closeContents() { if (!contents.hidden) { contents.hidden = true; deck.focus({ preventScroll: true }); } }

  /* controls */
  $(".deck-next", deck).addEventListener("click", next);
  $(".deck-prev", deck).addEventListener("click", prev);
  $(".deck-exit", deck).addEventListener("click", exit);
  $(".deck-full", deck).addEventListener("click", () => fullscreen(!document.fullscreenElement));
  $(".deck-open-contents", deck).addEventListener("click", () => (contents.hidden ? openContents() : closeContents()));
  $(".deck-close-contents", deck).addEventListener("click", closeContents);
  deck.addEventListener("click", (e) => {
    const go = e.target.closest("button[data-go]");
    if (go) { closeContents(); show(+go.dataset.go); return; }
    const pt = e.target.closest(".deck-parts button");
    if (pt) { show(firstOfPart(+pt.dataset.part)); return; }
  });
  // clicking a text slide advances; interactive slides keep their clicks for the figure
  stage.addEventListener("click", (e) => {
    if (!contents.hidden) return;
    const s = slides[cur];
    if (!s || s.classList.contains("interactive")) return;
    if (e.target.closest("a, button, input, select, textarea, summary")) return;
    if (window.getSelection && String(window.getSelection())) return;
    next();
  });

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target instanceof Element ? e.target : document.body;
    const typing = t.matches("input, textarea, select, [contenteditable=true]");
    if (deck.hidden) {
      if ((e.key === "p" || e.key === "P") && !typing) { e.preventDefault(); enter(); }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); if (!contents.hidden) closeContents(); else exit(); return; }
    if (!contents.hidden) { if (e.key === "g" || e.key === "G") { e.preventDefault(); closeContents(); } return; }
    // leave keys to the figure's own controls: sliders, inputs, buttons, and anything focused in a slot
    const own = t.matches("input, textarea, select, [role=slider]");
    if (own && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", " ", "PageUp", "PageDown"].includes(e.key)) return;
    if ((e.key === " " || e.key === "Enter") && (t.closest("button, a, summary") || t.closest(".slot"))) return;
    switch (e.key) {
      case "ArrowRight": case "ArrowDown": case "PageDown": case " ": case "Enter":
        e.preventDefault(); next(); break;
      case "ArrowLeft": case "ArrowUp": case "PageUp": case "Backspace":
        e.preventDefault(); prev(); break;
      case "Home": e.preventDefault(); show(0); break;
      case "End": e.preventDefault(); show(slides.length - 1, true); break;
      case "f": case "F": e.preventDefault(); fullscreen(!document.fullscreenElement); break;
      case "g": case "G": case "o": case "O": e.preventDefault(); openContents(); break;
      default:
        if (/^[1-5]$/.test(e.key)) { e.preventDefault(); show(firstOfPart(+e.key)); }
    }
  });

  /* ways in from reading mode */
  const readBtn = $("#mode-read"), presentBtn = $("#mode-present");
  if (presentBtn) presentBtn.addEventListener("click", () => enter());
  if (readBtn) readBtn.addEventListener("click", () => { if (!deck.hidden) exit(); });
  document.querySelectorAll(".part[id^='part'] .part-head").forEach((head) => {
    const p = +head.parentElement.id.replace("part", "");
    if (!PARTS[p]) return;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn-quiet present-here";
    b.textContent = "Present this part";
    b.addEventListener("click", () => { if (!built) build(); enter(firstOfPart(p)); });
    head.appendChild(b);
  });
  const m = /^#slide-(\d+)$/.exec(location.hash || "");
  if (m) enter(+m[1] - 1, false);
})();
