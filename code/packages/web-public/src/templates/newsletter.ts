import type { SiteConfig } from '@opennote/core';
import { layout, esc } from './layout.js';

/**
 * Newsletter 订阅页 — Hero + 表单 + 往期(动态从 /api/newsletter/recent)
 *
 * 设计稿:doc/prototype/hf-extras.jsx §2 HFNewsletter
 *
 * - 表单 submit → POST /api/newsletter/subscribe(JSON)
 * - 失败 → role="alert" + aria-live 显示错误
 * - 无 JS fallback:`form action="/api/newsletter/subscribe"` POST,
 *   退化到第三方页(Buttondown / Listmonk URL 由 server 决定)
 */
export function renderNewsletter(config: SiteConfig): string {
  const author = config.author;
  const accentName =
    /(游戏|game|tech|dev)/i.exec(config.site.description ?? '')?.[0] ?? '深度';

  const body = `
    <div class="wsb-news" data-component="newsletter">
      <header class="wsb-news__head">
        <span class="ui-tag ui-tag--accent" style="font-size:12px"><span aria-hidden="true">📮</span> Newsletter</span>
        <h1 class="wsb-news__title">
          每周一封 <br>
          关于 <span class="wsb-news__accent">${esc(accentName)}</span> 的笔记
        </h1>
        <p class="wsb-news__intro">
          ${esc(author.name)} 把当月最值得读的几篇文章 + 一些没整理成文章的零碎想法整理成邮件发出来。
          <b>不卖课,不推销</b>,可随时退订。
        </p>
      </header>

      <section class="wsb-news__formwrap" aria-labelledby="wsb-news-form-h">
        <h2 id="wsb-news-form-h" class="sr-only">订阅表单</h2>
        <form
          class="wsb-news__form"
          id="wsb-news-form"
          action="/api/newsletter/subscribe"
          method="post"
          novalidate
        >
          <div class="wsb-news__field">
            <label for="wsb-news-email" class="sr-only">电子邮箱</label>
            <span class="wsb-news__field-icon" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3.5" width="12" height="9" rx="1.5"/><path d="m2.5 4.5 5.5 4 5.5-4"/></svg>
            </span>
            <input
              id="wsb-news-email"
              class="wsb-news__input"
              type="email"
              name="email"
              required
              autocomplete="email"
              inputmode="email"
              placeholder="your@email.com"
              aria-describedby="wsb-news-error"
            >
          </div>
          <button type="submit" class="ui-btn ui-btn--primary wsb-news__submit" data-submit>
            订阅 <span aria-hidden="true">→</span>
          </button>
          <p
            id="wsb-news-error"
            class="wsb-news__error hf-tiny"
            role="alert"
            aria-live="assertive"
            data-error
            hidden
          ></p>
          <p
            class="wsb-news__success hf-tiny"
            role="status"
            aria-live="polite"
            data-success
            hidden
          >已发送验证邮件,请查收。</p>
        </form>

        <label class="wsb-news__check hf-tiny hf-muted">
          <input type="checkbox" id="wsb-news-experimental" name="experimental" value="1">
          <span>我也想收到偶尔的<b>实验性内容</b>(草稿、还没成形的想法)</span>
        </label>
      </section>

      <!-- past issues — 客户端 JS 从 /api/newsletter/recent 填充 -->
      <section class="wsb-news__past" aria-labelledby="wsb-news-past-h">
        <h2 id="wsb-news-past-h" class="hf-mono hf-tiny wsb-news__past-h">▸ 往期回顾</h2>
        <ol class="wsb-news__past-list" data-recent aria-label="往期 newsletter">
          <li class="wsb-news__past-loading hf-tiny hf-faint">加载往期…</li>
        </ol>
        <div class="wsb-news__past-empty hf-tiny hf-muted" data-recent-empty hidden>
          暂无已发出的 issue。
        </div>
      </section>
    </div>

    <script>
    (function(){
      var form = document.getElementById('wsb-news-form');
      if (!form) return;
      var emailInput = document.getElementById('wsb-news-email');
      var errEl = form.querySelector('[data-error]');
      var okEl = form.querySelector('[data-success]');
      var btn = form.querySelector('[data-submit]');
      var experimental = document.getElementById('wsb-news-experimental');

      function setError(msg){
        if (!errEl) return;
        if (msg) {
          errEl.textContent = msg;
          errEl.hidden = false;
          if (emailInput) emailInput.setAttribute('aria-invalid','true');
        } else {
          errEl.hidden = true;
          errEl.textContent = '';
          if (emailInput) emailInput.removeAttribute('aria-invalid');
        }
      }
      function setOk(msg){
        if (!okEl) return;
        if (msg) { okEl.textContent = msg; okEl.hidden = false; }
        else { okEl.hidden = true; }
      }
      function isEmail(s){
        return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(s||'').trim());
      }

      form.addEventListener('submit', function(ev){
        ev.preventDefault();
        setError(''); setOk('');
        var email = emailInput && emailInput.value;
        if (!isEmail(email)) {
          setError('请输入有效的邮箱地址');
          if (emailInput) emailInput.focus();
          return;
        }
        btn && btn.setAttribute('disabled','true');
        var payload = { email: email, experimental: !!(experimental && experimental.checked) };
        fetch('/api/newsletter/subscribe', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'accept': 'application/json' },
          body: JSON.stringify(payload),
        }).then(function(r){
          if (r.ok) return r.json().catch(function(){ return {}; });
          return r.json().then(function(j){ throw j && j.error || { message: '订阅失败,请稍后再试' }; },
            function(){ throw { message: '订阅失败,请稍后再试' }; });
        }).then(function(){
          setOk('已发送验证邮件,请查收。');
          form.reset();
        }).catch(function(e){
          setError((e && e.message) || '订阅失败 — 你可以直接打开邮箱客户端发送一封空白邮件给作者。');
        }).then(function(){
          btn && btn.removeAttribute('disabled');
        });
      });

      // load recent issues
      var listEl = document.querySelector('[data-recent]');
      var emptyEl = document.querySelector('[data-recent-empty]');
      if (listEl) {
        fetch('/api/newsletter/recent', { headers: { accept: 'application/json' } })
          .then(function(r){ return r.ok ? r.json() : []; })
          .then(function(items){
            listEl.innerHTML = '';
            if (!items || !items.length) {
              if (emptyEl) emptyEl.hidden = false;
              return;
            }
            items.forEach(function(it){
              var li = document.createElement('li');
              li.className = 'wsb-news__past-row hf-hover';
              var d = (it && it.date) || '';
              var t = (it && it.title) || '(未命名)';
              var sub = (it && it.summary) || '';
              var url = (it && it.url) || '#';
              li.innerHTML = '<a class="wsb-news__past-link" href="'+url.replace(/"/g,'&quot;')+'">'
                + '<span class="hf-mono hf-tiny hf-faint wsb-news__past-date">'+d.replace(/[<>]/g,'')+'</span>'
                + '<span class="wsb-news__past-body">'
                +   '<span class="wsb-news__past-title">'+t.replace(/[<>]/g,'')+'</span>'
                +   (sub ? '<span class="hf-tiny hf-muted">'+sub.replace(/[<>]/g,'')+'</span>' : '')
                + '</span>'
                + '<span aria-hidden="true">→</span>'
                + '</a>';
              listEl.appendChild(li);
            });
          })
          .catch(function(){
            if (emptyEl) {
              emptyEl.textContent = '加载往期失败 — 服务暂不可用';
              emptyEl.hidden = false;
            }
            listEl.innerHTML = '';
          });
      }
    })();
    </script>`;

  return layout({
    title: `订阅 · ${esc(config.site.title)}`,
    description: `订阅 ${esc(author.name)} 的 newsletter`,
    config,
    body,
    active: '',
    path: '/newsletter/index.html',
  });
}
