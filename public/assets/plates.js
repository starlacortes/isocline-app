/*
  isocline.app — the plates.

  Sixty bold scenes drawn behind the wordmark: twelve kinds of design, five
  variations of each, ordered so neighbours never look alike. One full pass
  takes about 124 seconds. Each scene drifts while it is up, and single-line
  scenes draw themselves on.

  Every colour is a token: paper, ink, the level gradient, and the dial's
  eight seed stops (--seed-stop-0…7 in /tokens/isocline.css), so the plates
  follow light and dark with no work here.

  Honours prefers-reduced-motion (one still scene) and stops while the tab is
  hidden. Debug: add #s=12 to start at scene 12, #hold to freeze.

  Styles are set through the CSSOM, never a style attribute, so the page can
  keep a strict Content-Security-Policy.
*/
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var W = 1440, H = 900, COUNT = 60, LAYERS = 10, PI = Math.PI;
  var DURATIONS = [3200, 1600, 1600, 2600, 1300, 1300, 1300, 3000, 2200, 1800, 3400, 1500];
  var MOTIONS = [
    ['scale(1.02)', 'scale(1.1)'],
    ['scale(1.1)', 'scale(1.02)'],
    ['scale(1.07) translate(-28px, 0px)', 'scale(1.07) translate(28px, 0px)'],
    ['scale(1.09) rotate(-2deg)', 'scale(1.09) rotate(2deg)'],
    ['scale(1.07) translate(0px, 18px)', 'scale(1.07) translate(0px, -18px)']
  ];
  var INK = 'var(--ink)', PAPER = 'var(--paper)', G = 'G';
  var cache = {}, cacheKeys = [], instances = 0;

  function f(v) { return Math.round(v * 10) / 10; }
  function hu(k) { return 'var(--seed-stop-' + (((k % 8) + 8) % 8) + ')'; }
  function disc(x, y, r) {
    r = f(r);
    return 'M' + f(x - r) + ' ' + f(y) + 'a' + r + ' ' + r + ' 0 1 0 ' + f(2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 ' + f(-2 * r) + ' 0Z';
  }
  function line(fn, x0, x1, st) {
    var p = [];
    for (var q = x0; q <= x1; q += st) { p.push(f(q) + ' ' + f(fn(q))); }
    return 'M' + p.join('L');
  }
  function mk(d, o) {
    return { d: d, fill: o.fill || 'none', stroke: o.stroke || 'none', sw: f(o.sw || 0), op: o.op == null ? 1 : o.op, draw: !!o.draw };
  }
  /* Steady-state level of a repeated dose (one-compartment, first-order in and out), scaled to 0…1. */
  function dose(ka, ke, per) {
    function lv(ph) {
      var s = 0;
      for (var k = 0; k < 12; k++) { var u = ph + k * per; s += Math.exp(-ke * u) - Math.exp(-ka * u); }
      return s;
    }
    var lo = 1e9, hi = -1e9;
    for (var q = 0; q <= 200; q++) { var w = lv(q / 200 * per); if (w < lo) { lo = w; } if (w > hi) { hi = w; } }
    return function (t) { var ph = ((t % per) + per) % per; return (lv(ph) - lo) / (hi - lo); };
  }

  function scene(n) {
    if (cache[n]) { return cache[n]; }
    var round = Math.floor(n / 12) % 5, fam = (n * 5 + round * 7) % 12, v = round, h = (n * 3) % 8;
    var Ls = [], i, j, x, y, d, d2, t, a, g;

    if (fam === 0) {                                   /* the dose curve */
      var P = [[2.6, 14, 150, 700], [1.15, 26, 110, 770], [5.2, 9, 250, 650], [2.0, 12, 150, 470], [3.4, 18, 190, 740]][v], wf = dose(1.2, 0.25, 7);
      var wy = function (q, sh, dy) { return P[3] + (dy || 0) - wf((q / W * P[0] + (sh || 0)) * 7 - 0.4) * (P[3] - P[2]); };
      if (v === 3) {
        for (j = 0; j < 3; j++) {
          (function (jj) { Ls.push(mk(line(function (q) { return wy(q, jj * 0.33, jj * 150); }, -20, W + 20, 4), { stroke: hu(h + jj * 2), sw: P[1], draw: 1 })); })(j);
        }
      } else {
        d = line(function (q) { return wy(q); }, -20, W + 20, 4);
        Ls.push(mk(d + 'L' + (W + 20) + ' ' + (H + 20) + 'L-20 ' + (H + 20) + 'Z', { fill: hu(h), op: 0.16 }));
        Ls.push(mk(d, { stroke: G, sw: P[1], draw: 1 }));
        x = W * 0.87;
        Ls.push(mk(disc(x, wy(x), P[1] * 3.4), { fill: hu(h), op: 0.22 }));
        Ls.push(mk(disc(x, wy(x), P[1] * 1.2), { fill: hu(h + 3) }));
      }
    } else if (fam === 1) {                            /* halftone dots */
      var sp1 = [48, 60, 40, 54, 44][v], rm = sp1 * 0.46, df = dose(1.2, 0.25, 7);
      d = '';
      for (y = sp1 / 2; y < H + sp1; y += sp1) {
        for (x = sp1 / 2; x < W + sp1; x += sp1) {
          if (v === 0) { g = 0.5 + 0.5 * Math.cos(Math.hypot(x - 720, y - 450) / 70); }
          else if (v === 1) { g = 0.5 + 0.5 * Math.sin((x + y * 1.4) / 120); }
          else if (v === 2) { g = Math.max(0, 1 - Math.abs(y - (720 - df(x / W * 14) * 520)) / 190); }
          else if (v === 3) { g = y / H; }
          else { g = 0.5 + 0.25 * Math.cos(Math.hypot(x - 300, y - 250) / 55) + 0.25 * Math.cos(Math.hypot(x - 1140, y - 650) / 55); }
          g = rm * (0.06 + 0.94 * g);
          if (g > 1.4) { d += disc(x, y, g); }
        }
      }
      Ls.push(mk(d, { fill: v === 2 ? G : hu(h) }));
    } else if (fam === 2) {                            /* the dial and its eight stops */
      var C = [[720, 450, 380], [1250, 780, 600], [300, 450, 500], [720, 1020, 720], [1120, 180, 440]][v], cx = C[0], cy = C[1], R = C[2];
      Ls.push(mk(disc(cx, cy, R), { stroke: INK, sw: R * 0.1, op: 0.14 }));
      d = '';
      for (i = 0; i < 72; i++) {
        a = i / 72 * 2 * PI; g = i % 9 === 0 ? 0.7 : 0.8;
        d += 'M' + f(cx + R * g * Math.cos(a)) + ' ' + f(cy + R * g * Math.sin(a)) + 'L' + f(cx + R * 0.88 * Math.cos(a)) + ' ' + f(cy + R * 0.88 * Math.sin(a));
      }
      Ls.push(mk(d, { stroke: INK, sw: 9, op: 0.55 }));
      for (i = 0; i < 8; i++) { a = i * PI / 4 + PI / 8; Ls.push(mk(disc(cx + R * Math.cos(a), cy + R * Math.sin(a), R * 0.11), { fill: hu(i) })); }
    } else if (fam === 3) {                            /* slope fields and their isoclines */
      var sc3 = 150, ox = 720, oy = 450, sl = [
        function (p, q) { return p - q; },
        function (p, q) { return Math.abs(q) < 0.01 ? 1e6 : -p / q; },
        function (p, q) { return 1.6 * Math.sin(1.3 * p) - 0.5 * q; },
        function (p, q) { return Math.abs(q) < 0.01 ? 1e6 : p / q; },
        function (p, q) { return 0.7 * (q + 1.5) * (1.5 - q); }][v];
      d = '';
      for (x = 40; x < W; x += 62) {
        for (y = 40; y < H; y += 62) {
          g = sl((x - ox) / sc3, (oy - y) / sc3); a = Math.sqrt(1 + g * g);
          d += 'M' + f(x - 18 / a) + ' ' + f(y + 18 * g / a) + 'L' + f(x + 18 / a) + ' ' + f(y - 18 * g / a);
        }
      }
      Ls.push(mk(d, { stroke: INK, sw: 8, op: 0.3 }));
      if (v === 0) { d2 = 'M' + (ox - 2.2 * sc3) + ' ' + (oy + 3.2 * sc3) + 'L' + (ox + 4.2 * sc3) + ' ' + (oy - 3.2 * sc3); }
      else if (v === 1) { d2 = disc(ox, oy, 1.4 * sc3) + disc(ox, oy, 2.5 * sc3); }
      else if (v === 3) { d2 = 'M' + (ox - 3.2 * sc3) + ' ' + (oy + 3.2 * sc3) + 'L' + (ox + 3.2 * sc3) + ' ' + (oy - 3.2 * sc3) + 'M' + (ox - 3.2 * sc3) + ' ' + (oy - 3.2 * sc3) + 'L' + (ox + 3.2 * sc3) + ' ' + (oy + 3.2 * sc3); }
      else {
        var ey = v === 2 ? 0 : -1.46, ep = [];
        for (t = -5; t <= 5; t += 0.02) { ep.push(f(ox + t * sc3) + ' ' + f(oy - ey * sc3)); ey += sl(t, ey) * 0.02; }
        d2 = 'M' + ep.join('L');
        if (v === 4) { Ls.push(mk('M-20 ' + (oy - 1.5 * sc3) + 'H' + (W + 20) + 'M-20 ' + (oy + 1.5 * sc3) + 'H' + (W + 20), { stroke: hu(h + 3), sw: 9 })); }
      }
      Ls.push(mk(d2, { stroke: hu(h), sw: 18, draw: v === 0 || v === 2 || v === 4 }));
    } else if (fam === 4) {                            /* looping figures */
      var pts = [], T = 2 * PI, px, py, fx = 720, fy = 450;
      for (i = 0; i <= 720; i++) {
        t = i / 720;
        if (v === 0) { px = 620 * Math.sin(3 * T * t + PI / 2); py = 370 * Math.sin(2 * T * t); }
        else if (v === 1) { a = 2 * T * t; g = 400 * Math.cos(2.5 * a); px = 1.5 * g * Math.cos(a); py = g * Math.sin(a); }
        else if (v === 2) { a = 5 * T * t; g = 20 + 400 * t; px = 1.55 * g * Math.cos(a); py = g * Math.sin(a); }
        else if (v === 3) { px = 620 * Math.sin(5 * T * t); py = 370 * Math.sin(4 * T * t + PI / 4); }
        else { a = 3 * T * t; px = 78 * (2 * Math.cos(a) + 5 * Math.cos(2 * a / 3)); py = 56 * (2 * Math.sin(a) - 5 * Math.sin(2 * a / 3)); }
        if (i === 0) { fx = 720 + px; fy = 450 + py; }
        pts.push(f(720 + px) + ' ' + f(450 + py));
      }
      Ls.push(mk('M' + pts.join('L'), { stroke: v % 2 ? hu(h) : G, sw: [14, 12, 16, 12, 14][v], draw: 1 }));
      Ls.push(mk(disc(fx, fy, 26), { fill: hu(h + 4) }));
    } else if (fam === 5) {                            /* ridgelines */
      var rf = dose(1.4, 0.3, 7), hr = [3, 5, 2, 6, 4][v];
      for (j = 0; j < 9; j++) {
        (function (jj) {
          var fn = function (q) {
            var u = q / W, z;
            if (v === 0) { z = u * 9 - 1 - jj * 0.45; z = z < 0 ? 0 : 2.2 * (Math.exp(-0.5 * z) - Math.exp(-2.5 * z)); }
            else if (v === 1) { z = Math.exp(-Math.pow((q - 260 - jj * 115) / 150, 2)); }
            else if (v === 2) { z = 0.5 + 0.5 * Math.cos(u * 14 + jj * 0.7) * Math.exp(-Math.pow((u - 0.5) * 2.4, 2)); }
            else if (v === 3) { z = rf(u * 16 + jj * 0.9); }
            else { z = Math.exp(-Math.pow((q - 300 - jj * 55) / 120, 2)) + Math.exp(-Math.pow((q - 1140 + jj * 55) / 120, 2)); }
            return 200 + jj * 88 - 170 * z;
          };
          Ls.push(mk(line(fn, -20, W + 20, 5) + 'L' + (W + 20) + ' ' + (H + 80) + 'L-20 ' + (H + 80) + 'Z', { fill: PAPER, stroke: jj === hr ? hu(h) : INK, sw: jj === hr ? 14 : 7 }));
        })(j);
      }
    } else if (fam === 6) {                            /* the point, large */
      var Q = [[1050, 330, 330], [300, 620, 420], [720, 450, 250], [1240, 760, 520], [240, 200, 300]][v];
      x = Q[0]; y = Q[1]; g = Q[2];
      Ls.push(mk(disc(x, y, g * 1.55), { stroke: hu(h), sw: g * 0.14, op: 0.22 }));
      Ls.push(mk(disc(x, y, g * 1.22), { stroke: hu(h), sw: g * 0.1, op: 0.4 }));
      Ls.push(mk(disc(x, y, g), { fill: hu(h) }));
      Ls.push(mk(disc(W - x, H - y, g * 0.42), { fill: hu(h + 4) }));
      Ls.push(mk(disc(W - x + g * 0.62, H - y - g * 0.5, g * 0.12), { fill: INK }));
    } else if (fam === 7) {                            /* bar runs */
      var nb = [28, 44, 18, 36, 60][v], bw = W / nb, bf = dose(1.2, 0.25, 7), bs = [14, 21, 7, 28, 14][v], seg;
      d = ''; d2 = '';
      for (i = 0; i < nb; i++) {
        x = f((i + 0.5) * bw); g = 110 + bf(i / nb * bs - 0.4) * 560;
        if (v === 0) { seg = 'M' + x + ' ' + (H + 60) + 'V' + f(H - g); }
        else if (v === 2) { seg = 'M' + x + ' -60V' + f(g); }
        else if (v === 3) { seg = i % 2 ? 'M' + x + ' -60V' + f(g * 0.8) : 'M' + x + ' ' + (H + 60) + 'V' + f(H - g * 0.8); }
        else { seg = 'M' + x + ' ' + f(450 - g / 2) + 'V' + f(450 + g / 2); }
        if (i % 2) { d2 += seg; } else { d += seg; }
      }
      Ls.push(mk(d, { stroke: hu(h), sw: bw * 0.56 }));
      Ls.push(mk(d2, { stroke: v % 2 ? hu(h + 3) : hu(h), sw: bw * 0.56, op: v % 2 ? 1 : 0.5 }));
    } else if (fam === 8) {                            /* sunbursts */
      var O = [[720, 1000], [0, 900], [720, 450], [1440, 0], [300, 450]][v], nr = [28, 20, 36, 24, 32][v];
      d = '';
      for (i = 0; i < nr; i += 2) {
        a = i / nr * 2 * PI; g = (i + 1) / nr * 2 * PI;
        d += 'M' + O[0] + ' ' + O[1] + 'L' + f(O[0] + 2200 * Math.cos(a)) + ' ' + f(O[1] + 2200 * Math.sin(a)) + 'L' + f(O[0] + 2200 * Math.cos(g)) + ' ' + f(O[1] + 2200 * Math.sin(g)) + 'Z';
      }
      Ls.push(mk(d, { fill: hu(h), op: 0.85 }));
      Ls.push(mk(disc(O[0], O[1], 150), { fill: PAPER }));
      Ls.push(mk(disc(O[0], O[1], 78), { fill: hu(h + 4) }));
    } else if (fam === 9) {                            /* interfering rings */
      var A9 = [[380, 300, 1060, 600], [-60, 450, 1500, 450], [720, -160, 720, 1060], [260, 820, 1180, 80], [640, 450, 800, 450]][v], sp9 = [38, 46, 34, 42, 30][v];
      d = ''; d2 = '';
      for (i = 1; i <= 44; i++) { d += disc(A9[0], A9[1], i * sp9); d2 += disc(A9[2], A9[3], i * sp9); }
      Ls.push(mk(d, { stroke: hu(h), sw: sp9 * 0.36, op: 0.9 }));
      Ls.push(mk(d2, { stroke: hu(h + 3), sw: sp9 * 0.36, op: 0.7 }));
    } else if (fam === 10) {                           /* the gauge settling */
      var dec = [2.2, 3.6, 1.4, 2.8, 5][v], fr = [1.5, 0.9, 2.2, 1.2, 0.7][v], flip = v % 2, up = [], dn = [], gp = [];
      for (x = -20; x <= W + 20; x += 4) {
        t = (flip ? (W - x) : x) / W * 9; g = 360 * Math.exp(-t / dec);
        up.push(f(x) + ' ' + f(450 - g)); dn.unshift(f(x) + ' ' + f(450 + g)); gp.push(f(x) + ' ' + f(450 - g * Math.cos(2 * PI * t / fr)));
      }
      Ls.push(mk('M' + up.join('L') + 'L' + dn.join('L') + 'Z', { fill: hu(h), op: 0.18 }));
      Ls.push(mk('M-20 450H' + (W + 20), { stroke: INK, sw: 4, op: 0.35 }));
      Ls.push(mk('M' + gp.join('L'), { stroke: G, sw: 12, draw: 1 }));
      Ls.push(mk(disc(flip ? 70 : W - 70, 450, 28), { fill: hu(h + 4) }));
    } else {                                           /* fans of rising and falling curves */
      d = ''; d2 = '';
      for (j = 0; j < 13; j++) {
        (function (jj) {
          var fn = function (q) {
            if (v === 0) { return 790 - 640 / (1 + Math.exp(-(q - 240 - jj * 80) / 90)); }
            if (v === 1) { return 830 - (720 - jj * 52) * Math.exp(-q / (240 + jj * 50)); }
            if (v === 2) { return 450 + (60 + jj * 22) * Math.sin(q / 190 + jj * 0.3); }
            if (v === 3) { return 810 - (90 + jj * 52) / (1 + Math.exp(-(q - 520) / 120)); }
            return 60 + jj * 110 - (q - 720) * 0.42;
          };
          var s = line(fn, -20, W + 20, 6);
          if (jj % 2) { d2 += s; } else { d += s; }
        })(j);
      }
      Ls.push(mk(d, { stroke: hu(h), sw: 10 }));
      Ls.push(mk(d2, { stroke: v % 2 ? INK : hu(h + 3), sw: 10, op: v % 2 ? 0.75 : 1 }));
    }

    var dur = DURATIONS[n % 12], mot = MOTIONS[n % 5];
    var out = { layers: Ls, t0: mot[0], t1: mot[1], dur: dur, fade: Math.round(Math.min(480, dur * 0.22)) };
    cache[n] = out;
    cacheKeys.push(n);
    if (cacheKeys.length > 4) { delete cache[cacheKeys.shift()]; }
    return out;
  }

  function el(name, attrs, parent) {
    var node = document.createElementNS(NS, name);
    for (var k in attrs) { if (Object.prototype.hasOwnProperty.call(attrs, k)) { node.setAttribute(k, attrs[k]); } }
    if (parent) { parent.appendChild(node); }
    return node;
  }

  function Plates(host) {
    var self = this, gid = 'plates-g' + (instances++), hash = '';
    try { hash = window.location.hash || ''; } catch (e) {}
    var m = /s=(\d+)/.exec(hash), start = parseInt(host.getAttribute('data-plates'), 10);
    if (m) { start = parseInt(m[1], 10); }
    this.n = isNaN(start) ? 0 : ((start % COUNT) + COUNT) % COUNT;
    this.fill = 'url(#' + gid + ')';
    this.front = 0;
    this.timer = 0;

    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true', focusable: 'false' });
    var grad = el('linearGradient', { id: gid, gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: W, y2: 0 }, el('defs', {}, svg));
    el('stop', { offset: 0, 'class': 'plates__low' }, grad);
    el('stop', { offset: 1, 'class': 'plates__high' }, grad);
    this.slots = [0, 1].map(function () {
      var g = el('g', { 'class': 'plates__slot' }, svg), paths = [];
      for (var i = 0; i < LAYERS; i++) { paths.push(el('path', { pathLength: 1 }, g)); }
      return { g: g, paths: paths };
    });
    host.appendChild(svg);

    var still = /hold/.test(hash);
    try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { still = true; } } catch (e) {}
    this.still = still;

    if (still) {
      this.paint(this.slots[0], scene(this.n), true);
      this.slots[0].g.style.opacity = 1;
      return;
    }
    this.enter(this.slots[0], scene(this.n));
    this.schedule();
    document.addEventListener('visibilitychange', function () {
      clearTimeout(self.timer);
      if (!document.hidden) { self.schedule(); }
    });
  }

  Plates.prototype.paint = function (slot, sc, settled) {
    for (var i = 0; i < LAYERS; i++) {
      var p = slot.paths[i], L = sc.layers[i];
      p.style.transition = 'none';
      if (!L) { p.setAttribute('d', ''); p.style.opacity = 0; continue; }
      p.setAttribute('d', L.d);
      p.style.fill = L.fill === G ? this.fill : L.fill;
      p.style.stroke = L.stroke === G ? this.fill : L.stroke;
      p.style.strokeWidth = L.sw + 'px';
      p.style.opacity = L.op;
      p.style.strokeDasharray = L.draw ? '1' : 'none';
      p.style.strokeDashoffset = L.draw && !settled ? 1 : 0;
    }
    slot.g.style.transition = 'none';
    slot.g.style.transform = settled ? sc.t1 : sc.t0;
  };

  /* Bring a scene up in a slot: set it at its starting pose, then let it fade in, drift and draw. */
  Plates.prototype.enter = function (slot, sc) {
    this.paint(slot, sc, false);
    slot.g.getBoundingClientRect();                    /* commit the starting pose before transitioning */
    slot.g.style.transition = 'opacity ' + sc.fade + 'ms ease, transform ' + (sc.dur + 800) + 'ms linear';
    slot.g.style.opacity = 1;
    slot.g.style.transform = sc.t1;
    var draw = Math.round(Math.min(1700, sc.dur * 0.7));
    for (var i = 0; i < LAYERS; i++) {
      if (sc.layers[i] && sc.layers[i].draw) {
        slot.paths[i].style.transition = 'stroke-dashoffset ' + draw + 'ms ease-out';
        slot.paths[i].style.strokeDashoffset = 0;
      }
    }
  };

  Plates.prototype.schedule = function () {
    var self = this;
    this.timer = setTimeout(function () {
      var leaving = self.slots[self.front];
      self.front = 1 - self.front;
      self.n = (self.n + 1) % COUNT;
      self.enter(self.slots[self.front], scene(self.n));
      leaving.g.style.opacity = 0;
      self.schedule();
    }, scene(this.n).dur);
  };

  function init() {
    var hosts = document.querySelectorAll('[data-plates]');
    for (var i = 0; i < hosts.length; i++) { new Plates(hosts[i]); }
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
