# OG fonts

Satori 需要 `Buffer` 形式的 .ttf / .otf 字体。`render.ts` 启动时会按文件名读取这两个:

| 文件名 | weight | 用途 |
|---|---|---|
| `Inter-Regular.ttf` | 400 | 正文 / 描述 |
| `Inter-Bold.ttf` | 700 | 标题 |

## 部署时下载

Inter 是 SIL OFL 许可,可以打进镜像。下面是一种做法(在 `Dockerfile` 或部署脚本里跑一次):

```sh
mkdir -p code/packages/server/src/og/fonts
curl -sSL -o /tmp/inter.zip https://github.com/rsms/inter/releases/download/v4.0/Inter-4.0.zip
unzip -j /tmp/inter.zip 'Inter Desktop/Inter-Regular.otf' -d code/packages/server/src/og/fonts
unzip -j /tmp/inter.zip 'Inter Desktop/Inter-Bold.otf'    -d code/packages/server/src/og/fonts
mv code/packages/server/src/og/fonts/Inter-Regular.otf code/packages/server/src/og/fonts/Inter-Regular.ttf
mv code/packages/server/src/og/fonts/Inter-Bold.otf    code/packages/server/src/og/fonts/Inter-Bold.ttf
```

> 也可以换成任何其它字体 — 改 `render.ts` 的 `candidates` 数组。

## 没字体时的行为

`render.ts` 会优雅降级:返回一张 1x1 透明 PNG,日志里 `[og] render failed` warn 一次。
路由仍然 200,前端不会挂 — 但视觉效果只能等字体上线后才好。
