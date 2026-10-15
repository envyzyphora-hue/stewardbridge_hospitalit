import { auth } from '@/lib/auth';
export async function requireAdmin() {
  const s = await auth();
  const allowlistedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const verifiedAdminIdentity = Boolean(allowlistedEmail && s?.user?.email?.trim().toLowerCase() === allowlistedEmail && s.user.authProvider === 'google');
  if (!s?.user?.id || s.user.role !== 'admin' || s.user.isAdminAuthorized !== true || !verifiedAdminIdentity) {
    throw new Response('Forbidden', { status: 403 });
  }
  return s.user;
}
