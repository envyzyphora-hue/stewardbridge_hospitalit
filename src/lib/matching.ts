// Pure matching + search helpers (no database or framework imports, so they are easy to unit test).

export type CandidateLike = {
  skills?: string[] | null;
  rolesWanted?: string[] | null;
  rolesNotWanted?: string[] | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  preferredLocations?: string[] | null;
  willingToRelocate?: boolean | null;
  workType?: string | null;
  shiftPreferences?: string[] | null;
  experienceYears?: number | null;
  salaryMin?: number | null;
  industries?: string[] | null;
};

export type JobLike = {
  title: string;
  category?: string | null;
  description?: string | null;
  skills?: string[] | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  workType?: string | null;
  shiftPattern?: string | null;
  experienceLevel?: string | null;
  salaryMax?: number | null;
  salaryMin?: number | null;
};

export type MatchResult = { score: number; reasons: string[]; excluded: boolean };

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9\s/+&-]/g, " ").replace(/\s+/g, " ").trim();
const list = (v: string[] | null | undefined) => (Array.isArray(v) ? v.map(norm).filter(Boolean) : []);
const STOP = new Set(["and", "the", "for", "with", "a", "an", "of", "in", "at", "to", "staff", "assistant"]);
const words = (s: string) => norm(s).split(" ").filter((w) => w.length > 2 && !STOP.has(w));

function phraseOverlap(a: string, b: string) {
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const wa = new Set(words(a));
  return words(b).some((w) => wa.has(w));
}

export function experienceYearsRequired(level?: string | null): number {
  const l = norm(level);
  if (!l) return 0;
  if (l.includes("no experience")) return 0;
  if (l.includes("entry")) return 0;
  if (l.includes("mid")) return 2;
  if (l.includes("senior")) return 5;
  const m = l.match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

/** How well a job fits a candidate. 0-100 plus plain-language reasons. */
export function scoreJobForCandidate(c: CandidateLike, j: JobLike): MatchResult {
  const reasons: string[] = [];
  const title = norm(j.title);
  const category = norm(j.category);

  const notWanted = list(c.rolesNotWanted);
  if (notWanted.some((r) => phraseOverlap(title, r))) return { score: 0, reasons: ["You said you do not want this kind of role"], excluded: true };

  let score = 0;

  // 1) Role fit (30)
  const wanted = list(c.rolesWanted);
  if (wanted.some((r) => phraseOverlap(title, r))) { score += 30; reasons.push("Matches a role you want"); }
  else if (wanted.some((r) => phraseOverlap(category, r))) { score += 15; reasons.push("Same field as a role you want"); }
  else if (list(c.industries).some((i) => phraseOverlap(category, i))) { score += 8; }

  // 2) Skills (30)
  const need = list(j.skills);
  const have = list(c.skills);
  const text = norm(`${j.title} ${j.description ?? ""}`);
  if (need.length) {
    const hit = need.filter((n) => have.some((h) => phraseOverlap(h, n)));
    score += Math.round((hit.length / need.length) * 30);
    if (hit.length) reasons.push(`${hit.length} of ${need.length} required skills`);
  } else if (have.length) {
    const hit = have.filter((h) => text.includes(h));
    score += Math.min(30, hit.length * 10);
    if (hit.length) reasons.push(`Your skills appear in the ad (${hit.slice(0, 2).join(", ")})`);
  }

  // 3) Location (20)
  const jc = norm(j.city), jr = norm(j.region);
  const cc = norm(c.city), cr = norm(c.region);
  const prefs = list(c.preferredLocations);
  if (jc && cc && (jc === cc || jc.includes(cc) || cc.includes(jc))) { score += 20; reasons.push("In your city"); }
  else if (prefs.some((p) => jc && (jc.includes(p) || p.includes(jc)))) { score += 16; reasons.push("In a preferred area"); }
  else if (jr && cr && jr === cr) { score += 12; reasons.push("In your state"); }
  else if (c.willingToRelocate) { score += 6; reasons.push("You are open to relocating"); }
  else if (!jc && !jr) { score += 8; }

  // 4) Work type (10)
  if (c.workType && j.workType && norm(c.workType) === norm(j.workType)) { score += 10; reasons.push("Your preferred work type"); }

  // 5) Shifts (5)
  const shifts = list(c.shiftPreferences);
  if (shifts.length && j.shiftPattern) {
    const sp = norm(j.shiftPattern);
    const ok = shifts.some((s) => sp.includes(s.replace(/s$/, "")) || (s === "nights" && sp.includes("night")) || (s === "live-in" && sp.includes("live")) || (s === "weekends" && sp.includes("weekend")) || ((s === "mornings" || s === "afternoons") && sp.includes("day")) || (s === "evenings" && (sp.includes("evening") || sp.includes("day"))));
    if (ok || sp.includes("flexible") || sp.includes("rotating")) { score += 5; reasons.push("Fits your shift preference"); }
  }

  // 6) Experience (5)
  const req = experienceYearsRequired(j.experienceLevel);
  if (c.experienceYears != null) {
    if (c.experienceYears >= req) { score += 5; if (req > 0) reasons.push("You meet the experience level"); }
  }

  // 7) Pay (small nudge, only when both sides stated it)
  if (c.salaryMin && j.salaryMax && j.salaryMax >= c.salaryMin) reasons.push("Pay meets your minimum");
  if (c.salaryMin && j.salaryMax && j.salaryMax < c.salaryMin) score = Math.max(0, score - 10);

  return { score: Math.max(0, Math.min(100, score)), reasons: reasons.slice(0, 4), excluded: false };
}

/** How well a candidate fits a job (business view). Same engine, different framing. */
export function scoreCandidateForJob(c: CandidateLike, j: JobLike): MatchResult {
  return scoreJobForCandidate(c, j);
}

/** Free-text relevance: higher is better, 0 means no match. Every query word must hit somewhere. */
export function textRelevance(query: string, fields: { title: string; category?: string | null; business?: string | null; location?: string | null; skills?: string[] | null; description?: string | null }): number {
  const q = words(query);
  if (!q.length) return 1;
  const title = norm(fields.title), cat = norm(fields.category), biz = norm(fields.business), loc = norm(fields.location);
  const skills = list(fields.skills).join(" "), desc = norm(fields.description);
  let total = 0;
  for (const w of q) {
    let s = 0;
    if (title.includes(w)) s += 6;
    if (cat.includes(w)) s += 3;
    if (skills.includes(w)) s += 3;
    if (biz.includes(w)) s += 2;
    if (loc.includes(w)) s += 3;
    if (desc.includes(w)) s += 1;
    if (s === 0) return 0; // AND semantics: all words must match something
    total += s;
  }
  if (title.startsWith(norm(query))) total += 4;
  return total;
}
