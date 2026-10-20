/* ============================================================
   PDF 加水印 - 工具页逻辑
   依赖：../assets/vendor/pdf-lib.min.js（全局 PDFLib）
   支持文字 / 图片水印，页码范围筛选，本地生成新 PDF
   所有处理均在浏览器本地完成，不发起任何网络请求
   ============================================================ */
(function () {
  "use strict";

  if (typeof PDFLib === "undefined" || !PDFLib.PDFDocument) {
    showError("PDF 组件加载失败，请刷新页面重试。");
    return;
  }

  /* ---------- DOM ---------- */
  var drop = document.getElementById("wmDrop");
  var input = document.getElementById("wmInput");
  var fileInfo = document.getElementById("wmFileInfo");
  var nameEl = document.getElementById("wmName");
  var pagesEl = document.getElementById("wmPages");
  var resetBtn = document.getElementById("wmResetBtn");
  var configEl = document.getElementById("wmConfig");

  var typeRow = document.getElementById("wmType");
  var textGroup = document.getElementById("wmTextGroup");
  var imgGroup = document.getElementById("wmImgGroup");

  var wmText = document.getElementById("wmText");
  var wmFontSize = document.getElementById("wmFontSize");
  var wmColor = document.getElementById("wmColor");
  var wmOpacity = document.getElementById("wmOpacity");
  var wmOpacityVal = document.getElementById("wmOpacityVal");
  var wmAngle = document.getElementById("wmAngle");
  var densityRow = document.getElementById("wmDensity");
  var wmBold = document.getElementById("wmBold");

  var wmImgBtn = document.getElementById("wmImgBtn");
  var wmImgInput = document.getElementById("wmImgInput");
  var wmImgThumb = document.getElementById("wmImgThumb");
  var wmImgName = document.getElementById("wmImgName");
  var wmImgOpacity = document.getElementById("wmImgOpacity");
  var wmImgOpacityVal = document.getElementById("wmImgOpacityVal");
  var wmImgAngle = document.getElementById("wmImgAngle");
  var wmImgScale = document.getElementById("wmImgScale");
  var wmImgScaleVal = document.getElementById("wmImgScaleVal");

  var rangeRow = document.getElementById("wmRange");
  var customWrap = document.getElementById("wmCustomWrap");
  var customInput = document.getElementById("wmCustom");

  var applyBtn = document.getElementById("wmApplyBtn");
  var statusEl = document.getElementById("wmStatus");
  var errorBox = document.getElementById("wmError");

  var origBytes = null;
  var origName = "document";
  var pdfTotal = 0;
  var wmImgBytes = null;
  var wmImgIsPng = true;

  /* ---------- 提示 ---------- */
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  }
  function showError(msg) {
    errorBox.hidden = false;
    errorBox.textContent = msg;
  }
  function clearError() { errorBox.hidden = true; }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function hexToRgb(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.substr(0, 2), 16) / 255;
    var g = parseInt(h.substr(2, 2), 16) / 255;
    var b = parseInt(h.substr(4, 2), 16) / 255;
    return PDFLib.rgb(r, g, b);
  }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  /* ---------- 上传 PDF ---------- */
  drop.addEventListener("click", function () { input.click(); });
  drop.addEventListener("dragover", function (e) { e.preventDefault(); drop.classList.add("dragover"); });
  drop.addEventListener("dragleave", function () { drop.classList.remove("dragover"); });
  drop.addEventListener("drop", function (e) {
    e.preventDefault(); drop.classList.remove("dragover");
    if (e.dataTransfer.files.length) loadPdf(e.dataTransfer.files[0]);
  });
  input.addEventListener("change", function () {
    if (input.files.length) loadPdf(input.files[0]);
    input.value = "";
  });

  async function loadPdf(file) {
    clearError();
    statusEl.textContent = "";
    if (file.size > 50 * 1024 * 1024) {
      showError("文件超过 50MB，请压缩后再试");
      return;
    }
    try {
      var buf = await file.arrayBuffer();
      var head = new Uint8Array(buf, 0, Math.min(5, buf.byteLength));
      if (String.fromCharCode.apply(null, head).indexOf("%PDF") !== 0) {
        showError("不是有效的 PDF 文件");
        return;
      }
      var doc = await PDFLib.PDFDocument.load(buf);
      origBytes = buf;
      origName = file.name.replace(/\.pdf$/i, "") || "document";
      pdfTotal = doc.getPageCount();
      nameEl.textContent = file.name;
      pagesEl.textContent = String(pdfTotal);
      fileInfo.hidden = false;
      configEl.hidden = false;
      showToast("已载入，共 " + pdfTotal + " 页");
    } catch (e) {
      showError("PDF 解析失败：加密 PDF 或不支持的格式，请先解除密码保护");
    }
  }

  resetBtn.addEventListener("click", function () {
    origBytes = null;
    pdfTotal = 0;
    fileInfo.hidden = true;
    configEl.hidden = true;
    clearError();
    statusEl.textContent = "";
  });

  /* ---------- 类型切换 ---------- */
  function syncType() {
    var v = typeRow.querySelector("input:checked").value;
    textGroup.classList.toggle("wm-hidden", v !== "text");
    imgGroup.classList.toggle("wm-hidden", v !== "image");
  }
  typeRow.addEventListener("change", syncType);
  syncType();

  /* ---------- 范围切换 ---------- */
  rangeRow.addEventListener("change", function () {
    customWrap.hidden = rangeRow.querySelector("input:checked").value !== "custom";
  });

  /* ---------- 滑块显示 ---------- */
  wmOpacity.addEventListener("input", function () {
    wmOpacityVal.textContent = parseFloat(wmOpacity.value).toFixed(2);
  });
  wmImgOpacity.addEventListener("input", function () {
    wmImgOpacityVal.textContent = parseFloat(wmImgOpacity.value).toFixed(2);
  });
  wmImgScale.addEventListener("input", function () {
    wmImgScaleVal.textContent = parseFloat(wmImgScale.value).toFixed(2);
  });

  /* ---------- 水印图片选择 ---------- */
  wmImgBtn.addEventListener("click", function () { wmImgInput.click(); });
  wmImgInput.addEventListener("change", function () {
    var f = wmImgInput.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      wmImgBytes = reader.result;
      wmImgIsPng = /png/i.test(f.type);
      wmImgName.textContent = f.name;
      wmImgThumb.src = URL.createObjectURL(f);
      wmImgThumb.style.display = "block";
    };
    reader.readAsArrayBuffer(f);
    wmImgInput.value = "";
  });

  /* ---------- 页码范围解析 ---------- */
  function parseRange(str, total) {
    var parts = str.split(",");
    var idx = [];
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (!part) continue;
      if (part.indexOf("-") > -1) {
        var seg = part.split("-");
        var a = parseInt(seg[0], 10), b = parseInt(seg[1], 10);
        if (isNaN(a) || isNaN(b) || a < 1 || b < a) return null;
        for (var k = a; k <= b; k++) {
          if (k > total) return "overflow";
          idx.push(k - 1);
        }
      } else {
        var n = parseInt(part, 10);
        if (isNaN(n) || n < 1) return null;
        if (n > total) return "overflow";
        idx.push(n - 1);
      }
    }
    return idx;
  }

  function getPageIndices() {
    var type = rangeRow.querySelector("input:checked").value;
    var idx = [];
    if (type === "all") {
      for (var i = 0; i < pdfTotal; i++) idx.push(i);
    } else if (type === "odd") {
      for (var j = 0; j < pdfTotal; j++) if ((j + 1) % 2 === 1) idx.push(j);
    } else if (type === "even") {
      for (var m = 0; m < pdfTotal; m++) if ((m + 1) % 2 === 0) idx.push(m);
    } else {
      var r = parseRange(customInput.value.trim(), pdfTotal);
      if (r === null) { showError("页码范围格式不正确，请检查输入"); return null; }
      if (r === "overflow") { showError("页码超出范围（共 " + pdfTotal + " 页）"); return null; }
      idx = r;
    }
    return idx;
  }

  /* ---------- 绘制 ---------- */
  function drawRotatedText(page, text, cx, cy, font, size, color, opacity, deg, tw, th) {
    var rad = deg * Math.PI / 180;
    var cos = Math.cos(rad), sin = Math.sin(rad);
    var lx = -tw / 2, ly = -th / 2;
    var x = cx + lx * cos - ly * sin;
    var y = cy + lx * sin + ly * cos;
    page.drawText(text, {
      x: x, y: y, size: size, font: font, color: color,
      rotate: PDFLib.degrees(deg), opacity: opacity
    });
  }

  function watermarkText(page, W, H, font) {
    var text = wmText.value || " ";
    var size = clamp(parseInt(wmFontSize.value, 10) || 48, 6, 300);
    var color = hexToRgb(wmColor.value);
    var opacity = parseFloat(wmOpacity.value);
    var deg = parseFloat(wmAngle.value) || 0;
    var density = densityRow.querySelector("input:checked").value;
    var tw = font.widthOfTextAtSize(text, size);
    var th = size * 0.7;
    if (density === "center") {
      drawRotatedText(page, text, W / 2, H / 2, font, size, color, opacity, deg, tw, th);
    } else {
      var stepX = Math.max(tw + size, size * 3);
      var stepY = Math.max(th * 3, size * 2.5);
      for (var y = -size; y < H + size; y += stepY) {
        for (var x = -tw; x < W + tw; x += stepX) {
          drawRotatedText(page, text, x + tw / 2, y + th / 2, font, size, color, opacity, deg, tw, th);
        }
      }
    }
  }

  function drawRotatedImage(page, w, h, opacity, deg, cx, cy, img) {
    var rad = deg * Math.PI / 180;
    var cos = Math.cos(rad), sin = Math.sin(rad);
    var lx = -w / 2, ly = -h / 2;
    var x = cx + lx * cos - ly * sin;
    var y = cy + lx * sin + ly * cos;
    page.drawImage(img, {
      x: x, y: y, width: w, height: h,
      rotate: PDFLib.degrees(deg), opacity: opacity
    });
  }

  var embeddedImg = null;
  function watermarkImage(page, W, H) {
    if (!embeddedImg) return;
    var scale = parseFloat(wmImgScale.value);
    var opacity = parseFloat(wmImgOpacity.value);
    var deg = parseFloat(wmImgAngle.value) || 0;
    var drawW = W * scale;
    var drawH = drawW * (embeddedImg.height / embeddedImg.width);
    drawRotatedImage(page, drawW, drawH, opacity, deg, W / 2, H / 2, embeddedImg);
  }

  /* ---------- 应用 ---------- */
  applyBtn.addEventListener("click", async function () {
    clearError();
    statusEl.textContent = "";
    if (!origBytes) { showToast("请先选择 PDF 文件"); return; }
    var type = typeRow.querySelector("input:checked").value;
    if (type === "image" && !wmImgBytes) {
      showError("请先选择水印图片");
      return;
    }
    var indices = getPageIndices();
    if (!indices) return;
    if (!indices.length) { showError("没有符合范围的页面"); return; }

    var btn = this;
    btn.disabled = true;
    var oldText = btn.textContent;
    btn.textContent = "处理中…";
    try {
      var doc = await PDFLib.PDFDocument.load(origBytes);
      embeddedImg = null;
      var font = null;
      if (type === "text") {
        font = await doc.embedFont(
          wmBold.checked ? PDFLib.StandardFonts.HelveticaBold : PDFLib.StandardFonts.Helvetica
        );
      } else {
        embeddedImg = wmImgIsPng
          ? await doc.embedPng(wmImgBytes)
          : await doc.embedJpg(wmImgBytes);
      }

      for (var i = 0; i < indices.length; i++) {
        var page = doc.getPage(indices[i]);
        var size = page.getSize();
        if (type === "text") watermarkText(page, size.width, size.height, font);
        else watermarkImage(page, size.width, size.height);
        statusEl.textContent = "已处理 " + (i + 1) + " / " + indices.length;
      }

      var bytes = await doc.save();
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), origName + "-watermark.pdf");
      showToast("已生成带水印的 PDF");
    } catch (e) {
      showError("处理失败：" + (e && e.message ? e.message : e));
    } finally {
      btn.disabled = false;
      btn.textContent = oldText;
    }
  });

  /* ---------- 单选组高亮 ---------- */
  function wireRadio(row) {
    function sync() {
      Array.prototype.forEach.call(row.querySelectorAll("label"), function (l) {
        var inp = l.querySelector("input");
        l.classList.toggle("checked", !!(inp && inp.checked));
      });
    }
    row.addEventListener("change", sync);
    sync();
  }
  wireRadio(typeRow);
  wireRadio(densityRow);
  wireRadio(rangeRow);
})();
