/* Lumio search results
 * - Uses the shared top nav search field.
 * - Fetches real data from /api/search and /api/search/suggest.
 * - Renders results with the design handoff .arow list row.
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-component="search"]');
  if (!root) return;

  var navSearch = document.querySelector('.nav .search');
  var input = navSearch ? navSearch.querySelector('input[name="q"], input[type="search"], input') : null;
  var resultsList = root.querySelector('[data-results]');
  var emptyEl = root.querySelector('[data-empty]');
  var statusEl = document.getElementById('wsb-search-status');
  var suggestList = document.getElementById('wsb-search-suggest');
  var resultsPanel = document.getElementById('wsb-search-results');
  var queryTitle = document.getElementById('wsb-search-query');
  var filterForm = root.querySelector('[data-search-filters]');
  var typeInputs = filterForm ? filterForm.querySelectorAll('input[name="type"]') : [];
  var fromInput = filterForm ? filterForm.querySelector('[data-filter-from]') : null;
  var toInput = filterForm ? filterForm.querySelector('[data-filter-to]') : null;
  var tagSelect = filterForm ? filterForm.querySelector('[data-filter-tags]') : null;
  var clearFiltersBtn = filterForm ? filterForm.querySelector('[data-filter-clear]') : null;

  if (!navSearch || !input || !resultsList || !emptyEl || !statusEl || !suggestList || !resultsPanel) return;

  navSearch.classList.add('search--active');
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('spellcheck', 'false');
  input.setAttribute('aria-controls', 'wsb-search-results');
  input.setAttribute('aria-describedby', 'wsb-search-status');

  var clearBtn = document.createElement('button');
  clearBtn.className = 'search__clear';
  clearBtn.type = 'button';
  clearBtn.setAttribute('aria-label', '清除');
  clearBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"></path></svg>';
  navSearch.appendChild(clearBtn);

  var qs = new URLSearchParams(location.search);
  var initialQ = qs.get('q') || '';
  if (initialQ) input.value = initialQ;
  hydrateFiltersFromUrl();
  setQueryTitle(input.value.trim());

  function debounce(fn, ms) {
    var t = 0;
    return function () {
      var args = arguments;
      var self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }

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
      .catch(function () {
        suggestList.hidden = true;
      });
  }

  function renderSuggest(items) {
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
    if (!t || !t.getAttribute) return;
    var value = t.getAttribute('data-suggest');
    if (!value) return;
    input.value = value;
    suggestList.hidden = true;
    runSearch();
  });

  var searchSeq = 0;
  function runSearch() {
    var q = input.value.trim();
    setQueryTitle(q);

    if (!q) {
      resultsList.hidden = true;
      resultsList.innerHTML = '';
      emptyEl.hidden = false;
      setEmptyText('输入关键词开始搜索');
      statusEl.textContent = '输入关键词开始搜索';
      writeUrlState('');
      return;
    }

    emptyEl.hidden = true;
    resultsPanel.setAttribute('aria-busy', 'true');
    statusEl.textContent = '搜索中...';

    var seq = ++searchSeq;
    var started = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    fetch(buildSearchUrl(q), { headers: { accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : { hits: [], total: 0 }; })
      .then(function (data) {
        if (seq !== searchSeq) return;
        var ended = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        renderResults(data, ((ended - started) / 1000).toFixed(2));
      })
      .catch(function () {
        if (seq !== searchSeq) return;
        resultsList.hidden = true;
        emptyEl.hidden = false;
        setEmptyText('搜索失败,请重试');
        statusEl.textContent = '搜索失败,请重试';
      })
      .then(function () {
        resultsPanel.setAttribute('aria-busy', 'false');
      });

    writeUrlState(q);
  }

  function readFilters() {
    var type = '';
    for (var i = 0; i < typeInputs.length; i++) {
      if (typeInputs[i].checked) {
        type = typeInputs[i].value || '';
        break;
      }
    }
    return {
      type: type,
      from: fromInput ? String(fromInput.value || '').trim() : '',
      to: toInput ? String(toInput.value || '').trim() : '',
      tags: tagSelect ? String(tagSelect.value || '').trim() : '',
    };
  }

  function buildSearchUrl(q) {
    var params = new URLSearchParams();
    var filters = readFilters();
    params.set('q', q);
    if (filters.type) params.set('type', filters.type);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.tags) params.set('tags', filters.tags);
    return '/api/search?' + params.toString();
  }

  function writeUrlState(q) {
    try {
      var params = new URLSearchParams();
      var filters = readFilters();
      if (q) params.set('q', q);
      if (filters.type) params.set('type', filters.type);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (filters.tags) params.set('tags', filters.tags);
      var next = params.toString();
      history.replaceState({}, '', location.pathname + (next ? '?' + next : ''));
    } catch (e) {}
  }

  function hydrateFiltersFromUrl() {
    var type = qs.get('type') || '';
    var matchedType = false;
    for (var i = 0; i < typeInputs.length; i++) {
      var isMatch = typeInputs[i].value === type;
      typeInputs[i].checked = isMatch;
      matchedType = matchedType || isMatch;
    }
    if (!matchedType && typeInputs.length) typeInputs[0].checked = true;
    if (fromInput) fromInput.value = qs.get('from') || '';
    if (toInput) toInput.value = qs.get('to') || '';
    if (tagSelect) tagSelect.value = qs.get('tags') || '';
  }

  function renderResults(data, elapsed) {
    var hits = data && Array.isArray(data.hits) ? data.hits : [];
    var total = data && typeof data.total === 'number' ? data.total : hits.length;
    statusEl.innerHTML = '找到 <b>' + total + '</b> 条相关结果 · ' + esc(elapsed) + 's';

    if (!hits.length) {
      resultsList.hidden = true;
      resultsList.innerHTML = '';
      emptyEl.hidden = false;
      setEmptyText('没有匹配的内容');
      return;
    }

    resultsList.innerHTML = hits.map(renderResult).join('');
    resultsList.hidden = false;
  }

  function renderResult(hit, index) {
    var type = hit && hit.type ? hit.type : 'post';
    var typeLabel = type === 'tag' ? '标签' : type === 'note' ? '笔记' : '文章';
    var slug = hit && hit.slug ? hit.slug : '';
    var href = hit && hit.url
      ? hit.url
      : type === 'tag'
        ? '/tags/' + encodeURIComponent(slug) + '.html'
        : '/posts/' + encodeURIComponent(slug) + '.html';
    var date = (hit && (hit.date || hit.published_at || hit.updated_at) || '').slice(0, 10);
    var title = safeMarked(hit && (hit.title_html || hit.title) || '未命名', !!(hit && hit.title_html));
    var rawExcerpt = hit && (hit.excerpt_html || hit.excerpt || hit.summary)
      ? (hit.excerpt_html || hit.excerpt || hit.summary)
      : Array.isArray(hit && hit.snippets) ? hit.snippets.join(' ') : '';
    var excerpt = safeMarked(rawExcerpt, !!(hit && hit.excerpt_html) || Array.isArray(hit && hit.snippets));
    var category = (hit && hit.tags && hit.tags[0]) || typeLabel;
    var tone = toneByIndex(index);
    var mins = hit && hit.reading_minutes ? hit.reading_minutes + ' 分钟' : '';
    var views = hit && typeof hit.views === 'number'
      ? Math.max(0, Math.trunc(hit.views))
      : null;
    var viewMeta = views === null
      ? ''
      : '<span>' + eyeIcon() + esc(formatViews(views)) + ' 阅读</span>';

    return ''
      + '<a class="arow" href="' + escAttr(href) + '">'
      +   '<span class="arow__thumb thumb ' + tone + '">'
      +     '<span class="thumb__grid" aria-hidden="true"></span>'
      +     '<span class="thumb__art" aria-hidden="true">' + artForTone(tone, index) + '</span>'
      +   '</span>'
      +   '<span class="arow__body">'
      +     '<span class="arow__head">'
      +       '<span class="arow__title">' + title + '</span>'
      +       '<span class="tag-inline' + tagTone(tone) + '">' + esc(category) + '</span>'
      +     '</span>'
      +     (excerpt ? '<span class="arow__dek">' + excerpt + '</span>' : '<span class="arow__dek">搜索结果来自真实文章索引。</span>')
      +     '<span class="arow__meta">'
      +       '<span class="arow__author">' + userIcon() + 'Lumio</span>'
      +       (date ? '<span>' + calendarIcon() + esc(date) + '</span>' : '')
      +       (mins ? '<span>' + clockIcon() + esc(mins) + '</span>' : '')
      +       viewMeta
      +     '</span>'
      +   '</span>'
      + '</a>';
  }

  function setQueryTitle(value) {
    if (!queryTitle) return;
    queryTitle.textContent = value || '输入关键词';
  }

  function setEmptyText(value) {
    var p = emptyEl.querySelector('p');
    if (p) p.textContent = value;
  }

  function safeMarked(value, isHtml) {
    var raw = String(value == null ? '' : value);
    if (!isHtml) return esc(raw);
    return esc(raw)
      .replace(/&lt;mark&gt;/g, '<mark class="hl">')
      .replace(/&lt;mark class=&quot;cm-highlight&quot;&gt;/g, '<mark class="hl">')
      .replace(/&lt;\/mark&gt;/g, '</mark>');
  }

  function toneByIndex(index) {
    return ['t-blue', 't-mint', 't-amber', 't-violet', 't-sky', 't-rose'][index % 6];
  }

  function formatViews(views) {
    if (views >= 1000) {
      return (views / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return String(views);
  }

  function tagTone(tone) {
    if (tone === 't-mint') return ' s-mint';
    if (tone === 't-amber') return ' s-amber';
    if (tone === 't-violet') return ' s-violet';
    if (tone === 't-sky') return ' s-sky';
    if (tone === 't-rose') return ' s-rose';
    return '';
  }

  function artForTone(tone, index) {
    if (tone === 't-mint') return '<span class="cube c-mint float" style="--s:32px;left:50%;top:46%;margin:-16px 0 0 -16px;animation-delay:-' + (index % 3) + 's;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></span>';
    if (tone === 't-amber') return '<span class="orb" style="left:30%;top:22%;width:40px;height:40px;"></span>';
    if (tone === 't-violet') return '<span class="cube float" style="--s:24px;left:30%;top:36%;--t:#D9D2FF;--r:#B5A6FF;--l:#8E76F0;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></span><span class="cube float" style="--s:24px;left:54%;top:52%;--t:#D9D2FF;--r:#B5A6FF;--l:#8E76F0;animation-delay:-1.6s;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></span>';
    if (tone === 't-sky') return '<span class="cube float" style="--s:24px;left:30%;top:38%;--t:#BFE6FF;--r:#86C8FF;--l:#4FA0E8;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></span><span class="cube float" style="--s:24px;left:56%;top:52%;--t:#BFE6FF;--r:#86C8FF;--l:#4FA0E8;animation-delay:-1s;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></span>';
    if (tone === 't-rose') return '<span class="cube c-pink float" style="--s:32px;left:50%;top:46%;margin:-16px 0 0 -16px;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></span>';
    return '<span class="cube float" style="--s:30px;left:42%;top:38%;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></span><span class="cube c-mint float" style="--s:22px;left:56%;top:56%;animation-delay:-1.4s;"><i class="f-t"></i><i class="f-l"></i><i class="f-r"></i></span>';
  }

  function userIcon() {
    return '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="9" r="3.4"></circle><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"></path></svg>';
  }

  function calendarIcon() {
    return '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="10" rx="1.5"></rect><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" stroke-linecap="round"></path></svg>';
  }

  function clockIcon() {
    return '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="8" cy="8" r="5.5"></circle><path d="M8 5v3l2 1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
  }

  function eyeIcon() {
    return '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M8 3C4.5 3 2 8 2 8s2.5 5 6 5 6-5 6-5-2.5-5-6-5z"></path><circle cx="8" cy="8" r="2"></circle></svg>';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escAttr(s) {
    return esc(s).replace(/"/g, '&quot;');
  }

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

  clearBtn.addEventListener('click', function () {
    input.value = '';
    suggestList.hidden = true;
    input.focus();
    runSearch();
  });

  if (filterForm) {
    filterForm.addEventListener('change', runSearch);
  }
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', function () {
      for (var i = 0; i < typeInputs.length; i++) typeInputs[i].checked = i === 0;
      if (fromInput) fromInput.value = '';
      if (toInput) toInput.value = '';
      if (tagSelect) tagSelect.value = '';
      runSearch();
    });
  }

  document.addEventListener('click', function (ev) {
    if (suggestList.hidden) return;
    if (ev.target === input || suggestList.contains(ev.target)) return;
    suggestList.hidden = true;
  });

  if (initialQ) runSearch();
})();
