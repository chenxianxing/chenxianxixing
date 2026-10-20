# -*- coding: utf-8 -*-
"""把新增工具卡片登记到首页，并同步分类数量与总数文案。幂等。"""
import os
import re

ROOT = r'D:\www\chenxianxing'
IDX = os.path.join(ROOT, 'index.html')

CARDS = {
    'cat-dev': [
        ('json-to-types', 'JSON转类型', 'JSON 自动生成 TypeScript/Go/Python/Rust 类型定义', 'json,typescript,类型定义,代码生成,go,python,rust,json schema',
         '🧾', 'JSON转类型',
         '把 JSON 一键转成 TypeScript、Go、Python、Rust 类型定义或 JSON Schema，自动遍历数组元素合并推断联合类型。',
         ['JSON', '类型生成']),
        ('nginx-config', 'Nginx配置生成', '按需生成 Nginx server 配置，含 HTTPS、gzip、反代、缓存', 'nginx,配置生成,反向代理,https,gzip,websocket',
         '🌐', 'Nginx配置生成',
         '勾选静态站、SPA 或反向代理，生成含 HTTPS、gzip、静态缓存、安全响应头的完整 server 配置，直接复制使用。',
         ['Nginx', '运维']),
        ('gitignore-generator', '.gitignore生成', '勾选技术栈一键生成 .gitignore 忽略规则', 'gitignore,git,忽略规则,node,python,java',
         '🚫', '.gitignore生成',
         '按语言、编辑器、操作系统勾选模板，自动合并去重生成 .gitignore，支持复制与下载。',
         ['Git', '工程化']),
        ('unicode-convert', 'Unicode转换', '文本与 \\uXXXX、码点、HTML 实体、UTF-8 Hex 互转', 'unicode,转义,码点,utf-8,编码转换,乱码',
         '🔡', 'Unicode转换',
         '文本与 \\uXXXX 转义、U+ 码点、HTML 数字实体、UTF-8 Hex 多形式互转，并列出每个字符的码点明细。',
         ['Unicode', '编码']),
        ('svg-compress', 'SVG压缩', '删除冗余信息压缩 SVG 代码，显示压缩率', 'svg,压缩,优化,minify,图标',
         '✂️', 'SVG压缩',
         '清理注释、metadata、编辑器属性与多余空白，可控制数值精度，实时显示压缩前后体积与节省比例。',
         ['SVG', '压缩']),
    ],
    'cat-text': [
        ('text-lines', '文本行处理', '行去重、排序、加前后缀、正则查找替换', '文本,行去重,排序,查找替换,行处理,批量',
         '📑', '文本行处理',
         '按行去重、去空行、排序、加前后缀、加行号，支持正则查找替换，适合清洗名单、日志与批量文本。',
         ['文本', '批量处理']),
    ],
    'cat-convert': [
        ('html-entity', 'HTML实体编解码', '命名实体与数字实体互转，含常用实体速查', 'html实体,转义,entity,实体编码,特殊字符',
         '🔣', 'HTML实体编解码',
         'HTML 命名实体与十进制/十六进制数字实体互转，可只转义必要字符或全部非 ASCII，附常用实体速查表。',
         ['HTML', '实体']),
    ],
    'cat-security': [
        ('aes-crypto', 'AES加解密', '口令式 AES-GCM/CBC 文本加密，本地完成', 'aes,加密,解密,对称加密,gcm,cbc',
         '🔒', 'AES加解密',
         '口令式 AES 文本加解密，支持 GCM/CBC、128/256 位与 PBKDF2 派生，输出自带参数的密文串，本地不上传。',
         ['AES', '加密']),
        ('rsa-crypto', 'RSA加解密', '生成 RSA 密钥对，公钥加密私钥解密', 'rsa,非对称加密,密钥对,pem,oaep',
         '🗝️', 'RSA加解密',
         '生成 2048/3072/4096 位 RSA 密钥对并导出 PEM，用公钥加密、私钥解密，适合加密短文本或密钥交换。',
         ['RSA', '非对称']),
    ],
    'cat-design': [
        ('image-crop', '图片裁剪', '拖拽裁剪框，锁定比例，支持旋转翻转', '图片裁剪,裁剪,crop,旋转,翻转,比例',
         '🖼️', '图片裁剪',
         '上传图片后拖动裁剪框、锁定常用比例、旋转翻转，导出 PNG/JPEG/WebP，全程本地处理。',
         ['图片', '裁剪']),
        ('image-stitch', '长图拼接', '多张图片纵向或横向拼成一张长图', '长图拼接,图片拼接,合并图片,长图',
         '🧵', '长图拼接',
         '多张图片纵向或横向拼接，可统一宽度、设置间距与背景色，导出高清长图。',
         ['图片', '拼接']),
        ('nine-grid', '九宫格切图', '一张图切成九宫格或多宫格，按序下载', '九宫格,切图,图片分割,朋友圈,grid',
         '🔲', '九宫格切图',
         '把一张图按 3×3、2×2、4×4 或自定义网格切分，支持居中裁正方形，按序号逐张下载。',
         ['图片', '切图']),
        ('image-color-picker', '图片取色器', '放大镜取色，输出 HEX/RGB/HSL，提取主色调', '取色器,图片取色,颜色,主色调,hex,rgb',
         '🎯', '图片取色器',
         '在图片上放大镜精准取色，输出 HEX/RGB/HSL，记录历史色卡并可一键提取整图主色调。',
         ['取色', '配色']),
    ],
    'cat-pdf': [
        ('image-to-pdf', '图片转PDF', '多张图片合成 PDF，可设纸张与每页张数', '图片转pdf,jpg转pdf,图片合成pdf,pdf',
         '📚', '图片转PDF',
         '把多张图片按顺序合成 PDF，可选 A4/Letter、横竖方向、页边距与每页 1/2/4 张，自定义质量。',
         ['PDF', '图片']),
        ('pdf-watermark', 'PDF加水印', '给 PDF 添加文字或图片水印，支持平铺', 'pdf水印,加水印,pdf,水印,批量',
         '💧', 'PDF加水印',
         '为 PDF 添加文字或图片水印，可调字号、颜色、透明度、角度与平铺方式，支持指定页码范围。',
         ['PDF', '水印']),
    ],
    'cat-life': [
        ('pomodoro', '番茄钟', '番茄工作法计时器，自动切换专注与休息', '番茄钟,倒计时,专注,计时器,pomodoro',
         '🍅', '番茄钟',
         '自定义专注与休息时长，进度圆环直观显示，阶段自动切换并响铃提醒，统计今日完成的番茄数。',
         ['效率', '计时']),
    ],
}

COUNTS = {'cat-dev': 13, 'cat-text': 8, 'cat-convert': 7, 'cat-security': 7,
          'cat-design': 12, 'cat-pdf': 3, 'cat-life': 5}


def card_html(c):
    slug, name, desc, tags, icon, h3, p, chips = c
    chip_html = ''.join('<span>%s</span>' % x for x in chips)
    return (
        '          <a class="tool-card" href="tools/%s.html" data-name="%s" data-desc="%s" data-tags="%s">\n'
        '            <div class="tool-icon">%s</div>\n'
        '            <h3>%s<span class="new-flag">NEW</span></h3>\n'
        '            <p>%s</p>\n'
        '            <div class="tool-tags">%s</div>\n'
        '          </a>\n'
    ) % (slug, name, desc, tags, icon, h3, p, chip_html)


def main():
    src = open(IDX, encoding='utf-8').read()
    added = 0

    for cat, cards in CARDS.items():
        # 分类块起点
        m = re.search(r'<div class="tool-category" id="%s">' % cat, src)
        if not m:
            print('缺少分类', cat)
            continue
        grid = src.find('<div class="tools-grid">', m.end())
        insert_at = src.find('\n', grid) + 1
        block = ''
        for c in cards:
            if 'tools/%s.html' % c[0] in src:
                continue
            block += card_html(c)
            added += 1
        if block:
            src = src[:insert_at] + block + src[insert_at:]

    # 分类数量
    for cat, num in COUNTS.items():
        m = re.search(r'(<div class="tool-category" id="%s">[\s\S]{0,400}?<span class="cat-count">)(\d+)( 款</span>)' % cat, src)
        if m:
            src = src[:m.start(2)] + str(num) + src[m.end(2):]

    # 总数文案
    src = src.replace('收录 53 款', '收录 69 款').replace('共 53 款工具', '共 69 款工具')
    src = src.replace('等 53 款高频刚需小工具', '等 69 款高频刚需小工具')
    src = src.replace('收录 53 款免费在线工具', '收录 69 款免费在线工具')

    open(IDX, 'w', encoding='utf-8').write(src)
    print('added cards:', added)


if __name__ == '__main__':
    main()
