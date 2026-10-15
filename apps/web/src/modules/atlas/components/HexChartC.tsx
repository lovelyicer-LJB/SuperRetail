/**
 * HexChartC —— Pixso Charts | 图表页 Hex graph
 * (节点 63:1187, 1063×134, 透明底)
 *
 * 设计值（SVG 导出实测）:
 *  - 蜂窝区 Hex range 1063×80.32 @ y0: 5 行 × 60/59/60/59/60 共 298 格
 *    六边形 15.3677×18.6607, x 节距 17.5635, 行距 15.367,
 *    偶数行 bboxX0=6, 奇数行 bboxX0=14.7812
 *  - 7 色阶: #176BF8 #383DCA #25245D #1E1E24(空) #772443 #DB3031 #FF8743
 *  - Legend 1040.59×36.68 @ (1,97): 33 根竖刻度 1×6.46, 节距 32.297,
 *    Gray-8 #2C2C35; 标签 0~200 步进 25, Description 12/16, Gray-5 #70707C
 */

const FW = 1063
const FH = 134

/** 实测色阶（索引即 HEX_ROWS 中的字符） */
const PALETTE = ['#176BF8', '#383DCA', '#25245D', '#1E1E24', '#772443', '#DB3031', '#FF8743']

/** 逐格颜色索引（从 Pixso 导出 SVG 逐格提取, 行 0~4 自上而下） */
const HEX_ROWS = [
  '001011311311231313313333333334343444544445454555555665666565',
  '00111111113113233133333333333333444444444455555565565555555',
  '000111111313312112313313333333434434343455455555455555655545',
  '10011113113133133333333333433444445445454554555555555455',
  '101111113312113113123333333333334443444445455555555555555555',
]

const HEX_POLY = '15.3677,4.5264 7.6636,0 0,4.5264 0,13.8781 7.6636,18.6607 15.3677,13.8781'
const PITCH_X = 17.5635
const ROW_Y = [0, 15.37, 30.74, 46.1, 61.47]
const ROW_X0 = [6, 14.7812, 6, 14.7812, 6]

/** Legend 刻度: 33 根, cx 起点 5.0357 (=1+0.806+3.2297), 节距 32.297 */
const TICK_CX0 = 5.0357
const TICK_PITCH = 32.297
const TICKS = Array.from({ length: 33 }, (_, i) => TICK_CX0 + i * TICK_PITCH)

/** 标签实测中心 x（含 legend x=1 偏移） */
const LABELS: Array<[string, number]> = [
  ['0', 5.152],
  ['25', 113.117],
  ['50', 241.382],
  ['75', 370.569],
  ['100', 504.371],
  ['125', 633.559],
  ['150', 762.747],
  ['175', 893.78],
  ['200', 1024.53],
]

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化
export interface HexChartCProps {
  /** 逐格颜色索引行（5 行字符串, 字符为 palette 下标）, 默认设计稿 298 格 */
  rows?: string[]
  /** 色阶, 默认 7 档实测色 */
  palette?: string[]
}

export function HexChartC({ rows = HEX_ROWS, palette = PALETTE }: HexChartCProps = {}) {
  return (
    <div className="sr-hxc relative h-full w-full select-none overflow-hidden font-sans" style={{ containerType: 'size' }}>
      <svg viewBox={`0 0 ${FW} ${FH}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        {/* 蜂窝 298 格, 按列从左到右错峰淡入 */}
        {rows.map((row, r) =>
          row.split('').map((ch, c) => (
            <polygon
              key={`${r}-${c}`}
              className="sr-hxc-cell"
              points={HEX_POLY}
              transform={`translate(${ROW_X0[r] + c * PITCH_X}, ${ROW_Y[r]})`}
              fill={palette[Number(ch)]}
              style={{ animationDelay: `${c * 14 + r * 40}ms` }}
            />
          )),
        )}
        {/* Legend 竖刻度 33 根 (y 97~103.46) */}
        {TICKS.map((cx) => (
          <line key={cx} className="sr-hxc-fade" x1={cx} y1={97} x2={cx} y2={103.46} stroke="#2C2C35" strokeWidth={1} />
        ))}
        {/* Legend 标签 0~200 */}
        {LABELS.map(([t, cx]) => (
          <text
            key={t}
            className="sr-hxc-fade"
            x={cx}
            y={124.46}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={12}
            fontWeight={400}
            fill="#70707C"
            style={{ fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif' }}
          >
            {t}
          </text>
        ))}
      </svg>
      <style>{`
        .sr-hxc-cell { opacity: 0; animation: sr-hxc-pop .5s ease-out forwards; }
        @keyframes sr-hxc-pop {
          from { opacity: 0; transform: scale(.6); transform-origin: center; transform-box: fill-box; }
          to   { opacity: 1; transform: scale(1); transform-origin: center; transform-box: fill-box; }
        }
        .sr-hxc-fade { opacity: 0; animation: sr-hxc-fadein .6s ease-out .7s forwards; }
        @keyframes sr-hxc-fadein { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .sr-hxc-cell, .sr-hxc-fade { animation: none !important; opacity: 1; }
        }
      `}</style>
    </div>
  )
}
