// 🔴 改动 2026-10-12 · 检查收益自动折角在四向布局、遮挡及短路径中的几何约束。
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('../src/modules/workshop/asset-system/revenueRouting.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { routeRevenue, roundedPath } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const start = { x: 959, y: 217 }
const fixed = [
  { left: 662, right: 936, top: 108, bottom: 346 },
  { left: 982, right: 1256, top: 108, bottom: 316 },
]
let checked = 0
for (const end of [{ x: 1119, y: 406 }, { x: 1119, y: 40 }, { x: 560, y: 406 }, { x: 560, y: 40 }, { x: 959, y: 430 }, { x: 961, y: 260 }]) {
  const obstacles = [...fixed, { left: end.x - 137, right: end.x + 137, top: end.y - 18, bottom: end.y + 220 }]
  const points = routeRevenue(start, end, obstacles)
  assert.deepEqual(points[0], start)
  assert.deepEqual(points.at(-1), end)
  assert.equal(points.at(-2).x, end.x)
  assert.ok(points.at(-2).y < end.y, 'Approach the revenue card from above')
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i]
    assert.ok(a.x === b.x || a.y === b.y, 'Every leg is orthogonal')
    for (const r of fixed) {
      const crossing = a.x === b.x
        ? a.x > r.left && a.x < r.right && Math.max(a.y, b.y) > r.top && Math.min(a.y, b.y) < r.bottom
        : a.y > r.top && a.y < r.bottom && Math.max(a.x, b.x) > r.left && Math.min(a.x, b.x) < r.right
      assert.equal(crossing, false, 'The route must avoid asset cards')
    }
  }
  assert.ok(!/NaN|Infinity/.test(roundedPath(points)))
  checked++
}
assert.ok(roundedPath(routeRevenue(start, { x: 1119, y: 406 }, fixed)).includes(' Q '), 'Turns have rounded corners')
assert.ok(!/NaN|Infinity/.test(roundedPath([start, start])))
console.log(`Passed ${checked} routing layouts, obstacle clearance, endpoints, and rounded corners.`)
