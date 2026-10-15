// 🔴 改动 2026-10-12 · 食材镶边沿圆角矩形雕刻，移除斜切角，保持节点科技底座独立。
import { TALENT_FRAME_W, talentFrameCorners } from './talentFrame'

export function RuneOrnament({ plate = false }: { plate?: boolean }) {
  return <svg className={`rune-ornament ${plate ? 'rune-plate' : ''}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <rect className="rune-outer" x="2" y="2" width="96" height="96" rx="22" />
    <rect className="rune-inner" x="7" y="7" width="86" height="86" rx="17" />
    <path className="rune-corners" d="M3 29V24A21 21 0 0 1 24 3H29 M71 3H76A21 21 0 0 1 97 24V29 M97 71V76A21 21 0 0 1 76 97H71 M29 97H24A21 21 0 0 1 3 76V71" />
    <g className="rune-inscription">
      <path d="M36 5h5m18 0h5M36 95h5m18 0h5M46 5l4-3 4 3-4 3zM46 95l4-3 4 3-4 3z" />
      <path d="M5 34v6m0 20v6m90-32v6m0 20v6" />
    </g>
  </svg>
}

export function RuneOrbit() {
  return <svg className="rune-orbit" viewBox="0 0 240 240" aria-hidden="true" focusable="false">
    <circle cx="120" cy="120" r="109" /><circle cx="120" cy="120" r="99" strokeDasharray="1 7" />
    <path d="M120 4v18m0 196v18M4 120h18m196 0h18M42 42l12 12m132 132 12 12M42 198l12-12M186 54l12-12" />
    <path className="rune-orbit-diamond" d="m120 7 5 6-5 6-5-6Zm0 214 5 6-5 6-5-6ZM7 120l6-5 6 5-6 5Zm214 0 6-5 6 5-6 5Z" />
  </svg>
}

/** 节点使用精密回路底座，与图标的符文金属边框区分。
 *  🔴 改动 2026-10-12 · 描边改为圆角、只描四角圆弧括号（路径纯函数在 talentFrame.ts，与画板节点形态共用）。 */
export function TalentFrame({ height }: { height: number }) {
  return <svg className="talent-frame" viewBox={`0 0 ${TALENT_FRAME_W} ${height}`} aria-hidden="true" focusable="false">
    <path className="talent-frame-brackets" d={talentFrameCorners(height)} />
  </svg>
}
