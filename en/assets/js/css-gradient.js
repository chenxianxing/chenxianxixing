/* ============================================================
   CSS渐变生成器 - 工具页逻辑
   支持 线性 / 径向 / 圆锥 渐变，多色标管理，实时预览与复制
   所有计算在浏览器本地完成
   ============================================================ */
(function () {
  "use strict";

  var typeRow = document.getElementById("gTypeRow");
  var shapeRow = document.getElementById("gShapeRow");
  var posSel = document.getElementById("gPos");
  var angleInput = document.getElementById("gAngle");
  var angleVal = document.getElementById("gAngleVal");
  var angleConicInput = document.getElementById("gAngleConic");
  var angleConicVal = document.getElementById("gAngleConicVal");
  var linearOpts = document.getElementById("linearOpts");
  var radialOpts = document.getElementById("radialOpts");
  var conicOpts = document.getElementById("conicOpts");
  var stopsBox = document.getElementById("gStops");
  var preview = document.getElementById("gPreview");
  var codeBox = document.getElementById("gCode");
  var presetsBox = document.getElementById("gPresets");

  /* 色标数据：[{color:'#rrggbb', pos:0}] */
  var stops = [
    { color: "#667eea", pos: 0 },
    { color: "#764ba2", pos: 100 }
  ];

  function getType() {
    var c = typeRow.querySelector("input:checked");
    return c ? c.value : "linear";
  }
  function getShape() {
    var c = shapeRow.querySelector("input:checked");
    return c ? c.value : "circle";
  }

  /* 切换类型面板 */
  Array.prototype.forEach.call(typeRow.querySelectorAll("input"), function (r) {
    r.addEventListener("change", function () {
      var t = getType();
      linearOpts.hidden = t !== "linear";
      radialOpts.hidden = t !== "radial";
      conicOpts.hidden = t !== "conic";
      syncTypeLabel();
      render();
    });
  });
  Array.prototype.forEach.call(typeRow.querySelectorAll("label"), function (l) {
    l.addEventListener("click", function () {
      Array.prototype.forEach.call(typeRow.querySelectorAll("label"), function (x) { x.classList.remove("checked"); });
      l.classList.add("checked");
    });
  });
  Array.prototype.forEach.call(shapeRow.querySelectorAll("label"), function (l) {
    l.addEventListener("click", function () {
      Array.prototype.forEach.call(shapeRow.querySelectorAll("label"), function (x) { x.classList.remove("checked"); });
      l.classList.add("checked");
      render();
    });
  });
  Array.prototype.forEach.call(shapeRow.querySelectorAll("input"), function (r) {
    r.addEventListener("change", render);
  });

  posSel.addEventListener("change", render);

  angleInput.addEventListener("input", function () {
    angleVal.textContent = angleInput.value;
    render();
  });
  angleConicInput.addEventListener("input", function () {
    angleConicVal.textContent = angleConicInput.value;
    render();
  });

  function syncTypeLabel() {
    Array.prototype.forEach.call(typeRow.querySelectorAll("label"), function (l) {
      var inp = l.querySelector("input");
      if (inp && inp.checked) l.classList.add("checked"); else l.classList.remove("checked");
    });
  }

  /* 渲染色标列表 */
  function renderStops() {
    stopsBox.innerHTML = "";
    stops.forEach(function (s, i) {
      var row = document.createElement("div");
      row.className = "stop-item";

      var color = document.createElement("input");
      color.type = "color";
      color.value = s.color;
      color.addEventListener("input", function () {
        s.color = color.value;
        render();
      });

      var hex = document.createElement("input");
      hex.type = "text";
      hex.className = "form-input stop-color-hex";
      hex.value = s.color.toUpperCase();
      hex.maxLength = 7;
      hex.addEventListener("input", function () {
        var v = hex.value.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(v)) { s.color = v; color.value = v; render(); }
      });

      var pos = document.createElement("input");
      pos.type = "range";
      pos.className = "stop-pos";
      pos.min = 0; pos.max = 100; pos.step = 1; pos.value = s.pos;
      var posVal = document.createElement("span");
      posVal.className = "stop-pos-val";
      posVal.textContent = s.pos + "%";
      pos.addEventListener("input", function () {
        s.pos = parseInt(pos.value, 10);
        posVal.textContent = s.pos + "%";
        render();
      });

      var del = document.createElement("button");
      del.className = "stop-del";
      del.type = "button";
      del.textContent = "×";
      del.title = "Delete this color stop";
      del.addEventListener("click", function () {
        if (stops.length <= 2) { showToast("Keep at least two color stops"); return; }
        stops.splice(i, 1);
        renderStops();
        render();
      });

      row.appendChild(color);
      row.appendChild(hex);
      row.appendChild(pos);
      row.appendChild(posVal);
      row.appendChild(del);
      stopsBox.appendChild(row);
    });
  }

  document.getElementById("btnAddStop").addEventListener("click", function () {
    var last = stops[stops.length - 1];
    stops.push({ color: "#ffffff", pos: last ? Math.min(100, last.pos + 10) : 50 });
    renderStops();
    render();
  });

  /* 构建渐变字符串 */
  function buildGradient() {
    var t = getType();
    var stopStr = stops
      .slice()
      .sort(function (a, b) { return a.pos - b.pos; })
      .map(function (s) { return s.color + " " + s.pos + "%"; })
      .join(", ");

    if (t === "linear") {
      return "linear-gradient(" + angleInput.value + "deg, " + stopStr + ")";
    }
    if (t === "radial") {
      return "radial-gradient(" + getShape() + " at " + posSel.value + ", " + stopStr + ")";
    }
    return "conic-gradient(from " + angleConicInput.value + "deg, " + stopStr + ")";
  }

  function render() {
    var css = buildGradient();
    preview.style.background = css;
    codeBox.textContent = "background: " + css + ";";
  }

  /* 预设模板 */
  var presets = [
    { name: "Sunset Purple", type: "linear", angle: 135, shape: "circle", pos: "center", stops: [["#667eea", 0], ["#764ba2", 100]] },
    { name: "Ocean Blue", type: "linear", angle: 120, shape: "circle", pos: "center", stops: [["#2193b0", 0], ["#6dd5ed", 100]] },
    { name: "Mint Green", type: "linear", angle: 135, shape: "circle", pos: "center", stops: [["#00b09b", 0], ["#96c93d", 100]] },
    { name: "Warm Orange", type: "linear", angle: 90, shape: "circle", pos: "center", stops: [["#f6d365", 0], ["#fda085", 100]] },
    { name: "Cherry Blossom Pink", type: "linear", angle: 135, shape: "circle", pos: "center", stops: [["#ffafbd", 0], ["#ffc3a0", 100]] },
    { name: "Aurora", type: "linear", angle: 135, shape: "circle", pos: "center", stops: [["#00c9ff", 0], ["#92fe9d", 100]] }
  ];

  function applyPreset(p) {
    stops = p.stops.map(function (s) { return { color: s[0], pos: s[1] }; });
    // 类型
    var typeInput = typeRow.querySelector('input[value="' + p.type + '"]');
    if (typeInput) {
      Array.prototype.forEach.call(typeRow.querySelectorAll("input"), function (r) { r.checked = (r === typeInput); });
      syncTypeLabel();
    }
    if (p.type === "linear") {
      angleInput.value = p.angle; angleVal.textContent = p.angle;
      linearOpts.hidden = false; radialOpts.hidden = true; conicOpts.hidden = true;
    } else if (p.type === "radial") {
      var sh = shapeRow.querySelector('input[value="' + p.shape + '"]');
      if (sh) { Array.prototype.forEach.call(shapeRow.querySelectorAll("input"), function (r) { r.checked = (r === sh); }); }
      posSel.value = p.pos;
      linearOpts.hidden = true; radialOpts.hidden = false; conicOpts.hidden = true;
    }
    renderStops();
    render();
  }

  presets.forEach(function (p) {
    var btn = document.createElement("button");
    btn.className = "preset-chip";
    btn.type = "button";
    var sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = "linear-gradient(135deg, " + p.stops[0][0] + ", " + p.stops[p.stops.length - 1][0] + ")";
    btn.appendChild(sw);
    btn.appendChild(document.createTextNode(p.name));
    btn.addEventListener("click", function () { applyPreset(p); });
    presetsBox.appendChild(btn);
  });

  document.getElementById("btnCopyCss").addEventListener("click", function () {
    copyText(codeBox.textContent, "CSS code copied");
  });

  /* 初始化 */
  renderStops();
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
