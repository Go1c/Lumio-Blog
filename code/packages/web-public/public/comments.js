/* WS-B 文章侧栏评论 — 飞书风划词高亮 + Giscus 后端
 *
 * - 选中正文文本 → 浮 bubble(复制 / 高亮 / 评论)
 * - 高亮 ↔ 评论卡片通过 data-mid 关联
 * - 评论 hover → 对应高亮 active
 * - 数据源:GitHub Discussions(经 giscus 客户端 fetch),UI 完全自定义
 *   注:此处用一个极简 fetch 替代 — 仅消费 giscus 暴露的简单 JSON 端点。
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

  var slug = root.getAttribute('data-slug') || location.pathname;
  var giscusRepo = root.getAttribute('data-giscus-repo') || '';

  // local-only highlights (持久化到 localStorage),作为划词演示
  var STORAGE_KEY = 'wsb-comments:' + slug;
  /** @type {{mid:string, quote:string, body:string, time:string, author:string, color:string, avatar:string}[]} */
  var comments = [];
  /** @type {{mid:string, quote:string, range: {start:number,end:number}}[]} */
  var highlights = [];
  var midCounter = 1;

  // ---- restore ----
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var saved = JSON.parse(raw);
      comments = (saved && saved.comments) || [];
      highlights = (saved && saved.highlights) || [];
      midCounter = (saved && saved.midCounter) || (comments.length + 1);
    }
  } catch (e) { /* ignore */ }

  // ---- giscus.js — 仅在配置存在时引入,作为后端可见性指示 ----
  if (giscusRepo) {
    var s = document.createElement('script');
    s.src = 'https://giscus.app/client.js';
    s.async = true;
    s.defer = true;
    s.crossOrigin = 'anonymous';
    s.setAttribute('data-repo', giscusRepo);
    s.setAttribute('data-repo-id', root.getAttribute('data-giscus-repo-id') || '');
    s.setAttribute('data-category', root.getAttribute('data-giscus-category') || 'Comments');
    s.setAttribute('data-category-id', root.getAttribute('data-giscus-category-id') || '');
    s.setAttribute('data-mapping', root.getAttribute('data-giscus-mapping') || 'pathname');
    s.setAttribute('data-emit-metadata', '1');
    s.setAttribute('data-input-position', 'bottom');
    s.setAttribute('data-theme', 'preferred_color_scheme');
    s.setAttribute('data-loading', 'lazy');
    // 我们自己的 UI 不渲染 giscus widget;但保留通信通道
    var hidden = document.createElement('div');
    hidden.style.display = 'none';
    hidden.appendChild(s);
    root.appendChild(hidden);

    // listen messages from giscus iframe
    window.addEventListener('message', function (ev) {
      if (!ev.data || ev.data.giscus == null) return;
      var d = ev.data.giscus;
      if (d.discussion) {
        var n = d.discussion.totalCommentCount || d.discussion.totalReplyCount || 0;
        if (countEl) countEl.textContent = String(n);
      }
    });

    if (loginLink) loginLink.href = 'https://github.com/' + giscusRepo + '/discussions';
  } else if (loginLink) {
    loginLink.removeAttribute('href');
    loginLink.setAttribute('aria-disabled', 'true');
  }

  // ---- selection bubble ----
  if (article && bubble) {
    document.addEventListener('selectionchange', function () {
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed) { bubble.hidden = true; return; }
      var range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
      if (!range || !article.contains(range.commonAncestorContainer)) {
        bubble.hidden = true;
        return;
      }
      var rect = range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        bubble.hidden = true;
        return;
      }
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
        applyHighlight(sel, text, null);
      } else if (action === 'comment') {
        var mid = applyHighlight(sel, text, null);
        if (mid && input) {
          input.focus();
          input.setAttribute('data-mid', mid);
          input.placeholder = '评论选中:"' + (text.length > 30 ? text.slice(0, 28) + '…' : text) + '"';
        }
      }
      bubble.hidden = true;
      sel.removeAllRanges();
    });
  }

  function applyHighlight(sel, text, mid) {
    if (!sel || sel.rangeCount === 0) return null;
    if (!mid) mid = 'm' + (midCounter++);
    var range = sel.getRangeAt(0);
    try {
      var span = document.createElement('mark');
      span.className = 'wsb-comments__hl';
      span.setAttribute('data-mid', mid);
      span.appendChild(range.extractContents());
      range.insertNode(span);
      span.addEventListener('mouseenter', function () { setActiveCard(mid, true); });
      span.addEventListener('mouseleave', function () { setActiveCard(mid, false); });
      span.addEventListener('click', function () { jumpToCard(mid); });
      highlights.push({ mid: mid, quote: text, range: { start: 0, end: 0 } });
      persist();
      return mid;
    } catch (e) {
      return null;
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        comments: comments, highlights: highlights, midCounter: midCounter,
      }));
    } catch (e) { /* swallow */ }
  }

  // ---- comments list ----
  function render() {
    if (!listEl) return;
    if (!comments.length) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
      if (countEl && !giscusRepo) countEl.textContent = '0';
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    if (countEl && !giscusRepo) countEl.textContent = String(comments.length);

    var html = '';
    for (var i = 0; i < comments.length; i++) {
      html += renderCard(comments[i]);
    }
    listEl.innerHTML = html;

    Array.prototype.forEach.call(listEl.querySelectorAll('[data-mid]'), function (card) {
      var mid = card.getAttribute('data-mid');
      card.addEventListener('mouseenter', function () { setActiveHl(mid, true); });
      card.addEventListener('mouseleave', function () { setActiveHl(mid, false); });
      card.addEventListener('focus', function () { setActiveHl(mid, true); }, true);
    });
  }

  function renderCard(c) {
    return '<li class="wsb-comments__card" data-mid="' + escAttr(c.mid) + '" tabindex="0">'
      + '<div class="wsb-comments__card-head">'
      +   '<span class="wsb-comments__avatar" style="background:' + escAttr(c.color) + '" aria-hidden="true">' + escText(c.avatar) + '</span>'
      +   '<span class="wsb-comments__author">' + escText(c.author) + '</span>'
      +   '<time class="hf-mono hf-tiny hf-faint">' + escText(c.time) + '</time>'
      + '</div>'
      + (c.quote ? '<div class="wsb-comments__quote">"' + escText(c.quote) + '"</div>' : '')
      + '<div class="wsb-comments__body hf-sm">' + escText(c.body) + '</div>'
      + '</li>';
  }

  function setActiveCard(mid, on) {
    if (!listEl) return;
    var card = listEl.querySelector('[data-mid="' + cssEscape(mid) + '"]');
    if (card) card.classList.toggle('is-active', !!on);
  }
  function setActiveHl(mid, on) {
    var hls = document.querySelectorAll('.wsb-comments__hl[data-mid="' + cssEscape(mid) + '"]');
    Array.prototype.forEach.call(hls, function (el) { el.classList.toggle('is-active', !!on); });
  }
  function jumpToCard(mid) {
    if (!listEl) return;
    var card = listEl.querySelector('[data-mid="' + cssEscape(mid) + '"]');
    if (card && typeof card.scrollIntoView === 'function') {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.focus({ preventScroll: true });
    }
  }

  // re-attach listeners on existing highlights (after reload, currently empty)
  Array.prototype.forEach.call(document.querySelectorAll('.wsb-comments__hl'), function (el) {
    var mid = el.getAttribute('data-mid');
    if (!mid) return;
    el.addEventListener('mouseenter', function () { setActiveCard(mid, true); });
    el.addEventListener('mouseleave', function () { setActiveCard(mid, false); });
    el.addEventListener('click', function () { jumpToCard(mid); });
  });

  // ---- compose (本地草稿;真正发送由 giscus iframe 处理或 future MCP) ----
  if (compose && input) {
    compose.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var body = (input.value || '').trim();
      if (!body) {
        if (errEl) {
          errEl.textContent = '评论不能为空';
          errEl.hidden = false;
        }
        return;
      }
      if (errEl) errEl.hidden = true;
      var mid = input.getAttribute('data-mid') || 'm' + (midCounter++);
      var hl = highlights.find(function (h) { return h.mid === mid; });
      comments.unshift({
        mid: mid,
        quote: hl ? hl.quote : '',
        body: body,
        time: 'just now',
        author: 'you',
        color: 'var(--ink-3)',
        avatar: 'Y',
      });
      input.value = '';
      input.removeAttribute('data-mid');
      input.placeholder = '选段评论 · 或全文评论…';
      persist();
      render();
    });
  }

  // initial paint
  render();

  // ---- helpers ----
  function escText(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escAttr(s) {
    return escText(s).replace(/"/g, '&quot;');
  }
  function cssEscape(s) {
    return String(s).replace(/[^a-zA-Z0-9_-]/g, function (c) { return '\\' + c; });
  }
})();
