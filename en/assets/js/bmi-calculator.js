/* ============================================================
   BMI与每日热量计算器 - 工具页逻辑
   BMI（中国/WHO 双标准）+ Devine 理想体重 + Mifflin-St Jeor
   BMR / TDEE + 减脂增肌目标热量 + 三大营养素方案
   ============================================================ */
(function () {
  "use strict";

  /* ---------- DOM ---------- */
  var unitRow = document.getElementById("unitRow");
  var sexRow = document.getElementById("sexRow");
  var goalRow = document.getElementById("goalRow");
  var age = document.getElementById("age");
  var cm = document.getElementById("cm");
  var ft = document.getElementById("ft");
  var inch = document.getElementById("inch");
  var kg = document.getElementById("kg");
  var lb = document.getElementById("lb");
  var cmWrap = document.getElementById("cmWrap");
  var ftWrap = document.getElementById("ftWrap");
  var kgWrap = document.getElementById("kgWrap");
  var lbWrap = document.getElementById("lbWrap");
  var activity = document.getElementById("activity");
  var btnCalc = document.getElementById("btnCalc");
  var btnReset = document.getElementById("btnReset");
  var errorBox = document.getElementById("bmiError");
  var bmiVal = document.getElementById("bmiVal");
  var chinaCat = document.getElementById("chinaCat");
  var whoCat = document.getElementById("whoCat");
  var healthyRange = document.getElementById("healthyRange");
  var idealWeight = document.getElementById("idealWeight");
  var bmrVal = document.getElementById("bmrVal");
  var tdeeVal = document.getElementById("tdeeVal");
  var goalVal = document.getElementById("goalVal");
  var goalLabel = document.getElementById("goalLabel");
  var bmiPointer = document.getElementById("bmiPointer");
  var weeklyTip = document.getElementById("weeklyTip");
  var macroBody = document.getElementById("macroBody");

  /* ---------- 常量 ---------- */
  var LB_PER_KG = 2.2046226218;
  var IN_PER_CM = 1 / 2.54;

  /* 三大营养素方案：[碳水%, 蛋白%, 脂肪%] */
  var MACRO_PLANS = [
    { name: "Balanced", c: 50, p: 20, f: 30 },
    { name: "Low Carb", c: 25, p: 40, f: 35 },
    { name: "High Protein", c: 40, p: 30, f: 30 }
  ];

  /* ---------- 提示 ---------- */
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

  /* ---------- 表单辅助 ---------- */
  function radioValue(row) {
    var checked = row.querySelector("input:checked");
    return checked ? checked.value : "";
  }

  Array.prototype.forEach.call(unitRow.querySelectorAll("label"), function (label) {
    label.addEventListener("click", function () {
      Array.prototype.forEach.call(unitRow.querySelectorAll("label"), function (l) {
        l.classList.remove("checked");
      });
      label.classList.add("checked");
    });
  });
  Array.prototype.forEach.call(sexRow.querySelectorAll("label"), function (label) {
    label.addEventListener("click", function () {
      Array.prototype.forEach.call(sexRow.querySelectorAll("label"), function (l) {
        l.classList.remove("checked");
      });
      label.classList.add("checked");
    });
  });
  Array.prototype.forEach.call(goalRow.querySelectorAll("label"), function (label) {
    label.addEventListener("click", function () {
      Array.prototype.forEach.call(goalRow.querySelectorAll("label"), function (l) {
        l.classList.remove("checked");
      });
      label.classList.add("checked");
      calculate();
    });
  });

  function num(el) {
    var v = String(el.value).trim();
    if (v === "") return NaN;
    return Number(v);
  }

  function round1(n) { return Math.round(n * 10) / 10; }
  function fmt1(n) { return (Math.round(n * 10) / 10).toFixed(1); }

  /* ---------- 单位切换 ---------- */
  function applyUnitVisibility() {
    var imperial = radioValue(unitRow) === "imperial";
    cmWrap.hidden = imperial;
    kgWrap.hidden = imperial;
    ftWrap.hidden = !imperial;
    lbWrap.hidden = !imperial;
  }

  unitRow.addEventListener("change", function () {
    var imperial = radioValue(unitRow) === "imperial";
    if (imperial) {
      /* cm/kg -> ft+in / lb */
      var cmV = num(cm);
      var kgV = num(kg);
      if (cmV === cmV && cmV > 0) {
        var totalIn = cmV * IN_PER_CM;
        var f = Math.floor(totalIn / 12);
        var i = Math.round(totalIn - f * 12);
        if (i >= 12) { f += 1; i -= 12; }
        ft.value = String(f);
        inch.value = String(i);
      }
      if (kgV === kgV && kgV > 0) {
        lb.value = String(Math.round(kgV * LB_PER_KG));
      }
    } else {
      /* ft+in / lb -> cm/kg */
      var fV = num(ft);
      var iV = num(inch);
      var lbV = num(lb);
      if (fV === fV && iV === iV) {
        cm.value = String(round1((fV * 12 + iV) * 2.54));
      }
      if (lbV === lbV && lbV > 0) {
        kg.value = String(round1(lbV / LB_PER_KG));
      }
    }
    applyUnitVisibility();
    calculate();
  });

  /* ---------- 分类 ---------- */
  function chinaCategory(bmi) {
    if (bmi < 18.5) return t("Underweight");
    if (bmi < 24) return t("Normal");
    if (bmi < 28) return t("Overweight");
    return t("Obese");
  }

  function whoCategory(bmi) {
    if (bmi < 18.5) return t("Underweight");
    if (bmi < 25) return t("Normal");
    if (bmi < 30) return t("Overweight");
    return t("Obese");
  }

  /* ---------- 主计算 ---------- */
  function calculate() {
    errorBox.hidden = true;

    var imperial = radioValue(unitRow) === "imperial";
    var sex = radioValue(sexRow) || "male";
    var goal = radioValue(goalRow) || "cut";
    var ageV = num(age);

    var cmV, kgV;
    if (imperial) {
      var fV = num(ft), iV = num(inch), lbV = num(lb);
      cmV = (fV * 12 + iV) * 2.54;
      kgV = lbV / LB_PER_KG;
    } else {
      cmV = num(cm);
      kgV = num(kg);
    }

    var valid =
      ageV === ageV && ageV >= 10 && ageV <= 100 && ageV % 1 === 0 &&
      cmV === cmV && cmV >= 50 && cmV <= 250 &&
      kgV === kgV && kgV >= 20 && kgV <= 300;

    if (!valid) {
      errorBox.hidden = false;
      errorBox.textContent = t("Please enter valid height, weight and age");
      return;
    }

    var m = cmV / 100;
    var bmi = kgV / (m * m);
    var inchTotal = cmV * IN_PER_CM;

    /* 体重相关 */
    var lowKg = 18.5 * m * m;
    var highKg = 23.9 * m * m;
    var idealKg = sex === "male"
      ? 50 + 2.3 * (inchTotal - 60)
      : 45.5 + 2.3 * (inchTotal - 60);

    /* 热量相关 */
    var bmr = sex === "male"
      ? 10 * kgV + 6.25 * cmV - 5 * ageV + 5
      : 10 * kgV + 6.25 * cmV - 5 * ageV - 161;
    var tdee = bmr * Number(activity.value);

    var goalCal, goalName, weekly;
    if (goal === "cut") {
      goalCal = tdee - 500;
      goalName = t("Fat Loss");
      weekly = t("Expected to lose about {n} kg per week", { n: "0.5" });
    } else if (goal === "bulk") {
      goalCal = tdee + 300;
      goalName = t("Muscle Gain");
      weekly = t("Expected to gain about {n} kg per week", { n: "0.3" });
    } else {
      goalCal = tdee;
      goalName = t("Maintain");
      weekly = t("Weight is expected to stay about the same");
    }

    /* 输出 */
    bmiVal.textContent = fmt1(bmi);
    chinaCat.textContent = chinaCategory(bmi);
    whoCat.textContent = whoCategory(bmi);
    healthyRange.textContent = t("{a} - {b} kg", { a: fmt1(lowKg), b: fmt1(highKg) });
    idealWeight.textContent = t("{a} kg", { a: fmt1(idealKg) });
    bmrVal.textContent = String(Math.round(bmr));
    tdeeVal.textContent = String(Math.round(tdee));
    goalVal.textContent = String(Math.round(goalCal));
    goalLabel.textContent = t("Target Calories ({n})", { n: goalName });

    /* BMI 刻度指针（范围 15-40） */
    var pct = (bmi - 15) / 25 * 100;
    if (pct < 0) pct = 0;
    if (pct > 100) pct = 100;
    bmiPointer.style.left = pct.toFixed(2) + "%";

    weeklyTip.innerHTML = "";
    var strong = document.createElement("b");
    strong.textContent = goalName + "：";
    weeklyTip.appendChild(strong);
    weeklyTip.appendChild(document.createTextNode(
      t("{w}；{i}", {
        w: weekly,
        i: t("Recommended daily intake: {n} kcal", { n: Math.round(goalCal) })
      })
    ));

    renderMacros(goalCal);
  }

  /* ---------- 三大营养素 ---------- */
  function renderMacros(cal) {
    macroBody.innerHTML = "";
    MACRO_PLANS.forEach(function (plan) {
      var tr = document.createElement("tr");
      var tdName = document.createElement("td");
      tdName.textContent = t(plan.name);
      var tdCarb = document.createElement("td");
      tdCarb.className = "num";
      tdCarb.textContent = String(Math.round(cal * plan.c / 100 / 4));
      var tdPro = document.createElement("td");
      tdPro.className = "num";
      tdPro.textContent = String(Math.round(cal * plan.p / 100 / 4));
      var tdFat = document.createElement("td");
      tdFat.className = "num";
      tdFat.textContent = String(Math.round(cal * plan.f / 100 / 9));
      tr.appendChild(tdName);
      tr.appendChild(tdCarb);
      tr.appendChild(tdPro);
      tr.appendChild(tdFat);
      macroBody.appendChild(tr);
    });
  }

  /* ---------- 事件 ---------- */
  btnCalc.addEventListener("click", function () {
    calculate();
    if (errorBox.hidden) showToast(t("Calculation complete"));
  });

  btnReset.addEventListener("click", function () {
    unitRow.querySelector('input[value="metric"]').checked = true;
    syncRowChecked(unitRow);
    sexRow.querySelector('input[value="male"]').checked = true;
    syncRowChecked(sexRow);
    goalRow.querySelector('input[value="cut"]').checked = true;
    syncRowChecked(goalRow);
    age.value = "30";
    cm.value = "170";
    ft.value = "5";
    inch.value = "7";
    kg.value = "65";
    lb.value = "143";
    activity.value = "1.375";
    applyUnitVisibility();
    calculate();
    showToast(t("Defaults restored"));
  });

  function syncRowChecked(row) {
    Array.prototype.forEach.call(row.querySelectorAll("label"), function (l) {
      var input = l.querySelector("input");
      l.classList.toggle("checked", !!(input && input.checked));
    });
  }

  [age, cm, ft, inch, kg, lb].forEach(function (el) {
    el.addEventListener("input", calculate);
  });
  activity.addEventListener("change", calculate);
  sexRow.addEventListener("change", calculate);
  unitRow.addEventListener("change", applyUnitVisibility);

  /* ---------- 初始化 ---------- */
  applyUnitVisibility();
  calculate();
})();
