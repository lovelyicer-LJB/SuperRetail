// 🔴 改动 2026-10-12 · 配方数字卡模块：数据契约与演示数据集中在此（首个配方：辣龙腿）。
// 字段口径对齐原材料卡（FoodCardData），并补充配方特有的原料清单 / 产出 / 授权方式；
// 原料 assetId 锚定工坊 FoodCardData.id，与资产体系 graph.ts 的配方节点端口保持一致。
export type RecipeData = {
  id: string
  name: string
  /** 配方版本行（与原材料卡 vintage 同位） */
  vintage: string
  edition: string
  editionTone: 'gold' | 'silver' | 'red'
  /** 出品方（主厨 / 厨房） */
  origin: string
  image: string
  imageAlt: string
  /** 所需原料（assetId 对应原材料卡 id；amount 为单份用量） */
  ingredients: { assetId: string; name: string; amount: string }[]
  /** 单份产出 */
  output: string
  /** 授权方式（按次授权 / 完全持有） */
  license: string
  /** 持有授权份额 / 发行总份额 */
  owned: number
  total: number
  unit: string
  /** 许可费（按次） */
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

const media = `${import.meta.env.BASE_URL}assets/recipe-cards/`

export const demoRecipes: RecipeData[] = [
  {
    id: 'la-long-tui',
    name: '辣龙腿',
    vintage: '2026 · 第三版',
    edition: '主厨签名版',
    editionTone: 'red',
    origin: '杨峥 · 丝绸之路厨房',
    image: `${media}la-long-tui-clean.png`,
    imageAlt: '辣龙腿成品：枣红辣椒釉烤腿，龙鳞纹石板盘',
    ingredients: [
      { assetId: 'anjihai-chili', name: '安集海辣皮子', amount: '12g' },
      { assetId: 'xihu-longjing', name: '西湖龙井茶', amount: '3g 熏香' },
      { assetId: 'jinhua-ham', name: '金华火腿', amount: '80g 咸鲜底' },
    ],
    output: '成品 1 份 · 约 680g',
    license: '按次授权',
    owned: 8,
    total: 500,
    unit: '次',
    unitPrice: '许可费 ¥68/次',
    value: '¥544',
    assetNo: 'SR-2026-RCP-LLT-00333',
    status: '可授权',
    back: {
      batchNo: 'RCP-2026-LLT-03',
      certNo: 'FCBA-2026-0333',
      issuePrice: '发行价 ¥58/次',
      traceUrl: 'https://trace.superretail.cn/t/SR-2026-RCP-LLT-00333',
      circulation: [
        { date: '2024-05-20', event: '杨峥创制 · 丝绸之路厨房首版' },
        { date: '2025-09-12', event: '三轮盲测定版 · 辣度与熏香定型' },
        { date: '2026-02-08', event: '配方备案 · 数字卡发行确权上链' },
      ],
    },
  },
]

export const laLongTui = demoRecipes[0]
