# -*- coding: utf-8 -*-
"""多语言核心库：HTML 文本/属性抽取 + 静态英文页生成。
供 extract-strings.py（抽取中文文案清单）与 gen_en.py（生成 /en/ 镜像）共用。
"""
import re
import json

TAG_RE = re.compile(r'<!--.*?-->|<[^>]+>', re.S)
SKIP_TAGS = {'pre', 'code', 'textarea', 'script', 'style', 'kbd', 'samp'}
TRANSLATE_ATTRS = ('placeholder', 'title', 'aria-label', 'alt', 'data-name', 'data-desc', 'data-tags')
META_TEXT_KEYS = ('description', 'og:title', 'og:description')
ATTR_RE = re.compile(r'([\w:-]+)\s*=\s*"([^"]*)"')
CJK_RE = re.compile(r'[\u4e00-\u9fff]')
JSONLD_RE = re.compile(r'(<script type="application/ld\+json">)(.*?)(</script>)', re.S)
TITLE_RE = re.compile(r'(<title>)(.*?)(</title>)', re.S)
META_TAG_RE = re.compile(r'<meta\s[^>]*>')
SWITCH_RE = re.compile(
    r'<span class="lang-switch"><span class="lang-cur">中文</span>'
    r'<a class="lang-link" href="([^"]+)">English</a></span>')


def iter_segments(html):
    """把 HTML 切成 (kind, chunk)：kind ∈ comment/tag/text"""
    pos = 0
    for m in TAG_RE.finditer(html):
        if m.start() > pos:
            yield ('text', html[pos:m.start()])
        chunk = m.group(0)
        if chunk.startswith('<!--'):
            yield ('comment', chunk)
        else:
            yield ('tag', chunk)
        pos = m.end()
    if pos < len(html):
        yield ('text', html[pos:])


def tag_name(chunk):
    m = re.match(r'</?\s*([\w:-]+)', chunk)
    return m.group(1).lower() if m else None


def _json_escape(s):
    return (s.replace('\\', '\\\\').replace('"', '\\"')
             .replace('\n', '\\n').replace('\r', '').replace('\t', '\\t'))


def tr_text(s, d):
    """翻译文本节点：保留首尾空白，仅整段命中字典才替换"""
    m = re.match(r'^(\s*)([\s\S]*?)(\s*)$', s)
    core = m.group(2)
    if core in d:
        return m.group(1) + d[core] + m.group(3)
    return s


def tr_tag(chunk, d):
    """翻译标签内的属性值（placeholder/title/aria-label/alt/data-*；meta 的 content 特判）"""
    names = list(TRANSLATE_ATTRS)
    if chunk.startswith('<meta'):
        for am in ATTR_RE.finditer(chunk):
            if am.group(1) in ('name', 'property') and am.group(2) in META_TEXT_KEYS:
                names.append('content')
                break
    # 文本输入框的 value 是展示用默认值（如站点名），可安全翻译；
    # option/hidden/radio 等的 value 参与 JS 逻辑比较，一律不动
    elif chunk.startswith('<input'):
        tm = re.search(r'type="([^"]*)"', chunk)
        itype = (tm.group(1) if tm else 'text').lower()
        if itype in ('text', 'search'):
            names.append('value')

    def repl(m):
        name, val = m.group(1), m.group(2)
        if name in names and val in d:
            return '%s="%s"' % (name, d[val])
        return m.group(0)

    return ATTR_RE.sub(repl, chunk)


def _tr_jsonld_block(inner, d):
    new = inner
    # 长键优先，避免短键在长句内部被抢先替换
    for k in sorted(d.keys(), key=len, reverse=True):
        if k in new:
            new = new.replace(k, _json_escape(d[k]))
    json.loads(new)  # 校验，失败由调用方兜底
    return new


def _p(rel):
    """路径统一为 URL 正斜杠形态"""
    return rel.replace('\\', '/')


def _tr_keywords(tag, d):
    """meta keywords 按逗号分词后逐词翻译：命中字典用译文，未命中的纯 ASCII 词保留，
    中文未命中词丢弃（避免英文页出现中文关键词）"""
    cm = re.search(r'content="([^"]*)"', tag)
    if not cm:
        return tag
    toks = [t.strip() for t in re.split(r'[,，;；]', cm.group(1)) if t.strip()]
    out, seen = [], set()
    for t in toks:
        v = d.get(t) or d.get(t.lower())
        if v is None:
            v = t if not CJK_RE.search(t) else None
        if not v:
            continue
        v = v.strip()
        if v and v.lower() not in seen:
            seen.add(v.lower())
            out.append(v)
    if len(out) < 3:
        out += ['online tools', 'free tools', 'web tools', 'browser tools']
    new = ', '.join(out[:20])
    return tag.replace(cm.group(0), 'content="%s"' % new)


def _hreflang_block(zh_rel, en_rel):
    return (chr(10)+'  <link rel="alternate" hreflang="zh-Hans" href="https://example.com/%s">'
            + chr(10)+'  <link rel="alternate" hreflang="en" href="https://example.com/%s">'
            + chr(10)+'  <link rel="alternate" hreflang="x-default" href="https://example.com/%s">'
            ) % (zh_rel, en_rel, zh_rel)


SWITCH_ANY_RE = re.compile(r'<span class="lang-switch">.*?</a></span>', re.S)
SWITCH_TOKEN = '<!--LANG_SWITCH-->'


def translate_page(html, d, zh_rel, en_rel):
    """把中文页 HTML 转换为英文页 HTML。zh_rel/en_rel 如 'tools/x.html' / 'en/tools/x.html'"""
    zh_rel = _p(zh_rel)
    en_rel = _p(en_rel)
    # 0. 语言切换器先摘出，避免其标签文本被字典翻译；最后统一重写成英文页版本
    has_switch = bool(SWITCH_ANY_RE.search(html))
    if has_switch:
        html = SWITCH_ANY_RE.sub(SWITCH_TOKEN, html, count=1)
    # 1. <title>
    html = TITLE_RE.sub(lambda m: m.group(1) + tr_text(m.group(2), d) + m.group(3), html)
    # 2. 文本段 + 属性（跳过 pre/code/textarea/script/style 内容）
    out = []
    skip = []
    for kind, chunk in iter_segments(html):
        if kind == 'tag':
            name = tag_name(chunk)
            if chunk.startswith('</'):
                if name in SKIP_TAGS and skip and skip[-1] == name:
                    skip.pop()
            elif not chunk.endswith('/>') and name in SKIP_TAGS:
                skip.append(name)
            out.append(tr_tag(chunk, d))
        elif kind == 'comment':
            out.append(chunk)
        else:
            out.append(chunk if skip else tr_text(chunk, d))
    html = ''.join(out)
    # 3. JSON-LD 文本值
    def jl(m):
        try:
            return m.group(1) + _tr_jsonld_block(m.group(2), d) + m.group(3)
        except Exception:
            return m.group(0)
    html = JSONLD_RE.sub(jl, html)
    # 3.5 meta keywords 分词翻译 + 品牌名归一（页脚/标题/author/og:site_name 里残留的中文站名）
    def kw(m):
        tag = m.group(0)
        if 'name="keywords"' in tag or "name='keywords'" in tag:
            return _tr_keywords(tag, d)
        return tag
    html = META_TAG_RE.sub(kw, html)
    html = html.replace('在线工具大全', 'Online Tools')
    # 4. html lang / og:locale
    html = html.replace('<html lang="zh-CN">', '<html lang="en">')
    html = re.sub(r'(<meta property="og:locale" content=")zh_CN(")',
                  r'\g<1>en_US\g<2>', html)
    # 5. canonical / og:url 指向英文地址
    html = html.replace('https://example.com/' + zh_rel,
                        'https://example.com/' + en_rel)
    # 6. hreflang 重建（先清掉中文页带来的旧行，避免反斜杠/指向错误残留）
    html = HREFLANG_LINE_RE.sub('', html)
    html = html.replace('</head>', _hreflang_block(zh_rel, en_rel) + chr(10) + '</head>')
    # 7. 语言切换器：英文页展示「中文」回链 + 当前 English
    if has_switch:
        zh_href = ('../../tools/' + en_rel.split('/')[-1]) if en_rel.startswith('en/tools/') else '../index.html'
        markup = ('<span class="lang-switch"><a class="lang-link" href="%s">中文</a>'
                  '<span class="lang-cur">English</span></span>' % zh_href)
        html = html.replace(SWITCH_TOKEN, markup)
    # 8. 注入 i18n 运行时（en.js 先于 i18n.js）；根页用 assets/，工具页用 ../assets/
    if 'assets/js/i18n.js' not in html:
        pre = '' if en_rel.count('/') == 1 else '../'
        inject = (chr(10) + '  <script src="%sassets/js/i18n/en.js"></script>' % pre
                  + chr(10) + '  <script src="%sassets/js/i18n.js"></script>' % pre)
        html = html.replace('</body>', inject + chr(10) + '</body>')
    return html


HREFLANG_LINE_RE = re.compile(r'[ \t]*<link rel="alternate" hreflang="[^"]*"[^>]*>\s*\n?')


def add_hreflang_zh(html, zh_rel, en_rel):
    """给中文页补 hreflang（幂等：先清理旧行再插入，修正历史反斜杠地址）"""
    zh_rel = _p(zh_rel)
    en_rel = _p(en_rel)
    html = HREFLANG_LINE_RE.sub('', html)
    return html.replace('</head>', _hreflang_block(zh_rel, en_rel) + chr(10) + '</head>')


def _walk_jsonld(obj, found, seen):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in ('url', '@id', 'sameAs'):
                continue
            _walk_jsonld(v, found, seen)
    elif isinstance(obj, list):
        for v in obj:
            _walk_jsonld(v, found, seen)
    elif isinstance(obj, str) and CJK_RE.search(obj):
        t = obj.strip()
        if t and t not in seen:
            seen.add(t)
            found.append(t)


def extract_page_strings(html):
    """按文档顺序抽取全部待翻译中文串（去重）"""
    found, seen = [], set()

    def add(s):
        t = s.strip()
        if t and CJK_RE.search(t) and t not in seen:
            seen.add(t)
            found.append(t)

    m = TITLE_RE.search(html)
    if m:
        add(m.group(2))
    for m in META_TAG_RE.finditer(html):
        chunk = m.group(0)
        for am in ATTR_RE.finditer(chunk):
            if am.group(1) in ('name', 'property') and am.group(2) in META_TEXT_KEYS:
                cv = ATTR_RE.search(chunk)
                for cm in ATTR_RE.finditer(chunk):
                    if cm.group(1) == 'content':
                        add(cm.group(2))
                break
    skip = []
    for kind, chunk in iter_segments(html):
        if kind == 'tag':
            name = tag_name(chunk)
            if chunk.startswith('</'):
                if name in SKIP_TAGS and skip and skip[-1] == name:
                    skip.pop()
            elif not chunk.endswith('/>') and name in SKIP_TAGS:
                skip.append(name)
            for am in ATTR_RE.finditer(chunk):
                if am.group(1) in TRANSLATE_ATTRS:
                    add(am.group(2))
        elif kind == 'text' and not skip:
            add(chunk)
    for m in JSONLD_RE.finditer(html):
        try:
            _walk_jsonld(json.loads(m.group(2)), found, seen)
        except Exception:
            pass
    return found


JS_STR_RE = re.compile(r"'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"|`((?:[^`\\]|\\.)*)`")


def extract_js_strings(src):
    """抽取 JS 字符串字面量中含中文的（作为运行时字典 key 候选）"""
    found, seen = [], set()
    for m in JS_STR_RE.finditer(src):
        s = m.group(1) or m.group(2) or m.group(3) or ''
        if CJK_RE.search(s):
            t = s.strip()
            if t and t not in seen:
                seen.add(t)
                found.append(t)
    return found
