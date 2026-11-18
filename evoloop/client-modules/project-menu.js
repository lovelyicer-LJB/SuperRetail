// ============================================================================
// Evoloop 客户端子模块：project-menu（顶栏「项目」下拉）
//
// 加载方式同 sync.js（方案A · 注册表模式，详见该文件头注释）。
// deps：el / t / overlayId / openBoardRoute / loadBoard / scheduleSave
// 首个功能：文件 → 打开…（读取指定文件夹的 board.json 到当前画板，随后自动落盘）
// ============================================================================
;(function () {
  var registry = window.__EVOLOOP__ = window.__EVOLOOP__ || {}
  if (registry['project-menu']) return

  // ---- 样式（自注入 + 自愈）----
  // 与 client.js 主常量保持一致（注册期注入样式时 deps 尚不存在，故硬编码）
  var OVERLAY_ID = 'dsh-evoloop-overlay'
  var CSS_ID = 'dsh-evoloop-project-menu-css'
  var CSS = [
      '#' + OVERLAY_ID + ' .mn-project{position:relative;flex-shrink:0}',
      '#' + OVERLAY_ID + ' .mn-project-btn{background:var(--mn-surface);color:var(--mn-text);border:1px solid var(--mn-border);border-radius:5px;padding:4px 8px;font:12px system-ui;cursor:pointer}',
      '#' + OVERLAY_ID + ' .mn-project-btn:hover{border-color:#0AB9E6}',
      '#' + OVERLAY_ID + ' .mn-project-btn:focus-visible{outline:2px solid #0AB9E6;outline-offset:2px}',
      '#' + OVERLAY_ID + ' .mn-project-menu{position:absolute;top:calc(100% + 6px);left:0;z-index:200;min-width:132px;display:flex;flex-direction:column;gap:2px;padding:6px;border-radius:10px;background:rgba(22,25,30,.97);border:1px solid var(--mn-border);box-shadow:0 8px 24px rgba(0,0,0,.5)}',
      '#' + OVERLAY_ID + ' .mn-project-item{position:relative;padding:6px 10px;border-radius:6px;font:12px system-ui;color:var(--mn-text);cursor:pointer;white-space:nowrap;user-select:none}',
      '#' + OVERLAY_ID + ' .mn-project-item:hover{background:var(--mn-hover)}',
      '#' + OVERLAY_ID + ' .mn-project-item .mn-project-caret{float:right;color:var(--mn-muted)}',
      // 子菜单向左展开（面板停靠在屏幕右侧，向右会出屏）
      '#' + OVERLAY_ID + ' .mn-project-sub{display:none;position:absolute;right:calc(100% + 4px);top:-6px;z-index:201;min-width:120px;flex-direction:column;gap:2px;padding:6px;border-radius:10px;background:rgba(22,25,30,.97);border:1px solid var(--mn-border);box-shadow:0 8px 24px rgba(0,0,0,.5)}',
      '#' + OVERLAY_ID + ' .mn-project-has-sub:hover .mn-project-sub,' + '#' + OVERLAY_ID + ' .mn-project-sub:hover{display:flex}',
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

  registry['project-menu'] = function (deps) {
    var el = deps.el, t = deps.t
    var OPEN_ROUTE = deps.openBoardRoute
    var loadBoard = deps.loadBoard
    var scheduleSave = deps.scheduleSave

    // 文件 → 打开…：指定文件夹，读取其 board.json 替换当前画板，随后自动落盘到当前工作区
    function openFromFolder() {
      var input = window.prompt(t('输入文件夹路径（依次尝试其 .bennote/board.json 与 board.json）'), '')
      if (!input || !input.trim()) return
      fetch(OPEN_ROUTE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: input.trim() }),
      })
        .then(function (r) { return r.json() })
        .then(function (j) {
          if (!j.ok) throw new Error((j.error && j.error.message) || 'open failed')
          loadBoard(j.value.board)
          scheduleSave()
        })
        .catch(function (e) {
          window.alert(t('打开失败') + '：' + (e && e.message || e))
        })
    }

    // 「项目」下拉：文件 ▸（打开…）；点击外部自动关闭
    function buildMenu() {
      var wrap = el('div', { class: 'mn-project' })
      var btn = el('button', { class: 'mn-project-btn', type: 'button', 'aria-haspopup': 'true', 'aria-expanded': 'false', title: t('项目') }, [t('项目') + ' ▾'])
      var menu = el('div', { class: 'mn-project-menu', role: 'menu' })
      menu.style.display = 'none'
      var sub = el('div', { class: 'mn-project-sub', role: 'menu' }, [
        el('div', { class: 'mn-project-item', role: 'menuitem', 'data-action': 'open' }, [t('打开…')]),
      ])
      var fileItem = el('div', { class: 'mn-project-item mn-project-has-sub', role: 'menuitem', 'aria-haspopup': 'true' }, [
        el('span', {}, [t('文件')]),
        el('span', { class: 'mn-project-caret' }, ['◂']),
      ])
      fileItem.appendChild(sub)
      menu.appendChild(fileItem)
      sub.firstChild.addEventListener('click', function (ev) {
        ev.stopPropagation()
        setOpen(false)
        openFromFolder()
      })
      var open = false
      function setOpen(next) {
        open = next
        menu.style.display = open ? 'flex' : 'none'
        btn.setAttribute('aria-expanded', String(open))
      }
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation()
        setOpen(!open)
        if (open) document.addEventListener('click', function () { setOpen(false) }, { once: true })
      })
      menu.addEventListener('click', function (ev) { ev.stopPropagation() })
      wrap.appendChild(btn)
      wrap.appendChild(menu)
      return wrap
    }

    return { buildMenu: buildMenu }
  }
})()
