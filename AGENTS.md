# AI Customer Support SaaS — Project Instructions for AI Agents

## Project Overview

This project is a full-stack multi-tenant SaaS platform that provides an AI-powered customer support agent for businesses.

The system acts as a digital AI employee that automatically responds to customer messages 24/7 using business-specific knowledge.

Each business (organization) has:

* its own account
* its own API key
* its own knowledge base
* its own AI responses
* its own usage tracking

The AI is NOT generic.
It is trained on each company’s own data such as:

* product prices
* services
* FAQs
* working hours
* company policies
* location
* company information

The system will support:

* website chat widget
* WhatsApp integration
* knowledge base training
* analytics dashboard
* subscription plans

---

# Tech Stack

## Frontend

* Next.js App Router
* TypeScript
* Tailwind CSS
* shadcn/ui component library
* lucide-react icons

IMPORTANT:
ALL UI components must use shadcn/ui.
Do not create custom UI components when a shadcn component exists.

Examples:

* forms → shadcn Form
* inputs → shadcn Input
* buttons → shadcn Button
* modals → shadcn Dialog
* tables → shadcn Table
* dropdowns → shadcn DropdownMenu
* select → shadcn Select
* toast → shadcn Toast

UI must remain consistent with shadcn styling.

---

## Backend

* Node.js
* Express.js
* TypeScript
* MongoDB
* Mongoose

---

## AI Layer (future phases)

* OpenAI API
* Pinecone vector database

Do NOT implement Pinecone yet in Phase 1.

---

# Architecture Principles

## Multi-tenant architecture

This is a multi-tenant SaaS platform.

Each organization must have isolated data.

Each organization has:

* its own API keys
* its own knowledge base
* its own conversations
* its own usage tracking
* its own Pinecone namespace (future)

Never mix data between organizations.

Always filter by organizationId when querying data.

---

# Roles System

## Platform roles

Stored in User collection:

* super_admin
* platform_admin

super_admin can:

* create company invitations
* see all organizations
* see global analytics
* manage plans
* manage subscriptions
* manage platform settings

---

## Organization roles

Stored in Membership collection:

* owner
* admin
* agent
* viewer

For now only "owner" is created during onboarding.

Architecture must remain ready for future roles.

Do NOT hardcode logic assuming only owner exists.

---

# Onboarding Flow (IMPORTANT)

Public company signup is NOT allowed.

The system uses invite-based onboarding.

Flow:

1. Super admin enters company email.

2. System creates invitation token.

3. Email is sent to company email.

4. Company owner opens onboarding link.

5. Owner completes onboarding form.

6. System creates:

   * User (owner)
   * Organization
   * Membership (role owner)
   * Default API key

7. Owner receives JWT token and can access dashboard.

Invitation tokens must be securely hashed in database.

Never store raw tokens.

---

# Backend Architecture Pattern

Follow this strict structure:

routes → controllers → services → models

Rules:

* Routes should be thin
* Controllers should be thin
* Business logic must live in services
* Validation must happen before services
* Use reusable utils
* Use middleware for auth and error handling

---

# Backend Folder Structure

backend/src/

config/
controllers/
routes/
services/
models/
middlewares/
utils/
validators/
types/

app.ts
server.ts

---

# Database Collections

Core collections:

users
organizations
memberships
api_keys
organization_invitations

Future collections:

knowledge_sources
knowledge_chunks
conversations
messages
usage_logs
subscriptions

---

# API Design Rules

All responses must follow this format:

{
success: boolean,
message: string,
data?: any
}

Use consistent error handling.

Use asyncHandler wrapper for controllers.

Use JWT authentication.

Use Authorization header:

Authorization: Bearer TOKEN

---

# Security Rules

Passwords must be hashed using bcrypt.

API keys must be hashed before storing in database.

Invitation tokens must be hashed before storing.

Never expose hashed values in API responses.

Return raw API key only once at creation time.

---

# Frontend Architecture

Use Next.js App Router.

Use this structure:

app/
components/
lib/
services/
types/

Use services folder for API calls.

Do NOT call fetch directly inside components.

---

# UI Rules

Use shadcn/ui for ALL UI components.

Do NOT create raw Tailwind buttons if shadcn button exists.

Use consistent UI patterns.

Use lucide-react icons.

Forms must use consistent layout and spacing.

Use clean, modern UI with good whitespace.

Avoid overly complex animations.

---

# Sidebar Structure

The dashboard sidebar supports both:

company users
super admin users

Sidebar sections:

General:

* Dashboard
* Conversations
* Knowledge Base
* Integrations
* API Keys
* Usage
* Billing
* Settings

Platform (super_admin only):

* Organizations
* Platform Users
* Plans
* Subscriptions
* Global Usage
* Logs
* Platform Settings

Sidebar visibility must depend on user.platformRole.

---

# Code Style Rules

Use TypeScript everywhere.

Prefer readable code over clever code.

Use clear naming conventions.

Avoid unnecessary abstractions.

Keep components modular.

Avoid very large files.

Use consistent naming patterns.

---

# Current Phase

Phase 1 scope:

login
create invitation
validate invitation
complete onboarding
create owner organization
generate default API key

Do NOT implement yet:

Pinecone
WhatsApp integration
subscription billing logic
team management UI
advanced analytics
AI chat processing
knowledge ingestion pipelines

---

# Goal of this Phase

After Phase 1:

Super admin can invite companies.

Company owner can complete onboarding.

Owner receives API key.

Owner can access dashboard.

System is ready for knowledge base and AI features in Phase 2.
