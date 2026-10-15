import type { CSSProperties } from 'react'
import { useCountUp } from './use-count-up'
import { arcPath, arcLen } from './chart-utils'
import { BtcLogo, AvaxLogo, EthLogo, StxLogo, AdaLogo, NearLogo } from './crypto-logos'

/**
 * BubbleChartC —— Pixso Charts | 图表页 Bubble chart
 * (组件 63:485, 740×711.28, 透明底)
 *
 * 设计值（DSL 实测，坐标为组件内 px）:
 *  - Bg glow 63:486: 椭圆 1142.03×596.42 @ (-201.01,57.43), 径向渐变 rgba(97,30,215,.3)→rgba(42,14,91,0), 整体 opacity .3
 *  - 装饰环 63:487: 532.36² @ (109.34,89.46) 描边 #252525 w1.104
 *  - 装饰环 63:491: 711.28² @ (19.88,0) 线性渐变描边 rgba(37,37,69,.57)→透明(顶→底) w1.104
 *  - 装饰点 63:488/489/490: 19.88² 填 #000 描边 #252525; 63:492: 填 #070210 描边 #141426
 *  - 11 个 Simple bubble（63:493–503）+ 6 个加密货币气泡（BTC/AVAX/ETH/STX/ADA/NEAR）
 *  - 气泡通用配方: 底色 + 径向高光(椭圆 103%×146% @ -26%,-6%, 由 DSL gradient points 换算)
 *    + inset 彩色内阴影 + inset 白色顶高光 + 彩色外投影（紫/灰/红/橙/蓝系）
 *  - ETH 气泡帧带 6 层递减弱回声投影 rgba(61,4,67,*)（截图底部层叠效果来源）
 *  - 圆环: bg #3F3F4A(Gray-7) 近满环 arc 4.712389→-1.476749;
 *    AVAX #FFE60B 83% / ETH #06D7F6(Frosty skies) 80% / STX #62F782(Spring Green) 51% / ADA #06CAE7 无标签
 *  - 进度弧 arc 4.712389 起: AVAX/ADA →9.703957, ETH →9.310633, STX →7.853981
 *  - 文字 Inter Regular #F5F5F5(Gray-1): 83% 10px ls5%, 80%/51% 14px
 */

const W = 740
const H = 711.2836

/** 设计 px → 根容器百分比/cqw/cqh */
const px = (v: number) => `${((v / W) * 100).toFixed(3)}%`
const py = (v: number) => `${((v / H) * 100).toFixed(3)}%`
/** 设计 px → 指定帧内百分比（气泡内部元素定位用） */
const fp = (v: number, f: number) => `${((v / f) * 100).toFixed(3)}%`
const cx = (v: number) => `${((v / W) * 100).toFixed(3)}cqw`
const cy = (v: number) => `${((v / H) * 100).toFixed(3)}cqh`
const sh = (ox: number, oy: number, blur: number, color: string) => `${cx(ox)} ${cy(oy)} ${cx(blur)} ${color}`

/** 径向高光（所有气泡共享同一渐变几何, 由 DSL gradient points 实测换算） */
const hiGrad = (hi: string) => `radial-gradient(ellipse 103% 146% at -26% -6%, ${hi} 0%, rgba(0,2,16,0) 100%)`

/** 气泡配色配方 */
const PAL = {
  purple: { base: '#020091', hi: 'rgb(50,68,232)', inner: 'rgba(130,5,255,.95)', white: 'rgba(255,255,255,.58)', drop: 'rgba(35,0,248,1)' },
  grey: { base: '#424242', hi: 'rgb(112,112,112)', inner: 'rgba(81,80,81,.95)', white: 'rgba(255,255,255,.18)', drop: 'rgba(209,209,209,.45)' },
  avax: { base: 'rgb(0,93,146)', hi: 'rgb(163,232,50)', inner: 'rgba(40,255,5,.46)', white: 'rgba(255,255,255,.58)', drop: 'rgba(0,248,99,.41)' },
  eth: { base: '#020091', hi: 'rgb(50,68,232)', inner: 'rgba(219,0,255,1)', white: 'rgba(255,255,255,.58)', drop: '' },
  stx: { base: 'rgb(146,26,0)', hi: 'rgb(232,181,50)', inner: 'rgba(255,125,5,.95)', white: 'rgba(255,255,255,.58)', drop: 'rgba(248,59,0,1)' },
  ada: { base: 'rgb(148,0,0)', hi: 'rgb(232,50,50)', inner: 'rgba(255,5,5,.95)', white: 'rgba(255,255,255,.58)', drop: 'rgba(248,0,0,1)' },
  near: { base: 'rgb(26,83,193)', hi: 'rgb(50,188,232)', inner: 'rgba(160,246,252,.63)', white: 'rgba(255,255,255,.58)', drop: 'rgba(54,129,218,1)' },
} as const

type PalKey = keyof typeof PAL

/** 气泡阴影几何（随尺寸分档, DSL 实测） */
interface BubbleGeo { innerR: number; innerX: number; innerY: number; whiteR: number; whiteY: number; dropR: number; dropY: number }
const GEO = {
  sm: { innerR: 11.67, innerX: 5.83, innerY: 9.34, whiteR: 5.83, whiteY: 1.17, dropR: 46.68, dropY: 2.33 },
  md: { innerR: 29.92, innerX: 14.96, innerY: 23.94, whiteR: 14.96, whiteY: 2.99, dropR: 119.68, dropY: 5.98 },
  lg: { innerR: 20.42, innerX: 10.21, innerY: 16.34, whiteR: 10.21, whiteY: 2.04, dropR: 81.68, dropY: 4.08 },
  redLg: { innerR: 33.13, innerX: 11.04, innerY: 22.09, whiteR: 11.04, whiteY: 2.21, dropR: 88.36, dropY: 4.42 },
  redXl: { innerR: 55.22, innerX: 11.04, innerY: 22.09, whiteR: 11.04, whiteY: 2.21, dropR: 88.36, dropY: 4.42 },
  avax: { innerR: 18.43, innerX: 9.22, innerY: 14.75, whiteR: 9.22, whiteY: 1.84, dropR: 73.73, dropY: 3.69 },
  eth: { innerR: 102.11, innerX: 10.21, innerY: 20.42, whiteR: 10.21, whiteY: 2.04, dropR: 0, dropY: 0 },
  near: { innerR: 12.76, innerX: 6.38, innerY: 10.2, whiteR: 6.38, whiteY: 1.28, dropR: 51.02, dropY: 2.55 },
} as const

function bubbleStyle(pal: PalKey, geo: BubbleGeo, dropOverride?: string): CSSProperties {
  const p = PAL[pal]
  const shadows = [
    `inset ${sh(geo.innerX, geo.innerY, geo.innerR, p.inner)}`,
    `inset ${sh(0, geo.whiteY, geo.whiteR, p.white)}`,
  ]
  const drop = dropOverride ?? p.drop
  if (drop && geo.dropR > 0) shadows.push(sh(0, geo.dropY, geo.dropR, drop))
  return {
    borderRadius: '50%',
    background: `${hiGrad(p.hi)}, linear-gradient(${p.base}, ${p.base})`,
    boxShadow: shadows.join(', '),
  }
}

/** Simple bubble（63:493–503 实测） */
interface SimpleBubble { id: string; x: number; y: number; w: number; h: number; pal: PalKey; geo: BubbleGeo; opacity?: number; dropOverride?: string }
const SIMPLE: SimpleBubble[] = [
  { id: '63:493', x: 269.559, y: 242.605, w: 25.089, h: 24.505, pal: 'purple', geo: GEO.sm },
  { id: '63:494', x: 79.643, y: 337.563, w: 25.089, h: 24.505, pal: 'grey', geo: GEO.sm, opacity: 0.6 },
  { id: '63:495', x: 659, y: 368, w: 25.089, h: 24.505, pal: 'grey', geo: GEO.sm, opacity: 0.6 },
  { id: '63:496', x: 421.697, y: 224.226, w: 12.253, h: 12.253, pal: 'grey', geo: GEO.sm, dropOverride: 'rgba(209,209,209,1)' },
  { id: '63:497', x: 377.792, y: 548.922, w: 25.089, h: 24.505, pal: 'grey', geo: GEO.sm, opacity: 0.6 },
  { id: '63:498', x: 333.886, y: 466.216, w: 64.327, h: 62.831, pal: 'purple', geo: GEO.md },
  { id: '63:499', x: 467.645, y: 221.162, w: 72.495, h: 72.495, pal: 'purple', geo: GEO.redLg, dropOverride: 'rgba(248,0,119,.48)' },
  { id: '63:500', x: 628.972, y: 211.973, w: 72.495, h: 72.495, pal: 'purple', geo: GEO.lg },
  { id: '63:501', x: 58.201, y: 236.478, w: 52.074, h: 52.074, pal: 'purple', geo: GEO.redXl, dropOverride: 'rgba(248,0,119,.48)' },
  { id: '63:502', x: 0, y: 383.511, w: 72.495, h: 72.495, pal: 'purple', geo: GEO.lg },
  { id: '63:503', x: 641.225, y: 466.216, w: 72.495, h: 72.495, pal: 'purple', geo: GEO.lg },
]

// 63:499/501 内阴影为红色系（紫底 + 红内影 + 粉投影）
const RED_INNER = 'rgba(255,5,5,1)'

/** Indicator bg 黑色内圆阴影栈（tint 按气泡色系） */
function indicatorShadows(tint: (a: number) => string, big = false): string {
  const A = big ? [0.146196, 0.210024, 0.26, 0.309976, 0.373804, 0.52] : [0.067475, 0.096934, 0.12, 0.143066, 0.172525, 0.24]
  const O = big ? [3.149, 7.568, 14.25, 25.42, 47.545, 113.805] : [2.826, 6.79, 12.785, 22.807, 42.657, 102.106]
  const B = big ? [2.519, 6.055, 11.4, 20.336, 38.036, 91.044] : [2.26, 5.432, 10.228, 18.245, 34.126, 81.685]
  return A.map((a, i) => sh(0, O[i], B[i], tint(a))).join(', ')
}
const TINT_PURPLE = (a: number) => `rgba(3,2,41,${a})`
const TINT_GREEN = (a: number) => `rgba(1,25,11,${a})`
const TINT_RED = (a: number) => `rgba(92,7,7,${a})`

/** ETH 帧 6 层回声投影（63:516 effects 实测） */
const ETH_ECHO = [
  [0.163704, -71.272, 87.928, 11.09],
  [0.266963, -75.32, 92.923, 22.962],
  [0.34, -82.941, 102.323, 45.794],
  [0.413037, -94.847, 117.012, 89.762],
  [0.516296, -111.754, 137.871, 165.043],
  [0.68, -134.377, 165.78, 281.812],
]
  .map(([a, ox, oy, b]) => sh(ox, oy, b, `rgba(61,4,67,${a})`))
  .join(', ')

/** 进度环定义（arc 实测） */
interface RingDef { size: number; x: number; y: number; bgW: number; pW: number; color: string; glow: string; start: number; end: number; pR?: number }
const ARC_0 = 4.712389
const ARC_BG_END = -1.476749

function Ring({ def, delay }: { def: RingDef; delay: string }) {
  const c = def.size / 2
  const rBg = (def.size - def.bgW) / 2
  const rP = def.pR ?? (def.size - def.pW) / 2
  const len = arcLen(rP, def.start, def.end)
  return (
    <svg viewBox={`0 0 ${def.size} ${def.size}`} className="h-full w-full" fill="none" aria-hidden>
      <path d={arcPath(c, c, rBg, ARC_0, ARC_BG_END)} stroke="#3F3F4A" strokeWidth={def.bgW} />
      <path
        className="sr-bub-ring"
        d={arcPath(c, c, rP, def.start, def.end)}
        stroke={def.color}
        strokeWidth={def.pW}
        strokeDasharray={len}
        style={{ ['--sr-bub-len' as string]: len, filter: `drop-shadow(0 2px 6px ${def.glow})`, animationDelay: delay }}
      />
    </svg>
  )
}

/** 黑色 Indicator 内圆（fx/fy/fs 为帧内设计 px, fw 为帧宽） */
function IndicatorBg({ fx: x, fy: y, fs: size, fw, tint, big }: { fx: number; fy: number; fs: number; fw: number; tint: (a: number) => string; big?: boolean }) {
  return (
    <div
      className="absolute rounded-full"
      style={{ left: fp(x, fw), top: fp(y, fw), width: fp(size, fw), height: fp(size, fw), background: '#100F14', boxShadow: indicatorShadows(tint, big) }}
    />
  )
}

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化（布局/弧长为设计稿固定值, 仅百分比可注入）
export interface BubbleChartCProps {
  /** 三个带环加密货币气泡的百分比 */
  percents?: { avax?: number; eth?: number; stx?: number }
}

export function BubbleChartC({ percents = {} }: BubbleChartCProps = {}) {
  const avax = useCountUp(percents.avax ?? 83)
  const eth = useCountUp(percents.eth ?? 80)
  const stx = useCountUp(percents.stx ?? 51)

  return (
    <div className="sr-bub relative h-full w-full select-none overflow-visible font-sans" style={{ containerType: 'size' }}>
      {/* ── 装饰层（glow / 双环 / 四点, SVG 随容器拉伸） ── */}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" fill="none" aria-hidden>
        <defs>
          <radialGradient id="sr-bub-glow" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="571.015" gradientTransform="translate(-201.015,355.642) scale(1,0.5223)">
            <stop offset="0" stopColor="rgba(97,30,215,.3)" />
            <stop offset="1" stopColor="rgba(42,14,91,0)" />
          </radialGradient>
          <linearGradient id="sr-bub-ringline" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(37,37,69,.57)" />
            <stop offset="1" stopColor="rgba(37,37,69,0)" />
          </linearGradient>
        </defs>
        <ellipse cx={370} cy={355.642} rx={571.015} ry={298.209} fill="url(#sr-bub-glow)" />
        <circle cx={375.522} cy={355.642} r={266.179} stroke="#252525" strokeWidth={1.104} />
        <circle cx={375.522} cy={355.642} r={355.642} stroke="url(#sr-bub-ringline)" strokeWidth={1.104} />
        {[[523.522, 135.851], [346.806, 619.612], [161.254, 201.015]].map(([cxp, cyp]) => (
          <circle key={`${cxp}`} cx={cxp} cy={cyp} r={9.94} fill="#000" stroke="#252525" strokeWidth={1.104} />
        ))}
        <circle cx={730.06} cy={383.254} r={9.94} fill="#070210" stroke="#141426" strokeWidth={1.104} />
      </svg>

      {/* ── 11 个 Simple bubble ── */}
      {SIMPLE.map((b, i) => (
        <div
          key={b.id}
          className="sr-bub-pop absolute"
          style={{
            left: px(b.x),
            top: py(b.y),
            width: px(b.w),
            height: py(b.h),
            opacity: b.opacity ?? 1,
            animationDelay: `${0.45 + i * 0.06}s`,
            ...bubbleStyle(
              b.pal,
              b.geo,
              b.dropOverride,
              // 63:499/501 红色内影
            ),
            ...(b.id === '63:499' || b.id === '63:501'
              ? {
                  boxShadow: [
                    `inset ${sh(b.geo.innerX, b.geo.innerY, b.geo.innerR, RED_INNER)}`,
                    `inset ${sh(0, b.geo.whiteY, b.geo.whiteR, PAL.purple.white)}`,
                    sh(0, b.geo.dropY, b.geo.dropR, b.dropOverride ?? ''),
                  ].join(', '),
                }
              : null),
          }}
        />
      ))}

      {/* ── BTC 气泡 63:504 (75.10² @ 340.179,155.731) ── */}
      <div className="sr-bub-pop absolute" style={{ left: px(340.179), top: py(155.731), width: px(75.104), height: py(75.104), animationDelay: '0.4s' }}>
        <div className="absolute inset-0" style={bubbleStyle('purple', GEO.lg)} />
        <IndicatorBg fx={19.881} fy={19.881} fs={35.343} fw={75.104} tint={TINT_PURPLE} />
        <BtcLogo className="absolute" style={{ left: fp(28.717, 75.104), top: fp(28.716, 75.104), width: fp(17.672, 75.104), height: fp(17.672, 75.104) }} />
      </div>

      {/* ── AVAX 气泡 63:508 (128.12² @ 135.851,234.149) ── */}
      <div className="sr-bub-pop absolute" style={{ left: px(135.851), top: py(234.149), width: px(128.119), height: py(128.119), animationDelay: '0.24s' }}>
        <div className="absolute inset-0" style={bubbleStyle('avax', GEO.avax)} />
        <IndicatorBg fx={27.612} fy={27.612} fs={72.896} fw={128.119} tint={TINT_GREEN} big />
        <div className="absolute" style={{ left: fp(35.327, 128.119), top: fp(35.76, 128.119), width: fp(57.433, 128.119), height: fp(57.433, 128.119) }}>
          <Ring def={{ size: 57.433, x: 0, y: 0, bgW: 3.378, pW: 3.378, color: '#FFE60B', glow: 'rgba(255,159,28,.5)', start: ARC_0, end: 9.703957 }} delay="0.6s" />
        </div>
        <AvaxLogo className="absolute" style={{ left: fp(55.224, 128.119), top: fp(47.492, 128.119), width: fp(17.672, 128.119), height: fp(17.672, 128.119) }} />
        <span
          className="sr-bub-fade absolute text-center text-[#F5F5F5]"
          style={{ left: fp(46.149, 128.119), top: fp(69.85, 128.119), width: fp(36, 128.119), fontSize: 'min(1.351cqw, 1.406cqh)', lineHeight: 1.215, letterSpacing: '0.05em', fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.85s' }}
        >
          {avax}%
        </span>
      </div>

      {/* ── ETH 气泡 63:516 (203.67² @ 275.686,246.689, 带 6 层回声投影, 帧为方形剪影) ── */}
      <div
        className="sr-bub-pop absolute"
        style={{ left: px(275.686), top: py(246.689), width: px(203.667), height: py(203.667), boxShadow: ETH_ECHO, animationDelay: '0s' }}
      >
        <div className="absolute" style={{ left: fp(0.434, 203.667), top: fp(-0.39, 203.667), width: fp(205.433, 203.667), height: fp(205.433, 203.667), ...bubbleStyle('eth', GEO.eth) }} />
        <IndicatorBg fx={50.135} fy={49.311} fs={106.03} fw={203.667} tint={TINT_PURPLE} />
        <div className="absolute" style={{ left: fp(62.285, 203.667), top: fp(61.46, 203.667), width: fp(81.685, 203.667), height: fp(81.685, 203.667) }}>
          <Ring def={{ size: 81.685, x: 0, y: 0, bgW: 4.418, pW: 4.418, color: '#06D7F6', glow: 'rgba(11,83,244,.45)', start: ARC_0, end: 9.310633 }} delay="0.35s" />
        </div>
        <EthLogo className="absolute" style={{ left: fp(89.813, 203.667), top: fp(76.098, 203.667), width: fp(26.507, 203.667), height: fp(26.507, 203.667) }} />
        <span
          className="sr-bub-fade absolute text-center text-[#F5F5F5]"
          style={{ left: fp(76.559, 203.667), top: fp(107.024, 203.667), width: fp(54.119, 203.667), fontSize: 'min(1.892cqw, 1.968cqh)', lineHeight: 1.183, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.6s' }}
        >
          {eth}%
        </span>
      </div>

      {/* ── STX 气泡 63:524 (197.06² @ 98.021,370.237) ── */}
      <div className="sr-bub-pop absolute" style={{ left: px(98.021), top: py(370.237), width: px(197.064), height: py(197.064), animationDelay: '0.08s' }}>
        <div className="absolute" style={{ left: fp(0.277, 197.064), top: fp(-0.237, 197.064), width: fp(196.597, 197.064), height: fp(196.597, 197.064), ...bubbleStyle('stx', GEO.avax) }} />
        <IndicatorBg fx={51.083} fy={50.569} fs={94.985} fw={197.064} tint={TINT_RED} />
        <div className="absolute" style={{ left: fp(61.023, 197.064), top: fp(60.509, 197.064), width: fp(75.104, 197.064), height: fp(75.104, 197.064) }}>
          <Ring def={{ size: 75.104, x: 0, y: 0, bgW: 4.418, pW: 4.418, color: '#62F782', glow: 'rgba(34,255,64,.4)', start: ARC_0, end: 7.853981 }} delay="0.45s" />
        </div>
        <StxLogo className="absolute" style={{ left: fp(85.322, 197.064), top: fp(73.763, 197.064), width: fp(26.507, 197.064), height: fp(26.507, 197.064) }} />
        <span
          className="sr-bub-fade absolute text-center text-[#F5F5F5]"
          style={{ left: fp(75.978, 197.064), top: fp(105.763, 197.064), width: fp(46, 197.064), fontSize: 'min(1.892cqw, 1.968cqh)', lineHeight: 1.214, fontFamily: 'HarmonyOS Sans SC, Noto Sans SC, sans-serif', animationDelay: '0.7s' }}
        >
          {stx}%
        </span>
      </div>

      {/* ── ADA 气泡 63:532 (146.08×144.67 @ 426.802,424.353) ── */}
      <div className="sr-bub-pop absolute" style={{ left: px(426.802), top: py(424.353), width: px(146.079), height: py(144.674), animationDelay: '0.16s' }}>
        <div className="absolute" style={{ left: fp(0.631, 146.079), top: fp(-0.234, 144.674), width: fp(145.791, 146.079), height: fp(145.791, 144.674), ...bubbleStyle('ada', GEO.avax) }} />
        <IndicatorBg fx={39.288} fy={37.319} fs={69.582} fw={146.079} tint={TINT_RED} />
        <div className="absolute" style={{ left: fp(47.019, 146.079), top: fp(46.154, 144.674), width: fp(53.015, 146.079), height: fp(53.015, 144.674) }}>
          <Ring def={{ size: 53.015, x: 0, y: 0, bgW: 3.378, pW: 4.418, color: '#06CAE7', glow: 'rgba(11,83,244,.45)', start: ARC_0, end: 9.703957, pR: (53.015 - 4.418) / 2 }} delay="0.5s" />
        </div>
        <AdaLogo className="absolute" style={{ left: fp(61.377, 146.079), top: fp(61.617, 144.674), width: fp(24.299, 146.079), height: fp(22.09, 144.674) }} />
      </div>

      {/* ── NEAR 气泡 63:539 (101.08×100.11 @ 497.015,308.149) ── */}
      <div className="sr-bub-pop absolute" style={{ left: px(497.015), top: py(308.149), width: px(101.085), height: py(100.113), animationDelay: '0.32s' }}>
        <div className="absolute" style={{ left: 0, top: 0, width: fp(101.612, 101.085), height: fp(101.612, 100.113), ...bubbleStyle('near', GEO.near) }} />
        <IndicatorBg fx={26.508} fy={26.507} fs={48.597} fw={101.085} tint={TINT_PURPLE} />
        <NearLogo className="absolute" style={{ left: fp(43.075, 101.085), top: fp(43.075, 100.113), width: fp(15.463, 101.085), height: fp(15.463, 100.113) }} />
      </div>

      <style>{`
        .sr-bub-pop { opacity: 0; transform: scale(.55); animation: sr-bub-popin .7s cubic-bezier(.34,1.56,.64,1) forwards; }
        @keyframes sr-bub-popin { to { opacity: 1; transform: scale(1); } }
        .sr-bub-ring { stroke-dashoffset: var(--sr-bub-len); animation: sr-bub-draw 1s cubic-bezier(.22,1,.36,1) forwards; }
        @keyframes sr-bub-draw { to { stroke-dashoffset: 0; } }
        .sr-bub-fade { opacity: 0; animation: sr-bub-fadein .6s ease-out forwards; }
        @keyframes sr-bub-fadein { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          .sr-bub-pop { animation: none !important; opacity: 1 !important; transform: none !important; }
          .sr-bub-ring { animation: none !important; stroke-dashoffset: 0 !important; }
          .sr-bub-fade { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
    </div>
  )
}
