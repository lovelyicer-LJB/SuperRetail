// ============================================================================
// Evoloop 客户端子模块：context-menu（卡片右键菜单）
//
// 🔴 新增 2026-09-25 · 按架构文档「十一、模块化规则」首个全新功能模块。
// 首个菜单项：Lock Position（锁定位置，card.meta.locked）——锁定后卡片不可
// 拖拽移动（自身拖拽与多选整组拖拽都会被跳过），卡片右上角显示 🔒 徽标。
//
// 加载方式同 sync.js（方案A · 注册表模式，详见该文件头注释）。
// deps：el / t / scheduleSave
// 扩展方式：往 ITEMS 追加 { id, label, checked?, run(card, node) } 即可。
// ============================================================================
;(function () {
  var registry = window.__EVOLOOP__ = window.__EVOLOOP__ || {}
  if (registry['context-menu']) return

  // ---- 样式（自注入 + 自愈）----
  var CSS_ID = 'dsh-evoloop-context-menu-css'
  var CSS = [
      // 🔴 改动 2026-09-25 · 菜单置于画板(1000000)与折叠按钮(1000001)之上
      '.mn-ctxmenu{position:fixed;z-index:1000002;min-width:180px;display:flex;flex-direction:column;gap:2px;padding:6px;border-radius:10px;background:rgba(22,25,30,.97);border:1px solid rgba(255,255,255,.12);box-shadow:0 8px 24px rgba(0,0,0,.5);font:12px system-ui}',
      '.mn-ctxmenu-item{display:flex;align-items:center;gap:8px;padding:7px 10px;border:0;border-radius:6px;background:transparent;color:#e6e6e6;font:inherit;text-align:left;cursor:pointer}',
      '.mn-ctxmenu-item:hover{background:rgba(10,185,230,.16)}',
      '.mn-ctxmenu-check{width:14px;flex:none;text-align:center;color:#0AB9E6}',
      // 锁定徽标：卡片右上角小圆点 + 🔒
      '#dsh-evoloop-overlay .mn-lock-badge{position:absolute;top:-7px;right:-7px;z-index:6;width:20px;height:20px;border-radius:50%;background:rgba(22,25,30,.95);border:1px solid rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:11px;line-height:1;pointer-events:none;box-shadow:0 2px 6px rgba(0,0,0,.4)}',
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

  registry['context-menu'] = function (deps) {
    var el = deps.el, t = deps.t, scheduleSave = deps.scheduleSave

    // ---- 锁定徽标：渲染/重渲染卡片时由宿主调用，幂等 ------------------------
    function applyLockState(node, card) {
      if (!node || !node.querySelector) return
      var locked = !!(card.meta && card.meta.locked)
      var badge = node.querySelector('.mn-lock-badge')
      if (locked && !badge) node.appendChild(el('div', { class: 'mn-lock-badge', title: t('位置已锁定') }, ['🔒']))
      if (!locked && badge) badge.remove()
    }

    // ---- 菜单项注册表（新功能往这里加）--------------------------------------
    var ITEMS = [
      {
        id: 'lock-position',
        label: function () { return t('锁定位置') },
        checked: function (card) { return !!(card.meta && card.meta.locked) },
        run: function (card, node) {
          card.meta = card.meta || {}
          card.meta.locked = !card.meta.locked
          scheduleSave()
          applyLockState(node, card)
        },
      },
    ]

    // ---- 菜单开合 -----------------------------------------------------------
    var openMenuEl = null
    function onDocDown(e) {
      if (openMenuEl && !openMenuEl.contains(e.target)) closeMenu()
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); closeMenu() }
    }
    function closeMenu() {
      if (openMenuEl) { openMenuEl.remove(); openMenuEl = null }
      document.removeEventListener('pointerdown', onDocDown, true)
      document.removeEventListener('keydown', onKey, true)
    }

    // open(card, node, x, y)：在 (clientX, clientY) 处弹出卡片右键菜单
    function open(card, node, x, y) {
      closeMenu()
      var menu = el('div', { class: 'mn-ctxmenu', role: 'menu' })
      ITEMS.forEach(function (item) {
        var check = el('span', { class: 'mn-ctxmenu-check' }, [item.checked && item.checked(card) ? '✓' : ''])
        menu.appendChild(el('button', {
          class: 'mn-ctxmenu-item', type: 'button', role: 'menuitem',
          onclick: function (e) {
            e.stopPropagation()
            item.run(card, node)
            closeMenu()
          },
        }, [check, el('span', {}, [item.label()])]))
      })
      // 与画板挂在同一根节点，避免被 DSH body 的层叠/变换上下文遮挡。
      ;(document.documentElement || document.body).appendChild(menu)
      // 防出屏：优先右下展开，越界则向左/上翻
      var r = menu.getBoundingClientRect()
      var left = Math.min(x, window.innerWidth - r.width - 8)
      var top = Math.min(y, window.innerHeight - r.height - 8)
      menu.style.left = Math.max(4, left) + 'px'
      menu.style.top = Math.max(4, top) + 'px'
      openMenuEl = menu
      document.addEventListener('pointerdown', onDocDown, true)
      document.addEventListener('keydown', onKey, true)
    }

    return {
      open: open,
      close: closeMenu,
      applyLockState: applyLockState,
      ITEMS: ITEMS,
    }
  }
})()
