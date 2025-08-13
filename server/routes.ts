import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertGroupSchema, insertGroupMemberSchema,
  insertPurseSchema, insertAccountabilityPartnerSchema, insertContributionSchema,
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
      
      res.json(group);
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

  // Purse routes
  app.get("/api/groups/:groupId/purses", async (req, res) => {
    try {
      const { groupId } = req.params;
      const purses = await storage.getPursesByGroup(groupId);
      res.json(purses);
    } catch (error) {
      console.error("Get group purses error:", error);
      res.status(500).json({ message: "Failed to fetch purses" });
    }
  });

  app.get("/api/purses/slug/:groupSlug/:purseSlug", async (req, res) => {
    try {
      const { groupSlug, purseSlug } = req.params;
      const customSlug = `${groupSlug}/${purseSlug}`;
      const purse = await storage.getPurseByCustomSlug(customSlug);
      
      if (!purse) {
        return res.status(404).json({ message: "Purse not found" });
      }
      
      res.json(purse);
    } catch (error) {
      console.error("Get purse by slug error:", error);
      res.status(500).json({ message: "Failed to fetch purse" });
    }
  });

  app.post("/api/groups/:groupId/purses", async (req, res) => {
    try {
      const { groupId } = req.params;
      const purseData = { ...req.body, groupId };
      
      // Handle deadline conversion - ensure it's a Date object
      if (purseData.deadline && typeof purseData.deadline === 'string') {
        purseData.deadline = new Date(purseData.deadline);
      }
      
      const purse = await storage.createPurse(purseData);
      res.json(purse);
    } catch (error) {
      console.error("Create purse error:", error);
      res.status(400).json({ message: "Invalid purse data" });
    }
  });

  app.get("/api/purses/:purseId", async (req, res) => {
    try {
      const { purseId } = req.params;
      const purse = await storage.getPurse(purseId);
      if (!purse) {
        return res.status(404).json({ message: "Purse not found" });
      }
      res.json(purse);
    } catch (error) {
      console.error("Get purse error:", error);
      res.status(500).json({ message: "Failed to fetch purse" });
    }
  });

  app.patch("/api/purses/:purseId", async (req, res) => {
    try {
      const { purseId } = req.params;
      const updates = { ...req.body };
      
      // Handle deadline conversion
      if (updates.deadline) {
        updates.deadline = new Date(updates.deadline);
      }
      
      const purse = await storage.updatePurse(purseId, updates);
      if (!purse) {
        return res.status(404).json({ message: "Purse not found" });
      }
      res.json(purse);
    } catch (error) {
      console.error("Update purse error:", error);
      res.status(400).json({ message: "Failed to update purse" });
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

  app.get("/api/contributions/purse/:purseId", async (req, res) => {
    try {
      const { purseId } = req.params;
      const contributions = await storage.getPurseContributions(purseId);
      res.json(contributions);
    } catch (error) {
      console.error("Get purse contributions error:", error);
      res.status(500).json({ message: "Failed to fetch purse contributions" });
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
      
      // Generate random 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set expiration to 10 minutes from now
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      
      const otpVerification = await storage.createOtpVerification({
        phoneNumber,
        otp,
        expiresAt
      });
      
      // In a real application, you would send the OTP via SMS
      // For development, we'll return it in the response
      console.log(`OTP for ${phoneNumber}: ${otp}`);
      
      res.json({ 
        message: "OTP sent successfully",
        // Remove this in production - only for development
        developmentOtp: otp,
        expiresAt: otpVerification.expiresAt
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

  const httpServer = createServer(app);
  return httpServer;
}
