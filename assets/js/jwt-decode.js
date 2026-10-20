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
    iss: "签发者（Issuer）",
    sub: "主题 / 用户标识（Subject）",
    aud: "受众（Audience）",
    exp: "过期时间（Expiration Time，秒级时间戳）",
    iat: "签发时间（Issued At，秒级时间戳）",
    nbf: "生效时间之前不可用（Not Before，秒级时间戳）",
    jti: "JWT 唯一标识（JWT ID）"
  };
  var TIME_CLAIMS = ["exp", "iat", "nbf"];

  function b64urlDecode(str) {
    var s = String(str).replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4 !== 0) s += "=";
    var bin;
    try {
      bin = atob(s);
    } catch (e) {
      throw new Error("无法解码：base64 内容非法");
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
      throw new Error(name + " 解码后不是合法 JSON：" + (e && e.message ? e.message : String(e)));
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
              (expired ? '<span class="badge red">已过期</span>' : '<span class="badge green">未过期</span>') + '</span>';
          } else if (key === "nbf") {
            var notYet = Number(val) * 1000 > Date.now();
            extra = '<span class="jwt-time">（' + t + '）' +
              (notYet ? '<span class="badge red">尚未生效</span>' : '<span class="badge green">已生效</span>') + '</span>';
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
      errorBox.textContent = "无效的 JWT：应为「Header.Payload.Signature」三段式，用点号分隔，当前识别到 " + parts.length + " 段。";
      return;
    }
    if (parts[0] === "" || parts[1] === "") {
      clearOutputs();
      errorBox.hidden = false;
      errorBox.textContent = "无效的 JWT：Header 或 Payload 为空，请检查是否遗漏了某一段。";
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
      errorBox.textContent = "解析失败：" + (e && e.message ? e.message : String(e));
    }
  }

  /* ---------- 事件绑定 ---------- */
  input.addEventListener("input", parse);

  document.getElementById("btnCopyHeader").addEventListener("click", function () {
    if (!headerOut.value) { showToast("Header 为空"); return; }
    copyText(headerOut.value, "已复制 Header");
  });
  document.getElementById("btnCopyPayload").addEventListener("click", function () {
    if (!payloadOut.value) { showToast("Payload 为空"); return; }
    copyText(payloadOut.value, "已复制 Payload");
  });
  document.getElementById("btnCopySig").addEventListener("click", function () {
    if (!sigOut.value) { showToast("Signature 为空"); return; }
    copyText(sigOut.value, "已复制 Signature");
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
