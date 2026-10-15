/**
 * LineChartV2C —— Pixso Charts | 图表页 Line chart v2
 * (节点 63:543, 1536×457, 透明底)
 *
 * 设计值（DSL + SVG 导出实测）:
 *  - 网格线 5 条 y=8/80/152/224/296, x36..1536, Gray-9 #1E1E24
 *  - Y 轴 x35.5 y0..362 / X 轴 y362 x36..1536, Gray-6 #5B5B65
 *  - 竖参考线 x558.5 / x1081.5, y8..361, Gray-7 #40404A
 *  - Y 标签 3万~1万: Text 14/16 Gray-4 #8A8A98 @ 左端
 *  - 月份标签 1月~12月 @ y381, Text 14/16 Gray-3 #A9A9B7 opacity .6
 *  - 曲线区 1419.53×282 @ (36,48): 10 条贝塞尔彩带 strokeWidth 5,
 *    蓝/紫渐变 + #B30DFF #E861A3 #F4B067 #F65B4A #DA155C #F0B3CE #FFF #F4B333
 *  - 辉光 2 团 1034×540 (曲线层之上): 紫 rgba(97,30,215,.3) 中心 (-209,192),
 *    红 rgba(215,30,30,.3) 中心 (667,186), 径向 rx517 ry270
 *  - 迷你柱图 1500×42 @ y415: 66 柱, Gray-9 / rgba(72,7,234,.37) / Persian blue #4807EA
 */

const CURVES = [
  'M0 141C138.638 141 131.411 0 254.5 0C377.589 0 410.69 141 520.5 141C664.699 141 695 38.625 792.5 38.625C873.6 38.625 934.22 141 1044.5 141C1103.5 141 1167.5 83.5 1247 83.5C1315.99 83.5 1357.36 141 1419.53 141',
  'M0 141C138.638 141 129.411 19 252.5 19C375.589 19 409.19 141 519 141C643 141 689.175 57.612 800.5 57.612C881.6 57.612 935.22 141 1045.5 141C1112.5 141 1149.65 99.144 1261.5 99.144C1330.49 99.144 1357.36 141 1419.53 141',
  'M0 141C138.638 141 137.411 54 260.5 54C383.589 54 409.19 141 519 141C663.199 141 684.175 81.535 795.5 81.535C876.6 81.535 937.72 141 1048 141C1132 141 1153.15 111.152 1265 111.152C1333.99 111.152 1357.36 141 1419.53 141',
  'M0 141C138.638 141 126.911 87 250 87C373.089 87 413.19 141 523 141C667.199 141 678.675 104.09 790 104.09C871.1 104.09 931.72 141 1042 141C1119.5 141 1160 122.473 1258 122.473C1326.99 122.473 1357.36 141 1419.53 141',
  'M0 141.117C138.638 141.117 127.911 117.74 251 117.74C374.089 117.74 412.19 141.117 522 141.117C666.199 141.117 682.675 125.139 794 125.139C875.1 125.139 928.72 141.117 1039 141.117C1204.16 141.117 1137.65 133.097 1249.5 133.097C1318.49 133.097 1357.36 141.117 1419.53 141.117',
  'M0 184C138.638 184 133.411 141 256.5 141C379.589 141 412.19 184 522 184C666.199 184 674.675 154.609 786 154.609C867.103 154.609 935.72 184 1046 184C1211.16 184 1139.65 169.247 1251.5 169.247C1320.49 169.247 1357.36 184 1419.53 184',
  'M0 221C138.638 221 127.911 141 251 141C374.089 141 411.19 221 521 221C665.199 221 674.675 166.319 786 166.319C867.103 166.319 931.72 221 1042 221C1195.5 221 1141.15 193.553 1253 193.553C1321.99 193.553 1357.36 221 1419.53 221',
  'M0 256C138.638 256 124.411 141 247.5 141C370.589 141 407.19 256 517 256C661.199 256 678.175 177.396 789.5 177.396C870.603 177.396 933.72 256 1044 256C1173.5 256 1138.65 219 1250.5 219C1319.49 219 1357.36 256 1419.53 256',
  'M0 282C138.638 282 124.411 141 247.5 141C370.589 141 413.19 282 523 282C667.199 282 680.175 185.625 791.5 185.625C872.603 185.625 927.72 282 1038 282C1141.5 282 1141.65 233.625 1253.5 233.625C1322.49 233.625 1357.36 282 1419.53 282',
  'M0 150.74C138.638 150.74 125.411 141 248.5 141C371.589 141 410.69 150.74 520.5 150.74C664.699 150.74 639.175 144.083 750.5 144.083C831.603 144.083 931.22 150.74 1041.5 150.74C1151.78 150.74 1151.15 147.399 1263 147.399C1331.99 147.399 1357.36 150.74 1419.53 150.74',
]

/** 辉光阴影链 = Pixso 实测 6 层 DROP_SHADOW 原样展开（颜色/半径/偏移/透明度均来自 DSL） */
const SHADOW_1 =
  'drop-shadow(0 2.77px 2.21px rgba(37,22,249,.0787)) drop-shadow(0 6.65px 5.32px rgba(37,22,249,.1131)) drop-shadow(0 12.52px 10.02px rgba(37,22,249,.14)) drop-shadow(0 22.34px 17.87px rgba(37,22,249,.1669)) drop-shadow(0 41.78px 33.42px rgba(37,22,249,.2013)) drop-shadow(0 100px 80px rgba(37,22,249,.28))'
const SHADOW_3 =
  'drop-shadow(0 2.77px 2.21px rgba(201,30,255,.1209)) drop-shadow(0 6.65px 5.32px rgba(201,30,255,.1737)) drop-shadow(0 12.52px 10.02px rgba(201,30,255,.215)) drop-shadow(0 22.34px 17.87px rgba(201,30,255,.2563)) drop-shadow(0 41.78px 33.42px rgba(201,30,255,.3091)) drop-shadow(0 100px 80px rgba(201,30,255,.43))'
const SHADOW_6 =
  'drop-shadow(0 2.77px 2.21px rgba(255,95,21,.1406)) drop-shadow(0 6.65px 5.32px rgba(255,95,21,.2019)) drop-shadow(0 12.52px 10.02px rgba(255,95,21,.25)) drop-shadow(0 22.34px 17.87px rgba(255,95,21,.2981)) drop-shadow(0 41.78px 33.42px rgba(255,95,21,.3594)) drop-shadow(0 100px 80px rgba(255,95,21,.5))'
const SHADOW_7 =
  'drop-shadow(0 2.77px 2.21px rgba(255,19,94,.0956)) drop-shadow(0 6.65px 5.32px rgba(255,19,94,.1373)) drop-shadow(0 12.52px 10.02px rgba(255,19,94,.17)) drop-shadow(0 22.34px 17.87px rgba(255,19,94,.2027)) drop-shadow(0 41.78px 33.42px rgba(255,19,94,.2444)) drop-shadow(0 100px 80px rgba(255,19,94,.34))'

const CURVE_STYLES: Array<{ stroke: string; glow?: string }> = [
  { stroke: 'url(#sr-lv2-g1)', glow: SHADOW_1 },
  { stroke: 'url(#sr-lv2-g2)' },
  { stroke: '#B30DFF', glow: SHADOW_3 },
  { stroke: '#E861A3' },
  { stroke: '#F4B067' },
  { stroke: '#F65B4A', glow: SHADOW_6 },
  { stroke: '#DA155C', glow: SHADOW_7 },
  { stroke: '#F0B3CE' },
  { stroke: '#FFFFFF' },
  { stroke: '#F4B333' },
]

const COLUMNS: Array<[number, number, number, number, string, number]> = [
  [0, 7, 21, 31, '#1E1E24', 1],
  [23, 0, 20, 38, '#1E1E24', 1],
  [45, 2, 20, 36, '#1E1E24', 1],
  [67, 7, 20, 31, '#1E1E24', 1],
  [89, 7, 20, 31, '#1E1E24', 1],
  [111, 0, 20, 38, '#1E1E24', 1],
  [133, 7, 20, 31, '#1E1E24', 1],
  [155, 14, 20, 24, '#1E1E24', 1],
  [177, 24, 20, 14, '#1E1E24', 1],
  [199, 19, 20, 19, '#1E1E24', 1],
  [221, 20, 20, 18, 'rgba(72,7,234,.37)', 1],
  [243, 24, 20, 14, 'rgba(72,7,234,.37)', 1],
  [265, 24, 20, 14, 'rgba(72,7,234,.37)', 1],
  [287, 22, 20, 16, 'rgba(72,7,234,.37)', 1],
  [309, 21, 20, 17, '#4807EA', 0.8],
  [331, 19, 20, 19, '#4807EA', 0.8],
  [353, 13, 20, 25, '#4807EA', 1],
  [375, 11, 20, 27, '#4807EA', 1],
  [397, 10, 20, 28, '#4807EA', 1],
  [419, 24, 20, 14, '#4807EA', 1],
  [441, 24, 21, 14, 'rgba(72,7,234,.37)', 1],
  [464, 24, 21, 14, 'rgba(72,7,234,.37)', 1],
  [487, 14, 21, 24, '#4807EA', 1],
  [510, 24, 21, 14, '#4807EA', 1],
  [533, 20, 20, 18, '#4807EA', 1],
  [555, 21, 20, 17, '#4807EA', 1],
  [577, 24, 20, 14, 'rgba(72,7,234,.37)', 1],
  [599, 24, 20, 14, 'rgba(72,7,234,.37)', 1],
  [621, 20, 20, 18, '#4807EA', 1],
  [643, 24, 20, 14, 'rgba(72,7,234,.37)', 1],
  [665, 14, 20, 24, '#4807EA', 1],
  [687, 24, 20, 14, '#4807EA', 1],
  [709, 19, 20, 19, '#4807EA', 1],
  [731, 20, 20, 18, '#4807EA', 1],
  [753, 24, 20, 14, '#4807EA', 1],
  [775, 24, 20, 14, '#4807EA', 1],
  [797, 22, 20, 16, '#4807EA', 1],
  [819, 21, 20, 17, '#4807EA', 0.8],
  [841, 19, 20, 19, '#4807EA', 0.8],
  [863, 19, 20, 19, 'rgba(72,7,234,.37)', 1],
  [885, 13, 20, 25, 'rgba(72,7,234,.37)', 1],
  [907, 11, 20, 27, 'rgba(72,7,234,.37)', 1],
  [929, 10, 20, 28, 'rgba(72,7,234,.37)', 1],
  [951, 7, 20, 31, '#1E1E24', 1],
  [973, 19, 21, 19, '#1E1E24', 1],
  [996, 19, 21, 19, '#1E1E24', 1],
  [1019, 25, 21, 13, '#1E1E24', 1],
  [1042, 19, 21, 19, '#1E1E24', 1],
  [1065, 16, 20, 22, '#1E1E24', 1],
  [1087, 17, 20, 21, '#1E1E24', 1],
  [1109, 19, 20, 19, '#1E1E24', 1],
  [1131, 19, 20, 19, '#1E1E24', 1],
  [1153, 16, 20, 22, '#1E1E24', 1],
  [1175, 19, 20, 19, '#1E1E24', 1],
  [1197, 25, 20, 13, '#1E1E24', 1],
  [1219, 19, 20, 19, '#1E1E24', 1],
  [1241, 14, 20, 24, '#1E1E24', 1],
  [1263, 16, 20, 22, '#1E1E24', 1],
  [1285, 16, 20, 22, '#1E1E24', 1],
  [1307, 16, 20, 22, '#1E1E24', 1],
  [1329, 16, 20, 22, '#1E1E24', 1],
  [1373, 16, 20, 22, '#1E1E24', 1],
  [1395, 16, 20, 22, '#1E1E24', 1],
  [1417, 16, 20, 22, '#1E1E24', 1],
  [1439, 16, 20, 22, '#1E1E24', 1],
  [1351, 19, 20, 19, '#1E1E24', 1],
]

const MONTHS: Array<[string, number]> = [
  ['1月', 106.06],
  ['2月', 216.18],
  ['3月', 326.8],
  ['4月', 436.4],
  ['5月', 547.5],
  ['6月', 659.7],
  ['7月', 766.3],
  ['8月', 874.4],
  ['9月', 986.5],
  ['10月', 1097.1],
  ['11月', 1207.8],
  ['12月', 1319.4],
]

const FONT = 'HarmonyOS Sans SC, Noto Sans SC, sans-serif'

/** Y 轴标签: [文本, 中心 y]（原 10к~30к → 中文计数） */
const Y_LABELS: Array<[string, number]> = [
  ['3万', 8],
  ['2.5万', 80],
  ['2万', 152],
  ['1.5万', 224],
  ['1万', 296],
]

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化
export interface LineChartV2CProps {
  /** 10 条曲线 SVG path（曲线区 1419.53×282 坐标系）, 默认设计稿实测 */
  curves?: string[]
  /** 迷你柱 [x, y, w, h, fill, opacity]（1500×42 坐标系） */
  columns?: Array<[number, number, number, number, string, number]>
  /** 月份标签 [文本, 中心 x] */
  months?: Array<[string, number]>
  /** Y 轴标签 [文本, 中心 y] */
  yLabels?: Array<[string, number]>
}

export function LineChartV2C({ curves = CURVES, columns = COLUMNS, months = MONTHS, yLabels = Y_LABELS }: LineChartV2CProps = {}) {
  return (
    <div className="sr-lv2 relative h-full w-full select-none overflow-hidden font-sans" style={{ containerType: 'size' }}>
      <svg viewBox="0 0 1536 457" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="sr-lv2-g1" gradientUnits="userSpaceOnUse" x1={36} y1={0} x2={1455.53} y2={0}>
            <stop offset={0} stopColor="#0508E3" />
            <stop offset={1} stopColor="#0586E3" />
          </linearGradient>
          <linearGradient id="sr-lv2-g2" gradientUnits="userSpaceOnUse" x1={36} y1={0} x2={1455.53} y2={0}>
            <stop offset={0} stopColor="#4F07EF" />
            <stop offset={1} stopColor="#0764EF" />
          </linearGradient>
          <radialGradient
            id="sr-lv2-glow1"
            gradientUnits="userSpaceOnUse"
            cx={0}
            cy={0}
            r={517}
            gradientTransform="translate(-245,144) scale(1,0.5222)"
          >
            <stop offset={0} stopColor="rgba(97,30,215,0.3)" />
            <stop offset={1} stopColor="rgba(42,14,91,0)" />
          </radialGradient>
          <radialGradient
            id="sr-lv2-glow2"
            gradientUnits="userSpaceOnUse"
            cx={0}
            cy={0}
            r={517}
            gradientTransform="translate(631,138) scale(1,0.5222)"
          >
            <stop offset={0} stopColor="rgba(215,30,30,0.3)" />
            <stop offset={1} stopColor="rgba(209,63,63,0)" />
          </radialGradient>
        </defs>

        {/* 网格线 5 条 */}
        {[8, 80, 152, 224, 296].map((y) => (
          <line key={y} className="sr-lv2-fade" x1={36} y1={y} x2={1536} y2={y} stroke="#1E1E24" strokeWidth={1} />
        ))}
        {/* 竖参考线 + 坐标轴 */}
        <line className="sr-lv2-fade" x1={558.5} y1={8} x2={558.5} y2={361} stroke="#40404A" strokeWidth={1} />
        <line className="sr-lv2-fade" x1={1081.5} y1={8} x2={1081.5} y2={361} stroke="#40404A" strokeWidth={1} />
        <line className="sr-lv2-fade" x1={35.5} y1={0} x2={35.5} y2={362} stroke="#5B5B65" strokeWidth={1} />
        <line className="sr-lv2-fade" x1={36} y1={362} x2={1536} y2={362} stroke="#5B5B65" strokeWidth={1} />

        {/* Y 轴标签 */}
        {yLabels.map(([t, cy]) => (
          <text key={t} className="sr-lv2-fade" x={0} y={cy} dominantBaseline="central" fontSize={14} fontWeight={400} fill="#8A8A98" style={{ fontFamily: FONT }}>
            {t}
          </text>
        ))}
        {/* 月份标签 */}
        {months.map(([t, cx]) => (
          <text key={t} className="sr-lv2-fade" x={cx} y={389.5} textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={400} fill="#A9A9B7" opacity={0.6} style={{ fontFamily: FONT }}>
            {t}
          </text>
        ))}

        {/* 曲线层 @ (36,48) */}
        <g transform="translate(36,48)">
          {curves.map((d, i) => (
            <g key={i} className="sr-lv2-clip" style={{ animationDelay: `${i * 90}ms` }}>
              <path
                d={d}
                fill="none"
                stroke={CURVE_STYLES[i].stroke}
                strokeWidth={5}
                strokeLinejoin="round"
                style={CURVE_STYLES[i].glow ? { filter: CURVE_STYLES[i].glow } : undefined}
              />
            </g>
          ))}
          {/* 辉光 2 团（曲线之上） */}
          <ellipse className="sr-lv2-glow" cx={272} cy={144} rx={517} ry={270} fill="url(#sr-lv2-glow1)" />
          <ellipse className="sr-lv2-glow" cx={1148} cy={138} rx={517} ry={270} fill="url(#sr-lv2-glow2)" style={{ animationDelay: '.15s' }} />
        </g>

        {/* 迷你柱图 @ y415 */}
        <g transform="translate(0,415)">
          {columns.map(([x, y, w, h, fill, op], i) => (
            <rect key={i} className="sr-lv2-col" x={x} y={y} width={w} height={h} fill={fill} opacity={op} style={{ animationDelay: `${300 + i * 12}ms` }} />
          ))}
        </g>
      </svg>
      <style>{`
        .sr-lv2-clip { clip-path: inset(-150% 100% -150% 0); animation: sr-lv2-reveal 1s cubic-bezier(.22,1,.36,1) forwards; }
        @keyframes sr-lv2-reveal { to { clip-path: inset(-150% -5% -150% 0); } }
        .sr-lv2-fade { opacity: 0; animation: sr-lv2-fadein .7s ease-out .2s forwards; }
        @keyframes sr-lv2-fadein { to { opacity: 1; } }
        .sr-lv2-glow { opacity: 0; animation: sr-lv2-fadein 1.2s ease-out forwards; }
        .sr-lv2-col { transform: scaleY(0); transform-origin: bottom; transform-box: fill-box; animation: sr-lv2-grow .5s cubic-bezier(.22,1,.36,1) forwards; }
        @keyframes sr-lv2-grow { to { transform: scaleY(1); } }
        @media (prefers-reduced-motion: reduce) {
          .sr-lv2-clip { animation: none !important; clip-path: none; }
          .sr-lv2-fade, .sr-lv2-glow { animation: none !important; opacity: 1; }
          .sr-lv2-col { animation: none !important; transform: none; }
        }
      `}</style>
    </div>
  )
}
