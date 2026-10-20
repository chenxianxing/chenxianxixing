/* ============================================================
   AES 文本加解密 - 工具页逻辑
   依赖：浏览器 WebCrypto（window.crypto.subtle）
   口令经 PBKDF2-SHA256 派生，密文为自描述格式
   全部在浏览器本地完成，不发起任何网络请求
   ============================================================ */
(function () {
  "use strict";

  /* ---------- DOM ---------- */
  var modeRow = document.getElementById("aesMode");
  var keyLenRow = document.getElementById("aesKeyLen");
  var fmtRow = document.getElementById("aesFmt");
  var passInput = document.getElementById("aesPass");
  var plainInput = document.getElementById("aesPlain");
  var outBox = document.getElementById("aesOut");
  var cipherInput = document.getElementById("aesCipher");
  var decPassInput = document.getElementById("aesDecPass");
  var decBox = document.getElementById("aesDecOut");
  var errorBox = document.getElementById("aesError");

  var btnRand = document.getElementById("aesRandBtn");
  var btnEnc = document.getElementById("aesEncBtn");
  var btnDec = document.getElementById("aesDecBtn");
  var btnCopy = document.getElementById("aesCopyBtn");
  var btnDecCopy = document.getElementById("aesDecCopyBtn");
  var btnClearIn = document.getElementById("aesClearInBtn");
  var btnClearAll = document.getElementById("aesClearBtn");

  if (!window.crypto || !window.crypto.subtle) {
    showError("当前浏览器不支持 WebCrypto，请使用较新版本的 Chrome / Edge / Firefox / Safari，并通过 https 或 localhost 访问。");
    return;
  }

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

  /* ---------- 字节 / 编码工具 ---------- */
  function abToBase64(buf) {
    var bytes = new Uint8Array(buf);
    var bin = "";
    var CHUNK = 0x8000;
    for (var i = 0; i < bytes.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(bin);
  }
  function base64ToAb(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }
  function abToHex(buf) {
    var bytes = new Uint8Array(buf);
    var s = "";
    for (var i = 0; i < bytes.length; i++) {
      s += bytes[i].toString(16).padStart(2, "0");
    }
    return s;
  }
  function hexToAb(hex) {
    var s = hex.replace(/[^0-9a-fA-F]/g, "");
    if (s.length % 2 === 1) s = "0" + s;
    var bytes = new Uint8Array(s.length / 2);
    for (var i = 0; i < s.length; i += 2) {
      bytes[i / 2] = parseInt(s.substr(i, 2), 16);
    }
    return bytes.buffer;
  }
  function isHex(s) {
    return /^[0-9a-fA-F]+$/.test(s) && s.length % 2 === 0;
  }

  /* ---------- 密钥派生（PBKDF2-SHA256） ---------- */
  async function deriveKey(pass, salt, keyLen, modeName) {
    var enc = new TextEncoder();
    var km = await crypto.subtle.importKey(
      "raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
      km,
      { name: modeName, length: keyLen },
      false,
      ["encrypt", "decrypt"]
    );
  }

  /* ---------- 加密 ---------- */
  async function doEncrypt() {
    clearError();
    var modeName = modeRow.querySelector("input:checked").value;
    var keyLen = parseInt(keyLenRow.querySelector("input:checked").value, 10);
    var fmt = fmtRow.querySelector("input:checked").value;
    var pass = passInput.value;
    var plain = plainInput.value;

    if (!pass) { showError("请先输入加密口令"); return; }

    try {
      var salt = crypto.getRandomValues(new Uint8Array(16));
      var ivLen = modeName === "AES-GCM" ? 12 : 16;
      var iv = crypto.getRandomValues(new Uint8Array(ivLen));
      var key = await deriveKey(pass, salt, keyLen, modeName);
      var data = new TextEncoder().encode(plain);
      var ctBuf = await crypto.subtle.encrypt({ name: modeName, iv: iv }, key, data);
      var encPart = fmt === "base64" ? abToBase64 : abToHex;
      var out = "AES-" + modeName + "-" + keyLen + "." +
        encPart(salt.buffer) + "." + encPart(iv.buffer) + "." + encPart(ctBuf);
      outBox.value = out;
      showToast("加密完成");
    } catch (e) {
      showError("加密失败：" + (e && e.message ? e.message : e));
    }
  }

  /* ---------- 解密 ---------- */
  async function doDecrypt() {
    clearError();
    var str = cipherInput.value.trim();
    var pass = decPassInput.value;
    if (!str) { showError("请粘贴要解密的密文"); return; }
    if (!pass) { showError("请输入解密口令"); return; }

    var parts = str.split(".");
    if (parts.length !== 4 || parts[0].indexOf("AES-") !== 0) {
      showError("密文格式不正确，无法解析");
      return;
    }
    var hm = parts[0].match(/^AES-(GCM|CBC)-(\d+)$/);
    if (!hm) { showError("密文格式不正确，无法解析"); return; }

    var modeName = "AES-" + hm[1];
    var keyLen = parseInt(hm[2], 10);
    var hex = isHex(parts[1]);
    var decPart = hex ? hexToAb : base64ToAb;

    try {
      var salt = new Uint8Array(decPart(parts[1]));
      var iv = new Uint8Array(decPart(parts[2]));
      var ct = decPart(parts[3]);
      var key = await deriveKey(pass, salt, keyLen, modeName);
      var ptBuf = await crypto.subtle.decrypt({ name: modeName, iv: iv }, key, ct);
      decBox.value = new TextDecoder().decode(ptBuf);
      showToast("解密完成");
    } catch (e) {
      showError("解密失败：口令不匹配或数据已损坏");
    }
  }

  /* ---------- 随机口令 ---------- */
  function genPass() {
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    var arr = new Uint32Array(16);
    crypto.getRandomValues(arr);
    var s = "";
    for (var i = 0; i < 16; i++) s += chars.charAt(arr[i] % chars.length);
    passInput.value = s;
    showToast("已生成随机口令");
  }

  /* ---------- 清空 ---------- */
  function clearInput() {
    plainInput.value = "";
    outBox.value = "";
    clearError();
  }
  function clearAll() {
    passInput.value = "";
    plainInput.value = "";
    outBox.value = "";
    cipherInput.value = "";
    decPassInput.value = "";
    decBox.value = "";
    clearError();
  }

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
  wireRadio(modeRow);
  wireRadio(keyLenRow);
  wireRadio(fmtRow);

  /* ---------- 事件 ---------- */
  btnEnc.addEventListener("click", doEncrypt);
  btnDec.addEventListener("click", doDecrypt);
  btnRand.addEventListener("click", genPass);
  btnCopy.addEventListener("click", function () {
    if (!outBox.value) { showToast("暂无可复制的密文"); return; }
    copyText(outBox.value, "已复制密文");
  });
  btnDecCopy.addEventListener("click", function () {
    if (!decBox.value) { showToast("暂无可复制的明文"); return; }
    copyText(decBox.value, "已复制明文");
  });
  btnClearIn.addEventListener("click", clearInput);
  btnClearAll.addEventListener("click", clearAll);
})();
