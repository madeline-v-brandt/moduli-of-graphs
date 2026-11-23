/* The genus 2 surface of the pinching figure, in space. It is drawn in WebGL by ray marching a
   distance function: two tori side by side, joined smoothly. Their core circles touch at the
   origin, so the middle of the surface is one short bar between the two holes.

   The four curves are cut out by planes: x = 0 (the middle neck), y = 0 near the origin (between
   the holes), and x = ∓c above the holes (the handles). Pinching a handle or the curve between the
   holes thins the tube there down to a point. Pinching the middle neck slides the tori apart until
   they only touch at the origin.

   Surface3D.create(canvas) returns null when WebGL is not available. Otherwise it returns
   { draw({ Rm, v: { L, M, N, R }, show: { N, M }, colors }) }, where Rm turns the surface (as in
   Turn3D) and each v is how far that curve has been pinched, from 0 to 1. */
(function (root) {
  "use strict";
  const RR = 1.0, rr = 0.36, CAM = 9.0, BLEND = 0.22;

  const VS = "attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }";
  const FS = `
precision highp float;
uniform vec2 uRes;
uniform mat3 uRot;      // view space -> surface space
uniform float uScale;   // pixels per unit at depth 0
uniform float uC;       // the tori are centred at (±uC, 0, 0)
uniform vec4 uPinch;    // left handle, between the holes, middle neck, right handle
uniform vec2 uShow;     // draw the middle neck, draw the curve between the holes
uniform float uDot;     // the radius of a node, in pixels
uniform vec3 uBase, uInk, uNode, uColL, uColM, uColN, uColR;
const float RR = ${RR.toFixed(3)}, rr = ${rr.toFixed(3)}, CAM = ${CAM.toFixed(3)};

float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / max(k, 1e-5);
  return min(a, b) - h * h * k * 0.25;
}
// a torus in the xy-plane, centred at (cx, 0, 0); its tube can be pinched at the top
float torus(vec3 p, float cx, float top) {
  vec2 q = vec2(p.x - cx, p.y);
  float ang = atan(q.x, q.y);  // 0 at the top
  float o = 1.0 - top * exp(-2.5 * ang * ang);
  float m = 1.0 - uPinch.y * exp(-5.0 * dot(p.xy, p.xy));
  return length(vec2(length(q) - RR, p.z)) - rr * sqrt(max(o * m, 0.0));
}
float sdf(vec3 p) {
  float a = torus(p, -uC, uPinch.x), b = torus(p, uC, uPinch.w);
  // the blend fades out at the origin as a node forms there, so that the node is a true point
  float k = ${BLEND.toFixed(3)} * (1.0 - max(uPinch.y, uPinch.z) * exp(-4.0 * dot(p, p)));
  return smin(a, b, k);
}
vec3 normal(vec3 p) {
  const vec2 e = vec2(1.0, -1.0) * 0.0015;
  return normalize(e.xyy * sdf(p + e.xyy) + e.yyx * sdf(p + e.yyx) + e.yxy * sdf(p + e.yxy) + e.xxx * sdf(p + e.xxx));
}
float band(float d, float w, float aa) { return 1.0 - smoothstep(w - aa, w + aa, abs(d)); }

vec3 shade(vec3 p, vec3 rd, float px) {
  vec3 n = normal(p), v = -rd;
  vec3 key = uRot * normalize(vec3(-0.45, 0.75, 0.55)), fill = uRot * normalize(vec3(0.6, -0.2, 0.8));
  float dif = max(dot(n, key), 0.0), dif2 = max(dot(n, fill), 0.0);
  float spec = pow(max(dot(n, normalize(key + v)), 0.0), 48.0);
  vec3 col = uBase * (0.38 + 0.55 * dif + 0.2 * dif2);
  // the curves, painted on; a curve that has pinched all the way is a node, drawn as a dot instead
  float w = 0.024, aa = 1.2 * px;
  float bL = step(uPinch.x, 0.999) * band(p.x + uC, w, aa) * step(0.0, p.y);
  float bR = step(uPinch.w, 0.999) * band(p.x - uC, w, aa) * step(0.0, p.y);
  float bN = step(uPinch.z, 0.999) * uShow.x * band(p.x, w, aa);
  float bM = step(uPinch.y, 0.999) * uShow.y * band(p.y, w, aa) * step(abs(p.x), 0.7);
  vec3 paint = uColL; float amt = bL;
  if (bR > amt) { paint = uColR; amt = bR; }
  if (bN > amt) { paint = uColN; amt = bN; }
  if (bM > amt) { paint = uColM; amt = bM; }
  col = mix(col, paint * (0.55 + 0.45 * dif + 0.15 * dif2), amt);
  col += vec3(0.22) * spec * (1.0 - amt);
  // darken towards the outline
  return mix(uInk, col, smoothstep(0.0, 0.3, dot(n, v)));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uScale;
  vec3 ro = uRot * vec3(0.0, 0.0, CAM), rd = uRot * normalize(vec3(uv, -CAM));
  // a bounding sphere
  float rad = uC + RR + rr + 0.05, b = dot(ro, rd), c = dot(ro, ro) - rad * rad, disc = b * b - c;
  if (disc < 0.0) { gl_FragColor = vec4(0.0); return; }
  float t = max(-b - sqrt(disc), 0.0), tf = -b + sqrt(disc);
  float near = 1e9, px = 0.0;
  bool hit = false;
  for (int i = 0; i < 180; i++) {
    vec3 p = ro + rd * t;
    float d = sdf(p);
    px = t / (CAM * uScale);  // the width of a pixel at this depth
    if (d < 0.25 * px) { hit = true; break; }
    near = min(near, d / px);
    t += 0.55 * d;
    if (t > tf) break;
  }
  // a ray that only grazes the surface draws its outline
  float edge = 1.0 - smoothstep(0.4, 1.4, near);
  vec4 col = hit ? vec4(shade(ro + rd * t, rd, px), 1.0) : vec4(uInk * edge, edge);
  // the nodes are dots of a fixed size on the screen, faint when the surface is in front of them
  for (int i = 0; i < 3; i++) {
    vec3 q = i == 0 ? vec3(-uC, RR, 0.0) : i == 1 ? vec3(uC, RR, 0.0) : vec3(0.0);
    float on = i == 0 ? uPinch.x : i == 1 ? uPinch.w : max(uPinch.y, uPinch.z);
    if (on < 1.0) continue;
    float tq = dot(q - ro, rd);
    float dpx = length(ro + rd * tq - q) * CAM * uScale / tq;
    float a = (hit && t < tq - 0.12 ? 0.4 : 1.0) * (1.0 - smoothstep(uDot - 0.8, uDot + 0.8, dpx));
    col = mix(col, vec4(uNode, 1.0), a);
  }
  gl_FragColor = col;
}`;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
    return s;
  }

  function create(canvas) {
    let gl = null;
    try { gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false }); } catch (err) { gl = null; }
    if (!gl) return null;
    const vs = compile(gl, gl.VERTEX_SHADER, VS), fs = compile(gl, gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(prog)); return null; }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {};
    ["uRes", "uRot", "uScale", "uC", "uPinch", "uShow", "uDot", "uBase", "uInk", "uNode", "uColL", "uColM", "uColN", "uColR"]
      .forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));

    // points around the widest the surface gets (the tori pulled apart), so that pinching never zooms
    const RIM = [];
    for (const sx of [-1, 1]) for (let j = 0; j < 40; j++) {
      const a = (2 * Math.PI * j) / 40, cx = sx * (RR + rr);
      RIM.push([cx + (RR + rr) * Math.cos(a), (RR + rr) * Math.sin(a), 0]);
      for (const sz of [-1, 1]) RIM.push([cx + RR * Math.cos(a), RR * Math.sin(a), sz * rr]);
    }
    function scaleFor(Rm, W, H, pad) {
      let mx = 0, my = 0;
      for (const p of RIM) {
        const q = [0, 1, 2].map((r) => Rm[r][0] * p[0] + Rm[r][1] * p[1] + Rm[r][2] * p[2]);
        const f = CAM / (CAM - q[2]);
        mx = Math.max(mx, Math.abs(q[0] * f));
        my = Math.max(my, Math.abs(q[1] * f));
      }
      return Math.min((W / 2 - pad) / mx, (H / 2 - pad) / my);
    }

    function draw(s) {
      const dpr = Math.min(root.devicePixelRatio || 1, 2);
      const W = Math.max(1, Math.round(canvas.clientWidth * dpr)), H = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const Rm = s.Rm;
      gl.uniform2f(U.uRes, W, H);
      // GLSL reads the rows of Rm as columns, which gives the inverse rotation: view -> surface
      gl.uniformMatrix3fv(U.uRot, false, new Float32Array([].concat(Rm[0], Rm[1], Rm[2])));
      gl.uniform1f(U.uScale, scaleFor(Rm, W, H, 6 * dpr));
      gl.uniform1f(U.uC, RR + rr * s.v.N);
      gl.uniform4f(U.uPinch, s.v.L, s.v.M, s.v.N, s.v.R);
      gl.uniform2f(U.uShow, s.show.N ? 1 : 0, s.show.M ? 1 : 0);
      gl.uniform1f(U.uDot, 4.5 * dpr);
      const C = s.colors;
      [["uBase", C.base], ["uInk", C.ink], ["uNode", C.node], ["uColL", C.L], ["uColM", C.M], ["uColN", C.N], ["uColR", C.R]]
        .forEach(([n, c]) => gl.uniform3f(U[n], c[0], c[1], c[2]));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    return { draw };
  }

  root.Surface3D = { create };
})(window);
