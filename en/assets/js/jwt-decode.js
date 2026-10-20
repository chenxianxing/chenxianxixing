/* ============================================================
   JWT解析 - 工具页逻辑
   三段式 Token 实时解析 / base64url 解码 / 标准字段高亮
   ============================================================ */
(function () {
  "use strict";

  var input = document.getElementById("jwtInput");
  var headerOut = document.getElementById("jwtHeader");
  var payloadOut = document.getElementById("jwtPayload");
  var sigOut = document.getElementById("jwtSig");
  var errorBox = document.getElementById("jwtError");
  var claimsWrap = document.getElementById("jwtClaims");
  var claimsBody = document.getElementById("jwtClaimsBody");

  var STD_CLAIMS = {
    iss: "Issuer",
    sub: "Subject / User ID",
    aud: "Audience",
    exp: "Expiration Time (Unix timestamp in seconds)",
    iat: "Issued At (Unix timestamp in seconds)",
    nbf: "Not Before (Unix timestamp in seconds); not usable before this time",
    jti: "JWT ID (unique identifier)"
  };
  var TIME_CLAIMS = ["exp", "iat", "nbf"];

  function b64urlDecode(str) {
    var s = String(str).replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4 !== 0) s += "=";
    var bin;
    try {
      bin = atob(s);
    } catch (e) {
      throw new Error("Unable to decode: invalid base64 content");
    }
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    try {
      return new TextDecoder("utf-8").decode(bytes);
    } catch (e) {
      return bin;
    }
  }

  function decodeAndParse(part, name) {
    var text = b64urlDecode(part);
    try {
      return { text: text, json: JSON.parse(text) };
    } catch (e) {
      throw new Error(name + " is not valid JSON after decoding: " + (e && e.message ? e.message : String(e)));
    }
  }

  function pretty(obj) {
    return JSON.stringify(obj, null, 2);
  }

  function fmtTime(sec) {
    var n = Number(sec);
    if (!isFinite(n) || n < 0) return null;
    var d = new Date(n * 1000);
    if (isNaN(d.getTime())) return null;
    var pad = function (x) { return x < 10 ? "0" + x : "" + x; };
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " +
      pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function clearOutputs() {
    headerOut.value = "";
    payloadOut.value = "";
    sigOut.value = "";
    claimsWrap.hidden = true;
    claimsBody.innerHTML = "";
  }

  function renderClaims(payload) {
    if (!payload || typeof payload !== "object") { claimsWrap.hidden = true; return; }
    var rows = [];
    var has = false;
    Object.keys(STD_CLAIMS).forEach(function (key) {
      if (!(key in payload)) return;
      has = true;
      var val = payload[key];
      var valHtml = escapeHtml(typeof val === "string" ? val : JSON.stringify(val));
      var extra = "";
      if (TIME_CLAIMS.indexOf(key) > -1) {
        var t = fmtTime(val);
        if (t) {
          if (key === "exp") {
            var expired = Number(val) * 1000 < Date.now();
            extra = '<span class="jwt-time">（' + t + '）' +
              (expired ? '<span class="badge red">Expired</span>' : '<span class="badge green">Not expired</span>') + '</span>';
          } else if (key === "nbf") {
            var notYet = Number(val) * 1000 > Date.now();
            extra = '<span class="jwt-time">（' + t + '）' +
              (notYet ? '<span class="badge red">Not yet valid</span>' : '<span class="badge green">Valid</span>') + '</span>';
          } else if (key === "iat") {
            extra = '<span class="jwt-time">（' + t + '）</span>';
          }
        }
      }
      rows.push(
        '<tr><td class="claim-std">' + key + '</td><td>' + valHtml + extra + '</td><td style="color:var(--muted);white-space:normal;">' +
        escapeHtml(STD_CLAIMS[key]) + '</td></tr>'
      );
    });
    if (!has) { claimsWrap.hidden = true; return; }
    claimsBody.innerHTML = rows.join("");
    claimsWrap.hidden = false;
  }

  function parse() {
    errorBox.hidden = true;
    var raw = input.value.trim();
    if (!raw) { clearOutputs(); return; }

    var parts = raw.split(".");
    if (parts.length !== 3) {
      clearOutputs();
      errorBox.hidden = false;
      errorBox.textContent = "Invalid JWT: expected the three-part format Header.Payload.Signature separated by dots, but found " + parts.length + " segments.";
      return;
    }
    if (parts[0] === "" || parts[1] === "") {
      clearOutputs();
      errorBox.hidden = false;
      errorBox.textContent = "Invalid JWT: the Header or Payload is empty. Please check whether a part is missing.";
      return;
    }

    try {
      var h = decodeAndParse(parts[0], "Header");
      var p = decodeAndParse(parts[1], "Payload");
      headerOut.value = pretty(h.json);
      payloadOut.value = pretty(p.json);
      sigOut.value = parts[2];
      renderClaims(p.json);
    } catch (e) {
      clearOutputs();
      errorBox.hidden = false;
      errorBox.textContent = "Parse failed: " + (e && e.message ? e.message : String(e));
    }
  }

  /* ---------- 事件绑定 ---------- */
  input.addEventListener("input", parse);

  document.getElementById("btnCopyHeader").addEventListener("click", function () {
    if (!headerOut.value) { showToast("Header is empty"); return; }
    copyText(headerOut.value, "Header copied");
  });
  document.getElementById("btnCopyPayload").addEventListener("click", function () {
    if (!payloadOut.value) { showToast("Payload is empty"); return; }
    copyText(payloadOut.value, "Payload copied");
  });
  document.getElementById("btnCopySig").addEventListener("click", function () {
    if (!sigOut.value) { showToast("Signature is empty"); return; }
    copyText(sigOut.value, "Signature copied");
  });

  /* ---------- 通用工具 ---------- */
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
