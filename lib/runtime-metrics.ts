import { logger } from "./logger";

interface CounterMetric {
  count: number;
  lastOccurred: number;
}

interface GaugeMetric {
  value: number;
  lastUpdated: number;
}

interface MetricsSnapshot {
  counters: Record<string, CounterMetric>;
  gauges: Record<string, GaugeMetric>;
  collectedAt: number;
  uptimeMs: number;
}

const counters = new Map<string, CounterMetric>();
const gauges = new Map<string, GaugeMetric>();
const startTime = Date.now();

export function incrementCounter(name: string, amount: number = 1): void {
  const existing = counters.get(name);
  if (existing) {
    existing.count += amount;
    existing.lastOccurred = Date.now();
  } else {
    counters.set(name, { count: amount, lastOccurred: Date.now() });
  }
}

export function setGauge(name: string, value: number): void {
  gauges.set(name, { value, lastUpdated: Date.now() });
}

export function getMetricsSnapshot(): MetricsSnapshot {
  const snapshot: MetricsSnapshot = {
    counters: {},
    gauges: {},
    collectedAt: Date.now(),
    uptimeMs: Date.now() - startTime,
  };

  for (const [name, metric] of counters) {
    snapshot.counters[name] = { ...metric };
  }
  for (const [name, metric] of gauges) {
    snapshot.gauges[name] = { ...metric };
  }

  return snapshot;
}

export function resetMetrics(): void {
  counters.clear();
  gauges.clear();
}

const LOG_INTERVAL_MS = 5 * 60 * 1000;
let lastLogTime = 0;

export function maybeLogMetrics(): void {
  const now = Date.now();
  if (now - lastLogTime < LOG_INTERVAL_MS) return;
  lastLogTime = now;

  const snapshot = getMetricsSnapshot();
  const nonZeroCounters: Record<string, number> = {};
  for (const [name, metric] of Object.entries(snapshot.counters)) {
    if (metric.count > 0) nonZeroCounters[name] = metric.count;
  }

  if (Object.keys(nonZeroCounters).length > 0) {
    logger.info("Runtime metrics", {
      counters: nonZeroCounters,
      gauges: Object.fromEntries(
        Object.entries(snapshot.gauges).map(([k, v]) => [k, v.value])
      ),
      uptimeMin: Math.round(snapshot.uptimeMs / 60_000),
    });
  }
}
