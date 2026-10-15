// 🔴 改动 2026-10-13 · 工坊「收益循环 & 收益线程」演示页：金色虚线框围合的节点工作流。
// 参考数字资产四种形态的节点示例与收益连线两种金色：框内是一条完整的资产链路
// （原料 → 配方 → 菜品 → 卖出 → 收益）。运行技能（点击/拖入虚线框）激活工作流：
// 收益循环 = 收益节点回流源头，脉冲循环往复；
// 收益线程 = 收益节点不回连源头，单向脉冲自源头逐级抵达收益节点即止。
// 连线流动特效参照 UE5 蓝图系统调试工具「可视化执行流（激活线）」。
import { useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { ArrowLeft, ChefHat, CircleDollarSign, CookingPot, MoveRight, Package, RefreshCw, RotateCcw, ScrollText, Sparkles, Store } from 'lucide-react'
import type { ShellTheme } from '@/components/shell/TopMenu'
import { cn } from '@/lib/utils'
import './revenue-thread.css'

/** 节点世界坐标（SVG viewBox 0 100 1076 500；节点 196×112） */
type Tone = 'material' | 'recipe' | 'chef' | 'dish' | 'buyer' | 'revenue'
type ThreadNode = { id: string; title: string; kind: string; detail: string; x: number; y: number; tone: Tone }
type ThreadWire = { id: string; label: string; depth: number; len: number; d: string }
type PortSpec = { x: number; y: number; side: 'in' | 'out' }
type ThreadMode = 'loop' | 'thread'

const NODES: ThreadNode[] = [
  { id: 'source', title: '安集海辣皮子', kind: '原材料 · 源头', detail: '60 kg 可用 · 供给原料', x: 48, y: 196, tone: 'material' },
  { id: 'recipe', title: '辣龙腿配方', kind: '配方资产', detail: '按次授权 · 配方服务', x: 312, y: 196, tone: 'recipe' },
  { id: 'dish', title: '辣龙腿', kind: '食品资产', detail: '配方 + 厨师就绪可制作', x: 572, y: 196, tone: 'dish' },
  { id: 'buyer', title: '餐厅采购', kind: '采购方', detail: '卖出连接目标 · 演示订单', x: 832, y: 196, tone: 'buyer' },
  { id: 'revenue', title: '收益节点', kind: '最终节点 · 收益循环', detail: '分配方向示意 · 尚未结算', x: 832, y: 424, tone: 'revenue' },
  { id: 'chef', title: '主厨 · 林师傅', kind: '角色节点', detail: '服务可用 · 提供烹饪', x: 312, y: 424, tone: 'chef' },
]

/** 正向连线路径按 源头 → 最终节点 方向绘制；depth 决定动效自源头向下的级联顺序；len 为路径长度（供固定脉冲尺寸换算） */
const FORWARD_WIRES: ThreadWire[] = [
  { id: 'supply', label: '供给原料', depth: 0, len: 68, d: 'M 244 252 C 274 252 282 252 312 252' },
  { id: 'recipe', label: '配方服务', depth: 1, len: 64, d: 'M 508 252 C 536 252 544 252 572 252' },
  { id: 'chef', label: '提供烹饪', depth: 1, len: 294.8, d: 'M 410 424 C 410 370 670 352 670 308' },
  { id: 'sell', label: '卖出', depth: 2, len: 64, d: 'M 768 252 C 796 252 804 252 832 252' },
  { id: 'branch', label: '成交计价', depth: 3, len: 225, d: 'M 800 252 C 800 330 930 344 930 424' },
]
/** 收益循环专属：收益节点回流源头的回连线（线程形态下不渲染，脉冲单向止于收益节点） */
const LOOP_WIRE: ThreadWire = { id: 'loop', label: '收益回流', depth: 4, len: 1051.4, d: 'M 912 536 L 912 556 Q 912 570 898 570 L 160 570 Q 146 570 146 556 L 146 308' }

/** 🔴 改动 2026-10-13 · UE5 执行流脉冲两层的固定世界尺寸：
 *  单枚粗圆头亮脉冲 + 柔光晕；脉冲不随连线长度缩放；
 *  pathLength 归一化为 100 保证匀速，dash 占比 = 固定尺寸 / 路径长度 */
const FLOW_CORE = 28
const FLOW_HALO = 44
const dashFor = (len: number, size: number) => `${((size / len) * 100).toFixed(2)} ${(100 - (size / len) * 100).toFixed(2)}`

/** 卖出连线中点：收益分支的引出点 */
const SELL_MID = { x: 800, y: 252 }

const NODE_W = 196
const NODE_H = 112
const FRAME = { x: 20, y: 168, w: 1036, h: 420 }

/** 端口点（相对节点左上角）：只画有连线落点的端口，避免悬空端口暗示缺失连接 */
const PORTS_BASE: Record<string, PortSpec[]> = {
  source: [{ x: 196, y: 56, side: 'out' }],
  recipe: [{ x: 0, y: 56, side: 'in' }, { x: 196, y: 56, side: 'out' }],
  dish: [{ x: 0, y: 56, side: 'in' }, { x: 196, y: 56, side: 'out' }, { x: 98, y: 112, side: 'in' }],
  buyer: [{ x: 0, y: 56, side: 'in' }],
  chef: [{ x: 98, y: 0, side: 'out' }],
  revenue: [{ x: 98, y: 0, side: 'in' }],
}
/** 仅在收益循环形态出现的回连端口（源头底部进 / 收益底部出） */
const PORTS_LOOP_ONLY: Record<string, PortSpec[]> = {
  source: [{ x: 98, y: 112, side: 'in' }],
  revenue: [{ x: 80, y: 112, side: 'out' }],
}

const TONE_ICON = { material: Package, recipe: ScrollText, chef: ChefHat, dish: CookingPot, buyer: Store, revenue: CircleDollarSign }

export function RevenueThreadPage() {
  const { theme } = useOutletContext<{ theme: ShellTheme }>()
  const dark = theme === 'dark'
  const [mode, setMode] = useState<ThreadMode>('loop')
  const [applied, setApplied] = useState(false)
  const [dragging, setDragging] = useState<{ x: number; y: number } | null>(null)
  const [overFrame, setOverFrame] = useState(false)
  const frameRef = useRef<SVGRectElement>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)

  const modeName = mode === 'loop' ? '收益循环' : '收益线程'
  const wires = mode === 'loop' ? [...FORWARD_WIRES, LOOP_WIRE] : FORWARD_WIRES

  /** 指针是否落在金色虚线框的屏幕范围内 */
  const hitFrame = (x: number, y: number) => {
    const rect = frameRef.current?.getBoundingClientRect()
    return !!rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  }
  const onSkillPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (applied) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStart.current = { x: event.clientX, y: event.clientY }
    setDragging({ x: event.clientX, y: event.clientY })
    setOverFrame(hitFrame(event.clientX, event.clientY))
  }
  const onSkillPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return
    setDragging({ x: event.clientX, y: event.clientY })
    setOverFrame(hitFrame(event.clientX, event.clientY))
  }
  const onSkillPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging) return
    const moved = dragStart.current ? Math.hypot(event.clientX - dragStart.current.x, event.clientY - dragStart.current.y) : 0
    const inside = hitFrame(event.clientX, event.clientY)
    dragStart.current = null
    setDragging(null)
    setOverFrame(false)
    // 点击技能（原地松开）或把技能拖入虚线框范围内 → 激活工作流
    if (inside || moved < 8) setApplied(true)
  }

  return (
    <div className={cn('rt mx-auto max-w-6xl px-8 py-12 font-sans', applied && 'is-active', !dark && 'is-light', mode === 'thread' && 'is-thread', dark ? 'text-sr-d-gray-1' : 'text-sr-l-gray-11')}>
      <Link to="/workshop" className="inline-flex items-center gap-2 text-[12px] opacity-60 transition-opacity hover:opacity-100">
        <ArrowLeft size={14} /> 返回工坊
      </Link>
      <p className={cn('mt-6 text-[11px] font-semibold uppercase tracking-[0.3em]', dark ? 'text-sr-d-gray-5' : 'text-sr-l-gray-4')}>
        REVENUE LOOP & THREAD / SKILL ACTIVATION
      </p>
      <h1 className="mt-3 font-display text-[36px] font-bold leading-tight">收益循环 · 收益线程</h1>
      <p className={cn('mt-3 max-w-3xl text-[14px] leading-6', dark ? 'text-sr-d-gray-2' : 'text-sr-l-gray-8')}>
        一条完整资产链路被<strong>金色虚线框</strong>围合成节点工作流。把下方「运行技能」<strong>点击</strong>或<strong>拖入虚线框范围内</strong>激活：
        选择<strong>收益循环</strong>，脉冲自源头流向最终节点、再由收益节点回流源头，循环往复；
        选择<strong>收益线程</strong>，收益节点不回连源头，脉冲单向流动、抵达收益节点即止。
      </p>

      <section className="rt-panel mt-8">
        <div className="rt-legend">
          <div className="rt-modes" role="group" aria-label="收益工作流形态">
            <button type="button" aria-label="收益循环" aria-pressed={mode === 'loop'} onClick={() => setMode('loop')}><RefreshCw size={14} /> 收益循环</button>
            <button type="button" aria-label="收益线程" aria-pressed={mode === 'thread'} onClick={() => setMode('thread')}><MoveRight size={14} /> 收益线程</button>
          </div>
          <span className="rt-legend-divider" />
          <span className="rt-legend-flow rt-flow-material">原材料</span>
          <span className="rt-legend-flow rt-flow-recipe">配方</span>
          <span className="rt-legend-flow rt-flow-chef">厨师</span>
          <span className="rt-legend-flow rt-flow-dish">菜品</span>
          <span className="rt-legend-flow rt-flow-trade">交易</span>
          {mode === 'loop' && <span className="rt-legend-flow rt-flow-fund">收益回流</span>}
          <span className={cn('rt-state-pill', applied && 'is-active')} role="status">
            <i /> {applied ? `${modeName} · 已激活` : '待激活 · 工作流'}
          </span>
        </div>

        <div className="rt-stage">
          <svg className="rt-svg" viewBox="0 100 1076 500" role="img" aria-label="金色虚线框围合的节点工作流">
            <defs>
              <linearGradient id="rt-gold-grad" gradientUnits="userSpaceOnUse" x1="48" y1="196" x2="1028" y2="536">
                <stop offset="0%" stopColor="var(--rt-gold-mid)" />
                <stop offset="34%" stopColor="var(--rt-gold-light)" />
                <stop offset="68%" stopColor="var(--rt-gold-deep)" />
                <stop offset="100%" stopColor="var(--rt-gold-mid)" />
              </linearGradient>
            </defs>

            {/* 金色虚线框：围合整条工作流；激活后成为收益循环 / 收益线程（流动虚线 + 微光） */}
            <g className={cn('rt-frame-group', applied && 'is-active', overFrame && 'is-targeting')}>
              <rect ref={frameRef} className="rt-frame" x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} rx={20} />
              <rect className="rt-frame-glow" x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} rx={20} />
              <g className="rt-frame-badge">
                <rect x={538 - 92} y={126} width={184} height={26} rx={13} />
                <text x={538} y={143} textAnchor="middle">{applied ? `${modeName} · 已激活` : '待激活 · 节点工作流'}</text>
              </g>
            </g>

            {/* 连线：源头 → 最终节点；激活后全部变金，脉冲沿路径自源头流向目标
                （🔴 改动 2026-10-13 · 参照 UE5 蓝图调试的可视化执行流：
                单枚粗圆头亮脉冲 + 柔光晕，按拓扑深度错峰级联；线程形态无回连线，单向止于收益节点） */}
            <g className="rt-wires">
              {wires.map((wire) => (
                <g key={wire.id} className="rt-wire" data-depth={wire.depth}>
                  <path className="rt-wire-base" d={wire.d} />
                  <path className="rt-wire-gold" d={wire.d} />
                  <path className="rt-wire-flow-halo" d={wire.d} pathLength={100} strokeDasharray={dashFor(wire.len, FLOW_HALO)} style={{ animationDelay: `${wire.depth * 0.3}s` }} />
                  <path className="rt-wire-flow" d={wire.d} pathLength={100} strokeDasharray={dashFor(wire.len, FLOW_CORE)} style={{ animationDelay: `${wire.depth * 0.3}s` }} />
                  <title>{wire.label} · {wire.id === 'loop' ? '收益回流源头' : '流向下一节点'}</title>
                </g>
              ))}
              {/* 卖出中点：收益分支引出点 */}
              <circle className="rt-junction" cx={SELL_MID.x} cy={SELL_MID.y} r={3.5} />
            </g>

            {/* 节点 */}
            {NODES.map((node) => {
              const Icon = TONE_ICON[node.tone]
              const kind = node.id === 'revenue' ? (mode === 'loop' ? '最终节点 · 收益循环' : '最终节点 · 收益线程') : node.kind
              const ports = [...(PORTS_BASE[node.id] ?? []), ...(mode === 'loop' ? (PORTS_LOOP_ONLY[node.id] ?? []) : [])]
              return (
                <g key={node.id} className={cn('rt-node', `rt-tone-${node.tone}`, node.id === 'source' && 'is-source', node.id === 'revenue' && 'is-final')} transform={`translate(${node.x} ${node.y})`}>
                  <rect className="rt-node-body" width={NODE_W} height={NODE_H} rx={14} />
                  <path className="rt-node-brackets" d={nodeBrackets()} />
                  <rect className="rt-node-icon-slot" x={14} y={13} width={24} height={24} rx={7} />
                  <g transform="translate(16 15)" className="rt-node-icon"><Icon size={20} /></g>
                  <text className="rt-node-title" x={48} y={28}>{node.title}</text>
                  <text className="rt-node-kind" x={48} y={43}>{kind}</text>
                  <line className="rt-node-rule" x1={14} y1={54} x2={NODE_W - 14} y2={54} />
                  <text className="rt-node-detail" x={16} y={102}>{node.detail}</text>
                  <circle className="rt-node-led" cx={NODE_W - 26} cy={25} r={3} />
                  {ports.map((port, index) => (
                    <circle key={index} className={`rt-port rt-port-${port.side}`} cx={port.x} cy={port.y} r={4} />
                  ))}
                </g>
              )
            })}
          </svg>

          {/* 拖拽技能时的半透明幽灵（跟随指针） */}
          {dragging && (
            <div className="rt-skill-ghost" style={{ left: dragging.x, top: dragging.y }} aria-hidden="true">
              <Sparkles size={15} /> 运行技能
            </div>
          )}
          {dragging && <p className="rt-drop-hint">{overFrame ? `释放：激活${modeName}` : '拖入金色虚线框范围内'}</p>}
        </div>

        <div className="rt-dock">
          {!applied ? (
            <>
              <button
                className={cn('rt-skill', dragging && 'is-dragging')}
                style={dragging ? { left: dragging.x, top: dragging.y } : undefined}
                onPointerDown={onSkillPointerDown}
                onPointerMove={onSkillPointerMove}
                onPointerUp={onSkillPointerUp}
                onPointerCancel={() => { dragStart.current = null; setDragging(null); setOverFrame(false) }}
              >
                <Sparkles size={16} /> 运行技能 · {modeName}
                <small>点击 或 拖入虚线框</small>
              </button>
              <p className="rt-dock-note">
                技能作用到虚线框范围内时，工作流激活为{modeName}；当前形态：{mode === 'loop' ? '回连源头 · 循环往复' : '单向脉冲 · 止于收益节点'}。
              </p>
            </>
          ) : (
            <>
              <div className="rt-skill-applied"><Sparkles size={16} /> 技能已生效 · {modeName}运行中</div>
              <button className="rt-reset" onClick={() => setApplied(false)}><RotateCcw size={14} /> 重新演示</button>
              <p className="rt-dock-note">
                {mode === 'loop'
                  ? '连线金色脉冲自源头逐级抵达收益节点，再由收益节点回流源头，循环往复。'
                  : '连线金色脉冲单向流动，自源头逐级抵达收益节点即止——线程不回连源头。'}
              </p>
            </>
          )}
        </div>
      </section>

      <div className="rt-steps mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Step index="01" title="金色虚线框" text="围合整条资产链路，形成待激活的节点工作流；框内即技能作用范围。" />
        <Step index="02" title="运行技能" text="点击技能，或把它拖入虚线框范围内：技能落在框内的一刻，工作流被激活。" />
        <Step index="03" title="循环 & 线程" text="收益循环回连源头、脉冲往复不息；收益线程不回连、单向脉冲止于收益节点。两者均按 UE5 蓝图调试的可视化执行流流动。" />
      </div>

      <p className={cn('mt-6 text-[12px] leading-5', dark ? 'text-sr-d-gray-5' : 'text-sr-l-gray-4')}>
        演示页仅表达「技能激活 → 收益循环 / 收益线程」的交互与动效，不产生实际买卖或资金结算。
      </p>
    </div>
  )
}

function Step({ index, title, text }: { index: string; title: string; text: string }) {
  return (
    <div className="rt-step">
      <span className="rt-step-index">{index}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  )
}

/** 节点四角圆角括号（同工坊 asset-system 的 talentFrameCorners 语言） */
function nodeBrackets(): string {
  const o = 3, r = 14, leg = 12, w = NODE_W, h = NODE_H
  const tl = `M${o} ${o + r + leg}V${o + r}A${r} ${r} 0 0 1 ${o + r} ${o}H${o + r + leg}`
  const tr = `M${w - o - r - leg} ${o}H${w - o - r}A${r} ${r} 0 0 1 ${w - o} ${o + r}V${o + r + leg}`
  const br = `M${w - o} ${h - o - r - leg}V${h - o - r}A${r} ${r} 0 0 1 ${w - o - r} ${h - o}H${w - o - r - leg}`
  const bl = `M${o + r + leg} ${h - o}H${o + r}A${r} ${r} 0 0 1 ${o} ${h - o - r}V${h - o - r - leg}`
  return `${tl} ${tr} ${br} ${bl}`
}
