"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/kit";

export function WizardShell({
  title,
  subtitle,
  steps,
  current,
  children,
}: {
  title: string;
  subtitle: string;
  steps: string[];
  current: number;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-brand-950 sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-brand-500">{subtitle}</p>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 overflow-x-auto px-2">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                  i < current && "border-brand-600 bg-brand-600 text-white",
                  i === current && "border-brand-600 text-brand-700",
                  i > current && "border-brand-200 text-brand-300",
                )}
              >
                {i < current ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn("hidden text-[11px] font-medium sm:block", i <= current ? "text-brand-700" : "text-brand-300")}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && <div className={cn("h-0.5 w-6 sm:w-12", i < current ? "bg-brand-600" : "bg-brand-200")} />}
          </div>
        ))}
      </div>

      <Card className="mt-8 p-6 sm:p-8">{children}</Card>
    </div>
  );
}
