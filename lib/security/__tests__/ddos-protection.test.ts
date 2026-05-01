import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createReq(headersInit: Record<string, string>) {
  return { headers: new Headers(headersInit) } as any;
}

describe('checkDDoSProtection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('blocks when user-agent is missing or too short', async () => {
    const { checkDDoSProtection } = await import('../ddos-protection');

    const result = await checkDDoSProtection(
      createReq({ 'x-forwarded-for': '1.2.3.4' })
    );

    expect(result.allowed).toBe(false);
    expect(result.action).toBe('block');
    expect(result.reason).toBe('Invalid client');
  });

  it('challenges known bot signatures when no authorization header is present', async () => {
    const { checkDDoSProtection } = await import('../ddos-protection');

    const result = await checkDDoSProtection(
      createReq({
        'x-forwarded-for': '1.2.3.4',
        'user-agent': 'sqlmap/1.0 compatible scanner',
      })
    );

    expect(result.allowed).toBe(false);
    expect(result.action).toBe('challenge');
    expect(result.reason).toBe('Automated traffic detected');
  });

  it('blocks burst traffic and then blocks subsequent requests until expiry', async () => {
    const { checkDDoSProtection } = await import('../ddos-protection');

    const req = createReq({
      'x-forwarded-for': '1.2.3.4',
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit',
    });

    let lastResult: Awaited<ReturnType<typeof checkDDoSProtection>> | null = null;
    for (let i = 0; i < 21; i++) {
      lastResult = await checkDDoSProtection(req);
      if (i < 20) {
        vi.advanceTimersByTime(i % 2 === 0 ? 100 : 800);
      }
    }

    expect(lastResult?.allowed).toBe(false);
    expect(lastResult?.action).toBe('block');
    expect(lastResult?.reason).toBe('Burst attack detected');
    expect(lastResult?.retryAfter).toBe(3600);

    const afterBlock = await checkDDoSProtection(req);
    expect(afterBlock.allowed).toBe(false);
    expect(afterBlock.action).toBe('block');
    expect(afterBlock.reason).toBe('IP blocked due to suspicious activity');
    expect(afterBlock.retryAfter).toBe(3600);
  });

  it('blocks consistent automated request patterns', async () => {
    const { checkDDoSProtection } = await import('../ddos-protection');

    const req = createReq({
      'x-forwarded-for': '1.2.3.4',
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit',
    });

    let lastResult: Awaited<ReturnType<typeof checkDDoSProtection>> | null = null;
    for (let i = 0; i < 10; i++) {
      lastResult = await checkDDoSProtection(req);
      vi.advanceTimersByTime(100);
    }

    expect(lastResult?.allowed).toBe(false);
    expect(lastResult?.action).toBe('block');
    expect(lastResult?.reason).toBe('Automated pattern detected');
  });
});
