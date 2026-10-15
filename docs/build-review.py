from pathlib import Path
import html
import re

root = Path(__file__).resolve().parent
source = (root / 'architecture-v0.1.md').read_text(encoding='utf-8')

def inline(value):
    value = html.escape(value)
    return re.sub(r'\[([^\]]+)\]\((https://[^)]+)\)', r'<a href="\2" target="_blank" rel="noopener">\1 ↗</a>', value)

parts = source.split('\n## ')
sections, nav = [], []
for index, part in enumerate(parts[1:], 1):
    title, body = part.split('\n', 1)
    nav.append(f'<a href="#s{index}">{html.escape(title)}</a>')
    rendered = []
    code, listing = False, False
    for line in body.splitlines():
        if line.startswith('```'):
            if listing:
                rendered.append('</ul>')
                listing = False
            rendered.append('</code></pre>' if code else '<pre><code>')
            code = not code
        elif code:
            rendered.append(html.escape(line) + '\n')
        elif line.startswith('- '):
            if not listing:
                rendered.append('<ul>')
                listing = True
            rendered.append('<li>' + inline(line[2:]) + '</li>')
        else:
            if listing:
                rendered.append('</ul>')
                listing = False
            if line.strip():
                rendered.append('<p>' + inline(line) + '</p>')
    if listing:
        rendered.append('</ul>')
    sections.append(f'<section id="s{index}"><h2>{html.escape(title)}</h2>{"".join(rendered)}</section>')

template = '''<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>超零售 · 架构评审 v0.1</title>
<style>
:root{color-scheme:dark;--bg:#111313;--panel:#191c1b;--text:#e3e8e4;--muted:#a3afa8;--line:#303934;--accent:#c2ed91}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:24px}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.9 "Microsoft YaHei",system-ui,sans-serif}a{color:var(--accent);text-underline-offset:4px}aside{position:fixed;width:268px;inset:0 auto 0 0;padding:30px 22px;border-right:1px solid var(--line);overflow:auto}aside strong{display:block;font-size:22px;margin-bottom:4px}small,.muted{color:var(--muted)}nav{margin-top:28px}nav a{display:block;color:var(--muted);text-decoration:none;padding:8px 10px;font-size:13px;border-radius:5px}nav a:hover,nav a.active{background:var(--panel);color:var(--accent)}main{max-width:1340px;margin-left:268px;padding:52px 6vw 80px}.eyebrow{letter-spacing:3px;font-size:12px;color:var(--accent)}h1{font-size:42px;line-height:1.3;margin:16px 0}h2{font-size:23px;line-height:1.6;margin:0 0 24px}h3{font-size:17px;margin:0 0 8px}.lead{font-size:20px;color:var(--muted);max-width:760px}.tag{display:inline-block;border:1px solid var(--line);padding:4px 12px;margin:5px 6px 0 0;color:var(--accent);font-size:12px}.hero{padding-bottom:36px}.flow{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line);border:1px solid var(--line);margin:20px 0}.flow article{background:var(--panel);padding:22px 18px}.flow p{font-size:13px;color:var(--muted);margin:0}.foundation{padding:16px 20px;border:1px solid var(--line);color:var(--muted);margin-top:-12px}.decision{border-left:3px solid var(--accent);padding:6px 20px;margin:28px 0}section{padding:40px 0;border-top:1px solid var(--line)}section p{margin:14px 0}li{margin:12px 0}ul{padding-left:22px}pre{overflow:auto;padding:24px;background:var(--panel);border:1px solid var(--line);font:13px/1.9 Consolas,"Microsoft YaHei",monospace}button{font:inherit;background:var(--panel);color:var(--text);border:1px solid var(--line);padding:7px 16px;cursor:pointer}button:hover{border-color:var(--accent)}footer{color:var(--muted);font-size:12px}a:focus-visible,button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}@media(max-width:900px){aside{position:static;width:auto;border-right:0;border-bottom:1px solid var(--line)}nav{display:flex;overflow:auto;gap:8px;margin-top:16px}nav a{white-space:nowrap}main{margin:0;padding:30px 22px}h1{font-size:32px}.flow{grid-template-columns:repeat(2,1fr)}}@media print{aside,button{display:none}main{margin:0;padding:0;max-width:none}body{background:white;color:black;font-size:11pt}p,li{color:black}.flow article,pre{background:white;color:black}a{color:black}section{break-inside:auto}h2,h3{break-after:avoid}}
</style></head><body><aside><strong>超零售</strong><small>SUPER RETAIL / ARCHITECTURE</small><nav>__NAV__</nav></aside><main>
<header class="hero"><div class="eyebrow">PRODUCT & SYSTEM DESIGN · 01 OCT 2026</div><h1>四个入口，一个资产底座。</h1><p class="lead">从行情分析到创作、交易与参与。先建立可演进的边界，再按真实规模扩展。</p><span class="tag">v0.1 · 架构提案</span><span class="tag">Web 优先</span><span class="tag">行情展示与分析</span><span class="tag">MCP-ready 设计</span></header>
<div class="flow"><article><h3>01 版图</h3><p>图表 · 表格 · 地图<br>资产发现与分析</p></article><article><h3>02 商城</h3><p>商品 · 订单 · 交付<br>多类型资产销售</p></article><article><h3>03 互动</h3><p>活动 · 演出 · 赛事 · 游戏<br>参与与连接</p></article><article><h3>04 工坊</h3><p>设计 · 制作 · 提交<br>版本与发布</p></article></div>
<div class="foundation">共同底座：身份与组织 / 资产登记 / 权益与权限 / 数据能力 / 任务与审计</div>
<div class="decision"><strong>推荐起点：模块化业务单体 + 独立实时数据通道</strong><br><span class="muted">首期不做撮合。Web 与 MCP 共享应用用例，事务数据与行情分析分开。</span></div>
<p class="muted">本页是完整架构评审资料，并非产品界面原型。容量为待压测假设，所有功能仍处设计阶段。</p><button type="button" onclick="window.print()">打印 / 保存 PDF</button>
__SECTIONS__<footer>超零售 · 架构 v0.1 · 源文档 architecture-v0.1.md · 外部依据见正文链接</footer></main>
<script>const links=[...document.querySelectorAll('nav a')];const observer=new IntersectionObserver(entries=>{for(const e of entries){if(e.isIntersecting){for(const a of links)a.classList.toggle('active',a.hash==='#'+e.target.id)}}},{rootMargin:'0px 0px -65% 0px'});document.querySelectorAll('section').forEach(s=>observer.observe(s));</script>
</body></html>'''
(root / 'architecture-review-v0.1.html').write_text(template.replace('__NAV__', ''.join(nav)).replace('__SECTIONS__', ''.join(sections)), encoding='utf-8')
print(f'Generated review: {len(sections)} sections')
