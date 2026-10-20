/* ============================================================
   CSS圆角生成器 - 工具页逻辑
   四角独立圆角 + 椭圆圆角（水平/垂直双值）+ 预设
   全部在浏览器本地计算
   ============================================================ */
(function () {
  "use strict";

  var unitRow = document.getElementById("brUnitRow");
  var advancedChk = document.getElementById("brAdvanced");
  var advancedBox = document.getElementById("brAdvancedBox");
  var cornersBox = document.getElementById("brCorners");
  var cornersVBox = document.getElementById("brCornersV");
  var contentRow = document.getElementById("brContentRow");
  var preview = document.getElementById("brPreview");
  var codeBox = document.getElementById("brCode");
  var presetsBox = document.getElementById("brPresets");

  var MAX = 200;
  var corners = [
    { key: "tl", name: "Top Left", h: 16 },
    { key: "tr", name: "Top Right", h: 16 },
    { key: "br", name: "Bottom Right", h: 16 },
    { key: "bl", name: "Bottom Left", h: 16 }
  ];
  var vCorners = { tl: 16, tr: 16, br: 16, bl: 16 };

  function getUnit() {
    var c = unitRow.querySelector("input:checked");
    return c ? c.value : "px";
  }
  function isAdvanced() { return advancedChk.checked; }

  /* 构建水平角滑块 */
  function buildCorners() {
    cornersBox.innerHTML = "";
    corners.forEach(function (c) {
      var item = document.createElement("div");
      item.className = "slider-item";
      var label = document.createElement("label");
      label.textContent = c.name + "：" + c.h + getUnit();
      var slider = document.createElement("input");
      slider.type = "range";
      slider.min = 0; slider.max = MAX; slider.step = 1; slider.value = c.h;
      slider.addEventListener("input", function () {
        c.h = parseInt(slider.value, 10);
        label.textContent = c.name + "：" + c.h + getUnit();
        render();
      });
      item.appendChild(label);
      item.appendChild(slider);
      cornersBox.appendChild(item);
    });
  }

  /* 构建垂直半径滑块（高级模式） */
  function buildVCorners() {
    cornersVBox.innerHTML = "";
    corners.forEach(function (c) {
      var item = document.createElement("div");
      item.className = "slider-item";
      var label = document.createElement("label");
      label.textContent = c.name + "Vertical:" + vCorners[c.key] + getUnit();
      var slider = document.createElement("input");
      slider.type = "range";
      slider.min = 0; slider.max = MAX; slider.step = 1; slider.value = vCorners[c.key];
      slider.addEventListener("input", function () {
        vCorners[c.key] = parseInt(slider.value, 10);
        label.textContent = c.name + "Vertical:" + vCorners[c.key] + getUnit();
        render();
      });
      item.appendChild(label);
      item.appendChild(slider);
      cornersVBox.appendChild(item);
    });
  }

  /* 单位切换 */
  Array.prototype.forEach.call(unitRow.querySelectorAll("input"), function (r) {
    r.addEventListener("change", function () { syncUnitLabel(); buildCorners(); buildVCorners(); render(); });
  });
  Array.prototype.forEach.call(unitRow.querySelectorAll("label"), function (l) {
    l.addEventListener("click", function () {
      Array.prototype.forEach.call(unitRow.querySelectorAll("label"), function (x) { x.classList.remove("checked"); });
      l.classList.add("checked");
    });
  });
  function syncUnitLabel() {
    Array.prototype.forEach.call(unitRow.querySelectorAll("label"), function (l) {
      var inp = l.querySelector("input");
      if (inp && inp.checked) l.classList.add("checked"); else l.classList.remove("checked");
    });
  }

  advancedChk.addEventListener("change", function () {
    advancedBox.hidden = !isAdvanced();
    render();
  });

  /* 预览内容切换 */
  Array.prototype.forEach.call(contentRow.querySelectorAll("input"), function (r) {
    r.addEventListener("change", render);
  });
  Array.prototype.forEach.call(contentRow.querySelectorAll("label"), function (l) {
    l.addEventListener("click", function () {
      Array.prototype.forEach.call(contentRow.querySelectorAll("label"), function (x) { x.classList.remove("checked"); });
      l.classList.add("checked");
      render();
    });
  });
  function getContent() {
    var c = contentRow.querySelector("input:checked");
    return c ? c.value : "solid";
  }

  /* 构建简写 */
  function buildRadius() {
    var u = getUnit();
    var hv = corners.map(function (c) { return c.h + u; }).join(" ");
    if (isAdvanced()) {
      var vv = corners.map(function (c) { return vCorners[c.key] + u; }).join(" ");
      return hv + " / " + vv;
    }
    return hv;
  }

  function render() {
    var radius = buildRadius();
    var content = getContent();

    preview.style.borderRadius = radius;

    /* 预览内容样式 */
    preview.className = "";
    switch (content) {
      case "gradient":
        preview.style.background = "linear-gradient(135deg, #2563eb, #7c3aed)"; break;
      case "image":
        preview.style.background = "repeating-linear-gradient(45deg, #c7d2fe 0 16px, #e0e7ff 16px 32px)"; break;
      case "text":
        preview.style.background = "#fff"; break;
      default:
        preview.style.background = "linear-gradient(135deg, #2563eb, #7c3aed)";
    }
    if (content === "text") {
      preview.style.color = "#1f2937";
      preview.textContent = "Rounded text card demo; switch between different content to see how it looks.";
    } else {
      preview.style.color = "#fff";
      preview.textContent = content === "image" ? "Image Placeholder Area" : "Radius Preview";
    }

    codeBox.textContent = "border-radius: " + radius + ";";
  }

  /* 预设 */
  var presets = [
    { name: "Circle", unit: "%", adv: false, h: { tl: 50, tr: 50, br: 50, bl: 50 }, v: null },
    { name: "Pill", unit: "px", adv: false, h: { tl: 999, tr: 999, br: 999, bl: 999 }, v: null },
    { name: "Rounded Rectangle", unit: "px", adv: false, h: { tl: 24, tr: 24, br: 24, bl: 24 }, v: null },
    { name: "Leaf", unit: "%", adv: false, h: { tl: 0, tr: 100, br: 0, bl: 100 }, v: null },
    { name: "Asymmetric", unit: "px", adv: false, h: { tl: 10, tr: 80, br: 10, bl: 80 }, v: null },
    { name: "Droplet", unit: "%", adv: false, h: { tl: 50, tr: 50, br: 50, bl: 0 }, v: null }
  ];

  function applyPreset(p) {
    /* 单位 */
    var uInput = unitRow.querySelector('input[value="' + p.unit + '"]');
    if (uInput) {
      Array.prototype.forEach.call(unitRow.querySelectorAll("input"), function (r) { r.checked = (r === uInput); });
      syncUnitLabel();
    }
    /* 高级模式 */
    advancedChk.checked = !!p.adv;
    advancedBox.hidden = !p.adv;
    /* 角值 */
    corners.forEach(function (c) {
      c.h = p.h[c.key] != null ? p.h[c.key] : 16;
      if (p.v) vCorners[c.key] = p.v[c.key] != null ? p.v[c.key] : 16;
    });
    if (p.v) { vCorners = { tl: p.v.tl, tr: p.v.tr, br: p.v.br, bl: p.v.bl }; }
    buildCorners();
    if (p.adv) buildVCorners();
    render();
  }

  presets.forEach(function (p) {
    var btn = document.createElement("button");
    btn.className = "preset-chip";
    btn.type = "button";
    var sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.borderRadius = p.adv
      ? (p.h.tl + p.unit + " " + p.h.tr + p.unit + " " + p.h.br + p.unit + " " + p.h.bl + p.unit + " / " + p.v.tl + p.unit + " " + p.v.tr + p.unit + " " + p.v.br + p.unit + " " + p.v.bl + p.unit)
      : (p.h.tl + p.unit + " " + p.h.tr + p.unit + " " + p.h.br + p.unit + " " + p.h.bl + p.unit);
    btn.appendChild(sw);
    btn.appendChild(document.createTextNode(p.name));
    btn.addEventListener("click", function () { applyPreset(p); });
    presetsBox.appendChild(btn);
  });

  document.getElementById("btnCopyCss").addEventListener("click", function () {
    copyText(codeBox.textContent, "CSS code copied");
  });

  /* 初始化 */
  buildCorners();
  buildVCorners();
  render();

  /* 复制工具（带降级） */
  function copyText(text, msg) {
    function done() { showToast(msg); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else {
      fallbackCopy(text);
      done();
    }
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2000);
  }
})();
