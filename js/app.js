/* Interface: picker and stats, poset, the selected graph, the picture of the space, the
   finiteness table, and the hero animation. */
(function () {
  "use strict";
  const MG = window.MG, MD = window.MD, SP = window.SPACES;
  const $ = (s, r = document) => r.querySelector(s);
  const num = MD.num;
  const VN = MD.VNAMES;
  const fmt = (x) => Number(x).toLocaleString("en-US");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const PAL = ["var(--o0)", "var(--o1)", "var(--o2)", "var(--o3)", "var(--o4)", "var(--o5)", "var(--o6)", "var(--o7)"];
  const pal = (e) => PAL[e % PAL.length];
  const MAX = 250; // largest poset offered
  const GS = [0, 1, 2, 3, 4], NS = [0, 1, 2, 3, 4, 5, 6];
  // number of stable graphs of type (g, n), computed with js/core.js (null: more than 60,000)
  const COUNTS = {
    "0,3": 1, "0,4": 4, "0,5": 26, "0,6": 236,
    "1,1": 2, "1,2": 5, "1,3": 23, "1,4": 163, "1,5": 1576, "1,6": 19340,
    "2,0": 7, "2,1": 16, "2,2": 75, "2,3": 555, "2,4": 5608, "2,5": null, "2,6": null,
    "3,0": 42, "3,1": 181, "3,2": 1355, "3,3": 14092, "3,4": null, "3,5": null, "3,6": null,
    "4,0": 379, "4,1": 2666, "4,2": 28037, "4,3": null, "4,4": null, "4,5": null, "4,6": null,
  };
  const edgesLabel = (r) => r + (r === 1 ? " edge" : " edges");
  const Msub = (g, n) => `<em class="m">M<sub>${n === 0 ? g : g + "," + n}</sub></em>`;
  const Dsub = (g, n) => `<em class="m">Δ<sub>${n === 0 ? g : g + "," + n}</sub></em>`;

  const S = {
    g: 0, n: 5, data: null, info: [], sel: -1, here: -1, pinned: null, pinKey: null,
    showHalf: true, autSel: -1, spec: null, pt: null, layout: null,
  };

  /* ---------- choosing (g, n) ---------- */
  function setCase(g, n, fromHash) {
    S.g = g; S.n = n;
    S.data = MG.enumerate(g, n);
    S.info = S.data.graphs.map((G) => ({ aut: MG.autInfo(G, 240), E: G.edges.length, V: G.w.length }));
    S.pinned = null; S.pinKey = null; S.autSel = -1;
    S.spec = SP.SPACES[g + "," + n] || null;
    S.pt = null;
    S.metric = new MD.MetricView();
    if (S.d3) { S.d3.destroy(); S.d3 = null; }
    const maxE = 3 * g - 3 + n;
    const top = S.data.graphs.findIndex((G) => G.edges.length === maxE);
    S.sel = top >= 0 ? top : 0;
    if (g === 0 && n === 6 && window.D06) {
      // the vertex 56 | 1234, at the centre of the picture
      const v56 = S.data.graphs.findIndex((G, i) => S.data.rank[i] === 1 && G.legs[4] === G.legs[5] && G.legs.filter((v) => v === G.legs[4]).length === 2);
      if (v56 >= 0) S.sel = v56;
    }
    if (g === 1 && n === 3 && window.D13) {
      // the 3-cycle, whose triangle zips up into the sphere
      const c = window.D13.defaultCell(S.data);
      if (c >= 0) S.sel = c;
    }
    S.here = -1;
    if (!fromHash) { try { history.replaceState(null, "", "#g" + g + "-n" + n); } catch (e) { /* ignore */ } }
    renderPicker();
    renderStats();
    renderPoset();
    renderDetail();
    renderSpace();
  }

  function renderPicker() {
    let h = `<thead><tr><th></th>${NS.map((n) => `<th>n = ${n}</th>`).join("")}</tr></thead><tbody>`;
    for (const g of GS) {
      h += `<tr><th class="rowh">g = ${g}</th>`;
      for (const n of NS) {
        const key = g + "," + n;
        if (2 * g - 2 + n <= 0) { h += `<td><span class="cell unstable" title="2g − 2 + n ≤ 0: no stable graphs">–</span></td>`; continue; }
        const c = COUNTS[key];
        if (c != null && c <= MAX) {
          const on = g === S.g && n === S.n;
          h += `<td><button type="button" data-g="${g}" data-n="${n}" aria-pressed="${on}" title="g = ${g}, n = ${n}: ${c} stable graphs">${c}</button></td>`;
        } else {
          const t = c == null ? "&gt;60k" : c >= 10000 ? Math.round(c / 1000) + "k" : fmt(c);
          h += `<td><span class="cell" title="${c == null ? "more than 60,000" : fmt(c)} stable graphs: too many to draw">${t}</span></td>`;
        }
      }
      h += `</tr>`;
    }
    $("#picker").innerHTML = h + `</tbody>`;
  }
  $("#picker").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-g]");
    if (b) setCase(+b.dataset.g, +b.dataset.n);
  });

  function renderStats() {
    const { g, n } = S;
    const maxE = 3 * g - 3 + n;
    const top = S.data.graphs.filter((G) => G.edges.length === maxE).length;
    const stat = (b, s, t) => `<div class="stat" title="${t}"><b>${b}</b><span>${s}</span></div>`;
    $("#stats").innerHTML =
      stat(fmt(S.data.N), "stable graphs", "Isomorphism classes of stable graphs of this type") +
      stat(maxE, `dimension of ${Msub(g, n)}`, "3g − 3 + n, the most edges a stable graph can have") +
      stat(top, "top-dimensional cells", "Graphs with 3g − 3 + n edges: every vertex has weight 0 and valence 3");
  }

  /* ---------- poset ---------- */
  function rows() {
    const R = [];
    S.data.rank.forEach((r, i) => { (R[r] = R[r] || []).push(i); });
    // barycentre sweeps to reduce crossings
    const pos = new Map();
    const setPos = () => R.forEach((row) => row.forEach((i, k) => pos.set(i, (k + 0.5) / row.length)));
    setPos();
    const bary = (i, nb) => (nb.length ? nb.reduce((s, j) => s + pos.get(j), 0) / nb.length : pos.get(i));
    for (let it = 0; it < 6; it++) {
      for (let r = 1; r < R.length; r++) { R[r].sort((a, b) => bary(a, S.data.down[a]) - bary(b, S.data.down[b]) || a - b); setPos(); }
      for (let r = R.length - 2; r >= 0; r--) { R[r].sort((a, b) => bary(a, S.data.up[a]) - bary(b, S.data.up[b]) || a - b); setPos(); }
    }
    return R;
  }

  function renderPoset() {
    const { g, n } = S;
    const d = S.data;
    $("#poset-text").innerHTML = `Each of the ${fmt(d.N)} stable graphs of genus ${g} with ${n} legs, arranged by number of edges. A line joins two graphs when contracting one edge of the upper graph gives the lower one, so the poset is the face poset of ${Msub(g, n)}. The bottom is the single vertex of weight ${g}; the top row has the trivalent graphs with all weights 0.`;
    $("#board-bar").innerHTML = `<span class="legend">Hover over a graph to preview it. Click to select it.</span>`;
    const body = $("#board-body");
    const R = rows();
    const W = Math.max(640, body.clientWidth || 1100);
    const maxRow = Math.max(...R.map((r) => r.length));
    const cards = d.N <= 60 && maxRow <= 16;
    const left = 66, pad = 16, span = W - left - pad;
    let cw = 0, ch = 0, rowH, rad = 0;
    if (cards) {
      cw = Math.min(124, span / maxRow - 10);
      ch = Math.round(cw * 0.8);
      rowH = ch + 44;
    } else {
      rad = d.N <= 120 ? 6 : 4.5;
      rowH = d.N <= 120 ? 62 : 56;
    }
    const H = pad * 2 + R.length * rowH;
    const xy = new Array(d.N);
    let labels = "";
    R.forEach((row, r) => {
      const y = H - pad - (r + 0.5) * rowH;
      labels += `<text class="rank" x="6" y="${num(y - 3)}">${edgesLabel(r)}</text><text class="rank count" x="6" y="${num(y + 11)}">${row.length} ${row.length === 1 ? "graph" : "graphs"}</text>`;
      const step = cards ? Math.min(span / row.length, cw + 40) : Math.min(span / row.length, 64);
      const used = step * row.length;
      row.forEach((i, k) => { xy[i] = [left + (span - used) / 2 + step * (k + 0.5), y]; });
    });
    let edges = "";
    for (let a = 0; a < d.N; a++) for (const b of d.down[a]) {
      const y1 = xy[a][1] + (cards ? ch / 2 : 0), y2 = xy[b][1] - (cards ? ch / 2 : 0);
      edges += `<line class="edge" data-a="${a}" data-b="${b}" x1="${num(xy[a][0])}" y1="${num(y1)}" x2="${num(xy[b][0])}" y2="${num(y2)}"/>`;
    }
    let nodes = "";
    for (let i = 0; i < d.N; i++) {
      const aria = `Graph ${i + 1}, ${edgesLabel(d.rank[i])}`;
      if (cards) {
        const mini = MD.graphSvg(d.graphs[i], { w: cw, h: ch, pad: 9, font: 8.5, dot: 2.6, strokeW: 1.3, attrs: ` x="0" y="0" width="${num(cw)}" height="${ch}"` });
        nodes += `<g class="node" data-i="${i}" transform="translate(${num(xy[i][0] - cw / 2)},${num(xy[i][1] - ch / 2)})" tabindex="0" role="button" aria-label="${aria}"><rect class="card" width="${num(cw)}" height="${ch}" rx="6"/>${mini}</g>`;
      } else {
        nodes += `<g class="node" data-i="${i}" transform="translate(${num(xy[i][0])},${num(xy[i][1])})" tabindex="0" role="button" aria-label="${aria}"><circle class="body" r="${rad}"/></g>`;
      }
    }
    body.innerHTML = `<svg class="hasse" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="group" aria-label="Poset of stable graphs by number of edges">${labels}<g>${edges}</g><g>${nodes}</g></svg>`;
    S.layout = { xy, cards, cw, ch, rad };
    const svg = body.querySelector("svg");
    svg.addEventListener("mouseover", (e) => { const nd = e.target.closest(".node"); if (nd) showTip(+nd.dataset.i); });
    svg.addEventListener("mouseout", (e) => { if (e.target.closest(".node")) hideTip(); });
    svg.addEventListener("click", (e) => { const nd = e.target.closest(".node"); if (nd) select(+nd.dataset.i, true); });
    svg.addEventListener("keydown", (e) => {
      const nd = e.target.closest(".node");
      if (nd && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); select(+nd.dataset.i, true); }
    });
    svg.addEventListener("focusin", (e) => { const nd = e.target.closest(".node"); if (nd) showTip(+nd.dataset.i); });
    svg.addEventListener("focusout", hideTip);
    highlightPoset();
  }

  function highlightPoset() {
    const svg = $(".hasse");
    if (!svg || !S.layout) return;
    const { cards, cw, ch, rad } = S.layout;
    svg.querySelectorAll(".node.lit, .node.sel").forEach((nd) => nd.classList.remove("lit", "sel"));
    svg.querySelectorAll(".edge.on").forEach((e) => e.classList.remove("on"));
    svg.querySelectorAll(".ring, .here, .pin").forEach((c) => c.remove());
    const nodeOf = (j) => svg.querySelector(`.node[data-i="${j}"]`);
    const ring = (j, cls, grow) => {
      const nd = nodeOf(j);
      if (!nd) return;
      const el = cards
        ? `<rect class="${cls}" x="${-grow}" y="${-grow}" width="${num(cw + 2 * grow)}" height="${ch + 2 * grow}" rx="${6 + grow}" fill="none"/>`
        : `<circle class="${cls}" r="${rad + grow + 2}"/>`;
      if (cls === "pin" && !cards) nd.insertAdjacentHTML("afterbegin", el);
      else nd.insertAdjacentHTML("beforeend", el);
    };
    const lit = new Set();
    if (S.pinned) S.pinned.forEach((j) => { ring(j, "pin", cards ? 3 : 3); lit.add(j); });
    const i = S.sel;
    if (i >= 0) {
      [i, ...S.data.down[i], ...S.data.up[i]].forEach((j) => lit.add(j));
      svg.querySelectorAll(`.edge[data-a="${i}"], .edge[data-b="${i}"]`).forEach((e) => e.classList.add("on"));
      nodeOf(i)?.classList.add("sel");
      if (!cards) ring(i, "ring", 4);
    }
    if (S.here >= 0) { ring(S.here, "here", cards ? 5 : 1.5); lit.add(S.here); }
    lit.forEach((j) => nodeOf(j)?.classList.add("lit"));
    svg.classList.toggle("dim", lit.size > 0);
  }

  function showTip(i) {
    const tip = $("#tip");
    const board = $(".board").getBoundingClientRect();
    const nd = $(`.hasse .node[data-i="${i}"]`);
    if (!nd) return;
    const nb = nd.getBoundingClientRect();
    const inf = S.info[i];
    tip.innerHTML = MD.graphSvg(S.data.graphs[i], { w: 200, h: 150, pad: 16, font: 11, dot: 3.4, strokeW: 1.7 }) +
      `<div>graph ${i + 1} · ${edgesLabel(inf.E)} · ${inf.V} ${inf.V === 1 ? "vertex" : "vertices"}</div><div>|Aut| = ${inf.aut.order}</div>`;
    tip.hidden = false;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = nb.right - board.left + 10;
    if (x + w > board.width - 6) x = nb.left - board.left - w - 10;
    let y = nb.top - board.top + nb.height / 2 - h / 2;
    y = Math.max(6, Math.min(board.height - h - 6, y));
    tip.style.left = Math.max(6, x) + "px";
    tip.style.top = y + "px";
  }
  function hideTip() { $("#tip").hidden = true; }

  function select(i, movePoint) {
    S.sel = i;
    S.autSel = -1;
    renderDetail();
    highlightPoset();
    if (movePoint && S.spec) movePointTo(i);
    highlightSpace();
  }

  /* ---------- the selected graph ---------- */
  const FIG = { w: 440, h: 300, pad: 38, font: 13, dot: 4.6, strokeW: 2.3 };

  function renderDetail() {
    const box = $("#detail");
    const i = S.sel;
    const G = S.data.graphs[i];
    const inf = S.info[i];
    const { g, n } = S;
    const E = G.edges.length, V = G.w.length, Hn = n + 2 * E;
    const aut = inf.aut;
    const b1 = E - V + 1, sw = MG.sumW(G);

    // column 1: the drawing
    const fig = MD.graphSvg(G, Object.assign({}, FIG, { vnames: true, halfLabels: S.showHalf, hit: E > 0, attrs: ` id="fig-svg"`, label: "The selected graph, with vertex names and half-edge numbers" }));
    const tags = [
      `<span class="tag">${edgesLabel(E)}</span>`,
      `<span class="tag">${V} ${V === 1 ? "vertex" : "vertices"}</span>`,
      `<span class="tag">b₁ = ${b1}</span>`,
      `<span class="tag s">|Aut| = ${aut.order}</span>`,
    ].join("");
    const col1 = `<div class="d-fig">
      <div class="d-head"><h3>Graph ${i + 1}</h3><div class="tags">${tags}</div></div>
      ${fig}
      <div class="opts">
        <label><input type="checkbox" id="half-toggle" ${S.showHalf ? "checked" : ""}> Number the half-edges</label>
        <span>${E ? "Click an edge to contract it." : "No edges: this is the bottom of the poset."}</span>
      </div>
    </div>`;

    // column 2: half-edge data, genus, stability check
    const iota = E ? G.edges.map((_, e) => `(${n + 2 * e + 1} ${n + 2 * e + 2})`).join("") : "id";
    const hs = [], rs = [];
    for (let h = 1; h <= Hn; h++) {
      hs.push(`<th>${h}</th>`);
      const v = h <= n ? G.legs[h - 1] : G.edges[Math.floor((h - n - 1) / 2)][(h - n - 1) % 2];
      rs.push(`<td class="v">${VN[v]}</td>`);
    }
    const rTable = Hn ? `<div class="rscroll"><table class="rtable"><tr><th>h</th>${hs.join("")}</tr><tr><th>r(h)</th>${rs.join("")}</tr></table></div>` : `<span class="muted">H is empty</span>`;
    const col2 = `<div>
      <h4>Half-edge data</h4>
      <dl>
        <dt>H</dt><dd>{${Hn ? (Hn <= 3 ? [...Array(Hn).keys()].map((x) => x + 1).join(", ") : "1, …, " + Hn) : ""}}</dd>
        <dt>V</dt><dd>{${G.w.map((_, v) => VN[v]).join(", ")}}</dd>
        <dt>ι</dt><dd>${iota}</dd>
        <dt>legs</dt><dd>${n ? `fixed points 1, …, ${n}` : "none"}</dd>
        <dt>w</dt><dd>${G.w.map((w, v) => `${VN[v]} ↦ ${w}`).join(", ")}</dd>
      </dl>
      ${rTable}
      <div class="calc">g = <i>b</i><sub>1</sub> + ∑<i>w</i> = (${E} − ${V} + 1) + ${sw} = ${g}</div>
      ${MD.stabilityHtml(G, { name: (v) => VN[v] })}
    </div>`;

    // column 3: automorphisms and neighbours
    const parts = [];
    if (aut.vaut > 1) parts.push(`${aut.vaut} (permuting vertices)`);
    aut.factors.forEach((f) => {
      if (f.kind === "par") parts.push(`${f.m}! (parallel edges ${VN[f.u]}–${VN[f.v]})`);
      else parts.push(f.m === 1 ? `2 (flipping the loop at ${VN[f.v]})` : `${f.m}!·2<sup>${f.m}</sup> (loops at ${VN[f.v]})`);
    });
    let autHtml = `<div class="calc">|Aut(<i>G</i>)| = ${aut.order}</div>`;
    if (parts.length) autHtml += `<p class="note">${parts.join(" × ")}</p>`;
    else autHtml += `<p class="note">Only the identity: the legs and the structure pin everything down.</p>`;
    if (aut.autos) {
      const chips = aut.autos.map((a, k) => {
        const c = MG.cycles(a.h, 1);
        const label = c.length ? c.map((cy) => "(" + cy.join(" ") + ")").join("") : "id";
        return `<button type="button" class="chip" data-k="${k}" aria-pressed="${k === S.autSel}">${label}</button>`;
      }).join("");
      autHtml += `<div class="aut-list" id="aut-list">${chips}</div><div class="aut-now" id="aut-now">${autText()}</div>`;
    } else {
      autHtml += `<p class="note">Too many to list.</p>`;
    }
    const mini = (j) => `<button type="button" class="mini" data-j="${j}">${MD.graphSvg(S.data.graphs[j], { w: 100, h: 74, pad: 9, font: 8.5, dot: 2.6, strokeW: 1.3 })}<span>graph ${j + 1}</span></button>`;
    const below = S.data.down[i], above = S.data.up[i];
    const col3 = `<div>
      <div class="aut"><h4>Automorphisms (as permutations of H)</h4>${autHtml}</div>
      <div class="aut"><h4>Who lives below? Contract one edge.</h4>${below.length ? `<div class="minis">${below.map(mini).join("")}</div>` : `<p class="empty">Nothing below: no edges to contract.</p>`}</div>
      <div class="aut"><h4>Who lives above? Split one vertex.</h4>${above.length ? `<div class="minis">${above.map(mini).join("")}</div>` : `<p class="empty">Nothing above: every vertex is trivalent of weight 0, so nothing can be split.</p>`}</div>
    </div>`;

    box.innerHTML = col1 + col2 + col3;
    $("#half-toggle").addEventListener("change", (e) => { S.showHalf = e.target.checked; S.autSel = -1; renderDetail(); });
    box.querySelectorAll(".mini").forEach((b) => b.addEventListener("click", () => select(+b.dataset.j, true)));
    const fsvg = $("#fig-svg");
    fsvg.addEventListener("click", (e) => {
      const h = e.target.closest(".edge-hit");
      if (!h) return;
      const j = MG.lookup(S.data, MG.contract(G, +h.dataset.e));
      if (j >= 0) select(j, true);
    });
    fsvg.addEventListener("mouseover", (e) => {
      const h = e.target.closest(".edge-hit");
      fsvg.querySelectorAll(".edge-path.hover").forEach((p) => p.classList.remove("hover"));
      if (h) fsvg.querySelector(`.edge-path[data-e="${h.dataset.e}"]`)?.classList.add("hover");
    });
    fsvg.addEventListener("mouseleave", () => fsvg.querySelectorAll(".edge-path.hover").forEach((p) => p.classList.remove("hover")));
    $("#aut-list")?.addEventListener("click", (e) => {
      const c = e.target.closest(".chip");
      if (!c) return;
      S.autSel = +c.dataset.k;
      $("#aut-list").querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", String(+x.dataset.k === S.autSel)));
      $("#aut-now").innerHTML = autText();
      playAut();
    });
  }

  function autText() {
    const aut = S.info[S.sel].aut;
    if (S.autSel < 0 || !aut.autos) return `Click a permutation to apply it.`;
    const a = aut.autos[S.autSel];
    const G = S.data.graphs[S.sel];
    const vc = MG.cycles(a.sigma, 0, (v) => VN[v]);
    const ec = MG.cycles(a.e, 0, (e) => "e" + (e + 1));
    const vtxt = vc.length ? vc.map((c) => "(" + c.join(" ") + ")").join("") : "fixed";
    const etxt = G.edges.length ? (ec.length ? ec.map((c) => "(" + c.join(" ") + ")").join("") : "identity") : "no edges";
    return `vertices: <b>${vtxt}</b><br>edges (e<sub>k</sub> = {${S.n + 1}, ${S.n + 2}}, …): <b>${etxt}</b>`;
  }

  /* Animate an automorphism: each half-edge (the half of its edge next to its root) travels to
     the position of its image, carrying its label. Halves keep the colour of the edge they
     started on, so after the move you can read off where each one went. */
  let autAnim = 0;
  const SVGNS = "http://www.w3.org/2000/svg";
  function playAut() {
    const aut = S.info[S.sel].aut;
    if (!$("#fig-svg") || S.autSel < 0) return;
    if (!S.showHalf) { S.showHalf = true; const k = S.autSel; renderDetail(); S.autSel = k; $("#aut-now").innerHTML = autText(); $("#aut-list").querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", String(+x.dataset.k === k))); }
    const svg = $("#fig-svg");
    const a = aut.autos[S.autSel];
    const G = S.data.graphs[S.sel];
    const n = S.n, E = G.edges.length;
    if (!E) return;
    const sp = MD.screenPositions(G, FIG);
    const edgeOf = (h) => Math.floor((h - n - 1) / 2), endOf = (h) => (h - n - 1) % 2;
    const NP = 20;
    // points along half-edge h, from its root to the middle of its edge
    const halfPts = (h) => {
      const geo = sp.geo[edgeOf(h)], k = endOf(h), pts = [];
      for (let i = 0; i <= NP; i++) { const t = (0.5 * i) / NP; pts.push(MD.along(geo, k ? 1 - t : t)); }
      return pts;
    };
    const anchor = (h) => {
      const geo = sp.geo[edgeOf(h)], k = endOf(h);
      return MD.along(geo, geo.kind === "arc" ? (k ? 0.76 : 0.24) : (k ? 0.8 : 0.2));
    };
    svg.querySelector("#aut-halves")?.remove();
    svg.querySelectorAll(".edge-path").forEach((p) => { p.style.opacity = "0"; });
    const layer = document.createElementNS(SVGNS, "g");
    layer.id = "aut-halves";
    svg.insertBefore(layer, svg.querySelector(".hlab"));
    const halves = [];
    for (let e = 0; e < E; e++) for (let k = 0; k < 2; k++) {
      const h = n + 2 * e + 1 + k;
      const path = document.createElementNS(SVGNS, "path");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", pal(e));
      path.setAttribute("stroke-width", String(FIG.strokeW + 0.6));
      path.setAttribute("stroke-linecap", "round");
      layer.appendChild(path);
      halves.push({ path, src: halfPts(h), tgt: halfPts(a.h[h]) });
    }
    const labels = [];
    svg.querySelectorAll(".hlab").forEach((el) => {
      const h = +el.dataset.h;
      if (h > n) labels.push({ el, p: anchor(h), q: anchor(a.h[h]) });
    });
    const along2 = (p, q, s) => {
      const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1;
      const bend = 0.28 * L * 4 * s * (1 - s);
      return [p[0] + dx * s - (dy / L) * bend, p[1] + dy * s + (dx / L) * bend];
    };
    const token = ++autAnim;
    const dur = reduced.matches ? 0 : 1400;
    const t0 = performance.now();
    const frame = (s) => {
      halves.forEach(({ path, src, tgt }) => {
        path.setAttribute("d", src.map((p, i) => { const r = along2(p, tgt[i], s); return (i ? "L" : "M") + num(r[0]) + " " + num(r[1]); }).join(""));
      });
      labels.forEach(({ el, p, q }) => {
        const r = along2(p, q, s);
        el.setAttribute("transform", `translate(${num(r[0] - p[0])},${num(r[1] - p[1])})`);
      });
    };
    const step = (now) => {
      if (token !== autAnim) return;
      const u = dur ? Math.min(1, (now - t0) / dur) : 1;
      frame(u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);
      if (u < 1) requestAnimationFrame(step);
    };
    frame(0);
    requestAnimationFrame(step);
  }

  /* ---------- the space ---------- */
  const PIC = { w: 560, h: 430 };
  const picTransform = (spec) => window.SPIC.picTransform(spec, PIC.w, PIC.h);
  const elementsOf = (spec) => window.SPIC.elementsOf(spec, S.data);
  const spaceSvg = (spec, tf, opts) => window.SPIC.spaceSvg(spec, tf, S.data, opts);

  function renderSpace() {
    const box = $("#space");
    const { g, n } = S;
    const spec = S.spec;
    const dimD = 3 * g - 4 + n;
    const fvec = fvecHtml();
    if (g === 0 && n === 6 && window.D06) { render06(fvec); return; }
    if (g === 1 && n === 3 && window.D13) { render13(fvec); return; }
    if (!spec) {
      $("#space-text").innerHTML = `The space ${Msub(g, n)} is the cone over ${Dsub(g, n)}, the space of graphs with total edge length 1. Here ${Dsub(g, n)} has dimension ${dimD}, too many to draw. Its cells are still easy to count.`;
      box.innerHTML = `<div class="nopic">
        <h4>Cells of ${Dsub(g, n)} by dimension</h4>${fvec}
        <p class="note">A graph with <em class="m">k</em> edges gives a cell of dimension <em class="m">k</em> − 1 in ${Dsub(g, n)}.</p>
        <p class="note">Pictures are available for (0, 4), (0, 5), (0, 6), (1, 1), (1, 2), (1, 3) and (2, 0).</p>
      </div><div>${staticHere()}</div>`;
      return;
    }
    $("#space-text").innerHTML = spec.text;
    const tf = picTransform(spec);
    S.tf = tf;
    box.innerHTML = `<div class="pic">
        <h4>${spec.title}</h4>
        <svg id="space-svg" viewBox="0 0 ${PIC.w} ${PIC.h}" role="application" aria-label="Picture of the space. Drag the point to move through it.">
          ${spaceSvg(spec, tf)}
          <g id="pt"><circle class="pt-halo" r="16"/><circle class="pt" r="7"/></g>
        </svg>
        <p class="note">${spec.cap} Drag the teal point anywhere; it snaps to the nearest point of the space. Click to select that graph above.</p>
        <details><summary class="note">Cells by dimension</summary>${fvec}</details>
      </div>
      <div class="live" id="live"></div>`;
    if (!S.pt) {
      const c0 = spec.cells[0];
      S.pt = { ci: 0, lam: c0.pts.length === 3 ? [0.3, 0.25, 0.45] : spec.kind === "cone" ? [0.5, 0.5] : [0.4, 0.6] };
    }
    bindDrag();
    updatePoint();
  }

  function staticHere() {
    return `<div class="note" style="display:grid;gap:10px"><h4>Dimension count</h4>
      <div class="calc">dim ${Msub(S.g, S.n)} = 3<i>g</i> − 3 + <i>n</i> = ${3 * S.g - 3 + S.n}</div>
      <p>The top-dimensional cells come from trivalent graphs with all weights zero, which have exactly 3<em class="m">g</em> − 3 + <em class="m">n</em> edges.</p></div>`;
  }

  function fvecHtml() {
    const { g, n } = S;
    const maxE = 3 * g - 3 + n;
    let rowsH = "";
    for (let k = 1; k <= maxE; k++) {
      const c = S.info.filter((x) => x.E === k).length;
      rowsH += `<tr><td>${k - 1}</td><td>${edgesLabel(k)}</td><td>${c}</td></tr>`;
    }
    return `<div class="scroll"><table class="fvec"><thead><tr><th>dim</th><th>graphs with</th><th>cells</th></tr></thead><tbody>${rowsH}</tbody></table></div>`;
  }

  function bindDrag() {
    const svg = $("#space-svg");
    let drag = null;
    const toPic = (e) => {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      return S.tf.from([p.x, p.y]);
    };
    const moveTo = (e) => {
      const p = toPic(e);
      const r = SP.nearest(S.spec, p, S.pt.ci, 3 / S.tf.s);
      S.pt = { ci: r.ci, lam: r.lam };
      updatePoint();
    };
    svg.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      svg.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, y: e.clientY, moved: false };
      svg.classList.add("dragging");
      moveTo(e);
    });
    svg.addEventListener("pointermove", (e) => {
      if (!drag) return;
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4) drag.moved = true;
      moveTo(e);
    });
    const end = () => {
      if (!drag) return;
      svg.classList.remove("dragging");
      if (!drag.moved && S.here >= 0) select(S.here, false);
      drag = null;
    };
    svg.addEventListener("pointerup", end);
    svg.addEventListener("pointercancel", end);
  }

  function movePointTo(i) {
    const spec = S.spec;
    const els = elementsOf(spec).filter((e) => e.idx === i);
    if (!els.length) return;
    const e = els.sort((a, b) => b.kind - a.kind)[0];
    const cell = spec.cells[e.ci];
    let lam;
    if (e.kind === 2) lam = [0.3, 0.25, 0.45];
    else if (e.kind === 1) lam = cell.pts.map((p) => (e.pts.includes(p) ? 0.5 : 0));
    else lam = e.lam;
    if (e.kind === 1 && e.fold) lam = cell.pts.map((p) => (e.pts[0] === p ? 0.55 : e.pts[1] === p ? 0.45 : 0));
    if (spec.kind === "cone" && e.kind === 1) lam = [0.5, 0.5];
    S.pt = { ci: e.ci, lam };
    updatePoint();
  }

  function updatePoint() {
    const spec = S.spec;
    if (!spec || !S.pt) return;
    const { ci, lam } = S.pt;
    const cell = spec.cells[ci];
    const p = S.tf.to(SP.pointAt(spec, cell, lam));
    $("#pt").setAttribute("transform", `translate(${num(p[0])},${num(p[1])})`);
    const { L, graph } = SP.graphAt(spec, ci, lam);
    const idx = MG.lookup(S.data, graph);
    S.here = idx;
    const m = S.metric.draw(cell.G, L, { w: 380, h: 270, pad: 34, font: 12, dot: 4.4, strokeW: 2.6, edgeColors: pal, total: spec.kind === "cone" ? 2 : 0, label: "The metric graph at the point" });
    const total = L.reduce((a, b) => a + b, 0);
    const lens = L.map((x, e) => `<span class="${x <= 0 ? "zero" : ""}"><i style="background:${pal(S.metric.colorIndex(e))}"></i>ℓ<sub>${e + 1}</sub> = ${x.toFixed(3)}</span>`).join("");
    const inf = S.info[idx];
    const live = $("#live");
    live.innerHTML = `<div class="live-head"><h4>The graph at this point</h4><button type="button" class="btn-quiet" id="go-detail">Select graph ${idx + 1}</button></div>
      ${m.svg}
      <div class="lengths">${lens}</div>
      <p class="note">${spec.kind === "cone" ? `Edge length ℓ = ${total.toFixed(3)}.` : `Total length ${total.toFixed(3)}.`} This point lies in the open cell of graph ${idx + 1}, which has ${edgesLabel(inf.E)} and |Aut| = ${inf.aut.order}. ${L.some((x) => x <= 0) && L.some((x) => x > 0) ? "Edges of length 0 are contracted." : ""}</p>`;
    $("#go-detail").addEventListener("click", () => { select(idx, false); $("#detail-title").scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: "start" }); });
    highlightPoset();
    highlightSpace();
  }

  /* Δ_{0,6}: 2-dimensional, drawn in space (js/delta06.js) */
  function render06(fvec) {
    $("#space-text").innerHTML = `Here ${Dsub(0, 6)} is 2-dimensional: a vertex for each tree with one edge, an edge for each tree with two edges, and a triangle for each trivalent tree. It cannot sit in ℝ<sup>3</sup> without crossing itself, because the <b>link</b> of every vertex (the graph you would see on a tiny sphere around it) is the Petersen graph or K<sub>3,3</sub>, and neither can be drawn in the plane without crossings. Below is a picture of ${Dsub(0, 6)} in space, crossings and all, with the symmetry of a tetrahedron. Turn it, and click a vertex to see its star and its link.`;
    $("#space").innerHTML = `<div class="pic">
        <h4>Total edge length 1: ${Dsub(0, 6)} in space</h4>
        <svg id="d06-svg" class="d06" viewBox="0 0 560 430" role="application" aria-label="Δ0,6 drawn in space. Drag to turn it; click a vertex, edge or triangle."></svg>
        <div class="d06-ctl"><button type="button" class="btn-quiet" id="d06-spin">Pause</button><button type="button" class="btn-quiet" id="d06-clear">Clear the selection</button><span class="note">Drag to turn it. Click a vertex, an edge or a triangle.</span><span class="note"><span class="key v24"></span>2 | 4 splits <span class="key v33"></span>3 | 3 splits</span></div>
        <details><summary class="note">Cells by dimension</summary>${fvec}</details>
      </div>
      <div class="live" id="d06-live"></div>`;
    S.d3 = window.D06.mount({ svg: $("#d06-svg"), panel: $("#d06-live"), spin: $("#d06-spin"), clear: $("#d06-clear") }, S.data, { select: (i) => select(i, false), pal });
    S.d3.highlight(S.sel);
  }

  /* Δ_{1,3}: 2-dimensional, and it does sit in space (js/delta13.js) */
  function render13(fvec) {
    $("#space-text").innerHTML = `Here ${Dsub(1, 3)} is 2-dimensional, with 5 vertices, 10 edges and 7 triangles. Unlike ${Dsub(0, 6)}, it sits in ℝ<sup>3</sup> without crossing itself. One triangle, the cycle of three edges with a leg at each vertex, has all three sides folded in half by swapping two parallel edges, and folding them zips the triangle up into a sphere. The other six triangles form three flat fins outside the sphere, attached along its seams. Turn it, and click a cell to see its graph.`;
    $("#space").innerHTML = `<div class="pic">
        <h4>Total edge length 1: ${Dsub(1, 3)} in space</h4>
        <svg id="d13-svg" class="d06 d13" viewBox="0 0 560 430" role="application" aria-label="Δ1,3 drawn in space. Drag to turn it; click a vertex, edge or triangle."></svg>
        <div class="d06-ctl"><button type="button" class="btn-quiet" id="d13-spin">Pause</button><button type="button" class="btn-quiet" id="d13-clear">Clear the selection</button><span class="note">Drag to turn it. Click a vertex, an edge or a triangle.</span><span class="note"><span class="key vL"></span>the loop <span class="key vB"></span>weight-one vertex <span class="key fold"></span>fold point</span></div>
        <p class="note">Dashed sides are folds, where an automorphism maps a triangle to itself. They are not boundaries.</p>
        <details><summary class="note">Cells by dimension</summary>${fvec}</details>
      </div>
      <div class="live" id="d13-live"></div>`;
    S.d3 = window.D13.mount({ svg: $("#d13-svg"), panel: $("#d13-live"), spin: $("#d13-spin"), clear: $("#d13-clear") }, S.data, { select: (i) => select(i, false), pal });
    S.d3.highlight(S.sel);
  }

  function highlightSpace() {
    if (S.d3) { S.d3.highlight(S.sel); return; }
    const svg = $("#space-svg");
    if (!svg) return;
    svg.querySelectorAll("[data-idx]").forEach((el) => el.classList.toggle("sel", +el.dataset.idx === S.sel));
  }

  /* ---------- hero: a point wandering through M_2 ---------- */
  function startHero() {
    const spec = SP.SPACES["2,0"];
    const data = MG.enumerate(2, 0);
    const view = new MD.MetricView();
    const W = 240, H = 170;
    const xs = Object.values(spec.verts);
    const minX = Math.min(...xs.map((p) => p[0])), maxX = Math.max(...xs.map((p) => p[0]));
    const minY = Math.min(...xs.map((p) => p[1])), maxY = Math.max(...xs.map((p) => p[1]));
    const s = Math.min((W - 40) / (maxX - minX), (H - 30) / (maxY - minY));
    const tf = { s, to: ([x, y]) => [W / 2 + (x - (minX + maxX) / 2) * s, H / 2 + (y - (minY + maxY) / 2) * s] };
    const pic = window.SPIC.spaceSvg(spec, tf, data, { bare: true });
    $("#hero-space").innerHTML = `<svg class="spc" viewBox="0 0 ${W} ${H}"><g class="space-g">${pic}</g><polyline id="hero-trail" fill="none" stroke="var(--mat)" stroke-opacity="0.45" stroke-width="2" points=""/><circle id="hero-pt" r="5" fill="var(--mat)" stroke="var(--panel)" stroke-width="2"/></svg>`;
    // a tour: theta, across the figure-eights into the dumbbell, out to the side where a loop
    // contracts (it leaves a weight), past the fold where the loops are equal, and back
    const way = [[0.05, -0.42], [0.38, -0.08], [0.1, 0.3], [-0.5, 0.4], [-0.8, 0.62], [-0.3, 0.64], [0.2, 0.45], [0.55, 0.1], [0.45, -0.35], [0.05, -0.68], [-0.45, -0.25]];
    const cr = (t) => {
      const m = way.length;
      t = ((t % 1) + 1) % 1;
      const i = Math.min(m - 1, Math.floor(t * m)), u = t * m - i;
      const p0 = way[(i - 1 + m) % m], p1 = way[i % m], p2 = way[(i + 1) % m], p3 = way[(i + 2) % m];
      return [0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u * u + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u * u * u));
    };
    let cur = 0;
    const trail = [];
    const frame = (t) => {
      const p = cr(t);
      const r = SP.nearest(spec, p, cur, 0.04);
      cur = r.ci;
      const { L } = SP.graphAt(spec, r.ci, r.lam);
      const q = tf.to(SP.pointAt(spec, spec.cells[r.ci], r.lam));
      const m = view.draw(spec.cells[r.ci].G, L, { w: 380, h: 230, pad: 30, font: 13, dot: 4.6, strokeW: 3, edgeColors: pal });
      $("#hero-graph").innerHTML = m.svg;
      const pt = $("#hero-pt");
      pt.setAttribute("cx", num(q[0])); pt.setAttribute("cy", num(q[1]));
      trail.push(q);
      if (trail.length > 40) trail.shift();
      $("#hero-trail").setAttribute("points", trail.map((x) => num(x[0]) + "," + num(x[1])).join(" "));
    };
    if (reduced.matches) { frame(0.02); return; }
    let visible = true, t0 = performance.now(), offset = 0, last = 0;
    const period = 26000;
    const io = new IntersectionObserver((ents) => { visible = ents[0].isIntersecting; if (visible) t0 = performance.now() - offset * period; });
    io.observe($(".hero-fig"));
    const loop = (now) => {
      if (visible && now - last > 15) {
        offset = ((now - t0) / period) % 1;
        frame(offset);
        last = now;
      }
      requestAnimationFrame(loop);
    };
    frame(0);
    requestAnimationFrame(loop);
  }

  /* ---------- start ---------- */
  function parseHash() {
    const m = /^#g(\d+)-n(\d+)$/.exec(location.hash || "");
    if (!m) return null;
    const g = +m[1], n = +m[2];
    const c = COUNTS[g + "," + n];
    return c != null && c <= MAX ? [g, n] : null;
  }
  window.addEventListener("hashchange", () => { const h = parseHash(); if (h && (h[0] !== S.g || h[1] !== S.n)) setCase(h[0], h[1], true); });
  let rw = 0;
  window.addEventListener("resize", () => {
    clearTimeout(rw);
    rw = setTimeout(() => { if (Math.abs(($("#board-body").clientWidth || 0) - (S.lastW || 0)) > 40) { S.lastW = $("#board-body").clientWidth; renderPoset(); } }, 200);
  });
  const h = parseHash() || [0, 5];
  setCase(h[0], h[1], true);
  S.lastW = $("#board-body").clientWidth;
  startHero();
})();
