import { getSession, signIn as nextSignIn, signOut as nextSignOut } from 'next-auth/react';

export const auth = {
  async getUser() {
    const session = await getSession();
    if (!session?.user?.id || !session.user.email) return null;
    return {
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name ?? undefined,
      role: session.user.role ?? undefined,
      isAdminAuthorized: session.user.isAdminAuthorized === true,
      authProvider: session.user.authProvider,
    };
  },
  async signIn(options?: { scope?: string }) {
    const result = await nextSignIn('google', { redirect: false, callbackUrl: `${window.location.origin}/#/workspace` });
    if (result?.error) throw new Error(result.error);
    if (!result?.ok && !result?.url) throw new Error('Authentication failed');
    if (result?.url) window.location.href = result.url;
    return result;
  },
  async signOut() {
    await nextSignOut({ redirect: false });
  },
};

async function request(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
    cache: 'no-store',
  });
  const text = await res.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!res.ok) throw Object.assign(new Error(data?.error || 'Request failed'), { response: { data, status: res.status } });
  return { data };
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body: unknown) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path: string, body: unknown) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path: string, body: unknown) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
};
