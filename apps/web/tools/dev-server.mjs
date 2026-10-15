#!/usr/bin/env node
/**
 * dev-server.mjs —— 「开发服务器进程」启动器
 * ============================================================================
 * 用途：
 *   用 Vite 的 Node API（import { createServer } from "vite"）在同一进程内起
 *   开发服务器，并让进程只在「web 端关闭」时才退出，不因 Vite 报错 / 请求错误 /
 *   依赖崩溃而自己死掉。
 *
 * 生命周期规则：
 *   1) 有浏览器客户端（HMR WebSocket）连着时，永不自动退出；Vite 内部报错只打日志。
 *   2) 最后一个客户端断开后，等待宽限期（默认 60000ms）再退出；宽限期内重连则取消退出。
 *   3) 宽限期结束仍无客户端 → server.close() 优雅退出，退出码 0。
 *   4) SIGINT / SIGTERM → 立即优雅退出（用户主动关闭）。
 *   5) 从启动起从未有客户端连过时默认不退出；可用 NO_CLIENT_EXIT_MS 改成超时退出。
 *
 * 环境变量：
 *   PORT               监听端口（默认 7100），端口被占用会报错退出（strictPort 语义）。
 *   IDLE_MS            最后一个客户端断开后的宽限期（毫秒，默认 60000）。
 *   NO_CLIENT_EXIT_MS  启动后「从未有客户端连接」的超时退出时间（毫秒，默认 0 = 永不退出）。
 *
 * 启动方式（在 apps/web 下）：
 *   npm run dev:auto
 *   # 或直接：
 *   node tools/dev-server.mjs
 *   # 自定义示例：
 *   PORT=8080 IDLE_MS=30000 NO_CLIENT_EXIT_MS=120000 node tools/dev-server.mjs
 *
 * 客户端在线判定：
 *   server.ws.clients.size（Vite HMR 的 WebSocket 连接数，一个打开的页面 = 一个连接）。
 *   采用 1s 轮询读取（版本无关、最稳）；宽限期远大于轮询周期，浏览器刷新造成的
 *   瞬时断开重连绝不会被误关。
 * ============================================================================
 */

import { createServer } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 🔴 改动 2026-10-14 · 用 import.meta.url 推导 apps/web 绝对路径，任意工作目录调用都能跑
const __dirname = path.dirname(fileURLToPath(import.meta.url)); // .../apps/web/tools
const webRoot = path.resolve(__dirname, ".."); // .../apps/web
const configFile = path.join(webRoot, "vite.config.ts"); // 显式指向 vite 配置文件

/** 读取非负整数环境变量，非法或缺失时回退到默认值 */
function intEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

// 🔴 改动 2026-10-14 · 三个环境变量：PORT / IDLE_MS / NO_CLIENT_EXIT_MS
const PORT = intEnv("PORT", 7100);
const IDLE_MS = intEnv("IDLE_MS", 60000);
const NO_CLIENT_EXIT_MS = intEnv("NO_CLIENT_EXIT_MS", 0);
const POLL_MS = 1000; // 轮询周期：1s

let server = null;
let shuttingDown = false;
let everConnected = false; // 是否曾有客户端连上过
let lastCount = 0; // 上一次轮询时的客户端数
let graceTimer = null; // 宽限期定时器
let noClientTimer = null; // 「从未连接」超时定时器
let pollTimer = null; // 轮询 interval

function log(msg) {
  console.log(`[dev] ${msg}`);
}

/** 优雅关闭：清空定时器 → await server.close() → process.exit(code) */
async function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;

  if (pollTimer) clearInterval(pollTimer);
  if (graceTimer) clearTimeout(graceTimer);
  if (noClientTimer) clearTimeout(noClientTimer);

  if (server) {
    try {
      await server.close();
    } catch (err) {
      console.error("[dev] 关闭服务器时出错：", err);
    }
  }
  log("开发服务器已关闭");
  process.exit(code);
}

// 用户主动关闭：Ctrl+C / 系统终止信号 → 立即优雅退出
process.on("SIGINT", () => {
  log("收到 SIGINT，正在关闭...");
  shutdown(0);
});
process.on("SIGTERM", () => {
  log("收到 SIGTERM，正在关闭...");
  shutdown(0);
});

// 🔴 改动 2026-10-14 · Vite 内部报错 / 请求错误只打日志，绝不退出（保证「只有关闭 web 端才关」）
process.on("uncaughtException", (err) => {
  console.error("[dev] uncaughtException（已忽略，继续运行）：", err);
});
process.on("unhandledRejection", (err) => {
  console.error("[dev] unhandledRejection（已忽略，继续运行）：", err);
});

/** 每个轮询周期：根据 server.ws.clients.size 推进状态机 */
function tick() {
  if (shuttingDown || !server) return;
  const count = server.ws.clients.size;

  if (count > 0) {
    // —— 有客户端在线 ——
    if (!everConnected) {
      everConnected = true;
      log("web 端已连接");
      // 首个客户端连上后，「从未连接」超时退出不再适用
      if (noClientTimer) {
        clearTimeout(noClientTimer);
        noClientTimer = null;
      }
    }
    // 宽限期内重连 → 取消退出，继续服务
    if (graceTimer) {
      clearTimeout(graceTimer);
      graceTimer = null;
      log("客户端重连，已取消退出，继续服务");
    }
  } else {
    // —— 无客户端在线 ——
    if (lastCount > 0) {
      // 刚从「有客户端」变为「无客户端」：进入宽限期
      log(`web 端已断开，${IDLE_MS}ms 内无客户端重连将退出`);
    }
    // 只有「曾经连过客户端」才启用宽限期退出（从未连接 → 默认永不退出）
    if (everConnected && !graceTimer) {
      graceTimer = setTimeout(() => {
        graceTimer = null;
        if (shuttingDown) return;
        // 宽限期到，再次确认仍无客户端才退出（防止竞态）
        if (server.ws.clients.size === 0) {
          log("宽限期结束，仍无客户端连接，正在关闭...");
          shutdown(0);
        }
      }, IDLE_MS);
    }
  }

  lastCount = count;
}

async function main() {
  server = await createServer({
    root: webRoot,
    configFile,
    // 🔴 改动 2026-10-14 · 端口默认 7100、PORT 可覆盖；strictPort：被占用直接报错，不静默换端口
    server: {
      port: PORT,
      strictPort: true,
    },
  });

  try {
    await server.listen();
  } catch (err) {
    console.error(`[dev] 启动失败（端口 ${PORT} 可能被占用）：`, err);
    process.exit(1);
  }

  const local =
    server.resolvedUrls?.local?.[0] ??
    `http://localhost:${server.config.server.port}/`;
  log(`已启动：${local}`);
  log(
    `IDLE_MS=${IDLE_MS}ms（最后客户端断开后宽限期），NO_CLIENT_EXIT_MS=${NO_CLIENT_EXIT_MS}ms（0=从未连接永不退出）`,
  );

  // 「从未连接」超时退出（默认 0 = 不启用），避免残留僵尸进程
  if (NO_CLIENT_EXIT_MS > 0) {
    noClientTimer = setTimeout(() => {
      noClientTimer = null;
      if (shuttingDown) return;
      if (!everConnected) {
        log(`启动后 ${NO_CLIENT_EXIT_MS}ms 内从未有客户端连接，正在关闭...`);
        shutdown(0);
      }
    }, NO_CLIENT_EXIT_MS);
  }

  pollTimer = setInterval(tick, POLL_MS);
}

main().catch((err) => {
  console.error("[dev] 启动异常：", err);
  process.exit(1);
});
