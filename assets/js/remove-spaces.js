/* 去除空格 - 多种空白清理模式组合 */
(function () {
  "use strict";
  var input = document.getElementById("rsInput");
  var output = document.getElementById("rsOutput");
  var modesBox = document.getElementById("rsModes");
  var charsEl = document.getElementById("rsChars");
  var linesEl = document.getElementById("rsLines");
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function showToast(m){ if(!toastEl)return; toastEl.textContent=m; toastEl.classList.add("show"); if(toastTimer)clearTimeout(toastTimer); toastTimer=setTimeout(function(){toastEl.classList.remove("show");},2000); }
  function copyText(t,msg){ function d(){showToast(msg);} if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(d,function(){fc(t);d();}); } else { fc(t); d(); } }
  function fc(t){ var ta=document.createElement("textarea"); ta.value=t; ta.style.position="fixed"; ta.style.opacity="0"; document.body.appendChild(ta); ta.select(); try{document.execCommand("copy");}catch(e){} document.body.removeChild(ta); }

  var ORDER = ["trim","tabs","collapse","spaces","newlines","empty","all"];
  var FNS = {
    trim: function(s){ return s.replace(/^\s+|\s+$/g, ""); },
    tabs: function(s){ return s.replace(/\t/g, ""); },
    collapse: function(s){ return s.replace(/ +/g, " "); },
    spaces: function(s){ return s.replace(/ /g, ""); },
    newlines: function(s){ return s.replace(/[\r\n]+/g, ""); },
    empty: function(s){ return s.split(/\r?\n/).filter(function(l){ return l.trim() !== ""; }).join("\n"); },
    all: function(s){ return s.replace(/\s+/g, ""); }
  };

  function getActive(){
    var a=[];
    Array.prototype.forEach.call(modesBox.querySelectorAll("input:checked"), function(cb){ a.push(cb.value); });
    return a.sort(function(x,y){ return ORDER.indexOf(x)-ORDER.indexOf(y); });
  }
  function process(){
    var text=input.value;
    var beforeChars=text.length;
    var beforeLines=text === "" ? 0 : text.split(/\r?\n/).length;
    var res=text, active=getActive();
    active.forEach(function(k){ if(FNS[k]) res=FNS[k](res); });
    output.value=res;
    var afterChars=res.length;
    var afterLines=res === "" ? 0 : res.split(/\r?\n/).length;
    charsEl.textContent=beforeChars+" → "+afterChars;
    linesEl.textContent=beforeLines+" → "+afterLines;
  }
  Array.prototype.forEach.call(modesBox.querySelectorAll("input"), function(cb){
    cb.addEventListener("change", process);
  });
  input.addEventListener("input", process);
  document.getElementById("btnCopy").addEventListener("click", function(){
    if(!output.value){ showToast("处理结果为空"); return; }
    copyText(output.value, "已复制处理结果");
  });
  document.getElementById("btnClear").addEventListener("click", function(){
    input.value=""; output.value=""; charsEl.textContent="0 → 0"; linesEl.textContent="0 → 0"; input.focus();
  });
  process();
})();
