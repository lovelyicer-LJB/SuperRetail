// 🔴 改动 2026-10-13 · 9 个餐饮品牌共享数据（侧边栏品牌浮窗 / 互动页玻璃星球共用）：
// key/名称/logo/份额/估值/涨幅 + 品牌色（color 取自各品牌 SVG 圆形底色，星球玻璃着色用）。

export interface BrandEntry {
  key: string
  name: string
  /** logo 文件名（public/assets/atlas/brands 下） */
  logo: string
  /** 品牌色（SVG 圆形底色） */
  color: string
  shares: string
  value: string
  delta: string
}

/** 9 个餐饮品牌（顺序与侧边栏品牌浮窗一致） */
export const BRANDS: BrandEntry[] = [
  { key: 'laziji', name: '天山醉美辣子鸡', logo: '辣子鸡.svg', color: '#EB3300', shares: '1/2000', value: '100000¥', delta: '10000(10%)' },
  { key: 'beiyuanchun', name: '北园春城市宴会中心', logo: '北园春.svg', color: '#96142A', shares: '1/100', value: '990000¥', delta: '10000(10%)' },
  { key: 'bohu', name: '醉美博湖鱼宴', logo: '博湖鱼宴.svg', color: '#015691', shares: '3/10', value: '100000¥', delta: '10000(10%)' },
  { key: 'zhoudi', name: '醉美粥底火锅', logo: '粥底火锅.svg', color: '#9F3714', shares: '1/1', value: '100000¥', delta: '10000(10%)' },
  { key: 'xilu', name: '醉美喜炉', logo: '喜炉.svg', color: '#EA5504', shares: '8/50', value: '100000¥', delta: '10000(10%)' },
  { key: 'yaokaihua', name: '姚开花鲜货烧烤', logo: '姚开花.svg', color: '#7A9735', shares: '1/100', value: '100000¥', delta: '10000(10%)' },
  { key: 'haodafang', name: '郝大方小碗菜', logo: '郝大方.svg', color: '#B02E25', shares: '5/100', value: '100000¥', delta: '10000(10%)' },
  { key: 'daxiangli', name: '大香梨源味湘菜', logo: '大香梨.svg', color: '#999D3A', shares: '8/100', value: '100000¥', delta: '10000(10%)' },
  { key: 'shuanggongyang', name: '双公羊馕坑烤全羊', logo: '双公羊.svg', color: '#83482E', shares: '1/200', value: '100000¥', delta: '10000(10%)' },
]

/** 品牌 logo 资源 URL（与 BrandsPanel 原 logo() 规则一致） */
export function brandLogoUrl(file: string): string {
  return `${import.meta.env.BASE_URL}assets/atlas/brands/${encodeURIComponent(file)}`
}
