// 🔴 改动 2026-10-11 · 四态资产体验：端口语义、依赖校验与卖出收益分支。
import { demoFoodCards } from '../food-card/data'

export const chiliAsset = demoFoodCards.find((asset) => asset.id === 'anjihai-chili')!
export type Flow = 'material' | 'recipe' | 'chef' | 'trade' | 'fund'
export type Port = { id: string; label: string; flow: Flow; required?: boolean; asset?: string }
export type AssetNode = { id: string; title: string; kind: string; detail: string; x: number; y: number; image?: string; inputs: Port[]; outputs: Port[]; sale?: string }
export type Edge = { id: string; from: string; output: string; to: string; input: string; flow: Flow }
export type Graph = { nodes: AssetNode[]; edges: Edge[] }
const buy: Port = { id: 'buy', label: '买入 / 资金', flow: 'trade' }
const sell: Port = { id: 'sell', label: '卖出', flow: 'trade' }

export function initialGraph(): Graph {
  const ingredients = ['anjihai-chili', 'xihu-longjing', 'jinhua-ham'].map((id, index): AssetNode => {
    const asset = demoFoodCards.find((item) => item.id === id)!
    return { id, title: asset.name, kind: '原材料资产', detail: `可用 ${asset.owned} ${asset.unit} · ${asset.status}`, image: asset.image, x: 40, y: 42 + index * 208, inputs: [buy], outputs: [{ id: 'supply', label: '供给原料', flow: 'material', asset: id }, sell] }
  })
  return { nodes: [...ingredients,
    { id: 'recipe', title: '辣龙腿配方', kind: '配方资产 · 服务接口', detail: '按次授权 · 收益可支付许可费', x: 360, y: 52, inputs: [
      { id: 'chili', label: '安集海辣皮子', flow: 'material', required: true, asset: 'anjihai-chili' },
      { id: 'tea', label: '西湖龙井茶', flow: 'material', required: true, asset: 'xihu-longjing' },
      { id: 'ham', label: '金华火腿', flow: 'material', required: true, asset: 'jinhua-ham' }, buy,
    ], outputs: [{ id: 'recipe', label: '配方服务', flow: 'recipe' }, sell] },
    { id: 'chef', title: '主厨 · 林师傅', kind: '角色节点 · 烹饪服务', detail: '服务可用 · 按次计费', x: 360, y: 418, inputs: [buy], outputs: [{ id: 'chef', label: '提供烹饪', flow: 'chef' }, sell] },
    { id: 'food', title: '辣龙腿', kind: '食品资产', detail: '配方与厨师就绪后可制作', x: 680, y: 126, inputs: [{ id: 'recipe', label: '辣龙腿配方', flow: 'recipe', required: true }, { id: 'chef', label: '厨师', flow: 'chef', required: true }, buy], outputs: [sell] },
    { id: 'buyer', title: '餐厅采购', kind: '角色节点 · 采购方', detail: '卖出连接目标 · 演示订单', x: 1000, y: 126, inputs: [buy], outputs: [sell] },
  ], edges: [] }
}

export function connect(graph: Graph, from: string, output: string, to: string, input: string): { graph: Graph; message: string } {
  const source = graph.nodes.find((node) => node.id === from)
  const target = graph.nodes.find((node) => node.id === to)
  const out = source?.outputs.find((port) => port.id === output)
  const into = target?.inputs.find((port) => port.id === input)
  if (!source || !target || !out || !into) return { graph, message: '请选择有效的输入端口。' }
  if (from === to) return { graph, message: '请连接到另一个节点。' }
  const matches = out.flow === into.flow || (out.flow === 'fund' && into.id === 'buy')
  if (!matches || (into.asset && into.asset !== out.asset)) return { graph, message: '端口不匹配：原料、配方、厨师与资金各走各自的连接。' }
  if (graph.edges.some((edge) => edge.from === from && edge.output === output && edge.to === to && edge.input === input)) return { graph, message: '这两个端口已经连接。' }
  if (into.required && graph.edges.some((edge) => edge.to === to && edge.input === input)) return { graph, message: '这个必备端口已有连接，请先移除原连线。' }
  const edge: Edge = { id: `${from}:${output}>${to}:${input}`, from, output, to, input, flow: out.flow }
  const nodes = [...graph.nodes]
  if (output === 'sell') nodes.push({
    id: `revenue:${edge.id}`, sale: edge.id, title: `${source.title} · 收益`, kind: '收益分支 · 随卖出连接生成', detail: '分配方向示意 · 尚未结算', x: target.x, y: target.y + 280,
    inputs: [], outputs: [{ id: 'materials', label: '原料补货', flow: 'fund' }, { id: 'labor', label: '厨师报酬', flow: 'fund' }, { id: 'license', label: '配方许可', flow: 'fund' }],
  })
  return { graph: { nodes, edges: [...graph.edges, edge] }, message: output === 'sell' ? '卖出已连接，收益分支已自动生成。' : out.flow === 'fund' ? '收益回流已连接。' : '连接成功。' }
}

export function removeEdge(graph: Graph, id: string): Graph {
  const removed = new Set(graph.nodes.filter((node) => node.sale === id).map((node) => node.id))
  return { nodes: graph.nodes.filter((node) => !removed.has(node.id)), edges: graph.edges.filter((edge) => edge.id !== id && !removed.has(edge.from) && !removed.has(edge.to)) }
}

export function setRecipeOwnership(graph: Graph, owned: boolean): Graph {
  return { nodes: graph.nodes.map((node) => node.id === 'recipe' ? { ...node,
    kind: owned ? '配方资产 · 完全持有' : '配方资产 · 服务接口', detail: owned ? '自有配方 · 无需支付许可费' : '按次授权 · 收益可支付许可费',
    inputs: owned ? node.inputs.filter((port) => port.id !== 'buy') : node.inputs.some((port) => port.id === 'buy') ? node.inputs : [...node.inputs, buy],
  } : node), edges: owned ? graph.edges.filter((edge) => !(edge.to === 'recipe' && edge.input === 'buy')) : graph.edges }
}

export function exampleGraph(owned = false): Graph {
  let graph = setRecipeOwnership(initialGraph(), owned)
  const connections = [
    ['anjihai-chili', 'supply', 'recipe', 'chili'], ['xihu-longjing', 'supply', 'recipe', 'tea'], ['jinhua-ham', 'supply', 'recipe', 'ham'],
    ['recipe', 'recipe', 'food', 'recipe'], ['chef', 'chef', 'food', 'chef'], ['food', 'sell', 'buyer', 'buy'],
    ['revenue:food:sell>buyer:buy', 'materials', 'anjihai-chili', 'buy'], ['revenue:food:sell>buyer:buy', 'labor', 'chef', 'buy'],
    ...(!owned ? [['revenue:food:sell>buyer:buy', 'license', 'recipe', 'buy']] : []),
  ]
  for (const [from, output, to, input] of connections) graph = connect(graph, from, output, to, input).graph
  return graph
}

export function isReady(graph: Graph, id: string, visited = new Set<string>()): boolean {
  if (visited.has(id)) return false
  const node = graph.nodes.find((item) => item.id === id)
  if (!node) return false
  const next = new Set(visited).add(id)
  return node.inputs.filter((port) => port.required).every((port) => {
    const edge = graph.edges.find((item) => item.to === id && item.input === port.id)
    return edge && isReady(graph, edge.from, next)
  })
}

export const NODE_WIDTH = 238
export function portPosition(node: AssetNode, side: 'input' | 'output', id: string) {
  const ports = side === 'input' ? node.inputs : node.outputs
  return { x: node.x + (side === 'output' ? NODE_WIDTH : 0), y: node.y + 91 + ports.findIndex((port) => port.id === id) * 30 }
}
export function curve(a: { x: number; y: number }, b: { x: number; y: number }) {
  const reach = Math.max(65, Math.abs(b.x - a.x) * 0.45)
  return `M ${a.x} ${a.y} C ${a.x + reach} ${a.y}, ${b.x - reach} ${b.y}, ${b.x} ${b.y}`
}

// 🔴 改动 2026-10-12 · 收益附着于交易连线的中点，随卖方和采购方的位置共同变化。
export function saleMidpoint(graph: Graph, saleId: string) {
  const sale = graph.edges.find((edge) => edge.id === saleId && edge.output === 'sell')
  if (!sale) return null
  const source = graph.nodes.find((node) => node.id === sale.from)
  const target = graph.nodes.find((node) => node.id === sale.to)
  if (!source || !target) return null
  const a = portPosition(source, 'output', sale.output)
  const b = portPosition(target, 'input', sale.input)
  // curve() 的三次贝塞尔控制点关于中心对称，所以 t=0.5 恰好为端点平均值。
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** 收益线沿节点网络底部回流，避免逆向贝塞尔线横穿资产信息。 */
export function returnCurve(graph: Graph, edge: Edge) {
  const source = graph.nodes.find((node) => node.id === edge.from)!
  const target = graph.nodes.find((node) => node.id === edge.to)!
  const index = source.outputs.findIndex((port) => port.id === edge.output)
  const a = portPosition(source, 'output', edge.output), b = portPosition(target, 'input', edge.input)
  const bottom = Math.max(...graph.nodes.map((node) => node.y + 112 + Math.max(node.inputs.length, node.outputs.length) * 30)) + 38 + index * 18
  const right = a.x + 28 + index * 13, left = b.x - 20 - index * 6
  return `M ${a.x} ${a.y} H ${right - 10} Q ${right} ${a.y} ${right} ${a.y + 10} V ${bottom - 12} Q ${right} ${bottom} ${right - 12} ${bottom} H ${left + 12} Q ${left} ${bottom} ${left} ${bottom - 12} V ${b.y + 10} Q ${left} ${b.y} ${left + 10} ${b.y} H ${b.x}`
}
