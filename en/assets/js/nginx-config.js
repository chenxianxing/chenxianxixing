/* ============================================================
   Nginx 配置生成器 - 工具页逻辑
   表单生成静态站 / SPA / 反向代理的 server 配置
   ============================================================ */
(function () {
  "use strict";

  /* ---------- DOM ---------- */
  var serverName = document.getElementById("ngxServerName");
  var port = document.getElementById("ngxPort");
  var typeRow = document.getElementById("ngxTypeRow");
  var rootInput = document.getElementById("ngxRoot");
  var upstreamInput = document.getElementById("ngxUpstream");
  var cmbs = document.getElementById("ngxCmbs");
  var wwwRow = document.getElementById("ngxWwwRow");
  var httpsCb = document.getElementById("ngxHttps");
  var gzipCb = document.getElementById("ngxGzip");
  var cacheCb = document.getElementById("ngxCache");
  var wsCb = document.getElementById("ngxWs");
  var secCb = document.getElementById("ngxSec");
  var httpsWrap = document.getElementById("ngxHttpsWrap");
  var rootWrap = document.getElementById("ngxRootWrap");
  var upstreamWrap = document.getElementById("ngxUpstreamWrap");
  var cert = document.getElementById("ngxCert");
  var key = document.getElementById("ngxKey");
  var http2Row = document.getElementById("ngxHttp2Row");
  var hstsRow = document.getElementById("ngxHstsRow");
  var output = document.getElementById("ngxOutput");
  var btnSample = document.getElementById("ngxBtnSample");
  var btnCopy = document.getElementById("ngxBtnCopy");
  var btnDownload = document.getElementById("ngxBtnDownload");

  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  var currentText = "";

  /* ---------- 提示 ---------- */
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2000);
  }

  /* ---------- 单选行辅助 ---------- */
  function bindRadio(row) {
    Array.prototype.forEach.call(row.querySelectorAll("label"), function (label) {
      label.addEventListener("click", function () {
        Array.prototype.forEach.call(row.querySelectorAll("label"), function (l) { l.classList.remove("checked"); });
        label.classList.add("checked");
      });
    });
  }
  function radioVal(row) {
    var c = row.querySelector("input:checked");
    return c ? c.value : "";
  }
  bindRadio(typeRow);
  bindRadio(wwwRow);
  bindRadio(http2Row);
  bindRadio(hstsRow);

  /* ---------- 复制 / 下载 ---------- */
  function copyText(text, okMsg) {
    if (!text) { showToast("Nothing to copy"); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { showToast(okMsg || "Copied"); },
        function () { fallbackCopy(text, okMsg); }
      );
    } else {
      fallbackCopy(text, okMsg);
    }
  }
  function fallbackCopy(text, okMsg) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); showToast(okMsg || "Copied"); }
    catch (e) { showToast("Copy failed"); }
    document.body.removeChild(ta);
  }
  function downloadFile(filename, text) {
    var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 100);
  }

  /* ---------- 域名辅助 ---------- */
  function isDomain(s) {
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(s);
  }
  function addWww(s) {
    return /^www\./i.test(s) ? s : "www." + s;
  }
  function stripWww(s) {
    return s.replace(/^www\./i, "");
  }

  /* ---------- 生成 ---------- */
  function generate() {
    var names = (serverName.value.trim() || "example.com").split(/\s+/).filter(Boolean);
    var portVal = parseInt(port.value, 10);
    if (!portVal || portVal < 1) portVal = 80;
    var type = radioVal(typeRow) || "static";
    var rootVal = rootInput.value.trim() || "/var/www/html";
    var upstreamVal = upstreamInput.value.trim() || "127.0.0.1:8080";
    var cmbsVal = cmbs.value.trim() || "10m";
    var www = radioVal(wwwRow) || "none";
    var https = httpsCb.checked;
    var gzip = gzipCb.checked;
    var cache = cacheCb.checked;
    var ws = wsCb.checked;
    var sec = secCb.checked;
    var certVal = cert.value.trim() || "/etc/nginx/ssl/example.com.crt";
    var keyVal = key.value.trim() || "/etc/nginx/ssl/example.com.key";
    var http2 = radioVal(http2Row) === "on";
    var hsts = radioVal(hstsRow) === "on";

    var parts = [];

    if (https) {
      parts.push(
        "server {\n" +
        "    listen 80;\n" +
        "    server_name " + names.join(" ") + ";\n" +
        "    return 301 https://$host$request_uri;\n" +
        "}"
      );
    }

    var listenPort = https ? 443 : portVal;
    var listenLine = "    listen " + listenPort + (https ? " ssl" : "") + (https && http2 ? " http2" : "") + ";";
    var serverNameLine = "    server_name " + names.join(" ") + ";";

    var body = [];
    body.push("    client_max_body_size " + cmbsVal + ";");

    if (https) {
      body.push("    ssl_certificate " + certVal + ";");
      body.push("    ssl_certificate_key " + keyVal + ";");
      body.push("    ssl_protocols TLSv1.2 TLSv1.3;");
      body.push("    ssl_session_cache shared:SSL:10m;");
      body.push("    ssl_session_timeout 10m;");
      if (hsts) body.push("    add_header Strict-Transport-Security \"max-age=31536000; includeSubDomains\" always;");
    }

    if (gzip) {
      body.push("");
      body.push("    gzip on;");
      body.push("    gzip_comp_level 5;");
      body.push("    gzip_min_length 1024;");
      body.push("    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;");
    }

    if (sec) {
      body.push("");
      body.push("    add_header X-Frame-Options \"SAMEORIGIN\" always;");
      body.push("    add_header X-Content-Type-Options \"nosniff\" always;");
      body.push("    add_header X-XSS-Protection \"1; mode=block\" always;");
      body.push("    add_header Referrer-Policy \"strict-origin-when-cross-origin\" always;");
    }

    if (www !== "none" && isDomain(names[0])) {
      var from, to;
      if (www === "add") { from = stripWww(names[0]); to = addWww(names[0]); }
      else { from = addWww(names[0]); to = stripWww(names[0]); }
      body.push("");
      body.push("# www redirect (for production, a separate server block is recommended for better performance)");
      body.push("    if ($host = \"" + from + "\") {");
      body.push("        return 301 " + (https ? "https" : "$scheme") + "://" + to + "$request_uri;");
      body.push("    }");
    }

    if (type === "proxy") {
      body.push("");
      body.push("    location / {");
      body.push("        proxy_pass http://" + upstreamVal + ";");
      body.push("        proxy_http_version 1.1;");
      body.push("        proxy_set_header Host $host;");
      body.push("        proxy_set_header X-Real-IP $remote_addr;");
      body.push("        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;");
      body.push("        proxy_set_header X-Forwarded-Proto $scheme;");
      if (ws) {
        body.push("        proxy_set_header Upgrade $http_upgrade;");
        body.push("        proxy_set_header Connection \"upgrade\";");
        body.push("        proxy_read_timeout 3600s;");
      }
      body.push("    }");
    } else {
      body.push("");
      body.push("    root " + rootVal + ";");
      body.push("    index " + (type === "spa" ? "index.html;" : "index.html index.htm;"));
      body.push("");
      body.push("    location / {");
      body.push("        " + (type === "spa" ? "try_files $uri $uri/ /index.html;" : "try_files $uri $uri/ =404;"));
      body.push("    }");
    }

    if (cache) {
      body.push("");
      body.push("    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$ {");
      body.push("        expires 30d;");
      body.push("        add_header Cache-Control \"public, immutable\";");
      body.push("    }");
    }

    parts.push("server {\n" + listenLine + "\n" + serverNameLine + "\n" + body.join("\n") + "\n}");

    var text = parts.join("\n\n");
    output.textContent = text;
    currentText = text;
  }

  /* ---------- 可见性 ---------- */
  function syncVisibility() {
    var type = radioVal(typeRow) || "static";
    rootWrap.classList.toggle("ngx-hidden", type === "proxy");
    upstreamWrap.classList.toggle("ngx-hidden", type !== "proxy");
    httpsWrap.classList.toggle("ngx-hidden", !httpsCb.checked);
    generate();
  }

  /* ---------- 示例 ---------- */
  function loadSample() {
    serverName.value = "app.example.com";
    port.value = "80";
    typeRow.querySelector('input[value="proxy"]').checked = true;
    Array.prototype.forEach.call(typeRow.querySelectorAll("label"), function (l) {
      l.classList.toggle("checked", !!l.querySelector("input").checked);
    });
    upstreamInput.value = "127.0.0.1:3000";
    cmbs.value = "20m";
    wwwRow.querySelector('input[value="add"]').checked = true;
    Array.prototype.forEach.call(wwwRow.querySelectorAll("label"), function (l) {
      l.classList.toggle("checked", !!l.querySelector("input").checked);
    });
    httpsCb.checked = true;
    gzipCb.checked = true;
    cacheCb.checked = true;
    wsCb.checked = true;
    secCb.checked = true;
    syncVisibility();
    showToast("Sample loaded");
  }

  /* ---------- 事件 ---------- */
  btnSample.addEventListener("click", loadSample);
  btnCopy.addEventListener("click", function () {
    if (!currentText) { showToast("Nothing to copy"); return; }
    copyText(currentText, "Config copied");
  });
  btnDownload.addEventListener("click", function () {
    if (!currentText) { showToast("Nothing to copy"); return; }
    downloadFile("nginx-site.conf", currentText);
    showToast(".conf downloaded");
  });

  [serverName, port, rootInput, upstreamInput, cmbs, cert, key].forEach(function (el) {
    el.addEventListener("input", generate);
  });
  [typeRow, wwwRow, http2Row, hstsRow].forEach(function (el) {
    el.addEventListener("change", syncVisibility);
  });
  [httpsCb, gzipCb, cacheCb, wsCb, secCb].forEach(function (el) {
    el.addEventListener("change", generate);
  });

  /* ---------- 初始化 ---------- */
  syncVisibility();
})();
