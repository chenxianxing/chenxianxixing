/* ============================================================
   图片Base64转换 - 工具页逻辑
   图片 -> DataURL/纯Base64/CSS/HTML；Base64 -> 图片还原
   全部在浏览器本地完成，不上传任何数据
   ============================================================ */
(function () {
  "use strict";

  var MAX_SIZE = 20 * 1024 * 1024;

  var dropZone = document.getElementById("dropZone");
  var imgInput = document.getElementById("imgInput");
  var fmtRow = document.getElementById("b64FmtRow");
  var origPreviewWrap = document.getElementById("origPreviewWrap");
  var origPreview = document.getElementById("origPreview");
  var infoGrid = document.getElementById("infoGrid");
  var infoName = document.getElementById("infoName");
  var infoType = document.getElementById("infoType");
  var infoSize = document.getElementById("infoSize");
  var infoB64Size = document.getElementById("infoB64Size");
  var output = document.getElementById("b64Output");
  var errorBox = document.getElementById("b64Error");

  var dataURL = "";

  /* 选择/拖拽 */
  dropZone.addEventListener("click", function () { imgInput.click(); });
  imgInput.addEventListener("change", function () {
    if (imgInput.files && imgInput.files[0]) handleFile(imgInput.files[0]);
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
    if (!file.type || file.type.indexOf("image/") !== 0) {
      errorBox.hidden = false;
      errorBox.textContent = "Please choose an image file （current file type: " + (file.type || "unknown") + "）。";
      return;
    }
    if (file.size > MAX_SIZE) {
      errorBox.hidden = false;
      errorBox.textContent = "File too large. Please choose an image no larger than 20MB （currently about " + fmtSize(file.size) + "）。";
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      dataURL = reader.result;
      origPreview.src = dataURL;
      origPreviewWrap.hidden = false;
      infoGrid.hidden = false;
      infoName.textContent = file.name;
      infoType.textContent = file.type;
      infoSize.textContent = fmtSize(file.size);
      infoB64Size.textContent = fmtSize(dataURL.length);
      renderOutput();
    };
    reader.onerror = function () {
      errorBox.hidden = false;
      errorBox.textContent = "Reading the file failed. Please try again.";
    };
    reader.readAsDataURL(file);
  }

  function getFmt() {
    var c = fmtRow.querySelector("input:checked");
    return c ? c.value : "full";
  }
  Array.prototype.forEach.call(fmtRow.querySelectorAll("input"), function (r) {
    r.addEventListener("change", renderOutput);
  });
  Array.prototype.forEach.call(fmtRow.querySelectorAll("label"), function (l) {
    l.addEventListener("click", function () {
      Array.prototype.forEach.call(fmtRow.querySelectorAll("label"), function (x) { x.classList.remove("checked"); });
      l.classList.add("checked");
      renderOutput();
    });
  });

  function renderOutput() {
    if (!dataURL) { output.textContent = ""; return; }
    var fmt = getFmt();
    var raw = dataURL.indexOf(",") > -1 ? dataURL.split(",")[1] : dataURL;
    var mime = (function () {
      var m = /^data:([^;]+);/.exec(dataURL);
      return m ? m[1] : "image/png";
    })();
    var text;
    switch (fmt) {
      case "raw": text = raw; break;
      case "css": text = 'background-image: url("' + dataURL + '");'; break;
      case "html": text = '<img src="' + dataURL + '" alt="">'; break;
      default: text = dataURL;
    }
    output.textContent = text;
  }

  document.getElementById("btnCopyB64").addEventListener("click", function () {
    if (!output.textContent) { showToast("Please choose an image first"); return; }
    copyText(output.textContent, "Result copied");
  });

  document.getElementById("btnDownloadTxt").addEventListener("click", function () {
    if (!output.textContent) { showToast("Please choose an image first"); return; }
    var blob = new Blob([output.textContent], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, "image-base64.txt");
    showToast("Started downloading .txt");
  });

  document.getElementById("btnClearImg").addEventListener("click", function () {
    dataURL = "";
    imgInput.value = "";
    origPreview.src = "";
    origPreviewWrap.hidden = true;
    infoGrid.hidden = true;
    output.textContent = "";
    errorBox.hidden = true;
  });

  /* ---------- 反向：Base64 -> 图片 ---------- */
  var paste = document.getElementById("b64Paste");
  var reverseWrap = document.getElementById("reverseWrap");
  var reversePreview = document.getElementById("reversePreview");
  var btnDownloadImg = document.getElementById("btnDownloadImg");
  var reverseDataURL = "";

  function detectMime(raw) {
    if (raw.indexOf("/9j/") === 0) return "image/jpeg";
    if (raw.indexOf("iVBORw0KGgo") === 0) return "image/png";
    if (raw.indexOf("R0lGOD") === 0) return "image/gif";
    if (raw.indexOf("UklGR") === 0) return "image/webp";
    return "image/png";
  }

  document.getElementById("btnRestore").addEventListener("click", function () {
    errorBox.hidden = true;
    var val = paste.value.trim();
    if (!val) { showToast("Please paste Base64 first"); return; }
    var mime, body;
    if (/^data:/.test(val)) {
      var m = /^data:([^;]+);base64,(.*)$/.exec(val);
      if (m) { mime = m[1]; body = m[2]; }
      else { mime = "image/png"; body = val.substring(val.indexOf(",") + 1); }
      reverseDataURL = val;
    } else {
      /* 纯 Base64 */
      mime = detectMime(val);
      reverseDataURL = "data:" + mime + ";base64," + val;
      if (mime === "image/png" && val.indexOf("iVBORw0KGgo") !== 0) {
        errorBox.hidden = false;
        errorBox.textContent = "The image type could not be recognized, so it was processed as PNG. If the preview looks wrong, please check your input.";
      }
    }
    reversePreview.src = reverseDataURL;
    reverseWrap.hidden = false;
    btnDownloadImg.disabled = false;
  });

  btnDownloadImg.addEventListener("click", function () {
    if (!reverseDataURL) return;
    var mime = (function () { var m = /^data:([^;]+);/.exec(reverseDataURL); return m ? m[1] : "image/png"; })();
    var ext = mime.split("/")[1] || "png";
    var a = document.createElement("a");
    a.href = reverseDataURL;
    a.download = "restored-image." + ext;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("Started downloading the image");
  });

  document.getElementById("btnClearPaste").addEventListener("click", function () {
    paste.value = "";
    reverseDataURL = "";
    reverseWrap.hidden = true;
    btnDownloadImg.disabled = true;
  });

  /* ---------- 工具函数 ---------- */
  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
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
