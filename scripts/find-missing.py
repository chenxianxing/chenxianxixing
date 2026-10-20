# -*- coding: utf-8 -*-
"""列出新增页面/首页中尚未收录进英文字典的中文串（导出 JSON 模板，值为空）"""
import os
import sys
import json
import re

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import i18n_lib as L

ROOT = r'D:\www\chenxianxing'
DICT = os.path.join(ROOT, 'assets', 'js', 'i18n', 'en.js')
OUT = os.path.join(ROOT, '.workbuddy', 'missing.json')

PAGES = ['index.html'] + ['tools/%s.html' % s for s in (
    'json-to-types', 'gitignore-generator', 'nginx-config', 'unicode-convert', 'svg-compress',
    'html-entity', 'text-lines', 'aes-crypto', 'rsa-crypto', 'image-crop', 'image-stitch',
    'nine-grid', 'image-color-picker', 'image-to-pdf', 'pdf-watermark', 'pomodoro', 'html-format')]

src = open(DICT, encoding='utf-8').read()
d = json.loads(re.search(r'window\.I18N_EN\s*=\s*(\{.*\})\s*;?\s*$', src, re.S).group(1))

missing = {}
stat = {}
for rel in PAGES:
    html = open(os.path.join(ROOT, rel), encoding='utf-8').read()
    keys = L.extract_page_strings(html)
    lack = []
    for k in keys:
        if k in d:
            continue
        lack.append(k)
        missing.setdefault(k, '')
    stat[rel] = (len(keys), len(lack))

# JS 字符串
for s in os.listdir(os.path.join(ROOT, 'assets', 'js')):
    if not s.endswith('.js') or s in ('main.js', 'i18n.js'):
        continue
    p = os.path.join(ROOT, 'assets', 'js', s)
    srcjs = open(p, encoding='utf-8').read()
    if not L.CJK_RE.search(srcjs):
        continue
    lack = 0
    for k in L.extract_js_strings(srcjs):
        if k in d or k in missing:
            continue
        missing.setdefault(k, '')
        lack += 1
    if lack:
        stat['js:' + s] = lack

json.dump(missing, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('missing entries:', len(missing))
for rel, v in stat.items():
    if isinstance(v, tuple):
        print('  %-42s total=%3d lack=%3d' % (rel, v[0], v[1]))
    else:
        print('  %-42s js-new=%3d' % (rel, v))
