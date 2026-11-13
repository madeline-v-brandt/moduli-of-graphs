/* Core combinatorics of stable graphs.

   A graph is stored as { w, legs, edges }:
     w[v]      the weight (genus) of vertex v
     legs[i]   the vertex carrying the leg marked i + 1
     edges[e]  a pair [u, v] with u <= v (u === v is a loop)

   Half-edges are numbered 1..|H|: the legs are 1..n (leg i is half-edge i), and edge e consists
   of half-edges n + 2e + 1 (at edges[e][0]) and n + 2e + 2 (at edges[e][1]). So iota swaps
   n + 2e + 1 and n + 2e + 2 and fixes 1..n. */
(function (root) {
  "use strict";

  const make = (w, legs, edges) => ({
    w: w.slice(),
    legs: legs.slice(),
    edges: edges.map(([u, v]) => (u <= v ? [u, v] : [v, u])),
  });
  const clone = (G) => make(G.w, G.legs, G.edges);
  const nV = (G) => G.w.length;
  const nE = (G) => G.edges.length;
  const sumW = (G) => G.w.reduce((a, b) => a + b, 0);
  const betti = (G) => nE(G) - nV(G) + 1;
  const genus = (G) => betti(G) + sumW(G);

  function valence(G) {
    const val = G.w.map(() => 0);
    G.legs.forEach((v) => val[v]++);
    G.edges.forEach(([u, v]) => { val[u]++; val[v]++; });
    return val;
  }
  const excess = (G) => { const val = valence(G); return G.w.map((w, v) => 2 * w - 2 + val[v]); };
  const isStable = (G) => excess(G).every((x) => x > 0);

  function mult(G) {
    const k = nV(G);
    const M = Array.from({ length: k }, () => new Array(k).fill(0));
    G.edges.forEach(([u, v]) => { if (u === v) M[u][u]++; else { M[u][v]++; M[v][u]++; } });
    return M;
  }
  function legsAt(G) {
    const L = G.w.map(() => []);
    G.legs.forEach((v, i) => L[v].push(i + 1));
    return L;
  }

  /* Colour refinement: an isomorphism-invariant colouring of the vertices. */
  function colours(G, M, L) {
    const k = nV(G);
    let col = G.w.map((w, i) => `${w}|${L[i].join(".")}|${M[i][i]}|${M[i].reduce((a, b) => a + b, 0)}`);
    let ids = relabel(col);
    for (let it = 0; it < k; it++) {
      const next = ids.map((c, i) => {
        const nb = [];
        for (let j = 0; j < k; j++) if (j !== i && M[i][j]) nb.push(ids[j] + "x" + M[i][j]);
        return c + "#" + nb.sort().join(",");
      });
      const nids = relabel(next);
      const same = new Set(nids).size === new Set(ids).size;
      ids = nids;
      if (same) break;
    }
    return ids;
  }
  function relabel(strs) {
    const u = [...new Set(strs)].sort();
    return strs.map((s) => String(u.indexOf(s)).padStart(3, "0"));
  }

  /* All orderings of the vertices that list colour classes in sorted order. */
  function classOrderings(col) {
    const classes = [...new Set(col)].sort().map((c) => col.map((x, i) => (x === c ? i : -1)).filter((i) => i >= 0));
    const out = [];
    const rec = (ci, acc) => {
      if (ci === classes.length) { out.push(acc.slice()); return; }
      for (const p of perms(classes[ci])) { rec(ci + 1, acc.concat(p)); }
    };
    rec(0, []);
    return out;
  }
  function perms(arr) {
    if (arr.length <= 1) return [arr.slice()];
    const out = [];
    arr.forEach((x, i) => {
      const rest = arr.slice(0, i).concat(arr.slice(i + 1));
      perms(rest).forEach((p) => out.push([x].concat(p)));
    });
    return out;
  }

  /* Canonical form: the lexicographically least code over colour-respecting orderings. */
  function canon(G) {
    const M = mult(G), L = legsAt(G);
    const col = colours(G, M, L);
    let best = null, bestP = null;
    for (const p of classOrderings(col)) {
      let code = p.map((v) => G.w[v]).join(",") + "|" + p.map((v) => L[v].join(".")).join(",") + "|";
      for (let i = 0; i < p.length; i++) for (let j = i; j < p.length; j++) code += M[p[i]][p[j]].toString(36);
      if (best === null || code < best) { best = code; bestP = p; }
    }
    return { key: best, order: bestP, col };
  }

  /* Relabel G so vertex i is order[i]; edges sorted. */
  function relabelGraph(G, order) {
    const inv = new Array(order.length);
    order.forEach((v, i) => { inv[v] = i; });
    const edges = G.edges.map(([u, v]) => { const a = inv[u], b = inv[v]; return a <= b ? [a, b] : [b, a]; });
    edges.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    return make(order.map((v) => G.w[v]), G.legs.map((v) => inv[v]), edges);
  }
  const canonical = (G) => relabelGraph(G, canon(G).order);

  /* Every graph with one more edge that contracts to G (all vertex splittings). */
  function expansions(G) {
    const out = [];
    const k = nV(G);
    for (let v = 0; v < k; v++) {
      if (G.w[v] > 0) {
        const H = clone(G);
        H.w[v]--;
        H.edges.push([v, v]);
        out.push(H);
      }
      const inc = [];
      G.legs.forEach((x, i) => { if (x === v) inc.push({ leg: i }); });
      G.edges.forEach(([a, b], e) => {
        if (a === v) inc.push({ e, end: 0 });
        if (b === v) inc.push({ e, end: 1 });
      });
      const m = inc.length;
      for (let mask = 0; mask < 1 << m; mask++) {
        if (m > 0 && mask & 1) continue; // the first incidence stays on v: unordered splits
        const s2 = popcount(mask), s1 = m - s2;
        for (let w1 = 0; w1 <= G.w[v]; w1++) {
          const w2 = G.w[v] - w1;
          if (2 * w1 + s1 < 2 || 2 * w2 + s2 < 2) continue;
          const H = clone(G);
          H.w[v] = w1;
          H.w.push(w2);
          inc.forEach((x, bit) => {
            if (!(mask & (1 << bit))) return;
            if (x.leg !== undefined) H.legs[x.leg] = k;
            else H.edges[x.e][x.end] = k;
          });
          H.edges = H.edges.map(([a, b]) => (a <= b ? [a, b] : [b, a]));
          H.edges.push([v, k]);
          out.push(H);
        }
      }
    }
    return out;
  }
  function popcount(x) { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; }

  /* Contract edge e. */
  function contract(G, e) {
    return contractSet(G, G.edges.map((_, i) => i === e)).graph;
  }
  /* Contract every edge with zero[e] true. Returns the graph and the maps on vertices and edges. */
  function contractSet(G, zero) {
    const k = nV(G);
    const parent = [...Array(k).keys()];
    const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    const extra = new Array(k).fill(0);
    G.edges.forEach(([u, v], e) => {
      if (!zero[e]) return;
      const a = find(u), b = find(v);
      if (a === b) extra[a]++;
      else { parent[b] = a; extra[a] += extra[b]; extra[b] = 0; }
    });
    const roots = [];
    const vmap = new Array(k);
    for (let v = 0; v < k; v++) { const r = find(v); if (!roots.includes(r)) roots.push(r); }
    for (let v = 0; v < k; v++) vmap[v] = roots.indexOf(find(v));
    const w = roots.map(() => 0);
    for (let v = 0; v < k; v++) w[vmap[v]] += G.w[v];
    roots.forEach((r, i) => { w[i] += extra[r]; });
    const emap = [];
    const edges = [];
    G.edges.forEach(([u, v], e) => {
      if (zero[e]) { emap.push(-1); return; }
      emap.push(edges.length);
      edges.push([vmap[u], vmap[v]]);
    });
    return { graph: make(w, G.legs.map((v) => vmap[v]), edges), vmap, emap };
  }

  /* ---------- automorphisms ---------- */
  const fact = (m) => (m <= 1 ? 1 : m * fact(m - 1));

  function vertexAutos(G) {
    const M = mult(G), L = legsAt(G);
    const col = colours(G, M, L);
    const k = nV(G);
    const out = [];
    // sigma maps vertex i to sigma[i]; must preserve colour, weight, legs, multiplicities
    const rec = (i, sigma, used) => {
      if (i === k) { out.push(sigma.slice()); return; }
      for (let j = 0; j < k; j++) {
        if (used[j] || col[j] !== col[i] || G.w[j] !== G.w[i] || L[j].join() !== L[i].join()) continue;
        let ok = true;
        for (let a = 0; a < i && ok; a++) if (M[i][a] !== M[j][sigma[a]]) ok = false;
        if (ok && M[i][i] !== M[j][j]) ok = false;
        if (!ok) continue;
        sigma[i] = j; used[j] = true;
        rec(i + 1, sigma, used);
        used[j] = false;
      }
    };
    rec(0, new Array(k), new Array(k).fill(false));
    return out;
  }

  function autInfo(G, cap = 240) {
    const n = G.legs.length;
    const M = mult(G);
    const k = nV(G);
    const vaut = vertexAutos(G);
    let parallel = 1, loops = 1;
    const factors = [];
    for (let u = 0; u < k; u++) {
      for (let v = u + 1; v < k; v++) if (M[u][v] > 1) { parallel *= fact(M[u][v]); factors.push({ kind: "par", u, v, m: M[u][v] }); }
      if (M[u][u] > 0) { loops *= fact(M[u][u]) * 2 ** M[u][u]; factors.push({ kind: "loop", v: u, m: M[u][u] }); }
    }
    const order = vaut.length * parallel * loops;
    // odd: some automorphism acts on E by an odd permutation
    let odd = factors.some((f) => f.m >= 2);
    const groups = new Map(); // "u,v" -> edge indices
    G.edges.forEach(([u, v], e) => {
      const key = u + "," + v;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e);
    });
    const autos = [];
    const enumerate = order <= cap;
    for (const sigma of vaut) {
      // choices for each group
      const choice = [];
      for (const [key, es] of groups) {
        const [u, v] = key.split(",").map(Number);
        let a = sigma[u], b = sigma[v], flipped = false;
        if (a > b) { [a, b] = [b, a]; flipped = true; }
        const img = groups.get(a + "," + b);
        choice.push({ u, v, es, img, flipped, loop: u === v });
      }
      // edge permutation with identity choices: decides odd for vertex part
      if (!odd) {
        const eperm = new Array(G.edges.length);
        choice.forEach((c) => c.es.forEach((e, i) => { eperm[e] = c.img[i]; }));
        if (sign(eperm) < 0) odd = true;
      }
      if (!enumerate) continue;
      // full enumeration: bijections and loop flips
      const rec = (ci, hmap, emap) => {
        if (ci === choice.length) {
          autos.push({ sigma: sigma.slice(), h: hmap.slice(), e: emap.slice() });
          return;
        }
        const c = choice[ci];
        for (const p of perms(c.img)) {
          const flips = c.loop ? 1 << c.es.length : 1;
          for (let f = 0; f < flips; f++) {
            c.es.forEach((e, i) => {
              const t = p[i];
              let swap = c.flipped;
              if (c.loop) swap = !!(f & (1 << i));
              const h0 = n + 2 * e + 1, h1 = n + 2 * e + 2;
              const t0 = n + 2 * t + 1, t1 = n + 2 * t + 2;
              hmap[h0] = swap ? t1 : t0;
              hmap[h1] = swap ? t0 : t1;
              emap[e] = t;
            });
            rec(ci + 1, hmap, emap);
          }
        }
      };
      const hmap = new Array(n + 2 * G.edges.length + 1);
      for (let i = 1; i <= n; i++) hmap[i] = i;
      rec(0, hmap, new Array(G.edges.length));
    }
    // identity first
    autos.sort((a, b) => isIdentity(b.h) - isIdentity(a.h));
    return { order, vaut: vaut.length, parallel, loops, factors, odd, autos: enumerate ? autos : null };
  }
  const isIdentity = (h) => h.every((x, i) => i === 0 || x === i);

  function sign(perm) {
    const seen = new Array(perm.length).fill(false);
    let s = 1;
    for (let i = 0; i < perm.length; i++) {
      if (seen[i]) continue;
      let j = i, len = 0;
      while (!seen[j]) { seen[j] = true; j = perm[j]; len++; }
      if (len % 2 === 0) s = -s;
    }
    return s;
  }

  /* Cycle notation of a permutation given as a 1-indexed map (index 0 unused) or 0-indexed. */
  function cycles(map, offset = 1, fmt = (x) => x) {
    const seen = new Set();
    const out = [];
    for (let i = offset; i < map.length; i++) {
      if (seen.has(i)) continue;
      const cyc = [];
      let j = i;
      while (!seen.has(j)) { seen.add(j); cyc.push(j); j = map[j]; }
      if (cyc.length > 1) out.push(cyc.map(fmt));
    }
    return out;
  }

  /* ---------- the whole poset ---------- */
  function enumerate(g, n, limit = Infinity) {
    const start = make([g], new Array(n).fill(0), []);
    if (2 * g - 2 + n <= 0) return null;
    const index = new Map();
    const graphs = [];
    const rank = [];
    const add = (G, r) => {
      const c = canon(G);
      if (index.has(c.key)) return index.get(c.key);
      const i = graphs.length;
      index.set(c.key, i);
      graphs.push(relabelGraph(G, c.order));
      rank.push(r);
      return i;
    };
    add(start, 0);
    const maxE = 3 * g - 3 + n;
    let lo = 0;
    for (let r = 0; r < maxE; r++) {
      const hi = graphs.length;
      for (let i = lo; i < hi; i++) {
        for (const H of expansions(graphs[i])) {
          add(H, r + 1);
          if (graphs.length > limit) return { tooMany: true, count: graphs.length };
        }
      }
      lo = hi;
    }
    // sort by rank (already), then compute contractions
    const N = graphs.length;
    const down = graphs.map((G) => {
      const s = new Set();
      G.edges.forEach((_, e) => s.add(index.get(canon(contract(G, e)).key)));
      return [...s].sort((a, b) => a - b);
    });
    const up = graphs.map(() => []);
    down.forEach((ds, i) => ds.forEach((j) => up[j].push(i)));
    return { g, n, graphs, rank, down, up, index, N };
  }

  function lookup(data, G) {
    const i = data.index.get(canon(G).key);
    return i === undefined ? -1 : i;
  }

  const api = {
    make, clone, nV, nE, sumW, betti, genus, valence, excess, isStable, mult, legsAt,
    canon, canonical, relabelGraph, expansions, contract, contractSet, autInfo, cycles, sign,
    enumerate, lookup, fact,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MG = api;
})(typeof window !== "undefined" ? window : globalThis);
