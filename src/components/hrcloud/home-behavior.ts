/* StewardBridge home behaviour. Plain DOM code, no dependencies.
   - Hero motion is a pure function seek(t): every visual is derived from t (seconds).
     The intro plays once, then an 6s ambient loop keeps the cards gently moving.
   - Everything else answers a click: job filter tabs, pipeline cards, links. */
export type HomeOpts = {
  signedIn: boolean;
  go: (path: string) => void; // in-app hash route, e.g. /opportunities
  auth: (path: string) => void; // full page route, e.g. /auth/sign-up?role=candidate
  photos?: Record<string, string>; // optional photography: face0 ... face5, see home-photos.ts
};

const cl = (x: number) => Math.max(0, Math.min(1, x));
const outC = (x: number) => 1 - Math.pow(1 - x, 3);
const back = (x: number) => {
  const c = 1.6;
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
};
/* ---------- illustrated portraits: stand-ins until real photos are added in home-photos.ts ---------- */
type Look = { skin: string; shade: string; hair: string; style: 'wrap' | 'puff' | 'short' | 'braids' | 'fade' | 'beard'; top: string; inner: string; glasses?: boolean; wrap?: string };
const LOOKS: Look[] = [
  { skin: '#7a4a2d', shade: '#5f3720', hair: '#14100e', style: 'wrap', top: '#ffffff', inner: '#ffe3da', wrap: '#ff5a36' },
  { skin: '#5e3a25', shade: '#472a19', hair: '#0f0c0b', style: 'fade', top: '#1d2b53', inner: '#e9eef5', glasses: true },
  { skin: '#8d5a3b', shade: '#6e4329', hair: '#100b0a', style: 'puff', top: '#3a3aff', inner: '#ffd9f0' },
  { skin: '#a9694a', shade: '#85502f', hair: '#120d0b', style: 'beard', top: '#161616', inner: '#2a2a2a' },
  { skin: '#c68a62', shade: '#a06a46', hair: '#1c1410', style: 'short', top: '#e8f1ea', inner: '#ffffff' },
  { skin: '#6b3f2a', shade: '#52301f', hair: '#0d0908', style: 'braids', top: '#ffc72c', inner: '#fff3c4' },
];
export function portrait(k: number, crop = false): string {
  const l = LOOKS[((k % LOOKS.length) + LOOKS.length) % LOOKS.length] as Look;
  let o = '';
  if (l.style === 'puff') o += `<circle cx="50" cy="36" r="27" fill="${l.hair}"/>`;
  if (l.style === 'braids') o += `<path d="M26 40Q20 84 29 112L36 112Q33 76 36 44Z" fill="${l.hair}"/><path d="M74 40Q80 84 71 112L64 112Q67 76 64 44Z" fill="${l.hair}"/>`;
  o += `<path d="M2 124Q4 90 34 84L66 84Q96 90 98 124Z" fill="${l.top}"/><path d="M41 84L50 104 59 84Z" fill="${l.inner}"/>`;
  o += `<path d="M42 62h16v24q-8 8-16 0z" fill="${l.skin}"/><path d="M42 71q8 8 16 0v-9H42z" fill="${l.shade}" opacity=".55"/>`;
  o += `<circle cx="30" cy="48" r="4.5" fill="${l.skin}"/><circle cx="70" cy="48" r="4.5" fill="${l.skin}"/>`;
  o += `<ellipse cx="50" cy="46" rx="20" ry="25" fill="${l.skin}"/><path d="M31 52Q50 82 69 52Q64 70 50 71Q36 70 31 52Z" fill="${l.shade}" opacity=".25"/>`;
  if (l.style === 'beard') o += `<path d="M31 50Q50 86 69 50Q67 70 50 72Q33 70 31 50Z" fill="${l.hair}"/>`;
  if (l.style === 'wrap') o += `<path d="M31 40Q50 30 69 40Q66 34 50 33Q34 34 31 40Z" fill="${l.hair}"/><path d="M23 38Q20 6 50 6Q80 6 77 38Q75 20 50 18Q25 20 23 38Z" fill="${l.wrap}"/><path d="M30 20Q50 10 72 22M34 14Q52 6 70 14" stroke="#00000030" stroke-width="2" fill="none"/>`;
  else if (l.style === 'puff') o += `<path d="M30 40Q34 22 50 22Q66 22 70 40Q62 31 50 31Q38 31 30 40Z" fill="${l.hair}"/>`;
  else o += `<path d="M29 41Q28 17 50 17Q72 17 71 41Q66 29 50 28Q34 29 29 41Z" fill="${l.hair}"/>`;
  o += `<path d="M35.5 40q6-4 11-1M53.5 39q5-3 11 1" stroke="${l.hair}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  o += `<ellipse cx="41.5" cy="46" rx="3.4" ry="2.4" fill="#fff"/><ellipse cx="58.5" cy="46" rx="3.4" ry="2.4" fill="#fff"/><circle cx="42" cy="46.2" r="1.8" fill="#2a1a12"/><circle cx="59" cy="46.2" r="1.8" fill="#2a1a12"/>`;
  o += `<path d="M38 45.2q3.5-3 7 0M55 45.2q3.5-3 7 0" stroke="#00000055" stroke-width="1" fill="none"/>`;
  o += `<path d="M50 47q-3.4 8 0 9.6q2 .6 4-1" stroke="${l.shade}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  o += `<path d="M42 62Q50 69 58 62Q50 64.5 42 62Z" fill="#fff" stroke="#4a1f18" stroke-width="1.5" stroke-linejoin="round"/>`;
  o += `<ellipse cx="36.5" cy="55" rx="4" ry="2.6" fill="#ff5a36" opacity=".16"/><ellipse cx="63.5" cy="55" rx="4" ry="2.6" fill="#ff5a36" opacity=".16"/>`;
  if (l.glasses) o += `<circle cx="41.5" cy="46" r="6.4" fill="none" stroke="#111" stroke-width="1.5"/><circle cx="58.5" cy="46" r="6.4" fill="none" stroke="#111" stroke-width="1.5"/><path d="M47.9 45.5h4.2" stroke="#111" stroke-width="1.5"/>`;
  const vb = crop ? '24 14 52 52' : '0 0 100 122';
  return `<svg viewBox="${vb}" preserveAspectRatio="xMidYMax slice" role="img" aria-label="Illustrated team member">${o}</svg>`;
}
const qa = (root: ParentNode, sel: string): HTMLElement[] => Array.from(root.querySelectorAll<HTMLElement>(sel));

export function initHome(root: HTMLElement, o: HomeOpts): () => void {
  qa(root, '[data-guest]').forEach((e) => {
    e.hidden = o.signedIn;
  });
  qa(root, '[data-user]').forEach((e) => {
    e.hidden = !o.signedIn;
  });

  /* ---------- people: real photo if one is set, otherwise the illustrated portrait ---------- */
  qa(root, '[data-face]').forEach((e) => {
    if (e.firstElementChild) return;
    const k = Number(e.dataset.face) || 0;
    const url = o.photos?.[`face${k}`];
    if (url) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      img.decoding = 'async';
      img.onerror = () => {
        img.remove();
        e.innerHTML = portrait(k, !!e.dataset.crop);
      };
      e.appendChild(img);
    } else {
      e.innerHTML = portrait(k, !!e.dataset.crop);
    }
  });

  /* ---------- hero motion ---------- */
  const words = qa(root, '.sb-w');
  const fades = qa(root, '[data-fade]');
  const tiles = qa(root, '.sb-tile');
  const chips = qa(root, '.sb-chip');
  const num = root.querySelector<HTMLElement>('.sb-num');
  const TAU = Math.PI * 2;

  const seek = (t: number) => {
    words.forEach((e, i) => {
      const p = cl((t - 0.05 - i * 0.16) / 0.7);
      e.style.opacity = String(cl(p * 2));
      e.style.transform = `translateY(${(1 - back(p)) * 64}px)`;
    });
    fades.forEach((e, i) => {
      const p = outC(cl((t - 0.8 - i * 0.12) / 0.6));
      e.style.opacity = String(p);
      e.style.transform = `translateY(${(1 - p) * 18}px)`;
    });
    tiles.forEach((e, j) => {
      const p = cl((t - 0.3 - j * 0.16) / 0.9);
      const b = back(p);
      const float = Math.sin((t * TAU) / 7 + j * 1.4) * 6 * cl(t - 2.2);
      e.style.opacity = String(cl(p * 2.5));
      e.style.transform = `translateY(${(1 - b) * 120 + float}px) scale(${0.9 + 0.1 * b})`;
    });
    chips.forEach((e, i) => {
      const p = back(cl((t - 1.7 - i * 0.35) / 0.55));
      const float = Math.sin((t * TAU) / 6 + i * 2) * 4 * cl(t - 3.2);
      e.style.opacity = String(cl(p * 2));
      e.style.transform = `translate(var(--cx, 0px), var(--cy, 0px)) translateY(${float}px) scale(${Math.max(0, p)})`;
    });
    if (num) num.textContent = `${Math.round(94 * outC(cl((t - 2.2) / 1.1)))}%`;
  };

  let raf = 0;
  let visible = true;
  const hero = root.querySelector<HTMLElement>('.sb-hero') ?? root;
  const io = new IntersectionObserver((es) => {
    visible = !!es[0]?.isIntersecting;
  });
  io.observe(hero);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    seek(99);
  } else {
    seek(0);
    const t0 = performance.now();
    const frame = (n: number) => {
      if (visible) seek((n - t0) / 1000);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }

  /* ---------- clicks ---------- */
  const board = qa(root, '.sb-rowli');
  const setTab = (name: string) => {
    qa(root, '[data-tab]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === name)));
    board.forEach((r) => {
      const off = name !== 'all' && r.dataset.sector !== name;
      r.toggleAttribute('data-off', off); // CSS collapses it over .3s ease-in-out
      r.inert = off;
    });
  };
  const cols = qa(root, '.sb-col');
  const recount = () =>
    cols.forEach((c) => {
      const n = c.querySelector<HTMLElement>('h3 i');
      if (n) n.textContent = String(c.querySelectorAll('.sb-pc').length);
    });

  const onClick = (ev: Event) => {
    const t = ev.target as HTMLElement | null;
    if (!t) return;
    const chip = t.closest<HTMLElement>('[data-fill]');
    if (chip) {
      const input = root.querySelector<HTMLInputElement>('input[name="q"]');
      if (input) {
        input.value = chip.dataset.fill ?? '';
        input.focus();
      }
      return;
    }
    const tab = t.closest<HTMLElement>('[data-tab]');
    if (tab) {
      setTab(tab.dataset.tab ?? 'all');
      return;
    }
    const pc = t.closest<HTMLElement>('.sb-pc');
    if (pc) {
      const col = pc.closest<HTMLElement>('.sb-col');
      const at = col ? cols.indexOf(col) : -1;
      const next = at >= 0 ? cols[at + 1] : undefined;
      if (!next) return;
      const from = pc.getBoundingClientRect();
      next.querySelector('.sb-list')?.appendChild(pc);
      recount();
      const to = pc.getBoundingClientRect();
      pc.animate(
        [{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px)` }, { transform: 'none' }],
        { duration: 500, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      );
      return;
    }
    const g = t.closest<HTMLElement>('[data-go]');
    if (g) {
      const to = g.dataset.go ?? '/';
      if (to.startsWith('/auth')) o.auth(to);
      else o.go(to);
    }
  };
  const onSubmit = (ev: Event) => {
    ev.preventDefault();
    o.go('/opportunities');
  };
  root.addEventListener('click', onClick);
  const form = root.querySelector('form');
  form?.addEventListener('submit', onSubmit);

  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    root.removeEventListener('click', onClick);
    form?.removeEventListener('submit', onSubmit);
  };
}
