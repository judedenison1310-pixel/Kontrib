# Kontrib - Financial Group Management System

## Overview
Kontrib is a full-stack web application designed for managing group financial contributions in Nigeria. It provides a platform for administrators to establish and manage contribution groups and projects, while members can securely join and make payments. The system prioritizes transparent tracking, secure transactions, and efficient communication, aiming to become the leading solution for community and group contributions in Nigeria. The project aims to support various group types including rotating savings (Ajo/Esusu), association dues and levies, and goal-based project funding.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend is built with React 18, TypeScript, and Vite, utilizing Shadcn/UI (based on Radix UI) and Tailwind CSS. It features a custom Nigerian-themed color palette, a mobile-first design, and dynamic Open Graph meta tags for social sharing.

### Technical Implementations
- **Frontend**: Employs React Query for state management, Wouter for routing, and React Hook Form with Zod for robust form validation. Client-side authentication uses `localStorage` with backend validation.
- **Backend**: Developed with Node.js and Express.js, integrating Drizzle ORM for type-safe database interactions and Zod for shared validation schemas.
- **Authentication**: WhatsApp OTP authentication with device remembering for secure, convenient access. Features role-based access control (Admin/Member).
- **Payment Processing**: Members upload proof of payment for administrative approval, and the system meticulously tracks transactions, progress, and payment history.
- **Group Types**: Supports three distinct group types:
    - **Ajo / Esusu**: Rotating cycle savings with fixed contributions and rotating payouts.
    - **Association Dues & Levies**: Recurring dues and one-off levies for organizational funding.
    - **Project Funds**: Goal-based collections for specific projects (weddings, fundraisers, etc.).
- **Dual-Role System**: Users can hold different roles (admin/member) across multiple groups.
- **Group Management**: Admins can create groups, generate registration links, and manage group statuses and members.
- **Project Type System**: Projects support various types including Target Goal, Monthly Dues, Yearly Levy, Event, and Emergency, each with tailored tracking.
- **Web Push Notifications**: Native browser push notifications using Web Push API and VAPID for real-time alerts.
- **WhatsApp Integration**: Facilitates professional sharing messages and payment reminders.
- **Funds Disbursement Tracking**: Admins can record how collected funds are spent, with member confirmation features.
- **Co-Admin Permissions**: Provides specific roles and permissions for co-administrators within groups.
- **KYC & Terms and Conditions**: Implements a KYC (Know Your Customer) process for admins and configurable Terms & Conditions for group participation, with an internal review system for custom T&Cs.
- **Operational Interface (`/ops`)**: A password-gated internal tool for managing users, groups, custom T&C moderation, referral payouts, and push notification debugging.

### System Design Choices
- **Database**: PostgreSQL with Drizzle ORM ensures a robust and relational schema for all data.
- **Modularity**: Designed for scalability and maintainability, separating frontend and backend concerns.
- **Environment Configuration**: Utilizes environment variables for flexible deployment across development and production.

## External Dependencies
- **@neondatabase/serverless**: PostgreSQL driver for serverless environments.
- **drizzle-orm**: Type-safe ORM for database interactions.
- **@tanstack/react-query**: For efficient server state management in the frontend.
- **@radix-ui/...**: Provides accessible, unstyled UI components.
- **wouter**: A lightweight routing library for React.
- **PostgreSQL**: The primary relational database system.
- **Drizzle Kit**: Used for database schema migrations and management.
- **TypeScript**: Ensures static type checking across the codebase.
- **Vite**: A fast build tool and development server.
- **Tailwind CSS**: A utility-first CSS framework for rapid UI development.
- **canvas**: Node.js Canvas API for dynamic image generation (e.g., Open Graph images).