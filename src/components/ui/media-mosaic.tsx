"use client";

import { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { motion } from "framer-motion";

type MediaItem = {
  id: string;
  kind: "video" | "image";
  src: string;
  alt: string;
  title: string;
  caption: string;
  aspect: string;
  tone: string;
};

const OPTICS = "Shot on Hasselblad H6D-100c, 85mm lens, volumetric path-traced lighting, visible skin micro-pores, sharp fabric weave, zero digital smoothing, raw camera documentary aesthetic.";

const MEDIA: MediaItem[] = [
  { id: "motion-01", kind: "video", src: "https://videos.pexels.com/video-files/3195394/3195394-hd_1920_1080_25fps.mp4", alt: `Wide cinematic moving footage of a modern hospitality team preparing a bright restaurant before service; ${OPTICS}`, title: "Before the doors open", caption: "Hospitality · the work behind the welcome", aspect: "aspect-[2.2/1]", tone: "from-[#ff5a36]/40" },
  { id: "motion-02", kind: "video", src: "https://videos.pexels.com/video-files/3209298/3209298-hd_1920_1080_25fps.mp4", alt: `Wide cinematic moving footage of a diverse professional team coordinating in a sunlit workplace; ${OPTICS}`, title: "Good work, in motion", caption: "People · purpose · progress", aspect: "aspect-[2.2/1]", tone: "from-[#3a3aff]/40" },
  { id: "documentary-01", kind: "image", src: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1400&q=88", alt: `Documentary portrait of colleagues in a candid team conversation, natural skin texture and woven workwear; ${OPTICS}`, title: "A team is built person by person", caption: "People first", aspect: "aspect-[4/5]", tone: "from-[#ff9fcf]/40" },
  { id: "documentary-02", kind: "image", src: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1400&q=88", alt: `Candid workplace collaboration, expressive human faces and natural daylight across a meeting table; ${OPTICS}`, title: "Shared ambition", caption: "Collaboration", aspect: "aspect-[5/4]", tone: "from-[#ffc72c]/40" },
  { id: "documentary-03", kind: "image", src: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1400&q=88", alt: `Diverse coworkers discussing a plan in an authentic office documentary frame with crisp fabric detail; ${OPTICS}`, title: "The right people, together", caption: "Team culture", aspect: "aspect-[4/5]", tone: "from-[#3ddbb0]/40" },
  { id: "documentary-04", kind: "image", src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=88", alt: `Close documentary portrait of a professional man with realistic skin detail, direct natural light and no retouching; ${OPTICS}`, title: "Talent has a face", caption: "Individual stories", aspect: "aspect-[4/5]", tone: "from-[#cfc4ff]/40" },
  { id: "documentary-05", kind: "image", src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=88", alt: `Close documentary portrait of a woman with natural skin texture and visible fine hair detail; ${OPTICS}`, title: "Room to grow", caption: "Opportunity", aspect: "aspect-[5/4]", tone: "from-[#ff5a36]/40" },
  { id: "documentary-06", kind: "image", src: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=88", alt: `Natural-light portrait of a woman in textured clothing, candid expression and realistic skin detail; ${OPTICS}`, title: "Confidence, earned", caption: "Human potential", aspect: "aspect-[4/5]", tone: "from-[#3a3aff]/35" },
  { id: "documentary-07", kind: "image", src: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=88", alt: `Documentary view of a small team working closely around a table, tactile materials and natural expressions; ${OPTICS}`, title: "A better kind of teamwork", caption: "Working together", aspect: "aspect-[5/4]", tone: "from-[#3ddbb0]/35" },
  { id: "documentary-08", kind: "image", src: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=88", alt: `Close portrait with authentic expression, detailed skin texture and softly modelled daylight; ${OPTICS}`, title: "Every story matters", caption: "The person behind the profile", aspect: "aspect-[4/5]", tone: "from-[#ff9fcf]/40" },
  { id: "documentary-09", kind: "image", src: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=88", alt: `Candid group of coworkers in a bright collaborative workspace, realistic faces and crisp clothing texture; ${OPTICS}`, title: "Momentum is shared", caption: "Collective progress", aspect: "aspect-[5/4]", tone: "from-[#ffc72c]/35" },
  { id: "documentary-10", kind: "image", src: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=88", alt: `Close documentary scene of a team workshop, hands, notebooks and expressive people in a real working moment; ${OPTICS}`, title: "Details make the difference", caption: "Craft and care", aspect: "aspect-[4/5]", tone: "from-[#cfc4ff]/40" },
  { id: "parallax-01", kind: "image", src: "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1400&q=88", alt: `Parallax editorial image of professionals sharing ideas in a calm studio office, lifelike faces and fabric texture; ${OPTICS}`, title: "Ideas move people", caption: "01 / The conversation", aspect: "aspect-[5/4]", tone: "from-[#ff5a36]/35" },
  { id: "parallax-02", kind: "image", src: "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1400&q=88", alt: `Parallax editorial image of a professional handshake in natural light, detailed skin and sleeve weave; ${OPTICS}`, title: "Trust is the beginning", caption: "02 / The connection", aspect: "aspect-[4/5]", tone: "from-[#3a3aff]/35" },
  { id: "parallax-03", kind: "image", src: "https://images.unsplash.com/photo-1551836022-4c4c79ecde51?auto=format&fit=crop&w=1400&q=88", alt: `Parallax editorial image of coworkers listening during a meeting, candid human expression and realistic textures; ${OPTICS}`, title: "Listen before you lead", caption: "03 / The understanding", aspect: "aspect-[5/4]", tone: "from-[#3ddbb0]/35" },
  { id: "parallax-04", kind: "image", src: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1400&q=88", alt: `Parallax editorial image of a small professional team planning at a table, crisp paper, fabric and skin detail; ${OPTICS}`, title: "Make the next move count", caption: "04 / The plan", aspect: "aspect-[4/5]", tone: "from-[#ffc72c]/35" },
  { id: "parallax-05", kind: "image", src: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1400&q=88", alt: `Parallax editorial image of a diverse team in a collaborative moment, documentary realism and natural highlights; ${OPTICS}`, title: "Build something together", caption: "05 / The team", aspect: "aspect-[5/4]", tone: "from-[#ff9fcf]/35" },
  { id: "parallax-06", kind: "image", src: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=88", alt: `Parallax editorial close scene of coworkers collaborating over a project, authentic skin and tactile materials; ${OPTICS}`, title: "Progress, made human", caption: "06 / The outcome", aspect: "aspect-[4/5]", tone: "from-[#cfc4ff]/40" },
];

const reveal = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const } },
};

function MediaCard({ item, index, parallax = false }: { item: MediaItem; index: number; parallax?: boolean }) {
  function moveLight(event: ReactPointerEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    event.currentTarget.style.setProperty("--mx", `${x}%`);
    event.currentTarget.style.setProperty("--my", `${y}%`);
  }
  return (
    <motion.article
      variants={reveal}
      onPointerMove={moveLight}
      whileHover={parallax ? { y: -10, scale: 1.012 } : { scale: 1.008 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={`sb-media-card group relative isolate overflow-hidden rounded-[24px] border border-white/10 bg-[#171713] ${item.aspect}`}
      style={{ "--mx": "50%", "--my": "50%" } as CSSProperties}
    >
      {item.kind === "video" ? (
        <video
          className="absolute inset-0 h-full w-full object-cover [transform:translateZ(0)]"
          src={item.src}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={item.alt}
        />
      ) : (
        // Remote editorial photography; replace src values with licensed assets for production.
        <img
          className={`absolute inset-0 h-full w-full object-cover transition duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.045] ${parallax ? "will-change-transform" : ""}`}
          src={item.src}
          alt={item.alt}
          loading="lazy"
          decoding="async"
        />
      )}
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.tone} via-transparent to-black/65 opacity-70 mix-blend-soft-light`} />
      <div className="sb-media-light pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/5" />
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">{item.caption}</p>
        <h3 className="max-w-[22ch] font-display text-xl font-extrabold leading-tight tracking-[-0.045em] text-white sm:text-2xl">{item.title}</h3>
      </div>
      <span className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/25 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/80 backdrop-blur-md">{String(index + 1).padStart(2, "0")}</span>
    </motion.article>
  );
}

export default function MediaMosaic() {
  const cinematicLoops = MEDIA.filter((item) => item.id.startsWith("motion-"));
  const documentaryCards = MEDIA.filter((item) => item.id.startsWith("documentary-"));
  const parallaxCards = MEDIA.filter((item) => item.id.startsWith("parallax-"));

  return (
    <section id="visual-stories" className="bg-[#0a0a09] px-4 py-20 text-white sm:px-7 sm:py-28 lg:px-10">
      <div className="mx-auto max-w-[1440px]">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} variants={reveal} className="mb-9 flex flex-col justify-between gap-5 md:mb-12 md:flex-row md:items-end">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-[#3ddbb0]">People make the bridge</p>
            <h2 className="max-w-[780px] font-display text-4xl font-extrabold leading-[0.98] tracking-[-0.06em] sm:text-6xl lg:text-7xl">Real work. <span className="text-[#ff9fcf]">Real people.</span><br />A bigger picture.</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-white/55">A visual study of the people, craft and everyday moments that move teams forward.</p>
        </motion.div>

        <motion.div variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {cinematicLoops.map((item, index) => <MediaCard key={item.id} item={item} index={index} />)}
          </div>
        </motion.div>

        <div className="mb-5 mt-16 flex items-end justify-between gap-4 sm:mt-24">
          <div><p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#ffc72c]">Field notes / 01—10</p><h3 className="font-display text-3xl font-extrabold tracking-[-0.05em] sm:text-5xl">The human detail</h3></div>
          <span className="hidden rounded-full border border-white/15 px-4 py-2 text-xs text-white/55 sm:inline-flex">10 documentary frames</span>
        </div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.05 }} variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.065 } } }} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {documentaryCards.map((item, index) => <MediaCard key={item.id} item={item} index={index + 2} />)}
        </motion.div>

        <div className="mb-5 mt-16 flex items-end justify-between gap-4 sm:mt-24">
          <div><p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#cfc4ff]">Perspective / 01—06</p><h3 className="font-display text-3xl font-extrabold tracking-[-0.05em] sm:text-5xl">A closer connection</h3></div>
          <span className="hidden rounded-full border border-white/15 px-4 py-2 text-xs text-white/55 sm:inline-flex">6 parallax frames</span>
        </div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.05 }} variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.09 } } }} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {parallaxCards.map((item, index) => <MediaCard key={item.id} item={item} index={index + 12} parallax />)}
        </motion.div>
      </div>
      <style jsx>{`
        .sb-media-card { --mx: 50%; --my: 50%; isolation: isolate; }
        .sb-media-light {
          background: radial-gradient(280px circle at var(--mx) var(--my), rgba(255,255,255,.19), transparent 64%);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.12);
        }
        @media (prefers-reduced-motion: reduce) {
          .sb-media-card, .sb-media-card img { transition: none !important; }
        }
      `}</style>
    </section>
  );
}
