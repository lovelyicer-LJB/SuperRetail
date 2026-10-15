/**
 * Charts 页环形图工具 —— Pixso arc 参数转 SVG 路径
 *
 * Pixso arc 约定: start/end 为弧度, 0 = 正东, 顺时针为正（y 轴向下）;
 * innerRadius=1 时按描边弧渲染（strokeWeight 宽度）。
 */

/** 生成圆弧描边路径（不含闭合），支持负 sweep（逆时针） */
export function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  const sweep = end - start
  const sx = cx + r * Math.cos(start)
  const sy = cy + r * Math.sin(start)
  const ex = cx + r * Math.cos(end)
  const ey = cy + r * Math.sin(end)
  const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0
  const sweepFlag = sweep >= 0 ? 1 : 0
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${ex.toFixed(2)} ${ey.toFixed(2)}`
}

/** 生成扇形（到圆心）填充路径 */
export function sectorPath(cx: number, cy: number, r: number, start: number, end: number): string {
  const sweep = end - start
  const sx = cx + r * Math.cos(start)
  const sy = cy + r * Math.sin(start)
  const ex = cx + r * Math.cos(end)
  const ey = cy + r * Math.sin(end)
  const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0
  const sweepFlag = sweep >= 0 ? 1 : 0
  return `M ${cx} ${cy} L ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${ex.toFixed(2)} ${ey.toFixed(2)} Z`
}

/** 弧长（user units），用于 stroke-dasharray 揭示动画 */
export function arcLen(r: number, start: number, end: number): number {
  return r * Math.abs(end - start)
}
