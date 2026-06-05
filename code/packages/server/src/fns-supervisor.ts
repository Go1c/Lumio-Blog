import { spawn, type ChildProcess } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import type { FnsSettings } from '@opennote/core';
import { loadFnsYaml, saveFnsYaml } from './routes/settings.js';
import type { EventBus } from './events.js';

/**
 * FastNoteSync supervisor — 管理 Python fns_cli 子进程。
 *
 * - 启动时:读 fns-config.yaml,如果 enabled,渲染 fns-cli config 并 spawn 子进程
 * - 监听 settings.changed 事件,如果 sections 含 'fns' → 重启子进程
 * - 子进程退出 → 尝试重启(指数退避,最多 N 次)
 * - 子进程 stdout/stderr → 日志带 [fns] 前缀
 */
export interface FnsSupervisorOpts {
  /** vault 目录,fns-cli 把笔记写到这里 */
  vaultDir: string;
  /** 渲染好的 fns-cli config.yaml 写到这个路径 */
  configOutPath: string;
  /** fns_cli Python 模块所在目录(/app/fns-sync 或本地开发路径) */
  cliDir: string;
  /** Python 可执行文件 */
  python?: string;
  /** 事件总线,用于订阅 settings.changed + emit fns 事件 */
  bus: EventBus;
  /** logger */
  log: (level: string, msg: string, meta?: unknown) => void;
}

const RESTART_BACKOFFS_MS = [1_000, 5_000, 15_000, 30_000, 60_000];
const DISCONNECTED_RESTART_MS = 60_000;
const STATUS_CONNECTED = /Authenticated\.|Connected\./;
const STATUS_DISCONNECTED = /ConnectionClosed|Connection lost/;

export class FnsSupervisor {
  private opts: FnsSupervisorOpts;
  private child: ChildProcess | null = null;
  private current: FnsSettings | null = null;
  private restartCount = 0;
  private restartTimer: NodeJS.Timeout | null = null;
  private disconnectedRestartTimer: NodeJS.Timeout | null = null;
  private stopping = false;
  private childGeneration = 0;
  private lastStatus: NonNullable<FnsSettings['last_status']> = 'unknown';

  constructor(opts: FnsSupervisorOpts) {
    this.opts = opts;
    // 订阅 settings.changed
    this.opts.bus.subscribe((e) => {
      if (e.kind === 'settings.changed' && e.sections.includes('fns')) {
        void this.reload();
      }
    });
  }

  /** 启动:读配置 + spawn(如果 enabled) */
  async start(): Promise<void> {
    this.current = await loadFnsYaml();
    if (!this.current.enabled) {
      this.opts.log('info', 'fns.supervisor.disabled', { reason: 'enabled=false' });
      await this.updateStatus('disconnected', 'enabled=false');
      return;
    }
    if (!this.current.api_url || !this.current.token) {
      this.opts.log('warn', 'fns.supervisor.skip', { reason: 'api_url or token empty' });
      await this.updateStatus('error', 'api_url or token empty');
      return;
    }
    await this.spawnChild();
  }

  /** 主动停 + 重读配置 + 视情况重启 */
  async reload(): Promise<void> {
    this.opts.log('info', 'fns.supervisor.reload');
    this.childGeneration += 1;
    this.killChild();
    this.restartCount = 0;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    this.clearDisconnectedRestart();
    await this.start();
  }

  /** 容器关闭时调用 */
  async stop(): Promise<void> {
    this.stopping = true;
    this.childGeneration += 1;
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.clearDisconnectedRestart();
    this.killChild();
  }

  // ───────────────── internal ─────────────────

  private killChild(): void {
    if (this.child) {
      try {
        this.child.kill('SIGTERM');
      } catch {
        // ignore
      }
      this.child = null;
    }
  }

  private async writeChildConfig(s: FnsSettings): Promise<void> {
    await mkdir(dirname(this.opts.configOutPath), { recursive: true });
    const cfg = {
      server: {
        api: s.api_url,
        token: s.token,
        vault: s.vault,
      },
      sync: {
        watch_path: this.opts.vaultDir,
        sync_notes: true,
        sync_files: true,
        sync_config: false,
        upload_concurrency: 2,
        exclude_patterns: ['.git/**', '.trash/**', '*.tmp', '.DS_Store'],
        file_chunk_size: 524288,
      },
      client: {
        reconnect_max_retries: 999,
        reconnect_base_delay: 3,
        heartbeat_interval: 30,
      },
      logging: {
        level: 'INFO',
        file: '',
      },
    };
    await writeFile(this.opts.configOutPath, stringifyYaml(cfg), 'utf-8');
  }

  private async spawnChild(): Promise<void> {
    if (!this.current) return;
    if (!existsSync(this.opts.cliDir)) {
      this.opts.log('error', 'fns.supervisor.cli_dir_missing', { dir: this.opts.cliDir });
      await this.updateStatus('error', `cli dir missing: ${this.opts.cliDir}`);
      return;
    }
    await this.writeChildConfig(this.current);

    const python = this.opts.python ?? 'python3';
    const args = ['-m', 'fns_cli.main', 'run', '-c', this.opts.configOutPath];

    this.opts.log('info', 'fns.supervisor.spawn', {
      python, args, cliDir: this.opts.cliDir, vault: this.opts.vaultDir,
    });

    const child = spawn(python, args, {
      cwd: this.opts.cliDir,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const childGeneration = ++this.childGeneration;
    this.child = child;
    await this.updateStatus('unknown');

    const onLine = (data: Buffer) => {
      const text = data.toString('utf-8');
      for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        process.stdout.write(`[fns] ${trimmed}\n`);
        // 简单解析状态
        if (STATUS_CONNECTED.test(trimmed)) {
          this.clearDisconnectedRestart();
          this.restartCount = 0;
          void this.updateStatus('connected');
        } else if (STATUS_DISCONNECTED.test(trimmed)) {
          void this.updateStatus('disconnected', trimmed);
          this.scheduleDisconnectedRestart(childGeneration, trimmed);
        }
      }
    };
    child.stdout?.on('data', onLine);
    child.stderr?.on('data', onLine);

    child.on('exit', (code, signal) => {
      this.opts.log('warn', 'fns.supervisor.exit', { code, signal });
      this.clearDisconnectedRestart();
      if (this.child === child) this.child = null;
      if (this.stopping) return;
      if (childGeneration !== this.childGeneration) return;
      if (!this.current?.enabled) return;
      void this.updateStatus('disconnected', `fns_cli exited code=${code ?? 'null'} signal=${signal ?? 'null'}`);
      // 调度重启
      const delay = RESTART_BACKOFFS_MS[Math.min(this.restartCount, RESTART_BACKOFFS_MS.length - 1)] ?? 60_000;
      this.restartCount += 1;
      this.opts.log('info', 'fns.supervisor.restart_scheduled', { delay_ms: delay, attempt: this.restartCount });
      this.restartTimer = setTimeout(() => {
        this.restartTimer = null;
        if (!this.stopping && childGeneration === this.childGeneration) void this.spawnChild();
      }, delay);
    });
  }

  private clearDisconnectedRestart(): void {
    if (!this.disconnectedRestartTimer) return;
    clearTimeout(this.disconnectedRestartTimer);
    this.disconnectedRestartTimer = null;
  }

  private scheduleDisconnectedRestart(childGeneration: number, reason: string): void {
    if (this.disconnectedRestartTimer) return;
    this.disconnectedRestartTimer = setTimeout(() => {
      this.disconnectedRestartTimer = null;
      if (this.stopping) return;
      if (childGeneration !== this.childGeneration) return;
      if (!this.child) return;
      if (this.lastStatus !== 'disconnected') return;
      this.opts.log('warn', 'fns.supervisor.restart_after_disconnect', {
        delay_ms: DISCONNECTED_RESTART_MS,
        reason,
      });
      this.killChild();
    }, DISCONNECTED_RESTART_MS);
  }

  private async updateStatus(status: NonNullable<FnsSettings['last_status']>, error?: string): Promise<void> {
    if (!this.current) return;
    this.lastStatus = status;
    const next: FnsSettings = {
      ...this.current,
      last_status: status,
      last_status_at: new Date().toISOString(),
    };
    if (error) {
      next.last_error = error;
    } else {
      delete next.last_error;
    }
    this.current = next;
    try {
      await saveFnsYaml(next);
    } catch (e) {
      this.opts.log('error', 'fns.supervisor.status_save_failed', { err: (e as Error).message });
    }
  }
}

/** Helper for main.ts */
export function defaultFnsCliDir(): string {
  // 优先环境变量
  const env = process.env.OPENNOTE_FNS_CLI_DIR;
  if (env) return resolve(env);
  // 默认部署路径(Dockerfile 里 COPY deploy/fns-sync 到这里)
  return '/app/fns-sync';
}

export function defaultFnsConfigOutPath(): string {
  return process.env.OPENNOTE_FNS_RUNTIME_CONFIG ?? '/data/fns-runtime-config.yaml';
}
