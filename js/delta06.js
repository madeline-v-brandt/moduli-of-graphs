/* Δ_{0,6} in space.

   Δ_{0,6} is 2-dimensional: 25 vertices (trees with one edge), 105 edges (two edges) and 105
   triangles (trivalent trees). It does not embed in ℝ³: the link of a 2|4 vertex is the Petersen
   graph and the link of a 3|3 vertex is K_{3,3}, and neither is planar. This draws a map of it
   into ℝ³ (crossings and all) that you can turn, and shows the star and the link of a vertex. */
(function (root) {
  "use strict";
  const MG = root.MG, MD = root.MD;
  const num = MD.num;
  const W = 560, H = 430;

  /* Positions with the symmetry of a tetrahedron. Legs 1–4 are its corners and legs 5, 6 stay put,
     so permuting legs 1–4 (the group S4) acts on the picture by the symmetries of the tetrahedron.
     Each split is then forced onto a symmetry axis: 56 | 1234 at the centre, splits involving one
     corner i on the axis through corner i, splits involving a pair i, j on the axis through the
     midpoint of the edge ij. That leaves one distance per orbit, chosen to make distances in the
     picture match distances along edges of the space as well as possible (a stress fit). */
  const T3 = 1 / Math.sqrt(3);
  const CORNER = { 1: [T3, T3, T3], 2: [T3, -T3, -T3], 3: [-T3, T3, -T3], 4: [-T3, -T3, T3] };
  const MID = (i, j) => { const p = CORNER[i].map((x, k) => x + CORNER[j][k]); const L = Math.hypot(...p); return p.map((x) => x / L); };
  const RADIUS = { i5: -0.54, i6: 0.827, ij: -0.496, "56i": 1, "5ij": -1 };
  function tetraPosition(A, B) {
    const small = A.length <= B.length ? A : B, other = small === A ? B : A;
    const scale = (v, r) => v.map((x) => x * r);
    if (small.length === 2) {
      if (small.includes(5) && small.includes(6)) return [0, 0, 0];
      if (small.includes(5)) return scale(CORNER[small.find((x) => x !== 5)], RADIUS.i5);
      if (small.includes(6)) return scale(CORNER[small.find((x) => x !== 6)], RADIUS.i6);
      return scale(MID(small[0], small[1]), RADIUS.ij);
    }
    const side5 = small.includes(5) ? small : other;
    if (side5.includes(6)) return scale(CORNER[side5.find((x) => x !== 5 && x !== 6)], RADIUS["56i"]);
    const ij = side5.filter((x) => x !== 5);
    return scale(MID(ij[0], ij[1]), RADIUS["5ij"]);
  }

  function mount(el, data, hooks) {
    const { svg, panel, spin: spinBtn, clear: clearBtn } = el;
    const pal = hooks.pal;

    /* ---------- the cells ---------- */
    const V = [], E = [], T = [];
    data.graphs.forEach((G, i) => { const r = data.rank[i]; if (r === 1) V.push(i); else if (r === 2) E.push(i); else if (r === 3) T.push(i); });
    const vOf = new Map(V.map((g, k) => [g, k])), eOf = new Map(E.map((g, k) => [g, k])), tOf = new Map(T.map((g, k) => [g, k]));
    const edgeV = E.map((i) => data.down[i].map((j) => vOf.get(j)));
    const triV = T.map((i) => { const s = new Set(); data.down[i].forEach((j) => data.down[j].forEach((k) => s.add(vOf.get(k)))); return [...s]; });
    const triE = T.map((i) => data.down[i].map((j) => eOf.get(j)));
    // each vertex is a split of {1,…,6}; side A is the 2-set, or for a 3|3 split the side holding 1
    const split = V.map((i) => {
      const G = data.graphs[i], sides = [[], []];
      G.legs.forEach((v, l) => sides[v].push(l + 1));
      let [A, B] = sides;
      if (A.length > B.length || (A.length === B.length && !A.includes(1))) [A, B] = [B, A];
      const kind = A.length === 2 ? 24 : 33;
      return { A, B, kind, label: kind === 24 ? A.join("") : A.join("") + "|" + B.join("") };
    });
    const pretty = (k) => (split[k].kind === 24 ? `${split[k].A.join("")} | ${split[k].B.join("")}` : `${split[k].A.join("")} | ${split[k].B.join("")}`);

    /* ---------- positions in space ---------- */
    const X = split.map((sp) => tetraPosition(sp.A, sp.B));

    /* ---------- view ---------- */
    const { rotX, rotY, mul } = root.Turn3D;
    // start near the 3-fold axis through corner 1, tilted a little so the points on that axis separate
    const z = CORNER[1], x = [Math.SQRT1_2, -Math.SQRT1_2, 0], y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    const Rm0 = mul(rotX(0.42), mul(rotY(0.3), [x, y, z]));
    const S0 = 180, CAM = 3.4;
    let sel = null; // { kind: "v" | "e" | "t", k }
    let hover = -1;

    function project() {
      const Rm = tt.Rm;
      return X.map((p) => {
        const q = [0, 1, 2].map((r) => Rm[r][0] * p[0] + Rm[r][1] * p[1] + Rm[r][2] * p[2]);
        const f = CAM / (CAM - q[2]);
        return { x: W / 2 + S0 * f * q[0], y: H / 2 - S0 * f * q[1], z: q[2], f };
      });
    }

    function starOf(k) {
      const tris = new Set(), eds = new Set(), link = new Set(), nb = new Set();
      triV.forEach((vs, t) => { if (vs.includes(k)) { tris.add(t); triE[t].forEach((e) => { if (edgeV[e].includes(k)) eds.add(e); else link.add(e); }); } });
      eds.forEach((e) => edgeV[e].forEach((v) => { if (v !== k) nb.add(v); }));
      return { tris, eds, link, nb };
    }
    let star = null;

    function draw() {
      const P = project();
      const items = [];
      triV.forEach((vs, t) => items.push({ z: (P[vs[0]].z + P[vs[1]].z + P[vs[2]].z) / 3 - 0.001, kind: "t", k: t }));
      edgeV.forEach(([a, b], e) => items.push({ z: (P[a].z + P[b].z) / 2, kind: "e", k: e }));
      P.forEach((p, v) => items.push({ z: p.z + 0.002, kind: "v", k: v }));
      items.sort((a, b) => a.z - b.z);
      const depth = (z) => 0.35 + 0.65 * (z + 1) / 2;
      let o = "", hits = "", labels = "";
      for (const it of items) {
        if (it.kind === "t") {
          const vs = triV[it.k];
          let cls = "tri";
          if (sel && sel.kind === "t" && sel.k === it.k) cls += " sel";
          else if (star && star.tris.has(it.k)) cls += " star";
          o += `<polygon class="${cls}" data-kind="t" data-k="${it.k}" points="${vs.map((v) => num(P[v].x) + "," + num(P[v].y)).join(" ")}"/>`;
        } else if (it.kind === "e") {
          const [a, b] = edgeV[it.k];
          let cls = "ed";
          if (sel && sel.kind === "e" && sel.k === it.k) cls += " sel";
          else if (star && star.link.has(it.k)) cls += " link";
          else if (star && star.eds.has(it.k)) cls += " spoke";
          else if (sel && sel.kind === "t" && triE[sel.k].includes(it.k)) cls += " spoke";
          const op = cls === "ed" ? num(depth(it.z) * (star || sel ? 0.3 : 0.85)) : 1;
          o += `<line class="${cls}" data-kind="e" data-k="${it.k}" x1="${num(P[a].x)}" y1="${num(P[a].y)}" x2="${num(P[b].x)}" y2="${num(P[b].y)}" opacity="${op}"/>`;
          hits = `<line class="ed-hit" data-kind="e" data-k="${it.k}" x1="${num(P[a].x)}" y1="${num(P[a].y)}" x2="${num(P[b].x)}" y2="${num(P[b].y)}"/>` + hits;
        } else {
          const v = it.k, p = P[v];
          const on = (sel && sel.kind === "v" && sel.k === v) || (star && star.nb.has(v)) || (sel && sel.kind === "t" && triV[sel.k].includes(v)) || (sel && sel.kind === "e" && edgeV[sel.k].includes(v));
          const r = (split[v].kind === 24 ? 4.2 : 5) * p.f;
          o += `<circle class="vx v${split[v].kind}${on ? " on" : ""}${sel && sel.kind === "v" && sel.k === v ? " me" : ""}" cx="${num(p.x)}" cy="${num(p.y)}" r="${num(r)}" opacity="${on ? 1 : num(depth(p.z))}"/>`;
          hits += `<circle class="vx-hit" data-kind="v" data-k="${v}" cx="${num(p.x)}" cy="${num(p.y)}" r="11"><title>${pretty(v)}</title></circle>`;
          if (on || hover === v) labels += `<text class="lab" x="${num(p.x + 8)}" y="${num(p.y - 7)}">${split[v].label}</text>`;
        }
      }
      // click targets on top, vertices before edges before triangles
      svg.innerHTML = o + labels + `<g>${hits}</g>`;
      svg.classList.toggle("focus", !!(star || sel));
    }

    /* ---------- the panel ---------- */
    function linkSvg(k) {
      const st = starOf(k);
      const nb = [...st.nb];
      const pos = new Map();
      const w = 300, h = 230;
      if (split[k].kind === 24) {
        // the link is Δ_{0,5} on the legs of the 4-side plus the attaching point *: draw it as the Petersen graph
        const [a, b] = split[k].A, rest = split[k].B;
        const verts = root.SPACES.SPACES["0,5"].verts;
        nb.forEach((u) => {
          let pair;
          if (split[u].kind === 24) pair = split[u].A.map((x) => rest.indexOf(x) + 1);
          else {
            const side = split[u].A.includes(a) ? split[u].A : split[u].B;
            pair = [rest.indexOf(side.find((y) => y !== a && y !== b)) + 1, 5];
          }
          const key = pair.sort((x, y) => x - y).join("");
          const q = verts[key];
          pos.set(u, [w / 2 + q[0] * 92, h / 2 + 6 + q[1] * 92]);
        });
      } else {
        const sideA = nb.filter((u) => split[u].A.every((x) => split[k].A.includes(x)));
        const sideB = nb.filter((u) => !sideA.includes(u));
        sideA.forEach((u, i) => pos.set(u, [60 + i * 90, 50]));
        sideB.forEach((u, i) => pos.set(u, [60 + i * 90, 185]));
      }
      let o = "";
      st.link.forEach((e) => {
        const [a, b] = edgeV[e];
        const p = pos.get(a), q = pos.get(b);
        o += `<line x1="${num(p[0])}" y1="${num(p[1])}" x2="${num(q[0])}" y2="${num(q[1])}" stroke="var(--atom)" stroke-width="2"/>`;
      });
      nb.forEach((u) => {
        const [x, y] = pos.get(u);
        o += `<circle cx="${num(x)}" cy="${num(y)}" r="5.5" class="v${split[u].kind}" stroke="var(--panel)" stroke-width="2"/>`;
        const lab = split[u].label;
        o += `<text x="${num(x)}" y="${num(y - 10)}" text-anchor="middle" class="lab sm">${lab}</text>`;
      });
      return `<svg class="d06-link" viewBox="0 0 ${w} ${h}" role="img" aria-label="The link of this vertex">${o}</svg>`;
    }
    const treeSvg = (gi) => MD.graphSvg(data.graphs[gi], { w: 300, h: 150, pad: 22, font: 12, dot: 4, strokeW: 2, label: "The tree" });

    function renderPanel() {
      let h;
      if (!sel) {
        h = `<div class="live-head"><h4>Δ<sub>0,6</sub> in space</h4></div>
          <table class="fvec"><tbody>
            <tr><th>vertices</th><td>25</td><td class="l">trees with one edge. The edge splits the six legs into two sides: <span class="key v24"></span>15 split them 2 | 4 and <span class="key v33"></span>10 split them 3 | 3.</td></tr>
            <tr><th>edges</th><td>105</td><td class="l">trees with two edges</td></tr>
            <tr><th>triangles</th><td>105</td><td class="l">trivalent trees</td></tr>
          </tbody></table>
          <p class="note">Every edge lies on three triangles, so this is not a surface. The picture has the symmetry of a tetrahedron: legs 1, 2, 3, 4 sit at its corners, so permuting them turns or reflects the picture, and the vertex 56 | 1234 sits at the centre. Click a vertex to see its star and its link.</p>`;
      } else if (sel.kind === "v") {
        const k = sel.k, sp = split[k];
        const pet = sp.kind === 24;
        h = `<div class="live-head"><h4>Vertex ${pretty(k)}</h4><button type="button" class="btn-quiet" data-go="${V[k]}">Select in the poset</button></div>
          ${treeSvg(V[k])}
          <p class="note">A tree with one edge is the same thing as a <b>split</b> of the legs: a way to divide {1, …, 6} into two sides, here {${sp.A.join(", ")}} and {${sp.B.join(", ")}}. This vertex lies on ${pet ? 10 : 6} edges and ${pet ? 15 : 9} triangles, lit up in the picture.</p>
          <h4>Its link: ${pet ? "the Petersen graph" : "K<sub>3,3</sub>"}</h4>
          ${linkSvg(k)}
          <p class="note">The <b>link</b> of a vertex is what you would see on a tiny sphere around it: one point for each edge at the vertex, and a segment between two points for each triangle that contains both edges. ${pet
            ? `Here the link is the Petersen graph, and near this vertex Δ<sub>0,6</sub> is a cone over it, just like <em class="m">M</em><sub>0,5</sub>. The Petersen graph cannot be drawn in the plane without crossings.`
            : `Here the link is K<sub>3,3</sub>: each side of the split can be divided further in three ways, and a triangle divides both sides at once. K<sub>3,3</sub> cannot be drawn in the plane without crossings.`}</p>`;
      } else if (sel.kind === "e") {
        const k = sel.k, [a, b] = edgeV[k];
        h = `<div class="live-head"><h4>Edge ${split[a].label} — ${split[b].label}</h4><button type="button" class="btn-quiet" data-go="${E[k]}">Select in the poset</button></div>
          ${treeSvg(E[k])}
          <p class="note">A tree with two edges. One vertex has four half-edges, and splitting it in each of three ways gives the three triangles on this edge.</p>`;
      } else {
        const k = sel.k;
        h = `<div class="live-head"><h4>Triangle: a trivalent tree</h4><button type="button" class="btn-quiet" data-go="${T[k]}">Select in the poset</button></div>
          ${treeSvg(T[k])}
          <p class="note">Its corners are the three one-edge trees you get by contracting two of its edges: ${triV[k].map((v) => split[v].label).join(", ")}. Inside the triangle all three edge lengths are positive and add up to 1.</p>`;
      }
      panel.innerHTML = h;
    }
    panel.addEventListener("click", (e) => { const b = e.target.closest("[data-go]"); if (b) hooks.select(+b.dataset.go); });

    function setSel(s) {
      sel = s;
      star = s && s.kind === "v" ? starOf(s.k) : null;
      renderPanel();
      draw();
    }

    /* ---------- turning it, and picking things ---------- */
    const tt = root.Turn3D.turntable(svg, {
      Rm: Rm0, spinBtn, draw,
      hover(t) {
        const h = t && t.dataset && t.dataset.kind === "v" ? +t.dataset.k : -1;
        if (h === hover) return false;
        hover = h;
        return true;
      },
      pick(t) {
        const kind = t && t.dataset ? t.dataset.kind : null;
        if (!kind) { setSel(null); return; }
        const k = +t.dataset.k;
        hooks.select(kind === "v" ? V[k] : kind === "e" ? E[k] : T[k]);
      },
    });
    if (clearBtn) clearBtn.addEventListener("click", () => setSel(null));

    renderPanel();
    draw();
    tt.start();

    return {
      /* show the cell of graph gi (from the poset); the cone point and others clear the selection */
      highlight(gi) {
        if (vOf.has(gi)) setSel({ kind: "v", k: vOf.get(gi) });
        else if (eOf.has(gi)) setSel({ kind: "e", k: eOf.get(gi) });
        else if (tOf.has(gi)) setSel({ kind: "t", k: tOf.get(gi) });
        else setSel(null);
      },
      destroy: tt.destroy,
    };
  }

  root.D06 = { mount };
})(window);
