import { useEffect, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { Button, Tag, Modal, ModalHeader, ModalBody, ModalFooter } from '@opennote/ui';
import { api, type BackupJob } from '../api.js';

type ExportKind = 'vault' | 'db' | 'markdown';

interface ExportSpec {
  kind: ExportKind;
  label: string;
  hint: string;
  /** markdown bundle 时的可选时间段 */
  rangeFrom?: string;
  rangeTo?: string;
}

const HISTORY_KEY = 'admin.backup.history.v1';

interface HistoryRow {
  id: string;
  kind: ExportKind;
  status: BackupJob['status'];
  bytes: number | null;
  created_at: string;
  finished_at: string | null;
  download_url: string | null;
}

function loadHistory(): HistoryRow[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as HistoryRow[];
    return Array.isArray(arr) ? arr.slice(0, 10) : [];
  } catch {
    return [];
  }
}

function saveHistory(rows: HistoryRow[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(rows.slice(0, 10)));
  } catch {
    // ignore
  }
}

export function BackupPage(): JSX.Element {
  const [latest, setLatest] = useState<BackupJob | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>(() => loadHistory());
  const [activeJob, setActiveJob] = useState<BackupJob | null>(null);
  const [activeKind, setActiveKind] = useState<ExportKind | null>(null);
  const [autoFreq, setAutoFreq] = useState<'off' | 'daily' | 'weekly'>('off');
  const [danger, setDanger] = useState<{ open: boolean; action: 'wipe-drafts' | 'reset-stats' | 'wipe-all' | null; typedSlug: string }>({ open: false, action: null, typedSlug: '' });
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  // 初始 latest
  useEffect(() => {
    const last = history[0];
    if (last) {
      api.backup
        .status(last.id)
        .then((j) => setLatest(j))
        .catch(() => setLatest(null));
    }
    return () => {
      sseRef.current?.close();
      sseRef.current = null;
    };
  }, []);

  // 持久化历史
  useEffect(() => {
    saveHistory(history);
  }, [history]);

  // 订阅 SSE,实时 hook 进度
  const subscribeSSE = (jobId: string) => {
    sseRef.current?.close();
    let es: EventSource;
    try {
      es = new EventSource('/api/admin/changes', { withCredentials: true } as EventSourceInit);
    } catch {
      return;
    }
    sseRef.current = es;
    const handler = (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data) as { kind?: string; job_id?: string };
        if (data.job_id !== jobId) return;
        // 收到事件时主动 poll 一次,拿真实进度
        api.backup.status(jobId).then((j) => {
          setActiveJob(j);
          if (j.status === 'done' || j.status === 'failed') {
            setLatest(j);
            setHistory((prev) => prev.map((h) => (h.id === j.id ? rowFrom(j, h.kind) : h)));
            es.close();
            sseRef.current = null;
          }
        });
      } catch {
        // ignore
      }
    };
    es.addEventListener('backup.started', handler);
    es.addEventListener('backup.done', handler);
    es.addEventListener('backup.failed', handler);
    es.addEventListener('error', () => {
      // 浏览器会自动重连,SSE 错误不致命
    });
  };

  const startExport = async (spec: ExportSpec) => {
    try {
      const job = await api.backup.create();
      setActiveJob(job);
      setActiveKind(spec.kind);
      const row = rowFrom(job, spec.kind);
      setHistory((prev) => [row, ...prev.filter((p) => p.id !== job.id)].slice(0, 10));
      setToast({ msg: `已启动${spec.label}` });

      subscribeSSE(job.id);
      // SSE 之外,定时 poll 兜底
      const t0 = Date.now();
      const poll = async () => {
        if (Date.now() - t0 > 15 * 60_000) return;
        try {
          const j = await api.backup.status(job.id);
          setActiveJob(j);
          if (j.status === 'done' || j.status === 'failed') {
            setLatest(j);
            setHistory((prev) => prev.map((h) => (h.id === j.id ? rowFrom(j, spec.kind) : h)));
            return;
          }
        } catch {
          // ignore
        }
        setTimeout(poll, 1500);
      };
      setTimeout(poll, 1500);
    } catch (e) {
      setToast({ msg: (e as Error).message, err: true });
    }
  };

  const onConfirmDanger = () => {
    // 真实的清空 / 重置端点不在本 WS 范围内 — 仅前端 UI 双确认
    setToast({ msg: `${dangerLabel(danger.action)}:已记录(后端动作待实现)`, err: true });
    setDanger({ open: false, action: null, typedSlug: '' });
  };

  return (
    <div>
      <header style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>备份与导出</h2>
        <p class="hf-muted" style={{ margin: '4px 0 0 0', fontSize: 13 }}>
          数据是你的,任何时候都能整包带走。
        </p>
      </header>

      {/* 最近备份卡片 */}
      <section
        aria-labelledby="latest-h"
        style={{ padding: 16, marginBottom: 18, border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', background: 'var(--bg)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            aria-hidden="true"
            style={{
              width: 44, height: 44, borderRadius: 'var(--radius-lg)',
              background: 'var(--accent-soft)', color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 700, fontFamily: 'var(--mono)',
            }}
          >
            BK
          </div>
          <div style={{ flex: 1 }}>
            <h3 id="latest-h" style={{ margin: 0, fontSize: 14 }}>最近备份</h3>
            {latest ? (
              <>
                <div class="hf-mono hf-tiny hf-muted" style={{ marginTop: 2 }}>
                  <code>{latest.id}</code>
                  <span aria-hidden="true"> · </span>
                  <StatusTag status={latest.status} />
                  {latest.bytes !== null && <> <span aria-hidden="true">·</span> {formatBytes(latest.bytes)}</>}
                  {latest.finished_at && (
                    <> <span aria-hidden="true">·</span> <time dateTime={latest.finished_at}>{latest.finished_at.slice(0, 16).replace('T', ' ')}</time></>
                  )}
                </div>
              </>
            ) : (
              <p class="hf-muted" style={{ margin: '4px 0 0 0', fontSize: 12 }}>暂无备份。下面任意一个导出按钮即可开始。</p>
            )}
          </div>
          {latest?.status === 'done' && latest.download_url && (
            <a
              class="ui-btn ui-btn--sm ui-btn--primary"
              href={api.backup.downloadUrl(latest.id)}
              download={`${latest.id}.zip`}
              aria-label={`下载备份 ${latest.id}`}
            >
              下载 .zip
            </a>
          )}
        </div>
      </section>

      {/* 三种导出 */}
      <section aria-labelledby="export-h" style={{ marginBottom: 18 }}>
        <h3 id="export-h" class="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', margin: '0 0 8px', letterSpacing: '.05em' }}>
          ▸ 导出
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          <ExportCard
            title="完整 vault zip"
            hint="Markdown 源 + 媒体 + sqlite + metadata.json"
            kindBadge="vault"
            onStart={() => startExport({ kind: 'vault', label: '完整 vault 备份', hint: '' })}
            disabled={activeJob !== null && activeJob.status === 'running'}
          />
          <ExportCard
            title="SQLite dump"
            hint="单文件数据库 — 适合迁移或灾难恢复"
            kindBadge="db"
            onStart={() => startExport({ kind: 'db', label: 'SQLite 数据库 dump', hint: '' })}
            disabled={activeJob !== null && activeJob.status === 'running'}
          />
          <MarkdownBundleCard
            disabled={activeJob !== null && activeJob.status === 'running'}
            onStart={(from, to) => startExport({ kind: 'markdown', label: 'Markdown bundle', hint: '', rangeFrom: from, rangeTo: to })}
          />
        </div>
      </section>

      {/* 进度条 */}
      {activeJob && activeJob.status !== 'done' && (
        <section
          role="status"
          aria-live="polite"
          style={{ padding: 14, marginBottom: 18, border: '1px solid var(--accent)', borderRadius: 'var(--radius-lg)', background: 'var(--accent-soft)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <strong style={{ fontSize: 13 }}>{labelOf(activeKind)}</strong>
            <Tag tone={activeJob.status === 'failed' ? 'danger' : 'accent'}>{activeJob.status}</Tag>
            <code class="hf-mono hf-tiny hf-muted">{activeJob.id}</code>
          </div>
          <div style={{ height: 8, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.round(activeJob.progress * 100)}%`,
                background: activeJob.status === 'failed' ? 'var(--danger)' : 'var(--accent)',
                transition: 'width 0.3s',
              }}
            />
          </div>
          <p class="hf-mono hf-tiny" style={{ margin: '4px 0 0 0', color: 'var(--ink-3)' }}>
            {Math.round(activeJob.progress * 100)}%
            {activeJob.error && <span style={{ color: 'var(--danger-text)' }}> · {activeJob.error}</span>}
          </p>
        </section>
      )}

      {/* 历史 */}
      <section aria-labelledby="history-h" style={{ marginBottom: 18 }}>
        <h3 id="history-h" class="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', margin: '0 0 8px', letterSpacing: '.05em' }}>
          ▸ 历史 (最近 10 个)
        </h3>
        {history.length === 0 ? (
          <p class="hf-muted">还没有备份记录。</p>
        ) : (
          <table aria-label="备份历史" style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th scope="col">时间</th>
                <th scope="col">类型</th>
                <th scope="col">状态</th>
                <th scope="col">大小</th>
                <th scope="col">job</th>
                <th scope="col"><span class="sr-only">操作</span></th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td><time dateTime={h.created_at}>{h.created_at.slice(0, 16).replace('T', ' ')}</time></td>
                  <td><Tag>{h.kind}</Tag></td>
                  <td><StatusTag status={h.status} /></td>
                  <td>{h.bytes !== null ? formatBytes(h.bytes) : '—'}</td>
                  <td><code class="hf-mono hf-tiny" style={{ color: 'var(--accent)' }}>{h.id.slice(0, 16)}</code></td>
                  <td>
                    {h.status === 'done' && h.download_url ? (
                      <a class="ui-btn ui-btn--sm" href={api.backup.downloadUrl(h.id)} download>
                        下载
                      </a>
                    ) : (
                      <span class="hf-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* 自动备份频率 */}
      <section
        aria-labelledby="auto-h"
        style={{ padding: 14, marginBottom: 18, border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)' }}
      >
        <h3 id="auto-h" style={{ margin: 0, fontSize: 14 }}>自动备份</h3>
        <p class="hf-muted hf-tiny" style={{ margin: '4px 0 8px 0' }}>定期触发完整 vault 备份(配置项 — 后端在 WS-G 之外实现)。</p>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend class="sr-only">自动备份频率</legend>
          <div role="radiogroup" aria-label="自动备份频率" style={{ display: 'flex', gap: 12 }}>
            {(['off', 'daily', 'weekly'] as const).map((f) => (
              <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="auto-freq"
                  value={f}
                  checked={autoFreq === f}
                  onChange={() => setAutoFreq(f)}
                />
                {f === 'off' ? '关闭' : f === 'daily' ? '每天' : '每周'}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      {/* 危险区 */}
      <section
        aria-labelledby="danger-h"
        style={{ padding: 14, border: '1px solid var(--danger)', borderRadius: 'var(--radius-lg)', background: 'var(--danger-soft)' }}
      >
        <h3 id="danger-h" style={{ margin: 0, fontSize: 14, color: 'var(--danger-text)' }}>危险区</h3>
        <p class="hf-tiny" style={{ margin: '4px 0 10px 0', color: 'var(--danger-text)' }}>
          这些操作不可逆。建议先做一次完整备份。
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button size="sm" variant="danger" onClick={() => setDanger({ open: true, action: 'wipe-drafts', typedSlug: '' })}>
            清空所有草稿
          </Button>
          <Button size="sm" variant="danger" onClick={() => setDanger({ open: true, action: 'reset-stats', typedSlug: '' })}>
            重置统计数据
          </Button>
          <Button size="sm" variant="danger" onClick={() => setDanger({ open: true, action: 'wipe-all', typedSlug: '' })}>
            删除整站
          </Button>
        </div>
      </section>

      {/* 危险区双确认 modal */}
      <Modal
        open={danger.open}
        onClose={() => setDanger({ open: false, action: null, typedSlug: '' })}
        titleId="danger-modal-title"
      >
        <ModalHeader>
          <h3 id="danger-modal-title" style={{ margin: 0, fontSize: 14, color: 'var(--danger-text)' }}>
            确认:{dangerLabel(danger.action)}
          </h3>
        </ModalHeader>
        <ModalBody>
          <p style={{ marginTop: 0, color: 'var(--ink-2)' }}>
            此操作无法撤销。
          </p>
          <p style={{ color: 'var(--ink-3)', fontSize: 13 }}>
            为防误操作,请输入 <code style={{ background: 'var(--bg-sunk)', padding: '1px 6px', borderRadius: 3, fontFamily: 'var(--mono)' }}>{slugFor(danger.action)}</code> 以确认。
          </p>
          <label htmlFor="danger-slug-input" class="sr-only">确认词</label>
          <input
            id="danger-slug-input"
            type="text"
            autoFocus
            value={danger.typedSlug}
            onInput={(e) => setDanger((p) => ({ ...p, typedSlug: (e.target as HTMLInputElement).value }))}
            aria-describedby="danger-help"
            style={{ width: '100%' }}
          />
          <p id="danger-help" class="hf-tiny hf-muted" style={{ marginTop: 6 }}>
            输入完成后再点一次"确认"按钮(双重确认)。
          </p>
        </ModalBody>
        <ModalFooter>
          <Button size="sm" variant="ghost" onClick={() => setDanger({ open: false, action: null, typedSlug: '' })}>取消</Button>
          <button
            type="button"
            class="ui-btn ui-btn--sm ui-btn--danger"
            disabled={danger.typedSlug !== slugFor(danger.action)}
            onClick={onConfirmDanger}
          >
            确认 {dangerLabel(danger.action)}
          </button>
        </ModalFooter>
      </Modal>

      {toast && (
        <div
          class={`toast${toast.err ? ' error' : ''}`}
          role={toast.err ? 'alert' : 'status'}
          aria-live={toast.err ? 'assertive' : 'polite'}
          onClick={() => setToast(null)}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ---- subcomponents ----

function ExportCard({
  title,
  hint,
  kindBadge,
  disabled,
  onStart,
}: {
  title: string;
  hint: string;
  kindBadge: ExportKind;
  disabled: boolean;
  onStart: () => void;
}): JSX.Element {
  return (
    <article style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', background: 'var(--bg)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <h4 style={{ margin: 0, fontSize: 14 }}>{title}</h4>
        <Tag tone="accent">{kindBadge}</Tag>
      </header>
      <p class="hf-muted" style={{ margin: '0 0 12px 0', fontSize: 12 }}>{hint}</p>
      <button type="button" class="ui-btn ui-btn--sm ui-btn--primary" onClick={onStart} disabled={disabled} aria-label={`开始 ${title}`}>
        开始导出
      </button>
    </article>
  );
}

function MarkdownBundleCard({
  disabled,
  onStart,
}: {
  disabled: boolean;
  onStart: (from: string, to: string) => void;
}): JSX.Element {
  const today = new Date().toISOString().slice(0, 10);
  const lastMonth = new Date(Date.now() - 30 * 24 * 3600_000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(lastMonth);
  const [to, setTo] = useState(today);
  return (
    <article style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', background: 'var(--bg)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <h4 style={{ margin: 0, fontSize: 14 }}>Markdown bundle</h4>
        <Tag tone="accent">range</Tag>
      </header>
      <p class="hf-muted" style={{ margin: '0 0 8px 0', fontSize: 12 }}>选时间段导出 markdown(其他 WS 兜底:目前等同 vault zip)。</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <label style={{ flex: 1 }}>
          <span class="hf-tiny" style={{ color: 'var(--ink-3)', display: 'block', marginBottom: 2 }}>从</span>
          <input type="date" value={from} onInput={(e) => setFrom((e.target as HTMLInputElement).value)} style={{ width: '100%', minHeight: 30, padding: '4px 6px' }} />
        </label>
        <label style={{ flex: 1 }}>
          <span class="hf-tiny" style={{ color: 'var(--ink-3)', display: 'block', marginBottom: 2 }}>至</span>
          <input type="date" value={to} onInput={(e) => setTo((e.target as HTMLInputElement).value)} style={{ width: '100%', minHeight: 30, padding: '4px 6px' }} />
        </label>
      </div>
      <button type="button" class="ui-btn ui-btn--sm ui-btn--primary" onClick={() => onStart(from, to)} disabled={disabled} aria-label="开始 markdown bundle">
        开始导出
      </button>
    </article>
  );
}

function StatusTag({ status }: { status: BackupJob['status'] }): JSX.Element {
  if (status === 'done') return <Tag tone="ok">完成</Tag>;
  if (status === 'failed') return <Tag tone="danger">失败</Tag>;
  if (status === 'running') return <Tag tone="accent">运行中</Tag>;
  return <Tag>等待</Tag>;
}

// ---- helpers ----

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(2)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function rowFrom(j: BackupJob, kind: ExportKind): HistoryRow {
  return {
    id: j.id,
    kind,
    status: j.status,
    bytes: j.bytes,
    created_at: j.created_at,
    finished_at: j.finished_at,
    download_url: j.download_url,
  };
}

function labelOf(kind: ExportKind | null): string {
  if (kind === 'vault') return '完整 vault 备份';
  if (kind === 'db') return 'SQLite 数据库 dump';
  if (kind === 'markdown') return 'Markdown bundle';
  return '备份';
}

function dangerLabel(a: 'wipe-drafts' | 'reset-stats' | 'wipe-all' | null): string {
  if (a === 'wipe-drafts') return '清空所有草稿';
  if (a === 'reset-stats') return '重置统计数据';
  if (a === 'wipe-all') return '删除整站';
  return '';
}

function slugFor(a: 'wipe-drafts' | 'reset-stats' | 'wipe-all' | null): string {
  if (a === 'wipe-drafts') return 'WIPE-DRAFTS';
  if (a === 'reset-stats') return 'RESET-STATS';
  if (a === 'wipe-all') return 'DELETE-EVERYTHING';
  return '';
}
