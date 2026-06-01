type LogFn = (level: string, event: string, meta?: unknown) => void;

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
