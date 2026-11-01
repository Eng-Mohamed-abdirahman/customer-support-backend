<div align="center">

# Technov — Customer Support Dashboard

**The web app for Technov, a multi-tenant SaaS that gives every business its own AI support agent. Manage AI conversations, take over chats live, train the AI on your documents and track everything from one dashboard.**

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?logo=shadcnui&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-realtime-010101?logo=socket.io&logoColor=white)

[Features](#-features) · [Getting started](#-getting-started) · [Environment](#-environment-variables) · [Structure](#-project-structure) · [Backend](https://github.com/Eng-Mohamed-abdirahman/customer-support-backend)

</div>

---

## 📖 Overview

Technov lets a company upload its own knowledge (FAQs, prices, policies, opening hours), connect its WhatsApp Business number or website, and get an AI assistant that answers customers 24/7. When a customer needs a person, the conversation is handed to a human agent in real time.

This repository is the **frontend**: a marketing landing page plus a role-based dashboard for platform admins, company admins and support staff, built with Next.js (App Router), React 19, Tailwind CSS 4 and shadcn/ui.

> The API, AI pipeline and WhatsApp integration live in **[customer-support-backend](https://github.com/Eng-Mohamed-abdirahman/customer-support-backend)**. You need it running to use this app.

## ✨ Features

### For support teams
- 💬 **Live inbox** — WhatsApp and website conversations update in real time over Socket.io.
- 🙋 **Human takeover** — take a chat over from the AI with one click, reply as an agent, then hand it back.
- 🎫 **Tickets** — handoff requests with the full conversation history alongside.
- 👥 **Contacts** — a customer contact book with quick add.

### For company admins
- 🧠 **Knowledge base** — upload PDF and DOCX documents the AI learns from.
- 📈 **Knowledge insights** — AI analysis of conversations that highlights gaps in your knowledge base.
- 📱 **WhatsApp integration** — connect a WhatsApp Business number with Meta Embedded Signup.
- 🔑 **API keys** — create, reveal, rotate and revoke keys for website and API integrations.
- 👤 **Team management** — invite staff by email and manage company users.
- 📊 **Usage & billing** — track requests and token usage against your plan, and request upgrades.

### For platform admins
- 🏢 **Organizations** — manage every tenant and their settings.
- 💳 **Plans** — create, duplicate and assign subscription plans, with an audit log.
- 🌍 **Global usage** — cross-tenant analytics.

### Everywhere
- 📉 Role-specific dashboards with charts (conversation trends, AI resolution rate, peak hours, channel mix, staff performance).
- 🎨 Polished UI with shadcn/ui, Framer Motion animations and toast notifications.

## 🧰 Tech stack

| Category | Tools |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, [shadcn/ui](https://ui.shadcn.com), Radix UI, lucide-react |
| Data fetching | TanStack Query |
| Forms & validation | React Hook Form, Zod |
| Realtime | socket.io-client |
| Charts & motion | Recharts, Framer Motion |
| UX | Sonner toasts, cmdk command menu, date-fns |

## 🚀 Getting started

### Prerequisites

- **Node.js 18+** (20 LTS recommended) and npm
- The **[backend API](https://github.com/Eng-Mohamed-abdirahman/customer-support-backend)** running (default `http://localhost:5000`)

### 1. Clone and install

```bash
git clone https://github.com/Eng-Mohamed-abdirahman/customer-support-frontend.git
cd customer-support-frontend
npm install
```

### 2. Configure environment

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Log in with the super admin you created in the backend (`npm run seed:super-admin`), then create an organization and invite users.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server on port 3000. |
| `npm run build` | Create a production build. |
| `npm start` | Serve the production build. |
| `npm run lint` | Run ESLint. |

## 🔑 Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | ✅ | `http://localhost:5000` | Backend API and Socket.io URL. |
| `NEXT_PUBLIC_META_APP_ID` | For WhatsApp | — | Meta app ID used by Embedded Signup. |
| `NEXT_PUBLIC_WHATSAPP_CONFIG_ID` | For WhatsApp | — | Embedded Signup configuration ID from Meta. |
| `NEXT_PUBLIC_WHATSAPP_REDIRECT_URI` | For WhatsApp | — | OAuth redirect URI registered in your Meta app. |
| `NEXT_PUBLIC_WEBHOOK_PUBLIC_URL` | | — | Public backend URL shown as the webhook address in the WhatsApp setup panel. |

> `NEXT_PUBLIC_*` values are bundled into the browser, so never put secrets in them. `.env*` files are already ignored by git.

## 👤 Roles and access

The sidebar and pages adapt to the signed-in user.

| Role | Sees |
| --- | --- |
| **Platform admin** | Organizations, platform users, plans, subscriptions, global usage. |
| **Company admin** | Everything for their company: inbox, knowledge base, insights, integrations, users, API keys, usage, billing. |
| **Staff** | Inbox, conversations, tickets, contacts and usage. |

## 📁 Project structure

```text
app/
├── (marketing)/          # Public landing page
├── login/                # Sign in
├── accept-invitation/    # Finish registration from an email invite
└── dashboard/            # Authenticated app
    ├── inbox/            # WhatsApp live threads
    ├── conversations/    # Website chats
    ├── tickets/          # Human handoff requests
    ├── contacts/
    ├── knowledge-base/
    ├── knowledge-insights/
    ├── integrations/     # WhatsApp connection
    ├── api-keys/
    ├── users/
    ├── usage/  global-usage/
    ├── organizations/    # Platform admin: tenants
    ├── plans/            # Platform admin: subscription plans
    └── studio/  brand/  orders/   # In progress, hidden from the nav
components/
├── dashboard/            # Shell, nav, cards, charts, tables, plan management
├── landing/              # Landing page sections
├── auth/  contacts/  providers/
└── ui/                   # shadcn/ui primitives
hooks/                    # Dashboard data hooks (TanStack Query)
services/                 # Typed API clients, one per backend resource
types/                    # Shared TypeScript types
lib/                      # Socket.io client and utilities
```

## ⚡ Real-time updates

`lib/socket.ts` keeps one Socket.io connection per signed-in user, authenticated with the user's JWT, and reconnects when the token changes. Inbox, conversation and ticket pages listen for `message:new` and `conversation:updated` to update without refreshing.

## 🚢 Deployment

The app deploys anywhere Next.js runs, such as [Vercel](https://vercel.com):

1. Import the repository.
2. Set `NEXT_PUBLIC_API_URL` (and the WhatsApp variables if you use them) to your production values.
3. Deploy, then add the frontend URL to the backend's `FRONTEND_URL` and `CORS_ORIGINS`.

## 🤝 Contributing

1. Fork the repository.
2. Create a branch: `git checkout -b feature/my-feature`.
3. Commit your changes: `git commit -m "Add my feature"`.
4. Push and open a pull request.

Bug reports and ideas are welcome in [Issues](https://github.com/Eng-Mohamed-abdirahman/customer-support-frontend/issues).

## 👨‍💻 Author

**Mohamed Abdirahman** — [@Eng-Mohamed-abdirahman](https://github.com/Eng-Mohamed-abdirahman)

If you find this project useful, consider giving it a ⭐.
