/* 文章评论 — 不登录,一个名字框 + 骰子,本地后端 (/api/posts/:slug/comments)
 *
 * 设计稿:doc/prototype/hub-v1/index.html 的 data-cmt 段(职能下拉已去掉);说明见 doc/devdoc/blog-hub-plan.md §3.5
 *
 * - 骰子随机出完整名字 = 「某职能的苦逼瞬间」+「该职能」,前后对应;连点不和当前名字重复
 * - 首次进入自动随机一个;名字可自己改写;完整名字记在本机 localStorage,下次自动带上
 * - GET 拉 approved 列表;POST 默认直接公开,自己的评论插到最上面(服务端若返回 pending 则标「· 审核后公开」)
 * - 用户文本一律走 textContent,不拼 innerHTML
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-cmt]');
  if (!root) return;

  var form = root.querySelector('[data-cmt-form]');
  var nameEl = root.querySelector('[data-cmt-name]');
  var bodyEl = root.querySelector('[data-cmt-body]');
  var errEl = root.querySelector('[data-cmt-err]');
  var avatarEl = root.querySelector('[data-cmt-avatar]');
  var diceEl = root.querySelector('[data-cmt-dice]');
  var sendEl = root.querySelector('[data-cmt-send]');
  var listEl = root.querySelector('[data-cmt-list]');
  var emptyEl = root.querySelector('[data-cmt-empty]');
  var countEl = root.querySelector('[data-cmt-count]');
  if (!form || !nameEl || !bodyEl || !listEl) return;

  var slug = root.getAttribute('data-slug') || location.pathname.replace(/^\/posts\/|\.html$/g, '');
  var apiBase = '/api/posts/' + encodeURIComponent(slug) + '/comments';
  var NAME_KEY = 'lumio-comment-name';

  var PAINS = {
    '客户端': ['打包等了一小时的', '写完代码没人测的', '真机上又闪退的', '被说「这很简单」的', 'UI 又改了一版的'],
    '服务端': ['凌晨被报警叫醒的', '合服合了一整夜的', '改 Bug 改出新 Bug 的', '被说「服务器又卡了」的'],
    '策划': ['改了第 8 版需求的', '需求评审又没过的', '被要求「参考原神」的', '写的文档没人看的', '方案 B 也被否了的'],
    '数值策划': ['表格又被改崩的', '被玩家骂太肝的', '平衡调了一个通宵的', '公式写了三屏的'],
    '关卡策划': ['地图第 5 次推倒重来的', '自己都通不了关的', '被说「不好玩」的', '摆了一天怪的'],
    '美术': ['返工第 9 版的', '被要「五彩斑斓的黑」的', '改到最后用了第一版的', '被说「再大气一点」的'],
    '动画': ['一个动作 K 了一周的', '被说「打击感不够」的', '骨骼又被改了的'],
    'TA': ['帧率又掉了的', 'Shader 编译了一上午的', '被美术和程序两头夹的'],
    'QA': ['Bug 被说「无法复现」的', '上线前测了通宵的', '提的 Bug 被标「不修」的'],
    '运营': ['半夜回玩家消息的', '活动配置又出错的', '替服务器背锅的', '周报写了三小时的'],
    '制作人': ['开了一天会的', '被拉进 37 个群的', '等版号的', '版本又延期的']
  };
  var ROLES = Object.keys(PAINS);
  // 判断名字以哪个职能结尾时,长的先比(「数值策划」要先于「策划」)
  var ROLES_BY_LEN = ROLES.slice().sort(function (a, b) { return b.length - a.length; });

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  // 先随机职能,再从该职能的苦逼瞬间里随机一条,拼成完整名字
  function randomName() {
    var role = pick(ROLES);
    return pick(PAINS[role]) + role;
  }
  function rollName() {
    var cur = nameEl.value.trim(), next = randomName();
    while (next === cur) next = randomName();
    nameEl.value = next;
  }
  function syncAvatar() { if (avatarEl) avatarEl.textContent = avatarFor(nameEl.value.trim()); }
  function clearErr() { if (errEl) errEl.textContent = ''; }
  function showErr(msg) { if (errEl) errEl.textContent = msg; }
  function saveName() {
    try { localStorage.setItem(NAME_KEY, nameEl.value.trim()); } catch (e) { /* ignore */ }
  }

  // ---- 恢复名字;首次进入随机一个 ----
  var saved = '';
  try { saved = localStorage.getItem(NAME_KEY) || ''; } catch (e) { saved = ''; }
  saved = String(saved).trim();
  if (saved) nameEl.value = saved.slice(0, 40);
  else { rollName(); saveName(); }
  syncAvatar();

  nameEl.addEventListener('input', function () { syncAvatar(); clearErr(); saveName(); });
  if (diceEl) diceEl.addEventListener('click', function () { rollName(); syncAvatar(); clearErr(); saveName(); });
  bodyEl.addEventListener('input', clearErr);

  // ---- 列表 ----
  // 名字以已知职能结尾就用职能第一个字,否则用名字第一个字
  function avatarFor(name) {
    var n = String(name || '');
    for (var k = 0; k < ROLES_BY_LEN.length; k++) {
      var r = ROLES_BY_LEN[k];
      if (n.length > r.length && n.slice(-r.length) === r) return r.charAt(0);
    }
    return n.charAt(0) || '?';
  }

  function relTime(iso) {
    var t = Date.parse(iso || '');
    if (isNaN(t)) return '';
    var diff = Date.now() - t;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
    var days = Math.floor(diff / 86400000);
    if (days < 2) return '昨天';
    if (days < 30) return days + ' 天前';
    var d = new Date(t);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function buildItem(c, pending) {
    var li = el('li', 'cmt__item');
    li.appendChild(el('span', 'cmt__avatar', avatarFor(c.author))).setAttribute('aria-hidden', 'true');
    var main = el('div', 'cmt__main');
    var meta = el('div', 'cmt__meta');
    meta.appendChild(el('b', '', c.author));
    var time = el('time', '', relTime(c.created_at));
    if (c.created_at) time.setAttribute('datetime', c.created_at);
    meta.appendChild(time);
    if (pending) meta.appendChild(el('em', '', '· 审核后公开'));
    main.appendChild(meta);
    main.appendChild(el('p', '', c.body));
    li.appendChild(main);
    return li;
  }

  var publicCount = 0;
  function syncEmpty() {
    if (emptyEl) emptyEl.hidden = listEl.children.length > 0;
    if (countEl) countEl.textContent = String(publicCount);
  }

  fetch(apiBase, { headers: { accept: 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : { comments: [] }; })
    .catch(function () { return { comments: [] }; })
    .then(function (data) {
      var list = (data && data.comments) || [];
      list = list.slice().sort(function (a, b) { return String(b.created_at || '').localeCompare(String(a.created_at || '')); });
      publicCount = list.length;
      // 自己刚发的(若已在列表顶部)保持在最上面,公开评论接在后面
      for (var j = 0; j < list.length; j++) listEl.appendChild(buildItem(list[j], false));
      syncEmpty();
    });

  // ---- 发布 ----
  var busy = false;
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (busy) return;
    var body = bodyEl.value.trim();
    if (!body) { showErr('写点内容再发'); bodyEl.focus(); return; }
    clearErr();
    // 名字被清空时兜底成随机一个
    if (!nameEl.value.trim()) { rollName(); syncAvatar(); }
    var author = nameEl.value.trim();
    saveName();
    busy = true;
    if (sendEl) sendEl.disabled = true;

    fetch(apiBase, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ author: author, body: body })
    })
      .then(function (r) {
        return r.json().catch(function () { return null; }).then(function (j) { return { ok: r.ok, status: r.status, j: j }; });
      })
      .then(function (res) {
        if (!res.ok) {
          showErr(res.status === 429 ? '发得太快了，稍后再试' : '发布失败，稍后再试');
          return;
        }
        var pending = !(res.j && res.j.status === 'approved');
        if (!pending) publicCount++;
        listEl.insertBefore(buildItem({ author: author, body: body, created_at: new Date().toISOString() }, pending), listEl.firstChild);
        bodyEl.value = '';
        syncEmpty();
      }, function () {
        showErr('网络出错，稍后再试');
      })
      .then(function () {
        busy = false;
        if (sendEl) sendEl.disabled = false;
      });
  });
})();
