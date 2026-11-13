/* Drawing a picture of a small moduli space (a spec from js/spaces.js): cells, folds, rays,
   labels and graph icons. Shared by the explorer and the lecture notes. */
(function (root) {
  "use strict";
  const MG = root.MG, MD = root.MD, SP = root.SPACES;
  const num = MD.num;

  function picTransform(spec, W, H) {
    const xs = Object.values(spec.verts).map((p) => p[0]), ys = Object.values(spec.verts).map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const padX = spec.icons.length ? (spec.iconSize[0] + 30) : 46;
    const padY = spec.icons.length ? (spec.iconSize[1] + 26) : 40;
    const s = Math.min((W - 2 * padX) / Math.max(maxX - minX, 1e-6), (H - 2 * padY) / Math.max(maxY - minY, 1e-6));
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    return { s, to: ([x, y]) => [W / 2 + (x - cx) * s, H / 2 + (y - cy) * s], from: ([X, Y]) => [cx + (X - W / 2) / s, cy + (Y - H / 2) / s] };
  }

  /* the open cells of the picture: triangles, sides, corners, each with the graph it carries */
  function elementsOf(spec, data) {
    const els = [];
    const idxAt = (ci, lam) => MG.lookup(data, SP.graphAt(spec, ci, lam).graph);
    const seen = new Set();
    spec.cells.forEach((cell, ci) => {
      const k = cell.pts.length;
      if (k === 3) {
        els.push({ kind: 2, ci, pts: cell.pts, idx: idxAt(ci, [1 / 3, 1 / 3, 1 / 3]), icon: cell.icon });
        [[0, 1], [1, 2], [2, 0]].forEach(([a, b]) => {
          const key = [cell.pts[a], cell.pts[b]].sort().join("~");
          if (seen.has(key)) return;
          seen.add(key);
          const lam = [0, 0, 0]; lam[a] = 0.5; lam[b] = 0.5;
          const fold = (cell.fold || []).some(([p, q]) => (p === cell.pts[a] && q === cell.pts[b]) || (p === cell.pts[b] && q === cell.pts[a]));
          els.push({ kind: 1, ci, pts: [cell.pts[a], cell.pts[b]], idx: idxAt(ci, lam), fold });
        });
      } else {
        const key = cell.pts.slice().sort().join("~");
        if (!seen.has(key)) { seen.add(key); els.push({ kind: 1, ci, pts: cell.pts, idx: idxAt(ci, [0.5, 0.5]), fold: false }); }
      }
    });
    Object.keys(spec.verts).forEach((name) => {
      const ci = spec.cells.findIndex((c) => c.pts.includes(name));
      const lam = spec.cells[ci].pts.map((p) => (p === name ? 1 : 0));
      const isRayEnd = spec.kind === "cone" && spec.rays.includes(name);
      els.push({ kind: 0, ci, name, idx: idxAt(ci, lam), fold: (spec.foldPts || []).includes(name), ray: isRayEnd, lam });
    });
    return els;
  }

  function spaceSvg(spec, tf, data, opts = {}) {
    const els = elementsOf(spec, data);
    const P = (name) => tf.to(spec.verts[name]);
    let out = "";
    els.filter((e) => e.kind === 2).forEach((e) => {
      out += `<polygon class="cell2" data-idx="${e.idx}" points="${e.pts.map((p) => P(p).map(num).join(",")).join(" ")}"/>`;
    });
    if (!opts.bare) {
      els.filter((e) => e.kind === 2 && e.icon).forEach((e) => {
        const [x, y] = tf.to(e.icon);
        const w = 78, h = 54;
        out += `<g class="cell-icon">${MD.graphSvg(data.graphs[e.idx], { w, h, pad: 8, font: 8, dot: 2.4, strokeW: 1.2, attrs: ` x="${num(x - w / 2)}" y="${num(y - h / 2)}" width="${w}" height="${h}"` })}</g>`;
      });
    }
    els.filter((e) => e.kind === 1).forEach((e) => {
      const [a, b] = e.pts.map(P);
      out += `<line class="cell1${e.fold ? " fold" : ""}" data-idx="${e.idx}" x1="${num(a[0])}" y1="${num(a[1])}" x2="${num(b[0])}" y2="${num(b[1])}"/>`;
    });
    // ray arrows and ticks
    if (spec.kind === "cone") {
      spec.rays.forEach((name) => {
        const O = P("O"), E = P(name);
        const ci = spec.cells.findIndex((c) => c.pts.includes(name));
        const oname = spec.cells[ci].pts.find((p) => p !== name);
        const Ostart = P(oname);
        const dx = E[0] - Ostart[0], dy = E[1] - Ostart[1], L = Math.hypot(dx, dy);
        const ux = dx / L, uy = dy / L;
        const tip = [E[0] + ux * 12, E[1] + uy * 12];
        out += `<line class="cell1" x1="${num(E[0])}" y1="${num(E[1])}" x2="${num(tip[0] - ux * 6)}" y2="${num(tip[1] - uy * 6)}" stroke-dasharray="2 4"/>`;
        out += `<path class="ray-arrow" d="M${num(tip[0])} ${num(tip[1])}L${num(tip[0] - ux * 10 - uy * 5)} ${num(tip[1] - uy * 10 + ux * 5)}L${num(tip[0] - ux * 10 + uy * 5)} ${num(tip[1] - uy * 10 - ux * 5)}Z"/>`;
        if (!opts.bare) {
          const M = [(Ostart[0] + E[0]) / 2, (Ostart[1] + E[1]) / 2];
          out += `<line x1="${num(M[0] - uy * 5)}" y1="${num(M[1] + ux * 5)}" x2="${num(M[0] + uy * 5)}" y2="${num(M[1] - ux * 5)}" stroke="var(--muted)" stroke-width="1.2"/>`;
          out += `<text class="tick" x="${num(M[0] + uy * 14)}" y="${num(M[1] - ux * 14)}" text-anchor="middle" dominant-baseline="central">ℓ = 1</text>`;
        }
        void O;
      });
    }
    els.filter((e) => e.kind === 0 && !e.ray).forEach((e) => {
      const [x, y] = P(e.name);
      if (e.fold) out += `<path class="foldpt" data-idx="${e.idx}" d="M${num(x)} ${num(y - 7)}L${num(x + 7)} ${num(y)}L${num(x)} ${num(y + 7)}L${num(x - 7)} ${num(y)}Z"/>`;
      else out += `<circle class="cell0" data-idx="${e.idx}" cx="${num(x)}" cy="${num(y)}" r="${opts.bare ? 3.5 : 5.5}"/>`;
    });
    if (!opts.bare) {
      const all = Object.values(spec.verts).map(tf.to);
      const cx = all.reduce((s, p) => s + p[0], 0) / all.length, cy = all.reduce((s, p) => s + p[1], 0) / all.length;
      // put each label in the widest gap between the segments at its vertex, leaning outward
      const freeDir = (name) => {
        const [x, y] = P(name);
        const dirs = els.filter((e) => e.kind === 1 && e.pts.includes(name)).map((e) => {
          const [u, v] = P(e.pts[0] === name ? e.pts[1] : e.pts[0]);
          return Math.atan2(v - y, u - x);
        });
        const out0 = Math.atan2(y - cy, x - cx);
        let best = out0, score = -Infinity;
        for (let c = 0; c < 72; c++) {
          const a = (c / 72) * 2 * Math.PI - Math.PI;
          const gap = Math.min(...dirs.map((d) => Math.abs(((d - a) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI)), Math.PI);
          const sc = Math.min(gap, 1.2) + 0.25 * Math.cos(a - out0);
          if (sc > score) { score = sc; best = a; }
        }
        return [Math.cos(best), Math.sin(best)];
      };
      Object.entries(spec.labels).forEach(([name, text]) => {
        const [x, y] = P(name);
        const [ux, uy] = freeDir(name);
        out += `<text class="vlabel" x="${num(x + ux * 17)}" y="${num(y + uy * 15)}" text-anchor="middle" dominant-baseline="central">${text}</text>`;
      });
      spec.icons.forEach((name) => {
        const e = els.find((x) => x.kind === 0 && x.name === name);
        const [x, y] = P(name);
        let dx = x - cx, dy = y - cy, L = Math.hypot(dx, dy);
        if (L < 1) { dx = 0; dy = 1; L = 1; }
        const [w, h] = spec.iconSize;
        const ux = dx / L, uy = dy / L;
        const dist = Math.abs(ux) * (w / 2) + Math.abs(uy) * (h / 2) + 14;
        const bx = x + ux * dist - w / 2, by = y + uy * dist - h / 2;
        out += `<g class="icon"><rect x="${num(bx)}" y="${num(by)}" width="${w}" height="${h}" rx="5"/>${MD.graphSvg(data.graphs[e.idx], { w, h, pad: 9, font: 8.5, dot: 2.6, strokeW: 1.3, attrs: ` x="${num(bx)}" y="${num(by)}" width="${w}" height="${h}"` })}</g>`;
      });
    }
    return out;
  }

  root.SPIC = { picTransform, elementsOf, spaceSvg };
})(window);
