'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import '../hrcloud/hrcloud.css';
import '../hrcloud/hrcloud-vibrant.css';
import './auth-screen.css';
import { PHOTOS, Photo } from '../hrcloud/shared';

type Mode = 'signin' | 'signup';
type Role = 'candidate' | 'business';

const COPY: Record<Role, { title: string; sub: string; points: string[]; label: string }> = {
  candidate: {
    label: 'Job seeker / Staff',
    title: 'Find work that fits your life.',
    sub: 'One profile. Every opportunity. Apply in minutes and follow each step live.',
    points: ['Upload your CV once and reuse it', 'Get matched to roles near you', 'Track applications and interviews'],
  },
  business: {
    label: 'Employer',
    title: 'Hire reliable people, faster.',
    sub: 'Post roles or request managed staffing and review matched, verified candidates.',
    points: ['Post jobs or request staff', 'Shortlist matched candidates', 'Schedule interviews and track deployment'],
  },
};

const ERRORS: Record<string, string> = {
  CredentialsSignin: 'Incorrect email or password.',
  AccessDenied: 'Access was denied. Google could not verify your email address.',
  OAuthAccountNotLinked: 'This email is registered another way. Sign in with your original method.',
  Configuration: 'Sign-in is not configured correctly yet. Please contact support.',
};

function safeNext(raw: string | null) {
  // Only same-site relative paths (prevents open redirects).
  if (raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('\\')) return raw;
  return '/#/workspace';
}

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Za-z]/.test(pw) && /[0-9]/.test(pw)) s++;
  if (pw.length >= 12 || /[^A-Za-z0-9]/.test(pw)) s++;
  return s; // 0..3
}

export default function AuthScreen({ mode, googleEnabled }: { mode: Mode; googleEnabled: boolean }) {
  const isSignup = mode === 'signup';
  const [role, setRole] = useState<Role>('candidate');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [flash, setFlash] = useState(false);
  const [next, setNext] = useState('/#/workspace');

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const r = q.get('role');
    if (r === 'business' || r === 'candidate') setRole(r);
    setNext(safeNext(q.get('next')));
    const err = q.get('error');
    if (err) setError(ERRORS[err] ?? 'Sign-in failed. Please try again.');
  }, []);

  const pwScore = useMemo(() => strength(password), [password]);
  const copy = COPY[role];

  const pickRole = (r: Role) => {
    setRole(r);
    setFlash(true); // Neo-Mint flash on a human action
    window.setTimeout(() => setFlash(false), 900);
  };

  async function credentialsSignIn() {
    const res = await signIn('credentials', { email: email.trim().toLowerCase(), password, redirect: false });
    if (!res || res.error || res.ok === false) throw new Error(ERRORS[res?.error ?? ''] ?? ERRORS.CredentialsSignin);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError('');
    setNotice('');
    if (isSignup) {
      if (name.trim().length < 2) return setError('Enter your full name.');
      if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return setError('Password needs 8+ characters with at least one letter and one number.');
    }
    setBusy(true);
    try {
      if (isSignup) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role, phone: phone.trim() || undefined }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Could not create your account.');
        await credentialsSignIn();
        window.location.assign('/#/workspace/onboarding');
      } else {
        await credentialsSignIn();
        window.location.assign(next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  async function onGoogle() {
    setError('');
    setBusy(true);
    try {
      await signIn('google', { callbackUrl: isSignup ? '/#/workspace/onboarding' : next });
    } catch {
      setError('Google sign-in could not be started. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="sba-page">
      <aside className="sba-aside" aria-hidden={false}>
        <a className="sba-brand" href="/">
          <span className="sba-mark">SB</span>
          <span>
            <b>STEWARD</b>
            <em>BRIDGE</em>
          </span>
        </a>

        <div className="sba-aside-body">
          <h2 key={role}>{copy.title}</h2>
          <p>{copy.sub}</p>
          <ul>
            {copy.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>

        <div className="hc-hud sba-hud">
          <Photo src={role === 'candidate' ? PHOTOS.teamData : PHOTOS.teamMeeting} alt="" scene className="hc-hud-img" />
          <div className="hc-hud-tint" aria-hidden="true" />
          <div className="hc-hud-matrix" aria-hidden="true" />
          <div className="hc-hud-scan" aria-hidden="true" />
          <i className="hc-corner hc-corner--tl" aria-hidden="true" />
          <i className="hc-corner hc-corner--br" aria-hidden="true" />
        </div>
      </aside>

      <main className="sba-main">
        <div className="sba-top">
          <a className="sba-back" href="/">
            ← Back to home
          </a>
          <span>
            {isSignup ? 'Already registered?' : 'New to StewardBridge?'}{' '}
            <a href={isSignup ? '/auth/sign-in' : '/auth/sign-up'}>{isSignup ? 'Sign in' : 'Create account'}</a>
          </span>
        </div>

        <div className={`sba-card${flash ? ' is-flash' : ''}`}>
          <h1>{isSignup ? 'Create your account' : 'Welcome back'}</h1>
          <p className="sba-sub">{isSignup ? 'Join as a job seeker or an employer. It takes about a minute.' : 'Sign in to your StewardBridge account.'}</p>

          {isSignup && (
            <div className="sba-roles" role="radiogroup" aria-label="Account type">
              {(['candidate', 'business'] as Role[]).map((r) => (
                <button key={r} type="button" role="radio" aria-checked={role === r} className={role === r ? 'is-on' : ''} onClick={() => pickRole(r)}>
                  <span className="sba-role-ico" aria-hidden="true">
                    {r === 'candidate' ? '👤' : '🏢'}
                  </span>
                  <b>{COPY[r].label}</b>
                  <small>{r === 'candidate' ? 'I want to find work' : 'I want to hire'}</small>
                </button>
              ))}
            </div>
          )}

          {googleEnabled && (
            <>
              <button type="button" className="sba-google" onClick={onGoogle} disabled={busy}>
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path fill="#4285F4" d="M23.52 12.27c0-.85-.07-1.66-.21-2.44H12v4.62h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.94-2.92l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.94H1.27v3.1A12 12 0 0 0 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.29A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.38-2.29v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4.01 3.1C6.23 6.86 8.88 4.75 12 4.75z" />
                </svg>
                {isSignup ? 'Sign up with Google' : 'Continue with Google'}
              </button>
              <div className="sba-or">
                <span>or use your email</span>
              </div>
            </>
          )}

          <form onSubmit={onSubmit} noValidate>
            {isSignup && (
              <label className="sba-field">
                <span>Full name</span>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder={role === 'business' ? 'Your name (organization details come next)' : 'e.g. Amara Okafor'} required />
              </label>
            )}
            <label className="sba-field">
              <span>Email address</span>
              <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" required />
            </label>
            {isSignup && (
              <label className="sba-field">
                <span>
                  Phone number <i>optional</i>
                </span>
                <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="+234 …" />
              </label>
            )}
            <label className="sba-field">
              <span className="sba-pw-head">
                Password
                {!isSignup && (
                  <button
                    type="button"
                    className="sba-forgot"
                    onClick={() =>
                      setNotice(
                        googleEnabled
                          ? 'Password reset by email is not available yet. If your email is a Google account, choose "Continue with Google" to regain access, or contact support.'
                          : 'Password reset by email is not available yet. Please contact support from the Contact page.',
                      )
                    }
                  >
                    Forgot password?
                  </button>
                )}
              </span>
              <span className="sba-pw">
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
                  required
                />
                <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
                  {show ? 'Hide' : 'Show'}
                </button>
              </span>
            </label>
            {isSignup && (
              <div className="sba-meter" aria-hidden="true">
                <i className={pwScore >= 1 ? 'on' : ''} />
                <i className={pwScore >= 2 ? 'on' : ''} />
                <i className={pwScore >= 3 ? 'on' : ''} />
                <small>{['Use 8+ characters with a letter and a number', 'Getting there', 'Good', 'Strong'][pwScore]}</small>
              </div>
            )}

            <div aria-live="polite">
              {error && (
                <p className="sba-msg sba-msg--err" role="alert">
                  {error}
                </p>
              )}
              {notice && <p className="sba-msg sba-msg--info">{notice}</p>}
            </div>

            <button className="sba-submit" type="submit" disabled={busy} data-human>
              {busy ? 'Please wait…' : isSignup ? (role === 'business' ? 'Create employer account' : 'Create job seeker account') : 'Sign in'}
            </button>
          </form>

          <p className="sba-legal">
            {isSignup
              ? 'By creating an account you agree to use StewardBridge responsibly and let us process your details to provide the service.'
              : 'Employers and job seekers sign in here. Administrators must use Google.'}
          </p>
        </div>
      </main>
    </div>
  );
}
