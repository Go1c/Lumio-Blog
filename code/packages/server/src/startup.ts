type LogFn = (level: string, event: string, meta?: unknown) => void;
type TimerId = ReturnType<typeof setTimeout>;

function errorMeta(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    };
  }
  return { message: String(error) };
}

export async function runStartupSync(
  triggerSync: () => Promise<void>,
  log: LogFn,
): Promise<boolean> {
  try {
    await triggerSync();
    return true;
  } catch (error) {
    log('error', 'startup.sync.failed', {
      ...errorMeta(error),
      recovery: 'continuing with existing generated output',
    });
    return false;
  }
}

export interface StopRuntimeDeps {
  stopBackground: () => Promise<void> | void;
  closeServer: () => Promise<void> | void;
  log: LogFn;
}

export async function stopRuntime({
  stopBackground,
  closeServer,
  log,
}: StopRuntimeDeps): Promise<void> {
  try {
    await stopBackground();
  } catch (error) {
    log('error', 'shutdown.background.failed', errorMeta(error));
  }

  try {
    await closeServer();
  } catch (error) {
    log('error', 'shutdown.server_close.failed', errorMeta(error));
  }
}

export interface ShutdownHandlerDeps {
  stopRuntime: () => Promise<void> | void;
  log: LogFn;
  exit?: (code: number) => void;
  setTimeout?: (callback: () => void, timeoutMs: number) => TimerId | number;
  clearTimeout?: (timer: TimerId | number) => void;
  timeoutMs?: number;
}

export function createShutdownHandler({
  stopRuntime: stopRuntimeFn,
  log,
  exit = (code) => process.exit(code),
  setTimeout: setTimeoutFn = setTimeout,
  clearTimeout: clearTimeoutFn = clearTimeout as (timer: TimerId | number) => void,
  timeoutMs = 10_000,
}: ShutdownHandlerDeps): (signal: NodeJS.Signals) => void {
  let shuttingDown = false;

  return (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log('info', 'shutdown.started', { signal });

    const forceTimer = setTimeoutFn(() => {
      log('error', 'shutdown.timeout', { signal, timeout_ms: timeoutMs });
      exit(1);
    }, timeoutMs);

    void Promise.resolve()
      .then(() => stopRuntimeFn())
      .finally(() => {
        clearTimeoutFn(forceTimer);
        log('info', 'shutdown.completed', { signal });
        exit(0);
      });
  };
}
