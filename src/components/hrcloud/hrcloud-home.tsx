'use client';

import { useLayoutEffect, useRef } from 'react';
import './home.css';
import { HOME_HTML } from './home-markup';
import { initHome } from './home-behavior';
import { HOME_PHOTOS } from './home-photos';

type Props = {
  user: { userId: string; role?: 'candidate' | 'business' | 'admin' | null } | null;
  go: (path: string) => void;
};

/* v18 home page. The page is static markup (home-markup.ts) styled by home.css;
   home-behavior.ts adds the hero motion, job filter, pipeline demo and routing. */
export default function HrCloudHome({ user, go }: Props) {
  const ref = useRef<HTMLElement>(null);
  const signedIn = !!user;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    return initHome(el, { signedIn, go, photos: HOME_PHOTOS, auth: (p) => window.location.assign(p) });
  }, [signedIn, go]);
  return <main ref={ref} className="sb-root" dangerouslySetInnerHTML={{ __html: HOME_HTML }} />;
}
