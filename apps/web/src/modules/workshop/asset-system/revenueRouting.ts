// 🔴 改动 2026-10-12 · 收益分支自动避开节点，以圆角正交路径连接交易中点。
export type Point = { x: number; y: number }
export type Obstacle = { left: number; right: number; top: number; bottom: number }
const inside = (p: Point, r: Obstacle) => p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom

export function roundedPath(points: Point[], radius = 10) {
  const clean = points.filter((p, i) => !i || p.x !== points[i - 1].x || p.y !== points[i - 1].y)
  const corners = clean.filter((p, i) => !i || i === clean.length - 1 || !((clean[i - 1].x === p.x && p.x === clean[i + 1].x) || (clean[i - 1].y === p.y && p.y === clean[i + 1].y)))
  if (!corners.length) return ''
  let d = `M ${corners[0].x} ${corners[0].y}`
  for (let i = 1; i < corners.length - 1; i++) {
    const a = corners[i - 1], b = corners[i], c = corners[i + 1]
    const before = Math.hypot(b.x - a.x, b.y - a.y), after = Math.hypot(c.x - b.x, c.y - b.y)
    const r = Math.min(radius, before / 2, after / 2)
    d += ` L ${b.x + (a.x - b.x) * r / before} ${b.y + (a.y - b.y) * r / before} Q ${b.x} ${b.y} ${b.x + (c.x - b.x) * r / after} ${b.y + (c.y - b.y) * r / after}`
  }
  const last = corners[corners.length - 1]
  return `${d} L ${last.x} ${last.y}`
}

/** Search obstacle boundaries; favor fewer turns and keep the final approach vertical. */
export function routeRevenue(start: Point, end: Point, obstacles: Obstacle[]): Point[] {
  const goal = { x: end.x, y: end.y - 24 }
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
      if (blocked(a, b) || (next === target && a.y > goal.y)) continue
      const state = next * 2 + axis
      const cost = costs.get(current)! + Math.abs(b.x - a.x) + Math.abs(b.y - a.y) + (current % 2 === axis ? 0 : 26)
      if (cost >= (costs.get(state) ?? Infinity)) continue
      costs.set(state, cost); previous.set(state, current); open.add(state)
    }
  }
  if (finish === undefined) return [start, { x: start.x, y: goal.y }, goal, end]
  const points: Point[] = []
  for (let state: number | undefined = finish; state !== undefined; state = previous.get(state)) points.push(point(Math.floor(state / 2)))
  return [...points.reverse(), end]
}
