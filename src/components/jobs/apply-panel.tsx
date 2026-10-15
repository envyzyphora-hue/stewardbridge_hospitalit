"use client";

import { useState, useTransition } from "react";
import { Loader2, Bookmark, BookmarkCheck, Send } from "lucide-react";
import { Card, Textarea, Field } from "@/components/ui/kit";
import { Button, LinkButton } from "@/components/ui/button";
import { applyToJob, toggleSaveJob } from "@/lib/actions/jobs";
import { useToast } from "@/components/ui/toast";

export function ApplyPanel({
  jobId,
  jobStatus,
  isAuthenticated,
  role,
  alreadyApplied,
  alreadySaved,
}: {
  jobId: string;
  jobStatus: string;
  isAuthenticated: boolean;
  role: "candidate" | "business" | "admin" | null;
  alreadyApplied: boolean;
  alreadySaved: boolean;
}) {
  const [coverNote, setCoverNote] = useState("");
  const [saved, setSaved] = useState(alreadySaved);
  const [pending, startTransition] = useTransition();
  const [savePending, startSaveTransition] = useTransition();
  const toast = useToast();

  if (jobStatus !== "published") {
    return (
      <Card className="p-6 text-center text-sm text-brand-500">This opportunity is no longer open for applications.</Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-brand-600">Sign in as a candidate to apply or save this opportunity.</p>
        <LinkButton href="/auth/sign-in?intent=signup" variant="accent" className="mt-4 w-full">Get Started</LinkButton>
      </Card>
    );
  }

  if (role !== "candidate") {
    return <Card className="p-6 text-center text-sm text-brand-500">Only candidate accounts can apply to opportunities.</Card>;
  }

  if (alreadyApplied) {
    return null;
  }

  return (
    <Card className="p-6">
      <Field label="Add a short note to your application" hint="Optional, but a good note stands out.">
        <Textarea value={coverNote} onChange={(e) => setCoverNote(e.target.value)} placeholder="Tell the business why you're a great fit…" />
      </Field>
      <Button
        className="mt-4 w-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await applyToJob(jobId, coverNote);
          })
        }
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Apply Now
      </Button>
      <Button
        variant="outline"
        className="mt-2 w-full"
        disabled={savePending}
        onClick={() =>
          startSaveTransition(async () => {
            await toggleSaveJob(jobId);
            setSaved((s) => !s);
            toast.push(saved ? "Removed from saved opportunities." : "Saved to your opportunities.", "success");
          })
        }
      >
        {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />} {saved ? "Saved" : "Save for later"}
      </Button>
    </Card>
  );
}
