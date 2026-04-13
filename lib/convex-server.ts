/**
 * Server-side Convex client utilities for Next.js API routes.
 *
 * These are used by agent-facing API routes that authenticate via shothik_ API keys
 * rather than Convex JWT sessions. All mutations here are internal (not callable from
 * browser clients) and are called with the CONVEX_DEPLOY_KEY for authorization.
 *
 * Required env vars:
 *   NEXT_PUBLIC_CONVEX_URL  — e.g. https://little-shrimp-242.convex.cloud
 *   CONVEX_DEPLOY_KEY       — Convex deploy key (prod:... or dev:...)
 */

const VALID_INTERNAL_PATHS = new Set([
  "books:createDraftInternal",
  "books:updateDraftInternal",
  "books:generateUploadUrlInternal",
  "books:saveManuscriptFileInternal",
  "books:saveCoverFileInternal",
  "forums:createPostInternal",
  "forums:reactToPostInternal",
  "forums:addChatMessageInternal",
]);

async function runInternalMutation(
  functionPath: string,
  args: Record<string, unknown>
): Promise<unknown> {
  if (!VALID_INTERNAL_PATHS.has(functionPath)) {
    throw new Error(`Unknown internal mutation path: ${functionPath}`);
  }

  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL not configured");

  const deployKey = process.env.CONVEX_DEPLOY_KEY;
  if (!deployKey) throw new Error("CONVEX_DEPLOY_KEY not configured — required for agent mutations");

  const res = await fetch(`${url}/api/mutation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Convex ${deployKey}`,
    },
    body: JSON.stringify({ path: functionPath, args }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Convex internal mutation failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  if (data.status === "error") throw new Error(data.errorMessage ?? "Convex mutation error");
  return data.value;
}

export async function createBookDraft(
  title: string,
  userId: string,
  projectId?: string
): Promise<string> {
  return runInternalMutation("books:createDraftInternal", {
    title,
    userId,
    ...(projectId ? { projectId } : {}),
  }) as Promise<string>;
}

export async function updateBookDraft(
  id: string,
  userId: string,
  updates: {
    title?: string;
    subtitle?: string;
    description?: string;
    language?: string;
    category?: string;
    subcategory?: string;
    keywords?: string[];
    listPrice?: string;
    currency?: string;
    manuscriptName?: string;
    manuscriptSize?: number;
    manuscriptFormat?: string;
  }
): Promise<void> {
  await runInternalMutation("books:updateDraftInternal", { id, userId, ...updates });
}

export async function generateUploadUrl(): Promise<string> {
  return runInternalMutation("books:generateUploadUrlInternal", {}) as Promise<string>;
}

export async function saveManuscriptFile(
  bookId: string,
  userId: string,
  storageId: string,
  fileName: string,
  fileSize: number,
  format: string
): Promise<void> {
  await runInternalMutation("books:saveManuscriptFileInternal", {
    bookId,
    userId,
    storageId,
    fileName,
    fileSize,
    format,
  });
}

export async function saveCoverFile(
  bookId: string,
  userId: string,
  storageId: string,
  dimensions: { width: number; height: number }
): Promise<void> {
  await runInternalMutation("books:saveCoverFileInternal", {
    bookId,
    userId,
    storageId,
    dimensions,
  });
}

export async function createForumPost(
  forumId: string,
  authorId: string,
  authorType: "human" | "agent",
  authorName: string,
  content: string
): Promise<string> {
  return runInternalMutation("forums:createPostInternal", {
    forumId,
    authorId,
    authorType,
    authorName,
    content,
  }) as Promise<string>;
}

export async function reactToForumPost(
  postId: string,
  forumId: string,
  reactorId: string,
  reactorType: "human" | "agent",
  reactionType: "intrigued" | "skeptical" | "impressed" | "unsettled"
): Promise<"added" | "removed" | "changed"> {
  return runInternalMutation("forums:reactToPostInternal", {
    postId,
    forumId,
    reactorId,
    reactorType,
    reactionType,
  }) as Promise<"added" | "removed" | "changed">;
}

export async function addForumChatMessage(
  forumId: string,
  authorId: string,
  authorType: "human" | "agent",
  authorName: string,
  message: string,
  replyToId?: string | null
): Promise<string> {
  return runInternalMutation("forums:addChatMessageInternal", {
    forumId,
    authorId,
    authorType,
    authorName,
    message,
    ...(replyToId ? { replyToId } : {}),
  }) as Promise<string>;
}
