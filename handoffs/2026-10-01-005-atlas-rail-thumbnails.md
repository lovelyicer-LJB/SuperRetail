# 交接 005 — Atlas 版图：33 组件完成 + 右侧卷轴缩略图列表（当前最新形态）

> 交接时间：2026-10-01 17:33 (+0800)。主任务（33 组件 1:1 还原 + 中文化）**已全部完成并验证**；
> 此后按用户要求做了两轮页面形态改造，当前形态 = **右侧固定卷轴缩略图列表**。

## 1. 任务目标

把 Pixso「All Win Harmony SuperRetail Platform」Widgets & Indicator 页 24 个组件 +
Charts 页 9 个图表 1:1 还原为 React 组件（`apps/web` 版图 /atlas 板块），
全部中文文案、¥ 符号、HarmonyOS Sans SC 字体，以缩略图封面形式收录在页面右侧
宽 1/4 屏的固定卷轴列表中。

## 2. 已完成工作（全部验证过）

- **33/33 组件还原**：明细见 `handoffs/2026-10-01-004-atlas-widgets-charts.md`（收官记录）。
  组件文件在 `apps/web/src/modules/atlas/components/`（33 个 + chart-utils/crypto-logos/
  use-count-up 等共享件）。
- **本地化**：英译中 + $→¥ + 字体栈 `'HarmonyOS Sans SC, Noto Sans SC, sans-serif'`，
  codemod 脚本 `tools/localize_atlas.py`（幂等，含映射表）。
- **右侧卷轴列表**（最新两轮改造，全部在 `apps/web/src/modules/atlas/AtlasPage.tsx`）：
  - `ComponentRail`：fixed right-0 top-[68px]（避开 68px 顶栏）、w-1/4、h-[calc(100vh-68px)]、
    自带细滚动条（6px webkit + scrollbar-width:thin）。
  - `RailThumb`：统一缩略图封面 = 圆角卡片（border-white/10 bg-sr-d-gray-10，悬停描边高亮）
    + 组件本体按自身宽高比 contain 居中（absolute inset-0 m-auto + aspectRatio + maxW92%/maxH86%）
    + 下方居中中文名（text-sr-d-gray-2）。
  - 封面比例：竖版 4:5、横版 8:5、span2 独占行 16:9。
  - 分组：组件与指标 24/24 + 图表 9/9，组标题 sticky 吸顶。
  - 主页面只剩标题/导语/引导文案，右侧 `pr-[25vw]` 留白；WidgetArena 引用已移除。
- **宽图独占一行（span2）**：组件区总余额/XL；图表区气泡图、蜂窝图、折线图 v2、K 线图、折线图 v1。

## 3. 当前断点

无进行中的工作。最后一次操作：`npx tsc -b --noEmit` + `npx eslint src/modules/atlas/` 全过，
无头截图逐项核对 33 张缩略图渲染正常（截图在 `tmp_shots/rail_all_crop.png`）。

**已向用户抛出待决建议**：点击缩略图弹出大图预览（等比放大 + 入场动画重播），用户尚未回复。

## 4. 关键约束与偏好

- 设计值必须 Pixso MCP 实测（`python tools/pixso_mcp.py call <tool> '<json>'`），禁目测。
- 每处改动后跑 `cd apps/web && npx tsc -b --noEmit && npx eslint src/modules/atlas/`；
  `src/components/ui/` 有 8 个存量 lint 错误属项目原有，勿动。
- 中文化范围已完成；组件区 OverallBalanceXLW 的 Y 轴仍是 `10k/15k`（用户未要求改，遗留可选项）。
- 用户偏好迭代式 UI 调整，每步截图验证（Edge 无头 + DPR1.5，命令见 004 文档）。

## 5. 已排除方案 / 坑

- Pixso get_screenshot 返回 **RGBA**：辉光像素 RGB 未乘 alpha，A/B 对比必须先按底色合成。
- 曲线 clip-path 揭示动画终帧要 `inset(-150% -5% -150% 0)` 大放血，否则辉光阴影被裁。
- Tailwind 色板没有 `sr-d-gray-3`/`sr-d-gray-4`（可用：0/1/2/5/6/10/11），用了会隐身。
- 顶栏 TopMenu 高 68px 且在文档流内，fixed 面板要 top-[68px] 让开右上角用户区。
- bash heredoc 写含模板字符串的 Python 易断；一律写 `tools/*.py` 再跑。

## 6. 当前故障

无。

## 7. 启动动作

1. 读 `apps/web/src/modules/atlas/AtlasPage.tsx`（全部展示逻辑集中在此）；
2. 确认 dev server `http://localhost:7100/atlas` 在跑（不在则 `cd apps/web && npm run dev -- --port 7100`）；
3. 若用户接受「点击放大预览」建议，则实现缩略图点击 → 中央模态大图（复用组件 render + 重放动画）。
