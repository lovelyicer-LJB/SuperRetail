# 生成 LineChartV1C.tsx
import json, re

cols = json.load(open('tmp_shots/linev1_cols.json'))

# 曲线: 从 SVG 提取 (frame 坐标即组件坐标)
s = open('tmp_export/logo_63_1171.svg', encoding='utf-8').read()
paths = re.findall(r'<path id="Chart line" d="([^"]+)"', s)
assert len(paths) == 4, len(paths)

grid_ts = "const GRID_COLS: Array<{ fx: number; bars: Array<[number, number, number, number]>; label: string }> = [\n"
for c in cols:
    day = int(c['name'].split('/')[0])
    bars = ', '.join('[%s, %s, %s, %s]' % tuple(b) for b in c['bars'])
    grid_ts += "  { fx: %s, bars: [%s], label: '2月%d日' },\n" % (c['fx'], bars, day)
grid_ts += "]"

paths_ts = "const CURVES = [\n" + ",\n".join("  '%s'" % p for p in paths) + ",\n]"

TEMPLATE = open('tools/linev1_template.tsx.txt', encoding='utf-8').read()
comp = TEMPLATE.replace('__GRID_TS__', grid_ts).replace('__PATHS_TS__', paths_ts)
open('apps/web/src/modules/atlas/components/LineChartV1C.tsx', 'w', encoding='utf-8').write(comp)
print('written', len(comp))
