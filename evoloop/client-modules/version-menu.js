// ============================================================================
// Evoloop 客户端子模块：version-menu（版本下拉 + 手动 Update 按钮）
//
// 加载方式同 sync.js（方案A · 注册表模式，详见该文件头注释）。
// deps：el / t / overlayId / versionLabel / updateCheckRoute / updateApplyRoute
// ============================================================================
;(function () {
  var registry = window.__EVOLOOP__ = window.__EVOLOOP__ || {}
  if (registry['version-menu']) return

  // ---- 样式（自注入 + 自愈）----
  // 与 client.js 主常量保持一致（注册期注入样式时 deps 尚不存在，故硬编码）
  var OVERLAY_ID = 'dsh-evoloop-overlay'
  var CSS_ID = 'dsh-evoloop-version-menu-css'
  var CSS = [
      // ---- version dropdown with manual Update button (next to language) ----
      '#' + OVERLAY_ID + ' .mn-version{position:relative;display:flex;align-items:center;gap:5px;color:var(--mn-muted);flex-shrink:0}',
      '#' + OVERLAY_ID + ' .mn-version-btn{background:var(--mn-surface);color:var(--mn-text);border:1px solid var(--mn-border);border-radius:5px;padding:4px 8px;font:12px system-ui;cursor:pointer}',
      '#' + OVERLAY_ID + ' .mn-version-btn:hover{border-color:#0AB9E6}',
      '#' + OVERLAY_ID + ' .mn-version-btn:focus-visible{outline:2px solid #0AB9E6;outline-offset:2px}',
      '#' + OVERLAY_ID + ' .mn-version-menu{position:absolute;top:calc(100% + 6px);right:0;z-index:200;min-width:210px;display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:10px;background:rgba(22,25,30,.97);border:1px solid var(--mn-border);box-shadow:0 8px 24px rgba(0,0,0,.5)}',
      '#' + OVERLAY_ID + ' .mn-version-row{display:flex;align-items:center;justify-content:space-between;gap:10px;font:12px system-ui;color:var(--mn-text)}',
      '#' + OVERLAY_ID + ' .mn-version-row b{font-weight:700;color:#8FE6FF}',
      '#' + OVERLAY_ID + ' .mn-version-status{font:11px/1.5 system-ui;color:var(--mn-muted);min-height:16px;word-break:break-all}',
      '#' + OVERLAY_ID + ' .mn-version-status.mn-ok{color:#7bd8a4}',
      '#' + OVERLAY_ID + ' .mn-version-status.mn-err{color:#ef9a9a}',
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

  registry['version-menu'] = function (deps) {
    var el = deps.el, t = deps.t
    var PLUGIN_VERSION_LABEL = deps.versionLabel
    var UPDATE_CHECK_ROUTE = deps.updateCheckRoute
    var UPDATE_APPLY_ROUTE = deps.updateApplyRoute


    // ---- manual update — only runs when the user clicks Update ------------
    function runUpdateCheck(statusEl, actionEl) {
      statusEl.className = 'mn-version-status'
      statusEl.textContent = t('正在检查更新…')
      actionEl.disabled = true
      fetch(UPDATE_CHECK_ROUTE, { method: 'GET' })
        .then(function (r) { return r.json() })
        .then(function (j) {
          if (!j.ok) throw new Error((j.error && j.error.message) || 'check failed')
          var v = j.value || {}
          var curEl = document.getElementById('dsh-version-current')
          if (curEl && v.current) curEl.textContent = v.current
          if (!v.configured) {
            statusEl.textContent = t('未配置更新源')
          } else if (v.updateAvailable) {
            statusEl.className = 'mn-version-status mn-ok'
            statusEl.textContent = t('发现新版本') + ' ' + v.latest
            actionEl.textContent = t('立即更新')
            actionEl.disabled = false
            actionEl.onclick = function () { runUpdateApply(statusEl, actionEl) }
            return
          } else {
            statusEl.className = 'mn-version-status mn-ok'
            statusEl.textContent = t('已是最新版本')
          }
          actionEl.disabled = false
        })
        .catch(function (e) {
          statusEl.className = 'mn-version-status mn-err'
          statusEl.textContent = t('检查更新失败') + '：' + (e && e.message || e)
          actionEl.disabled = false
        })
    }
    function runUpdateApply(statusEl, actionEl) {
      statusEl.className = 'mn-version-status'
      statusEl.textContent = t('正在更新…')
      actionEl.disabled = true
      fetch(UPDATE_APPLY_ROUTE, { method: 'POST' })
        .then(function (r) { return r.json() })
        .then(function (j) {
          if (!j.ok) throw new Error((j.error && j.error.message) || 'apply failed')
          statusEl.className = 'mn-version-status mn-ok'
          statusEl.textContent = t('更新完成，请重新打开面板生效')
          actionEl.textContent = t('检查更新')
          actionEl.disabled = false
          actionEl.onclick = function () { runUpdateCheck(statusEl, actionEl) }
        })
        .catch(function (e) {
          statusEl.className = 'mn-version-status mn-err'
          statusEl.textContent = t('更新失败') + '：' + (e && e.message || e)
          actionEl.disabled = false
        })
    }
    // 版本下拉弹层：当前版本行 + Update 按钮 + 状态行；点击外部自动关闭
    function buildVersionMenu() {
      var wrap = el('div', { class: 'mn-version' })
      var btn = el('button', { class: 'mn-version-btn', type: 'button', 'aria-haspopup': 'true', 'aria-expanded': 'false', title: t('版本') }, [PLUGIN_VERSION_LABEL + ' ▾'])
      var menu = el('div', { class: 'mn-version-menu', role: 'menu' })
      menu.style.display = 'none'
      var statusEl = el('div', { class: 'mn-version-status', id: 'dsh-update-status' }, [''])
      var actionBtn = el('button', { class: 'mn-btn mn-primary', type: 'button', id: 'dsh-update-btn' }, [t('检查更新')])
      actionBtn.addEventListener('click', function () { runUpdateCheck(statusEl, actionBtn) })
      menu.appendChild(el('div', { class: 'mn-version-row' }, [
        el('span', {}, [t('当前版本')]),
        el('b', { id: 'dsh-version-current' }, [PLUGIN_VERSION_LABEL]),
      ]))
      menu.appendChild(actionBtn)
      menu.appendChild(statusEl)
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

    return { buildMenu: buildVersionMenu }
  }
})()
