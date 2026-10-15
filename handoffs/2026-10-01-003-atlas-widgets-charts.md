# Handoff 2026-10-01-003 · 版图板块 Pixso 组件还原（Charts 页收尾）

> 交接链：001（总约束，§4/§5 仍有效）→ 002（Widgets 页完成）→ 本文档。上下文到约 85% 时：新建下一序号交接文档 + 创建 3–5 分钟后触发的一次性 `local_conversation` Automation，prompt 指向新文档。
> 本断点写入时间：2026-10-01 13:26 (+0800)。

## 进度

- **Widgets & Indicator 页 24/24 全部完成**（勿重做）。
- **Charts | 图表页 4/9 完成**：`MiniIndicatorC.tsx`（63:450）、`IndicatorC.tsx`（63:460）、`PieChartC.tsx`（63:469）、`ProgressChartC.tsx`（63:478），已挂 `AtlasPage.tsx` CHARTS 数组并截图核对通过。
- **剩余 5 个**：Bubble 63:485、Hex graph 63:1187、Line v2 63:543、Candle 63:658、Line v1 63:1067。

## 当前断点：批次 9a —— Bubble chart（63:485，740×711.28 透明底）

DSL 已读到一半，**续读命令**：`python tools/dsl_tree.py 63:485 | sed -n '90,200p'`（在 `63:504 'Bubble'` FRAME 处被截断，该 FRAME 是主气泡群，必须读完）。另外需 `get_screenshot 63:485` 看整体效果。

已读到的结构（坐标相对组件原点，单位 px）：
- Bg glow 椭圆 1142×596 @ (-201,57.4)：径向渐变 rgba(97,30,215,0.3)→透明。
- 装饰圆环：532.36² @ (109.34,89.46) 描边 rgb(37.2,36.9,36.9) w1.104；711.28² @ (19.88,0) 线性渐变描边。
- 3 个 19.88² 小圆 @ (513.58,125.91) / (336.87,609.67) / (151.31,191.07)：填 63:379(#000)，同款 1.104 描边；另有 1 个 19.88² @ (720.12,373.31) 填 #070210 描边 #141426。
- 气泡群（「Simple bubble」，椭圆形，双层填充=底色 + 径向渐变高光，INNER_SHADOW + DROP_SHADOW）：
  | guid | 尺寸 | 位置 | 色系 |
  |---|---|---|---|
  | 63:493 | 25.09×24.51 | (269.56,242.60) | 紫 |
  | 63:494 | 72.50² | (79.64,337.56) | 灰 opacity .6 |
  | 63:495 | 72.50² | (659,368) | 灰 opacity .6 |
  | 63:496 | 12.25² | (421.70,224.23) | 灰 |
  | 63:497 | 72.50² | (377.79,548.92) | 灰 opacity .6 |
  | 63:498 | 64.33×62.83 | (333.89,466.22) | 紫 |
  | 63:499 | 72.50² | (467.64,221.16) | 红内影 rgba(255,5,5,1)+粉投影 rgba(247.6,0,118.8,.48) |
  | 63:500 | 72.50² | (628.97,211.97) | 紫 |
  | 63:501 | 52.07² | (58.20,236.48) | 红内影 |
  | 63:502 | 72.50² | (0,383.51) | 紫 |
  | 63:503 | 72.50² | (641.22,466.22) | 紫 |
- 紫色系参数：底色 rgb(2.9,0,145.6)，径向渐变 rgb(50,68,232)→透明，INNER_SHADOW rgba(130,5,255,.95)，DROP_SHADOW rgba(34.7,0,247.6,1)。灰色系：底 rgb(65.7,65.7,65.7)+灰内影，部分 opacity 0.6。
- **实现思路（已定）**：每气泡 = 绝对定位椭圆 div，`border-radius:50%`，底色 + `radial-gradient` 高光 + `box-shadow`（inset 模拟 INNER_SHADOW，普通投影模拟 DROP_SHADOW），灰泡 opacity 0.6；动画 scale pop 错峰 + reduced-motion 兜底。整体容器 740×711.28 用 cqw/cqh 等比缩放（百分比定位即可）。

## 批次 9a 后半 + 9b

- Hex graph 63:1187（1063×134）：`python tools/dsl_tree.py 63:1187` + 截图后写 `HexGraphC.tsx`。
- 批次 9b 三个大图：Line v2 63:543（1536×457）、Candle 63:658（1460×438.5）、Line v1 63:1067（1063×546）。
- 全部建议 `span2` + 大 `maxW`：Bubble maxW 780；Line v2 maxW ~1600；其余按宽度给。
- 大曲线一律手绘 SVG + `clip-path: inset()` 左→右揭示（禁用 pathLength 描边动画，见 001 §5）。曲线矢量可 `get_export_image {guid, exportSettings:{constraint:{type:1,value:1}, imageType:3}}` 拿临时 URL **立即 curl 下载**。

## 工具与资产（本会话链新增，直接用）

- `tools/style_color.py <node_id>` 解析填充样式色值；`tools/style_font.py <node_id>` 解析字体；`tools/instance_props.py <guid...>` 读实例覆盖参数；`tools/xl_extract.py` 提取柱数据（可仿写）。
- **arc 弧度在 simplify:true 的 get_node_dsl JSON 里有 `arc:{start,end,innerRadius}`**（dsl_tree.py 不显示；弧度 0=正东、顺时针、y 向下）。
- `chart-utils.ts`：`arcPath(cx,cy,r,start,end)` / `sectorPath(...)` / `arcLen(...)`；正方形 viewBox 均匀缩放无 Chromium 截断 bug。
- `lw-icons.ts` 现有 29 个图标（含 download_black / moneyhand / moneyexchange / frame_cat / apple / coffee / car_mini）。
- 实例覆盖判色原则：**props 里 fillPaints 可能是残留旧值，以截图像素采样为准**。
- 无头截图必须**绝对路径**输出：`"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless --disable-gpu --hide-scrollbars --force-prefers-reduced-motion --window-size=1400,<高> --timeout=8000 --screenshot="D:\LJB_Plan\GitHub_ProjectManager\SuperRetail\tmp_shots\<名>.png" "http://localhost:7100/atlas"`。DPR 1.5；numpy 扫描内容带定位时裁掉 x>1950（右缘白色竖条干扰）。
- `AtlasPage.tsx` WidgetEntry 支持 `span2?` / `maxW?`（默认 720）/ `radius?`（默认 12）；两个 section：「Widgets & Indicator」（N/24）和「Charts | 图表」（N/9）。

## 验收（每批必做）

1. `cd apps/web && npx tsc -b --noEmit && npx eslint src/modules/atlas/ src/components/widget-arena/`（必须全过；`src/components/ui/` 存量 8 个错误为项目原有，勿动）。
2. 无头 Edge 截图核对布局/颜色/文字。
3. Pixso 桌面端保持打开目标文件。

## 下一步顺序

1. 续读 Bubble DSL（上面命令）+ `get_screenshot 63:485` → 写 `BubbleChartC.tsx`。
2. `dsl_tree 63:1187` + 截图 → 写 `HexGraphC.tsx` → 两图挂 CHARTS → tsc+eslint+截图验证。
3. 批次 9b 三个大图同流程。
4. 确认计数 9/9，任务收官。
