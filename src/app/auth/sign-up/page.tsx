import type { Metadata } from 'next';
import { isGoogleAuthEnabled } from '@/lib/auth';
import AuthScreen from '@/components/auth/auth-screen';

export const metadata: Metadata = { title: 'Create your account' };
export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  return <AuthScreen mode="signup" googleEnabled={isGoogleAuthEnabled} />;
}
