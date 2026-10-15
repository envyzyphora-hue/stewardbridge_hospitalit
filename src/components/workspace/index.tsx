"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import "./workspace.css";
import { RoleChoice, CandidateOnboarding, BusinessOnboarding } from "./onboarding-flow";
import CandidateWorkspace from "./candidate-workspace";
import BusinessWorkspace from "./business-workspace";
import { errMessage } from "./ui";

export { default as JobSearch } from "./job-search";

type User = { userId: string; email?: string; name?: string; role?: "candidate" | "business" | "admin" | null };

/** Everything a signed-in, non-admin person sees under #/workspace. */
export default function WorkspaceRouter({ user, route }: { user: User; route: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState("");
  const [chosen, setChosen] = useState<"candidate" | "business" | null>(null);

  const load = useCallback(() => {
    api.get("/api/profile").then((r) => { setProfile(r.data.profile); setError(""); }).catch((e) => setError(errMessage(e, "We could not load your profile.")));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (error) return <div className="ws-root"><div className="ws-wrap"><div className="ws-error">{error} <button className="ws-link" onClick={load}>Retry</button></div></div></div>;
  if (!profile) return <div className="ws-root"><div className="ws-wrap"><div className="ws-skeleton" /></div></div>;

  const role = profile.role ?? chosen;
  if (!role) return <div className="ws-root"><div className="ws-wrap"><RoleChoice onChoose={setChosen} /></div></div>;

  // Admins use the admin console, not this workspace.
  if (role === "admin") return <div className="ws-root"><div className="ws-wrap"><p>Admin accounts use the Admin console.</p></div></div>;

  // First-run: the wizard is required until the profile has the essentials.
  if (!profile.onboardingComplete) {
    return (
      <div className="ws-root"><div className="ws-wrap">
        {role === "candidate" ? <CandidateOnboarding profile={profile} onDone={load} /> : <BusinessOnboarding profile={profile} onDone={load} />}
      </div></div>
    );
  }
  return role === "candidate"
    ? <CandidateWorkspace user={user} profile={profile} route={route} reload={load} />
    : <BusinessWorkspace user={user} profile={profile} route={route} reload={load} />;
}
