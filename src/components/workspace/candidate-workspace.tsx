"use client";

import { useCallback, useEffect, useState } from "react";
import { Bookmark, Briefcase, Check, FileText, Inbox, MapPin, Search, Sparkles, UserRound } from "lucide-react";
import { api } from "@/lib/client";
import { formatSalaryRange } from "@/lib/taxonomy";
import JobSearch, { type SearchJob } from "./job-search";
import { CandidateOnboarding } from "./onboarding-flow";
import { Empty, Meter, MatchRing, StatusPill, errMessage, useToast } from "./ui";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = Record<string, any>;
type App = { id: string; jobId: string; status: string; title: string; businessName: string; location: string; createdAt: string; coverNote: string | null };
type Doc = { id: string; fileName: string; category: string; createdAt: string; fileSize: number | null };

function completeness(p: P, hasCv: boolean) {
  const checks: { label: string; ok: boolean; weight: number }[] = [
    { label: "Add a headline", ok: Boolean(p.headline), weight: 10 },
    { label: "Write a short bio", ok: Boolean(p.bio && String(p.bio).length > 30), weight: 10 },
    { label: "List at least 3 skills", ok: (p.skills?.length ?? 0) >= 3, weight: 15 },
    { label: "Describe your work history", ok: Boolean(p.experienceSummary), weight: 10 },
    { label: "Say which roles you want", ok: (p.rolesWanted?.length ?? 0) > 0, weight: 15 },
    { label: "Pick the shifts you can work", ok: (p.shiftPreferences?.length ?? 0) > 0, weight: 10 },
    { label: "Add the pay you are looking for", ok: Boolean(p.salaryMin || p.salaryMax), weight: 5 },
    { label: "Add your languages", ok: (p.languages?.length ?? 0) > 0, weight: 5 },
    { label: "Add certificates or training", ok: (p.certifications?.length ?? 0) > 0, weight: 5 },
    { label: "Upload your CV", ok: hasCv, weight: 15 },
  ];
  const pct = checks.reduce((n, c) => n + (c.ok ? c.weight : 0), 0);
  return { pct, todo: checks.filter((c) => !c.ok) };
}

const TABS = [
  { key: "overview", label: "Overview", icon: Sparkles },
  { key: "opportunities", label: "Find jobs", icon: Search },
  { key: "applications", label: "My applications", icon: Inbox },
  { key: "saved", label: "Saved", icon: Bookmark },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "settings", label: "My profile", icon: UserRound },
] as const;

export default function CandidateWorkspace({ user, profile, route, reload }: { user: { name?: string; email?: string }; profile: P; route: string; reload: () => void }) {
  const [tab, setTab] = useState<string>(route.split("/")[2] || "overview");
  const [apps, setApps] = useState<App[] | null>(null);
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [saved, setSaved] = useState<(SearchJob & { location: string })[] | null>(null);
  const [recs, setRecs] = useState<SearchJob[] | null>(null);
  const [editing, setEditing] = useState(false);
  const toast = useToast();

  useEffect(() => { const t = route.split("/")[2]; if (t) setTab(t === "onboarding" ? "settings" : t); }, [route]);

  const loadApps = useCallback(() => api.get("/api/applications").then((r) => setApps(r.data.items ?? [])).catch(() => setApps([])), []);
  const loadDocs = useCallback(() => api.get("/api/documents").then((r) => setDocs(r.data.items ?? [])).catch(() => setDocs([])), []);
  const loadSaved = useCallback(() => api.get("/api/saved-jobs").then((r) => setSaved(r.data.items ?? [])).catch(() => setSaved([])), []);
  useEffect(() => { loadApps(); loadDocs(); loadSaved(); api.get("/api/jobs").then((r) => setRecs((r.data.jobs ?? []).slice(0, 3))).catch(() => setRecs([])); }, [loadApps, loadDocs, loadSaved]);

  const hasCv = (docs ?? []).some((d) => d.category === "cv");
  const { pct, todo } = completeness(profile, hasCv);
  const count = (s: string[]) => (apps ?? []).filter((a) => s.includes(a.status)).length;
  const firstName = (user.name || user.email || "there").split(/[\s@]/)[0];

  async function doWithdraw(id: string) {
    try {
      await api.patch("/api/applications", { id });
      toast.push("Application withdrawn"); loadApps();
    } catch (e) { toast.push(errMessage(e)); }
  }

  async function upload(file: File | null) {
    if (!file) return;
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("category", "cv");
      const r = await fetch("/api/documents", { method: "POST", body: fd });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Upload failed");
      toast.push("CV uploaded securely"); loadDocs();
    } catch (e) { toast.push(errMessage(e)); }
  }

  return (
    <div className="ws-root">
      <section className="ws-hero">
        <div className="ws-hero-in">
          <div>
            <div className="ws-eyebrow">Job seeker workspace</div>
            <h1>Hello, {firstName}.</h1>
            <p>{pct < 100 ? `Your profile is ${pct}% complete. A complete profile gets noticed first.` : "Your profile is complete. Employers can find you."}</p>
          </div>
          <button className="ws-btn" onClick={() => setTab("opportunities")}><Search size={16} /> Find jobs</button>
        </div>
      </section>
      <div className="ws-wrap ws-lift">
        <div className="ws-tabs" role="navigation" aria-label="Workspace sections">
          {TABS.map((t) => (
            <button key={t.key} className={"ws-tab" + (tab === t.key ? " is-on" : "")} onClick={() => { setTab(t.key); setEditing(false); }} aria-current={tab === t.key ? "page" : undefined}>
              <t.icon size={15} /> {t.label}
              {t.key === "applications" && (apps?.length ?? 0) > 0 && <i>{apps!.length}</i>}
              {t.key === "saved" && (saved?.length ?? 0) > 0 && <i>{saved!.length}</i>}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <>
            <div className="ws-section ws-grid ws-grid--4">
              <div className="ws-card ws-stat ws-stat--accent"><b>{apps?.length ?? "-"}</b><span>Applications sent</span></div>
              <div className="ws-card ws-stat"><b>{apps ? count(["under_review"]) : "-"}</b><span>Being reviewed</span></div>
              <div className="ws-card ws-stat"><b>{apps ? count(["shortlisted", "interview"]) : "-"}</b><span>Shortlisted or interview</span></div>
              <div className="ws-card ws-stat"><b>{saved?.length ?? "-"}</b><span>Saved jobs</span></div>
            </div>
            <div className="ws-section ws-grid ws-grid--2" style={{ alignItems: "start" }}>
              <div className="ws-card">
                <h3>Profile strength</h3>
                <p className="ws-muted ws-small" style={{ marginBottom: 10 }}>{pct}% complete</p>
                <Meter value={pct} />
                {todo.length > 0 ? (
                  <ul style={{ listStyle: "none", padding: 0, marginTop: 14, display: "grid", gap: 8 }}>
                    {todo.slice(0, 4).map((t) => <li key={t.label} className="ws-small" style={{ display: "flex", justifyContent: "space-between" }}><span>{t.label}</span><span className="ws-muted">+{t.weight}%</span></li>)}
                  </ul>
                ) : <p className="ws-ok" style={{ marginTop: 14 }}><Check size={14} style={{ verticalAlign: "-2px" }} /> Nothing left to add.</p>}
                <button className="ws-btn ws-btn--green ws-btn--sm" style={{ marginTop: 16 }} onClick={() => { setTab("settings"); setEditing(true); }}>Improve my profile</button>
              </div>
              <div className="ws-card">
                <h3>Jobs picked for you</h3>
                {recs === null && <div className="ws-skeleton" style={{ marginTop: 10 }} />}
                {recs?.length === 0 && <p className="ws-muted ws-small" style={{ marginTop: 8 }}>No jobs are published yet. Check back soon.</p>}
                <div style={{ display: "grid", gap: 4, marginTop: 6 }}>
                  {recs?.map((j) => (
                    <div className="ws-trow" key={j.id}>
                      <div>
                        <b style={{ color: "#0a3d35" }}>{j.title}</b>
                        <div className="ws-muted ws-small"><MapPin size={12} style={{ verticalAlign: "-1px" }} /> {j.location} · {j.businessName}{formatSalaryRange(j.salaryMin, j.salaryMax, j.salaryPeriod) ? " · " + formatSalaryRange(j.salaryMin, j.salaryMax, j.salaryPeriod) : ""}</div>
                      </div>
                      {j.match && <MatchRing score={j.match.score} />}
                    </div>
                  ))}
                </div>
                <button className="ws-link" style={{ marginTop: 10 }} onClick={() => setTab("opportunities")}>See all matches</button>
              </div>
            </div>
            {(apps?.length ?? 0) > 0 && (
              <div className="ws-section ws-card">
                <h3>Latest activity</h3>
                {apps!.slice(0, 4).map((a) => (
                  <div className="ws-trow" key={a.id}><div><b>{a.title}</b><div className="ws-muted ws-small">{a.businessName}</div></div><StatusPill status={a.status} /></div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "opportunities" && <div className="ws-section"><JobSearch viewer={{ role: "candidate" }} embedded onApplied={() => { loadApps(); loadSaved(); }} /></div>}

        {tab === "applications" && (
          <div className="ws-section">
            <h2>My applications</h2>
            {apps === null ? <div className="ws-skeleton" /> : apps.length === 0 ? (
              <Empty title="You have not applied yet"><p>Find a job you like and tap Apply. It takes seconds because your profile is already built.</p><button className="ws-btn ws-btn--sm" style={{ marginTop: 12 }} onClick={() => setTab("opportunities")}>Browse jobs</button></Empty>
            ) : (
              <div className="ws-card">
                {apps.map((a) => (
                  <div className="ws-trow" key={a.id}>
                    <div>
                      <b style={{ color: "#0a3d35" }}>{a.title}</b>
                      <div className="ws-muted ws-small">{a.businessName}{a.location ? " · " + a.location : ""} · applied {new Date(a.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <StatusPill status={a.status} />
                      {!["accepted", "rejected", "withdrawn"].includes(a.status) && <button className="ws-btn ws-btn--danger ws-btn--sm" onClick={() => doWithdraw(a.id)}>Withdraw</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "saved" && (
          <div className="ws-section">
            <h2>Saved jobs</h2>
            {saved === null ? <div className="ws-skeleton" /> : saved.length === 0 ? <Empty title="Nothing saved yet"><p>Tap the bookmark on any job to keep it here.</p></Empty> : (
              <div className="ws-card">{saved.map((j) => (
                <div className="ws-trow" key={j.id}><div><b style={{ color: "#0a3d35" }}>{j.title}</b><div className="ws-muted ws-small">{j.businessName} · {j.location}</div></div><button className="ws-btn ws-btn--sm" onClick={() => setTab("opportunities")}><Briefcase size={14} /> View jobs</button></div>
              ))}</div>
            )}
          </div>
        )}

        {tab === "documents" && (
          <div className="ws-section">
            <h2>Documents</h2>
            <div className="ws-card" style={{ display: "grid", gap: 14 }}>
              <div className="ws-field"><label htmlFor="ws-cv">Upload a CV or certificate</label><input id="ws-cv" className="ws-input" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(e) => { upload(e.target.files?.[0] ?? null); e.target.value = ""; }} /><span className="ws-hint">PDF, Word or image, up to 10 MB. Private: only employers you apply to can open your CV.</span></div>
              {docs === null ? <div className="ws-skeleton" /> : docs.length === 0 ? <p className="ws-muted ws-small">No documents yet.</p> : docs.map((d) => (
                <div className="ws-trow" key={d.id}><div><b>{d.fileName}</b><div className="ws-muted ws-small">{d.category.replace("_", " ")} · {new Date(d.createdAt).toLocaleDateString()}</div></div><a className="ws-btn ws-btn--ghost ws-btn--sm" href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer">Open</a></div>
              ))}
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div className="ws-section">
            <CandidateOnboarding key={String(editing)} profile={profile} onDone={() => { toast.push("Profile saved"); setEditing(false); reload(); setTab("overview"); }} />
          </div>
        )}
      </div>
      {toast.node}
    </div>
  );
}
