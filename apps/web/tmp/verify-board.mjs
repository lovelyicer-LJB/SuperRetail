// 画板验收脚本（临时文件，验证后删除）：Edge 无头 + Playwright 驱动 /atlas 画板全交互
import { chromium } from 'playwright-core'

const BASE = 'http://localhost:7102/atlas'
const SHOTS = 'D:/LJB_Plan/GitHub_ProjectManager/SuperRetail/tmp_shots'

let failures = 0
function check(name, ok, detail = '') {
  if (!ok) failures += 1
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`)
}

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
page.on('pageerror', (err) => console.log('PAGE_ERROR:', err.message))
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('CONSOLE_ERROR:', msg.text())
})

// ---------- 0. 打开页面 ----------
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForSelector('.sr-board-grid', { timeout: 10000 })
await page.waitForTimeout(1500)

const worldTransform = () => page.evaluate(() => document.querySelector('.sr-board-world').style.transform)
const gridSize = () => page.evaluate(() => document.querySelector('.sr-board-grid').style.backgroundSize)

// ---------- 1. 画板网格作为最底层可见（地球在其上） ----------
const layers = await page.evaluate(() => {
  const board = document.querySelector('.sr-board')
  const globe = document.querySelector('.atlas-globe')
  const boardRect = board?.getBoundingClientRect()
  return {
    boardExists: !!board,
    globeExists: !!globe,
    boardCoversMain: !!boardRect && boardRect.width > 1000 && boardRect.height > 500,
    boardDark: board?.classList.contains('sr-board-dark') ?? null,
  }
})
check('画板网格已挂载并铺满主区', layers.boardExists && layers.boardCoversMain, `dark=${layers.boardDark}`)
check('地球组件仍在', layers.globeExists)
await page.screenshot({ path: `${SHOTS}/board-canvas-01-initial.png` })

// ---------- 2. 空白处滚轮缩放（以光标为锚） ----------
const t0 = await worldTransform()
const g0 = await gridSize()
await page.mouse.move(1350, 750)
await page.mouse.wheel(0, -240) // 上滚放大
await page.waitForTimeout(400)
const t1 = await worldTransform()
const g1 = await gridSize()
check('滚轮缩放：世界 transform 变化', t0 !== t1, `${t1}`)
check('滚轮缩放：点阵网格随缩放联动', g0 !== g1, `${g0} → ${g1}`)
await page.mouse.wheel(0, 480) // 下滚缩小
await page.waitForTimeout(400)
const t1b = await worldTransform()
check('滚轮可继续缩小', t1b !== t1, `${t1b}`)
await page.screenshot({ path: `${SHOTS}/board-canvas-02-zoom.png` })

// ---------- 3. 拖拽空白平移 ----------
await page.mouse.move(1350, 750)
await page.mouse.down()
await page.mouse.move(1150, 580, { steps: 10 })
await page.mouse.up()
await page.waitForTimeout(400)
const t2 = await worldTransform()
check('拖拽空白平移', t2 !== t1b, `${t2}`)
await page.screenshot({ path: `${SHOTS}/board-canvas-03-pan.png` })

// ---------- 4. 双击空白建 Note 卡 + 立即编辑 + 失焦保存 ----------
await page.mouse.dblclick(1300, 640)
await page.waitForTimeout(500)
const noteCount = await page.locator('.sr-board-card.sr-card-note').count()
check('双击空白出现 Note 卡', noteCount === 1, `note=${noteCount}`)
const editingNow = await page.evaluate(() => document.querySelector('.sr-card-note')?.classList.contains('sr-editing'))
check('新建卡立即进入编辑态', editingNow === true)
await page.keyboard.type('超零售版图笔记')
await page.waitForTimeout(200)
await page.mouse.click(1400, 800) // 点击空白 → 失焦保存
await page.waitForTimeout(300)
const noteText = await page.evaluate(() => document.querySelector('.sr-note-ta')?.value ?? null)
check('Note 文本失焦保存', noteText === '超零售版图笔记', `text=${noteText}`)
await page.screenshot({ path: `${SHOTS}/board-canvas-04-note.png` })

// ---------- 5. 双击卡片再次进入编辑 ----------
await page.locator('.sr-card-note').first().dblclick()
await page.waitForTimeout(300)
const editing2 = await page.evaluate(() => document.querySelector('.sr-card-note')?.classList.contains('sr-editing'))
check('双击卡片重新进入编辑', editing2 === true)
await page.keyboard.press('Escape')
await page.waitForTimeout(200)

// ---------- 6. 拖拽卡片移动 ----------
const box1 = await page.locator('.sr-card-note').first().boundingBox()
await page.mouse.move(box1.x + box1.width / 2, box1.y + 12)
await page.mouse.down()
await page.mouse.move(box1.x + 180, box1.y + 110, { steps: 8 })
await page.mouse.up()
await page.waitForTimeout(400)
const box2 = await page.locator('.sr-card-note').first().boundingBox()
check('拖拽卡片移动', Math.abs(box2.x - box1.x) > 50, `x ${Math.round(box1.x)} → ${Math.round(box2.x)}`)
await page.screenshot({ path: `${SHOTS}/board-canvas-05-card-drag.png` })

// ---------- 7. 添加菜单：点击创建 To-do 卡 + 勾选交互 ----------
await page.locator('.sr-additem', { hasText: '待办' }).click()
await page.waitForTimeout(500)
const todoCount = await page.locator('.sr-card-todo').count()
check('添加菜单创建 To-do 卡（画布中心）', todoCount === 1)
// 双击 todo 卡进入编辑 → 输入标题 → Enter 跳到首项 → 输入条目
await page.locator('.sr-card-todo').first().dblclick()
await page.waitForTimeout(300)
await page.keyboard.type('上线清单')
await page.keyboard.press('Enter')
await page.waitForTimeout(200)
await page.keyboard.type('接入画板')
await page.keyboard.press('Enter')
await page.keyboard.type('验收交付')
await page.waitForTimeout(200)
await page.mouse.click(1400, 820) // 失焦
await page.waitForTimeout(300)
const todoInfo = await page.evaluate(() => {
  const card = document.querySelector('.sr-card-todo')
  return {
    title: card?.querySelector('.sr-todo-title')?.value ?? null,
    rows: card?.querySelectorAll('.sr-todo-row').length ?? 0,
    count: card?.querySelector('.sr-todo-count')?.textContent ?? null,
  }
})
check('To-do 标题与条目编辑', todoInfo.title === '上线清单' && todoInfo.rows === 2, JSON.stringify(todoInfo))
// 视图态直接点复选框（sr-view-action 豁免）
await page.locator('.sr-card-todo .sr-todo-check').first().click()
await page.waitForTimeout(300)
const checkedInfo = await page.evaluate(() => ({
  checked: document.querySelector('.sr-card-todo .sr-todo-check')?.getAttribute('aria-checked'),
  count: document.querySelector('.sr-card-todo .sr-todo-count')?.textContent,
}))
check('To-do 复选框勾选（视图态直达）', checkedInfo.checked === 'true' && checkedInfo.count === '1/2', JSON.stringify(checkedInfo))
await page.screenshot({ path: `${SHOTS}/board-canvas-06-todo.png` })

// ---------- 8. 连线：两张卡之间建立连线（带箭头） ----------
await page.locator('.sr-additem', { hasText: '连线' }).click()
await page.waitForTimeout(200)
const connecting = await page.evaluate(() => document.querySelector('.sr-board')?.classList.contains('sr-connecting'))
check('连线模式开启', connecting === true)
const noteBox = await page.locator('.sr-card-note').first().boundingBox()
const todoBox = await page.locator('.sr-card-todo').first().boundingBox()
await page.mouse.click(noteBox.x + noteBox.width / 2, noteBox.y + noteBox.height / 2)
await page.waitForTimeout(200)
await page.mouse.click(todoBox.x + todoBox.width / 2, todoBox.y + todoBox.height / 2)
await page.waitForTimeout(400)
const lineCount = await page.locator('.sr-board-line').count()
check('两卡连线建立（含箭头 marker）', lineCount === 1, `lines=${lineCount}`)
await page.screenshot({ path: `${SHOTS}/board-canvas-07-line.png` })

// ---------- 9. 点选 + Del 删除（删 note 卡，连线级联删除） ----------
await page.locator('.sr-card-note').first().click()
await page.waitForTimeout(200)
const selectedNow = await page.evaluate(() => document.querySelector('.sr-card-note')?.classList.contains('sr-selected'))
check('点击选中卡片', selectedNow === true)
await page.keyboard.press('Delete')
await page.waitForTimeout(400)
const afterDel = await page.evaluate(() => ({
  notes: document.querySelectorAll('.sr-card-note').length,
  lines: document.querySelectorAll('.sr-board-line').length,
}))
check('Del 删除选中卡且级联删连线', afterDel.notes === 0 && afterDel.lines === 0, JSON.stringify(afterDel))
await page.screenshot({ path: `${SHOTS}/board-canvas-08-delete.png` })

// ---------- 10. 子画板：创建 board 卡 → 双击进入 → 建卡 → 返回上级 ----------
await page.locator('.sr-additem', { hasText: '画板' }).click()
await page.waitForTimeout(500)
const boardCardCount = await page.locator('.sr-card-board').count()
check('添加菜单创建 Board 卡', boardCardCount === 1)
await page.locator('.sr-card-board .sr-boardcard-badge').first().dblclick()
await page.waitForTimeout(600)
const subOpen = await page.locator('.sr-subboard-overlay').count()
check('双击徽章进入子画板（全屏覆盖层）', subOpen === 1)
await page.screenshot({ path: `${SHOTS}/board-canvas-09-subboard.png` })
// 子画板内双击空白建一张 note
await page.mouse.dblclick(800, 450)
await page.waitForTimeout(400)
await page.keyboard.type('子画板里的笔记')
await page.waitForTimeout(200)
await page.keyboard.press('Escape')
await page.waitForTimeout(200)
const subNotes = await page.locator('.sr-subboard-overlay .sr-card-note').count()
check('子画板内可建卡', subNotes === 1, `subNotes=${subNotes}`)
// 返回上级
await page.locator('.sr-board-back').click()
await page.waitForTimeout(600)
const subClosed = await page.locator('.sr-subboard-overlay').count()
const parentCount = await page.evaluate(() => document.querySelector('.sr-card-board .sr-boardcard-count')?.textContent ?? null)
check('返回上级关闭子画板', subClosed === 0)
check('父卡计数刷新', parentCount === '1 张卡片', `count=${parentCount}`)
await page.screenshot({ path: `${SHOTS}/board-canvas-10-back.png` })

// ---------- 11. 地球仍可交互（热区滚轮不影响画板；拖拽改变画面） ----------
const ready = await page.locator('.atlas-earth[data-ready="true"]').count()
if (ready) {
  const beforeWheel = await worldTransform()
  const g = await page.locator('.atlas-earth-zoom').boundingBox()
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
  await page.mouse.wheel(0, -200)
  await page.waitForTimeout(500)
  const afterWheel = await worldTransform()
  check('地球热区滚轮缩放且画板不受影响', beforeWheel === afterWheel)
  const shotA = await page.screenshot({ clip: { x: g.x, y: g.y, width: g.width, height: g.height } })
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
  await page.mouse.down()
  await page.mouse.move(g.x + g.width / 2 + 150, g.y + g.height / 2 + 20, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(800)
  const shotB = await page.screenshot({ clip: { x: g.x, y: g.y, width: g.width, height: g.height } })
  check('地球仍可拖拽旋转', !shotA.equals(shotB))
} else {
  check('地球渲染就绪（WebGL）', false, 'atlas-earth 未进入 ready，可能无 GPU 回退')
}
await page.screenshot({ path: `${SHOTS}/board-canvas-11-globe.png` })

// ---------- 12. localStorage 持久化内容 ----------
await page.waitForTimeout(1200) // 等 800ms 防抖落盘
const stored = await page.evaluate(() => window.localStorage.getItem('superretail.atlas.board.v1'))
let doc = null
try { doc = JSON.parse(stored) } catch { /* 解析失败即不合格 */ }
check('localStorage 已保存画板文档', !!doc && Array.isArray(doc.cards) && !!doc.viewport,
  doc ? `cards=${doc.cards.length} types=${doc.cards.map((c) => c.type).join(',')} zoom=${doc.viewport.zoom.toFixed(2)}` : 'null')
const todoCard = doc?.cards.find((c) => c.type === 'todo')
check('To-do 卡数据持久化（标题/条目/勾选）',
  todoCard?.meta?.title === '上线清单' && todoCard?.meta?.items?.length === 2 && todoCard?.meta?.items?.[0]?.done === true,
  todoCard ? JSON.stringify(todoCard.meta) : 'no todo')
const subDoc = doc?.cards.find((c) => c.type === 'board')?.meta?.sub
check('子画板数据嵌套持久化', subDoc?.cards?.length === 1 && subDoc?.cards?.[0]?.text === '子画板里的笔记',
  subDoc ? `subCards=${subDoc.cards.length}` : 'no sub')

// ---------- 13. 刷新后恢复（卡片 + 视角） ----------
const vpBefore = await worldTransform()
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.sr-board-grid')
await page.waitForTimeout(1200)
const restored = await page.evaluate(() => ({
  todos: document.querySelectorAll('.sr-card-todo').length,
  boards: document.querySelectorAll('.sr-card-board').length,
  checked: document.querySelector('.sr-card-todo .sr-todo-check')?.getAttribute('aria-checked'),
  title: document.querySelector('.sr-card-todo .sr-todo-title')?.value,
}))
const vpAfter = await worldTransform()
check('刷新后卡片从 localStorage 恢复', restored.todos === 1 && restored.boards === 1 && restored.checked === 'true' && restored.title === '上线清单', JSON.stringify(restored))
check('刷新后视角恢复', vpBefore === vpAfter, vpAfter)
await page.screenshot({ path: `${SHOTS}/board-canvas-12-restored.png` })

// ---------- 14. 预览弹层（深链）在画板之上正常 ----------
await page.goto(`${BASE}?preview=65%3A3554`, { waitUntil: 'networkidle' })
await page.waitForSelector('[role="dialog"]', { timeout: 8000 })
await page.waitForTimeout(600)
check('?preview 深链打开大图预览弹层', true)
await page.screenshot({ path: `${SHOTS}/board-canvas-13-preview.png` })
await page.keyboard.press('Escape')
await page.waitForTimeout(400)
const dialogGone = await page.locator('[role="dialog"]').count()
check('Esc 关闭预览弹层', dialogGone === 0)

// ---------- 汇总 ----------
console.log(`\n===== 验收结果：${failures === 0 ? '全部通过' : failures + ' 项失败'} =====`)
await browser.close()
process.exit(failures === 0 ? 0 : 1)
