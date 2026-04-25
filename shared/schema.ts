import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username"), // Optional - for legacy users
  password: text("password"), // Optional - not used with instant login
  fullName: text("full_name"), // Optional - users can add after onboarding
  phoneNumber: text("phone_number").notNull(), // Primary identifier (find by phone)
  role: text("role").notNull().default("member"), // "admin" or "member"
  profileCompletedAt: timestamp("profile_completed_at"), // When user added their name
  referralCode: text("referral_code").unique(), // Unique code for sharing referral links
  referredBy: varchar("referred_by"), // userId of the person who referred them
  // Verified Ajo locality (used to match users to nearby verified groups on home page)
  state: text("state"),
  lga: text("lga"),
  // Verified Ajo identity (only collected when user is officer/attester/verified-group joiner)
  legalName: text("legal_name"),
  selfieUrl: text("selfie_url"), // Stored under .private/verifications/ in object storage
  // Onboarding: stamped when the user picks (or skips) a group-type on the post-signup card
  onboardingChoiceAt: timestamp("onboarding_choice_at"),
  // Admin KYC (Phase 3B) — required before a user can run an Ajo group.
  // Submitted by the admin, reviewed by the Kontrib team. profilePhotoUrl is
  // shown publicly on the user's profile/group cards; idDocUrl + kycSelfieUrl
  // are private and only seen by the Kontrib reviewer.
  govNameOnId: text("gov_name_on_id"),
  profilePhotoUrl: text("profile_photo_url"),
  idDocUrl: text("id_doc_url"),
  kycSelfieUrl: text("kyc_selfie_url"),
  adminKycStatus: text("admin_kyc_status").notNull().default("none"), // "none" | "pending" | "approved" | "rejected"
  adminKycSubmittedAt: timestamp("admin_kyc_submitted_at"),
  adminKycReviewedAt: timestamp("admin_kyc_reviewed_at"),
  adminKycReviewerNotes: text("admin_kyc_reviewer_notes"),
  // Phase 4 — ops suspension. When set, the user cannot log in (OTP verify
  // returns suspended), and admin actions on their groups are blocked.
  suspendedAt: timestamp("suspended_at"),
  suspendedReason: text("suspended_reason"),
  suspendedBy: varchar("suspended_by"), // userId of the ops actor
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// The 3 group categories that drive routing, dashboards and reports.
//   ajo         - rotating cycle savings (Esusu), members take turns receiving the pot
//   association - recurring dues / one-off levies, money goes to the association
//   project     - goal-based collection (weddings, gifts, fundraisers) — current default
export const GROUP_TYPES = ["ajo", "association", "project"] as const;
export type GroupType = (typeof GROUP_TYPES)[number];

export const groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  // Discriminator — see GROUP_TYPES above. Existing groups default to 'project'.
  groupType: text("group_type").notNull().default("project"),
  whatsappLink: text("whatsapp_link"),
  registrationLink: text("registration_link").notNull().unique(),
  customSlug: text("custom_slug").unique(), // For kontrib.app/customslug URLs
  status: text("status").notNull().default("active"), // "active", "completed", "paused"
  privacyMode: text("privacy_mode").notNull().default("standard"), // "standard" or "private" (Ajo mode)
  adminId: varchar("admin_id").notNull().references(() => users.id),
  coAdmins: text("co_admins").array().default(sql`'{}'::text[]`), // Up to 2 co-admin user IDs
  // Verified Ajo locality (set during application)
  state: text("state"),
  lga: text("lga"),
  // Verified Ajo status (granted by Kontrib team review)
  verifiedAt: timestamp("verified_at"),
  verificationExpiresAt: timestamp("verification_expires_at"), // 12 months after verifiedAt
  publiclyListed: boolean("publicly_listed").notNull().default(true), // Default-on after verification, admin can opt out
  publicListingDecisionAt: timestamp("public_listing_decision_at"), // When admin acknowledged the post-approval public-listing prompt
  // Phase 3B — group enrichment.
  // Optional logo (mainly for associations) shown on group cards / status panels.
  logoUrl: text("logo_url"),
  // Group T&C config: 'kontrib' = use the platform's generic terms; 'custom' = admin uploaded their own PDF.
  // null = not yet configured; for Ajo groups, must be set before activation.
  tcMode: text("tc_mode"), // "kontrib" | "custom" | null
  customTcUrl: text("custom_tc_url"), // PDF URL when tcMode='custom'
  customTcIndemnityAcceptedAt: timestamp("custom_tc_indemnity_accepted_at"), // When admin accepted Kontrib's indemnity statement for custom T&C
  // Phase 4 — Kontrib ops moderates admin-uploaded custom T&C PDFs.
  // Set to 'pending' on upload, then 'approved' or 'rejected' by ops.
  // Rejected groups surface a banner asking the admin to upload a new PDF.
  customTcStatus: text("custom_tc_status"), // null | 'pending' | 'approved' | 'rejected'
  customTcReviewNote: text("custom_tc_review_note"),
  customTcReviewedAt: timestamp("custom_tc_reviewed_at"),
  customTcReviewedBy: varchar("custom_tc_reviewed_by"),
  // Phase 4 — ops suspension (mirrors users.suspendedAt). Suspended groups
  // cannot accept new joins and surface a banner to existing members.
  suspendedAt: timestamp("suspended_at"),
  suspendedReason: text("suspended_reason"),
  suspendedBy: varchar("suspended_by"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Verification application — one row per group's apply attempt
export const verificationApplications = pgTable("verification_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id),
  submittedBy: varchar("submitted_by").notNull().references(() => users.id), // Admin who applied
  status: text("status").notNull().default("draft"), // "draft" | "submitted" | "under_review" | "info_requested" | "approved" | "rejected"
  // Snapshot of the locality at submission
  state: text("state"),
  lga: text("lga"),
  reviewerId: varchar("reviewer_id").references(() => users.id),
  reviewerNotes: text("reviewer_notes"),
  submittedAt: timestamp("submitted_at"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// 3 officers per application (admin + 2 nominees)
export const verificationOfficers = pgTable("verification_officers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => verificationApplications.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: text("role").notNull(), // "admin" | "officer"
  status: text("status").notNull().default("pending"), // "pending" | "accepted" | "declined"
  legalName: text("legal_name"), // Captured at acceptance time
  selfieUrl: text("selfie_url"), // Captured at acceptance time
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Up to N peer attesters per application
export const verificationAttestations = pgTable("verification_attestations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => verificationApplications.id),
  attesterId: varchar("attester_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"), // "pending" | "vouched" | "declined"
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type VerificationApplication = typeof verificationApplications.$inferSelect;
export type VerificationOfficer = typeof verificationOfficers.$inferSelect;
export type VerificationAttestation = typeof verificationAttestations.$inferSelect;

// Payload for an admin submitting a verification application
export const submitVerificationSchema = z.object({
  submittedBy: z.string().min(1),
  state: z.string().min(2, "State is required"),
  lga: z.string().min(2, "LGA is required"),
  adminLegalName: z.string().min(2, "Your legal name is required"),
  adminSelfie: z.string().min(20, "A selfie is required"),
  officerNominees: z.array(z.string().min(1)).length(2, "Nominate exactly 2 co-officers"),
  attesters: z.array(z.string().min(1)).min(5, "Pick at least 5 Kontrib member attesters"),
});
export type SubmitVerificationPayload = z.infer<typeof submitVerificationSchema>;

// Officer accept/decline payload
export const officerResponseSchema = z.discriminatedUnion("action", [
  z.object({
    userId: z.string().min(1),
    action: z.literal("accept"),
    legalName: z.string().min(2, "Enter your legal name"),
    selfie: z.string().min(20, "Selfie is required"), // data: URL or stored URL
  }),
  z.object({
    userId: z.string().min(1),
    action: z.literal("decline"),
  }),
]);
export type OfficerResponsePayload = z.infer<typeof officerResponseSchema>;

// Attester vouch/decline payload
export const attesterResponseSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(["vouch", "decline"]),
});
export type AttesterResponsePayload = z.infer<typeof attesterResponseSchema>;

// Pending verification invites returned to a logged-in user
export type PendingOfficerInvite = {
  applicationId: string; group: { id: string; name: string }; role: "admin" | "officer"; createdAt: Date;
};
export type PendingAttesterInvite = {
  applicationId: string; group: { id: string; name: string }; admin: { id: string; fullName: string | null }; createdAt: Date;
};
export type VerificationInbox = {
  officerInvites: PendingOfficerInvite[];
  attesterInvites: PendingAttesterInvite[];
};

// Verification status returned to the group detail banner
export type VerificationOfficerWithUser = VerificationOfficer & { user: User };
export type VerificationAttestationWithUser = VerificationAttestation & { attester: User };
export type VerificationApplicationDetailed = VerificationApplication & {
  officers: VerificationOfficerWithUser[];
  attestations: VerificationAttestationWithUser[];
};
export type VerificationStatus = {
  group: { id: string; name: string; state: string | null; lga: string | null;
    verifiedAt: Date | null; verificationExpiresAt: Date | null; publiclyListed: boolean;
    publicListingDecisionAt: Date | null };
  eligibility: {
    eligible: boolean;
    ageDays: number;
    activeMemberCount: number;
    completedCycleCount: number;
    requirements: { ageOk: boolean; membersOk: boolean; cycleOk: boolean };
  };
  application: VerificationApplicationDetailed | null;
};

export const groupMembers = pgTable("group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  contributedAmount: decimal("contributed_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("active"), // "active", "pending", "inactive"
  joinedAt: timestamp("joined_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  // Verified Ajo: identity-light info captured at join time when the group is verified
  joinerLegalName: text("joiner_legal_name"),
  joinerSelfieDataUrl: text("joiner_selfie_data_url"),
  // Phase 3B — T&C acceptance snapshot. Members who joined before T&C were
  // configured will have null values here; they're grandfathered. Only NEW
  // joiners after the group has tcMode set must accept.
  tcAcceptedAt: timestamp("tc_accepted_at"),
  tcModeAtAcceptance: text("tc_mode_at_acceptance"),  // "kontrib" | "custom"
  tcUrlAtAcceptance: text("tc_url_at_acceptance"),    // Snapshot of customTcUrl when applicable
});

// One row per Ajo group. Holds the cycle config (amount, frequency, payout
// order) and the running pointer to the active cycle. Created by the admin
// once they're ready to start the rotation.
export const AJO_FREQUENCIES = ["weekly", "biweekly", "monthly"] as const;
export type AjoFrequency = (typeof AJO_FREQUENCIES)[number];

export const ajoSettings = pgTable("ajo_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().unique().references(() => groups.id),
  contributionAmount: decimal("contribution_amount", { precision: 15, scale: 2 }).notNull(),
  frequency: text("frequency").notNull(), // weekly | biweekly | monthly
  payoutOrder: text("payout_order").array().notNull().default(sql`'{}'::text[]`), // ordered userIds
  startDate: timestamp("start_date").notNull(),
  totalRounds: integer("total_rounds").notNull(),       // Equals payoutOrder.length when set up
  currentCycleNumber: integer("current_cycle_number").notNull().default(1),
  status: text("status").notNull().default("active"),   // "active" | "completed"
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// One row per association group. Recurring dues schedule; each period is
// materialised as a project (projectType='association_dues') so the existing
// contribution/approval/disbursement flow is reused.
export const associationSettings = pgTable("association_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().unique().references(() => groups.id),
  duesAmount: decimal("dues_amount", { precision: 15, scale: 2 }).notNull(),
  duesFrequency: text("dues_frequency").notNull(),         // monthly | quarterly | yearly
  startDate: timestamp("start_date").notNull(),
  currentPeriodNumber: integer("current_period_number").notNull().default(1),
  status: text("status").notNull().default("active"),      // "active" | "paused"
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id),
  name: text("name").notNull(),
  description: text("description"),
  projectType: text("project_type").notNull().default("target"), // "target", "monthly", "yearly", "event", "emergency", "ajo_cycle", "association_dues", "association_levy"
  currency: text("currency").notNull().default("NGN"), // "NGN", "USD", "EUR"
  targetAmount: decimal("target_amount", { precision: 15, scale: 2 }), // Optional for monthly/yearly types
  collectedAmount: decimal("collected_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  customSlug: text("custom_slug").unique(), // For kontrib.app/groupname/pursename URLs
  deadline: timestamp("deadline"),
  status: text("status").notNull().default("active"), // "active", "completed", "paused"
  // Ajo cycle metadata — populated only when projectType === 'ajo_cycle'.
  cycleNumber: integer("cycle_number"),                                  // 1-indexed within the round
  recipientUserId: varchar("recipient_user_id").references(() => users.id), // Member who receives this cycle's pot
  payoutAt: timestamp("payout_at"),                                      // When the admin marked the pot disbursed
  // Custom OG image for link previews (stored in object storage)
  ogImage: text("og_image"), // URL to custom OG image in object storage
  // Account details for contributions
  accountName: text("account_name"),
  accountNumber: text("account_number"),
  bankName: text("bank_name"),
  routingNumber: text("routing_number"), // For US banks
  swiftCode: text("swift_code"), // For international transfers
  // Alternative payment methods
  zelleEmail: text("zelle_email"),
  zellePhone: text("zelle_phone"),
  cashappHandle: text("cashapp_handle"),
  venmoHandle: text("venmo_handle"),
  paypalEmail: text("paypal_email"),
  // Payment instructions and preferred methods
  paymentInstructions: text("payment_instructions"),
  allowedPaymentTypes: text("allowed_payment_types"), // JSON array of allowed payment types
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const disbursements = pgTable("disbursements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  groupId: varchar("group_id").notNull().references(() => groups.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  recipient: text("recipient").notNull(),
  recipientUserId: varchar("recipient_user_id").references(() => users.id), // Set if recipient is a group member
  purpose: text("purpose").notNull(),
  disbursementDate: timestamp("disbursement_date").notNull(),
  receipt: text("receipt"), // Base64 encoded receipt image
  memberConfirmed: boolean("member_confirmed").notNull().default(false), // Member confirmed receipt
  memberConfirmedAt: timestamp("member_confirmed_at"), // When member confirmed
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertDisbursementSchema = createInsertSchema(disbursements).omit({ id: true, createdAt: true, memberConfirmed: true, memberConfirmedAt: true });
export type InsertDisbursement = z.infer<typeof insertDisbursementSchema>;
export type Disbursement = typeof disbursements.$inferSelect;

export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull().references(() => users.id),
  refereeId: varchar("referee_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"), // "pending" | "complete"
  rewardAmount: decimal("reward_amount", { precision: 10, scale: 2 }).notNull().default("20000"),
  triggerGroupId: varchar("trigger_group_id").references(() => groups.id),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: timestamp("completed_at"),
  // Phase 4 — ops-recorded payout. paidAt set when ops marks the reward sent;
  // paidBy is the ops actor's userId (or 'ops' if no actor identity).
  paidAt: timestamp("paid_at"),
  paidBy: varchar("paid_by"),
});

export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true, createdAt: true, completedAt: true, paidAt: true, paidBy: true });
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

export const accountabilityPartners = pgTable("accountability_partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  assignedAt: timestamp("assigned_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const contributions = pgTable("contributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id),
  projectId: varchar("project_id").references(() => projects.id), // Optional: contribution can be for specific project
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"), // "confirmed", "pending", "failed"
  transactionRef: text("transaction_ref"),
  proofOfPayment: text("proof_of_payment"), // Base64 encoded image or file path
  paymentType: text("payment_type").notNull(), // "bank_transfer", "zelle", "cashapp", "venmo", "paypal", "wire_transfer"
  paymentNotes: text("payment_notes"), // Additional notes about the payment method used
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const otpVerifications = pgTable("otp_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phoneNumber: text("phone_number").notNull(),
  otp: text("otp").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").notNull().default(false),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const deviceTokens = pgTable("device_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  deviceInfo: text("device_info"),
  lastUsed: timestamp("last_used").notNull().default(sql`CURRENT_TIMESTAMP`),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  profileCompletedAt: true,
  referralCode: true,
  referredBy: true,
  createdAt: true,
});

// Schema for instant login - just phone number
export const instantLoginSchema = z.object({
  phoneNumber: z.string().min(10, "Please enter a valid phone number"),
});

// Schema for updating profile after onboarding
export const updateProfileSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name"),
  role: z.enum(["admin", "member"]).optional(),
});

export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  registrationLink: true,
  customSlug: true,
  adminId: true,
  createdAt: true,
}).extend({
  groupType: z.enum(GROUP_TYPES).default("project"),
});

// ---- Phase 3B: Admin KYC + group T&C/logo + member acceptance -----------

export const ADMIN_KYC_STATUSES = ["none", "pending", "approved", "rejected"] as const;
export type AdminKycStatus = (typeof ADMIN_KYC_STATUSES)[number];

export const TC_MODES = ["kontrib", "custom"] as const;
export type TcMode = (typeof TC_MODES)[number];

// Payload an admin POSTs from the AdminKycModal.
export const submitAdminKycSchema = z.object({
  govNameOnId: z.string().min(2, "Enter your name as it appears on your ID"),
  profilePhotoUrl: z.string().min(1, "Profile photo is required"),
  idDocUrl: z.string().min(1, "ID document is required"),
  kycSelfieUrl: z.string().min(1, "Selfie is required"),
});
export type SubmitAdminKycPayload = z.infer<typeof submitAdminKycSchema>;

// Payload a Kontrib super-admin POSTs to approve/reject.
export const reviewAdminKycSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reviewerNotes: z.string().optional().nullable(),
});
export type ReviewAdminKycPayload = z.infer<typeof reviewAdminKycSchema>;

// Payload to set group T&C config.
export const setGroupTermsSchema = z.discriminatedUnion("tcMode", [
  z.object({ tcMode: z.literal("kontrib") }),
  z.object({
    tcMode: z.literal("custom"),
    customTcUrl: z.string().min(1, "Upload your T&C PDF first"),
    indemnityAccepted: z.literal(true, {
      errorMap: () => ({ message: "You must accept the indemnity statement to use a custom T&C" }),
    }),
  }),
]);
export type SetGroupTermsPayload = z.infer<typeof setGroupTermsSchema>;

// Payload to set group logo.
export const setGroupLogoSchema = z.object({
  logoUrl: z.string().min(1, "Logo URL is required"),
});
export type SetGroupLogoPayload = z.infer<typeof setGroupLogoSchema>;

// Payload a member POSTs when accepting the group T&C before joining.
export const acceptGroupTermsSchema = z.object({}); // userId comes from auth/header; group from URL
export type AcceptGroupTermsPayload = z.infer<typeof acceptGroupTermsSchema>;

// Public T&C view returned to the join page.
export type GroupTermsView = {
  groupId: string;
  groupName: string;
  tcMode: TcMode | null;
  customTcUrl: string | null;
  alreadyAccepted: boolean; // true if the requesting userId has accepted
};

// Admin-KYC summary returned to the user themselves.
export type AdminKycView = {
  userId: string;
  govNameOnId: string | null;
  profilePhotoUrl: string | null;
  idDocUrl: string | null;
  kycSelfieUrl: string | null;
  status: AdminKycStatus;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewerNotes: string | null;
};

// Admin-KYC entry returned to the Kontrib super-admin review page.
export type AdminKycPendingEntry = AdminKycView & {
  user: { id: string; fullName: string | null; phoneNumber: string };
};

export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({
  id: true,
  contributedAmount: true,
  status: true,
  joinedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  collectedAmount: true,
  customSlug: true,
  createdAt: true,
}).extend({
  projectType: z.enum(["target", "monthly", "yearly", "event", "emergency"]).default("target"),
  currency: z.enum(["NGN", "USD", "EUR"]).default("NGN"),
  targetAmount: z.string().optional().nullable(), // Optional for monthly/yearly types
  deadline: z.string().optional().or(z.date().optional()),
  allowedPaymentTypes: z.string().optional(), // JSON string of payment types
});

export const insertAccountabilityPartnerSchema = createInsertSchema(accountabilityPartners).omit({
  id: true,
  assignedAt: true,
});

// Push subscriptions for web push notifications
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true, createdAt: true });
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id), // Who should receive the notification
  type: text("type").notNull(), // "payment_submitted", "payment_confirmed", etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  contributionId: varchar("contribution_id").references(() => contributions.id),
  projectId: varchar("project_id").references(() => projects.id),
  disbursementId: varchar("disbursement_id").references(() => disbursements.id),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertContributionSchema = createInsertSchema(contributions).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  read: true,
  createdAt: true,
});

export const insertOtpVerificationSchema = createInsertSchema(otpVerifications).omit({
  id: true,
  verified: true,
  attempts: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type GroupMember = typeof groupMembers.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type AccountabilityPartner = typeof accountabilityPartners.$inferSelect;
export type Contribution = typeof contributions.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertAccountabilityPartner = z.infer<typeof insertAccountabilityPartnerSchema>;
export type InsertContribution = z.infer<typeof insertContributionSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type OtpVerification = typeof otpVerifications.$inferSelect;
export type InsertOtpVerification = z.infer<typeof insertOtpVerificationSchema>;
export type InstantLogin = z.infer<typeof instantLoginSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type DeviceToken = typeof deviceTokens.$inferSelect;

// Extended types for UI
export type GroupWithStats = Group & {
  memberCount: number;
  projectCount: number;
  completionRate: number;
  pendingPayments: number;
  totalCollected: number;
};

export type MemberWithContributions = User & {
  totalContributions: string;
  groupCount: number;
  status: string;
};

export type ProjectWithStats = Project & {
  contributionCount: number;
  completionRate: number;
};

export type ContributionWithDetails = Contribution & {
  userName: string;
  groupName: string;
  projectName?: string;
};

export type AccountabilityPartnerWithDetails = AccountabilityPartner & {
  userName: string;
  userFullName: string;
};

export type GroupWithRole = GroupWithStats & {
  role: 'admin' | 'member' | 'both';
  pendingApprovals?: number;
  myPendingPayments?: number;
};

// ---- Ajo cycles -----------------------------------------------------------

export type AjoSettings = typeof ajoSettings.$inferSelect;

export const insertAjoSettingsSchema = createInsertSchema(ajoSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAjoSettings = z.infer<typeof insertAjoSettingsSchema>;

// Payload the admin POSTs from the setup wizard. We compute totalRounds and
// startDate handling on the server, so the client just sends the essentials.
export const createAjoSettingsSchema = z.object({
  contributionAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount"),
  frequency: z.enum(AJO_FREQUENCIES),
  payoutOrder: z.array(z.string().min(1)).min(2, "Need at least 2 members in the payout order"),
  startDate: z.string().min(1, "Pick a start date"), // ISO date
});
export type CreateAjoSettingsPayload = z.infer<typeof createAjoSettingsSchema>;

// Detailed view returned to the group page — settings + the active cycle
// project (if any) + a payment roll-up for that cycle.
export type AjoCycleProject = Project & {
  recipient: User | null;
};
export type AjoStatus = {
  settings: AjoSettings;
  currentCycle: AjoCycleProject | null;
  paidCount: number;     // Members who've contributed to the current cycle (confirmed)
  expectedCount: number; // payoutOrder.length
};

// ---- Association dues + levies -------------------------------------------

export const ASSOCIATION_FREQUENCIES = ["monthly", "quarterly", "yearly"] as const;
export type AssociationFrequency = (typeof ASSOCIATION_FREQUENCIES)[number];

export type AssociationSettings = typeof associationSettings.$inferSelect;

export const insertAssociationSettingsSchema = createInsertSchema(associationSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAssociationSettings = z.infer<typeof insertAssociationSettingsSchema>;

// Payload the admin POSTs from the setup wizard.
export const createAssociationSettingsSchema = z.object({
  duesAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount"),
  duesFrequency: z.enum(ASSOCIATION_FREQUENCIES),
  startDate: z.string().min(1, "Pick a start date"), // ISO date
});
export type CreateAssociationSettingsPayload = z.infer<typeof createAssociationSettingsSchema>;

// Payload for adding a one-off levy.
export const createAssociationLevySchema = z.object({
  name: z.string().min(2, "Give the levy a short name"),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount"),
  deadline: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  currency: z.string().optional(),
});
export type CreateAssociationLevyPayload = z.infer<typeof createAssociationLevySchema>;

// Detailed view returned to the group page — settings + active dues period
// + all levies + roll-ups.
export type AssociationStatus = {
  settings: AssociationSettings;
  currentPeriod: Project | null;       // The active dues period project
  paidCount: number;                   // Members who've contributed to the period (confirmed)
  expectedCount: number;               // Active group members
  levies: Project[];                   // All association_levy projects, newest first
};
