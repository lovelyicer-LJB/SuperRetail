// ============================================================================
// Evoloop 客户端子模块：todo（Milanote 风格待办卡片）
//
// 加载方式同 sync.js（方案A · 注册表模式，详见该文件头注释）。
// deps：el / t / overlayId / scheduleSave / burstAtInto / cardMin /
//       updateScrollbars / columnFor / measureOneLine / getModule（取兄弟模块）
// 卡片数据：card.meta = { title, items: [{text, done, depth?, mission?}] }，随 board.json 落盘。
// ============================================================================
;(function () {
  var registry = window.__EVOLOOP__ = window.__EVOLOOP__ || {}
  if (registry['todo']) return

  // ---- 样式（自注入 + 自愈）----
  // 与 client.js 主常量保持一致（注册期注入样式时 deps 尚不存在，故硬编码）
  var OVERLAY_ID = 'dsh-evoloop-overlay'
  var CSS_ID = 'dsh-evoloop-todo-css'
  var CSS = [
      // 🔴 改动 2026-09-17 · 待办标题下方和最后一项下方各留一行文字高度
      '#' + OVERLAY_ID + ' .mn-todo{display:flex;flex-direction:column;height:100%;overflow-y:auto;padding:6px 0 var(--mn-todo-line,21px);box-sizing:border-box;position:relative;',
        // Compact vertical rhythm: 4px base + 4px extra between adjacent tasks keeps
        // them visually separate without making the list feel double-spaced.
        '--mn-todo-line:21px;--mn-todo-gap:8px}',
      // The head is a flex row: the headline is a flex ITEM (not absolute) and the
      // counter is flex:none, so `gap` is the guaranteed horizontal distance between
      // them — it can never collapse to zero however long the headline gets.
      '#' + OVERLAY_ID + ' .mn-todo-head{display:flex;align-items:center;gap:12px;padding:4px 14px 0;margin-bottom:var(--mn-todo-line,21px);flex:none;position:relative;min-height:26px}',
      // Headline: 1.3x the 14px task text (18px), bold, pure white, centred in the
      // space left of the counter. The head reserves its height via min-height above.
      // 🔴 改动 2026-09-26 · headline 改 textarea：文字宽超 200px 后 pre-wrap + break-word 自动折行
      '#' + OVERLAY_ID + ' .mn-todo-title{flex:1 1 auto;min-width:0;border:0;background:transparent;outline:none;color:#fff;font:700 18px/1.2 system-ui;padding:2px 0;letter-spacing:.02em;text-align:center;resize:none;overflow:hidden;display:block;white-space:pre-wrap;word-break:break-word}',
      '#' + OVERLAY_ID + ' .mn-todo-title:focus{color:#fff}',
      '#' + OVERLAY_ID + ' .mn-todo-count{flex:none;position:relative;font:11px/1.6 system-ui;color:var(--mn-muted);font-variant-numeric:tabular-nums;white-space:nowrap}',
      '#' + OVERLAY_ID + ' .mn-todo-list{flex:none;display:flex;flex-direction:column;gap:var(--mn-todo-gap,8px)}',
      '#' + OVERLAY_ID + ' .mn-todo-row{display:flex;align-items:flex-start;gap:4px;padding:0 10px 0 6px;min-height:21px;position:relative;border-radius:4px}',
      // 🔴 改动 2026-09-22 · 子项按层级缩进，每级 2 个字符（无限层级，--mn-depth 由 render 写入）
      '#' + OVERLAY_ID + ' .mn-todo-row{margin-left:calc(var(--mn-depth,0)*2em)}',
      '#' + OVERLAY_ID + ' .mn-todo-grip{width:14px;flex:none;text-align:center;color:var(--mn-muted);font-size:11px;line-height:1;cursor:grab;opacity:0;transition:opacity .12s ease;user-select:none;margin-top:5px}',
      '#' + OVERLAY_ID + ' .mn-todo-row:hover .mn-todo-grip{opacity:.8}',
      '#' + OVERLAY_ID + ' .mn-todo-grip:active{cursor:grabbing}',
      // 🔴 改动 2026-09-29 · 视图态整行（含文字区）都是换位拖拽识别区，grab 光标提示
      '#' + OVERLAY_ID + ' .mn-card:not(.mn-editing) .mn-todo-row{cursor:grab}',
      '#' + OVERLAY_ID + ' .mn-card:not(.mn-editing) .mn-todo-text{cursor:grab}',
      '#' + OVERLAY_ID + ' .mn-todo-row.mn-drag-src{opacity:.4}',
      '#' + OVERLAY_ID + ' .mn-todo-row.mn-todo-shifting{transition:transform var(--mn-reorder-ms) var(--mn-reorder-ease)}',
      // todo 勾选框：圆框，勾选 = 整个圆框缩小填充为实心圆点（蓝点主题 0AB9E6）
      // 🔴 改动 2026-09-30 · 桌面端全局 button 样式（min-height/padding 等）会把圆撑成椭圆：
      // 宽高锁死 + aspect-ratio:1 + appearance:none 兜底
      '#' + OVERLAY_ID + ' .mn-todo-check{width:17px;height:17px;min-width:17px;min-height:17px;max-width:17px;max-height:17px;aspect-ratio:1/1;box-sizing:border-box;appearance:none;-webkit-appearance:none;flex:none;margin-top:2px;border:1.5px solid var(--mn-muted);border-radius:50%;background:transparent;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;transition:border-color .18s ease,background .25s ease,transform .12s ease}',
      // 🔴 改动 2026-09-22 · 子项（depth>0）勾选圆直径缩小 1/3（17px → 11.33px），margin-top 2→5 垂直居中
      '#' + OVERLAY_ID + ' .mn-todo-row.mn-todo-sub .mn-todo-check{width:11.33px;height:11.33px;min-width:11.33px;min-height:11.33px;max-width:11.33px;max-height:11.33px;margin-top:5px}',
      '#' + OVERLAY_ID + ' .mn-todo-check:hover{border-color:#0AB9E6;transform:scale(1.12)}',
      '#' + OVERLAY_ID + ' .mn-todo-check:active{transform:scale(.86)}',
      // 实心圆终态直径缩小一半（scale .5），带过冲回弹动画
      '@keyframes mnCheckFill{0%{transform:scale(1)}38%{transform:scale(.66)}62%{transform:scale(.4)}82%{transform:scale(.55)}100%{transform:scale(.5)}}',
      '#' + OVERLAY_ID + ' .mn-todo-check[aria-checked="true"]{background:#0AB9E6;border-color:#0AB9E6;box-shadow:0 0 6px rgba(10,185,230,.7);transform:scale(.5);animation:mnCheckFill .5s cubic-bezier(.34,1.3,.44,1)}',
      '#' + OVERLAY_ID + ' .mn-todo-dot{width:50%;height:50%;border-radius:50%;background:radial-gradient(circle at 32% 28%,#5FE0FF 0%,#0AB9E6 55%,#0096C9 100%);box-shadow:0 0 5px rgba(10,185,230,.8);transform:scale(0);transition:transform .3s cubic-bezier(.34,1.9,.44,1);pointer-events:none}',
      // 🔴 改动 2026-09-24 · URL 下划线：textarea 无法局部样式，改用镜像层方案 ——
      // textarea 文字透明（保留光标/选区），下方镜像 div 同步文字并把 URL 加下划线
      '#' + OVERLAY_ID + ' .mn-todo-field{flex:1;min-width:0;position:relative;box-sizing:border-box}',
      '#' + OVERLAY_ID + ' .mn-todo-text,#' + OVERLAY_ID + ' .mn-todo-mirror{border:none;outline:none;background:transparent;font:14px/1.5 system-ui;padding:0 6px;margin:0;word-break:break-word;white-space:pre-wrap;box-sizing:border-box}',
      '#' + OVERLAY_ID + ' .mn-todo-text{position:relative;width:100%;color:transparent;caret-color:var(--mn-text);resize:none;overflow:hidden;display:block}',
      '#' + OVERLAY_ID + ' .mn-todo-text::placeholder{color:var(--mn-muted)}',
      '#' + OVERLAY_ID + ' .mn-todo-text::selection{background:rgba(10,185,230,.35)}',
      '#' + OVERLAY_ID + ' .mn-todo-mirror{position:absolute;inset:0;overflow:hidden;pointer-events:none;color:var(--mn-text)}',
      '#' + OVERLAY_ID + ' .mn-todo-mirror .mn-todo-url{text-decoration:underline}',
      // 🔴 改动 2026-09-24 · 视图态（非编辑）下镜像层浮到 textarea 之上，
      // URL span 可接收指针：Ctrl+点击直接打开链接，Ctrl 悬停变 pointer。
      // 非 URL 区域 pointer-events:none 穿透到卡片（选中/拖动不受影响）
      '#' + OVERLAY_ID + ' .mn-card:not(.mn-editing) .mn-todo-mirror{z-index:2}',
      '#' + OVERLAY_ID + ' .mn-card:not(.mn-editing) .mn-todo-mirror .mn-todo-url{pointer-events:auto}',
      'body.mn-ctrl-held #' + OVERLAY_ID + ' .mn-card:not(.mn-editing) .mn-todo-mirror .mn-todo-url{cursor:pointer}',
      '#' + OVERLAY_ID + ' .mn-todo-row.mn-done .mn-todo-mirror{color:var(--mn-muted);text-decoration:underline}',
      '#' + OVERLAY_ID + ' .mn-todo-del{width:20px;height:20px;flex:none;margin-top:0;border:0;border-radius:4px;background:transparent;color:var(--mn-muted);font-size:13px;line-height:1;padding:0;opacity:0;transition:opacity .12s ease}',
      '#' + OVERLAY_ID + ' .mn-todo-row:hover .mn-todo-del{opacity:1}',
      '#' + OVERLAY_ID + ' .mn-todo-del:hover{background:var(--mn-hover);color:var(--mn-danger)}',
      // 🔴 改动 2026-09-24 · 视图态下可操作的控件保持 pointer 光标（覆盖卡片级 cursor:default）
      '#' + OVERLAY_ID + ' .mn-card:not(.mn-editing) .mn-view-action{cursor:pointer}',
      '#' + OVERLAY_ID + ' .mn-card:not(.mn-editing) .mn-todo-grip.mn-view-action{cursor:grab}',
  ].join('')

  function injectStyles() {
      var tag = document.getElementById(CSS_ID)
      if (tag) {
        if (tag.textContent !== CSS) tag.textContent = CSS
        return
      }
      tag = document.createElement('style')
      tag.id = CSS_ID
      tag.textContent = CSS
      document.head.appendChild(tag)
  }

  injectStyles()  // 注册即注入样式（幂等自愈），无需等实例化

  // 🔴 改动 2026-09-24 · Ctrl 按住状态 → body.mn-ctrl-held（视图态 URL 悬停 pointer 光标用）
  if (!window.__evoloopTodoCtrlTrack) {
    window.__evoloopTodoCtrlTrack = true
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Control' && document.body) document.body.classList.add('mn-ctrl-held')
    })
    document.addEventListener('keyup', function (e) {
      if (e.key === 'Control' && document.body) document.body.classList.remove('mn-ctrl-held')
    })
    window.addEventListener('blur', function () {
      if (document.body) document.body.classList.remove('mn-ctrl-held')
    })
  }

  registry['todo'] = function (deps) {
    var el = deps.el, t = deps.t
    var scheduleSave = deps.scheduleSave
    var burstAtInto = deps.burstAtInto
    var cardMin = deps.cardMin
    var updateScrollbars = deps.updateScrollbars
    var columnFor = deps.columnFor
    var measureOneLine = deps.measureOneLine
    // 进程条来自兄弟模块 process-dock（未就绪时静默跳过）
    function dockSpawn(opts) { var d = deps.getModule('process-dock'); return d && d.spawn(opts) }
    function dockCancel(entry) { var d = deps.getModule('process-dock'); if (d) d.cancel(entry) }
    function dockUpdate(entry, text, depth, order) { var d = deps.getModule('process-dock'); if (d && d.update) d.update(entry, { text: text, depth: depth, order: order }) }


    // Milanote-style to-do card: editable title + done counter on top,
    // custom square checkboxes, hover-revealed drag grip and delete button,
    // Enter/Backspace list flow, and a "+ add" footer. Items persist in
    // card.meta.items ([{text, done, mission?}]).
    function buildTodo(node, card) {
      var meta = card.meta || (card.meta = {})
      if (typeof meta.title !== 'string') meta.title = ''
      if (!Array.isArray(meta.items)) meta.items = [{ text: '', done: false }]

      // 每个勾上的 item 对应一条任务进程条：勾选创建、取消勾选中止
      var missionMap = new Map()

      // 🔴 改动 2026-09-24 · todo → 进程条单向同步
      // 文本（含 -N 层级前缀）统一出口；编辑/缩进时实时同步，删除时撤下不计数
      function missionTextOf(item) {
        var d = item.depth || 0
        return (d > 0 ? '-' + d + ' ' : '') + (item.text || t('待办'))
      }
      function syncMission(item) {
        var m = missionMap.get(item)
        if (m) dockUpdate(m, missionTextOf(item), item.depth || 0, meta.items.indexOf(item))
      }
      function cancelMission(item) {
        item.mission = false
        var m = missionMap.get(item)
        if (m) { missionMap.delete(item); dockCancel(m) }
      }

      // 🔴 改动 2026-09-24 · URL 识别：http(s):// 或 www. 开头的一串非空白字符
      var URL_RE = /(https?:\/\/[^\s<>"'（）【】]+|www\.[^\s<>"'（）【】]+)/gi
      function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      }
      // 镜像层 HTML：转义后把 URL 包上下划线 span
      function highlightUrls(text) {
        return escapeHtml(text).replace(URL_RE, '<span class="mn-todo-url mn-ctrl-action">$1</span>')
      }
      var wrap = el('div', { class: 'mn-todo' })

      // header — editable list title + "done/total" counter
      var head = el('div', { class: 'mn-todo-head' })
      // 🔴 改动 2026-09-26 · input → textarea：headline 文字超 200px 宽时折行（Enter 仍跳转到首项，见 keydown）
      var title = el('textarea', { class: 'mn-todo-title', placeholder: 'To-do list', 'aria-label': 'List title', rows: '1' })
      title.value = meta.title
      // Re-hug as the headline is typed: the card width follows its own text.
      // 🔴 改动 2026-09-25 · 编辑待办 headline 时实时同步对应进程列表，不重建进程条
      title.addEventListener('input', function () {
        meta.title = title.value
        var dock = deps.getModule('process-dock')
        if (dock && dock.updateGroupTitle) dock.updateGroupTitle(card.id, meta.title)
        scheduleSave()
        grow()
      })
      title.addEventListener('keydown', function (e) {
        e.stopPropagation()
        if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) {
          e.preventDefault()
          if (!meta.items.length) {
            meta.items.push({ text: '', done: false })
            render()
            scheduleSave()
          }
          focusItem(0)
        }
        else if (e.key === 'Escape') title.blur()
      })
      var count = el('span', { class: 'mn-todo-count' })
      head.appendChild(title); head.appendChild(count)
      wrap.appendChild(head)

      var list = el('div', { class: 'mn-todo-list' })
      wrap.appendChild(list)

      node.appendChild(wrap)

      var draggedItem = null
      var draggedRow = null
      var dragChanged = false

      // The inter-item gap lives in the stylesheet (--mn-todo-gap) and is NOT part
      // of offsetHeight, so read it back to keep the card height in sync with the
      // CSS knob instead of duplicating the number.
      function todoGapPx() {
        try {
          var cs = window.getComputedStyle(list)
          var v = parseFloat(cs.rowGap || cs.gap)
          if (!isNaN(v)) return v
        } catch (e) { /* no computed styles (headless) → fall back below */ }
        return 8
      }
      // The head's own rhythm, read back from CSS so the hug width can never drift
      // from the stylesheet (the head is a flex row, so `gap` IS the guaranteed
      // horizontal distance between the headline and the counter).
      function headGapPx() {
        try {
          var cs = window.getComputedStyle(head)
          var v = parseFloat(cs.columnGap || cs.gap)
          if (!isNaN(v)) return v
        } catch (e) { /* no computed styles (headless) → fall back */ }
        return 12
      }
      function headPadXPx() {
        try {
          var cs = window.getComputedStyle(head)
          var l = parseFloat(cs.paddingLeft), r = parseFloat(cs.paddingRight)
          if (!isNaN(l) && !isNaN(r)) return l + r
        } catch (e) { /* no computed styles (headless) → fall back */ }
        return 28
      }
      // Measure the header with the fonts the browser actually resolved, so the hug
      // width follows the stylesheet instead of duplicating its numbers.
      function fontOf(el, fallback) {
        try {
          var f = window.getComputedStyle(el).font
          if (f) return f
        } catch (e) { /* no computed styles (headless) → fall back */ }
        return fallback
      }
      // Width that hugs the header: head padding + headline + gap + counter.
      // A column owns the width of its children, so only standalone cards hug.
      // 🔴 改动 2026-09-26 · headline 文字最大宽 200px：卡片保留默认宽，headline 超出默认宽才 hug
      // 跟随、最多跟到文字 200px 宽，再长靠折行吸收；手动调过宽度（meta.manualW）的卡不 hug
      var TITLE_MAX = 200
      function hugWidth() {
        if (columnFor(card.id)) return 0
        if (meta.manualW) return 0
        var titleText = title.value || title.placeholder || ''
        var countText = count.textContent || ''
        var titleW = measureOneLine(titleText, fontOf(title, '700 18px system-ui,"Segoe UI",sans-serif'))
        var countW = measureOneLine(countText, fontOf(count, '11px system-ui,"Segoe UI",sans-serif'))
        return Math.ceil(headPadXPx() + Math.min(titleW, TITLE_MAX) + headGapPx() + countW)
      }
      function grow() {
        // Measure the header, its one-line gap and wrap padding from live CSS.
        // 🔴 改动 2026-09-26 · 折行后的 headline 先按 scrollHeight 撑高，head 总高才量得准
        title.style.height = 'auto'
        title.style.height = title.scrollHeight + 'px'
        var chromeH = 78
        try {
          var wrapStyle = window.getComputedStyle(wrap)
          var headStyle = window.getComputedStyle(head)
          chromeH = head.offsetHeight + parseFloat(headStyle.marginBottom) +
            parseFloat(wrapStyle.paddingTop) + parseFloat(wrapStyle.paddingBottom)
        } catch (e) { /* no computed styles: use the default one-line spacing */ }
        var rowsH = 0
        var rows = list.children
        for (var i = 0; i < rows.length; i++) {
          var ta = rows[i].querySelector && rows[i].querySelector('.mn-todo-text')
          if (ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px' }
          rowsH += rows[i].offsetHeight
        }
        // Add the compact gaps between rows to the card's measured height.
        var gaps = Math.max(0, rows.length - 1) * todoGapPx()
        var h = Math.max(cardMin('todo').h, chromeH + rowsH + gaps)
        // Width: hug the headline + counter so the two can never be squeezed
        // together below the head's gap；hug=0（列内/手动调宽）时保持卡片现有宽度。
        var hug = hugWidth()
        if (hug > 0) {
          card.w = Math.max(cardMin('todo').w, hug)
          node.style.width = card.w + 'px'
        }
        node.style.height = h + 'px'
        card.h = h
        updateScrollbars()
      }
      function renderCount() {
        var done = meta.items.filter(function (it) { return it.done }).length
        count.textContent = meta.items.length ? done + '/' + meta.items.length : ''
      }
      function animateTodoSlots(before) {
        var rows = list.querySelectorAll('.mn-todo-row')
        for (var i = 0; i < rows.length; i++) {
          var oldTop = before.get(rows[i])
          if (oldTop == null || rows[i] === draggedRow) continue
          var delta = oldTop - rows[i].getBoundingClientRect().top
          if (!delta) continue
          rows[i].classList.remove('mn-todo-shifting')
          rows[i].style.transition = 'none'
          rows[i].style.transform = 'translateY(' + delta + 'px)'
          void rows[i].offsetHeight
          rows[i].classList.add('mn-todo-shifting')
          rows[i].style.transition = ''
          rows[i].style.transform = ''
        }
      }
      function liveReorder(overItem, overRow, beforeTarget) {
        if (!draggedItem || overItem === draggedItem) return
        var from = meta.items.indexOf(draggedItem)
        var target = meta.items.indexOf(overItem)
        if (from < 0 || target < 0) return
        var insertAt = target + (beforeTarget ? 0 : 1)
        if (from < insertAt) insertAt--
        if (insertAt === from) return
        var positions = new Map()
        var rows = list.querySelectorAll('.mn-todo-row')
        for (var i = 0; i < rows.length; i++) positions.set(rows[i], rows[i].getBoundingClientRect().top)
        meta.items.splice(from, 1)
        meta.items.splice(insertAt, 0, draggedItem)
        list.insertBefore(draggedRow, beforeTarget ? overRow : overRow.nextSibling)
        animateTodoSlots(positions)
        dragChanged = true
        // 🔴 改动 2026-09-25 · 拖拽排序后同步进程条行序（parent 始终在 sub 上方）
        if (missionMap.has(draggedItem)) syncMission(draggedItem)
      }
      // 🔴 改动 2026-09-29 · 量出 textarea 光标所在视觉行与总行数（离屏镜像，等宽同字体同折行），
      // 供方向键判断「item 内逐行移动」还是「跳到相邻 item」；量不出时按单行处理（退化为跳 item）
      function caretLinePos(ta) {
        var single = { line: 0, lines: 1 }
        try {
          var cs = window.getComputedStyle(ta)
          var lh = parseFloat(cs.lineHeight)
          if (!lh || isNaN(lh)) lh = 21
          var host = document.body || document.documentElement
          if (!host) return single
          var div = el('div', { style: {
            position: 'absolute', visibility: 'hidden', left: '-9999px', top: '0',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word', boxSizing: 'border-box',
            font: cs.font, padding: '0 6px', margin: '0', width: ta.clientWidth + 'px',
          } })
          div.textContent = ta.value.slice(0, ta.selectionStart)
          var marker = el('span', {}, ['​'])
          div.appendChild(marker)
          host.appendChild(div)
          var line = Math.round(marker.offsetTop / lh)
          // 总行数：全文末尾补一个零宽标记，结尾空行也能量出高度
          div.textContent = ta.value
          div.appendChild(el('span', {}, ['​']))
          var lines = Math.max(1, Math.round(div.scrollHeight / lh))
          host.removeChild(div)
          return { line: line, lines: lines }
        } catch (e) { return single }
      }
      function focusItem(idx) {
        if (idx < 0 || !meta.items.length) { title.focus(); return }
        var inputs = list.querySelectorAll('.mn-todo-text')
        var inp = inputs[Math.min(idx, inputs.length - 1)]
        if (inp) inp.focus()
      }

// 🔴 改动 2026-09-29 · 编辑态切换时同步各行 draggable：编辑态整行不可拖
      //（textarea 拖选文字优先），退回视图态恢复整行拖拽换位
      function syncRowDraggable() {
        var off = node.classList.contains('mn-editing')
        var rows = list.querySelectorAll('.mn-todo-row')
        for (var i = 0; i < rows.length; i++) rows[i].draggable = !off
      }
      if (typeof MutationObserver === 'function') {
        new MutationObserver(syncRowDraggable).observe(node, { attributes: true, attributeFilter: ['class'] })
      }

function render() {
        list.textContent = ''
        meta.items.forEach(function (item, idx) {
          // 🔴 改动 2026-09-22 · 子项行加 mn-todo-sub 类，供 CSS 单独缩小其勾选圆
          var row = el('div', { class: 'mn-todo-row' + (item.depth > 0 ? ' mn-todo-sub' : '') + (item.done ? ' mn-done' : '') })
          if (item.depth > 0) row.style.setProperty('--mn-depth', String(item.depth))

          // 🔴 改动 2026-09-29 · 拖拽识别区从 grip 扩到整行：卡片内 headline 以外任意位置
          // 都可发起实时换位；编辑态除外（textarea 拖选文字优先）——pointerdown 捕获阶段
          // 按编辑态即时切换 draggable
          var grip = el('span', { class: 'mn-todo-grip mn-view-action', title: t('拖拽排序') }, ['⠿'])
          row.draggable = !node.classList.contains('mn-editing')
          // 换位拖拽进行中：落到本卡任何一行以外（headline、卡片外、其他卡）→ 禁止放置光标；
          // 行上不拦截，交给行 dragover（move + 实时换位）
          function dragoverGuard(e) {
            if (!draggedItem) return
            var r = e.target && e.target.closest ? e.target.closest('.mn-todo-row') : null
            if (r && list.contains(r)) return
            e.preventDefault()
            try { e.dataTransfer.dropEffect = 'none' } catch (err) {}
          }
          row.addEventListener('dragstart', function (e) {
            if (node.classList.contains('mn-editing')) { e.preventDefault(); return }
            draggedItem = item
            draggedRow = row
            dragChanged = false
            row.classList.add('mn-drag-src')
            e.dataTransfer.effectAllowed = 'move'
            try { e.dataTransfer.setData('text/plain', String(idx)) } catch (err) {}
            document.removeEventListener('dragover', dragoverGuard, true)
            document.addEventListener('dragover', dragoverGuard, true)
          })
          row.addEventListener('dragend', function () {
            document.removeEventListener('dragover', dragoverGuard, true)
            var changed = dragChanged
            row.classList.remove('mn-drag-src')
            draggedItem = null
            draggedRow = null
            dragChanged = false
            render()
            if (changed) scheduleSave()
          })
          row.addEventListener('dragover', function (e) {
            if (!draggedItem || draggedItem === item) return
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            var rect = row.getBoundingClientRect()
            liveReorder(item, row, e.clientY < rect.top + rect.height / 2)
          })
          row.addEventListener('drop', function (e) {
            e.preventDefault()
          })

          // custom round checkbox: 整个圆框缩小填充为实心圆点，完成时粒子爆发
          // mn-view-action：视图态也可直接勾选/取消
          var check = el('button', {
            class: 'mn-todo-check mn-view-action', type: 'button', role: 'checkbox',
            'aria-checked': item.done ? 'true' : 'false',
            'aria-label': item.done ? t('标记为未完成') : t('标记为完成'),
          })
          check.addEventListener('click', function (e) {
            e.stopPropagation()
            item.done = !item.done
            row.classList.toggle('mn-done', item.done)
            check.setAttribute('aria-checked', item.done ? 'true' : 'false')
            check.setAttribute('aria-label', item.done ? t('标记为未完成') : t('标记为完成'))
            if (item.done) {
              burstAtInto(wrap, check, 9, 30)
              // 勾上 → 派发一条任务进程条到画布右上角
              // item.mission = true：进程条状态随 board.json 持久化（下方 scheduleSave 落盘）
              if (!missionMap.has(item)) {
                item.mission = true
                missionMap.set(item, dockSpawn({ text: missionTextOf(item), sourceNode: node, item: item, depth: item.depth || 0, order: meta.items.indexOf(item), groupId: card.id, groupTitle: meta.title || t('To-do list') }))
              }
            } else {
              // 取消勾 → 未完成的任务中止撤下（不计数），同时清 item.mission 标志
              cancelMission(item)
            }
            renderCount()
            scheduleSave()
          })

          // 重开面板/重建列表时按 item.mission 标志复活进程条（重新行军，missionMap 去重）
          if (item.done && item.mission && !missionMap.has(item)) {
            missionMap.set(item, dockSpawn({ text: missionTextOf(item), sourceNode: node, item: item, depth: item.depth || 0, order: meta.items.indexOf(item), groupId: card.id, groupTitle: meta.title || t('To-do list') }))
          }

          // inline text — textarea auto-wraps; Enter inserts below, Shift+Enter newline,
          // Backspace on empty removes
          var inp = el('textarea', { class: 'mn-todo-text', placeholder: 'To-do item', rows: '1' })
          inp.value = item.text || ''
          // 🔴 改动 2026-09-24 · 镜像层：同步文字并给 URL 加下划线（textarea 文字透明）
          var mirror = el('div', { class: 'mn-todo-mirror', 'aria-hidden': 'true' })
          // 🔴 改动 2026-09-24 · 视图态 URL 也由卡片捕获层统一交给跨窗口扩展
          var field = el('div', { class: 'mn-todo-field' })
          field.appendChild(mirror)
          field.appendChild(inp)
          function syncMirror() {
            mirror.innerHTML = highlightUrls(inp.value)
          }
          syncMirror()
          function syncHeight() {
            inp.style.height = 'auto'
            inp.style.height = inp.scrollHeight + 'px'
          }
          // 🔴 改动 2026-09-24 · 编辑文字实时同步到进程条（单向：todo → 进程条）+ 镜像层 URL 下划线
          inp.addEventListener('input', function () { item.text = inp.value; syncMirror(); syncMission(item); scheduleSave(); syncHeight(); grow() })
          // 🔴 改动 2026-09-24 · 按实际点击位置取 URL，由卡片捕获层交给跨窗口扩展
          inp.__evoloopUrlAt = function (e) {
            var hit = urlSpanAt(e.clientX, e.clientY)
            return hit ? hit.textContent : null
          }
          // 🔴 改动 2026-09-24 · 按住 Ctrl 悬停在 URL 上 → 光标变 pointer（链接通用样式）。
          // 命中检测用镜像层 URL span 的 Range 矩形（跨行 URL 逐段判定）。
          var ctrlHeld = false
          var lastMouse = null
          function urlSpanAt(x, y) {
            var spans = mirror.querySelectorAll('.mn-todo-url')
            for (var i = 0; i < spans.length; i++) {
              var range = document.createRange()
              range.selectNodeContents(spans[i])
              var rects = range.getClientRects()
              for (var j = 0; j < rects.length; j++) {
                var r = rects[j]
                if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return spans[i]
              }
            }
            return null
          }
          function updateUrlCursor() {
            var hit = ctrlHeld && lastMouse ? urlSpanAt(lastMouse.x, lastMouse.y) : null
            inp.style.cursor = hit ? 'pointer' : ''
          }
          inp.addEventListener('pointermove', function (e) {
            lastMouse = { x: e.clientX, y: e.clientY }
            if (ctrlHeld) updateUrlCursor()
          })
          inp.addEventListener('pointerleave', function () {
            lastMouse = null
            inp.style.cursor = ''
          })
          inp.addEventListener('keyup', function (e) {
            if (e.key === 'Control') { ctrlHeld = false; updateUrlCursor() }
          })
          inp.addEventListener('blur', function () {
            ctrlHeld = false
            inp.style.cursor = ''
          })
          inp.addEventListener('keydown', function (e) {
            e.stopPropagation()
            if (e.key === 'Control') { ctrlHeld = true; updateUrlCursor() }
            // 🔴 改动 2026-09-24 · 编辑态 Alt+C：勾选/取消当前待办项（等价点击勾选钮）
            if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey && e.code === 'KeyC') {
              e.preventDefault()
              check.click()
              return
            }
            // 🔴 改动 2026-09-29 · 上下方向键先逐行移光标：光标不在首行按上/不在末行按下时
            // 放行浏览器原生行为（item 内移一行）；首行按上/末行按下/单行时才跳相邻待办项
            if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && !e.isComposing) {
              var pos = caretLinePos(inp)
              if (e.key === 'ArrowUp' && pos.line > 0) return
              if (e.key === 'ArrowDown' && pos.line < pos.lines - 1) return
              var inputs = list.querySelectorAll('.mn-todo-text')
              var current = Array.prototype.indexOf.call(inputs, inp)
              var target = inputs[current + (e.key === 'ArrowUp' ? -1 : 1)]
              e.preventDefault()
              if (target) {
                var caret = Math.min(inp.selectionStart, target.value.length)
                target.focus({ preventScroll: true })
                target.setSelectionRange(caret, caret)
                target.scrollIntoView({ block: 'nearest', inline: 'nearest' })
              }
            }
            // 🔴 改动 2026-09-22 · Tab 三分支（阻止默认焦点切换）：
            // 文字头部 → 缩进为上一项的子项（无限层级）；文字中间 → 光标后内容拆为同级新项；
            // 文字末尾 → 自动生成同级新项；Shift+Tab → 升 1 级
            if (e.key === 'Tab' && !e.isComposing && e.keyCode !== 229) {
              e.preventDefault()
              var tabIndex = meta.items.indexOf(item)
              var tabDepth = item.depth || 0
              var caretPos = inp.selectionStart
              if (e.shiftKey) {
                if (tabDepth <= 0) return
                item.depth = tabDepth - 1
                syncMission(item)
                render()
                scheduleSave()
                focusItem(tabIndex)
                var shiftedInput = list.querySelectorAll('.mn-todo-text')[tabIndex]
                if (shiftedInput) shiftedInput.setSelectionRange(caretPos, caretPos)
                return
              }
              if (caretPos === 0) {
                // 头部：缩进一级，成为上一项的子项（首项无上一项可依附，忽略）
                if (tabIndex <= 0) return
                item.depth = tabDepth + 1
                syncMission(item)
                render()
                scheduleSave()
                focusItem(tabIndex)
                var headInput = list.querySelectorAll('.mn-todo-text')[tabIndex]
                if (headInput) headInput.setSelectionRange(0, 0)
              } else if (caretPos < inp.value.length) {
                // 中间：光标之后的内容拆出为同级新项
                var tabTrailing = inp.value.slice(inp.selectionEnd)
                item.text = inp.value.slice(0, caretPos)
                syncMission(item)
                meta.items.splice(tabIndex + 1, 0, { text: tabTrailing, done: false, depth: tabDepth })
                render()
                scheduleSave()
                focusItem(tabIndex + 1)
                var splitInput = list.querySelectorAll('.mn-todo-text')[tabIndex + 1]
                if (splitInput) {
                  splitInput.setSelectionRange(0, 0)
                  splitInput.scrollIntoView({ block: 'nearest', inline: 'nearest' })
                }
              } else {
                // 末尾：自动生成一个同级新项并聚焦
                meta.items.splice(tabIndex + 1, 0, { text: '', done: false, depth: tabDepth })
                render()
                scheduleSave()
                focusItem(tabIndex + 1)
                var appendedInput = list.querySelectorAll('.mn-todo-text')[tabIndex + 1]
                if (appendedInput) appendedInput.scrollIntoView({ block: 'nearest', inline: 'nearest' })
              }
            // Enter 在光标处拆分待办项，后半文字转入新项（继承当前缩进层级）
            } else if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
              e.preventDefault()
              var itemIndex = meta.items.indexOf(item)
              var trailingText = inp.value.slice(inp.selectionEnd)
              item.text = inp.value.slice(0, inp.selectionStart)
              syncMission(item)
              meta.items.splice(itemIndex + 1, 0, { text: trailingText, done: false, depth: item.depth || 0 })
              render()
              scheduleSave()
              focusItem(itemIndex + 1)
              var newInput = list.querySelectorAll('.mn-todo-text')[itemIndex + 1]
              if (newInput) {
                newInput.setSelectionRange(0, 0)
                newInput.scrollIntoView({ block: 'nearest', inline: 'nearest' })
              }
            // 🔴 改动 2026-09-22 · 子项在文字头部按 Backspace → 升 1 级（文字保留）；
            // 空的顶级项 Backspace 删除，删除不跨入标题区域
            } else if (e.key === 'Backspace' && !e.isComposing && e.keyCode !== 229) {
              var removeIndex = meta.items.indexOf(item)
              var backDepth = item.depth || 0
              if (backDepth > 0 && inp.selectionStart === 0 && inp.selectionEnd === 0) {
                e.preventDefault()
                item.depth = backDepth - 1
                syncMission(item)
                render()
                scheduleSave()
                focusItem(removeIndex)
                var promotedInput = list.querySelectorAll('.mn-todo-text')[removeIndex]
                if (promotedInput) promotedInput.setSelectionRange(0, 0)
                return
              }
              if (inp.value !== '') return
              e.preventDefault()
              if (removeIndex <= 0) return
              // 🔴 改动 2026-09-24 · 删除 item → 撤下其进程条（不计数）
              cancelMission(item)
              meta.items.splice(removeIndex, 1)
              render()
              scheduleSave()
              focusItem(removeIndex - 1)
              var previousInput = list.querySelectorAll('.mn-todo-text')[removeIndex - 1]
              if (previousInput) previousInput.setSelectionRange(previousInput.value.length, previousInput.value.length)
            } else if (e.key === 'Escape') {
              inp.blur()
            }
          })

          // delete (hover-revealed)；mn-view-action：视图态也可直接删除
          var del = el('button', { class: 'mn-todo-del mn-view-action', type: 'button', title: t('删除'), 'aria-label': t('删除') }, ['×'])
          del.addEventListener('click', function (e) {
            e.stopPropagation()
            // 🔴 改动 2026-09-24 · 删除 item → 撤下其进程条（不计数）
            cancelMission(item)
            meta.items.splice(idx, 1)
            render()
            scheduleSave()
          })

          row.appendChild(grip); row.appendChild(check); row.appendChild(field); row.appendChild(del)
          list.appendChild(row)
        })
        renderCount()
        syncRowDraggable()
        // The card node is still detached at first build (renderCard appends
        // after buildCard returns), so live row-height measurement must wait
        // a frame; the sync call keeps non-DOM environments working.
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(function () { grow() })
        else grow()
      }
      render()
      node.__todoGrow = grow
      node.__edit = function (e) {
        var target = e && e.target
        if (target && target.classList && target.classList.contains('mn-todo-title')) {
          title.focus(); title.select(); return
        }
        if (target && target.classList && target.classList.contains('mn-todo-text')) {
          target.focus(); return
        }
        // 🔴 改动 2026-09-21 · 空列表时双击 item 区域自动生成一条待办并聚焦编辑
        if (!meta.items.length) {
          meta.items.push({ text: '', done: false })
          render()
          scheduleSave()
        }
        focusItem(0)
      }
      // F2 — jump straight to the list headline, not the first item.
      node.__rename = function () { title.focus(); title.select() }
    }

    return { buildTodo: buildTodo }
  }
})()
