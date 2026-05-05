/* WS-B 搜索客户端 bundle
 * - 200ms debounce 联想 → /api/search/suggest
 * - 完整请求 → /api/search
 * - facet:type / time
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-component="search"]');
  if (!root) return;

  var input = document.getElementById('wsb-search-input');
  var resultsList = root.querySelector('[data-results]');
  var emptyEl = root.querySelector('[data-empty]');
  var statusEl = document.getElementById('wsb-search-status');
  var suggestList = document.getElementById('wsb-search-suggest');
  var resultsPanel = document.getElementById('wsb-search-results');

  if (!input || !resultsList || !emptyEl || !statusEl || !suggestList || !resultsPanel) return;

  // 初始 query — 来自 ?q=...
  var qs = new URLSearchParams(location.search);
  var initialQ = qs.get('q') || '';
  if (initialQ) input.value = initialQ;

  var state = { q: initialQ, type: '', time: '' };

  // ---- facet wiring ----
  Array.prototype.forEach.call(root.querySelectorAll('[data-facet]'), function (group) {
    var key = group.getAttribute('data-facet');
    Array.prototype.forEach.call(group.querySelectorAll('input[type="radio"]'), function (radio) {
      radio.addEventListener('change', function () {
        if (!radio.checked) return;
        if (key === 'type') state.type = radio.value;
        if (key === 'time') state.time = radio.value;
        // visual active
        Array.prototype.forEach.call(group.querySelectorAll('.wsb-search__facet-item'), function (it) {
          it.classList.remove('is-active');
        });
        var label = radio.closest('.wsb-search__facet-item');
        if (label) label.classList.add('is-active');
        runSearch();
      });
    });
  });

  // ---- debounce ----
  function debounce(fn, ms) {
    var t = 0;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }

  // ---- suggest ----
  var suggestSeq = 0;
  function fetchSuggest() {
    var q = input.value.trim();
    if (!q || q.length < 2) {
      suggestList.hidden = true;
      suggestList.innerHTML = '';
      return;
    }
    var seq = ++suggestSeq;
    fetch('/api/search/suggest?q=' + encodeURIComponent(q), { headers: { accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (items) {
        if (seq !== suggestSeq) return;
        renderSuggest(Array.isArray(items) ? items : (items && items.suggestions) || []);
      })
      .catch(function () { /* swallow */ });
  }

  function renderSuggest(items) {
    if (!items.length) { suggestList.hidden = true; suggestList.innerHTML = ''; return; }
    var html = '';
    for (var i = 0; i < items.length && i < 8; i++) {
      var it = items[i];
      var label = typeof it === 'string' ? it : (it && it.text) || '';
      if (!label) continue;
      html += '<li role="option" data-suggest="' + escAttr(label) + '">' + esc(label) + '</li>';
    }
    suggestList.innerHTML = html;
    suggestList.hidden = !html;
  }

  suggestList.addEventListener('click', function (ev) {
    var t = ev.target;
    while (t && t !== suggestList && t.getAttribute && !t.getAttribute('data-suggest')) t = t.parentNode;
    if (t && t.getAttribute) {
      var v = t.getAttribute('data-suggest');
      if (v) {
        input.value = v;
        suggestList.hidden = true;
        runSearch();
      }
    }
  });

  // ---- search ----
  var searchSeq = 0;
  function runSearch() {
    state.q = input.value.trim();
    if (!state.q) {
      resultsList.hidden = true;
      resultsList.innerHTML = '';
      emptyEl.hidden = false;
      statusEl.textContent = '';
      // also clear querystring without reload
      try { history.replaceState({}, '', location.pathname); } catch (e) { /* ignore */ }
      return;
    }
    emptyEl.hidden = true;
    resultsPanel.setAttribute('aria-busy', 'true');
    statusEl.textContent = '搜索中…';

    var url = '/api/search?q=' + encodeURIComponent(state.q);
    if (state.type) url += '&type=' + encodeURIComponent(state.type);
    if (state.time) {
      var tr = timeRange(state.time);
      if (tr.from) url += '&from=' + encodeURIComponent(tr.from);
      if (tr.to) url += '&to=' + encodeURIComponent(tr.to);
    }
    var seq = ++searchSeq;
    var t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    fetch(url, { headers: { accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : { results: [] }; })
      .then(function (j) {
        if (seq !== searchSeq) return;
        var t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        var elapsed = ((t1 - t0) / 1000).toFixed(2);
        renderResults(j, elapsed);
      })
      .catch(function () {
        if (seq !== searchSeq) return;
        statusEl.textContent = '搜索失败,请重试';
      })
      .then(function () {
        resultsPanel.setAttribute('aria-busy', 'false');
      });

    // sync querystring
    try {
      var qs2 = new URLSearchParams();
      qs2.set('q', state.q);
      if (state.type) qs2.set('type', state.type);
      if (state.time) qs2.set('time', state.time);
      history.replaceState({}, '', location.pathname + '?' + qs2.toString());
    } catch (e) { /* ignore */ }
  }

  function renderResults(j, elapsed) {
    var items = (j && Array.isArray(j.hits)) ? j.hits : [];

    var total = (j && typeof j.total === 'number') ? j.total : items.length;
    var facetsType = (j && j.facets && j.facets.type) ? j.facets.type : null;
    if (facetsType) {
      updateFacetCounts({ all: total, post: facetsType.post || 0, note: facetsType.note || 0, tag: facetsType.tag || 0, media: facetsType.media || 0 });
    }
    statusEl.textContent = total + ' 个结果 · ' + elapsed + 's';

    if (!items.length) {
      resultsList.hidden = true;
      resultsList.innerHTML = '';
      emptyEl.hidden = false;
      emptyEl.querySelector('p').textContent = '没有匹配的内容';
      return;
    }

    var html = '';
    for (var i = 0; i < items.length; i++) {
      html += renderResult(items[i]);
    }
    resultsList.innerHTML = html;
    resultsList.hidden = false;
  }

  function renderResult(r) {
    if (!r) return '';
    var type = r.type || 'post';
    var typeLabel = type === 'note' ? '笔记' : type === 'tag' ? '标签' : '文章';
    var date = r.date || r.published_at || '';
    var iso = (date || '').slice(0, 10);
    var title = r.title_html || esc(r.title || '');
    var excerpt = r.excerpt_html || esc(r.excerpt || r.summary || '');
    var slug = r.slug || '';
    var href = r.url || (type === 'tag' ? '/tags/' + encodeURIComponent(slug) + '.html' : '/posts/' + encodeURIComponent(slug) + '.html');
    var mins = r.reading_minutes ? r.reading_minutes + ' min' : '';
    var tags = (r.tags || []).slice(0, 3).map(function (t) {
      return '<a class="ui-tag" style="font-size:10px" href="/tags/' + encodeURIComponent(t) + '.html">#' + esc(t) + '</a>';
    }).join('');

    return '<li class="wsb-search__result">'
      + '<article>'
      +   '<div class="wsb-search__result-meta">'
      +     '<span class="ui-tag' + (type === 'post' ? ' ui-tag--accent' : '') + '" style="font-size:10px">' + esc(typeLabel) + '</span>'
      +     (iso ? '<time class="hf-mono hf-tiny hf-faint" datetime="' + escAttr(iso) + '">' + esc(iso) + '</time>' : '')
      +     (mins ? '<span class="hf-mono hf-tiny hf-faint">· ' + esc(mins) + '</span>' : '')
      +   '</div>'
      +   '<h3 class="wsb-search__result-title"><a href="' + escAttr(href) + '">' + title + '</a></h3>'
      +   (excerpt ? '<p class="wsb-search__result-excerpt hf-sm hf-muted">' + excerpt + '</p>' : '')
      +   (tags ? '<div class="wsb-search__result-tags">' + tags + '</div>' : '')
      + '</article>'
      + '</li>';
  }

  function updateFacetCounts(counts) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-facet="type"] .wsb-search__facet-item'), function (label) {
      var radio = label.querySelector('input[type="radio"]');
      var countEl = label.querySelector('[data-count]');
      if (!radio || !countEl) return;
      var k = radio.value || 'all';
      var n = (counts && (counts[k] != null ? counts[k] : (k === 'all' ? counts.total : 0))) || 0;
      countEl.textContent = String(n);
    });
  }

  function timeRange(key) {
    if (!key) return {};
    var now = new Date();
    var from = new Date(now);
    if (key === '7d') from.setDate(from.getDate() - 7);
    else if (key === '30d') from.setDate(from.getDate() - 30);
    else if (key === '1y') from.setFullYear(from.getFullYear() - 1);
    return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escAttr(s) {
    return esc(s).replace(/"/g, '&quot;');
  }

  // ---- input wiring ----
  var debouncedSuggest = debounce(fetchSuggest, 200);
  var debouncedSearch = debounce(runSearch, 250);
  input.addEventListener('input', function () {
    debouncedSuggest();
    debouncedSearch();
  });
  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') {
      input.value = '';
      suggestList.hidden = true;
      runSearch();
    }
    if (ev.key === 'Enter') {
      ev.preventDefault();
      suggestList.hidden = true;
      runSearch();
    }
  });
  document.addEventListener('click', function (ev) {
    if (suggestList.hidden) return;
    if (ev.target === input || suggestList.contains(ev.target)) return;
    suggestList.hidden = true;
  });

  // initial run
  if (initialQ) runSearch();
})();
