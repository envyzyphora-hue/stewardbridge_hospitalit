import type { Metadata } from 'next';
import { isGoogleAuthEnabled } from '@/lib/auth';
import AuthScreen from '@/components/auth/auth-screen';

export const metadata: Metadata = { title: 'Sign in' };
export const dynamic = 'force-dynamic';

export default function SignInPage() {
  return <AuthScreen mode="signin" googleEnabled={isGoogleAuthEnabled} />;
}
