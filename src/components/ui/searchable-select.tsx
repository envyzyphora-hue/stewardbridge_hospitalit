"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string; prefix?: string };

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  disabled,
  label,
}: {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="mb-1.5 block text-sm font-medium text-brand-800">{label}</label>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-xl border border-brand-200 bg-white px-3.5 text-sm text-brand-900 transition hover:border-brand-300 disabled:cursor-not-allowed disabled:bg-brand-50 disabled:text-brand-400",
          open && "border-brand-500 ring-2 ring-brand-100",
        )}
      >
        <span className={cn("truncate", !selected && "text-brand-400")}>
          {selected ? (
            <span className="flex items-center gap-2">
              {selected.prefix && <span>{selected.prefix}</span>}
              {selected.label}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-brand-400 transition", open && "rotate-180")} />
      </button>

      {open && (
        <>
          {/* Mobile full-screen sheet */}
          <div className="fixed inset-0 z-50 bg-white sm:hidden">
            <div className="flex items-center gap-2 border-b border-brand-100 p-4">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-11 w-full rounded-xl border border-brand-200 bg-brand-50 pl-9 pr-3 text-sm outline-none focus:border-brand-500"
                />
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-brand-600" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="max-h-[calc(100vh-72px)] overflow-y-auto custom-scrollbar pb-10">
              {filtered.length === 0 && <li className="p-4 text-sm text-brand-400">No results found.</li>}
              {filtered.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left text-sm hover:bg-brand-50"
                  >
                    <span className="flex items-center gap-2">
                      {o.prefix && <span>{o.prefix}</span>}
                      {o.label}
                    </span>
                    {o.value === value && <Check className="h-4 w-4 text-brand-600" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Desktop dropdown */}
          <div className="absolute z-50 mt-2 hidden w-full min-w-[260px] rounded-xl border border-brand-100 bg-white shadow-xl sm:block">
            <div className="border-b border-brand-100 p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-10 w-full rounded-lg border border-brand-100 bg-brand-50 pl-9 pr-3 text-sm outline-none focus:border-brand-400"
                />
              </div>
            </div>
            <ul className="max-h-64 overflow-y-auto custom-scrollbar py-1">
              {filtered.length === 0 && <li className="px-3.5 py-3 text-sm text-brand-400">No results found.</li>}
              {filtered.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm hover:bg-brand-50",
                      o.value === value && "bg-brand-50 font-medium text-brand-700",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {o.prefix && <span>{o.prefix}</span>}
                      {o.label}
                    </span>
                    {o.value === value && <Check className="h-4 w-4 text-brand-600" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
