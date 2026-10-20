/* ============================================================
   房贷计算器 - 工具页逻辑
   支持：商业贷款 / 组合贷款（商贷+公积金）× 等额本息 / 等额本金
   ============================================================ */
(function () {
  "use strict";

  var els = {
    loanType: document.getElementById("mcLoanType"),
    repayType: document.getElementById("mcRepayType"),
    commercialAmount: document.getElementById("mcCommercialAmount"),
    commercialRate: document.getElementById("mcCommercialRate"),
    gjjAmount: document.getElementById("mcGjjAmount"),
    gjjRate: document.getElementById("mcGjjRate"),
    gjjAmountItem: document.getElementById("mcGjjAmountItem"),
    gjjRateItem: document.getElementById("mcGjjRateItem"),
    years: document.getElementById("mcYears"),
    monthly: document.getElementById("mcMonthly"),
    monthlyLabel: document.getElementById("mcMonthlyLabel"),
    totalInterest: document.getElementById("mcTotalInterest"),
    totalPayment: document.getElementById("mcTotalPayment"),
    interestRatio: document.getElementById("mcInterestRatio"),
    loanSummary: document.getElementById("mcLoanSummary"),
    tableWrap: document.getElementById("mcTableWrap"),
    tableBody: document.getElementById("mcTableBody"),
    empty: document.getElementById("mcEmpty"),
    btnCopyPlan: document.getElementById("btnCopyPlan")
  };

  var lastSchedule = []; // 供复制使用

  function num(el, fallback) {
    var v = parseFloat(el.value);
    return isFinite(v) && v >= 0 ? v : (fallback || 0);
  }

  function fmtMoney(n) {
    return "¥" + Number(n).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtMoneyShort(n) {
    if (n >= 100000000) return (n / 100000000).toFixed(2) + "00M";
    if (n >= 10000) return (n / 10000).toFixed(2) + "0k";
    return n.toFixed(2);
  }

  /* 单笔贷款计算，返回 { schedule:[{month, payment, principal, interest, remain}], totalInterest, totalPayment, firstPayment, lastPayment, decrease } */
  function calcLoan(principal, annualRatePct, months, type) {
    var schedule = [];
    var totalInterest = 0;
    var totalPayment = 0;
    var firstPayment = 0, lastPayment = 0, decrease = 0;
    var r = annualRatePct / 100 / 12;

    if (principal <= 0 || months <= 0) return null;

    if (type === "equalInstallment") {
      // 等额本息
      var monthly;
      if (r === 0) {
        monthly = principal / months;
      } else {
        var pow = Math.pow(1 + r, months);
        monthly = principal * r * pow / (pow - 1);
      }
      var remain = principal;
      for (var i = 1; i <= months; i++) {
        var interest = remain * r;
        var principalPart = monthly - interest;
        if (i === months) { // 最后一期抹平舍入误差
          principalPart = remain;
          monthly = remain + interest;
        }
        remain = Math.max(0, remain - principalPart);
        schedule.push({ month: i, payment: monthly, principal: principalPart, interest: interest, remain: remain });
        totalInterest += interest;
        totalPayment += monthly;
      }
      firstPayment = lastPayment = schedule[0].payment;
    } else {
      // 等额本金
      var principalPerMonth = principal / months;
      var remain2 = principal;
      for (var j = 1; j <= months; j++) {
        var interest2 = remain2 * r;
        var payment = principalPerMonth + interest2;
        remain2 = Math.max(0, remain2 - principalPerMonth);
        schedule.push({ month: j, payment: payment, principal: principalPerMonth, interest: interest2, remain: remain2 });
        totalInterest += interest2;
        totalPayment += payment;
      }
      firstPayment = schedule[0].payment;
      lastPayment = schedule[schedule.length - 1].payment;
      decrease = principalPerMonth * r;
    }

    return {
      schedule: schedule,
      totalInterest: totalInterest,
      totalPayment: totalPayment,
      firstPayment: firstPayment,
      lastPayment: lastPayment,
      decrease: decrease
    };
  }

  /* 合并两笔贷款的还款计划（同期月供相加） */
  function mergeSchedules(a, b) {
    if (!a) return b ? b.schedule : [];
    if (!b) return a.schedule;
    var out = [];
    for (var i = 0; i < a.schedule.length; i++) {
      var x = a.schedule[i];
      var y = b.schedule[i] || { payment: 0, principal: 0, interest: 0, remain: 0 };
      out.push({
        month: x.month,
        payment: x.payment + y.payment,
        principal: x.principal + y.principal,
        interest: x.interest + y.interest,
        remain: x.remain + y.remain
      });
    }
    return out;
  }

  function getRadio(group, name) {
    var checked = group.querySelector("input[name=" + name + "]:checked");
    return checked ? checked.value : "";
  }

  function bindRadioStyle(group) {
    Array.prototype.forEach.call(group.querySelectorAll("label"), function (label) {
      label.addEventListener("click", function () {
        Array.prototype.forEach.call(group.querySelectorAll("label"), function (l) {
          l.classList.remove("checked");
        });
        label.classList.add("checked");
      });
    });
  }

  bindRadioStyle(els.loanType);
  bindRadioStyle(els.repayType);

  function render() {
    var isCombo = getRadio(els.loanType, "loanType") === "combo";
    els.gjjAmountItem.hidden = !isCombo;
    els.gjjRateItem.hidden = !isCombo;

    var years = Math.round(num(els.years, 0));
    var months = years * 12;
    var repayType = getRadio(els.repayType, "repayType");

    var commercial = calcLoan(
      num(els.commercialAmount, 0) * 10000,
      num(els.commercialRate, 0),
      months,
      repayType
    );

    var gjj = null;
    if (isCombo) {
      gjj = calcLoan(
        num(els.gjjAmount, 0) * 10000,
        num(els.gjjRate, 0),
        months,
        repayType
      );
    }

    if (!commercial && !gjj) {
      els.monthly.textContent = "—";
      els.monthlyLabel.textContent = repayType === "equalPrincipal" ? "First monthly payment" : "Monthly Payment";
      els.totalInterest.textContent = "—";
      els.totalPayment.textContent = "—";
      els.interestRatio.textContent = "—";
      els.loanSummary.textContent = "Please enter valid loan information";
      els.tableWrap.hidden = true;
      els.empty.hidden = false;
      lastSchedule = [];
      return;
    }

    var schedule = mergeSchedules(commercial, gjj);
    lastSchedule = schedule;

    var totalInterest = (commercial ? commercial.totalInterest : 0) + (gjj ? gjj.totalInterest : 0);
    var totalPayment = (commercial ? commercial.totalPayment : 0) + (gjj ? gjj.totalPayment : 0);
    var first = schedule.length ? schedule[0].payment : 0;
    var last = schedule.length ? schedule[schedule.length - 1].payment : 0;

    if (repayType === "equalPrincipal") {
      els.monthly.textContent = fmtMoney(first);
      els.monthlyLabel.textContent = "First monthly payment (decreasing by " + fmtMoneyShort((commercial ? commercial.decrease : 0) + (gjj ? gjj.decrease : 0)) + " CNY each month)";
    } else {
      els.monthly.textContent = fmtMoney(first);
      els.monthlyLabel.textContent = "Monthly Payment";
    }

    els.totalInterest.textContent = fmtMoneyShort(totalInterest) + " CNY";
    els.totalPayment.textContent = fmtMoneyShort(totalPayment) + " CNY";
    els.interestRatio.textContent = totalPayment > 0 ? (totalInterest / totalPayment * 100).toFixed(1) + " %" : "—";

    var totalAmount = num(els.commercialAmount, 0) * 10000 + (isCombo ? num(els.gjjAmount, 0) * 10000 : 0);
    els.loanSummary.textContent =
      "Loan Amount" + fmtMoneyShort(totalAmount) + " CNY - " + years + " years (" + months + " periods)" +
      (isCombo ? "- Combined Loan" : "- Commercial Loan") +
      (repayType === "equalPrincipal" ? "- Equal Principal (last month " + fmtMoneyShort(last) + " CNY each month)" : "- Equal Installment (Principal and Interest)");

    /* 还款计划表 */
    els.tableBody.innerHTML = "";
    els.tableWrap.hidden = false;
    els.empty.hidden = true;

    var frag = document.createDocumentFragment();
    schedule.forEach(function (row) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td class='num'>" + row.month + "</td>" +
        "<td class='num'>" + row.payment.toFixed(2) + "</td>" +
        "<td class='num'>" + row.principal.toFixed(2) + "</td>" +
        "<td class='num'>" + row.interest.toFixed(2) + "</td>" +
        "<td class='num'>" + row.remain.toFixed(2) + "</td>";
      frag.appendChild(tr);
    });
    els.tableBody.appendChild(frag);
  }

  /* 输入实时计算 */
  [els.commercialAmount, els.commercialRate, els.gjjAmount, els.gjjRate, els.years].forEach(function (el) {
    el.addEventListener("input", render);
  });

  Array.prototype.forEach.call(els.loanType.querySelectorAll("input"), function (r) {
    r.addEventListener("change", render);
  });
  Array.prototype.forEach.call(els.repayType.querySelectorAll("input"), function (r) {
    r.addEventListener("change", render);
  });

  /* 复制还款计划 */
  els.btnCopyPlan.addEventListener("click", function () {
    if (!lastSchedule.length) {
      showToast("No repayment schedule to copy");
      return;
    }
    var lines = ["Period\tMonthly Payment\tPrincipal\tInterest\tRemaining Principal"];
    lastSchedule.forEach(function (row) {
      lines.push(row.month + "\t" + row.payment.toFixed(2) + "\t" + row.principal.toFixed(2) + "\t" + row.interest.toFixed(2) + "\t" + row.remain.toFixed(2));
    });
    var text = lines.join("\n");
    function done() { showToast("Repayment schedule copied (paste directly into Excel)"); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else {
      fallbackCopy(text);
      done();
    }
  });

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

  /* 轻提示 */
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

  render();
})();
