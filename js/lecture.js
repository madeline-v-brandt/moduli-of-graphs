/* Figures for the lecture notes. Each figure is set up by its own function and only touches
   its own elements. */
(function () {
  "use strict";
  const MG = window.MG, MD = window.MD, SP = window.SPACES, SPIC = window.SPIC;
  const $ = (s, r = document) => r.querySelector(s);
  const num = MD.num;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const PAL = ["var(--o0)", "var(--o1)", "var(--o2)", "var(--o3)", "var(--o4)", "var(--o5)", "var(--o6)", "var(--o7)"];
  const pal = (e) => PAL[e % PAL.length];
  const SUB = "₀₁₂₃₄₅₆₇₈₉";
  const mk = MG.make;
  const ell = (k) => `ℓ<tspan font-size="0.72em" dy="0.3em">${k}</tspan>`;
  const signed = (x) => (x < 0 ? "−" + -x : String(x)); // a proper minus sign
  const fmt = (x, d = 2) => (Math.abs(x) < 1e-9 ? "0" : x.toFixed(d));

  const svgPoint = (svg, e) => {
    const p = svg.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    const q = p.matrixTransform(svg.getScreenCTM().inverse());
    return [q.x, q.y];
  };
  /* pointer dragging on an svg: start(p, e) returns false to ignore the press */
  function drag(svg, { start, move, end }) {
    let on = false;
    svg.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      const p = svgPoint(svg, e);
      if (start && start(p, e) === false) return;
      e.preventDefault();
      on = true;
      svg.setPointerCapture(e.pointerId);
      if (move) move(p, e);
    });
    svg.addEventListener("pointermove", (e) => { if (on && move) move(svgPoint(svg, e), e); });
    const stop = () => { if (!on) return; on = false; if (end) end(); };
    svg.addEventListener("pointerup", stop);
    svg.addEventListener("pointercancel", stop);
  }
  function tween(dur, fn, done) {
    if (reduced.matches || dur <= 0) { fn(1); if (done) done(); return () => {}; }
    const t0 = performance.now();
    let live = true;
    const step = (now) => {
      if (!live) return;
      const u = Math.min(1, (now - t0) / dur);
      fn(u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);
      if (u < 1) requestAnimationFrame(step);
      else if (done) done();
    };
    requestAnimationFrame(step);
    return () => { live = false; };
  }
  const arrowHead = (x, y, ux, uy, s = 8) =>
    `<path class="axh" d="M${num(x)} ${num(y)}L${num(x - ux * s - uy * s * 0.5)} ${num(y - uy * s + ux * s * 0.5)}L${num(x - ux * s + uy * s * 0.5)} ${num(y - uy * s - ux * s * 0.5)}Z"/>`;
  const HATCH = `<defs><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line class="hatch-line" x1="0" y1="0" x2="0" y2="7"/></pattern></defs>`;

  /* ================= Part 1: segments ================= */
  function segments() {
    const plane = $("#seg-plane"), space = $("#seg-space");
    if (!plane) return;
    const W = 360, H = 280, U = 34, M = 14;
    const S = { segs: [[[96, 176], [236, 112]]], busy: false };
    const active = () => [0];
    const inside = ([x, y]) => x >= M && x <= W - M && y >= M && y <= H - M;
    const clampP = ([x, y]) => [Math.max(M, Math.min(W - M, x)), Math.max(M, Math.min(H - M, y))];
    const len = (s) => Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]) / U;

    function drawPlane() {
      let o = `<rect x="${M}" y="${M}" width="${W - 2 * M}" height="${H - 2 * M}" fill="none" stroke="var(--rule)"/>`;
      for (let x = M; x <= W - M; x += U) o += `<line class="grid-l" x1="${x}" y1="${M}" x2="${x}" y2="${H - M}"/>`;
      for (let y = M; y <= H - M; y += U) o += `<line class="grid-l" x1="${M}" y1="${y}" x2="${W - M}" y2="${y}"/>`;
      active().forEach((s) => {
        const [p, q] = S.segs[s];
        if (len(S.segs[s]) === 0) o += `<circle cx="${num(p[0])}" cy="${num(p[1])}" r="5" fill="var(--ink)"/><circle cx="${num(p[0])}" cy="${num(p[1])}" r="12" fill="none" stroke="var(--atom)" stroke-width="1.5" stroke-dasharray="3 3"/>`;
        else o += `<line class="seg" x1="${num(p[0])}" y1="${num(p[1])}" x2="${num(q[0])}" y2="${num(q[1])}"/>`;
      });
      active().forEach((s) => S.segs[s].forEach((p, k) => {
        o += `<circle class="handle" cx="${num(p[0])}" cy="${num(p[1])}" r="6.5"/><circle class="handle-hit" data-s="${s}" data-k="${k}" cx="${num(p[0])}" cy="${num(p[1])}" r="17"/>`;
      }));
      plane.innerHTML = o;
    }
    // the ray (one segment) or the folded quadrant (two)
    const RO = [30, 170], RS = 30, RMAX = 10.6;
    function drawSpace() {
      let o = "";
      const l = len(S.segs[0]);
      const xEnd = RO[0] + RS * RMAX;
      o += `<line class="ray" x1="${RO[0]}" y1="${RO[1]}" x2="${num(xEnd)}" y2="${RO[1]}"/>${arrowHead(xEnd + 8, RO[1], 1, 0, 10)}`;
      for (let k = 0; k <= 10; k++) {
        const x = RO[0] + RS * k;
        o += `<line x1="${x}" y1="${RO[1] - 5}" x2="${x}" y2="${RO[1] + 5}" stroke="var(--muted)"/><text class="lbl" x="${x}" y="${RO[1] + 20}" text-anchor="middle">${k}</text>`;
      }
      o += `<circle cx="${RO[0]}" cy="${RO[1]}" r="5" fill="var(--panel)" stroke="var(--ink)" stroke-width="2"/>`;
      o += `<text class="lbl-m" x="${RO[0]}" y="${RO[1] - 62}">(0, ∞)</text>`;
      const x = RO[0] + RS * Math.min(l, RMAX);
      if (l === 0) {
        o += `<circle cx="${RO[0]}" cy="${RO[1]}" r="8" fill="none" stroke="var(--atom)" stroke-width="2" stroke-dasharray="3 3"/>`;
        o += `<text class="lbl" x="${RO[0]}" y="${RO[1] - 40}" style="fill:var(--atom)">ℓ = 0: not a segment</text>`;
        o += `<text class="lbl" x="${RO[0] + 6}" y="${RO[1] + 46}">the boundary point: a degenerate segment</text>`;
      } else {
        o += `<line x1="${num(x)}" y1="${RO[1] - 34}" x2="${num(x)}" y2="${RO[1] - 10}" stroke="var(--mat)" stroke-width="1.2"/>`;
        o += `<text class="lbl" x="${num(Math.max(40, Math.min(x, 310)))}" y="${RO[1] - 40}" text-anchor="middle" style="fill:var(--mat)">ℓ = ${fmt(l)}${l > RMAX ? " →" : ""}</text>`;
        o += `<circle class="pt-main" cx="${num(x)}" cy="${RO[1]}" r="8"/>`;
      }
      o += `<text class="lbl" x="${RO[0]}" y="${RO[1] + 76}">Drag along the ray to change the length.</text>`;
      space.innerHTML = o;
    }
    function caption() {
      const l = len(S.segs[0]);
      $("#seg-cap").innerHTML = l === 0
        ? "The endpoints have collided. This is no longer a segment but a single point, the degenerate segment, and it sits at the boundary point 0 of the ray. Pull the endpoints apart to get back into the space."
        : `This segment has length ℓ = ${fmt(l)} (one grid square is 1). Drag an endpoint, or move the segment with the button: the point on the ray does not move. Try dropping one endpoint onto the other.`;
    }
    const redraw = () => { drawPlane(); drawSpace(); caption(); };

    let grab = null;
    drag(plane, {
      start: (p, e) => {
        if (S.busy) return false;
        const t = e.target.closest(".handle-hit");
        if (!t) return false;
        grab = [+t.dataset.s, +t.dataset.k];
      },
      move: (p) => {
        if (!grab) return;
        const [s, k] = grab;
        const seg = S.segs[s];
        let q = clampP(p);
        const other = seg[1 - k];
        if (Math.hypot(q[0] - other[0], q[1] - other[1]) < 10) q = other.slice();
        seg[k] = q;
        redraw();
      },
      end: () => { grab = null; },
    });
    // dragging the point along the ray changes the length of the segment
    drag(space, {
      start: () => !S.busy,
      move: (p) => {
        const seg = S.segs[0];
        let l = Math.max(0, (p[0] - RO[0]) / RS);
        if (l * RS < 6) l = 0;
        const [a, b] = seg;
        let dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
        if (d === 0) { dx = 1; dy = 0; d = 1; }
        const ux = dx / d, uy = dy / d;
        let tMax = Infinity;
        if (ux > 0) tMax = Math.min(tMax, (W - M - a[0]) / ux);
        if (ux < 0) tMax = Math.min(tMax, (M - a[0]) / ux);
        if (uy > 0) tMax = Math.min(tMax, (H - M - a[1]) / uy);
        if (uy < 0) tMax = Math.min(tMax, (M - a[1]) / uy);
        const t = Math.min(l * U, tMax);
        seg[1] = [a[0] + ux * t, a[1] + uy * t];
        redraw();
      },
    });

    $("#seg-move").addEventListener("click", () => {
      if (S.busy) return;
      const plans = active().map((s) => {
        const [p, q] = S.segs[s];
        const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        const h = [(q[0] - p[0]) / 2, (q[1] - p[1]) / 2];
        const rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
        for (let tries = 0; tries < 60; tries++) {
          const a = (Math.random() * 2 - 1) * Math.PI;
          const c = [M + 20 + Math.random() * (W - 2 * M - 40), M + 20 + Math.random() * (H - 2 * M - 40)];
          const r = rot(h, a);
          if (inside([c[0] + r[0], c[1] + r[1]]) && inside([c[0] - r[0], c[1] - r[1]])) return { s, m, h, a, c, rot };
        }
        return null;
      });
      S.busy = true;
      tween(1000, (u) => {
        plans.forEach((pl) => {
          if (!pl) return;
          const r = pl.rot(pl.h, pl.a * u);
          const c = [pl.m[0] + (pl.c[0] - pl.m[0]) * u, pl.m[1] + (pl.c[1] - pl.m[1]) * u];
          S.segs[pl.s] = [[c[0] - r[0], c[1] - r[1]], [c[0] + r[0], c[1] + r[1]]];
        });
        drawPlane(); drawSpace();
      }, () => { S.busy = false; redraw(); });
    });
    redraw();
  }

  /* ================= Part 1: lines through the origin ================= */
  function lines() {
    const pl = $("#lines-plane"), sp = $("#lines-space");
    if (!pl) return;
    let th = 0.62;
    const C = 150;
    const deg = (a) => Math.round((a * 180) / Math.PI);
    function draw() {
      const t = ((th % Math.PI) + Math.PI) % Math.PI;
      const ux = Math.cos(t), uy = -Math.sin(t);
      // the plane: faint grid lines and the two axes
      let o = "";
      for (let k = -4; k <= 4; k++) if (k) o += `<line class="grid-f" x1="${C + 32 * k}" y1="6" x2="${C + 32 * k}" y2="294"/><line class="grid-f" x1="6" y1="${C + 32 * k}" x2="294" y2="${C + 32 * k}"/>`;
      o += `<line class="axis-l" x1="6" y1="${C}" x2="294" y2="${C}"/><line class="axis-l" x1="${C}" y1="6" x2="${C}" y2="294"/>`;
      o += `<text class="lbl" x="288" y="${C - 7}" text-anchor="end">x</text><text class="lbl" x="${C + 8}" y="16">y</text>`;
      const r = 34, large = 0;
      if (t > 0.01) o += `<path d="M${C + r} ${C}A${r} ${r} 0 ${large} 0 ${num(C + r * ux)} ${num(C + r * uy)}" fill="none" stroke="var(--atom)" stroke-width="2"/>`;
      o += `<text class="lbl-m" x="${num(C + 50 * Math.cos(t / 2))}" y="${num(C - 50 * Math.sin(t / 2) + 5)}" text-anchor="middle">θ</text>`;
      o += `<line class="seg" x1="${num(C - 128 * ux)}" y1="${num(C - 128 * uy)}" x2="${num(C + 128 * ux)}" y2="${num(C + 128 * uy)}"/>`;
      o += `<circle cx="${C}" cy="${C}" r="4" fill="var(--ink)"/>`;
      o += `<circle class="handle" cx="${num(C + 110 * ux)}" cy="${num(C + 110 * uy)}" r="7"/>`;
      pl.innerHTML = o;
      const R = 92, a2 = 2 * t;
      let s = `<circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="var(--ink)" stroke-width="2.4"/>`;
      if (t > 0.005) s += `<path d="M${C + R} ${C}A${R} ${R} 0 ${a2 > Math.PI ? 1 : 0} 0 ${num(C + R * Math.cos(a2))} ${num(C - R * Math.sin(a2))}" fill="none" stroke="var(--mat)" stroke-width="5" stroke-opacity="0.35" stroke-linecap="round"/>`;
      [[0, "0 and π"], [Math.PI / 2, "π/4"], [Math.PI, "π/2"], [1.5 * Math.PI, "3π/4"]].forEach(([a, lab]) => {
        const x = C + R * Math.cos(a), y = C - R * Math.sin(a);
        s += `<line x1="${num(x - 6 * Math.cos(a))}" y1="${num(y + 6 * Math.sin(a))}" x2="${num(x + 6 * Math.cos(a))}" y2="${num(y - 6 * Math.sin(a))}" stroke="var(--muted)" stroke-width="1.4"/>`;
        const lx = C + (R - 22) * Math.cos(a), ly = C - (R - 22) * Math.sin(a);
        s += `<text class="lbl" x="${num(lx)}" y="${num(ly + 4)}" text-anchor="${a === 0 ? "end" : a === Math.PI ? "start" : "middle"}">${lab}</text>`;
      });
      s += `<circle class="pt-main" cx="${num(C + R * Math.cos(a2))}" cy="${num(C - R * Math.sin(a2))}" r="8"/>`;
      sp.innerHTML = s;
      $("#lines-read").textContent = `θ = ${deg(t)}°, so the point is at angle 2θ = ${deg(2 * t)}°`;
      pl.setAttribute("aria-valuenow", String(deg(t)));
      sp.setAttribute("aria-valuenow", String(deg(2 * t)));
    }
    drag(pl, { move: (p) => { th = Math.atan2(-(p[1] - C), p[0] - C); draw(); } });
    // on the circle, the point at angle 2θ is the line at angle θ
    drag(sp, { move: (p) => { const a = Math.atan2(-(p[1] - C), p[0] - C); th = (a < 0 ? a + 2 * Math.PI : a) / 2; draw(); } });
    const keys = (step) => (e) => {
      const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      th += (d * step * Math.PI) / 180;
      draw();
    };
    pl.addEventListener("keydown", keys(2));
    sp.addEventListener("keydown", keys(1));
    let stop = null;
    $("#lines-spin").addEventListener("click", () => {
      if (stop) stop();
      const t0 = ((th % Math.PI) + Math.PI) % Math.PI;
      stop = tween(2600, (u) => { th = t0 + Math.PI * u; if (u >= 1) th = t0; draw(); });
    });
    draw();
  }

  /* ================= Part 2: building a graph from the definition ================= */
  function buildGraph() {
    const svg = $("#build-svg"), box = $("#build-data"), stepsEl = $("#build-steps"), nextBtn = $("#build-next");
    if (!svg) return;
    const VX = [[130, 150], [262, 165], [362, 92]], VNM = ["v₁", "v₂", "v₃"], VLAB = [[126, 122], [252, 192], [384, 112]];
    const WT = [0, 0, 1];
    // half-edges a–i: {a, b} a loop at v₁, {c, d} an edge v₁–v₂, {e, f} an edge v₂–v₃, and legs g, h, i at v₁, v₂, v₃
    const NM = "abcdefghi", ROOT = [0, 0, 0, 1, 1, 2, 0, 1, 2], LEGEND = { 6: [84, 236], 7: [286, 250], 8: [402, 30] };
    const GROUP = [0, 0, 1, 1, 2, 2, -1, -1, -1]; // which edge each half belongs to, -1 for legs
    const NP = 13;
    const lerp2 = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    const mid = (a, b) => lerp2(VX[a], VX[b], 0.5);
    const loop = (() => { const v = VX[0], L = 100, c = Math.PI + 0.32, sp = 0.6; return [v, [v[0] + L * Math.cos(c - sp), v[1] + L * Math.sin(c - sp)], [v[0] + L * Math.cos(c + sp), v[1] + L * Math.sin(c + sp)], v]; })();
    const bez = (t) => { const u = 1 - t; return [0, 1].map((k) => u * u * u * loop[0][k] + 3 * u * u * t * loop[1][k] + 3 * u * t * t * loop[2][k] + t * t * t * loop[3][k]); };
    // the finished picture: each half-edge runs from its root outwards
    const final = (i, t) => {
      if (i === 0) return bez(t / 2);
      if (i === 1) return bez(1 - t / 2);
      if (i === 2) return lerp2(VX[0], mid(0, 1), t);
      if (i === 3) return lerp2(VX[1], mid(0, 1), t);
      if (i === 4) return lerp2(VX[1], mid(1, 2), t);
      if (i === 5) return lerp2(VX[2], mid(1, 2), t);
      return lerp2(VX[ROOT[i]], LEGEND[i], t);
    };
    // before the involution, each half-edge is a short stub of its final curve
    const STUB = 46;
    const frac = NM.split("").map((_, i) => { let L = 0, p = final(i, 0); for (let j = 1; j <= 40; j++) { const q = final(i, j / 40); L += Math.hypot(q[0] - p[0], q[1] - p[1]); p = q; } return Math.min(1, STUB / L); });
    // floating, before the root map
    const FLOAT = [[52, 52, 25], [150, 48, -40], [222, 70, 75], [300, 38, 10], [404, 190, 100], [330, 252, -20], [196, 238, 40], [62, 262, -60], [34, 160, 85]];
    const shape = (step, i) => [...Array(NP).keys()].map((j) => {
      const t = j / (NP - 1);
      if (step <= 2) { const [x, y, a] = FLOAT[i], r = (a * Math.PI) / 180; return [x + (t - 0.5) * STUB * Math.cos(r), y + (t - 0.5) * STUB * Math.sin(r)]; }
      if (step === 3) return final(i, t * frac[i]);
      return final(i, t);
    });
    const STEPS = ["Vertices", "Half-edges", "Root map", "Involution", "Edges, loops, legs", "Decorations"];
    const NEXT = ["Reveal the vertices", "Next: half-edges", "Next: the root map", "Next: the involution", "Next: edges, loops and legs", "Next: the decorations", "Start over"];
    const TEXT = [
      "Start with nothing, and add the ingredients of the definition one at a time.",
      "A finite set <em class=\"m\">V</em> of vertices. So far there is nothing else.",
      "A finite set <em class=\"m\">H</em> of half-edges. For the moment they float around, attached to nothing.",
      "The root map <em class=\"m\">r</em> : <em class=\"m\">H</em> → <em class=\"m\">V</em> attaches each half-edge to a vertex.",
      "The involution ι pairs up some of the half-edges. If ι(<em class=\"m\">h</em>) ≠ <em class=\"m\">h</em>, then <em class=\"m\">h</em> and ι(<em class=\"m\">h</em>) join into one edge. If ι(<em class=\"m\">h</em>) = <em class=\"m\">h</em>, then <em class=\"m\">h</em> stays on its own.",
      "Now read off the pieces. Each pair {<em class=\"m\">h</em>, ι(<em class=\"m\">h</em>)} is an <b>edge</b>, and an edge whose two halves have the same root is a <b>loop</b>. The half-edges fixed by ι are the <b>legs</b>.",
      "Finally, the two decorations. The marking <em class=\"m\">m</em> numbers the legs, and the weight <em class=\"m\">w</em> gives each vertex a number. Here <em class=\"m\">v</em><sub>3</sub> has weight 1, drawn inside it, and the others have weight 0.",
    ];
    const KIND = (i) => (GROUP[i] < 0 ? "leg" : GROUP[i] === 0 ? "loop" : "edge");
    let cur = 0, stop = null;

    function draw(from, to, u) {
      const vis = (st, what) => (what === "v" ? st >= 1 : st >= 2) ? 1 : 0;
      const op = (what) => num(vis(from, what) + (vis(to, what) - vis(from, what)) * u);
      const A = (i) => shape(vis(from, "h") ? from : to, i), B = (i) => shape(vis(to, "h") ? to : from, i);
      let o = "";
      const hOp = op("h"), vOp = op("v");
      for (let i = 0; i < 9; i++) {
        const P = A(i).map((p, j) => lerp2(p, B(i)[j], u));
        const col = to >= 4 ? (GROUP[i] < 0 ? "var(--muted)" : pal(GROUP[i])) : "var(--ink)";
        const kindOn = to === 5;
        o += `<path d="${P.map((p, j) => (j ? "L" : "M") + num(p[0]) + " " + num(p[1])).join("")}" fill="none" stroke="${col}" stroke-width="${kindOn ? 3.6 : 2.8}" stroke-linecap="round" opacity="${hOp}"/>`;
        if (to >= 4 && GROUP[i] < 0) { const e = P[NP - 1]; o += `<circle cx="${num(e[0])}" cy="${num(e[1])}" r="2.4" fill="var(--muted)" opacity="${num(u)}"/>`; }
      }
      // vertices, and their weights once the decorations are in
      VX.forEach(([x, y], v) => {
        const wtd = to >= 6 && WT[v] > 0;
        o += wtd
          ? `<g opacity="${vOp}"><circle cx="${x}" cy="${y}" r="12" fill="var(--panel)"/><circle cx="${x}" cy="${y}" r="12" fill="var(--gen-soft)" stroke="var(--gen)" stroke-width="1.5"/><text x="${x}" y="${y}" font-size="13" text-anchor="middle" dominant-baseline="central" fill="var(--gen)" font-family="var(--mono)" font-weight="500">${WT[v]}</text></g>`
          : `<circle cx="${x}" cy="${y}" r="5.5" fill="var(--ink)" opacity="${vOp}"/>`;
        o += `<text x="${VLAB[v][0]}" y="${VLAB[v][1]}" font-size="17" text-anchor="middle" dominant-baseline="central" fill="var(--atom)" font-family="var(--display)" font-style="italic" opacity="${vOp}">${VNM[v]}</text>`;
      });
      // what the pieces are called
      if (to === 5) {
        const ann = [["loop", 30, 118, pal(0)], ["edge", 196, 140, pal(1)], ["edge", 330, 150, pal(2)], ["leg", 66, 210, "var(--muted)"], ["leg", 306, 222, "var(--muted)"], ["leg", 350, 34, "var(--muted)"]];
        ann.forEach(([t, x, y, c]) => { o += `<text class="ann" x="${x}" y="${y}" fill="${c}" opacity="${num(u)}">${t}</text>`; });
      }
      // leg numbers
      if (to >= 6) [6, 7, 8].forEach((i, k) => {
        const e = LEGEND[i], r = VX[ROOT[i]], dx = e[0] - r[0], dy = e[1] - r[1], L = Math.hypot(dx, dy);
        o += `<text x="${num(e[0] + (dx / L) * 12)}" y="${num(e[1] + (dy / L) * 12)}" font-size="13" text-anchor="middle" dominant-baseline="central" fill="var(--muted)" font-family="var(--mono)" opacity="${num(u)}">${k + 1}</text>`;
      });
      // the letters
      for (let i = 0; i < 9; i++) {
        const k = Math.round((NP - 1) * 0.62), p = lerp2(A(i)[k], B(i)[k], u);
        o += `<g class="hl" opacity="${hOp}"><circle cx="${num(p[0])}" cy="${num(p[1])}" r="9.5"/><text x="${num(p[0])}" y="${num(p[1])}" text-anchor="middle" dominant-baseline="central">${NM[i]}</text></g>`;
      }
      svg.innerHTML = o;
    }

    function panel() {
      const s = cur, at = (k, html) => (s >= k ? `<div class="${s === k ? "new" : ""}">${html}</div>` : "");
      const rt = `<div class="rscroll"><table class="rtable"><tr><th>h</th>${NM.split("").map((h) => `<th>${h}</th>`).join("")}</tr><tr><th>r(h)</th>${ROOT.map((v) => `<td class="v">${VNM[v]}</td>`).join("")}</tr></table></div>`;
      const w = (t, c) => `<b style="color:${c}">${t}</b>`;
      box.innerHTML = `<p class="note">${TEXT[s]}</p>
        <dl>
          ${at(1, `<dt>V</dt><dd>{v₁, v₂, v₃}</dd>`)}
          ${at(2, `<dt>H</dt><dd>{a, b, c, d, e, f, g, h, i}</dd>`)}
          ${at(3, `<dt>r</dt><dd>${rt}</dd>`)}
          ${at(4, `<dt>ι</dt><dd>(a b)(c d)(e f), and fixes g, h, i</dd>`)}
          ${at(5, `<dt>pieces</dt><dd>${w("loop", pal(0))} {a, b} at v₁ · ${w("edges", pal(1))} {c, d} from v₁ to v₂ and {e, f} from v₂ to v₃ · ${w("legs", "var(--muted)")} g, h, i</dd>`)}
          ${at(6, `<dt>m</dt><dd>g ↦ 1, h ↦ 2, i ↦ 3</dd><dt>w</dt><dd>v₁ ↦ 0, v₂ ↦ 0, v₃ ↦ 1</dd>`)}
        </dl>`;
      stepsEl.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.s === s)));
      nextBtn.textContent = NEXT[s];
    }
    function go(to) {
      if (stop) stop();
      const from = cur;
      cur = to;
      panel();
      stop = tween(to > from ? 750 : 350, (u) => draw(from, to, u));
    }
    stepsEl.innerHTML = STEPS.map((t, k) => `<button type="button" class="segbtn" data-s="${k + 1}" aria-pressed="false">${k + 1}. ${t}</button>`).join("");
    stepsEl.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) go(+b.dataset.s); });
    nextBtn.addEventListener("click", () => go(cur >= 6 ? 0 : cur + 1));
    panel();
    draw(0, 0, 1);
  }

  /* ================= Part 2: the proof, with the reason for each step ================= */
  function derivations() {
    // delegated, so it also works in the copies made for presentation mode
    const set = (d, k) => {
      d.querySelectorAll("[data-k]").forEach((x) => x.classList.toggle("on", x.dataset.k === k));
      const src = k && d.querySelector(`[data-k="${k}"][data-why]`);
      d.querySelector(".why").innerHTML = src ? src.dataset.why : d.dataset.default;
    };
    const on = (e) => { const t = e.target.closest && e.target.closest(".derive [data-k]"); if (t) set(t.closest(".derive"), t.dataset.k); };
    document.addEventListener("pointerover", on);
    document.addEventListener("focusin", on);
    document.addEventListener("click", on);
  }

  /* ================= Part 2: half-edge anatomy ================= */
  const LET = "abcdefghijklmnopqrstuvwxyz";
  function vname(k, v) { return k === 1 ? "v" : "v" + SUB[v + 1]; }
  function freeDir(P, v, dirsFrom) {
    const V = P[v];
    const dirs = dirsFrom.map((p) => Math.atan2(p[1] - V[1], p[0] - V[0]));
    if (!dirs.length) return [0, -1];
    let best = -Math.PI / 2, score = -1;
    for (let c = 0; c < 48; c++) {
      const a = (c / 48) * 2 * Math.PI - Math.PI;
      const clear = Math.min(...dirs.map((d) => Math.abs(((d - a) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI)));
      if (clear > score + 1e-6) { score = clear; best = a; }
    }
    return [Math.cos(best), Math.sin(best)];
  }
  function anatomy() {
    const svg = $("#anat-svg"), box = $("#anat-data");
    if (!svg) return;
    const EX = [
      { name: "Loop and leg", G: mk([0], [0], [[0, 0]]) },
      { name: "Parallel edges", G: mk([0, 0], [0, 1], [[0, 1], [0, 1]]) },
      { name: "A weighted vertex", G: mk([1, 0], [0, 1, 1], [[0, 1]]) },
      { name: "Theta", G: mk([0, 0], [], [[0, 1], [0, 1], [0, 1]]) },
    ];
    const S = { ex: 0, gap: 0, split: false, aut: -1, stopA: null };
    $("#anat-pick").innerHTML = EX.map((x, i) => `<button type="button" class="segbtn" data-i="${i}" aria-pressed="${i === 0}">${x.name}</button>`).join("");
    const G = () => EX[S.ex].G;
    // our letters: edge e has halves 2e (at its first vertex) and 2e+1; legs come after the edges
    const idxOfH = (G, h) => { const n = G.legs.length; if (h <= n) return 2 * G.edges.length + h - 1; const e = Math.floor((h - n - 1) / 2); return 2 * e + ((h - n - 1) % 2); };
    let geomCache = null;
    function geom() {
      const g = G();
      if (geomCache && geomCache.g === g) return geomCache;
      geomCache = Object.assign({ g }, MD.screenPositions(g, { w: 360, h: 250, pad: 42 }));
      return geomCache;
    }
    function anchor(i) {
      const g = G(), E = g.edges.length, { P, geo } = geom();
      const k = g.w.length, gap = S.gap;
      if (i >= 2 * E) {
        const leg = i - 2 * E, V = P[g.legs[leg]], T = P[k + leg];
        const p = [V[0] + (T[0] - V[0]) * 0.55, V[1] + (T[1] - V[1]) * 0.55];
        const dx = T[0] - V[0], dy = T[1] - V[1], L = Math.hypot(dx, dy) || 1;
        return [p[0] - (dy / L) * 13, p[1] + (dx / L) * 13];
      }
      const e = Math.floor(i / 2), half = i % 2;
      return MD.along(geo[e], half ? 0.76 + gap / 2 : 0.24 - gap / 2);
    }
    /* the picture moves along a gentle arc from where things are to where they go */
    const bendTo = (p, q, s) => {
      const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1, bend = 0.28 * L * 4 * s * (1 - s);
      return [p[0] + dx * s - (dy / L) * bend, p[1] + dy * s + (dx / L) * bend];
    };
    /* points along the half-edge slot i (our numbering), from its root to the middle of its edge */
    function halfPts(i) {
      const { geo } = geom(), e = Math.floor(i / 2), half = i % 2, pts = [];
      const t0 = half ? 1 : 0, t1 = half ? 0.5 + S.gap : 0.5 - S.gap;
      for (let j = 0; j <= 20; j++) pts.push(MD.along(geo[e], t0 + ((t1 - t0) * j) / 20));
      return pts;
    }
    const ident = (m) => [...Array(m).keys()];
    /* S.pos[i] is the slot where half-edge i is drawn now, S.vpos[v] the slot of vertex v. They start
       as the identity, and each automorphism clicked moves whatever sits in slot p to slot σ(p). */
    function resetPos() { const g = G(); S.pos = ident(2 * g.edges.length + g.legs.length); S.vpos = ident(g.w.length); }
    resetPos();
    /* anim = { h0, h1, v0, v1, s }: draw everything part way from the slots h0, v0 to h1, v1 */
    function draw(anim) {
      const g = G(), E = g.edges.length, k = g.w.length;
      const { P, geo } = geom();
      const s = anim ? anim.s : 1;
      const h0 = anim ? anim.h0 : S.pos, h1 = anim ? anim.h1 : S.pos, v0 = anim ? anim.v0 : S.vpos, v1 = anim ? anim.v1 : S.vpos;
      let o = "";
      // legs (fixed by every automorphism: their labels must be kept)
      g.legs.forEach((v, i) => {
        const V = P[v], T = P[k + i];
        const dx = T[0] - V[0], dy = T[1] - V[1], L = Math.hypot(dx, dy) || 1;
        o += `<line x1="${num(V[0])}" y1="${num(V[1])}" x2="${num(T[0])}" y2="${num(T[1])}" stroke="var(--muted)" stroke-width="2.2"/>`;
        o += `<circle cx="${num(T[0])}" cy="${num(T[1])}" r="2.4" fill="var(--muted)"/>`;
        o += `<text x="${num(T[0] + (dx / L) * 11)}" y="${num(T[1] + (dy / L) * 11)}" font-size="13" text-anchor="middle" dominant-baseline="central" fill="var(--muted)" font-family="var(--mono)">${i + 1}</text>`;
      });
      // the ι connectors between the two halves of each edge, when they are pulled apart
      if (S.gap > 0.012) g.edges.forEach((uv, e) => {
        const gm = geo[e];
        const A = MD.along(gm, 0.5 - S.gap), B = MD.along(gm, 0.5 + S.gap), mid = MD.along(gm, 0.5);
        const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
        let nx = -dy / L, ny = dx / L;
        const ref = P[uv[0]];
        if ((mid[0] + nx - ref[0]) ** 2 + (mid[1] + ny - ref[1]) ** 2 < (mid[0] - nx - ref[0]) ** 2 + (mid[1] - ny - ref[1]) ** 2) { nx = -nx; ny = -ny; }
        const bow = 20 * (S.gap / 0.12);
        const c = [mid[0] + nx * bow, mid[1] + ny * bow];
        o += `<path d="M${num(A[0])} ${num(A[1])}Q${num(c[0])} ${num(c[1])} ${num(B[0])} ${num(B[1])}" fill="none" stroke="var(--muted)" stroke-width="1.2" stroke-dasharray="3 3"/>`;
        o += `<text x="${num(mid[0] + nx * (bow * 0.5 + 9))}" y="${num(mid[1] + ny * (bow * 0.5 + 9))}" font-size="14" text-anchor="middle" dominant-baseline="central" fill="var(--muted)" font-family="var(--display)" font-style="italic" opacity="${Math.min(1, S.gap / 0.06)}">ι</text>`;
      });
      // the half-edges, each in its own colour, travelling from slot h0[i] to slot h1[i]
      for (let i = 0; i < 2 * E; i++) {
        const A = halfPts(h0[i]), B = h1[i] === h0[i] ? A : halfPts(h1[i]);
        const d = A.map((p, j) => { const r = bendTo(p, B[j], s); return (j ? "L" : "M") + num(r[0]) + " " + num(r[1]); }).join("");
        o += `<path class="hp" d="${d}" fill="none" stroke="${pal(Math.floor(i / 2))}" stroke-width="2.8" stroke-linecap="round"/>`;
      }
      // vertices and their names travel with them
      const namePos = (slot, r) => {
        const near = [], [x, y] = P[slot];
        g.legs.forEach((lv, i) => { if (lv === slot) near.push(P[k + i]); });
        g.edges.forEach(([a, b], e) => { if (a === slot) near.push(MD.along(geo[e], 0.12)); if (b === slot) near.push(MD.along(geo[e], 0.88)); });
        const [ux, uy] = freeDir(P, slot, near);
        return [x + ux * (r + 11), y + uy * (r + 11)];
      };
      g.w.forEach((w, v) => {
        const [x, y] = bendTo(P[v0[v]], P[v1[v]], s);
        const r = w > 0 ? 12 : 5.5;
        if (w > 0) o += `<circle cx="${num(x)}" cy="${num(y)}" r="${r}" fill="var(--panel)"/><circle cx="${num(x)}" cy="${num(y)}" r="${r}" fill="var(--gen-soft)" stroke="var(--gen)" stroke-width="1.5"/><text x="${num(x)}" y="${num(y)}" font-size="13" text-anchor="middle" dominant-baseline="central" fill="var(--gen)" font-family="var(--mono)" font-weight="500">${w}</text>`;
        else o += `<circle cx="${num(x)}" cy="${num(y)}" r="${r}" fill="var(--ink)"/>`;
        const [nx, ny] = bendTo(namePos(v0[v], r), namePos(v1[v], r), s);
        o += `<text x="${num(nx)}" y="${num(ny)}" font-size="17" text-anchor="middle" dominant-baseline="central" fill="var(--atom)" font-family="var(--display)" font-style="italic">${vname(k, v)}</text>`;
      });
      // letters
      for (let i = 0; i < 2 * E + g.legs.length; i++) {
        const [x, y] = bendTo(anchor(h0[i]), anchor(h1[i]), s);
        o += `<g class="hl" data-i="${i}"><circle cx="${num(x)}" cy="${num(y)}" r="9.5"/><text x="${num(x)}" y="${num(y)}" text-anchor="middle" dominant-baseline="central">${LET[i]}</text></g>`;
      }
      svg.innerHTML = o;
    }
    function data() {
      const g = G(), E = g.edges.length, k = g.w.length, n = g.legs.length;
      const Hn = 2 * E + n;
      const rootOf = (i) => (i >= 2 * E ? g.legs[i - 2 * E] : g.edges[Math.floor(i / 2)][i % 2]);
      const val = MG.valence(g);
      const gg = MG.genus(g);
      const aut = MG.autInfo(g);
      const iota = g.edges.map((_, e) => `(${LET[2 * e]} ${LET[2 * e + 1]})`).join("");
      const legsTxt = n ? g.legs.map((_, i) => LET[2 * E + i]).join(", ") : "";
      let rt = `<div class="rscroll"><table class="rtable"><tr><th>h</th>${[...Array(Hn).keys()].map((i) => `<th>${LET[i]}</th>`).join("")}</tr><tr><th>r(h)</th>${[...Array(Hn).keys()].map((i) => `<td class="v">${vname(k, rootOf(i))}</td>`).join("")}</tr></table></div>`;
      const stab = g.w.map((w, v) => { const x = 2 * w - 2 + val[v]; return `<div>${vname(k, v)}: 2·${w} − 2 + ${val[v]} = ${x} <span class="${x > 0 ? "ok" : "bad"}">${x > 0 ? "&gt; 0 ✓" : "✗"}</span></div>`; }).join("");
      S.chips = aut.autos.map((a, j) => {
        const img = []; // our index -> our index
        for (let h = 1; h < a.h.length; h++) img[idxOfH(g, h)] = idxOfH(g, a.h[h]);
        return { j, img, sigma: a.sigma.slice(), label: cycles(img) };
      });
      box.innerHTML = `
        <div class="tags"><span class="tag s">|Aut| = ${aut.order}</span></div>
        <dl>
          <dt>V</dt><dd>{${g.w.map((_, v) => vname(k, v)).join(", ")}}</dd>
          <dt>H</dt><dd>{${[...Array(Hn).keys()].map((i) => LET[i]).join(", ")}}</dd>
          <dt>ι</dt><dd>${iota}${n ? `, fixes ${legsTxt}` : ""}</dd>
          <dt>m</dt><dd>${n ? g.legs.map((_, i) => `${LET[2 * E + i]} ↦ ${i + 1}`).join(", ") : "no legs"}</dd>
          <dt>w</dt><dd>${g.w.map((w, v) => `${vname(k, v)} ↦ ${w}`).join(", ")}</dd>
        </dl>
        ${rt}
        <div><h4>Stability</h4>${stab}</div>
        <div class="calc">g = (|<i>E</i>| − |<i>V</i>| + 1) + ∑<i>w</i> = (${E} − ${k} + 1) + ${MG.sumW(g)} = ${gg}</div>
        <div class="aut"><h4>Automorphisms</h4><div class="aut-list" id="anat-auts">${S.chips.map((c) => `<button type="button" class="chip" data-j="${c.j}" aria-pressed="${c.j === S.aut}">${c.label}</button>`).join("")}</div><div class="aut-now" id="anat-now">${autNow()}</div></div>`;
      $("#anat-auts").addEventListener("click", (e) => {
        const c = e.target.closest(".chip");
        if (!c) return;
        S.aut = +c.dataset.j;
        box.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", String(+x.dataset.j === S.aut)));
        play(S.chips[S.aut]);
      });
    }
    /* cycle notation for a permutation of our half-edge indices */
    function cycles(img) {
      const seen = new Set(), cyc = [];
      for (let i = 0; i < img.length; i++) {
        if (seen.has(i)) continue;
        const c = []; let x = i;
        while (!seen.has(x)) { seen.add(x); c.push(LET[x]); x = img[x]; }
        if (c.length > 1) cyc.push("(" + c.join(" ") + ")");
      }
      return cyc.length ? cyc.join("") : "id";
    }
    function autNow() {
      const moved = S.pos.some((p, i) => p !== i) || S.vpos.some((p, v) => p !== v);
      const back = moved ? ` <button type="button" class="btn-quiet" id="anat-back">Put the labels back</button>` : "";
      const sofar = moved ? `<div class="sofar">Everything applied so far, in total: <b>${cycles(S.pos)}</b>.${back}</div>` : "";
      if (S.aut < 0 || !S.chips) return `Click a permutation to apply it.${sofar}`;
      const c = S.chips[S.aut];
      if (c.label === "id") return `The identity fixes every half-edge.${sofar}`;
      const g = G(), E = g.edges.length;
      const out = [];
      for (let e = 0; e < E; e++) {
        const t = Math.floor(c.img[2 * e] / 2);
        if (t !== e) out.push(`{${LET[2 * e]}, ${LET[2 * e + 1]}} ↦ {${LET[2 * t]}, ${LET[2 * t + 1]}}`);
      }
      return `<div><b>${c.label}</b>. ${out.length ? "On edges: " + out.join(", ") + "." : "Every edge goes to itself, so no edge length can change."}</div>${sofar}`;
    }
    /* apply the automorphism c to the picture as it is now (or, with c null, go back to the start) */
    function play(c) {
      if (S.stopA) S.stopA();
      const g = G();
      const anim = { h0: S.pos.slice(), v0: S.vpos.slice(), s: 0 };
      anim.h1 = c ? anim.h0.map((p) => c.img[p]) : ident(anim.h0.length);
      anim.v1 = c ? anim.v0.map((p) => c.sigma[p]) : ident(g.w.length);
      if (!c) { S.aut = -1; box.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", "false")); }
      S.pos = anim.h1; S.vpos = anim.v1;
      $("#anat-now").innerHTML = autNow();
      S.stopA = tween(1400, (u) => { anim.s = u; draw(anim); });
    }
    $("#anat-pick").addEventListener("click", (e) => {
      const b = e.target.closest(".segbtn");
      if (!b) return;
      S.ex = +b.dataset.i; S.aut = -1;
      if (S.stopA) S.stopA();
      resetPos();
      $("#anat-pick").querySelectorAll(".segbtn").forEach((x) => x.setAttribute("aria-pressed", String(+x.dataset.i === S.ex)));
      draw(); data();
    });
    box.addEventListener("click", (e) => { if (e.target.closest("#anat-back")) play(null); });
    const splitBtn = $("#anat-split");
    splitBtn.addEventListener("click", () => {
      S.split = !S.split;
      splitBtn.setAttribute("aria-pressed", String(S.split));
      splitBtn.textContent = S.split ? "Glue them back together" : "Pull the half-edges apart";
      if (S.stopA) S.stopA();
      const g0 = S.gap, g1 = S.split ? 0.12 : 0;
      tween(500, (u) => { S.gap = g0 + (g1 - g0) * u; draw(); });
    });
    draw(); data();
  }

  /* ================= Part 2: the stability table ================= */
  /* the local picture at a vertex: a vertex of weight w with v half-edges, as svg markup
     centred at (cx, cy) with spokes of length L */
  function localPicture(w, v, cx, cy, L, r) {
    let o = "";
    for (let i = 0; i < v; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(v, 1) + (v === 2 ? Math.PI / 2 : 0);
      o += `<line x1="${cx}" y1="${cy}" x2="${num(cx + L * Math.cos(a))}" y2="${num(cy + L * Math.sin(a))}" stroke="var(--ink)" stroke-width="${num(L / 13)}" stroke-linecap="round"/>`;
    }
    o += w > 0
      ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--panel)"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--gen-soft)" stroke="var(--gen)" stroke-width="1.3"/><text x="${cx}" y="${cy}" font-size="${num(r * 1.1)}" text-anchor="middle" dominant-baseline="central" fill="var(--gen)" font-family="var(--mono)" font-weight="500">${w}</text>`
      : `<circle cx="${cx}" cy="${cy}" r="${num(r * 0.45)}" fill="var(--ink)"/>`;
    return o;
  }
  function stability() {
    const t = $("#stab-table"), read = $("#stab-read");
    if (!t) return;
    const NOTE = {
      "0,0": "A lone unweighted vertex: nothing at all.",
      "0,1": "A leaf: the loose end of an edge.",
      "0,2": "A vertex in the middle of an edge. Erasing it changes nothing.",
      "1,0": "A lone vertex of weight 1: genus 1 with no legs, which is excluded.",
      "0,3": "The smallest stable unweighted vertex: three half-edges.",
      "1,1": "Weight 1 needs only one half-edge.",
      "2,0": "Weight 2 is stable even with nothing attached.",
    };
    let h = `<thead><tr><th class="corner"><i>w</i> \\ |<i>r</i><sup>−1</sup>(<i>v</i>)|</th>${[0, 1, 2, 3, 4, 5].map((v) => `<th>${v}</th>`).join("")}</tr></thead><tbody>`;
    for (let w = 0; w <= 3; w++) {
      h += `<tr><th>${w}</th>`;
      for (let v = 0; v <= 5; v++) {
        const x = 2 * w - 2 + v;
        h += `<td><button type="button" class="${x > 0 ? "ok" : "bad"}" data-w="${w}" data-v="${v}" aria-label="weight ${w}, ${v} half-edges: ${x > 0 ? "stable" : "not stable"}"><svg viewBox="0 0 56 44" aria-hidden="true">${localPicture(w, v, 28, 22, 16, 8)}</svg></button></td>`;
      }
      h += `</tr>`;
    }
    t.innerHTML = h + "</tbody>";
    function show(w, v) {
      const x = 2 * w - 2 + v;
      t.querySelectorAll("button[data-w]").forEach((b) => b.classList.toggle("cur", +b.dataset.w === w && +b.dataset.v === v));
      read.innerHTML = `<svg viewBox="0 0 120 80" aria-hidden="true">${localPicture(w, v, 60, 40, 30, 11)}</svg><div><b>w = ${w}, ${v} ${v === 1 ? "half-edge" : "half-edges"}:</b> 2·${w} − 2 + ${v} = ${signed(x)}. <span class="${x > 0 ? "ok" : "bad"}">${x > 0 ? "Stable." : "Not stable."}</span></div>${NOTE[w + "," + v] ? `<div>${NOTE[w + "," + v]}</div>` : ""}`;
    }
    const pick = (e) => { const b = e.target.closest("button[data-w]"); if (b) show(+b.dataset.w, +b.dataset.v); };
    t.addEventListener("pointerover", pick);
    t.addEventListener("focusin", pick);
    t.addEventListener("click", pick);
    show(0, 2);
  }

  /* ================= Part 2: quiz, stable or not ================= */
  function quiz() {
    const box = $("#quiz"), score = $("#quiz-score");
    if (!box) return;
    const Q = [
      mk([0, 0], [0, 0], [[0, 1]]), // a leaf
      mk([0, 0], [], [[0, 1], [0, 1], [0, 1]]), // theta
      mk([0, 0], [0], [[0, 1], [0, 1]]), // a bare vertex in the middle of an edge
      mk([1, 0], [1, 1], [[0, 1]]), // weight 1 on a bridge
      mk([0, 0], [], [[0, 0], [0, 1], [1, 1]]), // dumbbell
      mk([0], [], [[0, 0]]), // a loop and nothing else
    ];
    const ans = Q.map(() => null);
    const val = Q.map((G) => MG.valence(G)), ex = Q.map((G) => MG.excess(G));
    const stable = Q.map((_, i) => ex[i].every((x) => x > 0));
    function why(i) {
      const G = Q[i];
      if (stable[i]) return "Stable: every vertex has 2<i>w</i> − 2 + |<i>r</i><sup>−1</sup>| &gt; 0.";
      const v = ex[i].findIndex((x) => x <= 0), w = G.w[v], k = val[i][v];
      return `Not stable: the red vertex has weight ${w} and ${k} ${k === 1 ? "half-edge" : "half-edges"}, and 2·${w} − 2 + ${k} = ${signed(ex[i][v])}.`;
    }
    function render() {
      box.innerHTML = Q.map((G, i) => {
        const a = ans[i], done = a !== null, right = done && a === stable[i];
        return `<div class="qcard${done ? (right ? " right" : " wrong") : ""}" data-i="${i}">
          <div class="qpic">${MD.graphSvg(G, { w: 150, h: 96, pad: 18, font: 11, dot: 4, strokeW: 2.2, label: "Graph " + (i + 1) })}</div>
          <div class="qbtns" role="group" aria-label="Graph ${i + 1}: stable or not?">
            <button type="button" class="segbtn" data-a="1" aria-pressed="${a === true}">Stable</button>
            <button type="button" class="segbtn" data-a="0" aria-pressed="${a === false}">Not stable</button>
          </div>
          <div class="qwhy">${done ? `<b>${right ? "Right." : "Not quite."}</b> ${why(i)}` : ""}</div>
        </div>`;
      }).join("");
      // colour the failing vertices once a graph has been answered
      box.querySelectorAll(".qcard").forEach((c) => {
        const i = +c.dataset.i;
        if (ans[i] === null) return;
        c.querySelectorAll(".vtx").forEach((el) => {
          if (ex[i][+el.dataset.v] > 0) return;
          if (Q[i].w[+el.dataset.v] > 0) el.setAttribute("stroke", "var(--nm)");
          else { el.setAttribute("fill", "var(--nm)"); el.setAttribute("r", "5.5"); }
        });
      });
      const n = ans.filter((a) => a !== null).length, ok = ans.filter((a, i) => a === stable[i]).length;
      score.textContent = n ? `${ok} of ${n} right${n === Q.length ? (ok === n ? ". All correct!" : "") : ""}` : "";
    }
    box.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-a]");
      if (!b) return;
      ans[+b.closest(".qcard").dataset.i] = b.dataset.a === "1";
      render();
    });
    $("#quiz-reset").addEventListener("click", () => { ans.fill(null); render(); });
    render();
  }

  /* ================= Part 2: contraction ================= */
  function contraction() {
    const fig = $("#con-svg"), box = $("#con-data"), hist = $("#con-hist");
    if (!fig) return;
    const STARTS = [
      { name: "Genus 2, two legs", G: mk([0, 0, 0], [1, 2], [[0, 0], [0, 1], [1, 2], [1, 2]]) },
      { name: "Theta", G: mk([0, 0], [], [[0, 1], [0, 1], [0, 1]]) },
      { name: "Five-leg caterpillar", G: mk([0, 0, 0], [0, 0, 1, 2, 2], [[0, 1], [1, 2]]) },
    ];
    const S = { start: 0, steps: [], cur: 0, busy: false, stop: null };
    // the big picture is a metric drawing with every edge of length 1, so that an edge can shrink
    // continuously to length 0 and the rest of the graph can follow it
    let view = new MD.MetricView();
    const VOPT = { w: 400, h: 260, pad: 36, font: 13, dot: 6, strokeW: 2.8, total: 2.4, minBulge: 0.3 };
    const ones = (G) => G.edges.map(() => 1);
    function picture(G, lengths, col, hit, shrinking) {
      const r = view.draw(G, lengths, Object.assign({}, VOPT, { hit, label: hit ? "A stable graph. Click an edge to contract it." : "An edge shrinking to length 0" }));
      fig.innerHTML = r.svg;
      paint(fig, { G: r.H, col }); // r.H is the graph drawn: G with its length-0 edges contracted
      if (shrinking != null) fig.querySelector(`.edge-path[data-e="${shrinking}"]`)?.classList.add("hover");
    }
    $("#con-pick").innerHTML = STARTS.map((x, i) => `<button type="button" class="segbtn" data-i="${i}" aria-pressed="${i === 0}">${x.name}</button>`).join("");
    const reset = () => { const G = STARTS[S.start].G; S.steps = [{ G, col: G.w.map((_, v) => v), msg: "" }]; S.cur = 0; render(true); };
    const vcol = (c) => pal(c);
    function paint(svgRoot, st) {
      svgRoot.querySelectorAll(".vtx").forEach((c) => {
        const v = +c.dataset.v, col = vcol(st.col[v]);
        if (st.G.w[v] > 0) { c.setAttribute("stroke", col); c.setAttribute("stroke-width", "2"); }
        else c.setAttribute("fill", col);
      });
    }
    /* fresh: lay the picture out from scratch (after a jump), rather than carrying it on */
    function render(fresh) {
      if (S.stop) { S.stop(); S.stop = null; }
      S.busy = false;
      const st = S.steps[S.cur], G = st.G;
      const E = G.edges.length, V = G.w.length, n = G.legs.length, g = MG.genus(G);
      if (fresh) view = new MD.MetricView();
      picture(G, ones(G), st.col, E > 0);
      box.innerHTML = `
        <div class="tags"><span class="tag s">genus ${g}</span><span class="tag s">${n} ${n === 1 ? "leg" : "legs"}</span><span class="tag">|V| = ${V}</span><span class="tag">|E| = ${E}</span></div>
        <div class="calc">g = (|<i>E</i>| − |<i>V</i>| + 1) + ∑<i>w</i> = (${E} − ${V} + 1) + ${MG.sumW(G)} = ${g}</div>
        ${MD.stabilityHtml(G, { name: (v) => (V === 1 ? "v" : "v" + SUB[v + 1]), swatch: (v) => vcol(st.col[v]) })}
        ${st.msg ? `<div class="move">${st.msg}</div>` : `<p class="note">${E ? "Click an edge to contract it." : ""}</p>`}
        ${E === 0 ? `<p class="note">No edges left: this is the single vertex of weight ${g}${n ? ` with all ${n} legs` : ""}, the bottom of the poset.</p>` : ""}`;
      hist.innerHTML = S.steps.map((s, i) => `${i ? `<span class="arrow" aria-hidden="true">→</span>` : ""}<button type="button" data-i="${i}" aria-current="${i === S.cur}" aria-label="Step ${i + 1}">${MD.graphSvg(s.G, { w: 84, h: 60, pad: 9, font: 7.5, dot: 2.6, strokeW: 1.3 })}<span>${i === 0 ? "start" : "step " + i}</span></button>`).join("");
      hist.querySelectorAll("button").forEach((b, i) => paint(b, S.steps[i]));
    }
    fig.addEventListener("click", (e) => {
      const h = e.target.closest(".edge-hit");
      if (!h || S.busy) return;
      const st = S.steps[S.cur], G = st.G, e0 = +h.dataset.e;
      const [u, v] = G.edges[e0];
      const ex = MG.excess(G);
      const { graph, vmap } = MG.contractSet(G, G.edges.map((_, i) => i === e0));
      const col = [];
      G.w.forEach((_, x) => { if (col[vmap[x]] === undefined) col[vmap[x]] = st.col[x]; });
      const sw = (c) => `<i style="display:inline-block;width:10px;height:10px;border-radius:2px;vertical-align:-1px;background:${vcol(c)}"></i>`;
      const msg = u === v
        ? `Contracted a loop at ${sw(st.col[u])}: its weight went from ${G.w[u]} to ${G.w[u] + 1} and |<i>E</i>| − |<i>V</i>| + 1 dropped by 1. Its value of 2<i>w</i> − 2 + |<i>r</i><sup>−1</sup>| stays ${ex[u]}: the weight term goes up by 2 and the vertex loses 2 half-edges.`
        : `Merged ${sw(st.col[u])} and ${sw(st.col[v])}: the weights add to ${G.w[u] + G.w[v]}, |V| and |E| each drop by 1, and the values of 2<i>w</i> − 2 + |<i>r</i><sup>−1</sup>| add: ${ex[u]} + ${ex[v]} = ${ex[u] + ex[v]}.`;
      S.steps = S.steps.slice(0, S.cur + 1);
      S.steps.push({ G: graph, col, msg });
      // shrink the edge slowly to length 0, then let the contracted graph settle into place
      S.busy = true;
      fig.classList.add("busy");
      const len = ones(G);
      S.stop = tween(2200, (u) => {
        len[e0] = u >= 1 ? 0 : Math.max(1 - u, 0.004);
        if (u >= 1) picture(G, len, col, false);
        else picture(G, len, st.col, false, e0);
      }, () => {
        S.cur++;
        const one = ones(graph);
        S.stop = tween(700, (u) => picture(graph, one, col, false), () => {
          S.stop = null;
          fig.classList.remove("busy");
          render(false);
        });
      });
    });
    fig.addEventListener("mouseover", (e) => {
      const h = e.target.closest(".edge-hit");
      fig.querySelectorAll(".edge-path.hover").forEach((p) => p.classList.remove("hover"));
      if (h) fig.querySelector(`.edge-path[data-e="${h.dataset.e}"]`)?.classList.add("hover");
    });
    hist.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { fig.classList.remove("busy"); S.cur = +b.dataset.i; render(true); } });
    $("#con-pick").addEventListener("click", (e) => {
      const b = e.target.closest(".segbtn");
      if (!b) return;
      S.start = +b.dataset.i;
      $("#con-pick").querySelectorAll(".segbtn").forEach((x) => x.setAttribute("aria-pressed", String(+x.dataset.i === S.start)));
      reset();
    });
    $("#con-reset").addEventListener("click", () => { fig.classList.remove("busy"); reset(); });
    reset();
  }

  /* ================= Part 3: the cone of one graph ================= */
  function cone() {
    const svg = $("#cone-svg");
    if (!svg) return;
    const GA = mk([0, 0], [0, 1], [[0, 1], [0, 1]]);
    const view = new MD.MetricView();
    const O = [50, 282], R = 196, MX = 1.25;
    const S = { l: [0.72, 0.34], fold: false };
    const P = (a, b) => [O[0] + R * a, O[1] - R * b];
    function draw() {
      const [a, b] = S.l;
      const E = R * MX;
      let o = HATCH;
      if (S.fold) {
        o += `<polygon class="region" points="${O[0]},${O[1]} ${num(O[0] + E)},${O[1]} ${num(O[0] + E)},${num(O[1] - E)}"/>`;
        o += `<polygon class="region-off" points="${O[0]},${O[1]} ${num(O[0] + E)},${num(O[1] - E)} ${O[0]},${num(O[1] - E)}"/>`;
      } else o += `<rect class="region" x="${O[0]}" y="${num(O[1] - E)}" width="${num(E)}" height="${num(E)}"/>`;
      [0.5, 1].forEach((t) => {
        o += `<line x1="${num(O[0] + R * t)}" y1="${O[1]}" x2="${num(O[0] + R * t)}" y2="${O[1] + 5}" stroke="var(--muted)"/><text class="lbl" x="${num(O[0] + R * t)}" y="${O[1] + 18}" text-anchor="middle">${t}</text>`;
        o += `<line x1="${O[0] - 5}" y1="${num(O[1] - R * t)}" x2="${O[0]}" y2="${num(O[1] - R * t)}" stroke="var(--muted)"/><text class="lbl" x="${O[0] - 9}" y="${num(O[1] - R * t + 4)}" text-anchor="end">${t}</text>`;
      });
      o += `<line class="ax" x1="${O[0]}" y1="${O[1]}" x2="${num(O[0] + E + 8)}" y2="${O[1]}"/>${arrowHead(O[0] + E + 14, O[1], 1, 0)}`;
      o += `<line class="ax" x1="${O[0]}" y1="${O[1]}" x2="${O[0]}" y2="${num(O[1] - E - 8)}"/>${arrowHead(O[0], O[1] - E - 14, 0, -1)}`;
      o += `<text class="lbl-m" x="${num(O[0] + E + 4)}" y="${O[1] + 20}" style="fill:${pal(0)}">${ell(1)}</text>`;
      o += `<text class="lbl-m" x="${O[0] + 8}" y="${num(O[1] - E - 6)}" style="fill:${pal(1)}">${ell(2)}</text>`;
      o += `<line class="slice" x1="${num(O[0] + R)}" y1="${O[1]}" x2="${O[0]}" y2="${num(O[1] - R)}"/>`;
      o += `<text class="lbl" x="${O[0] + 8}" y="${num(O[1] - R - 8)}" style="fill:var(--atom)">total length 1</text>`;
      if (S.fold) {
        o += `<line class="foldline" x1="${O[0]}" y1="${O[1]}" x2="${num(O[0] + E)}" y2="${num(O[1] - E)}"/>`;
        o += `<text class="lbl" transform="translate(${num(O[0] + 0.9 * E + 9)} ${num(O[1] - 0.9 * E + 19)}) rotate(-45)" text-anchor="end" style="fill:var(--nm)">fold: equal lengths</text>`;
      }
      const p = P(a, b);
      if (!S.fold && Math.abs(a - b) > 1e-9) {
        const q = P(b, a);
        o += `<line x1="${num(p[0])}" y1="${num(p[1])}" x2="${num(q[0])}" y2="${num(q[1])}" stroke="var(--mat)" stroke-width="1" stroke-dasharray="2 3"/><circle class="pt-ghost" cx="${num(q[0])}" cy="${num(q[1])}" r="6.5"/>`;
      }
      o += `<circle class="pt-main" cx="${num(p[0])}" cy="${num(p[1])}" r="8.5"/>`;
      const right = p[0] < 250;
      o += `<text class="coord" x="${num(p[0] + (right ? 14 : -14))}" y="${num(p[1] - 12)}" text-anchor="${right ? "start" : "end"}">(${a.toFixed(2)}, ${b.toFixed(2)})</text>`;
      svg.innerHTML = o;
      const m = view.draw(GA, S.l, { w: 340, h: 210, pad: 34, font: 13, dot: 4.6, strokeW: 2.8, edgeColors: pal, total: 1.6, label: "The metric graph at this point" });
      $("#cone-graph").innerHTML = m.svg;
      $("#cone-len").innerHTML = S.l.map((x, e) => `<span class="${x <= 0 ? "zero" : ""}"><i style="background:${pal(e)}"></i>ℓ<sub>${e + 1}</sub> = ${x.toFixed(3)}</span>`).join("");
      let note;
      if (a > 0 && b > 0) note = `Two parallel edges, total length ${(a + b).toFixed(3)}. The automorphism swaps the edges, so (ℓ<sub>1</sub>, ℓ<sub>2</sub>) and (ℓ<sub>2</sub>, ℓ<sub>1</sub>) give the same metric graph.${Math.abs(a - b) < 1e-9 ? " Here ℓ<sub>1</sub> = ℓ<sub>2</sub>, so the swap fixes this metric graph: the point is on the fold." : ""}`;
      else if (a > 0 || b > 0) note = "One edge has length 0 and is contracted. What is left is a loop at a single vertex carrying both legs, so this axis is that graph's ray.";
      else note = "Both edges are contracted. What is left is one vertex of weight 1 with both legs: the cone point.";
      $("#cone-note").innerHTML = note;
    }
    drag(svg, {
      move: (p) => {
        let a = Math.max(0, Math.min(MX, (p[0] - O[0]) / R)), b = Math.max(0, Math.min(MX, (O[1] - p[1]) / R));
        if (a * R < 8) a = 0;
        if (b * R < 8) b = 0;
        if (Math.abs(a - b) * R < 6) { const m = (a + b) / 2; a = b = m; }
        if (S.fold && b > a) [a, b] = [b, a];
        S.l = [a, b];
        draw();
      },
    });
    $("#cone-fold").addEventListener("change", (e) => {
      S.fold = e.target.checked;
      if (S.fold && S.l[1] > S.l[0]) S.l = [S.l[1], S.l[0]];
      draw();
    });
    $("#cone-scale").addEventListener("click", () => {
      const [a, b] = S.l, s = a + b;
      const to = s > 0 ? [a / s, b / s] : [0.5, 0.5];
      const from = [a, b];
      tween(600, (u) => { S.l = [from[0] + (to[0] - from[0]) * u, from[1] + (to[1] - from[1]) * u]; draw(); });
    });
    draw();
  }

  /* ================= Part 3: the whole space, cone by cone ================= */
  function moduliFig() {
    const svg = $("#mod-svg");
    if (!svg || !window.Turn3D) return;
    const { turntable, apply, rotX, rotY, mul } = window.Turn3D;
    const posetSvg = $("#mod-poset"), mini = $("#mod-mini"), miniCtl = $("#mod-mini-ctl"), info = $("#mod-info");
    const W = 560, H = 430, CAM = 6, S0 = 168, TMAX = 1.3, LIFT = 0.66;
    // where Δ sits at total length 1: its plane picture from js/spaces.js, lifted to height 1.
    // For (1, 2) the picture is a straight path, so it gets a bend to keep its two fans apart.
    const TYPES = [
      { key: "1,2", verts: { b: [-1.0, 0.3], a: [0.05, -0.45], f: [0.95, 0.3] }, startCell: 1 },
      { key: "2,0", verts: null, startCell: 0 },
    ];
    const view = new MD.MetricView();
    let T = null, tt = null, sel = -1, hov = -1, pt = null, here = -1, slider = null;

    function setup(type) {
      const [g, n] = type.key.split(",").map(Number);
      const spec = SP.SPACES[type.key], data = MG.enumerate(g, n);
      const els = SPIC.elementsOf(spec, data);
      const V2 = type.verts || spec.verts, names = Object.keys(spec.verts);
      const cx = names.reduce((a, k) => a + V2[k][0], 0) / names.length, cy = names.reduce((a, k) => a + V2[k][1], 0) / names.length;
      const sc = 0.9 / Math.max(...names.map((k) => Math.hypot(V2[k][0] - cx, V2[k][1] - cy)));
      const X = {};
      names.forEach((k) => { X[k] = [(V2[k][0] - cx) * sc, 1, (V2[k][1] - cy) * sc]; });
      const ptsOf = (el) => (el.kind === 0 ? [el.name] : el.pts);
      // each graph's own piece: the element of the picture that carries it
      const home = new Map();
      els.forEach((e) => { if (!e.fold && e.kind === data.rank[e.idx] - 1 && !home.has(e.idx)) home.set(e.idx, e); });
      const apex = data.rank.findIndex((r) => r === 0);
      const tops = els.filter((e) => e.kind === 2);
      const topOf = (ci) => { const c = spec.cells[ci]; return els.find((e) => e.ci === ci && e.kind === c.pts.length - 1 && !e.fold).idx; };
      // the shapes to draw, each with the graphs it belongs to
      const shapes = [];
      const at = (p, t) => X[p].map((x) => x * t);
      const TS = [0, 0.45, 0.9, TMAX];
      els.forEach((e) => {
        const P = ptsOf(e);
        if (e.kind === 2) shapes.push({ type: "face", dim: 3, pts: P.map((p) => at(p, TMAX)), owners: [e.idx] });
        if (e.kind === 1) {
          const owners = e.fold ? [topOf(e.ci)] : [e.idx, ...tops.filter((t) => P.every((p) => t.pts.includes(p))).map((t) => t.idx)];
          for (let s = 0; s < 3; s++) shapes.push({ type: "face", dim: e.fold ? 0 : 2, fold: e.fold, pts: [at(P[0], TS[s]), at(P[1], TS[s]), at(P[1], TS[s + 1]), at(P[0], TS[s + 1])], owners });
          shapes.push({ type: "line", cls: "slice", pts: [at(P[0], 1), at(P[1], 1)], owners: [] });
          shapes.push({ type: "line", cls: e.fold ? "rim fold" : "rim", pts: [at(P[0], TMAX), at(P[1], TMAX)], owners });
        }
        if (e.kind === 0) {
          const owners = [e.idx];
          for (let s = 0; s < 3; s++) shapes.push({ type: "line", cls: e.fold ? "ray fold" : "ray", pts: [at(e.name, TS[s]), at(e.name, TS[s + 1])], owners });
        }
      });
      shapes.push({ type: "dot", pts: [[0, 0, 0]], owners: [apex] });
      return { type, spec, data, els, X, ptsOf, home, apex, shapes };
    }

    /* ---------- the point ---------- */
    const fullLam = (el, lam) => T.spec.cells[el.ci].pts.map((p) => { const j = T.ptsOf(el).indexOf(p); return j < 0 ? 0 : lam[j]; });
    function frameOf(el) {
      const cell = T.spec.cells[el.ci], P = T.ptsOf(el);
      const mid = SP.lengthsAt(cell, fullLam(el, P.map(() => 1 / P.length)));
      const act = mid.map((x, e) => (x > 1e-9 ? e : -1)).filter((e) => e >= 0);
      const U = P.map((p) => { const Lp = cell.L[cell.pts.indexOf(p)]; return act.map((e) => Lp[e]); });
      return { cell, P, act, U };
    }
    const lengthsOf = (q) => (q.el && q.t > 0 ? SP.lengthsAt(T.spec.cells[q.el.ci], fullLam(q.el, q.lam)).map((x) => x * q.t) : []);
    const pos3 = (q) => (q.el ? T.ptsOf(q.el).reduce((a, p, j) => a.map((x, k) => x + q.t * q.lam[j] * T.X[p][k]), [0, 0, 0]) : [0, 0, 0]);
    const graphOf = (q) => (!q.el || q.t <= 1e-9 ? T.apex : MG.lookup(T.data, SP.graphAt(T.spec, q.el.ci, fullLam(q.el, q.lam)).graph));

    /* ---------- the big picture ---------- */
    function draw3d() {
      const R = tt.Rm;
      const pr = (p) => { const q = apply(R, [p[0], p[1] - LIFT, p[2]]), f = CAM / (CAM - q[2]); return { x: W / 2 + S0 * f * q[0], y: H / 2 - S0 * f * q[1], z: q[2] }; };
      const items = [];
      const cls = (owners) => (owners.includes(sel) ? " sel" : owners.includes(here) ? " here" : owners.includes(hov) ? " hov" : "");
      T.shapes.forEach((sh) => {
        const P = sh.pts.map(pr), z = P.reduce((a, p) => a + p.z, 0) / P.length;
        const gi = sh.owners[0];
        const hit = gi >= 0 ? ` data-gi="${gi}"` : "";
        if (sh.type === "face") items.push({ z, s: `<polygon class="mf d${sh.dim}${sh.fold ? " fold" : ""}${cls(sh.owners)}"${hit} points="${P.map((p) => num(p.x) + "," + num(p.y)).join(" ")}"/>` });
        else if (sh.type === "line") items.push({ z: z + 0.01, s: `<line class="ml ${sh.cls}${cls(sh.owners)}" x1="${num(P[0].x)}" y1="${num(P[0].y)}" x2="${num(P[1].x)}" y2="${num(P[1].y)}"/>${hit ? `<line class="ml-hit"${hit} x1="${num(P[0].x)}" y1="${num(P[0].y)}" x2="${num(P[1].x)}" y2="${num(P[1].y)}"/>` : ""}` });
        else items.push({ z: z + 0.02, s: `<circle class="apex${cls(sh.owners)}" cx="${num(P[0].x)}" cy="${num(P[0].y)}" r="6"/><circle class="ml-hit"${hit} cx="${num(P[0].x)}" cy="${num(P[0].y)}" r="12"/><text class="lbl" x="${num(P[0].x + 12)}" y="${num(P[0].y + 16)}">cone point</text>` });
      });
      const p = pr(pos3(pt));
      items.push({ z: p.z + 0.05, s: `<circle class="pt-halo" cx="${num(p.x)}" cy="${num(p.y)}" r="13"/><circle class="pt" cx="${num(p.x)}" cy="${num(p.y)}" r="6"/>` });
      items.sort((a, b) => a.z - b.z);
      svg.innerHTML = items.map((it) => it.s).join("");
    }

    /* ---------- the poset ---------- */
    function drawPoset() {
      const { data } = T, maxR = Math.max(...data.rank), CW = 92, CH = 62;
      const rows = [];
      data.rank.forEach((r, i) => { (rows[r] = rows[r] || []).push(i); });
      const pos = [];
      rows.forEach((row, r) => row.forEach((i, j) => { pos[i] = [70 + ((j + 1) * 280) / (row.length + 1), 392 - (r * 340) / maxR]; }));
      let o = "";
      data.down.forEach((ds, i) => ds.forEach((j) => { o += `<line class="pe${i === sel || j === sel ? " on" : ""}" x1="${num(pos[i][0])}" y1="${num(pos[i][1] + CH / 2)}" x2="${num(pos[j][0])}" y2="${num(pos[j][1] - CH / 2)}"/>`; }));
      rows.forEach((row, r) => { o += `<text class="rank" x="4" y="${num(pos[row[0]][1] + 4)}">${r} ${r === 1 ? "edge" : "edges"}</text>`; });
      data.graphs.forEach((G, i) => {
        const [x, y] = pos[i];
        const c = i === sel ? " sel" : i === here ? " here" : i === hov ? " hov" : "";
        o += `<g class="pn${c}" data-gi="${i}" tabindex="0" role="button" aria-label="Graph with ${data.rank[i]} edges"><rect x="${num(x - CW / 2)}" y="${num(y - CH / 2)}" width="${CW}" height="${CH}" rx="6"/>${MD.graphSvg(G, { w: CW, h: CH, pad: 9, font: 8, dot: 2.6, strokeW: 1.3, attrs: ` x="${num(x - CW / 2)}" y="${num(y - CH / 2)}" width="${CW}" height="${CH}"` })}</g>`;
      });
      posetSvg.innerHTML = o;
    }

    /* ---------- one cone on its own ---------- */
    let M = null; // how the mini picture maps lengths to the screen, for dragging
    function drawMini() {
      const el = pt.el && T.home.get(sel) === pt.el ? pt.el : T.home.get(sel);
      const k = T.data.rank[sel];
      $("#mod-mini-title").textContent = k === 0 ? "The cone point" : `Its cone: ${k === 1 ? "a ray" : k === 2 ? "a 2-dimensional cone" : "a 3-dimensional cone"}`;
      if (!el) { M = null; mini.innerHTML = `<text class="lbl" x="165" y="125" text-anchor="middle">No edges, so no lengths to choose:</text><text class="lbl" x="165" y="145" text-anchor="middle">this piece is a single point.</text><circle class="pt" cx="165" cy="185" r="7"/>`; miniCtl.innerHTML = ""; return; }
      const F = frameOf(el), col = (e) => pal(view.colorIndex(e));
      const L = lengthsOf(pt.el === el ? pt : { el, lam: [], t: 0 });
      const coords = F.act.map((e) => (L[e] || 0));
      const fmtc = (v) => "(" + v.map((x) => x.toFixed(2)).join(", ") + ")";
      const axisLbl = (e, x, y, anchor = "start") => `<text class="lbl-m" x="${num(x)}" y="${num(y)}" text-anchor="${anchor}" style="fill:${col(e)}">${ell(e + 1)}</text>`;
      let o = HATCH;
      if (k === 1) {
        const O = [36, 150], R = 210;
        M = { k, O, R, F };
        o += `<line class="ax" x1="${O[0]}" y1="${O[1]}" x2="${O[0] + R * TMAX + 6}" y2="${O[1]}" style="stroke:${col(F.act[0])};stroke-width:3"/>${arrowHead(O[0] + R * TMAX + 12, O[1], 1, 0)}`;
        o += `<line x1="${O[0] + R}" y1="${O[1] - 5}" x2="${O[0] + R}" y2="${O[1] + 5}" stroke="var(--muted)"/><text class="lbl" x="${O[0] + R}" y="${O[1] + 20}" text-anchor="middle">1</text>`;
        o += axisLbl(F.act[0], O[0] + R * TMAX - 4, O[1] - 14, "end") + `<circle class="apex" cx="${O[0]}" cy="${O[1]}" r="5"/>`;
        const x = O[0] + R * (pt.el === el ? pt.t : 0);
        o += `<circle class="pt-main" cx="${num(x)}" cy="${O[1]}" r="8.5"/><text class="coord" x="${num(x)}" y="${O[1] - 18}" text-anchor="middle">${coords[0].toFixed(2)}</text>`;
      } else if (k === 2) {
        const O = [52, 232], R = 158;
        const P2 = (v) => [O[0] + R * v[0], O[1] - R * v[1]];
        M = { k, O, R, F, P2 };
        const E = TMAX;
        o += `<polygon class="region-off" points="${[[0, 0], [E, 0], [0, E]].map(P2).map((p) => p.map(num).join(",")).join(" ")}"/>`;
        o += `<polygon class="region" points="${[[0, 0], F.U[0].map((x) => x * E), F.U[1].map((x) => x * E)].map(P2).map((p) => p.map(num).join(",")).join(" ")}"/>`;
        F.U.forEach((u) => { const face = u.some((x) => x < 1e-9), q = P2(u.map((x) => x * E)); o += `<line class="${face ? "bd" : "foldline"}" x1="${O[0]}" y1="${O[1]}" x2="${num(q[0])}" y2="${num(q[1])}"/>`; });
        o += `<line class="slice" x1="${num(P2([1, 0])[0])}" y1="${O[1]}" x2="${O[0]}" y2="${num(P2([0, 1])[1])}"/>`;
        o += `<line class="ax" x1="${O[0]}" y1="${O[1]}" x2="${num(O[0] + R * E + 8)}" y2="${O[1]}"/>${arrowHead(O[0] + R * E + 14, O[1], 1, 0)}<line class="ax" x1="${O[0]}" y1="${O[1]}" x2="${O[0]}" y2="${num(O[1] - R * E - 8)}"/>${arrowHead(O[0], O[1] - R * E - 14, 0, -1)}`;
        o += axisLbl(F.act[0], O[0] + R * E + 2, O[1] + 20) + axisLbl(F.act[1], O[0] + 10, O[1] - R * E - 4);
        o += `<circle class="apex" cx="${O[0]}" cy="${O[1]}" r="5"/>`;
        const p = P2(coords);
        o += `<circle class="pt-main" cx="${num(p[0])}" cy="${num(p[1])}" r="8.5"/><text class="coord" x="${num(p[0] + 13)}" y="${num(p[1] - 11)}">${fmtc(coords)}</text>`;
      } else {
        const O = [165, 182], R = 124, A = [[-0.87, 0.5], [0.87, 0.5], [0, -1]];
        const P3 = (v) => [O[0] + R * (v[0] * A[0][0] + v[1] * A[1][0] + v[2] * A[2][0]), O[1] + R * (v[0] * A[0][1] + v[1] * A[1][1] + v[2] * A[2][1])];
        const t = pt.el === el ? pt.t : 1;
        M = { k, O, R, F, P3, t };
        const E = TMAX, poly = (vs, c) => `<polygon class="${c}" points="${vs.map(P3).map((p) => p.map(num).join(",")).join(" ")}"/>`;
        [0, 1, 2].forEach((i) => { const e = [0, 0, 0]; e[i] = E; const q = P3(e); o += `<line class="ax" x1="${O[0]}" y1="${O[1]}" x2="${num(q[0])}" y2="${num(q[1])}"/>`; o += axisLbl(F.act[i], q[0] + (i === 0 ? -8 : 8), q[1] + (i === 2 ? 6 : 2), i === 0 ? "end" : "start"); });
        o += poly([[t, 0, 0], [0, t, 0], [0, 0, t]], "region-off");
        o += poly(F.U.map((u) => u.map((x) => x * t)), "region");
        [[0, 1], [1, 2], [2, 0]].forEach(([i, j]) => {
          const face = F.act.some((_, c) => F.U[i][c] < 1e-9 && F.U[j][c] < 1e-9);
          const a = P3(F.U[i].map((x) => x * t)), b = P3(F.U[j].map((x) => x * t));
          o += `<line class="${face ? "bd" : "foldline"}" x1="${num(a[0])}" y1="${num(a[1])}" x2="${num(b[0])}" y2="${num(b[1])}"/>`;
        });
        o += `<circle class="apex" cx="${O[0]}" cy="${O[1]}" r="4.5"/>`;
        const p = P3(coords);
        o += `<circle class="pt-main" cx="${num(p[0])}" cy="${num(p[1])}" r="8"/><text class="coord" x="${num(p[0] + 12)}" y="${num(p[1] - 12)}">${fmtc(coords)}</text>`;
      }
      mini.innerHTML = o;
      if (k === 3) {
        if (!slider || !miniCtl.contains(slider)) {
          miniCtl.innerHTML = `<label class="mod-slider"><span>Total length</span><input type="range" min="0.05" max="${TMAX}" step="0.01" value="${(pt.t || 1).toFixed(2)}" id="mod-t"><span id="mod-t-val"></span></label>`;
          slider = $("#mod-t");
          slider.addEventListener("input", () => { const el2 = T.home.get(sel); if (pt.el !== el2) pt = { el: el2, lam: el2.pts.map(() => 1 / 3), t: 1 }; pt.t = +slider.value; update(); });
        }
        slider.value = String(pt.t);
        $("#mod-t-val").textContent = (+pt.t).toFixed(2);
      } else { miniCtl.innerHTML = `<span class="note">Drag the point. The dashed line is total length 1.</span>`; slider = null; }
    }
    // the nearest point of a triangle, in barycentric coordinates
    function bary(p, a, b, c) {
      const det = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
      let l1 = ((b[1] - c[1]) * (p[0] - c[0]) + (c[0] - b[0]) * (p[1] - c[1])) / det;
      let l2 = ((c[1] - a[1]) * (p[0] - c[0]) + (a[0] - c[0]) * (p[1] - c[1])) / det;
      let l3 = 1 - l1 - l2;
      if (l1 >= 0 && l2 >= 0 && l3 >= 0) return [l1, l2, l3];
      const seg = (A, B) => { const dx = B[0] - A[0], dy = B[1] - A[1]; const t = Math.max(0, Math.min(1, ((p[0] - A[0]) * dx + (p[1] - A[1]) * dy) / (dx * dx + dy * dy || 1))); return { t, d: Math.hypot(p[0] - A[0] - t * dx, p[1] - A[1] - t * dy) }; };
      const c1 = seg(a, b), c2 = seg(b, c), c3 = seg(c, a);
      if (c1.d <= c2.d && c1.d <= c3.d) return [1 - c1.t, c1.t, 0];
      if (c2.d <= c3.d) return [0, 1 - c2.t, c2.t];
      return [c3.t, 0, 1 - c3.t];
    }
    function miniMove(p) {
      if (!M) return;
      const el = T.home.get(sel), { F } = M;
      if (M.k === 1) {
        let t = Math.max(0, Math.min(TMAX, (p[0] - M.O[0]) / M.R));
        if (t * M.R < 7) t = 0;
        pt = { el, lam: [1], t };
      } else if (M.k === 2) {
        const q = [(p[0] - M.O[0]) / M.R, (M.O[1] - p[1]) / M.R], [u, v] = F.U;
        const det = u[0] * v[1] - v[0] * u[1];
        let a = (q[0] * v[1] - v[0] * q[1]) / det, b = (u[0] * q[1] - q[0] * u[1]) / det;
        if (a < 0 && b < 0) { a = 0; b = 0; }
        else if (a < 0) { a = 0; b = Math.max(0, (q[0] * v[0] + q[1] * v[1]) / (v[0] * v[0] + v[1] * v[1])); }
        else if (b < 0) { b = 0; a = Math.max(0, (q[0] * u[0] + q[1] * u[1]) / (u[0] * u[0] + u[1] * u[1])); }
        let t = a + b;
        if (t > TMAX) { a *= TMAX / t; b *= TMAX / t; t = TMAX; }
        // snap onto the sides, so that faces and folds are easy to reach
        if (t * M.R < 7) { pt = { el, lam: [0.5, 0.5], t: 0 }; return; }
        let la = a / t;
        if (la * t * M.R < 6) la = 0;
        if ((1 - la) * t * M.R < 6) la = 1;
        pt = { el, lam: [la, 1 - la], t };
      } else {
        const C = F.U.map((u) => M.P3(u.map((x) => x * M.t)));
        let l = bary(p, C[0], C[1], C[2]);
        l = l.map((x) => (x * M.t * M.R < 5 ? 0 : x));
        const s = l.reduce((a, b) => a + b, 0);
        pt = { el, lam: l.map((x) => x / s), t: M.t };
      }
      update();
    }

    /* ---------- the words ---------- */
    function drawInfo() {
      const { data } = T, G = data.graphs[sel], k = data.rank[sel];
      const aut = MG.autInfo(G);
      const el = T.home.get(sel);
      const folded = el && frameOf(el).U.length > 1 && (() => { const F = frameOf(el); return F.U.some((u, i) => F.U.some((v, j) => j > i && !F.act.some((_, c) => u[c] < 1e-9 && v[c] < 1e-9))); })();
      const chip = (j) => `<button type="button" class="mini" data-gi="${j}">${MD.graphSvg(data.graphs[j], { w: 76, h: 54, pad: 7, font: 7.5, dot: 2.3, strokeW: 1.2 })}</button>`;
      const hereTxt = here === sel ? "The point is inside this cone." : here === T.apex ? "All the lengths are 0, so the point is at the cone point." : `A length is 0, so the point has moved into a face of this cone: the cone of the contracted graph, lit up in the poset.`;
      info.innerHTML = `
        <div class="tags"><span class="tag s">${k} ${k === 1 ? "edge" : "edges"}</span><span class="tag">|Aut| = ${aut.order}</span><span class="tag">dimension ${k}</span></div>
        <p class="note">${k === 0 ? `The graph with no edges: one vertex of weight ${T.data.g}${T.data.n ? ` carrying all ${T.data.n} legs` : ""}. Every other cone has this point as its tip.` : `Its piece is ℝ<span class="ss"><sup>${k}</sup><sub>≥0</sub></span> / Aut(<em class="m">G</em>), one coordinate for each edge.${folded ? " Aut(<em class=\"m\">G</em>) permutes the edges, so the cone is folded: the shaded part holds one copy of each metric graph, and its dashed sides are folds, where lengths are equal." : ""}`}</p>
        ${k > 0 ? `<p class="note">${hereTxt}</p>` : ""}
        ${data.down[sel].length ? `<div><h4>Its faces: set one length to 0</h4><div class="minis">${data.down[sel].map(chip).join("")}</div></div>` : ""}
        ${data.up[sel].length ? `<div><h4>It is a face of</h4><div class="minis">${data.up[sel].map(chip).join("")}</div></div>` : ""}`;
    }

    function update() {
      here = graphOf(pt);
      draw3d();
      drawPoset();
      drawMini();
      // the metric graph at the point
      const box = $("#mod-graph");
      if (pt.el && pt.t > 0) {
        const cell = T.spec.cells[pt.el.ci], L = lengthsOf(pt);
        box.innerHTML = view.draw(cell.G, L, { w: 300, h: 190, pad: 30, font: 12, dot: 4.2, strokeW: 2.6, edgeColors: pal, total: 1.6, label: "The metric graph at the point" }).svg;
        $("#mod-len").innerHTML = L.map((x, e) => `<span class="${x <= 1e-9 ? "zero" : ""}"><i style="background:${pal(view.colorIndex(e))}"></i>ℓ<sub>${e + 1}</sub> = ${Math.max(0, x).toFixed(2)}</span>`).join("");
        drawMini(); // the axis colours follow the drawing
      } else {
        box.innerHTML = MD.graphSvg(T.data.graphs[T.apex], { w: 300, h: 190, pad: 30, font: 12, dot: 4.2, strokeW: 2.6, label: "The graph at the cone point" });
        $("#mod-len").innerHTML = `<span class="note">No edges.</span>`;
      }
      drawInfo();
    }
    function select(gi) {
      sel = gi;
      const el = T.home.get(gi);
      pt = el ? { el, lam: T.ptsOf(el).map((_, j, a) => 1 / a.length), t: 1 } : { el: null, lam: [], t: 0 };
      update();
    }
    function setType(i) {
      T = setup(TYPES[i]);
      $("#mod-type").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.i === i)));
      $("#mod-title").innerHTML = `The whole space <em class="m">M</em><sub>${T.data.g},${T.data.n}</sub>`;
      const start = T.els.find((e) => e.ci === TYPES[i].startCell && e.kind === T.spec.cells[e.ci].pts.length - 1 && !e.fold);
      select(start.idx);
    }

    $("#mod-type").innerHTML = TYPES.map((t, i) => `<button type="button" class="segbtn" data-i="${i}">(<em class="m">g</em>, <em class="m">n</em>) = (${t.key.replace(",", ", ")})</button>`).join("");
    $("#mod-type").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) setType(+b.dataset.i); });
    tt = turntable(svg, {
      Rm: mul(rotX(0.42), rotY(0.55)), spinBtn: $("#mod-spin"), speed: 0.00022, draw: () => draw3d(),
      hover(t) { const g = t && t.dataset && t.dataset.gi != null ? +t.dataset.gi : -1; if (g === hov) return false; hov = g; drawPoset(); return true; },
      pick(t) { if (t && t.dataset && t.dataset.gi != null) select(+t.dataset.gi); },
    });
    const pickGraph = (e) => { const g = e.target.closest("[data-gi]"); if (g) select(+g.dataset.gi); };
    posetSvg.addEventListener("click", pickGraph);
    posetSvg.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickGraph(e); } });
    posetSvg.addEventListener("pointerover", (e) => { const g = e.target.closest("[data-gi]"); const v = g ? +g.dataset.gi : -1; if (v !== hov) { hov = v; draw3d(); drawPoset(); } });
    posetSvg.addEventListener("pointerleave", () => { hov = -1; draw3d(); drawPoset(); });
    info.addEventListener("click", pickGraph);
    drag(mini, { move: miniMove });
    setType(0);
    tt.start();
  }

  /* ================= Part 4: pictures of small spaces ================= */
  function spaceWidget(el) {
    const key = el.dataset.space;
    const [g, n] = key.split(",").map(Number);
    const spec = SP.SPACES[key];
    const data = MG.enumerate(g, n);
    const W = 560, H = 430;
    const tf = SPIC.picTransform(spec, W, H);
    const autCache = new Map();
    const view = new MD.MetricView();
    const name = n === 0 ? `M<sub>${g}</sub>` : `M<sub>${g},${n}</sub>`;
    el.innerHTML = `<div class="pic">
        <h4>${spec.title}</h4>
        <svg viewBox="0 0 ${W} ${H}" role="application" aria-label="Picture of the space. Drag the point to move through it.">
          ${SPIC.spaceSvg(spec, tf, data)}
          <g class="ptg"><circle class="pt-halo" r="16"/><circle class="pt" r="7"/></g>
        </svg>
        <p class="note">${spec.cap} Drag the teal point anywhere; it snaps to the nearest point of the space.</p>
      </div>
      <div class="live"></div>`;
    const svg = el.querySelector("svg"), live = el.querySelector(".live");
    const c0 = spec.cells[0];
    let pt = { ci: 0, lam: c0.pts.length === 3 ? [0.3, 0.25, 0.45] : spec.kind === "cone" ? [0.5, 0.5] : [0.4, 0.6] };
    function update() {
      const cell = spec.cells[pt.ci];
      const p = tf.to(SP.pointAt(spec, cell, pt.lam));
      el.querySelector(".ptg").setAttribute("transform", `translate(${num(p[0])},${num(p[1])})`);
      const { L, graph } = SP.graphAt(spec, pt.ci, pt.lam);
      const idx = MG.lookup(data, graph);
      if (!autCache.has(idx)) autCache.set(idx, MG.autInfo(data.graphs[idx]).order);
      const m = view.draw(cell.G, L, { w: 380, h: 250, pad: 34, font: 12, dot: 4.4, strokeW: 2.6, edgeColors: pal, total: spec.kind === "cone" ? 2 : 0, label: "The metric graph at this point" });
      const total = L.reduce((a, b) => a + b, 0);
      const E = data.graphs[idx].edges.length;
      live.innerHTML = `<div class="live-head"><h4>The graph at this point</h4><a class="open" href="index.html#g${g}-n${n}">Open <em class="m">${name}</em> in the explorer</a></div>
        ${m.svg}
        <div class="lengths">${L.map((x, e) => `<span class="${x <= 0 ? "zero" : ""}"><i style="background:${pal(view.colorIndex(e))}"></i>ℓ<sub>${e + 1}</sub> = ${x.toFixed(3)}</span>`).join("")}</div>
        <p class="note">${spec.kind === "cone" ? `Edge length ${total.toFixed(3)}.` : `Total length ${total.toFixed(3)}.`} This graph has ${E} ${E === 1 ? "edge" : "edges"} and |Aut| = ${autCache.get(idx)}.${L.some((x) => x <= 0) && L.some((x) => x > 0) ? " Edges of length 0 are contracted." : ""}</p>`;
      svg.querySelectorAll("[data-idx]").forEach((x) => x.classList.toggle("sel", +x.dataset.idx === idx));
    }
    drag(svg, {
      move: (p) => {
        const q = tf.from(p);
        const r = SP.nearest(spec, q, pt.ci, 3 / tf.s);
        pt = { ci: r.ci, lam: r.lam };
        update();
      },
    });
    update();
  }

  /* ================= Part 4: label the Petersen graph ================= */
  function petersen() {
    const svg = $("#pet-svg");
    if (!svg) return;
    const C = [180, 172], RO = 138, RI = 66;
    const pos = [];
    for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5; pos.push([C[0] + RO * Math.cos(a), C[1] + RO * Math.sin(a)]); }
    for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5; pos.push([C[0] + RI * Math.cos(a), C[1] + RI * Math.sin(a)]); }
    const edges = [];
    for (let k = 0; k < 5; k++) { edges.push([k, (k + 1) % 5]); edges.push([k, k + 5]); edges.push([k + 5, ((k + 2) % 5) + 5]); }
    const PAIRS = ["12", "13", "14", "15", "23", "24", "25", "34", "35", "45"];
    const SOL = ["12", "34", "15", "23", "45", "35", "25", "24", "14", "13"];
    const disjoint = (a, b) => !a.split("").some((c) => b.includes(c));
    const pretty = (p) => `{${p[0]},${p[1]}}`;
    const S = { L: new Array(10).fill(null), sel: 1, msg: "" };
    S.L[0] = "12";
    $("#pet-chips").innerHTML = PAIRS.map((p) => `<button type="button" data-p="${p}">${pretty(p)}</button>`).join("");
    function complete(L) {
      const L2 = L.slice();
      const used = new Set(L2.filter(Boolean));
      const ok = (v, p) => edges.every(([a, b]) => { const o = a === v ? b : b === v ? a : -1; return o < 0 || !L2[o] || disjoint(p, L2[o]); });
      for (let v = 0; v < 10; v++) if (L2[v] && !ok(v, L2[v])) return null;
      const rec = (v) => {
        if (v === 10) return true;
        if (L2[v]) return rec(v + 1);
        for (const p of PAIRS) {
          if (used.has(p) || !ok(v, p)) continue;
          L2[v] = p; used.add(p);
          if (rec(v + 1)) return true;
          L2[v] = null; used.delete(p);
        }
        return false;
      };
      return rec(0) ? L2 : null;
    }
    function draw() {
      let o = "";
      let good = 0, bad = 0;
      edges.forEach(([a, b]) => {
        let cls = "pe";
        if (S.L[a] && S.L[b]) { if (disjoint(S.L[a], S.L[b])) { cls += " ok"; good++; } else { cls += " bad"; bad++; } }
        o += `<line class="${cls}" x1="${num(pos[a][0])}" y1="${num(pos[a][1])}" x2="${num(pos[b][0])}" y2="${num(pos[b][1])}"/>`;
      });
      pos.forEach(([x, y], v) => {
        o += `<g class="pv${S.L[v] ? " lab" : ""}${v === S.sel ? " sel" : ""}" data-v="${v}" tabindex="0" role="button" aria-label="Vertex ${v + 1}${S.L[v] ? ", labelled " + pretty(S.L[v]) : ", unlabelled"}" aria-pressed="${v === S.sel}"><circle class="bgc" cx="${num(x)}" cy="${num(y)}" r="20"/><circle class="fc" cx="${num(x)}" cy="${num(y)}" r="20"/><text x="${num(x)}" y="${num(y)}" text-anchor="middle" dominant-baseline="central">${S.L[v] ? S.L[v][0] + "," + S.L[v][1] : ""}</text></g>`;
      });
      svg.innerHTML = o;
      $("#pet-chips").querySelectorAll("button").forEach((b) => {
        const p = b.dataset.p;
        b.classList.toggle("used", S.L.includes(p));
        b.classList.toggle("mine", S.sel >= 0 && S.L[S.sel] === p);
      });
      const score = $("#pet-score");
      const win = good === 15;
      score.classList.toggle("win", win);
      score.innerHTML = win
        ? "<b>All 15 edges join disjoint pairs.</b> The ten vertices are the one-edge trees and the fifteen edges are the caterpillars: this is Δ<sub>0,5</sub>."
        : `${S.msg ? S.msg + "<br>" : ""}<b>${good}</b> of 15 edges join disjoint pairs${bad ? `, <b>${bad}</b> overlap` : ""}.${S.sel >= 0 ? ` Now labelling the highlighted vertex.` : ""}`;
    }
    const nextEmpty = (from) => { for (let i = 1; i <= 10; i++) { const v = (from + i) % 10; if (!S.L[v]) return v; } return -1; };
    const choose = (v) => { S.sel = v; S.msg = ""; draw(); };
    svg.addEventListener("click", (e) => { const g = e.target.closest(".pv"); if (g) choose(+g.dataset.v); });
    svg.addEventListener("keydown", (e) => {
      const g = e.target.closest(".pv");
      if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); choose(+g.dataset.v); svg.querySelector(`.pv[data-v="${g.dataset.v}"]`)?.focus(); }
    });
    $("#pet-chips").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b || S.sel < 0) return;
      const p = b.dataset.p;
      S.msg = "";
      if (S.L[S.sel] === p) S.L[S.sel] = null;
      else {
        const u = S.L.indexOf(p);
        if (u >= 0) S.L[u] = null;
        S.L[S.sel] = p;
        const nx = nextEmpty(S.sel);
        S.sel = nx;
      }
      draw();
    });
    $("#pet-hint").addEventListener("click", () => {
      const full = complete(S.L);
      if (!full) { S.msg = "Some of these labels cannot all be right at once. Look for a red edge, or a vertex whose neighbours use up its numbers."; draw(); return; }
      const v = S.sel >= 0 && !S.L[S.sel] ? S.sel : nextEmpty(-1);
      if (v < 0) { S.msg = ""; draw(); return; }
      S.L[v] = full[v];
      S.msg = `Vertex labelled ${pretty(full[v])}. It is disjoint from every labelled neighbour.`;
      S.sel = nextEmpty(v);
      draw();
    });
    $("#pet-solve").addEventListener("click", () => {
      const full = complete(S.L);
      S.L = full || SOL.slice();
      S.msg = full ? "" : "Your labels could not be completed, so here is a fresh labelling.";
      S.sel = -1;
      draw();
    });
    $("#pet-reset").addEventListener("click", () => { S.L = new Array(10).fill(null); S.sel = 0; S.msg = ""; draw(); });
    draw();
  }

  /* ================= Part 4: genus 2 reveal ================= */
  function genus2() {
    const box = $("#g2-rows");
    if (!box) return;
    const ROWS = [
      [3, [["theta", mk([0, 0], [], [[0, 1], [0, 1], [0, 1]])], ["dumbbell", mk([0, 0], [], [[0, 0], [1, 1], [0, 1]])]]],
      [2, [["figure-eight", mk([0], [], [[0, 0], [0, 0]])], ["weight 1, edge, loop", mk([1, 0], [], [[0, 1], [1, 1]])]]],
      [1, [["weight 1 with a loop", mk([1], [], [[0, 0]])], ["two weight-1 vertices", mk([1, 1], [], [[0, 1]])]]],
      [0, [["one vertex of weight 2", mk([2], [], [])]]],
    ];
    const shown = ROWS.map(() => false);
    function draw() {
      box.innerHTML = ROWS.map(([k, gs], r) => `<div class="g2-row"><div class="k"><b>${k} ${k === 1 ? "edge" : "edges"}</b>${shown[r] ? "" : `<button type="button" class="btn-quiet" data-r="${r}">Reveal</button>`}</div>
        <div class="g2-cards">${gs.map(([nm, G]) => shown[r]
          ? `<div class="g2-card">${MD.graphSvg(G, { w: 136, h: 92, pad: 14, font: 10, dot: 3.4, strokeW: 1.8, label: nm })}<span class="nm">${nm}</span><span>|Aut| = ${MG.autInfo(G).order}</span></div>`
          : `<div class="g2-card hid" aria-label="hidden graph">?</div>`).join("")}</div></div>`).join("");
    }
    box.addEventListener("click", (e) => { const b = e.target.closest("button[data-r]"); if (b) { shown[+b.dataset.r] = true; draw(); } });
    $("#g2-all").addEventListener("click", () => { shown.fill(true); draw(); });
    draw();
  }

  /* ================= Part 5: pinching curves on a surface ================= */
  function pinch() {
    const svg = $("#pinch-svg");
    if (!svg) return;
    const X = (x) => 260 + 112 * x, Y = (y) => 125 - 112 * y;
    const B = 0.8, HOLE_TOP = 0.1, CX = 0.88, XE = CX + 1;
    const lobe = (x) => { const u = Math.abs(x) - CX; return u * u < 1 ? B * Math.sqrt(1 - u * u) : 0; };
    const graphs = {
      "00": mk([2], [], []),
      "10": mk([1, 1], [], [[0, 1]]),
      "01": mk([1], [], [[0, 0]]),
      "11": mk([0, 1], [], [[0, 0], [0, 1]]),
    };
    const NOTES = {
      "00": "Still one smooth surface of genus 2, so the dual graph is a single vertex of weight 2.",
      "10": "The middle neck has pinched to a node. Two components of genus 1 meet at one point: two vertices of weight 1 joined by an edge.",
      "01": "The handle's curve has pinched to a node. There is still one component. It has genus 1 and meets itself at the node: a vertex of weight 1 with a loop, and 1 + 1 = 2.",
      "11": "Two nodes. The left component has genus 0 and meets itself once, and the right component has genus 1: a weight-0 vertex with a loop, joined to a weight-1 vertex.",
    };
    function draw() {
      const s = +$("#pinch-neck").value / 100, hnd = +$("#pinch-handle").value / 100;
      const f = (x) => lobe(x) * (1 - s * Math.exp(-((x / 0.34) ** 2)));
      const dentAt = (f(-CX) - HOLE_TOP) * hnd;
      const top = (x) => f(x) - dentAt * Math.exp(-(((x + CX) / 0.3) ** 2));
      let d = "";
      const N = 200;
      for (let j = 0; j <= N; j++) { const x = -XE * Math.cos((Math.PI * j) / N); d += (j ? "L" : "M") + num(X(x)) + " " + num(Y(top(x))); }
      for (let j = N; j >= 0; j--) { const x = -XE * Math.cos((Math.PI * j) / N); d += "L" + num(X(x)) + " " + num(Y(-f(x))); }
      let o = `<path class="surf" d="${d}Z"/>`;
      [-CX, CX].forEach((cx) => {
        o += `<path class="hole" d="M${num(X(cx - 0.42))} ${num(Y(0.08))}Q${num(X(cx))} ${num(Y(-0.22))} ${num(X(cx + 0.42))} ${num(Y(0.08))}"/>`;
        o += `<path class="hole" d="M${num(X(cx - 0.3))} ${num(Y(0))}Q${num(X(cx))} ${num(Y(0.2))} ${num(X(cx + 0.3))} ${num(Y(0))}"/>`;
      });
      // the vanishing curves: front half solid, back half dashed
      const ring = (cx, y0, y1, cls) => {
        const cy = (y0 + y1) / 2, ry = Math.abs(y1 - y0) / 2, rx = Math.max(0.012, Math.min(0.08, ry * 0.35));
        if (ry < 0.004) return `<circle class="node-dot" cx="${num(X(cx))}" cy="${num(Y(cy))}" r="5"/>`;
        const a = [X(cx), Y(y1)], b = [X(cx), Y(y0)];
        return `<path class="${cls}" d="M${num(a[0])} ${num(a[1])}A${num(112 * rx)} ${num(112 * ry)} 0 0 1 ${num(b[0])} ${num(b[1])}"/>` +
          `<path class="${cls} vc-back" d="M${num(a[0])} ${num(a[1])}A${num(112 * rx)} ${num(112 * ry)} 0 0 0 ${num(b[0])} ${num(b[1])}"/>`;
      };
      o += ring(0, -f(0), top(0), "vc-neck");
      o += ring(-CX, HOLE_TOP, top(-CX), "vc-handle");
      svg.innerHTML = o;
      const key = (s >= 1 ? "1" : "0") + (hnd >= 1 ? "1" : "0");
      const G = graphs[key];
      const colors = (e) => (G.edges[e][0] === G.edges[e][1] ? "var(--o1)" : "var(--o2)");
      $("#pinch-graph").innerHTML = MD.graphSvg(G, { w: 260, h: 170, pad: 30, font: 13, dot: 5, strokeW: 2.6, edgeColors: colors, label: "The dual graph" });
      $("#pinch-note").textContent = NOTES[key] + (key === "00" && (s > 0 || hnd > 0) ? " A curve that is only partly pinched is still smooth." : "");
    }
    $("#pinch-neck").addEventListener("input", draw);
    $("#pinch-handle").addEventListener("input", draw);
    draw();
  }

  /* ================= contents: mark the part being read ================= */
  function toc() {
    const links = [...document.querySelectorAll(".toc a")];
    const parts = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
    if (!("IntersectionObserver" in window)) return;
    const vis = new Map();
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => vis.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0));
      let best = null, bestTop = Infinity;
      parts.forEach((p) => { const r = p.getBoundingClientRect(); if (vis.get(p.id) > 0 && r.top < window.innerHeight * 0.5 && -r.top < bestTop) { best = p.id; bestTop = -r.top; } });
      if (!best) return;
      links.forEach((a) => a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + best)));
    }, { threshold: [0, 0.01, 0.2, 0.5] });
    parts.forEach((p) => io.observe(p));
  }

  const run = (f) => { try { f(); } catch (err) { console.error(err); } };
  run(segments);
  run(lines);
  run(buildGraph);
  run(anatomy);
  run(derivations);
  run(stability);
  run(quiz);
  run(contraction);
  run(cone);
  run(moduliFig);
  document.querySelectorAll("[data-space]").forEach((el) => run(() => spaceWidget(el)));
  run(petersen);
  run(genus2);
  run(pinch);
  run(toc);
})();
