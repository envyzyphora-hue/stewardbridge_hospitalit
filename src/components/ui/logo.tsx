import { cn } from "@/lib/utils";

export function Logo({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display font-bold tracking-tight", className)}>
      <svg
        width="30"
        height="30"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <circle cx="16" cy="16" r="16" fill={dark ? "#ffffff" : "#1f5750"} />
        <path
          d="M6 20C9 15 13 13 16 13C19 13 23 15 26 20"
          stroke={dark ? "#1f5750" : "#f3821b"}
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M6 20V23M26 20V23"
          stroke={dark ? "#1f5750" : "#ffffff"}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx="16" cy="11" r="2.4" fill={dark ? "#1f5750" : "#ffffff"} />
      </svg>
      <span className={dark ? "text-white" : "text-brand-900"}>
        Steward<span className={dark ? "text-accent-300" : "text-accent-500"}>Bridge</span>
      </span>
    </span>
  );
}
