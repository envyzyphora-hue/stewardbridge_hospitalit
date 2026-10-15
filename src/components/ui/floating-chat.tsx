"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Bot, Check, LoaderCircle, MessageCircle, Minus, X } from "lucide-react";

type ChatMessage = { id: string; role: "assistant" | "user"; content: string };
type Props = { user?: { name?: string; email?: string } | null };

const spring = { type: "spring" as const, stiffness: 340, damping: 30, mass: 0.85 };

export default function FloatingChat({ user }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello — I’m the StewardBridge assistant. I can help you find your next step, whether you’re hiring or looking for work.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function sendMessage(event?: FormEvent<HTMLFormElement>, suggested?: string) {
    event?.preventDefault();
    const message = (suggested ?? draft).trim();
    if (!message || sending) return;
    setDraft("");
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", content: message }]);
    setSending(true);
    try {
      const response = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, channel: "website" }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        setMessages((current) => [...current, {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "To protect your account, the live agent is available after you sign in. You can still explore opportunities or create an account from the main menu.",
        }]);
      } else if (!response.ok) {
        throw new Error(data?.error || "The assistant is temporarily unavailable.");
      } else {
        setMessages((current) => [...current, {
          id: crypto.randomUUID(),
          role: "assistant",
          content: typeof data?.reply === "string" && data.reply.trim()
            ? data.reply
            : "I’m here to help. Tell me a little more about what you need.",
        }]);
      }
    } catch {
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I couldn’t reach the live assistant just now. Please try again in a moment, or use the Contact page for help.",
      }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 sm:bottom-8 sm:right-8">
      <AnimatePresence>
        {open && (
          <motion.section
            key="steward-chat-panel"
            initial={{ opacity: 0, x: 36, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, y: 12, scale: 0.97 }}
            transition={spring}
            aria-label="StewardBridge AI chat"
            className="mb-4 flex h-[min(620px,calc(100dvh-112px))] w-[min(390px,calc(100vw-40px))] flex-col overflow-hidden rounded-[28px] border border-white/15 bg-[#10110f]/90 text-white shadow-[0_24px_100px_rgba(0,0,0,.5)] backdrop-blur-2xl"
          >
            <header className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="relative grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-[#ffc72c] to-[#ff5a36] text-[#17130f]">
                  <Bot size={20} />
                  <span className="absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-[#10110f] bg-[#3ddbb0]" />
                </span>
                <div>
                  <p className="text-sm font-semibold tracking-tight">StewardBridge assistant</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/55"><span className="size-1.5 rounded-full bg-[#3ddbb0]" /> Here to help</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setOpen(false)} aria-label="Minimize chat" className="rounded-full p-2 text-white/55 transition hover:bg-white/10 hover:text-white"><Minus size={17} /></button>
                <button onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-full p-2 text-white/55 transition hover:bg-white/10 hover:text-white"><X size={17} /></button>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
              <div className="mx-auto max-w-[250px] rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-center text-[10px] uppercase tracking-[0.18em] text-white/40">
                A thoughtful next step starts here
              </div>
              {messages.map((message) => (
                <motion.div key={message.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[86%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "rounded-br-md bg-[#cfc4ff] text-[#171526]" : "rounded-bl-md border border-white/10 bg-white/[0.055] text-white/85"}`}>
                    {message.content}
                  </div>
                </motion.div>
              ))}
              {sending && <div className="flex items-center gap-2 pl-2 text-xs text-white/45"><LoaderCircle size={14} className="animate-spin" /> Thinking through it…</div>}
            </div>

            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 px-4 pb-3">
                {["I’m looking for work", "I need to hire", "How does it work?"].map((prompt) => (
                  <button key={prompt} onClick={() => void sendMessage(undefined, prompt)} className="rounded-full border border-white/12 px-3 py-2 text-xs text-white/70 transition hover:border-[#cfc4ff]/60 hover:bg-[#cfc4ff]/10 hover:text-white">{prompt}</button>
                ))}
              </div>
            )}
            <form onSubmit={(event) => void sendMessage(event)} className="border-t border-white/10 p-3">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/35 p-2 pl-4 focus-within:border-[#cfc4ff]/50">
                <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask me anything…" aria-label="Write a message" className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-white/35" />
                <button disabled={!draft.trim() || sending} aria-label="Send message" className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#cfc4ff] text-[#171526] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"><ArrowUp size={18} /></button>
              </div>
              <p className="mt-2 text-center text-[10px] text-white/35">AI can make mistakes. Avoid sharing sensitive information.</p>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close StewardBridge assistant" : "Open StewardBridge assistant"}
        aria-expanded={open}
        whileHover={{ scale: 1.035 }}
        whileTap={{ scale: 0.96 }}
        className="group relative flex items-center gap-3 overflow-hidden rounded-full border border-white/10 bg-black/40 px-4 py-3 text-white shadow-[0_8px_32px_rgba(0,0,0,.3)] backdrop-blur-xl"
      >
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full border border-[#cfc4ff]/60"
          animate={{ opacity: [0.25, 0.85, 0.25], scale: [1, 1.035, 1] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className="relative grid size-9 place-items-center rounded-full bg-gradient-to-br from-[#ffc72c] via-[#ff9fcf] to-[#cfc4ff] text-[#171526]">
          {open ? <Check size={18} /> : <MessageCircle size={18} />}
        </span>
        <span className="relative pr-1 text-left">
          <span className="block text-sm font-semibold">{open ? "Assistant open" : "Ask StewardBridge"}</span>
          <span className="block text-[11px] text-white/55">{user?.name ? `Welcome, ${user.name.split(" ")[0]}` : "Live agent support"}</span>
        </span>
      </motion.button>
    </div>
  );
}
