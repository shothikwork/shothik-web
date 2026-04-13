import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import logger from '@/lib/logger';

interface UsagePayload {
  userId: string;
  tool: string;
  provider: string;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export async function trackUsageSafe(
  convex: ConvexHttpClient,
  payload: UsagePayload,
  maxRetries = 2
): Promise<void> {
  const trackUsageMutation = api.llmUsage.trackUsage;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await convex.mutation(trackUsageMutation, payload);
      return;
    } catch (err) {
      const isLastAttempt = attempt === maxRetries;
      if (isLastAttempt) {
        logger.error('[usage-tracking] Failed to track LLM usage after retries', {
          tool: payload.tool,
          userId: payload.userId,
          tokens: payload.tokens,
          costUsd: payload.costUsd,
          error: err instanceof Error ? err.message : String(err),
        });
      } else {
        const backoffMs = 200 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }
  }
}
