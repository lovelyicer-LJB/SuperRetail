// 🔴 改动 2026-10-11 · 可缩放、平移、拖动和连端口的资产关系体验画板。
// 🔴 改动 2026-10-12 · 金色收益线增加微光材质及随节点重算的圆角避障路线。
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChefHat, CircleDollarSign, Focus, Minus, Plus, RotateCcw, Sparkles, Workflow, X } from 'lucide-react'
// 🔴 改动 2026-10-12 · 收益分支从卖出连线中点引出，替代采购方节点底部的起点。
import { connect, curve, exampleGraph, initialGraph, isReady, NODE_WIDTH, portPosition, removeEdge, returnCurve, saleMidpoint, setRecipeOwnership, type AssetNode, type Graph, type Port } from './graph'
// 🔴 改动 2026-10-11 · 科幻天赋回路：端口凹槽、连线能量与依赖就绪状态联动。
import { RuneOrnament, TalentFrame } from './RuneOrnament'
import { roundedPath, routeRevenue } from './revenueRouting'

type Pending = { node: string; port: string }
const STORAGE = 'superretail.asset-lab.v1'
const fresh = () => ({ graph: exampleGraph(), owned: false })
function loadDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) || 'null')
    // Only restore our exact versioned graph shape, never the live Atlas board.
    if (saved?.version === 1 && typeof saved.owned === 'boolean' && Array.isArray(saved.graph?.nodes) && Array.isArray(saved.graph?.edges)
      && saved.graph.nodes.length >= 7 && saved.graph.nodes.length < 200
      && saved.graph.nodes.every((n: AssetNode) => typeof n.id === 'string' && typeof n.title === 'string' && Number.isFinite(n.x) && Number.isFinite(n.y) && Array.isArray(n.inputs) && Array.isArray(n.outputs) && [...n.inputs, ...n.outputs].every((p) => typeof p.id === 'string' && typeof p.label === 'string'))
      && saved.graph.edges.every((e: { from: string; to: string; output: string; input: string }) => saved.graph.nodes.some((n: AssetNode) => n.id === e.from && n.outputs.some((p) => p.id === e.output)) && saved.graph.nodes.some((n: AssetNode) => n.id === e.to && n.inputs.some((p) => p.id === e.input)))) return { graph: saved.graph as Graph, owned: saved.owned as boolean }
  } catch { /* A malformed or unavailable local draft falls back to the example. */ }
  return fresh()
}

export function AssetGraph() {
  const [draft, setDraft] = useState(loadDraft)
  const { graph, owned } = draft
  const revenueId = useId().replace(/:/g, '')
  const revenuePaths = useMemo(() => {
    const obstacles = graph.nodes.map((node) => ({ left: node.x - 18, right: node.x + NODE_WIDTH + 18, top: node.y - 18, bottom: node.y + 112 + Math.max(node.inputs.length, node.outputs.length) * 30 + 18 }))
    return graph.nodes.filter((node) => node.sale).flatMap((node) => {
      const junction = saleMidpoint(graph, node.sale!)
      if (!junction) return []
      const end = { x: node.x + NODE_WIDTH / 2, y: node.y }
      return [{ node, junction, end, d: roundedPath(routeRevenue(junction, end, obstacles)) }]
    })
  }, [graph])
  const setGraph = (next: Graph) => setDraft((previous) => ({ ...previous, graph: next }))
  const [pending, setPending] = useState<Pending | null>(null)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })
  const [selected, setSelected] = useState<string | null>(null)
  const [notice, setNotice] = useState('示例已连接。试着移除卖出连线，再重新连接。')
  const [saved, setSaved] = useState(true)
  const [view, setView] = useState({ x: 20, y: 10, zoom: 0.8 })
  const root = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id?: string; x: number; y: number; startX: number; startY: number } | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { localStorage.setItem(STORAGE, JSON.stringify({ version: 1, ...draft })); setSaved(true) } catch { setSaved(false) }
    }, 200)
    return () => clearTimeout(timer)
  }, [draft])

  function fit() {
    const el = root.current
    if (!el) return
    const minX = Math.min(...graph.nodes.map((node) => node.x)) - 45
    const minY = Math.min(...graph.nodes.map((node) => node.y)) - 40
    const width = Math.max(...graph.nodes.map((node) => node.x + NODE_WIDTH)) - minX + 85
    const height = Math.max(...graph.nodes.map((node) => node.y + 116 + Math.max(node.inputs.length, node.outputs.length) * 30)) - minY + 115
    const zoom = Math.max(0.22, Math.min(1, (el.clientWidth - 20) / width, (el.clientHeight - 20) / height))
    setView({ x: (el.clientWidth - width * zoom) / 2 - minX * zoom, y: 10 - minY * zoom, zoom })
  }
  useEffect(() => {
    const el = root.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      if (!el.clientWidth) return
      const zoom = Math.max(0.22, Math.min(1, (el.clientWidth - 40) / 1340, (el.clientHeight - 40) / 760))
      setView({ x: 10, y: 8, zoom })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  function zoomBy(factor: number) {
    const el = root.current
    if (!el) return
    setView((v) => {
      const zoom = Math.min(1.8, Math.max(0.22, v.zoom * factor))
      const cx = el.clientWidth / 2, cy = el.clientHeight / 2
      return { x: cx - (cx - v.x) * zoom / v.zoom, y: cy - (cy - v.y) * zoom / v.zoom, zoom }
    })
  }
  function finish(node: string, port: string) {
    if (!pending) { setNotice('先选择右侧输出端口，再选择左侧输入端口。'); return }
    const result = connect(graph, pending.node, pending.port, node, port)
    setGraph(result.graph); setNotice(result.message); setPending(null)
  }
  function isPowered(node: AssetNode): boolean {
    if (node.sale) {
      const sale = graph.edges.find((edge) => edge.id === node.sale)
      return !!sale && isReady(graph, sale.from)
    }
    return isReady(graph, node.id) && graph.edges.some((edge) => edge.from === node.id || edge.to === node.id)
  }
  function renderPort(node: AssetNode, port: Port, index: number, side: 'input' | 'output') {
    const linked = graph.edges.some((edge) => side === 'input' ? edge.to === node.id && edge.input === port.id : edge.from === node.id && edge.output === port.id)
    const powered = graph.edges.some((edge) => (side === 'input' ? edge.to === node.id && edge.input === port.id : edge.from === node.id && edge.output === port.id) && isPowered(graph.nodes.find((item) => item.id === edge.from)!))
    return <button key={port.id} className={`asset-port ${side} flow-${port.flow} ${linked ? 'linked' : ''} ${powered ? 'powered' : ''} ${pending?.node === node.id && pending.port === port.id && side === 'output' ? 'pending' : ''}`}
      style={{ top: 76 + index * 30 }} data-node={node.id} data-port={port.id} data-side={side}
      aria-label={`${node.title} ${side === 'input' ? '输入' : '输出'} ${port.label}`} title={`${port.required ? '必备 · ' : ''}${port.label}${linked ? ' · 已连接' : ' · 未连接'}`}
      onPointerDown={(event) => { event.stopPropagation(); if (side === 'output') { setPending({ node: node.id, port: port.id }); setPointer(portPosition(node, side, port.id)); setNotice(`正在连接「${port.label}」，请选择目标输入端口；Esc 取消。`) } }}
      onPointerUp={(event) => { event.stopPropagation(); if (side === 'input') finish(node.id, port.id) }}
      onClick={(event) => { event.stopPropagation(); if (event.detail === 0) { if (side === 'output') { setPending({ node: node.id, port: port.id }); setPointer(portPosition(node, side, port.id)) } else finish(node.id, port.id) } }}>
      <i><span /></i> <span>{port.label}{port.required && <b title="必备">*</b>}</span>
    </button>
  }
  const pendingNode = graph.nodes.find((node) => node.id === pending?.node)
  const selectedEdge = graph.edges.find((edge) => edge.id === selected)
  const ready = isReady(graph, 'food')
  return <div className="asset-graph talent-network">
    <div className="asset-graph-toolbar"><div className="asset-graph-title"><Workflow size={18} /><strong>辣龙腿 · 资产协作网络</strong><span className={ready ? 'ready' : ''}>{ready ? '制作依赖已就绪' : '待补全制作依赖'}</span></div>
      <div className="asset-graph-actions"><button onClick={() => { setGraph(exampleGraph(owned)); setPending(null); setSelected(null); setNotice('完整示例已恢复，含卖出与收益回流。') }}><Sparkles size={14} /> 载入示例</button><button onClick={() => { setGraph(setRecipeOwnership(initialGraph(), owned)); setPending(null); setSelected(null); setNotice('连线已清空。可以从原材料的「供给原料」端口开始。') }}><RotateCcw size={14} /> 清空连线</button></div>
    </div>
    <div className="asset-graph-options"><div className="asset-legend"><span className="flow-material">原材料</span><span className="flow-recipe">配方</span><span className="flow-chef">服务</span><span className="flow-trade">交易</span><span className="flow-fund">收益回流</span></div>
      <label><input type="checkbox" checked={owned} onChange={(event) => { const value = event.target.checked; setDraft({ graph: setRecipeOwnership(graph, value), owned: value }); setNotice(value ? '配方改为完全持有，已撤去许可费资金端口及其连线。' : '配方改为服务接口，可将收益接入配方的资金端口。') }} /> 配方完全持有</label>
    </div>
    <div className="talent-state-key"><span><i /> 未连接</span><span><i className="linked" /> 已接入</span><span><i className="active" /> 依赖就绪 · 回路激活</span><small>ASSET SYNERGY / 01</small></div>
    <div className="asset-graph-viewport" ref={root} tabIndex={0} aria-label="资产节点体验画板" style={{ backgroundSize: `${24 * view.zoom}px ${24 * view.zoom}px`, backgroundPosition: `${view.x}px ${view.y}px` }}
      onKeyDown={(event) => { if (event.key === 'Escape') setPending(null); if ((event.key === 'Delete' || event.key === 'Backspace') && selected) { event.preventDefault(); setGraph(removeEdge(graph, selected)); setSelected(null) } }}
      onPointerDown={(event) => { if (event.target === event.currentTarget) { setSelected(null); root.current?.focus(); drag.current = { x: view.x, y: view.y, startX: event.clientX, startY: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId) } }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        setPointer({ x: (event.clientX - rect.left - view.x) / view.zoom, y: (event.clientY - rect.top - view.y) / view.zoom })
        const active = drag.current
        if (!active) return
        if (active.id) setGraph({ ...graph, nodes: graph.nodes.map((node) => node.id === active.id ? { ...node, x: active.x + (event.clientX - active.startX) / view.zoom, y: active.y + (event.clientY - active.startY) / view.zoom } : node) })
        else setView({ ...view, x: active.x + event.clientX - active.startX, y: active.y + event.clientY - active.startY })
      }}
      onPointerUp={(event) => {
        drag.current = null
        if (pending) { const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-side="input"]'); if (target?.dataset.node && target.dataset.port) finish(target.dataset.node, target.dataset.port) }
      }} onPointerCancel={() => { drag.current = null; setPending(null) }}>
      <div className="asset-graph-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}>
        <svg className="asset-graph-wires" aria-label="资产连接关系">
          {graph.edges.map((edge) => {
            const from = graph.nodes.find((node) => node.id === edge.from)!, to = graph.nodes.find((node) => node.id === edge.to)!
            const d = edge.flow === 'fund' ? returnCurve(graph, edge) : curve(portPosition(from, 'output', edge.output), portPosition(to, 'input', edge.input))
            return <g key={edge.id} className={`flow-${edge.flow} ${isPowered(from) ? 'is-powered' : 'is-dormant'} ${selected === edge.id ? 'selected' : ''}`}><path d={d} className="talent-wire-channel" /><path d={d} className="talent-wire-aura" /><path d={d} className="asset-wire" />{isPowered(from) && <path d={d} className="talent-wire-energy" />}<path d={d} className="asset-wire-hit" role="button" tabIndex={0} aria-label={`选择连线 ${from.title} 到 ${to.title}`} onPointerDown={(event) => event.stopPropagation()} onClick={() => { setSelected(edge.id); root.current?.focus() }} onKeyDown={(event) => { if (event.key === 'Enter') setSelected(edge.id) }} /></g>
          })}
          {revenuePaths.map(({ node, junction, end, d }, index) => {
            const gradient = `${revenueId}-gold-${index}`
            return <g key={node.id} className="asset-revenue-branch" data-active={isPowered(node)} data-revenue-sale={node.sale}>
              <defs><linearGradient id={gradient} gradientUnits="userSpaceOnUse" x1={junction.x} y1={junction.y} x2={end.x + 0.001} y2={end.y + 0.001}>
                <stop offset="0%" stopColor="var(--revenue-gold-mid)" /><stop offset="32%" stopColor="var(--revenue-gold-light)" /><stop offset="65%" stopColor="var(--revenue-gold-deep)" /><stop offset="100%" stopColor="var(--revenue-gold-mid)" />
              </linearGradient></defs>
              <path className="asset-revenue-aura" d={d} />
              <path className="asset-wire asset-revenue-wire" style={{ stroke: `url(#${gradient})` }} d={d} />
              <path className="asset-revenue-shimmer" d={d} pathLength={200} />
              <circle className="asset-revenue-junction" cx={junction.x} cy={junction.y} r={3.5} />
            </g>
          })}
          {pending && pendingNode && <path className="asset-wire asset-pending-wire" d={curve(portPosition(pendingNode, 'output', pending.port), pointer)} />}
        </svg>
        {graph.nodes.map((node) => {
          const required = node.inputs.filter((port) => port.required)
          const count = required.filter((port) => graph.edges.some((edge) => edge.to === node.id && edge.input === port.id)).length
          const powered = isPowered(node)
          const height = 112 + Math.max(node.inputs.length, node.outputs.length) * 30
          const tone = node.sale ? 'fund' : node.image ? 'material' : node.id === 'recipe' ? 'recipe' : node.id === 'chef' ? 'chef' : 'trade'
          return <article key={node.id} data-asset-node={node.id} data-powered={powered} className={`asset-node flow-${tone} ${powered ? 'is-powered' : 'is-dormant'} ${node.id === 'anjihai-chili' ? 'is-chili' : ''} ${node.sale ? 'is-revenue' : ''}`} style={{ left: node.x, top: node.y, width: NODE_WIDTH, height }}>
            <TalentFrame height={height} />
            <header onPointerDown={(event) => { event.stopPropagation(); root.current?.focus(); drag.current = { id: node.id, x: node.x, y: node.y, startX: event.clientX, startY: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId) }}>
              <span className={`asset-node-thumbnail ${node.image ? 'rune-thumbnail' : ''}`}>{node.image ? <><img src={node.image} alt="" draggable={false} /><RuneOrnament /></> : node.sale ? <CircleDollarSign size={22} /> : node.id === 'chef' ? <ChefHat size={22} /> : <Workflow size={22} />}</span>
              <span><small>{node.kind}</small><strong>{node.title}</strong></span>
              <i className="talent-node-led" title={powered ? '回路激活' : '等待接入'} />
            </header>
            {node.inputs.map((port, index) => renderPort(node, port, index, 'input'))}{node.outputs.map((port, index) => renderPort(node, port, index, 'output'))}
            <footer>{required.length ? <><span className={powered ? 'ready' : ''}>{powered ? <Check size={12} /> : <i />} {powered ? '组合已激活' : count === required.length ? '上游待就绪' : `待接入 ${count}/${required.length}`}</span><span className="talent-dependency-slots" aria-label={`必备依赖 ${count}/${required.length}`}>{required.map((port) => { const edge = graph.edges.find((item) => item.to === node.id && item.input === port.id); return <i key={port.id} className={`flow-${port.flow} ${edge ? 'filled' : ''}`} title={`${port.label} · ${edge ? '已接入' : '待接入'}`} /> })}</span></> : <span>{node.detail}</span>}</footer>
          </article>
        })}
      </div>
      <div className="asset-zoom" onPointerDown={(event) => event.stopPropagation()}><button aria-label="缩小画板" onClick={() => zoomBy(0.8)}><Minus size={15} /></button><span>{Math.round(view.zoom * 100)}%</span><button aria-label="放大画板" onClick={() => zoomBy(1.25)}><Plus size={15} /></button><button aria-label="适应画板" onClick={fit}><Focus size={16} /></button></div>
      {selectedEdge && <div className="asset-edge-menu" onPointerDown={(event) => event.stopPropagation()}><span>{selectedEdge.flow === 'trade' ? '移除卖出将同时移除其收益分支' : '已选择连线'}</span><button onClick={() => { setGraph(removeEdge(graph, selectedEdge.id)); setSelected(null); setNotice('连线已移除。') }}><X size={13} /> 移除连线</button></div>}
    </div>
    <div className="asset-graph-status"><span role="status">{notice}</span>{pending && <button onClick={() => setPending(null)}>取消连接</button>}<small>{saved ? '本机自动保存' : '当前无法保存，刷新后会丢失'} · {graph.nodes.length} 节点 / {graph.edges.length} 连线</small></div>
    <p className="asset-graph-help">拖动标题移动节点 · 拖动空白处平移 · 点击或拖动右侧端口连接左侧端口 · 点击连线可移除。收益回流仅表达分配关系，不自动下单或结算。</p>
  </div>
}
