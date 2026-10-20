/* ============================================================
   颜色转换 - 工具页逻辑
   HEX/RGB/HSL/HSV 互转，实时预览，衍生色，Web 常用色表
   ============================================================ */
(function () {
  "use strict";

  var picker = document.getElementById("ccPicker");
  var hexEl = document.getElementById("ccHex");
  var rEl = document.getElementById("ccR");
  var gEl = document.getElementById("ccG");
  var bEl = document.getElementById("ccB");
  var hEl = document.getElementById("ccH");
  var sEl = document.getElementById("ccS");
  var lEl = document.getElementById("ccL");
  var h2El = document.getElementById("ccH2");
  var s2El = document.getElementById("ccS2");
  var vEl = document.getElementById("ccV");
  var alphaEl = document.getElementById("ccAlpha");
  var alphaVal = document.getElementById("ccAlphaVal");
  var preview = document.getElementById("ccPreview");
  var previewHex = document.getElementById("ccPreviewHex");
  var errEl = document.getElementById("ccError");
  var derivedEl = document.getElementById("ccDerived");
  var paletteEl = document.getElementById("ccPalette");

  var state = { r: 59, g: 130, b: 246, a: 1 };

  /* ---------- 工具：复制 / 提示 ---------- */
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2000);
  }
  function copyText(text, msg) {
    function done() { showToast(msg); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else { fallbackCopy(text); done(); }
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  /* ---------- 数值工具 ---------- */
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function rint(v) { return Math.round(clamp(v, 0, 255)); }
  function pad2(n) { n = String(n); return n.length < 2 ? "0" + n : n; }

  /* ---------- HEX ---------- */
  function hexToRgb(hex) {
    hex = (hex || "").trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{3}$/.test(hex)) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    };
  }
  function rgbToHex(r, g, b) {
    return "#" + pad2(rint(r).toString(16).toUpperCase()) +
      pad2(rint(g).toString(16).toUpperCase()) +
      pad2(rint(b).toString(16).toUpperCase());
  }

  /* ---------- RGB <-> HSL ---------- */
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;
    if (max === min) { h = 0; s = 0; }
    else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: h, s: s * 100, l: l * 100 };
  }
  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }
  function hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    var r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r: r * 255, g: g * 255, b: b * 255 };
  }

  /* ---------- RGB <-> HSV ---------- */
  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, v = max;
    var d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max === min) h = 0;
    else {
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: h, s: s * 100, v: v * 100 };
  }
  function hsvToRgb(h, s, v) {
    h /= 360; s /= 100; v /= 100;
    var r, g, b;
    var i = Math.floor(h * 6);
    var f = h * 6 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);
    switch (((i % 6) + 6) % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      default: r = v; g = p; b = q; break;
    }
    return { r: r * 255, g: g * 255, b: b * 255 };
  }

  function mix(c1, c2, t) {
    return { r: c1.r + (c2.r - c1.r) * t, g: c1.g + (c2.g - c1.g) * t, b: c1.b + (c2.b - c1.b) * t };
  }

  /* ---------- 设置与刷新 ---------- */
  function setRgb(r, g, b, skip) {
    state.r = rint(r); state.g = rint(g); state.b = rint(b);
    refresh(skip);
  }

  function refresh(skip) {
    var r = state.r, g = state.g, b = state.b;
    var hex = rgbToHex(r, g, b);
    var hsl = rgbToHsl(r, g, b);
    var hsv = rgbToHsv(r, g, b);

    if (skip !== picker) picker.value = hex.toLowerCase();
    if (skip !== hexEl) hexEl.value = hex;

    if (skip !== rEl) rEl.value = r;
    if (skip !== gEl) gEl.value = g;
    if (skip !== bEl) bEl.value = b;

    if (skip !== hEl) hEl.value = Math.round(hsl.h);
    if (skip !== sEl) sEl.value = Math.round(hsl.s);
    if (skip !== lEl) lEl.value = Math.round(hsl.l);

    if (skip !== h2El) h2El.value = Math.round(hsv.h);
    if (skip !== s2El) s2El.value = Math.round(hsv.s);
    if (skip !== vEl) vEl.value = Math.round(hsv.v);

    applyAlpha();
    buildDerived(hsl, hsv);
  }

  function applyAlpha() {
    var rgbStr = state.r + ", " + state.g + ", " + state.b;
    preview.style.background = "rgba(" + rgbStr + ", " + state.a + ")";
    alphaVal.textContent = Math.round(state.a * 100) + "%";
    previewHex.textContent = state.a < 1
      ? rgbToHex(state.r, state.g, state.b) + " · " + Math.round(state.a * 100) + "%"
      : rgbToHex(state.r, state.g, state.b);
  }

  function buildDerived(hsl, hsv) {
    var comp = hslToRgb((hsl.h + 180) % 360, hsl.s, hsl.l);
    var light = mix(state, { r: 255, g: 255, b: 255 }, 0.35);
    var dark = mix(state, { r: 0, g: 0, b: 0 }, 0.35);
    var items = [
      { name: "Complementary", c: comp },
      { name: "Light Variants", c: light },
      { name: "Dark Variants", c: dark }
    ];
    derivedEl.innerHTML = items.map(function (it) {
      var hx = rgbToHex(it.c.r, it.c.g, it.c.b);
      return '<div class="cc-deriv-card"><div class="cc-deriv-swatch" style="background:' + hx + ';"></div>' +
        '<div class="cc-deriv-info"><div class="nm">' + it.name + '</div>' +
        '<div class="vl">' + hx + '</div>' +
        '<button class="btn" style="margin-top:6px;" type="button" data-dhex="' + hx + '">Copy</button></div></div>';
    }).join("");
    Array.prototype.forEach.call(derivedEl.querySelectorAll("[data-dhex]"), function (btn) {
      btn.addEventListener("click", function () {
        copyText(btn.getAttribute("data-dhex"), "Copied" + btn.previousElementSibling.previousElementSibling.textContent + "：" + btn.getAttribute("data-dhex"));
      });
    });
  }

  /* ---------- 复制格式 ---------- */
  function fmtHex() { return rgbToHex(state.r, state.g, state.b); }
  function fmtRgb() { return "rgb(" + state.r + ", " + state.g + ", " + state.b + ")"; }
  function fmtHsl() {
    var h = rgbToHsl(state.r, state.g, state.b);
    return "hsl(" + Math.round(h.h) + ", " + Math.round(h.s) + "%, " + Math.round(h.l) + "%)";
  }
  function fmtRgba() {
    return "rgba(" + state.r + ", " + state.g + ", " + state.b + ", " + state.a + ")";
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-copy-fmt]"), function (btn) {
    btn.addEventListener("click", function () {
      var f = btn.getAttribute("data-copy-fmt");
      var map = { hex: [fmtHex, "HEX"], rgb: [fmtRgb, "RGB"], hsl: [fmtHsl, "HSL"], rgba: [fmtRgba, "RGBA"] };
      if (!map[f]) return;
      copyText(map[f][0](), "Copied" + map[f][1] + "：" + map[f][0]());
    });
  });

  /* ---------- 输入绑定 ---------- */
  picker.addEventListener("input", function () {
    var c = hexToRgb(picker.value);
    if (c) { state.r = c.r; state.g = c.g; state.b = c.b; refresh(picker); }
  });

  hexEl.addEventListener("input", function () {
    var c = hexToRgb(hexEl.value);
    if (c) { state.r = c.r; state.g = c.g; state.b = c.b; refresh(hexEl); errEl.hidden = true; }
    else { errEl.hidden = false; errEl.textContent = "Invalid HEX format. It should be #RRGGBB or #RGB (hexadecimal)."; }
  });

  function bindTriple(els, parse) {
    Array.prototype.forEach.call(els, function (el) {
      el.addEventListener("input", function () {
        var r = Number(rEl.value), g = Number(gEl.value), b = Number(bEl.value);
        if (isNaN(r) || isNaN(g) || isNaN(b)) return;
        setRgb(clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255), el);
      });
    });
  }
  bindTriple([rEl, gEl, bEl]);

  function bindHsl() {
    [hEl, sEl, lEl].forEach(function (el) {
      el.addEventListener("input", function () {
        var h = Number(hEl.value), s = Number(sEl.value), l = Number(lEl.value);
        if (isNaN(h) || isNaN(s) || isNaN(l)) return;
        h = ((h % 360) + 360) % 360;
        var c = hslToRgb(h, clamp(s, 0, 100), clamp(l, 0, 100));
        setRgb(c.r, c.g, c.b, el);
      });
    });
  }
  bindHsl();

  function bindHsv() {
    [h2El, s2El, vEl].forEach(function (el) {
      el.addEventListener("input", function () {
        var h = Number(h2El.value), s = Number(s2El.value), v = Number(vEl.value);
        if (isNaN(h) || isNaN(s) || isNaN(v)) return;
        h = ((h % 360) + 360) % 360;
        var c = hsvToRgb(h, clamp(s, 0, 100), clamp(v, 0, 100));
        setRgb(c.r, c.g, c.b, el);
      });
    });
  }
  bindHsv();

  alphaEl.addEventListener("input", function () {
    state.a = clamp(Number(alphaEl.value), 0, 100) / 100;
    applyAlpha();
  });

  /* ---------- Web 常用颜色 ---------- */
  var PALETTE = [
    { n: "Red", h: "#FF0000" },
    { n: "Green", h: "#008000" },
    { n: "Blue", h: "#0000FF" },
    { n: "Yellow", h: "#FFFF00" },
    { n: "Orange", h: "#FFA500" },
    { n: "Purple", h: "#800080" },
    { n: "Pink", h: "#FFC0CB" },
    { n: "Cyan", h: "#00FFFF" },
    { n: "Teal", h: "#008080" },
    { n: "Lime", h: "#00FF00" },
    { n: "Navy", h: "#000080" },
    { n: "Maroon", h: "#800000" },
    { n: "Olive", h: "#808000" },
    { n: "Gray", h: "#808080" },
    { n: "Silver", h: "#C0C0C0" },
    { n: "Black", h: "#000000" },
    { n: "White", h: "#FFFFFF" },
    { n: "Gold", h: "#FFD700" },
    { n: "Coral", h: "#FF7F50" },
    { n: "Indigo", h: "#4B0082" },
    { n: "Tomato", h: "#FF6347" },
    { n: "SkyBlue", h: "#87CEEB" }
  ];

  paletteEl.innerHTML = PALETTE.map(function (p) {
    return '<div class="cc-swatch" data-hex="' + p.h + '"><div class="sw" style="background:' + p.h + ';"></div>' +
      '<div class="lb">' + p.n + '<br><span class="hex">' + p.h + '</span></div></div>';
  }).join("");
  Array.prototype.forEach.call(paletteEl.querySelectorAll(".cc-swatch"), function (sw) {
    sw.addEventListener("click", function () {
      var c = hexToRgb(sw.getAttribute("data-hex"));
      if (c) { state.r = c.r; state.g = c.g; state.b = c.b; refresh(); showToast("Applied" + sw.getAttribute("data-hex")); }
    });
  });

  /* 初始渲染 */
  refresh();
})();
