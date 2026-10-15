"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bookmark, Briefcase, Building2, Clock, MapPin, Search, Sparkles, Wallet, Loader2 } from "lucide-react";
import { api } from "@/lib/client";
import { formatSalaryRange } from "@/lib/taxonomy";
import { WORK_TYPES } from "@/lib/geo";
import { Empty, MatchRing, errMessage, useToast } from "./ui";

export type SearchJob = {
  id: string; title: string; category: string | null; description: string; location: string; workType: string | null;
  businessName: string; openings: number; salaryMin: number | null; salaryMax: number | null; salaryPeriod: string | null; salaryCurrency: string | null;
  benefits: string[] | null; skills: string[] | null; shiftPattern: string | null; experienceLevel: string | null; urgent: boolean;
  deadline: string | null; saved: boolean; match: { score: number; reasons: string[] } | null; createdAt: string;
};
type Facet = { value: string; count: number };
type Result = { total: number; personalised: boolean; facets: { categories: Facet[]; workTypes: Facet[]; cities: Facet[]; levels: Facet[] }; jobs: SearchJob[] };

export type Viewer = { role?: "candidate" | "business" | "admin" | null } | null;

function ago(iso: string) {
  const d = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
  return d === 0 ? "Today" : d === 1 ? "Yesterday" : d < 30 ? `${d} days ago` : "Over a month ago";
}

export default function JobSearch({ viewer, embedded, onApplied }: { viewer: Viewer; embedded?: boolean; onApplied?: () => void }) {
  const [q, setQ] = useState("");
  const [where, setWhere] = useState("");
  const [category, setCategory] = useState("");
  const [workType, setWorkType] = useState("");
  const [level, setLevel] = useState("");
  const [minSalary, setMinSalary] = useState("");
  const [sort, setSort] = useState("");
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [applying, setApplying] = useState<SearchJob | null>(null);
  const toast = useToast();
  const seq = useRef(0);

  const load = useCallback(() => {
    const id = ++seq.current;
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (where) p.set("location", where);
    if (category) p.set("category", category);
    if (workType) p.set("workType", workType);
    if (level) p.set("level", level);
    if (minSalary) p.set("minSalary", minSalary);
    if (sort) p.set("sort", sort);
    setLoading(true);
    api.get("/api/jobs?" + p.toString())
      .then((r) => { if (id === seq.current) { setData(r.data as Result); setFailed(false); } })
      .catch(() => { if (id === seq.current) setFailed(true); })
      .finally(() => { if (id === seq.current) setLoading(false); });
  }, [q, where, category, workType, level, minSalary, sort]);

  // Debounce typing, run immediately on filter clicks (same effect, short delay).
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const isCandidate = viewer?.role === "candidate";
  const clear = () => { setQ(""); setWhere(""); setCategory(""); setWorkType(""); setLevel(""); setMinSalary(""); setSort(""); };
  const anyFilter = Boolean(q || where || category || workType || level || minSalary);

  async function toggleSave(j: SearchJob) {
    if (!isCandidate) return;
    try {
      const r = await api.post("/api/saved-jobs", { jobId: j.id });
      setData((d) => d && { ...d, jobs: d.jobs.map((x) => (x.id === j.id ? { ...x, saved: (r.data as { saved: boolean }).saved } : x)) });
      toast.push((r.data as { saved: boolean }).saved ? "Saved to your shortlist" : "Removed from saved");
    } catch (e) { toast.push(errMessage(e)); }
  }

  return (
    <div className={embedded ? "" : "ws-root"}>
      {!embedded && (
        <section className="ws-hero">
          <div className="ws-hero-in">
            <div>
              <div className="ws-eyebrow">Opportunities</div>
              <h1>Find work that fits your life.</h1>
              <p>Real openings from verified employers. Search by role, place or pay{isCandidate ? " - we also show how well each job fits your profile." : "."}</p>
            </div>
          </div>
        </section>
      )}
      <div className={embedded ? "" : "ws-wrap ws-lift"}>
        <div className="ws-searchbar">
          <input className="ws-input" aria-label="Job title, skill or company" placeholder="Job title, skill or company" value={q} onChange={(e) => setQ(e.target.value)} />
          <input className="ws-input" aria-label="Location" placeholder="City or state" value={where} onChange={(e) => setWhere(e.target.value)} />
          <button className="ws-btn ws-btn--green" onClick={load}><Search size={16} /> Search</button>
        </div>

        <div className="ws-find">
          <aside className="ws-filters ws-card" aria-label="Filters">
            <FacetGroup title="Field" items={data?.facets.categories ?? []} value={category} onPick={setCategory} />
            <FacetGroup title="Work type" items={(data?.facets.workTypes ?? []).length ? data!.facets.workTypes : WORK_TYPES.map((w) => ({ value: w, count: 0 }))} value={workType} onPick={setWorkType} />
            <FacetGroup title="Experience" items={data?.facets.levels ?? []} value={level} onPick={setLevel} />
            <div className="ws-filter">
              <h4>Minimum pay</h4>
              <input className="ws-input" inputMode="numeric" placeholder="e.g. 80000" value={minSalary} onChange={(e) => setMinSalary(e.target.value.replace(/[^0-9]/g, ""))} />
            </div>
            {anyFilter && <button className="ws-btn ws-btn--ghost ws-btn--sm" onClick={clear}>Clear all filters</button>}
          </aside>

          <section aria-live="polite">
            <div className="ws-results-head">
              <div>
                <b>{loading && !data ? "Searching..." : `${data?.total ?? 0} ${data?.total === 1 ? "job" : "jobs"}`}</b>
                {data?.personalised && !anyFilter && <span className="ws-muted ws-small"> · best matches for you first</span>}
              </div>
              <select className="ws-select" style={{ width: "auto" }} aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="">{data?.personalised ? "Best match" : q ? "Most relevant" : "Newest"}</option>
                <option value="newest">Newest</option>
                <option value="salary">Highest pay</option>
                <option value="urgent">Urgent first</option>
              </select>
            </div>

            {failed && <div className="ws-error">We could not load jobs right now. <button className="ws-link" onClick={load}>Try again</button></div>}
            {loading && !data && <div className="ws-list">{[0, 1, 2].map((i) => <div key={i} className="ws-skeleton" />)}</div>}
            {data && data.jobs.length === 0 && !failed && (
              <Empty title={anyFilter ? "No jobs match those filters" : "No jobs are published yet"}>
                {anyFilter ? <p>Try a broader search or <button className="ws-link" onClick={clear}>clear the filters</button>.</p> : <p>New roles appear here as soon as employers publish them.</p>}
              </Empty>
            )}
            <div className="ws-list" style={{ opacity: loading && data ? 0.6 : 1, transition: "opacity .2s" }}>
              {data?.jobs.map((j) => (
                <article className="ws-card ws-job" key={j.id}>
                  <div className="ws-job-top">
                    <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                      <div className="ws-chips">
                        {j.urgent && <span className="ws-chip ws-chip--warm">Urgent hiring</span>}
                        {j.category && <span className="ws-chip">{j.category}</span>}
                      </div>
                      <h3>{j.title}</h3>
                      <div className="ws-biz"><Building2 size={15} /> {j.businessName}</div>
                    </div>
                    {isCandidate && j.match && <MatchRing score={j.match.score} />}
                  </div>
                  <div className="ws-meta">
                    <span><MapPin size={14} /> {j.location}</span>
                    {j.workType && <span><Briefcase size={14} /> {j.workType}</span>}
                    {j.shiftPattern && <span><Clock size={14} /> {j.shiftPattern}</span>}
                    {formatSalaryRange(j.salaryMin, j.salaryMax, j.salaryPeriod, j.salaryCurrency ?? "NGN") && (
                      <span className="ws-pay"><Wallet size={14} /> {formatSalaryRange(j.salaryMin, j.salaryMax, j.salaryPeriod, j.salaryCurrency ?? "NGN")}</span>
                    )}
                  </div>
                  {j.description && <p className="ws-desc">{j.description}</p>}
                  {(j.benefits?.length ?? 0) > 0 && <div className="ws-chips">{j.benefits!.slice(0, 4).map((b) => <span key={b} className="ws-chip ws-chip--yellow">{b}</span>)}</div>}
                  <div className="ws-job-foot">
                    <div className="ws-why">
                      {isCandidate && j.match?.reasons.length ? <span><Sparkles size={13} style={{ verticalAlign: "-2px" }} /> {j.match.reasons.join(" · ")}</span> : <span>{ago(j.createdAt)} · {j.openings} {j.openings === 1 ? "opening" : "openings"}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {isCandidate && (
                        <button className={"ws-save" + (j.saved ? " is-on" : "")} aria-label={j.saved ? "Remove from saved" : "Save job"} aria-pressed={j.saved} onClick={() => toggleSave(j)}><Bookmark size={17} fill={j.saved ? "currentColor" : "none"} /></button>
                      )}
                      {viewer?.role === "business" || viewer?.role === "admin" ? null : (
                        <button className="ws-btn ws-btn--sm" onClick={() => (isCandidate ? setApplying(j) : window.location.assign("/auth/sign-up"))}>
                          {isCandidate ? "Apply now" : "Sign up to apply"}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
      {applying && <ApplyModal job={applying} onClose={() => setApplying(null)} onDone={(msg) => { setApplying(null); toast.push(msg); onApplied?.(); }} />}
      {toast.node}
    </div>
  );
}

function FacetGroup({ title, items, value, onPick }: { title: string; items: Facet[]; value: string; onPick: (v: string) => void }) {
  if (!items.length) return null;
  return (
    <div className="ws-filter">
      <h4>{title}</h4>
      {items.slice(0, 8).map((f) => (
        <button key={f.value} className={"ws-opt" + (value === f.value ? " is-on" : "")} onClick={() => onPick(value === f.value ? "" : f.value)} aria-pressed={value === f.value}>
          <span>{f.value}</span>{f.count > 0 && <small>{f.count}</small>}
        </button>
      ))}
    </div>
  );
}

function ApplyModal({ job, onClose, onDone }: { job: SearchJob; onClose: () => void; onDone: (msg: string) => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function send() {
    setBusy(true); setErr("");
    try { await api.post("/api/applications", { jobId: job.id, coverNote: note }); onDone("Application sent. Good luck!"); }
    catch (e) { setErr(errMessage(e)); setBusy(false); }
  }
  return (
    <div className="ws-modal-bg" onClick={onClose} role="presentation">
      <div className="ws-modal" role="dialog" aria-modal="true" aria-label={`Apply for ${job.title}`} onClick={(e) => e.stopPropagation()}>
        <h3>Apply for {job.title}</h3>
        <p className="ws-muted ws-small">{job.businessName} · {job.location}. Your profile and CV (if uploaded) are shared with this employer.</p>
        <div className="ws-field">
          <label htmlFor="ws-note">A short note to the employer <span className="ws-muted">(optional)</span></label>
          <textarea id="ws-note" className="ws-textarea" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="Why are you a good fit? When can you start?" />
        </div>
        {err && <div className="ws-error">{err}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button className="ws-btn ws-btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="ws-btn" onClick={send} disabled={busy}>{busy && <Loader2 size={15} className="animate-spin" />} Send application</button>
        </div>
      </div>
    </div>
  );
}
