# -*- coding: utf-8 -*-
"""按“归属”拆分待翻译清单：.workbuddy/missing/<slug>.json（键相同，值为空）"""
import os
import sys
import json
import re

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import i18n_lib as L

ROOT = r'D:\www\chenxianxing'
DICT = os.path.join(ROOT, 'assets', 'js', 'i18n', 'en.js')
OUTDIR = os.path.join(ROOT, '.workbuddy', 'missing')
os.makedirs(OUTDIR, exist_ok=True)

SLUGS = ['json-to-types', 'gitignore-generator', 'nginx-config', 'unicode-convert', 'svg-compress',
         'html-entity', 'text-lines', 'aes-crypto', 'rsa-crypto', 'image-crop', 'image-stitch',
         'nine-grid', 'image-color-picker', 'image-to-pdf', 'pdf-watermark', 'pomodoro', 'html-format']

src = open(DICT, encoding='utf-8').read()
d = json.loads(re.search(r'window\.I18N_EN\s*=\s*(\{.*\})\s*;?\s*$', src, re.S).group(1))


def page_keys(rel):
    if not os.path.exists(os.path.join(ROOT, rel)):
        return []
    html = open(os.path.join(ROOT, rel), encoding='utf-8').read()
    return [k for k in L.extract_page_strings(html) if k not in d]


def js_keys(slug):
    p = os.path.join(ROOT, 'assets', 'js', slug + '.js')
    if not os.path.exists(p):
        return []
    return [k for k in L.extract_js_strings(open(p, encoding='utf-8').read()) if k not in d]


out = {}
out['index'] = page_keys('index.html')
for s in SLUGS:
    out[s] = page_keys('tools/%s.html' % s) + js_keys(s)

for k, v in out.items():
    seen, uniq = set(), []
    for x in v:
        if x not in seen:
            seen.add(x)
            uniq.append(x)
    json.dump({x: '' for x in uniq}, open(os.path.join(OUTDIR, k + '.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    print('%-24s %d' % (k, len(uniq)))
print('total', sum(len(set(v)) for v in out.values()))
