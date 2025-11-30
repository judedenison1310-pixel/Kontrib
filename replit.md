# Kontrib - Financial Group Management System

## Overview
Kontrib is a full-stack web application for managing group financial contributions in Nigeria. It enables administrators to create contribution groups and projects, while members can join and make secure payments. The platform aims to provide transparent tracking, secure transactions, and efficient communication, aspiring to be the leading solution for community and group contributions in Nigeria.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript and Vite, leveraging Shadcn/UI (based on Radix UI) and Tailwind CSS. It features a custom Nigerian-themed color palette and a mobile-first design, including dynamic Open Graph meta tags for social sharing.

### Technical Implementations
- **Frontend**: Utilizes React Query for state management, Wouter for routing, and React Hook Form with Zod for form validation. Client-side authentication is handled via `localStorage` with backend validation on page load.
- **Backend**: Built with Node.js and Express.js, featuring Drizzle ORM for type-safe database operations and Zod for shared validation schemas.
- **Authentication**: WhatsApp OTP authentication with device remembering. Flow: phone entry → OTP verification → profile completion (new users) → role selection. Device tokens (90-day expiry) enable automatic login on trusted devices. Sessions validated via device token on page refresh with graceful fallback. Role-based access control (Admin/Member) with global phone number validation.
- **Payment Processing**: Members upload proof of payment for admin approval; the system tracks transactions, progress, and payment history.

### Feature Specifications
- **Dual-Role System**: Users with one WhatsApp number can be admin of some groups and member of others. The `/api/groups/all/:userId` endpoint returns all groups with role metadata ("admin", "member", "both"). Dashboard shows separate "Groups You Manage" and "Your Contributions" sections. Group details page displays tabs for dual-role users.
- **Group Management**: Admins can create groups with custom URLs, generate registration links, and manage group statuses. When an admin creates a group, they are automatically added as the first group member.
- **Member Management**: Dedicated members page (/group/:id/members) shows all group members with name and phone. Admins can remove members with one click; removed members receive an in-app notification immediately.
- **Project Type System**: Projects support multiple types - Target Goal (with target amount and progress tracking), Monthly Dues, Yearly Levy, Event, and Emergency. Monthly/Yearly types have no target amount and hide progress bars.
- **Dedicated Project Pages**: Each project has its own page (/project/:id) with full details, contributors list, and payment information. Projects are clickable from group pages.
- **Payment Account Details**: Admins can specify bank account details (Bank Name, Account Number, Account Name, Additional Instructions) when creating projects. These details are displayed to members with copy-to-clipboard buttons.
- **WhatsApp Integration**: Generates professional sharing messages and dynamic Open Graph meta tags.
- **Unified My Groups Page**: Single entry point for all users at /groups. Shows all groups with role badges (Admin in green, Member in blue). Filter pills allow filtering by All, Admin, or Member roles.
- **Simplified Navigation**: Three main navigation links: My Groups, Pay, History. Logo links directly to /groups. Old dashboard routes (/dashboard, /admin) redirect to /groups.
- **Project Contribution Transparency**: Members can view detailed contributor lists for any project, showing all confirmed contributions sorted by amount, total contributions, and remaining balance.
- **Unified Groups Page**: Single "My Groups" page with filter pills (All, Admin, Member) to filter groups by role. Each group card shows role badges and context-aware action buttons.

### System Design Choices
- **Database**: PostgreSQL with Drizzle ORM for a relational schema (Users, Groups, Members, Contributions, OTPs).
- **Modularity**: Designed for scalability and maintainability of frontend and backend components.
- **Environment Configuration**: Supports development and production environments using environment variables.

## External Dependencies
- **@neondatabase/serverless**: PostgreSQL driver.
- **drizzle-orm**: Type-safe ORM.
- **@tanstack/react-query**: Server state management.
- **@radix-ui/...**: Accessible UI component primitives.
- **wouter**: Lightweight React router.
- **PostgreSQL**: Primary database.
- **Drizzle Kit**: Database migration and schema management.
- **TypeScript**: Static type checking.
- **Vite**: Build tool and development server.
- **Tailwind CSS**: Utility-first CSS framework.
- **canvas**: Node.js Canvas API for dynamic image generation.