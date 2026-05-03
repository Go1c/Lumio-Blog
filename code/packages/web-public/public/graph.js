/* WS-B 知识图谱客户端 — d3-force ESM
 * 数据来源:GET /api/graph
 * 设计稿:hf-extras.jsx §12 HFGraph
 */
import * as d3 from 'https://esm.sh/d3@7';

const W = 800;
const H = 600;
const CLUSTER_COLORS = [
  'var(--accent)',
  '#a855f7',
  'var(--ok, #16a34a)',
  '#f59e0b',
  '#ef4444',
  '#0891b2',
];

const root = document.querySelector('[data-component="graph"]');
if (root) {
  init().catch((err) => {
    const overlay = document.getElementById('wsb-graph-overlay');
    if (overlay) {
      overlay.innerHTML =
        '<span class="hf-tiny" style="color:var(--danger-text,#b91c1c)">图谱加载失败:' +
        escText(err && err.message ? err.message : '未知错误') +
        '</span>';
    }
  });
}

async function init() {
  const overlay = document.getElementById('wsb-graph-overlay');
  const svg = d3.select('#wsb-graph-svg');
  const edgeLayer = d3.select('#wsb-graph-edges');
  const nodeLayer = d3.select('#wsb-graph-nodes');

  const data = await fetchGraph();
  if (overlay) overlay.style.display = 'none';

  const nodes = (data.nodes || []).map((n) => ({
    ...n,
    id: String(n.id),
    cluster: n.cluster ?? clusterFromTags(n.tags || []),
    degree: n.degree ?? 0,
  }));
  const links = (data.edges || []).map((e) => ({
    source: String(e.src ?? e.source),
    target: String(e.dst ?? e.target),
  }));

  // ---- legend ----
  const clusters = aggregateClusters(nodes);
  renderLegend(clusters);

  // ---- zoom ----
  const rootG = svg.append('g').attr('class', 'wsb-graph__root');
  edgeLayer.remove();
  nodeLayer.remove();
  const edges = rootG.append('g').attr('class', 'wsb-graph__edges');
  const verts = rootG.append('g').attr('class', 'wsb-graph__nodes');

  const zoom = d3
    .zoom()
    .scaleExtent([0.25, 4])
    .on('zoom', (ev) => rootG.attr('transform', ev.transform));
  svg.call(zoom);

  document.querySelectorAll('[data-zoom]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const k = btn.getAttribute('data-zoom');
      if (k === 'in') svg.transition().duration(160).call(zoom.scaleBy, 1.3);
      else if (k === 'out') svg.transition().duration(160).call(zoom.scaleBy, 1 / 1.3);
      else svg.transition().duration(220).call(zoom.transform, d3.zoomIdentity);
    });
  });

  // ---- force simulation ----
  const sim = d3
    .forceSimulation(nodes)
    .force('charge', d3.forceManyBody().strength(-180))
    .force(
      'link',
      d3
        .forceLink(links)
        .id((d) => d.id)
        .distance(60)
        .strength(0.4),
    )
    .force('center', d3.forceCenter(W / 2, H / 2))
    .force('collide', d3.forceCollide().radius((d) => nodeRadius(d) + 6))
    .alphaDecay(0.03);

  // edges
  const link = edges
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke', 'var(--line-strong)')
    .attr('stroke-width', 1)
    .attr('opacity', 0.6);

  // nodes (g containing circle + text)
  const node = verts
    .selectAll('g.wsb-graph__node')
    .data(nodes, (d) => d.id)
    .join('g')
    .attr('class', 'wsb-graph__node')
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('aria-label', (d) => d.title || d.id)
    .call(
      d3
        .drag()
        .on('start', (ev, d) => {
          if (!ev.active) sim.alphaTarget(0.25).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (ev, d) => {
          d.fx = ev.x;
          d.fy = ev.y;
        })
        .on('end', (ev, d) => {
          if (!ev.active) sim.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }),
    );

  node
    .append('circle')
    .attr('r', (d) => nodeRadius(d))
    .attr('fill', (d) => clusterColor(d.cluster))
    .attr('stroke', 'transparent')
    .attr('stroke-width', 0)
    .attr('opacity', 0.85);

  node
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('y', (d) => nodeRadius(d) + 12)
    .attr('font-family', 'var(--mono)')
    .attr('font-size', 10)
    .attr('fill', 'var(--ink-3)')
    .text((d) => trunc(d.title || d.id, 24));

  sim.on('tick', () => {
    link
      .attr('x1', (d) => d.source.x)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y);
    node.attr('transform', (d) => `translate(${d.x},${d.y})`);
  });

  // ---- interactions ----
  let activeId = null;

  function setActive(d) {
    activeId = d ? d.id : null;
    const neighbors = d ? findNeighbors(d.id, links) : new Set();

    node.select('circle').attr('stroke-width', (n) => (n.id === activeId ? 3 : 0));
    node
      .select('circle')
      .attr('stroke', (n) => (n.id === activeId ? 'var(--accent)' : 'transparent'))
      .attr('opacity', (n) => {
        if (!d) return 0.85;
        if (n.id === activeId || neighbors.has(n.id)) return 1;
        return 0.3;
      });
    node
      .select('text')
      .attr('font-weight', (n) => (n.id === activeId ? 600 : 400))
      .attr('fill', (n) => (n.id === activeId ? 'var(--ink)' : 'var(--ink-3)'))
      .attr('opacity', (n) => {
        if (!d) return 1;
        if (n.id === activeId || neighbors.has(n.id)) return 1;
        return 0.4;
      });
    link
      .attr('stroke', (l) => {
        if (!d) return 'var(--line-strong)';
        if (idOf(l.source) === activeId || idOf(l.target) === activeId) return 'var(--accent)';
        return 'var(--line-strong)';
      })
      .attr('stroke-width', (l) =>
        d && (idOf(l.source) === activeId || idOf(l.target) === activeId) ? 2 : 1,
      )
      .attr('opacity', (l) => {
        if (!d) return 0.6;
        return idOf(l.source) === activeId || idOf(l.target) === activeId ? 0.9 : 0.15;
      });

    renderSide(d, links, nodes);
  }

  node.on('mouseenter', (_ev, d) => setActive(d));
  node.on('mouseleave', () => setActive(null));
  node.on('click', (_ev, d) => setActive(d));
  node.on('keydown', (ev, d) => {
    if (ev.key === 'Enter' && d) {
      const url = d.url || `/posts/${encodeURIComponent(d.id)}.html`;
      location.href = url;
    }
    if (ev.key === ' ') {
      ev.preventDefault();
      setActive(d);
    }
  });

  // legend filter
  document.querySelectorAll('[data-cluster]').forEach((row) => {
    row.addEventListener('click', () => {
      const c = row.getAttribute('data-cluster');
      const on = !row.classList.contains('is-off');
      row.classList.toggle('is-off', on);
      node.style('display', (n) => {
        const off = document
          .querySelector(`[data-cluster="${cssEscape(n.cluster)}"]`);
        if (off && off.classList.contains('is-off') && String(n.cluster) === c) return 'none';
        return null;
      });
    });
  });
}

// ---- helpers ----
async function fetchGraph() {
  const res = await fetch('/api/graph', { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

function clusterFromTags(tags) {
  if (!tags || !tags.length) return 'misc';
  return String(tags[0] || 'misc');
}
const clusterColorCache = new Map();
function clusterColor(c) {
  if (clusterColorCache.has(c)) return clusterColorCache.get(c);
  const key = String(c);
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const color = CLUSTER_COLORS[h % CLUSTER_COLORS.length];
  clusterColorCache.set(c, color);
  return color;
}
function aggregateClusters(nodes) {
  const map = new Map();
  for (const n of nodes) {
    const k = String(n.cluster || 'misc');
    map.set(k, (map.get(k) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([k, n]) => ({ name: k, count: n, color: clusterColor(k) }))
    .sort((a, b) => b.count - a.count);
}
function renderLegend(clusters) {
  const list = document.querySelector('#wsb-graph-legend [data-list]');
  if (!list) return;
  list.innerHTML = clusters
    .map(
      (c) =>
        `<button type="button" class="wsb-graph__legend-row" data-cluster="${escAttr(c.name)}">
          <span class="wsb-graph__legend-dot" style="background:${escAttr(c.color)}" aria-hidden="true"></span>
          <span class="wsb-graph__legend-name">${escText(c.name)}</span>
          <span class="hf-mono hf-tiny hf-faint">${c.count}</span>
        </button>`,
    )
    .join('');
}

function nodeRadius(d) {
  const deg = d.degree || 0;
  return Math.max(5, Math.min(18, 5 + Math.sqrt(deg) * 2));
}

function findNeighbors(id, links) {
  const set = new Set();
  for (const l of links) {
    if (idOf(l.source) === id) set.add(idOf(l.target));
    if (idOf(l.target) === id) set.add(idOf(l.source));
  }
  return set;
}
function idOf(v) {
  return typeof v === 'object' && v ? String(v.id) : String(v);
}

function renderSide(d, links, nodes) {
  const side = document.getElementById('wsb-graph-side');
  if (!side) return;
  const empty = side.querySelector('[data-empty]');
  const detail = side.querySelector('[data-detail]');
  if (!empty || !detail) return;

  if (!d) {
    empty.hidden = false;
    detail.hidden = true;
    return;
  }
  empty.hidden = true;
  detail.hidden = false;

  side.querySelector('[data-title]').textContent = d.title || d.id;
  side.querySelector('[data-meta]').textContent = (d.type || '文章') + (d.reading_minutes ? ' · ' + d.reading_minutes + ' min' : '') + (d.date ? ' · ' + d.date : '');
  side.querySelector('[data-desc]').textContent = d.summary || '';
  side.querySelector('[data-dot]').style.background = clusterColor(d.cluster);
  const open = side.querySelector('[data-open]');
  if (open) open.setAttribute('href', d.url || '/posts/' + encodeURIComponent(d.id) + '.html');

  // neighbors
  const nbrs = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  for (const l of links) {
    const s = idOf(l.source), t = idOf(l.target);
    if (s === d.id) nbrs.push({ dir: '→', node: nodeMap.get(t), kind: 'mentions' });
    else if (t === d.id) nbrs.push({ dir: '←', node: nodeMap.get(s), kind: 'backlink' });
  }
  side.querySelector('[data-degree]').textContent = '· ' + nbrs.length;
  const ol = side.querySelector('[data-neighbors]');
  ol.innerHTML = nbrs
    .filter((n) => n.node)
    .slice(0, 24)
    .map(
      (n) =>
        `<li class="wsb-graph__neighbor">
          <span class="hf-mono" style="color:${n.dir === '→' ? 'var(--accent)' : 'var(--ink-4)'}">${n.dir}</span>
          <a href="${escAttr(n.node.url || '/posts/' + encodeURIComponent(n.node.id) + '.html')}">${escText(n.node.title || n.node.id)}</a>
          <span class="hf-mono hf-tiny hf-faint">${escText(n.kind)}</span>
        </li>`,
    )
    .join('');
}

function trunc(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
function escText(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(s) {
  return escText(s).replace(/"/g, '&quot;');
}
function cssEscape(s) {
  return String(s).replace(/[^a-zA-Z0-9_-]/g, '_');
}
