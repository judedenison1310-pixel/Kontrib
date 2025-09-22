import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { whatsappService } from "./whatsapp-service";
import { 
  insertUserSchema, insertGroupSchema, insertGroupMemberSchema,
  insertProjectSchema, insertAccountabilityPartnerSchema, insertContributionSchema,
  insertNotificationSchema, insertOtpVerificationSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser(userData);
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Group routes
  app.get("/api/groups/admin/:adminId", async (req, res) => {
    try {
      const { adminId } = req.params;
      const groups = await storage.getGroupsByAdmin(adminId);
      res.json(groups);
    } catch (error) {
      console.error("Get admin groups error:", error);
      res.status(500).json({ message: "Failed to fetch groups" });
    }
  });

  app.get("/api/groups/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const userGroups = await storage.getUserGroups(userId);
      res.json(userGroups);
    } catch (error) {
      console.error("Get user groups error:", error);
      res.status(500).json({ message: "Failed to fetch user groups" });
    }
  });

  app.get("/api/groups/registration/:link", async (req, res) => {
    try {
      const { link } = req.params;
      const group = await storage.getGroupByRegistrationLink(link);
      
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      // Get projects for this group
      const projects = await storage.getProjectsByGroup(group.id);
      
      // Get member count
      const members = await storage.getGroupMembers(group.id);
      
      // Calculate totals across all projects
      const totalTarget = projects.reduce((sum: number, project: any) => 
        sum + parseFloat(project.targetAmount || "0"), 0
      ).toString();
      
      const totalCollected = projects.reduce((sum: number, project: any) => 
        sum + parseFloat(project.collectedAmount || "0"), 0
      ).toString();
      
      const landingData = {
        group,
        projects: projects.map((project: any) => ({
          id: project.id,
          name: project.name,
          targetAmount: project.targetAmount,
          collectedAmount: project.collectedAmount,
          deadline: project.deadline
        })),
        memberCount: members.length,
        totalTarget,
        totalCollected
      };
      
      res.json(landingData);
    } catch (error) {
      console.error("Get group by link error:", error);
      res.status(500).json({ message: "Failed to fetch group" });
    }
  });

  app.get("/api/groups/slug/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const group = await storage.getGroupByCustomSlug(slug);
      
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      res.json(group);
    } catch (error) {
      console.error("Get group by custom slug error:", error);
      res.status(500).json({ message: "Failed to fetch group" });
    }
  });

  app.post("/api/groups", async (req, res) => {
    try {
      const { adminId, deadline, ...restData } = req.body;
      
      if (!adminId) {
        return res.status(400).json({ message: "Admin ID is required" });
      }
      
      // Convert deadline string to Date if provided
      const processedData = {
        ...restData,
        deadline: deadline ? new Date(deadline) : null,
      };
      
      // Skip validation for deadline field and validate the rest
      const groupData = { ...processedData };
      const group = await storage.createGroup(groupData, adminId);
      res.json(group);
    } catch (error) {
      console.error("Create group error:", error);
      res.status(400).json({ message: "Invalid group data" });
    }
  });

  app.post("/api/groups/:groupId/join", async (req, res) => {
    try {
      const { groupId } = req.params;
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      // Check if user is already a member
      const existingMember = await storage.getGroupMember(groupId, userId);
      if (existingMember) {
        return res.status(400).json({ message: "User is already a member of this group" });
      }
      
      const membership = await storage.addGroupMember({ groupId, userId });
      
      // Get group and new member details for notification
      const group = await storage.getGroup(groupId);
      const user = await storage.getUser(userId);
      
      if (group && user) {
        // Create notification for group admin about new member
        await storage.createNotification({
          userId: group.adminId,
          type: "member_joined",
          title: "New Member Joined",
          message: `${user.fullName} (@${user.username}) has joined your group "${group.name}"`
        });
      }
      
      res.json(membership);
    } catch (error) {
      console.error("Join group error:", error);
      res.status(500).json({ message: "Failed to join group" });
    }
  });

  app.get("/api/groups/:groupId/members", async (req, res) => {
    try {
      const { groupId } = req.params;
      const members = await storage.getGroupMembers(groupId);
      res.json(members);
    } catch (error) {
      console.error("Get group members error:", error);
      res.status(500).json({ message: "Failed to fetch group members" });
    }
  });

  // Project routes
  app.get("/api/groups/:groupId/projects", async (req, res) => {
    try {
      const { groupId } = req.params;
      const projects = await storage.getProjectsByGroup(groupId);
      res.json(projects);
    } catch (error) {
      console.error("Get group projects error:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/slug/:groupSlug/:projectSlug", async (req, res) => {
    try {
      const { groupSlug, projectSlug } = req.params;
      const customSlug = `${groupSlug}/${projectSlug}`;
      const project = await storage.getProjectByCustomSlug(customSlug);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      console.error("Get project by slug error:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/groups/:groupId/projects", async (req, res) => {
    try {
      const { groupId } = req.params;
      const projectData = { ...req.body, groupId };
      
      // Handle deadline conversion - ensure it's a Date object
      if (projectData.deadline && typeof projectData.deadline === 'string') {
        projectData.deadline = new Date(projectData.deadline);
      }
      
      const project = await storage.createProject(projectData);
      res.json(project);
    } catch (error) {
      console.error("Create project error:", error);
      res.status(400).json({ message: "Invalid project data" });
    }
  });

  app.get("/api/projects/:projectId", async (req, res) => {
    try {
      const { projectId } = req.params;
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Get project error:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.patch("/api/projects/:projectId", async (req, res) => {
    try {
      const { projectId } = req.params;
      const updates = { ...req.body };
      
      // Handle deadline conversion
      if (updates.deadline) {
        updates.deadline = new Date(updates.deadline);
      }
      
      const project = await storage.updateProject(projectId, updates);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Update project error:", error);
      res.status(400).json({ message: "Failed to update project" });
    }
  });

  // Accountability Partner routes
  app.get("/api/groups/:groupId/accountability-partners", async (req, res) => {
    try {
      const { groupId } = req.params;
      const partners = await storage.getGroupAccountabilityPartners(groupId);
      res.json(partners);
    } catch (error) {
      console.error("Get accountability partners error:", error);
      res.status(500).json({ message: "Failed to fetch accountability partners" });
    }
  });

  app.post("/api/groups/:groupId/accountability-partners", async (req, res) => {
    try {
      const { groupId } = req.params;
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      // Check if user is already an accountability partner
      const existingPartners = await storage.getGroupAccountabilityPartners(groupId);
      if (existingPartners.length >= 2) {
        return res.status(400).json({ message: "Maximum 2 accountability partners allowed per group" });
      }
      
      if (existingPartners.some(p => p.userId === userId)) {
        return res.status(400).json({ message: "User is already an accountability partner" });
      }
      
      const partner = await storage.addAccountabilityPartner({ groupId, userId });
      res.json(partner);
    } catch (error) {
      console.error("Add accountability partner error:", error);
      res.status(500).json({ message: "Failed to add accountability partner" });
    }
  });

  app.delete("/api/groups/:groupId/accountability-partners/:userId", async (req, res) => {
    try {
      const { groupId, userId } = req.params;
      const success = await storage.removeAccountabilityPartner(groupId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Accountability partner not found" });
      }
      
      res.json({ message: "Accountability partner removed successfully" });
    } catch (error) {
      console.error("Remove accountability partner error:", error);
      res.status(500).json({ message: "Failed to remove accountability partner" });
    }
  });

  // Contribution routes
  app.get("/api/contributions/group/:groupId", async (req, res) => {
    try {
      const { groupId } = req.params;
      const contributions = await storage.getGroupContributions(groupId);
      res.json(contributions);
    } catch (error) {
      console.error("Get group contributions error:", error);
      res.status(500).json({ message: "Failed to fetch contributions" });
    }
  });

  app.get("/api/contributions/project/:projectId", async (req, res) => {
    try {
      const { projectId } = req.params;
      const contributions = await storage.getProjectContributions(projectId);
      res.json(contributions);
    } catch (error) {
      console.error("Get project contributions error:", error);
      res.status(500).json({ message: "Failed to fetch project contributions" });
    }
  });

  app.get("/api/contributions/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const contributions = await storage.getUserContributions(userId);
      res.json(contributions);
    } catch (error) {
      console.error("Get user contributions error:", error);
      res.status(500).json({ message: "Failed to fetch contributions" });
    }
  });

  app.get("/api/contributions/admin/:adminId", async (req, res) => {
    try {
      const { adminId } = req.params;
      const contributions = await storage.getAdminContributions(adminId);
      res.json(contributions);
    } catch (error) {
      console.error("Get admin contributions error:", error);
      res.status(500).json({ message: "Failed to fetch admin contributions" });
    }
  });

  app.post("/api/contributions", async (req, res) => {
    try {
      console.log("Received contribution data:", req.body);
      const contributionData = insertContributionSchema.parse(req.body);
      console.log("Parsed contribution data:", contributionData);
      const contribution = await storage.createContribution(contributionData);
      res.json(contribution);
    } catch (error) {
      console.error("Create contribution error:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
      }
      res.status(400).json({ 
        message: "Invalid contribution data",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.patch("/api/contributions/:id/confirm", async (req, res) => {
    try {
      const { id } = req.params;
      const contribution = await storage.confirmContribution(id);
      if (!contribution) {
        return res.status(404).json({ message: "Contribution not found" });
      }
      res.json(contribution);
    } catch (error) {
      console.error("Confirm contribution error:", error);
      res.status(500).json({ message: "Failed to confirm contribution" });
    }
  });

  app.patch("/api/contributions/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const contribution = await storage.updateContribution(id, { 
        status: "rejected" 
      });
      
      if (!contribution) {
        return res.status(404).json({ message: "Contribution not found" });
      }

      // Send rejection notification
      await storage.createRejectionNotification(contribution, reason);
      
      res.json(contribution);
    } catch (error) {
      console.error("Reject contribution error:", error);
      res.status(500).json({ message: "Failed to reject contribution" });
    }
  });

  // Notification routes
  app.get("/api/notifications/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.markNotificationRead(id);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Stats routes
  app.get("/api/stats/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Get user stats error:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  app.get("/api/stats/admin/:adminId", async (req, res) => {
    try {
      const { adminId } = req.params;
      const stats = await storage.getAdminStats(adminId);
      res.json(stats);
    } catch (error) {
      console.error("Get admin stats error:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  // OTP Verification routes
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }
      
      // Validate WhatsApp number format
      if (!whatsappService.isValidWhatsAppNumber(phoneNumber)) {
        return res.status(400).json({ 
          message: "Please enter a valid WhatsApp number with country code (e.g., +234, +1, +44)" 
        });
      }
      
      // Generate random 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set expiration to 10 minutes from now
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      
      const otpVerification = await storage.createOtpVerification({
        phoneNumber,
        otp,
        expiresAt
      });
      
      // Send OTP via WhatsApp
      const sent = await whatsappService.sendOTP(phoneNumber, otp);
      const isDevelopment = process.env.NODE_ENV === "development";
      
      if (!sent) {
        console.error("Failed to send WhatsApp OTP, using fallback");
        
        // In development, allow testing even if WhatsApp fails
        if (isDevelopment) {
          console.log(`Development OTP for ${phoneNumber}: ${otp}`);
          return res.json({ 
            message: "OTP sent successfully (development mode)",
            expiresAt: otpVerification.expiresAt,
            developmentOtp: otp,
            fallback: true
          });
        }
        
        // In production, return error but don't expose OTP
        return res.status(503).json({ 
          message: "Unable to send WhatsApp message. Please check your WhatsApp number and try again." 
        });
      }
      
      // When WhatsApp sending is successful, behave like production (no OTP in response)
      res.json({ 
        message: "OTP sent successfully via WhatsApp",
        expiresAt: otpVerification.expiresAt
        // OTP codes are not included in response when WhatsApp delivery is successful
      });
    } catch (error) {
      console.error("Send OTP error:", error);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { phoneNumber, otp } = req.body;
      
      if (!phoneNumber || !otp) {
        return res.status(400).json({ message: "Phone number and OTP are required" });
      }
      
      const isValid = await storage.verifyOtp(phoneNumber, otp);
      
      if (isValid) {
        res.json({ message: "OTP verified successfully", verified: true });
      } else {
        res.status(400).json({ message: "Invalid or expired OTP", verified: false });
      }
    } catch (error) {
      console.error("Verify OTP error:", error);
      res.status(500).json({ message: "OTP verification failed" });
    }
  });

  // Group registration with OTP verification
  app.post("/api/groups/:groupId/register-with-otp", async (req, res) => {
    try {
      const { groupId } = req.params;
      const { username, fullName, phoneNumber, otp } = req.body;
      
      if (!username || !fullName || !phoneNumber || !otp) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      // Verify OTP first
      const isOtpValid = await storage.verifyOtp(phoneNumber, otp);
      if (!isOtpValid) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check if group exists
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Create user without password (OTP-based auth)
      const user = await storage.createUser({
        username,
        fullName,
        phoneNumber,
        password: "otp-auth", // Special marker for OTP-only accounts
        role: "member"
      });
      
      // Add user to group
      await storage.addGroupMember({
        groupId,
        userId: user.id
      });
      
      res.json({ 
        message: "Registration successful",
        user: { ...user, password: undefined },
        group
      });
    } catch (error) {
      console.error("Group registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Send login OTP route
  app.post("/api/auth/send-login-otp", async (req, res) => {
    try {
      const { username, phoneNumber } = req.body;
      
      if (!username || !phoneNumber) {
        return res.status(400).json({ message: "Username and phone number are required" });
      }
      
      // Validate WhatsApp number format
      if (!whatsappService.isValidWhatsAppNumber(phoneNumber)) {
        return res.status(400).json({ 
          message: "Please enter a valid WhatsApp number with country code (e.g., +234, +1, +44)" 
        });
      }
      
      // Check if user exists with this username and phone number
      const user = await storage.getUserByUsername(username);
      if (!user || user.phoneNumber !== phoneNumber) {
        return res.status(400).json({ message: "Invalid username or phone number" });
      }
      
      // Generate and send OTP using existing storage method
      const otpData = await storage.sendOtp(phoneNumber);
      
      // When WhatsApp sending is successful, behave like production (no OTP in response)
      res.json({
        message: "Login OTP sent successfully via WhatsApp",
        expiresAt: otpData.expiresAt
        // OTP codes are not included in response when WhatsApp delivery is successful
      });
    } catch (error) {
      console.error("Send login OTP error:", error);
      res.status(500).json({ message: "Failed to send login OTP" });
    }
  });

  // Login with OTP route
  app.post("/api/auth/login-with-otp", async (req, res) => {
    try {
      const { username, phoneNumber, otp } = req.body;
      
      if (!username || !phoneNumber || !otp) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      // Verify OTP first
      const isOtpValid = await storage.verifyOtp(phoneNumber, otp);
      if (!isOtpValid) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }
      
      // Get user by username and verify phone number
      const user = await storage.getUserByUsername(username);
      if (!user || user.phoneNumber !== phoneNumber) {
        return res.status(400).json({ message: "Invalid login credentials" });
      }
      
      res.json({ 
        message: "Login successful",
        user: { ...user, password: undefined }
      });
    } catch (error) {
      console.error("Login with OTP error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // OTP-based registration route
  app.post("/api/auth/register-with-otp", async (req, res) => {
    try {
      const { username, fullName, phoneNumber, otp, role } = req.body;
      
      if (!username || !fullName || !phoneNumber || !otp) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      // Verify OTP first
      const isOtpValid = await storage.verifyOtp(phoneNumber, otp);
      if (!isOtpValid) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Create user with OTP auth
      const user = await storage.createUser({
        username,
        fullName,
        phoneNumber,
        password: "otp-auth", // OTP-based auth marker
        role: role || "member"
      });
      
      res.json({ 
        message: "Registration successful",
        user: { ...user, password: undefined }
      });
    } catch (error) {
      console.error("OTP registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Bank details endpoint for payment instructions
  app.get("/api/bank-details/:projectId", async (req, res) => {
    try {
      const { projectId } = req.params;
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const group = await storage.getGroup(project.groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      const admin = await storage.getUser(group.adminId);
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }
      
      // Mock bank details for demo - in production this would come from admin settings
      const bankDetails = {
        bankName: "Access Bank",
        accountNumber: "0123456789", 
        accountName: admin.fullName || "Admin User"
      };
      
      res.json(bankDetails);
    } catch (error) {
      console.error("Get bank details error:", error);
      res.status(500).json({ message: "Failed to fetch bank details" });
    }
  });

  // Member projects endpoint for payment selection
  app.get("/api/contributions/member/:userId/projects", async (req, res) => {
    try {
      const { userId } = req.params;
      const memberGroups = await storage.getUserGroups(userId);
      const projects = [];
      
      for (const groupMember of memberGroups) {
        const group = await storage.getGroup(groupMember.groupId);
        const groupProjects = await storage.getProjectsByGroup(groupMember.groupId);
        
        for (const project of groupProjects) {
          projects.push({
            id: project.id,
            name: project.name,
            targetAmount: project.targetAmount,
            collectedAmount: project.collectedAmount,
            deadline: project.deadline,
            groupId: group?.id,
            groupName: group?.name
          });
        }
      }
      
      res.json(projects);
    } catch (error) {
      console.error("Get member projects error:", error);
      res.status(500).json({ message: "Failed to fetch member projects" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
