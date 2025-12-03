import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "admin-session";
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? process.env.SESSION_SECRET;

if (!ADMIN_SECRET) {
  throw new Error(
    "Missing ADMIN_SECRET (fallback SESSION_SECRET) environment variable for admin authentication."
  );
}

const encodedKey = new TextEncoder().encode(ADMIN_SECRET);

type AdminPayload = {
  role: "admin";
};

export async function createAdminSession() {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(encodedKey);

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export async function getAdminSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify<AdminPayload>(token, encodedKey, {
      algorithms: ["HS256"],
    });

    if (payload.role !== "admin") {
      return null;
    }

    return payload;
  } catch (error) {
    console.warn("Invalid admin session", error);
    return null;
  }
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
