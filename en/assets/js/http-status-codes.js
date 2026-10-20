/* ============================================================
   HTTP状态码速查 - 工具页逻辑
   数据硬编码：约 60 条状态码（1xx~5xx）
   ============================================================ */
(function () {
  "use strict";

  /* 状态码数据：code 数字，name 英文标准名，desc 中文说明，advice 常见原因/处理建议 */
  var DATA = [
    { code: 100, name: "Continue", desc: "The client should continue sending the rest of the request.", advice: "The server has received the request headers and the client may continue sending the request body. Common when uploading a large body in chunks: the server confirms first, then receives the data." },
    { code: 101, name: "Switching Protocols", desc: "The server agrees to switch protocols.", advice: "For example, a response with Upgrade: websocket agrees to upgrade the connection to the WebSocket protocol." },
    { code: 102, name: "Processing", desc: "The server has received the request and is processing it.", advice: "A WebDAV extension indicating the request is being processed but is not yet complete; used to prevent the client from timing out while waiting." },
    { code: 103, name: "Early Hints", desc: "The server returns some response headers before the final response.", advice: "Used for performance optimization: it hints to the client to preload resources (e.g. via the Link header) before the final response arrives." },

    { code: 200, name: "OK", desc: "The request succeeded and the response body contains the requested data.", advice: "The most common success status; no special handling is needed." },
    { code: 201, name: "Created", desc: "The request succeeded and a new resource was created.", advice: "For example, a successful POST that creates a user; the response usually includes a Location header pointing to the new resource." },
    { code: 202, name: "Accepted", desc: "The request has been accepted but processing is not yet complete.", advice: "Commonly used for async tasks/message queues: the request is queued and the result will be available later." },
    { code: 203, name: "Non-Authoritative Information", desc: "Success, but the returned metadata comes from a third-party copy.", advice: "The response is not from the origin server but metadata forwarded by a proxy or cache." },
    { code: 204, name: "No Content", desc: "The request succeeded but returns no content.", advice: "For example, a successful DELETE or PUT that needs no response body. The client should stay on the current page." },
    { code: 205, name: "Reset Content", desc: "The request succeeded and asks the client to reset the input.", advice: "Tells the client to clear (reset) the current form or input area." },
    { code: 206, name: "Partial Content", desc: "The server returns partial content.", advice: "Works with Range requests for resumable downloads and audio/video seeking. Check the Range request header and the Content-Range response header." },
    { code: 207, name: "Multi-Status", desc: "The response contains multiple independent statuses.", advice: "A WebDAV batch operation: different resources in a single response may have different statuses, so the XML body must be parsed." },
    { code: 226, name: "IM Used", desc: "Delta encoding has been applied to the resource.", advice: "An HTTP delta encoding response, meaning the response is the result of an instance manipulation of the resource." },

    { code: 300, name: "Multiple Choices", desc: "The resource has multiple available representations.", advice: "The server returns a list of options for the client to choose from, such as different language or format versions." },
    { code: 301, name: "Moved Permanently", desc: "The resource has moved permanently to a new URL.", advice: "The client should update bookmarks/links. Search engines pass ranking weight to the new address. GET/HEAD are redirected automatically." },
    { code: 302, name: "Found", desc: "The resource is temporarily at another URL.", advice: "A temporary redirect; the original address is still in use, often for post-login jumps. It may change POST to GET by default, so use with care." },
    { code: 303, name: "See Other", desc: "Redirect to another resource; use GET.", advice: "Forces a GET to the target resource to avoid duplicate form submissions (the PRG pattern)." },
    { code: 304, name: "Not Modified", desc: "The resource has not been modified; the cached copy can be used.", advice: "Works with If-Modified-Since / ETag for cache validation: the client uses its local cache directly and no response body is transferred." },
    { code: 305, name: "Use Proxy", desc: "The resource must be accessed through the specified proxy.", advice: "Deprecated and a security risk. Modern browsers no longer support it." },
    { code: 306, name: "(Unused)", desc: "A reserved status code, no longer used.", advice: "Historically reserved and never formally used in any standard." },
    { code: 307, name: "Temporary Redirect", desc: "A temporary redirect that preserves the original request method.", advice: "Unlike 302, 307 explicitly forbids changing the method from POST to GET; POST stays POST." },
    { code: 308, name: "Permanent Redirect", desc: "A permanent redirect that preserves the original request method.", advice: "Unlike 301, 308 keeps the original request method (POST stays POST) while semantically meaning a permanent move." },

    { code: 400, name: "Bad Request", desc: "The server cannot understand the request.", advice: "Usually a syntax error, malformed parameters, or failed JSON parsing. Check the request body and query parameter formats." },
    { code: 401, name: "Unauthorized", desc: "The request requires authentication.", advice: "Missing, invalid or expired credentials. Log in first or send a valid Token/Authorization header." },
    { code: 402, name: "Payment Required", desc: "Reserved for future payment requirements.", advice: "Rarely used; some APIs use it as a paywall hint. A non-standard business code." },
    { code: 403, name: "Forbidden", desc: "The server refuses to execute the request.", advice: "Authenticated but without permission. Check the account role/resource ACL, or file/directory permission settings." },
    { code: 404, name: "Not Found", desc: "The server cannot find the requested resource.", advice: "Check that the URL path and file name are spelled correctly, or whether the resource has been deleted or moved." },
    { code: 405, name: "Method Not Allowed", desc: "The request method is not allowed.", advice: "For example, using POST on a read-only resource. Check the Allow response header for permitted methods." },
    { code: 406, name: "Not Acceptable", desc: "The server cannot generate an acceptable response content.", advice: "The server cannot satisfy the content types/languages requested in the Accept header. Adjust the Accept header." },
    { code: 407, name: "Proxy Authentication Required", desc: "Proxy authentication is required.", advice: "Similar to 401, but for the proxy server. Proxy credentials must be configured." },
    { code: 408, name: "Request Timeout", desc: "The server timed out waiting for the request.", advice: "The client did not send the complete request in time. Check the network or slow down sending; retrying is possible." },
    { code: 409, name: "Conflict", desc: "The request conflicts with the current state of the server.", advice: "For example, a version conflict caused by concurrent editing (optimistic locking). Fetch the latest state before submitting." },
    { code: 410, name: "Gone", desc: "The resource has been permanently deleted and cannot be recovered.", advice: "More explicit than 404: the resource once existed but has been permanently removed. Clean up links that reference it." },
    { code: 411, name: "Length Required", desc: "The server requires a Content-Length header.", advice: "The request must include a Content-Length header stating the length of the request body." },
    { code: 412, name: "Precondition Failed", desc: "A precondition is not met.", advice: "Conditions such as If-Match / If-Unmodified-Since in the request headers are not met; common in concurrency control." },
    { code: 413, name: "Payload Too Large", desc: "The request body is too large.", advice: "The upload exceeds the server limit. Reduce the upload size or adjust server configuration (e.g. client_max_body_size)." },
    { code: 414, name: "URI Too Long", desc: "The request URI is too long.", advice: "Common with overly long query strings. Shorten the URL or submit the data via POST." },
    { code: 415, name: "Unsupported Media Type", desc: "The request body media type is not supported.", advice: "Check and set the correct Content-Type, such as application/json." },
    { code: 416, name: "Range Not Satisfiable", desc: "The requested Range cannot be satisfied.", advice: "The requested range exceeds the actual file size. Check the Range header bounds." },
    { code: 417, name: "Expectation Failed", desc: "The Expect request header cannot be satisfied.", advice: "The server cannot handle expectations such as Expect: 100-continue. Check the request headers or client configuration." },
    { code: 418, name: "I'm a teapot", desc: "An April Fools joke (HTCPCP).", advice: "An RFC 2324 easter egg that real services should never return; used for testing or jokes." },
    { code: 421, name: "Misdirected Request", desc: "The request was sent to the wrong server.", advice: "A virtual host misconfiguration or connection reuse sent the request to a server that cannot handle it. Check the proxy/gateway configuration." },
    { code: 422, name: "Unprocessable Entity", desc: "Well-formed but semantically erroneous.", advice: "The request body is syntactically valid but fails business validation (e.g. an illegal field value). Check the form/parameter validity." },
    { code: 423, name: "Locked", desc: "The resource is locked.", advice: "In WebDAV, the resource is locked and cannot be modified." },
    { code: 424, name: "Failed Dependency", desc: "Failed because a preceding request failed.", advice: "In WebDAV, the previous operation this request depends on failed." },
    { code: 425, name: "Too Early", desc: "The server refuses to process an early request that may be replayed.", advice: "In TLS 1.3 0-RTT, the request carries replay risk and the server refuses to process it. Retry with a full handshake." },
    { code: 426, name: "Upgrade Required", desc: "The client should switch protocols.", advice: "For example, an upgrade to TLS is required. Check the Upgrade header and switch protocols." },
    { code: 428, name: "Precondition Required", desc: "The server requires preconditions.", advice: "To avoid lost updates, the request must carry precondition headers such as If-Match." },
    { code: 429, name: "Too Many Requests", desc: "Too many requests; rate limiting triggered.", advice: "The client is sending too frequently. Wait per the Retry-After header, then reduce the rate and retry." },
    { code: 431, name: "Request Header Fields Too Large", desc: "The request header fields are too large.", advice: "The request headers (such as cookies) are too large. Reduce header size or clear unnecessary cookies." },
    { code: 451, name: "Unavailable For Legal Reasons", desc: "Unavailable for legal reasons.", advice: "For example, government censorship or copyright removal. Common for content required to be taken down." },

    { code: 500, name: "Internal Server Error", desc: "The server encountered an unexpected error.", advice: "A server-side code exception (uncaught exception, null pointer, etc.). Check the server logs to locate the issue." },
    { code: 501, name: "Not Implemented", desc: "The server does not support the required functionality.", advice: "For example, an unimplemented HTTP method or feature was requested. Check whether the request is supported." },
    { code: 502, name: "Bad Gateway", desc: "The gateway received an invalid response from the upstream.", advice: "The reverse proxy/gateway got an invalid response from the upstream. Check whether the backend service is alive or has crashed." },
    { code: 503, name: "Service Unavailable", desc: "The server is temporarily unavailable.", advice: "Under maintenance or overloaded. Often includes a Retry-After header; retrying later usually works, as this is a temporary state." },
    { code: 504, name: "Gateway Timeout", desc: "The gateway timed out waiting for the upstream response.", advice: "The upstream service is too slow or hung. Check backend performance, timeout settings and dependent services." },
    { code: 505, name: "HTTP Version Not Supported", desc: "The HTTP version of the request is not supported.", advice: "The server does not support the HTTP version used by the client (e.g. HTTP/2 is not enabled)." },
    { code: 506, name: "Variant Also Negotiates", desc: "Transparent content negotiation failed.", advice: "A configuration loop caused the negotiation to fail. Check the server content negotiation configuration (e.g. .var files)." },
    { code: 507, name: "Insufficient Storage", desc: "The server has insufficient storage.", advice: "In WebDAV, the server cannot store the data needed to complete the request. Check disk space." },
    { code: 508, name: "Loop Detected", desc: "A loop was detected while processing the request.", advice: "In WebDAV, the server detected an infinite loop. Check the resource references." },
    { code: 510, name: "Not Extended", desc: "The request requires further extensions.", advice: "The server requires the request to carry extension policy information before it can complete it." },
    { code: 511, name: "Network Authentication Required", desc: "Network authentication is required.", advice: "Common for the captive portal login page of public Wi-Fi; authenticate before you can access the network." }
  ];

  var CAT_LABEL = {
    "1xx": "1xx Informational",
    "2xx": "2xx Success",
    "3xx": "3xx Redirect",
    "4xx": "4xx Client Error",
    "5xx": "5xx Server Error"
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

    countEl.textContent = "Total " + matched.length + " entries" + (currentCat === "all" ? "" : "（" + CAT_LABEL[currentCat] + "）");

    if (!matched.length) {
      listEl.innerHTML = '<div class="empty-tip">No matching status codes. Try another keyword.</div>';
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
            '<div class="hs-advice"><b>Common causes / handling tips:</b>' + esc(item.advice) + "</div>" +
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
