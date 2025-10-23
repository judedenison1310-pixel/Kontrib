# Kontrib - Financial Group Management System

## Overview

Kontrib is a full-stack web application designed for managing group financial contributions in Nigeria. It provides a platform where administrators can create contribution groups with specific projects, and members can join these groups and make payments towards projects. The application features a modern React frontend with a Node.js/Express backend, using PostgreSQL for data persistence. Kontrib aims to streamline group financial management, offering tools for transparent tracking, secure payments, and easy communication, with a vision to become the leading platform for community and group contributions in Nigeria.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18 with TypeScript, built using Vite. It employs Shadcn/UI components based on Radix UI primitives and styled with Tailwind CSS, featuring a custom Nigerian-themed color palette. The design prioritizes a mobile-first approach, especially for features like WhatsApp link sharing. Recent UI updates include a card-style join page with visual progress indicators and dynamic Open Graph meta tags for enhanced social sharing previews.

### Technical Implementations
The application follows a component-based architecture for the frontend and a RESTful API pattern for the backend.
- **Frontend**: State management is handled by React Query, routing by Wouter, and form validation by React Hook Form with Zod. Client-side authentication uses `localStorage`.
- **Backend**: Built with Node.js and Express.js, using Drizzle ORM for type-safe database operations and Zod for validation schemas shared across the stack. It supports hot reload for development.
- **Authentication**: Features an SMS-based OTP-only authentication system, eliminating passwords. It supports role-based access control (Admin/Member) and registration, with global phone number validation.
- **Payment Processing**: Members can upload proof of payment, which requires admin approval. The system tracks transactions, progress towards goals, and provides payment history.

### Feature Specifications
- **Group Management**: Admins can create groups with custom URLs (e.g., `kontrib.app/groupname`), generate unique registration links, and manage group statuses (active, completed, paused).
- **Hierarchical Project Management**: Financial goals, target amounts, and deadlines are managed at the project level, within groups. Projects have hierarchical URLs (e.g., `kontrib.app/groupname/projectname`).
- **Enhanced WhatsApp Integration**: Generates professional sharing messages and supports dynamic Open Graph meta tags for rich link previews.
- **Dashboard System**: Separate dashboards for Admins (group management, member oversight, financial analytics) and Members (joined groups, payment history, contribution tracking).
- **Role-Based Navigation**: Navigation menus adapt based on user roles (Admin vs. Member).

### System Design Choices
- **Database**: PostgreSQL is used with Drizzle ORM for a well-structured relational schema, including tables for Users, Groups, Group Members, Contributions, and OTP Verifications.
- **Modularity**: The architecture is designed for easy scaling and maintenance of both frontend and backend components.
- **Environment Configuration**: Configured for development and production environments, with database connection via environment variables.

## External Dependencies

- **@neondatabase/serverless**: PostgreSQL driver for serverless environments.
- **drizzle-orm**: Type-safe ORM for database interactions.
- **@tanstack/react-query**: Server state management and caching.
- **@radix-ui/…**: Accessible UI component primitives.
- **wouter**: Lightweight React router.
- **PostgreSQL**: Primary database for data persistence.
- **Drizzle Kit**: Tooling for database migrations and schema management.
- **TypeScript**: Used for static type checking across the full stack.
- **Vite**: Fast build tool and development server.
- **Tailwind CSS**: Utility-first CSS framework.
- **canvas**: Node.js Canvas API implementation for dynamic image generation.

## Recent Technical Updates

### Dynamic OG Image Generation (October 22-23, 2025)
Implemented visual WhatsApp link previews that display the Join Card design instead of generic text. When users share group links on WhatsApp, Facebook, or Twitter, the preview now shows a dynamically generated image featuring:
- Official Kontrib logo (centered at top)
- Group name and project details
- Progress bar with Nigerian English phrasing ("don enter", "out of")
- Deadline countdown and member count
- Professional card-style layout matching the Join Page design

**Technical Implementation:**
- Canvas-based PNG generation (1200x630px) at `/api/og-image/:identifier`
- Official Kontrib logo loaded from `server/assets/kontrib-logo.jpg`
- OG middleware updated to serve dynamic image URLs to social media crawlers
- 24-hour browser caching for optimal performance
- Text truncation and progress bar clamping for edge cases
- System dependencies: libuuid, cairo, pango, libpng, libjpeg
- Fallback hexagon logo if official logo fails to load