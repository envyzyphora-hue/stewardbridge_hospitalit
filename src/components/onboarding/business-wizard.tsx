"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { WizardShell } from "@/components/onboarding/wizard-shell";
import { LocationPicker } from "@/components/ui/location-picker";
import { Field, Input, Select, Textarea } from "@/components/ui/kit";
import { Button } from "@/components/ui/button";
import { saveBusinessOnboarding, type BusinessOnboardingInput } from "@/lib/actions/onboarding";
import { INDUSTRIES } from "@/lib/geo";
import { useToast } from "@/components/ui/toast";

const STEPS = ["Organization", "Location", "Contact", "Workforce Needs"];
const BUSINESS_TYPES = ["Hotel / Hospitality", "Private Household", "Corporate Office", "Healthcare Facility", "Retail Outlet", "Logistics Company", "Construction Firm", "Other"];

export function BusinessWizard() {
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const [data, setData] = useState<BusinessOnboardingInput>({
    orgName: "",
    industry: INDUSTRIES[0],
    businessType: BUSINESS_TYPES[0],
    country: "Nigeria",
    region: "",
    city: "",
    contactName: "",
    contactPhone: "",
    workforceNeeds: "",
    description: "",
  });

  function update<K extends keyof BusinessOnboardingInput>(key: K, value: BusinessOnboardingInput[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function next() {
    if (step === 0 && !data.orgName.trim()) {
      toast.push("Please enter your organization's name.", "error");
      return;
    }
    if (step === 1 && (!data.country || !data.city)) {
      toast.push("Please complete your business location.", "error");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function submit() {
    startTransition(async () => {
      await saveBusinessOnboarding(data);
    });
  }

  return (
    <WizardShell
      title="Set up your business workspace"
      subtitle="Tell us about your organization so we can help you find the right people."
      steps={STEPS}
      current={step}
    >
      {step === 0 && (
        <div className="flex flex-col gap-5">
          <Field label="Organization / business name" required>
            <Input value={data.orgName} onChange={(e) => update("orgName", e.target.value)} placeholder="e.g. Lakeview Residences" />
          </Field>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Industry">
              <Select value={data.industry} onChange={(e) => update("industry", e.target.value)}>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </Select>
            </Field>
            <Field label="Business type">
              <Select value={data.businessType} onChange={(e) => update("businessType", e.target.value)}>
                {BUSINESS_TYPES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="About your organization">
            <Textarea value={data.description} onChange={(e) => update("description", e.target.value)} placeholder="A short description of your organization…" />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-brand-500">Where is your organization located?</p>
          <LocationPicker value={{ country: data.country, region: data.region, city: data.city }} onChange={(loc) => setData((d) => ({ ...d, ...loc }))} />
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-5">
          <Field label="Primary contact name" required>
            <Input value={data.contactName} onChange={(e) => update("contactName", e.target.value)} placeholder="Full name" />
          </Field>
          <Field label="Contact phone number" required>
            <Input value={data.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} placeholder="e.g. 080XXXXXXXX" />
          </Field>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-5">
          <Field label="What kind of workforce support do you need?" hint="Optional — you can always create detailed job posts or staffing requests later.">
            <Textarea
              value={data.workforceNeeds}
              onChange={(e) => update("workforceNeeds", e.target.value)}
              placeholder="e.g. 2 housekeepers, 1 driver, ongoing front-desk support…"
            />
          </Field>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between border-t border-brand-100 pt-6">
        <Button variant="ghost" onClick={back} disabled={step === 0 || pending}>
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next}>Continue</Button>
        ) : (
          <Button onClick={submit} disabled={pending || !data.contactName || !data.contactPhone}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Finish & Enter Dashboard
          </Button>
        )}
      </div>
    </WizardShell>
  );
}
