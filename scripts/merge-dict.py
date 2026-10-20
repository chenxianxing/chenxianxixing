# -*- coding: utf-8 -*-
"""合并全部翻译 fragment → assets/js/i18n/en.js（window.I18N_EN 字典）。
优先级（先到先得）：t-shell（首页/外壳权威）→ 11 个工具 fragment → t-salvage/datanet/dev/text/convert/secdesign。
- 冲突 key 记录到 .workbuddy/dict-conflicts.txt（后者不覆盖前者）
- 品牌名归一化：值中的 "Tools Collection" → "Online Tools"
- 手工补充条目放 manual-extra.json（优先级最高，可覆盖）
用法：python merge-dict.py
"""
import os
import json
import glob

ROOT = r'D:\www\chenxianxing'
FRAG = os.path.join(ROOT, 'assets', 'js', 'i18n', 'fragments')
OUT = os.path.join(ROOT, 'assets', 'js', 'i18n', 'en.js')
CONFLICTS = os.path.join(ROOT, '.workbuddy', 'dict-conflicts.txt')

MANUAL_EXTRA = os.path.join(FRAG, 'manual-extra.json')
CHUNKS = ['t-salvage.json', 't-datanet.json', 't-dev.json', 't-text.json', 't-convert.json', 't-secdesign.json']

# 1. manual-extra（最高优先） 2. t-shell 3. 工具 fragment 4. chunk 翻译
order = []
if os.path.exists(MANUAL_EXTRA):
    order.append(MANUAL_EXTRA)
if os.path.exists(os.path.join(FRAG, 't-shell.json')):
    order.append(os.path.join(FRAG, 't-shell.json'))
tool_frags = sorted(f for f in glob.glob(os.path.join(FRAG, '*.json'))
                    if os.path.basename(f) not in CHUNKS + ['t-shell.json']
                    and os.path.basename(f) != 'manual-extra.json')
order += tool_frags
order += [os.path.join(FRAG, c) for c in CHUNKS if os.path.exists(os.path.join(FRAG, c))]

merged = {}
conflicts = []
sources = []
for path in order:
    name = os.path.basename(path)
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    n_new = 0
    for k, v in data.items():
        if not isinstance(v, str) or not v.strip():
            continue
        if k in merged:
            if merged[k] != v:
                conflicts.append('%s\n  旧: %s\n  新: %s' % (k, merged[k], v))
            continue
        merged[k] = v
        n_new += 1
    sources.append('%s: %d 条（新增 %d）' % (name, len(data), n_new))

# 品牌名归一化
brand_fix = 0
for k in list(merged.keys()):
    v = merged[k]
    if 'Tools Collection' in v:
        merged[k] = v.replace('Tools Collection', 'Online Tools')
        brand_fix += 1

# 值为空/含未替换占位 {n} 的保留原样；写出
lines = ['/* ============================================================',
         '   在线工具大全 - 英文翻译字典（构建生成，请勿手工修改）',
         '   来源：assets/js/i18n/fragments/*.json（merge-dict.py 合并）',
         '   ============================================================ */',
         'window.I18N_EN = ']
lines.append(json.dumps(merged, ensure_ascii=False, indent=1))
lines.append(';')
with open(OUT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

with open(CONFLICTS, 'w', encoding='utf-8') as f:
    f.write('合并来源（按优先级）：\n  ' + '\n  '.join(sources) + '\n\n')
    f.write('总计 %d 条；品牌名归一化 %d 条；冲突 %d 个（保留先到者）：\n\n' % (len(merged), brand_fix, len(conflicts)))
    f.write('\n\n'.join(conflicts) if conflicts else '（无冲突）')

print('merged %d entries -> %s' % (len(merged), OUT))
print('sources:')
for s in sources:
    print('  ' + s)
print('brand normalized: %d, conflicts: %d (see dict-conflicts.txt)' % (brand_fix, len(conflicts)))
