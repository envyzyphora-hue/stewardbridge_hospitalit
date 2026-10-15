"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import { LocationPicker } from "@/components/ui/location-picker";
import { Field, Input, Select, Textarea } from "@/components/ui/kit";
import { TagInput } from "@/components/ui/tag-input";
import { Button } from "@/components/ui/button";
import { saveCandidateOnboarding, type CandidateOnboardingInput } from "@/lib/actions/onboarding";
import { WORK_TYPES, AVAILABILITY_OPTIONS } from "@/lib/geo";
import { useToast } from "@/components/ui/toast";

const STEPS = ["Basics", "Location", "Skills", "Preferences"];

export function CandidateWizard() {
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const [data, setData] = useState<CandidateOnboardingInput>({
    gender: "",
    bio: "",
    country: "Nigeria",
    region: "",
    city: "",
    skills: [],
    experienceYears: undefined,
    experienceSummary: "",
    qualifications: "",
    rolesWanted: [],
    rolesNotWanted: [],
    availability: AVAILABILITY_OPTIONS[0],
    workType: WORK_TYPES[0],
    preferredLocations: [],
    distancePreferenceKm: 25,
    openToFuture: true,
  });

  function update<K extends keyof CandidateOnboardingInput>(key: K, value: CandidateOnboardingInput[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function next() {
    if (step === 1 && (!data.country || !data.city)) {
      toast.push("Please complete your location before continuing.", "error");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function submit() {
    startTransition(async () => {
      await saveCandidateOnboarding(data);
    });
  }

  return (
    <WizardShell
      title="Build your opportunity profile"
      subtitle="This helps StewardBridge match you to the right opportunities."
      steps={STEPS}
      current={step}
    >
      {step === 0 && (
        <div className="flex flex-col gap-5">
          <Field label="Gender" hint="Optional — used only where legitimately relevant to a role.">
            <Select value={data.gender} onChange={(e) => update("gender", e.target.value)}>
              <option value="">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Short bio" hint="A couple of sentences about you and what you're looking for.">
            <Textarea value={data.bio} onChange={(e) => update("bio", e.target.value)} placeholder="e.g. Reliable, hardworking front-office professional with 3 years in hospitality…" />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-brand-500">Where are you based? This powers job matching and distance preferences.</p>
          <LocationPicker value={{ country: data.country, region: data.region, city: data.city }} onChange={(loc) => setData((d) => ({ ...d, ...loc }))} />
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-5">
          <Field label="Skills" hint="Press Enter after each skill." required>
            <TagInput values={data.skills} onChange={(v) => update("skills", v)} placeholder="e.g. Housekeeping, Customer Service, Driving" />
          </Field>
          <Field label="Years of experience">
            <Input
              type="number"
              min={0}
              max={60}
              value={data.experienceYears ?? ""}
              onChange={(e) => update("experienceYears", e.target.value ? Number(e.target.value) : undefined)}
            />
          </Field>
          <Field label="Experience summary">
            <Textarea
              value={data.experienceSummary}
              onChange={(e) => update("experienceSummary", e.target.value)}
              placeholder="Briefly describe your work history…"
            />
          </Field>
          <Field label="Qualifications / certifications">
            <Textarea value={data.qualifications} onChange={(e) => update("qualifications", e.target.value)} placeholder="e.g. WAEC, First Aid Certificate, Driver's License" />
          </Field>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-5">
          <Field label="Roles you want" hint="Press Enter after each role.">
            <TagInput values={data.rolesWanted} onChange={(v) => update("rolesWanted", v)} placeholder="e.g. Housekeeper, Driver, Receptionist" />
          </Field>
          <Field label="Roles you don't want">
            <TagInput values={data.rolesNotWanted} onChange={(v) => update("rolesNotWanted", v)} placeholder="Optional" />
          </Field>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Preferred work type">
              <Select value={data.workType} onChange={(e) => update("workType", e.target.value)}>
                {WORK_TYPES.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </Select>
            </Field>
            <Field label="Availability">
              <Select value={data.availability} onChange={(e) => update("availability", e.target.value)}>
                {AVAILABILITY_OPTIONS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Preferred work locations" hint="Other areas you're open to working in.">
            <TagInput values={data.preferredLocations} onChange={(v) => update("preferredLocations", v)} placeholder="e.g. Lekki, Ikeja, Remote" />
          </Field>
          <Field label="Maximum distance you'd travel (km)">
            <Input
              type="number"
              min={0}
              max={500}
              value={data.distancePreferenceKm ?? ""}
              onChange={(e) => update("distancePreferenceKm", e.target.value ? Number(e.target.value) : undefined)}
            />
          </Field>
          <label className="flex items-center gap-2.5 rounded-xl border border-brand-100 bg-brand-50/60 p-3.5 text-sm text-brand-700">
            <input type="checkbox" checked={data.openToFuture} onChange={(e) => update("openToFuture", e.target.checked)} className="h-4 w-4 rounded border-brand-300 text-brand-600" />
            Keep me visible for future opportunities, even when I'm not actively applying.
          </label>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between border-t border-brand-100 pt-6">
        <Button variant="ghost" onClick={back} disabled={step === 0 || pending}>
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next}>Continue</Button>
        ) : (
          <Button onClick={submit} disabled={pending || data.skills.length === 0}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Finish & Enter Dashboard
          </Button>
        )}
      </div>
    </WizardShell>
  );
}
