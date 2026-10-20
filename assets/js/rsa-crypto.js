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
    showError("当前浏览器不支持 WebCrypto，请使用较新版本的浏览器，并通过 https 或 localhost 访问。");
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
    statusEl.textContent = "生成中…";
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
      showToast("已生成 " + bits + " 位密钥对");
    } catch (e) {
      showError("生成失败：" + (e && e.message ? e.message : e));
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
    if (!pem) { showError("请先粘贴公钥 PEM，或先生成密钥对"); return; }
    if (!plain) { showError("请输入要加密的明文"); return; }
    var bytes = new TextEncoder().encode(plain);
    if (bytes.length > maxPlainBytes(2048)) {
      showError("明文过长：RSA-OAEP（2048 位）单次最多约 190 字节，请改用 AES 加密长文本");
      return;
    }
    try {
      var key = await importPublic(pem);
      var ct = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, key, bytes);
      encOut.value = abToBase64(ct);
      showToast("加密完成");
    } catch (e) {
      showError("加密失败：密钥格式不正确或明文超出长度限制");
    }
  }

  /* ---------- 解密 ---------- */
  async function doDecrypt() {
    clearError();
    var pem = decPriv.value.trim();
    var b64 = decIn.value.trim();
    if (!pem) { showError("请先粘贴私钥 PEM，或先生成密钥对"); return; }
    if (!b64) { showError("请粘贴要解密的 Base64 密文"); return; }
    try {
      var buf = base64ToAb(b64.replace(/\s+/g, ""));
      var key = await importPrivate(pem);
      var pt = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, key, buf);
      decOut.value = new TextDecoder().decode(pt);
      showToast("解密完成");
    } catch (e) {
      showError("解密失败：私钥格式不正确或密文不匹配");
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
    if (!pubBox.value) { showToast("暂无可复制的公钥"); return; }
    copyText(pubBox.value, "已复制公钥");
  });
  copyPriv.addEventListener("click", function () {
    if (!privBox.value) { showToast("暂无可复制的私钥"); return; }
    copyText(privBox.value, "已复制私钥");
  });
  downPub.addEventListener("click", function () {
    if (!pubBox.value) { showToast("暂无可下载的公钥"); return; }
    downloadBlob(new Blob([pubBox.value], { type: "application/x-pem-file" }), "public_key.pem");
    showToast("已开始下载公钥");
  });
  downPriv.addEventListener("click", function () {
    if (!privBox.value) { showToast("暂无可下载的私钥"); return; }
    downloadBlob(new Blob([privBox.value], { type: "application/x-pem-file" }), "private_key.pem");
    showToast("已开始下载私钥");
  });
  copyEnc.addEventListener("click", function () {
    if (!encOut.value) { showToast("暂无可复制的密文"); return; }
    copyText(encOut.value, "已复制密文");
  });
  copyDec.addEventListener("click", function () {
    if (!decOut.value) { showToast("暂无可复制的明文"); return; }
    copyText(decOut.value, "已复制明文");
  });
})();
