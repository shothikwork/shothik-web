import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../route";

describe("POST /api/extract-source", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["missing url", {}, 400, "URL is required"],
    ["invalid url format", { url: "not a url" }, 400, "Invalid URL format"],
    ["non-http protocol", { url: "ftp://example.com" }, 400, "Only HTTP/HTTPS URLs are supported"],
    ["blocked hostname", { url: "http://localhost:3000/test" }, 400, "This URL is not allowed."],
  ])("returns %s validation error", async (_label, payload, status, error) => {
    const req = { json: async () => payload } as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(status);
    expect(data.error).toBe(error);
  });

  it("returns youtube summary response without fetching the URL", async () => {
    const req = { json: async () => ({ url: "https://www.youtube.com/watch?v=abc123" }) } as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.type).toBe("youtube");
    expect(data.title).toContain("abc123");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("returns 422 when fetch response is not ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("fail", { status: 502 }));

    const req = { json: async () => ({ url: "https://example.com" }) } as any;
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toContain("status 502");
  });

  it("returns 422 when URL points to a PDF", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("%PDF-1.4", {
        status: 200,
        headers: { "content-type": "application/pdf" },
      })
    );

    const req = { json: async () => ({ url: "https://example.com/file.pdf" }) } as any;
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toContain("points to a PDF");
  });

  it("extracts main content and prefers og:title", async () => {
    const html = `<!doctype html>
      <html>
        <head>
          <title>Document Title</title>
          <meta property="og:title" content="OG Title" />
        </head>
        <body>
          <nav>nav text that should be removed</nav>
          <main>Main content should be extracted. It should be long enough to avoid fallback.</main>
          <footer>footer content that should be removed</footer>
        </body>
      </html>`;

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      })
    );

    const req = { json: async () => ({ url: "https://example.com/article" }) } as any;
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.type).toBe("url");
    expect(data.title).toBe("OG Title");
    expect(data.text).toContain("Main content should be extracted");
    expect(data.text).not.toContain("nav text");
    expect(data.text).not.toContain("footer content");
  });

  it("returns fallback message when extracted content is too short", async () => {
    const html = `<!doctype html><html><head><title>Short</title></head><body><main>hi</main></body></html>`;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(html, {
        status: 200,
        headers: { "content-type": "text/html" },
      })
    );

    const url = "https://example.com/short";
    const req = { json: async () => ({ url }) } as any;
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.text).toContain("could not be fully extracted");
    expect(data.text).toContain(url);
  });
});

