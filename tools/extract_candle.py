import re, json

s = open('tmp_shots/candle_tree.txt', encoding='utf-8').read()

# 按 Candle item 帧切分
chunks = s.split("[FRAME] 'Candle item' id=")
items = []
for ch in chunks[1:]:
    mbox = re.search(r'box=(\{[^}]*\})', ch)
    box = json.loads(mbox.group(1))
    glow = 'DROP_SHADOW' in ch.split('constraints')[0]
    moc = re.search(r"RECTANGLE\] 'Open-Close' id=\S+\s+box=(\{[^}]*\})\s+fills=\[\{\"type\": \"solid\", \"value\": \"rgba\(([^)]*)\)", ch)
    oc = json.loads(moc.group(1))
    color = moc.group(2)
    items.append({
        'x': round(box.get('x', 0), 2), 'y': round(box.get('y', 0), 2), 'h': round(box['h'], 2),
        'oy': round(oc.get('y', 0), 2), 'oh': round(oc['h'], 2),
        'color': color, 'glow': glow,
    })

print('candles:', len(items))
from collections import Counter
print(Counter(i['color'] for i in items))
print('glows:', sum(1 for i in items if i['glow']))
json.dump(items, open('tmp_shots/candle_items.json', 'w'), ensure_ascii=False)

# 柱图提取
cols = []
for m in re.finditer(r"RECTANGLE\] 'column' id=\S+\s+box=(\{[^}]*\})\s+fills=(\[[^\]]*\])", s):
    b = json.loads(m.group(1))
    fill = m.group(2)
    sm = re.search(r'style:(\d+:\d+)', fill)
    if sm:
        tag = 'S' + sm.group(1)
    else:
        tag = re.search(r'rgba\(([^)]*)\)', fill).group(1)
    cols.append({'x': round(b.get('x', 0), 2), 'y': round(b.get('y', 0), 2),
                 'w': round(b['w'], 2), 'h': round(b['h'], 2), 'fill': tag})
print('columns:', len(cols))
print(Counter(c['fill'] for c in cols))
json.dump(cols, open('tmp_shots/candle_cols.json', 'w'), ensure_ascii=False)
