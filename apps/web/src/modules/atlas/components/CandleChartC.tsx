/**
 * CandleChartC —— Pixso Charts | 图表页 Candle chart
 * (节点 63:658, 1460×438.5, 透明底)
 *
 * 设计值（DSL + SVG 导出实测）:
 *  - 网格线 8 条 y=11/61/.../361, x0..1459, Gray-9 #1E1E24
 *  - 辉光 2 团 1034×540: 紫 rgba(44.8,30,215,.3) @ (580,-87), 绿 rgba(132,246,17,.3) @ (-88,-83),
 *    节点 opacity .5, 径向 rx517 ry270 (中心在椭圆左缘中点)
 *  - 蜡烛 101 根: 绿 #00FFCB / 紫 #6300FF, 影线 1px 居中, 实体 r1,
 *    20 根带 6 层绿辉光 rgba(21,255,59,...) (此处取 2 层近似)
 *  - 迷你柱图 @ y360.5: 65 柱 Gray-8 #2C2C35; 月份标签 @ y422.5 (中心 430.5),
 *    Text 14/16 Gray-3 #A9A9B7 opacity .6; 尾刻度 13×1 Gray-5 #70707C @ (1452.87, 412.5)
 */

const CANDLES: Array<[number, number, number, number, number, boolean, boolean]> = [
  [6, 29, 48, 9, 24, true, true],
  [92, 111, 68, 7, 14, true, false],
  [979, 138, 68, 47, 14, true, false],
  [120, 84, 68, 38, 20, true, true],
  [1007, 165, 68, 10, 20, true, false],
  [21, 34, 45, 16, 29, true, false],
  [78, 74, 74, 16, 47, true, true],
  [965, 169, 74, 11, 47, true, false],
  [176, 111, 114, 27, 47, true, true],
  [1063, 92, 114, 40, 47, true, false],
  [190, 126, 62, 21, 17, true, false],
  [1077, 129, 62, 24, 17, true, false],
  [260, 136, 109, 28, 51, true, true],
  [232, 146, 95, 18, 15, true, false],
  [1119, 76, 95, 62, 15, true, false],
  [303, 158, 62, 28, 26, true, true],
  [387, 149, 75, 41, 13, true, true],
  [542, 215, 61, 27, 13, true, false],
  [683, 142, 114, 8, 73, true, true],
  [1318, 82, 114, 8, 73, true, true],
  [1148, 95, 114, 33, 73, true, true],
  [669, 198, 50, 22, 20, true, false],
  [1304, 138, 50, 22, 20, true, false],
  [739, 136, 50, 22, 20, true, false],
  [1374, 76, 50, 22, 20, true, false],
  [1204, 165, 50, 8, 20, true, false],
  [767, 121, 70, 26, 15, true, false],
  [1402, 61, 70, 26, 15, true, false],
  [1232, 160, 70, 29, 15, true, false],
  [809, 146, 94, 18, 15, true, false],
  [1274, 111, 94, 61, 15, true, false],
  [852, 192, 74, 18, 15, true, false],
  [922, 129, 146, 18, 103, true, true],
  [838, 136, 109, 27, 52, true, false],
  [781, 60, 115, 45, 57, true, true],
  [1416, 0, 115, 45, 57, true, true],
  [1246, 176, 115, 13, 57, true, true],
  [753, 116, 111, 22, 39, true, false],
  [1388, 56, 111, 22, 39, true, true],
  [1218, 124, 111, 50, 39, true, false],
  [654, 223, 50, 8, 9, true, false],
  [724, 161, 50, 8, 9, true, false],
  [1359, 101, 50, 8, 9, true, false],
  [1189, 140, 50, 33, 9, true, false],
  [880, 155, 67, 31, 26, true, false],
  [936, 155, 104, 19, 29, true, false],
  [556, 202, 61, 27, 20, false, false],
  [697, 180, 44, 10, 7, false, false],
  [1332, 120, 44, 10, 7, false, false],
  [1162, 127, 44, 27, 7, false, false],
  [710, 167, 30, 10, 7, false, false],
  [1345, 107, 30, 10, 7, false, false],
  [1175, 154, 30, 13, 7, false, false],
  [795, 130, 75, 10, 29, false, false],
  [1260, 146, 75, 36, 29, false, false],
  [824, 149, 81, 16, 29, false, false],
  [1289, 121, 81, 36, 29, false, false],
  [866, 168, 64, 31, 19, false, false],
  [908, 180, 64, 31, 15, false, false],
  [894, 161, 85, 13, 38, false, false],
  [950, 171, 85, 13, 38, false, false],
  [613, 212, 71, 8, 34, true, false],
  [627, 221, 65, 8, 34, false, false],
  [640, 180, 79, 32, 39, false, false],
  [485, 196, 96, 28, 22, true, false],
  [598, 206, 74, 33, 33, true, false],
  [499, 213, 82, 21, 44, false, false],
  [514, 218, 82, 21, 44, false, false],
  [345, 129, 145, 18, 102, true, true],
  [275, 192, 62, 16, 16, true, false],
  [359, 159, 101, 16, 29, true, false],
  [415, 177, 78, 13, 42, true, true],
  [444, 112, 132, 13, 90, true, false],
  [570, 130, 151, 13, 111, false, false],
  [528, 166, 122, 20, 90, true, true],
  [204, 62, 113, 43, 57, true, true],
  [1091, 142, 113, 13, 57, true, true],
  [36, 41, 73, 16, 52, false, false],
  [49, 66, 73, 12, 31, false, false],
  [162, 136, 62, 12, 31, false, false],
  [1049, 119, 62, 19, 31, false, false],
  [218, 128, 76, 12, 31, false, false],
  [1105, 113, 76, 33, 31, false, false],
  [247, 149, 76, 17, 24, false, false],
  [1134, 92, 76, 35, 24, false, false],
  [289, 170, 61, 28, 16, false, false],
  [373, 166, 70, 19, 33, false, false],
  [458, 138, 86, 35, 33, false, false],
  [471, 179, 89, 34, 19, false, false],
  [584, 175, 93, 70, 11, false, false],
  [429, 121, 122, 56, 52, false, false],
  [401, 153, 97, 8, 57, false, false],
  [331, 183, 61, 28, 7, false, false],
  [317, 159, 85, 15, 38, false, false],
  [134, 71, 127, 8, 69, false, false],
  [1021, 119, 127, 50, 69, false, false],
  [63, 88, 48, 21, 13, false, false],
  [148, 96, 75, 48, 13, false, false],
  [1035, 146, 75, 14, 13, false, false],
  [106, 87, 85, 38, 24, false, false],
  [993, 145, 85, 23, 24, false, false],
]

const COLUMNS: Array<[number, number, number, number]> = [
  [0, 0, 19.96, 38],
  [21.95, 2, 20.96, 36],
  [44.9, 7, 19.96, 31],
  [66.86, 7, 20.96, 31],
  [89.81, 0, 19.96, 38],
  [111.76, 7, 19.96, 31],
  [133.71, 14, 20.96, 24],
  [156.66, 24, 19.96, 14],
  [178.62, 19, 20.96, 19],
  [201.57, 20, 19.96, 18],
  [223.52, 24, 19.96, 14],
  [245.47, 24, 20.96, 14],
  [268.43, 22, 19.96, 16],
  [290.38, 21, 20.96, 17],
  [313.33, 19, 19.96, 19],
  [335.28, 13, 19.96, 25],
  [357.23, 11, 19.96, 27],
  [379.19, 10, 19.96, 28],
  [401.14, 24, 20.96, 14],
  [424.09, 24, 20.96, 14],
  [447.04, 24, 20.96, 14],
  [469.99, 14, 21.95, 24],
  [493.94, 24, 20.96, 14],
  [516.89, 20, 20.96, 18],
  [539.84, 21, 19.96, 17],
  [561.8, 24, 19.96, 14],
  [583.75, 24, 20.96, 14],
  [606.7, 20, 19.96, 18],
  [628.65, 24, 20.96, 14],
  [651.6, 14, 19.96, 24],
  [673.56, 24, 19.96, 14],
  [695.51, 19, 20.96, 19],
  [718.46, 20, 19.96, 18],
  [740.41, 24, 20.96, 14],
  [763.37, 24, 19.96, 14],
  [785.32, 22, 19.96, 16],
  [807.27, 21, 20.96, 17],
  [830.22, 19, 19.96, 19],
  [852.17, 19, 20.96, 19],
  [875.13, 13, 19.96, 25],
  [897.08, 11, 19.96, 27],
  [919.03, 10, 20.96, 28],
  [941.98, 7, 19.96, 31],
  [963.94, 19, 21.95, 19],
  [987.88, 19, 20.96, 19],
  [1010.84, 25, 20.96, 13],
  [1033.79, 19, 21.95, 19],
  [1057.73, 16, 19.96, 22],
  [1079.69, 17, 19.96, 21],
  [1101.64, 19, 19.96, 19],
  [1123.59, 19, 19.96, 19],
  [1145.55, 16, 20.96, 22],
  [1168.5, 19, 19.96, 19],
  [1190.45, 25, 20.96, 13],
  [1213.4, 19, 19.96, 19],
  [1235.35, 14, 19.96, 24],
  [1257.31, 16, 20.96, 22],
  [1280.26, 16, 19.96, 22],
  [1302.21, 16, 20.96, 22],
  [1325.16, 16, 19.96, 22],
  [1347.12, 19, 19.96, 19],
  [1369.07, 29, 20.96, 9],
  [1392.02, 29, 19.96, 9],
  [1413.97, 28, 20.96, 10],
  [1436.92, 27, 19.96, 11],
]

const MONTHS: Array<[string, number]> = [
  ['1月', 15.03],
  ['2月', 147.74],
  ['3月', 280.96],
  ['4月', 412.17],
  ['5月', 547.89],
  ['6月', 678.61],
  ['7月', 807.81],
  ['8月', 945.54],
  ['9月', 1077.26],
  ['10月', 1209.47],
  ['11月', 1342.69],
  ['12月', 1443.97],
]

const FONT = 'HarmonyOS Sans SC, Noto Sans SC, sans-serif'

/** 网格线 y（Chart lines 帧内 0.5~350.5 + 帧偏移 10.5） */
const GRID_Y = [11, 61, 111, 161, 211, 261, 311, 361]

/** 蜡烛辉光（Pixso 6 层取头尾 2 层近似） */
const CANDLE_GLOW =
  'drop-shadow(0 2.77px 2.21px rgba(21,255,59,.0984)) drop-shadow(0 12.52px 10.02px rgba(21,255,59,.175)) drop-shadow(0 41.78px 33.42px rgba(21,255,59,.2516)) drop-shadow(0 100px 80px rgba(21,255,59,.35))'

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化
export interface CandleChartCProps {
  /** 蜡烛几何 [x, 影线y, 影线h, 实体偏移y, 实体h, 是否上涨, 是否辉光]（1460×438.5 坐标系）, 默认设计稿 101 根 */
  candles?: Array<[number, number, number, number, number, boolean, boolean]>
  /** 迷你柱 [x, y, w, h]（y360.5 起 65 柱） */
  columns?: Array<[number, number, number, number]>
  /** 月份标签 [文本, 中心 x] */
  months?: Array<[string, number]>
}

export function CandleChartC({ candles = CANDLES, columns = COLUMNS, months = MONTHS }: CandleChartCProps = {}) {
  return (
    <div className="sr-cdc relative h-full w-full select-none overflow-hidden font-sans" style={{ containerType: 'size' }}>
      <svg viewBox="0 0 1460 438.5" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="sr-cdc-glow1" gradientUnits="userSpaceOnUse" cx={0} cy={0} r={517} gradientTransform="translate(580,183) scale(1,0.5222)">
            <stop offset={0} stopColor="rgba(45,30,215,0.3)" />
            <stop offset={1} stopColor="rgba(0,0,0,0.3)" />
          </radialGradient>
          <radialGradient id="sr-cdc-glow2" gradientUnits="userSpaceOnUse" cx={0} cy={0} r={517} gradientTransform="translate(-88,187) scale(1,0.5222)">
            <stop offset={0} stopColor="rgba(132,246,17,0.3)" />
            <stop offset={1} stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        {/* 网格线 */}
        {GRID_Y.map((y) => (
          <line key={y} className="sr-cdc-fade" x1={0} y1={y} x2={1459} y2={y} stroke="#1E1E24" strokeWidth={1} />
        ))}

        {/* 蜡烛 101 根 */}
        {candles.map(([x, y, h, oy, oh, green, glow], i) => (
          <g
            key={i}
            className="sr-cdc-candle"
            style={{ animationDelay: `${i * 7}ms`, filter: glow ? CANDLE_GLOW : undefined }}
          >
            <rect x={x + 3} y={y} width={1} height={h} fill={green ? '#00FFCB' : '#6300FF'} />
            <rect x={x} y={y + oy} width={7} height={oh} rx={1} fill={green ? '#00FFCB' : '#6300FF'} />
          </g>
        ))}

        {/* 辉光 2 团（蜡烛之上, 节点 opacity .5） */}
        <ellipse className="sr-cdc-glow" cx={1097} cy={183} rx={517} ry={270} fill="url(#sr-cdc-glow1)" opacity={0.5} />
        <ellipse className="sr-cdc-glow" cx={429} cy={187} rx={517} ry={270} fill="url(#sr-cdc-glow2)" opacity={0.5} style={{ animationDelay: '.15s' }} />

        {/* 迷你柱图 @ y360.5 */}
        <g transform="translate(0,360.5)">
          {columns.map(([x, y, w, h], i) => (
            <rect key={i} className="sr-cdc-col" x={x} y={y} width={w} height={h} fill="#2C2C35" style={{ animationDelay: `${200 + i * 10}ms` }} />
          ))}
          {/* 尾刻度 */}
          <line className="sr-cdc-fade" x1={1452.87} y1={52} x2={1465.87} y2={52} stroke="#70707C" strokeWidth={1} />
          {/* 月份标签 */}
          {months.map(([t, cx]) => (
            <text key={t} className="sr-cdc-fade" x={cx} y={70.5} textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={400} fill="#A9A9B7" opacity={0.6} style={{ fontFamily: FONT }}>
              {t}
            </text>
          ))}
        </g>
      </svg>
      <style>{`
        .sr-cdc-candle { opacity: 0; animation: sr-cdc-pop .45s ease-out forwards; }
        @keyframes sr-cdc-pop {
          from { opacity: 0; transform: scaleY(.4); transform-origin: center; transform-box: fill-box; }
          to   { opacity: 1; transform: scaleY(1); transform-origin: center; transform-box: fill-box; }
        }
        .sr-cdc-fade { opacity: 0; animation: sr-cdc-fadein .7s ease-out .3s forwards; }
        @keyframes sr-cdc-fadein { to { opacity: 1; } }
        .sr-cdc-glow { opacity: 0; animation: sr-cdc-glowin 1.2s ease-out forwards; }
        @keyframes sr-cdc-glowin { from { opacity: 0; } to { opacity: .5; } }
        .sr-cdc-col { transform: scaleY(0); transform-origin: bottom; transform-box: fill-box; animation: sr-cdc-grow .5s cubic-bezier(.22,1,.36,1) forwards; }
        @keyframes sr-cdc-grow { to { transform: scaleY(1); } }
        @media (prefers-reduced-motion: reduce) {
          .sr-cdc-candle { animation: none !important; opacity: 1; }
          .sr-cdc-fade { animation: none !important; opacity: 1; }
          .sr-cdc-glow { animation: none !important; opacity: .5; }
          .sr-cdc-col { animation: none !important; transform: none; }
        }
      `}</style>
    </div>
  )
}
