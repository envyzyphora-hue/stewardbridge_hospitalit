import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  uuid,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

// ---------- ENUMS ----------
export const userRoleEnum = pgEnum("user_role", [
  "candidate",
  "business",
  "admin",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "draft",
  "pending_review",
  "published",
  "paused",
  "filled",
  "closed",
]);

export const applicationStatusEnum = pgEnum("application_status", [
  "submitted",
  "under_review",
  "shortlisted",
  "interview",
  "accepted",
  "rejected",
  "withdrawn",
]);

export const staffingStatusEnum = pgEnum("staffing_status", [
  "open",
  "matching",
  "fulfilled",
  "closed",
]);

export const teamMemberStatusEnum = pgEnum("team_member_status", [
  "candidate",
  "team_member",
  "deployed",
]);

export const documentCategoryEnum = pgEnum("document_category", [
  "cv",
  "certificate",
  "identification",
  "application_document",
  "business_document",
  "contract",
  "other",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "application_update",
  "message",
  "document_request",
  "interview",
  "training",
  "staffing_update",
  "deployment",
  "approval",
  "feedback",
  "announcement",
]);

export const calendarEventTypeEnum = pgEnum("calendar_event_type", [
  "interview",
  "meeting",
  "training",
  "deployment",
  "reminder",
  "appointment",
]);

export const ratingCategoryEnum = pgEnum("rating_category", [
  "website",
  "job_application",
  "service",
  "business_assignment",
  "hiring_process",
]);

export const webhookStatusEnum = pgEnum("webhook_delivery_status", [
  "pending",
  "delivered",
  "failed",
]);

export const aiMessageRoleEnum = pgEnum("ai_message_role", [
  "user",
  "assistant",
  "system",
]);

export const aiMessageStatusEnum = pgEnum("ai_message_status", [
  "answer",
  "suggestion",
  "draft",
  "needs_approval",
  "completed",
  "failed",
]);

// ---------- CORE USERS ----------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash"),
  name: text("name"),
  image: text("image"),
  role: userRoleEnum("role"),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  isAdminAuthorized: boolean("is_admin_authorized").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- CANDIDATE PROFILE ----------
export const candidateProfiles = pgTable("candidate_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  photoUrl: text("photo_url"),
  gender: text("gender"),
  country: text("country"),
  region: text("region"),
  city: text("city"),
  skills: jsonb("skills").$type<string[]>().default([]),
  experienceYears: integer("experience_years"),
  experienceSummary: text("experience_summary"),
  qualifications: text("qualifications"),
  rolesWanted: jsonb("roles_wanted").$type<string[]>().default([]),
  rolesNotWanted: jsonb("roles_not_wanted").$type<string[]>().default([]),
  availability: text("availability"),
  workType: text("work_type"),
  preferredLocations: jsonb("preferred_locations").$type<string[]>().default([]),
  distancePreferenceKm: integer("distance_preference_km"),
  openToFuture: boolean("open_to_future").notNull().default(true),
  bio: text("bio"),
  // --- Added in v17: richer matching data (all optional, safe for `db:push` on an existing DB) ---
  headline: text("headline"),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  salaryPeriod: text("salary_period"),
  languages: jsonb("languages").$type<string[]>().default([]),
  certifications: jsonb("certifications").$type<string[]>().default([]),
  educationLevel: text("education_level"),
  shiftPreferences: jsonb("shift_preferences").$type<string[]>().default([]),
  industries: jsonb("industries").$type<string[]>().default([]),
  willingToRelocate: boolean("willing_to_relocate").notNull().default(false),
  hasOwnTransport: boolean("has_own_transport").notNull().default(false),
  onboardingStep: integer("onboarding_step").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- BUSINESS PROFILE ----------
export const businessProfiles = pgTable("business_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  orgName: text("org_name"),
  industry: text("industry"),
  businessType: text("business_type"),
  country: text("country"),
  region: text("region"),
  city: text("city"),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  workforceNeeds: text("workforce_needs"),
  description: text("description"),
  logoUrl: text("logo_url"),
  // --- Added in v17 ---
  companySize: text("company_size"),
  website: text("website"),
  hiringUrgency: text("hiring_urgency"),
  typicalRoles: jsonb("typical_roles").$type<string[]>().default([]),
  benefitsOffered: jsonb("benefits_offered").$type<string[]>().default([]),
  onboardingStep: integer("onboarding_step").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- JOBS ----------
export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businessProfiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: text("category"),
    description: text("description"),
    responsibilities: text("responsibilities"),
    skills: jsonb("skills").$type<string[]>().default([]),
    experienceRequired: text("experience_required"),
    qualifications: text("qualifications"),
    workType: text("work_type"),
    country: text("country"),
    region: text("region"),
    city: text("city"),
    availability: text("availability"),
    requirements: text("requirements"),
    // --- Added in v17 ---
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    salaryPeriod: text("salary_period"),
    salaryCurrency: text("salary_currency").default("NGN"),
    openings: integer("openings").notNull().default(1),
    benefits: jsonb("benefits").$type<string[]>().default([]),
    shiftPattern: text("shift_pattern"),
    experienceLevel: text("experience_level"),
    urgent: boolean("urgent").notNull().default(false),
    deadline: timestamp("deadline"),
    status: jobStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    publishedAt: timestamp("published_at"),
  },
  (t) => [index("jobs_status_idx").on(t.status), index("jobs_business_idx").on(t.businessId)],
);

// ---------- APPLICATIONS ----------
export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidateProfiles.id, { onDelete: "cascade" }),
    status: applicationStatusEnum("status").notNull().default("submitted"),
    coverNote: text("cover_note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("applications_job_idx").on(t.jobId),
    index("applications_candidate_idx").on(t.candidateId),
  ],
);

export const applicationEvents = pgTable("application_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").references(() => users.id),
  event: text("event").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- STAFFING REQUESTS ----------
export const staffingRequests = pgTable("staffing_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businessProfiles.id, { onDelete: "cascade" }),
  roleNeeded: text("role_needed").notNull(),
  quantity: integer("quantity").notNull().default(1),
  skills: jsonb("skills").$type<string[]>().default([]),
  experienceRequired: text("experience_required"),
  country: text("country"),
  region: text("region"),
  city: text("city"),
  timing: text("timing"),
  notes: text("notes"),
  status: staffingStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- TEAM MEMBERS / DEPLOYMENT ----------
export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  candidateId: uuid("candidate_id")
    .notNull()
    .references(() => candidateProfiles.id, { onDelete: "cascade" }),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businessProfiles.id, { onDelete: "cascade" }),
  jobId: uuid("job_id").references(() => jobs.id),
  applicationId: uuid("application_id").references(() => applications.id),
  status: teamMemberStatusEnum("status").notNull().default("team_member"),
  deployedAt: timestamp("deployed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- DOCUMENTS ----------
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  category: documentCategoryEnum("category").notNull().default("other"),
  fileName: text("file_name").notNull(),
  fileType: text("file_type"),
  fileSize: integer("file_size"),
  storagePath: text("storage_path").notNull(),
  isPrivate: boolean("is_private").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- MESSAGING ----------
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  subject: text("subject"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const conversationParticipants = pgTable("conversation_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  attachmentId: uuid("attachment_id").references(() => documents.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- NOTIFICATIONS ----------
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- CALENDAR ----------
export const calendarEvents = pgTable("calendar_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  type: calendarEventTypeEnum("type").notNull().default("meeting"),
  relatedType: text("related_type"),
  relatedId: uuid("related_id"),
  googleEventId: text("google_event_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- RATINGS & FEEDBACK ----------
export const ratings = pgTable("ratings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  category: ratingCategoryEnum("category").notNull(),
  score: integer("score").notNull(),
  comment: text("comment"),
  relatedType: text("related_type"),
  relatedId: uuid("related_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- WEBHOOKS / EXTERNAL AI ----------
export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventType: text("event_type").notNull(),
    recordType: text("record_type"),
    recordId: uuid("record_id"),
    payload: jsonb("payload").notNull(),
    status: webhookStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastAttemptAt: timestamp("last_attempt_at"),
    responseSnippet: text("response_snippet"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("webhook_events_status_idx").on(t.status)],
);

// ---------- AI WORKSPACE ----------
export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New conversation"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const aiMessages = pgTable("ai_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => aiConversations.id, { onDelete: "cascade" }),
  role: aiMessageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  status: aiMessageStatusEnum("status").notNull().default("answer"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- EXTERNAL AGENT DOOR ----------
export const agentDoorMessages = pgTable("agent_door_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: text("conversation_id").notNull(),
  userId: uuid("user_id"),
  author: text("author").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const agentTickets = pgTable("agent_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  topic: text("topic").notNull(),
  text: text("text").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const agentDrafts = pgTable("agent_drafts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  status: text("status").notNull().default("pending"),
  decisionBy: uuid("decision_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- AUDIT LOGS ----------
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: uuid("target_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- SAVED JOBS ----------
export const savedJobs = pgTable("saved_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  candidateId: uuid("candidate_id")
    .notNull()
    .references(() => candidateProfiles.id, { onDelete: "cascade" }),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- SITE CONTENT (CMS) ----------
export const siteContent = pgTable("site_content", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  title: text("title"),
  body: text("body"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
