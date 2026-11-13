import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare, hash } from "bcryptjs";
import { db } from "./db";
import { getPaymentClients, sheetPasswordFor } from "./payments-sheet";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).trim().toLowerCase();
        const password = credentials.password as string;

        // Every client listed in the payments sheet gets a login:
        // username = their sheet email, password = their sheet phone number
        // (digits only, 10 digits), or 0000000000 when no phone is on file.
        const sheetClients = await getPaymentClients();
        const sheetClient = sheetClients.find((c) => c.email === email) || null;
        const sheetPassword = sheetClient ? sheetPasswordFor(sheetClient) : null;
        const typed = password.replace(/\D/g, "") || password;

        let user = await db.user.findUnique({ where: { email } });

        if (!user && sheetClient && sheetPassword && typed === sheetPassword) {
          // First sign-in: create the account from the sheet
          user = await db.user.create({
            data: {
              email,
              name: sheetClient.name,
              phone: sheetClient.phoneDisplay || null,
              role: "CLIENT",
              hashedPassword: await hash(sheetPassword, 10),
            },
          });
        }

        if (!user || !user.hashedPassword) return null;

        let isValid = await compare(password, user.hashedPassword);

        // Still on the 0000000000 placeholder and the sheet now has a phone number:
        // accept the phone number and make it the password.
        if (
          !isValid &&
          sheetClient &&
          sheetPassword &&
          sheetPassword !== "0000000000" &&
          typed === sheetPassword &&
          (await compare("0000000000", user.hashedPassword))
        ) {
          await db.user.update({
            where: { id: user.id },
            data: { hashedPassword: await hash(sheetPassword, 10) },
          });
          isValid = true;
        }

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      if (token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        token.role = dbUser?.role ?? "CLIENT";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
