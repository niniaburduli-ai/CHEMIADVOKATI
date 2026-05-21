import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
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
        };
      },
    }),
  ],
});
