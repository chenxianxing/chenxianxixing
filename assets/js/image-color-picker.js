/* ============================================================
   图片取色器 - 工具页逻辑
   上传图片 -> 放大镜取色 -> HEX/RGB/HSL 输出复制
   历史色卡、主色调提取、手动 HEX 反查，全部本地完成
   ============================================================ */
(function () {
  "use strict";

  var drop = document.getElementById("pickDrop");
  var input = document.getElementById("pickInput");
  var controls = document.getElementById("pickControls");
  var stage = document.getElementById("pickStage");
  var canvas = document.getElementById("pickCanvas");
  var ctx = canvas.getContext("2d");
  var mag = document.getElementById("pickMag");
  var magCanvas = document.getElementById("pickMagCanvas");
  var magCtx = magCanvas.getContext("2d");
  var liveSwatch = document.getElementById("pickLiveSwatch");
  var coordEl = document.getElementById("pickCoord");
  var liveHex = document.getElementById("pickLiveHex");
  var hexVal = document.getElementById("pickHexVal");
  var rgbVal = document.getElementById("pickRgbVal");
  var hslVal = document.getElementById("pickHslVal");
  var fmtHex = document.getElementById("pickFmtHex");
  var fmtRgb = document.getElementById("pickFmtRgb");
  var fmtHsl = document.getElementById("pickFmtHsl");
  var manual = document.getElementById("pickManual");
  var reverseBtn = document.getElementById("pickReverseBtn");
  var revSwatch = document.getElementById("pickRevSwatch");
  var reverseOut = document.getElementById("pickReverse");
  var historyEl = document.getElementById("pickHistory");
  var historyEmpty = document.getElementById("pickHistoryEmpty");
  var btnClearHistory = document.getElementById("pickClearHistory");
  var mainBtn = document.getElementById("pickMainBtn");
  var mainEl = document.getElementById("pickMain");
  var mainEmpty = document.getElementById("pickMainEmpty");
  var errBox = document.getElementById("pickError");

  var img = null;
  var W = 0, H = 0;
  var imgCanvas = document.createElement("canvas");
  var imgCtx = imgCanvas.getContext("2d");
  var current = null;
  var history = [];

  /* ---------- 工具函数 ---------- */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function showToast(msg) {
    var t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove("show"); }, 2000);
  }

  function showErr(m) { errBox.hidden = false; errBox.textContent = m; }
  function hideErr() { errBox.hidden = true; }

  function copyText(text, msg) {
    function done() { showToast(msg || "已复制"); }
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

  /* ---------- 颜色转换 ---------- */
  function rgbToHex(r, g, b) {
    function h(n) {
      var s = Number(n).toString(16);
      return s.length < 2 ? "0" + s : s;
    }
    return ("#" + h(r) + h(g) + h(b)).toUpperCase();
  }

  function hexToRgb(hex) {
    if (!hex) return null;
    hex = hex.trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{3}$/.test(hex)) {
      hex = hex.split("").map(function (c) { return c + c; }).join("");
    }
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
    return {
      r: parseInt(hex.substr(0, 2), 16),
      g: parseInt(hex.substr(2, 2), 16),
      b: parseInt(hex.substr(4, 2), 16)
    };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  /* ---------- 选择/拖拽 ---------- */
  drop.addEventListener("click", function () { input.click(); });
  input.addEventListener("change", function () {
    if (input.files && input.files[0]) loadFile(input.files[0]);
  });
  ["dragenter", "dragover"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("dragover"); });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("dragover"); });
  });
  drop.addEventListener("drop", function (e) {
    var dt = e.dataTransfer;
    if (dt && dt.files && dt.files[0]) loadFile(dt.files[0]);
  });

  function loadFile(file) {
    hideErr();
    if (!file.type || file.type.indexOf("image/") !== 0) {
      showErr("请选择图片文件。");
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var im = new Image();
      im.onload = function () {
        img = im;
        W = im.naturalWidth;
        H = im.naturalHeight;
        imgCanvas.width = W;
        imgCanvas.height = H;
        imgCtx.clearRect(0, 0, W, H);
        imgCtx.drawImage(im, 0, 0);

        var maxW = (stage.parentElement ? stage.parentElement.clientWidth : 0) || 640;
        var dispW = W <= maxW ? W : maxW;
        dispW = Math.max(40, dispW);
        var dispH = Math.round(dispW * H / W);
        canvas.width = dispW;
        canvas.height = dispH;
        ctx.clearRect(0, 0, dispW, dispH);
        ctx.drawImage(imgCanvas, 0, 0, W, H, 0, 0, dispW, dispH);

        controls.hidden = false;
      };
      im.onerror = function () { showErr("图片解码失败，请换一张试试。"); };
      im.src = reader.result;
    };
    reader.onerror = function () { showErr("文件读取失败，请重试。"); };
    reader.readAsDataURL(file);
  }

  /* ---------- 取色 ---------- */
  function getPixelAt(nx, ny) {
    nx = clamp(nx, 0, W - 1);
    ny = clamp(ny, 0, H - 1);
    var d = imgCtx.getImageData(nx, ny, 1, 1).data;
    return { r: d[0], g: d[1], b: d[2], a: d[3], x: nx, y: ny };
  }

  function setCurrent(p) {
    current = p;
    var hex = rgbToHex(p.r, p.g, p.b);
    coordEl.textContent = p.x + ", " + p.y;
    liveHex.textContent = hex;
    liveSwatch.style.background = hex;
    hexVal.textContent = hex;
    rgbVal.textContent = "rgb(" + p.r + ", " + p.g + ", " + p.b + ")";
    var hsl = rgbToHsl(p.r, p.g, p.b);
    hslVal.textContent = "hsl(" + hsl.h + ", " + hsl.s + "%, " + hsl.l + "%)";
  }

  function updateMagnifier(nx, ny) {
    var ms = 9;
    var sw = Math.min(ms, W), sh = Math.min(ms, H);
    var sx = clamp(nx - (sw >> 1), 0, W - sw);
    var sy = clamp(ny - (sh >> 1), 0, H - sh);
    magCtx.imageSmoothingEnabled = false;
    magCtx.clearRect(0, 0, 90, 90);
    magCtx.drawImage(imgCanvas, sx, sy, sw, sh, 0, 0, 90, 90);
  }

  function positionMag(relX, relY) {
    mag.style.display = "block";
    var w = 90, h = 90, gap = 14;
    var left = relX + gap;
    var top = relY + gap;
    var rect = stage.getBoundingClientRect();
    if (left + w > rect.width) left = relX - gap - w;
    if (top + h > rect.height) top = relY - gap - h;
    if (left < 0) left = 0;
    if (top < 0) top = 0;
    mag.style.left = left + "px";
    mag.style.top = top + "px";
  }

  function hideMag() { mag.style.display = "none"; }

  stage.addEventListener("mousemove", function (e) {
    if (!img) return;
    var rect = canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;
    if (mx < 0 || my < 0 || mx > rect.width || my > rect.height) { hideMag(); return; }
    var nx = Math.round(mx * (W / rect.width));
    var ny = Math.round(my * (H / rect.height));
    var p = getPixelAt(nx, ny);
    setCurrent(p);
    updateMagnifier(nx, ny);
    var srect = stage.getBoundingClientRect();
    positionMag(e.clientX - srect.left, e.clientY - srect.top);
  });

  stage.addEventListener("mouseleave", hideMag);

  stage.addEventListener("click", function (e) {
    if (!img) return;
    var rect = canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;
    if (mx < 0 || my < 0 || mx > rect.width || my > rect.height) return;
    var nx = Math.round(mx * (W / rect.width));
    var ny = Math.round(my * (H / rect.height));
    var p = getPixelAt(nx, ny);
    setCurrent(p);
    addHistory(p.r, p.g, p.b);
  });

  fmtHex.addEventListener("click", function () { if (current) copyText(rgbToHex(current.r, current.g, current.b), "已复制 HEX"); });
  fmtRgb.addEventListener("click", function () { if (current) copyText("rgb(" + current.r + ", " + current.g + ", " + current.b + ")", "已复制 RGB"); });
  fmtHsl.addEventListener("click", function () {
    if (!current) return;
    var hsl = rgbToHsl(current.r, current.g, current.b);
    copyText("hsl(" + hsl.h + ", " + hsl.s + "%, " + hsl.l + "%)", "已复制 HSL");
  });

  /* ---------- 历史色卡 ---------- */
  function addHistory(r, g, b) {
    var hex = rgbToHex(r, g, b);
    for (var i = 0; i < history.length; i++) {
      if (history[i].hex === hex) { history.splice(i, 1); break; }
    }
    history.unshift({ r: r, g: g, b: b, hex: hex });
    if (history.length > 12) history = history.slice(0, 12);
    renderHistory();
  }

  function renderHistory() {
    historyEl.innerHTML = "";
    if (history.length === 0) {
      historyEmpty.style.display = "block";
      return;
    }
    historyEmpty.style.display = "none";
    history.forEach(function (c) {
      var sw = document.createElement("div");
      sw.className = "swatch-item";
      sw.style.background = c.hex;
      sw.title = "点击复制 " + c.hex;
      var hx = document.createElement("span");
      hx.className = "hx";
      hx.textContent = c.hex;
      sw.appendChild(hx);
      sw.addEventListener("click", function () { copyText(c.hex, "已复制 " + c.hex); });
      historyEl.appendChild(sw);
    });
  }

  btnClearHistory.addEventListener("click", function () {
    history = [];
    renderHistory();
    showToast("已清空历史色卡");
  });

  /* ---------- 主色调提取 ---------- */
  mainBtn.addEventListener("click", function () {
    if (!img) return;
    var maxDim = 160;
    var scale = Math.min(1, maxDim / Math.max(W, H));
    var dw = Math.max(1, Math.round(W * scale));
    var dh = Math.max(1, Math.round(H * scale));
    var tc = document.createElement("canvas");
    tc.width = dw;
    tc.height = dh;
    var tctx = tc.getContext("2d");
    tctx.drawImage(imgCanvas, 0, 0, dw, dh);
    var data = tctx.getImageData(0, 0, dw, dh).data;
    var buckets = {};
    for (var i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 125) continue;
      var r = data[i], g = data[i + 1], b = data[i + 2];
      var key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      if (!buckets[key]) buckets[key] = { count: 0, r: 0, g: 0, b: 0 };
      var o = buckets[key];
      o.count++;
      o.r += r; o.g += g; o.b += b;
    }
    var arr = [];
    for (var k in buckets) {
      if (Object.prototype.hasOwnProperty.call(buckets, k)) {
        var ob = buckets[k];
        arr.push({ count: ob.count, r: Math.round(ob.r / ob.count), g: Math.round(ob.g / ob.count), b: Math.round(ob.b / ob.count) });
      }
    }
    arr.sort(function (a, b) { return b.count - a.count; });
    var top = arr.slice(0, 8);

    mainEl.innerHTML = "";
    if (top.length === 0) {
      mainEmpty.style.display = "block";
      return;
    }
    mainEmpty.style.display = "none";
    top.forEach(function (c) {
      var hex = rgbToHex(c.r, c.g, c.b);
      var sw = document.createElement("div");
      sw.className = "swatch-item";
      sw.style.background = hex;
      sw.title = "点击复制 " + hex;
      var hx = document.createElement("span");
      hx.className = "hx";
      hx.textContent = hex;
      sw.appendChild(hx);
      sw.addEventListener("click", function () { copyText(hex, "已复制 " + hex); });
      mainEl.appendChild(sw);
    });
    showToast("已提取 " + top.length + " 个主色调");
  });

  /* ---------- 手动 HEX 反查 ---------- */
  reverseBtn.addEventListener("click", function () {
    var rgb = hexToRgb(manual.value);
    if (!rgb) {
      reverseOut.style.display = "block";
      reverseOut.innerHTML = "请输入有效的 HEX 颜色，例如 <b>#3366cc</b> 或 <b>3366cc</b>。";
      revSwatch.style.background = "var(--primary-light)";
      return;
    }
    var hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    reverseOut.style.display = "block";
    reverseOut.innerHTML = "HEX <b>" + hex + "</b> · RGB <b>rgb(" + rgb.r + ", " + rgb.g + ", " + rgb.b +
      ")</b> · HSL <b>hsl(" + hsl.h + ", " + hsl.s + "%, " + hsl.l + "%)</b>";
    revSwatch.style.background = hex;
  });

  window.addEventListener("resize", function () {
    if (img) {
      var maxW = (stage.parentElement ? stage.parentElement.clientWidth : 0) || 640;
      var dispW = W <= maxW ? W : maxW;
      dispW = Math.max(40, dispW);
      var dispH = Math.round(dispW * H / W);
      if (dispW !== canvas.width) {
        canvas.width = dispW;
        canvas.height = dispH;
        ctx.drawImage(imgCanvas, 0, 0, W, H, 0, 0, dispW, dispH);
      }
    }
  });

  /* ---------- 初始化 ---------- */
  renderHistory();
})();
