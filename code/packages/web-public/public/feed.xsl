<?xml version="1.0" encoding="UTF-8"?>
<!--
  XSL stylesheet for browsers that open /feed.xml directly.
  RSS readers ignore this file; only browsers apply the transform.
  WS-C
-->
<xsl:stylesheet
  version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" indent="yes" encoding="UTF-8"
    doctype-system="about:legacy-compat"/>

  <xsl:template match="/">
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <title>
          <xsl:value-of select="rss/channel/title"/>
          <xsl:text> · RSS</xsl:text>
        </title>
        <meta name="robots" content="noindex"/>
        <style>
          :root {
            --bg: #ffffff; --bg-soft: #fafafa; --bg-sunk: #f5f5f5;
            --line: #ececec; --line-strong: #d4d4d4;
            --ink: #0a0a0a; --ink-2: #404040; --ink-3: #595959; --ink-4: #707070;
            --accent: #0066ff; --accent-soft: #e6efff;
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --bg: #0a0a0a; --bg-soft: #111111; --bg-sunk: #1a1a1a;
              --line: #262626; --line-strong: #404040;
              --ink: #fafafa; --ink-2: #d4d4d4; --ink-3: #b8b8b8; --ink-4: #8a8a8a;
              --accent: #4d8dff; --accent-soft: #0e2547;
            }
          }
          * { box-sizing: border-box; }
          body {
            margin: 0; padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
            background: var(--bg); color: var(--ink); line-height: 1.6;
            -webkit-font-smoothing: antialiased;
          }
          .wrap { max-width: 760px; margin: 0 auto; padding: 32px 20px 64px; }
          .banner {
            padding: 14px 16px; margin-bottom: 28px;
            background: var(--accent-soft); color: var(--accent);
            border-radius: 8px; font-size: 13px; line-height: 1.55;
          }
          .banner b { color: var(--accent); }
          .banner a { color: var(--accent); text-decoration: underline; }
          .head { margin-bottom: 32px; padding-bottom: 18px; border-bottom: 1px solid var(--line); }
          .head__pre {
            display: inline-block;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: 11px; color: var(--ink-4);
            text-transform: uppercase; letter-spacing: .05em;
            margin-bottom: 6px;
          }
          .head__title {
            font-size: 32px; font-weight: 800; margin: 0 0 8px;
            letter-spacing: -0.01em; line-height: 1.2;
          }
          .head__desc { color: var(--ink-3); font-size: 15px; margin: 0; }
          .head__home {
            display: inline-block; margin-top: 14px;
            color: var(--accent); text-decoration: none;
            font-size: 14px; font-weight: 500;
          }
          .head__home:hover { text-decoration: underline; }
          .sec-h {
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: 11px; color: var(--ink-4);
            text-transform: uppercase; letter-spacing: .05em;
            margin: 0 0 10px;
          }
          .items { list-style: none; padding: 0; margin: 0; }
          .item {
            padding: 16px 0; border-bottom: 1px solid var(--line);
          }
          .item:last-child { border-bottom: 0; }
          .item__date {
            display: block;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-size: 11px; color: var(--ink-4); margin-bottom: 4px;
          }
          .item__title {
            font-size: 17px; font-weight: 600;
            margin: 0 0 4px; line-height: 1.4;
          }
          .item__title a { color: var(--ink); text-decoration: none; }
          .item__title a:hover { color: var(--accent); }
          .item__desc { color: var(--ink-3); font-size: 14px; margin: 4px 0 0; line-height: 1.55; }
          .empty { color: var(--ink-3); font-style: italic; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="banner" role="note">
            <b>这是一个 RSS feed。</b>
            把这个 URL 粘进 RSS 阅读器以订阅。
            还没有阅读器?
            <a>
              <xsl:attribute name="href">
                <xsl:value-of select="rss/channel/link"/>
                <xsl:text>/feed/index.html</xsl:text>
              </xsl:attribute>
              看看推荐工具
            </a>。
          </div>

          <header class="head">
            <div class="head__pre">RSS · 订阅源</div>
            <h1 class="head__title">
              <xsl:value-of select="rss/channel/title"/>
            </h1>
            <p class="head__desc">
              <xsl:value-of select="rss/channel/description"/>
            </p>
            <a class="head__home">
              <xsl:attribute name="href">
                <xsl:value-of select="rss/channel/link"/>
              </xsl:attribute>
              访问网站 →
            </a>
          </header>

          <h2 class="sec-h">▸ 最新条目</h2>
          <ul class="items">
            <xsl:choose>
              <xsl:when test="rss/channel/item">
                <xsl:for-each select="rss/channel/item">
                  <li class="item">
                    <span class="item__date">
                      <xsl:value-of select="pubDate"/>
                    </span>
                    <h3 class="item__title">
                      <a>
                        <xsl:attribute name="href">
                          <xsl:value-of select="link"/>
                        </xsl:attribute>
                        <xsl:value-of select="title"/>
                      </a>
                    </h3>
                    <xsl:if test="description">
                      <p class="item__desc">
                        <xsl:value-of select="description"/>
                      </p>
                    </xsl:if>
                  </li>
                </xsl:for-each>
              </xsl:when>
              <xsl:otherwise>
                <li class="empty">还没有条目。</li>
              </xsl:otherwise>
            </xsl:choose>
          </ul>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
