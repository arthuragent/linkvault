import type { NextAuthConfig } from "next-auth";

const allowedEmails = (process.env.ALLOWED_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/verify",
  },
  providers: [],
  callbacks: {
    async signIn({ user }) {
      const email = user?.email?.toLowerCase();
      if (!email) return false;
      if (allowedEmails.length === 0) return true;
      return allowedEmails.includes(email);
    },
  },
} satisfies NextAuthConfig;
