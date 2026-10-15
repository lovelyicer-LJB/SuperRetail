// 🔴 改动 2026-10-12 · 市场数字卡模块：数据契约与演示数据集中在此（首个市场资产：用户）。
// 字段口径对齐原材料卡（FoodCardData），并补充市场资产的运营指标 chips；
// 市场资产是需求侧（用户 / 采购方），与资产体系 graph.ts 的采购方节点一致（买入/资金入、卖出出）。
export type MarketData = {
  id: string
  name: string
  /** 版本年份行（与原材料卡 vintage 同位） */
  vintage: string
  edition: string
  editionTone: 'gold' | 'silver' | 'red'
  /** 归属体系（会员体系 / 采购网络） */
  origin: string
  image: string
  imageAlt: string
  /** 运营指标（卡片芯片行：月活 / 复购等） */
  metrics: { label: string; value: string }[]
  /** 持有份额 / 发行总量 */
  owned: number
  total: number
  unit: string
  /** 单份价值口径（客单价 / 采购单价） */
  unitPrice: string
  value: string
  assetNo: string
  status: string
  /** 卡背档案：与原材料卡背同构（批次 / 备案 / 发行价 / 溯源二维码 / 流转记录） */
  back: {
    batchNo: string
    certNo: string
    issuePrice: string
    traceUrl: string
    circulation: { date: string; event: string }[]
  }
}

const media = `${import.meta.env.BASE_URL}assets/market-cards/`

export const demoMarkets: MarketData[] = [
  {
    id: 'users',
    name: '用户',
    vintage: '2026 · 活跃会员',
    edition: '会员版',
    editionTone: 'silver',
    origin: '丝绸之路厨房 · 会员体系',
    image: `${media}users-clean.png`,
    imageAlt: '会员用户在餐厅围桌举杯用餐的场景',
    metrics: [
      { label: '月活', value: '82%' },
      { label: '复购', value: '38%' },
    ],
    owned: 1280,
    total: 50000,
    unit: '人',
    unitPrice: '客单价 ¥86/人',
    value: '¥110,080',
    assetNo: 'SR-2026-MKT-USR-00088',
    status: '活跃',
    back: {
      batchNo: 'MKT-2026-USR-088',
      certNo: 'HYBA-2026-0088',
      issuePrice: '发行估值 ¥72/人',
      traceUrl: 'https://trace.superretail.cn/t/SR-2026-MKT-USR-00088',
      circulation: [
        { date: '2025-12-01', event: '会员体系上线 · 首批 300 人' },
        { date: '2026-03-15', event: '月活突破 1,000 · 复购率 38%' },
        { date: '2026-06-20', event: '数字卡发行 · 用户资产确权上链' },
      ],
    },
  },
]

export const usersMarket = demoMarkets[0]
