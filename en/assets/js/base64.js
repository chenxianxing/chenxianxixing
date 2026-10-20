/* ============================================================
   Base64编解码 - 工具页逻辑
   文本 UTF-8 安全编解码 / URL 安全模式 / 图片转 Base64 / 反向还原
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 通用编码函数 ---------- */
  function bytesToBinary(bytes) {
    var s = "";
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return s;
  }

  function utf8ToBase64(text) {
    var bytes = new TextEncoder().encode(text);
    return btoa(bytesToBinary(bytes));
  }

  function base64ToUtf8(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }

  function toUrlSafe(s) {
    return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function fromUrlSafe(s) {
    var t = s.replace(/-/g, "+").replace(/_/g, "/");
    while (t.length % 4 !== 0) t += "=";
    return t;
  }

  /* ---------- 文本编码 ---------- */
  var textIn = document.getElementById("b64TextIn");
  var textOut = document.getElementById("b64TextOut");
  var urlSafe = document.getElementById("b64UrlSafe");

  function encodeText() {
    var raw = textIn.value;
    if (!raw) { textOut.value = ""; showToast("Please enter the text to encode"); return; }
    try {
      var b64 = utf8ToBase64(raw);
      textOut.value = urlSafe.checked ? toUrlSafe(b64) : b64;
      showToast("Encoded" + (urlSafe.checked ? " (URL-safe)" : ""));
    } catch (e) {
      textOut.value = "";
      showToast("Encoding failed: " + (e && e.message ? e.message : String(e)));
    }
  }

  document.getElementById("btnEncode").addEventListener("click", encodeText);
  urlSafe.addEventListener("change", function () { if (textOut.value) encodeText(); });
  document.getElementById("btnEncodeCopy").addEventListener("click", function () {
    if (!textOut.value) { showToast("The result is empty"); return; }
    copyText(textOut.value, "Base64 copied");
  });
  document.getElementById("btnEncodeClear").addEventListener("click", function () {
    textIn.value = ""; textOut.value = ""; textIn.focus();
  });

  /* ---------- 文本解码 ---------- */
  var decIn = document.getElementById("b64DecIn");
  var decOut = document.getElementById("b64DecOut");
  var decErr = document.getElementById("b64DecErr");
  var decUrlSafe = document.getElementById("b64DecUrlSafe");

  function decodeText() {
    decErr.hidden = true;
    var raw = decIn.value.trim();
    if (!raw) { decOut.value = ""; return; }
    var b64 = decUrlSafe.checked ? fromUrlSafe(raw) : raw;
    try {
      decOut.value = base64ToUtf8(b64);
      showToast("Decoded");
    } catch (e) {
      decOut.value = "";
      decErr.hidden = false;
      decErr.textContent = "Decoding failed: the input is not valid Base64. Reason: " + (e && e.message ? e.message : String(e));
    }
  }

  document.getElementById("btnDecode").addEventListener("click", decodeText);
  decUrlSafe.addEventListener("change", function () { if (decIn.value.trim()) decodeText(); });
  document.getElementById("btnDecodeCopy").addEventListener("click", function () {
    if (!decOut.value) { showToast("The result is empty"); return; }
    copyText(decOut.value, "Decoded result copied");
  });
  document.getElementById("btnDecodeClear").addEventListener("click", function () {
    decIn.value = ""; decOut.value = ""; decErr.hidden = true; decIn.focus();
  });

  /* ---------- 图片转 Base64 ---------- */
  var drop = document.getElementById("b64Drop");
  var fileInput = document.getElementById("b64ImgInput");
  var imgOut = document.getElementById("b64ImgOut");
  var mimeChk = document.getElementById("b64Mime");
  var prevWrap = document.getElementById("b64Prev");
  var prevImg = document.getElementById("b64PrevImg");
  var prevSize = document.getElementById("b64PrevSize");

  function fileToDataURL(file, cb) {
    var reader = new FileReader();
    reader.onload = function () { cb(reader.result, file); };
    reader.onerror = function () { showToast("Failed to read the file"); };
    reader.readAsDataURL(file);
  }

  function dataURLWithoutPrefix(d) {
    var idx = d.indexOf(",");
    return idx > -1 ? d.slice(idx + 1) : d;
  }

  function handleFile(file) {
    if (!file) return;
    fileToDataURL(file, function (dataUrl) {
      imgOut.value = mimeChk.checked ? dataUrl : dataURLWithoutPrefix(dataUrl);
      showPreview(dataUrl, file.size);
    });
  }

  drop.addEventListener("click", function () { fileInput.click(); });
  fileInput.addEventListener("change", function () { handleFile(fileInput.files[0]); });

  ["dragenter", "dragover"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); e.stopPropagation(); drop.classList.add("dragover"); });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); e.stopPropagation(); drop.classList.remove("dragover"); });
  });
  drop.addEventListener("drop", function (e) {
    var dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) handleFile(dt.files[0]);
  });

  mimeChk.addEventListener("change", function () {
    if (!imgOut.value) return;
    var hasPrefix = /^data:/i.test(imgOut.value);
    if (mimeChk.checked && !hasPrefix) {
      imgOut.value = (lastDataUrl || "data:;base64," + imgOut.value);
    } else if (!mimeChk.checked && hasPrefix) {
      imgOut.value = dataURLWithoutPrefix(imgOut.value);
    }
  });

  var lastDataUrl = "";
  function showPreview(dataUrl, size) {
    lastDataUrl = dataUrl;
    prevWrap.hidden = false;
    prevImg.src = dataUrl;
    if (typeof size === "number") prevSize.textContent = "Original size: " + formatSize(size);
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  }

  document.getElementById("btnImgCopy").addEventListener("click", function () {
    if (!imgOut.value) { showToast("The result is empty"); return; }
    copyText(imgOut.value, "DataURL copied");
  });
  document.getElementById("btnImgCss").addEventListener("click", function () {
    if (!imgOut.value) { showToast("The result is empty"); return; }
    copyText('background-image: url("' + imgOut.value + '");', "CSS copied");
  });
  document.getElementById("btnImgHtml").addEventListener("click", function () {
    if (!imgOut.value) { showToast("The result is empty"); return; }
    copyText('<img src="' + imgOut.value + '" alt="">', "HTML copied");
  });
  document.getElementById("btnImgDownload").addEventListener("click", function () {
    if (!imgOut.value) { showToast("The result is empty"); return; }
    downloadText(imgOut.value, "image-base64-" + Date.now() + ".txt", "text/plain");
  });
  document.getElementById("btnImgClear").addEventListener("click", function () {
    imgOut.value = ""; fileInput.value = ""; prevWrap.hidden = true; prevImg.src = ""; lastDataUrl = "";
  });

  /* ---------- 反向：粘贴 Base64 还原图片 ---------- */
  var pasteArea = document.getElementById("b64Paste");
  pasteArea.addEventListener("input", function () {
    var v = pasteArea.value.trim();
    if (!v) return;
    var dataUrl = /^data:/i.test(v) ? v : "data:image/png;base64," + v;
    prevWrap.hidden = false;
    prevImg.src = dataUrl;
    prevSize.textContent = "Base64 length: " + v.length + " characters";
  });

  document.getElementById("btnPrevDownload").addEventListener("click", function () {
    if (!prevImg.src || prevImg.src.indexOf("data:") !== 0) { showToast("No downloadable preview yet"); return; }
    var src = prevImg.src;
    var mime = (src.match(/data:([^;]+)/) || [])[1] || "image/png";
    var ext = (mime.split("/")[1] || "png").replace(/[^a-z0-9]/gi, "");
    var a = document.createElement("a");
    a.href = src;
    a.download = "restored-" + Date.now() + "." + ext;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("Image downloaded");
  });

  /* ---------- 通用工具 ---------- */
  function downloadText(text, filename, mime) {
    var blob = new Blob([text], { type: (mime || "text/plain") + ";charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    showToast("Downloaded" + filename);
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
