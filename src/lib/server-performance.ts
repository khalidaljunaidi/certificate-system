const DEFAULT_SLOW_THRESHOLD_MS = 300;
const DEFAULT_ROUTE_WARNING_THRESHOLD_MS = 2000;

function performanceWarningsEnabled() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.ENABLE_PERFORMANCE_GUARDRAILS === "true"
  );
}

function nowMs() {
  return performance.now();
}

export async function withServerTiming<T>(
  label: string,
  operation: () => Promise<T>,
  thresholdMs = DEFAULT_SLOW_THRESHOLD_MS,
): Promise<T> {
  const startedAt = nowMs();

  try {
    return await operation();
  } finally {
    const durationMs = Math.round(nowMs() - startedAt);

    if (durationMs >= thresholdMs) {
      console.log(`[perf] ${label} ${durationMs}ms`);
    }
  }
}

export function logServerTiming(
  label: string,
  startedAt: number,
  thresholdMs = DEFAULT_SLOW_THRESHOLD_MS,
) {
  const durationMs = Math.round(nowMs() - startedAt);

  if (durationMs >= thresholdMs) {
    console.log(`[perf] ${label} ${durationMs}ms`);
  }
}

export function warnIfRouteTimingExceeded(
  route: string,
  startedAt: number,
  thresholdMs = DEFAULT_ROUTE_WARNING_THRESHOLD_MS,
) {
  if (!performanceWarningsEnabled()) {
    return;
  }

  const durationMs = Math.round(nowMs() - startedAt);

  if (durationMs >= thresholdMs) {
    console.warn(
      `[perf][route] ${route} ${durationMs}ms exceeded ${thresholdMs}ms budget`,
    );
  }
}

export function markServerTimingStart() {
  return nowMs();
}
