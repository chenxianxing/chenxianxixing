/* ============================================================
   Hash生成器 - 工具页逻辑
   算法：MD5（纯 JS 实现，UTF-8）/ SHA1/256/384/512（crypto.subtle）
   支持文本、文件（≤200MB）、HMAC 模式
   ============================================================ */
(function () {
  "use strict";

  var algoSelect = document.getElementById("hgAlgo");
  var modeRow = document.getElementById("hgMode");
  var textBox = document.getElementById("hgTextBox");
  var fileBox = document.getElementById("hgFileBox");
  var hmacBox = document.getElementById("hgHmacBox");
  var textInput = document.getElementById("hgText");
  var fileInput = document.getElementById("hgFile");
  var fileInfo = document.getElementById("hgFileInfo");
  var keyInput = document.getElementById("hgKey");
  var upperChk = document.getElementById("hgUpper");
  var resultEl = document.getElementById("hgResult");
  var secureNote = document.getElementById("hgSecureNote");

  var hasSubtle = !!(window.crypto && window.crypto.subtle);
  var selectedFile = null;

  /* ---------- radio 样式联动 ---------- */
  Array.prototype.forEach.call(modeRow.querySelectorAll("label"), function (label) {
    label.addEventListener("click", function () {
      Array.prototype.forEach.call(modeRow.querySelectorAll("label"), function (l) {
        l.classList.remove("checked");
      });
      label.classList.add("checked");
      switchMode(label.querySelector("input").value);
    });
  });

  function getMode() {
    var checked = modeRow.querySelector("input:checked");
    return checked ? checked.value : "text";
  }

  function switchMode(mode) {
    textBox.hidden = mode !== "text";
    fileBox.hidden = mode !== "file";
    hmacBox.hidden = mode !== "hmac";
  }

  /* ============================================================
     MD5 纯 JS 实现（基于 Joseph Myers / blueimp 算法，字节输入）
     ============================================================ */
  function md5FromBytes(bytes) {
    function add32(a, b) { return (a + b) & 0xFFFFFFFF; }
    function cmn(q, a, b, x, s, t) {
      a = add32(add32(a, q), add32(x, t));
      return add32((a << s) | (a >>> (32 - s)), b);
    }
    function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }

    function cycle(x, k) {
      var a = x[0], b = x[1], c = x[2], d = x[3];
      a = ff(a, b, c, d, k[0], 7, -680876936);
      d = ff(d, a, b, c, k[1], 12, -389564586);
      c = ff(c, d, a, b, k[2], 17, 606105819);
      b = ff(b, c, d, a, k[3], 22, -1044525330);
      a = ff(a, b, c, d, k[4], 7, -176418897);
      d = ff(d, a, b, c, k[5], 12, 1200080426);
      c = ff(c, d, a, b, k[6], 17, -1473231341);
      b = ff(b, c, d, a, k[7], 22, -45705983);
      a = ff(a, b, c, d, k[8], 7, 1770035416);
      d = ff(d, a, b, c, k[9], 12, -1958414417);
      c = ff(c, d, a, b, k[10], 17, -42063);
      b = ff(b, c, d, a, k[11], 22, -1990404162);
      a = ff(a, b, c, d, k[12], 7, 1804603682);
      d = ff(d, a, b, c, k[13], 12, -40341101);
      c = ff(c, d, a, b, k[14], 17, -1502002290);
      b = ff(b, c, d, a, k[15], 22, 1236535329);
      a = gg(a, b, c, d, k[1], 5, -165796510);
      d = gg(d, a, b, c, k[6], 9, -1069501632);
      c = gg(c, d, a, b, k[11], 14, 643717713);
      b = gg(b, c, d, a, k[0], 20, -373897302);
      a = gg(a, b, c, d, k[5], 5, -701558691);
      d = gg(d, a, b, c, k[10], 9, 38016083);
      c = gg(c, d, a, b, k[15], 14, -660478335);
      b = gg(b, c, d, a, k[4], 20, -405537848);
      a = gg(a, b, c, d, k[9], 5, 568446438);
      d = gg(d, a, b, c, k[14], 9, -1019803690);
      c = gg(c, d, a, b, k[3], 14, -187363961);
      b = gg(b, c, d, a, k[8], 20, 1163531501);
      a = gg(a, b, c, d, k[13], 5, -1444681467);
      d = gg(d, a, b, c, k[2], 9, -51403784);
      c = gg(c, d, a, b, k[7], 14, 1735328473);
      b = gg(b, c, d, a, k[12], 20, -1926607734);
      a = hh(a, b, c, d, k[5], 4, -378558);
      d = hh(d, a, b, c, k[8], 11, -2022574463);
      c = hh(c, d, a, b, k[11], 16, 1839030562);
      b = hh(b, c, d, a, k[14], 23, -35309556);
      a = hh(a, b, c, d, k[1], 4, -1530992060);
      d = hh(d, a, b, c, k[4], 11, 1272893353);
      c = hh(c, d, a, b, k[7], 16, -155497632);
      b = hh(b, c, d, a, k[10], 23, -1094730640);
      a = hh(a, b, c, d, k[13], 4, 681279174);
      d = hh(d, a, b, c, k[0], 11, -358537222);
      c = hh(c, d, a, b, k[3], 16, -722521979);
      b = hh(b, c, d, a, k[6], 23, 76029189);
      a = hh(a, b, c, d, k[9], 4, -640364487);
      d = hh(d, a, b, c, k[12], 11, -421815835);
      c = hh(c, d, a, b, k[15], 16, 530742520);
      b = hh(b, c, d, a, k[2], 23, -995338651);
      a = ii(a, b, c, d, k[0], 6, -198630844);
      d = ii(d, a, b, c, k[7], 10, 1126891415);
      c = ii(c, d, a, b, k[14], 15, -1416354905);
      b = ii(b, c, d, a, k[5], 21, -57434055);
      a = ii(a, b, c, d, k[12], 6, 1700485571);
      d = ii(d, a, b, c, k[3], 10, -1894986606);
      c = ii(c, d, a, b, k[10], 15, -1051523);
      b = ii(b, c, d, a, k[1], 21, -2054922799);
      a = ii(a, b, c, d, k[8], 6, 1873313359);
      d = ii(d, a, b, c, k[15], 10, -30611744);
      c = ii(c, d, a, b, k[6], 15, -1560198380);
      b = ii(b, c, d, a, k[13], 21, 1309151649);
      a = ii(a, b, c, d, k[4], 6, -145523070);
      d = ii(d, a, b, c, k[11], 10, -1120210379);
      c = ii(c, d, a, b, k[2], 15, 718787259);
      b = ii(b, c, d, a, k[9], 21, -343485551);
      x[0] = add32(a, x[0]);
      x[1] = add32(b, x[1]);
      x[2] = add32(c, x[2]);
      x[3] = add32(d, x[3]);
    }

    function bytesToWords(buf, off) {
      var w = new Uint32Array(16);
      for (var j = 0; j < 16; j++) {
        var p = off + j * 4;
        w[j] = (buf[p] | (buf[p + 1] << 8) | (buf[p + 2] << 16) | (buf[p + 3] << 24)) >>> 0;
      }
      return w;
    }

    function rhex(n) {
      var hexChr = "0123456789abcdef".split("");
      var s = "", j = 0;
      for (; j < 4; j += 1) s += hexChr[(n >> (j * 8 + 4)) & 0x0F] + hexChr[(n >> (j * 8)) & 0x0F];
      return s;
    }

    var n = bytes.length;
    var state = [1732584193, -271733879, -1732584194, 271733878];
    var i, j;
    for (i = 0; i + 64 <= n; i += 64) {
      cycle(state, bytesToWords(bytes, i));
    }
    var tail = new Uint8Array(64);
    var rem = n - i;
    for (j = 0; j < rem; j++) tail[j] = bytes[i + j];
    tail[rem] = 0x80;
    if (rem >= 56) {
      cycle(state, bytesToWords(tail, 0));
      tail = new Uint8Array(64);
    }
    var lenBits = n * 8;
    tail[56] = lenBits & 0xFF;
    tail[57] = (lenBits >>> 8) & 0xFF;
    tail[58] = (lenBits >>> 16) & 0xFF;
    tail[59] = (lenBits >>> 24) & 0xFF;
    var hi = Math.floor(lenBits / 0x100000000);
    tail[60] = hi & 0xFF;
    tail[61] = (hi >>> 8) & 0xFF;
    tail[62] = (hi >>> 16) & 0xFF;
    tail[63] = (hi >>> 24) & 0xFF;
    cycle(state, bytesToWords(tail, 0));

    return rhex(state[0]) + rhex(state[1]) + rhex(state[2]) + rhex(state[3]);
  }

  /* ---------- HMAC-MD5（crypto.subtle 不支持 MD5，故手动实现） ---------- */
  function hmacMd5(keyBytes, msgBytes) {
    var blockSize = 64;
    var key = keyBytes;
    if (key.length > blockSize) key = md5ToBytes(md5FromBytes(key));
    var k = new Uint8Array(blockSize);
    k.set(key.subarray(0, Math.min(key.length, blockSize)));
    var ipad = new Uint8Array(blockSize);
    var opad = new Uint8Array(blockSize);
    for (var i = 0; i < blockSize; i++) {
      ipad[i] = k[i] ^ 0x36;
      opad[i] = k[i] ^ 0x5C;
    }
    var inner = new Uint8Array(blockSize + msgBytes.length);
    inner.set(ipad);
    inner.set(msgBytes, blockSize);
    var innerHash = md5ToBytes(md5FromBytes(inner));
    var outer = new Uint8Array(blockSize + innerHash.length);
    outer.set(opad);
    outer.set(innerHash, blockSize);
    return md5FromBytes(outer);
  }

  function md5ToBytes(hexStr) {
    var out = new Uint8Array(hexStr.length / 2);
    for (var i = 0; i < out.length; i++) {
      out[i] = parseInt(hexStr.substr(i * 2, 2), 16);
    }
    return out;
  }

  /* ---------- 通用 HMAC（SHA 系列用 crypto.subtle） ---------- */
  function hmacSha(hashName, keyBytes, msgBytes) {
    return crypto.subtle.importKey(
      "raw", keyBytes,
      { name: "HMAC", hash: { name: hashName } },
      false, ["sign"]
    ).then(function (keyObj) {
      return crypto.subtle.sign("HMAC", keyObj, msgBytes);
    }).then(function (buf) {
      return bufToHex(new Uint8Array(buf));
    });
  }

  /* ---------- 工具函数 ---------- */
  function bufToHex(arr) {
    var s = "";
    for (var i = 0; i < arr.length; i++) {
      s += ("0" + (arr[i] & 0xFF).toString(16)).slice(-2);
    }
    return s;
  }

  function getAlgo() { return algoSelect.value; }

  function setResult(hex) {
    if (upperChk.checked) hex = hex.toUpperCase();
    resultEl.textContent = hex || "（空）";
  }

  /* ---------- 计算主流程 ---------- */
  function compute() {
    var algo = getAlgo();
    var mode = getMode();

    if (algo !== "MD5" && !hasSubtle) {
      resultEl.textContent = "当前环境不支持 " + algo + "（Web Crypto 不可用，请通过 http://localhost 或 https 访问）。MD5 仍可使用。";
      return;
    }

    if (mode === "text") {
      var text = textInput.value;
      var bytes = new TextEncoder().encode(text);
      computeBytes(algo, bytes, "文本（" + text.length + " 字符）");
    } else if (mode === "hmac") {
      if (algo !== "MD5" && !hasSubtle) {
        resultEl.textContent = "当前环境不支持 " + algo + " HMAC。";
        return;
      }
      var keyStr = keyInput.value;
      if (!keyStr) {
        resultEl.textContent = "请输入 HMAC 密钥。";
        return;
      }
      var msgBytes = new TextEncoder().encode(textInput.value);
      var kBytes = new TextEncoder().encode(keyStr);
      if (algo === "MD5") {
        setResult(hmacMd5(kBytes, msgBytes));
      } else {
        hmacSha(algo, kBytes, msgBytes).then(setResult, function (e) {
          resultEl.textContent = "HMAC 计算失败：" + e.message;
        });
      }
    } else if (mode === "file") {
      if (!selectedFile) {
        resultEl.textContent = "请先选择文件。";
        return;
      }
      computeFile(algo, selectedFile);
    }
  }

  function computeBytes(algo, bytes, desc) {
    if (algo === "MD5") {
      setResult(md5FromBytes(bytes));
    } else {
      crypto.subtle.digest(algo, bytes).then(function (buf) {
        setResult(bufToHex(new Uint8Array(buf)));
      }, function (e) {
        resultEl.textContent = "计算失败：" + e.message;
      });
    }
  }

  function computeFile(algo, file) {
    resultEl.textContent = "正在计算，请稍候…";
    var reader = new FileReader();
    reader.onload = function () {
      var bytes = new Uint8Array(reader.result);
      computeBytes(algo, bytes, file.name);
    };
    reader.onerror = function () {
      resultEl.textContent = "文件读取失败。";
    };
    reader.readAsArrayBuffer(file);
  }

  /* ---------- 防抖（文本模式实时计算） ---------- */
  var debounceTimer = null;
  function debouncedCompute() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(compute, 350);
  }

  textInput.addEventListener("input", function () {
    if (getMode() === "text") debouncedCompute();
  });

  algoSelect.addEventListener("change", compute);
  upperChk.addEventListener("change", compute);
  document.getElementById("btnHash").addEventListener("click", compute);

  /* ---------- 文件选择 ---------- */
  fileInput.addEventListener("change", function () {
    var f = fileInput.files && fileInput.files[0];
    if (!f) {
      selectedFile = null;
      fileInfo.textContent = "未选择文件。";
      return;
    }
    var MAX = 200 * 1024 * 1024;
    if (f.size > MAX) {
      selectedFile = null;
      fileInfo.innerHTML = "文件过大：<b>" + (f.size / 1048576).toFixed(1) + " MB</b>，超过 200MB 限制。";
      return;
    }
    selectedFile = f;
    fileInfo.innerHTML = "已选择：<b>" + escapeHtml(f.name) + "</b> · " + (f.size / 1024).toFixed(1) + " KB";
    compute();
  });

  keyInput.addEventListener("input", function () {
    if (getMode() === "hmac") debouncedCompute();
  });

  document.getElementById("btnCopyHash").addEventListener("click", function () {
    var txt = resultEl.textContent;
    if (!txt || txt === "（空）" || txt.indexOf("失败") > -1 || txt.indexOf("请") > -1 || txt.indexOf("不支持") > -1) {
      showToast("暂无可复制的结果");
      return;
    }
    copyText(txt, "已复制哈希值");
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- 安全上下文提示 ---------- */
  if (!hasSubtle) {
    secureNote.hidden = false;
  }

  /* ---------- 复制工具（带降级） ---------- */
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

  /* ---------- 轻提示 ---------- */
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
