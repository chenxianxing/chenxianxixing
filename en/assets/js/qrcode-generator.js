/* ============================================================
   二维码生成器 - 工具页逻辑
   依赖：../assets/vendor/qrcode.min.js（全局 QRCode）
   所有处理均在浏览器本地完成，不发起任何网络请求
   ============================================================ */
(function () {
  "use strict";

  var content = document.getElementById("qrContent");
  var sizeInput = document.getElementById("qrSize");
  var sizeVal = document.getElementById("qrSizeVal");
  var marginInput = document.getElementById("qrMargin");
  var marginVal = document.getElementById("qrMarginVal");
  var fg = document.getElementById("qrFg");
  var fgHex = document.getElementById("qrFgHex");
  var bg = document.getElementById("qrBg");
  var bgHex = document.getElementById("qrBgHex");
  var levelRow = document.getElementById("qrLevelRow");
  var box = document.getElementById("qrBox");
  var errorBox = document.getElementById("qrError");

  var downloadCanvas = null;
  var renderTimer = null;

  if (typeof QRCode === "undefined") {
    errorBox.hidden = false;
    errorBox.textContent = "The QR code component failed to load. Please refresh the page and try again.";
    return;
  }

  function getLevel() {
    var c = levelRow.querySelector("input:checked");
    return c ? c.value : "M";
  }

  function levelConst(lv) {
    switch (lv) {
      case "L": return QRCode.CorrectLevel.L;
      case "M": return QRCode.CorrectLevel.M;
      case "Q": return QRCode.CorrectLevel.Q;
      case "H": return QRCode.CorrectLevel.H;
      default: return QRCode.CorrectLevel.M;
    }
  }

  /* 颜色双向同步 */
  fg.addEventListener("input", function () {
    fgHex.value = fg.value.toUpperCase();
    schedule();
  });
  fgHex.addEventListener("input", function () {
    var v = fgHex.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) { fg.value = v; schedule(); }
  });
  bg.addEventListener("input", function () {
    bgHex.value = bg.value.toUpperCase();
    schedule();
  });
  bgHex.addEventListener("input", function () {
    var v = bgHex.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) { bg.value = v; schedule(); }
  });

  /* 滑块 */
  sizeInput.addEventListener("input", function () {
    sizeVal.textContent = sizeInput.value;
    schedule();
  });
  marginInput.addEventListener("input", function () {
    marginVal.textContent = marginInput.value;
    schedule();
  });
  content.addEventListener("input", schedule);

  /* 容错级别 radio 联动 */
  Array.prototype.forEach.call(levelRow.querySelectorAll("input"), function (r) {
    r.addEventListener("change", schedule);
  });
  Array.prototype.forEach.call(levelRow.querySelectorAll("label"), function (l) {
    l.addEventListener("click", function () {
      Array.prototype.forEach.call(levelRow.querySelectorAll("label"), function (x) {
        x.classList.remove("checked");
      });
      l.classList.add("checked");
    });
  });

  function schedule() {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 200);
  }

  function render() {
    errorBox.hidden = true;
    var text = content.value;
    if (!text) {
      box.innerHTML = "<div class='empty-tip'>The QR code will appear here once you enter content</div>";
      downloadCanvas = null;
      return;
    }
    var size = parseInt(sizeInput.value, 10);
    var margin = parseInt(marginInput.value, 10);
    var cDark = fg.value;
    var cLight = bg.value;
    var lv = levelConst(getLevel());

    var tmp = document.createElement("div");
    try {
      new QRCode(tmp, {
        text: text,
        width: size,
        height: size,
        colorDark: cDark,
        colorLight: cLight,
        correctLevel: lv
      });
    } catch (e) {
      errorBox.hidden = false;
      errorBox.textContent = "Generation failed: " + e.message;
      return;
    }

    var qc = tmp.querySelector("canvas");
    if (qc) {
      buildFromCanvas(qc, size, margin, cLight);
      return;
    }
    /* 降级：使用生成的 img */
    var im = tmp.querySelector("img");
    if (im && im.src) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext("2d").drawImage(img, 0, 0);
        buildFromCanvas(c, size, margin, cLight);
      };
      img.src = im.src;
      return;
    }
    errorBox.hidden = false;
    errorBox.textContent = "Unable to generate the QR code. Please check the input content or browser support.";
  }

  function buildFromCanvas(srcCanvas, size, margin, cLight) {
    var total = size + margin * 2;
    var out = document.createElement("canvas");
    out.width = total;
    out.height = total;
    var ctx = out.getContext("2d");
    ctx.fillStyle = cLight;
    ctx.fillRect(0, 0, total, total);
    ctx.drawImage(srcCanvas, margin, margin, size, size);

    box.innerHTML = "";
    out.style.maxWidth = "100%";
    out.style.height = "auto";
    out.style.borderRadius = "8px";
    box.appendChild(out);
    downloadCanvas = out;
  }

  document.getElementById("btnGen").addEventListener("click", render);

  document.getElementById("btnDownload").addEventListener("click", function () {
    if (!downloadCanvas) { showToast("Please generate a QR code first"); return; }
    var a = document.createElement("a");
    a.href = downloadCanvas.toDataURL("image/png");
    a.download = "qrcode.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("Started downloading PNG");
  });

  document.getElementById("btnCopy").addEventListener("click", function () {
    if (!content.value) { showToast("Content is empty"); return; }
    copyText(content.value, "QR code content copied");
  });

  document.getElementById("btnClear").addEventListener("click", function () {
    content.value = "";
    box.innerHTML = "<div class='empty-tip'>The QR code will appear here once you enter content</div>";
    downloadCanvas = null;
    content.focus();
  });

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

  /* 轻提示 */
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
    }, 2000);
  }
})();
