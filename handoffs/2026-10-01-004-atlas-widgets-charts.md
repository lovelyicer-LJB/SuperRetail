# 交接 004 — Atlas 版图 33 组件全部完成（收官）

> 状态：**任务完成**。Widgets 24/24 + Charts 9/9 已全部 1:1 还原并挂载 `/atlas`，
> 本地化（中文 / ¥ / HarmonyOS Sans SC）全面完成。无需再接力；本档仅作收尾记录。

## 本会话完成（在 003 断点之后）

1. **BubbleChartC 辉光修复验证**（63:485）：Bg glow 径向渐变中心改为椭圆左缘中点
   `translate(-201.015,355.642) scale(1,0.5223)`，删除双重透明度。A/B 对比通过。
2. **HexChartC**（63:1187, 1063×134）：`apps/web/src/modules/atlas/components/HexChartC.tsx`。
   298 格蜂窝（5 行 60/59/60/59/60，逐格颜色索引从导出 SVG 提取），7 色阶
   #176BF8 #383DCA #25245D #1E1E24 #772443 #DB3031 #FF8743；33 根刻度 + 0~200 标签。
3. **LineChartV2C**（63:543, 1536×457）：`LineChartV2C.tsx`。10 条贝塞尔彩带（路径经
   SVG 导出后坐标归一到 1419.53×282 帧空间）、2 团径向辉光、66 柱迷你柱图、
   Y 标签中文化为 1万~3万、月份 1月~12月。4 条带影曲线的 6 层 DROP_SHADOW 原样展开为
   CSS drop-shadow 链。
4. **CandleChartC**（63:658, 1460×438.5）：`CandleChartC.tsx`。101 根蜡烛
   （57 绿 #00FFCB / 44 紫 #6300FF，20 根带绿辉光）、8 条网格线、65 柱 #2C2C35、
   月份标签。生成器 `tools/extract_candle.py` + `tools/gen_candle.py`。
5. **LineChartV1C**（63:1067, 1063×546）：`LineChartV1C.tsx`。20 列网格
   （描边 #0F0F13 + 迷你柱 #1E1E24 + 日期 2月1日~2月20日）、4 曲线
   （Amethyst/SeaGreen/Mango/Strawberry + 影链）、悬停磨砂条用 HTML div
   （backdrop-filter blur(20px)，SVG 无法做）夹在两层 SVG 之间、3 圆点 + ¥ 数值 +
   青色底线。生成器 `tools/extract_linev1.py` + `tools/gen_linev1.py`。

## 关键坑（新发现）

- **Pixso get_screenshot 返回 RGBA**：辉光等半透明像素的 RGB 通道是未乘 alpha 的原色。
  做 A/B 对比必须先按页面底色（卡片 #0F0F13 附近）合成，否则会把设计稿判得过饱和
  （本会话在折线 v2 上就因此虚惊一场，实际渲染早已正确）。
- 曲线阴影被 clip-path 揭示动画截断：终帧要用 `inset(-150% -5% -150% 0)` 大放血，
  不能留在小负值。
- read_styles 输出文件要 `encoding='utf-8'` 读，否则 GBK 解码报错。
- bash heredoc 写含反引号/模板字符串的 Python 易断，一律写 `tools/*.py` 脚本再跑。

## 验证

- `cd apps/web && npx tsc -b --noEmit && npx eslint src/modules/atlas/ src/components/widget-arena/` 全过。
- 无头截图（Edge headless, DPR 1.5, `localhost:7100/atlas`）逐一比对设计稿通过：
  蜂窝图色带/刻度、折线 v2 彩带/辉光/柱图、K 线蜡烛/辉光、折线 v1 网格/悬停条/圆点。
- AtlasPage CHARTS 数组 9/9：迷你指标环、指标环、饼图、进度图、气泡图、蜂窝图、
  折线图 v2、K 线图、折线图 v1。

## 遗留（可选优化，非缺陷）

- 折线 v2/v1 的辉光强度为近似校准（CSS drop-shadow 与 Pixso 多层模糊算法不同），
  观感已接近；如需像素级一致可再按 alpha 合成后的像素微调。
- Widgets 区 OverallBalanceXLW 的 Y 轴仍是 `10k/15k` 英文单位（widget 板块，
  不在本轮「图表中文化」范围；如需改，参照折线 v2 的 万 单位映射）。

交接链终止。无需创建新的接力 Automation。
