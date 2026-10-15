/**
 * LineChartV1C —— Pixso Charts | 图表页 Line chart v1
 * (节点 63:1067, 1063×546, 透明底)
 *
 * 设计值（DSL + SVG 导出实测）:
 *  - 网格 20 列 @ (6,43): 列宽 52.85, 描边 Gray-10 #0F0F13,
 *    每列 2 根迷你柱 Gray-9 #1E1E24, 日期标签 2月1日~2月20日
 *    Description 12/16 Gray-2 #D0D0DA opacity .6 @ y460 (列内)
 *  - 分隔线 y481 x6.5..1062.5 Gray-9 #1E1E24
 *  - 辉光 2 团 opacity .7: 紫 rgba(97,30,215,.3) 868×579 @ (-173,3),
 *    红 rgba(215,30,30,.3) 1034×540 @ (424,0) (径向中心在椭圆左缘中点)
 *  - 曲线 4 条 sw3 round: Amethyst #A162F7 (7 层紫影 rgba(105,0,255)),
 *    Sea green #15FFAB, Mango Tango #FF8743 (5 层橙影), Strawberry Red #DB3031 (6 层粉影)
 *  - 悬停列 @ (638,40) 55×502: 磨砂条 79×514 @ (626,28) r6 blur20 + 纵向渐变,
 *    圆点 3 枚 r6 黑底, 描边 #FD4438/#FF8743/#15FFAB, 数值 ¥1,430/¥4,670/¥8,055,
 *    底部青色线 54×2 #06D7F6 @ (638,540)
 */

const GRID_COLS: Array<{ fx: number; bars: Array<[number, number, number, number]>; label: string }> = [
  { fx: 0, bars: [[6.099, 369, 14.229, 69], [32.524, 249, 14.229, 189]], label: '2月1日' },
  { fx: 52.85, bars: [[6.099, 369, 14.229, 69], [32.15, 331, 15, 107]], label: '2月2日' },
  { fx: 105.7, bars: [[6.099, 369, 14.229, 69], [32.3, 412, 14, 26]], label: '2月3日' },
  { fx: 158.55, bars: [[6.099, 369, 14.229, 69], [32.45, 298, 14, 140]], label: '2月4日' },
  { fx: 211.4, bars: [[6.099, 369, 14.229, 69], [32.524, 249, 14.229, 189]], label: '2月5日' },
  { fx: 264.25, bars: [[5.75, 298, 15, 140], [32.524, 249, 14.229, 189]], label: '2月6日' },
  { fx: 317.1, bars: [[6.099, 369, 14.229, 69], [32.899, 331, 14, 107]], label: '2月7日' },
  { fx: 369.95, bars: [[6.05, 394, 14, 44], [32.524, 249, 14.229, 189]], label: '2月8日' },
  { fx: 422.8, bars: [[6.099, 369, 14.229, 69], [32.2, 331, 15, 107]], label: '2月9日' },
  { fx: 475.65, bars: [[6.35, 216, 14, 222], [32.524, 249, 14.229, 189]], label: '2月10日' },
  { fx: 528.5, bars: [[6.5, 156, 14, 282], [32.524, 249, 14.229, 189]], label: '2月11日' },
  { fx: 581.35, bars: [[5.649, 216, 15, 222], [32.524, 249, 14.229, 189]], label: '2月12日' },
  { fx: 634.2, bars: [[5.8, 320, 15, 118], [32.524, 249, 14.229, 189]], label: '2月13日' },
  { fx: 687.05, bars: [[6.099, 369, 14.229, 69], [32.949, 314, 14, 124]], label: '2月14日' },
  { fx: 739.9, bars: [[6.1, 314, 14, 124], [32.1, 287, 15, 151]], label: '2月15日' },
  { fx: 792.75, bars: [[6.25, 406, 14, 32], [32.524, 249, 14.229, 189]], label: '2月16日' },
  { fx: 845.601, bars: [[6.399, 314, 14, 124], [32.399, 287, 14, 151]], label: '2月17日' },
  { fx: 898.451, bars: [[6.55, 406, 14, 32], [32.55, 350, 14, 88]], label: '2月18日' },
  { fx: 951.301, bars: [[6.099, 369, 14.229, 69], [32.524, 249, 14.229, 189]], label: '2月19日' },
  { fx: 1004.151, bars: [[6.099, 369, 14.229, 69], [32.85, 350, 14, 88]], label: '2月20日' },
]

const CURVES = [
  'M8 148.5C41 148.5 37 118.5 76.5 118.5C116 118.5 110 184.5 138.5 184.5C167 184.5 172 148.5 206 148.5C240 148.5 244.5 94 271 94C297.5 94 311.835 148.5 338 148.5C361.041 148.5 373.959 121.5 397 121.5C422.189 121.5 436.311 148.5 461.5 148.5C486.689 148.5 500.811 188.5 526 188.5C551.384 188.5 565.616 207 591 207C615.994 207 630.006 148.5 655 148.5C680.579 148.5 694.921 115.5 720.5 115.5',
  'M8 169.5C41 169.5 37 189.5 76.5 189.5C116 189.5 110 205.5 138.5 205.5C167 205.5 169.5 165.5 203.5 165.5C237.5 165.5 244.5 158 271 158C297.5 158 311.835 189.5 338 189.5C361.041 189.5 373.959 142.5 397 142.5C422.189 142.5 436.311 119.5 461.5 119.5C486.689 119.5 500.811 84 526 84C551.384 84 565.616 151.5 591 151.5C615.994 151.5 630.506 119.5 655.5 119.5C681.079 119.5 694.921 78 720.5 78',
  'M8 276.588C40.9768 276.588 36.9797 288.824 76.4519 288.824C115.924 288.824 109.928 298.612 138.408 298.612C166.888 298.612 169.387 274.141 203.363 274.141C237.339 274.141 244.334 269.553 270.815 269.553C297.297 269.553 311.622 288.824 337.768 288.824C360.793 288.824 373.702 260.071 396.727 260.071C421.898 260.071 436.011 246 461.182 246C486.353 246 499.329 288.824 524.5 288.824C549.866 288.824 565.225 265.576 590.591 265.576C615.567 265.576 630.07 246 655.046 246C680.607 246 693.439 276.588 719 276.588',
  'M8 389.588C40.9768 389.588 36.9797 401.824 76.4519 401.824C115.924 401.824 109.928 411.612 138.408 411.612C166.888 411.612 169.387 387.141 203.363 387.141C237.339 387.141 244.334 382.553 270.815 382.553C297.297 382.553 311.622 401.824 337.768 401.824C360.793 401.824 373.702 373.071 396.727 373.071C421.898 373.071 436.011 359 461.182 359C486.353 359 499.329 401.824 524.5 401.824C549.866 401.824 565.225 378.576 590.591 378.576C615.567 378.576 630.07 359 655.046 359C680.607 359 693.439 389.588 719 389.588',
]

const FONT = 'HarmonyOS Sans SC, Noto Sans SC, sans-serif'

/** 曲线辉光阴影链（Pixso 实测层叠原样展开） */
const SHADOW_PURPLE =
  'drop-shadow(0 5.42px 2.85px rgba(105,0,255,.2583)) drop-shadow(0 12.61px 6.63px rgba(105,0,255,.3732)) drop-shadow(0 22.64px 11.9px rgba(105,0,255,.4601)) drop-shadow(0 37.57px 19.75px rgba(105,0,255,.5399)) drop-shadow(0 61.9px 32.54px rgba(105,0,255,.6268)) drop-shadow(0 108.19px 56.87px rgba(105,0,255,.7417)) drop-shadow(0 234px 123px rgba(105,0,255,1))'
const SHADOW_ORANGE =
  'drop-shadow(0 2.51px 2.54px rgba(255,162,0,.1953)) drop-shadow(0 6.34px 6.43px rgba(255,162,0,.2795)) drop-shadow(0 12.94px 13.11px rgba(255,162,0,.3505)) drop-shadow(0 26.65px 27.01px rgba(255,162,0,.4347)) drop-shadow(0 73px 74px rgba(255,162,0,.63))'
const SHADOW_PINK =
  'drop-shadow(0 2.77px 2.21px rgba(255,19,94,.0956)) drop-shadow(0 6.65px 5.32px rgba(255,19,94,.1373)) drop-shadow(0 12.52px 10.02px rgba(255,19,94,.17)) drop-shadow(0 22.34px 17.87px rgba(255,19,94,.2027)) drop-shadow(0 41.78px 33.42px rgba(255,19,94,.2444)) drop-shadow(0 100px 80px rgba(255,19,94,.34))'

const CURVE_STYLES = [
  { stroke: '#A162F7', glow: SHADOW_PURPLE },
  { stroke: '#15FFAB' },
  { stroke: '#FF8743', glow: SHADOW_ORANGE },
  { stroke: '#DB3031', glow: SHADOW_PINK },
]

/** 悬停圆点与数值（组件坐标） */
const DOTS: Array<{ cy: number; ring: string; value: string; vy: number }> = [
  { cy: 358, ring: '#FD4438', value: '¥1,430', vy: 387 },
  { cy: 250, ring: '#FF8743', value: '¥4,670', vy: 273 },
  { cy: 154, ring: '#15FFAB', value: '¥8,055', vy: 177 },
]

// 🔴 改动 2026-10-09 · 按架构 §09 Widget 契约 props 化: 曲线与悬停点可注入
export interface LineChartV1CProps {
  /** 4 条曲线的 SVG path（1063×546 坐标系）, 默认设计稿实测 */
  curves?: string[]
  /** 悬停圆点与数值 */
  dots?: Array<{ cy: number; ring: string; value: string; vy: number }>
}

export function LineChartV1C({ curves = CURVES, dots = DOTS }: LineChartV1CProps = {}) {
  return (
    <div className="sr-lv1 relative h-full w-full select-none overflow-hidden font-sans" style={{ containerType: 'size' }}>
      <svg viewBox="0 0 1063 546" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="sr-lv1-glow1" gradientUnits="userSpaceOnUse" cx={0} cy={0} r={434} gradientTransform="translate(-173,292.5) scale(1,0.667)">
            <stop offset={0} stopColor="rgba(97,30,215,0.3)" />
            <stop offset={1} stopColor="rgba(42,14,91,0)" />
          </radialGradient>
          <radialGradient id="sr-lv1-glow2" gradientUnits="userSpaceOnUse" cx={0} cy={0} r={517} gradientTransform="translate(424,270) scale(1,0.5222)">
            <stop offset={0} stopColor="rgba(215,30,30,0.3)" />
            <stop offset={1} stopColor="rgba(209,63,63,0)" />
          </radialGradient>
        </defs>

        {/* 网格 20 列 @ (6,43) */}
        <g transform="translate(6,43)">
          {GRID_COLS.map((col, i) => (
            <g key={i} transform={`translate(${col.fx},0)`}>
              <rect className="sr-lv1-fade" x={0} y={0} width={52.85} height={502} fill="none" stroke="#0F0F13" strokeWidth={1} />
              {col.bars.map(([bx, by, bw, bh], j) => (
                <rect key={j} className="sr-lv1-col" x={bx} y={by} width={bw} height={bh} fill="#1E1E24" style={{ animationDelay: `${i * 40 + j * 60}ms` }} />
              ))}
              <text className="sr-lv1-fade" x={26} y={468} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={400} fill="#D0D0DA" opacity={0.6} style={{ fontFamily: FONT }}>
                {col.label}
              </text>
            </g>
          ))}
          <line className="sr-lv1-fade" x1={0.5} y1={438} x2={1056.5} y2={438} stroke="#1E1E24" strokeWidth={1} />
        </g>

        {/* 辉光 2 团 */}
        <ellipse className="sr-lv1-glow" cx={261} cy={292.5} rx={434} ry={289.5} fill="url(#sr-lv1-glow1)" />
        <ellipse className="sr-lv1-glow" cx={941} cy={270} rx={517} ry={270} fill="url(#sr-lv1-glow2)" style={{ animationDelay: '.15s' }} />

        {/* 曲线 4 条 */}
        {curves.map((d, i) => (
          <g key={i} className="sr-lv1-clip" style={{ animationDelay: `${i * 120}ms` }}>
            <path d={d} fill="none" stroke={CURVE_STYLES[i].stroke} strokeWidth={3} strokeLinecap="round" style={CURVE_STYLES[i].glow ? { filter: CURVE_STYLES[i].glow } : undefined} />
          </g>
        ))}
      </svg>

      {/* 悬停磨砂条（backdrop blur 需 HTML 层） @ (626,28) 79×514 r6 */}
      <div
        className="sr-lv1-strip absolute"
        style={{
          left: '58.89%',
          top: '5.13%',
          width: '7.43%',
          height: '94.14%',
          borderRadius: 'min(0.56cqw, 1.1cqh)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          background: 'linear-gradient(to bottom, rgba(124,145,255,0) 0%, rgba(58,58,58,0) 0.01%, rgba(58,66,132,.76) 75.5%, rgba(0,0,0,1) 100%)',
        }}
      />

      {/* 悬停圆点 / 数值 / 底线 */}
      <svg viewBox="0 0 1063 546" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
        {dots.map((dt, i) => (
          <g key={i} className="sr-lv1-dot" style={{ animationDelay: `${500 + i * 120}ms` }}>
            <circle cx={665} cy={dt.cy} r={6} fill="#000" stroke={dt.ring} strokeWidth={3} />
            <text x={665.5} y={dt.vy} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={400} fill="#FFF" style={{ fontFamily: FONT }}>
              {dt.value}
            </text>
          </g>
        ))}
        <rect className="sr-lv1-dot" x={638} y={540} width={54} height={2} fill="#06D7F6" style={{ animationDelay: '.9s' }} />
      </svg>

      <style>{`
        .sr-lv1-clip { clip-path: inset(-150% 100% -150% 0); animation: sr-lv1-reveal 1.1s cubic-bezier(.22,1,.36,1) forwards; }
        @keyframes sr-lv1-reveal { to { clip-path: inset(-150% -5% -150% 0); } }
        .sr-lv1-fade { opacity: 0; animation: sr-lv1-fadein .7s ease-out .2s forwards; }
        @keyframes sr-lv1-fadein { to { opacity: 1; } }
        .sr-lv1-glow { opacity: 0; animation: sr-lv1-glowin 1.2s ease-out forwards; }
        @keyframes sr-lv1-glowin { from { opacity: 0; } to { opacity: .7; } }
        .sr-lv1-col { transform: scaleY(0); transform-origin: bottom; transform-box: fill-box; animation: sr-lv1-grow .5s cubic-bezier(.22,1,.36,1) forwards; }
        @keyframes sr-lv1-grow { to { transform: scaleY(1); } }
        .sr-lv1-dot { opacity: 0; animation: sr-lv1-fadein .5s ease-out forwards; }
        .sr-lv1-strip { opacity: 0; animation: sr-lv1-fadein .8s ease-out .4s forwards; }
        @media (prefers-reduced-motion: reduce) {
          .sr-lv1-clip { animation: none !important; clip-path: none; }
          .sr-lv1-fade, .sr-lv1-dot, .sr-lv1-strip { animation: none !important; opacity: 1; }
          .sr-lv1-glow { animation: none !important; opacity: .7; }
          .sr-lv1-col { animation: none !important; transform: none; }
        }
      `}</style>
    </div>
  )
}
