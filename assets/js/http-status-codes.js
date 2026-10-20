/* ============================================================
   HTTP状态码速查 - 工具页逻辑
   数据硬编码：约 60 条状态码（1xx~5xx）
   ============================================================ */
(function () {
  "use strict";

  /* 状态码数据：code 数字，name 英文标准名，desc 中文说明，advice 常见原因/处理建议 */
  var DATA = [
    { code: 100, name: "Continue", desc: "客户端应继续发送请求剩余部分。", advice: "服务器已收到请求头，客户端可继续发送请求体。常见于大请求体分块上传时，服务器先确认再接收数据。" },
    { code: 101, name: "Switching Protocols", desc: "服务器同意切换协议。", advice: "如响应 Upgrade: websocket 即同意将连接升级为 WebSocket 协议。" },
    { code: 102, name: "Processing", desc: "服务器已收到请求并正在处理。", advice: "WebDAV 扩展，表示请求正在处理但尚未完成，用于避免客户端因长时间无响应而超时。" },
    { code: 103, name: "Early Hints", desc: "服务器在最终响应前先返回部分响应头。", advice: "用于性能优化，可在正式响应到达前提示客户端预加载资源（如 Link 头）。" },

    { code: 200, name: "OK", desc: "请求成功，响应体包含所请求的数据。", advice: "最常见的成功状态，无需特殊处理。" },
    { code: 201, name: "Created", desc: "请求成功并创建了新资源。", advice: "如 POST 创建用户成功，响应通常包含 Location 头指向新资源地址。" },
    { code: 202, name: "Accepted", desc: "请求已接受但尚未处理完成。", advice: "常用于异步任务/消息队列：请求已入队，处理结果稍后可得。" },
    { code: 203, name: "Non-Authoritative Information", desc: "成功但返回元信息来自第三方副本。", advice: "响应不是来自源服务器，而是代理或缓存转发的元信息。" },
    { code: 204, name: "No Content", desc: "请求成功但无返回内容。", advice: "如 DELETE、PUT 操作成功但无需返回响应体。客户端应保留当前页面不跳转。" },
    { code: 205, name: "Reset Content", desc: "请求成功，要求客户端重置输入。", advice: "提示客户端清空（重置）当前表单或输入区域。" },
    { code: 206, name: "Partial Content", desc: "服务器返回部分内容。", advice: "配合 Range 请求实现断点续传、音视频拖拽播放。检查请求头 Range 与响应头 Content-Range。" },
    { code: 207, name: "Multi-Status", desc: "响应包含多个独立状态。", advice: "WebDAV 批量操作，单个响应的不同资源可能有不同状态，需解析 XML 主体。" },
    { code: 226, name: "IM Used", desc: "已对资源应用增量编码（Delta）。", advice: "HTTP 增量编码响应，表示响应是对资源的实例操作结果（delta encoding）。" },

    { code: 300, name: "Multiple Choices", desc: "资源有多个可选表示。", advice: "服务器返回选项列表供客户端选择，如不同语言/格式版本。" },
    { code: 301, name: "Moved Permanently", desc: "资源已永久移动到新 URL。", advice: "客户端应更新书签/链接。搜索引擎会传递权重到新地址。GET/HEAD 会自动重定向。" },
    { code: 302, name: "Found", desc: "资源临时位于另一 URL。", advice: "临时跳转，原地址仍在使用，常用于登录后跳转。默认可能把 POST 改为 GET，需谨慎。" },
    { code: 303, name: "See Other", desc: "重定向到另一资源，应使用 GET。", advice: "强制以 GET 方法获取目标资源，用于避免表单重复提交（PRG 模式）。" },
    { code: 304, name: "Not Modified", desc: "资源未修改，可使用缓存副本。", advice: "配合 If-Modified-Since / ETag 实现缓存验证，客户端直接使用本地缓存，不传输响应体。" },
    { code: 305, name: "Use Proxy", desc: "必须通过指定代理访问。", advice: "已废弃，存在安全风险。现代浏览器不再支持。" },
    { code: 306, name: "(Unused)", desc: "预留状态码，已不再使用。", advice: "历史预留，未在任何标准中正式使用。" },
    { code: 307, name: "Temporary Redirect", desc: "临时重定向，保持原请求方法。", advice: "与 302 不同，307 明确禁止将方法从 POST 改为 GET，POST 仍是 POST。" },
    { code: 308, name: "Permanent Redirect", desc: "永久重定向，保持原请求方法。", advice: "与 301 不同，308 保持原请求方法不变（POST 仍是 POST），同时语义为永久迁移。" },

    { code: 400, name: "Bad Request", desc: "服务器无法理解请求。", advice: "多为语法错误、参数格式错误、JSON 解析失败。检查请求体/查询参数格式。" },
    { code: 401, name: "Unauthorized", desc: "请求需要身份验证。", advice: "缺少或携带了无效/过期的凭证。需先登录或携带有效的 Token/Authorization 头。" },
    { code: 402, name: "Payment Required", desc: "预留用于将来支付需求。", advice: "极少使用，部分 API 用作付费墙提示。非标准业务码。" },
    { code: 403, name: "Forbidden", desc: "服务器拒绝执行请求。", advice: "已认证但无权限访问。检查账号角色/资源 ACL，或文件/目录权限配置。" },
    { code: 404, name: "Not Found", desc: "服务器找不到请求的资源。", advice: "检查 URL 路径、文件名拼写是否正确，或资源是否已被删除/移动。" },
    { code: 405, name: "Method Not Allowed", desc: "请求方法不被允许。", advice: "如对只读资源使用 POST。查看响应 Allow 头中允许的方法。" },
    { code: 406, name: "Not Acceptable", desc: "无法生成可接受的响应内容。", advice: "服务器无法满足客户端 Accept 头要求的内容类型/语言。调整 Accept 头。" },
    { code: 407, name: "Proxy Authentication Required", desc: "需要代理身份验证。", advice: "与 401 类似，但针对代理服务器。需配置代理凭证。" },
    { code: 408, name: "Request Timeout", desc: "服务器等待请求超时。", advice: "客户端未在时限内发送完整请求。检查网络或放慢发送，可重试。" },
    { code: 409, name: "Conflict", desc: "请求与服务器当前状态冲突。", advice: "如并发编辑导致版本冲突（乐观锁）。需先获取最新状态再提交。" },
    { code: 410, name: "Gone", desc: "资源已永久删除且不可恢复。", advice: "比 404 更明确：资源曾经存在但已永久移除。清理引用该资源的链接。" },
    { code: 411, name: "Length Required", desc: "服务器要求包含 Content-Length。", advice: "请求需携带 Content-Length 头说明请求体长度。" },
    { code: 412, name: "Precondition Failed", desc: "前置条件不满足。", advice: "请求头中的 If-Match / If-Unmodified-Since 等条件不满足，常见于并发控制。" },
    { code: 413, name: "Payload Too Large", desc: "请求体过大。", advice: "超出服务器限制的上传体积。减小上传内容或调整服务器配置（如 client_max_body_size）。" },
    { code: 414, name: "URI Too Long", desc: "请求 URI 过长。", advice: "常见于过长的查询串。缩短 URL，或改用 POST 提交数据。" },
    { code: 415, name: "Unsupported Media Type", desc: "请求体媒体类型不被支持。", advice: "检查并设置正确的 Content-Type，如 application/json。" },
    { code: 416, name: "Range Not Satisfiable", desc: "请求的 Range 范围无法满足。", advice: "请求的范围超出文件实际大小。检查 Range 头边界值。" },
    { code: 417, name: "Expectation Failed", desc: "无法满足 Expect 请求头。", advice: "服务器无法处理 Expect: 100-continue 等期望。检查请求头或客户端配置。" },
    { code: 418, name: "I'm a teapot", desc: "愚人节玩笑（HTCPCP）。", advice: "RFC 2324 彩蛋，真实服务不应返回，常用于测试/玩笑。" },
    { code: 421, name: "Misdirected Request", desc: "请求被发送到错误的服务器。", advice: "虚拟主机配置错误或连接复用导致请求落到无法处理的服务器。检查代理/网关配置。" },
    { code: 422, name: "Unprocessable Entity", desc: "格式正确但语义错误。", advice: "请求体语法正确但业务校验失败（如字段值非法）。检查表单/参数合法性。" },
    { code: 423, name: "Locked", desc: "资源被锁定。", advice: "WebDAV 中资源已被锁定，无法修改。" },
    { code: 424, name: "Failed Dependency", desc: "因前置请求失败而失败。", advice: "WebDAV 中当前请求依赖的上一步操作失败。" },
    { code: 425, name: "Too Early", desc: "不愿处理可能重放的早期请求。", advice: "TLS 1.3 0-RTT 中请求存在重放风险，服务器拒绝处理。可重试为完整握手。" },
    { code: 426, name: "Upgrade Required", desc: "客户端应切换协议。", advice: "如要求升级到 TLS。检查 Upgrade 头并切换协议。" },
    { code: 428, name: "Precondition Required", desc: "服务器要求包含前置条件。", advice: "为避免丢失更新，要求请求携带 If-Match 等前置条件头。" },
    { code: 429, name: "Too Many Requests", desc: "请求过多，触发限流。", advice: "客户端发送过于频繁。参考 Retry-After 头等待后降低频率再试。" },
    { code: 431, name: "Request Header Fields Too Large", desc: "请求头字段过大。", advice: "请求头（如 Cookie）过大。缩减头大小或清除多余 Cookie。" },
    { code: 451, name: "Unavailable For Legal Reasons", desc: "因法律原因不可用。", advice: "如政府审查、版权移除等。常见于被要求下线的内容。" },

    { code: 500, name: "Internal Server Error", desc: "服务器遇到未预期错误。", advice: "服务端代码异常（未捕获异常/空指针等）。查看服务端日志定位问题。" },
    { code: 501, name: "Not Implemented", desc: "服务器不支持所需功能。", advice: "如请求了未实现的 HTTP 方法或特性。检查请求是否被支持。" },
    { code: 502, name: "Bad Gateway", desc: "网关从上游收到无效响应。", advice: "反向代理/网关拿到上游的非法响应。检查后端服务是否存活、是否崩溃。" },
    { code: 503, name: "Service Unavailable", desc: "服务器暂时不可用。", advice: "维护中或过载。常含 Retry-After 头，稍后重试即可，多为临时状态。" },
    { code: 504, name: "Gateway Timeout", desc: "网关等待上游响应超时。", advice: "上游服务处理过慢或挂起。检查后端性能、超时配置与依赖服务。" },
    { code: 505, name: "HTTP Version Not Supported", desc: "不支持请求的 HTTP 版本。", advice: "服务器不支持客户端使用的 HTTP 版本（如 HTTP/2 未启用）。" },
    { code: 506, name: "Variant Also Negotiates", desc: "透明内容协商出错。", advice: "配置循环导致协商失败。检查服务器内容协商（如 .var 文件）配置。" },
    { code: 507, name: "Insufficient Storage", desc: "服务器存储不足。", advice: "WebDAV 中服务器无法存储完成请求所需的数据。检查磁盘空间。" },
    { code: 508, name: "Loop Detected", desc: "处理请求时检测到循环。", advice: "WebDAV 中服务器发现无限循环。检查资源引用关系。" },
    { code: 510, name: "Not Extended", desc: "请求需要进一步的扩展。", advice: "服务器要求请求包含扩展策略信息才能完成。" },
    { code: 511, name: "Network Authentication Required", desc: "需进行网络认证。", advice: "常见于公共 Wi-Fi 的 captive portal 登录页，需先认证才能联网。" }
  ];

  var CAT_LABEL = {
    "1xx": "1xx 信息",
    "2xx": "2xx 成功",
    "3xx": "3xx 重定向",
    "4xx": "4xx 客户端错误",
    "5xx": "5xx 服务端错误"
  };

  var searchEl = document.getElementById("hsSearch");
  var tabsEl = document.getElementById("hsTabs");
  var listEl = document.getElementById("hsList");
  var countEl = document.getElementById("hsCount");
  var resetBtn = document.getElementById("hsReset");

  var currentCat = "all";
  var currentKw = "";

  function catOf(code) {
    return Math.floor(code / 100) + "xx";
  }

  function badgeClass(cat) {
    return cat === "1xx" ? "blue" : cat === "2xx" ? "green" : cat === "3xx" ? "" : cat === "4xx" ? "" : "red";
  }

  function render() {
    var kw = currentKw.trim().toLowerCase();
    var matched = DATA.filter(function (item) {
      if (currentCat !== "all" && catOf(item.code) !== currentCat) return false;
      if (!kw) return true;
      var hay = (item.code + " " + item.name + " " + item.desc + " " + item.advice).toLowerCase();
      return hay.indexOf(kw) > -1;
    });

    countEl.textContent = "共 " + matched.length + " 条" + (currentCat === "all" ? "" : "（" + CAT_LABEL[currentCat] + "）");

    if (!matched.length) {
      listEl.innerHTML = '<div class="empty-tip">没有匹配的状态码，换个关键词试试。</div>';
      return;
    }

    var html = "";
    matched.forEach(function (item) {
      var cat = catOf(item.code);
      var badge = '<span class="badge ' + badgeClass(cat) + '">' + CAT_LABEL[cat] + "</span>";
      html +=
        '<div class="hs-card cat-' + cat + '">' +
          '<div class="hs-card-head" data-code="' + item.code + '">' +
            '<span class="hs-code">' + item.code + "</span>" +
            badge +
            '<span class="hs-name">' + esc(item.name) + "<small>" + esc(item.desc) + "</small></span>" +
            '<span class="hs-toggle">▶</span>' +
          "</div>" +
          '<div class="hs-detail" hidden>' +
            "<div>" + esc(item.desc) + "</div>" +
            '<div class="hs-advice"><b>常见原因 / 处理建议：</b>' + esc(item.advice) + "</div>" +
          "</div>" +
        "</div>";
    });
    listEl.innerHTML = html;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* 分类 tab */
  tabsEl.addEventListener("click", function (e) {
    var tab = e.target.closest(".hs-tab");
    if (!tab) return;
    Array.prototype.forEach.call(tabsEl.querySelectorAll(".hs-tab"), function (t) {
      t.classList.remove("active");
    });
    tab.classList.add("active");
    currentCat = tab.getAttribute("data-cat");
    render();
  });

  /* 搜索 */
  searchEl.addEventListener("input", function () {
    currentKw = searchEl.value;
    render();
  });

  /* 展开/收起 */
  listEl.addEventListener("click", function (e) {
    var head = e.target.closest(".hs-card-head");
    if (!head) return;
    var card = head.parentNode;
    var detail = card.querySelector(".hs-detail");
    var open = card.classList.toggle("open");
    detail.hidden = !open;
  });

  resetBtn.addEventListener("click", function () {
    searchEl.value = "";
    currentKw = "";
    currentCat = "all";
    Array.prototype.forEach.call(tabsEl.querySelectorAll(".hs-tab"), function (t) {
      t.classList.toggle("active", t.getAttribute("data-cat") === "all");
    });
    render();
  });

  render();
})();
