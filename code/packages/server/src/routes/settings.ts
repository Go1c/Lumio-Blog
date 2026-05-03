import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Hono, Context } from 'hono';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import {
  type AdminSettings,
  type Features,
  type FnsSettings,
  type SettingsSection,
  adminSettingsPatchSchema,
  defaultFeatures,
  defaultFns,
  featuresSchema,
  fnsSettingsSchema,
} from '@opennote/core';
import type { RouteDeps } from '../routes.js';
import { AuditLog } from '../audit.js';
import { AuthService, getSessionToken } from '../auth.js';
import { TokenService, requireToken } from '../tokens.js';

/**
 * WS-G1 — Settings API
 *
 * 路由:
 *   GET   /api/admin/settings  -> AdminSettings(整合 config.yaml + features.yaml)
 *   PATCH /api/admin/settings  -> 局部更新,zod 校验,写回 yaml,emit settings.changed,触发 sync
 *
 * 文件锁:目前是单进程内存 mutex,足够避免与 watcher 自身的写竞态。
 * TODO: 多进程部署时换成 proper-lockfile 或 fcntl。
 */

// ---------------- 内存 mutex ----------------
let chain: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.catch(() => undefined);
  return next;
}

// ---------------- 路径辅助 ----------------
function configPath(): string {
  return resolve(process.env.OPENNOTE_CONFIG ?? './config.yaml');
}
function featuresPath(): string {
  // 与 config.yaml 同目录,文件名固定 features.yaml
  const env = process.env.OPENNOTE_FEATURES;
  if (env) return resolve(env);
  return resolve(dirname(configPath()), 'features.yaml');
}
function fnsConfigPath(): string {
  // 单独存,token 是敏感字段,不进 config.yaml / features.yaml
  const env = process.env.OPENNOTE_FNS_CONFIG;
  if (env) return resolve(env);
  return resolve(dirname(configPath()), 'fns-config.yaml');
}

// ---------------- features.yaml 加载/保存 ----------------
export async function loadFeaturesYaml(path = featuresPath()): Promise<Features> {
  if (!existsSync(path)) return defaultFeatures();
  const raw = await readFile(path, 'utf-8');
  const data = parseYaml(raw) ?? {};
  // 浅合并 default 以便部分缺失字段时不崩
  const merged = mergeWithDefaults(data, defaultFeatures());
  const parsed = featuresSchema.safeParse(merged);
  if (!parsed.success) {
    throw new Error(`features.yaml invalid: ${parsed.error.message}`);
  }
  return parsed.data;
}

export async function saveFeaturesYaml(features: Features, path = featuresPath()): Promise<void> {
  const yaml = stringifyYaml(features);
  await writeFile(path, yaml, 'utf-8');
}

// ---------------- fns-config.yaml 加载/保存 ----------------
export async function loadFnsYaml(path = fnsConfigPath()): Promise<FnsSettings> {
  if (!existsSync(path)) return defaultFns() as FnsSettings;
  const raw = await readFile(path, 'utf-8');
  const data = parseYaml(raw) ?? {};
  const merged = mergeWithDefaults(data, defaultFns());
  const parsed = fnsSettingsSchema.safeParse(merged);
  if (!parsed.success) {
    throw new Error(`fns-config.yaml invalid: ${parsed.error.message}`);
  }
  return parsed.data as FnsSettings;
}
export async function saveFnsYaml(fns: FnsSettings, path = fnsConfigPath()): Promise<void> {
  await writeFile(path, stringifyYaml(fns), 'utf-8');
}

// ---------------- config.yaml 加载/保存(全量,保留未知字段) ----------------
async function loadConfigYamlRaw(path = configPath()): Promise<Record<string, unknown>> {
  if (!existsSync(path)) return {};
  const raw = await readFile(path, 'utf-8');
  return (parseYaml(raw) ?? {}) as Record<string, unknown>;
}
async function saveConfigYamlRaw(data: Record<string, unknown>, path = configPath()): Promise<void> {
  await writeFile(path, stringifyYaml(data), 'utf-8');
}

// ---------------- 整合 -> AdminSettings ----------------
async function readAdminSettings(): Promise<AdminSettings> {
  const cfg = await loadConfigYamlRaw();
  const features = await loadFeaturesYaml();
  const fns = await loadFnsYaml();
  const site = (cfg.site as AdminSettings['site']) ?? { title: '', url: '' };
  const author = (cfg.author as AdminSettings['author']) ?? { name: '' };
  const theme = (cfg.theme as AdminSettings['theme']) ?? {};
  const seo = (cfg.seo as AdminSettings['seo']) ?? {};
  const home = (cfg.home as AdminSettings['home']) ?? {};
  return { site, author, theme, seo, home, features, fns };
}

// ---------------- 浅 merge(用于 PATCH 一个 section 内若干字段时,与现有 yaml 合并) ----------------
function shallowMerge<T extends Record<string, unknown>>(base: T | undefined, patch: Partial<T>): T {
  return { ...(base ?? {}), ...patch } as T;
}

function mergeWithDefaults<T>(value: unknown, def: T): T {
  if (value === null || value === undefined || typeof value !== 'object') return def;
  const out: Record<string, unknown> = { ...(def as Record<string, unknown>) };
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const dv = (def as Record<string, unknown>)[k];
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && dv !== undefined && typeof dv === 'object' && !Array.isArray(dv)) {
      out[k] = mergeWithDefaults(v, dv);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

// ---------------- 审计 settings_changes ----------------
function writeSettingsChange(deps: RouteDeps, actor: string, sections: SettingsSection[], diff: unknown): void {
  try {
    deps.db
      .prepare(
        `INSERT INTO settings_changes (ts, actor, section, diff_json) VALUES (?, ?, ?, ?)`,
      )
      .run(new Date().toISOString(), actor, sections.join(','), JSON.stringify(diff));
  } catch (e) {
    // 表可能未迁移上(主 agent 还没集成 migration); 不阻塞主流程
    console.error('[settings] settings_changes insert failed', e);
  }
}

// ---------------- middleware:复用主路由的 actor 解析 ----------------
function buildActorMw(deps: RouteDeps) {
  const auth = new AuthService(deps.db);
  const tokens = new TokenService(deps.db);
  return async (c: Context, next: () => Promise<void>) => {
    const cookie = getSessionToken(c);
    if (cookie && auth.isValidSession(cookie)) {
      c.set('actor', 'owner');
      return next();
    }
    return requireToken(tokens, 'admin')(c, async () => {
      c.set('actor', `token:${c.get('tokenScope')}`);
      await next();
    });
  };
}

// ---------------- 路由注册 ----------------
export function register(app: Hono, deps: RouteDeps): void {
  const audit = new AuditLog(deps.db);
  const actorMw = buildActorMw(deps);

  app.get('/api/admin/settings', actorMw, async (c) => {
    try {
      const settings = await readAdminSettings();
      return c.json(settings);
    } catch (e) {
      console.error('[settings] GET failed', e);
      return c.json({ error: { code: 'internal_error', message: (e as Error).message } }, 500);
    }
  });

  app.patch('/api/admin/settings', actorMw, async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return c.json({ error: { code: 'validation_failed', message: 'json body required' } }, 400);
    }
    const parsed = adminSettingsPatchSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return c.json(
        {
          error: {
            code: 'validation_failed',
            field: issue?.path.join('.'),
            message: issue?.message,
          },
        },
        400,
      );
    }
    const patch = parsed.data;
    const sections: SettingsSection[] = [];

    return withLock(async () => {
      const cfg = await loadConfigYamlRaw();
      let features = await loadFeaturesYaml();
      let fns = await loadFnsYaml();
      let featuresChanged = false;
      let fnsChanged = false;

      // site / author / theme / seo / home -> config.yaml
      const cfgKeys: SettingsSection[] = ['site', 'author', 'theme', 'seo', 'home'];
      for (const k of cfgKeys) {
        const part = patch[k];
        if (part && Object.keys(part).length > 0) {
          cfg[k] = shallowMerge(cfg[k] as Record<string, unknown> | undefined, part as Record<string, unknown>);
          sections.push(k);
        }
      }

      // features -> features.yaml(deep merge over loaded features)
      if (patch.features) {
        const merged = mergeWithDefaults(patch.features, features);
        const v = featuresSchema.safeParse(merged);
        if (!v.success) {
          const issue = v.error.issues[0];
          return c.json(
            { error: { code: 'validation_failed', field: `features.${issue?.path.join('.')}`, message: issue?.message } },
            400,
          );
        }
        features = v.data;
        featuresChanged = true;
        sections.push('features');
      }

      // fns -> fns-config.yaml(避免 last_status / last_error 被前端 PATCH 覆盖)
      if (patch.fns) {
        const incoming = { ...patch.fns };
        // 不允许前端写 server-managed 字段
        delete (incoming as Partial<FnsSettings>).last_status;
        delete (incoming as Partial<FnsSettings>).last_status_at;
        delete (incoming as Partial<FnsSettings>).last_error;
        const merged = mergeWithDefaults(incoming, fns);
        const v = fnsSettingsSchema.safeParse(merged);
        if (!v.success) {
          const issue = v.error.issues[0];
          return c.json(
            { error: { code: 'validation_failed', field: `fns.${issue?.path.join('.')}`, message: issue?.message } },
            400,
          );
        }
        fns = v.data as FnsSettings;
        fnsChanged = true;
        sections.push('fns');
      }

      if (sections.length === 0) {
        return c.json({ error: { code: 'validation_failed', message: 'no fields' } }, 400);
      }

      // 写盘
      await saveConfigYamlRaw(cfg);
      if (featuresChanged) await saveFeaturesYaml(features);
      if (fnsChanged) await saveFnsYaml(fns);

      // 审计
      const actor = c.get('actor') ?? 'owner';
      audit.write({
        actor,
        action: 'settings.patch',
        target: sections.join(','),
        diff: JSON.stringify(patch),
      });
      writeSettingsChange(deps, actor, sections, patch);

      // 事件
      deps.bus.emit({ kind: 'settings.changed', sections });

      // 触发 sync(让站点 rerender 拿新 config)
      // 不 await,避免 PATCH 阻塞;失败也仅 log
      void deps.triggerSync().catch((e) => console.error('[settings] triggerSync failed', e));

      return c.json({ ok: true, patched: sections });
    });
  });
}
