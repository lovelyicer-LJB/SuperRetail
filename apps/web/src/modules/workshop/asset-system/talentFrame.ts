// 🔴 改动 2026-10-12 · 节点底座圆角括号描边的纯函数（React 组件与画板 DOM 建造器共用同一形状；
// 独立文件满足 react-refresh 仅导出组件约束）。只描四角圆弧，整圈切角描边与中线刻痕已移除。
// 🔴 改动 2026-10-12 · 四角等长：圆弧两侧的直腿统一 12px，不再随边长一腿长一腿短。
export const TALENT_FRAME_W = 238

/** 描边距节点边缘的偏移 / 圆角半径 / 圆弧两侧等长直腿 */
const FRAME_O = 3
const FRAME_R = 15
const FRAME_LEG = 12

/** 四角圆角括号路径：每角 = 等长直腿 + 半径 15 的四分之一圆弧，四角八腿长度一致 */
export function talentFrameCorners(height: number): string {
  const w = TALENT_FRAME_W
  const h = height
  const o = FRAME_O
  const r = FRAME_R
  const l = FRAME_LEG
  const tl = `M${o} ${o + r + l}V${o + r}A${r} ${r} 0 0 1 ${o + r} ${o}H${o + r + l}`
  const tr = `M${w - o - r - l} ${o}H${w - o - r}A${r} ${r} 0 0 1 ${w - o} ${o + r}V${o + r + l}`
  const br = `M${w - o} ${h - o - r - l}V${h - o - r}A${r} ${r} 0 0 1 ${w - o - r} ${h - o}H${w - o - r - l}`
  const bl = `M${o + r + l} ${h - o}H${o + r}A${r} ${r} 0 0 1 ${o} ${h - o - r}V${h - o - r - l}`
  return `${tl} ${tr} ${br} ${bl}`
}
