import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "smart-retail-default-secure-secret-2026"
);

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  shopId?: string;
  shopName?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<TokenPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get("retail_token")?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getAuthFromRequest(req: NextRequest): Promise<TokenPayload | null> {
  const token = req.cookies.get("retail_token")?.value || 
                req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getCurrentShopAndUser() {
  const session = await getSession();
  if (!session?.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      shopMembers: {
        include: {
          shop: true,
        },
      },
    },
  });

  if (!user) return null;

  const currentMember = session.shopId
    ? user.shopMembers.find((m) => m.shopId === session.shopId)
    : user.shopMembers[0];

  return {
    user,
    shop: currentMember?.shop || null,
    role: currentMember?.role || user.role,
  };
}
