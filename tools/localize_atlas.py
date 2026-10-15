"""版图（Atlas）组件本地化 codemod：
1. 字体: 'Inter, sans-serif' → 'HarmonyOS Sans SC', 'Noto Sans SC', sans-serif（字重/字号数值不变，
   HarmonyOS Sans SC 已覆盖 100-900 全字重）
2. 货币: 渲染层 $ → ¥（valuePrefix 默认值 / JSX 金额前缀 / 字面金额 / 趋势标签）
3. 文案: 英文 → 中文（精确字符串替换，含 AtlasPage 展示名）
仅替换渲染可见内容，不动注释与代码标识符。幂等：重复运行无变化。
"""
import pathlib
import sys

ROOT = pathlib.Path('apps/web/src/modules/atlas')
FONT_OLD = "'Inter, sans-serif'"
FONT_NEW = "'HarmonyOS Sans SC', 'Noto Sans SC', sans-serif'"

# 全局精确替换（所有 atlas tsx 文件）
GLOBAL = [
    (FONT_OLD, FONT_NEW),
    ("valuePrefix = '$'", "valuePrefix = '¥'"),
    ("trend=\"+$542\"", "trend=\"+¥542\""),
    ("trend=\"-$242\"", "trend=\"-¥242\""),
    ("valueLabel = '$39'", "valueLabel = '¥39'"),
    ('valueLabel="$39"', 'valueLabel="¥39"'),
    ("title = 'Spending trend'", "title = '消费趋势'"),
    ("timeLabel = '24 june'", "timeLabel = '6月24日'"),
    ('title="Spending trend"', 'title="消费趋势"'),
    ('timeLabel="24 june"', 'timeLabel="6月24日"'),
    ('title="Income"', 'title="收入"'),
    ('title="Expense"', 'title="支出"'),
    ('title="Cashback"', 'title="返现"'),
    ('title="Transfers"', 'title="转账"'),
    ('title="Credit limit"', 'title="信用额度"'),
    ('title="Total cashback"', 'title="累计返现"'),
    ('title="Spend this week"', 'title="本周消费"'),
    ('title="Restaurants"', 'title="餐饮"'),
    ('title="Subscriptions"', 'title="订阅"'),
    ('title="Сafé"', 'title="咖啡"'),  # 注意设计稿首字母是西里尔 С
]

# JSX 文本节点（整行独立文本）
TEXT = {
    'Income': '收入',
    'Expense': '支出',
    'Restaurants': '餐饮',
    'Portfolio': '投资组合',
    'Last Year': '去年',
    'Overall balance': '总余额',
    'Forecast': '预测',
    'Last Month': '上个月',
    'Spending trend': '消费趋势',
    'Top categories per month': '月度支出分类',
    'This month your spending was 20% more than last month': '本月支出比上月增加 20%',
    'Finance App': '金融应用',
    'Progress': '进度',
    'House': '住房',
    'Etherium': '以太坊',
    'Last transfer': '最近转账',
    'Total expenses per month': '每月总支出',
    '+$542': '+¥542',
    '$10,000': '¥10,000',
    '$3,440': '¥3,440',
}

# AtlasPage 展示名（组件清单 label）
PAGE_NAMES = {
    "'Income widget / L widget'": "'收入组件 / L'",
    "'Expense widget / L widget'": "'支出组件 / L'",
    "'Cashback widget / L widget'": "'返现组件 / L'",
    "'Transfers widgets / L widget'": "'转账组件 / L'",
    "'Progress widget / L widget'": "'进度组件 / L'",
    "'Crypto / L widget'": "'加密货币 / L'",
    "'Portfolio / M widget'": "'投资组合 / M'",
    "'Spend this week / M widget'": "'本周消费 / M'",
    "'Total cashback / M widget'": "'累计返现 / M'",
    "'Income / M widget'": "'收入 / M'",
    "'Expense / M widget'": "'支出 / M'",
    "'Total / M widget'": "'总计 / M'",
    "'Progress / S widget'": "'进度 / S'",
    "'Expense / S widget'": "'支出 / S'",
    "'Category / S widget'": "'分类 / S'",
    "'Income / S widget'": "'收入 / S'",
    "'Cashback / S widget'": "'返现 / S'",
    "'Credit limit / S widget'": "'信用额度 / S'",
    "'Income 2 / XS widget'": "'收入 2 / XS'",
    "'Income / XS widget'": "'收入 / XS'",
    "'Last transfet / XS widget'": "'最近转账 / XS'",
    "'Overall balance / XL widget'": "'总余额 / XL'",
    "'Spending trend / XL widget'": "'消费趋势 / XL'",
    "'Spending trend / M widget'": "'消费趋势 / M'",
    "'Mini indicator'": "'迷你指标环'",
    "'Indicator'": "'指标环'",
    "'Pie chart'": "'饼图'",
    "'Progress chart'": "'进度图'",
    "'Bubble chart'": "'气泡图'",
    "'Hex graph'": "'蜂窝图'",
    "'Line chart v2'": "'折线图 v2'",
    "'Line chart v1'": "'折线图 v1'",
    "'Candle chart'": "'K 线图'",
    ">Widgets &amp; Indicator<": ">组件与指标<",
    ">Charts | 图表<": ">图表<",
}

import re

changed_files = []
for f in sorted(ROOT.rglob('*.tsx')):
    src = f.read_text(encoding='utf-8')
    orig = src
    counts = {}

    # 1) 全局精确替换
    for old, new in GLOBAL:
        n = src.count(old)
        if n:
            src = src.replace(old, new)
            counts[f'{old[:40]}→{new[:30]}'] = n

    # 2) JSX 金额前缀 ${count.toLocaleString( / ${value.toLocaleString( → ¥{
    src, n1 = re.subn(r"\$\{(count|value)\.toLocaleString", r"¥{\1.toLocaleString", src)
    if n1:
        counts['$→¥ 金额前缀'] = n1

    # 3) JSX 独立文本行
    lines = src.split('\n')
    for i, ln in enumerate(lines):
        s = ln.strip()
        if s in TEXT:
            indent = ln[: len(ln) - len(ln.lstrip())]
            lines[i] = indent + TEXT[s]
            counts[f'文本 "{s}"'] = counts.get(f'文本 "{s}"', 0) + 1
    src = '\n'.join(lines)

    # 4) AtlasPage 展示名
    if f.name == 'AtlasPage.tsx':
        for old, new in PAGE_NAMES.items():
            n = src.count(old)
            if n:
                src = src.replace(old, new)
                counts[f'名称 {old[:36]}'] = n

    if src != orig:
        f.write_text(src, encoding='utf-8')
        changed_files.append(f.name)
        print(f'== {f.name}')
        for k, v in counts.items():
            print(f'   {v}× {k}')

print(f'\n共修改 {len(changed_files)} 个文件')
if not changed_files:
    sys.exit(0)
