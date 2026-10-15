'use client';

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';

/* ------------------------------------------------------------------ */
/* Photography                                                         */
/* Free-licence Pexels photos used as stand-ins. Swap for the client's */
/* own licensed team photography by editing this one object.           */
/* ------------------------------------------------------------------ */
const px = (id: number, w: number, extra = '') =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}${extra}`;

export const PHOTOS = {
  teamHero: px(7109061, 1600), // multi-ethnic office team posing
  teamMeeting: px(1181738, 1600), // five professionals in a meeting
  teamData: px(7693700, 1600), // four colleagues reviewing data
};

export type Person = { name: string; role: string; initials: string; photo: string; hue: number; look: number };

export const PEOPLE: Person[] = [
  { name: 'Amara O.', look: 0, role: 'People Ops Lead', initials: 'AO', photo: px(36551042, 480, '&h=480&fit=crop'), hue: 168 },
  { name: 'Daniel K.', look: 1, role: 'Site Supervisor', initials: 'DK', photo: px(4872060, 480, '&h=480&fit=crop'), hue: 195 },
  { name: 'Ngozi A.', look: 2, role: 'Care Coordinator', initials: 'NA', photo: px(31307734, 480, '&h=480&fit=crop'), hue: 150 },
  { name: 'Tunde B.', look: 3, role: 'Logistics Manager', initials: 'TB', photo: px(325685, 480, '&h=480&fit=crop'), hue: 205 },
];

/* ------------------------------------------------------------------ */
/* Illustrated people (fallback when a photo cannot load)               */
/* ------------------------------------------------------------------ */
type Look = { skin: string; hair: string; top: string; style: 'puff' | 'short' | 'wrap' | 'beard' | 'long' };
const LOOKS: Look[] = [
  { skin: '#8d5a3b', hair: '#1b1210', top: '#00F5A0', style: 'puff' },
  { skin: '#b9794f', hair: '#16100d', top: '#00D2FF', style: 'short' },
  { skin: '#6b3f2a', hair: '#FF7A45', top: '#8B5CF6', style: 'wrap' },
  { skin: '#a9694a', hair: '#120d0b', top: '#FF4D9D', style: 'beard' },
  { skin: '#d9a07a', hair: '#2a1a12', top: '#FFC93C', style: 'long' },
];

/** A friendly flat-illustrated person. `look` picks one of five diverse characters. */
export function Portrait({ look = 0, className = '', style }: { look?: number; className?: string; style?: CSSProperties }) {
  const l = LOOKS[((look % LOOKS.length) + LOOKS.length) % LOOKS.length];
  const gid = `pt-bg-${look}`;
  return (
    <svg className={className} style={style} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustrated team member">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={l.top} stopOpacity=".55" />
          <stop offset="1" stopColor="#0B0F19" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${gid})`} />
      {l.style === 'long' && <path d="M26 46 Q24 82 34 92 L66 92 Q76 82 74 46 Z" fill={l.hair} />}
      <path d="M12 100 Q14 72 50 70 Q86 72 88 100 Z" fill={l.top} />
      <rect x="43" y="56" width="14" height="18" rx="6" fill={l.skin} />
      {l.style === 'puff' && <circle cx="50" cy="30" r="25" fill={l.hair} />}
      {l.style === 'wrap' && <path d="M27 40 Q28 12 52 12 Q74 14 73 40 Q60 30 27 40 Z" fill={l.hair} />}
      <ellipse cx="50" cy="45" rx="19" ry="22" fill={l.skin} />
      {l.style === 'short' && <path d="M30 42 Q30 20 50 20 Q71 20 70 42 Q62 30 50 30 Q38 30 30 42 Z" fill={l.hair} />}
      {l.style === 'beard' && (
        <>
          <path d="M31 42 Q31 22 50 22 Q69 22 69 42 Q60 32 50 32 Q40 32 31 42 Z" fill={l.hair} />
          <path d="M33 50 Q50 78 67 50 Q64 64 50 66 Q36 64 33 50 Z" fill={l.hair} />
        </>
      )}
      {l.style === 'long' && <path d="M30 44 Q30 20 50 20 Q71 20 70 44 Q66 32 50 31 Q36 32 30 44 Z" fill={l.hair} />}
      <circle cx="43" cy="46" r="1.8" fill="#1b1210" />
      <circle cx="57" cy="46" r="1.8" fill="#1b1210" />
      <path d="M44 55 Q50 60 56 55" fill="none" stroke="#1b1210" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** A group-shot illustration used when a team photograph cannot load. */
export function TeamScene({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustrated diverse team">
      <defs>
        <linearGradient id="ts-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a1b5e" />
          <stop offset=".5" stopColor="#0B2A3F" />
          <stop offset="1" stopColor="#0B0F19" />
        </linearGradient>
      </defs>
      <rect width="400" height="250" fill="url(#ts-bg)" />
      <circle cx="320" cy="50" r="90" fill="#FF4D9D" opacity=".18" />
      <circle cx="70" cy="200" r="100" fill="#00D2FF" opacity=".16" />
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} x={10 + i * 76} y={i % 2 ? 70 : 40} width="96" height="170" viewBox="0 0 100 100" preserveAspectRatio="xMidYMax meet" overflow="visible">
          <g transform="translate(0 0)">
            <Portrait look={i} />
          </g>
        </svg>
      ))}
    </svg>
  );
}

/** <img> that degrades to a colourful illustration if the photo cannot load. */
export function Photo({
  src,
  alt,
  look = 0,
  scene = false,
  className = '',
  style,
}: {
  src: string;
  alt: string;
  look?: number;
  scene?: boolean;
  className?: string;
  style?: CSSProperties;
  /* kept for backwards compatibility with older call sites */
  initials?: string;
  hue?: number;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return scene ? <TeamScene className={className} style={style} /> : <Portrait look={look} className={className} style={style} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Isometric 3D assets (hand-built SVG, glowing edges)                  */
/* ------------------------------------------------------------------ */
const COS = Math.cos(Math.PI / 6);

/** One isometric cube centred on (cx, cy) with edge length s. */
export function IsoCube({
  cx,
  cy,
  s,
  h,
  tone = 'cyan',
  delay = 0,
  shimmer = false,
}: {
  cx: number;
  cy: number;
  s: number;
  h?: number;
  tone?: 'cyan' | 'mint';
  delay?: number;
  shimmer?: boolean;
}) {
  const height = h ?? s;
  const dx = s * COS;
  const dy = s * 0.5;
  const top = `${cx},${cy - dy - height / 2} ${cx + dx},${cy - height / 2} ${cx},${cy + dy - height / 2} ${cx - dx},${cy - height / 2}`;
  const left = `${cx - dx},${cy - height / 2} ${cx},${cy + dy - height / 2} ${cx},${cy + dy + height / 2} ${cx - dx},${cy + height / 2}`;
  const right = `${cx + dx},${cy - height / 2} ${cx},${cy + dy - height / 2} ${cx},${cy + dy + height / 2} ${cx + dx},${cy + height / 2}`;
  const c = tone === 'mint' ? '#00F5A0' : '#00D2FF';
  return (
    <g className={shimmer ? 'hc-shimmer' : undefined} style={{ animationDelay: `${delay}s` }}>
      <polygon points={left} fill={c} fillOpacity={0.07} stroke={c} strokeOpacity={0.75} strokeWidth={1} strokeLinejoin="round" />
      <polygon points={right} fill={c} fillOpacity={0.15} stroke={c} strokeOpacity={0.75} strokeWidth={1} strokeLinejoin="round" />
      <polygon points={top} fill={c} fillOpacity={0.3} stroke={c} strokeOpacity={0.95} strokeWidth={1.2} strokeLinejoin="round" />
    </g>
  );
}

/** A stack of server slabs - the "HR cloud rack". */
export function IsoStack({ className = '', size = 120 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <defs>
        <filter id="hc-glow-stack" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#hc-glow-stack)">
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <IsoCube cx={60} cy={86 - i * 24} s={34} h={14} tone={i === 2 ? 'mint' : 'cyan'} />
            <circle cx={50} cy={92 - i * 24} r={1.8} fill="#00F5A0" className="hc-led" style={{ animationDelay: `${i * 0.35}s` }} />
            <circle cx={57} cy={95 - i * 24} r={1.8} fill="#00D2FF" className="hc-led" style={{ animationDelay: `${i * 0.35 + 0.2}s` }} />
          </g>
        ))}
      </g>
    </svg>
  );
}

/** Isometric lattice used as the "Cloud Matrix". */
export function IsoMatrix({ cx, cy, s = 20 }: { cx: number; cy: number; s?: number }) {
  const cells: { x: number; y: number; d: number }[] = [];
  const n = 3;
  const dx = s * COS;
  const dy = s * 0.5;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      cells.push({ x: cx + (c - r) * dx * 1.18, y: cy + (c + r) * dy * 1.18 - n * dy * 0.9, d: (r + c) * 0.28 });
    }
  }
  cells.sort((a, b) => a.y - b.y);
  return (
    <g>
      {cells.map((c, i) => (
        <IsoCube key={i} cx={c.x} cy={c.y} s={s} h={s * 0.62} shimmer delay={c.d} tone={i % 4 === 0 ? 'mint' : 'cyan'} />
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

/** Writes pointer position (-1..1) to CSS variables, eased with rAF. */
export function useParallax(target: RefObject<HTMLElement | null>, area: RefObject<HTMLElement | null>, strength = 1) {
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    const el = target.current;
    const zone = area.current;
    if (!el || !zone || reduced) return;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let raf = 0;
    const loop = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      el.style.setProperty('--px', x.toFixed(3));
      el.style.setProperty('--py', y.toFixed(3));
      el.style.setProperty('--rx', `${(-y * 5 * strength).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${(x * 6 * strength).toFixed(2)}deg`);
      raf = requestAnimationFrame(loop);
    };
    const move = (e: PointerEvent) => {
      const r = zone.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
      ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
      zone.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      zone.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    };
    const leave = () => {
      tx = 0;
      ty = 0;
    };
    zone.addEventListener('pointermove', move);
    zone.addEventListener('pointerleave', leave);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      zone.removeEventListener('pointermove', move);
      zone.removeEventListener('pointerleave', leave);
    };
  }, [target, area, reduced, strength]);
}

/** Sets --p (0..1 scroll progress through the viewport) on every [data-morph] child, and reveals [data-reveal]. */
export function useScrollMorph(root: RefObject<HTMLElement | null>) {
  const reduced = usePrefersReducedMotion();
  const ticking = useRef(false);
  useEffect(() => {
    const host = root.current;
    if (!host) return;
    const morphs = () => Array.from(host.querySelectorAll<HTMLElement>('[data-morph]'));
    const update = () => {
      ticking.current = false;
      const vh = window.innerHeight || 1;
      for (const el of morphs()) {
        const r = el.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height)));
        el.style.setProperty('--p', p.toFixed(3));
      }
    };
    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(update);
      }
    };
    update();
    if (!reduced) {
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
    }
    let io: IntersectionObserver | undefined;
    const reveal = Array.from(host.querySelectorAll<HTMLElement>('[data-reveal]'));
    if ('IntersectionObserver' in window && !reduced) {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              e.target.classList.add('is-in');
              io?.unobserve(e.target);
            }
          }
        },
        { threshold: 0.12 },
      );
      reveal.forEach((el) => io!.observe(el));
    } else {
      reveal.forEach((el) => el.classList.add('is-in'));
    }
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      io?.disconnect();
    };
  }, [root, reduced]);
}
