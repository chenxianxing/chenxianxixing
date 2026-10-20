/* 文本对比 - LCS 行级差异 */
(function () {
  "use strict";
  var left = document.getElementById("tdLeft");
  var right = document.getElementById("tdRight");
  var ignoreWs = document.getElementById("tdIgnoreWs");
  var ignoreCase = document.getElementById("tdIgnoreCase");
  var result = document.getElementById("tdResult");
  var stats = document.getElementById("tdStats");
  var bigHint = document.getElementById("tdBigHint");
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function showToast(m){ if(!toastEl)return; toastEl.textContent=m; toastEl.classList.add("show"); if(toastTimer)clearTimeout(toastTimer); toastTimer=setTimeout(function(){toastEl.classList.remove("show");},2000); }
  function copyText(t,msg){ function d(){showToast(msg);} if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(d,function(){fc(t);d();}); } else { fc(t); d(); } }
  function fc(t){ var ta=document.createElement("textarea"); ta.value=t; ta.style.position="fixed"; ta.style.opacity="0"; document.body.appendChild(ta); ta.select(); try{document.execCommand("copy");}catch(e){} document.body.removeChild(ta); }
  function esc(s){ return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function norm(s){ if(ignoreCase.checked) s=s.toLowerCase(); if(ignoreWs.checked) s=s.replace(/\s+/g," ").trim(); return s; }
  function diffLines(origA, origB){
    var a=origA.map(norm), b=origB.map(norm), n=a.length, m=b.length, i, j;
    var dp=[]; for(i=0;i<=n;i++){ dp[i]=new Array(m+1); for(j=0;j<=m;j++) dp[i][j]=0; }
    for(i=n-1;i>=0;i--){ for(j=m-1;j>=0;j--){ dp[i][j] = (a[i]===b[j]) ? dp[i+1][j+1]+1 : Math.max(dp[i+1][j], dp[i][j+1]); } }
    var res=[], x=0, y=0;
    while(x<n && y<m){
      if(a[x]===b[y]){ res.push({t:"same", l:origA[x], r:origB[y]}); x++; y++; }
      else if(dp[x+1][y] >= dp[x][y+1]){ res.push({t:"del", l:origA[x]}); x++; }
      else { res.push({t:"add", r:origB[y]}); y++; }
    }
    while(x<n){ res.push({t:"del", l:origA[x]}); x++; }
    while(y<m){ res.push({t:"add", r:origB[y]}); y++; }
    return res;
  }
  function compare(){
    var la=left.value.split("\n"), lb=right.value.split("\n");
    var total=la.length+lb.length;
    bigHint.hidden = total < 2000;
    if(!left.value && !right.value){ result.innerHTML='<span class="empty-tip" style="padding:28px 0;">输入两段文本并点击“开始对比”后，差异将显示在这里</span>'; stats.hidden=true; return; }
    var res=diffLines(la, lb);
    var add=0, del=0, same=0, html="", ln=0, rn=0;
    res.forEach(function(r){
      if(r.t==="same"){ ln++; rn++; same++; html+='<div class="diff-row"><span class="ln">'+ln+'</span><span class="ln2">'+rn+'</span><span class="txt">'+esc(r.l)+'</span></div>'; }
      else if(r.t==="del"){ ln++; del++; html+='<div class="diff-row del"><span class="ln">'+ln+'</span><span class="ln2"></span><span class="txt">'+esc(r.l)+'</span></div>'; }
      else { rn++; add++; html+='<div class="diff-row add"><span class="ln"></span><span class="ln2">'+rn+'</span><span class="txt">'+esc(r.r)+'</span></div>'; }
    });
    result.innerHTML = html || '<span class="empty-tip" style="padding:28px 0;">两段文本完全相同</span>';
    stats.hidden=false;
    document.getElementById("tdAdd").textContent="新增 "+add+" 行";
    document.getElementById("tdDel").textContent="删除 "+del+" 行";
    document.getElementById("tdSame").textContent="相同 "+same+" 行";
    result._report = buildReport(res, add, del, same);
  }
  function buildReport(res, add, del, same){
    var lines=["文本差异报告","新增 "+add+" 行，删除 "+del+" 行，相同 "+same+" 行","----------------------------------------"];
    res.forEach(function(r){
      if(r.t==="same") lines.push("  "+r.l);
      else if(r.t==="del") lines.push("- "+r.l);
      else lines.push("+ "+r.r);
    });
    return lines.join("\n");
  }
  document.getElementById("btnCompare").addEventListener("click", compare);
  ignoreWs.addEventListener("change", compare);
  ignoreCase.addEventListener("change", compare);
  document.getElementById("btnSwap").addEventListener("click", function(){
    var t=left.value; left.value=right.value; right.value=t; compare();
  });
  document.getElementById("btnCopyReport").addEventListener("click", function(){
    if(!result._report){ showToast("请先进行对比"); return; }
    copyText(result._report, "已复制差异报告");
  });
  document.getElementById("btnClear").addEventListener("click", function(){
    left.value=""; right.value=""; result.innerHTML='<span class="empty-tip" style="padding:28px 0;">输入两段文本并点击“开始对比”后，差异将显示在这里</span>'; stats.hidden=true; bigHint.hidden=true;
  });
  compare();
})();
