/* Drawing graphs: stress layouts (static and metric) and SVG rendering. */
(function (root) {
  "use strict";
  const MG = root.MG;
  const num = (v) => (Math.round(v * 10) / 10).toString();

  /* Seeded RNG so layouts are the same on every load. */
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }

  /* Layout nodes: vertices, then leg tips, then one node per loop (the far end of the loop). */
  function nodesOf(G) {
    const k = G.w.length;
    const nodes = [];
    for (let v = 0; v < k; v++) nodes.push({ kind: "v", v });
    G.legs.forEach((v, i) => nodes.push({ kind: "leg", v, i }));
    G.edges.forEach(([u, v], e) => { if (u === v) nodes.push({ kind: "loop", v, e }); });
    return nodes;
  }

  /* distance matrix by Floyd–Warshall; len(e) gives the target length of each edge */
  function distances(G, nodes, len, legLen, loopLen) {
    const N = nodes.length;
    const D = Array.from({ length: N }, () => new Array(N).fill(Infinity));
    for (let i = 0; i < N; i++) D[i][i] = 0;
    const link = (a, b, d) => { if (d < D[a][b]) { D[a][b] = D[b][a] = d; } };
    G.edges.forEach(([u, v], e) => { if (u !== v) link(u, v, len(e)); });
    nodes.forEach((nd, i) => {
      if (nd.kind === "leg") link(i, nd.v, legLen);
      if (nd.kind === "loop") link(i, nd.v, loopLen(nd.e));
    });
    for (let m = 0; m < N; m++) for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const d = D[i][m] + D[m][j];
      if (d < D[i][j]) D[i][j] = d;
    }
    return D;
  }

  function smacof(X, D, iters, pinned) {
    const N = X.length;
    for (let it = 0; it < iters; it++) {
      for (let i = 0; i < N; i++) {
        if (pinned && pinned[i]) continue;
        let sx = 0, sy = 0, sw = 0;
        for (let j = 0; j < N; j++) {
          if (j === i || !isFinite(D[i][j])) continue;
          const d = Math.max(D[i][j], 0.03);
          const w = 1 / (d * d);
          const dx = X[i][0] - X[j][0], dy = X[i][1] - X[j][1];
          const dist = Math.hypot(dx, dy) || 1e-6;
          sx += w * (X[j][0] + (d * dx) / dist);
          sy += w * (X[j][1] + (d * dy) / dist);
          sw += w;
        }
        if (sw > 0) X[i] = [sx / sw, sy / sw];
      }
    }
    return X;
  }
  function stress(X, D) {
    let s = 0;
    for (let i = 0; i < X.length; i++) for (let j = i + 1; j < X.length; j++) {
      if (!isFinite(D[i][j])) continue;
      const d = Math.max(D[i][j], 0.03);
      const e = Math.hypot(X[i][0] - X[j][0], X[i][1] - X[j][1]) - d;
      s += (e * e) / (d * d);
    }
    return s;
  }
  function crossings(X, segs) {
    let c = 0;
    const ccw = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
      const [a, b] = segs[i], [p, q] = segs[j];
      if (a === p || a === q || b === p || b === q) continue;
      const A = X[a], B = X[b], P = X[p], Q = X[q];
      if (ccw(A, B, P) * ccw(A, B, Q) < 0 && ccw(P, Q, A) * ccw(P, Q, B) < 0) c++;
    }
    return c;
  }

  /* Static layout: returns positions for all nodes, in roughly unit scale. */
  function layout(G, seed = 7) {
    const nodes = nodesOf(G);
    const N = nodes.length;
    if (N === 1) return { nodes, X: [[0, 0]] };
    const D = distances(G, nodes, () => 1, 0.62, () => 0.85);
    const segs = [];
    G.edges.forEach(([u, v]) => { if (u !== v) segs.push([u, v]); });
    nodes.forEach((nd, i) => { if (nd.kind !== "v") segs.push([i, nd.v]); });
    let best = null, bestScore = Infinity;
    const R = rng(seed + 31 * N);
    for (let t = 0; t < 10; t++) {
      let X = nodes.map(() => [R() * 2 - 1, R() * 2 - 1]);
      X = smacof(X, D, 160);
      const score = stress(X, D) + 0.8 * crossings(X, segs);
      if (score < bestScore - 1e-9) { bestScore = score; best = X; }
    }
    return { nodes, X: orient(best) };
  }

  /* Rotate so the principal axis is horizontal, centre at the origin. */
  function orient(X) {
    const n = X.length;
    const cx = X.reduce((s, p) => s + p[0], 0) / n, cy = X.reduce((s, p) => s + p[1], 0) / n;
    let sxx = 0, syy = 0, sxy = 0;
    X.forEach(([x, y]) => { sxx += (x - cx) ** 2; syy += (y - cy) ** 2; sxy += (x - cx) * (y - cy); });
    const a = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    const c = Math.cos(-a), s = Math.sin(-a);
    return X.map(([x, y]) => [(x - cx) * c - (y - cy) * s, (x - cx) * s + (y - cy) * c]);
  }

  /* ---------- geometry of edges ---------- */
  /* Paths for every edge, given node positions in screen coordinates.
     bulge(e) optionally overrides the sideways offset of non-loop edges. */
  function edgeGeometry(G, nodes, P, opts = {}) {
    const loopIdx = new Map();
    nodes.forEach((nd, i) => { if (nd.kind === "loop") loopIdx.set(nd.e, i); });
    const groups = new Map();
    G.edges.forEach(([u, v], e) => {
      if (u === v) return;
      const key = u + "," + v;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e);
    });
    const geo = [];
    const scale = opts.scale || 40;
    for (const [key, es] of groups) {
      const [u, v] = key.split(",").map(Number);
      const A = P[u], B = P[v];
      const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L, ny = dx / L;
      es.forEach((e, j) => {
        let off;
        if (opts.bulge) {
          // metric drawings: a lobe (cubic) that becomes a loop as its two ends come together
          const k = opts.bulge(e, j, es, L);
          geo[e] = lobe(A, B, k);
          return;
        }
        off = (j - (es.length - 1) / 2) * BULGE * Math.min(scale, L);
        const cx = (A[0] + B[0]) / 2 + nx * off * 2, cy = (A[1] + B[1]) / 2 + ny * off * 2;
        geo[e] = { kind: "arc", a: A, b: B, c: [cx, cy], d: `M${num(A[0])} ${num(A[1])}Q${num(cx)} ${num(cy)} ${num(B[0])} ${num(B[1])}` };
      });
    }
    G.edges.forEach(([u, v], e) => {
      if (u !== v) return;
      const V = P[u], T = P[loopIdx.get(e)];
      const dx = T[0] - V[0], dy = T[1] - V[1];
      const s = Math.hypot(dx, dy) || 1;
      if (opts.loopK) { geo[e] = lobe(V, V, opts.loopK(e), [dx / s, dy / s]); return; }
      const th = Math.atan2(dy, dx), del = 0.5;
      const k = s * 1.35;
      const c1 = [V[0] + k * Math.cos(th - del), V[1] + k * Math.sin(th - del)];
      const c2 = [V[0] + k * Math.cos(th + del), V[1] + k * Math.sin(th + del)];
      geo[e] = { kind: "loop", a: V, c1, c2, d: `M${num(V[0])} ${num(V[1])}C${num(c1[0])} ${num(c1[1])} ${num(c2[0])} ${num(c2[1])} ${num(V[0])} ${num(V[1])}` };
    });
    return geo;
  }
  /* A lobe from A to B: control points at distance |k| from each end, leaning out to the side
     sign(k) and spread apart by LOBE radians. With A = B it is a loop. */
  const LOBE = 0.78;
  function lobe(A, B, k, dir) {
    let dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy);
    if (L < 1e-9) {
      // a closed lobe (a loop) pointing along dir
      const sd = k < 0 ? -1 : 1;
      if (dir) { dx = sd * dir[1]; dy = -sd * dir[0]; } else { dx = 1; dy = 0; }
      L = 1;
    }
    const tx = dx / L, ty = dy / L, sd = k < 0 ? -1 : 1, kk = Math.abs(k);
    const nx = -ty * sd, ny = tx * sd, c = Math.cos(LOBE), s = Math.sin(LOBE);
    const c1 = [A[0] + kk * (nx * c - tx * s), A[1] + kk * (ny * c - ty * s)];
    const c2 = [B[0] + kk * (nx * c + tx * s), B[1] + kk * (ny * c + ty * s)];
    return { kind: "lobe", a: A, b: B, c1, c2, d: `M${num(A[0])} ${num(A[1])}C${num(c1[0])} ${num(c1[1])} ${num(c2[0])} ${num(c2[1])} ${num(B[0])} ${num(B[1])}` };
  }
  /* control length k for which the lobe over a chord of length c has length len */
  function lobeK(c, len) {
    if (len <= c) return 0;
    const arc = (k) => { const g = lobe([0, 0], [c, 0], k); let L = 0, p = g.a; for (let i = 1; i <= 24; i++) { const q = along(g, i / 24); L += Math.hypot(q[0] - p[0], q[1] - p[1]); p = q; } return L; };
    let lo = 0, hi = Math.max(len, 1e-6);
    while (arc(hi) < len) hi *= 2;
    for (let it = 0; it < 22; it++) { const mid = (lo + hi) / 2; if (arc(mid) < len) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }
  /* point at parameter t along an edge's path, from its first endpoint */
  function along(g, t) {
    if (g.kind === "arc") {
      const u = 1 - t;
      return [u * u * g.a[0] + 2 * u * t * g.c[0] + t * t * g.b[0], u * u * g.a[1] + 2 * u * t * g.c[1] + t * t * g.b[1]];
    }
    const u = 1 - t;
    const P0 = g.a, P1 = g.c1, P2 = g.c2, P3 = g.b || g.a;
    return [0, 1].map((k) => u * u * u * P0[k] + 3 * u * u * t * P1[k] + 3 * u * t * t * P2[k] + t * t * t * P3[k]);
  }

  /* ---------- SVG ---------- */
  const VNAMES = "abcdefghijklmnop";
  const BULGE = 0.34; // sideways bow of parallel edges, as a fraction of the distance between their ends
  /* Fit node positions X (unit scale) into a w x h box. Returns screen positions. */
  function fit(X, nodes, G, w, h, pad, maxScale) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    // include loop extents and the tops of the arcs of parallel edges
    const pts = X.slice();
    const groups = new Map();
    G.edges.forEach(([u, v]) => { if (u !== v) groups.set(u + "," + v, (groups.get(u + "," + v) || 0) + 1); });
    for (const [key, m] of groups) {
      if (m < 2) continue;
      const [u, v] = key.split(",").map(Number);
      const A = X[u], B = X[v];
      const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
      for (let j = 0; j < m; j++) {
        const off = (j - (m - 1) / 2) * BULGE * Math.min(1, L);
        pts.push([(A[0] + B[0]) / 2 - (dy / L) * off, (A[1] + B[1]) / 2 + (dx / L) * off]);
      }
    }
    nodes.forEach((nd, i) => {
      if (nd.kind === "loop") {
        const V = X[nd.v], T = X[i];
        pts.push([V[0] + (T[0] - V[0]) * 1.15, V[1] + (T[1] - V[1]) * 1.15]);
      }
    });
    pts.forEach(([x, y]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); });
    const sx = (w - 2 * pad) / Math.max(maxX - minX, 1e-6), sy = (h - 2 * pad) / Math.max(maxY - minY, 1e-6);
    const s = Math.min(sx, sy, maxScale || Infinity);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    return { P: X.map(([x, y]) => [w / 2 + (x - cx) * s, h / 2 + (y - cy) * s]), s };
  }

  /* opts: w, h, pad, vnames (bool), halfLabels (bool), edgeColors (fn e -> colour), hit (bool),
     dot, font, strokeW, maxScale, idPrefix */
  function svgBody(G, nodes, P, s, o) {
    const geo = edgeGeometry(G, nodes, P, { scale: s, bulge: o.bulge, loopK: o.loopK });
    const dot = o.dot || 3.4;
    const strokeW = o.strokeW || 1.6;
    let out = "";
    // legs
    nodes.forEach((nd, i) => {
      if (nd.kind !== "leg") return;
      const V = P[nd.v], T = P[i];
      out += `<line class="leg" x1="${num(V[0])}" y1="${num(V[1])}" x2="${num(T[0])}" y2="${num(T[1])}" stroke="var(--muted)" stroke-width="${strokeW * 0.85}"/>`;
    });
    // edges
    G.edges.forEach((_, e) => {
      const col = o.edgeColors ? o.edgeColors(e) : "var(--ink)";
      out += `<path class="edge-path" data-e="${e}" d="${geo[e].d}" fill="none" stroke="${col}" stroke-width="${strokeW}" stroke-linecap="round"/>`;
      if (o.hit) out += `<path class="edge-hit" data-e="${e}" d="${geo[e].d}" fill="none" stroke="transparent" stroke-width="14"><title>Contract this edge</title></path>`;
    });
    // leg labels
    nodes.forEach((nd, i) => {
      if (nd.kind !== "leg") return;
      const V = P[nd.v], T = P[i];
      const dx = T[0] - V[0], dy = T[1] - V[1], L = Math.hypot(dx, dy) || 1;
      const lx = T[0] + (dx / L) * (o.font * 0.75), ly = T[1] + (dy / L) * (o.font * 0.75);
      out += `<circle cx="${num(T[0])}" cy="${num(T[1])}" r="${dot * 0.45}" fill="var(--muted)"/>`;
      out += `<text x="${num(lx)}" y="${num(ly)}" font-size="${o.font}" text-anchor="middle" dominant-baseline="central" fill="var(--muted)" font-family="var(--mono)">${nd.i + 1}</text>`;
    });
    // half-edge labels
    if (o.halfLabels) {
      const n = G.legs.length;
      G.edges.forEach((_, e) => {
        const g = geo[e];
        const ts = g.kind === "arc" ? [0.24, 0.76] : [0.2, 0.8];
        ts.forEach((t, k) => {
          const p = along(g, t);
          out += `<g class="hlab" data-h="${n + 2 * e + 1 + k}"><circle cx="${num(p[0])}" cy="${num(p[1])}" r="${o.font * 0.78}" fill="var(--panel)" stroke="var(--rule)"/><text x="${num(p[0])}" y="${num(p[1])}" font-size="${o.font * 0.86}" text-anchor="middle" dominant-baseline="central" fill="var(--ink)" font-family="var(--mono)">${n + 2 * e + 1 + k}</text></g>`;
        });
      });
    }
    // vertices
    G.w.forEach((w, v) => {
      const [x, y] = P[v];
      if (w > 0) {
        const r = Math.max(dot * 1.9, o.font * 0.72);
        out += `<circle class="vtx" data-v="${v}" cx="${num(x)}" cy="${num(y)}" r="${num(r)}" fill="var(--gen-soft)" stroke="var(--gen)" stroke-width="1.3"/>`;
        out += `<text x="${num(x)}" y="${num(y)}" font-size="${o.font}" text-anchor="middle" dominant-baseline="central" fill="var(--gen)" font-family="var(--mono)" font-weight="500">${w}</text>`;
      } else {
        out += `<circle class="vtx" data-v="${v}" cx="${num(x)}" cy="${num(y)}" r="${dot}" fill="var(--ink)"/>`;
      }
      if (o.vnames) {
        const r = w > 0 ? Math.max(dot * 1.9, o.font * 0.72) : dot;
        const off = vnameOffset(G, nodes, P, v, geo);
        out += `<text x="${num(x + off[0] * (r + 8))}" y="${num(y + off[1] * (r + 8))}" font-size="${o.font * 1.05}" text-anchor="middle" dominant-baseline="central" fill="var(--atom)" font-family="var(--display)" font-style="italic">${VNAMES[v]}</text>`;
      }
    });
    return out;
  }
  /* direction with the most room around vertex v, for its name */
  function vnameOffset(G, nodes, P, v, geo) {
    const dirs = [];
    const V = P[v];
    const add = (p) => { const a = Math.atan2(p[1] - V[1], p[0] - V[0]); if (isFinite(a)) dirs.push(a); };
    nodes.forEach((nd, i) => { if (nd.kind !== "v" && nd.v === v) add(P[i]); });
    G.edges.forEach(([a, b], e) => {
      if (a === v && b !== v) add(along(geo[e], 0.2));
      if (b === v && a !== v) add(along(geo[e], 0.8));
      if (a === v && b === v) { add(along(geo[e], 0.15)); add(along(geo[e], 0.85)); }
    });
    if (!dirs.length) return [0, -1];
    let best = -Math.PI / 2, score = -1;
    for (let c = 0; c < 48; c++) {
      const a = (c / 48) * 2 * Math.PI - Math.PI;
      const clear = Math.min(...dirs.map((d) => { const x = Math.abs(((d - a) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI); return x; }));
      if (clear > score + 1e-6) { score = clear; best = a; }
    }
    return [Math.cos(best), Math.sin(best)];
  }

  const cache = new Map();
  function layoutCached(G) {
    const key = JSON.stringify(G);
    if (!cache.has(key)) cache.set(key, layout(G));
    return cache.get(key);
  }

  function graphSvg(G, opts) {
    const o = Object.assign({ w: 120, h: 90, pad: 12, font: 10, dot: 3, strokeW: 1.4 }, opts);
    const L = layoutCached(G);
    const { P, s } = fit(L.X, L.nodes, G, o.w, o.h, o.pad, o.maxScale);
    const cls = o.cls ? ` class="${o.cls}"` : "";
    return `<svg${cls}${o.attrs || ""} viewBox="0 0 ${o.w} ${o.h}" role="img" aria-label="${o.label || "A stable graph"}">${svgBody(G, L.nodes, P, s, o)}</svg>`;
  }
  /* positions in screen coordinates for the same fit, for animations */
  function screenPositions(G, opts) {
    const o = Object.assign({ w: 120, h: 90, pad: 12 }, opts);
    const L = layoutCached(G);
    const { P, s } = fit(L.X, L.nodes, G, o.w, o.h, o.pad, o.maxScale);
    return { P, s, nodes: L.nodes, geo: edgeGeometry(G, L.nodes, P, { scale: s }) };
  }

  /* ---------- metric drawing ----------
     A MetricView keeps positions for the nodes of a fixed "cell graph" G and redraws the
     graph at given edge lengths, contracting edges of length zero. */
  class MetricView {
    constructor() { this.cellKey = null; this.X = null; this.loopX = {}; this.side = {}; }
    draw(G, lengths, opts) {
      const o = Object.assign({ w: 360, h: 260, pad: 30, font: 12, dot: 4, strokeW: 2.4 }, opts);
      const eps = 1e-6;
      const zero = lengths.map((l) => l < eps);
      const { graph: H, vmap, emap } = MG.contractSet(G, zero);
      const total = lengths.reduce((a, b) => a + b, 0) || 1;
      // opts.total fixes the length drawn at full size (for cones); otherwise the total length is
      const unit = 1 / (o.total || Math.max(total, 1e-9));
      const nodesG = nodesOf(G);
      const key = JSON.stringify(G);
      const R = rng(11);
      // small steps when the lengths moved only a little since the last drawing, so the picture
      // deforms gradually; a full relayout after a jump
      const tot0 = lengths.reduce((a, b) => a + b, 0) || 1;
      const ln = lengths.map((x) => x / (o.total || tot0));
      let smooth = this.cellKey === key && this.lastLn && this.lastLn.length === ln.length && ln.every((x, e) => Math.abs(x - this.lastLn[e]) < 0.06);
      this.lastLn = ln;
      if (this.cellKey !== key || !this.X) {
        // a new cell graph: start from the last drawing when the two meet along a common face,
        // otherwise from a fresh layout
        smooth = this.transfer(G, lengths, nodesG) === "near";
        if (this.transferred !== true) {
          const L = layout(G);
          this.X = L.X.map((p) => p.slice());
          this.scaleRef = null;
          this.loopX = {};
          this.side = {};
          this.col = G.edges.map((_, e) => e);
        }
        this.cellKey = key;
      }
      // nodes of H, keyed back to G
      const nodesH = nodesOf(H);
      const inv = new Map(); // H node index -> list of G node indices
      nodesG.forEach((nd, i) => {
        let j = -1;
        if (nd.kind === "v") j = vmap[nd.v];
        else if (nd.kind === "leg") j = H.w.length + nd.i;
        else if (nd.kind === "loop" && emap[nd.e] >= 0) j = nodesH.findIndex((m) => m.kind === "loop" && m.e === emap[nd.e]);
        if (j >= 0) { if (!inv.has(j)) inv.set(j, []); inv.get(j).push(i); }
      });
      // non-loop edges of G that become loops in H need a loop node: start it beside the vertex
      let XH = nodesH.map((nd, j) => {
        const src = inv.get(j);
        if (src && src.length) {
          const m = src.reduce((acc, i) => [acc[0] + this.X[i][0], acc[1] + this.X[i][1]], [0, 0]);
          return [m[0] / src.length, m[1] / src.length];
        }
        const eg = emap.indexOf(nd.e);
        if (this.loopX[eg]) return this.loopX[eg].slice();
        const base = inv.get(nd.v) ? inv.get(nd.v).map((i) => this.X[i]) : [[0, 0]];
        const b = base[0];
        return [b[0] + (R() - 0.5) * 0.4, b[1] + (R() - 0.5) * 0.4];
      });
      // target distances: edge lengths scaled so the total is about the size of the drawing
      const K = 2.4;
      const lenH = (eh) => {
        const e = emap.indexOf(eh);
        return Math.max(K * lengths[e] * unit, 0.015);
      };
      const D = distances(H, nodesH, lenH, 0.5, (eh) => Math.max(0.5 * lenH(eh), 0.03));
      const pinned = null;
      if (smooth) {
        const X0 = XH.map((p) => p.slice());
        XH = smacof(XH, D, 8, pinned);
        const cap = 0.035;
        XH = XH.map((p, i) => { const dx = p[0] - X0[i][0], dy = p[1] - X0[i][1], d = Math.hypot(dx, dy); return d > cap ? [X0[i][0] + (dx * cap) / d, X0[i][1] + (dy * cap) / d] : p; });
      } else XH = smacof(XH, D, 40, pinned);
      nodesH.forEach((nd, j) => { if (nd.kind === "loop") { const eg = emap.indexOf(nd.e); if (G.edges[eg][0] !== G.edges[eg][1]) this.loopX[eg] = XH[j].slice(); } });
      // write back into G's node positions
      nodesG.forEach((nd, i) => {
        let j = -1;
        if (nd.kind === "v") j = vmap[nd.v];
        else if (nd.kind === "leg") j = H.w.length + nd.i;
        else if (emap[nd.e] >= 0) j = nodesH.findIndex((m) => m.kind === "loop" && m.e === emap[nd.e]);
        if (j >= 0) this.X[i] = XH[j].slice();
        else this.X[i] = XH[vmap[nd.v]].slice(); // contracted loop collapses onto its vertex
      });
      // an edge whose ends have merged is drawn as a loop; keep its two ends a hair apart, lined up
      // so that when they separate the edge opens as a lobe on the side where the loop is
      const opened = [];
      G.edges.forEach(([u, v], e) => {
        if (u === v || emap[e] < 0) return;
        const eh = emap[e];
        if (H.edges[eh][0] !== H.edges[eh][1]) return;
        const j = nodesH.findIndex((m) => m.kind === "loop" && m.e === eh);
        if (j >= 0) opened.push({ e, u, v, V: XH[H.edges[eh][0]], Lp: XH[j], len: lengths[e] });
      });
      const kH = H.w.length;
      const attachW = (x) => {
        const pts = [];
        G.legs.forEach((lv, i) => { if (lv === x) pts.push(XH[kH + i]); });
        G.edges.forEach(([a, b]) => { const w = a === x ? b : b === x ? a : -1; if (w >= 0 && vmap[w] !== vmap[x]) pts.push(XH[vmap[w]]); });
        return pts;
      };
      this.nudgeMerged(G, (x) => vmap[x], (h) => XH[h], attachW);
      opened.sort((x, y) => x.len - y.len).forEach((x) => this.splitToward(G, x.e, x.u, x.v, x.V, x.Lp, attachW));
      // parallel edges bulge so the arc length roughly matches the edge length (layout units)
      const lenOf = (x) => lengths[emap.indexOf(x)];
      // each edge keeps its side as lengths change, so arcs never flip from one side to the other
      const bulgeU = (eh, j, es, chord) => {
        if (es.length === 1) return 0;
        const k = lobeK(chord, Math.max(K * lenOf(eh) * unit, 0.015));
        const eg = emap.indexOf(eh);
        if (es.length === 3) {
          // three parallel edges (the theta graph): the shortest is drawn straight and the other two
          // bow out on opposite sides; when another edge becomes the shortest it takes over the
          // straight position and the old one takes its side (they are equal, both straight, then)
          const egs = es.map((x) => emap.indexOf(x));
          const shortest = egs.reduce((a, b) => (lengths[b] < lengths[a] - 1e-12 ? b : a));
          const cur = egs.find((x) => this.side[x] === 0);
          if (cur === undefined) {
            const rest = egs.filter((x) => x !== shortest);
            const s0 = this.side[rest[0]] || -1;
            this.side[rest[0]] = s0;
            this.side[rest[1]] = -s0;
            this.side[shortest] = 0;
          } else if (cur !== shortest) {
            this.side[cur] = this.side[shortest] || 1;
            this.side[shortest] = 0;
          }
          // the two side edges always bow a little, so that three equal edges stay visibly apart
          return this.side[eg] === 0 ? 0 : this.side[eg] * Math.max(k + 0.02, 0.3 * chord);
        }
        const sd = this.side[eg] || (j % 2 === 1 ? 1 : -1);
        // opts.minBulge: parallel edges of equal length still bow apart, by this fraction of the chord
        return sd * Math.max(k + 0.02 + Math.floor(j / 2) * 0.06, o.minBulge ? o.minBulge * chord * (1 + Math.floor(j / 2)) : 0);
      };
      // bounding box of everything drawn, arcs and loops included
      const loopKU = (eh) => lobeK(0, Math.max(K * lenOf(eh) * unit, 0.015));
      // turn the picture so its long direction runs across the (wide) box; while the point moves
      // continuously the turn is gradual
      const n0 = XH.length, mx = XH.reduce((a, p) => a + p[0], 0) / n0, my = XH.reduce((a, p) => a + p[1], 0) / n0;
      let sxx = 0, syy = 0, sxy = 0;
      XH.forEach(([x, y]) => { sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); });
      const tr = sxx + syy, det = sxx * syy - sxy * sxy, disc = Math.sqrt(Math.max(tr * tr / 4 - det, 0));
      const l1 = tr / 2 + disc, l2 = tr / 2 - disc;
      let want = -0.5 * Math.atan2(2 * sxy, sxx - syy);
      if (this.ang == null) this.ang = 0;
      while (want - this.ang > Math.PI / 2) want -= Math.PI;
      while (want - this.ang < -Math.PI / 2) want += Math.PI;
      if (!smooth) { if (l1 > 1.15 * l2) this.ang = want; }
      else if (l1 > 1.3 * l2) this.ang += Math.max(-0.02, Math.min(0.02, (want - this.ang) * 0.1));
      const ca = Math.cos(this.ang), sa = Math.sin(this.ang);
      const rot = ([x, y]) => [x * ca - y * sa, x * sa + y * ca];
      const unrot = ([x, y]) => [x * ca + y * sa, -x * sa + y * ca];
      const XR = XH.map(rot);
      const geoU = edgeGeometry(H, nodesH, XR, { bulge: bulgeU, loopK: loopKU });
      // remember where each lobe reaches, so that if its ends merge the loop starts there
      G.edges.forEach((_, e) => { const eh = emap[e]; if (eh >= 0 && geoU[eh] && geoU[eh].kind === "lobe") this.loopX[e] = unrot(along(geoU[eh], 0.5)); });
      const pts = XR.slice();
      geoU.forEach((gm) => { if (gm) for (const t of [0.2, 0.35, 0.5, 0.65, 0.8]) pts.push(along(gm, t)); });
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      pts.forEach(([x, y]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); });
      const sFit = Math.min((o.w - 2 * o.pad) / Math.max(maxX - minX, 0.4), (o.h - 2 * o.pad) / Math.max(maxY - minY, 0.4));
      // keep the scale steady while dragging; change it only when the drawing no longer fits or gets small
      // shrink at once when the drawing outgrows the box, and grow back gradually
      if (!this.scaleRef || sFit < this.scaleRef) this.scaleRef = sFit;
      else this.scaleRef += (sFit - this.scaleRef) * 0.12;
      const s = this.scaleRef;
      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      const P = XR.map(([x, y]) => [o.w / 2 + (x - cx) * s, o.h / 2 + (y - cy) * s]);
      const bulge = (eh, j, es, chord) => bulgeU(eh, j, es, chord / s) * s;
      const colorOf = (eh) => o.edgeColors(this.colorIndex(emap.indexOf(eh)));
      const body = svgBody(H, nodesH, P, s, Object.assign({}, o, { bulge, loopK: (eh) => loopKU(eh) * s, edgeColors: o.edgeColors ? colorOf : null }));
      this.prev = { colH: H.edges.map((_, eh) => this.colorIndex(emap.indexOf(eh))), H, key: MG.canon(H).key, XH: XH.map((p) => p.slice()), nodesH, len: H.edges.map((_, eh) => lenOf(eh) * unit) };
      return { svg: `<svg viewBox="0 0 ${o.w} ${o.h}" role="img" aria-label="${o.label || "A metric graph"}">${body}</svg>`, H };
    }
  }

  /* All vertex bijections A -> B preserving weights, legs and edge multiplicities. */
  function vertexIsos(A, B) {
    const k = A.w.length;
    if (k !== B.w.length || A.edges.length !== B.edges.length || A.legs.length !== B.legs.length) return [];
    const MA = MG.mult(A), MB = MG.mult(B), LA = MG.legsAt(A), LB = MG.legsAt(B);
    const out = [];
    const rec = (i, sig, used) => {
      if (out.length >= 120) return;
      if (i === k) { out.push(sig.slice()); return; }
      for (let j = 0; j < k; j++) {
        if (used[j] || A.w[i] !== B.w[j] || LA[i].join() !== LB[j].join() || MA[i][i] !== MB[j][j]) continue;
        let ok = true;
        for (let a = 0; a < i && ok; a++) if (MA[i][a] !== MB[j][sig[a]]) ok = false;
        if (!ok) continue;
        sig[i] = j; used[j] = true;
        rec(i + 1, sig, used);
        used[j] = false;
      }
    };
    rec(0, [], []);
    return out;
  }
  /* The isomorphism A -> B whose edge matching changes edge lengths the least. */
  function bestIso(A, B, lenA, lenB) {
    let best = null;
    for (const sig of vertexIsos(A, B)) {
      const ga = new Map(), gb = new Map();
      const keyOf = (u, v) => (u <= v ? u + "," + v : v + "," + u);
      A.edges.forEach(([u, v], e) => { const k = keyOf(sig[u], sig[v]); if (!ga.has(k)) ga.set(k, []); ga.get(k).push(e); });
      B.edges.forEach(([u, v], e) => { const k = keyOf(u, v); if (!gb.has(k)) gb.set(k, []); gb.get(k).push(e); });
      const emap = [];
      let score = 0, ok = true;
      for (const [k, ea] of ga) {
        const eb = gb.get(k);
        if (!eb || eb.length !== ea.length) { ok = false; break; }
        const sa = ea.slice().sort((x, y) => lenA[x] - lenA[y]), sb = eb.slice().sort((x, y) => lenB[x] - lenB[y]);
        sa.forEach((e, i) => { emap[e] = sb[i]; score += Math.abs(lenA[e] - lenB[sb[i]]); });
      }
      if (ok && (!best || score < best.score)) best = { sig, emap, score };
    }
    return best;
  }
  /* Seed positions for a new cell graph G from the previous drawing. Both cells contain a common
     face (a graph obtained from each by contracting some edges); pick the face that needs the
     least total length contracted, match it to the previous drawing, and copy positions over.
     Vertices that the face merges start together and separate as their edges grow. */
  MetricView.prototype.transfer = function (G, lengths, nodesG) {
    const P = this.prev;
    this.transferred = false;
    if (!P) return false;
    const m = G.edges.length, mp = P.H.edges.length;
    if (m > 8 || mp > 8 || G.legs.length !== P.H.legs.length) return false;
    const tot = lengths.reduce((a, b) => a + b, 0) || 1;
    const faces = [];
    for (let mk = 0; mk < 1 << mp; mk++) {
      const Zp = P.H.edges.map((_, e) => !!(mk & (1 << e)));
      const cp = MG.contractSet(P.H, Zp);
      const lenB = [];
      P.H.edges.forEach((_, e) => { if (cp.emap[e] >= 0) lenB[cp.emap[e]] = P.len[e]; });
      faces.push({ zl: P.len.reduce((s, x, e) => s + (Zp[e] ? x : 0), 0), cp, lenB, key: MG.canon(cp.graph).key });
    }
    let best = null;
    for (let mk = 0; mk < 1 << m; mk++) {
      const Z = G.edges.map((_, e) => !!(mk & (1 << e)));
      const zl = lengths.reduce((s, x, e) => s + (Z[e] ? x : 0), 0) / tot;
      const c = MG.contractSet(G, Z);
      const key = MG.canon(c.graph).key;
      const lenA = [];
      G.edges.forEach((_, e) => { if (c.emap[e] >= 0) lenA[c.emap[e]] = lengths[e] / tot; });
      for (const f of faces) {
        if (f.key !== key) continue;
        const score = zl + f.zl;
        if (best && score >= best.score - 1e-12) continue;
        const iso = bestIso(c.graph, f.cp.graph, lenA, f.lenB);
        if (iso) best = { score, c, f, iso };
      }
    }
    this.transferred = false;
    if (!best) return false;
    this.transferred = true;
    const { c, f, iso } = best;
    const B = f.cp.graph, kP = P.H.w.length;
    // positions of the face's vertices: the mean of the previous vertices that merged into them
    const vpos = B.w.map(() => [0, 0]), cnt = B.w.map(() => 0);
    P.H.w.forEach((_, v) => { const b = f.cp.vmap[v]; vpos[b][0] += P.XH[v][0]; vpos[b][1] += P.XH[v][1]; cnt[b]++; });
    vpos.forEach((p, b) => { p[0] /= cnt[b]; p[1] /= cnt[b]; });
    // a loop of the face sits where the previous drawing had it, or just beside its vertex
    const loopPos = (eb) => {
      const pe = f.cp.emap.indexOf(eb);
      const j = P.nodesH.findIndex((nd) => nd.kind === "loop" && nd.e === pe);
      if (j >= 0) return P.XH[j].slice();
      const b = vpos[B.edges[eb][0]], a = 1.3 * eb + 0.4;
      return [b[0] + 0.3 * Math.cos(a), b[1] + 0.3 * Math.sin(a)];
    };
    const seen = {};
    this.X = nodesG.map((nd) => {
      if (nd.kind === "leg") return P.XH[kP + nd.i].slice();
      const b = iso.sig[c.vmap[nd.v]];
      if (nd.kind === "v") {
        const t = (seen[b] = (seen[b] || 0) + 1) - 1;
        return [vpos[b][0] + 0.02 * t * Math.cos(2.4 * t), vpos[b][1] + 0.02 * t * Math.sin(2.4 * t)];
      }
      const fe = c.emap[nd.e];
      if (fe >= 0) return loopPos(iso.emap[fe]);
      return [vpos[b][0] + 0.03, vpos[b][1] + 0.03];
    });
    this.loopX = {};
    this.side = {};
    // edges keep their colours across the change of cell; new edges take unused colours
    const col = G.edges.map(() => -1);
    G.edges.forEach((_, e) => {
      if (c.emap[e] < 0 || !P.colH) return;
      const pe = f.cp.emap.indexOf(iso.emap[c.emap[e]]);
      if (pe >= 0) col[e] = P.colH[pe];
    });
    const usedC = new Set(col.filter((x) => x >= 0));
    let nc = 0;
    col.forEach((x, e) => { if (x < 0) { while (usedC.has(nc)) nc++; col[e] = nc; usedC.add(nc); } });
    this.col = col;
    const opened = [];
    G.edges.forEach(([u, v], e) => {
      if (u === v || c.emap[e] < 0) return;
      const eb = iso.emap[c.emap[e]];
      if (B.edges[eb][0] !== B.edges[eb][1]) return;
      this.loopX[e] = loopPos(eb);
      opened.push({ e, u, v, V: vpos[B.edges[eb][0]], Lp: loopPos(eb), len: lengths[e] });
    });
    const kG = G.w.length;
    const attachT = (x) => {
      const pts = [];
      G.legs.forEach((lv, i) => { if (lv === x) pts.push(this.X[kG + i]); });
      G.edges.forEach(([a, b]) => { const w = a === x ? b : b === x ? a : -1; if (w >= 0 && iso.sig[c.vmap[w]] !== iso.sig[c.vmap[x]]) pts.push(this.X[w]); });
      return pts;
    };
    this.nudgeMerged(G, (x) => iso.sig[c.vmap[x]], (b) => vpos[b], attachT);
    opened.sort((x, y) => x.len - y.len).forEach((x) => this.splitToward(G, x.e, x.u, x.v, x.V, x.Lp, attachT));
    return best.score < 0.12 ? "near" : true;
  };
  /* palette index of edge e of the current cell graph (stable across changes of cell) */
  MetricView.prototype.colorIndex = function (e) { return this.col && this.col[e] != null ? this.col[e] : e; };
  /* Vertices of G drawn at one point (merged by contraction) start a hair apart, each moved toward
     the legs and neighbours attached to it, so that they separate the right way round. */
  MetricView.prototype.nudgeMerged = function (G, groupOf, posOf, attach) {
    const groups = new Map();
    G.w.forEach((_, x) => { const h = groupOf(x); if (!groups.has(h)) groups.set(h, []); groups.get(h).push(x); });
    for (const [h, xs] of groups) {
      if (xs.length < 2) continue;
      const V = posOf(h);
      xs.forEach((x) => {
        const pts = attach(x);
        if (!pts.length) return;
        const mx = pts.reduce((a, p) => a + p[0], 0) / pts.length, my = pts.reduce((a, p) => a + p[1], 0) / pts.length;
        const dx = mx - V[0], dy = my - V[1], L = Math.hypot(dx, dy);
        if (L > 1e-9) this.X[x] = [V[0] + (0.01 * dx) / L, V[1] + (0.01 * dy) / L];
      });
    }
  };
  /* Put the ends u, v of edge e a hair either side of V, so that its lobe opens toward Lp. Of the
     two ways to do that, use the one that puts u on the side of the things attached to u. */
  MetricView.prototype.splitToward = function (G, e, u, v, V, Lp, attach) {
    const grp = [];
    G.edges.forEach(([a, b], i) => { if (a === u && b === v) grp.push(i); });
    let nx = Lp[0] - V[0], ny = Lp[1] - V[1];
    const L = Math.hypot(nx, ny) || 1;
    nx /= L; ny /= L;
    const mean = (pts) => pts.reduce((m, p) => [m[0] + p[0] / pts.length, m[1] + p[1] / pts.length], [0, 0]);
    const pu = attach(u), pv = attach(v);
    let sd = this.side[e] || (grp.indexOf(e) % 2 === 1 ? 1 : -1);
    if (pu.length || pv.length) {
      const a = pu.length ? mean(pu) : V, b = pv.length ? mean(pv) : V;
      const dot = ny * (b[0] - a[0]) - nx * (b[1] - a[1]);
      if (Math.abs(dot) > 1e-6) sd = dot > 0 ? 1 : -1;
    }
    this.side[e] = sd;
    grp.forEach((i) => { if (i !== e) this.side[i] = -sd; });
    const tx = sd * ny, ty = -sd * nx, eps = 0.01;
    this.X[u] = [V[0] - eps * tx, V[1] - eps * ty];
    this.X[v] = [V[0] + eps * tx, V[1] + eps * ty];
  };

  /* The stability check: 2w(v) − 2 + |r⁻¹(v)| > 0 at every vertex. name(v) labels a vertex and
     swatch(v), if given, is a colour to key the row to the drawing. */
  function stabilityHtml(G, { name, swatch } = {}) {
    const val = MG.valence(G), ex = MG.excess(G);
    const rows = G.w.map((w, v) => `<tr><td class="sv">${swatch ? `<i style="background:${swatch(v)}"></i>` : ""}${name ? name(v) : "v" + (v + 1)}</td><td>${w}</td><td>${val[v]}</td><td>2·${w} − 2 + ${val[v]} = ${ex[v]}</td><td class="${ex[v] > 0 ? "ok" : "bad"}">${ex[v] > 0 ? "✓" : "✗"}</td></tr>`).join("");
    const ok = ex.every((x) => x > 0);
    return `<div class="stab-check"><h4>Stability check</h4>
      <div class="rscroll"><table class="stab-t"><thead><tr><th>vertex</th><th><i>w</i>(<i>v</i>)</th><th>|<i>r</i><sup>−1</sup>(<i>v</i>)|</th><th>2<i>w</i>(<i>v</i>) − 2 + |<i>r</i><sup>−1</sup>(<i>v</i>)|</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="note">${ok ? `Every vertex has 2<em class="m">w</em>(<em class="m">v</em>) − 2 + |<em class="m">r</em><sup>−1</sup>(<em class="m">v</em>)| &gt; 0, so the graph is stable.` : "Some vertex fails the check, so this graph is not stable."}</p></div>`;
  }

  root.MD = { layout, graphSvg, screenPositions, along, MetricView, VNAMES, num, stabilityHtml };
})(window);
