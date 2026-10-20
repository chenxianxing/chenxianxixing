/* ============================================================
   JWT签名验证 - 工具页逻辑
   支持 HS256/384/512（HMAC）与 RS256/384/512（RSASSA-PKCS1-v1_5）
   解析 Header/Payload，标准字段高亮，本地验证不联网
   ============================================================ */
(function () {
  "use strict";

  var jwtInput = document.getElementById("jwtInput");
  var keyInput = document.getElementById("jwtKey");
  var keyLabel = document.getElementById("jwtKeyLabel");
  var keyHint = document.getElementById("jwtKeyHint");
  var secureNote = document.getElementById("jwtSecureNote");
  var resultEl = document.getElementById("jwtResult");
  var emptyEl = document.getElementById("jwtEmpty");
  var statusEl = document.getElementById("jwtStatus");
  var sigEl = document.getElementById("jwtSig");
  var headerEl = document.getElementById("jwtHeader");
  var payloadEl = document.getElementById("jwtPayload");

  var hasSubtle = !!(window.crypto && window.crypto.subtle);
  var STANDARD_CLAIMS = ["iss", "sub", "aud", "exp", "nbf", "iat", "jti", "typ", "alg", "kid", "cty"];

  /* ---------- Base64URL ---------- */
  function b64urlToBytes(str) {
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) str += "=";
    var bin = atob(str);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function b64urlFromBytes(bytes) {
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function decodeSegment(str) {
    var bytes = b64urlToBytes(str);
    var text = new TextDecoder("utf-8").decode(bytes);
    try {
      return { json: JSON.parse(text), raw: text };
    } catch (e) {
      return { json: null, raw: text };
    }
  }

  /* ---------- 算法映射 ---------- */
  function hashForAlg(alg) {
    if (alg === "HS256" || alg === "RS256") return "SHA-256";
    if (alg === "HS384" || alg === "RS384") return "SHA-384";
    if (alg === "HS512" || alg === "RS512") return "SHA-512";
    return null;
  }

  /* ---------- 验证主流程 ---------- */
  function verify() {
    var token = jwtInput.value.trim();
    var key = keyInput.value;

    if (!token) { showToast("Please paste a JWT first"); return; }
    if (!hasSubtle) {
      statusEl.className = "jwt-status fail";
      statusEl.textContent = "✕ Not supported in this environment (requires http://localhost or https)";
      resultEl.hidden = false; emptyEl.hidden = true;
      return;
    }

    var parts = token.split(".");
    if (parts.length !== 3) {
      statusEl.className = "jwt-status fail";
      statusEl.textContent = "✕ Invalid JWT format (should be three parts: header.payload.signature)";
      resultEl.hidden = false; emptyEl.hidden = true;
      headerEl.textContent = ""; payloadEl.textContent = "";
      sigEl.innerHTML = "";
      return;
    }

    var headerSeg = parts[0], payloadSeg = parts[1], sigSeg = parts[2];
    var header = decodeSegment(headerSeg);
    var payload = decodeSegment(payloadSeg);

    if (!header.json || !header.json.alg) {
      statusEl.className = "jwt-status fail";
      statusEl.textContent = "✕ Cannot parse the Header, or the alg field is missing";
      resultEl.hidden = false; emptyEl.hidden = true;
      return;
    }

    var alg = header.json.alg;
    var hashName = hashForAlg(alg);
    if (!hashName) {
      statusEl.className = "jwt-status unknown";
      statusEl.textContent = "? Unsupported algorithm: " + alg;
      resultEl.hidden = false; emptyEl.hidden = true;
      return;
    }

    var data = headerSeg + "." + payloadSeg;

    if (alg.indexOf("HS") === 0) {
      keyLabel.textContent = "Key (HMAC secret)";
      keyHint.textContent = "Enter the shared secret used for signing (treated as UTF-8 text).";
      if (!key) { showToast("Please enter the HMAC key"); return; }
      verifyHmac(alg, hashName, key, data, sigSeg);
    } else if (alg.indexOf("RS") === 0) {
      keyLabel.textContent = "RSA Public Key (PEM format)";
      keyHint.textContent = "Enter a PEM public key starting with -----BEGIN PUBLIC KEY-----.";
      if (!key) { showToast("Please enter the RSA public key in PEM"); return; }
      verifyRsa(alg, hashName, key, data, sigSeg);
    }

    // 展示解析结果（无论验证结果）
    headerEl.innerHTML = syntaxHighlight(header.json ? header.json : header.raw);
    payloadEl.innerHTML = syntaxHighlight(payload.json ? payload.json : payload.raw);
    resultEl.hidden = false;
    emptyEl.hidden = true;
  }

  function verifyHmac(alg, hashName, secret, data, givenSig) {
    var secretBytes = new TextEncoder().encode(secret);
    var dataBytes = new TextEncoder().encode(data);
    crypto.subtle.importKey(
      "raw", secretBytes,
      { name: "HMAC", hash: { name: hashName } },
      false, ["sign"]
    ).then(function (keyObj) {
      return crypto.subtle.sign("HMAC", keyObj, dataBytes);
    }).then(function (buf) {
      var computed = b64urlFromBytes(new Uint8Array(buf));
      var given = normalizeB64url(givenSig);
      var ok = computed === given;
      showStatus(ok, "HMAC " + alg);
      showSigComparison(computed, given, ok, false);
    }).catch(function (e) {
      statusEl.className = "jwt-status fail";
      statusEl.textContent = "✕ Computation failed: " + e.message;
      sigEl.innerHTML = "";
    });
  }

  function verifyRsa(alg, hashName, pem, data, givenSig) {
    var spki;
    try {
      spki = pemToSpki(pem);
    } catch (e) {
      statusEl.className = "jwt-status fail";
      statusEl.textContent = "✕ Public key parsing failed: " + e.message;
      sigEl.innerHTML = "";
      return;
    }
    var dataBytes = new TextEncoder().encode(data);
    var sigBytes = b64urlToBytes(givenSig);
    crypto.subtle.importKey(
      "spki", spki,
      { name: "RSASSA-PKCS1-v1_5", hash: { name: hashName } },
      false, ["verify"]
    ).then(function (keyObj) {
      return crypto.subtle.verify(
        { name: "RSASSA-PKCS1-v1_5" },
        keyObj, sigBytes, dataBytes
      );
    }).then(function (valid) {
      showStatus(!!valid, "RSA " + alg);
      // 公钥无法计算签名，仅展示给定签名
      sigEl.innerHTML =
        row("Algorithm", alg) +
        row("Given Signature", givenSig, "") +
        "<div class='row'><span class='k'>Note</span><span class='v'>Asymmetric signatures are computed with the private key; the public key is only used for verification and cannot reproduce the signature.</span></div>";
    }).catch(function (e) {
      statusEl.className = "jwt-status fail";
      statusEl.textContent = "✕ Verification failed: " + e.message;
      sigEl.innerHTML = "";
    });
  }

  function pemToSpki(pem) {
    var b64 = pem
      .replace(/-----BEGIN [^-]+-----/g, "")
      .replace(/-----END [^-]+-----/g, "")
      .replace(/\s+/g, "");
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  function normalizeB64url(s) {
    return s.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  }

  function showStatus(ok, alg) {
    if (ok) {
      statusEl.className = "jwt-status pass";
      statusEl.textContent = "✓ Signature verified （" + alg + "）";
    } else {
      statusEl.className = "jwt-status fail";
      statusEl.textContent = "✕ Signature verification failed （" + alg + "）";
    }
  }

  function showSigComparison(computed, given, ok, isRsa) {
    var cls = ok ? "match" : "mismatch";
    sigEl.innerHTML =
      row("Algorithm", isRsa ? "RSA" : "HMAC") +
      row("Computed Signature", computed, cls) +
      row("JWT Signature", given, cls) +
      row("Comparison", ok ? "Match ✓" : "Mismatch ✕", cls);
  }

  function row(k, v, cls) {
    return '<div class="row"><span class="k">' + k + '</span><span class="v ' +
      (cls || "") + '">' + escapeHtml(v) + "</span></div>";
  }

  /* ---------- JSON 语法高亮 + 标准字段高亮 ---------- */
  function syntaxHighlight(obj) {
    var json = (typeof obj === "string") ? obj : JSON.stringify(obj, null, 2);
    json = escapeHtml(json);
    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      function (match) {
        var cls = "tok-num";
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            var name = match.slice(1, match.lastIndexOf('"'));
            cls = STANDARD_CLAIMS.indexOf(name) > -1 ? "tok-key jwt-std" : "tok-key";
            return '<span class="' + cls + '">' + match + "</span>";
          }
          cls = "tok-str";
        } else if (/true|false/.test(match)) {
          cls = "tok-com";
        } else if (/null/.test(match)) {
          cls = "tok-com";
        }
        return '<span class="' + cls + '">' + match + "</span>";
      }
    );
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  document.getElementById("btnVerify").addEventListener("click", verify);

  if (!hasSubtle) secureNote.hidden = false;

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
