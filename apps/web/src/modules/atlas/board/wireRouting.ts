// 🔴 改动 2026-10-12 · 收益节点直连线的自动直角布线：移植工坊 asset-system/revenueRouting.ts
// 的障碍网格 A*（障碍边界生成栅格、转弯罚 26、出入端口被卡片盖住时允许逃逸），
// 最终入端口方向参数化：vertical = 从上方进入（收益节点顶边，工坊原版）；
// horizontal = 从左侧进入（直连线对端卡片的左缘输入端口）。
import { roundedPath } from '@/modules/workshop/asset-system/revenueRouting'

export type Point = { x: number; y: number }
export type Obstacle = { left: number; right: number; top: number; bottom: number }
const inside = (p: Point, r: Obstacle) => p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom

export { roundedPath }

/** Search obstacle boundaries; favor fewer turns; final approach follows `approach`. */
export function routeWire(start: Point, end: Point, obstacles: Obstacle[], approach: 'vertical' | 'horizontal'): Point[] {
  const goal = approach === 'vertical' ? { x: end.x, y: end.y - 24 } : { x: end.x - 24, y: end.y }
  // Overlapping cards can cover an anchor; allow escape from that overlap.
  const boxes = obstacles.filter((r) => !inside(start, r) && !inside(goal, r))
  const xs = [...new Set([start.x, goal.x, ...boxes.flatMap((r) => [r.left, r.right])])].sort((a, b) => a - b)
  const ys = [...new Set([start.y, goal.y, ...boxes.flatMap((r) => [r.top, r.bottom])])].sort((a, b) => a - b)
  const width = xs.length
  const point = (index: number) => ({ x: xs[index % width], y: ys[Math.floor(index / width)] })
  const source = ys.indexOf(start.y) * width + xs.indexOf(start.x)
  const target = ys.indexOf(goal.y) * width + xs.indexOf(goal.x)
  const blocked = (a: Point, b: Point) => boxes.some((r) => a.x === b.x
    ? a.x > r.left && a.x < r.right && Math.max(a.y, b.y) > r.top && Math.min(a.y, b.y) < r.bottom
    : a.y > r.top && a.y < r.bottom && Math.max(a.x, b.x) > r.left && Math.min(a.x, b.x) < r.right)
  // Two states per intersection preserve the incoming axis for bend cost.
  const costs = new Map<number, number>([[source * 2 + 1, 0]])
  const previous = new Map<number, number>()
  const open = new Set([source * 2 + 1])
  let finish: number | undefined
  while (open.size) {
    let current = -1, best = Infinity
    for (const state of open) {
      const p = point(Math.floor(state / 2))
      const score = costs.get(state)! + Math.abs(p.x - goal.x) + Math.abs(p.y - goal.y)
      if (score < best) { best = score; current = state }
    }
    open.delete(current)
    const index = Math.floor(current / 2), a = point(index)
    if (index === target) { finish = current; break }
    const x = index % width, y = Math.floor(index / width)
    const neighbors = [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, y > 0 ? index - width : -1, y < ys.length - 1 ? index + width : -1]
    for (const next of neighbors) {
      if (next < 0) continue
      const b = point(next), axis = a.x === b.x ? 1 : 0
      // 最终入端口只许沿 approach 方向：vertical 从上方落下，horizontal 从左侧进入
      if (blocked(a, b) || (next === target && (approach === 'vertical' ? a.y > goal.y : a.x > goal.x))) continue
      const state = next * 2 + axis
      const cost = costs.get(current)! + Math.abs(b.x - a.x) + Math.abs(b.y - a.y) + (current % 2 === axis ? 0 : 26)
      if (cost >= (costs.get(state) ?? Infinity)) continue
      costs.set(state, cost); previous.set(state, current); open.add(state)
    }
  }
  if (finish === undefined) {
    return approach === 'vertical'
      ? [start, { x: start.x, y: goal.y }, goal, end]
      : [start, { x: goal.x, y: start.y }, goal, end]
  }
  const points: Point[] = []
  for (let state: number | undefined = finish; state !== undefined; state = previous.get(state)) points.push(point(Math.floor(state / 2)))
  return [...points.reverse(), end]
}
