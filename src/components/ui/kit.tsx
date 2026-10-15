import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-brand-100 bg-white shadow-sm", className)}>{children}</div>
  );
}

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-brand-800">
          {label} {required && <span className="text-accent-600">*</span>}
        </label>
      )}
      {children}
      {hint && <p className="mt-1.5 text-xs text-brand-400">{hint}</p>}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-brand-200 bg-white px-3.5 text-sm text-brand-900 outline-none transition placeholder:text-brand-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-brand-50 disabled:text-brand-400",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[110px] w-full resize-y rounded-xl border border-brand-200 bg-white px-3.5 py-2.5 text-sm text-brand-900 outline-none transition placeholder:text-brand-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-xl border border-brand-200 bg-white px-3.5 text-sm text-brand-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

const badgeVariants = {
  neutral: "bg-brand-50 text-brand-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  info: "bg-sky-50 text-sky-700",
  accent: "bg-accent-50 text-accent-700",
};

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: ReactNode;
  variant?: keyof typeof badgeVariants;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        badgeVariants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-brand-100">
      <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 px-6 py-14 text-center">
      {icon && <div className="mb-4 text-brand-300">{icon}</div>}
      <h3 className="font-display text-base font-semibold text-brand-900">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-brand-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600", className)}
    />
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, keyof typeof badgeVariants> = {
    draft: "neutral",
    pending_review: "warning",
    published: "success",
    paused: "warning",
    filled: "info",
    closed: "neutral",
    submitted: "info",
    under_review: "warning",
    shortlisted: "accent",
    interview: "accent",
    accepted: "success",
    rejected: "danger",
    withdrawn: "neutral",
    open: "info",
    matching: "warning",
    fulfilled: "success",
    pending: "warning",
    delivered: "success",
    failed: "danger",
    candidate: "neutral",
    team_member: "info",
    deployed: "success",
  };
  return <Badge variant={map[status] ?? "neutral"}>{status.replace(/_/g, " ")}</Badge>;
}
