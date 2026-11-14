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
      let o = `<circle cx="${C}" cy="${C}" r="128" fill="var(--mat-soft)" stroke="var(--rule)"/>`;
      o += `<line class="grid-l" x1="${C - 136}" y1="${C}" x2="${C + 136}" y2="${C}"/><line class="grid-l" x1="${C}" y1="${C - 136}" x2="${C}" y2="${C + 136}"/>`;
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
    }
    drag(pl, { move: (p) => { th = Math.atan2(-(p[1] - C), p[0] - C); draw(); } });
    pl.addEventListener("keydown", (e) => {
      const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      th += (d * 2 * Math.PI) / 180;
      draw();
    });
    let stop = null;
    $("#lines-spin").addEventListener("click", () => {
      if (stop) stop();
      const t0 = ((th % Math.PI) + Math.PI) % Math.PI;
      stop = tween(2600, (u) => { th = t0 + Math.PI * u; if (u >= 1) th = t0; draw(); });
    });
    draw();
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
    function draw() {
      const g = G(), E = g.edges.length, k = g.w.length;
      const { P, geo } = geom();
      let o = "";
      // legs
      g.legs.forEach((v, i) => {
        const V = P[v], T = P[k + i];
        const dx = T[0] - V[0], dy = T[1] - V[1], L = Math.hypot(dx, dy) || 1;
        o += `<line x1="${num(V[0])}" y1="${num(V[1])}" x2="${num(T[0])}" y2="${num(T[1])}" stroke="var(--muted)" stroke-width="2.2"/>`;
        o += `<circle cx="${num(T[0])}" cy="${num(T[1])}" r="2.4" fill="var(--muted)"/>`;
        o += `<text x="${num(T[0] + (dx / L) * 11)}" y="${num(T[1] + (dy / L) * 11)}" font-size="13" text-anchor="middle" dominant-baseline="central" fill="var(--muted)" font-family="var(--mono)">${i + 1}</text>`;
      });
      // edges as two halves
      g.edges.forEach((uv, e) => {
        const gm = geo[e], col = pal(e);
        const piece = (a, b) => {
          let d = "";
          for (let j = 0; j <= 24; j++) { const p = MD.along(gm, a + ((b - a) * j) / 24); d += (j ? "L" : "M") + num(p[0]) + " " + num(p[1]); }
          return `<path class="hp" d="${d}" fill="none" stroke="${col}" stroke-width="2.8" stroke-linecap="round"/>`;
        };
        o += piece(0, 0.5 - S.gap) + piece(0.5 + S.gap, 1);
        if (S.gap > 0.012) {
          const A = MD.along(gm, 0.5 - S.gap), B = MD.along(gm, 0.5 + S.gap), mid = MD.along(gm, 0.5);
          const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
          let nx = -dy / L, ny = dx / L;
          const ref = P[uv[0]];
          if ((mid[0] + nx - ref[0]) ** 2 + (mid[1] + ny - ref[1]) ** 2 < (mid[0] - nx - ref[0]) ** 2 + (mid[1] - ny - ref[1]) ** 2) { nx = -nx; ny = -ny; }
          const bow = 20 * (S.gap / 0.12);
          const c = [mid[0] + nx * bow, mid[1] + ny * bow];
          o += `<path d="M${num(A[0])} ${num(A[1])}Q${num(c[0])} ${num(c[1])} ${num(B[0])} ${num(B[1])}" fill="none" stroke="var(--muted)" stroke-width="1.2" stroke-dasharray="3 3"/>`;
          o += `<text x="${num(mid[0] + nx * (bow * 0.5 + 9))}" y="${num(mid[1] + ny * (bow * 0.5 + 9))}" font-size="14" text-anchor="middle" dominant-baseline="central" fill="var(--muted)" font-family="var(--display)" font-style="italic" opacity="${Math.min(1, S.gap / 0.06)}">ι</text>`;
        }
      });
      // vertices and names
      g.w.forEach((w, v) => {
        const [x, y] = P[v];
        const r = w > 0 ? 12 : 5.5;
        if (w > 0) o += `<circle cx="${num(x)}" cy="${num(y)}" r="${r}" fill="var(--gen-soft)" stroke="var(--gen)" stroke-width="1.5"/><text x="${num(x)}" y="${num(y)}" font-size="13" text-anchor="middle" dominant-baseline="central" fill="var(--gen)" font-family="var(--mono)" font-weight="500">${w}</text>`;
        else o += `<circle cx="${num(x)}" cy="${num(y)}" r="${r}" fill="var(--ink)"/>`;
        const near = [];
        g.legs.forEach((lv, i) => { if (lv === v) near.push(P[k + i]); });
        g.edges.forEach(([a, b], e) => { if (a === v) near.push(MD.along(geo[e], 0.12)); if (b === v) near.push(MD.along(geo[e], 0.88)); });
        const [ux, uy] = freeDir(P, v, near);
        o += `<text x="${num(x + ux * (r + 11))}" y="${num(y + uy * (r + 11))}" font-size="17" text-anchor="middle" dominant-baseline="central" fill="var(--atom)" font-family="var(--display)" font-style="italic">${vname(k, v)}</text>`;
      });
      // letters
      for (let i = 0; i < 2 * E + g.legs.length; i++) {
        const [x, y] = anchor(i);
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
      const chips = aut.autos.map((a, j) => {
        const img = []; // our index -> our index
        for (let h = 1; h < a.h.length; h++) img[idxOfH(g, h)] = idxOfH(g, a.h[h]);
        const seen = new Set(), cyc = [];
        for (let i = 0; i < Hn; i++) {
          if (seen.has(i)) continue;
          const c = []; let x = i;
          while (!seen.has(x)) { seen.add(x); c.push(LET[x]); x = img[x]; }
          if (c.length > 1) cyc.push("(" + c.join(" ") + ")");
        }
        return { j, img, label: cyc.length ? cyc.join("") : "id" };
      });
      S.chips = chips;
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
        <div class="aut"><h4>Automorphisms</h4><div class="aut-list" id="anat-auts">${chips.map((c) => `<button type="button" class="chip" data-j="${c.j}" aria-pressed="${c.j === S.aut}">${c.label}</button>`).join("")}</div><div class="aut-now" id="anat-now">${autNow()}</div></div>`;
      $("#anat-auts").addEventListener("click", (e) => {
        const c = e.target.closest(".chip");
        if (!c) return;
        S.aut = +c.dataset.j;
        box.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", String(+x.dataset.j === S.aut)));
        $("#anat-now").innerHTML = autNow();
        play();
      });
    }
    function autNow() {
      if (S.aut < 0 || !S.chips) return "Click a permutation to apply it.";
      const c = S.chips[S.aut];
      if (c.label === "id") return "The identity fixes every half-edge.";
      const g = G(), E = g.edges.length;
      const moved = [];
      for (let e = 0; e < E; e++) {
        const t = Math.floor(c.img[2 * e] / 2);
        if (t !== e) moved.push(`{${LET[2 * e]}, ${LET[2 * e + 1]}} ↦ {${LET[2 * t]}, ${LET[2 * t + 1]}}`);
      }
      return `<b>${c.label}</b>. ${moved.length ? "On edges: " + moved.join(", ") + "." : "Every edge goes to itself, so no edge length can change."}`;
    }
    /* points along half-edge i (our numbering), from its root to the middle of its edge */
    function halfPts(i) {
      const { geo } = geom(), e = Math.floor(i / 2), half = i % 2, pts = [];
      const t0 = half ? 1 : 0, t1 = half ? 0.5 + S.gap : 0.5 - S.gap;
      for (let j = 0; j <= 20; j++) pts.push(MD.along(geo[e], t0 + ((t1 - t0) * j) / 20));
      return pts;
    }
    function play() {
      if (S.stopA) S.stopA();
      draw();
      const c = S.chips[S.aut];
      const g = G(), E = g.edges.length;
      const bendTo = (p, q, s) => {
        const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1, bend = 0.28 * L * 4 * s * (1 - s);
        return [p[0] + dx * s - (dy / L) * bend, p[1] + dy * s + (dx / L) * bend];
      };
      // the half-edges themselves travel to the positions of their images, keeping their colours
      svg.querySelectorAll(".hp").forEach((p) => { p.style.opacity = "0"; });
      const NS = "http://www.w3.org/2000/svg", layer = document.createElementNS(NS, "g");
      svg.insertBefore(layer, svg.querySelector(".hl"));
      const halves = [];
      for (let i = 0; i < 2 * E; i++) {
        const path = document.createElementNS(NS, "path");
        path.setAttribute("fill", "none"); path.setAttribute("stroke", pal(Math.floor(i / 2)));
        path.setAttribute("stroke-width", "2.8"); path.setAttribute("stroke-linecap", "round");
        layer.appendChild(path);
        halves.push({ path, src: halfPts(i), tgt: halfPts(c.img[i]) });
      }
      const labels = [];
      svg.querySelectorAll(".hl").forEach((el) => {
        const i = +el.dataset.i;
        labels.push({ el, p: anchor(i), q: anchor(c.img[i]) });
      });
      const frame = (s) => {
        halves.forEach(({ path, src, tgt }) => {
          path.setAttribute("d", src.map((p, j) => { const r = bendTo(p, tgt[j], s); return (j ? "L" : "M") + num(r[0]) + " " + num(r[1]); }).join(""));
        });
        labels.forEach(({ el, p, q }) => {
          const r = bendTo(p, q, s);
          el.setAttribute("transform", `translate(${num(r[0] - p[0])},${num(r[1] - p[1])})`);
        });
      };
      frame(0);
      S.stopA = tween(1400, frame);
    }
    $("#anat-pick").addEventListener("click", (e) => {
      const b = e.target.closest(".segbtn");
      if (!b) return;
      S.ex = +b.dataset.i; S.aut = -1;
      if (S.stopA) S.stopA();
      $("#anat-pick").querySelectorAll(".segbtn").forEach((x) => x.setAttribute("aria-pressed", String(+x.dataset.i === S.ex)));
      draw(); data();
    });
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
    let h = `<thead><tr><th>w \\ |r⁻¹(v)|</th>${[0, 1, 2, 3, 4, 5].map((v) => `<th>${v}</th>`).join("")}</tr></thead><tbody>`;
    for (let w = 0; w <= 3; w++) {
      h += `<tr><th>${w}</th>`;
      for (let v = 0; v <= 5; v++) { const x = 2 * w - 2 + v; h += `<td><button type="button" class="${x > 0 ? "ok" : ""}" data-w="${w}" data-v="${v}" aria-label="weight ${w}, ${v} half-edges: ${x}">${x}</button></td>`; }
      h += `</tr>`;
    }
    t.innerHTML = h + "</tbody>";
    function glyph(w, v) {
      const C = [60, 40];
      let o = "";
      for (let i = 0; i < v; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(v, 1) + (v === 2 ? Math.PI / 2 : 0);
        o += `<line x1="${C[0]}" y1="${C[1]}" x2="${num(C[0] + 30 * Math.cos(a))}" y2="${num(C[1] + 30 * Math.sin(a))}" stroke="var(--ink)" stroke-width="2.2" stroke-linecap="round"/>`;
      }
      o += w > 0 ? `<circle cx="${C[0]}" cy="${C[1]}" r="11" fill="var(--gen-soft)" stroke="var(--gen)" stroke-width="1.4"/><text x="${C[0]}" y="${C[1]}" font-size="12" text-anchor="middle" dominant-baseline="central" fill="var(--gen)" font-family="var(--mono)">${w}</text>` : `<circle cx="${C[0]}" cy="${C[1]}" r="5" fill="var(--ink)"/>`;
      return `<svg viewBox="0 0 120 80" aria-hidden="true">${o}</svg>`;
    }
    function show(w, v) {
      const x = 2 * w - 2 + v;
      read.innerHTML = `${glyph(w, v)}<div><b>w = ${w}, ${v} ${v === 1 ? "half-edge" : "half-edges"}:</b> 2·${w} − 2 + ${v} = ${x}. ${x > 0 ? "Stable." : "Not stable."}</div>${NOTE[w + "," + v] ? `<div>${NOTE[w + "," + v]}</div>` : ""}`;
    }
    const pick = (e) => { const b = e.target.closest("button[data-w]"); if (b) show(+b.dataset.w, +b.dataset.v); };
    t.addEventListener("pointerover", pick);
    t.addEventListener("focusin", pick);
    t.addEventListener("click", pick);
    show(0, 2);
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
    const S = { start: 0, steps: [], cur: 0 };
    $("#con-pick").innerHTML = STARTS.map((x, i) => `<button type="button" class="segbtn" data-i="${i}" aria-pressed="${i === 0}">${x.name}</button>`).join("");
    const reset = () => { const G = STARTS[S.start].G; S.steps = [{ G, col: G.w.map((_, v) => v), msg: "" }]; S.cur = 0; render(); };
    const vcol = (c) => pal(c);
    function paint(svgRoot, st) {
      svgRoot.querySelectorAll(".vtx").forEach((c) => {
        const v = +c.dataset.v, col = vcol(st.col[v]);
        if (st.G.w[v] > 0) { c.setAttribute("stroke", col); c.setAttribute("stroke-width", "2"); }
        else c.setAttribute("fill", col);
      });
    }
    function render() {
      const st = S.steps[S.cur], G = st.G;
      const E = G.edges.length, V = G.w.length, n = G.legs.length, g = MG.genus(G);
      fig.innerHTML = MD.graphSvg(G, { w: 400, h: 260, pad: 36, font: 13, dot: 6, strokeW: 2.8, hit: E > 0, label: "A stable graph. Click an edge to contract it." });
      paint(fig, st);
      const ex = MG.excess(G), val = MG.valence(G), T = 2 * g - 2 + n;
      let bar = "";
      G.w.forEach((w, v) => { for (let k = 0; k < ex[v]; k++) bar += `<span class="unit" style="background:${vcol(st.col[v])}"></span>`; if (v < V - 1) bar += `<span class="gap"></span>`; });
      const legend = G.w.map((w, v) => `<div><i style="background:${vcol(st.col[v])}"></i>2·${w} − 2 + ${val[v]} = ${ex[v]}</div>`).join("");
      box.innerHTML = `
        <div class="tags"><span class="tag s">genus ${g}</span><span class="tag s">${n} ${n === 1 ? "leg" : "legs"}</span><span class="tag">|V| = ${V}</span><span class="tag">|E| = ${E}</span></div>
        <div class="calc">g = (|<i>E</i>| − |<i>V</i>| + 1) + ∑<i>w</i> = (${E} − ${V} + 1) + ${MG.sumW(G)} = ${g}</div>
        <div class="budget"><h4>Stability budget: ${T} squares</h4><p class="note">2<i>g</i> − 2 + <i>n</i> = ${T}</p><div class="bar">${bar}</div><div class="bar-legend">${legend}</div></div>
        ${st.msg ? `<div class="move">${st.msg}</div>` : `<p class="note">${E ? "Click an edge to contract it." : ""}</p>`}
        ${E === 0 ? `<p class="note">No edges left: this is the single vertex of weight ${g}${n ? ` with all ${n} legs` : ""}, the bottom of the poset.</p>` : ""}`;
      hist.innerHTML = S.steps.map((s, i) => `${i ? `<span class="arrow" aria-hidden="true">→</span>` : ""}<button type="button" data-i="${i}" aria-current="${i === S.cur}" aria-label="Step ${i + 1}">${MD.graphSvg(s.G, { w: 84, h: 60, pad: 9, font: 7.5, dot: 2.6, strokeW: 1.3 })}<span>${i === 0 ? "start" : "step " + i}</span></button>`).join("");
      hist.querySelectorAll("button").forEach((b, i) => paint(b, S.steps[i]));
    }
    fig.addEventListener("click", (e) => {
      const h = e.target.closest(".edge-hit");
      if (!h) return;
      const st = S.steps[S.cur], G = st.G, e0 = +h.dataset.e;
      const [u, v] = G.edges[e0];
      const ex = MG.excess(G);
      const { graph, vmap } = MG.contractSet(G, G.edges.map((_, i) => i === e0));
      const col = [];
      G.w.forEach((_, x) => { if (col[vmap[x]] === undefined) col[vmap[x]] = st.col[x]; });
      const sw = (c) => `<i style="display:inline-block;width:10px;height:10px;border-radius:2px;vertical-align:-1px;background:${vcol(c)}"></i>`;
      const msg = u === v
        ? `Contracted a loop at ${sw(st.col[u])}: its weight went from ${G.w[u]} to ${G.w[u] + 1} and |<i>E</i>| − |<i>V</i>| + 1 dropped by 1. Its budget stays ${ex[u]}: the weight term goes up by 2 and the vertex loses 2 half-edges.`
        : `Merged ${sw(st.col[u])} and ${sw(st.col[v])}: the weights add to ${G.w[u] + G.w[v]}, |V| and |E| each drop by 1, and the budgets add: ${ex[u]} + ${ex[v]} = ${ex[u] + ex[v]}.`;
      S.steps = S.steps.slice(0, S.cur + 1);
      S.steps.push({ G: graph, col, msg });
      S.cur++;
      render();
    });
    fig.addEventListener("mouseover", (e) => {
      const h = e.target.closest(".edge-hit");
      fig.querySelectorAll(".edge-path.hover").forEach((p) => p.classList.remove("hover"));
      if (h) fig.querySelector(`.edge-path[data-e="${h.dataset.e}"]`)?.classList.add("hover");
    });
    hist.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { S.cur = +b.dataset.i; render(); } });
    $("#con-pick").addEventListener("click", (e) => {
      const b = e.target.closest(".segbtn");
      if (!b) return;
      S.start = +b.dataset.i;
      $("#con-pick").querySelectorAll(".segbtn").forEach((x) => x.setAttribute("aria-pressed", String(+x.dataset.i === S.start)));
      reset();
    });
    $("#con-reset").addEventListener("click", reset);
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
  run(anatomy);
  run(stability);
  run(contraction);
  run(cone);
  document.querySelectorAll("[data-space]").forEach((el) => run(() => spaceWidget(el)));
  run(petersen);
  run(genus2);
  run(pinch);
  run(toc);
})();
