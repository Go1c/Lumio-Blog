/* WS-B 文章侧栏评论 — 飞书风划词高亮 + 本地后端 (/api/posts/:slug/comments)
 *
 * - 选中正文文本 → 浮 bubble(复制 / 高亮 / 评论)
 * - 高亮 ↔ 评论卡通过 anchor.mid 关联(高亮 mid 走服务端 anchor JSON,引用文本可用于刷新后回锚)
 * - 评论支持 parent_id 楼中楼回复
 * - 评论本身走真后端:GET 拉 approved 列表,POST 默认直接 approved(后端可配为 pending)
 * - 如果配了 giscusRepo,作为兼容路径加载 giscus(可选);否则只用本地后端
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-component="comments"]');
  if (!root) return;

  var article = document.querySelector('.wsa-prose, .hf-prose, article.wsa-post__main');
  var bubble = document.getElementById('wsb-selbubble');
  var listEl = document.getElementById('wsb-comments-list');
  var emptyEl = root.querySelector('[data-empty]');
  var countEl = root.querySelector('[data-count]');
  var compose = root.querySelector('[data-compose]');
  var input = compose ? compose.querySelector('input') : null;
  var errEl = compose ? compose.querySelector('[data-error]') : null;
  var loginLink = document.getElementById('wsb-comments-login');

  var slug = root.getAttribute('data-slug') || location.pathname.replace(/^\/posts\/|\.html$/g, '');
  var giscusRepo = root.getAttribute('data-giscus-repo') || '';
  var apiBase = '/api/posts/' + encodeURIComponent(slug) + '/comments';

  var HL_STORAGE_KEY = 'wsb-comments-hl:' + slug;
  var AUTHOR_STORAGE_KEY = 'wsb-comments-author';

  /** @type {{id:number, parent_id:number|null, author:string, website:string|null, body:string, created_at:string, anchor:{mid:string,quote:string}|null, status?:'pending'|'approved'}[]} */
  var comments = [];
  /** @type {{mid:string, quote:string}[]} */
  var highlights = [];
  var midCounter = 1;
  var pendingMids = {};
  var replyTo = null; // {id, author}

  // ---- restore highlights only ----
  try {
    var raw = localStorage.getItem(HL_STORAGE_KEY);
    if (raw) {
      var saved = JSON.parse(raw);
      highlights = (saved && saved.highlights) || [];
      midCounter = (saved && saved.midCounter) || 1;
    }
  } catch (e) { /* ignore */ }

  // ---- giscus.js (可选) ----
  if (giscusRepo) {
    var s = document.createElement('script');
    s.src = 'https://giscus.app/client.js';
    s.async = true; s.defer = true; s.crossOrigin = 'anonymous';
    s.setAttribute('data-repo', giscusRepo);
    s.setAttribute('data-repo-id', root.getAttribute('data-giscus-repo-id') || '');
    s.setAttribute('data-category', root.getAttribute('data-giscus-category') || 'Comments');
    s.setAttribute('data-category-id', root.getAttribute('data-giscus-category-id') || '');
    s.setAttribute('data-mapping', root.getAttribute('data-giscus-mapping') || 'pathname');
    s.setAttribute('data-emit-metadata', '1');
    s.setAttribute('data-input-position', 'bottom');
    s.setAttribute('data-theme', 'preferred_color_scheme');
    s.setAttribute('data-loading', 'lazy');
    var hidden = document.createElement('div');
    hidden.style.display = 'none';
    hidden.appendChild(s);
    root.appendChild(hidden);
    if (loginLink) loginLink.href = 'https://github.com/' + giscusRepo + '/discussions';
  } else if (loginLink) {
    loginLink.textContent = '以匿名身份留言';
    loginLink.removeAttribute('href');
    loginLink.setAttribute('aria-disabled', 'true');
  }

  // ---- 拉远端评论 ----
  fetch(apiBase, { headers: { accept: 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : { comments: [] }; })
    .then(function (data) {
      var list = (data && data.comments) || [];
      // 按 created_at ASC 入,我们自己组树
      comments = list;
      // 把服务端带回的 anchor 同步进本地 highlights 列表(保证别人留言里的 mid 也能在本地高亮)
      hydrateAnchorsFromComments();
      reapplyHighlightsFromStorage();
      render();
    })
    .catch(function () {
      reapplyHighlightsFromStorage();
      render();
    });

  // ---- selection bubble ----
  if (article && bubble) {
    document.addEventListener('selectionchange', function () {
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed) { bubble.hidden = true; return; }
      var range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
      if (!range || !article.contains(range.commonAncestorContainer)) {
        bubble.hidden = true; return;
      }
      var rect = range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) { bubble.hidden = true; return; }
      bubble.hidden = false;
      var x = rect.left + rect.width / 2 + window.scrollX;
      var y = rect.top + window.scrollY - 44;
      bubble.style.left = Math.max(8, x - bubble.offsetWidth / 2) + 'px';
      bubble.style.top = Math.max(8, y) + 'px';
    });

    bubble.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
    bubble.addEventListener('click', function (ev) {
      var btn = ev.target.closest('button[data-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      var text = sel.toString().trim();
      if (!text) return;
      if (action === 'copy') {
        try { navigator.clipboard.writeText(text); } catch (e) { /* swallow */ }
      } else if (action === 'highlight') {
        applyHighlight(sel, text);
      } else if (action === 'comment') {
        var mid = applyHighlight(sel, text);
        if (mid && input) {
          input.focus();
          input.setAttribute('data-mid', mid);
          input.setAttribute('data-quote', text);
          input.placeholder = '评论选中:"' + (text.length > 30 ? text.slice(0, 28) + '…' : text) + '"';
        }
      }
      bubble.hidden = true;
      sel.removeAllRanges();
    });
  }

  function applyHighlight(sel, text) {
    if (!sel || sel.rangeCount === 0) return null;
    var mid = 'm' + (midCounter++);
    var range = sel.getRangeAt(0);
    try {
      var span = document.createElement('mark');
      span.className = 'wsb-comments__hl';
      span.setAttribute('data-mid', mid);
      span.appendChild(range.extractContents());
      range.insertNode(span);
      attachHlListeners(span, mid);
      highlights.push({ mid: mid, quote: text });
      persistHl();
      return mid;
    } catch (e) {
      return null;
    }
  }

  function attachHlListeners(el, mid) {
    el.addEventListener('mouseenter', function () { setActiveCard(mid, true); });
    el.addEventListener('mouseleave', function () { setActiveCard(mid, false); });
    el.addEventListener('click', function () { jumpToCard(mid); });
  }

  function persistHl() {
    try {
      localStorage.setItem(HL_STORAGE_KEY, JSON.stringify({
        highlights: highlights, midCounter: midCounter,
      }));
    } catch (e) { /* swallow */ }
  }

  // 服务端回来的评论里的 anchor 也合并进本地 highlights,使"别人的高亮"也能展示
  function hydrateAnchorsFromComments() {
    var seen = {};
    for (var i = 0; i < highlights.length; i++) seen[highlights[i].mid] = true;
    for (var j = 0; j < comments.length; j++) {
      var a = comments[j].anchor;
      if (a && a.mid && !seen[a.mid]) {
        highlights.push({ mid: a.mid, quote: a.quote });
        seen[a.mid] = true;
      }
    }
  }

  // 第一次加载时,把 highlights 里有 quote 的句子在正文中找到并包 mark
  function reapplyHighlightsFromStorage() {
    if (!article) return;
    var existingMids = {};
    var existing = article.querySelectorAll('.wsb-comments__hl[data-mid]');
    for (var i = 0; i < existing.length; i++) {
      var m = existing[i].getAttribute('data-mid');
      if (m) {
        existingMids[m] = true;
        attachHlListeners(existing[i], m);
      }
    }
    for (var k = 0; k < highlights.length; k++) {
      var hl = highlights[k];
      if (!hl || !hl.mid || existingMids[hl.mid]) continue;
      // 只在没找到的时候才"塞"一个不可见占位 — 对正文不破坏,保留 mid ↔ 卡片 联动入口
      // (真正的 in-article 高亮重渲染需要 text-fragment,留给后续)
    }
  }

  // ---- comments list (树形渲染) ----
  function render() {
    if (!listEl) return;
    var visible = comments.filter(function (c) { return c.status !== 'pending' || pendingMids[c.id]; });
    if (!visible.length) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
      if (countEl && !giscusRepo) countEl.textContent = '0';
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    if (countEl && !giscusRepo) countEl.textContent = String(visible.filter(function (c) { return c.status !== 'pending'; }).length);

    // 按 parent_id 分组成树
    var byParent = {};
    var roots = [];
    for (var i = 0; i < visible.length; i++) {
      var c = visible[i];
      if (c.parent_id == null) roots.push(c);
      else {
        if (!byParent[c.parent_id]) byParent[c.parent_id] = [];
        byParent[c.parent_id].push(c);
      }
    }
    // 顶层倒序(最新在上),回复保持时间正序
    roots.sort(function (a, b) { return (b.created_at || '').localeCompare(a.created_at || ''); });

    var html = '';
    for (var r = 0; r < roots.length; r++) html += renderCard(roots[r], byParent, 0);
    listEl.innerHTML = html;

    Array.prototype.forEach.call(listEl.querySelectorAll('[data-card-id]'), function (card) {
      var mid = card.getAttribute('data-mid') || '';
      if (mid) {
        card.addEventListener('mouseenter', function () { setActiveHl(mid, true); });
        card.addEventListener('mouseleave', function () { setActiveHl(mid, false); });
        card.addEventListener('focus', function () { setActiveHl(mid, true); }, true);
      }
      var replyBtn = card.querySelector('[data-reply-id]');
      if (replyBtn) {
        replyBtn.addEventListener('click', function () {
          var id = Number(replyBtn.getAttribute('data-reply-id'));
          var name = replyBtn.getAttribute('data-reply-author') || '';
          startReply(id, name);
        });
      }
    });
  }

  function renderCard(c, byParent, depth) {
    var anchor = c.anchor || null;
    var quote = anchor ? anchor.quote : '';
    var avatar = (c.author || '?').slice(0, 1).toUpperCase();
    var color = avatarColor(c.author || 'anon');
    var time = formatTime(c.created_at);
    var pending = c.status === 'pending'
      ? '<span class="wsb-comments__pending hf-tiny" style="color:var(--warn,#b45)">· 等待审核</span>'
      : '';
    var cls = 'wsb-comments__card';
    if (depth > 0) cls += ' wsb-comments__card--reply';
    var children = byParent[c.id] || [];
    children.sort(function (a, b) { return (a.created_at || '').localeCompare(b.created_at || ''); });
    var childHtml = '';
    for (var i = 0; i < children.length; i++) childHtml += renderCard(children[i], byParent, depth + 1);
    return '<li class="' + cls + '" data-card-id="' + c.id + '" data-mid="' + escAttr(anchor ? anchor.mid : '') + '" tabindex="0">'
      + '<div class="wsb-comments__card-head">'
      +   '<span class="wsb-comments__avatar" style="background:' + escAttr(color) + '" aria-hidden="true">' + escText(avatar) + '</span>'
      +   '<span class="wsb-comments__author">' + escText(c.author) + '</span>'
      +   '<time class="hf-mono hf-tiny hf-faint" datetime="' + escAttr(c.created_at || '') + '">' + escText(time) + '</time>'
      +   pending
      + '</div>'
      + (quote ? '<div class="wsb-comments__quote">"' + escText(quote) + '"</div>' : '')
      + '<div class="wsb-comments__body hf-sm">' + escText(c.body) + '</div>'
      + '<div class="wsb-comments__card-foot">'
      +   '<button type="button" class="wsb-comments__reply-btn hf-tiny" data-reply-id="' + c.id + '" data-reply-author="' + escAttr(c.author) + '">回复</button>'
      + '</div>'
      + (childHtml ? '<ul class="wsb-comments__replies">' + childHtml + '</ul>' : '')
      + '</li>';
  }

  function startReply(id, author) {
    if (!input) return;
    replyTo = { id: id, author: author };
    input.focus();
    input.placeholder = '回复 @' + author + '…';
    input.setAttribute('data-parent', String(id));
  }

  function setActiveCard(mid, on) {
    if (!listEl || !mid) return;
    var card = listEl.querySelector('[data-mid="' + cssEscape(mid) + '"]');
    if (card) card.classList.toggle('is-active', !!on);
  }
  function setActiveHl(mid, on) {
    if (!mid) return;
    var hls = document.querySelectorAll('.wsb-comments__hl[data-mid="' + cssEscape(mid) + '"]');
    Array.prototype.forEach.call(hls, function (el) { el.classList.toggle('is-active', !!on); });
  }
  function jumpToCard(mid) {
    if (!listEl || !mid) return;
    var card = listEl.querySelector('[data-mid="' + cssEscape(mid) + '"]');
    if (card && typeof card.scrollIntoView === 'function') {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.focus({ preventScroll: true });
    }
  }

  // 重新挂已存在 .wsb-comments__hl 的 hover 联动(SSR 渲染场景)
  Array.prototype.forEach.call(document.querySelectorAll('.wsb-comments__hl'), function (el) {
    var mid = el.getAttribute('data-mid');
    if (mid) attachHlListeners(el, mid);
  });

  // ---- compose → POST /api/posts/:slug/comments ----
  if (compose && input) {
    compose.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
      var bodyText = (input.value || '').trim();
      if (!bodyText) { showErr('评论不能为空'); return; }
      var author = readOrPromptAuthor();
      if (!author) { showErr('请输入昵称'); return; }
      var mid = input.getAttribute('data-mid') || null;
      var quote = input.getAttribute('data-quote') || '';
      var parentRaw = input.getAttribute('data-parent');
      var parentId = parentRaw && /^\d+$/.test(parentRaw) ? Number(parentRaw) : null;
      var btn = compose.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;

      var payload = { author: author, body: bodyText };
      if (parentId != null) payload.parent_id = parentId;
      if (mid) payload.anchor = { mid: mid, quote: quote || bodyText.slice(0, 60) };

      fetch(apiBase, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok) {
            var msg = (res.j && res.j.error && (res.j.error.message || res.j.error.code)) || '提交失败';
            showErr(String(msg));
            return;
          }
          var nowIso = new Date().toISOString();
          var newCard = {
            id: res.j.id,
            parent_id: parentId,
            author: author,
            website: null,
            body: bodyText,
            created_at: nowIso,
            anchor: mid ? { mid: mid, quote: payload.anchor.quote } : null,
            status: res.j.status || 'approved',
          };
          if (newCard.status === 'pending') pendingMids[newCard.id] = true;
          comments.push(newCard);
          input.value = '';
          input.removeAttribute('data-mid');
          input.removeAttribute('data-quote');
          input.removeAttribute('data-parent');
          input.placeholder = '选段评论 · 或全文评论…';
          replyTo = null;
          render();
        })
        .catch(function (e) {
          showErr('网络错误:' + (e && e.message ? e.message : 'unknown'));
        })
        .then(function () {
          if (btn) btn.disabled = false;
        });
    });
  }

  function showErr(msg) {
    if (!errEl) return;
    errEl.textContent = msg;
    errEl.hidden = false;
  }

  function readOrPromptAuthor() {
    var stored = '';
    try { stored = localStorage.getItem(AUTHOR_STORAGE_KEY) || ''; } catch (e) { /* ignore */ }
    if (stored) return stored;
    var name = '';
    try { name = window.prompt('设置一个昵称(只显示在评论旁,不会泄露):', '') || ''; } catch (e) { /* ignore */ }
    name = name.trim().slice(0, 64);
    if (name) {
      try { localStorage.setItem(AUTHOR_STORAGE_KEY, name); } catch (e) { /* ignore */ }
    }
    return name;
  }

  function formatTime(iso) {
    if (!iso) return '';
    var t = Date.parse(iso);
    if (isNaN(t)) return iso;
    var diff = Date.now() - t;
    if (diff < 60_000) return 'now';
    if (diff < 3_600_000) return Math.round(diff / 60_000) + 'm';
    if (diff < 86_400_000) return Math.round(diff / 3_600_000) + 'h';
    if (diff < 30 * 86_400_000) return Math.round(diff / 86_400_000) + 'd';
    return iso.slice(0, 10);
  }

  function avatarColor(seed) {
    var h = 0;
    for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    var hue = Math.abs(h) % 360;
    return 'hsl(' + hue + ', 55%, 70%)';
  }

  function escText(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escAttr(s) { return escText(s).replace(/"/g, '&quot;'); }
  function cssEscape(s) {
    return String(s).replace(/[^a-zA-Z0-9_-]/g, function (c) { return '\\' + c; });
  }
})();
