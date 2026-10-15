import re, json

s = open('tmp_shots/linev1_tree.txt', encoding='utf-8').read()

chunks = s.split("[FRAME] 'Chart column' id=")
cols = []
for ch in chunks[1:]:
    rects = re.findall(r"RECTANGLE\] 'column' id=\S+\s+box=(\{[^}]*\})", ch)
    bars = [json.loads(r) for r in rects[:2]]
    mname = re.search(r'text=\{"content": "([^"]+)"', ch)
    name = mname.group(1) if mname else '?'
    mb = re.search(r'box=(\{[^}]*\})', ch)
    frame = json.loads(mb.group(1))
    cols.append({
        'fx': round(frame.get('x', 0), 3),
        'bars': [[round(b.get('x', 0), 3), round(b.get('y', 0), 1), round(b['w'], 3), round(b['h'], 1)] for b in bars],
        'name': name,
    })

print('cols:', len(cols))
for c in cols:
    print(c['fx'], c['bars'], c['name'])
json.dump(cols, open('tmp_shots/linev1_cols.json', 'w'), ensure_ascii=False)
