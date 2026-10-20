# -*- coding: utf-8 -*-
"""给全站页面注入「日间 / 夜间」切换：
 1. <head> 内尽早执行的内联脚本（避免刷新闪白）
 2. 顶部导航里的切换按钮
幂等：重复执行不会重复插入。
用法：python scripts/apply-theme.py
"""
import os
import re
import sys

ROOT = r'D:\www\chenxianxing'

HEAD_SNIPPET = ('  <script>(function(){try{var t=localStorage.getItem("ot-theme");'
                'if(t==="dark"){document.documentElement.setAttribute("data-theme","dark");}}'
                'catch(e){}})();</script>\n')

BTN_SNIPPET = '''        <button class="theme-toggle" id="themeToggle" type="button" aria-label="Toggle dark mode" aria-pressed="false">
          <svg class="ic-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"></circle><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"></path></svg>
          <svg class="ic-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5a8.5 8.5 0 1 0 10.8 10.8z"></path></svg>
        </button>
'''

NAV_RE = re.compile(r'(<nav class="site-nav">)([\s\S]*?)(\s*</nav>)')
HEAD_RE = re.compile(r'(\n[ \t]*<link rel="stylesheet" href="[^"]*assets/css/style\.css">)')


def process(path):
    src = open(path, encoding='utf-8').read()
    orig = src
    changed = []

    if 'ot-theme' not in src:
        m = HEAD_RE.search(src)
        if m:
            src = src[:m.start(1)] + '\n' + HEAD_SNIPPET.rstrip('\n') + src[m.start(1):]
            changed.append('head')
        else:
            # 兜底：插到 </head> 前
            src = src.replace('</head>', HEAD_SNIPPET + '</head>', 1)
            changed.append('head-fallback')

    if 'id="themeToggle"' not in src:
        def repl(m):
            return m.group(1) + m.group(2).rstrip() + '\n' + BTN_SNIPPET + m.group(3)
        src, n = NAV_RE.subn(repl, src, count=1)
        if n:
            changed.append('button')

    if src != orig:
        open(path, 'w', encoding='utf-8').write(src)
        return changed
    return []


def main():
    targets = []
    for name in ('index.html',):
        p = os.path.join(ROOT, name)
        if os.path.exists(p):
            targets.append(p)
    for sub in (('tools',), ('en',), ('en', 'tools')):
        d = os.path.join(ROOT, *sub)
        if os.path.isdir(d):
            for fn in sorted(os.listdir(d)):
                if fn.endswith('.html'):
                    targets.append(os.path.join(d, fn))

    ok, skip = 0, 0
    for p in targets:
        ch = process(p)
        if ch:
            ok += 1
        else:
            skip += 1
    print('pages=%d updated=%d unchanged=%d' % (len(targets), ok, skip))


if __name__ == '__main__':
    main()
