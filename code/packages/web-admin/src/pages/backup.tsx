import { useEffect, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { Tag } from '@opennote/ui';
import { api, type BackupJob } from '../api.js';

type ExportKind = 'vault';

interface ExportSpec {
  kind: ExportKind;
  label: string;
}

const HISTORY_KEY = 'admin.backup.history.v1';

interface HistoryRow {
  id: string;
  kind: string;
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

      {/* 导出 */}
      <section aria-labelledby="export-h" style={{ marginBottom: 18 }}>
        <h3 id="export-h" class="hf-mono hf-tiny" style={{ color: 'var(--ink-4)', textTransform: 'uppercase', margin: '0 0 8px', letterSpacing: '.05em' }}>
          ▸ 导出
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          <ExportCard
            title="完整 vault zip"
            hint="Markdown 源 + 媒体 + sqlite + metadata.json"
            kindBadge="vault"
            onStart={() => startExport({ kind: 'vault', label: '完整 vault 备份' })}
            disabled={activeJob !== null && activeJob.status === 'running'}
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

function rowFrom(j: BackupJob, kind: string): HistoryRow {
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
  return '备份';
}
