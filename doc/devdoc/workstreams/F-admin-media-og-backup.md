# WS-F — Admin 媒体库 / OG 生成器 / 备份

> **Owner**: ADM-C agent  **Duration**: 7-10 天  **Depends on**: WS-0, WS-G(media/og/backup APIs)
> **Touches**: `code/packages/web-admin/src/pages/`, 客户端依赖 server APIs

## 范围

| 页面 | 设计稿 | 实现位置 |
|---|---|---|
| 媒体库 | `hf-extras.jsx §8 HFMediaLibrary` | `web-admin/src/pages/media.tsx`(新) |
| OG 生成器 | `hf-og.jsx §17 HFOgGenerator` | `web-admin/src/pages/og.tsx`(新) |
| 备份 / 导出 | `hf-extras2.jsx §11 HFBackupExport` | `web-admin/src/pages/backup.tsx`(新) |

## 媒体库 §8

- 顶部:存储设置(R2 / S3 / 本地)+ 状态(已用空间 / 总空间)+ 引用数
- 主区:网格 vs 列表切换
- 网格:160×160 格子,显示缩略图 + 文件名 + 引用数
- 列表:表格(文件名 / 大小 / 类型 / 上传时间 / 引用数)
- 选中状态栏(底部):批量操作(删除 / 复制 URL / 移到目录)
- 拖拽上传区(整页 drag-over 时显示)
- 详情侧栏:大图预览 / EXIF / 引用列表(哪些笔记用了)
- a11y:每张图必须 alt(从文件名生成,可编辑)

## OG 生成器 §17

- 左侧:模板选择(minimal / newspaper / terminal / magazine)+ 变量编辑(标题 / 标签 / 作者 / 日期 / 副标题)
- 中间:实时预览(iframe `/api/admin/og/preview?slug=&template=&...`)
- 右侧:社交平台预览(Twitter card / 微信 / Telegram 不同尺寸)
- 底部:生成按钮(批量为所有公开文章生成,显示进度)
- "用作默认"按钮:写回 `config.yaml.seo.default_og_template`

## 备份 / 导出 §11

- 顶部:最近备份卡(成功/失败、大小、时间、下载)
- 中间:三种导出按钮
  - 完整 vault zip
  - SQLite 数据库 dump
  - 单 markdown bundle(选时间段)
- 进度条(SSE 订阅 `backup.started/done/failed`)
- 历史列表(最近 10 个备份)
- 危险区:清空 + 重置(双确认 + typed slug 验证)
- 设置:自动备份频率(off / daily / weekly)

## 数据需求

WS-G 提供:
- `GET /api/admin/media?cursor=`, `POST /api/admin/media`, `DELETE /api/admin/media/:id`, `GET /api/admin/media/:id/refs`
- `GET /api/admin/og/preview`, `GET /og/:slug.png`
- `POST /api/admin/backup`, `GET /api/admin/backup/:job_id/status`, `GET /api/admin/backup/:job_id/download`

## 验收

- [ ] 媒体库:上传 / 删除 / 复制 URL / 引用数显示正确
- [ ] OG 生成:4 模板都能预览,生成 PNG 与设计稿一致
- [ ] 备份:小型 vault 备份在 60s 内完成,下载链接有效
- [ ] 危险区操作必须双确认 + typed slug

## 文件清单

```
code/packages/web-admin/src/pages/media.tsx       (新)
code/packages/web-admin/src/pages/og.tsx          (新)
code/packages/web-admin/src/pages/backup.tsx      (新)
code/packages/web-admin/src/components/uploader.tsx  (新,跨页用)
```

## 不要碰

其他 WS 的页面 / 后端路由(只消费 WS-G 给的 API)
