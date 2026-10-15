// Shared vocabulary used by onboarding forms, job posting and search filters.
// Derived from the fields that job boards (Jobberman, MyJobMag, Indeed) and hospitality boards
// (Culinary Agents, Poached, Hcareers, Snagajob) capture. See HANDOFF.md section "Research".

export const POPULAR_ROLES = [
  "Housekeeper", "Room Attendant", "Receptionist", "Front Desk Agent", "Concierge", "Bellhop / Porter",
  "Waiter / Waitress", "Bartender", "Barista", "Host / Hostess", "Chef de Partie", "Commis Chef", "Cook",
  "Kitchen Assistant", "Cleaner", "Laundry Attendant", "Driver", "Security Officer", "Caregiver", "Nanny",
  "Cashier", "Sales Attendant", "Store Keeper", "Maintenance Technician", "Event Staff", "Admin Assistant",
];

export const POPULAR_SKILLS = [
  "Customer service", "Housekeeping", "Cleaning", "Cooking", "Food safety", "Cash handling", "POS systems",
  "Guest relations", "Driving", "First aid", "Laundry", "Bartending", "Table service", "Inventory",
  "Time keeping", "Teamwork", "Basic computer skills", "Phone etiquette", "Childcare", "Elderly care",
];

export const SHIFT_OPTIONS = ["Mornings", "Afternoons", "Evenings", "Nights", "Weekends", "Public holidays", "Split shifts", "Live-in"];

export const LANGUAGES = ["English", "Yoruba", "Igbo", "Hausa", "Pidgin", "French", "Arabic", "Twi", "Swahili"];

export const EDUCATION_LEVELS = ["Secondary school", "OND / NCE", "HND / Bachelor's", "Master's or above", "Trade / vocational certificate"];

export const COMPANY_SIZES = ["1-10 people", "11-50 people", "51-200 people", "201-1000 people", "1000+ people"];

export const HIRING_URGENCY = ["Immediately", "Within 2 weeks", "Within a month", "Ongoing / building a talent pool"];

export const BENEFITS = ["Accommodation", "Meals on duty", "Transport allowance", "Uniform provided", "Health cover", "Paid training", "Performance bonus", "Pension", "Paid leave", "Tips / service charge"];

export const SALARY_PERIODS = ["per month", "per week", "per day", "per hour"];

export const EXPERIENCE_LEVELS = ["No experience needed", "Entry level (0-2 years)", "Mid level (2-5 years)", "Senior (5+ years)"];

export const SHIFT_PATTERNS = ["Day shift", "Night shift", "Rotating shifts", "Weekends only", "Flexible hours", "Live-in"];

export const APPLICATION_STAGES = [
  { key: "submitted", label: "Applied" },
  { key: "under_review", label: "In review" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "interview", label: "Interview" },
  { key: "accepted", label: "Hired" },
  { key: "rejected", label: "Not selected" },
  { key: "withdrawn", label: "Withdrawn" },
] as const;

export type ApplicationStageKey = (typeof APPLICATION_STAGES)[number]["key"];

export const stageLabel = (key: string) => APPLICATION_STAGES.find((s) => s.key === key)?.label ?? key;

export function formatMoney(n: number | null | undefined, currency = "NGN") {
  if (n == null) return "";
  const sym = currency === "NGN" ? "\u20A6" : currency === "USD" ? "$" : currency === "GBP" ? "\u00A3" : currency + " ";
  return sym + Math.round(n).toLocaleString("en-US");
}

export function formatSalaryRange(min?: number | null, max?: number | null, period?: string | null, currency = "NGN") {
  if (min == null && max == null) return "";
  const range = min != null && max != null && min !== max ? `${formatMoney(min, currency)} - ${formatMoney(max, currency)}` : formatMoney(max ?? min, currency);
  return period ? `${range} ${period}` : range;
}
