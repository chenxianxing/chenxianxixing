/* ============================================================
   密码强度检测 - 工具页逻辑
   维度：长度、字符种类、重复模式、连续序列、弱密码字典
   熵值 + 破解时间估算 + 五档评级 + 改进建议
   纯本地检测，密码不上传
   ============================================================ */
(function () {
  "use strict";

  var input = document.getElementById("psInput");
  var showChk = document.getElementById("psShow");
  var bar = document.getElementById("psBar");
  var label = document.getElementById("psLabel");
  var statsEl = document.getElementById("psStats");
  var crackEl = document.getElementById("psCrack");
  var tipsWrap = document.getElementById("psTipsWrap");
  var tipsEl = document.getElementById("psTips");
  var emptyEl = document.getElementById("psEmpty");

  /* ---------- 常见弱密码字典（top ~80） ---------- */
  var WEAK = [
    "123456", "password", "12345678", "qwerty", "123456789", "12345", "1234",
    "111111", "1234567", "dragon", "123123", "baseball", "abc123", "football",
    "monkey", "letmein", "696969", "shadow", "master", "666666", "qwertyuiop",
    "123321", "mustang", "1234567890", "michael", "654321", "superman", "1qaz2wsx",
    "7777777", "121212", "000000", "qazwsx", "123qwe", "killer", "trustno1",
    "jordan", "jennifer", "zxcvbnm", "asdfgh", "passw0rd", "p@ssword", "iloveyou",
    "admin", "welcome", "login", "pass", "test", "guest", "root", "user",
    "changeme", "password1", "pokemon", "azerty", "aaaaaa", "11111111", "5201314",
    "123abc", "q1w2e3r4", "google", "yankees", "basketball", "password123",
    "987654321", "1q2w3e4r", "photoshop", "starwars", "princess", "sunshine",
    "liverpool", "batman", "charlie", "andrew", "tigger", "freedom", "hello",
    "naruto", "jin123", "123456a", "qwerty123", "abcd1234", "1qazxsw2", "zaq12wsx"
  ];
  var WEAK_SET = {};
  WEAK.forEach(function (w) { WEAK_SET[w] = 1; });

  /* ---------- 检测逻辑 ---------- */
  function analyze(pw) {
    var len = pw.length;
    var hasLower = /[a-z]/.test(pw);
    var hasUpper = /[A-Z]/.test(pw);
    var hasDigit = /[0-9]/.test(pw);
    var hasSymbol = /[^a-zA-Z0-9]/.test(pw);

    var classes = (hasLower ? 1 : 0) + (hasUpper ? 1 : 0) + (hasDigit ? 1 : 0) + (hasSymbol ? 1 : 0);

    // 字符池（基于实际出现的种类）
    var pool = 0;
    if (hasLower) pool += 26;
    if (hasUpper) pool += 26;
    if (hasDigit) pool += 10;
    if (hasSymbol) pool += 33;

    var baseEntropy = len * (pool > 1 ? Math.log(pool) / Math.log(2) : 0);

    // 惩罚项
    var penalty = 0;
    var issues = {};

    // 重复字符：连续 3+ 相同
    var repeatRun = 0, maxRepeat = 0;
    for (var i = 1; i < len; i++) {
      if (pw[i] === pw[i - 1]) { repeatRun++; maxRepeat = Math.max(maxRepeat, repeatRun); }
      else repeatRun = 0;
    }
    if (maxRepeat >= 2) {
      penalty += 8;
      issues.repeat = true;
    }

    // 连续序列：数字 123、字母 abc、键盘 qwerty
    if (hasSequence(pw)) {
      penalty += 10;
      issues.seq = true;
    }

    // 弱密码字典
    if (WEAK_SET[pw.toLowerCase()]) {
      penalty += 30;
      issues.dict = true;
    }

    var effective = Math.max(0, baseEntropy - penalty);
    return {
      len: len, classes: classes, pool: pool,
      baseEntropy: baseEntropy, effective: effective,
      hasLower: hasLower, hasUpper: hasUpper, hasDigit: hasDigit, hasSymbol: hasSymbol,
      issues: issues
    };
  }

  function hasSequence(pw) {
    var low = pw.toLowerCase();
    var keyboards = ["abcdefghijklmnopqrstuvwxyz", "qwertyuiop", "asdfghjkl", "zxcvbnm"];
    for (var k = 0; k < keyboards.length; k++) {
      var s = keyboards[k];
      for (var i = 0; i < s.length - 2; i++) {
        var fwd = s.substr(i, 3);
        var rev = fwd.split("").reverse().join("");
        if (low.indexOf(fwd) > -1 || low.indexOf(rev) > -1) return true;
      }
    }
    // 数字递增/递减
    for (var j = 0; j < low.length - 2; j++) {
      var a = low.charCodeAt(j), b = low.charCodeAt(j + 1), c = low.charCodeAt(j + 2);
      if (b - a === 1 && c - b === 1) return true;
      if (a - b === 1 && b - c === 1) return true;
    }
    return false;
  }

  /* ---------- 评级 ---------- */
  function level(e) {
    if (e < 28) return { name: "Very Weak", color: "#dc2626" };
    if (e < 36) return { name: "Weak", color: "#ea580c" };
    if (e < 60) return { name: "Medium", color: "#d97706" };
    if (e < 128) return { name: "Strong", color: "#059669" };
    return { name: "Very Strong", color: "#047857" };
  }

  /* ---------- 破解时间 ---------- */
  function crackTime(entropy) {
    var guesses = Math.pow(2, entropy); // 理论猜测次数
    return {
      fast: fmtTime(guesses / 1e10),
      slow: fmtTime(guesses / 1e4),
      online: fmtTime(guesses / (100 / 3600))
    };
  }

  function fmtTime(seconds) {
    if (!isFinite(seconds) || seconds <= 0) return "Instant (< 1 second)";
    if (seconds < 1) return "Instant (< 1 second)";
    if (seconds < 60) return Math.ceil(seconds) + "Second";
    if (seconds < 3600) return (seconds / 60).toFixed(1) + "Minute";
    if (seconds < 86400) return (seconds / 3600).toFixed(1) + "Hour";
    if (seconds < 31536000) return (seconds / 86400).toFixed(1) + "days";
    var years = seconds / 31536000;
    if (years < 1e9) return years.toFixed(years < 1000 ? 1 : 0) + "Year";
    return years.toExponential(1).replace("e+", "×10^") + "Year";
  }

  /* ---------- 改进建议 ---------- */
  function buildTips(r) {
    var tips = [];
    if (r.issues.dict) {
      tips.push({ cls: "bad", text: "This password is in the common weak password dictionary and can be cracked by a dictionary attack instantly. Please change it immediately." });
    }
    if (r.len < 12) {
      tips.push({ cls: "bad", text: "Length is only " + r.len + " characters; at least 12 are recommended, and 16 or more for important accounts." });
    } else {
      tips.push({ cls: "ok", text: "Length is sufficient (12 or more characters)." });
    }
    if (r.classes < 3) {
      var missing = [];
      if (!r.hasUpper) missing.push("Uppercase letters");
      if (!r.hasLower) missing.push("Lowercase letters");
      if (!r.hasDigit) missing.push("Digits");
      if (!r.hasSymbol) missing.push("Symbols");
      tips.push({ cls: "bad", text: "Too few character types; consider adding: " + missing.join("、") + "。" });
    } else {
      tips.push({ cls: "ok", text: "Rich character variety (" + r.classes + " types)." });
    }
    if (r.issues.repeat) {
      tips.push({ cls: "bad", text: "Contains repeated consecutive characters (e.g. aaa); avoid regular repetition." });
    }
    if (r.issues.seq) {
      tips.push({ cls: "bad", text: "Contains sequential runs (e.g. 123, abc or the keyboard pattern qwerty); replace them with random combinations." });
    }
    if (tips.every(function (t) { return t.cls === "ok"; })) {
      tips.push({ cls: "ok", text: "No obvious weaknesses found; this is already a decent password. Using a different password for each site is still recommended." });
    }
    return tips;
  }

  /* ---------- 渲染 ---------- */
  function render() {
    var pw = input.value;
    if (!pw) {
      statsEl.hidden = true;
      crackEl.hidden = true;
      tipsWrap.hidden = true;
      emptyEl.hidden = false;
      bar.style.width = "0";
      label.textContent = "Please enter a password to start checking";
      label.style.color = "var(--muted)";
      return;
    }
    emptyEl.hidden = true;
    statsEl.hidden = false;
    crackEl.hidden = false;
    tipsWrap.hidden = false;

    var r = analyze(pw);
    var lv = level(r.effective);

    bar.style.width = Math.min(100, (r.effective / 128) * 100) + "%";
    bar.style.background = lv.color;
    label.textContent = "Strength rating: " + lv.name + "（effective entropy " + r.effective.toFixed(1) + " bit）";
    label.style.color = lv.color;

    document.getElementById("psLen").textContent = r.len;
    document.getElementById("psClasses").textContent = r.classes;
    document.getElementById("psEntropy").textContent = r.effective.toFixed(1);

    var ct = crackTime(r.effective);
    document.getElementById("psFast").textContent = ct.fast;
    document.getElementById("psSlow").textContent = ct.slow;
    document.getElementById("psOnline").textContent = ct.online;

    tipsEl.innerHTML = "";
    buildTips(r).forEach(function (t) {
      var li = document.createElement("li");
      li.className = t.cls;
      li.textContent = t.text;
      tipsEl.appendChild(li);
    });
  }

  input.addEventListener("input", render);
  showChk.addEventListener("change", function () {
    input.type = showChk.checked ? "text" : "password";
  });
  document.getElementById("btnClear").addEventListener("click", function () {
    input.value = "";
    input.type = "password";
    showChk.checked = false;
    render();
    input.focus();
  });

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
