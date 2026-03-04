import NextAuth, { type AuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ensureUserSettings } from "@/lib/auth/user";

const credentialsSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(50).optional(),
});

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Guest",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw ?? {});
        const email = parsed.success && parsed.data.email ? parsed.data.email : "demo@lumo.app";
        const name = parsed.success && parsed.data.name ? parsed.data.name : "Lumo Demo";

        const user = await prisma.user.upsert({
          where: { email },
          update: { name },
          create: { email, name },
        });

        await ensureUserSettings(user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
      }

      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.sub ?? "",
        email: token.email,
        name: token.name,
      };

      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export const handlers = {
  GET: handler,
  POST: handler,
};

export function auth() {
  return getServerSession(authOptions);
}
