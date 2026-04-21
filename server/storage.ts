import { 
  type User, 
  type Group, 
  type GroupMember, 
  type Project,
  type AccountabilityPartner,
  type Contribution,
  type Disbursement,
  type InsertDisbursement,
  type Referral,
  type InsertReferral,
  type Notification,
  type OtpVerification,
  type DeviceToken,
  type PushSubscription,
  type InsertPushSubscription,
  type InsertUser, 
  type InsertGroup, 
  type InsertGroupMember, 
  type InsertProject,
  type InsertAccountabilityPartner,
  type InsertContribution,
  type InsertNotification,
  type InsertOtpVerification,
  type GroupWithStats,
  type GroupWithRole,
  type MemberWithContributions,
  type ContributionWithDetails,
  type ProjectWithStats,
  type AccountabilityPartnerWithDetails,
  type VerificationStatus,
  type SubmitVerificationPayload,
  type VerificationInbox,
  type OfficerResponsePayload,
  type AttesterResponsePayload,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined>;
  findOrCreateUserByPhone(phoneNumber: string): Promise<User>;
  updateUserProfile(userId: string, updates: { fullName?: string; role?: string }): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Group methods
  getGroup(id: string): Promise<Group | undefined>;
  getGroupByRegistrationLink(link: string): Promise<Group | undefined>;
  getGroupByCustomSlug(slug: string): Promise<Group | undefined>;
  getGroupsByAdmin(adminId: string): Promise<GroupWithStats[]>;
  getAllUserGroups(userId: string): Promise<GroupWithRole[]>;
  createGroup(group: InsertGroup, adminId: string): Promise<Group>;
  updateGroup(id: string, updates: Partial<Group>): Promise<Group | undefined>;
  deleteGroup(id: string): Promise<boolean>;
  
  // Group member methods
  getGroupMembers(groupId: string): Promise<(GroupMember & { user: User })[]>;
  getUserGroups(userId: string): Promise<(GroupMember & { group: Group })[]>;
  addGroupMember(member: InsertGroupMember): Promise<GroupMember>;
  getGroupMember(groupId: string, userId: string): Promise<GroupMember | undefined>;
  removeGroupMember(memberId: string): Promise<boolean>;
  
  // Project methods
  getProjectsByGroup(groupId: string): Promise<ProjectWithStats[]>;
  getProject(id: string): Promise<Project | undefined>;
  getProjectByCustomSlug(customSlug: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  
  // Accountability Partner methods
  getGroupAccountabilityPartners(groupId: string): Promise<AccountabilityPartnerWithDetails[]>;
  addAccountabilityPartner(partner: InsertAccountabilityPartner): Promise<AccountabilityPartner>;
  removeAccountabilityPartner(groupId: string, userId: string): Promise<boolean>;

  // Contribution methods
  getGroupContributions(groupId: string): Promise<ContributionWithDetails[]>;
  getProjectContributions(projectId: string): Promise<ContributionWithDetails[]>;
  createContribution(contribution: InsertContribution): Promise<Contribution>;
  confirmContribution(contributionId: string): Promise<Contribution | undefined>;
  
  // Notification methods
  getUserNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  createRejectionNotification(contribution: Contribution, reason?: string): Promise<void>;
  markNotificationRead(notificationId: string): Promise<void>;
  deleteNotification(notificationId: string): Promise<void>;
  
  getContribution(id: string): Promise<Contribution | undefined>;
  getUserContributions(userId: string): Promise<ContributionWithDetails[]>;
  getAdminContributions(adminId: string): Promise<ContributionWithDetails[]>;
  updateContribution(id: string, updates: Partial<Contribution>): Promise<Contribution | undefined>;
  deleteContribution(id: string): Promise<void>;

  // Disbursement methods
  getDisbursementsByProject(projectId: string): Promise<Disbursement[]>;
  getDisbursement(id: string): Promise<Disbursement | undefined>;
  createDisbursement(disbursement: InsertDisbursement): Promise<Disbursement>;
  deleteDisbursement(id: string): Promise<boolean>;
  confirmDisbursement(id: string): Promise<Disbursement | undefined>;

  // Referral methods
  getOrCreateReferralCode(userId: string): Promise<string>;
  getUserByReferralCode(code: string): Promise<User | undefined>;
  createReferral(referrerId: string, refereeId: string): Promise<Referral>;
  getReferralByReferee(refereeId: string): Promise<Referral | undefined>;
  getReferralsByReferrer(referrerId: string): Promise<(Referral & { referee: User })[]>;
  checkAndCompleteReferrals(groupId: string): Promise<void>;

  // Ops overview
  getOpsOverview(): Promise<{
    referrals: (Referral & { referrer: User; referee: User })[];
    contributions: ContributionWithDetails[];
    stats: { totalUsers: number; totalReferrals: number; completedReferrals: number; pendingReferrals: number; totalRewardsOwed: number; totalPaymentProofs: number; pendingProofs: number; };
  }>;
  
  // Stats methods
  getUserStats(userId: string): Promise<MemberWithContributions>;
  getAdminStats(adminId: string): Promise<{
    totalCollections: string;
    activeMembers: number;
    pendingPayments: number;
    completionRate: number;
  }>;
  
  // OTP Verification methods
  sendOtp(phoneNumber: string): Promise<{ code: string; expiresAt: string }>;
  createOtpVerification(otp: InsertOtpVerification): Promise<OtpVerification>;
  getActiveOtpVerification(phoneNumber: string): Promise<OtpVerification | undefined>;
  verifyOtp(phoneNumber: string, otp: string): Promise<boolean>;
  cleanupExpiredOtps(): Promise<void>;
  
  // Device Token methods (for remember device)
  createDeviceToken(userId: string, deviceInfo?: string): Promise<string>;
  validateDeviceToken(token: string): Promise<User | null>;
  removeDeviceToken(token: string): Promise<boolean>;

  // Push subscription methods
  savePushSubscription(sub: InsertPushSubscription): Promise<PushSubscription>;
  getUserPushSubscriptions(userId: string): Promise<PushSubscription[]>;
  deletePushSubscription(endpoint: string): Promise<void>;

  // Verified Ajo
  getVerificationStatus(groupId: string): Promise<VerificationStatus | null>;
  applyForVerification(groupId: string, payload: SubmitVerificationPayload): Promise<VerificationStatus>;
  getVerificationInbox(userId: string): Promise<VerificationInbox>;
  respondAsOfficer(applicationId: string, payload: OfficerResponsePayload): Promise<void>;
  respondAsAttester(applicationId: string, payload: AttesterResponsePayload): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private groups: Map<string, Group>;
  private groupMembers: Map<string, GroupMember>;
  private projects: Map<string, Project>;
  private accountabilityPartners: Map<string, AccountabilityPartner>;
  private contributions: Map<string, Contribution>;
  private notifications: Map<string, Notification>;
  private otpVerifications: Map<string, OtpVerification>;
  private deviceTokens: Map<string, DeviceToken>;

  constructor() {
    this.users = new Map();
    this.groups = new Map();
    this.groupMembers = new Map();
    this.projects = new Map();
    this.accountabilityPartners = new Map();
    this.contributions = new Map();
    this.notifications = new Map();
    this.otpVerifications = new Map();
    this.deviceTokens = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.phoneNumber === phoneNumber);
  }

  async findOrCreateUserByPhone(phoneNumber: string): Promise<User> {
    const existingUser = await this.getUserByPhoneNumber(phoneNumber);
    if (existingUser) {
      return existingUser;
    }
    
    const id = randomUUID();
    const user: User = {
      id,
      username: null,
      password: null,
      fullName: null,
      phoneNumber,
      role: "member",
      profileCompletedAt: null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserProfile(userId: string, updates: { fullName?: string; role?: string }): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    // Validate role at storage layer as extra safety
    const validRoles = ['admin', 'member'];
    const validatedRole = updates.role && validRoles.includes(updates.role) ? updates.role : user.role;
    
    const updatedUser: User = {
      ...user,
      fullName: updates.fullName ?? user.fullName,
      role: validatedRole,
      profileCompletedAt: updates.fullName ? new Date() : user.profileCompletedAt,
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      role: insertUser.role || "member"
    };
    this.users.set(id, user);
    return user;
  }

  async getGroup(id: string): Promise<Group | undefined> {
    return this.groups.get(id);
  }

  async getGroupByRegistrationLink(link: string): Promise<Group | undefined> {
    return Array.from(this.groups.values()).find(group => group.registrationLink === link);
  }

  async getGroupByCustomSlug(slug: string): Promise<Group | undefined> {
    return Array.from(this.groups.values()).find(group => group.customSlug === slug);
  }

  async getGroupsByAdmin(adminId: string): Promise<GroupWithStats[]> {
    const adminGroups = Array.from(this.groups.values()).filter(group => group.adminId === adminId);
    
    return adminGroups.map(group => {
      const members = Array.from(this.groupMembers.values()).filter(member => member.groupId === group.id);
      const memberCount = members.length;
      
      // Calculate stats based on projects instead of group target
      const groupProjects = Array.from(this.projects.values()).filter(project => project.groupId === group.id);
      const totalProjectTarget = groupProjects.reduce((sum, project) => sum + Number(project.targetAmount), 0);
      const totalProjectCollected = groupProjects.reduce((sum, project) => sum + Number(project.collectedAmount), 0);
      
      const completionRate = totalProjectTarget > 0 ? 
        Math.round((totalProjectCollected / totalProjectTarget) * 100) : 0;
      
      const pendingPayments = 0; // Will be calculated based on project contributions

      return {
        ...group,
        memberCount,
        projectCount: groupProjects.length,
        completionRate,
        pendingPayments,
        totalCollected: totalProjectCollected,
      };
    });
  }

  async getAllUserGroups(userId: string): Promise<GroupWithRole[]> {
    const groupMap = new Map<string, GroupWithRole>();
    
    // Get groups where user is admin
    const adminGroups = Array.from(this.groups.values()).filter(group => group.adminId === userId);
    
    for (const group of adminGroups) {
      const members = Array.from(this.groupMembers.values()).filter(m => m.groupId === group.id);
      const groupProjects = Array.from(this.projects.values()).filter(p => p.groupId === group.id);
      const totalTarget = groupProjects.reduce((sum, p) => sum + Number(p.targetAmount || 0), 0);
      const totalCollected = groupProjects.reduce((sum, p) => sum + Number(p.collectedAmount || 0), 0);
      const completionRate = totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 0;
      
      // Count pending approvals for admin
      const pendingApprovals = Array.from(this.contributions.values())
        .filter(c => c.groupId === group.id && c.status === "pending").length;
      
      groupMap.set(group.id, {
        ...group,
        memberCount: members.length,
        projectCount: groupProjects.length,
        completionRate,
        pendingPayments: 0,
        totalCollected,
        role: 'admin',
        pendingApprovals,
      });
    }
    
    // Get groups where user is member
    const memberships = Array.from(this.groupMembers.values()).filter(m => m.userId === userId);
    
    for (const membership of memberships) {
      const group = this.groups.get(membership.groupId);
      if (!group) continue;
      
      const members = Array.from(this.groupMembers.values()).filter(m => m.groupId === group.id);
      const groupProjects = Array.from(this.projects.values()).filter(p => p.groupId === group.id);
      const totalTarget = groupProjects.reduce((sum, p) => sum + Number(p.targetAmount || 0), 0);
      const totalCollected = groupProjects.reduce((sum, p) => sum + Number(p.collectedAmount || 0), 0);
      const completionRate = totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 0;
      
      // Count my pending payments in this group
      const myPendingPayments = Array.from(this.contributions.values())
        .filter(c => c.groupId === group.id && c.userId === userId && c.status === "pending").length;
      
      const existing = groupMap.get(group.id);
      if (existing) {
        // User is both admin and member
        existing.role = 'both';
        existing.myPendingPayments = myPendingPayments;
      } else {
        groupMap.set(group.id, {
          ...group,
          memberCount: members.length,
          projectCount: groupProjects.length,
          completionRate,
          pendingPayments: 0,
          totalCollected,
          role: 'member',
          myPendingPayments,
        });
      }
    }
    
    return Array.from(groupMap.values());
  }

  async createGroup(insertGroup: InsertGroup, adminId: string): Promise<Group> {
    const id = randomUUID();
    
    // Create user-friendly registration code from group name
    const baseCode = insertGroup.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '') // Remove spaces
      .substring(0, 15); // Limit length
    
    // Add year to make it unique and memorable
    const currentYear = new Date().getFullYear();
    const registrationLink = `${baseCode}${currentYear}`;
    
    // Create custom URL slug from group name (keep existing logic)
    const groupSlug = baseCode;

    // Auto-generate WhatsApp sharing link with new format
    let whatsappLink = insertGroup.whatsappLink;
    if (!whatsappLink) {
      const joinLink = `kontrib.app/join/${groupSlug}`;
      const message = `${joinLink}\n\nYou have been invited to join ${insertGroup.name} on Kontrib!\n\nLogin to submit your contributions\n\nLet's keep it transparent\n\nKontrib.app`;
      whatsappLink = `https://wa.me/?text=${encodeURIComponent(message)}`;
    }
    
    const group: Group = {
      ...insertGroup,
      id,
      description: insertGroup.description || null,
      registrationLink,
      customSlug: groupSlug,
      status: "active",
      adminId,
      coAdmins: [],
      createdAt: new Date(),
      whatsappLink,
    };
    this.groups.set(id, group);
    
    // Automatically add admin as first group member
    await this.addGroupMember({
      groupId: id,
      userId: adminId,
    });
    
    return group;
  }

  async updateGroup(id: string, updates: Partial<Group>): Promise<Group | undefined> {
    const group = this.groups.get(id);
    if (!group) return undefined;
    
    const updatedGroup = { ...group, ...updates };
    this.groups.set(id, updatedGroup);
    return updatedGroup;
  }

  async deleteGroup(id: string): Promise<boolean> {
    if (!this.groups.has(id)) return false;
    // Cascade: remove all related data
    for (const [mid, m] of this.groupMembers) { if (m.groupId === id) this.groupMembers.delete(mid); }
    for (const [pid, p] of this.projects) { if (p.groupId === id) this.projects.delete(pid); }
    for (const [cid, c] of this.contributions) { if (c.groupId === id) this.contributions.delete(cid); }
    for (const [aid, a] of this.accountabilityPartners) { if (a.groupId === id) this.accountabilityPartners.delete(aid); }
    for (const [did, d] of this.disbursementsMap) { if (d.groupId === id) this.disbursementsMap.delete(did); }
    this.groups.delete(id);
    return true;
  }

  async getGroupMembers(groupId: string): Promise<(GroupMember & { user: User })[]> {
    const members = Array.from(this.groupMembers.values()).filter(member => member.groupId === groupId);
    return members.map(member => {
      const user = this.users.get(member.userId)!;
      return { ...member, user };
    });
  }

  async getUserGroups(userId: string): Promise<(GroupMember & { group: GroupWithStats })[]> {
    const memberships = Array.from(this.groupMembers.values()).filter(member => member.userId === userId);
    return memberships.map(membership => {
      const group = this.groups.get(membership.groupId)!;
      
      // Calculate stats for the group
      const members = Array.from(this.groupMembers.values()).filter(member => member.groupId === group.id);
      const memberCount = members.length;
      
      const groupProjects = Array.from(this.projects.values()).filter(project => project.groupId === group.id);
      const projectCount = groupProjects.length;
      
      const totalProjectTarget = groupProjects.reduce((sum, project) => sum + Number(project.targetAmount), 0);
      const totalProjectCollected = groupProjects.reduce((sum, project) => sum + Number(project.collectedAmount), 0);
      
      const completionRate = totalProjectTarget > 0 ? 
        Math.round((totalProjectCollected / totalProjectTarget) * 100) : 0;
      
      const pendingPayments = Array.from(this.contributions.values())
        .filter(contrib => contrib.groupId === group.id && contrib.status === "pending").length;

      const groupWithStats: GroupWithStats = {
        ...group,
        memberCount,
        projectCount,
        completionRate,
        pendingPayments,
        totalCollected: totalProjectCollected,
      };
      
      return { ...membership, group: groupWithStats };
    });
  }

  async addGroupMember(insertMember: InsertGroupMember): Promise<GroupMember> {
    const id = randomUUID();
    const member: GroupMember = {
      ...insertMember,
      id,
      contributedAmount: "0",
      status: "active",
      joinedAt: new Date(),
    };
    this.groupMembers.set(id, member);
    return member;
  }

  async getGroupMember(groupId: string, userId: string): Promise<GroupMember | undefined> {
    return Array.from(this.groupMembers.values())
      .find(member => member.groupId === groupId && member.userId === userId);
  }

  async removeGroupMember(memberId: string): Promise<boolean> {
    if (this.groupMembers.has(memberId)) {
      this.groupMembers.delete(memberId);
      return true;
    }
    return false;
  }

  // Project methods
  async getProjectsByGroup(groupId: string): Promise<ProjectWithStats[]> {
    const projects = Array.from(this.projects.values())
      .filter(project => project.groupId === groupId);
    
    return projects.map(project => {
      const contributions = Array.from(this.contributions.values())
        .filter(c => c.projectId === project.id);
      
      const contributionCount = contributions.length;
      const completionRate = Number(project.targetAmount) > 0 
        ? Math.round((Number(project.collectedAmount) / Number(project.targetAmount)) * 100)
        : 0;
      
      return {
        ...project,
        contributionCount,
        completionRate,
      };
    });
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjectByCustomSlug(customSlug: string): Promise<Project | undefined> {
    return Array.from(this.projects.values()).find(project => project.customSlug === customSlug);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    
    // Get the group to create project URL slug
    const group = this.groups.get(insertProject.groupId);
    const groupSlug = group?.customSlug || "group";
    
    // Generate clean URL slug from project name
    const projectSlug = insertProject.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '') // Remove all spaces
      .slice(0, 50); // Limit length
    
    const customSlug = `${groupSlug}/${projectSlug}`;

    const project: Project = {
      ...insertProject,
      id,
      collectedAmount: "0",
      customSlug,
      createdAt: new Date(),
      description: insertProject.description || null,
      deadline: insertProject.deadline ? 
        (typeof insertProject.deadline === 'string' ? new Date(insertProject.deadline) : insertProject.deadline) 
        : null,
      status: insertProject.status || "active",
      // Ensure all account fields are null if not provided
      accountName: insertProject.accountName || null,
      accountNumber: insertProject.accountNumber || null,
      bankName: insertProject.bankName || null,
      routingNumber: insertProject.routingNumber || null,
      swiftCode: insertProject.swiftCode || null,
      zelleEmail: insertProject.zelleEmail || null,
      zellePhone: insertProject.zellePhone || null,
      cashappHandle: insertProject.cashappHandle || null,
      venmoHandle: insertProject.venmoHandle || null,
      paypalEmail: insertProject.paypalEmail || null,
      paymentInstructions: insertProject.paymentInstructions || null,
      allowedPaymentTypes: insertProject.allowedPaymentTypes || null,
    };

    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    // Handle deadline conversion if it's a string
    if (updates.deadline && typeof updates.deadline === 'string') {
      updates.deadline = new Date(updates.deadline);
    }
    
    const updatedProject = { ...project, ...updates };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  // Accountability Partner methods
  async getGroupAccountabilityPartners(groupId: string): Promise<AccountabilityPartnerWithDetails[]> {
    const partners = Array.from(this.accountabilityPartners.values())
      .filter(partner => partner.groupId === groupId);
    
    return partners.map(partner => {
      const user = this.users.get(partner.userId);
      if (!user) {
        console.error(`User not found for accountability partner: ${partner.userId}`);
        return {
          ...partner,
          userName: "Unknown User",
          userFullName: "Unknown User",
        };
      }
      return {
        ...partner,
        userName: user.username,
        userFullName: user.fullName,
      };
    });
  }

  async addAccountabilityPartner(insertPartner: InsertAccountabilityPartner): Promise<AccountabilityPartner> {
    const id = randomUUID();
    const partner: AccountabilityPartner = {
      ...insertPartner,
      id,
      assignedAt: new Date(),
    };

    this.accountabilityPartners.set(id, partner);
    return partner;
  }

  async removeAccountabilityPartner(groupId: string, userId: string): Promise<boolean> {
    const partner = Array.from(this.accountabilityPartners.values())
      .find(p => p.groupId === groupId && p.userId === userId);
    
    if (partner) {
      this.accountabilityPartners.delete(partner.id);
      return true;
    }
    return false;
  }

  async getGroupContributions(groupId: string): Promise<ContributionWithDetails[]> {
    const contributions = Array.from(this.contributions.values())
      .filter(contrib => contrib.groupId === groupId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return contributions.map(contrib => {
      const user = this.users.get(contrib.userId)!;
      const group = this.groups.get(contrib.groupId)!;
      return {
        ...contrib,
        userName: user.fullName,
        groupName: group.name
      };
    });
  }

  async getProjectContributions(projectId: string): Promise<ContributionWithDetails[]> {
    const contributions = Array.from(this.contributions.values())
      .filter(contrib => contrib.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return contributions.map(contrib => {
      const user = this.users.get(contrib.userId)!;
      const group = this.groups.get(contrib.groupId)!;
      const project = this.projects.get(contrib.projectId!)!;
      return {
        ...contrib,
        userName: user.fullName,
        groupName: group.name,
        projectName: project.name
      };
    });
  }

  async getUserContributions(userId: string): Promise<ContributionWithDetails[]> {
    const contributions = Array.from(this.contributions.values())
      .filter(contrib => contrib.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return contributions.map(contrib => {
      const user = this.users.get(contrib.userId)!;
      const group = this.groups.get(contrib.groupId)!;
      const project = contrib.projectId ? this.projects.get(contrib.projectId) : null;
      return {
        ...contrib,
        userName: user.fullName,
        groupName: group.name,
        projectName: project?.name
      };
    });
  }

  async getAdminContributions(adminId: string): Promise<ContributionWithDetails[]> {
    // Get all groups managed by this admin
    const adminGroups = Array.from(this.groups.values()).filter(group => group.adminId === adminId);
    const groupIds = adminGroups.map(group => group.id);
    
    // Get all contributions for these groups
    const contributions = Array.from(this.contributions.values())
      .filter(contrib => groupIds.includes(contrib.groupId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return contributions.map(contrib => {
      const user = this.users.get(contrib.userId)!;
      const group = this.groups.get(contrib.groupId)!;
      const project = contrib.projectId ? this.projects.get(contrib.projectId) : null;
      return {
        ...contrib,
        userName: user.fullName,
        groupName: group.name,
        projectName: project?.name
      };
    });
  }

  async getContribution(id: string): Promise<Contribution | undefined> {
    return this.contributions.get(id);
  }

  async createContribution(insertContribution: InsertContribution): Promise<Contribution> {
    const id = randomUUID();
    const contribution: Contribution = {
      ...insertContribution,
      id,
      status: "pending", // All contributions start as pending until admin confirms
      createdAt: new Date(),
      description: insertContribution.description || null,
      transactionRef: insertContribution.transactionRef || null,
      proofOfPayment: insertContribution.proofOfPayment || null,
      projectId: insertContribution.projectId || null,
      paymentNotes: insertContribution.paymentNotes || null,
    };
    this.contributions.set(id, contribution);

    // Send notifications to admin and accountability partners
    await this.createPaymentNotifications(contribution);

    // Don't update amounts yet - wait for admin confirmation
    return contribution;
  }

  async confirmContribution(contributionId: string): Promise<Contribution | undefined> {
    const contribution = this.contributions.get(contributionId);
    if (!contribution) return undefined;

    // Update status to confirmed
    contribution.status = "confirmed";
    
    // Update project collected amount if contribution is for a specific project
    if (contribution.projectId) {
      const project = this.projects.get(contribution.projectId);
      if (project) {
        const newCollectedAmount = (Number(project.collectedAmount) + Number(contribution.amount)).toString();
        await this.updateProject(project.id, { collectedAmount: newCollectedAmount });
      }
    }

    // Update member contributed amount
    const member = await this.getGroupMember(contribution.groupId, contribution.userId);
    if (member) {
      const newContributedAmount = (Number(member.contributedAmount) + Number(contribution.amount)).toString();
      this.groupMembers.set(member.id, { ...member, contributedAmount: newContributedAmount });
    }

    // Send confirmation notification to the contributor
    await this.createConfirmationNotifications(contribution);

    return contribution;
  }

  // Helper method to create confirmation notifications
  private async createConfirmationNotifications(contribution: Contribution): Promise<void> {
    const user = this.users.get(contribution.userId);
    const group = this.groups.get(contribution.groupId);
    const project = contribution.projectId ? this.projects.get(contribution.projectId) : null;
    
    if (!user || !group) {
      console.error("User or group not found for confirmation notification");
      return;
    }
    
    const contributionAmount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(Number(contribution.amount));

    const entityName = project ? project.name : group.name;

    // Notify the contributor that their payment was confirmed
    await this.createNotification({
      userId: contribution.userId,
      type: "payment_confirmed",
      title: "Payment Confirmed!",
      message: `Your payment of ${contributionAmount} for ${entityName} has been confirmed and added to the total.`,
      contributionId: contribution.id,
      projectId: contribution.projectId,
    });
  }

  async updateContribution(id: string, updates: Partial<Contribution>): Promise<Contribution | undefined> {
    const contribution = this.contributions.get(id);
    if (!contribution) return undefined;
    
    const updatedContribution = { ...contribution, ...updates };
    this.contributions.set(id, updatedContribution);
    return updatedContribution;
  }

  async deleteContribution(id: string): Promise<void> {
    this.contributions.delete(id);
  }

  async getUserStats(userId: string): Promise<MemberWithContributions> {
    const user = this.users.get(userId)!;
    const userContributions = Array.from(this.contributions.values())
      .filter(contrib => contrib.userId === userId);
    
    const totalContributions = userContributions
      .reduce((sum, contrib) => sum + Number(contrib.amount), 0)
      .toString();
    
    const groupCount = Array.from(this.groupMembers.values())
      .filter(member => member.userId === userId && member.status === "active").length;
    
    return {
      ...user,
      totalContributions,
      groupCount,
      status: "active"
    };
  }

  async getAdminStats(adminId: string): Promise<{
    totalCollections: string;
    activeMembers: number;
    pendingPayments: number;
    completionRate: number;
  }> {
    const adminGroups = Array.from(this.groups.values()).filter(group => group.adminId === adminId);
    
    // Calculate total collections from all projects in admin's groups
    const allProjects = Array.from(this.projects.values()).filter(project => 
      adminGroups.some(group => group.id === project.groupId)
    );
    const totalCollections = allProjects
      .reduce((sum, project) => sum + Number(project.collectedAmount), 0)
      .toString();
    
    const activeMembers = Array.from(this.groupMembers.values())
      .filter(member => 
        adminGroups.some(group => group.id === member.groupId) && 
        member.status === "active"
      ).length;
    
    let totalPendingPayments = 0;
    let totalGroups = adminGroups.length;
    let completedGroups = 0;
    
    adminGroups.forEach(group => {
      // Count pending payments based on contribution status
      const groupContributions = Array.from(this.contributions.values())
        .filter(contrib => contrib.groupId === group.id && contrib.status === "pending");
      totalPendingPayments += groupContributions.length;
      
      // Calculate completion based on projects
      const groupProjects = Array.from(this.projects.values()).filter(project => project.groupId === group.id);
      const totalTarget = groupProjects.reduce((sum, project) => sum + Number(project.targetAmount), 0);
      const totalCollected = groupProjects.reduce((sum, project) => sum + Number(project.collectedAmount), 0);
      
      if (totalTarget > 0 && totalCollected >= totalTarget) {
        completedGroups++;
      }
    });
    
    const completionRate = totalGroups > 0 ? Math.round((completedGroups / totalGroups) * 100) : 0;
    
    return {
      totalCollections,
      activeMembers,
      pendingPayments: totalPendingPayments,
      completionRate
    };
  }

  // Notification methods
  async getUserNotifications(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const notification: Notification = {
      ...insertNotification,
      id,
      read: false,
      createdAt: new Date(),
      contributionId: insertNotification.contributionId || null,
      projectId: insertNotification.projectId || null,
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.read = true;
      this.notifications.set(notificationId, notification);
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    this.notifications.delete(notificationId);
  }

  // Helper method to create payment notifications
  private async createPaymentNotifications(contribution: Contribution): Promise<void> {
    const user = this.users.get(contribution.userId);
    const group = this.groups.get(contribution.groupId);
    const project = contribution.projectId ? this.projects.get(contribution.projectId) : null;
    
    if (!user || !group) {
      console.error("User or group not found for notification");
      return;
    }
    
    const contributionAmount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(Number(contribution.amount));

    const entityName = project ? project.name : group.name;

    // Notify group admin
    await this.createNotification({
      userId: group.adminId,
      type: "payment_submitted",
      title: "New Payment Submitted",
      message: `${user.fullName} submitted a payment of ${contributionAmount} for ${entityName}. Please review and confirm.`,
      contributionId: contribution.id,
      projectId: contribution.projectId,
    });

    // Notify accountability partners
    const partners = await this.getGroupAccountabilityPartners(contribution.groupId);
    for (const partner of partners) {
      await this.createNotification({
        userId: partner.userId,
        type: "payment_submitted",
        title: "Payment Submitted for Review",
        message: `${user.fullName} submitted a payment of ${contributionAmount} for ${entityName}. You can review the payment details.`,
        contributionId: contribution.id,
        projectId: contribution.projectId,
      });
    }
  }

  // Helper method to create rejection notifications
  async createRejectionNotification(contribution: Contribution, reason?: string): Promise<void> {
    const user = this.users.get(contribution.userId);
    const group = this.groups.get(contribution.groupId);
    const project = contribution.projectId ? this.projects.get(contribution.projectId) : null;
    
    if (!user || !group) {
      console.error("User or group not found for rejection notification");
      return;
    }
    
    const contributionAmount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(Number(contribution.amount));

    const entityName = project ? project.name : group.name;
    const reasonText = reason ? ` Reason: ${reason}` : '';

    // Notify the contributor that their payment was rejected
    await this.createNotification({
      userId: contribution.userId,
      type: "payment_rejected",
      title: "Payment Rejected",
      message: `Your payment of ${contributionAmount} for ${entityName} was rejected.${reasonText} Please contact the admin for clarification.`,
      contributionId: contribution.id,
      projectId: contribution.projectId,
    });
  }

  // OTP Verification methods
  async sendOtp(phoneNumber: string): Promise<{ code: string; expiresAt: string }> {
    // Generate a 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // Create OTP verification record
    await this.createOtpVerification({
      phoneNumber,
      otp: code,
      expiresAt
    });
    
    // Import WhatsApp service and send OTP
    try {
      const { whatsappService } = await import("./whatsapp-service");
      const sent = await whatsappService.sendOTP(phoneNumber, code);
      
      if (!sent) {
        console.error("Failed to send WhatsApp OTP, falling back to console log");
        console.log(`OTP for ${phoneNumber}: ${code}`);
      }
    } catch (error) {
      console.error("WhatsApp service error, falling back to console log:", error);
      console.log(`OTP for ${phoneNumber}: ${code}`);
    }
    
    return {
      code,
      expiresAt: expiresAt.toISOString()
    };
  }

  async createOtpVerification(insertOtp: InsertOtpVerification): Promise<OtpVerification> {
    const id = randomUUID();
    const otp: OtpVerification = {
      ...insertOtp,
      id,
      verified: false,
      attempts: 0,
      createdAt: new Date()
    };
    
    // Clean up any existing OTPs for this phone number
    this.otpVerifications.forEach((existingOtp, key) => {
      if (existingOtp.phoneNumber === otp.phoneNumber) {
        this.otpVerifications.delete(key);
      }
    });
    
    this.otpVerifications.set(id, otp);
    return otp;
  }

  async getActiveOtpVerification(phoneNumber: string): Promise<OtpVerification | undefined> {
    const now = new Date();
    return Array.from(this.otpVerifications.values()).find(
      otp => otp.phoneNumber === phoneNumber && 
             !otp.verified && 
             otp.expiresAt > now &&
             otp.attempts < 3
    );
  }

  async verifyOtp(phoneNumber: string, otpCode: string): Promise<boolean> {
    const verification = await this.getActiveOtpVerification(phoneNumber);
    if (!verification) return false;

    verification.attempts += 1;
    
    if (verification.otp === otpCode) {
      verification.verified = true;
      this.otpVerifications.set(verification.id, verification);
      return true;
    }
    
    this.otpVerifications.set(verification.id, verification);
    return false;
  }

  async cleanupExpiredOtps(): Promise<void> {
    const now = new Date();
    const expiredKeys: string[] = [];
    
    this.otpVerifications.forEach((otp, key) => {
      if (otp.expiresAt < now) {
        expiredKeys.push(key);
      }
    });
    
    expiredKeys.forEach(key => this.otpVerifications.delete(key));
  }

  async createDeviceToken(userId: string, deviceInfo?: string): Promise<string> {
    const token = randomUUID() + '-' + randomUUID(); // Create a strong random token
    const id = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days
    
    const deviceToken: DeviceToken = {
      id,
      userId,
      token,
      deviceInfo: deviceInfo || null,
      lastUsed: now,
      expiresAt,
      createdAt: now,
    };
    
    this.deviceTokens.set(token, deviceToken);
    return token;
  }

  async validateDeviceToken(token: string): Promise<User | null> {
    const deviceToken = this.deviceTokens.get(token);
    if (!deviceToken) return null;
    
    const now = new Date();
    if (deviceToken.expiresAt < now) {
      this.deviceTokens.delete(token);
      return null;
    }
    
    // Update last used
    deviceToken.lastUsed = now;
    this.deviceTokens.set(token, deviceToken);
    
    const user = await this.getUser(deviceToken.userId);
    return user || null;
  }

  async removeDeviceToken(token: string): Promise<boolean> {
    return this.deviceTokens.delete(token);
  }

  // Disbursement methods (MemStorage)
  private disbursementsMap: Map<string, Disbursement> = new Map();

  async getDisbursementsByProject(projectId: string): Promise<Disbursement[]> {
    return Array.from(this.disbursementsMap.values())
      .filter(d => d.projectId === projectId)
      .sort((a, b) => new Date(b.disbursementDate).getTime() - new Date(a.disbursementDate).getTime());
  }

  async getDisbursement(id: string): Promise<Disbursement | undefined> {
    return this.disbursementsMap.get(id);
  }

  async createDisbursement(data: InsertDisbursement): Promise<Disbursement> {
    const disbursement: Disbursement = {
      ...data,
      recipientUserId: data.recipientUserId ?? null,
      memberConfirmed: false,
      memberConfirmedAt: null,
      id: randomUUID(),
      createdAt: new Date(),
    };
    this.disbursementsMap.set(disbursement.id, disbursement);
    return disbursement;
  }

  async deleteDisbursement(id: string): Promise<boolean> {
    return this.disbursementsMap.delete(id);
  }

  async confirmDisbursement(id: string): Promise<Disbursement | undefined> {
    const d = this.disbursementsMap.get(id);
    if (!d) return undefined;
    const updated = { ...d, memberConfirmed: true, memberConfirmedAt: new Date() };
    this.disbursementsMap.set(id, updated);
    return updated;
  }

  async getOrCreateReferralCode(_userId: string): Promise<string> { return ""; }
  async getUserByReferralCode(_code: string): Promise<User | undefined> { return undefined; }
  async createReferral(_referrerId: string, _refereeId: string): Promise<Referral> { throw new Error("Not implemented"); }
  async getReferralByReferee(_refereeId: string): Promise<Referral | undefined> { return undefined; }
  async getReferralsByReferrer(_referrerId: string): Promise<(Referral & { referee: User })[]> { return []; }
  async checkAndCompleteReferrals(_groupId: string): Promise<void> {}
  async getOpsOverview() { return { referrals: [], contributions: [], stats: { totalUsers: 0, totalReferrals: 0, completedReferrals: 0, pendingReferrals: 0, totalRewardsOwed: 0, totalPaymentProofs: 0, pendingProofs: 0 } }; }

  private pushSubscriptions: Map<string, PushSubscription> = new Map();

  async savePushSubscription(sub: InsertPushSubscription): Promise<PushSubscription> {
    const existing = Array.from(this.pushSubscriptions.values()).find(s => s.endpoint === sub.endpoint);
    if (existing) return existing;
    const record: PushSubscription = { ...sub, id: randomUUID(), createdAt: new Date() };
    this.pushSubscriptions.set(record.id, record);
    return record;
  }

  async getUserPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    return Array.from(this.pushSubscriptions.values()).filter(s => s.userId === userId);
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    for (const [id, sub] of this.pushSubscriptions.entries()) {
      if (sub.endpoint === endpoint) { this.pushSubscriptions.delete(id); break; }
    }
  }
}

// Database Storage implementation using Drizzle ORM
import { db } from "./db";
import { users as usersTable, groups as groupsTable, groupMembers as groupMembersTable, projects as projectsTable, accountabilityPartners as accountabilityPartnersTable, contributions as contributionsTable, notifications as notificationsTable, otpVerifications as otpVerificationsTable, deviceTokens as deviceTokensTable, disbursements as disbursementsTable, referrals as referralsTable, pushSubscriptions as pushSubscriptionsTable } from "@shared/schema";
import { eq, and, gt, lt, sql as drizzleSql, desc, inArray } from "drizzle-orm";

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    return result[0];
  }

  async getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined> {
    const result = await db.select().from(usersTable).where(eq(usersTable.phoneNumber, phoneNumber)).limit(1);
    return result[0];
  }

  async findOrCreateUserByPhone(phoneNumber: string): Promise<User> {
    const existingUser = await this.getUserByPhoneNumber(phoneNumber);
    if (existingUser) {
      return existingUser;
    }
    
    const result = await db.insert(usersTable).values({
      phoneNumber,
      role: "member",
    }).returning();
    return result[0];
  }

  async updateUserProfile(userId: string, updates: { fullName?: string; role?: string }): Promise<User | undefined> {
    const updateData: Partial<User> = {};
    if (updates.fullName !== undefined) {
      updateData.fullName = updates.fullName;
      updateData.profileCompletedAt = new Date();
    }
    if (updates.role !== undefined) {
      // Validate role at storage layer as extra safety
      const validRoles = ['admin', 'member'];
      if (validRoles.includes(updates.role)) {
        updateData.role = updates.role;
      }
    }
    
    const result = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, userId))
      .returning();
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(usersTable).values(insertUser).returning();
    return result[0];
  }

  async getGroup(id: string): Promise<Group | undefined> {
    const result = await db.select().from(groupsTable).where(eq(groupsTable.id, id)).limit(1);
    return result[0];
  }

  async getGroupByRegistrationLink(link: string): Promise<Group | undefined> {
    const result = await db.select().from(groupsTable).where(eq(groupsTable.registrationLink, link)).limit(1);
    return result[0];
  }

  async getGroupByCustomSlug(slug: string): Promise<Group | undefined> {
    const result = await db.select().from(groupsTable).where(eq(groupsTable.customSlug, slug)).limit(1);
    return result[0];
  }

  async getGroupsByAdmin(adminId: string): Promise<GroupWithStats[]> {
    const adminGroups = await db.select().from(groupsTable).where(eq(groupsTable.adminId, adminId));
    
    const groupsWithStats = await Promise.all(adminGroups.map(async (group) => {
      const memberCountResult = await db
        .select({ count: drizzleSql<number>`count(*)::int` })
        .from(groupMembersTable)
        .where(eq(groupMembersTable.groupId, group.id));
      const memberCount = memberCountResult[0]?.count || 0;

      const groupProjects = await db.select().from(projectsTable).where(eq(projectsTable.groupId, group.id));
      
      const totalProjectTarget = groupProjects.reduce((sum, project) => sum + Number(project.targetAmount), 0);
      const totalProjectCollected = groupProjects.reduce((sum, project) => sum + Number(project.collectedAmount), 0);
      
      const completionRate = totalProjectTarget > 0 ? Math.round((totalProjectCollected / totalProjectTarget) * 100) : 0;
      const pendingPayments = 0;

      return {
        ...group,
        memberCount,
        projectCount: groupProjects.length,
        completionRate,
        pendingPayments,
        totalCollected: totalProjectCollected,
      };
    }));

    return groupsWithStats;
  }

  async getAllUserGroups(userId: string): Promise<GroupWithRole[]> {
    const groupMap = new Map<string, GroupWithRole>();
    
    // Get groups where user is admin
    const adminGroups = await db.select().from(groupsTable).where(eq(groupsTable.adminId, userId));
    
    for (const group of adminGroups) {
      const memberCountResult = await db
        .select({ count: drizzleSql<number>`count(*)::int` })
        .from(groupMembersTable)
        .where(eq(groupMembersTable.groupId, group.id));
      const memberCount = memberCountResult[0]?.count || 0;
      
      const groupProjects = await db.select().from(projectsTable).where(eq(projectsTable.groupId, group.id));
      const totalTarget = groupProjects.reduce((sum, p) => sum + Number(p.targetAmount || 0), 0);
      const totalCollected = groupProjects.reduce((sum, p) => sum + Number(p.collectedAmount || 0), 0);
      const completionRate = totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 0;
      
      // Count pending approvals for admin
      const pendingApprovalsResult = await db
        .select({ count: drizzleSql<number>`count(*)::int` })
        .from(contributionsTable)
        .where(and(eq(contributionsTable.groupId, group.id), eq(contributionsTable.status, "pending")));
      const pendingApprovals = pendingApprovalsResult[0]?.count || 0;
      
      groupMap.set(group.id, {
        ...group,
        memberCount,
        projectCount: groupProjects.length,
        completionRate,
        pendingPayments: 0,
        totalCollected,
        role: 'admin',
        pendingApprovals,
      });
    }
    
    // Get groups where user is member
    const memberships = await db
      .select()
      .from(groupMembersTable)
      .leftJoin(groupsTable, eq(groupMembersTable.groupId, groupsTable.id))
      .where(eq(groupMembersTable.userId, userId));
    
    for (const row of memberships) {
      const group = row.groups;
      if (!group) continue;
      
      const memberCountResult = await db
        .select({ count: drizzleSql<number>`count(*)::int` })
        .from(groupMembersTable)
        .where(eq(groupMembersTable.groupId, group.id));
      const memberCount = memberCountResult[0]?.count || 0;
      
      const groupProjects = await db.select().from(projectsTable).where(eq(projectsTable.groupId, group.id));
      const totalTarget = groupProjects.reduce((sum, p) => sum + Number(p.targetAmount || 0), 0);
      const totalCollected = groupProjects.reduce((sum, p) => sum + Number(p.collectedAmount || 0), 0);
      const completionRate = totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 0;
      
      // Count my pending payments in this group
      const myPendingResult = await db
        .select({ count: drizzleSql<number>`count(*)::int` })
        .from(contributionsTable)
        .where(and(
          eq(contributionsTable.groupId, group.id),
          eq(contributionsTable.userId, userId),
          eq(contributionsTable.status, "pending")
        ));
      const myPendingPayments = myPendingResult[0]?.count || 0;
      
      const existing = groupMap.get(group.id);
      if (existing) {
        // User is both admin and member
        existing.role = 'both';
        existing.myPendingPayments = myPendingPayments;
      } else {
        // Check if user is a co-admin of this group to populate pendingApprovals
        const isCoAdmin = (group.coAdmins ?? []).includes(userId);
        let pendingApprovals: number | undefined = undefined;
        if (isCoAdmin) {
          const pendingApprovalsResult = await db
            .select({ count: drizzleSql<number>`count(*)::int` })
            .from(contributionsTable)
            .where(and(eq(contributionsTable.groupId, group.id), eq(contributionsTable.status, "pending")));
          pendingApprovals = pendingApprovalsResult[0]?.count || 0;
        }

        groupMap.set(group.id, {
          ...group,
          memberCount,
          projectCount: groupProjects.length,
          completionRate,
          pendingPayments: 0,
          totalCollected,
          role: 'member',
          myPendingPayments,
          ...(pendingApprovals !== undefined ? { pendingApprovals } : {}),
        });
      }
    }
    
    return Array.from(groupMap.values());
  }

  async createGroup(insertGroup: InsertGroup, adminId: string): Promise<Group> {
    const baseCode = insertGroup.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '')
      .substring(0, 15);
    
    const currentYear = new Date().getFullYear();
    const registrationLink = `${baseCode}${currentYear}`;
    const groupSlug = baseCode;

    let whatsappLink = insertGroup.whatsappLink;
    if (!whatsappLink) {
      const joinLink = `kontrib.app/join/${groupSlug}`;
      const message = `${joinLink}\n\nYou have been invited to join ${insertGroup.name} on Kontrib!\n\nLogin to submit your contributions\n\nLet's keep it transparent\n\nKontrib.app`;
      whatsappLink = `https://wa.me/?text=${encodeURIComponent(message)}`;
    }

    const result = await db.insert(groupsTable).values({
      ...insertGroup,
      registrationLink,
      customSlug: groupSlug,
      adminId,
      whatsappLink,
    }).returning();
    
    const group = result[0];
    
    // Automatically add admin as first group member
    await this.addGroupMember({
      groupId: group.id,
      userId: adminId,
    });
    
    return group;
  }

  async updateGroup(id: string, updates: Partial<Group>): Promise<Group | undefined> {
    const result = await db.update(groupsTable).set(updates).where(eq(groupsTable.id, id)).returning();
    return result[0];
  }

  async deleteGroup(id: string): Promise<boolean> {
    // Cascade delete in FK-safe order
    await db.delete(disbursementsTable).where(eq(disbursementsTable.groupId, id));
    await db.delete(contributionsTable).where(eq(contributionsTable.groupId, id));
    await db.delete(accountabilityPartnersTable).where(eq(accountabilityPartnersTable.groupId, id));
    await db.delete(projectsTable).where(eq(projectsTable.groupId, id));
    await db.delete(groupMembersTable).where(eq(groupMembersTable.groupId, id));
    const result = await db.delete(groupsTable).where(eq(groupsTable.id, id)).returning();
    return result.length > 0;
  }

  async getGroupMembers(groupId: string): Promise<(GroupMember & { user: User })[]> {
    const result = await db
      .select()
      .from(groupMembersTable)
      .leftJoin(usersTable, eq(groupMembersTable.userId, usersTable.id))
      .where(eq(groupMembersTable.groupId, groupId));

    return result.map(row => ({
      ...row.group_members,
      user: row.users!
    }));
  }

  async getUserGroups(userId: string): Promise<(GroupMember & { group: Group })[]> {
    const result = await db
      .select()
      .from(groupMembersTable)
      .leftJoin(groupsTable, eq(groupMembersTable.groupId, groupsTable.id))
      .where(eq(groupMembersTable.userId, userId));

    return result
      .filter(row => row.groups !== null)
      .map(row => ({
        ...row.group_members,
        group: row.groups!
      }));
  }

  async addGroupMember(member: InsertGroupMember): Promise<GroupMember> {
    const result = await db.insert(groupMembersTable).values(member).returning();
    // Check if this group now has 5+ members → complete any pending referrals
    const countResult = await db
      .select({ count: drizzleSql<number>`count(*)::int` })
      .from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, member.groupId), eq(groupMembersTable.status, "active")));
    if ((countResult[0]?.count || 0) >= 5) {
      await this.checkAndCompleteReferrals(member.groupId);
    }
    return result[0];
  }

  async getGroupMember(groupId: string, userId: string): Promise<GroupMember | undefined> {
    const result = await db
      .select()
      .from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)))
      .limit(1);
    return result[0];
  }

  async removeGroupMember(memberId: string): Promise<boolean> {
    const result = await db
      .delete(groupMembersTable)
      .where(eq(groupMembersTable.id, memberId))
      .returning();
    return result.length > 0;
  }

  async getProjectsByGroup(groupId: string): Promise<ProjectWithStats[]> {
    const groupProjects = await db.select().from(projectsTable).where(eq(projectsTable.groupId, groupId));
    
    const projectsWithStats = await Promise.all(groupProjects.map(async (project) => {
      const contributionsResult = await db
        .select({ count: drizzleSql<number>`count(*)::int` })
        .from(contributionsTable)
        .where(eq(contributionsTable.projectId, project.id));
      const contributionCount = contributionsResult[0]?.count || 0;

      const completionRate = Number(project.targetAmount) > 0
        ? Math.round((Number(project.collectedAmount) / Number(project.targetAmount)) * 100)
        : 0;

      return {
        ...project,
        contributionCount,
        completionRate
      };
    }));

    return projectsWithStats;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const result = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
    return result[0];
  }

  async getProjectByCustomSlug(customSlug: string): Promise<Project | undefined> {
    const result = await db.select().from(projectsTable).where(eq(projectsTable.customSlug, customSlug)).limit(1);
    return result[0];
  }

  async createProject(project: InsertProject): Promise<Project> {
    const baseSlug = project.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '')
      .substring(0, 15);

    const { deadline, ...restProject } = project;
    const result = await db.insert(projectsTable).values({
      ...restProject,
      deadline: deadline ? (typeof deadline === 'string' ? new Date(deadline) : deadline) : null,
      customSlug: baseSlug
    }).returning();
    return result[0];
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const result = await db.update(projectsTable).set(updates).where(eq(projectsTable.id, id)).returning();
    return result[0];
  }

  async getGroupAccountabilityPartners(groupId: string): Promise<AccountabilityPartnerWithDetails[]> {
    const result = await db
      .select()
      .from(accountabilityPartnersTable)
      .leftJoin(usersTable, eq(accountabilityPartnersTable.userId, usersTable.id))
      .where(eq(accountabilityPartnersTable.groupId, groupId));

    return result.map(row => ({
      ...row.accountability_partners,
      userName: row.users!.username,
      userFullName: row.users!.fullName
    }));
  }

  async addAccountabilityPartner(partner: InsertAccountabilityPartner): Promise<AccountabilityPartner> {
    const result = await db.insert(accountabilityPartnersTable).values(partner).returning();
    return result[0];
  }

  async removeAccountabilityPartner(groupId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(accountabilityPartnersTable)
      .where(and(eq(accountabilityPartnersTable.groupId, groupId), eq(accountabilityPartnersTable.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async getGroupContributions(groupId: string): Promise<ContributionWithDetails[]> {
    const result = await db
      .select()
      .from(contributionsTable)
      .leftJoin(usersTable, eq(contributionsTable.userId, usersTable.id))
      .leftJoin(projectsTable, eq(contributionsTable.projectId, projectsTable.id))
      .leftJoin(groupsTable, eq(contributionsTable.groupId, groupsTable.id))
      .where(eq(contributionsTable.groupId, groupId))
      .orderBy(desc(contributionsTable.createdAt));

    return result.map(row => ({
      ...row.contributions,
      userName: row.users!.fullName || row.users!.username,
      groupName: row.groups!.name,
      projectName: row.projects?.name
    }));
  }

  async getProjectContributions(projectId: string): Promise<ContributionWithDetails[]> {
    const result = await db
      .select()
      .from(contributionsTable)
      .leftJoin(usersTable, eq(contributionsTable.userId, usersTable.id))
      .leftJoin(projectsTable, eq(contributionsTable.projectId, projectsTable.id))
      .leftJoin(groupsTable, eq(contributionsTable.groupId, groupsTable.id))
      .where(eq(contributionsTable.projectId, projectId))
      .orderBy(desc(contributionsTable.createdAt));

    return result.map(row => ({
      ...row.contributions,
      userName: row.users!.fullName || row.users!.username,
      groupName: row.groups!.name,
      projectName: row.projects?.name
    }));
  }

  async getContribution(id: string): Promise<Contribution | undefined> {
    const result = await db.select().from(contributionsTable).where(eq(contributionsTable.id, id)).limit(1);
    return result[0];
  }

  async createContribution(contribution: InsertContribution): Promise<Contribution> {
    const result = await db.insert(contributionsTable).values(contribution).returning();
    return result[0];
  }

  async confirmContribution(contributionId: string): Promise<Contribution | undefined> {
    const contribution = await db
      .select()
      .from(contributionsTable)
      .where(eq(contributionsTable.id, contributionId))
      .limit(1);

    if (!contribution[0]) return undefined;

    const updatedContribution = await db
      .update(contributionsTable)
      .set({ status: 'confirmed' })
      .where(eq(contributionsTable.id, contributionId))
      .returning();

    if (contribution[0].projectId) {
      const project = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.id, contribution[0].projectId))
        .limit(1);

      if (project[0]) {
        const newCollected = Number(project[0].collectedAmount) + Number(contribution[0].amount);
        await db
          .update(projectsTable)
          .set({ collectedAmount: newCollected.toString() })
          .where(eq(projectsTable.id, contribution[0].projectId));
      }
    }

    const member = await db
      .select()
      .from(groupMembersTable)
      .where(and(
        eq(groupMembersTable.groupId, contribution[0].groupId),
        eq(groupMembersTable.userId, contribution[0].userId)
      ))
      .limit(1);

    if (member[0]) {
      const newAmount = Number(member[0].contributedAmount) + Number(contribution[0].amount);
      await db
        .update(groupMembersTable)
        .set({ contributedAmount: newAmount.toString() })
        .where(eq(groupMembersTable.id, member[0].id));
    }

    return updatedContribution[0];
  }

  async getUserContributions(userId: string): Promise<ContributionWithDetails[]> {
    const result = await db
      .select()
      .from(contributionsTable)
      .leftJoin(usersTable, eq(contributionsTable.userId, usersTable.id))
      .leftJoin(projectsTable, eq(contributionsTable.projectId, projectsTable.id))
      .leftJoin(groupsTable, eq(contributionsTable.groupId, groupsTable.id))
      .where(eq(contributionsTable.userId, userId))
      .orderBy(desc(contributionsTable.createdAt));

    return result.map(row => ({
      ...row.contributions,
      userName: row.users!.fullName || row.users!.username,
      groupName: row.groups!.name,
      projectName: row.projects?.name
    }));
  }

  async getAdminContributions(adminId: string): Promise<ContributionWithDetails[]> {
    const adminGroups = await db.select().from(groupsTable).where(eq(groupsTable.adminId, adminId));
    const groupIds = adminGroups.map(g => g.id);

    if (groupIds.length === 0) return [];

    const result = await db
      .select()
      .from(contributionsTable)
      .leftJoin(usersTable, eq(contributionsTable.userId, usersTable.id))
      .leftJoin(projectsTable, eq(contributionsTable.projectId, projectsTable.id))
      .leftJoin(groupsTable, eq(contributionsTable.groupId, groupsTable.id))
      .where(inArray(contributionsTable.groupId, groupIds))
      .orderBy(desc(contributionsTable.createdAt));

    return result.map(row => ({
      ...row.contributions,
      userName: row.users!.fullName || row.users!.username,
      groupName: row.groups!.name,
      projectName: row.projects?.name
    }));
  }

  async updateContribution(id: string, updates: Partial<Contribution>): Promise<Contribution | undefined> {
    const result = await db.update(contributionsTable).set(updates).where(eq(contributionsTable.id, id)).returning();
    return result[0];
  }

  async deleteContribution(id: string): Promise<void> {
    await db.delete(contributionsTable).where(eq(contributionsTable.id, id));
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    const result = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, userId))
      .orderBy(desc(notificationsTable.createdAt));
    return result;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const result = await db.insert(notificationsTable).values(notification).returning();
    return result[0];
  }

  async createRejectionNotification(contribution: Contribution, reason?: string): Promise<void> {
    const user = await this.getUser(contribution.userId);
    const group = await this.getGroup(contribution.groupId);
    const project = contribution.projectId ? await this.getProject(contribution.projectId) : null;
    
    if (!user || !group) {
      console.error("User or group not found for rejection notification");
      return;
    }
    
    const contributionAmount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(Number(contribution.amount));
    
    const entityName = project ? project.name : group.name;
    
    let message = `Your payment of ${contributionAmount} for ${entityName} was not approved.`;
    if (reason) {
      message += ` Reason: ${reason}`;
    }
    
    await this.createNotification({
      userId: contribution.userId,
      type: "payment_rejected",
      title: "Payment Not Approved",
      message,
      contributionId: contribution.id,
      projectId: contribution.projectId
    });
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.id, notificationId));
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await db.delete(notificationsTable).where(eq(notificationsTable.id, notificationId));
  }

  async getUserStats(userId: string): Promise<MemberWithContributions> {
    const contributions = await this.getUserContributions(userId);
    const totalContributions = contributions
      .filter(c => c.status === 'confirmed')
      .reduce((sum, c) => sum + Number(c.amount), 0);

    const userGroups = await this.getUserGroups(userId);
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');

    return {
      ...user,
      totalContributions: totalContributions.toString(),
      groupCount: userGroups.length,
      status: 'active'
    };
  }

  async getAdminStats(adminId: string): Promise<{
    totalCollections: string;
    activeMembers: number;
    pendingPayments: number;
    completionRate: number;
  }> {
    const adminGroups = await db.select().from(groupsTable).where(eq(groupsTable.adminId, adminId));
    const groupIds = adminGroups.map(g => g.id);

    if (groupIds.length === 0) {
      return { totalCollections: '0', activeMembers: 0, pendingPayments: 0, completionRate: 0 };
    }

    const membersResult = await db
      .select({ count: drizzleSql<number>`count(DISTINCT ${groupMembersTable.userId})::int` })
      .from(groupMembersTable)
      .where(inArray(groupMembersTable.groupId, groupIds));

    const contributionsResult = await db
      .select()
      .from(contributionsTable)
      .where(inArray(contributionsTable.groupId, groupIds));

    const totalCollections = contributionsResult
      .filter(c => c.status === 'confirmed')
      .reduce((sum, c) => sum + Number(c.amount), 0);

    const pendingPayments = contributionsResult.filter(c => c.status === 'pending').length;
    const activeMembers = membersResult[0]?.count || 0;

    return {
      totalCollections: totalCollections.toString(),
      activeMembers,
      pendingPayments,
      completionRate: 0
    };
  }

  async sendOtp(phoneNumber: string): Promise<{ code: string; expiresAt: string }> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.createOtpVerification({
      phoneNumber,
      otp: code,
      expiresAt
    });

    try {
      const { whatsappService } = await import("./whatsapp-service");
      const sent = await whatsappService.sendOTP(phoneNumber, code);

      if (!sent) {
        console.error("Failed to send WhatsApp OTP, falling back to console log");
        console.log(`OTP for ${phoneNumber}: ${code}`);
      }
    } catch (error) {
      console.error("WhatsApp service error, falling back to console log:", error);
      console.log(`OTP for ${phoneNumber}: ${code}`);
    }

    return {
      code,
      expiresAt: expiresAt.toISOString()
    };
  }

  async createOtpVerification(insertOtp: InsertOtpVerification): Promise<OtpVerification> {
    await db.delete(otpVerificationsTable).where(eq(otpVerificationsTable.phoneNumber, insertOtp.phoneNumber));
    const result = await db.insert(otpVerificationsTable).values(insertOtp).returning();
    return result[0];
  }

  async getActiveOtpVerification(phoneNumber: string): Promise<OtpVerification | undefined> {
    const now = new Date();
    const result = await db
      .select()
      .from(otpVerificationsTable)
      .where(
        and(
          eq(otpVerificationsTable.phoneNumber, phoneNumber),
          eq(otpVerificationsTable.verified, false),
          gt(otpVerificationsTable.expiresAt, now),
          lt(otpVerificationsTable.attempts, 3)
        )
      )
      .limit(1);
    return result[0];
  }

  async verifyOtp(phoneNumber: string, otpCode: string): Promise<boolean> {
    const verification = await this.getActiveOtpVerification(phoneNumber);
    if (!verification) return false;

    await db
      .update(otpVerificationsTable)
      .set({ attempts: verification.attempts + 1 })
      .where(eq(otpVerificationsTable.id, verification.id));

    if (verification.otp === otpCode) {
      await db
        .update(otpVerificationsTable)
        .set({ verified: true })
        .where(eq(otpVerificationsTable.id, verification.id));
      return true;
    }

    return false;
  }

  async cleanupExpiredOtps(): Promise<void> {
    const now = new Date();
    await db.delete(otpVerificationsTable).where(lt(otpVerificationsTable.expiresAt, now));
  }

  async createDeviceToken(userId: string, deviceInfo?: string): Promise<string> {
    const token = crypto.randomUUID() + '-' + crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days
    
    await db.insert(deviceTokensTable).values({
      userId,
      token,
      deviceInfo: deviceInfo || null,
      lastUsed: now,
      expiresAt,
    });
    
    return token;
  }

  async validateDeviceToken(token: string): Promise<User | null> {
    const now = new Date();
    const result = await db
      .select()
      .from(deviceTokensTable)
      .where(
        and(
          eq(deviceTokensTable.token, token),
          gt(deviceTokensTable.expiresAt, now)
        )
      )
      .limit(1);
    
    if (!result[0]) return null;
    
    // Update last used
    await db
      .update(deviceTokensTable)
      .set({ lastUsed: now })
      .where(eq(deviceTokensTable.token, token));
    
    const user = await this.getUser(result[0].userId);
    return user || null;
  }

  async removeDeviceToken(token: string): Promise<boolean> {
    const result = await db.delete(deviceTokensTable).where(eq(deviceTokensTable.token, token));
    return true;
  }

  // Disbursement methods (DbStorage)
  async getDisbursementsByProject(projectId: string): Promise<Disbursement[]> {
    return await db
      .select()
      .from(disbursementsTable)
      .where(eq(disbursementsTable.projectId, projectId))
      .orderBy(desc(disbursementsTable.disbursementDate));
  }

  async getDisbursement(id: string): Promise<Disbursement | undefined> {
    const [d] = await db.select().from(disbursementsTable).where(eq(disbursementsTable.id, id));
    return d;
  }

  async createDisbursement(data: InsertDisbursement): Promise<Disbursement> {
    const [disbursement] = await db
      .insert(disbursementsTable)
      .values(data)
      .returning();
    return disbursement;
  }

  async deleteDisbursement(id: string): Promise<boolean> {
    await db.delete(disbursementsTable).where(eq(disbursementsTable.id, id));
    return true;
  }

  async confirmDisbursement(id: string): Promise<Disbursement | undefined> {
    const [updated] = await db
      .update(disbursementsTable)
      .set({ memberConfirmed: true, memberConfirmedAt: new Date() })
      .where(eq(disbursementsTable.id, id))
      .returning();
    return updated;
  }

  // Referral methods
  private generateReferralCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "KTB";
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  async getOrCreateReferralCode(userId: string): Promise<string> {
    const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user[0]) throw new Error("User not found");
    if (user[0].referralCode) return user[0].referralCode;
    // Generate unique code
    let code: string;
    let attempts = 0;
    do {
      code = this.generateReferralCode();
      const existing = await db.select().from(usersTable).where(eq(usersTable.referralCode, code)).limit(1);
      if (existing.length === 0) break;
      attempts++;
    } while (attempts < 10);
    await db.update(usersTable).set({ referralCode: code! }).where(eq(usersTable.id, userId));
    return code!;
  }

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    const result = await db.select().from(usersTable).where(eq(usersTable.referralCode, code)).limit(1);
    return result[0];
  }

  async createReferral(referrerId: string, refereeId: string): Promise<Referral> {
    // Set referredBy on the referee user
    await db.update(usersTable).set({ referredBy: referrerId }).where(eq(usersTable.id, refereeId));
    // Create referral record
    const [referral] = await db.insert(referralsTable).values({
      referrerId,
      refereeId,
      status: "pending",
      rewardAmount: "20000",
    }).returning();
    return referral;
  }

  async getReferralByReferee(refereeId: string): Promise<Referral | undefined> {
    const result = await db.select().from(referralsTable).where(eq(referralsTable.refereeId, refereeId)).limit(1);
    return result[0];
  }

  async getReferralsByReferrer(referrerId: string): Promise<(Referral & { referee: User })[]> {
    const results = await db
      .select({ referral: referralsTable, referee: usersTable })
      .from(referralsTable)
      .innerJoin(usersTable, eq(referralsTable.refereeId, usersTable.id))
      .where(eq(referralsTable.referrerId, referrerId))
      .orderBy(desc(referralsTable.createdAt));
    return results.map(r => ({ ...r.referral, referee: r.referee }));
  }

  async checkAndCompleteReferrals(groupId: string): Promise<void> {
    // Get all active members of this group
    const members = await db
      .select({ userId: groupMembersTable.userId })
      .from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.status, "active")));
    const memberIds = members.map(m => m.userId);
    if (memberIds.length === 0) return;
    // Find pending referrals where any of these members is the referee
    const pendingReferrals = await db
      .select()
      .from(referralsTable)
      .where(and(
        eq(referralsTable.status, "pending"),
        inArray(referralsTable.refereeId, memberIds)
      ));
    // Mark each as complete
    for (const referral of pendingReferrals) {
      await db.update(referralsTable).set({
        status: "complete",
        completedAt: new Date(),
        triggerGroupId: groupId,
      }).where(eq(referralsTable.id, referral.id));

      const [refereeRows, referrerRows, groupRows] = await Promise.all([
        db.select().from(usersTable).where(eq(usersTable.id, referral.refereeId)).limit(1),
        db.select().from(usersTable).where(eq(usersTable.id, referral.referrerId)).limit(1),
        db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1),
      ]);
      const referee = refereeRows[0];
      const referrer = referrerRows[0];
      const group = groupRows[0];

      // In-app notification for referrer
      await db.insert(notificationsTable).values({
        userId: referral.referrerId,
        type: "referral_complete",
        title: "Referral reward earned!",
        message: `${referee?.fullName || "Your referral"} joined a group with 5+ members. You've earned ₦20,000!`,
        read: false,
      });

      // WhatsApp alert to ops team (fire-and-forget)
      const teamNumber = process.env.TEAM_WHATSAPP_NUMBER;
      if (teamNumber) {
        const { whatsappService } = await import("./whatsapp-service");
        whatsappService.sendMessage(
          teamNumber,
          `🎉 *Referral Complete — ₦20,000 Reward*\n` +
          `Referrer: ${referrer?.fullName || referrer?.phoneNumber || "Unknown"}\n` +
          `Referee: ${referee?.fullName || referee?.phoneNumber || "Unknown"}\n` +
          `Group: ${group?.name || groupId}\n` +
          `Date: ${new Date().toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}`
        ).catch(() => {});
      }
    }
  }

  async getOpsOverview() {
    // All referrals with referrer + referee
    const referralRows = await db
      .select({ referral: referralsTable, referrer: usersTable })
      .from(referralsTable)
      .innerJoin(usersTable, eq(referralsTable.referrerId, usersTable.id))
      .orderBy(desc(referralsTable.createdAt));

    const referrals = await Promise.all(referralRows.map(async (row) => {
      const [refereeRow] = await db.select().from(usersTable).where(eq(usersTable.id, row.referral.refereeId)).limit(1);
      return { ...row.referral, referrer: row.referrer, referee: refereeRow };
    }));

    // All contributions with user + group + project names
    const contribRows = await db
      .select({
        contribution: contributionsTable,
        userName: usersTable.fullName,
        userPhone: usersTable.phoneNumber,
        groupName: groupsTable.name,
      })
      .from(contributionsTable)
      .innerJoin(usersTable, eq(contributionsTable.userId, usersTable.id))
      .innerJoin(groupsTable, eq(contributionsTable.groupId, groupsTable.id))
      .orderBy(desc(contributionsTable.createdAt));

    const contributions: ContributionWithDetails[] = contribRows.map(r => ({
      ...r.contribution,
      userName: r.userName || r.userPhone || "Unknown",
      groupName: r.groupName,
    }));

    // Stats
    const [userCount] = await db.select({ count: drizzleSql<number>`count(*)::int` }).from(usersTable);
    const completedReferrals = referrals.filter(r => r.status === "complete").length;
    const pendingReferrals = referrals.filter(r => r.status === "pending").length;
    const pendingProofs = contributions.filter(c => c.status === "pending").length;

    return {
      referrals,
      contributions,
      stats: {
        totalUsers: userCount?.count || 0,
        totalReferrals: referrals.length,
        completedReferrals,
        pendingReferrals,
        totalRewardsOwed: completedReferrals * 20000,
        totalPaymentProofs: contributions.length,
        pendingProofs,
      },
    };
  }

  async savePushSubscription(sub: InsertPushSubscription): Promise<PushSubscription> {
    const existing = await db.select().from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, sub.endpoint)).limit(1);
    if (existing[0]) return existing[0];
    const result = await db.insert(pushSubscriptionsTable).values(sub).returning();
    return result[0];
  }

  async getUserPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.userId, userId));
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, endpoint));
  }
}

// Verified Ajo — DbStorage augmentation
import {
  verificationApplications as verificationApplicationsTable,
  verificationOfficers as verificationOfficersTable,
  verificationAttestations as verificationAttestationsTable,
} from "@shared/schema";

// Declaration merging so TS knows the prototype-added methods exist.
export interface DbStorage {
  getVerificationStatus(groupId: string): Promise<VerificationStatus | null>;
  applyForVerification(groupId: string, payload: SubmitVerificationPayload): Promise<VerificationStatus>;
  getVerificationInbox(userId: string): Promise<VerificationInbox>;
  respondAsOfficer(applicationId: string, payload: OfficerResponsePayload): Promise<void>;
  respondAsAttester(applicationId: string, payload: AttesterResponsePayload): Promise<void>;
}
export interface MemStorage {
  getVerificationStatus(groupId: string): Promise<VerificationStatus | null>;
  applyForVerification(groupId: string, payload: SubmitVerificationPayload): Promise<VerificationStatus>;
  getVerificationInbox(userId: string): Promise<VerificationInbox>;
  respondAsOfficer(applicationId: string, payload: OfficerResponsePayload): Promise<void>;
  respondAsAttester(applicationId: string, payload: AttesterResponsePayload): Promise<void>;
}

const VERIFICATION_MIN_VOUCHES = 5;

const VERIFICATION_MIN_AGE_DAYS = 30;
const VERIFICATION_MIN_MEMBERS = 10;

DbStorage.prototype.getVerificationStatus = async function (groupId: string) {
  const [groupRow] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1);
  if (!groupRow) return null;

  const memberRows = await db.select().from(groupMembersTable).where(eq(groupMembersTable.groupId, groupId));
  const activeMemberCount = memberRows.filter(m => m.status === "active").length;

  const projectRows = await db.select().from(projectsTable).where(eq(projectsTable.groupId, groupId));
  const completedCycleCount = projectRows.filter(p => {
    if (p.status === "completed") return true;
    const target = parseFloat(p.targetAmount || "0");
    const collected = parseFloat(p.collectedAmount || "0");
    return target > 0 && collected >= target;
  }).length;

  const ageDays = Math.floor((Date.now() - new Date(groupRow.createdAt).getTime()) / 86400000);
  const ageOk = ageDays >= VERIFICATION_MIN_AGE_DAYS;
  const membersOk = activeMemberCount >= VERIFICATION_MIN_MEMBERS;
  const cycleOk = completedCycleCount >= 1;
  const eligible = ageOk && membersOk && cycleOk;

  // Latest application (any status) for this group
  const [appRow] = await db.select().from(verificationApplicationsTable)
    .where(eq(verificationApplicationsTable.groupId, groupId))
    .orderBy(desc(verificationApplicationsTable.createdAt))
    .limit(1);

  let application = null as any;
  if (appRow) {
    const officerRows = await db
      .select({ officer: verificationOfficersTable, user: usersTable })
      .from(verificationOfficersTable)
      .innerJoin(usersTable, eq(verificationOfficersTable.userId, usersTable.id))
      .where(eq(verificationOfficersTable.applicationId, appRow.id));
    const attestationRows = await db
      .select({ att: verificationAttestationsTable, user: usersTable })
      .from(verificationAttestationsTable)
      .innerJoin(usersTable, eq(verificationAttestationsTable.attesterId, usersTable.id))
      .where(eq(verificationAttestationsTable.applicationId, appRow.id));
    application = {
      ...appRow,
      officers: officerRows.map(r => ({ ...r.officer, user: r.user })),
      attestations: attestationRows.map(r => ({ ...r.att, attester: r.user })),
    };
  }

  return {
    group: {
      id: groupRow.id,
      name: groupRow.name,
      state: groupRow.state ?? null,
      lga: groupRow.lga ?? null,
      verifiedAt: groupRow.verifiedAt ?? null,
      verificationExpiresAt: groupRow.verificationExpiresAt ?? null,
      publiclyListed: groupRow.publiclyListed ?? true,
    },
    eligibility: {
      eligible,
      ageDays,
      activeMemberCount,
      completedCycleCount,
      requirements: { ageOk, membersOk, cycleOk },
    },
    application,
  };
};

DbStorage.prototype.applyForVerification = async function (groupId: string, payload: SubmitVerificationPayload) {
  const [groupRow] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1);
  if (!groupRow) throw new Error("Group not found");
  if (groupRow.adminId !== payload.submittedBy) {
    throw new Error("Only the group admin can apply for verification");
  }

  // Block re-apply if there's an open or approved application
  const [openApp] = await db.select().from(verificationApplicationsTable)
    .where(and(
      eq(verificationApplicationsTable.groupId, groupId),
      inArray(verificationApplicationsTable.status, ["submitted", "under_review", "info_requested", "approved"]),
    ))
    .limit(1);
  if (openApp) throw new Error("This group already has an active verification application");

  // Validate officer nominees are members of this group
  const memberRows = await db.select().from(groupMembersTable).where(eq(groupMembersTable.groupId, groupId));
  const memberIds = new Set(memberRows.map(m => m.userId));
  for (const uid of payload.officerNominees) {
    if (uid === payload.submittedBy) throw new Error("Officer nominees must be different people from the admin");
    if (!memberIds.has(uid)) throw new Error("Officer nominees must be existing group members");
  }
  if (new Set(payload.officerNominees).size !== payload.officerNominees.length) {
    throw new Error("Officer nominees must be unique");
  }

  // Validate attesters exist and aren't duplicated
  if (new Set(payload.attesters).size !== payload.attesters.length) {
    throw new Error("Attester list must be unique");
  }
  const attesterUsers = await db.select().from(usersTable).where(inArray(usersTable.id, payload.attesters));
  if (attesterUsers.length !== payload.attesters.length) {
    throw new Error("One or more attesters could not be found");
  }

  // Persist locality on the group too (so listing works once approved)
  await db.update(groupsTable).set({ state: payload.state, lga: payload.lga }).where(eq(groupsTable.id, groupId));

  // Insert application
  const [app] = await db.insert(verificationApplicationsTable).values({
    groupId,
    submittedBy: payload.submittedBy,
    status: "submitted",
    state: payload.state,
    lga: payload.lga,
    submittedAt: new Date(),
  }).returning();

  // Officers: admin + 2 nominees
  await db.insert(verificationOfficersTable).values([
    { applicationId: app.id, userId: payload.submittedBy, role: "admin", status: "pending" },
    ...payload.officerNominees.map(uid => ({ applicationId: app.id, userId: uid, role: "officer", status: "pending" })),
  ]);

  // Attestations
  await db.insert(verificationAttestationsTable).values(
    payload.attesters.map(uid => ({ applicationId: app.id, attesterId: uid, status: "pending" }))
  );

  // Notify nominees + attesters
  const allInvitedUsers = [...payload.officerNominees, ...payload.attesters];
  for (const uid of allInvitedUsers) {
    const isOfficer = payload.officerNominees.includes(uid);
    await db.insert(notificationsTable).values({
      userId: uid,
      type: isOfficer ? "verification_officer_invite" : "verification_attester_invite",
      title: isOfficer ? `You've been nominated as a co-officer for ${groupRow.name}` : `${groupRow.name} is asking you to vouch`,
      message: isOfficer
        ? "Open the group and confirm your name + selfie to support their Verified Ajo application."
        : "Tap to vouch (or decline) that you trust this group's admin and members.",
      read: false,
    });
  }

  // Ops alert
  notifyOpsAboutVerification(groupRow.name, payload.state, payload.lga).catch(() => {});

  return (await this.getVerificationStatus(groupId))!;
};

async function notifyOpsAboutVerification(groupName: string, state: string, lga: string) {
  const teamNumber = process.env.TEAM_WHATSAPP_NUMBER;
  if (!teamNumber) return;
  try {
    const { whatsappService } = await import("./whatsapp-service");
    await whatsappService.sendMessage(
      teamNumber,
      `🛡️ *New Verified Ajo application*\nGroup: ${groupName}\nLocation: ${lga}, ${state}\nReview in the Ops dashboard.`
    );
  } catch {}
}

// MemStorage stubs (DbStorage is the active store; MemStorage kept only for type-safety)
DbStorage.prototype.getVerificationInbox = async function (userId: string): Promise<VerificationInbox> {
  // Pending officer invites for this user, joined with the application + group
  const officerRows = await db
    .select({ officer: verificationOfficersTable, app: verificationApplicationsTable, group: groupsTable })
    .from(verificationOfficersTable)
    .innerJoin(verificationApplicationsTable, eq(verificationOfficersTable.applicationId, verificationApplicationsTable.id))
    .innerJoin(groupsTable, eq(verificationApplicationsTable.groupId, groupsTable.id))
    .where(and(
      eq(verificationOfficersTable.userId, userId),
      eq(verificationOfficersTable.status, "pending"),
      inArray(verificationApplicationsTable.status, ["submitted", "under_review", "info_requested"]),
    ));

  const officerInvites = officerRows.map(r => ({
    applicationId: r.app.id,
    group: { id: r.group.id, name: r.group.name },
    role: r.officer.role as "admin" | "officer",
    createdAt: r.officer.createdAt,
  }));

  const attesterRows = await db
    .select({ att: verificationAttestationsTable, app: verificationApplicationsTable, group: groupsTable, admin: usersTable })
    .from(verificationAttestationsTable)
    .innerJoin(verificationApplicationsTable, eq(verificationAttestationsTable.applicationId, verificationApplicationsTable.id))
    .innerJoin(groupsTable, eq(verificationApplicationsTable.groupId, groupsTable.id))
    .innerJoin(usersTable, eq(groupsTable.adminId, usersTable.id))
    .where(and(
      eq(verificationAttestationsTable.attesterId, userId),
      eq(verificationAttestationsTable.status, "pending"),
      inArray(verificationApplicationsTable.status, ["submitted", "under_review", "info_requested"]),
    ));

  const attesterInvites = attesterRows.map(r => ({
    applicationId: r.app.id,
    group: { id: r.group.id, name: r.group.name },
    admin: { id: r.admin.id, fullName: r.admin.fullName },
    createdAt: r.att.createdAt,
  }));

  return { officerInvites, attesterInvites };
};

// Try to advance the application from "submitted" → "under_review" once all
// officers have accepted and we have ≥ MIN_VOUCHES vouches. Idempotent.
async function maybeAdvanceVerificationStatus(applicationId: string) {
  const [appRow] = await db.select().from(verificationApplicationsTable).where(eq(verificationApplicationsTable.id, applicationId)).limit(1);
  if (!appRow || appRow.status !== "submitted") return;

  const officerRows = await db.select().from(verificationOfficersTable).where(eq(verificationOfficersTable.applicationId, applicationId));
  const allOfficersAccepted = officerRows.length > 0 && officerRows.every(o => o.status === "accepted");
  const anyOfficerDeclined = officerRows.some(o => o.status === "declined");

  if (anyOfficerDeclined) return; // Wait — admin will need to handle this; reviewer can also see it

  const attestationRows = await db.select().from(verificationAttestationsTable).where(eq(verificationAttestationsTable.applicationId, applicationId));
  const vouchedCount = attestationRows.filter(a => a.status === "vouched").length;

  if (allOfficersAccepted && vouchedCount >= VERIFICATION_MIN_VOUCHES) {
    await db.update(verificationApplicationsTable).set({ status: "under_review" }).where(eq(verificationApplicationsTable.id, applicationId));

    const [groupRow] = await db.select().from(groupsTable).where(eq(groupsTable.id, appRow.groupId)).limit(1);
    if (groupRow) {
      await db.insert(notificationsTable).values({
        userId: appRow.submittedBy,
        type: "verification_under_review",
        title: `${groupRow.name}: Verification application is now under review`,
        message: "All officers confirmed and enough vouches received. Our team is reviewing your application.",
        read: false,
      });
    }
  }
}

DbStorage.prototype.respondAsOfficer = async function (applicationId: string, payload: OfficerResponsePayload) {
  const [officerRow] = await db.select().from(verificationOfficersTable)
    .where(and(
      eq(verificationOfficersTable.applicationId, applicationId),
      eq(verificationOfficersTable.userId, payload.userId),
    )).limit(1);
  if (!officerRow) throw new Error("You are not a nominated officer for this application");
  if (officerRow.status !== "pending") throw new Error("You've already responded to this invite");

  if (payload.action === "decline") {
    await db.update(verificationOfficersTable).set({
      status: "declined", respondedAt: new Date(),
    }).where(eq(verificationOfficersTable.id, officerRow.id));

    // Notify the admin so they can re-nominate
    const [appRow] = await db.select().from(verificationApplicationsTable).where(eq(verificationApplicationsTable.id, applicationId)).limit(1);
    if (appRow) {
      const [groupRow] = await db.select().from(groupsTable).where(eq(groupsTable.id, appRow.groupId)).limit(1);
      await db.insert(notificationsTable).values({
        userId: appRow.submittedBy,
        type: "verification_officer_declined",
        title: `An officer declined your verification request for ${groupRow?.name ?? "your group"}`,
        message: "Reach out to a different group member and we'll let you nominate a replacement soon.",
        read: false,
      });
    }
    return;
  }

  // Accept — capture legal name + selfie on the officer row AND on the user profile
  await db.update(verificationOfficersTable).set({
    status: "accepted",
    legalName: payload.legalName,
    selfieUrl: payload.selfie,
    respondedAt: new Date(),
  }).where(eq(verificationOfficersTable.id, officerRow.id));

  await db.update(usersTable).set({
    legalName: payload.legalName,
    selfieUrl: payload.selfie,
  }).where(eq(usersTable.id, payload.userId));

  await maybeAdvanceVerificationStatus(applicationId);
};

DbStorage.prototype.respondAsAttester = async function (applicationId: string, payload: AttesterResponsePayload) {
  const [attRow] = await db.select().from(verificationAttestationsTable)
    .where(and(
      eq(verificationAttestationsTable.applicationId, applicationId),
      eq(verificationAttestationsTable.attesterId, payload.userId),
    )).limit(1);
  if (!attRow) throw new Error("You are not an attester for this application");
  if (attRow.status !== "pending") throw new Error("You've already responded to this invite");

  await db.update(verificationAttestationsTable).set({
    status: payload.action === "vouch" ? "vouched" : "declined",
    respondedAt: new Date(),
  }).where(eq(verificationAttestationsTable.id, attRow.id));

  if (payload.action === "vouch") {
    await maybeAdvanceVerificationStatus(applicationId);
  }
};

MemStorage.prototype.getVerificationInbox = async function () { return { officerInvites: [], attesterInvites: [] }; };
MemStorage.prototype.respondAsOfficer = async function () { throw new Error("Verified Ajo not supported on MemStorage"); };
MemStorage.prototype.respondAsAttester = async function () { throw new Error("Verified Ajo not supported on MemStorage"); };

MemStorage.prototype.getVerificationStatus = async function () {
  throw new Error("Verified Ajo not supported on MemStorage");
};
MemStorage.prototype.applyForVerification = async function () {
  throw new Error("Verified Ajo not supported on MemStorage");
};

export const storage = new DbStorage();
