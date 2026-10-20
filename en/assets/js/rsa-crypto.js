/* ============================================================
   RSA 密钥对与加解密 - 工具页逻辑
   依赖：浏览器 WebCrypto（window.crypto.subtle）
   生成 RSA-OAEP 密钥对，导出 PEM，支持公钥加密 / 私钥解密
   全部在浏览器本地完成，不发起任何网络请求
   ============================================================ */
(function () {
  "use strict";

  /* ---------- DOM ---------- */
  var bitsRow = document.getElementById("rsaBits");
  var genBtn = document.getElementById("rsaGenBtn");
  var statusEl = document.getElementById("rsaStatus");
  var pubBox = document.getElementById("rsaPub");
  var privBox = document.getElementById("rsaPriv");

  var encPub = document.getElementById("rsaEncPub");
  var encPlain = document.getElementById("rsaEncPlain");
  var encBtn = document.getElementById("rsaEncBtn");
  var encOut = document.getElementById("rsaEncOut");

  var decPriv = document.getElementById("rsaDecPriv");
  var decIn = document.getElementById("rsaDecIn");
  var decBtn = document.getElementById("rsaDecBtn");
  var decOut = document.getElementById("rsaDecOut");

  var copyPub = document.getElementById("rsaCopyPub");
  var copyPriv = document.getElementById("rsaCopyPriv");
  var downPub = document.getElementById("rsaDownPub");
  var downPriv = document.getElementById("rsaDownPriv");
  var copyEnc = document.getElementById("rsaCopyEnc");
  var copyDec = document.getElementById("rsaCopyDec");

  var errorBox = document.getElementById("rsaError");

  if (!window.crypto || !window.crypto.subtle) {
    showError("Your current browser does not support WebCrypto. Please use a more recent browser and visit via https or localhost.");
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

  /* ---------- PEM 编解码 ---------- */
  function abToBase64(buf) {
    var bytes = new Uint8Array(buf);
    var bin = "";
    var CHUNK = 0x8000;
    for (var i = 0; i < bytes.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(bin);
  }
  function pemEncode(b64, label) {
    var body = b64.replace(/(.{64})/g, "$1\n").trim();
    return "-----BEGIN " + label + "-----\n" + body + "\n-----END " + label + "-----";
  }
  function pemDecode(pem) {
    return pem
      .replace(/-----BEGIN[^-]+-----/g, "")
      .replace(/-----END[^-]+-----/g, "")
      .replace(/\s+/g, "");
  }
  function maxPlainBytes(bits) {
    /* RSA-OAEP-SHA256 开销 = 2*32 + 2 = 66 字节 */
    return Math.floor(bits / 8) - 66;
  }

  /* ---------- 生成密钥对 ---------- */
  async function generate() {
    clearError();
    var bits = parseInt(bitsRow.querySelector("input:checked").value, 10);
    genBtn.disabled = true;
    statusEl.hidden = false;
    statusEl.textContent = "Generating...";
    statusEl.classList.add("active");
    try {
      var pair = await crypto.subtle.generateKey(
        {
          name: "RSA-OAEP",
          modulusLength: bits,
          publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
          hash: "SHA-256"
        },
        true,
        ["encrypt", "decrypt"]
      );
      var spki = await crypto.subtle.exportKey("spki", pair.publicKey);
      var pkcs8 = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
      var pubPem = pemEncode(abToBase64(spki), "PUBLIC KEY");
      var privPem = pemEncode(abToBase64(pkcs8), "PRIVATE KEY");
      pubBox.value = pubPem;
      privBox.value = privPem;
      encPub.value = pubPem;
      decPriv.value = privPem;
      showToast("Generated " + bits + "bit key pair");
    } catch (e) {
      showError("Generation failed: " + (e && e.message ? e.message : e));
    } finally {
      genBtn.disabled = false;
      statusEl.hidden = true;
      statusEl.classList.remove("active");
    }
  }

  /* ---------- 导入密钥 ---------- */
  async function importPublic(pem) {
    var b64 = pemDecode(pem);
    var buf = base64ToAb(b64);
    return crypto.subtle.importKey(
      "spki", buf, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["encrypt"]
    );
  }
  async function importPrivate(pem) {
    var b64 = pemDecode(pem);
    var buf = base64ToAb(b64);
    return crypto.subtle.importKey(
      "pkcs8", buf, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["decrypt"]
    );
  }
  function base64ToAb(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  /* ---------- 加密 ---------- */
  async function doEncrypt() {
    clearError();
    var pem = encPub.value.trim();
    var plain = encPlain.value;
    if (!pem) { showError("Please paste a public key PEM, or generate a key pair first"); return; }
    if (!plain) { showError("Please enter the plaintext to encrypt"); return; }
    var bytes = new TextEncoder().encode(plain);
    if (bytes.length > maxPlainBytes(2048)) {
      showError("Plaintext too long: RSA-OAEP (2048-bit) allows at most about 190 bytes per operation. Use AES for long text instead");
      return;
    }
    try {
      var key = await importPublic(pem);
      var ct = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, key, bytes);
      encOut.value = abToBase64(ct);
      showToast("Encryption complete");
    } catch (e) {
      showError("Encryption failed: invalid key format or plaintext exceeds length limit");
    }
  }

  /* ---------- 解密 ---------- */
  async function doDecrypt() {
    clearError();
    var pem = decPriv.value.trim();
    var b64 = decIn.value.trim();
    if (!pem) { showError("Please paste a private key PEM, or generate a key pair first"); return; }
    if (!b64) { showError("Please paste the Base64 ciphertext to decrypt"); return; }
    try {
      var buf = base64ToAb(b64.replace(/\s+/g, ""));
      var key = await importPrivate(pem);
      var pt = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, key, buf);
      decOut.value = new TextDecoder().decode(pt);
      showToast("Decryption complete");
    } catch (e) {
      showError("Decryption failed: invalid private key format or ciphertext mismatch");
    }
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
  wireRadio(bitsRow);

  /* ---------- 事件 ---------- */
  genBtn.addEventListener("click", generate);
  encBtn.addEventListener("click", doEncrypt);
  decBtn.addEventListener("click", doDecrypt);

  copyPub.addEventListener("click", function () {
    if (!pubBox.value) { showToast("No public key available to copy"); return; }
    copyText(pubBox.value, "Public key copied");
  });
  copyPriv.addEventListener("click", function () {
    if (!privBox.value) { showToast("No private key available to copy"); return; }
    copyText(privBox.value, "Private key copied");
  });
  downPub.addEventListener("click", function () {
    if (!pubBox.value) { showToast("No public key available to download"); return; }
    downloadBlob(new Blob([pubBox.value], { type: "application/x-pem-file" }), "public_key.pem");
    showToast("Public key download started");
  });
  downPriv.addEventListener("click", function () {
    if (!privBox.value) { showToast("No private key available to download"); return; }
    downloadBlob(new Blob([privBox.value], { type: "application/x-pem-file" }), "private_key.pem");
    showToast("Private key download started");
  });
  copyEnc.addEventListener("click", function () {
    if (!encOut.value) { showToast("No ciphertext available to copy"); return; }
    copyText(encOut.value, "Ciphertext copied");
  });
  copyDec.addEventListener("click", function () {
    if (!decOut.value) { showToast("No plaintext available to copy"); return; }
    copyText(decOut.value, "Plaintext copied");
  });
})();
