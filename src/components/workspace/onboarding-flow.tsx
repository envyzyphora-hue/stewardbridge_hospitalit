"use client";

import { useState } from "react";
import { Building2, Loader2, UserRound, ArrowRight } from "lucide-react";
import { api } from "@/lib/client";
import { AVAILABILITY_OPTIONS, INDUSTRIES, JOB_CATEGORIES, WORK_TYPES } from "@/lib/geo";
import { BENEFITS, COMPANY_SIZES, EDUCATION_LEVELS, HIRING_URGENCY, LANGUAGES, POPULAR_ROLES, POPULAR_SKILLS, SALARY_PERIODS, SHIFT_OPTIONS } from "@/lib/taxonomy";
import { ChipPicker, Field, PlacePicker, TagBox, errMessage } from "./ui";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = Record<string, any>;

const BUSINESS_TYPES = ["Hotel / Hospitality", "Restaurant / Cafe", "Private household", "Corporate office", "Healthcare facility", "Retail outlet", "Logistics company", "Construction firm", "Events / Catering", "Other"];

export function RoleChoice({ onChoose }: { onChoose: (r: "candidate" | "business") => void }) {
  return (
    <div className="ws-wizard">
      <h2>Welcome. How will you use StewardBridge?</h2>
      <p className="ws-muted" style={{ marginTop: 6 }}>Pick one. This sets up the right tools for you and cannot be changed later.</p>
      <div className="ws-grid ws-grid--2" style={{ marginTop: 22 }}>
        <button className="ws-card ws-job" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => onChoose("candidate")}>
          <UserRound size={28} color="#0b5d4f" />
          <h3>I am looking for work</h3>
          <p className="ws-muted ws-small">Build a profile once, get matched to jobs near you, apply in one tap and track every application.</p>
          <span className="ws-link">Set up as a job seeker <ArrowRight size={14} style={{ verticalAlign: "-2px" }} /></span>
        </button>
        <button className="ws-card ws-job" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => onChoose("business")}>
          <Building2 size={28} color="#e8702a" />
          <h3>I am hiring</h3>
          <p className="ws-muted ws-small">Post jobs with pay and shifts, search ready-to-work talent, rank applicants by fit and manage your hiring pipeline.</p>
          <span className="ws-link">Set up as an employer <ArrowRight size={14} style={{ verticalAlign: "-2px" }} /></span>
        </button>
      </div>
    </div>
  );
}

function Steps({ names, now }: { names: string[]; now: number }) {
  return (
    <>
      <div className="ws-steps" aria-hidden="true">{names.map((n, i) => <div key={n} className={"ws-step " + (i < now ? "is-done" : i === now ? "is-now" : "")} />)}</div>
      <div className="ws-stepname">Step {now + 1} of {names.length} · {names[now]}</div>
    </>
  );
}

function useWizard(initial: P, last: number, validate: (step: number, d: P) => string, onDone: () => void) {
  const [d, setD] = useState<P>(initial);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (patch: P) => setD((x) => ({ ...x, ...patch }));
  async function next(final = false) {
    const v = validate(step, d);
    if (v) { setErr(v); return; }
    setErr(""); setBusy(true);
    try {
      await api.put("/api/profile", d); // saved at every step so nothing is lost if the page closes
      if (final || step >= last) onDone(); else setStep(step + 1);
    } catch (e) { setErr(errMessage(e)); }
    setBusy(false);
  }
  return { d, set, step, back: () => { setErr(""); setStep(Math.max(0, step - 1)); }, next, busy, err };
}

export function CandidateOnboarding({ profile, onDone }: { profile: P; onDone: () => void }) {
  const names = ["About you", "Where you live", "Experience", "What you want", "Extras"];
  const [cv, setCv] = useState<File | null>(null);
  const [cvMsg, setCvMsg] = useState("");
  const w = useWizard(
    {
      role: "candidate", name: profile?.name || "", phone: profile?.phone || "", headline: profile?.headline || "", bio: profile?.bio || "",
      country: profile?.country || "Nigeria", region: profile?.region || "", city: profile?.city || "",
      skills: profile?.skills || [], experienceYears: profile?.experienceYears ?? "", experienceSummary: profile?.experienceSummary || "",
      educationLevel: profile?.educationLevel || "", qualifications: profile?.qualifications || "", certifications: profile?.certifications || [],
      rolesWanted: profile?.rolesWanted || [], rolesNotWanted: profile?.rolesNotWanted || [], industries: profile?.industries || [],
      workType: profile?.workType || WORK_TYPES[0], availability: profile?.availability || AVAILABILITY_OPTIONS[0], shiftPreferences: profile?.shiftPreferences || [],
      salaryMin: profile?.salaryMin ?? "", salaryMax: profile?.salaryMax ?? "", salaryPeriod: profile?.salaryPeriod || SALARY_PERIODS[0],
      languages: profile?.languages || ["English"], preferredLocations: profile?.preferredLocations || [], distancePreferenceKm: profile?.distancePreferenceKm ?? 25,
      willingToRelocate: Boolean(profile?.willingToRelocate), hasOwnTransport: Boolean(profile?.hasOwnTransport), openToFuture: profile?.openToFuture ?? true,
    },
    names.length - 1,
    (s, d) => {
      if (s === 0 && !String(d.name).trim()) return "Please enter your full name.";
      if (s === 0 && String(d.phone).replace(/\D/g, "").length < 7) return "Enter a phone number employers can reach you on once you are shortlisted.";
      if (s === 1 && (!d.country || !d.region || !d.city)) return "Choose your country, state and area so we can match jobs near you.";
      if (s === 2 && (d.skills as string[]).length === 0) return "Add at least one skill.";
      if (s === 3 && (d.rolesWanted as string[]).length === 0) return "Tell us at least one role you want.";
      if (s === 3 && d.salaryMin !== "" && d.salaryMax !== "" && Number(d.salaryMin) > Number(d.salaryMax)) return "Minimum pay cannot be higher than maximum pay.";
      return "";
    },
    async () => {
      if (cv) {
        try {
          const fd = new FormData(); fd.append("file", cv); fd.append("category", "cv");
          const r = await fetch("/api/documents", { method: "POST", body: fd });
          if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "CV upload failed");
        } catch (e) { setCvMsg(errMessage(e)); }
      }
      onDone();
    },
  );
  const { d, set } = w;
  return (
    <div className="ws-wizard ws-card">
      <h2>Build your profile</h2>
      <p className="ws-muted ws-small" style={{ marginTop: 4 }}>The more you share, the better your job matches. It takes about 3 minutes.</p>
      <Steps names={names} now={w.step} />
      <div className="ws-form" style={{ marginTop: 22 }}>
        {w.step === 0 && (<>
          <div className="ws-row2">
            <Field label="Full name"><input className="ws-input" value={d.name} onChange={(e) => set({ name: e.target.value })} autoComplete="name" /></Field>
            <Field label="Phone number" hint="Only shared with employers who shortlist you."><input className="ws-input" value={d.phone} onChange={(e) => set({ phone: e.target.value })} inputMode="tel" autoComplete="tel" placeholder="e.g. 0803 000 0000" /></Field>
          </div>
          <Field label="Your headline" hint="One line employers see first."><input className="ws-input" maxLength={120} value={d.headline} onChange={(e) => set({ headline: e.target.value })} placeholder="e.g. Reliable housekeeper with 3 years in 4-star hotels" /></Field>
          <Field label="About you"><textarea className="ws-textarea" value={d.bio} onChange={(e) => set({ bio: e.target.value })} placeholder="A few sentences about your work style and what you are looking for." /></Field>
        </>)}
        {w.step === 1 && (<>
          <PlacePicker value={{ country: d.country, region: d.region, city: d.city }} onChange={(p) => set(p)} />
          <Field label="Other areas you would work in" hint="Press Enter after each."><TagBox values={d.preferredLocations} onChange={(v) => set({ preferredLocations: v })} placeholder="e.g. Lekki, Ikeja, Victoria Island" /></Field>
          <div className="ws-row2">
            <Field label="Furthest you would travel (km)"><input className="ws-input" type="number" min={0} max={500} value={d.distancePreferenceKm} onChange={(e) => set({ distancePreferenceKm: e.target.value })} /></Field>
            <label className="ws-check"><input type="checkbox" checked={d.willingToRelocate} onChange={(e) => set({ willingToRelocate: e.target.checked })} /><span>I am willing to relocate for the right job</span></label>
          </div>
        </>)}
        {w.step === 2 && (<>
          <Field label="Your skills" hint="Pick from suggestions or type your own."><TagBox values={d.skills} onChange={(v) => set({ skills: v })} placeholder="e.g. Customer service" suggestions={POPULAR_SKILLS} /></Field>
          <div className="ws-row2">
            <Field label="Years of experience"><input className="ws-input" type="number" min={0} max={60} value={d.experienceYears} onChange={(e) => set({ experienceYears: e.target.value })} /></Field>
            <Field label="Highest education"><select className="ws-select" value={d.educationLevel} onChange={(e) => set({ educationLevel: e.target.value })}><option value="">Select</option>{EDUCATION_LEVELS.map((x) => <option key={x}>{x}</option>)}</select></Field>
          </div>
          <Field label="Work history in a few lines"><textarea className="ws-textarea" value={d.experienceSummary} onChange={(e) => set({ experienceSummary: e.target.value })} placeholder="Where you worked, what you did, how long." /></Field>
          <Field label="Certificates and training" hint="e.g. First Aid, Food Handler, Driver's licence."><TagBox values={d.certifications} onChange={(v) => set({ certifications: v })} placeholder="Add a certificate" /></Field>
        </>)}
        {w.step === 3 && (<>
          <Field label="Roles you want" hint="These drive your job matches."><TagBox values={d.rolesWanted} onChange={(v) => set({ rolesWanted: v })} placeholder="e.g. Housekeeper" suggestions={POPULAR_ROLES} /></Field>
          <Field label="Fields you like"><ChipPicker options={JOB_CATEGORIES.slice(0, 8)} values={d.industries} onChange={(v) => set({ industries: v })} /></Field>
          <Field label="Roles you do NOT want" hint="We will hide these from your matches."><TagBox values={d.rolesNotWanted} onChange={(v) => set({ rolesNotWanted: v })} placeholder="Optional" /></Field>
          <div className="ws-row2">
            <Field label="Work type"><select className="ws-select" value={d.workType} onChange={(e) => set({ workType: e.target.value })}>{WORK_TYPES.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Available to start"><select className="ws-select" value={d.availability} onChange={(e) => set({ availability: e.target.value })}>{AVAILABILITY_OPTIONS.map((x) => <option key={x}>{x}</option>)}</select></Field>
          </div>
          <Field label="Shifts you can work"><ChipPicker options={SHIFT_OPTIONS} values={d.shiftPreferences} onChange={(v) => set({ shiftPreferences: v })} /></Field>
          <Field label="Pay you are looking for" hint="Optional. Never shown to employers as a demand; used to filter out jobs that pay far less.">
            <div className="ws-row3">
              <input className="ws-input" inputMode="numeric" placeholder="Minimum" value={d.salaryMin} onChange={(e) => set({ salaryMin: e.target.value.replace(/\D/g, "") })} />
              <input className="ws-input" inputMode="numeric" placeholder="Maximum" value={d.salaryMax} onChange={(e) => set({ salaryMax: e.target.value.replace(/\D/g, "") })} />
              <select className="ws-select" value={d.salaryPeriod} onChange={(e) => set({ salaryPeriod: e.target.value })}>{SALARY_PERIODS.map((x) => <option key={x}>{x}</option>)}</select>
            </div>
          </Field>
        </>)}
        {w.step === 4 && (<>
          <Field label="Languages you speak"><ChipPicker options={LANGUAGES} values={d.languages} onChange={(v) => set({ languages: v })} allowCustom /></Field>
          <label className="ws-check"><input type="checkbox" checked={d.hasOwnTransport} onChange={(e) => set({ hasOwnTransport: e.target.checked })} /><span>I have my own transport</span></label>
          <label className="ws-check"><input type="checkbox" checked={d.openToFuture} onChange={(e) => set({ openToFuture: e.target.checked })} /><span><b>Let employers find me.</b> Show my profile (first name and initial only, no contact details) in employer talent search.</span></label>
          <Field label="Upload your CV" hint="PDF or Word, up to 10 MB. Stored privately; employers see it only after you apply."><input className="ws-input" type="file" accept=".pdf,.doc,.docx" onChange={(e) => setCv(e.target.files?.[0] ?? null)} /></Field>
          {cvMsg && <div className="ws-error">{cvMsg}</div>}
        </>)}
      </div>
      {w.err && <div className="ws-error" role="alert" style={{ marginTop: 16 }}>{w.err}</div>}
      <div className="ws-wizard-actions">
        <button className="ws-btn ws-btn--ghost" onClick={w.back} disabled={w.step === 0 || w.busy}>Back</button>
        <button className="ws-btn" onClick={() => w.next()} disabled={w.busy}>{w.busy && <Loader2 size={15} className="animate-spin" />} {w.step === names.length - 1 ? "Finish and see my matches" : "Continue"}</button>
      </div>
    </div>
  );
}

export function BusinessOnboarding({ profile, onDone }: { profile: P; onDone: () => void }) {
  const names = ["Your business", "Location", "Contact", "Hiring needs"];
  const w = useWizard(
    {
      role: "business", name: profile?.name || "", orgName: profile?.orgName || "", industry: profile?.industry || INDUSTRIES[0], businessType: profile?.businessType || BUSINESS_TYPES[0],
      companySize: profile?.companySize || "", website: profile?.website || "", description: profile?.description || "",
      country: profile?.country || "Nigeria", region: profile?.region || "", city: profile?.city || "",
      contactName: profile?.contactName || profile?.name || "", contactPhone: profile?.contactPhone || profile?.phone || "", phone: profile?.contactPhone || profile?.phone || "",
      hiringUrgency: profile?.hiringUrgency || "", typicalRoles: profile?.typicalRoles || [], benefitsOffered: profile?.benefitsOffered || [], workforceNeeds: profile?.workforceNeeds || "",
    },
    names.length - 1,
    (s, d) => {
      if (s === 0 && !String(d.orgName).trim()) return "Enter your business name.";
      if (s === 1 && (!d.country || !d.region || !d.city)) return "Choose your country, state and area.";
      if (s === 2 && (!String(d.contactName).trim() || String(d.contactPhone).replace(/\D/g, "").length < 7)) return "Add a contact name and a phone number.";
      return "";
    },
    onDone,
  );
  const { d, set } = w;
  return (
    <div className="ws-wizard ws-card">
      <h2>Set up your hiring profile</h2>
      <p className="ws-muted ws-small" style={{ marginTop: 4 }}>Candidates see this before they apply. Complete profiles get more and better applicants.</p>
      <Steps names={names} now={w.step} />
      <div className="ws-form" style={{ marginTop: 22 }}>
        {w.step === 0 && (<>
          <Field label="Business name"><input className="ws-input" value={d.orgName} onChange={(e) => set({ orgName: e.target.value })} placeholder="e.g. Lakeview Residences" /></Field>
          <div className="ws-row2">
            <Field label="Industry"><select className="ws-select" value={d.industry} onChange={(e) => set({ industry: e.target.value })}>{INDUSTRIES.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Type of business"><select className="ws-select" value={d.businessType} onChange={(e) => set({ businessType: e.target.value })}>{BUSINESS_TYPES.map((x) => <option key={x}>{x}</option>)}</select></Field>
          </div>
          <div className="ws-row2">
            <Field label="Team size"><select className="ws-select" value={d.companySize} onChange={(e) => set({ companySize: e.target.value })}><option value="">Select</option>{COMPANY_SIZES.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Website" hint="Optional"><input className="ws-input" value={d.website} onChange={(e) => set({ website: e.target.value })} placeholder="https://" inputMode="url" /></Field>
          </div>
          <Field label="About your business" hint="What you do and what it is like to work with you."><textarea className="ws-textarea" value={d.description} onChange={(e) => set({ description: e.target.value })} /></Field>
        </>)}
        {w.step === 1 && <PlacePicker value={{ country: d.country, region: d.region, city: d.city }} onChange={(p) => set(p)} />}
        {w.step === 2 && (
          <div className="ws-row2">
            <Field label="Contact person"><input className="ws-input" value={d.contactName} onChange={(e) => set({ contactName: e.target.value, name: e.target.value })} autoComplete="name" /></Field>
            <Field label="Contact phone" hint="Shown to candidates only after you shortlist them."><input className="ws-input" value={d.contactPhone} onChange={(e) => set({ contactPhone: e.target.value, phone: e.target.value })} inputMode="tel" autoComplete="tel" /></Field>
          </div>
        )}
        {w.step === 3 && (<>
          <Field label="How soon do you need people?"><select className="ws-select" value={d.hiringUrgency} onChange={(e) => set({ hiringUrgency: e.target.value })}><option value="">Select</option>{HIRING_URGENCY.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Roles you usually hire" hint="We use this to suggest candidates before you even post."><TagBox values={d.typicalRoles} onChange={(v) => set({ typicalRoles: v })} placeholder="e.g. Waiter" suggestions={POPULAR_ROLES} /></Field>
          <Field label="What do you offer staff?" hint="Candidates filter on these, so list everything you provide."><ChipPicker options={BENEFITS} values={d.benefitsOffered} onChange={(v) => set({ benefitsOffered: v })} /></Field>
          <Field label="Anything else about your hiring needs?"><textarea className="ws-textarea" value={d.workforceNeeds} onChange={(e) => set({ workforceNeeds: e.target.value })} placeholder="e.g. 2 housekeepers and 1 driver for a new site in Lekki from next month." /></Field>
        </>)}
      </div>
      {w.err && <div className="ws-error" role="alert" style={{ marginTop: 16 }}>{w.err}</div>}
      <div className="ws-wizard-actions">
        <button className="ws-btn ws-btn--ghost" onClick={w.back} disabled={w.step === 0 || w.busy}>Back</button>
        <button className="ws-btn" onClick={() => w.next()} disabled={w.busy}>{w.busy && <Loader2 size={15} className="animate-spin" />} {w.step === names.length - 1 ? "Finish and open my dashboard" : "Continue"}</button>
      </div>
    </div>
  );
}
