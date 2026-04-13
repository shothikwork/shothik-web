import { describe, expect, it, vi } from 'vitest';
import { trackUsageSafe } from '../usage-tracking';

vi.mock('@/convex/_generated/api', () => ({
  api: {
    llmUsage: {
      trackUsage: 'llmUsage.trackUsage',
    },
  },
}));

describe('trackUsageSafe', () => {
  it('calls the llmUsage.trackUsage mutation', async () => {
    const convex = {
      mutation: vi.fn(),
    };

    const payload = {
      userId: 'u1',
      tool: 'grammar',
      provider: 'test',
      tokens: 10,
      inputTokens: 5,
      outputTokens: 5,
      costUsd: 0.01,
    };

    await expect(trackUsageSafe(convex as any, payload)).resolves.toBeUndefined();

    expect(convex.mutation).toHaveBeenCalledTimes(1);
    expect(convex.mutation).toHaveBeenCalledWith('llmUsage.trackUsage', payload);
  });
});
