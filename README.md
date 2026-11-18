# Enterprise Applications – Projects

Three small Node.js projects. Each folder is independent, with its own README, `package.json` and setup steps.

| # | Folder | What it is |
|---|--------|------------|
| 2 | [2-google-identity](2-google-identity/) | Node + Express: **Google as identity provider** (single sign-on with OpenID Connect) |
| 4 | [4-mcp-server](4-mcp-server/) | Node: a simple **MCP server** (IT helpdesk tools, a resource and a prompt) for Claude Code / Claude Desktop |
| 5 | [5-rag](5-rag/) | Node + Express: a simple **RAG** app (Gemini embeddings + vector search + Gemini answers, free tier) over an employee handbook |

Node 20.6 or newer is required (the projects use `node --env-file`).

| Project | Needs | Run |
|---------|-------|-----|
| 2 | A Google OAuth client (setup below) | `cp .env.example .env` → fill it in → `npm install` → `npm start` → http://localhost:3000 |
| 4 | Nothing | `npm install` → `npm run client` (or connect it to Claude Code, see its README) |
| 5 | A free Gemini API key | `cp .env.example .env` → add the key → `npm install` → `npm run ingest` → `npm start` → http://localhost:3002 |

Secrets live in each project's `.env` file, which is not committed. Each project has a `.env.example` showing what to fill in.

## One-time Google Cloud setup (project 2)

1. Go to <https://console.cloud.google.com/> and create a project.
2. **APIs & Services → OAuth consent screen**: choose *External*, fill in the app name and your email,
   and add your own Google account under **Test users**.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URI: `http://localhost:3000/auth/google/callback`
4. Copy the **Client ID** and **Client secret** into `2-google-identity/.env`.

> While the app is in "Testing" mode, Google shows an "unverified app" warning. Click
> *Continue*. Only accounts listed as test users can sign in.
