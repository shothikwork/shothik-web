import { afterEach, describe, expect, it, vi } from "vitest";

describe("next.config rewrites", () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    if (originalApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
    vi.resetModules();
  });

  it("defaults API proxy origin when NEXT_PUBLIC_API_URL is not set", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.resetModules();

    const { default: nextConfig } = await import("@/next.config");
    const rewrites = await nextConfig.rewrites?.();

    expect(rewrites?.fallback).toEqual([
      { source: "/api/:path*", destination: "https://shothik.work/api/:path*" },
      { source: "/paraphrase/:path*", destination: "https://shothik.work/paraphrase/:path*" },
    ]);
  });

  it("strips trailing slashes from NEXT_PUBLIC_API_URL when building rewrite destinations", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://example.com///";
    vi.resetModules();

    const { default: nextConfig } = await import("@/next.config");
    const rewrites = await nextConfig.rewrites?.();

    expect(rewrites?.fallback).toEqual([
      { source: "/api/:path*", destination: "https://example.com/api/:path*" },
      { source: "/paraphrase/:path*", destination: "https://example.com/paraphrase/:path*" },
    ]);
  });
});
