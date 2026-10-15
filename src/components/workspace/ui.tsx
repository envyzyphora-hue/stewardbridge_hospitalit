"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import { COUNTRIES, NIGERIA_STATES } from "@/lib/geo";
import { stageLabel } from "@/lib/taxonomy";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="ws-field">
      <label>{label}</label>
      {children}
      {hint && <span className="ws-hint">{hint}</span>}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  return <span className={`ws-pill ws-pill--${status}`}>{stageLabel(status)}</span>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="ws-empty">
      <b>{title}</b>
      {children}
    </div>
  );
}

export function Avatar({ name }: { name: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
  return <div className="ws-avatar" aria-hidden="true">{initials}</div>;
}

export function MatchRing({ score }: { score: number }) {
  return (
    <div className="ws-ring" style={{ ["--p" as string]: score } as React.CSSProperties} title={`${score}% match`}>
      <b>{score}%</b>
    </div>
  );
}

export function Meter({ value }: { value: number }) {
  return <div className="ws-meter" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${value}%` }} /></div>;
}

/** Pick several from a fixed list (and optionally add your own with Enter). */
export function ChipPicker({ options, values, onChange, allowCustom }: { options: string[]; values: string[]; onChange: (v: string[]) => void; allowCustom?: boolean }) {
  const [draft, setDraft] = useState("");
  const toggle = (o: string) => onChange(values.includes(o) ? values.filter((v) => v !== o) : [...values, o]);
  const extras = values.filter((v) => !options.includes(v));
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="ws-chips">
        {[...options, ...extras].map((o) => (
          <button type="button" key={o} className={"ws-chip ws-chip--pick" + (values.includes(o) ? " is-on" : "")} onClick={() => toggle(o)} aria-pressed={values.includes(o)}>
            {values.includes(o) && <Check size={13} />} {o}
          </button>
        ))}
      </div>
      {allowCustom && (
        <input
          className="ws-input"
          placeholder="Add your own and press Enter"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              e.preventDefault();
              if (!values.some((v) => v.toLowerCase() === draft.trim().toLowerCase())) onChange([...values, draft.trim()]);
              setDraft("");
            }
          }}
        />
      )}
    </div>
  );
}

/** Free-text tags with suggestions underneath. */
export function TagBox({ values, onChange, placeholder, suggestions }: { values: string[]; onChange: (v: string[]) => void; placeholder?: string; suggestions?: string[] }) {
  const [draft, setDraft] = useState("");
  const add = (t: string) => {
    const v = t.trim();
    if (v && !values.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...values, v]);
    setDraft("");
  };
  const left = (suggestions ?? []).filter((s) => !values.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 8);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="ws-taginput">
        {values.map((v) => (
          <span className="ws-chip" key={v}>
            {v}
            <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}><X size={13} /></button>
          </span>
        ))}
        <input
          value={draft}
          placeholder={values.length ? "" : placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(draft); }
            if (e.key === "Backspace" && !draft && values.length) onChange(values.slice(0, -1));
          }}
          onBlur={() => draft.trim() && add(draft)}
        />
      </div>
      {left.length > 0 && (
        <div className="ws-chips">
          {left.map((s) => (
            <button type="button" key={s} className="ws-chip ws-chip--pick" onClick={() => add(s)}>+ {s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export type Place = { country: string; region: string; city: string };

export function PlacePicker({ value, onChange }: { value: Place; onChange: (p: Place) => void }) {
  const ng = value.country === "Nigeria";
  const states = Object.keys(NIGERIA_STATES);
  const areas = ng && value.region ? NIGERIA_STATES[value.region] ?? [] : [];
  return (
    <div className="ws-row3">
      <Field label="Country">
        <select className="ws-select" value={value.country} onChange={(e) => onChange({ country: e.target.value, region: "", city: "" })}>
          <option value="">Select country</option>
          {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="State / region">
        {ng ? (
          <select className="ws-select" value={value.region} onChange={(e) => onChange({ ...value, region: e.target.value, city: "" })}>
            <option value="">Select state</option>
            {states.map((s) => <option key={s}>{s}</option>)}
          </select>
        ) : (
          <input className="ws-input" value={value.region} onChange={(e) => onChange({ ...value, region: e.target.value })} placeholder="State, county or province" />
        )}
      </Field>
      <Field label="City / area">
        {ng && areas.length ? (
          <select className="ws-select" value={value.city} onChange={(e) => onChange({ ...value, city: e.target.value })}>
            <option value="">Select area</option>
            {areas.map((a) => <option key={a}>{a}</option>)}
          </select>
        ) : (
          <input className="ws-input" value={value.city} onChange={(e) => onChange({ ...value, city: e.target.value })} placeholder="City or area" />
        )}
      </Field>
    </div>
  );
}

export function useToast() {
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  return { push: setMsg, node: msg ? <div className="ws-toast" role="status">{msg}</div> : null };
}

export function errMessage(e: unknown, fallback = "Something went wrong. Please try again.") {
  const anyE = e as { response?: { data?: { error?: string } }; message?: string };
  return anyE?.response?.data?.error || (anyE?.message && anyE.message !== "Request failed" ? anyE.message : fallback);
}
