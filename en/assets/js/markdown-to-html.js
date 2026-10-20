/* Markdown转HTML - 实时转换 / 完整文档 / 复制下载 */
(function () {
  "use strict";
  var input = document.getElementById("mhInput");
  var output = document.getElementById("mhOutput");
  var fullChk = document.getElementById("mhFull");
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  var currentHtml = "";
  function showToast(m){ if(!toastEl)return; toastEl.textContent=m; toastEl.classList.add("show"); if(toastTimer)clearTimeout(toastTimer); toastTimer=setTimeout(function(){toastEl.classList.remove("show");},2000); }
  function copyText(t,msg){ function d(){showToast(msg);} if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(d,function(){fc(t);d();}); } else { fc(t); d(); } }
  function fc(t){ var ta=document.createElement("textarea"); ta.value=t; ta.style.position="fixed"; ta.style.opacity="0"; document.body.appendChild(ta); ta.select(); try{document.execCommand("copy");}catch(e){} document.body.removeChild(ta); }

  function buildFull(body){
    return [
      "<!DOCTYPE html>",
      '<html lang="zh-CN">',
      "<head>",
      '  <meta charset="UTF-8">',
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
      "<title>Markdown Export</title>",
      "  <style>",
      "    body{max-width:860px;margin:40px auto;padding:0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;line-height:1.8;color:#1f2937;}",
      "    h1,h2,h3,h4,h5,h6{line-height:1.4;margin:22px 0 12px;}",
      "    h1{font-size:28px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;}",
      "    h2{font-size:23px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;}",
      "    h3{font-size:19px;}",
      "    p{margin:12px 0;}",
      "    ul,ol{margin:12px 0 12px 24px;}",
      "    blockquote{margin:14px 0;padding:10px 18px;border-left:4px solid #2563eb;background:#eff6ff;color:#1e40af;border-radius:6px;}",
      "    code{background:#f1f5f9;padding:2px 6px;border-radius:5px;font-family:Consolas,Menlo,monospace;font-size:13px;}",
      "    pre{background:#f8fafc;border:1px solid #e5e7eb;padding:16px;border-radius:10px;overflow:auto;}",
      "    pre code{background:none;padding:0;}",
      "    table{border-collapse:collapse;width:100%;margin:14px 0;font-size:14px;}",
      "    th,td{border:1px solid #e5e7eb;padding:8px 12px;text-align:left;}",
      "    th{background:#f8fafc;}",
      "    a{color:#2563eb;}",
      "    img{max-width:100%;}",
      "    hr{border:none;border-top:1px solid #e5e7eb;margin:20px 0;}",
      "  </style>",
      "</head>",
      "<body>",
      body,
      "</body>",
      "</html>"
    ].join("\n");
  }

  function convert(){
    var md=input.value;
    if(!md.trim()){
      output.innerHTML='<span class="empty-tip" style="padding:40px 0;">The converted HTML code will appear here</span>';
      currentHtml="";
      return;
    }
    var body="";
    if(window.marked && typeof window.marked.parse==="function"){
      try { body=window.marked.parse(md); } catch(e){ body="<pre>"+md+"</pre>"; }
    } else { body="<pre>"+md+"</pre>"; }
    currentHtml = fullChk.checked ? buildFull(body) : body;
    output.textContent=currentHtml;
  }

  input.addEventListener("input", convert);
  fullChk.addEventListener("change", convert);

  document.getElementById("btnCopy").addEventListener("click", function(){
    if(!currentHtml){ showToast("The conversion result is empty"); return; }
    copyText(currentHtml, "HTML code copied");
  });
  document.getElementById("btnDownload").addEventListener("click", function(){
    if(!currentHtml){ showToast("The conversion result is empty"); return; }
    var blob=new Blob([currentHtml], {type:"text/html;charset=utf-8"});
    var url=URL.createObjectURL(blob);
    var a=document.createElement("a");
    a.href=url; a.download="converted.html";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    showToast(".html file downloaded");
  });
  var SAMPLE="# Heading Example\n\nThis is a paragraph with **bold** and *italic* text.\n\n- Item 1\n- Item 2\n\n> Quoted content\n\n```js\nconsole.log('hello');\n```\n\n| Name | Description |\n| --- | --- |\n| A | Example |";
  document.getElementById("btnSample").addEventListener("click", function(){
    input.value=SAMPLE; convert(); showToast("Sample loaded");
  });
  document.getElementById("btnClear").addEventListener("click", function(){
    input.value=""; convert(); input.focus();
  });
  convert();
})();
