# Events 契约 — SSE + Webhook + 内部 EventBus

## 内部 EventBus(server/src/events.ts 已有)

```ts
type SyncEvent =
  | { kind: 'note.created';     slug: string }
  | { kind: 'note.updated';     slug: string }
  | { kind: 'note.deleted';     slug: string }
  | { kind: 'note.published';   slug: string }
  | { kind: 'note.unpublished'; slug: string }
  | { kind: 'sync.started';     diff?: { added: number; updated: number; deleted: number } }
  | { kind: 'sync.finished';    duration_ms: number };
```

> 所有 `note.*` 都会被推到 SSE `/api/admin/changes` 和注册的 webhooks。

## 新增事件(各 WS 实现)

| 事件 | 谁触发 | 谁订阅 | 备注 |
|---|---|---|---|
| `media.uploaded`     | WS-F 上传完 | dashboard 活动流 | payload `{id, filename, bytes}` |
| `media.deleted`      | WS-F | dashboard | |
| `settings.changed`   | WS-E 改 settings 后 | sync,触发重建 | payload `{section: 'site'\|'theme'\|...}` |
| `backup.started`     | WS-F | backup status 页 | payload `{job_id}` |
| `backup.done`        | WS-F | dashboard 通知 | payload `{job_id, bytes}` |
| `backup.failed`      | WS-F | dashboard 通知 | payload `{job_id, error}` |
| `webhook.delivered`  | server hook 服务 | tokens / webhook 详情页 | payload `{webhook_id, status}` |
| `webhook.failed`     | 同上 | 同上 | payload `{webhook_id, status, error}` |
| `auth.session.new`   | server auth | audit | payload `{ip}` |

## SSE 客户端约定

`/api/admin/changes` 用 SSE,event name = SyncEvent.kind。客户端示例:

```ts
const es = new EventSource('/api/admin/changes', { withCredentials: true });
es.addEventListener('note.updated', (e) => { /* refresh list */ });
es.addEventListener('sync.finished', (e) => { /* hide spinner */ });
es.addEventListener('ping', () => { /* keepalive,30s 一次 */ });
```

## Outbound webhook 约定

server 投递事件给用户配置的 webhook URL。HTTP POST,Content-Type `application/json`。

签名头(WS-E 加固):

```
X-Hub-Signature-256: sha256=<HMAC-SHA256(body, secret)>
X-Webhook-Event: note.published
X-Webhook-Id: <事件唯一 ID,可去重>
```

重试策略(WS-E 实现):

| 尝试 | 延迟 |
|---|---|
| 1 | 立即 |
| 2 | 30s |
| 3 | 5 min |
| 4 | 30 min |
| 5 | 6 h |
| 之后 | 暂停,标记 `webhook.failed` 事件,UI 给重发按钮 |

## 内部消息总线扩展

如果要支持插件或更多 subscriber,考虑迁移到 Node EventEmitter -> 简单 pub/sub 实现见 `events.ts`,目前一个进程内可以继续用。多进程时换成 Redis pub/sub(超出本期范围)。
