import { useEffect, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { HfIcon } from '@opennote/ui';
import { api, type MediaItem } from '../api.js';

export interface UploadResult {
  ok: boolean;
  filename: string;
  item?: MediaItem;
  error?: string;
}

export interface UploaderProps {
  /** 受理的 MIME 前缀;不传则不限制 */
  accept?: string;
  /** 单文件上传完成回调(每文件一次) */
  onUploaded?: (item: MediaItem, file: File) => void;
  /** 全部上传结束(成功/失败汇总) */
  onComplete?: (results: UploadResult[]) => void;
  /** 渲染模式:full = 大块拖放区;compact = 一行按钮 */
  variant?: 'full' | 'compact';
  /** 是否启用整页拖放(只放在 'full' 时建议开) */
  pageOverlay?: boolean;
  /** 标签按钮文案 */
  label?: string;
}

interface QueueItem {
  id: string;
  file: File;
  progress: number;
  status: 'queued' | 'uploading' | 'done' | 'error';
  error?: string;
  item?: MediaItem;
}

let _qid = 0;

export function Uploader({
  accept,
  onUploaded,
  onComplete,
  variant = 'full',
  pageOverlay = false,
  label = '上传文件',
}: UploaderProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pageDrag, setPageDrag] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);

  // page-level dragenter/dragleave 显示遮罩
  useEffect(() => {
    if (!pageOverlay) return;
    let depth = 0;
    const onEnter = (e: DragEvent) => {
      if (!e.dataTransfer) return;
      depth++;
      setPageDrag(true);
    };
    const onLeave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setPageDrag(false);
    };
    const onDrop = () => {
      depth = 0;
      setPageDrag(false);
    };
    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [pageOverlay]);

  const enqueue = (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    const items: QueueItem[] = arr.map((f) => ({
      id: `q${++_qid}`,
      file: f,
      progress: 0,
      status: 'queued',
    }));
    setQueue((prev) => [...prev, ...items]);
    void runQueue(items);
  };

  const runQueue = async (items: QueueItem[]) => {
    const results: UploadResult[] = [];
    for (const it of items) {
      setQueue((prev) => prev.map((q) => (q.id === it.id ? { ...q, status: 'uploading' } : q)));
      try {
        const item = await api.media.upload(it.file, (pct) => {
          setQueue((prev) => prev.map((q) => (q.id === it.id ? { ...q, progress: pct } : q)));
        });
        setQueue((prev) =>
          prev.map((q) => (q.id === it.id ? { ...q, status: 'done', progress: 1, item } : q)),
        );
        results.push({ ok: true, filename: it.file.name, item });
        onUploaded?.(item, it.file);
      } catch (e) {
        const msg = (e as Error).message;
        setQueue((prev) => prev.map((q) => (q.id === it.id ? { ...q, status: 'error', error: msg } : q)));
        results.push({ ok: false, filename: it.file.name, error: msg });
      }
    }
    onComplete?.(results);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    setPageDrag(false);
    if (e.dataTransfer?.files) enqueue(e.dataTransfer.files);
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const onPick = () => inputRef.current?.click();
  const onFiles = (e: Event) => {
    const t = e.target as HTMLInputElement;
    if (t.files) enqueue(t.files);
    t.value = '';
  };

  const inFlight = queue.filter((q) => q.status === 'uploading' || q.status === 'queued').length;
  const dropZoneStyle: JSX.CSSProperties = {
    border: dragOver ? '2px dashed var(--accent)' : '1px dashed var(--line-strong)',
    borderRadius: 'var(--radius-lg)',
    padding: variant === 'full' ? '28px 20px' : '12px 14px',
    background: dragOver ? 'var(--accent-soft)' : 'var(--bg-soft)',
    color: 'var(--ink-3)',
    textAlign: 'center',
    transition: 'background 0.1s, border-color 0.1s',
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        onChange={onFiles}
        class="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />

      <div
        role="button"
        tabIndex={0}
        aria-label={`${label}(可点击或拖入文件)`}
        onClick={onPick}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPick();
          }
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragEnter={onDragOver}
        onDragLeave={onDragLeave}
        style={dropZoneStyle}
      >
        {variant === 'full' ? (
          <>
            <div style={{ marginBottom: 6 }}>
              <HfIcon name="image" size={24} />
            </div>
            <div style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 4 }}>
              <strong>{label}</strong>
            </div>
            <div class="hf-tiny hf-muted">
              拖入文件,或<a href="#" onClick={(e) => { e.preventDefault(); onPick(); }} style={{ color: 'var(--accent)' }}>点击选择</a>
              {accept && <span> · 支持 {accept}</span>}
            </div>
          </>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--ink-2)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <HfIcon name="plus" size={12} /> {label}
            {inFlight > 0 && <span class="hf-mono hf-tiny hf-muted">· {inFlight} 进行中</span>}
          </span>
        )}
      </div>

      {/* 队列状态 */}
      {queue.length > 0 && (
        <ul aria-label="上传队列" style={{ listStyle: 'none', margin: '12px 0 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {queue.slice(-5).reverse().map((q) => (
            <li
              key={q.id}
              role="status"
              aria-live="polite"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 60px',
                gap: 8,
                alignItems: 'center',
                padding: '6px 10px',
                background: 'var(--bg-soft)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius)',
                fontSize: 12,
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.file.name}</span>
              <div style={{ height: 6, background: 'var(--bg-sunk)', borderRadius: 3, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.round(q.progress * 100)}%`,
                    background: q.status === 'error' ? 'var(--danger)' : 'var(--accent)',
                    transition: 'width 0.15s',
                  }}
                />
              </div>
              <span class="hf-mono hf-tiny" style={{ color: q.status === 'error' ? 'var(--danger-text)' : q.status === 'done' ? 'var(--ok-text)' : 'var(--ink-3)' }}>
                {q.status === 'queued' && '排队'}
                {q.status === 'uploading' && `${Math.round(q.progress * 100)}%`}
                {q.status === 'done' && '完成'}
                {q.status === 'error' && '失败'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* 整页拖放遮罩 */}
      {pageOverlay && pageDrag && (
        <div
          role="presentation"
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 102, 255, 0.08)',
            border: '4px dashed var(--accent)',
            zIndex: 5000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
            backdropFilter: 'blur(2px)',
          }}
        >
          <div style={{ textAlign: 'center', color: 'var(--accent)' }}>
            <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>松手即可上传</div>
            <div class="hf-mono hf-tiny">所有文件会上传到媒体库</div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 用 Button 包装的紧凑上传触发器(供 toolbar 用) */
export function UploadButton({
  label = '上传',
  accept,
  onUploaded,
}: {
  label?: string;
  accept?: string;
  onUploaded?: (item: MediaItem) => void;
}): JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const onFiles = async (e: Event) => {
    const t = e.target as HTMLInputElement;
    const files = t.files;
    if (!files) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        const item = await api.media.upload(f);
        onUploaded?.(item);
      }
    } finally {
      setBusy(false);
      t.value = '';
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" multiple accept={accept} onChange={onFiles} class="sr-only" aria-hidden="true" tabIndex={-1} />
      <button
        type="button"
        class="ui-btn ui-btn--sm ui-btn--primary"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={label}
      >
        <HfIcon name="plus" size={11} /> {busy ? '上传中…' : label}
      </button>
    </>
  );
}
