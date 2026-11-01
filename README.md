<div align="center">

# Technov

**An AI customer support platform for businesses. Each company gets its own AI agent, trained on its own knowledge, answering customers 24/7 on WhatsApp and the web, with human agents ready to take over in real time.**

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?logo=openai&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?logo=socket.io&logoColor=white)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Backend](backend) · [Frontend](frontend) · [Quick start](#-quick-start)

</div>

---

## 📖 What is Technov?

Technov is a multi-tenant SaaS. A business uploads its documents (FAQs, price lists, policies, opening hours), connects its WhatsApp Business number or website, and gets an AI assistant that answers customers using **only that business's knowledge**. When the AI can't help, or a customer asks for a person, a human agent takes over the chat live from the dashboard.

### Highlights

- 🧠 **RAG knowledge base**: PDF/DOCX uploads, Hugging Face embeddings, Pinecone search, Cohere rerank, OpenAI answers
- 💬 **WhatsApp Business** integration with Embedded Signup and signed webhooks
- 🙋 **Human handoff** with real-time chat over Socket.io
- 🎫 Tickets, orders and contacts created and managed by the AI and by staff
- 🏢 Multi-tenant organizations, API keys, invitations and subscription plans
- 📊 Role-based dashboards for platform admins, company admins and staff

## 📦 Repository layout

This is a monorepo with two apps:

| Folder | What it is | Stack |
| --- | --- | --- |
| [`backend/`](backend) | REST API, AI pipeline, WhatsApp webhooks, Socket.io server | Node.js, Express 5, TypeScript, MongoDB |
| [`frontend/`](frontend) | Landing page and role-based dashboard | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui |

Each folder has its own README with full setup, environment variables and project structure.

## 🚀 Quick start

**Requirements:** Node.js 18+, MongoDB, and an OpenAI API key.

```bash
git clone https://github.com/Eng-Mohamed-abdirahman/technov.git
cd technov
```

**1. Backend** (runs on `http://localhost:5000`)

```bash
cd backend
npm install
# create backend/.env (see backend/README.md)
npm run seed:super-admin
npm run dev
```

**2. Frontend** (runs on `http://localhost:3000`), in a second terminal

```bash
cd frontend
npm install
echo NEXT_PUBLIC_API_URL=http://localhost:5000 > .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with the super admin you seeded.

Full guides: [backend/README.md](backend/README.md) · [frontend/README.md](frontend/README.md)

## 📜 History

This repository combines two earlier repositories, with every commit from both kept:

- `customer-support-backend`, renamed to this repository; its code now lives in `backend/`
- `customer-support-frontend`, now archived; its code and history were merged into `frontend/`

## 🤝 Contributing

1. Fork the repository.
2. Create a branch: `git checkout -b feature/my-feature`.
3. Commit your changes and open a pull request.

Bug reports and ideas are welcome in [Issues](https://github.com/Eng-Mohamed-abdirahman/technov/issues).

## 📄 License

Released under the [MIT License](LICENSE).

## 👨‍💻 Author

**Mohamed Abdirahman** — [@Eng-Mohamed-abdirahman](https://github.com/Eng-Mohamed-abdirahman)

If you find this project useful, consider giving it a ⭐.
