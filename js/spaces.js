/* Pictures of small moduli spaces.

   Each picture is a set of cells drawn in the plane. A cell is a segment or a triangle with a
   "cell graph" G and, at each corner, a vector of edge lengths of G. A point of the cell with
   barycentric coordinates lam has edge lengths sum_i lam_i L_i; edges of length zero are
   contracted. So the corners and sides of a cell are automatically the right degenerate graphs.

   Sides marked as folds are not boundaries of the cell: they are where the automorphisms of G
   fold the simplex onto itself (we draw one fundamental domain). */
(function (root) {
  "use strict";
  const MG = root.MG;
  const mk = MG.make;

  /* the tree with one edge separating the legs in S from the rest */
  function split(S, n) {
    const legs = [];
    for (let i = 1; i <= n; i++) legs.push(S.includes(i) ? 0 : 1);
    return mk([0, 0], legs, [[0, 1]]);
  }

  const SPACES = {};

  /* (0,4): three rays out of the cone point */
  {
    const verts = { O: [0, 0] };
    const cells = [];
    const pairs = [[[1, 2], [3, 4]], [[1, 3], [2, 4]], [[1, 4], [2, 3]]];
    pairs.forEach(([S, T], k) => {
      const a = -Math.PI / 2 + (k * 2 * Math.PI) / 3;
      const name = S.join("") + "|" + T.join("");
      verts[name] = [Math.cos(a), Math.sin(a)];
      cells.push({ G: split(S, 4), pts: ["O", name], L: [[0], [2]] });
    });
    SPACES["0,4"] = {
      kind: "cone", verts, cells, rays: Object.keys(verts).filter((v) => v !== "O"),
      icons: Object.keys(verts), iconSize: [74, 56], labels: {},
      title: "The whole space: three rays",
      text: "Here the moduli space itself is small enough to draw. Each tree with one edge gives a ray ℝ<sub>&gt;0</sub>, its edge length, and the three rays meet at the cone point, the single vertex with four legs. Drag the point through the cone point to pass from one tree to another.",
      cap: "Rays are drawn up to ℓ = 2 and continue forever.",
    };
  }

  /* (1,1): one ray */
  {
    const G = mk([0], [0], [[0, 0]]);
    SPACES["1,1"] = {
      kind: "cone", verts: { O: [-1, 0], R: [1, 0] }, cells: [{ G, pts: ["O", "R"], L: [[0], [2]] }], rays: ["R"],
      icons: ["O", "R"], iconSize: [74, 60], labels: {},
      title: "The whole space: one ray",
      text: "One loop of length ℓ &gt; 0. The automorphism that flips the loop acts trivially on the length, so the cell is a full ray. At ℓ = 0 the loop contracts and the vertex gets weight 1.",
      cap: "The ray is drawn up to ℓ = 2 and continues forever.",
    };
  }

  /* (0,5): the Petersen graph */
  {
    const outer = ["12", "34", "15", "23", "45"];
    const inner = ["35", "25", "24", "14", "13"];
    const verts = {};
    outer.forEach((p, k) => { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5; verts[p] = [Math.cos(a), Math.sin(a)]; });
    inner.forEach((p, k) => { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5; verts[p] = [0.48 * Math.cos(a), 0.48 * Math.sin(a)]; });
    const names = outer.concat(inner);
    const cells = [];
    const set = (p) => p.split("").map(Number);
    for (let x = 0; x < names.length; x++) for (let y = x + 1; y < names.length; y++) {
      const A = set(names[x]), B = set(names[y]);
      if (A.some((i) => B.includes(i))) continue;
      const m = [1, 2, 3, 4, 5].find((i) => !A.includes(i) && !B.includes(i));
      const legs = [];
      for (let i = 1; i <= 5; i++) legs.push(A.includes(i) ? 0 : B.includes(i) ? 2 : 1);
      cells.push({ G: mk([0, 0, 0], legs, [[0, 1], [1, 2]]), pts: [names[x], names[y]], L: [[1, 0], [0, 1]] });
      void m;
    }
    const labels = {};
    names.forEach((p) => { labels[p] = p[0] + "," + p[1]; });
    SPACES["0,5"] = {
      kind: "link", verts, cells, labels, icons: [],
      title: "Total edge length 1: the Petersen graph",
      text: "Normalize the total edge length to 1. A vertex labelled i,j is the tree with one edge separating legs {i, j} from the other three. An edge joins two such vertices when the pairs are disjoint: it is the trivalent tree with cherries {i, j} and {k, l}, and its two edge lengths t and 1 − t move you along it. The whole space is the cone over this graph.",
      cap: "The ten one-edge trees and fifteen trivalent trees. Crossings in the drawing are not vertices.",
    };
  }

  /* (1,2): a path with a folded end */
  {
    const verts = { b: [-1.1, 0], a: [0, 0], f: [1.1, 0] };
    const d = mk([0, 0], [1, 1], [[0, 0], [0, 1]]);
    const c = mk([0, 0], [0, 1], [[0, 1], [0, 1]]);
    SPACES["1,2"] = {
      kind: "link", verts,
      cells: [
        { G: d, pts: ["b", "a"], L: [[0, 1], [1, 0]] },
        { G: c, pts: ["a", "f"], L: [[1, 0], [0.5, 0.5]] },
      ],
      foldPts: ["f"], labels: {}, icons: ["b", "a", "f"], iconSize: [84, 64],
      title: "Total edge length 1: a path with a fold",
      text: "On the left, a loop and a separating edge. On the right, two parallel edges with lengths t and 1 − t. Swapping the parallel edges is an automorphism, so (t, 1 − t) and (1 − t, t) are the same point. The segment folds in half and stops at t = ½, where the two lengths are equal. That end is not glued to anything.",
      cap: "The hollow diamond marks a fold point, not a vertex: at that point the two parallel edges have equal length.",
    };
  }

  /* (2,0): two triangles glued along the rose */
  {
    const verts = { A: [-1, 0], m: [1, 0], c: [0.28, -0.95], B: [-0.3, 0.95] };
    const theta = mk([0, 0], [], [[0, 1], [0, 1], [0, 1]]);
    const dumbbell = mk([0, 0], [], [[0, 0], [1, 1], [0, 1]]);
    SPACES["2,0"] = {
      kind: "link", verts,
      cells: [
        { G: theta, pts: ["A", "m", "c"], L: [[1, 0, 0], [0.5, 0.5, 0], [1 / 3, 1 / 3, 1 / 3]], fold: [["A", "c"], ["m", "c"]], icon: [0.1, -0.4] },
        { G: dumbbell, pts: ["A", "m", "B"], L: [[0, 1, 0], [0.5, 0.5, 0], [0, 0, 1]], fold: [["m", "B"]], icon: [0.0, 0.4] },
      ],
      foldPts: ["m", "c"], labels: {}, icons: ["A", "m", "c", "B"], iconSize: [78, 58],
      title: "Total edge length 1: two triangles",
      text: "The theta graph has three edges, and its automorphisms permute them in all six ways, so only one sixth of its triangle appears. The dumbbell's automorphism swaps its two loops, so half of its triangle appears. The two pieces are glued along the segment of roses (two loops at one vertex). Dashed sides are folds, where an automorphism maps the triangle to itself. They are not boundaries.",
      cap: "Top: a sixth of the theta triangle. Bottom: half of the dumbbell triangle. The horizontal side holds the roses with loop lengths t and 1 − t, for t ≤ ½.",
    };
  }

  /* ---------- geometry helpers ---------- */
  function lengthsAt(cell, lam) {
    const m = cell.L[0].length;
    const out = new Array(m).fill(0);
    cell.L.forEach((Li, k) => Li.forEach((x, e) => { out[e] += lam[k] * x; }));
    return out.map((x) => (Math.abs(x) < 1e-9 ? 0 : x));
  }
  function pointAt(space, cell, lam) {
    let x = 0, y = 0;
    cell.pts.forEach((p, k) => { x += lam[k] * space.verts[p][0]; y += lam[k] * space.verts[p][1]; });
    return [x, y];
  }
  /* nearest point of a cell to p (in picture coords); returns { lam, d } */
  function nearestInCell(space, cell, p) {
    const V = cell.pts.map((n) => space.verts[n]);
    const seg = (A, B) => {
      const dx = B[0] - A[0], dy = B[1] - A[1];
      const t = Math.max(0, Math.min(1, ((p[0] - A[0]) * dx + (p[1] - A[1]) * dy) / (dx * dx + dy * dy || 1)));
      const q = [A[0] + t * dx, A[1] + t * dy];
      return { t, d: Math.hypot(p[0] - q[0], p[1] - q[1]) };
    };
    if (V.length === 2) {
      const r = seg(V[0], V[1]);
      return { lam: [1 - r.t, r.t], d: r.d };
    }
    const [A, B, C] = V;
    const det = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
    const l1 = ((B[1] - C[1]) * (p[0] - C[0]) + (C[0] - B[0]) * (p[1] - C[1])) / det;
    const l2 = ((C[1] - A[1]) * (p[0] - C[0]) + (A[0] - C[0]) * (p[1] - C[1])) / det;
    const l3 = 1 - l1 - l2;
    if (l1 >= 0 && l2 >= 0 && l3 >= 0) return { lam: [l1, l2, l3], d: 0 };
    const cands = [
      (() => { const r = seg(A, B); return { lam: [1 - r.t, r.t, 0], d: r.d }; })(),
      (() => { const r = seg(B, C); return { lam: [0, 1 - r.t, r.t], d: r.d }; })(),
      (() => { const r = seg(C, A); return { lam: [r.t, 0, 1 - r.t], d: r.d }; })(),
    ];
    return cands.reduce((a, b) => (b.d < a.d ? b : a));
  }
  function nearest(space, p, current, tol) {
    let best = null;
    space.cells.forEach((cell, ci) => {
      const r = nearestInCell(space, cell, p);
      if (!best || r.d < best.d) best = { ci, lam: r.lam, d: r.d };
    });
    if (current != null && current !== best.ci) {
      const r = nearestInCell(space, space.cells[current], p);
      if (r.d <= best.d + tol) return { ci: current, lam: r.lam, d: r.d };
    }
    return best;
  }
  /* the graph (after contraction) at a point */
  function graphAt(space, ci, lam) {
    const cell = space.cells[ci];
    const L = lengthsAt(cell, lam);
    const { graph } = MG.contractSet(cell.G, L.map((x) => x <= 0));
    return { L, graph };
  }

  root.SPACES = { SPACES, lengthsAt, pointAt, nearest, nearestInCell, graphAt };
})(window);
