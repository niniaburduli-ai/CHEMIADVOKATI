import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { LoginSchema } from "@/lib/validators";

class InvalidCredentials extends CredentialsSignin {
  code = "credentials";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) throw new InvalidCredentials();

        await dbConnect();
        const user = await User.findOne({ email: parsed.data.email }).lean();
        if (!user || !user.passwordHash) throw new InvalidCredentials();

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) throw new InvalidCredentials();

        return {
          id: String(user._id),
          email: user.email,
          name: user.name,
          image: user.image ?? null,
          role: user.role ?? "user",
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;

      await dbConnect();
      const existing = await User.findOne({ email: user.email });
      if (existing) {
        const patch: Record<string, unknown> = {};
        if (!existing.image && user.image) patch.image = user.image;
        if (!existing.name && user.name) patch.name = user.name;
        if (Object.keys(patch).length) {
          await User.updateOne({ _id: existing._id }, { $set: patch });
        }
        user.id = String(existing._id);
        user.role = existing.role ?? "user";
      } else {
        const created = await User.create({
          email: user.email,
          name: user.name ?? user.email.split("@")[0],
          image: user.image ?? undefined,
          plan: "free",
          consultationsRemaining: 1,
        });
        user.id = String(created._id);
        user.role = created.role ?? "user";
      }
      return true;
    },
  },
});
