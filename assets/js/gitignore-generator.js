/* ============================================================
   Gitignore 生成器 - 工具页逻辑
   按分组勾选常用忽略规则，合并去重生成 .gitignore
   ============================================================ */
(function () {
  "use strict";

  /* ---------- DOM ---------- */
  var output = document.getElementById("giOutput");
  var stats = document.getElementById("giStats");
  var btnAll = document.getElementById("giBtnAll");
  var btnClear = document.getElementById("giBtnClear");
  var btnCopy = document.getElementById("giBtnCopy");
  var btnDownload = document.getElementById("giBtnDownload");

  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  var currentText = "";

  /* ---------- 提示 ---------- */
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2000);
  }

  /* ---------- 复制 / 下载 ---------- */
  function copyText(text, okMsg) {
    if (!text) { showToast("没有可复制的内容"); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { showToast(okMsg || "已复制"); },
        function () { fallbackCopy(text, okMsg); }
      );
    } else {
      fallbackCopy(text, okMsg);
    }
  }
  function fallbackCopy(text, okMsg) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); showToast(okMsg || "已复制"); }
    catch (e) { showToast("复制失败"); }
    document.body.removeChild(ta);
  }
  function downloadFile(filename, text) {
    var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 100);
  }

  /* ---------- 分组与规则 ---------- */
  var GROUPS = [
    {
      key: "lang", title: "语言 / 框架",
      items: [
        { value: "node", label: "Node" },
        { value: "python", label: "Python" },
        { value: "java", label: "Java / Maven" },
        { value: "go", label: "Go" },
        { value: "rust", label: "Rust" },
        { value: "php", label: "PHP" },
        { value: "ruby", label: "Ruby" },
        { value: "dotnet", label: ".NET" }
      ]
    },
    {
      key: "editor", title: "编辑器",
      items: [
        { value: "vscode", label: "VS Code" },
        { value: "jetbrains", label: "JetBrains" },
        { value: "vim", label: "Vim" },
        { value: "sublime", label: "Sublime" }
      ]
    },
    {
      key: "os", title: "操作系统",
      items: [
        { value: "windows", label: "Windows" },
        { value: "macos", label: "macOS" },
        { value: "linux", label: "Linux" }
      ]
    },
    {
      key: "other", title: "其他",
      items: [
        { value: "docker", label: "Docker" },
        { value: "terraform", label: "Terraform" },
        { value: "env", label: "Env / 密钥" }
      ]
    }
  ];

  var RULES = {
    node: [
      "# Dependencies",
      "node_modules/",
      ".pnp",
      ".pnp.js",
      "# Testing",
      "coverage/",
      "# Production",
      "dist/",
      "build/",
      "# Logs",
      "npm-debug.log*",
      "yarn-debug.log*",
      "yarn-error.log*",
      "# Misc",
      ".DS_Store",
      "*.pem",
      ".env"
    ],
    python: [
      "__pycache__/",
      "*.py[cod]",
      "*$py.class",
      "*.so",
      ".Python",
      "build/",
      "dist/",
      "downloads/",
      "*.egg-info/",
      ".installed.cfg",
      "*.egg",
      ".pytest_cache/",
      ".mypy_cache/",
      ".venv/",
      "env/",
      "ENV/"
    ],
    java: [
      "target/",
      "*.class",
      "*.log",
      ".classpath",
      ".project",
      ".settings/"
    ],
    go: [
      "# Binaries",
      "*.exe",
      "*.exe~",
      "*.dll",
      "*.so",
      "*.dylib",
      "# Test binary",
      "*.test",
      "# Output of go build",
      "*.out",
      "# Dependency directories",
      "vendor/"
    ],
    rust: [
      "/target",
      "**/*.rs.bk",
      "Cargo.lock"
    ],
    php: [
      "/vendor/",
      "composer.phar",
      ".phpunit.result.cache",
      "*.log"
    ],
    ruby: [
      "/.bundle/",
      "/vendor/bundle",
      "/log/*.log",
      "/tmp/",
      "*.pid",
      "*.gem"
    ],
    dotnet: [
      "bin/",
      "obj/",
      "*.user",
      "*.suo",
      "*.userosscache",
      "*.sln.docstates"
    ],
    vscode: [
      ".vscode/"
    ],
    jetbrains: [
      ".idea/",
      "*.iml",
      "*.iws"
    ],
    vim: [
      "*.swp",
      "*.swo",
      "*~"
    ],
    sublime: [
      "*.sublime-workspace",
      "*.sublime-project"
    ],
    windows: [
      "# Windows",
      "Thumbs.db",
      "ehthumbs.db",
      "Desktop.ini",
      "$RECYCLE.BIN/",
      "*.lnk"
    ],
    macos: [
      ".DS_Store",
      ".AppleDouble",
      ".LSOverride",
      "._*",
      ".DocumentRevisions-V100",
      ".fseventsd",
      ".Spotlight-V100",
      ".TemporaryItems",
      ".Trashes",
      ".VolumeIcon.icns",
      ".com.apple.timemachine.donotpresent"
    ],
    linux: [
      "*~",
      ".directory",
      ".Trash-*"
    ],
    docker: [
      ".dockerignore",
      "docker-compose.override.yml"
    ],
    terraform: [
      "**/.terraform/*",
      "*.tfstate",
      "*.tfstate.*",
      ".terraform.lock.hcl",
      ".crash.log",
      ".crash.log.*",
      "*.tfstate.lock.info",
      ".terraform.rc"
    ],
    env: [
      ".env",
      ".env.*",
      "!.env.example",
      "*.pem",
      "*.key",
      "*.cert",
      "*.p12",
      "*.pfx",
      "secrets.json"
    ]
  };

  /* ---------- 字节数 ---------- */
  function byteLength(text) {
    try {
      return new Blob([text]).size;
    } catch (e) {
      return text.length;
    }
  }
  function fmtBytes(n) {
    if (n < 1024) return n + " B";
    return (n / 1024).toFixed(1) + " KB";
  }

  /* ---------- 生成 ---------- */
  function generate() {
    var seen = {};
    var lines = [];

    GROUPS.forEach(function (g) {
      var checked = g.items.filter(function (it) {
        var cb = document.querySelector('input[data-group="' + g.key + '"][value="' + it.value + '"]');
        return cb && cb.checked;
      });
      if (!checked.length) return;

      lines.push("# ===== " + g.title + " =====");
      checked.forEach(function (it) {
        lines.push("# " + it.label);
        var rules = RULES[it.value] || [];
        rules.forEach(function (rule) {
          if (rule === "") { lines.push(""); return; }
          if (seen[rule]) return;
          seen[rule] = true;
          lines.push(rule);
        });
        lines.push("");
      });
    });

    var text = lines.join("\n");
    if (!text.trim()) text = "";
    output.textContent = text;
    currentText = text;

    var nonEmpty = lines.filter(function (l) { return l.trim() !== ""; }).length;
    stats.textContent = nonEmpty + " 行 · " + fmtBytes(byteLength(text));
  }

  /* ---------- 事件 ---------- */
  btnAll.addEventListener("click", function () {
    Array.prototype.forEach.call(document.querySelectorAll('input[type="checkbox"][data-group]'), function (cb) { cb.checked = true; });
    generate();
    showToast("已全选");
  });
  btnClear.addEventListener("click", function () {
    Array.prototype.forEach.call(document.querySelectorAll('input[type="checkbox"][data-group]'), function (cb) { cb.checked = false; });
    generate();
    showToast("已清空");
  });
  btnCopy.addEventListener("click", function () {
    if (!currentText) { showToast("请先选择规则"); return; }
    copyText(currentText, "已复制 .gitignore");
  });
  btnDownload.addEventListener("click", function () {
    if (!currentText) { showToast("请先选择规则"); return; }
    downloadFile(".gitignore", currentText);
    showToast("已下载 .gitignore");
  });

  Array.prototype.forEach.call(document.querySelectorAll('input[type="checkbox"][data-group]'), function (cb) {
    cb.addEventListener("change", generate);
  });

  /* ---------- 初始化 ---------- */
  generate();
})();
