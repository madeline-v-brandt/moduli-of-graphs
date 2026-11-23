/* Turning a picture in space: a rotation you can drag, a slow spin that pauses when the picture
   is off screen (and is off when the reader prefers reduced motion), and clicks and hovers on
   the elements under the pointer. Used by the pictures of Δ_{0,6} and Δ_{1,3}. */
(function (root) {
  "use strict";
  const rotY = (a) => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]];
  const rotX = (a) => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
  const mul = (A, B) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
  const apply = (R, p) => [0, 1, 2].map((r) => R[r][0] * p[0] + R[r][1] * p[1] + R[r][2] * p[2]);

  /* o: { Rm, spin (false to start still), spinBtn, speed, draw(), hover(el) -> true if the picture should be redrawn,
        pick(el or null) } */
  function turntable(svg, o) {
    const t = { Rm: o.Rm || [[1, 0, 0], [0, 1, 0], [0, 0, 1]] };
    const speed = o.speed || 0.00028;
    let spinning = o.spin !== false && !root.matchMedia("(prefers-reduced-motion: reduce)").matches, raf = 0, last = 0, visible = true;
    const setLabel = () => { if (o.spinBtn) o.spinBtn.textContent = spinning ? "Pause" : "Spin"; };
    function tick(now) {
      raf = 0;
      if (!spinning || !visible || !svg.isConnected) return;
      const dt = last ? Math.min(now - last, 50) : 16;
      last = now;
      t.Rm = mul(rotY(dt * speed), t.Rm);
      o.draw();
      raf = requestAnimationFrame(tick);
    }
    const start = () => { if (!raf && spinning) { last = 0; raf = requestAnimationFrame(tick); } };
    const io = new IntersectionObserver((ents) => { visible = ents[0].isIntersecting; if (visible) start(); });
    io.observe(svg);
    if (o.spinBtn) o.spinBtn.addEventListener("click", () => { spinning = !spinning; setLabel(); start(); });
    setLabel();

    const under = (e) => document.elementFromPoint(e.clientX, e.clientY);
    let drag = null;
    svg.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      try { svg.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointers */ }
      drag = { x: e.clientX, y: e.clientY, moved: false, wasSpinning: spinning };
      spinning = false;
      svg.classList.add("dragging");
    });
    svg.addEventListener("pointermove", (e) => {
      if (!drag) {
        if (o.hover && o.hover(under(e)) && !raf) o.draw();
        return;
      }
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      if (!drag.moved) return;
      t.Rm = mul(rotX(dy * 0.008), mul(rotY(dx * 0.008), t.Rm));
      drag.x = e.clientX; drag.y = e.clientY;
      o.draw();
    });
    const end = (e) => {
      if (!drag) return;
      svg.classList.remove("dragging");
      const moved = drag.moved;
      spinning = moved ? false : drag.wasSpinning;
      drag = null;
      setLabel();
      if (!moved && e && e.type === "pointerup") {
        try { svg.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        o.pick(under(e));
      }
      start();
    };
    svg.addEventListener("pointerup", end);
    svg.addEventListener("pointercancel", end);
    svg.addEventListener("pointerleave", () => { if (!drag && o.hover && o.hover(null) && !raf) o.draw(); });

    t.start = start;
    t.destroy = () => { spinning = false; io.disconnect(); if (raf) cancelAnimationFrame(raf); };
    return t;
  }

  root.Turn3D = { turntable, rotX, rotY, mul, apply };
})(window);
