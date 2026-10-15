# Handoff 2026-10-01-001 · 版图板块 Pixso 组件还原（Widgets & Indicator + Charts）

> 交接链说明：本会话由用户明确要求「自我 handoff、自动开新会话继续」。新会话上下文达到约 85% 时，必须再次执行相同流程：更新/新建交接文档（序号递增），然后创建一个 3–5 分钟后触发的一次性 `local_conversation` Automation，prompt 指向新交接文档。依此类推，直到两页组件全部完成。

## 1. 任务目标

把 Pixso 设计文件「All Win Harmony SuperRetail Platform _ 和与合超零售平台」中 **Widgets & Indicator 页（24 个组件）** 和 **Charts | 图表页（9 个组件）** 逐一 1:1 还原为 React 组件，落地到超零售项目 `apps/web` 的**版图（Atlas）板块**工作区。每个组件要求：动画、响应式（cqw/cqh 容器查询等比缩放）、放进 `WidgetArena` 通用容器（自带移动 + 八向缩放交互）。

## 2. 已完成工作（勿重做）

- **Pixso MCP 已连接**：本地服务 `http://127.0.0.1:3667/mcp`（需 Pixso 桌面端打开目标文件并保持）。已写入运行时配置 `config.toml` 的 `[mcp_servers.pixso]`。
- **5 个 Pixso 官方技能已装**：`pixso-design-to-code` / `pixso-read-dsl` / `pixso-design-editing` / `pixso-code-to-design` / `pixso-component-config`（技能目录，新会话自动加载）。
- **Spending trend / M widget（65:3732）已 1:1 还原并验证**。
- **通用容器 `WidgetArena` 已沉淀**：`apps/web/src/components/widget-arena/WidgetArena.tsx`（+ `index.ts` 桶导出）。能力：八向隐形热区改尺寸（仅该方向动、对边固定）、卡片内部拖动整体位置（限制画布内）、边缘直线渐变高亮、角落圆角弧线高亮（半径=卡片圆角，参数 `radius`）、方向双箭头指针、实时 W×H 数值、双击恢复默认并居中、`onGeometryChange` 几何回调。文件头注释写有扩展路线图。
- **SpendingTrendWidget 已 props 化**：`apps/web/src/modules/atlas/components/SpendingTrendWidget.tsx`，接口 `SpendingTrendData { title, value, valueSuffix, trend, points?, timeLabel, valueLabel }`；不传 `points` 用设计稿原始贝塞尔路径 1:1 还原，传入则 Catmull-Rom 平滑生成；涨幅负值自动变红 #FD4438。
- **版图页**：`apps/web/src/modules/atlas/AtlasPage.tsx`（路由 `/atlas`，见 `apps/web/src/App.tsx`）。
- **组件清单已盘点**：`tools/target_pages_components.json`（两页 33 个组件的 node_id / 名称 / 尺寸）。
- **Pixso MCP 调用工具脚本**：`tools/pixso_mcp.py`，用法 `python tools/pixso_mcp.py call <tool> '<json_args>'`、`python tools/pixso_mcp.py list`。

## 3. 当前断点

下一步：按 `tools/target_pages_components.json` 清单逐个实现剩余组件。建议顺序：先做 **Widgets & Indicator** 页其余 23 个（L/M/S/XS/XL 尺寸系），再做 **Charts | 图表** 页 9 个。每批 3–5 个，做完即验证（见 §4 验收方式）。

## 4. 关键约束与偏好

- **设计值必须来自 Pixso DSL 实测**，禁止目测估算。流程：`get_node_dsl {guid, clientFrameworks:"react", simplify:true}` 取结构 → `get_screenshot` 取视觉 → 样式引用（`style:xx:xx`）用 `get_local_styles` 按 `node_id` 匹配解析色值/字体 → 曲线矢量用 `get_export_image {guid, exportSettings:{constraint:{type:1,value:1}, imageType:3}}` 导出 SVG（返回临时 URL，**立即 curl 下载**，会过期）。
- **设计令牌**：优先用 `apps/web/src/design/tokens.css` 已有变量（`--sr-d-gray-*` / `--sr-l-gray-*` / accent）；DSL 里的 Dark Theme Gray 编号与令牌一一对应（如 Gray-11=#000、Gray-5=#70707C）。
- **技术约定**：React 19 + Tailwind 3 + 手绘 SVG（**不要用 recharts**，辉光/自定义路径保真度不够）；动画用 CSS keyframes + `clip-path` 揭示；文字/间距用 cqw/cqh 单位随容器等比缩放；字号用 `min(xcqw, ycqh)` 防扁宽比例重叠；深色主题优先，浅色模式跟随 `theme` outlet context。
- **组件落位**：图表组件放 `apps/web/src/modules/atlas/components/`，页面展示统一套 `<WidgetArena defaultWidth defaultHeight radius dark>`。
- **验收**：每批做完跑 `npx tsc -b --noEmit && npx eslint src/`（必须全过），用 InAppBrowser 开 `http://localhost:7100/atlas`（Kimi Work 管理 dev server 生命周期，不要自己留后台服务器）截图核对，必要时模拟 pointer 事件测拖拽。
- 沟通用中文；工作区根目录 `D:\LJB_Plan\GitHub_ProjectManager\SuperRetail`，文件不要写到工作区外。

## 5. 已排除方案（勿重蹈）

- **`pathLength` + `stroke-dashoffset` 描边动画**：Chromium 在 `preserveAspectRatio="none"` 非均匀缩放下会把曲线截断渲染（动画明明 finished 但线只画 60%）。改用 `clip-path: inset()` 从左至右揭示。
- **「对边固定」缩放的第一版 translate 位移补偿**：松手后组件逃出面板。现行方案：面板改为 480px 高相对定位画布，组件绝对定位 + clamp 限制在画布内。
- **recharts 图表库**：无法还原多层 drop-shadow 辉光与自定义贝塞尔路径，弃用。
- **`query_nodes` 按 `parentId` 过滤页面组件**：返回空（疑似只搜活动页）。改用 `get_all_components` + `containing_frame.pageId` 过滤（Widgets 页 65:3397 / Charts 页 63:361）。

## 6. 当前故障

无阻塞故障。注意：`query_nodes` 在本环境对页面级查询返回空；`get_top_level_frames {type:"frame", pageId}` 也返回空 frames。用 §5 的替代方案。

## 7. 启动动作（新会话第一件事）

1. 读 `tools/target_pages_components.json` 获取 33 个组件清单。
2. 读 `apps/web/src/components/widget-arena/WidgetArena.tsx` 和 `apps/web/src/modules/atlas/components/SpendingTrendWidget.tsx` 了解已有模式。
3. 确认 Pixso MCP 服务存活：`python tools/pixso_mcp.py list`（若失败，提醒用户打开 Pixso 客户端并启用 MCP）。
4. 从 Widgets & Indicator 页 `65:3554 Income widget / L widget` 开始，按 §4 流程逐批实现。

## 附：组件清单摘要

- **Widgets & Indicator（24）**：Income/Expense/Cashback/Transfers L 系（188×254）、Progress L（296×184）、Crypto L（216×310）、Portfolio/Spend this week/Total cashback/Spending trend M 系（182–184×220，Spending trend 已完成）、Income/Expense/Total M（197×214）、Progress/Expense/Category/Income/Cashback/Credit limit S 系（106–166×137–157）、Income 2/Income/Last transfet XS 系（216–238×68–74）、Overall balance XL（1162×308）、Spending trend XL（582×582）。完整 node_id 见 `tools/target_pages_components.json`。
- **Charts | 图表（9）**：Mini indicator 63:450、Indicator 63:460、Pie chart 63:469、Progress chart 63:478、Bubble chart 63:485、Line chart v2 63:543、Candle chart 63:658、Line chart v1 63:1067、Hex graph 63:1187。
