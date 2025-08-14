# Kontrib - Financial Group Management System

## Overview

Kontrib is a full-stack web application designed for managing group financial contributions in Nigeria. It provides a platform where administrators can create contribution groups and members can join groups and make payments. The application features a modern React frontend with a Node.js/Express backend, using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client-side is built using **React 18** with **TypeScript** and follows a modern component-based architecture:

- **Build Tool**: Vite for fast development and optimized production builds
- **UI Framework**: Shadcn/UI components built on top of Radix UI primitives
- **Styling**: Tailwind CSS with custom Nigerian-themed color palette (green primary colors)
- **State Management**: React Query (TanStack Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation
- **Authentication**: Client-side authentication state management with localStorage persistence

### Backend Architecture
The server-side uses **Node.js** with **Express** in a RESTful API pattern:

- **Runtime**: Node.js with ESM modules
- **Framework**: Express.js for HTTP server and routing
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Validation**: Zod schemas shared between client and server
- **Development**: Hot reload with Vite integration in development mode

### Database Design
Uses **PostgreSQL** with a well-structured relational schema:

- **Users**: Authentication and profile information with role-based access (admin/member)
- **Groups**: Financial contribution groups with target amounts and deadlines
- **Group Members**: Junction table linking users to groups with contribution tracking
- **Contributions**: Individual payment records with status tracking

## Key Components

### Authentication System
- Role-based access control (Admin vs Member roles)
- Simple username/password authentication
- Client-side session persistence using localStorage
- Protected routes based on user roles

### Group Management
- **Custom URL Generation**: System creates branded URLs in format `kontrib.app/groupname` (e.g., `kontrib.app/chikeswedding`)
- **Enhanced WhatsApp Integration**: Automatically generates professional sharing messages with emojis and hashtags
- **Unique Registration Links**: Each group gets a unique link for member self-registration  
- **Group Status Tracking**: Active, completed, and paused group states
- **Target Amount and Deadline Management**: Flexible contribution goals and timing with proper date handling

### Payment Processing
- **Proof of Payment Upload**: Members can upload payment receipts/screenshots for verification
- **Admin Approval System**: All contributions start as "pending" until admin confirms them
- **Transaction Reference Support**: Optional bank transfer references
- **Payment History and Analytics**: Complete tracking of all contributions
- **Progress Tracking**: Real-time progress toward group goals (only counts confirmed payments)

### Dashboard System
- **Admin Dashboard**: Group management, member oversight, financial analytics
- **Member Dashboard**: Joined groups, payment history, contribution tracking
- Real-time statistics and progress indicators

## Data Flow

1. **Authentication Flow**: Users register/login → credentials validated → user object stored in localStorage → role-based dashboard redirect

2. **Group Creation Flow**: Admin creates group → generates unique registration link → group stored with admin relationship → shareable link provided

3. **Group Joining Flow**: Member accesses registration link → group details displayed → member joins → group member relationship created

4. **Payment Flow**: Member initiates payment → contribution record created → group totals updated → admin and member dashboards reflect changes

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Neon Database PostgreSQL driver for serverless environments
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Accessible UI component primitives
- **wouter**: Lightweight React router

### Development Tools
- **TypeScript**: Static type checking across the entire stack
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **ESBuild**: Fast JavaScript bundler for production builds

### Database
- **PostgreSQL**: Primary database (configured for Neon Database)
- **Drizzle Kit**: Database migrations and schema management

## Deployment Strategy

### Build Process
- Frontend builds to `dist/public` directory using Vite
- Backend bundles to `dist/index.js` using ESBuild
- TypeScript compilation and type checking before build

### Environment Configuration
- Development: Vite dev server with Express API proxy
- Production: Express serves built static files and API routes
- Database: PostgreSQL connection via DATABASE_URL environment variable

### Replit Integration
- Configured for Replit development environment
- Runtime error overlay for debugging
- Cartographer integration for enhanced development experience

The application is designed to be easily deployable on platforms like Replit, Vercel, or any Node.js hosting service with PostgreSQL database support. The modular architecture allows for easy scaling and maintenance of both frontend and backend components.

## Recent Changes

### SMS-Based OTP Authentication System (August 14, 2025)
- **Complete OTP-Only Authentication**: Rebuilt both registration ("Sign Up") and login workflows to use SMS OTP verification exclusively
- **Role-Based Registration**: Added ability to sign up as either Group Admin or Group Member with role-specific UI and permissions
- **Global Phone Number Support**: Updated validation to accept international phone numbers for diaspora users participating in local groups
- **Unified SMS Authentication**: All OTP codes delivered via SMS text messages for consistent user experience
- **Two-Step Authentication Flows**: 
  - Sign Up: Full Name + Username (WhatsApp Nickname) + Phone Number + Role Selection → SMS OTP → Account Creation
  - Login: Username + Phone Number → SMS OTP → Authentication
- **No Password Requirements**: Eliminated all password fields for streamlined, secure authentication
- **Enhanced Security**: 6-digit OTP codes with 10-minute expiration, 3-attempt limit, and automatic cleanup
- **Role-Based Redirects**: Automatic redirection to appropriate dashboard (admin vs member) after successful registration
- **Mobile-First Design**: Responsive forms optimized for SMS-based verification workflow
- **Development Testing**: OTP codes displayed in console for testing (removed in production)
- **Comprehensive API**: /api/auth/send-otp, /api/auth/send-login-otp, /api/auth/register-with-otp, /api/auth/login-with-otp
- **WhatsApp Integration**: Maintained for group sharing and invitations while using SMS for authentication

### Technical Architecture Updates
- **OTP Verification Schema**: Added otpVerifications table with phone number, code, expiration tracking
- **New API Endpoints**: /api/auth/send-otp, /api/auth/verify-otp, /api/groups/:id/register-with-otp
- **Enhanced Storage Interface**: Added OTP verification methods to storage layer with cleanup functionality
- **Form Validation**: Zod schemas for Nigerian phone number format validation and OTP input
- **Error Handling**: Comprehensive error states for expired/invalid OTPs and registration failures

### Hierarchical Project Management Implementation (July 30, 2025)
- **Simplified Groups Architecture**: Removed targetAmount, collectedAmount, and deadline fields from groups
- **Project-Based Financial Tracking**: All financial data (targets, amounts, deadlines) moved to project level
- **Hierarchical URLs**: Projects now have unique URLs in format kontrib.app/groupname/projectname
- **Custom Slug Generation**: Added customSlug field to projects for hierarchical URL structure
- **Updated Storage Layer**: Modified storage interface to handle simplified groups and project management
- **New API Endpoints**: Added project management routes with hierarchical slug support
- **Frontend Components**: Created CreateProjectModal and updated admin dashboard for project management
- **Schema Updates**: Restructured database schema to support project-focused architecture
- **WhatsApp Integration Maintained**: Groups still generate shareable WhatsApp links for member registration