import { 
  type User, 
  type Group, 
  type GroupMember, 
  type Project,
  type AccountabilityPartner,
  type Contribution,
  type Notification,
  type OtpVerification,
  type InsertUser, 
  type InsertGroup, 
  type InsertGroupMember, 
  type InsertProject,
  type InsertAccountabilityPartner,
  type InsertContribution,
  type InsertNotification,
  type InsertOtpVerification,
  type GroupWithStats,
  type MemberWithContributions,
  type ContributionWithDetails,
  type ProjectWithStats,
  type AccountabilityPartnerWithDetails
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Group methods
  getGroup(id: string): Promise<Group | undefined>;
  getGroupByRegistrationLink(link: string): Promise<Group | undefined>;
  getGroupByCustomSlug(slug: string): Promise<Group | undefined>;
  getGroupsByAdmin(adminId: string): Promise<GroupWithStats[]>;
  createGroup(group: InsertGroup, adminId: string): Promise<Group>;
  updateGroup(id: string, updates: Partial<Group>): Promise<Group | undefined>;
  
  // Group member methods
  getGroupMembers(groupId: string): Promise<(GroupMember & { user: User })[]>;
  getUserGroups(userId: string): Promise<(GroupMember & { group: Group })[]>;
  addGroupMember(member: InsertGroupMember): Promise<GroupMember>;
  getGroupMember(groupId: string, userId: string): Promise<GroupMember | undefined>;
  
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
  
  getUserContributions(userId: string): Promise<ContributionWithDetails[]>;
  getAdminContributions(adminId: string): Promise<ContributionWithDetails[]>;
  updateContribution(id: string, updates: Partial<Contribution>): Promise<Contribution | undefined>;
  
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

  constructor() {
    this.users = new Map();
    this.groups = new Map();
    this.groupMembers = new Map();
    this.projects = new Map();
    this.accountabilityPartners = new Map();
    this.contributions = new Map();
    this.notifications = new Map();
    this.otpVerifications = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
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
        pendingPayments
      };
    });
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
      const customUrl = `kontrib.app/join/${registrationLink}`;
      const message = `🎉 Join "${insertGroup.name}" on Kontrib!\n\nManage group contributions with transparency and ease.\n\n👉 Register here: ${customUrl}\n\n#Kontrib #GroupContributions`;
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
      createdAt: new Date(),
      whatsappLink,
    };
    // Automatically add admin as first group member
    await this.addGroupMember({
      groupId: id,
      userId: adminId,
    });
    this.groups.set(id, group);
    return group;
  }

  async updateGroup(id: string, updates: Partial<Group>): Promise<Group | undefined> {
    const group = this.groups.get(id);
    if (!group) return undefined;
    
    const updatedGroup = { ...group, ...updates };
    this.groups.set(id, updatedGroup);
    return updatedGroup;
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
        pendingPayments
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
}

// Database Storage implementation using Drizzle ORM
import { db } from "./db";
import { users as usersTable, groups as groupsTable, groupMembers as groupMembersTable, projects as projectsTable, accountabilityPartners as accountabilityPartnersTable, contributions as contributionsTable, notifications as notificationsTable, otpVerifications as otpVerificationsTable } from "@shared/schema";
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
        pendingPayments
      };
    }));

    return groupsWithStats;
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
      const customUrl = `kontrib.app/join/${registrationLink}`;
      const message = `🎉 Join "${insertGroup.name}" on Kontrib!\n\nManage group contributions with transparency and ease.\n\n👉 Register here: ${customUrl}\n\n#Kontrib #GroupContributions`;
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
      userName: row.users!.username,
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
      userName: row.users!.username,
      groupName: row.groups!.name,
      projectName: row.projects?.name
    }));
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
      userName: row.users!.username,
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
      userName: row.users!.username,
      groupName: row.groups!.name,
      projectName: row.projects?.name
    }));
  }

  async updateContribution(id: string, updates: Partial<Contribution>): Promise<Contribution | undefined> {
    const result = await db.update(contributionsTable).set(updates).where(eq(contributionsTable.id, id)).returning();
    return result[0];
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
}

export const storage = new DbStorage();
