import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/db";
import { users, notifications, auditLogs } from "@/db/schema";
import { eq } from "@/db/mongo-query";
import { verifyPassword } from "@/lib/password";
import { emitWebhookEvent } from "@/lib/webhooks";

const providers: NextAuthConfig["providers"] = [];

const googleId = process.env.GOOGLE_CLIENT_ID;
const googleSecret = process.env.GOOGLE_CLIENT_SECRET;
if (googleId && googleSecret) {
  providers.push(
    Google({
      clientId: googleId,
      clientSecret: googleSecret,
    }),
  );
}

// Used so that "unknown email" and "wrong password" take the same time.
const DUMMY_HASH = "$2b$10$nRwEHKsFZCJ1zGcJ0FNaFwEaDPjzQNlVLWtKGFY90m54skdVdIk9p";

const credentialsSchema = z.object({
  email: z.string().trim().max(254).email(),
  password: z.string().min(1).max(200),
});

// Standard email + password sign-in (job seekers / staff and employers).
// Administrators are deliberately excluded: admin access still requires a
// verified Google identity matching ADMIN_EMAIL (see lib/admin-api.ts).
providers.push(
  Credentials({
    id: "credentials",
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;
      const email = parsed.data.email.toLowerCase();
      let user: typeof users.$inferSelect | undefined;
      try {
        [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      } catch {
        return null;
      }
      let ok = false;
      try {
        ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
      } catch {
        ok = false;
      }
      if (!user || !user.passwordHash || !ok) return null;
      if (user.role === "admin" || user.isAdminAuthorized) return null;
      return { id: user.id, email: user.email, name: user.name ?? null, image: user.image ?? null };
    },
  }),
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  pages: {
    signIn: "/auth/sign-in",
    error: "/auth/sign-in",
  },
  providers,
  events: {
    // Best-effort sign-in alerting: never block a legitimate sign-in because
    // an optional notification provider is unavailable.
    async signIn({ user, account, isNewUser }) {
      try {
        const email = user.email?.toLowerCase().trim();
        if (!email) return;
        const [signedInUser] = await db.select({ id: users.id, email: users.email, role: users.role })
          .from(users).where(eq(users.email, email)).limit(1);
        if (!signedInUser) return;

        await db.insert(auditLogs).values({
          actorId: signedInUser.id,
          action: "auth.sign_in",
          targetType: "user",
          targetId: signedInUser.id,
          metadata: {
            provider: account?.provider ?? "unknown",
            isNewUser: Boolean(isNewUser),
            occurredAt: new Date().toISOString(),
          },
        });
        await emitWebhookEvent("auth.sign_in", {
          userId: signedInUser.id,
          email: signedInUser.email,
          role: signedInUser.role,
          provider: account?.provider ?? "unknown",
          isNewUser: Boolean(isNewUser),
        }, { type: "user", id: signedInUser.id });

        const configuredAdminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
        const admins = await db.select({ id: users.id, email: users.email })
          .from(users).where(eq(users.role, "admin"));
        const adminRecipients = new Map<string, { id: string; email: string }>();
        for (const admin of admins) adminRecipients.set(admin.id, admin);
        // If the configured admin mailbox exists as a user, notify it even if
        // its role has not yet been fully provisioned. Never grant permissions here.
        if (configuredAdminEmail) {
          const [configuredAdmin] = await db.select({ id: users.id, email: users.email })
            .from(users).where(eq(users.email, configuredAdminEmail)).limit(1);
          if (configuredAdmin) adminRecipients.set(configuredAdmin.id, configuredAdmin);
        }
        for (const admin of adminRecipients.values()) {
          await db.insert(notifications).values({
            userId: admin.id,
            type: "announcement",
            title: "Successful sign-in",
            body: `${signedInUser.email} signed in using ${account?.provider ?? "an authentication provider"}.`,
            link: "/#/workspace/admin",
          });
        }

        const alertTo = process.env.SIGNIN_ALERT_EMAIL || configuredAdminEmail || process.env.PUBLIC_CONTACT_EMAIL;
        const resendKey = process.env.RESEND_API_KEY;
        const emailFrom = process.env.EMAIL_FROM;
        if (alertTo && resendKey && emailFrom) {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: emailFrom,
              to: [alertTo],
              subject: "StewardBridge sign-in alert",
              text: `A user successfully signed in to StewardBridge.\nEmail: ${signedInUser.email}\nProvider: ${account?.provider ?? "unknown"}\nTime: ${new Date().toISOString()}\nNew account: ${Boolean(isNewUser) ? "yes" : "no"}.`,
            }),
            signal: AbortSignal.timeout(5000),
          });
          if (!response.ok) {
            await db.insert(auditLogs).values({
              actorId: signedInUser.id,
              action: "auth.sign_in_alert_email_failed",
              targetType: "user",
              targetId: signedInUser.id,
              metadata: { status: response.status },
            }).catch(() => undefined);
          }
        }
      } catch {
        // Sign-in must remain available if notification/audit infrastructure fails.
      }
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && user?.email) {
        if ((profile as { email_verified?: boolean } | undefined)?.email_verified !== true) return false;
        const email = user.email.toLowerCase().trim();
        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
        const isAdminEmail = Boolean(adminEmail && email === adminEmail);
        const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existing) {
          // Google has just proven control of this mailbox. If someone had
          // pre-registered the address with a password (password sign-up does
          // not verify email), that password is discarded so it cannot be used
          // to take over the real owner's account.
          await db.update(users).set({
            name: user.name ?? existing.name,
            image: user.image ?? existing.image,
            passwordHash: null,
            ...(isAdminEmail ? { role: "admin" as const, isAdminAuthorized: true } : {}),
            updatedAt: new Date(),
          }).where(eq(users.id, existing.id));
        } else {
          await db.insert(users).values({
            email,
            name: user.name ?? null,
            image: user.image ?? null,
            role: isAdminEmail ? "admin" : null,
            isAdminAuthorized: isAdminEmail,
          });
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      token.authProvider = account?.provider ?? token.authProvider;
      const email = (user?.email ?? token.email)?.toLowerCase();
      if (email) {
        try {
          const [dbUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
          if (dbUser) {
            token.uid = dbUser.id;
            token.role = dbUser.role;
            token.onboardingComplete = dbUser.onboardingComplete;
            token.isAdminAuthorized = dbUser.isAdminAuthorized;
            token.email = dbUser.email;
            token.name = dbUser.name ?? undefined;
            token.picture = dbUser.image ?? undefined;
          }
        } catch {
          // Database temporarily unreachable: keep the existing token rather than failing every request.
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? "";
        session.user.role = (token.role as "candidate" | "business" | "admin" | null) ?? null;
        session.user.onboardingComplete = Boolean(token.onboardingComplete);
        session.user.isAdminAuthorized = Boolean(token.isAdminAuthorized);
        session.user.authProvider = typeof token.authProvider === "string" ? token.authProvider : "";
      }
      return session;
    },
  },
});

export const isGoogleAuthEnabled = Boolean(googleId && googleSecret);
