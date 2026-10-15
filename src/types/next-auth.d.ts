import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "candidate" | "business" | "admin" | null;
      onboardingComplete: boolean;
      isAdminAuthorized: boolean;
      authProvider: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: "candidate" | "business" | "admin" | null;
    onboardingComplete?: boolean;
    isAdminAuthorized?: boolean;
    authProvider?: string;
  }
}
