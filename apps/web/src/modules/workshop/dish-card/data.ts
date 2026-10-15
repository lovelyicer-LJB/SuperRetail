// 🔴 改动 2026-10-12 · 菜品数字卡模块：数据契约与演示数据集中在此（首个菜品：辣龙腿）。
// 字段口径对齐原材料卡（FoodCardData），并补充菜品特有的出品链路锚点
// （recipeId → 配方卡 la-long-tui，chefId → 角色卡 yangzheng，与资产体系 graph.ts 的食品节点一致）。
export type DishData = {
  id: string
  name: string
  /** 版本年份行（与原材料卡 vintage 同位） */
  vintage: string
  edition: string
  editionTone: 'gold' | 'silver' | 'red'
  /** 出品厨房 / 门店 */
  origin: string
  image: string
  imageAlt: string
  /** 出品链路：配方 id（workshop/recipe-card/data）与主厨 id（workshop/character-card/data） */
  recipeId: string
  chefId: string
  /** 持有库存 / 发行总量 */
  owned: number
  total: number
  unit: string
  /** 门店售价 */
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

const media = `${import.meta.env.BASE_URL}assets/dish-cards/`

export const demoDishes: DishData[] = [
  {
    id: 'la-long-tui',
    name: '辣龙腿',
    vintage: '2026 · 门店在售',
    edition: '招牌版',
    editionTone: 'red',
    origin: '丝绸之路厨房 · 乌鲁木齐',
    image: `${media}la-long-tui-clean.png`,
    imageAlt: '辣龙腿出餐：枣红釉烤腿切片摆盘，龙鳞纹瓷盘',
    recipeId: 'la-long-tui',
    chefId: 'yangzheng',
    owned: 24,
    total: 1000,
    unit: '份',
    unitPrice: '售价 ¥168/份',
    value: '¥4,032',
    assetNo: 'SR-2026-DISH-LLT-00771',
    status: '在售',
    back: {
      batchNo: 'DISH-2026-LLT-771',
      certNo: 'SPBA-2026-0771',
      issuePrice: '发行价 ¥148/份',
      traceUrl: 'https://trace.superretail.cn/t/SR-2026-DISH-LLT-00771',
      circulation: [
        { date: '2026-02-20', event: '首店上架 · 丝绸之路厨房乌鲁木齐店' },
        { date: '2026-04-30', event: '售出第 1,000 份 · 招牌菜认证' },
        { date: '2026-06-18', event: '数字卡发行 · 菜品资产确权上链' },
      ],
    },
  },
]

export const laLongTuiDish = demoDishes[0]
