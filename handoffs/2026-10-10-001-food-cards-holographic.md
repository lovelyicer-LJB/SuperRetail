# Handoff · 食品原材料数字卡（镭射材质）与地理标志徽标
- 生成时间：2026-10-10 00:20
- 源会话：SuperRetail 工坊卡片开发会话（上下文占用约 80%，触发原因：用户主动 hand off）

## 1. 任务目标
为超零售平台工坊模块交付「食品原材料数字卡」：同一 `FoodCardData` 驱动的平面版 + 镭射三维版卡片（当前演示：西湖龙井 / 金华火腿 / 安集海辣皮子），附官方地理标志徽标资源；模块已封装并写入架构文档。验收：两套 Playwright 截图脚本全绿。

## 2. 已完成工作
- 官方标志下载 → `D:\LJB_Plan\GitHub_ProjectManager\SuperRetail\地理标志官方标志\`：GI 红色专用标志（国知局 332 号公告 PDF 提取 + 圆形透明底 PNG）、AGI 绿色农产品地理标志（农业农村部官网附件 1038×1044 PNG）、公告 PDF 原件
- 三张 AI 产品主图生成并去「AI生成」水印（模板已用三图重建）→ `apps\web\public\assets\food-cards\*-clean.png`，徽标拷贝为 `badge-gi.png` / `badge-agi.png`
- 卡片模块 `apps\web\src\modules\workshop\food-card\`（index.ts 统一出口）：`data.ts`（契约+demoFoodCards+rarityLabel）、`FoodCard.tsx`（平面版）、`FoodCardModel.tsx`（镭射三维版）、`FoodCardsPage.tsx`（/workshop/food-cards，双模式切换）、`food-card.css`
- 工坊页入口卡片 → `apps\web\src\pages\ModulePage.tsx`（两张入口并排，文字颜色已修）
- 架构文档新增「09.1 · 前端实例：原材料数字卡模块」→ `docs\architecture-v0.1.md`
- 验收脚本：`apps\web\tools\verify-food-cards.mjs`（平面版，先切「平面版」标签）、`verify-food-cards-3d.mjs`（三维渲染/拖动/切换）；均通过；截图在 `output\food-cards\`

## 3. 当前断点
无中断。最后一次操作：重构后两套验收脚本全绿，用户浏览器（右侧 tab，Kimi Work 托管预览端口 7101）已刷新到 /workshop/food-cards 正常显示。

## 4. 关键约束与偏好
- 镭射三维版样式不要再动；用户明确否决了「三维版与平面版排版对齐」（原计划按实测坐标对齐，已取消）
- 三维版与平面版**字段口径一致**（同一 data.ts 驱动）；两个版本只做材质/颜色差异
- 徽标必须用官方原图，不得二次创作
- 项目惯例：改动文件顶部加 `// 🔴 改动 YYYY-MM-DD · 说明` 注释
- 开发服务器：不允许常驻后台；验收用「起 dev → 跑脚本 → 杀进程」一次性命令；vite 绑定 localhost（IPv6），脚本里用 `localhost:3000` 而非 127.0.0.1；预览给用户用 `http://localhost:7100/` 链接格式 + 项目根绝对路径
- Bash 中 Windows 路径拼接变量时用正斜杠（反斜杠会吃掉 `$`）

## 5. 已排除方案
- 三维/平面排版像素级对齐：用户明确取消（measure-food-card-layout.mjs 已留档可测量）
- 国知局官方矢量图下载平台 dlbzgl.hizhuanli.cn：域名已失效，矢量图需核准口令，公开最高清为 332 号公告 PDF 内图
- CSS 仿镭射边框版（第一版平面卡的全息边框）：保留为平面版样式，不再作为三维替代品
- ogic.cnipr.com.cn 直连 PDF：DNS 失效；实际可用来源为平阴县政府转载 PDF

## 6. 当前故障
无。

## 7. 启动动作（新会话第一步）
1. 阅读 `D:\LJB_Plan\GitHub_ProjectManager\SuperRetail\docs\architecture-v0.1.md` 第 09.1 节与 `apps\web\src\modules\workshop\food-card\data.ts`
2. 执行 `cd apps/web && npm run build` 验证当前状态可编译
3. 候选下一步（用户已提出但未做）：①卡背翻转（溯源二维码/批次/证书编号/发行价/流转记录）；②稀有度驱动材质分级（SSR 金相扫光）；③高德地图底座页 /atlas/gi-map（5000+ GI 产品点位，需用户申请高德 Key + securityJsCode，个人认证 JS 地图初始化 150 万次/月免费）

## 参考材料（引用，勿复制全文）
- `D:\LJB_Plan\GitHub_ProjectManager\SuperRetail\docs\architecture-v0.1.md`：架构说明，09.1 节为卡片模块
- `D:\LJB_Plan\GitHub_ProjectManager\SuperRetail\地理标志官方标志\`：GI/AGI 官方标志与公告原件
- `apps\web\src\modules\workshop\cardModel.ts` / `holographicMaterial.ts` / `materialSettings.ts`：共享全息材质引擎（NFT CARD 05 与食品卡共用，勿改写）
- `apps\web\tools\measure-food-card-layout.mjs`：平面版排版坐标测量（备将来对齐用）
