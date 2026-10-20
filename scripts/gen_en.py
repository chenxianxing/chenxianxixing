# -*- coding: utf-8 -*-
"""构建英文镜像站 en/：把全部中文页面与 JS 静态翻译为英文。
前置：先运行 merge-dict.py 生成 assets/js/i18n/en.js 字典。
步骤：
 1. 读字典（window.I18N_EN）
 2. 镜像 assets/ → en/assets/（JS 做字符串字面量翻译；CSS/vendor/i18n.js 原样复制）
 3. index.html + tools/*.html → en/index.html + en/tools/*.html（translate_page）
 4. 中文页补 hreflang（幂等）
 5. 报告：JS 命中数、未收录中文 key、页面清单
用法：python gen_en.py
"""
import os
import re
import json
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from i18n_lib import translate_page, add_hreflang_zh, JS_STR_RE

ROOT = r'D:\www\chenxianxing'
EN = os.path.join(ROOT, 'en')
DICT_JS = os.path.join(ROOT, 'assets', 'js', 'i18n', 'en.js')
REPORT = os.path.join(ROOT, '.workbuddy', 'gen-en-report.txt')

CJK_RE = re.compile(r'[\u4e00-\u9fff]')


def load_dict():
    src = open(DICT_JS, encoding='utf-8').read()
    m = re.search(r'window\.I18N_EN\s*=\s*(\{.*\})\s*;?\s*$', src, re.S)
    if not m:
        raise SystemExit('en.js 字典解析失败')
    return json.loads(m.group(1))


def _esc_unescaped(q, v):
    """只转义未转义的定界符；已转义序列（\\n、\\' 等）原样保留"""
    out = []
    i = 0
    n = len(v)
    while i < n:
        c = v[i]
        if c == '\\' and i + 1 < n:
            out.append(v[i:i + 2])
            i += 2
            continue
        if c == q:
            out.append('\\' + c)
            i += 1
            continue
        out.append(c)
        i += 1
    return ''.join(out)


def wrap_literal(q, v):
    """把译文安全写回 JS 字面量。保留值中已有的 \\n 等转义序列形态；
    仅处理原始控制字符与定界符冲突。"""
    v = v.replace('\r', '\\r').replace('\n', '\\n').replace('\t', '\\t')
    if q == "'":
        if "'" not in v:
            return "'%s'" % v
        if '"' not in v:
            return '"%s"' % v
        return "'%s'" % _esc_unescaped("'", v)
    if q == '"':
        if '"' not in v:
            return '"%s"' % v
        if "'" not in v:
            return "'%s'" % v
        return '"%s"' % _esc_unescaped('"', v)
    # 模板字符串：转义未转义的反引号与 ${
    return '`%s`' % _esc_unescaped('`', v).replace('${', '\\${')


def translate_js(src, d):
    """整字面量命中字典才替换（先精确后 strip），返回 (新源码, 命中数, 未命中中文key集合)"""
    stats = {'hit': 0}
    missed = set()

    def repl(m):
        if m.group(1) is not None:
            raw, q = m.group(1), "'"
        elif m.group(2) is not None:
            raw, q = m.group(2), '"'
        else:
            raw, q = m.group(3), '`'
        if not CJK_RE.search(raw):
            return m.group(0)
        v = d.get(raw)
        if v is None:
            t = raw.strip()
            v = d.get(t)
            if v is None:
                missed.add(t)
                return m.group(0)
        stats['hit'] += 1
        return wrap_literal(q, v)

    return JS_STR_RE.sub(repl, src), stats['hit'], missed


def main():
    d = load_dict()
    report = []
    report.append('字典条目：%d' % len(d))

    # ---------- 1. 镜像 assets ----------
    # 覆盖式构建：不清空 en/（避免批量删除），所有文件重新生成
    os.makedirs(EN, exist_ok=True)
    total_hit = 0
    all_missed = set()
    js_count = 0
    for dirpath, dirnames, filenames in os.walk(os.path.join(ROOT, 'assets')):
        rel_dir = os.path.relpath(dirpath, os.path.join(ROOT, 'assets'))
        # vendor 第三方库不翻译，原样复制
        if rel_dir.split(os.sep)[0] == 'vendor':
            continue
        dst_dir = os.path.join(EN, 'assets', rel_dir) if rel_dir != '.' else os.path.join(EN, 'assets')
        os.makedirs(dst_dir, exist_ok=True)
        for fn in filenames:
            src_f = os.path.join(dirpath, fn)
            dst_f = os.path.join(dst_dir, fn)
            if fn.endswith('.js') and fn != 'en.js' and fn != 'i18n.js':
                src = open(src_f, encoding='utf-8').read()
                if CJK_RE.search(src):
                    new, hit, missed = translate_js(src, d)
                    new = new.replace('在线工具大全', 'Online Tools')
                    total_hit += hit
                    all_missed |= missed
                    js_count += 1
                    with open(dst_f, 'w', encoding='utf-8') as f:
                        f.write(new)
                    continue
            shutil.copy2(src_f, dst_f)
    report.append('JS 翻译：%d 个文件含中文并翻译，字面量命中 %d 处' % (js_count, total_hit))
    if all_missed:
        report.append('未收录的中文 key（%d 个，将以上原文显示）：' % len(all_missed))
        for k in sorted(all_missed):
            report.append('  - %s' % k)

    # ---------- 2. 页面 ----------
    zh_pages = [('index.html', 'index.html', 'en/index.html')]
    tools_dir = os.path.join(ROOT, 'tools')
    for fn in sorted(os.listdir(tools_dir)):
        if fn.endswith('.html'):
            zh_pages.append((os.path.join('tools', fn), os.path.join('tools', fn),
                             os.path.join('en', 'tools', fn)))

    page_ok = 0
    for src_rel, zh_rel, en_rel in zh_pages:
        src = open(os.path.join(ROOT, src_rel), encoding='utf-8').read()
        en_html = translate_page(src, d, zh_rel, en_rel)
        if src_rel == 'index.html':
            # 中文页 JSON-LD 的 url 指向站根，英文页应指向 /en/
            en_html = en_html.replace('"url": "https://example.com/"',
                                      '"url": "https://example.com/en/"')
        dst = os.path.join(ROOT, en_rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, 'w', encoding='utf-8') as f:
            f.write(en_html)
        # 中文页补 hreflang
        zh_path = os.path.join(ROOT, src_rel)
        zh_src = open(zh_path, encoding='utf-8').read()
        zh_new = add_hreflang_zh(zh_src, zh_rel, en_rel)
        if zh_new != zh_src:
            with open(zh_path, 'w', encoding='utf-8') as f:
                f.write(zh_new)
        page_ok += 1
    report.append('页面：生成 %d 个英文页，中文页补 hreflang' % page_ok)

    with open(REPORT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report))
    # 控制台打印可能受 GBK 代码页限制，静默跳过
    try:
        print('\n'.join(report[:3]))
    except Exception:
        pass


if __name__ == '__main__':
    main()
