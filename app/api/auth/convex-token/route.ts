import { NextRequest, NextResponse } from "next/server";
import { SignJWT, importPKCS8 } from "jose";
import logger from "@/lib/logger";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://prod-api.shothik.ai";

function getConvexSiteUrl(): string {
  if (process.env.CONVEX_SITE_URL) {
    return process.env.CONVEX_SITE_URL;
  }
  const cloudUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
  if (cloudUrl.includes(".convex.cloud")) {
    return cloudUrl.replace(".convex.cloud", ".convex.site");
  }
  throw new Error(
    "CONVEX_SITE_URL is not set and cannot be derived from NEXT_PUBLIC_CONVEX_URL. " +
    "Set CONVEX_SITE_URL in your environment variables."
  );
}

const APPLICATION_ID = "shothik-publishing";

let cachedPrivateKey: CryptoKey | null = null;

async function getPrivateKey() {
  if (cachedPrivateKey) return cachedPrivateKey;

  const pemRaw = process.env.JWT_PRIVATE_KEY;
  if (!pemRaw) {
    throw new Error("JWT_PRIVATE_KEY environment variable is not set");
  }

  let pem = pemRaw.replace(/\\n/g, "\n").trim();

  if (!pem.startsWith("-----BEGIN")) {
    pem = `-----BEGIN PRIVATE KEY-----\n${pem}\n-----END PRIVATE KEY-----`;
  }

  cachedPrivateKey = await importPKCS8(pem, "RS256");
  return cachedPrivateKey;
}

async function verifyAccessToken(
  accessToken: string
): Promise<{ userId: string; email?: string; name?: string } | null> {
  try {
    const res = await fetch(`${API_URL}/api/user/profile`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const user = data?.data || data?.user || data;

    if (!user) return null;

    const userId = user._id || user.id || user.sub;
    if (!userId) return null;

    return {
      userId,
      email: user.email,
      name: user.name || user.fullName,
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token is required" },
        { status: 400 }
      );
    }

    const verified = await verifyAccessToken(accessToken);

    if (!verified) {
      return NextResponse.json(
        { error: "Invalid or expired access token" },
        { status: 401 }
      );
    }

    const privateKey = await getPrivateKey();
    const now = Math.floor(Date.now() / 1000);
    const siteUrl = getConvexSiteUrl();

    const convexToken = await new SignJWT({
      sub: verified.userId,
      email: verified.email || undefined,
      name: verified.name || undefined,
    })
      .setProtectedHeader({
        alg: "RS256",
        kid: "shothik-convex-1",
        typ: "JWT",
      })
      .setIssuer(siteUrl)
      .setAudience(APPLICATION_ID)
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(privateKey);

    return NextResponse.json({ token: convexToken });
  } catch (error: any) {
    logger.error("Convex token exchange error:", error.message);
    return NextResponse.json(
      { error: "Token exchange failed" },
      { status: 500 }
    );
  }
}
