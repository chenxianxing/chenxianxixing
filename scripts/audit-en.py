# -*- coding: utf-8 -*-
"""英文镜像站专项验收：
 1. node --check 全部 en/assets/js/*.js
 2. HTTP 200：en 全部页面 + en/assets 全部资源
 3. 中文残留审计（跳过 script/style/pre/code/textarea/kbd/samp 与语言切换器"中文"标签）
 4. en 页 JSON-LD 解析 + hreflang/canonical/og:url 指向 en 地址
 5. 语言切换器反向链接存在
用法：python audit-en.py [port]
"""
import os
import re
import glob
import json
import subprocess
import threading
import http.server
import socketserver
import urllib.request
import sys

ROOT = r'D:\www\chenxianxing'
EN = os.path.join(ROOT, 'en')
NODE = r'C:\Users\41009\.workbuddy\binaries\node\versions\22.22.2-3\node.exe'
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8890
report = []
CJK = re.compile(r'[\u4e00-\u9fff]')

# ---------- 1. JS 语法 ----------
js_files = sorted(glob.glob(os.path.join(EN, 'assets', 'js', '*.js'))) + \
           sorted(glob.glob(os.path.join(EN, 'assets', 'js', 'i18n', '*.js')))
fails = []
for f in js_files:
    r = subprocess.run([NODE, '--check', f], capture_output=True, text=True)
    if r.returncode != 0:
        fails.append((os.path.relpath(f, ROOT).replace(os.sep, '/'), (r.stderr or '')[:200]))
report.append('[1] en JS syntax: %d/%d OK' % (len(js_files) - len(fails), len(js_files)))
for n, e in fails:
    report.append('    FAIL %s: %s' % (n, e.replace('\n', ' ')))

# ---------- 2. HTTP 200 ----------
pages = [os.path.join(EN, 'index.html')] + sorted(glob.glob(os.path.join(EN, 'tools', '*.html')))
assets = sorted(glob.glob(os.path.join(EN, 'assets', 'css', '*.css')))
assets += js_files
assets += sorted(glob.glob(os.path.join(EN, 'assets', 'vendor', '*.js')))
socketserver.TCPServer.allow_reuse_address = True
os.chdir(ROOT)
httpd = socketserver.TCPServer(('127.0.0.1', port), http.server.SimpleHTTPRequestHandler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()
bad = []
for f in pages + assets:
    rel = os.path.relpath(f, ROOT).replace(os.sep, '/')
    try:
        r = urllib.request.urlopen('http://127.0.0.1:%d/%s' % (port, rel), timeout=10)
        r.read()
        if r.status != 200:
            bad.append((rel, str(r.status)))
    except Exception as e:
        bad.append((rel, str(e)))
httpd.shutdown()
httpd.server_close()
report.append('[2] HTTP 200: %d/%d OK' % (len(pages) + len(assets) - len(bad), len(pages) + len(assets)))
for rel, e in bad:
    report.append('    FAIL %s: %s' % (rel, e))

# ---------- 3. 中文残留 ----------
TAG_RE = re.compile(r'<!--.*?-->|<[^>]+>', re.S)
SKIP = {'pre', 'code', 'textarea', 'script', 'style', 'kbd', 'samp'}

def residual(html):
    """返回页面可见区域的中文片段列表"""
    found = []
    skip = []
    pos = 0
    for m in TAG_RE.finditer(html):
        if m.start() > pos:
            seg = html[pos:m.start()]
            if not skip and CJK.search(seg):
                t = seg.strip()
                if t and t != '中文':  # 语言切换器当前语言标签
                    found.append(t[:60])
        chunk = m.group(0)
        if chunk.startswith('<!--'):
            pos = m.end()
            continue
        name = re.match(r'</?\s*([\w:-]+)', chunk)
        name = name.group(1).lower() if name else None
        if chunk.startswith('</'):
            if name in SKIP and skip and skip[-1] == name:
                skip.pop()
        elif not chunk.endswith('/>') and name in SKIP:
            skip.append(name)
        # 属性中的中文
        if not skip:
            for am in re.finditer(r'([\w:-]+)\s*=\s*"([^"]*)"', chunk):
                if am.group(1) in ('placeholder', 'title', 'aria-label', 'alt', 'value',
                                   'data-name', 'data-desc', 'data-tags', 'content') \
                        and CJK.search(am.group(2)):
                    found.append('@%s=%s' % (am.group(1), am.group(2)[:50]))
        pos = m.end()
    if pos < len(html):
        seg = html[pos:]
        if not skip and CJK.search(seg):
            t = seg.strip()
            if t and t != '中文':
                found.append(t[:60])
    return found

res_bad = []
for p in pages:
    html = open(p, encoding='utf-8').read()
    name = os.path.relpath(p, ROOT).replace(os.sep, '/')
    r = residual(html)
    if r:
        res_bad.append('%s: %d 处 -> %s' % (name, len(r), ' | '.join(r[:6])))
report.append('[3] 中文残留: %s' % ('全部干净' if not res_bad else '%d 页有残留' % len(res_bad)))
for x in res_bad:
    report.append('    ' + x)

# ---------- 4. JSON-LD / hreflang / canonical ----------
ld_bad, link_bad = [], []
for p in pages:
    html = open(p, encoding='utf-8').read()
    name = os.path.relpath(p, ROOT).replace(os.sep, '/')
    for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
        try:
            json.loads(m)
        except Exception as e:
            ld_bad.append('%s: %s' % (name, e))
    if 'hreflang="en"' not in html:
        link_bad.append('%s: 缺 hreflang=en' % name)
    if 'hreflang="zh-Hans"' not in html:
        link_bad.append('%s: 缺 hreflang=zh-Hans' % name)
    if 'https://example.com/en/' not in html:
        link_bad.append('%s: canonical/og:url 未指向 en 地址' % name)
    if '<html lang="en">' not in html:
        link_bad.append('%s: html lang 不是 en' % name)
    if 'og:locale" content="en_US"' not in html:
        link_bad.append('%s: og:locale 不是 en_US' % name)
    if not re.search(r'<a class="lang-link" href="\.\./(?:index\.html|\.\./tools/[\w-]+\.html)">中文</a>', html):
        link_bad.append('%s: 语言切换器未反链到中文页' % name)
report.append('[4] JSON-LD: %s' % ('all OK' if not ld_bad else 'FAIL'))
for x in ld_bad:
    report.append('    ' + x)
report.append('[4] hreflang/canonical/lang: %s' % ('all OK' if not link_bad else 'FAIL'))
for x in link_bad:
    report.append('    ' + x)

out = os.path.join(ROOT, '.workbuddy', 'audit-en-report.txt')
open(out, 'w', encoding='utf-8').write('\n'.join(report))
try:
    print('\n'.join(report[:8]))
except Exception:
    pass
