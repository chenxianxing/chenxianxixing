/* ============================================================
   图片压缩 - 工具页逻辑
   通过 Canvas 重绘 + canvas.toBlob 压缩 JPEG/WebP/PNG
   全部在浏览器本地完成
   ============================================================ */
(function () {
  "use strict";

  var MAX_SIZE = 20 * 1024 * 1024;

  var dropZone = document.getElementById("dropZone");
  var cmpInput = document.getElementById("cmpInput");
  var paramsBox = document.getElementById("paramsBox");
  var qualityInput = document.getElementById("cmpQuality");
  var qualityVal = document.getElementById("cmpQualityVal");
  var maxWidthInput = document.getElementById("cmpMaxWidth");
  var fmtRow = document.getElementById("cmpFmtRow");
  var compareBox = document.getElementById("compareBox");
  var origImg = document.getElementById("origImg");
  var resImg = document.getElementById("resImg");
  var cmpOrigSize = document.getElementById("cmpOrigSize");
  var cmpResSize = document.getElementById("cmpResSize");
  var cmpRatio = document.getElementById("cmpRatio");
  var errorBox = document.getElementById("cmpError");
  var btnDownloadCmp = document.getElementById("btnDownloadCmp");

  var sourceFile = null;       // 原始 File
  var sourceDataURL = null;    // 原始 DataURL
  var resultBlob = null;       // 压缩后 Blob
  var resultURL = null;        // 压缩后 object URL

  /* 选择/拖拽 */
  dropZone.addEventListener("click", function () { cmpInput.click(); });
  cmpInput.addEventListener("change", function () {
    if (cmpInput.files && cmpInput.files[0]) handleFile(cmpInput.files[0]);
  });
  ["dragenter", "dragover"].forEach(function (ev) {
    dropZone.addEventListener(ev, function (e) { e.preventDefault(); dropZone.classList.add("dragover"); });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    dropZone.addEventListener(ev, function (e) { e.preventDefault(); dropZone.classList.remove("dragover"); });
  });
  dropZone.addEventListener("drop", function (e) {
    var dt = e.dataTransfer;
    if (dt && dt.files && dt.files[0]) handleFile(dt.files[0]);
  });

  function handleFile(file) {
    errorBox.hidden = true;
    btnDownloadCmp.disabled = true;
    resultBlob = null;
    if (resultURL) { URL.revokeObjectURL(resultURL); resultURL = null; }

    if (!file.type || file.type.indexOf("image/") !== 0) {
      errorBox.hidden = false;
      errorBox.textContent = "请选择图片文件（当前文件类型：" + (file.type || "未知") + "）。";
      return;
    }
    if (file.size > MAX_SIZE) {
      errorBox.hidden = false;
      errorBox.textContent = "文件过大，请选择不超过 20MB 的图片（当前约 " + fmtSize(file.size) + "）。";
      return;
    }
    sourceFile = file;
    var reader = new FileReader();
    reader.onload = function () {
      sourceDataURL = reader.result;
      origImg.src = sourceDataURL;
      cmpOrigSize.textContent = fmtSize(file.size);
      paramsBox.hidden = false;
      compareBox.hidden = false;
      resImg.removeAttribute("src");
      cmpResSize.textContent = "-";
      cmpRatio.textContent = "-";
      cmpRatio.classList.remove("warn");
    };
    reader.onerror = function () {
      errorBox.hidden = false;
      errorBox.textContent = "文件读取失败，请重试。";
    };
    reader.readAsDataURL(file);
  }

  qualityInput.addEventListener("input", function () {
    qualityVal.textContent = parseFloat(qualityInput.value).toFixed(2);
  });

  Array.prototype.forEach.call(fmtRow.querySelectorAll("input"), function (r) {
    r.addEventListener("change", function () {
      if (sourceFile) compress();
    });
  });
  Array.prototype.forEach.call(fmtRow.querySelectorAll("label"), function (l) {
    l.addEventListener("click", function () {
      Array.prototype.forEach.call(fmtRow.querySelectorAll("label"), function (x) { x.classList.remove("checked"); });
      l.classList.add("checked");
    });
  });

  qualityInput.addEventListener("change", function () { if (sourceFile) compress(); });
  maxWidthInput.addEventListener("change", function () { if (sourceFile) compress(); });

  document.getElementById("btnCompress").addEventListener("click", function () {
    if (!sourceFile) { showToast("请先选择图片"); return; }
    compress();
  });

  function getFmt() {
    var c = fmtRow.querySelector("input:checked");
    return c ? c.value : "image/jpeg";
  }

  function compress() {
    var fmt = getFmt();
    var quality = parseFloat(qualityInput.value);
    var maxW = parseInt(maxWidthInput.value, 10) || 0;

    var img = new Image();
    img.onload = function () {
      var w = img.naturalWidth;
      var h = img.naturalHeight;
      var scale = (maxW > 0 && w > maxW) ? maxW / w : 1;
      var tw = Math.max(1, Math.round(w * scale));
      var th = Math.max(1, Math.round(h * scale));

      var canvas = document.createElement("canvas");
      canvas.width = tw;
      canvas.height = th;
      var ctx = canvas.getContext("2d");
      /* PNG 透明背景处理：JPEG 无透明，先填白 */
      if (fmt === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, tw, th);
      }
      ctx.drawImage(img, 0, 0, tw, th);

      var encQuality = (fmt === "image/png") ? undefined : quality;
      if (!canvas.toBlob) {
        /* 极旧环境降级 */
        var data = canvas.toDataURL(fmt, encQuality);
        fetch(data).then(function (r) { return r.blob(); }).then(function (b) {
          finishCompress(b);
        }).catch(function () {
          errorBox.hidden = false;
          errorBox.textContent = "当前浏览器不支持压缩，请更换浏览器。";
        });
        return;
      }
      canvas.toBlob(function (blob) {
        if (!blob) {
          errorBox.hidden = false;
          errorBox.textContent = "压缩失败，该格式可能不被浏览器支持。";
          return;
        }
        finishCompress(blob);
      }, fmt, encQuality);
    };
    img.onerror = function () {
      errorBox.hidden = false;
      errorBox.textContent = "图片解码失败，请尝试其他图片。";
    };
    img.src = sourceDataURL;
  }

  function finishCompress(blob) {
    resultBlob = blob;
    if (resultURL) URL.revokeObjectURL(resultURL);
    resultURL = URL.createObjectURL(blob);
    resImg.src = resultURL;
    cmpResSize.textContent = fmtSize(blob.size);

    var orig = sourceFile.size;
    var ratio = (1 - blob.size / orig) * 100;
    if (ratio > 0) {
      cmpRatio.textContent = "体积减少 " + ratio.toFixed(1) + "%";
      cmpRatio.classList.remove("warn");
    } else {
      cmpRatio.textContent = "体积反而增加 " + Math.abs(ratio).toFixed(1) + "%（建议降低质量或缩小宽度）";
      cmpRatio.classList.add("warn");
    }
    btnDownloadCmp.disabled = false;
    showToast("压缩完成");
  }

  btnDownloadCmp.addEventListener("click", function () {
    if (!resultBlob) { showToast("请先压缩"); return; }
    var fmt = getFmt();
    var ext = fmt.split("/")[1] || "png";
    if (ext === "jpeg") ext = "jpg";
    var a = document.createElement("a");
    a.href = resultURL;
    a.download = "compressed." + ext;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("已开始下载压缩结果");
  });

  /* ---------- 工具函数 ---------- */
  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  }

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
