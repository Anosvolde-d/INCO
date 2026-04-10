# INCO Orchestration Gateway

A self-hosted AI model proxy and orchestration layer built with **Next.js 15**. INCO sits between your clients and upstream AI providers, giving you a single API endpoint with admin controls, rate limiting, semantic caching, search augmentation, and a built-in playground for comparing models side-by-side.

## Features

- **Unified API** — Single `/v1/chat/completions` endpoint that proxies to any configured provider (OpenAI, Anthropic, Mistral, local Ollama, etc.)
- **JWT Admin Auth** — Server-side JWT authentication with httpOnly cookies (no more plain-text client cookies)
- **Server-Side Key Generation** — API keys generated and validated server-side; invalid keys are rejected at the proxy layer
- **Global Rate Limiting** — Configurable RPM and RPD limits (default 5 RPM / 500 RPD) applied to all API keys, adjustable from the admin settings panel
- **Semantic Prompt Caching** — LRU cache with TTL for semantically similar prompts, reducing duplicate upstream calls
- **Search Agent Augmentation** — Optional search provider integration (Exa, Tavily) that enriches model responses with web results
- **Lorebook System** — Inject world-building context into prompts via keyword/exact/regex triggers
- **Prompt Profiles** — Per-model system prompts, auxiliaries, guidance settings (temperature, top_p, etc.), and prefill
- **Request Telemetry** — Logs token usage, execution time, TTFT, search usage, and error codes per request
- **Model Arena** — Side-by-side model comparison with Elo-style voting
- **Playground** — Interactive chat UI for testing any configured model with custom settings
- **Tunnel** — Built-in tunnel support (pinggy.io) for exposing local dev to the internet

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Database | PostgreSQL (Neon Serverless) |
| ORM | Prisma |
| Auth | jose (JWT) |
| Rate Limiting | lru-cache (in-memory) |
| Caching | lru-cache (in-memory, semantic prompt cache) |
| Styling | Tailwind CSS + Framer Motion |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon recommended)
- Upstream AI provider API key(s)

### Installation

```bash
git clone https://github.com/Anosvolde-d/INCO.git
cd INCO
npm install
```

### Environment Variables

Create a `.env` file:

```env
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
ADMIN_PASSWORD="your-admin-password"
EXA_API_KEY="your-exa-key"           # optional, for Exa search
TAVILY_API_KEYS="key1,key2"          # optional, for Tavily search
```

### Database Setup

```bash
npx prisma db push
npx prisma generate
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

## API Reference

### Chat Completions (Proxy)

```
POST /v1/chat/completions
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "model": "gpt-4o",
  "messages": [...],
  "stream": true
}
```

### Admin Authentication

```
POST /api/admin/auth
Content-Type: application/json

{ "password": "your-admin-password" }
```

Returns an httpOnly JWT cookie valid for 24 hours.

### API Key Management

```
POST   /api/keys       # Generate a new API key
GET    /api/keys       # List all keys
DELETE /api/keys/:id    # Revoke a key
```

### Playground Token

```
POST /api/playground/token
Authorization: <admin-jwt-cookie>

{ "modelId": "gpt-4o" }
```

## Architecture

```
Client Request
     │
     ▼
┌─────────────┐
│  proxy.ts   │ ← JWT validation on /admin/*, key validation on /v1/*
└──────┬──────┘
       │
       ▼
┌──────────────────────────┐
│  /api/v1/chat/completions │
│  ├── Rate Limit (LRU)    │
│  ├── Prompt Cache (LRU)  │
│  ├── Search Agent        │
│  ├── Provider Call       │
│  └── Telemetry Logger    │
└──────────────────────────┘
       │
       ▼
   Upstream Provider
```

## License

Private — all rights reserved.
