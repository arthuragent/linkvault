import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";

export async function POST(req: Request) {
  let body: { email?: string; name?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.toLowerCase().trim();
  const password = body.password;
  const name = body.name?.trim() || null;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const allowedEmails = (process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allowedEmails.length > 0 && !allowedEmails.includes(email)) {
    return NextResponse.json(
      { error: "This email is not allowed" },
      { status: 403 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    const user = existing[0];
    if (user.passwordHash) {
      return NextResponse.json(
        { error: "An account with that email already exists" },
        { status: 409 },
      );
    }
    await db
      .update(users)
      .set({ passwordHash, name: user.name ?? name })
      .where(eq(users.id, user.id));
    return NextResponse.json({ ok: true, id: user.id });
  }

  const inserted = await db
    .insert(users)
    .values({ email, name, passwordHash })
    .returning({ id: users.id });

  return NextResponse.json({ ok: true, id: inserted[0]?.id });
}
