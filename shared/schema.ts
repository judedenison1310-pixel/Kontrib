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
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  whatsappLink: text("whatsapp_link"),
  registrationLink: text("registration_link").notNull().unique(),
  customSlug: text("custom_slug").unique(), // For kontrib.app/customslug URLs
  status: text("status").notNull().default("active"), // "active", "completed", "paused"
  adminId: varchar("admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const groupMembers = pgTable("group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  contributedAmount: decimal("contributed_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("active"), // "active", "pending", "inactive"
  joinedAt: timestamp("joined_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id),
  name: text("name").notNull(),
  description: text("description"),
  projectType: text("project_type").notNull().default("target"), // "target", "monthly", "yearly", "event", "emergency"
  currency: text("currency").notNull().default("NGN"), // "NGN", "USD", "EUR"
  targetAmount: decimal("target_amount", { precision: 15, scale: 2 }), // Optional for monthly/yearly types
  collectedAmount: decimal("collected_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  customSlug: text("custom_slug").unique(), // For kontrib.app/groupname/pursename URLs
  deadline: timestamp("deadline"),
  status: text("status").notNull().default("active"), // "active", "completed", "paused"
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
});

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

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id), // Who should receive the notification
  type: text("type").notNull(), // "payment_submitted", "payment_confirmed", etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  contributionId: varchar("contribution_id").references(() => contributions.id),
  projectId: varchar("project_id").references(() => projects.id),
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
