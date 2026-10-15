// 🔴 改动 2026-10-12 · 角色数字卡模块：数据契约与演示数据集中在此（首个角色：厨师 · 杨峥）。
// 字段口径对齐原材料卡（FoodCardData），保证四种形态（图标/节点/组件/卡片）与卡背档案复用同一套渲染语言。
export type CharacterData = {
  id: string
  name: string
  /** 职业（厨师 / 采购 …），卡片正面眉行与节点类别使用 */
  profession: string
  /** 头衔描述（主厨 · 川辣味型） */
  title: string
  /** 版本年份行（与原材料卡 vintage 同位） */
  vintage: string
  edition: string
  editionTone: 'gold' | 'silver' | 'red'
  /** 驻地 / 所属厨房 */
  origin: string
  /** 招牌作品（与配方资产联动） */
  signature: string
  /** 从业年限 */
  experience: string
  /** 服务评分 */
  rating: string
  image: string
  imageAlt: string
  /** 持有服务席位 / 发行总席位 */
  owned: number
  total: number
  unit: string
  /** 服务费（按次） */
  unitPrice: string
  value: string
  assetNo: string
  status: string
  /** 卡背档案：与原材料卡背同构（批次 / 证书 / 发行价 / 溯源二维码 / 履历记录） */
  back: {
    batchNo: string
    certNo: string
    issuePrice: string
    traceUrl: string
    circulation: { date: string; event: string }[]
  }
}

const media = `${import.meta.env.BASE_URL}assets/character-cards/`

export const demoCharacters: CharacterData[] = [
  {
    id: 'yangzheng',
    name: '杨峥',
    profession: '厨师',
    title: '主厨 · 川辣味型',
    vintage: '2026 · 签约主厨',
    edition: '认证版',
    editionTone: 'gold',
    origin: '乌鲁木齐 · 丝绸之路厨房',
    signature: '辣龙腿',
    experience: '18 年',
    rating: '4.98',
    image: `${media}yangzheng-clean.png`,
    imageAlt: '厨师杨峥白色厨服半身肖像',
    owned: 3,
    total: 100,
    unit: '席',
    unitPrice: '服务费 ¥380/次',
    value: '¥1,140',
    assetNo: 'SR-2026-CHEF-YZ-00066',
    status: '在服务',
    back: {
      batchNo: 'CHEF-2026-YZ-066',
      certNo: 'ZYZS-2026-1-08817',
      issuePrice: '签约价 ¥320/次',
      traceUrl: 'https://trace.superretail.cn/t/SR-2026-CHEF-YZ-00066',
      circulation: [
        { date: '2008-06-30', event: '入行 · 乌鲁木齐老字号后厨学徒' },
        { date: '2016-11-18', event: '获中式烹调师一级（高级技师）' },
        { date: '2024-05-20', event: '创制招牌菜「辣龙腿」' },
        { date: '2026-01-16', event: '数字身份发行 · 服务确权上链' },
      ],
    },
  },
]

export const yangZheng = demoCharacters[0]
