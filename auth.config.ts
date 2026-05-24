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
    async signIn({ user, account }) {
      const email = user?.email?.toLowerCase();
      if (!email) return false;
      if (account?.provider === "credentials") return true;
      if (allowedEmails.length === 0) return true;
      return allowedEmails.includes(email);
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null | undefined;
        session.user.image = token.picture as string | null | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
