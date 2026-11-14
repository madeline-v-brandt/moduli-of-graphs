/* Δ_{1,3} in space.

   Δ_{1,3} is 2-dimensional: 5 vertices, 10 edges and 7 triangles. Unlike Δ_{0,6} it sits in ℝ³
   without crossing itself, and this draws it that way.

   Vertices: L, the loop at a vertex carrying all three legs, and B0, B1, B2, B3, a weight-one vertex
   (carrying no leg, or leg i) joined by a separating edge to a vertex carrying the other legs.
   Edges: f_i, two parallel edges with leg i alone on one vertex. Swapping them folds the segment in
   half, so it runs from L to a fold point m_i. Then L–Bx (a loop and a separating edge) and B0–Bi.
   Triangles: C, the 3-cycle with one leg at each vertex. Its sides are f_1, f_2, f_3, each folded in
   half, and folding all three zips C up into a sphere: the corners go to L at the top and the
   sides become three seams from L down to m_i. D_i, two parallel edges and a separating edge,
   folded in half: the half-triangle L, m_i, B_i, attached along the seam f_i. E_i, a loop with a
   path to leg i and then to the other two: the triangle L, B0, B_i.
   So: a sphere with three seams, and along seam i a flat fin D_i ∪ E_i in the half-plane through
   the axis at angle φ_i. The fins meet only along the spine L–B0. Permuting the legs acts by the
   rotations and reflections of that picture. */
(function (root) {
  "use strict";
  const MD = root.MD, num = MD.num;
  const { turntable, apply, rotX, rotY, mul } = root.Turn3D;
  const W = 560, H = 430, S0 = 104, CAM = 7, CY = 0.45;

  /* ---------- the cells, named ---------- */
  const legsAt = (G, v) => G.legs.map((u, l) => (u === v ? l + 1 : 0)).filter(Boolean);
  function classify(data) {
    const key = new Map();
    data.graphs.forEach((G, i) => {
      if (data.rank[i] !== 1) return;
      const [u, v] = G.edges[0];
      key.set(i, u === v ? "L" : "B" + (legsAt(G, G.w.indexOf(1))[0] || 0));
    });
    data.graphs.forEach((G, i) => {
      if (data.rank[i] !== 2) return;
      const d = data.down[i].map((j) => key.get(j));
      if (d.length === 1) key.set(i, "f" + legsAt(G, [0, 1].find((v) => legsAt(G, v).length === 1))[0]);
      else if (d.includes("L")) key.set(i, "L" + d.find((x) => x !== "L"));
      else key.set(i, "B0" + d.find((x) => x !== "B0"));
    });
    data.graphs.forEach((G, i) => {
      if (data.rank[i] !== 3) return;
      const d = data.down[i].map((j) => key.get(j));
      const f = d.filter((x) => x[0] === "f");
      if (f.length === 3) key.set(i, "C");
      else if (f.length === 1) key.set(i, "D" + f[0][1]);
      else key.set(i, "E" + d.find((x) => x.startsWith("B0")).slice(-1));
    });
    return key;
  }
  const LEGS = [1, 2, 3];
  const others = (i) => LEGS.filter((x) => x !== i);
  const VKEYS = ["L", "B0", "B1", "B2", "B3"];
  const EDGE_V = { LB0: ["L", "B0"] };
  const TRI_V = { C: ["L"] }, TRI_E = { C: ["f1", "f2", "f3"] };
  LEGS.forEach((i) => {
    EDGE_V["f" + i] = ["L"];
    EDGE_V["LB" + i] = ["L", "B" + i];
    EDGE_V["B0B" + i] = ["B0", "B" + i];
    TRI_V["D" + i] = ["L", "B" + i]; TRI_E["D" + i] = ["f" + i, "LB" + i];
    TRI_V["E" + i] = ["L", "B0", "B" + i]; TRI_E["E" + i] = ["LB0", "LB" + i, "B0B" + i];
  });
  const VLABEL = { L: "loop", B0: "∅ | 123" };
  LEGS.forEach((i) => { VLABEL["B" + i] = `${i} | ${others(i).join("")}`; });

  /* ---------- the shape ---------- */
  // a page is the half-plane through the vertical axis at angle φ_i; (r, h) are coordinates in it
  const PHI = (i) => -Math.PI / 2 + (2 * Math.PI * (i - 1)) / 3;
  const raw = (i, r, h) => [r * Math.cos(PHI(i)), h, r * Math.sin(PHI(i))];
  const at = (i, r, h) => { const p = raw(i, r, h); p[1] -= CY; return p; };
  const B0H = 1.7, BR = 1.35, BH = 1.15;
  const POS = { L: at(1, 0, 1), B0: at(1, 0, B0H) };
  LEGS.forEach((i) => { POS["B" + i] = at(i, BR, BH); });
  const arcPt = (i, s) => at(i, Math.sin((s * Math.PI) / 2), Math.cos((s * Math.PI) / 2));
  const lerp = (a, b, t) => a.map((x, k) => x + (b[k] - x) * t);
  const NARC = 8; // pieces along a seam, one per band of the sphere

  /* The pieces. Grids are lined up so that each piece of an edge is a side of the small faces
     next to it; drawing an edge just after the nearest of those faces keeps it on top of its own
     fin or of the sphere, while nearer faces still cover it. */
  function buildMesh() {
    const faces = [], segs = [], marks = [];
    // the sphere C, with the seams along meridians at φ_i and the fold points on the equator
    const NL = 16, NK = 48;
    const sp = (th, ph) => [Math.sin(th) * Math.cos(ph), Math.cos(th) - CY, Math.sin(th) * Math.sin(ph)];
    for (let j = 0; j < NL; j++) for (let k = 0; k < NK; k++) {
      const t0 = (j * Math.PI) / NL, t1 = ((j + 1) * Math.PI) / NL, p0 = (k * 2 * Math.PI) / NK, p1 = ((k + 1) * 2 * Math.PI) / NK;
      const tm = (t0 + t1) / 2, pm = (p0 + p1) / 2;
      faces.push({ cell: "C", sphere: true, n: [Math.sin(tm) * Math.cos(pm), Math.cos(tm), Math.sin(tm) * Math.sin(pm)], pts: j === 0 ? [sp(t0, p0), sp(t1, p1), sp(t1, p0)] : j === NL - 1 ? [sp(t0, p0), sp(t0, p1), sp(t1, p0)] : [sp(t0, p0), sp(t0, p1), sp(t1, p1), sp(t1, p0)] });
    }
    const N = 4; // pieces along each straight edge
    const line = (key, P, Q, extra) => { for (let s = 0; s < N; s++) segs.push(Object.assign({ key, a: lerp(P, Q, s / N), b: lerp(P, Q, (s + 1) / N) }, extra)); };
    LEGS.forEach((i) => {
      const n = [-Math.sin(PHI(i)), 0, Math.cos(PHI(i))];
      const B = POS["B" + i];
      // E_i: the triangle L, B0, B_i
      const bary = (a, b) => [0, 1, 2].map((k) => POS.L[k] * (1 - (a + b) / N) + POS.B0[k] * (a / N) + B[k] * (b / N));
      for (let a = 0; a < N; a++) for (let b = 0; a + b < N; b++) {
        faces.push({ cell: "E" + i, n, pts: [bary(a, b), bary(a + 1, b), bary(a, b + 1)] });
        if (a + b < N - 1) faces.push({ cell: "E" + i, n, pts: [bary(a + 1, b), bary(a + 1, b + 1), bary(a, b + 1)] });
      }
      // D_i: from the seam (an arc of the sphere) out to B_i
      const q = (a, b) => lerp(arcPt(i, a / NARC), B, b / N);
      for (let a = 0; a < NARC; a++) for (let b = 0; b < N; b++)
        faces.push({ cell: "D" + i, n, pts: b === N - 1 ? [q(a, b), q(a + 1, b), B] : [q(a, b), q(a + 1, b), q(a + 1, b + 1), q(a, b + 1)] });
      for (let s = 0; s < NARC; s++) segs.push({ key: "f" + i, seam: true, a: arcPt(i, s / NARC), b: arcPt(i, (s + 1) / NARC) });
      line("LB" + i, POS.L, B);
      line("B0B" + i, POS.B0, B);
      line("D" + i, B, arcPt(i, 1), { fold: true }); // the fold of D_i: its two parallel edges are equal
      marks.push({ key: "f" + i, p: arcPt(i, 1) });
    });
    line("LB0", POS.L, POS.B0);
    // which faces touch each point
    const pkey = (p) => p.map((x) => Math.round(x * 1e4)).join(",");
    const touching = new Map();
    faces.forEach((f, id) => f.pts.forEach((p) => { const k = pkey(p); if (!touching.has(k)) touching.set(k, new Set()); touching.get(k).add(id); }));
    const around = (p) => touching.get(pkey(p)) || new Set();
    segs.forEach((sg) => { const A = around(sg.a), B = around(sg.b); sg.adj = [...A].filter((id) => B.has(id)); });
    marks.forEach((m) => { m.adj = [...around(m.p)]; });
    const vadj = {};
    VKEYS.forEach((v) => { vadj[v] = [...around(POS[v])]; });
    return { faces, segs, marks, vadj };
  }
  const MESH = buildMesh();
  const LIGHT = (() => { const l = [-0.35, 0.6, 0.72], s = Math.hypot(...l); return l.map((x) => x / s); })();
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

  /* the cell of graph 3-cycle C, which the picture opens on */
  function defaultCell(data) {
    const key = classify(data);
    for (const [gi, k] of key) if (k === "C") return gi;
    return -1;
  }

  function mount(el, data, hooks) {
    const { svg, panel, spin: spinBtn, clear: clearBtn } = el;
    const key = classify(data);
    const gOf = new Map([...key].map(([gi, k]) => [k, gi]));
    let sel = null, star = null, hover = null;
    const kindOf = (k) => (VKEYS.includes(k) ? "v" : EDGE_V[k] ? "e" : "t");

    function starOf(v) {
      const tris = new Set(Object.keys(TRI_V).filter((t) => TRI_V[t].includes(v)));
      const eds = new Set(Object.keys(EDGE_V).filter((e) => EDGE_V[e].includes(v)));
      const nb = new Set();
      eds.forEach((e) => EDGE_V[e].forEach((u) => { if (u !== v) nb.add(u); }));
      return { tris, eds, nb };
    }

    /* ---------- drawing ---------- */
    function draw() {
      const R = tt.Rm;
      const pr = (p) => { const q = apply(R, p), f = CAM / (CAM - q[2]); return { x: W / 2 + S0 * f * q[0], y: H / 2 - S0 * f * q[1], z: q[2] }; };
      const pts = (P) => P.map((p) => num(p.x) + "," + num(p.y)).join(" ");
      const items = [];
      const focus = !!(sel || star);
      const zf = new Float64Array(MESH.faces.length).fill(-Infinity);
      MESH.faces.forEach((fc, id) => {
        const n = apply(R, fc.n);
        const P = fc.pts.map(pr);
        const c = fc.pts.reduce((s, p) => s.map((x, k) => x + p[k] / fc.pts.length), [0, 0, 0]);
        const cq = apply(R, c);
        const facing = dot(n, [-cq[0], -cq[1], CAM - cq[2]]);
        if (fc.sphere && facing <= 0) return; // the back of the sphere is hidden
        const nn = facing < 0 ? n.map((x) => -x) : n;
        const lam = Math.max(0, dot(nn, LIGHT));
        let col, lo, hi;
        if (sel && sel.k === fc.cell) { col = "--atom"; lo = 38; hi = 62; }
        else if (star && star.tris.has(fc.cell)) { col = "--atom"; lo = 14; hi = 40; }
        else if (fc.sphere) { col = "--mat"; lo = focus ? 14 : 22; hi = focus ? 30 : 44; }
        else { col = "--ink"; lo = 6; hi = focus ? 16 : 22; }
        const fill = `color-mix(in srgb, var(${col}) ${Math.round(lo + (hi - lo) * lam)}%, var(--panel))`;
        zf[id] = P.reduce((s, p) => s + p.z, 0) / P.length;
        items.push({ z: zf[id], s: `<polygon data-kind="t" data-k="${fc.cell}" points="${pts(P)}" style="fill:${fill};stroke:${fill}"/>` });
      });
      // just after the nearest face it touches, or at its own depth if that is nearer
      const after = (z, adj, eps) => adj.reduce((m, id) => Math.max(m, zf[id]), z) + eps;
      for (const sg of MESH.segs) {
        const a = pr(sg.a), b = pr(sg.b);
        let cls = sg.fold ? "ed fold" : sg.seam ? "ed seam" : "ed";
        const cell = sg.fold ? null : sg.key;
        if (sel && sel.k === sg.key) cls += " sel";
        else if (cell && star && star.eds.has(cell)) cls += " spoke";
        else if (cell && sel && sel.kind === "t" && TRI_E[sel.k].includes(cell)) cls += " spoke";
        const xy = `x1="${num(a.x)}" y1="${num(a.y)}" x2="${num(b.x)}" y2="${num(b.y)}"`;
        items.push({ z: after((a.z + b.z) / 2, sg.adj, 1e-4), s: `<line class="${cls}" ${xy}/><line class="ed-hit" data-kind="${sg.fold ? "t" : "e"}" data-k="${sg.key}" ${xy}/>` });
      }
      for (const mk of MESH.marks) {
        const p = pr(mk.p), r = 5.2;
        const on = sel && (sel.k === mk.key || (sel.kind === "t" && TRI_E[sel.k].includes(mk.key)));
        items.push({ z: after(p.z, mk.adj, 2e-4), s: `<polygon class="foldpt${on ? " sel" : ""}" data-kind="e" data-k="${mk.key}" points="${num(p.x)},${num(p.y - r)} ${num(p.x + r)},${num(p.y)} ${num(p.x)},${num(p.y + r)} ${num(p.x - r)},${num(p.y)}"><title>Fold point: the two parallel edges have equal length</title></polygon>` });
      }
      let labels = "";
      for (const v of VKEYS) {
        const p = pr(POS[v]);
        const me = sel && sel.k === v;
        const on = me || (star && star.nb.has(v)) || (sel && sel.kind !== "v" && (sel.kind === "e" ? EDGE_V[sel.k] : TRI_V[sel.k]).includes(v));
        items.push({ z: after(p.z, MESH.vadj[v], 3e-4), s: `<circle class="vx ${v === "L" ? "vL" : "vB"}${on ? " on" : ""}${me ? " me" : ""}" cx="${num(p.x)}" cy="${num(p.y)}" r="${v === "L" ? 5.5 : 4.8}"/><circle class="vx-hit" data-kind="v" data-k="${v}" cx="${num(p.x)}" cy="${num(p.y)}" r="11"><title>${VLABEL[v]}</title></circle>` });
        if (on || hover === v) labels += `<text class="lab" x="${num(p.x + 8)}" y="${num(p.y - 7)}">${VLABEL[v]}</text>`;
      }
      items.sort((a, b) => a.z - b.z);
      svg.innerHTML = items.map((it) => it.s).join("") + labels;
    }

    /* ---------- the panel ---------- */
    const graphSvg = (k) => MD.graphSvg(data.graphs[gOf.get(k)], { w: 300, h: 150, pad: 22, font: 12, dot: 4, strokeW: 2, label: "The graph" });
    const goBtn = (k) => `<button type="button" class="btn-quiet" data-go="${gOf.get(k)}">Select in the poset</button>`;
    const dia = (x, y, r = 5) => `<polygon class="foldpt" points="${num(x)},${num(y - r)} ${num(x + r)},${num(y)} ${num(x)},${num(y + r)} ${num(x - r)},${num(y)}"/>`;
    const dotAt = (x, y, cls) => `<circle cx="${num(x)}" cy="${num(y)}" r="5.5" class="${cls}" stroke="var(--panel)" stroke-width="2"/>`;
    const seg = (a, b) => `<line x1="${num(a[0])}" y1="${num(a[1])}" x2="${num(b[0])}" y2="${num(b[1])}" stroke="var(--atom)" stroke-width="2"/>`;

    /* the link of a vertex, drawn flat: all three are planar */
    function linkSvg(v) {
      const w = 300, h = 210;
      let o = "";
      if (v === "L") {
        const ang = (i) => -Math.PI / 2 + ((i - 1) * 2 * Math.PI) / 3;
        const out = (i) => [w / 2 + 92 * Math.cos(ang(i)), h / 2 + 18 + 92 * Math.sin(ang(i))];
        const inn = (i) => [w / 2 + 42 * Math.cos(ang(i)), h / 2 + 18 + 42 * Math.sin(ang(i))];
        const c = [w / 2, h / 2 + 18];
        LEGS.forEach((i) => { o += seg(out(i), out((i % 3) + 1)) + seg(out(i), inn(i)) + seg(inn(i), c); });
        LEGS.forEach((i) => { o += dotAt(...out(i), "lnk-f") + dotAt(...inn(i), "lnk-b"); });
        o += dotAt(...c, "lnk-b");
      } else if (v === "B0") {
        const c = [w / 2, 70];
        LEGS.forEach((i) => { const p = [w / 2 + (i - 2) * 90, 165]; o += seg(c, p) + dotAt(...p, "lnk-b") + `<text x="${num(p[0])}" y="${num(p[1] + 22)}" text-anchor="middle" class="lab sm">to ${VLABEL["B" + i]}</text>`; });
        o += dotAt(...c, "lnk-b") + `<text x="${num(c[0])}" y="${num(c[1] - 12)}" text-anchor="middle" class="lab sm">to the loop</text>`;
      } else {
        const i = +v[1];
        const a = [55, h / 2], b = [150, h / 2], f = [245, h / 2];
        o += seg(a, b) + seg(b, f) + dotAt(...a, "lnk-b") + dotAt(...b, "lnk-b") + dia(...f);
        o += `<text x="${a[0]}" y="${a[1] - 14}" text-anchor="middle" class="lab sm">to ∅ | 123</text><text x="${b[0]}" y="${b[1] - 14}" text-anchor="middle" class="lab sm">to the loop</text><text x="${f[0]}" y="${f[1] - 14}" text-anchor="middle" class="lab sm">fold</text>`;
        o += `<text x="${(a[0] + b[0]) / 2}" y="${a[1] + 24}" text-anchor="middle" class="lab sm">E${i}</text><text x="${(b[0] + f[0]) / 2}" y="${a[1] + 24}" text-anchor="middle" class="lab sm">half of D${i}</text>`;
      }
      return `<svg class="d06-link" viewBox="0 0 ${w} ${h}" role="img" aria-label="The link of this vertex">${o}</svg>`;
    }

    /* the triangle C before it is zipped up */
    function zipSvg() {
      const w = 300, h = 250;
      const A = [w / 2, 22], B = [w / 2 + 120, 22 + 208], Cc = [w / 2 - 120, 22 + 208];
      const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      const chevron = (p, q) => { // an arrow at the middle of p→q, pointing at q
        const m = mid(p, q), d = [q[0] - p[0], q[1] - p[1]], L = Math.hypot(...d), u = [d[0] / L, d[1] / L], nrm = [-u[1], u[0]], s = 7;
        const tip = [m[0] + u[0] * s * 0.6, m[1] + u[1] * s * 0.6];
        return `<polyline points="${num(tip[0] - u[0] * s + nrm[0] * s * 0.7)},${num(tip[1] - u[1] * s + nrm[1] * s * 0.7)} ${num(tip[0])},${num(tip[1])} ${num(tip[0] - u[0] * s - nrm[0] * s * 0.7)},${num(tip[1] - u[1] * s - nrm[1] * s * 0.7)}" fill="none" stroke="var(--nm)" stroke-width="1.8"/>`;
      };
      let o = `<polygon points="${[A, B, Cc].map((p) => num(p[0]) + "," + num(p[1])).join(" ")}" fill="color-mix(in srgb, var(--mat) 22%, var(--panel))" stroke="var(--nm)" stroke-width="1.8"/>`;
      [[A, B], [B, Cc], [Cc, A]].forEach(([p, q]) => { const m = mid(p, q); o += chevron(p, m) + chevron(q, m) + dia(...m, 5.5); });
      [A, B, Cc].forEach((p) => { o += `<circle cx="${num(p[0])}" cy="${num(p[1])}" r="5.5" class="vL" stroke="var(--panel)" stroke-width="2"/>`; });
      o += `<text x="${A[0] + 10}" y="${A[1] + 4}" class="lab sm">loop</text><text x="${B[0] - 12}" y="${B[1] + 16}" class="lab sm">loop</text><text x="${Cc[0] - 14}" y="${Cc[1] + 16}" class="lab sm">loop</text>`;
      return `<svg class="d06-link" viewBox="0 0 ${w} ${h}" role="img" aria-label="The triangle of the 3-cycle, with each side folded at its midpoint">${o}</svg>`;
    }

    function renderPanel() {
      let h;
      const k = sel && sel.k;
      if (!sel) {
        h = `<div class="live-head"><h4>Δ<sub>1,3</sub> in space</h4></div>
          <table class="fvec"><tbody>
            <tr><th>vertices</th><td>5</td><td class="l">graphs with one edge: <span class="key vL"></span>the loop, and <span class="key vB"></span>four with a vertex of weight one</td></tr>
            <tr><th>edges</th><td>10</td><td class="l">three of them folded in half</td></tr>
            <tr><th>triangles</th><td>7</td><td class="l">three of them folded in half</td></tr>
          </tbody></table>
          <p class="note">One triangle zips up into the sphere, and the other six make three flat fins outside it, attached along its seams. Permuting the legs 1, 2, 3 turns or reflects the picture. Click anything to see its graph.</p>
          <p class="note">The fins can be pushed back onto the seams, so up to homotopy Δ<sub>1,3</sub> is a sphere. More generally, Chan, Galatius and Payne showed that Δ<sub>1,<em class="m">n</em></sub> is homotopy equivalent to a wedge of (<em class="m">n</em> − 1)!/2 spheres of dimension <em class="m">n</em> − 1, for <em class="m">n</em> ≥ 3.</p>`;
      } else if (sel.kind === "v") {
        const st = starOf(k);
        const intro = k === "L"
          ? `One vertex carrying all three legs, with a loop. It is the top of the sphere: all three corners of the zipped-up triangle land here, and every triangle of Δ<sub>1,3</sub> has it as a corner.`
          : `A vertex of weight one carrying ${k === "B0" ? "no legs" : "leg " + k[1]}, joined by a separating edge to a vertex carrying ${k === "B0" ? "all three legs" : "legs " + others(+k[1]).join(" and ")}. It lies on ${st.eds.size} edges and ${st.tris.size} ${st.tris.size === 1 ? "triangle" : "triangles"}.`;
        const linkTxt = k === "L"
          ? `Here it is a triangle (<span class="key lnk-f"></span>the three seams, joined by the three corners of the sphere) with a path from each corner to a point in the middle (through <span class="key lnk-b"></span>the edges to the other four vertices, along the fins). It can be drawn in the plane without crossings, and so can the links of the other vertices, which is why Δ<sub>1,3</sub> fits in ℝ<sup>3</sup>. Compare Δ<sub>0,6</sub>, whose links are the Petersen graph and K<sub>3,3</sub>.`
          : k === "B0"
            ? `Here it is a star with three arms, one for each fin: the three triangles at this vertex meet along the edge to the loop.`
            : `Here it is a path ending at a fold. The folded triangle D${k[1]} only contributes half a segment: it stops where the two parallel edges have equal length.`;
        h = `<div class="live-head"><h4>${k === "L" ? "The loop graph" : "Vertex " + VLABEL[k]}</h4>${goBtn(k)}</div>
          ${graphSvg(k)}
          <p class="note">${intro}</p>
          <h4>Its link</h4>
          ${linkSvg(k)}
          <p class="note">The <b>link</b> of a vertex is what you would see on a tiny sphere around it: one point for each edge at the vertex, and a segment between two points for each triangle that contains both edges. ${linkTxt}</p>`;
      } else if (sel.kind === "e") {
        let t;
        if (k[0] === "f") t = `Two vertices joined by two parallel edges, with leg ${k[1]} on one and legs ${others(+k[1]).join(" and ")} on the other. Swapping the parallel edges is an automorphism, so this segment is folded in half. It runs from the loop graph down to the hollow diamond, where the two edges have equal length. It is one of the three seams of the sphere, and the fin through leg ${k[1]} is attached along it.`;
        else if (k.startsWith("LB")) t = `A loop and a separating edge. Shrinking the separating edge gives the loop graph, and shrinking the loop leaves weight one behind, giving ${VLABEL["B" + k[2]]}. ${k === "LB0" ? "This is the spine where all three fins meet." : "It is where the two halves of the fin through leg " + k[2] + " meet."}`;
        else t = `A path of three vertices with weight one at the end. This edge lies on only one triangle, so it is part of the boundary of Δ<sub>1,3</sub>.`;
        const title = k[0] === "f" ? `Seam: legs ${k[1]} | ${others(+k[1]).join("")}` : `Edge ${EDGE_V[k].map((v) => VLABEL[v]).join(" — ")}`;
        h = `<div class="live-head"><h4>${title}</h4>${goBtn(k)}</div>${graphSvg(k)}<p class="note">${t}</p>`;
      } else if (k === "C") {
        h = `<div class="live-head"><h4>The sphere: a triangle zipped up</h4>${goBtn(k)}</div>
          ${graphSvg(k)}
          <p class="note">A cycle of three edges with one leg at each vertex. It has no automorphisms that move its edges, so it contributes a whole triangle. Shrinking one edge of the cycle to zero gives two parallel edges, and swapping those folds each side of the triangle in half at the hollow diamond.</p>
          ${zipSvg()}
          <p class="note">The arrows show how the two halves of a side are glued: read from the corners inward, they are the same points. Gluing them zips the triangle up into a sphere. Its three corners all become the loop graph at the top, its three sides become three seams running down from there, and its centre, where all three edges have the same length, becomes the bottom.</p>`;
      } else if (k[0] === "D") {
        h = `<div class="live-head"><h4>Triangle, folded in half</h4>${goBtn(k)}</div>${graphSvg(k)}
          <p class="note">Two parallel edges and a separating edge to a vertex carrying legs ${others(+k[1]).join(" and ")}. Swapping the parallel edges folds the triangle in half, so only half of it appears. Its dashed side is the fold, where the two parallel edges have equal length: it is not glued to anything.</p>`;
      } else {
        h = `<div class="live-head"><h4>Triangle</h4>${goBtn(k)}</div>${graphSvg(k)}
          <p class="note">A loop, then a path through a vertex carrying leg ${k[1]} to a vertex carrying legs ${others(+k[1]).join(" and ")}. No automorphism moves its edges, so it contributes a whole triangle, with corners the loop graph, ∅ | 123 and ${VLABEL["B" + k[1]]}.</p>`;
      }
      panel.innerHTML = h;
    }
    panel.addEventListener("click", (e) => { const b = e.target.closest("[data-go]"); if (b) hooks.select(+b.dataset.go); });

    function setSel(s) {
      sel = s;
      star = s && s.kind === "v" ? starOf(s.k) : null;
      svg.classList.toggle("focus", !!s);
      renderPanel();
      draw();
    }

    const tt = turntable(svg, {
      Rm: mul(rotX(0.78), rotY(0.42)), spinBtn, draw,
      hover(t) {
        const h = t && t.dataset && t.dataset.kind === "v" ? t.dataset.k : null;
        if (h === hover) return false;
        hover = h;
        return true;
      },
      pick(t) {
        const k = t && t.dataset ? t.dataset.k : null;
        if (k && gOf.has(k)) hooks.select(gOf.get(k));
        else setSel(null);
      },
    });
    if (clearBtn) clearBtn.addEventListener("click", () => setSel(null));
    renderPanel();
    draw();
    tt.start();

    return {
      highlight(gi) {
        const k = key.get(gi);
        setSel(k ? { kind: kindOf(k), k } : null);
      },
      destroy: tt.destroy,
    };
  }

  root.D13 = { mount, defaultCell };
})(window);
