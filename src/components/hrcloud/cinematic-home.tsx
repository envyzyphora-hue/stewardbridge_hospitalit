"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowDownRight, ArrowRight, Sparkles } from "lucide-react";
import MediaMosaic from "@/components/ui/media-mosaic";

type Props = {
  user: { userId: string; role?: "candidate" | "business" | "admin" | null } | null;
  go: (path: string) => void;
};

const heroSpring = { type: "spring" as const, stiffness: 115, damping: 20, mass: 0.8 };

export default function CinematicHome({ user, go }: Props) {
  const reduceMotion = useReducedMotion();
  const intro = reduceMotion
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : { hidden: { opacity: 0, y: 34 }, visible: { opacity: 1, y: 0, transition: heroSpring } };

  return (
    <>
      <main className="bg-[#0a0a09] text-white">
        <section className="relative isolate flex min-h-[min(900px,calc(100svh-72px))] items-end overflow-hidden bg-[#11110f] px-5 pb-16 pt-28 sm:px-8 sm:pb-20 lg:min-h-[820px] lg:px-12 lg:pb-24">
          <video
            className="absolute inset-0 -z-30 h-full w-full object-cover [transform:translateZ(0)]"
            autoPlay muted loop playsInline preload="metadata"
            poster="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=2400&q=90"
            aria-label="Cinematic moving footage of a professional team collaborating"
          >
            <source src="https://videos.pexels.com/video-files/3195394/3195394-hd_1920_1080_25fps.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 -z-20 bg-black/35" />
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,transparent_10%,rgba(5,5,5,0.85)_80%)]" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-[#0a0a09] to-transparent" />
          <div className="mx-auto grid w-full max-w-[1440px] items-end gap-12 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.12 } } }}>
                <motion.p variants={intro} className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/25 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85 backdrop-blur-xl"><Sparkles size={14} className="text-[#ffc72c]" /> A more human way to work</motion.p>
                <motion.h1 variants={intro} className="max-w-[950px] font-display text-5xl font-extrabold leading-[0.91] tracking-[-0.075em] sm:text-7xl lg:text-[clamp(5rem,9vw,9.2rem)]">
                  Good people.<br />Good work.<br /><span className="text-[#ffc72c]">Better together.</span>
                </motion.h1>
                <motion.p variants={intro} className="mt-7 max-w-xl text-base leading-7 text-white/75 sm:text-lg sm:leading-8">
                  StewardBridge connects capable people with the businesses that need them — from the first conversation to the first day on the job.
                </motion.p>
                <motion.div variants={intro} className="mt-8 flex flex-wrap gap-3">
                  <button onClick={() => user ? go("/opportunities") : window.location.assign("/auth/sign-up?role=candidate")} className="group inline-flex items-center gap-3 rounded-full bg-[#ffc72c] px-6 py-4 text-sm font-bold text-[#17130f] transition hover:bg-white">Find your next opportunity <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></button>
                  <button onClick={() => user ? go("/services") : window.location.assign("/auth/sign-up?role=business")} className="inline-flex items-center gap-3 rounded-full border border-white/25 bg-white/[0.06] px-6 py-4 text-sm font-semibold text-white backdrop-blur-xl transition hover:bg-white/15">I’m hiring <ArrowDownRight size={17} /></button>
                </motion.div>
              </motion.div>
            </div>
            <motion.aside initial={reduceMotion ? false : { opacity: 0, y: 24, rotate: 1.5 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ ...heroSpring, delay: reduceMotion ? 0 : 0.35 }} className="hidden rounded-[28px] border border-white/15 bg-black/35 p-5 shadow-2xl backdrop-blur-2xl lg:block">
              <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">The StewardBridge approach</span><span className="size-2 rounded-full bg-[#3ddbb0] shadow-[0_0_16px_#3ddbb0]" /></div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#ff9fcf] p-4 text-[#17130f]"><span className="text-[10px] font-bold uppercase tracking-[0.16em]">01 / People</span><p className="mt-7 text-2xl font-extrabold tracking-tight">Human first</p></div>
                <div className="rounded-2xl bg-[#3ddbb0] p-4 text-[#17130f]"><span className="text-[10px] font-bold uppercase tracking-[0.16em]">02 / Purpose</span><p className="mt-7 text-2xl font-extrabold tracking-tight">Work that fits</p></div>
                <div className="col-span-2 rounded-2xl bg-[#cfc4ff] p-4 text-[#17130f]"><span className="text-[10px] font-bold uppercase tracking-[0.16em]">03 / Progress</span><p className="mt-2 text-xl font-extrabold tracking-tight">From discovery to deployment.</p><p className="mt-1 text-xs text-black/65">One connected journey for candidates and employers.</p></div>
              </div>
            </motion.aside>
          </div>
          <a href="#visual-stories" className="absolute bottom-6 right-6 hidden items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/55 transition hover:text-white sm:flex lg:bottom-8 lg:right-12">Scroll to explore <span className="grid size-8 place-items-center rounded-full border border-white/20"><ArrowDownRight size={14} /></span></a>
        </section>
        <MediaMosaic />
        <section className="bg-[#ffc72c] px-5 py-16 text-[#0a0a09] sm:px-8 sm:py-24 lg:px-12">
          <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-8 md:flex-row md:items-end">
            <div><p className="mb-4 text-xs font-bold uppercase tracking-[0.22em]">Your next chapter starts here</p><h2 className="max-w-3xl font-display text-4xl font-extrabold leading-[0.98] tracking-[-0.06em] sm:text-6xl">Bring your talent.<br />Build what’s next.</h2></div>
            <button onClick={() => user ? go("/opportunities") : window.location.assign("/auth/sign-up")} className="inline-flex w-fit items-center gap-3 rounded-full bg-[#0a0a09] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#3a3aff]">Get started <ArrowRight size={17} /></button>
          </div>
        </section>
      </main>
    </>
  );
}
