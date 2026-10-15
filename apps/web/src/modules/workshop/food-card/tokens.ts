// 🔴 改动 2026-10-10 · 超零售品牌 token 的运行时解析：canvas/二维码场景无法直接使用 CSS 变量，统一从这里读取。
// 色值来源：src/design/tokens.css（Figma Collection 1），fallback 与 token 当前值保持一致。
export function brandTokens() {
  const css = getComputedStyle(document.documentElement)
  const get = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
  return {
    // 银色全息膜上的文字（亮色系）
    inkStrong: get('--sr-l-gray-11', '#07070c'),
    inkSub: get('--sr-l-gray-8', '#2e2e3a'),
    inkFaint: get('--sr-l-gray-4', '#9a9aaf'),
    // 深色卡背（暗色系）
    dText: get('--sr-d-gray-1', '#f5f5ff'),
    dSub: get('--sr-d-gray-2', '#d0d0da'),
    dFaint: get('--sr-d-gray-5', '#70707c'),
    dGhost: get('--sr-d-gray-6', '#5b5b65'),
    dPanel: get('--sr-d-gray-10', '#0f0f13'),
    dPage: get('--sr-d-gray-11', '#000000'),
    // 品牌强调
    cta: get('--sr-cta', '#3506ef'),
    navActive: get('--sr-nav-active', '#0062ff'),
    cyan: get('--sr-accent-frosty-skies', '#06d7f6'),
    purple: get('--sr-accent-persian-blue', '#4807ea'),
    red: get('--sr-accent-alizarin-red', '#fd4438'),
    // 品牌渐变参考值（--sr-logo-gradient 的两个 stop，canvas 渐变需离散色值）
    gradStart: '#0fedff',
    gradEnd: '#8f5bff',
  }
}
export type BrandTokens = ReturnType<typeof brandTokens>
