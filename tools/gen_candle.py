# 生成 CandleChartC.tsx
import json

items = json.load(open('tmp_shots/candle_items.json'))
cols = json.load(open('tmp_shots/candle_cols.json'))

candles_ts = "const CANDLES: Array<[number, number, number, number, number, boolean, boolean]> = [\n"
for i in items:
    green = i['color'].startswith('0,255,203')
    candles_ts += "  [%s, %s, %s, %s, %s, %s, %s],\n" % (
        i['x'], i['y'], i['h'], i['oy'], i['oh'],
        'true' if green else 'false', 'true' if i['glow'] else 'false')
candles_ts += "]"

cols_ts = "const COLUMNS: Array<[number, number, number, number]> = [\n"
for c in cols:
    cols_ts += "  [%s, %s, %s, %s],\n" % (c['x'], c['y'], c['w'], c['h'])
cols_ts += "]"

months = [('1月', 15.03), ('2月', 147.74), ('3月', 280.96), ('4月', 412.17), ('5月', 547.89), ('6月', 678.61),
          ('7月', 807.81), ('8月', 945.54), ('9月', 1077.26), ('10月', 1209.47), ('11月', 1342.69), ('12月', 1443.97)]
months_ts = "const MONTHS: Array<[string, number]> = [\n" + ",\n".join(
    "  ['%s', %s]" % (t, x) for t, x in months) + ",\n]"

TEMPLATE = open('tools/candle_template.tsx.txt', encoding='utf-8').read()
comp = (TEMPLATE
        .replace('__CANDLES_TS__', candles_ts)
        .replace('__COLS_TS__', cols_ts)
        .replace('__MONTHS_TS__', months_ts))
open('apps/web/src/modules/atlas/components/CandleChartC.tsx', 'w', encoding='utf-8').write(comp)
print('written', len(comp))
