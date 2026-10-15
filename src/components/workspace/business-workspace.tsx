"use client";

import { useCallback, useEffect, useState } from "react";
import { Briefcase, Building2, ChevronDown, FileText, Inbox, Loader2, MapPin, Plus, Search, Send, Sparkles, Users } from "lucide-react";
import { api } from "@/lib/client";
import { AVAILABILITY_OPTIONS, JOB_CATEGORIES, WORK_TYPES } from "@/lib/geo";
import { APPLICATION_STAGES, BENEFITS, EXPERIENCE_LEVELS, POPULAR_ROLES, POPULAR_SKILLS, SALARY_PERIODS, SHIFT_PATTERNS, formatSalaryRange } from "@/lib/taxonomy";
import { BusinessOnboarding } from "./onboarding-flow";
import { Avatar, ChipPicker, Empty, Field, MatchRing, PlacePicker, StatusPill, TagBox, errMessage, useToast } from "./ui";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = Record<string, any>;
type MyJob = { id: string; title: string; status: string; applicants: number; city: string | null; region: string | null; workType: string | null; openings: number; createdAt: string; salaryMin: number | null; salaryMax: number | null; salaryPeriod: string | null };
type Applicant = {
  id: string; jobId: string; jobTitle: string; status: string; coverNote: string | null; appliedAt: string; name: string; headline: string | null; city: string | null; region: string | null;
  skills: string[]; experienceYears: number | null; experienceSummary: string | null; qualifications: string | null; certifications: string[]; languages: string[]; availability: string | null;
  workType: string | null; shiftPreferences: string[]; cvId: string | null; match: { score: number; reasons: string[] }; email: string | null; phone: string | null;
};
type Talent = { id: string; displayName: string; headline: string | null; city: string | null; region: string | null; skills: string[]; rolesWanted: string[]; experienceYears: number | null; availability: string | null; workType: string | null; shiftPreferences: string[]; languages: string[]; certifications: string[]; match: { score: number; reasons: string[] } | null };

const TABS = [
  { key: "overview", label: "Overview", icon: Sparkles },
  { key: "post", label: "Post a job", icon: Plus },
  { key: "jobs", label: "My jobs", icon: Briefcase },
  { key: "applicants", label: "Applicants", icon: Inbox },
  { key: "talent", label: "Find talent", icon: Users },
  { key: "settings", label: "Company profile", icon: Building2 },
] as const;

export default function BusinessWorkspace({ user, profile, route, reload }: { user: { name?: string; email?: string }; profile: P; route: string; reload: () => void }) {
  const [tab, setTab] = useState<string>(route.split("/")[2] || "overview");
  const [jobs, setJobs] = useState<MyJob[] | null>(null);
  const [apps, setApps] = useState<Applicant[] | null>(null);
  const [focusJob, setFocusJob] = useState("");
  const toast = useToast();

  useEffect(() => { const t = route.split("/")[2]; if (t) setTab(t === "onboarding" ? "settings" : t); }, [route]);
  const loadJobs = useCallback(() => api.get("/api/business/jobs").then((r) => setJobs(r.data.items ?? [])).catch(() => setJobs([])), []);
  const loadApps = useCallback(() => api.get("/api/business/applicants").then((r) => setApps(r.data.items ?? [])).catch(() => setApps([])), []);
  useEffect(() => { loadJobs(); loadApps(); }, [loadJobs, loadApps]);

  const live = (jobs ?? []).filter((j) => j.status === "published").length;
  const fresh = (apps ?? []).filter((a) => a.status === "submitted").length;
  const advanced = (apps ?? []).filter((a) => ["shortlisted", "interview"].includes(a.status)).length;
  const org = profile?.orgName || user.name || "your business";

  return (
    <div className="ws-root">
      <section className="ws-hero">
        <div className="ws-hero-in">
          <div>
            <div className="ws-eyebrow">Employer workspace</div>
            <h1>{org}</h1>
            <p>Post jobs with pay and shifts, rank applicants by fit and find ready-to-work talent.</p>
          </div>
          <button className="ws-btn" onClick={() => setTab("post")}><Plus size={16} /> Post a job</button>
        </div>
      </section>
      <div className="ws-wrap ws-lift">
        <div className="ws-tabs" role="navigation" aria-label="Workspace sections">
          {TABS.map((t) => (
            <button key={t.key} className={"ws-tab" + (tab === t.key ? " is-on" : "")} onClick={() => setTab(t.key)} aria-current={tab === t.key ? "page" : undefined}>
              <t.icon size={15} /> {t.label}
              {t.key === "applicants" && fresh > 0 && <i>{fresh}</i>}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <>
            <div className="ws-section ws-grid ws-grid--4">
              <div className="ws-card ws-stat ws-stat--accent"><b>{jobs ? live : "-"}</b><span>Live jobs</span></div>
              <div className="ws-card ws-stat"><b>{apps?.length ?? "-"}</b><span>Total applicants</span></div>
              <div className="ws-card ws-stat"><b>{apps ? fresh : "-"}</b><span>New, not reviewed</span></div>
              <div className="ws-card ws-stat"><b>{apps ? advanced : "-"}</b><span>Shortlisted or interviewing</span></div>
            </div>
            <div className="ws-section ws-grid ws-grid--2" style={{ alignItems: "start" }}>
              <div className="ws-card">
                <h3>Top applicants right now</h3>
                {apps === null ? <div className="ws-skeleton" style={{ marginTop: 10 }} /> : apps.length === 0 ? (
                  <p className="ws-muted ws-small" style={{ marginTop: 8 }}>{live ? "No applications yet. Most arrive within a few days." : "Post your first job to start receiving applicants."}</p>
                ) : apps.slice(0, 4).map((a) => (
                  <div className="ws-trow" key={a.id}>
                    <div className="ws-person"><Avatar name={a.name} /><div><b style={{ color: "#0a3d35" }}>{a.name}</b><div className="ws-muted ws-small">{a.jobTitle}{a.city ? " · " + a.city : ""}</div></div></div>
                    <MatchRing score={a.match.score} />
                  </div>
                ))}
                {(apps?.length ?? 0) > 0 && <button className="ws-link" style={{ marginTop: 10 }} onClick={() => setTab("applicants")}>Review all applicants</button>}
              </div>
              <div className="ws-card">
                <h3>Get better applicants</h3>
                <ul style={{ listStyle: "none", padding: 0, marginTop: 10, display: "grid", gap: 10 }} className="ws-small">
                  <li>{(profile?.benefitsOffered?.length ?? 0) > 0 ? "Benefits are listed on your profile." : "Add the benefits you offer (meals, transport, accommodation). Candidates filter on them."}</li>
                  <li>Always show a pay range. Jobs with pay get far more applications on Nigerian boards.</li>
                  <li>Search the talent pool and invite people who already match your role.</li>
                </ul>
                <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                  <button className="ws-btn ws-btn--green ws-btn--sm" onClick={() => setTab("talent")}><Search size={14} /> Find talent</button>
                  <button className="ws-btn ws-btn--ghost ws-btn--sm" onClick={() => setTab("settings")}>Edit company profile</button>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === "post" && <PostJob profile={profile} onPosted={(msg) => { toast.push(msg); loadJobs(); setTab("jobs"); }} />}

        {tab === "jobs" && (
          <div className="ws-section">
            <div className="ws-results-head"><h2 style={{ margin: 0 }}>My jobs</h2><button className="ws-btn ws-btn--sm" onClick={() => setTab("post")}><Plus size={14} /> New job</button></div>
            {jobs === null ? <div className="ws-skeleton" /> : jobs.length === 0 ? <Empty title="No jobs yet"><p>Your first job takes about two minutes to post.</p><button className="ws-btn ws-btn--sm" style={{ marginTop: 12 }} onClick={() => setTab("post")}>Post a job</button></Empty> : (
              <div className="ws-card">{jobs.map((j) => (
                <div className="ws-trow" key={j.id}>
                  <div>
                    <b style={{ color: "#0a3d35" }}>{j.title}</b> <StatusPill status={j.status} />
                    <div className="ws-muted ws-small"><MapPin size={12} style={{ verticalAlign: "-1px" }} /> {[j.city, j.region].filter(Boolean).join(", ") || "Nationwide"} · {j.workType} · {j.openings} {j.openings === 1 ? "opening" : "openings"}{formatSalaryRange(j.salaryMin, j.salaryMax, j.salaryPeriod) ? " · " + formatSalaryRange(j.salaryMin, j.salaryMax, j.salaryPeriod) : ""}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="ws-btn ws-btn--ghost ws-btn--sm" onClick={() => { setFocusJob(j.id); setTab("applicants"); }}>{j.applicants} applicant{j.applicants === 1 ? "" : "s"}</button>
                    {j.status !== "published" && j.status !== "filled" && j.status !== "closed" && <button className="ws-btn ws-btn--sm" onClick={() => setStatus(j.id, "published")}>Publish</button>}
                    {j.status === "published" && <button className="ws-btn ws-btn--ghost ws-btn--sm" onClick={() => setStatus(j.id, "paused")}>Pause</button>}
                    {j.status === "paused" && <button className="ws-btn ws-btn--sm" onClick={() => setStatus(j.id, "published")}>Resume</button>}
                    {["published", "paused"].includes(j.status) && <button className="ws-btn ws-btn--ghost ws-btn--sm" onClick={() => setStatus(j.id, "filled")}>Mark filled</button>}
                    {["published", "paused", "draft"].includes(j.status) && <button className="ws-btn ws-btn--danger ws-btn--sm" onClick={() => setStatus(j.id, "closed")}>Close</button>}
                  </div>
                </div>
              ))}</div>
            )}
          </div>
        )}

        {tab === "applicants" && <Applicants apps={apps} jobs={jobs ?? []} focusJob={focusJob} setFocusJob={setFocusJob} reload={loadApps} toast={toast.push} />}
        {tab === "talent" && <TalentSearch jobs={(jobs ?? []).filter((j) => j.status === "published")} toast={toast.push} />}
        {tab === "settings" && <div className="ws-section"><BusinessOnboarding profile={profile} onDone={() => { toast.push("Company profile saved"); reload(); setTab("overview"); }} /></div>}
      </div>
      {toast.node}
    </div>
  );

  async function setStatus(id: string, status: string) {
    try { await api.patch("/api/business/jobs", { id, status }); toast.push(status === "published" ? "Job is live" : "Job updated"); loadJobs(); }
    catch (e) { toast.push(errMessage(e)); }
  }
}

function PostJob({ profile, onPosted }: { profile: P; onPosted: (m: string) => void }) {
  const [d, setD] = useState<P>({
    title: "", category: JOB_CATEGORIES[0], openings: 1, workType: WORK_TYPES[0], shiftPattern: "", experienceLevel: EXPERIENCE_LEVELS[0],
    country: profile?.country || "Nigeria", region: profile?.region || "", city: profile?.city || "",
    description: "", requirements: "", skills: [] as string[], salaryMin: "", salaryMax: "", salaryPeriod: SALARY_PERIODS[0],
    benefits: profile?.benefitsOffered || [], urgent: false, deadline: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (p: P) => setD((x) => ({ ...x, ...p }));
  async function submit(publish: boolean) {
    if (!String(d.title).trim()) { setErr("Add a job title."); return; }
    if (publish && String(d.description).trim().length < 30) { setErr("Describe the job in at least a couple of sentences so candidates know what to expect."); return; }
    if (!d.city) { setErr("Choose where the job is based."); return; }
    setBusy(true); setErr("");
    try { await api.post("/api/jobs", { ...d, publish }); onPosted(publish ? "Your job is live" : "Draft saved"); }
    catch (e) { setErr(errMessage(e)); setBusy(false); }
  }
  return (
    <div className="ws-section">
      <h2>Post a job</h2>
      <div className="ws-card ws-form">
        <div className="ws-row2">
          <Field label="Job title"><input className="ws-input" list="ws-roles" value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Hotel Housekeeper" /><datalist id="ws-roles">{POPULAR_ROLES.map((r) => <option key={r} value={r} />)}</datalist></Field>
          <Field label="Field"><select className="ws-select" value={d.category} onChange={(e) => set({ category: e.target.value })}>{JOB_CATEGORIES.map((x) => <option key={x}>{x}</option>)}</select></Field>
        </div>
        <div className="ws-row3">
          <Field label="Work type"><select className="ws-select" value={d.workType} onChange={(e) => set({ workType: e.target.value })}>{WORK_TYPES.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Shift pattern"><select className="ws-select" value={d.shiftPattern} onChange={(e) => set({ shiftPattern: e.target.value })}><option value="">Not specified</option>{SHIFT_PATTERNS.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Openings"><input className="ws-input" type="number" min={1} max={500} value={d.openings} onChange={(e) => set({ openings: e.target.value })} /></Field>
        </div>
        <PlacePicker value={{ country: d.country, region: d.region, city: d.city }} onChange={(p) => set(p)} />
        <Field label="Pay" hint="Showing a pay range gets noticeably more applicants.">
          <div className="ws-row3">
            <input className="ws-input" inputMode="numeric" placeholder="Minimum (NGN)" value={d.salaryMin} onChange={(e) => set({ salaryMin: e.target.value.replace(/\D/g, "") })} />
            <input className="ws-input" inputMode="numeric" placeholder="Maximum (NGN)" value={d.salaryMax} onChange={(e) => set({ salaryMax: e.target.value.replace(/\D/g, "") })} />
            <select className="ws-select" value={d.salaryPeriod} onChange={(e) => set({ salaryPeriod: e.target.value })}>{SALARY_PERIODS.map((x) => <option key={x}>{x}</option>)}</select>
          </div>
        </Field>
        <Field label="What you offer"><ChipPicker options={BENEFITS} values={d.benefits} onChange={(v) => set({ benefits: v })} /></Field>
        <Field label="About the job"><textarea className="ws-textarea" value={d.description} onChange={(e) => set({ description: e.target.value })} placeholder="What will the person do day to day? What is the team like?" /></Field>
        <Field label="Requirements"><textarea className="ws-textarea" value={d.requirements} onChange={(e) => set({ requirements: e.target.value })} placeholder="Must-haves such as experience, certificates, availability." /></Field>
        <div className="ws-row2">
          <Field label="Experience level"><select className="ws-select" value={d.experienceLevel} onChange={(e) => set({ experienceLevel: e.target.value })}>{EXPERIENCE_LEVELS.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Apply by" hint="Optional"><input className="ws-input" type="date" value={d.deadline} onChange={(e) => set({ deadline: e.target.value })} /></Field>
        </div>
        <Field label="Skills that matter" hint="Candidates with these skills rank higher."><TagBox values={d.skills} onChange={(v) => set({ skills: v })} placeholder="e.g. Cash handling" suggestions={POPULAR_SKILLS} /></Field>
        <label className="ws-check"><input type="checkbox" checked={d.urgent} onChange={(e) => set({ urgent: e.target.checked })} /><span><b>Urgent hiring.</b> Highlights the job with an Urgent badge.</span></label>
        {err && <div className="ws-error" role="alert">{err}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button className="ws-btn ws-btn--ghost" disabled={busy} onClick={() => submit(false)}>Save draft</button>
          <button className="ws-btn" disabled={busy} onClick={() => submit(true)}>{busy && <Loader2 size={15} className="animate-spin" />} Publish job</button>
        </div>
      </div>
    </div>
  );
}

function Applicants({ apps, jobs, focusJob, setFocusJob, reload, toast }: { apps: Applicant[] | null; jobs: MyJob[]; focusJob: string; setFocusJob: (v: string) => void; reload: () => void; toast: (m: string) => void }) {
  const [open, setOpen] = useState<string>("");
  const [stage, setStage] = useState("");
  const list = (apps ?? []).filter((a) => (!focusJob || a.jobId === focusJob) && (!stage || a.status === stage));
  async function move(id: string, status: string) {
    try { await api.patch("/api/business/applicants", { id, status }); toast("Candidate notified"); reload(); }
    catch (e) { toast(errMessage(e)); }
  }
  return (
    <div className="ws-section">
      <div className="ws-results-head">
        <h2 style={{ margin: 0 }}>Applicants</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select className="ws-select" style={{ width: "auto" }} aria-label="Filter by job" value={focusJob} onChange={(e) => setFocusJob(e.target.value)}><option value="">All jobs</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</select>
          <select className="ws-select" style={{ width: "auto" }} aria-label="Filter by stage" value={stage} onChange={(e) => setStage(e.target.value)}><option value="">All stages</option>{APPLICATION_STAGES.filter((s) => s.key !== "withdrawn").map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
        </div>
      </div>
      {apps === null ? <div className="ws-skeleton" /> : list.length === 0 ? <Empty title="No applicants to show"><p>When candidates apply they appear here, best match first.</p></Empty> : (
        <div className="ws-list">{list.map((a) => (
          <article className="ws-card" key={a.id}>
            <div className="ws-trow" style={{ borderBottom: 0, padding: 0 }}>
              <div className="ws-person">
                <Avatar name={a.name} />
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0 }}>{a.name}</h3>
                  <div className="ws-muted ws-small">{a.headline || "Applied for " + a.jobTitle}</div>
                  <div className="ws-meta" style={{ marginTop: 6 }}>
                    <span><Briefcase size={13} /> {a.jobTitle}</span>
                    {a.city && <span><MapPin size={13} /> {[a.city, a.region].filter(Boolean).join(", ")}</span>}
                    {a.experienceYears != null && <span>{a.experienceYears} yrs experience</span>}
                    {a.availability && <span>{a.availability}</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <MatchRing score={a.match.score} />
                <select className="ws-select" style={{ width: "auto" }} aria-label={`Stage for ${a.name}`} value={a.status} disabled={a.status === "withdrawn"} onChange={(e) => move(a.id, e.target.value)}>
                  {APPLICATION_STAGES.map((s) => <option key={s.key} value={s.key} disabled={s.key === "withdrawn" && a.status !== "withdrawn"}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div className="ws-chips" style={{ marginTop: 12 }}>{a.skills.slice(0, 8).map((s) => <span className="ws-chip" key={s}>{s}</span>)}</div>
            {a.match.reasons.length > 0 && <p className="ws-why" style={{ marginTop: 8 }}><Sparkles size={13} style={{ verticalAlign: "-2px" }} /> {a.match.reasons.join(" · ")}</p>}
            <button className="ws-link ws-small" style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 4 }} onClick={() => setOpen(open === a.id ? "" : a.id)} aria-expanded={open === a.id}>{open === a.id ? "Hide details" : "View details"} <ChevronDown size={14} /></button>
            {open === a.id && (
              <div className="ws-cols" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e4e9e6" }}>
                <Detail title="Work history" text={a.experienceSummary} />
                <Detail title="Cover note" text={a.coverNote} />
                <Detail title="Qualifications" text={[a.qualifications, ...a.certifications].filter(Boolean).join(", ")} />
                <Detail title="Languages and shifts" text={[...a.languages, ...a.shiftPreferences].join(", ")} />
                <div>
                  <b className="ws-small">Contact</b>
                  {a.email || a.phone ? <p className="ws-small">{a.phone}<br />{a.email}</p> : <p className="ws-muted ws-small">Shared when you shortlist this candidate.</p>}
                  {a.cvId && <a className="ws-btn ws-btn--ghost ws-btn--sm" style={{ marginTop: 8 }} href={`/api/documents/${a.cvId}`} target="_blank" rel="noreferrer"><FileText size={14} /> Open CV</a>}
                </div>
              </div>
            )}
          </article>
        ))}</div>
      )}
    </div>
  );
}

function Detail({ title, text }: { title: string; text: string | null }) {
  return <div><b className="ws-small">{title}</b><p className="ws-small" style={{ color: text ? "#2c403b" : "#5b6b67" }}>{text || "Not provided"}</p></div>;
}

function TalentSearch({ jobs, toast }: { jobs: MyJob[]; toast: (m: string) => void }) {
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [minYears, setMinYears] = useState("");
  const [availability, setAvailability] = useState("");
  const [jobId, setJobId] = useState("");
  const [items, setItems] = useState<Talent[] | null>(null);
  const [invited, setInvited] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams();
      if (q) p.set("q", q); if (city) p.set("city", city); if (minYears) p.set("minYears", minYears); if (availability) p.set("availability", availability); if (jobId) p.set("jobId", jobId);
      api.get("/api/talent?" + p.toString()).then((r) => setItems(r.data.items ?? [])).catch(() => setItems([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, city, minYears, availability, jobId]);

  async function invite(c: Talent) {
    const target = jobId || (jobs.length === 1 ? jobs[0].id : "");
    if (!target) { toast("Pick one of your live jobs first (Match to job)"); return; }
    try { await api.post("/api/talent/invite", { candidateId: c.id, jobId: target }); setInvited((s) => new Set(s).add(c.id)); toast("Invitation sent"); }
    catch (e) { toast(errMessage(e)); }
  }
  return (
    <div className="ws-section">
      <h2>Find talent</h2>
      <div className="ws-card ws-form" style={{ marginBottom: 16 }}>
        <div className="ws-row2">
          <input className="ws-input" placeholder="Role, skill or keyword (e.g. housekeeper, bartending)" aria-label="Keyword" value={q} onChange={(e) => setQ(e.target.value)} />
          <input className="ws-input" placeholder="City or state" aria-label="Location" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="ws-row3">
          <select className="ws-select" aria-label="Match to job" value={jobId} onChange={(e) => setJobId(e.target.value)}><option value="">Match to job (optional)</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</select>
          <select className="ws-select" aria-label="Minimum experience" value={minYears} onChange={(e) => setMinYears(e.target.value)}><option value="">Any experience</option><option value="1">1+ years</option><option value="3">3+ years</option><option value="5">5+ years</option></select>
          <select className="ws-select" aria-label="Availability" value={availability} onChange={(e) => setAvailability(e.target.value)}><option value="">Any availability</option>{AVAILABILITY_OPTIONS.map((a) => <option key={a}>{a}</option>)}</select>
        </div>
      </div>
      {items === null ? <div className="ws-skeleton" /> : items.length === 0 ? <Empty title="No candidates match yet"><p>Only job seekers who chose to be visible appear here. Try fewer filters.</p></Empty> : (
        <div className="ws-list">{items.map((c) => (
          <article className="ws-card" key={c.id}>
            <div className="ws-trow" style={{ borderBottom: 0, padding: 0 }}>
              <div className="ws-person">
                <Avatar name={c.displayName} />
                <div><h3 style={{ margin: 0 }}>{c.displayName}</h3><div className="ws-muted ws-small">{c.headline || c.rolesWanted.slice(0, 2).join(", ") || "Job seeker"}</div>
                  <div className="ws-meta" style={{ marginTop: 6 }}>{c.city && <span><MapPin size={13} /> {[c.city, c.region].filter(Boolean).join(", ")}</span>}{c.experienceYears != null && <span>{c.experienceYears} yrs</span>}{c.availability && <span>{c.availability}</span>}{c.workType && <span>{c.workType}</span>}</div></div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {c.match && <MatchRing score={c.match.score} />}
                <button className="ws-btn ws-btn--sm" disabled={invited.has(c.id)} onClick={() => invite(c)}><Send size={14} /> {invited.has(c.id) ? "Invited" : "Invite to apply"}</button>
              </div>
            </div>
            <div className="ws-chips" style={{ marginTop: 12 }}>{c.skills.slice(0, 8).map((s) => <span className="ws-chip" key={s}>{s}</span>)}</div>
            {c.match?.reasons.length ? <p className="ws-why" style={{ marginTop: 8 }}><Sparkles size={13} style={{ verticalAlign: "-2px" }} /> {c.match.reasons.join(" · ")}</p> : null}
          </article>
        ))}</div>
      )}
    </div>
  );
}
