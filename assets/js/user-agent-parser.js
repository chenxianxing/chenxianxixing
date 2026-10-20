/* ============================================================
   User-Agent解析 - 工具页逻辑
   本地正则解析：浏览器/版本、渲染引擎、操作系统/版本、设备类型、是否爬虫
   ============================================================ */
(function () {
  "use strict";

  var inputEl = document.getElementById("uaInput");
  var resultEl = document.getElementById("uaResult");
  var jsonEl = document.getElementById("uaJson");

  /* 常用 UA 示例 */
  var SAMPLES = {
    chrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    wechat: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.48(0x18003023) NetType/WIFI Language/zh_CN",
    googlebot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
  };

  /* ---------- 解析主函数 ---------- */
  function parseUA(ua) {
    ua = (ua || "").trim();
    if (!ua) return null;

    var res = {
      ua: ua,
      browser: "未知",
      browserVersion: "",
      engine: "未知",
      os: "未知",
      osVersion: "",
      device: "未知",
      isBot: false,
      botName: ""
    };

    res.browser = detectBrowser(ua, res);
    res.engine = detectEngine(ua);
    detectOS(ua, res);
    res.device = detectDevice(ua);
    detectBot(ua, res);

    return res;
  }

  function first(re, s) {
    var m = s.match(re);
    return m ? m[1] : "";
  }

  function detectBrowser(ua, res) {
    var v;
    if ((v = first(/MicroMessenger\/([\d.]+)/, ua))) { res.browserVersion = v; return "微信内置浏览器"; }
    if ((v = first(/QQ\/([\d.]+)/, ua)) || /QQBrowser/i.test(ua)) { if (v) res.browserVersion = v; return "QQ内置浏览器"; }
    if (/DingTalk/i.test(ua)) { res.browserVersion = first(/DingTalk\/([\d.]+)/, ua); return "钉钉"; }
    if (/wxwork/i.test(ua)) { return "企业微信"; }
    if ((v = first(/Edg[AOS]?\/([\d.]+)/, ua))) { res.browserVersion = v; return "Microsoft Edge"; }
    if ((v = first(/OPR\/([\d.]+)/, ua))) { res.browserVersion = v; return "Opera"; }
    if (/Opera/i.test(ua) && /Presto/i.test(ua)) { res.browserVersion = first(/Opera\/([\d.]+)/, ua); return "Opera"; }
    if ((v = first(/Firefox\/([\d.]+)/, ua))) { res.browserVersion = v; return "Firefox"; }
    if ((v = first(/(?:Chrome|CrMo|CriOS)\/([\d.]+)/, ua))) { res.browserVersion = v; return "Chrome"; }
    if ((v = first(/Chromium\/([\d.]+)/, ua))) { res.browserVersion = v; return "Chromium"; }
    if ((v = first(/Version\/([\d.]+).*Safari/, ua))) { res.browserVersion = v; return "Safari"; }
    if ((v = first(/Safari\/([\d.]+)/, ua))) { res.browserVersion = v; return "Safari"; }
    if ((v = first(/MSIE ([\d.]+)/, ua))) { res.browserVersion = v; return "Internet Explorer"; }
    if (ua.indexOf("Trident") > -1) { res.browserVersion = first(/rv:([\d.]+)/, ua); return "Internet Explorer"; }
    return "未知";
  }

  function detectEngine(ua) {
    if (ua.indexOf("Trident") > -1) return "Trident";
    if (ua.indexOf("Gecko") > -1 && ua.indexOf("Firefox") > -1) return "Gecko";
    if (ua.indexOf("Presto") > -1) return "Presto";
    if (/Edg[AOS]?\/|OPR\/|Chrome\/|Chromium\/|CriOS\/|CrMo\//.test(ua)) return "Blink";
    if (ua.indexOf("AppleWebKit") > -1) return "WebKit";
    return "未知";
  }

  function detectOS(ua, res) {
    var v;
    if ((v = first(/Windows NT ([\d.]+)/, ua))) {
      res.os = "Windows";
      res.osVersion = ntVersion(v);
      if (/Windows Phone/i.test(ua)) res.os = "Windows Phone";
      return;
    }
    if (/iPhone|iPad|iPod/.test(ua)) {
      res.os = /iPad/.test(ua) ? "iPadOS" : "iOS";
      res.osVersion = first(/OS ([\d_]+)/, ua).replace(/_/g, ".");
      return;
    }
    if ((v = first(/Mac OS X ([\d._]+)/, ua))) {
      res.os = "macOS";
      res.osVersion = v.replace(/_/g, ".");
      return;
    }
    if ((v = first(/Android[ /]?([\d.]+)/, ua))) {
      res.os = "Android";
      res.osVersion = v;
      return;
    }
    if (/CrOS/.test(ua)) { res.os = "ChromeOS"; res.osVersion = first(/CrOS \S+ ([\d.]+)/, ua); return; }
    if (/Linux/.test(ua)) { res.os = "Linux"; return; }
  }

  function ntVersion(v) {
    var map = {
      "10.0": "10 / 11", "6.3": "8.1", "6.2": "8", "6.1": "7",
      "6.0": "Vista", "5.2": "XP x64", "5.1": "XP"
    };
    return map[v] || v;
  }

  function detectDevice(ua) {
    if (/iPod|iPhone/.test(ua)) return "手机";
    if (/iPad/.test(ua)) return "平板";
    if (/Windows Phone|Windows Mobile/.test(ua)) return "手机";
    if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? "手机" : "平板";
    if (/Tablet|iPad/i.test(ua)) return "平板";
    if (/Linux|Mac OS X|Windows|CrOS/.test(ua)) return "桌面";
    return "未知";
  }

  function detectBot(ua, res) {
    var bots = [
      [/Googlebot/i, "Googlebot"],
      [/bingbot/i, "Bingbot"],
      [/Baiduspider/i, "Baiduspider（百度爬虫）"],
      [/YandexBot/i, "YandexBot"],
      [/Sogou/i, "Sogou（搜狗爬虫）"],
      [/Bytespider/i, "Bytespider（字节爬虫）"],
      [/360Spider/i, "360Spider"],
      [/YoudaoBot/i, "YoudaoBot（有道爬虫）"],
      [/AppleBot/i, "AppleBot"],
      [/Twitterbot/i, "Twitterbot"],
      [/facebookexternalhit/i, "FacebookBot"],
      [/LinkedInBot/i, "LinkedInBot"],
      [/TelegramBot/i, "TelegramBot"],
      [/SemrushBot/i, "SemrushBot"],
      [/AhrefsBot/i, "AhrefsBot"],
      [/DotBot/i, "DotBot"]
    ];
    for (var i = 0; i < bots.length; i++) {
      if (bots[i][0].test(ua)) {
        res.isBot = true;
        res.botName = bots[i][1];
        if (res.browser === "未知") res.browser = bots[i][1];
        return;
      }
    }
    if (/spider|bot|crawler|slurp|mediapartners|curl\/|wget|python-requests|java\//i.test(ua)) {
      res.isBot = true;
      res.botName = "爬虫/机器人（通用）";
    }
  }

  /* ---------- 渲染 ---------- */
  function render(res) {
    if (!res) {
      resultEl.innerHTML = '<div class="empty-tip" style="grid-column:1/-1;">输入 UA 后点击「解析」即可查看结果。</div>';
      jsonEl.value = "";
      return;
    }

    var cards = "";
    cards += card("浏览器", res.browser + (res.browserVersion ? " <span class=\"badge blue\">" + esc(res.browserVersion) + "</span>" : ""));
    cards += card("渲染引擎", res.engine);
    cards += card("操作系统", res.os + (res.osVersion ? " <span class=\"badge\">" + esc(res.osVersion) + "</span>" : ""));
    cards += card("设备类型", res.device);
    var botVal = res.isBot
      ? "是 <span class=\"badge red\">" + esc(res.botName) + "</span>"
      : "否 <span class=\"badge green\">正常用户</span>";
    cards += card("是否爬虫", botVal);

    resultEl.innerHTML = cards;

    var warn = resultEl.parentNode.querySelector(".ua-bot-warn");
    if (warn) warn.remove();
    if (res.isBot) {
      var w = document.createElement("div");
      w.className = "warn-note ua-bot-warn";
      w.textContent = "该 UA 被识别为爬虫/机器人（" + res.botName + "），通常来自搜索引擎或自动化程序。";
      resultEl.parentNode.insertBefore(w, resultEl.nextSibling);
    }

    jsonEl.value = JSON.stringify({
      browser: res.browser,
      browserVersion: res.browserVersion,
      engine: res.engine,
      os: res.os,
      osVersion: res.osVersion,
      device: res.device,
      isBot: res.isBot,
      botName: res.botName,
      userAgent: res.ua
    }, null, 2);
  }

  function card(k, vHtml) {
    return '<div class="ua-card"><div class="k">' + k + '</div><div class="v">' + vHtml + "</div></div>";
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- 事件 ---------- */
  document.getElementById("uaParse").addEventListener("click", function () {
    var res = parseUA(inputEl.value);
    if (!res) { showToast("请输入 UA 字符串"); return; }
    render(res);
  });

  document.getElementById("uaUseCurrent").addEventListener("click", function () {
    inputEl.value = navigator.userAgent;
    render(parseUA(inputEl.value));
    showToast("已填入当前浏览器 UA");
  });

  Array.prototype.forEach.call(document.querySelectorAll(".ua-chip"), function (chip) {
    chip.addEventListener("click", function () {
      var key = chip.getAttribute("data-key");
      if (SAMPLES[key]) {
        inputEl.value = SAMPLES[key];
        render(parseUA(inputEl.value));
      }
    });
  });

  document.getElementById("uaCopy").addEventListener("click", function () {
    if (!jsonEl.value) { showToast("暂无解析结果"); return; }
    copyText(jsonEl.value, "已复制解析 JSON");
  });

  document.getElementById("uaClear").addEventListener("click", function () {
    inputEl.value = "";
    render(null);
  });

  /* 页面加载自动填入当前 UA 并解析 */
  inputEl.value = navigator.userAgent;
  render(parseUA(inputEl.value));

  /* ---------- 工具函数 ---------- */
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
