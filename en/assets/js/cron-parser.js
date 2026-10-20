/* ============================================================
   Cron 表达式解析器 - 工具页逻辑
   支持 5 位标准 / 6 位带秒 / 特殊宏 / L、W、# 高级语法
   ============================================================ */
(function () {
  "use strict";

  var MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  var DOW_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  var DOW_CN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTH_EN = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  function isEn() { return document.documentElement.lang === "en"; }

  function enumSep() { return isEn() ? ", " : "、"; }

  function monthLabel(m) {
    return isEn() ? MONTH_EN[m - 1] : (m + "Month");
  }

  function ordSuffix(n) {
    if (n % 10 === 1 && n !== 11) return "st";
    if (n % 10 === 2 && n !== 12) return "nd";
    if (n % 10 === 3 && n !== 13) return "rd";
    return "th";
  }

  var input = document.getElementById("cronInput");
  var errorBox = document.getElementById("cronError");
  var descBox = document.getElementById("cronDesc");
  var descText = document.getElementById("cronDescText");
  var descBadge = document.getElementById("cronDescBadge");
  var fieldsEmpty = document.getElementById("cronFieldsEmpty");
  var fieldsWrap = document.getElementById("cronFieldsWrap");
  var fieldsBody = document.getElementById("cronFieldsBody");
  var nextEmpty = document.getElementById("cronNextEmpty");
  var nextWrap = document.getElementById("cronNextWrap");
  var nextBody = document.getElementById("cronNextBody");
  var autoParse = document.getElementById("autoParse");

  var FIELD_DEFS = {
    second: { name: "Second", min: 0, max: 59 },
    minute: { name: "Minute", min: 0, max: 59 },
    hour: { name: "Hour", min: 0, max: 23 },
    day: { name: "Sun", min: 1, max: 31 },
    month: { name: "Month", min: 1, max: 12 },
    weekday: { name: "Weekday", min: 0, max: 7 }
  };

  /* ---------- 字段解析 ---------- */

  function fieldError(idx, name, reason) {
    var e = new Error(t("Field {n} ({name}) failed to parse: {reason}", { n: idx, name: t(name), reason: reason }));
    e.isFieldError = true;
    return e;
  }

  function parseIntStrict(s) {
    if (!/^\d+$/.test(s)) return null;
    return parseInt(s, 10);
  }

  function normalizeValue(v, def) {
    if (def.name === "Weekday" && v === 7) return 0;
    return v;
  }

  function resolveName(token, names, base) {
    var up = token.toUpperCase();
    for (var i = 0; i < names.length; i++) {
      if (names[i] === up) return base + i;
    }
    return null;
  }

  function resolveToken(token, def, idx) {
    var s = token.trim();
    if (s === "") throw fieldError(idx, def.name, t("Empty list item found"));
    if (s === "*") return def.min;
    var num = parseIntStrict(s);
    if (num !== null) {
      if (num < def.min || num > def.max) {
        throw fieldError(idx, def.name, t("Value {v} is out of range ({min}-{max})", { v: num, min: def.min, max: def.max }));
      }
      return normalizeValue(num, def);
    }
    if (def.name === "Month") {
      var mv = resolveName(s, MONTH_NAMES, 1);
      if (mv !== null) return mv;
    }
    if (def.name === "Weekday") {
      var dv = resolveName(s, DOW_NAMES, 0);
      if (dv !== null) return dv;
    }
    throw fieldError(idx, def.name, t("Unrecognized value: {v}", { v: s }));
  }

  function parsePart(part, f, valueSet, def, idx) {
    var step = null;
    var body = part;
    var slash = part.indexOf("/");
    if (slash > -1) {
      body = part.slice(0, slash).trim();
      var stepStr = part.slice(slash + 1).trim();
      step = parseIntStrict(stepStr);
      if (step === null || step < 1) {
        throw fieldError(idx, def.name, t("The step must be a positive integer, got: {v}", { v: stepStr }));
      }
    }

    /* 日字段特殊语法：L / LW / nW */
    if (def.name === "Sun") {
      var up = body.toUpperCase();
      if (up === "L") { f.specials.push({ type: "L" }); return; }
      if (up === "LW") { f.specials.push({ type: "LW" }); return; }
      var mw = /^(\d+)W$/.exec(up);
      if (mw) {
        var n = parseInt(mw[1], 10);
        if (n < 1 || n > 31) throw fieldError(idx, def.name, t("The date before W must be between 1 and 31"));
        f.specials.push({ type: "W", day: n });
        return;
      }
      if (up.indexOf("L") > -1 || up.indexOf("W") > -1) {
        throw fieldError(idx, def.name, t("Unrecognized value: {v}", { v: body }));
      }
    }

    /* 星期字段特殊语法：d#n（如 5#2） */
    if (def.name === "Weekday") {
      var mh = /^([0-7]|SUN|MON|TUE|WED|THU|FRI|SAT)#([1-5])$/i.exec(body);
      if (mh) {
        var d = mh[1].toUpperCase();
        var dv = parseIntStrict(d);
        f.specials.push({
          type: "#",
          dow: dv === null ? resolveName(d, DOW_NAMES, 0) : normalizeValue(dv, def),
          nth: parseInt(mh[2], 10)
        });
        return;
      }
      if (body.indexOf("#") > -1) {
        throw fieldError(idx, def.name, t("The # syntax should be weekday#ordinal, e.g. 5#2 or FRI#2"));
      }
    }

    var lo, hi;
    var rangeMatch = /^(.+?)-(.+)$/.exec(body);
    if (body === "*") {
      lo = def.min;
      hi = def.max;
    } else if (rangeMatch) {
      lo = resolveToken(rangeMatch[1], def, idx);
      hi = resolveToken(rangeMatch[2], def, idx);
      if (lo > hi) {
        throw fieldError(idx, def.name, t("Range start {a} cannot be greater than range end {b}", { a: lo, b: hi }));
      }
    } else if (step !== null) {
      lo = resolveToken(body, def, idx);
      hi = def.max;
    } else {
      lo = resolveToken(body, def, idx);
      hi = lo;
    }
    if (step === null) step = 1;
    for (var v = lo; v <= hi; v += step) {
      valueSet[normalizeValue(v, def)] = true;
    }
    if (step > 1 && lo === def.min && hi === def.max) {
      f.step = { from: lo, to: hi, step: step };
    }
  }

  function rangeValues(min, max) {
    var arr = [];
    for (var v = min; v <= max; v++) arr.push(v);
    return arr;
  }

  function parseField(raw, def, idx) {
    var text = String(raw).trim();
    if (!text) throw fieldError(idx, def.name, t("cannot be empty"));
    var isDayField = def.name === "Sun" || def.name === "Weekday";
    if (text === "?") {
      if (!isDayField) throw fieldError(idx, def.name, t("The ? symbol is only allowed in the day and weekday fields"));
      text = "*";
    }
    var f = {
      name: def.name, raw: String(raw).trim(), min: def.min, max: def.max,
      values: [], all: false, step: null, specials: []
    };
    if (text === "*") {
      f.all = true;
      f.values = rangeValues(def.min, def.max);
      return f;
    }
    var valueSet = {};
    var parts = text.split(",");
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (!part) throw fieldError(idx, def.name, t("Empty list item found"));
      parsePart(part, f, valueSet, def, idx);
    }
    f.values = Object.keys(valueSet).map(Number).sort(function (a, b) { return a - b; });
    return f;
  }

  var MACROS = {
    "@yearly": "0 0 1 1 *",
    "@annually": "0 0 1 1 *",
    "@monthly": "0 0 1 * *",
    "@weekly": "0 0 * * 0",
    "@daily": "0 0 * * *",
    "@midnight": "0 0 * * *",
    "@hourly": "0 * * * *"
  };

  function parseCron(expr) {
    var text = String(expr || "").trim().replace(/\s+/g, " ");
    if (!text) return null;
    var macro = null;
    if (text.charAt(0) === "@") {
      macro = text.toLowerCase();
      if (macro === "@reboot") {
        return { macro: "@reboot", hasSeconds: false, fields: [], standard: "@reboot" };
      }
      if (!Object.prototype.hasOwnProperty.call(MACROS, macro)) {
        throw new Error(t("Unknown special macro: {v}. Supported: @yearly/@annually/@monthly/@weekly/@daily/@midnight/@hourly/@reboot", { v: text }));
      }
      text = MACROS[macro];
    }
    var tokens = text.split(" ");
    var hasSeconds = tokens.length === 6;
    if (tokens.length !== 5 && tokens.length !== 6) {
      throw new Error(t("The expression should contain 5 or 6 fields (got {n}), separated by spaces", { n: tokens.length }));
    }
    var order = hasSeconds
      ? ["second", "minute", "hour", "day", "month", "weekday"]
      : ["minute", "hour", "day", "month", "weekday"];
    var fields = [];
    for (var i = 0; i < order.length; i++) {
      fields.push(parseField(tokens[i], FIELD_DEFS[order[i]], i + 1));
    }
    var spec = {
      macro: macro,
      hasSeconds: hasSeconds,
      fields: fields,
      standard: fields.map(function (f) { return f.raw; }).join(" ")
    };
    if (hasSeconds) {
      spec.seconds = fields[0]; spec.minute = fields[1]; spec.hour = fields[2];
      spec.day = fields[3]; spec.month = fields[4]; spec.weekday = fields[5];
    } else {
      spec.seconds = null; spec.minute = fields[0]; spec.hour = fields[1];
      spec.day = fields[2]; spec.month = fields[3]; spec.weekday = fields[4];
    }
    return spec;
  }

  /* ---------- 中文描述生成 ---------- */

  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function listJoin(arr) { return arr.join(enumSep()); }

  function compressNums(vals) {
    var runs = [], start = vals[0], prev = vals[0];
    for (var i = 1; i < vals.length; i++) {
      if (vals[i] === prev + 1) { prev = vals[i]; continue; }
      runs.push([start, prev]);
      start = vals[i];
      prev = vals[i];
    }
    runs.push([start, prev]);
    return runs.map(function (r) {
      if (r[0] === r[1]) return String(r[0]);
      if (r[1] - r[0] >= 2) return r[0] + "-" + r[1];
      return r[0] + enumSep() + r[1];
    }).join(enumSep());
  }

  function buildTimeDesc(spec) {
    var m = spec.minute, h = spec.hour, s = spec.seconds;
    var mAll = m.all, hAll = h.all, sAll = !spec.hasSeconds || s.all;
    var secDesc = "";
    if (spec.hasSeconds && !s.all) {
      secDesc = s.values.length === 1 ? ":" + pad2(s.values[0]) : t(", with seconds {list}", { list: listJoin(s.values) });
    }
    var mStepFull = m.step && m.step.from === m.min && m.step.to === m.max;
    var hStepFull = h.step && h.step.from === h.min && h.step.to === h.max;
    var sStepFull = spec.hasSeconds && s.step && s.step.from === s.min && s.step.to === s.max;

    if (mAll && hAll && sAll) return { text: t("Every minute"), freq: true };
    if (mStepFull && hAll && sAll) return { text: t("every {n} minutes", { n: m.step.step }), freq: true, once: true };
    if (sStepFull && mAll && hAll) return { text: t("every {n} seconds", { n: s.step.step }), freq: true, once: true };
    if (hStepFull && mAll && sAll) return { text: t("every {n} hours", { n: h.step.step }), freq: true, once: true };
    if (hStepFull && m.values.length === 1 && sAll) {
      var extra = m.values[0] === 0 ? "" : t(" (minute {n})", { n: m.values[0] });
      return { text: t("every {n} hours", { n: h.step.step }) + extra, freq: true, once: true };
    }
    if (m.values.length === 1 && hAll && sAll) {
      return { text: m.values[0] === 0 ? t("at the top of every hour") : t("at minute {n} of every hour", { n: m.values[0] }), hourly: true };
    }
    if (hAll && m.values.length > 1 && sAll) {
      return { text: t("at minutes {list} of every hour", { list: listJoin(m.values) }), hourly: true };
    }
    if (m.values.length === 1 && h.values.length === 1) {
      var ts = pad2(h.values[0]) + ":" + pad2(m.values[0]);
      if (spec.hasSeconds && s.values.length === 1) ts += ":" + pad2(s.values[0]);
      return { text: ts + (spec.hasSeconds && s.values.length !== 1 ? secDesc : ""), clock: true };
    }

    /* 混合组合：分段描述 */
    var hDesc = null, mDesc = null;
    if (!hAll) {
      hDesc = hStepFull ? t("every {n} hours", { n: h.step.step })
        : (h.values.length === 1 ? t("hour {n}", { n: h.values[0] }) : t("hours {list}", { list: listJoin(h.values) }));
    }
    if (!mAll) {
      mDesc = mStepFull ? t("every {n} minutes", { n: m.step.step })
        : (m.values.length === 1 ? t("minute {n}", { n: m.values[0] }) : t("minutes {list}", { list: listJoin(m.values) }));
    }
    if (hDesc && mDesc) {
      if (mStepFull) return { text: t("every {n} minutes during hour {h}", { h: h.values.length === 1 ? h.values[0] : h.values.join(", "), n: m.step.step }) + secDesc };
      return { text: hDesc + " " + mDesc + secDesc };
    }
    if (hDesc) return { text: hDesc + t("Every minute") + secDesc };
    if (mDesc) return { text: mDesc + secDesc };
    return { text: t("Every minute") + secDesc, freq: true };
  }

  function describeDowValues(vals) {
    var runs = [], start = vals[0], prev = vals[0];
    for (var i = 1; i < vals.length; i++) {
      if (vals[i] === prev + 1) { prev = vals[i]; continue; }
      runs.push([start, prev]);
      start = vals[i];
      prev = vals[i];
    }
    runs.push([start, prev]);
    return runs.map(function (r) {
      if (r[0] === r[1]) return t(DOW_CN[r[0]]);
      if (r[1] - r[0] >= 2) return t("{a} to {b}", { a: t(DOW_CN[r[0]]), b: t(DOW_CN[r[1]]) });
      return t(DOW_CN[r[0]]) + enumSep() + t(DOW_CN[r[1]]);
    }).join(enumSep());
  }

  function fmtDomDesc(f) {
    if (f.all) return null;
    var segs = [];
    if (f.values.length) {
      segs.push(f.values.length === 1 ? t("day {n}", { n: f.values[0] }) : t("days {list}", { list: compressNums(f.values) }));
    }
    f.specials.forEach(function (sp) {
      if (sp.type === "L") segs.push(t("the last day"));
      else if (sp.type === "LW") segs.push(t("the last weekday"));
      else if (sp.type === "W") segs.push(t("the weekday nearest to day {n}", { n: sp.day }));
    });
    return segs.join(enumSep());
  }

  function fmtDowDesc(f) {
    if (f.all) return null;
    var segs = [];
    if (f.values.length) segs.push(describeDowValues(f.values));
    f.specials.forEach(function (sp) {
      segs.push(t("the {n}{s} {d}", { n: sp.nth, d: t(DOW_CN[sp.dow]), s: ordSuffix(sp.nth) }));
    });
    return segs.join(enumSep());
  }

  function fmtMonthDesc(f) {
    if (f.all) return null;
    if (f.step && f.step.from === f.min && f.step.to === f.max) return t("every {n} months", { n: f.step.step });
    return f.values.map(monthLabel).join(enumSep());
  }

  function buildDatePart(spec) {
    var domR = !spec.day.all, dowR = !spec.weekday.all, monR = !spec.month.all;
    var domDesc = fmtDomDesc(spec.day);
    var dowDesc = fmtDowDesc(spec.weekday);
    var monDesc = fmtMonthDesc(spec.month);
    var core;
    if (domR && dowR) core = t("on {dom} or {dow} of each month", { dom: domDesc, dow: dowDesc });
    else if (domR) core = t("on {dom} of each month", { dom: domDesc });
    else if (dowR) core = spec.weekday.specials.length ? t("on {dow} of each month", { dow: dowDesc }) : t("every {dow}", { dow: dowDesc });
    else core = t("every day");
    if (monR) {
      if (domR && dowR) core = t("on {dom} or {dow} of {mon}", { mon: monDesc, dom: domDesc, dow: dowDesc });
      else if (domR) core = t("on {dom} of {mon}", { mon: monDesc, dom: domDesc });
      else if (dowR) core = t("on {dow} of {mon}", { mon: monDesc, dow: dowDesc });
      else core = t("every day of {mon}", { mon: monDesc });
    }
    return core;
  }

  function describe(spec) {
    if (spec.macro === "@reboot") {
      return t("Runs at system startup (@reboot is bound to boot, so run times cannot be predicted)");
    }
    var datePart = buildDatePart(spec);
    var time = buildTimeDesc(spec);
    var dateUnrestricted = spec.day.all && spec.weekday.all && spec.month.all;
    var s = "";
    if (!(dateUnrestricted && (time.freq || time.hourly))) s = datePart;
    if (time.text) {
      if (s) s += (time.freq ? "，" : " ");
      s += time.text;
    }
    if (time.clock || isEn()) s += " ";
    s += time.freq ? (time.once ? t("runs once") : t("runs")) : t("runs");
    return s;
  }

  /* ---------- 下次执行时间推演 ---------- */

  function lastDayOfMonth(y, m) { return new Date(y, m, 0).getDate(); }

  function lastWeekdayOfMonth(y, m) {
    var d = lastDayOfMonth(y, m);
    while (true) {
      var w = new Date(y, m - 1, d).getDay();
      if (w !== 0 && w !== 6) return d;
      d--;
    }
  }

  function nearestWeekday(y, m, n) {
    var last = lastDayOfMonth(y, m);
    if (n > last) return -1;
    var w = new Date(y, m - 1, n).getDay();
    if (w === 0) return n + 1 <= last ? n + 1 : n - 1;
    if (w === 6) return n - 1 >= 1 ? n - 1 : n + 2;
    return n;
  }

  function domMatches(date, f) {
    var d = date.getDate();
    if (f.values.indexOf(d) > -1) return true;
    for (var i = 0; i < f.specials.length; i++) {
      var sp = f.specials[i];
      if (sp.type === "L" && d === lastDayOfMonth(date.getFullYear(), date.getMonth() + 1)) return true;
      if (sp.type === "LW" && d === lastWeekdayOfMonth(date.getFullYear(), date.getMonth() + 1)) return true;
      if (sp.type === "W" && d === nearestWeekday(date.getFullYear(), date.getMonth() + 1, sp.day)) return true;
    }
    return false;
  }

  function dowMatches(date, f) {
    var w = date.getDay();
    if (f.values.indexOf(w) > -1) return true;
    for (var i = 0; i < f.specials.length; i++) {
      var sp = f.specials[i];
      if (sp.type === "#" && w === sp.dow && Math.ceil(date.getDate() / 7) === sp.nth) return true;
    }
    return false;
  }

  function dayMatches(date, spec) {
    var domR = !spec.day.all, dowR = !spec.weekday.all;
    if (domR && dowR) return domMatches(date, spec.day) || dowMatches(date, spec.weekday);
    if (domR) return domMatches(date, spec.day);
    if (dowR) return dowMatches(date, spec.weekday);
    return true;
  }

  function findNext(spec, start, count) {
    var results = [];
    var hours = spec.hour.values.slice().sort(function (a, b) { return a - b; });
    var minutes = spec.minute.values.slice().sort(function (a, b) { return a - b; });
    var seconds = spec.hasSeconds
      ? spec.seconds.values.slice().sort(function (a, b) { return a - b; })
      : [0];
    var limit = new Date(start.getFullYear() + 4, start.getMonth(), start.getDate());
    var cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    var guard = 366 * 4 + 2;
    while (guard-- > 0 && cursor < limit) {
      if (spec.month.values.indexOf(cursor.getMonth() + 1) > -1 && dayMatches(cursor, spec)) {
        for (var hi = 0; hi < hours.length; hi++) {
          for (var mi = 0; mi < minutes.length; mi++) {
            for (var si = 0; si < seconds.length; si++) {
              var d = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), hours[hi], minutes[mi], seconds[si], 0);
              if (d.getTime() > start.getTime()) {
                results.push(d);
                if (results.length >= count) return results;
              }
            }
          }
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return results;
  }

  function fmtDateTime(d) {
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) +
      " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds()) +
      " " + t(DOW_CN[d.getDay()]);
  }

  function humanizeDiff(ms) {
    var mins = Math.floor(ms / 60000);
    if (mins < 1) return t("less than 1 minute");
    if (mins < 60) return t("in {n} minutes", { n: mins });
    var hours = Math.floor(mins / 60);
    if (hours < 24) return t("in {n} hours", { n: hours });
    var days = Math.floor(hours / 24);
    if (days < 30) return t("in {n} days", { n: days });
    return t("in about {n} months", { n: Math.floor(days / 30) });
  }

  /* ---------- 渲染 ---------- */

  var lastDesc = "";
  var lastStandard = "";

  function specialText(sp) {
    if (sp.type === "L") return "L";
    if (sp.type === "LW") return "LW";
    if (sp.type === "W") return sp.day + "W";
    if (sp.type === "#") return sp.dow + "#" + sp.nth;
    return "";
  }

  function renderFields(spec) {
    fieldsBody.innerHTML = "";
    spec.fields.forEach(function (f) {
      var tr = document.createElement("tr");
      var tdName = document.createElement("td");
      tdName.textContent = t(f.name);
      var tdRaw = document.createElement("td");
      tdRaw.className = "mono";
      tdRaw.textContent = f.raw;
      var tdVals = document.createElement("td");
      if (f.all) {
        var any = document.createElement("span");
        any.className = "val-badge";
        any.textContent = t("Any value");
        tdVals.appendChild(any);
      } else {
        var box = document.createElement("div");
        box.className = "vals-scroll";
        f.values.forEach(function (v) {
          var b = document.createElement("span");
          b.className = "val-badge";
          b.textContent = String(v);
          box.appendChild(b);
        });
        f.specials.forEach(function (sp) {
          var b2 = document.createElement("span");
          b2.className = "val-badge";
          b2.textContent = specialText(sp);
          box.appendChild(b2);
        });
        tdVals.appendChild(box);
      }
      var cnt = document.createElement("span");
      cnt.className = "badge";
      cnt.textContent = t("{n} values", { n: f.values.length + f.specials.length });
      tdVals.appendChild(cnt);
      tr.appendChild(tdName);
      tr.appendChild(tdRaw);
      tr.appendChild(tdVals);
      fieldsBody.appendChild(tr);
    });
    fieldsEmpty.hidden = true;
    fieldsWrap.hidden = false;
  }

  function renderNext(spec) {
    nextBody.innerHTML = "";
    if (spec.macro === "@reboot") {
      nextEmpty.textContent = t("@reboot runs at system startup, so exact run times cannot be computed");
      nextEmpty.hidden = false;
      nextWrap.hidden = true;
      return;
    }
    var now = new Date();
    var list = findNext(spec, now, 10);
    if (!list.length) {
      nextEmpty.textContent = t("No matching run time within 4 years, please check the expression");
      nextEmpty.hidden = false;
      nextWrap.hidden = true;
      return;
    }
    nextEmpty.hidden = true;
    nextWrap.hidden = false;
    var nowMs = now.getTime();
    list.forEach(function (d, i) {
      var tr = document.createElement("tr");
      var td1 = document.createElement("td");
      td1.className = "num";
      td1.textContent = String(i + 1);
      var td2 = document.createElement("td");
      td2.className = "mono";
      td2.textContent = fmtDateTime(d);
      var td3 = document.createElement("td");
      td3.textContent = humanizeDiff(d.getTime() - nowMs);
      tr.appendChild(td1);
      tr.appendChild(td2);
      tr.appendChild(td3);
      nextBody.appendChild(tr);
    });
  }

  function clearResults() {
    descBox.hidden = true;
    lastDesc = "";
    lastStandard = "";
    fieldsBody.innerHTML = "";
    fieldsWrap.hidden = true;
    fieldsEmpty.hidden = false;
    nextBody.innerHTML = "";
    nextWrap.hidden = true;
    nextEmpty.textContent = t("No run time prediction yet");
    nextEmpty.hidden = false;
  }

  function doParse() {
    errorBox.hidden = true;
    var expr = input.value;
    if (!expr.trim()) {
      clearResults();
      return;
    }
    var spec;
    try {
      spec = parseCron(expr);
    } catch (e) {
      clearResults();
      errorBox.hidden = false;
      errorBox.textContent = e.message;
      return;
    }
    lastDesc = describe(spec);
    lastStandard = spec.standard;
    descText.textContent = lastDesc;
    descBadge.textContent = spec.macro
      ? t("Special macro")
      : (spec.hasSeconds ? t("6-field with seconds") : t("5-field standard"));
    descBox.hidden = false;
    renderFields(spec);
    renderNext(spec);
  }

  input.addEventListener("input", function () {
    if (autoParse.checked) doParse();
  });

  document.getElementById("btnParse").addEventListener("click", doParse);

  document.getElementById("btnCopyDesc").addEventListener("click", function () {
    if (!lastDesc) {
      showToast(t("Nothing to copy yet"));
      return;
    }
    copyText(lastDesc, t("Description copied"));
  });

  document.getElementById("btnCopyExpr").addEventListener("click", function () {
    if (!lastStandard) {
      showToast(t("Nothing to copy yet"));
      return;
    }
    copyText(lastStandard, t("Standard expression copied"));
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-expr]"), function (btn) {
    btn.addEventListener("click", function () {
      input.value = btn.getAttribute("data-expr");
      doParse();
      input.focus();
    });
  });

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

  /* 初始渲染（空状态） */
  clearResults();
})();
