/* ============================================================
   单位换算 - 工具页逻辑
   长度/质量/面积/体积/温度/速度/时间/压力/功率/数据存储
   ============================================================ */
(function () {
  "use strict";

  var CATS = {
    length: {
      name: "Length", units: [
        { k: "mm", label: "Millimeter (mm)", f: 0.001 },
        { k: "cm", label: "Centimeter (cm)", f: 0.01 },
        { k: "m", label: "Meter (m)", f: 1 },
        { k: "km", label: "Kilometer (km)", f: 1000 },
        { k: "in", label: "Inch (in)", f: 0.0254 },
        { k: "ft", label: "Foot (ft)", f: 0.3048 },
        { k: "yd", label: "Yard (yd)", f: 0.9144 },
        { k: "mi", label: "Mile (mi)", f: 1609.344 }
      ]
    },
    mass: {
      name: "Mass", units: [
        { k: "mg", label: "Milligram (mg)", f: 0.001 },
        { k: "g", label: "Gram (g)", f: 1 },
        { k: "kg", label: "Kilogram (kg)", f: 1000 },
        { k: "t", label: "Ton (t)", f: 1000000 },
        { k: "oz", label: "Ounce (oz)", f: 28.349523125 },
        { k: "lb", label: "Pound (lb)", f: 453.59237 }
      ]
    },
    area: {
      name: "Area", units: [
        { k: "mm2", label: "Square Millimeter (mm²)", f: 1e-6 },
        { k: "cm2", label: "Square Centimeter (cm²)", f: 1e-4 },
        { k: "m2", label: "Square Meter (m²)", f: 1 },
        { k: "km2", label: "Square Kilometer (km²)", f: 1e6 },
        { k: "ha", label: "Hectare (ha)", f: 10000 },
        { k: "mu", label: "Mu", f: 666.6666666667 },
        { k: "ft2", label: "Square Foot (ft²)", f: 0.09290304 },
        { k: "ac", label: "Acre (ac)", f: 4046.8564224 }
      ]
    },
    volume: {
      name: "Volume", units: [
        { k: "ml", label: "Milliliter (mL)", f: 0.001 },
        { k: "l", label: "Liter (L)", f: 1 },
        { k: "m3", label: "Cubic Meter (m³)", f: 1000 },
        { k: "gal_us", label: "Gallon (US)", f: 3.785411784 },
        { k: "gal_uk", label: "Gallon (UK)", f: 4.54609 },
        { k: "cup", label: "Cup (US)", f: 0.2365882365 },
        { k: "floz", label: "Fluid Ounce (US)", f: 0.0295735295625 }
      ]
    },
    temperature: {
      name: "Temperature", temp: true, units: [
        { k: "C", label: "Celsius (°C)" },
        { k: "F", label: "Fahrenheit (°F)" },
        { k: "K", label: "Kelvin (K)" },
        { k: "R", label: "Rankine (°R)" }
      ]
    },
    speed: {
      name: "Speed", units: [
        { k: "mps", label: "Meter per Second (m/s)", f: 1 },
        { k: "kph", label: "Kilometer per Hour (km/h)", f: 1 / 3.6 },
        { k: "mph", label: "Mile per Hour (mph)", f: 0.44704 },
        { k: "fps", label: "Foot per Second (ft/s)", f: 0.3048 },
        { k: "knot", label: "Knot (kn)", f: 0.514444444 }
      ]
    },
    time: {
      name: "Time", units: [
        { k: "ms", label: "Milliseconds (ms)", f: 0.001 },
        { k: "s", label: "Seconds (s)", f: 1 },
        { k: "min", label: "Minute (min)", f: 60 },
        { k: "h", label: "Hour (h)", f: 3600 },
        { k: "day", label: "Day (d)", f: 86400 },
        { k: "week", label: "Week", f: 604800 }
      ]
    },
    pressure: {
      name: "Pressure", units: [
        { k: "pa", label: "Pascal (Pa)", f: 1 },
        { k: "kpa", label: "Kilopascal (kPa)", f: 1000 },
        { k: "mpa", label: "Megapascal (MPa)", f: 1e6 },
        { k: "bar", label: "Bar (bar)", f: 1e5 },
        { k: "atm", label: "Standard Atmosphere (atm)", f: 101325 },
        { k: "psi", label: "Pound per Square Inch (psi)", f: 6894.757293168 }
      ]
    },
    power: {
      name: "Power", units: [
        { k: "w", label: "Watt (W)", f: 1 },
        { k: "kw", label: "Kilowatt (kW)", f: 1000 },
        { k: "mw", label: "Megawatt (MW)", f: 1e6 },
        { k: "hp", label: "Horsepower (Imperial hp)", f: 745.6998715823 },
        { k: "ps", label: "Metric Horsepower (PS)", f: 735.49875 }
      ]
    },
    data: {
      name: "Data Storage", units: [
        { k: "bit", label: "Bit (bit)", f: 0.125 },
        { k: "B", label: "Byte (B)", f: 1 },
        { k: "KB", label: "Kilobyte (KB = 1000 B)", f: 1000 },
        { k: "MB", label: "Megabyte (MB)", f: 1e6 },
        { k: "GB", label: "Gigabyte (GB)", f: 1e9 },
        { k: "TB", label: "Terabyte (TB)", f: 1e12 }
      ]
    }
  };

  var ORDER = ["length", "mass", "area", "volume", "temperature", "speed", "time", "pressure", "power", "data"];
  var current = "length";

  var tabsEl = document.getElementById("catTabs");
  var valEl = document.getElementById("ucValue");
  var fromEl = document.getElementById("ucFrom");
  var toEl = document.getElementById("ucTo");
  var resultEl = document.getElementById("ucResult");
  var tableEl = document.getElementById("ucTable");
  var hintEl = document.getElementById("ucHint");

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
    ta.value = text;
    ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }

  /* ---------- 数字格式 ---------- */
  function fmt(n) {
    if (!isFinite(n)) return "—";
    if (n === 0) return "0";
    var abs = Math.abs(n);
    if (abs >= 1e15 || abs < 1e-9) {
      return n.toExponential(6).replace(/\.?0+e/, "e");
    }
    var s = parseFloat(n.toPrecision(10)).toString();
    return s;
  }

  /* ---------- 温度换算 ---------- */
  function toC(v, k) {
    if (k === "C") return v;
    if (k === "F") return (v - 32) * 5 / 9;
    if (k === "K") return v - 273.15;
    if (k === "R") return (v - 491.67) * 5 / 9;
    return v;
  }
  function fromC(c, k) {
    if (k === "C") return c;
    if (k === "F") return c * 9 / 5 + 32;
    if (k === "K") return c + 273.15;
    if (k === "R") return c * 9 / 5 + 491.67;
    return c;
  }

  /* ---------- 构建 Tab 与下拉 ---------- */
  function buildTabs() {
    tabsEl.innerHTML = ORDER.map(function (key) {
      return '<button type="button" data-cat="' + key + '" class="' + (key === current ? "active" : "") + '">' + CATS[key].name + "</button>";
    }).join("");
    Array.prototype.forEach.call(tabsEl.querySelectorAll("button"), function (btn) {
      btn.addEventListener("click", function () {
        current = btn.getAttribute("data-cat");
        Array.prototype.forEach.call(tabsEl.querySelectorAll("button"), function (b) {
          b.classList.toggle("active", b === btn);
        });
        buildSelects();
        convert();
      });
    });
  }

  function buildSelects() {
    var cat = CATS[current];
    fromEl.innerHTML = cat.units.map(function (u) {
      return '<option value="' + u.k + '">' + u.label + "</option>";
    }).join("");
    toEl.innerHTML = cat.units.map(function (u) {
      return '<option value="' + u.k + '">' + u.label + "</option>";
    }).join("");
    fromEl.value = cat.units[0].k;
    toEl.value = cat.units[Math.min(1, cat.units.length - 1)].k;
  }

  function getUnit(k) {
    var us = CATS[current].units;
    for (var i = 0; i < us.length; i++) if (us[i].k === k) return us[i];
    return null;
  }

  /* ---------- 换算主逻辑 ---------- */
  function convert() {
    var raw = (valEl.value || "").trim();
    if (raw === "") {
      resultEl.innerHTML = '<div class="empty-tip">Enter a value to see conversion results</div>';
      tableEl.innerHTML = "";
      hintEl.textContent = "";
      return;
    }
    var v = Number(raw);
    if (!isFinite(v)) {
      resultEl.innerHTML = '<div class="warn-note">Please enter a valid number (decimals are supported; text and expressions are not).</div>';
      tableEl.innerHTML = "";
      hintEl.textContent = "";
      return;
    }
    var cat = CATS[current];
    var fromK = fromEl.value, toK = toEl.value;
    var fromU = getUnit(fromK), toU = getUnit(toK);
    var result;

    if (cat.temp) {
      var c = toC(v, fromK);
      result = fromC(c, toK);
    } else {
      var base = v * fromU.f;
      result = base / toU.f;
    }

    resultEl.innerHTML =
      '<div class="uc-big"><span class="v">' + fmt(v) + "</span>" +
      '<span class="u">' + escapeHtml(fromU.label) + "</span>" +
      '<span class="u">=</span>' +
      '<span class="v">' + fmt(result) + "</span>" +
      '<span class="u">' + escapeHtml(toU.label) + "</span>" +
      '<span class="spacer" style="flex:1;"></span>' +
      '<button class="btn" id="btnCopyBig" type="button">Copy</button></div>';
    document.getElementById("btnCopyBig").addEventListener("click", function () {
      copyText(fmt(result) + " " + toU.label, "Conversion result copied");
    });

    hintEl.textContent = "1 " + fromU.label + " = " + fmt(cat.temp ? fromC(toC(1, fromK), toK) : (fromU.f / toU.f)) + " " + toU.label;

    /* 全单位列表 */
    var rows = cat.units.map(function (u) {
      var val = cat.temp ? fromC(toC(v, fromK), u.k) : (v * fromU.f) / u.f;
      return "<tr><td>" + escapeHtml(u.label) + "</td><td class='num'>" + fmt(val) + "</td></tr>";
    });
    tableEl.innerHTML = rows.join("");
  }

  valEl.addEventListener("input", convert);
  fromEl.addEventListener("change", convert);
  toEl.addEventListener("change", convert);
  document.getElementById("btnConvert").addEventListener("click", convert);

  document.getElementById("btnSwap").addEventListener("click", function () {
    var t = fromEl.value;
    fromEl.value = toEl.value;
    toEl.value = t;
    convert();
  });

  document.getElementById("btnCopy").addEventListener("click", function () {
    var big = document.querySelector("#ucResult .uc-big");
    if (!big) { showToast("Nothing to copy yet"); return; }
    var vs = big.querySelectorAll(".v");
    var us = big.querySelectorAll(".u");
    if (vs.length < 2) { showToast("Nothing to copy yet"); return; }
    copyText(vs[1].textContent + " " + us[2].textContent, "Conversion result copied");
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  buildTabs();
  buildSelects();
  convert();
})();
